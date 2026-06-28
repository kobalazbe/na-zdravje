# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Na Zdravje!** — a mobile-first, single-device drinking game (2–10 players, pass-the-phone).
Pure static site: **no build step, no framework, no backend, no dependencies.** Plain ES
modules + one CSS file. All UI and card content is in **Slovenian**.

## Running

No Node toolchain is assumed (the dev machine has Python, not Node). ES modules require a
real HTTP origin — opening `index.html` via `file://` will fail to load `js/data/*`.

```bash
python -m http.server 8000      # then open http://localhost:8000
# or, if Node is present:  npx serve .
```

There are no tests, no linter, and no build. Verification is manual: walk the flow in a
browser at mobile width (~390px). A `.claude/launch.json` defines a `na-zdravje` preview
server (Python http.server on port 5544) for the preview MCP tools.

## Architecture

A tiny hand-rolled SPA. There is **one state object and one render dispatcher** — no
virtual DOM. Understanding these three relationships is enough to work anywhere:

1. **`js/app.js` is the controller and the only place that mounts DOM.** It builds a single
   `ctx` object (state + audio + confetti + navigation + every state mutator) and passes it
   to whichever screen is active. `render()` wipes `#app` and appends the screen node.
   Screens never import each other or `state.js` mutators directly — they only touch `ctx`.
   This keeps screens decoupled; **add new cross-screen behavior as a method on `ctx`**, not
   as a direct import inside a screen.

2. **`js/state.js` owns the single `state` object** (exported live) plus all mutators
   (`addPlayer`, `nextTurn`, `drawCard` writes here, etc.) and the static config maps
   `MODES`, `DIFFICULTIES`, `CARD_TYPES`. State auto-persists to `localStorage` under
   `naZdravje.v1` via `save()`; `app.js` calls `save()` after navigation/turns. On load,
   `load()` merges saved state over a fresh shape, and `sanitizeStart()` in `app.js` guards
   against restoring into a screen whose data no longer exists.

3. **`js/screens.js` renders every screen and modal** as a function `(ctx) => DOMNode` that
   wires its own listeners via the `el()`/`esc()` helpers. Screens are: `home`, `setup`,
   `mode`, `game`, `summary` (keys map in `app.js` `SCREENS`), plus modals
   (`AdultGateModal`, `QuitModal`, `HowToModal`) opened through `ctx`.

`js/deck.js` builds a shuffled deck from the chosen `mode[difficulty]`, filters out `pijaca`
cards when `includeDrinks` is off, and `drawCard(state)` reshuffles a fresh deck when empty
so play never ends on its own — the game only ends via the quit modal → `summary`.

`js/audio.js` and `js/confetti.js` are intentionally **asset-free**: SFX are generated with
the Web Audio API (lazy `AudioContext` on first gesture), confetti is canvas-drawn. Keep it
that way — do not introduce binary media unless asked.

### Theming

Color is driven by CSS custom properties `--accent` / `--accent-deep` on `:root`. Each
screen calls `ctx.setTheme(accent, deep)` on render (the game screen pulls its colors from
the selected difficulty), which also updates the `theme-color` meta. Per-mode/difficulty
colors live in the `MODES`/`DIFFICULTIES` maps in `state.js`, not in CSS.

### Monetization (freemium, Phase 0 = client-only)

`js/entitlement.js` owns premium access under its **own** localStorage key
(`naZdravje.ent.v1`) so the in-game reset never wipes a purchase. Tier is `free` |
`premium` | `pass` (`pass` = time-boxed Žur Pass). **Gating everywhere keys off
`isPremium()`** (exposed on `ctx`); screens never read tier internals. Free limits +
tier pricing live in `state.js` (`FREE_LIMITS`, `FREE_TEASER_EVERY`, `PRICING`).

- `deck.js` `buildDeck()` caps the free pool to `FREE_LIMITS` and yields nothing for
  premium-only modes; `drawCard()` injects locked `type:"teaser"` cards every
  `FREE_TEASER_EVERY` draws and sets `state.repeated` when the capped pool cycles.
- Conversion triggers all call `ctx.showPaywall(source)` → `PaywallModal` (a clone of the
  `AdultGateModal` pattern). Sources: `mode_lock`, `teaser_card`, `repetition`, `summary`,
  `home`. `js/analytics.js` `track()` counts the funnel in localStorage.
- Phase-0 unlock is a **redeem code** (`LOCAL_CODES` in `entitlement.js`, e.g. `NZ-DEMO-2024`).
  **Phase 1** swaps `redeem()`/`refresh()` to call serverless `/api/validate` (Stripe + KV) —
  keep the `isPremium()` / `ctx` surface unchanged so screens don't need edits. See the plan at
  `~/.claude/plans/i-want-to-build-enchanted-lightning.md`.

## Editing card content

All gameplay content is data in `js/data/cards.classic.js` and `js/data/cards.spicy.js`.
Each exports an object keyed by difficulty (`lahko` / `sredje` / `divje`); each is an array
of cards:

```js
{ type: "izziv", text: "…", sips: 2 }
```

- `type`: `"vprasanje"` | `"izziv"` | `"skupinski"` | `"pijaca"` (must match `CARD_TYPES`).
- `sips`: for `pijaca` = amount to drink; for `izziv` = penalty if skipped. Optional for the
  other two.

The Slovenian sip declension (požirek/požirka/požirki/požirkov) is computed in `sipWord()` in
`screens.js` — reuse it rather than hardcoding plurals. **`spicy` content is gated 18+ and
must stay flirty/tasteful, not explicit.**
