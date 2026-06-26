/* ===========================================================
   screens.js — render functions for each screen.
   Each export takes the shared controller `ctx` and returns a
   DOM node, wiring its own event listeners.
   ctx = { state, go, rerender, setTheme, audio, confetti, ...mutators }
   =========================================================== */

import {
  MODES, DIFFICULTIES, CARD_TYPES, PRICING,
} from "./state.js";
import { SPICY } from "./data/cards.spicy.js";

/* ---------- tiny DOM helpers ---------- */
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function avatar(p, cls = "") {
  return `<span class="avatar ${cls}" style="background:${p.color}">${p.emoji}</span>`;
}

/* ===========================================================
   HOME
   =========================================================== */
export function HomeScreen(ctx) {
  ctx.setTheme("#ff6b6b", "#e84b4b");
  const premium = ctx.isPremium();
  const hrs = ctx.passHoursLeft();
  const premiumLine = premium
    ? (hrs ? `<span class="super-badge">🎟️ Žur Pass aktiven · še ${hrs} h</span>`
           : `<span class="super-badge">👑 Premium aktiven</span>`)
    : `<button class="btn btn-ghost" data-act="premium">👑 Odkleni Premium</button>`;

  const node = el(`
    <section class="screen center-col">
      <div class="grow"></div>
      <div class="stack" style="align-items:center;gap:6px">
        <div class="logo">Na Zdravje!<span class="cheer">🍻 pivska igra 🍻</span></div>
        <p class="subtitle">Ena naprava • 2–10 igralcev<br>Vrtite telefon in se zabavajte.</p>
      </div>
      <div class="grow"></div>
      <div class="stack" style="width:100%">
        <button class="btn btn-lg" data-act="start">Začni igro 🎲</button>
        <button class="btn btn-ghost" data-act="how">Kako se igra?</button>
        <div class="text-center" style="margin-top:6px">${premiumLine}</div>
      </div>
      <p class="hint" style="margin-top:18px">Pij odgovorno. Igra je namenjena odraslim. 🔞</p>
    </section>
  `);
  node.querySelector('[data-act="start"]').onclick = () => { ctx.audio.pop(); ctx.go("setup"); };
  node.querySelector('[data-act="how"]').onclick = () => { ctx.audio.pop(); ctx.showHowTo(); };
  const premBtn = node.querySelector('[data-act="premium"]');
  if (premBtn) premBtn.onclick = () => { ctx.audio.pop(); ctx.showPaywall("home"); };
  return node;
}

/* ===========================================================
   SETUP — players
   =========================================================== */
