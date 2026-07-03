/* ===========================================================
   deck.js — build & shuffle a deck from mode + difficulty,
   with free-tier gating (capped pool + premium teaser cards).
   =========================================================== */

import { CLASSIC } from "./data/cards.classic.js";
import { SPICY } from "./data/cards.spicy.js";
import { FREE_LIMITS, FREE_TEASER_EVERY, state } from "./state.js";
import { isPremium } from "./entitlement.js";

const LIBRARY = { classic: CLASSIC, spicy: SPICY };

/* Real (but blurred) Pikantno lines shown on locked teaser cards —
   genuine premium content is what creates the craving. */
const TEASER_POOL = (SPICY.lahko || []).filter((c) => c.type !== "pijaca").slice(0, 6);

/* Fisher–Yates shuffle (returns a new array) */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build the fixed card pool for a NEW game (called once, at game start —
 * see ctx.startGame()/ctx.playAgain()). Free tier samples a capped subset
 * that stays fixed for the whole game (a conversion trigger once it's fully
 * seen), rather than resampling a new random subset on every reshuffle —
 * that used to let a card reappear well before the pool actually cycled.
 */
export function buildDeck(mode, difficulty, filters) {
  let cards = (LIBRARY[mode]?.[difficulty] || []).slice();
  cards = cards.filter((c) => filters[c.type] !== false);

  if (!isPremium()) {
    const cap = FREE_LIMITS[mode]?.[difficulty] ?? 0;
    cards = shuffle(cards).slice(0, cap); // sample the cap, then we re-shuffle below
  } else if (state.customCards?.length) {
    const customs = state.customCards.filter((c) => filters[c.type] !== false);
    cards = cards.concat(customs);
  }
  return shuffle(cards);
}

function teaserCard() {
  const c = TEASER_POOL.length
    ? TEASER_POOL[Math.floor(Math.random() * TEASER_POOL.length)]
    : { text: "Pikanten izziv te čaka …" };
  return { type: "teaser", text: c.text, locked: true };
}

/**
 * Draw the next card. Reshuffles the fixed `state.pool` when the working
 * deck empties so play never ends on its own — a card can only repeat after
 * every other card in the pool has already been shown this game. Free tier:
 * every Nth draw is a locked premium teaser, and the first reshuffle raises
 * `state.repeated` so the UI can nudge. Mutates `state` and returns the card.
 */
export function drawCard(state) {
  const premium = isPremium();

  // free-tier teaser injection (does not consume the deck)
  if (!premium) {
    state.freeDraws = (state.freeDraws || 0) + 1;
    if (state.freeDraws % FREE_TEASER_EVERY === 0) {
      state.current = teaserCard();
      state.cardsPlayed += 1;
      return state.current;
    }
  }

  if (!state.deck || state.deck.length === 0) {
    if (state.deck && state.cardsPlayed > 0 && !premium) state.repeated = true; // ran through the pool once
    // reuse the fixed per-game pool (never re-sample) — fall back to building
    // it if missing (e.g. a save from before `state.pool` existed)
    if (!state.pool || state.pool.length === 0) {
      state.pool = buildDeck(state.mode, state.difficulty, state.cardTypeFilters);
    }
    state.deck = shuffle(state.pool);
  }

  let card = state.deck.pop();
  // avoid an immediate textual repeat when more cards remain
  if (card && state.current && card.text === state.current.text && state.deck.length > 0) {
    const swap = state.deck.pop();
    state.deck.push(card);
    card = swap;
  }
  state.current = card || null;
  state.cardsPlayed += 1;
  return state.current;
}
