/* ===========================================================
   state.js — game state shape, persistence & helpers
   =========================================================== */

const STORAGE_KEY = "naZdravje.v1";

// bright avatar palette + emoji pool assigned to players in order
export const AVATAR_COLORS = [
  "#ff6b6b", "#4dabf7", "#38d9a9", "#845ef7",
  "#ff8cc8", "#ffd43b", "#ff922b", "#22b8cf",
  "#94d82d", "#f06595",
];
export const AVATAR_EMOJI = [
  "🦊", "🐸", "🐼", "🦄", "🐯", "🐵", "🐙", "🐧", "🦁", "🐨",
];

export const MODES = {
  classic: {
    id: "classic",
    name: "Klasično",
    emoji: "🎉",
    blurb: "Zabavna vprašanja in izzivi za vsako družbo.",
    color: "#4dabf7",
    colorDeep: "#1f8de0",
    adult: false,
  },
  spicy: {
    id: "spicy",
    name: "Pikantno",
    emoji: "🌶️",
    blurb: "Drznejše in flirtavo — samo za odrasle glave.",
    color: "#f06595",
    colorDeep: "#d6336c",
    adult: true,
  },
};

export const DIFFICULTIES = {
  lahko:  { id: "lahko",  name: "Lahko",  ico: "😇", color: "#38d9a9", colorDeep: "#1fb586" },
  sredje: { id: "sredje", name: "Srednje", ico: "😏", color: "#ff922b", colorDeep: "#e8590c" },
  divje:  { id: "divje",  name: "Divje",  ico: "🔥", color: "#ff6b6b", colorDeep: "#e03131" },
};

/* How many `izziv` challenges a player may skip per game — independent of
   difficulty, its own selectable setting. `value: Infinity` lives in module
   scope (not `state`) so it survives — it never gets JSON-serialized. `p.skips`
   (per player, zeroed by resetRound) is the budget counter. When the budget is
   spent the skip button disappears — you must do it. */
export const SKIP_LIMIT_OPTIONS = {
  unlimited: { id: "unlimited", name: "Neomejeno", ico: "♾️", color: "#38d9a9", colorDeep: "#1fb586", value: Infinity },
  three:     { id: "three",     name: "3x",        ico: "🍺", color: "#ff922b", colorDeep: "#e8590c", value: 3 },
  one:       { id: "one",       name: "1x",        ico: "🔥", color: "#ff6b6b", colorDeep: "#e03131", value: 1 },
};

// canonical card-type metadata (label + emoji shown on the card)
export const CARD_TYPES = {
  vprasanje:  { label: "Vprašanje",      emoji: "💬", color: "#845ef7", colorDeep: "#6741d9" },
  izziv:      { label: "Izziv",          emoji: "🎯", color: "#ff922b", colorDeep: "#e8590c" },
  skupinski:  { label: "Skupinski izziv", emoji: "👥", color: "#22b8cf", colorDeep: "#0c8599" },
  pijaca:     { label: "Pij!",           emoji: "🍺", color: "#ff6b6b", colorDeep: "#e03131" },
  glasovanje: { label: "Glasovanje",     emoji: "🗳️", color: "#fab005", colorDeep: "#f08c00" },
  pravilo:    { label: "Pravilo",        emoji: "⚡", color: "#5c7cfa", colorDeep: "#4263eb" },
  dogodek:    { label: "Dogodek",        emoji: "🎲", color: "#82c91e", colorDeep: "#5c940d" },
};

/* ---- Monetization config ----
   Free tier: Klasično only, all 3 difficulties but a capped pool per
   difficulty (taste the range, hit repeats fast). Pikantno is premium. */
export const FREE_LIMITS = {
  classic: { lahko: 15, sredje: 15, divje: 15 },
  spicy:   { lahko: 0,  sredje: 0,  divje: 0 },
};

// every Nth free card is a locked premium teaser dealt into the game
export const FREE_TEASER_EVERY = 8;

/* Premium tiers shown in the paywall (Stripe Prices wired in Phase 1).
   `link` = Stripe Payment Link / Checkout URL (placeholder until Phase 1). */
