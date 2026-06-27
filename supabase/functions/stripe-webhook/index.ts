// Supabase Edge Function — Stripe webhook handler
// Manually verifies Stripe signatures using Web Crypto API (no Stripe SDK).
//
// Required env vars (Supabase Dashboard → Settings → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY       — sk_test_... or sk_live_...
//   STRIPE_WEBHOOK_SECRET   — whsec_... (from Stripe → Webhooks → signing secret)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

const TIER_MAP: Record<string, string> = {
  pass:    "pass",
  monthly: "premium",
  yearly:  "premium",
};

const PASS_DURATION_MS = 48 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: Record<string, unknown>;
  try {
    event = await verifyStripeSignature(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data as Record<string, unknown>;
      const obj     = session.object as Record<string, unknown>;
      const details = obj.customer_details as Record<string, string> | null;
      const email   = details?.email ?? (obj.customer_email as string | null);
      const meta    = obj.metadata as Record<string, string> | null;
      const tier    = meta?.tier ?? "monthly";

      if (!email) {
        console.warn("No email on session:", obj.id);
        return new Response("OK", { status: 200 });
      }

      await grantTier(email, tier, obj.subscription as string | null);
    }

    if (event.type === "customer.subscription.deleted") {
      const sub      = (event.data as Record<string, unknown>).object as Record<string, unknown>;
      const customer = await stripeGet(`/customers/${sub.customer}`);
      const email    = customer.email as string | null;
      if (email) await revokeToFree(email);
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created"
    ) {
      const sub      = (event.data as Record<string, unknown>).object as Record<string, unknown>;
      const customer = await stripeGet(`/customers/${sub.customer}`);
      const email    = customer.email as string | null;
      if (email && sub.status === "active") {
        await grantTier(email, "monthly", sub.id as string);
      }
    }
  } catch (err) {
    console.error("Handler error:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});

/* ---- Stripe signature verification (Web Crypto, no SDK) ---- */
async function verifyStripeSignature(
  body: string,
  sig: string,
  secret: string
): Promise<Record<string, unknown>> {
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of sig.split(",")) {
    const eq = part.indexOf("=");
    const k  = part.slice(0, eq);
    const v  = part.slice(eq + 1);
    if (k === "t")  timestamp = v;
    if (k === "v1") signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid Stripe-Signature header");
  }

  const enc     = new TextEncoder();
  const rawKey  = enc.encode(secret.trim());
  const payload = enc.encode(`${timestamp}.${body}`);
  const key     = await crypto.subtle.importKey("raw", rawKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac     = await crypto.subtle.sign("HMAC", key, payload);
  const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");

  if (!signatures.includes(expected)) {
    throw new Error("No signatures found matching the expected signature for payload.");
  }

  const tolerance = 300; // 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > tolerance) {
    throw new Error("Timestamp outside the tolerance zone.");
  }

  return JSON.parse(body) as Record<string, unknown>;
}

/* ---- Minimal Stripe REST helper ---- */
async function stripeGet(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  if (!res.ok) throw new Error(`Stripe GET ${path} → ${res.status}`);
  return res.json();
}

/* ---- Supabase helpers ---- */
async function getUserByEmail(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function grantTier(email: string, stripeTier: string, subscriptionId: string | null) {
  const user = await getUserByEmail(email);
  if (!user) {
    console.warn("No Supabase user found for email:", email);
    return;
  }

  const tier = TIER_MAP[stripeTier] ?? "premium";
  const passExpiry = tier === "pass"
    ? new Date(Date.now() + PASS_DURATION_MS).toISOString()
    : null;

  const { error } = await supabase
    .from("profiles")
    .update({ tier, pass_expiry: passExpiry, stripe_customer_id: subscriptionId })
    .eq("id", user.id);

  if (error) throw error;
  console.log(`Granted tier=${tier} to ${email}`);
}

async function revokeToFree(email: string) {
  const user = await getUserByEmail(email);
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ tier: "free", pass_expiry: null })
    .eq("id", user.id);
  console.log(`Revoked to free: ${email}`);
}
