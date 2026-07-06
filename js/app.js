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
  AdultGateModal, QuitModal, GameSettingsModal, HowToModal, RevealHelpModal, CardTypeModal, PaywallModal,
  CheckoutConsentModal, AgeGateModal, LoginScreen,
  CustomCardsScreen,
} from "./screens.js";
import {
  getSession, getProfile, signIn, signUp, signOut as authSignOutFn,
  resetPassword, updatePassword, signInWithGoogle, displayName, supabase,
  getCustomCards, addCustomCard, deleteCustomCard,
} from "./auth.js";

const root = document.getElementById("app");
let modalNode = null;
let _tiltCleanup = null;

const CC_DISABLED_KEY = "naZdravje.cc.off.v1";
function getDisabledIds() {
  try { return new Set(JSON.parse(localStorage.getItem(CC_DISABLED_KEY) || "[]")); } catch (_) { return new Set(); }
}
function toggleDisabledId(id) {
  const s = getDisabledIds();
  if (s.has(id)) s.delete(id); else s.add(id);
  try { localStorage.setItem(CC_DISABLED_KEY, JSON.stringify([...s])); } catch (_) {}
}

// Guest mode: play without an account. Persisted so a refresh doesn't bounce
// back to the login screen.
const GUEST_KEY = "naZdravje.guest.v1";
function isGuestActive() { try { return localStorage.getItem(GUEST_KEY) === "1"; } catch (_) { return false; } }
function setGuest(on) {
  try { on ? localStorage.setItem(GUEST_KEY, "1") : localStorage.removeItem(GUEST_KEY); } catch (_) {}
}