export const PRICING = [
  { id: "pass",    emoji: "🎟️", name: "Žur Pass",  price: "2,49 €",  sub: "48 ur vsega",            link: "https://buy.stripe.com/test_14AaEWgEL8gxcY54krcIE03" },
  { id: "monthly", emoji: "🍻", name: "Mesečno",   price: "3,99 €",  sub: "/mesec",                 link: "https://buy.stripe.com/test_8x27sKgELfIZ0bj18fcIE04" },
  { id: "yearly",  emoji: "👑", name: "Letno",     price: "19,99 €", sub: "/leto · prihraniš 58 %", link: "https://buy.stripe.com/test_9B6fZgbkrdAR8HP6szcIE05", best: true },
];

function freshState() {
  return {
    screen: "home",        // home | setup | mode | game | summary
    players: [],           // { id, name, color, emoji, sips, done, skips }
    mode: null,            // "classic" | "spicy"
    difficulty: null,      // "lahko" | "sredje" | "divje"
    skipLimit: "unlimited", // "unlimited" | "three" | "one" — challenge skips per game
    cardTypeFilters: {     // which card types are included this game (all on by default)
      vprasanje: true, izziv: true, skupinski: true, pijaca: true,
      glasovanje: true, pravilo: true, dogodek: true,
    },
    adultConfirmed: false,
    // runtime game data
    turn: 0,               // index into players
    round: 1,
    deck: [],              // shuffled remaining cards
    current: null,         // the card on screen
    cardsPlayed: 0,
    freeDraws: 0,          // free-tier draw counter (drives teaser cadence)
    repeated: false,       // free deck has cycled → show repetition nudge
    shakeEnabled: true,    // motion-reveal (shake + tilt) on/off
    activeRules: [],       // active "pravilo" cards: { text, turnsLeft }; ticks down
                           // once per turn in advance() — one full lap of the table
    pool: [],              // fixed card set for this game — reshuffled, never re-sampled,
                           // so a card can only repeat after every other card has been shown
  };
}

export const state = load() || freshState();

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) { /* storage may be unavailable; ignore */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // guard against an old/broken shape
    if (!parsed || typeof parsed !== "object" || !("screen" in parsed)) return null;
    const merged = Object.assign(freshState(), parsed);
    // one-time migration: old boolean drink toggle → new per-type filter map
    if (typeof parsed.includeDrinks === "boolean" && !parsed.cardTypeFilters) {
      merged.cardTypeFilters = { ...merged.cardTypeFilters, pijaca: parsed.includeDrinks };
    }
    delete merged.includeDrinks;
    // one-time migration: skip limit used to be implied by difficulty
    if (!parsed.skipLimit) {
      const carried = { lahko: "unlimited", sredje: "three", divje: "one" };
      merged.skipLimit = carried[parsed.difficulty] || "unlimited";
    }
    return merged;
  } catch (_) {
    return null;
  }
}

export function resetAll() {
  Object.assign(state, freshState());
  save();
}

/* keep players/settings but clear the in-progress round */
export function resetRound() {
  state.turn = 0;
  state.round = 1;
  state.deck = [];
  state.current = null;
  state.cardsPlayed = 0;
  state.freeDraws = 0;
  state.repeated = false;
  state.repeatedDismissed = false;
  state.activeRules = [];
  state.pool = [];
  state.players.forEach((p) => { p.sips = 0; p.done = 0; p.skips = 0; });
}

/* ---------- player helpers ---------- */
export function addPlayer(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (state.players.length >= 10) return false;
  const i = state.players.length;
  state.players.push({
    id: Date.now() + "-" + i,
    name: trimmed.slice(0, 16),
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    emoji: AVATAR_EMOJI[i % AVATAR_EMOJI.length],
    sips: 0,
    done: 0,
    skips: 0,
  });
  save();
  return true;
}

export function removePlayer(id) {
  state.players = state.players.filter((p) => p.id !== id);
  // re-assign colors/emoji so they stay sequential & distinct
  state.players.forEach((p, i) => {
    p.color = AVATAR_COLORS[i % AVATAR_COLORS.length];
    p.emoji = AVATAR_EMOJI[i % AVATAR_EMOJI.length];
  });
  save();
}

export function currentPlayer() {
  return state.players[state.turn] || null;
}

export function nextTurn() {
  state.turn = (state.turn + 1) % state.players.length;
  if (state.turn === 0) state.round += 1;
}

export function addSips(player, n) {
  if (!player) return;
  player.sips += n;
}

export function canStartGame() {
  return state.players.length >= 2 && state.players.length <= 10;
}
