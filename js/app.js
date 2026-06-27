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
  AdultGateModal, QuitModal, HowToModal, PaywallModal, LoginScreen,
  CustomCardsScreen,
} from "./screens.js";
import {
  getSession, getProfile, signIn, signUp, signOut as authSignOutFn,
  resetPassword, updatePassword, supabase,
  getCustomCards, addCustomCard, deleteCustomCard,
} from "./auth.js";

const root = document.getElementById("app");
let modalNode = null;
let _tiltCleanup = null;

const SCREENS = {
  home: HomeScreen,
  setup: SetupScreen,
  mode: ModeScreen,
  game: GameScreen,
  summary: SummaryScreen,
  customCards: CustomCardsScreen,
};

/* shared controller passed to every screen */
const ctx = {
  state,
  save,
  audio,
  confetti,
  currentUser: null,

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
  async startGame() {
    resetRound();
    // Prefetch custom cards for premium users (mode+difficulty specific)
    if (entitlement.isPremium() && ctx.currentUser) {
      const { data } = await getCustomCards(ctx.currentUser.id, state.mode, state.difficulty);
      state.customCards = data || [];
    } else {
      state.customCards = [];
    }
    state.deck = buildDeck(state.mode, state.difficulty, state.includeDrinks);
    state.current = null;
    drawCard(state);
    closeModal();
    showClinkAnimation(() => ctx.go("game"));
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

  // ---- auth ----
  authSignIn: signIn,
  authSignUp: signUp,
  authResetPassword: resetPassword,
  authUpdatePassword: updatePassword,

  async onAuthSuccess(session) {
    if (!session) session = await getSession();
    if (!session) { showLogin(); return; }
    ctx.currentUser = session.user;
    const { data: profile } = await getProfile(session.user.id);
    if (profile) entitlement.setFromProfile(profile);
    sanitizeStart();
    render();
  },

  async signOut() {
    await authSignOutFn();
    ctx.currentUser = null;
    entitlement.reset();
    resetAll();
    showLogin();
  },

  // ---- monetization ----
  isPremium: entitlement.isPremium,
  getTier: entitlement.getTier,
  passHoursLeft: entitlement.passHoursLeft,
  track,

  showPaywall(source = "generic", onDismiss) {
    track("paywall_view", { source });
    openModal((c) => PaywallModal(c, source, onDismiss));
  },
  startCheckout(tier) {
    track("checkout_start", { tier });
    const plan = PRICING.find((p) => p.id === tier);
    if (plan && plan.link) {
      const email = ctx.currentUser?.email || "";
      const url = email
        ? `${plan.link}?prefilled_email=${encodeURIComponent(email)}`
        : plan.link;
      window.open(url, "_blank", "noopener");
      return true;
    }
    return false;
  },
  redeemCode(code) {
    const r = entitlement.redeem(code);
    track(r.ok ? "redeem_ok" : "redeem_fail", r.ok ? { tier: r.tier } : {});
    if (r.ok) { audio.success(); confetti.burst(110, 0.3); }
    return r;
  },
  async refreshEntitlement() { return entitlement.refresh(); },

  // ---- custom cards ----
  getCustomCards(mode, difficulty) {
    if (!ctx.currentUser) return Promise.resolve({ data: [], error: null });
    return getCustomCards(ctx.currentUser.id, mode, difficulty);
  },
  addCustomCard(card) {
    if (!ctx.currentUser) return Promise.resolve({ data: null, error: { message: "Not logged in" } });
    return addCustomCard(ctx.currentUser.id, card);
  },
  deleteCustomCard(id) { return deleteCustomCard(id); },
  manageCustomCards() { ctx.go("customCards"); },

  // ---- tilt sensor cleanup (called on each render to kill old listeners) ----
  setTiltCleanup(fn) { _tiltCleanup = fn; },

  // modals
  showAdultGate() { openModal(AdultGateModal); },
  confirmQuit() { openModal(QuitModal); },
  showHowTo() { openModal(HowToModal); },
  closeModal,
};

function render() {
  if (_tiltCleanup) { _tiltCleanup(); _tiltCleanup = null; }
  const builder = SCREENS[state.screen] || HomeScreen;
  root.innerHTML = "";
  root.appendChild(builder(ctx));
  window.scrollTo(0, 0);
}

function showLogin() {
  closeModal();
  root.innerHTML = "";
  root.appendChild(LoginScreen(ctx));
  window.scrollTo(0, 0);
}

function openModal(builder) {
  closeModal();
  modalNode = builder(ctx);
  document.body.appendChild(modalNode);
  modalNode.addEventListener("click", (e) => {
    if (e.target === modalNode && builder !== AdultGateModal) closeModal();
  });
}

function closeModal() {
  if (modalNode && modalNode.parentNode) modalNode.parentNode.removeChild(modalNode);
  modalNode = null;
}

/* Beer-clink start animation — runs over the top, then calls cb. */
function showClinkAnimation(cb) {
  const ov = document.createElement("div");
  ov.className = "clink-overlay";
  ov.innerHTML = `
    <div class="clink-mugs"><span class="clink-l">🍺</span><span class="clink-r">🍺</span></div>
    <div class="clink-label">Na zdravje! 🎉</div>
  `;
  document.body.appendChild(ov);
  setTimeout(() => {
    ov.classList.add("clink-out");
    setTimeout(() => { if (ov.parentNode) ov.remove(); cb(); }, 340);
  }, 940);
}

function sanitizeStart() {
  if (state.screen === "game" && (!state.players.length || !state.current)) {
    state.screen = state.players.length ? "mode" : "home";
  }
  if (state.screen === "summary" && !state.players.length) state.screen = "home";
  if (state.screen === "customCards" && !entitlement.isPremium()) state.screen = "home";
}

/* ---- boot: check session first, then render ---- */
async function boot() {
  if (window.location.hash.includes("type=recovery")) {
    history.replaceState(null, "", window.location.pathname);
    await getSession();
    root.innerHTML = "";
    root.appendChild(LoginScreen(ctx, "reset"));
    return;
  }

  // Returning from Stripe checkout — strip the param then verify
  const params = new URLSearchParams(window.location.search);
  const paymentReturn = params.get("payment") === "success";
  if (paymentReturn) history.replaceState(null, "", window.location.pathname);

  const session = await getSession();

  if (!session) {
    showLogin();
    return;
  }

  ctx.currentUser = session.user;
  const { data: profile } = await getProfile(session.user.id);
  if (profile) entitlement.setFromProfile(profile);

  sanitizeStart();
  render();
  entitlement.refresh();

  // After a Stripe redirect: give the webhook ~3 s to land, then re-check
  if (paymentReturn) {
    setTimeout(async () => {
      const { data: fresh } = await getProfile(session.user.id);
      if (!fresh) return;
      const wasFreeBefore = !entitlement.isPremium();
      entitlement.setFromProfile(fresh);
      if (wasFreeBefore && entitlement.isPremium()) {
        audio.success();
        confetti.burst(120, 0.3);
        render(); // rerender home with premium badge
        openModal((c) => _paymentSuccessModal(c));
      }
    }, 3000);
  }
}

function _paymentSuccessModal(ctx) {
  const node = document.createElement("div");
  node.className = "modal-backdrop";
  node.innerHTML = `
    <div class="modal">
      <div class="big-emoji">🎉</div>
      <h2>Dobrodošel v Premium!</h2>
      <p>Tvoj dostop je aktiviran. Uživaj v vseh vsebinah!</p>
      <div class="stack">
        <button class="btn" data-act="ok">Začni igrati 🚀</button>
      </div>
    </div>
  `;
  node.querySelector('[data-act="ok"]').onclick = () => { ctx.audio.pop(); ctx.closeModal(); };
  return node;
}

boot();
