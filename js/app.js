/* ===========================================================
   app.js — entry point: controller, router, persistence glue
   =========================================================== */

import {
  state, save, resetAll, resetRound, PRICING,
  addPlayer, removePlayer, currentPlayer, nextTurn, canStartGame,
} from "./state.js";
import { buildDeck, drawCard } from "./deck.js";
import * as audio from "./audio.js";
import * as confetti from "./confetti.js";
import * as entitlement from "./entitlement.js";
import { track } from "./analytics.js";
import {
  HomeScreen, SetupScreen, ModeScreen, GameScreen, SummaryScreen,
  AdultGateModal, QuitModal, HowToModal, PaywallModal,
} from "./screens.js";

const root = document.getElementById("app");
let modalNode = null;

const SCREENS = {
  home: HomeScreen,
  setup: SetupScreen,
  mode: ModeScreen,
  game: GameScreen,
  summary: SummaryScreen,
};

/* shared controller passed to every screen */
const ctx = {
  state,
  save,
  audio,
  confetti,

  // navigation
  go(screen) {
    state.screen = screen;
    save();
    render();
  },
  rerender: render,

  // theme: recolor accent CSS vars
  setTheme(accent, deep) {
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-deep", deep);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", accent);
  },

  // player mutators (thin wrappers so screens stay decoupled from state.js)
  addPlayer,
  removePlayer,
  currentPlayer,
  nextTurn,
  canStartGame,

  // deck
  drawCard() { return drawCard(state); },

  // game lifecycle
  startGame() {
    resetRound();
    state.deck = buildDeck(state.mode, state.difficulty, state.includeDrinks);
    state.current = null;
    drawCard(state);
    closeModal();
    this.go("game");
  },
  playAgain() {
    resetRound();
    state.deck = buildDeck(state.mode, state.difficulty, state.includeDrinks);
    state.current = null;
    drawCard(state);
    this.go("game");
  },
  goHomeReset() {
    resetRound();
    state.current = null;
    this.go("home");
  },

  // small celebratory flourish when someone racks up sips
  bumpScore() {
    const p = currentPlayer();
    if (p && p.sips > 0 && p.sips % 10 === 0) confetti.burst(40, 0.4);
  },

  // ---- monetization ----
  isPremium: entitlement.isPremium,
  getTier: entitlement.getTier,
  passHoursLeft: entitlement.passHoursLeft,
  track,

  showPaywall(source = "generic") {
    track("paywall_view", { source });
    openModal((c) => PaywallModal(c, source));
  },
  // Phase 0: no live checkout yet → open Stripe Payment Link if set, else
  // steer the user to the redeem-code field. Phase 1 swaps in api/create-checkout.
  startCheckout(tier) {
    track("checkout_start", { tier });
    const plan = PRICING.find((p) => p.id === tier);
    if (plan && plan.link) { window.open(plan.link, "_blank", "noopener"); return true; }
    return false; // caller shows the "vnesi kodo" hint
  },
  redeemCode(code) {
    const r = entitlement.redeem(code);
    track(r.ok ? "redeem_ok" : "redeem_fail", r.ok ? { tier: r.tier } : {});
    if (r.ok) { audio.success(); confetti.burst(110, 0.3); }
    return r;
  },
  async refreshEntitlement() { return entitlement.refresh(); },

  // modals
  showAdultGate() { openModal(AdultGateModal); },
  confirmQuit() { openModal(QuitModal); },
  showHowTo() { openModal(HowToModal); },
  closeModal,
};

function render() {
  // wipe + render current screen
  const builder = SCREENS[state.screen] || HomeScreen;
  root.innerHTML = "";
  root.appendChild(builder(ctx));
  window.scrollTo(0, 0);
}

function openModal(builder) {
  closeModal();
  modalNode = builder(ctx);
  document.body.appendChild(modalNode);
  // tap on backdrop (outside .modal) closes, except the adult gate
  modalNode.addEventListener("click", (e) => {
    if (e.target === modalNode && builder !== AdultGateModal) closeModal();
  });
}

function closeModal() {
  if (modalNode && modalNode.parentNode) modalNode.parentNode.removeChild(modalNode);
  modalNode = null;
}

/* ---- resilience: if a saved game points at a screen needing data we
   no longer have, fall back gracefully ---- */
function sanitizeStart() {
  if (state.screen === "game" && (!state.players.length || !state.current)) {
    state.screen = state.players.length ? "mode" : "home";
  }
  if (state.screen === "summary" && !state.players.length) state.screen = "home";
}

sanitizeStart();
render();

// re-validate entitlement on boot (Phase 0: just expires a stale pass),
// then repaint so any change in premium status is reflected immediately.
entitlement.refresh().then((tier) => { if (tier) render(); });
