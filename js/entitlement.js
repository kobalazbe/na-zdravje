/* ===========================================================
   entitlement.js — premium access (Phase 0: client-only)
   Owns its OWN localStorage key so the in-game "reset" never
   wipes a purchase. Tier: "free" | "premium" | "pass".
   "pass" = time-boxed all-access (Žur Pass).

   PHASE 1 swap-in: replace redeem()/refresh() internals with a
   call to the serverless /api/validate endpoint (Stripe + KV).
   The rest of the app only depends on isPremium() / the ctx
   methods, so screens won't need to change.
   =========================================================== */

const KEY = "naZdravje.ent.v1";
const PASS_HOURS = 48;
const GRACE_MS = 7 * 24 * 60 * 60 * 1000; // offline grace (Phase 1)

/* Phase-0 demo unlock codes. In Phase 1 these are validated server-side. */
const LOCAL_CODES = {
  "NZ-DEMO-2024": "premium",
  "NZ-ZUR-PASS": "pass",
};

function fresh() {
  return { tier: "free", code: null, passExpiry: null, validatedAt: null };
}

let ent = load() || fresh();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return (p && typeof p === "object" && "tier" in p) ? Object.assign(fresh(), p) : null;
  } catch (_) { return null; }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(ent)); } catch (_) {}
}

/* ---------- public API ---------- */

export function isPremium() {
  if (ent.tier === "premium") return true;
  if (ent.tier === "pass" && ent.passExpiry && Date.now() < ent.passExpiry) return true;
  return false;
}

export function getTier() {
  // collapse an expired pass back to free for display/logic
  if (ent.tier === "pass" && (!ent.passExpiry || Date.now() >= ent.passExpiry)) return "free";
  return ent.tier;
}

export function passActiveUntil() {
  return ent.tier === "pass" ? ent.passExpiry : null;
}

/* hours left on an active pass (0 if none) */
export function passHoursLeft() {
  if (!isPremium() || ent.tier !== "pass") return 0;
  return Math.max(0, Math.ceil((ent.passExpiry - Date.now()) / 3_600_000));
}

/**
 * Redeem a code. Phase 0: checked against LOCAL_CODES.
 * Returns { ok, tier } or { ok:false, reason }.
 */
export function redeem(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return { ok: false, reason: "empty" };
  const grant = LOCAL_CODES[code];
  if (!grant) return { ok: false, reason: "invalid" };

  ent.code = code;
  ent.tier = grant;
  ent.validatedAt = Date.now();
  ent.passExpiry = grant === "pass" ? Date.now() + PASS_HOURS * 3_600_000 : null;
  persist();
  return { ok: true, tier: grant };
}

/**
 * Re-validate on boot. Phase 0: just expire a stale pass.
 * Phase 1: POST { code } to /api/validate and reconcile, honoring GRACE_MS.
 */
export async function refresh() {
  if (ent.tier === "pass" && ent.passExpiry && Date.now() >= ent.passExpiry) {
    // pass lapsed → return to free, but remember it lapsed for the upsell
    ent.tier = "free";
    ent.passLapsed = true;
    persist();
  }
  // (Phase 1) const r = await fetch("/api/validate", {method:"POST", body:JSON.stringify({code:ent.code})}) ...
  return getTier();
}

/* one-time flag: did a Žur Pass just lapse? (drives the post-pass upsell) */
export function consumePassLapsed() {
  if (ent.passLapsed) { ent.passLapsed = false; persist(); return true; }
  return false;
}

/* dev/testing helper — force a tier without a code */
export function devSetTier(tier) {
  ent.tier = tier;
  ent.passExpiry = tier === "pass" ? Date.now() + PASS_HOURS * 3_600_000 : null;
  ent.validatedAt = Date.now();
  persist();
}

export function reset() { ent = fresh(); persist(); }

/* Sync tier from a Supabase profiles row (called after login). */
export function setFromProfile(profile) {
  if (!profile) return;
  ent.tier = profile.tier || "free";
  ent.passExpiry = profile.pass_expiry ? new Date(profile.pass_expiry).getTime() : null;
  ent.validatedAt = Date.now();
  persist();
}
