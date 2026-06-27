// Supabase Edge Function — Stripe webhook handler
// Listens for checkout.session.completed and subscription events,
// then updates the matching user's profiles.tier in the database.
//
// Required env vars (set in Supabase Dashboard → Settings → Edge Functions):
//   STRIPE_SECRET_KEY       — sk_test_... or sk_live_...
//   STRIPE_WEBHOOK_SECRET   — whsec_... (from Stripe → Webhooks → signing secret)
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase → Settings → API (service_role key)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Map Stripe tier metadata → profiles.tier value
const TIER_MAP: Record<string, string> = {
  pass:    "pass",
  monthly: "premium",
  yearly:  "premium",
};

// How long a Žur Pass lasts (48 h in ms)
const PASS_DURATION_MS = 48 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email   = session.customer_details?.email ?? session.customer_email;
      const tier    = session.metadata?.tier ?? "monthly";

      if (!email) {
        console.warn("No email on session:", session.id);
        return new Response("OK", { status: 200 });
      }

      await grantTier(email, tier, session.subscription as string | null);
    }

    if (event.type === "customer.subscription.deleted") {
      const sub      = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
      const email    = customer.email;
      if (email) await revokeToFree(email);
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created"
    ) {
      const sub      = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
      const email    = customer.email;
      // Re-activate if coming out of past_due / canceled
      if (email && sub.status === "active") {
        await grantTier(email, "monthly", sub.id);
      }
    }
  } catch (err) {
    console.error("Handler error:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});

async function getUserByEmail(email: string) {
  // Look up the Supabase user id by email via the admin API
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
    .update({
      tier,
      pass_expiry: passExpiry,
      stripe_customer_id: subscriptionId,
    })
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