// Set when a logged-out user taps a paid plan: after they sign in we reopen the
// paywall so they can finish the purchase. Persisted so it survives the Google
// OAuth round-trip (which reloads the page).
const RETURN_PAYWALL_KEY = "naZdravje.returnPaywall.v1";
function consumeReturnPaywall() {
  try {
    if (localStorage.getItem(RETURN_PAYWALL_KEY) === "1") {
      localStorage.removeItem(RETURN_PAYWALL_KEY);
      return true;
    }
  } catch (_) {}
  return false;
}

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
    if (entitlement.isPremium() && ctx.currentUser) {
      try {
        const { data } = await getCustomCards(ctx.currentUser.id, state.mode, state.difficulty);
        const disabled = getDisabledIds();
        state.customCards = (data || []).filter((c) => !disabled.has(c.id));
      } catch (_) {
        state.customCards = [];
      }
    } else {
      state.customCards = [];
    }
    state.pool = buildDeck(state.mode, state.difficulty, state.cardTypeFilters);
    state.deck = state.pool.slice();
    state.current = null;
    drawCard(state);
    closeModal();
    showClinkAnimation(() => ctx.go("game"));
  },
  playAgain() {
    resetRound();
    state.pool = buildDeck(state.mode, state.difficulty, state.cardTypeFilters);
    state.deck = state.pool.slice();
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
  authSignInWithGoogle: signInWithGoogle,
  displayName: () => displayName(ctx.currentUser),

  async onAuthSuccess(session) {
    if (!session) session = await getSession();
    if (!session) { showLogin(); return; }
    setGuest(false);
    ctx.isGuest = false;
    ctx.currentUser = session.user;
    const { data: profile } = await getProfile(session.user.id);
    if (profile) entitlement.setFromProfile(profile);
    sanitizeStart();
    render();
    // Came here from tapping a plan while logged out → drop them back on the paywall.
    if (consumeReturnPaywall() && !entitlement.isPremium()) ctx.showPaywall("post_login");
  },

  // A logged-out user tapped a paid plan: remember to reopen the paywall, then
  // send them to the login form.
  loginThenReturnToPaywall() {
    try { localStorage.setItem(RETURN_PAYWALL_KEY, "1"); } catch (_) {}
    setGuest(false);
    ctx.isGuest = false;
    closeModal();
    showLogin("login");
  },

  async signOut() {
    await authSignOutFn();
    ctx.currentUser = null;
    entitlement.reset();
    resetAll();
    showLogin();
  },

  // ---- guest mode ----
  isGuest: false,
  // Start playing without an account (free tier, no cloud features).
  continueAsGuest() {
    setGuest(true);
    ctx.isGuest = true;
    ctx.currentUser = null;
    entitlement.reset();
    resetAll();
    state.screen = "home";
    save();
    render();
  },
  // Leave guest mode to register / log in (e.g. to buy premium). Keeps the
  // current game state so they can pick up right where they left off.
  exitGuestToLogin(mode = "login") {
    setGuest(false);
    ctx.isGuest = false;
    showLogin(mode);
  },
  // Pop-up shown when a guest taps a premium plan: prompts them to make an
  // account, then sends them to the auth form (game state is preserved).
  promptGuestRegister() {
    openModal((c) => _guestRegisterModal(c));
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

  showCheckoutConsent(tier) {
    openModal((c) => CheckoutConsentModal(c, tier));
  },

  startCheckout(tier) {
    track("checkout_start", { tier });
    const plan = PRICING.find((p) => p.id === tier);
    if (plan && plan.link) {
      const email = ctx.currentUser?.email || "";
      const url = email
        ? `${plan.link}?prefilled_email=${encodeURIComponent(email)}`
        : plan.link;
      // Navigate in the same tab so Stripe's success redirect (?payment=success)
      // lands back here and boot() detects it. In Stripe Dashboard set the
      // Payment Link "After payment" redirect to: <your-domain>?payment=success
      window.location.href = url;
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

  async refreshEntitlement() {
    if (ctx.currentUser) {
      const { data: profile } = await getProfile(ctx.currentUser.id);
      if (profile) entitlement.setFromProfile(profile);
    }
    return entitlement.refresh();
  },

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
  isCardDisabled(id) { return getDisabledIds().has(id); },
  toggleCardDisabled(id) { toggleDisabledId(id); },
  manageCustomCards() { ctx.go("customCards"); },

  // ---- tilt sensor cleanup (called on each render to kill old listeners) ----
  setTiltCleanup(fn) { _tiltCleanup = fn; },

  // modals
  showAdultGate() { openModal(AdultGateModal); },
  confirmQuit() { openModal(QuitModal); },
  openGameSettings() { openModal(GameSettingsModal); },
  showHowTo() { openModal(HowToModal); },
  showRevealHelp() { openModal(RevealHelpModal); },
  showCardTypeFilter(onClose) { openModal((c) => CardTypeModal(c, onClose)); },
  closeModal,
};

function render() {
  if (_tiltCleanup) { _tiltCleanup(); _tiltCleanup = null; }
  const builder = SCREENS[state.screen] || HomeScreen;
  root.innerHTML = "";
  root.appendChild(builder(ctx));
  syncBottomNav(state.screen);
  window.scrollTo(0, 0);
  // One-time age/responsible-drinking gate in front of any actual game screen.
  if (!state.ageAcknowledged && !modalNode) openModal(AgeGateModal);
}

function showLogin(mode) {
  closeModal();
  root.innerHTML = "";
  root.appendChild(LoginScreen(ctx, mode));
  syncBottomNav("login");
  window.scrollTo(0, 0);
}

/* ---- bottom navigation (browsing screens only, never in-game or login) ---- */
const NAV_SCREENS = new Set(["home", "setup", "mode", "summary", "customCards"]);
let _navEl = null;
function buildBottomNav() {
  const nav = document.createElement("nav");
  nav.id = "bottom-nav";
  nav.setAttribute("aria-label", "Navigacija");
  nav.innerHTML = `
    <button class="nav-item" data-nav="home"><span class="nav-ico">🏠</span><span class="nav-label">Domov</span></button>
    <button class="nav-item" data-nav="play"><span class="nav-ico">🎲</span><span class="nav-label">Igraj</span></button>
    <button class="nav-item nav-premium" data-nav="premium"><span class="nav-ico">👑</span><span class="nav-label">Premium</span></button>
    <button class="nav-item" data-nav="how"><span class="nav-ico">📖</span><span class="nav-label">Pravila</span></button>
    <button class="nav-item" data-nav="account"><span class="nav-ico">👤</span><span class="nav-label">Račun</span></button>
  `;
  nav.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-nav]");
    if (!btn) return;
    audio.pop();
    switch (btn.dataset.nav) {
      case "home": ctx.go("home"); break;
      case "play": ctx.go("setup"); break;
      case "premium":
        if (entitlement.isPremium() && ctx.currentUser) ctx.manageCustomCards();
        else ctx.showPaywall("nav");
        break;
      case "how": ctx.showHowTo(); break;
      case "account":
        if (ctx.currentUser) openModal((c) => _accountModal(c));
        else ctx.exitGuestToLogin("login");
        break;
    }
  });
  document.body.appendChild(nav);
  return nav;
}
function syncBottomNav(screen) {
  if (!_navEl) _navEl = buildBottomNav();
  const show = NAV_SCREENS.has(screen);
  _navEl.classList.toggle("show", show);
  document.body.classList.toggle("nav-open", show);
  const activeMap = { home: "home", setup: "play", mode: "play", customCards: "premium" };
  const active = activeMap[screen] || "";
  _navEl.querySelectorAll("[data-nav]").forEach((b) => {
    b.classList.toggle("active", b.dataset.nav === active);
  });
}
function _accountModal(ctx) {
  const escv = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const node = document.createElement("div");
  node.className = "modal-backdrop";
  const premium = ctx.isPremium();
  node.innerHTML = `
    <div class="modal">
      <div class="big-emoji">${premium ? "👑" : "👤"}</div>
      <h2>${escv(ctx.displayName())}</h2>
      <p>${escv(ctx.currentUser?.email || "")}${premium ? "<br>✨ Premium aktiven" : ""}</p>
      <div class="stack">
        <button class="btn" data-act="close">Zapri</button>
        <button class="btn btn-ghost" data-act="logout">Odjava</button>
      </div>
    </div>
  `;
  node.querySelector('[data-act="logout"]').onclick = () => { ctx.audio.pop(); ctx.closeModal(); ctx.signOut(); };
  node.querySelector('[data-act="close"]').onclick = () => { ctx.audio.pop(); ctx.closeModal(); };
  return node;
}