export function SetupScreen(ctx) {
  ctx.setTheme("#845ef7", "#6741d9");
  const { state } = ctx;

  const node = el(`
    <section class="screen">
      <div class="topbar">
        <button class="btn icon-btn btn-ghost" data-act="back">←</button>
        <h2 class="section-title">Igralci</h2>
      </div>

      <div class="add-row">
        <input class="text-input" id="nameInput" maxlength="16"
               placeholder="Ime igralca…" autocomplete="off" />
        <button class="btn icon-btn" data-act="add" aria-label="Dodaj">＋</button>
      </div>
      <p class="hint" style="margin:10px 0 4px" id="countHint"></p>

      <div class="player-list fade-list" id="playerList"></div>

      <div class="pushed-bottom stack" style="padding-top:18px">
        <button class="btn btn-lg" data-act="next" id="nextBtn">Naprej →</button>
      </div>
    </section>
  `);

  const input = node.querySelector("#nameInput");
  const list = node.querySelector("#playerList");
  const hint = node.querySelector("#countHint");
  const nextBtn = node.querySelector("#nextBtn");

  function renderList() {
    list.innerHTML = state.players.map((p) => `
      <div class="player-row" data-id="${p.id}">
        ${avatar(p)}
        <span class="name">${esc(p.name)}</span>
        <button class="btn icon-btn btn-ghost" data-remove="${p.id}" aria-label="Odstrani">✕</button>
      </div>
    `).join("");
    list.querySelectorAll("[data-remove]").forEach((b) => {
      b.onclick = () => { ctx.audio.pop(); ctx.removePlayer(b.dataset.remove); renderList(); refresh(); };
    });
  }
  function refresh() {
    const n = state.players.length;
    hint.textContent = n < 2
      ? `Dodaj vsaj 2 igralca (${n}/10)`
      : `${n}/10 igralcev — lahko začneš!`;
    nextBtn.disabled = !ctx.canStartGame();
  }
  function tryAdd() {
    const ok = ctx.addPlayer(input.value);
    if (ok) { ctx.audio.pop(); input.value = ""; renderList(); refresh(); input.focus(); }
  }

  node.querySelector('[data-act="add"]').onclick = tryAdd;
  node.querySelector('[data-act="back"]').onclick = () => { ctx.audio.pop(); ctx.go("home"); };
  node.querySelector('[data-act="next"]').onclick = () => {
    if (!ctx.canStartGame()) return;
    ctx.audio.pop(); ctx.go("mode");
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") tryAdd(); });

  renderList();
  refresh();
  return node;
}

/* ===========================================================
   MODE + DIFFICULTY select
   =========================================================== */
export function ModeScreen(ctx) {
  ctx.setTheme("#4dabf7", "#1f8de0");
  const { state } = ctx;
  if (!state.mode) state.mode = "classic";
  if (!state.difficulty) state.difficulty = "lahko";

  const node = el(`
    <section class="screen">
      <div class="topbar">
        <button class="btn icon-btn btn-ghost" data-act="back">←</button>
        <h2 class="section-title">Izberi način</h2>
      </div>

      <div class="choice-grid" id="modeGrid"></div>

      <p class="section-title" style="font-size:1.2rem;margin:22px 0 12px">Težavnost</p>
      <div class="diff-row" id="diffRow"></div>

      <div class="toggle-row" style="margin-top:20px">
        <span class="label">Vključi ukaze za pitje 🍺</span>
        <label class="switch">
          <input type="checkbox" id="drinkToggle" ${state.includeDrinks ? "checked" : ""}>
          <span class="track"></span>
        </label>
      </div>

      <div class="pushed-bottom stack" style="padding-top:20px">
        <button class="btn btn-lg" data-act="play" id="playBtn">Igraj! 🚀</button>
      </div>
    </section>
  `);

  const modeGrid = node.querySelector("#modeGrid");
  const diffRow = node.querySelector("#diffRow");

  // a mode is premium-gated when it's the adult (Pikantno) pack and the user is free
  const isLocked = (m) => m.adult && !ctx.isPremium();

  function renderModes() {
    modeGrid.innerHTML = Object.values(MODES).map((m) => {
      const locked = isLocked(m);
      return `
      <button class="choice ${state.mode === m.id ? "selected" : ""} ${locked ? "locked" : ""}"
              data-mode="${m.id}" style="background:${m.color}">
        <span class="emoji">${locked ? "🔒" : m.emoji}</span>
        <h3>${m.name}</h3>
        <p>${m.blurb}</p>
        ${locked ? '<span class="badge18">🔒 Premium</span>'
                 : (m.adult ? '<span class="badge18">18+</span>' : "")}
      </button>`;
    }).join("");
    modeGrid.querySelectorAll("[data-mode]").forEach((b) => {
      b.onclick = () => {
        const m = MODES[b.dataset.mode];
        if (isLocked(m)) {            // don't select — convert instead
          ctx.audio.pop();
          ctx.track("mode_lock_tap");
          ctx.showPaywall("mode_lock");
          return;
        }
        ctx.audio.pop(); state.mode = b.dataset.mode; ctx.save(); renderModes();
      };
    });
  }
  function renderDiffs() {
    diffRow.innerHTML = Object.values(DIFFICULTIES).map((d) => `
      <button class="diff ${state.difficulty === d.id ? "selected" : ""}"
              data-diff="${d.id}" style="background:${d.color};box-shadow:0 5px 0 ${d.colorDeep}">
        <span class="ico">${d.ico}</span>${d.name}
      </button>
    `).join("");
    diffRow.querySelectorAll("[data-diff]").forEach((b) => {
      b.onclick = () => { ctx.audio.pop(); state.difficulty = b.dataset.diff; ctx.save(); renderDiffs(); };
    });
  }

  node.querySelector("#drinkToggle").onchange = (e) => {
    state.includeDrinks = e.target.checked; ctx.save();
  };
  node.querySelector('[data-act="back"]').onclick = () => { ctx.audio.pop(); ctx.go("setup"); };
  node.querySelector('[data-act="play"]').onclick = () => {
    ctx.audio.pop();
    if (isLocked(MODES[state.mode])) {     // guard: locked mode can't start
      ctx.showPaywall("mode_lock");
    } else if (MODES[state.mode].adult && !state.adultConfirmed) {
      ctx.showAdultGate();
    } else {
      ctx.startGame();
    }
  };

  renderModes();
  renderDiffs();
  return node;
}

/* ===========================================================
   GAME
   =========================================================== */
export function GameScreen(ctx) {
  const { state } = ctx;
  const mode = MODES[state.mode];
  const diff = DIFFICULTIES[state.difficulty];
  ctx.setTheme(diff.color, diff.colorDeep);

  if (!state.current) ctx.drawCard();

  const node = el(`
    <section class="screen">
      <div class="game-head">
        <button class="btn icon-btn btn-ghost" data-act="quit" aria-label="Konec">⏹</button>
        <div>
          <div class="turn-label">${mode.emoji} ${mode.name} • ${diff.name}</div>
          <div class="turn-name" id="turnName"></div>
        </div>
        <span class="round" id="roundLabel"></span>
      </div>

      <div class="card-area">
        <div class="card" id="card"></div>
      </div>

      <div id="nudge"></div>
      <div class="game-actions" id="actions"></div>

      <div class="scoreboard" id="scoreboard"></div>
    </section>
  `);

  const cardEl = node.querySelector("#card");
  const actions = node.querySelector("#actions");
  const turnName = node.querySelector("#turnName");
  const roundLabel = node.querySelector("#roundLabel");
  const scoreboard = node.querySelector("#scoreboard");
  const nudge = node.querySelector("#nudge");

  function renderCard(flipAnim) {
    const c = state.current;
    const p = ctx.currentPlayer();
    if (c.type === "teaser") {
      cardEl.classList.add("teaser");
      cardEl.style.background = MODES.spicy.color;
      cardEl.innerHTML = `
        <span class="type-tag">🔒 Pikantno</span>
        <div class="card-text blurred">${esc(c.text)}</div>
        <span class="sips-badge">👑 Samo za Premium</span>
      `;
    } else {
      cardEl.classList.remove("teaser");
      const t = CARD_TYPES[c.type];
      cardEl.style.background = diff.color;
      cardEl.innerHTML = `
        <span class="type-tag">${t.emoji} ${t.label}</span>
        <div class="card-text">${esc(c.text)}</div>
        ${c.type === "pijaca" && c.sips ? `<span class="sips-badge">🍺 ${c.sips} ${sipWord(c.sips)}</span>` : ""}
      `;
    }
    if (flipAnim) {
      cardEl.classList.remove("flip"); void cardEl.offsetWidth; cardEl.classList.add("flip");
    }
    turnName.innerHTML = `${p.emoji} ${esc(p.name)}`;
    roundLabel.textContent = `${state.round}. krog`;
    renderActions(c);
    renderScores();
    renderNudge();
  }

  // repetition nudge: free deck has cycled → seen-it-already conversion prompt
  function renderNudge() {
    const show = state.repeated && !ctx.isPremium() && !state.repeatedDismissed;
    if (!show) { nudge.innerHTML = ""; return; }
    nudge.innerHTML = `
      <div class="nudge-bar">
        <span>♻️ Že vidiš ponovitve? Odkleni 100+ kart in Pikantno.</span>
        <div class="nudge-actions">
          <button class="btn" data-act="nudge-unlock">Odkleni 👑</button>
          <button class="icon-btn btn-ghost" data-act="nudge-close" aria-label="Zapri">✕</button>
        </div>
      </div>`;
    nudge.querySelector('[data-act="nudge-unlock"]').onclick = () => { ctx.audio.pop(); ctx.showPaywall("repetition"); };
    nudge.querySelector('[data-act="nudge-close"]').onclick = () => { ctx.audio.pop(); state.repeatedDismissed = true; renderNudge(); };
  }

  function renderActions(c) {
    const p = ctx.currentPlayer();
    if (c.type === "teaser") {
      actions.innerHTML = `
        <div class="btn-row">
          <button class="btn" data-act="unlock">Odkleni Premium 👑</button>
          <button class="btn btn-ghost" data-act="skipteaser">Naprej →</button>
        </div>`;
      actions.querySelector('[data-act="unlock"]').onclick = () => { ctx.audio.pop(); ctx.showPaywall("teaser_card"); };
      actions.querySelector('[data-act="skipteaser"]').onclick = () => { ctx.audio.pop(); advance(); };
      return;
    }
    if (c.type === "izziv") {
      const pen = c.sips || 2;
      actions.innerHTML = `
        <div class="btn-row">
          <button class="btn" data-act="done">Opravljeno ✓</button>
          <button class="btn btn-ghost" data-act="skip">Preskoči 🍺 ${pen}</button>
        </div>`;
      actions.querySelector('[data-act="done"]').onclick = () => { ctx.audio.success(); p.done++; advance(); };
      actions.querySelector('[data-act="skip"]').onclick = () => {
        ctx.audio.drink(); p.sips += pen; p.skips++; ctx.bumpScore(); advance();
      };
    } else if (c.type === "pijaca") {
      const n = c.sips || 1;
      actions.innerHTML = `<button class="btn" data-act="drank">Na ex! 🍺 (${n})</button>`;
      actions.querySelector('[data-act="drank"]').onclick = () => {
        ctx.audio.drink(); p.sips += n; ctx.bumpScore(); advance();
      };
    } else {
      // vprasanje / skupinski → single continue
      actions.innerHTML = `<button class="btn" data-act="next">Naprej →</button>`;
      actions.querySelector('[data-act="next"]').onclick = () => { ctx.audio.success(); p.done++; advance(); };
    }
  }

  function renderScores() {
    scoreboard.innerHTML = state.players.map((pl, i) => `
      <div class="score-chip ${i === state.turn ? "active" : ""}">
        <span class="mini-avatar" style="background:${pl.color}">${pl.emoji}</span>
        <span>${esc(pl.name)}</span>
        <span class="sips">🍺${pl.sips}</span>
      </div>
    `).join("");
  }

  function advance() {
    ctx.nextTurn();
    ctx.drawCard();
    ctx.save();
    renderCard(true);
  }

  node.querySelector('[data-act="quit"]').onclick = () => { ctx.audio.pop(); ctx.confirmQuit(); };

  renderCard(false);
  return node;
}

function sipWord(n) {
  // slovenski sklon: 1 požirek, 2 požirka, 3-4 požirki, 5+ požirkov
  const m100 = n % 100, m10 = n % 10;
  if (m100 >= 12 && m100 <= 14) return "požirkov";
  if (m10 === 1) return "požirek";
  if (m10 === 2) return "požirka";
  if (m10 === 3 || m10 === 4) return "požirki";
  return "požirkov";
}

/* ===========================================================
   SUMMARY
   =========================================================== */
export function SummaryScreen(ctx) {
  ctx.setTheme("#ffd43b", "#f0b400");
  const { state } = ctx;
  const ranked = state.players.slice().sort((a, b) => b.sips - a.sips);
  const topSips = ranked[0]?.sips || 0;
  const mostDone = state.players.slice().sort((a, b) => b.done - a.done)[0];
  const mostSkip = state.players.slice().sort((a, b) => b.skips - a.skips)[0];

  const medals = ["🥇", "🥈", "🥉"];
  const rows = ranked.map((p, i) => `
    <div class="podium-row ${i === 0 ? "first" : ""}">
      <span class="rank">${medals[i] || (i + 1) + "."}</span>
      ${avatar(p)}
      <span class="name">${esc(p.name)}</span>
      <span class="stat">🍺 ${p.sips}</span>
    </div>
  `).join("");

  const supers = [];
  if (topSips > 0) supers.push(`👑 <b>${esc(ranked[0].name)}</b> — kralj/ica pitja!`);
  if (mostDone && mostDone.done > 0) supers.push(`🎯 <b>${esc(mostDone.name)}</b> — največ opravljenih izzivov`);
  if (mostSkip && mostSkip.skips > 0) supers.push(`🐔 <b>${esc(mostSkip.name)}</b> — največ preskokov`);

  const node = el(`
    <section class="screen">
      <div class="text-center" style="margin:12px 0 18px">
        <div style="font-size:3rem">🏆</div>
        <h2 class="section-title">Konec igre!</h2>
        <p class="hint">Skupaj odigranih kart: ${state.cardsPlayed}</p>
      </div>

      <div class="stack" id="board">${rows}</div>

      <div class="panel" style="margin-top:18px;text-align:left">
        ${supers.map((s) => `<p style="margin:6px 0">${s}</p>`).join("") || '<p class="hint">Brez statistike — naslednjič bolj pogumno! 😜</p>'}
      </div>

      ${ctx.isPremium() ? "" : `
      <button class="upsell-card" data-act="upsell">
        <span class="upsell-emoji">👑</span>
        <span class="upsell-text"><b>Naslednji žur še boljši?</b><br>Odkleni Pikantno + 100+ kart</span>
        <span class="upsell-cta">Premium →</span>
      </button>`}

      <div class="pushed-bottom stack" style="padding-top:20px">
        <button class="btn btn-lg" data-act="again">Igraj znova 🔁</button>
        <button class="btn btn-ghost" data-act="home">Domov 🏠</button>
      </div>
    </section>
  `);

  node.querySelector('[data-act="again"]').onclick = () => { ctx.audio.pop(); ctx.playAgain(); };
  node.querySelector('[data-act="home"]').onclick = () => { ctx.audio.pop(); ctx.goHomeReset(); };
  const upsell = node.querySelector('[data-act="upsell"]');
  if (upsell) upsell.onclick = () => { ctx.audio.pop(); ctx.showPaywall("summary"); };

  setTimeout(() => { ctx.audio.fanfare(); ctx.confetti.burst(120, 0.2); }, 250);
  return node;
}

/* ===========================================================
   MODALS
   =========================================================== */
export function AdultGateModal(ctx) {
  const node = el(`
    <div class="modal-backdrop">
      <div class="modal">
        <div class="big-emoji">🔞</div>
        <h2>Samo za odrasle</h2>
        <p>Način <b>Pikantno</b> vsebuje drznejše izzive. Si starejši/a od 18 let?</p>
        <div class="stack">
          <button class="btn" data-act="yes">Ja, imam 18+ 🍷</button>
          <button class="btn btn-ghost" data-act="no">Ne, nazaj</button>
        </div>
      </div>
    </div>
  `);
  node.querySelector('[data-act="yes"]').onclick = () => {
    ctx.audio.pop(); ctx.state.adultConfirmed = true; ctx.save();
    ctx.closeModal(); ctx.startGame();
  };
  node.querySelector('[data-act="no"]').onclick = () => { ctx.audio.pop(); ctx.closeModal(); };
  return node;
}

export function QuitModal(ctx) {
  const node = el(`
    <div class="modal-backdrop">
      <div class="modal">
        <div class="big-emoji">⏹</div>
        <h2>Končaš igro?</h2>
        <p>Pokaži lestvico in zaključi to rundo.</p>
        <div class="stack">
          <button class="btn" data-act="end">Pokaži rezultate 🏆</button>
          <button class="btn btn-ghost" data-act="cancel">Nadaljuj igro</button>
        </div>
      </div>
    </div>
  `);
  node.querySelector('[data-act="end"]').onclick = () => { ctx.audio.pop(); ctx.closeModal(); ctx.go("summary"); };
  node.querySelector('[data-act="cancel"]').onclick = () => { ctx.audio.pop(); ctx.closeModal(); };
  return node;
}

export function HowToModal(ctx) {
  const node = el(`
    <div class="modal-backdrop">
      <div class="modal" style="text-align:left">
        <div class="big-emoji" style="text-align:center">📖</div>
        <h2 style="text-align:center">Kako se igra</h2>
        <p style="text-align:left">1️⃣ Vnesi imena igralcev (2–10).</p>
        <p style="text-align:left">2️⃣ Izberi način in težavnost.</p>
        <p style="text-align:left">3️⃣ Telefon kroži med igralci. Vsak dobi karto:</p>
        <p style="text-align:left;margin-left:10px">💬 vprašanje • 🎯 izziv • 👥 skupinski • 🍺 pij</p>
        <p style="text-align:left">4️⃣ Izziv lahko <b>preskočiš</b> — a piješ kazenske požirke!</p>
        <div class="stack" style="margin-top:14px">
          <button class="btn" data-act="ok">Razumem! 👍</button>
        </div>
      </div>
    </div>
  `);
  node.querySelector('[data-act="ok"]').onclick = () => { ctx.audio.pop(); ctx.closeModal(); };
  return node;
}

/* ===========================================================
   PAYWALL — tiers + blurred teaser + redeem code
   (clones the modal pattern; opened via ctx.showPaywall(source))
   =========================================================== */
export function PaywallModal(ctx, source = "generic") {
  // a real (blurred) Pikantno line to create the craving
  const peekPool = (SPICY.sredje || SPICY.lahko || []);
  const peek = peekPool.length ? peekPool[Math.floor(Math.random() * peekPool.length)].text : "";

  const tiers = PRICING.map((p) => `
    <button class="tier ${p.best ? "tier-best" : ""}" data-tier="${p.id}">
      <span class="tier-emoji">${p.emoji}</span>
      <span class="tier-main"><b>${p.name}</b><span class="tier-sub">${p.sub}</span></span>
      <span class="tier-price">${p.price}</span>
      ${p.best ? '<span class="tier-flag">NAJ</span>' : ""}
    </button>
  `).join("");

  const node = el(`
    <div class="modal-backdrop">
      <div class="modal paywall">
        <div class="big-emoji">👑</div>
        <h2>Odkleni vse</h2>
        <p>Pikantno 18+, vse težavnosti in 100+ kart. En nakup za vso družbo.</p>

        <div class="peek">
          <span class="peek-tag">🔒 Pikantno</span>
          <div class="peek-text blurred">${esc(peek)}</div>
        </div>

        <div class="tier-list">${tiers}</div>

        <div class="redeem">
          <input class="text-input" id="redeemInput" placeholder="Imaš kodo? Vnesi jo…" autocomplete="off" />
          <button class="btn icon-btn" data-act="redeem" aria-label="Vnovči">✓</button>
        </div>
        <p class="redeem-msg hint" id="redeemMsg"></p>

        <button class="btn btn-ghost" data-act="close">Mogoče kasneje</button>
        <p class="hint" style="margin-top:8px">🎟️ Žur Pass odklene vse za 48 ur.</p>
      </div>
    </div>
  `);

  const msg = node.querySelector("#redeemMsg");
  const input = node.querySelector("#redeemInput");

  node.querySelectorAll("[data-tier]").forEach((b) => {
    b.onclick = () => {
      ctx.audio.pop();
      const opened = ctx.startCheckout(b.dataset.tier);
      if (!opened) {
        // Phase 0: no live checkout link yet → guide to the code field
        msg.textContent = "Plačilo pride kmalu. Imaš kodo? Vnesi jo spodaj. 👇";
        input.focus();
      }
    };
  });

  function doRedeem() {
    const r = ctx.redeemCode(input.value);
    if (r.ok) {
      msg.textContent = "✅ Odklenjeno! Uživaj.";
      setTimeout(() => { ctx.closeModal(); ctx.rerender(); }, 700);
    } else {
      msg.textContent = r.reason === "invalid" ? "❌ Neveljavna koda." : "Vnesi kodo.";
      input.focus();
    }
  }
  node.querySelector('[data-act="redeem"]').onclick = doRedeem;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doRedeem(); });
  node.querySelector('[data-act="close"]').onclick = () => { ctx.audio.pop(); ctx.closeModal(); };

  return node;
}
