/* ===========================================================
   deck.js — build & shuffle a deck from mode + difficulty,
   with free-tier gating (capped pool + premium teaser cards).
   =========================================================== */

import { CLASSIC } from "./data/cards.classic.js";
import { SPICY } from "./data/cards.spicy.js";
import { FREE_LIMITS, FREE_TEASER_EVERY } from "./state.js";
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
 * Build a fresh shuffled deck for the chosen mode + difficulty.
 * Free tier: Pikantno yields nothing (gated at the UI), and Klasično is
 * capped to FREE_LIMITS so repeats arrive fast (a conversion trigger).
 */
export function buildDeck(mode, difficulty, includeDrinks = true) {
  let cards = (LIBRARY[mode]?.[difficulty] || []).slice();
  if (!includeDrinks) cards = cards.filter((c) => c.type !== "pijaca");

  if (!isPremium()) {
    const cap = FREE_LIMITS[mode]?.[difficulty] ?? 0;
    cards = shuffle(cards).slice(0, cap); // sample the cap, then we re-shuffle below
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
 * Draw the next card. Reshuffles a fresh deck when empty so play never ends
 * on its own. Free tier: every Nth draw is a locked premium teaser, and the
 * first reshuffle raises `state.repeated` so the UI can nudge.
 * Mutates `state` and returns the drawn card.
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
    if (state.deck && state.cardsPlayed > 0 && !premium) state.repeated = true; // ran through the capped pool
    state.deck = buildDeck(state.mode, state.difficulty, state.includeDrinks);
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