function openModal(builder) {
  closeModal();
  modalNode = builder(ctx);
  document.body.appendChild(modalNode);
  modalNode.addEventListener("click", (e) => {
    if (e.target === modalNode && builder !== AdultGateModal && builder !== AgeGateModal) closeModal();
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

/* Celebrate when free→premium transition is detected. */
function _onPaymentConfirmed() {
  audio.success();
  confetti.burst(120, 0.3);
  render();
  openModal((c) => _paymentSuccessModal(c));
}

/* Poll the profile at increasing intervals; resolve once premium or give up. */
async function _pollUntilPremium(userId, attempts = [3000, 6000, 12000, 20000]) {
  for (const delay of attempts) {
    await new Promise((r) => setTimeout(r, delay));
    const { data } = await getProfile(userId);
    if (!data) continue;
    const wasFree = !entitlement.isPremium();
    entitlement.setFromProfile(data);
    if (wasFree && entitlement.isPremium()) { _onPaymentConfirmed(); return; }
    if (entitlement.isPremium()) return; // already premium, nothing to do
  }
}

/* ---- boot: check session first, then render ---- */
async function boot() {
  // Surface OAuth provider errors (Google sends ?error=… or #error=…) instead
  // of silently bouncing to a blank/login screen.
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const qParams    = new URLSearchParams(window.location.search);
  const oauthError = qParams.get("error_description") || qParams.get("error")
                  || hashParams.get("error_description") || hashParams.get("error");
  if (oauthError) {
    history.replaceState(null, "", window.location.pathname);
    showLogin();
    const errEl = document.getElementById("auth-err");
    if (errEl) {
      const raw = decodeURIComponent(oauthError);
      errEl.textContent = /expired|invalid/i.test(raw)
        ? "Povezava ni veljavna ali je potekla. Registriraj se znova."
        : "Prijava ni uspela: " + raw;
    }
    return;
  }

  // Did the user just click the email-confirmation link? (implicit flow puts
  // type=signup in the hash; PKCE returns a ?code we exchange below.)
  const confirmedSignup = hashParams.get("type") === "signup";

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

  let session = null;
  try {
    session = await getSession();
  } catch (e) {
    console.error("getSession failed:", e);
  }

  // Returning from Google OAuth — supabase consumed the code; tidy the URL
  if (params.has("code") || window.location.hash.includes("access_token")) {
    history.replaceState(null, "", window.location.pathname);
  }

  if (!session) {
    if (isGuestActive()) {
      ctx.isGuest = true;
      sanitizeStart();
      render();
      return;
    }
    showLogin();
    return;
  }

  // A real session wins over any leftover guest flag.
  setGuest(false);
  ctx.isGuest = false;
  ctx.currentUser = session.user;
  const { data: profile } = await getProfile(session.user.id);
  if (profile) entitlement.setFromProfile(profile);

  sanitizeStart();
  render();
  entitlement.refresh();

  // Fresh from confirming their email — welcome them in.
  if (confirmedSignup) {
    audio.success();
    confetti.burst(110, 0.3);
    openModal((c) => _welcomeModal(c));
  } else if (consumeReturnPaywall() && !entitlement.isPremium()) {
    // Signed in via Google specifically to buy → reopen the paywall.
    ctx.showPaywall("post_login");
  }

  // After a Stripe redirect: poll with back-off until the webhook lands
  if (paymentReturn && !entitlement.isPremium()) {
    _pollUntilPremium(session.user.id);
  }
}

function _guestRegisterModal(ctx) {
  const node = document.createElement("div");
  node.className = "modal-backdrop";
  node.innerHTML = `
    <div class="modal">
      <div class="big-emoji">👑</div>
      <h2>Za nakup potrebuješ račun</h2>
      <p>Ustvari račun ali se prijavi, da odkleneš Premium. Tvoja igra se ohrani. 🍻</p>
      <div class="stack">
        <button class="btn" data-act="go">Registracija / Prijava →</button>
        <button class="btn btn-ghost" data-act="later">Mogoče kasneje</button>
      </div>
    </div>
  `;
  node.querySelector('[data-act="go"]').onclick = () => { ctx.audio.pop(); ctx.exitGuestToLogin("login"); };
  node.querySelector('[data-act="later"]').onclick = () => { ctx.audio.pop(); ctx.closeModal(); };
  return node;
}

function _welcomeModal(ctx) {
  const node = document.createElement("div");
  node.className = "modal-backdrop";
  node.innerHTML = `
    <div class="modal">
      <div class="big-emoji">🎉</div>
      <h2>E-pošta potrjena!</h2>
      <p>Tvoj račun je aktiviran. Dobrodošel — na zdravje! 🍻</p>
      <div class="stack">
        <button class="btn" data-act="ok">Začni 🚀</button>
      </div>
    </div>
  `;
  node.querySelector('[data-act="ok"]').onclick = () => { ctx.audio.pop(); ctx.closeModal(); };
  return node;
}

/* When the user switches back to this tab after paying in Stripe,
   re-check their profile so the UI updates without a manual reload. */
document.addEventListener("visibilitychange", async () => {
  if (document.hidden || !ctx.currentUser) return;
  const wasFree = !entitlement.isPremium();
  const { data } = await getProfile(ctx.currentUser.id);
  if (!data) return;
  entitlement.setFromProfile(data);
  if (wasFree && entitlement.isPremium()) _onPaymentConfirmed();
});

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
