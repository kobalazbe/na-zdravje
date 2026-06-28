/* ===========================================================
   analytics.js — minimal, privacy-friendly event counter.
   Phase 0: counts events in localStorage + console (no network,
   no cookies, no PII). Phase 1/2: also POST to Plausible/Umami
   or a tiny beacon — keep the track() signature identical so
   call sites never change.

   Funnel events used by the paywall:
     paywall_view{source}, mode_lock_tap, redeem_ok, redeem_fail,
     checkout_start{tier}, purchase{tier}
   =========================================================== */

const KEY = "naZdravje.analytics.v1";

function loadCounts() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch (_) { return {}; }
}

export function track(event, props = {}) {
  // build a stable key: "event" or "event:source=mode_lock"
  const suffix = Object.entries(props)
    .map(([k, v]) => `${k}=${v}`).join(",");
  const name = suffix ? `${event}:${suffix}` : event;

  const counts = loadCounts();
  counts[name] = (counts[name] || 0) + 1;
  try { localStorage.setItem(KEY, JSON.stringify(counts)); } catch (_) {}

  // visible while developing; harmless in prod
  if (typeof console !== "undefined") console.debug("[track]", name, counts[name]);

  // (Phase 1) navigator.sendBeacon?.("/api/event", JSON.stringify({ name }));
}

/* read the funnel back (for a future admin view / debugging) */
export function snapshot() { return loadCounts(); }
