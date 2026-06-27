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
  const userEmail = ctx.currentUser?.email || "";

  const premiumBlock = premium
    ? `<div class="premium-status">
        <span class="ps-crown">${hrs ? "🎟️" : "👑"}</span>
        <div class="ps-text">
          <div class="ps-title">${hrs ? `Žur Pass · še ${hrs} h` : "Premium aktiven"}</div>
          <div class="ps-sub">Pikantno · vse težavnosti · 100+ kart</div>
        </div>
        <button class="ps-refresh" data-act="refresh">↺ Osveži</button>
       </div>`
    : `<button class="btn btn-ghost" data-act="premium">👑 Odkleni Premium</button>`;

  const node = el(`
    <section class="screen center-col">
      ${userEmail ? `<div class="user-row${premium ? " is-premium" : ""}">
        <span>${premium ? "👑" : "👤"} ${esc(userEmail)}</span>
        <button class="btn-logout" data-act="logout">Odjava</button>
      </div>` : ""}
      <div class="grow"></div>
      <div class="stack" style="align-items:center;gap:6px">
        <div class="logo">NA ZDRAVJE!<span class="cheer">🍻 pivska igra 🍻</span></div>
        <p class="subtitle">Ena naprava • 2–10 igralcev<br>Vrtite telefon in se zabavajte.</p>
      </div>
      <div class="grow"></div>
      <div class="stack" style="width:100%">
        <button class="btn btn-lg" data-act="start">Začni igro 🎲</button>
        <button class="btn btn-ghost" data-act="how">Kako se igra?</button>
        ${premium ? `<button class="btn btn-ghost" data-act="cards">🃏 Moje kartice</button>` : ""}
        <div style="margin-top:8px">${premiumBlock}</div>
      </div>
      <p class="hint" style="margin-top:18px">Pij odgovorno. Igra je namenjena odraslim. 🔞</p>
    </section>
  `);

  node.querySelector('[data-act="start"]').onclick = () => { ctx.audio.pop(); ctx.go("setup"); };
  node.querySelector('[data-act="how"]').onclick = () => { ctx.audio.pop(); ctx.showHowTo(); };
  const premBtn = node.querySelector('[data-act="premium"]');
  if (premBtn) premBtn.onclick = () => { ctx.audio.pop(); ctx.showPaywall("home"); };
  const logoutBtn = node.querySelector('[data-act="logout"]');
  if (logoutBtn) logoutBtn.onclick = () => ctx.signOut();
  const cardsBtn = node.querySelector('[data-act="cards"]');
  if (cardsBtn) cardsBtn.onclick = () => { ctx.audio.pop(); ctx.manageCustomCards(); };
  const refreshBtn = node.querySelector('[data-act="refresh"]');
  if (refreshBtn) refreshBtn.onclick = async () => {
    refreshBtn.textContent = "…";
    refreshBtn.disabled = true;
    await ctx.refreshEntitlement();
    ctx.rerender();
  };
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
        <div id="tiltArea"></div>
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

  function triggerPlay() {
    if (isLocked(MODES[state.mode])) {
      ctx.showPaywall("mode_lock");
    } else if (MODES[state.mode].adult && !state.adultConfirmed) {
      ctx.showAdultGate();
    } else {
      ctx.audio.pop();
      ctx.startGame();
    }
  }

  node.querySelector('[data-act="play"]').onclick = triggerPlay;

  // ---- tilt-to-start ----
  const tiltArea = node.querySelector("#tiltArea");
  if (typeof DeviceOrientationEvent !== "undefined") {
    const needsPermission = typeof DeviceOrientationEvent.requestPermission === "function";
    if (needsPermission) {
      // iOS 13+ requires a user gesture to grant motion permission
      const permBtn = document.createElement("button");
      permBtn.className = "btn-tilt-perm";
      permBtn.textContent = "🍺 Aktiviraj nagib za start";
      tiltArea.appendChild(permBtn);
      permBtn.onclick = async () => {
        try {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm === "granted") {
            permBtn.remove();
            activateTilt();
          }
        } catch (_) {}
      };
    } else {
      // Android / desktop — no permission needed
      const hint = document.createElement("p");
      hint.className = "tilt-hint";
      hint.textContent = "🍺 ali nagni telefon za start";
      tiltArea.appendChild(hint);
      activateTilt();
    }
  }

  function activateTilt() {
    let tiltTimer = null;
    const handler = (e) => {
      // beta: 90 = phone upright, 0 = flat, <20 = tilted forward (drinking)
      const tilted = e.beta !== null && e.beta < 22;
      if (tilted && !tiltTimer) {
        tiltTimer = setTimeout(() => {
          tiltTimer = null;
          if (state.screen !== "mode") return;
          triggerPlay();
        }, 550);
      } else if (!tilted && tiltTimer) {
        clearTimeout(tiltTimer);
        tiltTimer = null;
      }
    };
    window.addEventListener("deviceorientation", handler);
    ctx.setTiltCleanup(() => {
      window.removeEventListener("deviceorientation", handler);
      if (tiltTimer) { clearTimeout(tiltTimer); tiltTimer = null; }
    });
  }

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

  let revealed = true;

  function doReveal() {
    if (revealed) return;
    revealed = true;
    cardEl.onclick = null;
    requestAnimationFrame(() => renderCard(true));
  }

  const node = el(`
    <section class="screen">
      <div class="game-head">
        <button class="btn icon-btn btn-ghost" data-act="quit" aria-label="Konec">⏹</button>
        <div>
          <div class="turn-label">${mode.emoji} ${mode.name} • ${diff.name}${ctx.isPremium() ? '<span class="premium-chip">👑 PRO</span>' : ""}</div>
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

    turnName.innerHTML = `${p.emoji} ${esc(p.name)}`;
    roundLabel.textContent = `${state.round}. krog`;

    if (!revealed) {
      cardEl.className = 'card card-back';
      cardEl.style.background = '';
      cardEl.innerHTML = `
        <div class="cb-logo">NA ZDRAVJE! 🍻</div>
        <div class="cb-body">
          <div class="cb-hint">👆 Tapni kartico za razkritje</div>
        </div>`;
      actions.innerHTML = '';
      cardEl.onclick = () => doReveal();
      renderScores();
      return;
    }

    cardEl.onclick = null;
    cardEl.classList.remove("card-back");
    if (c.type === "teaser") {
      cardEl.classList.add("teaser");
      cardEl.style.background = MODES.spicy.color;
      cardEl.innerHTML = `
        <span class="type-tag">🔒 Pikantno</span>
        <div class="card-text blurred">${esc(c.text)}</div>
        <span class="sips-badge">👑 Samo za Premium</span>
      `;
      // Auto-open paywall; dismissing without buying auto-advances to next player
      setTimeout(() => ctx.showPaywall("teaser_card", advance), 350);
    } else {
      cardEl.classList.remove("teaser");
      const t = CARD_TYPES[c.type] || CARD_TYPES.izziv;
      cardEl.style.background = t.color;
      cardEl.innerHTML = `
        <span class="type-tag">${t.emoji} ${t.label}</span>
        <div class="card-text">${esc(c.text)}</div>
        ${c.type === "pijaca" && c.sips ? `<span class="sips-badge">🍺 ${c.sips} ${sipWord(c.sips)}</span>` : ""}
      `;
    }
    if (flipAnim) {
      cardEl.classList.remove("flip"); void cardEl.offsetWidth; cardEl.classList.add("flip");
    }
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
        </div>`;
      actions.querySelector('[data-act="unlock"]').onclick = () => {
        ctx.audio.pop(); ctx.showPaywall("teaser_card", advance);
      };
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
      actions.querySelector('[data-act="drank"]').onclick = (e) => {
        spawnDrinkFloat(e.currentTarget, n);
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

  function spawnDrinkFloat(_btn, sips) {
    const ov = document.createElement("div");
    ov.className = "drink-overlay";

    // foam bubbles
    for (let i = 0; i < 8; i++) {
      const b = document.createElement("span");
      b.className = "drink-bubble";
      const size = 7 + Math.random() * 20;
      b.style.cssText = `width:${size}px;height:${size}px;` +
        `left:${18 + Math.random() * 64}%;bottom:${15 + Math.random() * 45}%;` +
        `--b-dur:${(.45 + Math.random() * .45).toFixed(2)}s;` +
        `--b-del:${(Math.random() * .28).toFixed(2)}s`;
      ov.appendChild(b);
    }

    const mug = document.createElement("div");
    mug.className = "drink-mug";
    mug.textContent = "🍺";
    ov.appendChild(mug);

    if (sips > 0) {
      const cnt = document.createElement("div");
      cnt.className = "drink-count";
      cnt.textContent = `${sips} ${sipWord(sips)}!`;
      ov.appendChild(cnt);
    }

    document.body.appendChild(ov);
    setTimeout(() => {
      ov.style.transition = "opacity .28s";
      ov.style.opacity = "0";
      setTimeout(() => ov.remove(), 280);
    }, 820);
  }

  function advance() {
    ctx.nextTurn();
    ctx.drawCard();
    ctx.save();
    revealed = false;
    renderCard(false);
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
    <div class="podium-row ${i === 0 ? "first" : ""}" style="animation-delay:${i * 0.11}s">
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
export function PaywallModal(ctx, source = "generic", onDismiss) {
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
        msg.textContent = "Plačilo pride kmalu. Imaš kodo? Vnesi jo spodaj. 👇";
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
  node.querySelector('[data-act="close"]').onclick = () => {
    ctx.audio.pop(); ctx.closeModal(); if (onDismiss) onDismiss();
  };

  return node;
}

/* ===========================================================
   LOGIN / SIGNUP / FORGOT / RESET
   =========================================================== */
export function LoginScreen(ctx, initialMode = "login") {
  ctx.setTheme("#ff6b6b", "#e84b4b");
  let mode = initialMode;

  const node = el(`
    <section class="screen center-col">
      <div class="grow"></div>
      <div class="stack" style="align-items:center;gap:4px">
        <div class="logo">Na Zdravje!<span class="cheer">🍻</span></div>
        <p class="subtitle" style="text-align:center">Prijavi se in začni igrati.</p>
      </div>
      <div class="auth-card">
        <h2 id="auth-title" style="font-family:var(--font-display);font-weight:800;font-size:1.5rem;text-align:center;margin-bottom:18px">Prijava</h2>
        <div class="stack" style="gap:10px">
          <button class="btn-google" id="auth-google">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
            <span>Nadaljuj z Google</span>
          </button>
          <div class="auth-divider" id="auth-divider"><span>ali</span></div>
          <input class="input" id="auth-email" type="email" placeholder="E-pošta" autocomplete="email" inputmode="email" />
          <input class="input" id="auth-pass" type="password" placeholder="Geslo (min. 6 znakov)" autocomplete="current-password" />
          <button class="btn btn-lg" id="auth-submit">Prijava</button>
          <p id="auth-err" class="hint" style="text-align:center;min-height:18px;font-weight:600"></p>
          <button class="btn btn-ghost" id="auth-toggle">Nimaš računa? Registracija →</button>
          <button class="btn-forgot" id="auth-forgot">Pozabljeno geslo?</button>
        </div>
      </div>
      <div class="grow"></div>
      <p class="hint" style="text-align:center">Pij odgovorno. Igra je namenjena odraslim. 🔞</p>
    </section>
  `);

  const titleEl  = node.querySelector("#auth-title");
  const emailEl  = node.querySelector("#auth-email");
  const passEl   = node.querySelector("#auth-pass");
  const submitEl = node.querySelector("#auth-submit");
  const errEl    = node.querySelector("#auth-err");
  const toggleEl = node.querySelector("#auth-toggle");
  const forgotEl = node.querySelector("#auth-forgot");
  const googleEl  = node.querySelector("#auth-google");
  const dividerEl = node.querySelector("#auth-divider");

  function setMode(m) {
    mode = m;
    errEl.textContent = "";
    errEl.style.color = "var(--coral)";

    const isForgot = m === "forgot";
    const isReset  = m === "reset";

    passEl.style.display  = (isForgot) ? "none" : "";
    forgotEl.style.display = (isForgot || isReset) ? "none" : "";
    toggleEl.style.display = (isForgot || isReset) ? "none" : "";
    // Google sign-in only makes sense for login/signup, not password flows
    const showGoogle = (m === "login" || m === "signup");
    googleEl.style.display  = showGoogle ? "" : "none";
    dividerEl.style.display = showGoogle ? "" : "none";

    if (m === "login") {
      titleEl.textContent  = "Prijava";
      submitEl.textContent = "Prijava";
      toggleEl.textContent = "Nimaš računa? Registracija →";
      passEl.autocomplete  = "current-password";
    } else if (m === "signup") {
      titleEl.textContent  = "Registracija";
      submitEl.textContent = "Ustvari račun";
      toggleEl.textContent = "Že imaš račun? Prijava →";
      passEl.autocomplete  = "new-password";
    } else if (m === "forgot") {
      titleEl.textContent  = "Ponastavi geslo";
      submitEl.textContent = "Pošlji link →";
      emailEl.focus();
    } else if (m === "reset") {
      titleEl.textContent  = "Novo geslo";
      submitEl.textContent = "Shrani geslo";
      passEl.placeholder   = "Novo geslo (min. 6 znakov)";
      passEl.autocomplete  = "new-password";
      emailEl.style.display = "none";
    }
  }

  // apply initial mode without animation flash
  setMode(mode);

  toggleEl.onclick = () => setMode(mode === "login" ? "signup" : "login");
  forgotEl.onclick = () => setMode("forgot");

  googleEl.onclick = async () => {
    errEl.textContent = "";
    googleEl.disabled = true;
    googleEl.classList.add("is-loading");
    const { error } = await ctx.authSignInWithGoogle();
    // On success the browser redirects to Google; we only get here on error.
    if (error) {
      googleEl.disabled = false;
      googleEl.classList.remove("is-loading");
      errEl.textContent = "Napaka pri prijavi z Google: " + error.message;
    }
  };

  submitEl.onclick = async () => {
    const email = emailEl.value.trim();
    const pass  = passEl.value;
    errEl.textContent = "";
    submitEl.disabled = true;
    submitEl.textContent = "…";

    if (mode === "forgot") {
      if (!email) { errEl.textContent = "Vnesi e-pošto."; submitEl.disabled = false; submitEl.textContent = "Pošlji link →"; return; }
      const { error } = await ctx.authResetPassword(email);
      submitEl.disabled = false;
      if (error) { errEl.textContent = "Napaka: " + error.message; submitEl.textContent = "Pošlji link →"; return; }
      errEl.style.color = "#38d9a9";
      errEl.textContent = "✅ Poslali smo ti e-pošto s povezavo za ponastavitev.";
      submitEl.textContent = "Pošlji link →";
      return;
    }

    if (mode === "reset") {
      if (pass.length < 6) { errEl.textContent = "Geslo mora imeti vsaj 6 znakov."; submitEl.disabled = false; submitEl.textContent = "Shrani geslo"; return; }
      const { error } = await ctx.authUpdatePassword(pass);
      submitEl.disabled = false;
      if (error) { errEl.textContent = "Napaka: " + error.message; submitEl.textContent = "Shrani geslo"; return; }
      errEl.style.color = "#38d9a9";
      errEl.textContent = "✅ Geslo posodobljeno!";
      setTimeout(() => ctx.onAuthSuccess(null), 900);
      return;
    }

    if (!email || !pass) { errEl.textContent = "Izpolni oba polji."; submitEl.disabled = false; submitEl.textContent = mode === "login" ? "Prijava" : "Ustvari račun"; return; }
    if (pass.length < 6) { errEl.textContent = "Geslo mora imeti vsaj 6 znakov."; submitEl.disabled = false; submitEl.textContent = mode === "login" ? "Prijava" : "Ustvari račun"; return; }

    const { data, error } = mode === "login"
      ? await ctx.authSignIn(email, pass)
      : await ctx.authSignUp(email, pass);

    if (error) {
      submitEl.disabled = false;
      submitEl.textContent = mode === "login" ? "Prijava" : "Ustvari račun";
      errEl.textContent = _authErr(error.message);
      return;
    }

    if (mode === "signup" && data.user && !data.session) {
      errEl.style.color = "#38d9a9";
      errEl.textContent = "✅ Račun ustvarjen! Prijavi se.";
      submitEl.disabled = false;
      submitEl.textContent = "Ustvari račun";
      setMode("login");
      return;
    }

    await ctx.onAuthSuccess(data.session);
  };

  node.addEventListener("keydown", (e) => { if (e.key === "Enter") submitEl.click(); });

  return node;
}

function _authErr(msg) {
  if (msg.includes("Invalid login") || msg.includes("invalid_credentials")) return "Napačen e-naslov ali geslo.";
  if (msg.includes("already registered") || msg.includes("already been registered")) return "Ta e-pošta je že registrirana.";
  if (msg.includes("Email not confirmed")) return "Najprej potrdi svojo e-pošto.";
  if (msg.includes("Password")) return "Geslo mora imeti vsaj 6 znakov.";
  return "Napaka: " + msg;
}

/* ===========================================================
   CUSTOM CARDS — premium screen for managing personal cards
   Cards are scoped to the currently selected mode + difficulty.
   =========================================================== */
export function CustomCardsScreen(ctx) {
  ctx.setTheme("#ff6b6b", "#e84b4b");
  const { state } = ctx;
  const modeName  = MODES[state.mode]?.name || "Klasično";
  const diffName  = DIFFICULTIES[state.difficulty]?.name || "Lahko";

  const CARD_TYPE_OPTIONS = [
    { id: "izziv",     label: "🎯 Izziv" },
    { id: "vprasanje", label: "💬 Vprašanje" },
    { id: "skupinski", label: "👥 Skupinsko" },
    { id: "pijaca",    label: "🍺 Pij" },
  ];
  let selectedType = "izziv";

  const node = el(`
    <section class="screen">
      <div class="topbar">
        <button class="btn icon-btn btn-ghost" data-act="back">←</button>
        <h2 class="section-title">Moje kartice</h2>
      </div>
      <p class="hint" style="text-align:center;margin:2px 0 14px">
        ${esc(modeName)} · ${esc(diffName)}
      </p>

      <div class="cc-add-form">
        <p style="font-weight:700;margin-bottom:8px">Dodaj novo kartico</p>
        <textarea class="input" id="cc-text" rows="3"
          placeholder="Besedilo kartice…" style="resize:none;padding-top:10px"></textarea>
        <div class="cc-type-row" id="cc-types"></div>
        <div id="cc-sips-wrap" style="margin-top:8px;display:none">
          <input class="input" id="cc-sips" type="number" min="1" max="20"
            placeholder="Število požirkov (neobvezno)" />
        </div>
        <button class="btn" id="cc-add-btn" style="width:100%;margin-top:10px">Dodaj ＋</button>
        <p class="hint" id="cc-msg" style="text-align:center;min-height:18px;margin-top:6px"></p>
      </div>

      <p class="section-title" style="font-size:1.1rem;margin-bottom:10px">Shranjene kartice</p>
      <div id="cc-list"><p class="hint" style="text-align:center">Nalagam…</p></div>
    </section>
  `);

  // ---- type selector ----
  const typesEl = node.querySelector("#cc-types");
  const sipsWrap = node.querySelector("#cc-sips-wrap");

  function renderTypes() {
    typesEl.innerHTML = CARD_TYPE_OPTIONS.map((t) =>
      `<button class="cc-type-btn ${t.id === selectedType ? "selected" : ""}" data-type="${t.id}">${t.label}</button>`
    ).join("");
    typesEl.querySelectorAll("[data-type]").forEach((b) => {
      b.onclick = () => {
        selectedType = b.dataset.type;
        renderTypes();
        sipsWrap.style.display = (selectedType === "pijaca" || selectedType === "izziv") ? "" : "none";
      };
    });
  }
  renderTypes();
  // show sips for the default type (izziv)
  sipsWrap.style.display = "";

  // ---- card list ----
  const ccList = node.querySelector("#cc-list");
  const msgEl  = node.querySelector("#cc-msg");
  const textEl = node.querySelector("#cc-text");
  const sipsEl = node.querySelector("#cc-sips");

  async function loadCards() {
    ccList.innerHTML = `<p class="hint" style="text-align:center">Nalagam…</p>`;
    const { data, error } = await ctx.getCustomCards(state.mode, state.difficulty);
    if (error) {
      ccList.innerHTML = `<p class="hint" style="text-align:center;color:var(--coral)">Napaka pri nalaganju kartic.</p>`;
      return;
    }
    if (!data || !data.length) {
      ccList.innerHTML = `<p class="hint" style="text-align:center">Ni kartic. Ustvari svojo! 🃏</p>`;
      return;
    }
    ccList.innerHTML = data.map((c) => {
      const t = CARD_TYPES[c.type];
      const sipsStr = c.sips ? ` · ${c.sips} ${c.sips === 1 ? "požirek" : "požirkov"}` : "";
      const enabled = !ctx.isCardDisabled(c.id);
      return `
        <div class="custom-card-item ${enabled ? "" : "cc-disabled"}" data-id="${esc(c.id)}">
          <label class="cc-toggle" title="${enabled ? "Vključena v igro" : "Izključena iz igre"}">
            <input type="checkbox" class="cc-chk" data-toggle="${esc(c.id)}" ${enabled ? "checked" : ""}>
            <span class="cc-track"></span>
          </label>
          <div style="flex:1">
            <div class="cc-text">${esc(c.text)}</div>
            <div class="cc-meta">${t ? t.emoji + " " + t.label : c.type}${sipsStr}</div>
          </div>
          <button class="cc-del" data-del="${esc(c.id)}" aria-label="Izbriši">🗑</button>
        </div>
      `;
    }).join("");

    ccList.querySelectorAll("[data-toggle]").forEach((chk) => {
      chk.onchange = () => {
        ctx.toggleCardDisabled(chk.dataset.toggle);
        const row = ccList.querySelector(`[data-id="${chk.dataset.toggle}"]`);
        if (row) row.classList.toggle("cc-disabled", !chk.checked);
      };
    });
    ccList.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = async () => {
        b.disabled = true;
        await ctx.deleteCustomCard(b.dataset.del);
        loadCards();
      };
    });
  }

  node.querySelector("#cc-add-btn").onclick = async () => {
    const text = textEl.value.trim();
    if (!text) { msgEl.textContent = "Vnesi besedilo kartice."; msgEl.style.color = ""; return; }
    const sipsVal = parseInt(sipsEl.value);
    const sips = (selectedType === "pijaca" || selectedType === "izziv") && sipsVal > 0 ? sipsVal : null;
    const { error } = await ctx.addCustomCard({
      text,
      type: selectedType,
      sips,
      mode: state.mode,
      difficulty: state.difficulty,
    });
    if (error) { msgEl.textContent = "Napaka: " + error.message; return; }
    msgEl.style.color = "#38d9a9";
    msgEl.textContent = "✅ Kartica dodana!";
    textEl.value = "";
    sipsEl.value = "";
    setTimeout(() => { msgEl.textContent = ""; msgEl.style.color = ""; }, 2200);
    loadCards();
  };

  node.querySelector('[data-act="back"]').onclick = () => { ctx.audio.pop(); ctx.go("home"); };

  loadCards();
  return node;
}
