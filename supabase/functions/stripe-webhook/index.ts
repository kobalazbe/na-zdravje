// Supabase Edge Function — Stripe webhook handler (ONE-TIME payments)
// Manually verifies Stripe signatures using Web Crypto API (no Stripe SDK).
//
// Model: every plan is a ONE-TIME purchase that grants time-boxed access, then
// the account reverts to free. metadata.tier on the Checkout Session decides the
// plan and duration:
//   pass    → tier "pass"    · 48 hours
//   monthly → tier "premium" · 30 days
//   yearly  → tier "premium" · 365 days
// (There are no subscriptions, so customer.subscription.* events are ignored.)
//
// Required env vars (Supabase Dashboard → Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — auto-available
//   STRIPE_WEBHOOK_SECRET  — whsec_... (from Stripe → Webhooks → signing secret)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// stripe metadata.tier → [internal DB tier, access duration in ms]
const DAY = 24 * 60 * 60 * 1000;
const PLANS: Record<string, { tier: string; ms: number }> = {
  pass:    { tier: "pass",    ms: 48 * 60 * 60 * 1000 },
  monthly: { tier: "premium", ms: 30 * DAY },
  yearly:  { tier: "premium", ms: 365 * DAY },
};

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
      const obj     = (event.data as Record<string, unknown>).object as Record<string, unknown>;
      const details = obj.customer_details as Record<string, string> | null;
      const email   = details?.email ?? (obj.customer_email as string | null);
      const meta    = obj.metadata as Record<string, string> | null;
      const planKey = meta?.tier ?? "";

      // one-time only — ignore anything that isn't a fully paid checkout
      if (obj.payment_status && obj.payment_status !== "paid") {
        console.warn("Session not paid, ignoring:", obj.id, obj.payment_status);
        return new Response("OK", { status: 200 });
      }
      if (!email) {
        console.warn("No email on session:", obj.id);
        return new Response("OK", { status: 200 });
      }

      await grantPlan(email, planKey, obj.customer as string | null);
    }
    // customer.subscription.* intentionally NOT handled — model is one-time.
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

/* ---- Supabase helpers ---- */
// Paginated lookup so it keeps working past the first 50 users.
async function getUserByEmail(email: string) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) break; // last page
  }
  return null;
}

async function grantPlan(email: string, planKey: string, customerId: string | null) {
  const plan = PLANS[planKey];
  if (!plan) {
    console.warn("Unknown plan tier in metadata:", planKey);
    return;
  }
  const user = await getUserByEmail(email);
  if (!user) {
    console.warn("No Supabase user found for email:", email);
    return;
  }

  const passExpiry = new Date(Date.now() + plan.ms).toISOString();

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, tier: plan.tier, pass_expiry: passExpiry, stripe_customer_id: customerId },
      { onConflict: "id" }
    );

  if (error) throw error;
  console.log(`Granted plan=${planKey} (tier=${plan.tier}) to ${email}, until ${passExpiry}`);
}
