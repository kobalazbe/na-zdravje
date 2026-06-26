/* ===========================================================
   audio.js — tiny SFX generated with the Web Audio API.
   No binary assets; muteable. AudioContext is created lazily on
   first user gesture (browser autoplay policy).
   =========================================================== */

let ctx = null;
let muted = false;

function ensureCtx() {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setMuted(v) { muted = v; }
export function isMuted() { return muted; }

/* one short tone */
function tone(freq, start, dur, type = "sine", gain = 0.18) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.02);
}

/* a quick rising "pop" for taps */
export function pop() {
  tone(420, 0, 0.12, "triangle", 0.14);
  tone(660, 0.04, 0.10, "sine", 0.10);
}

/* card flip swoosh-y blip */
export function flip() {
  tone(300, 0, 0.08, "sawtooth", 0.08);
  tone(520, 0.06, 0.12, "triangle", 0.12);
}

/* cheerful success arpeggio (card done) */
export function success() {
  [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.16, "triangle", 0.13));
}

/* a low "glug" for drink / penalty */
export function drink() {
  tone(180, 0, 0.16, "sine", 0.18);
  tone(140, 0.12, 0.20, "sine", 0.16);
}

/* big win fanfare for the summary screen */
export function fanfare() {
  [523, 587, 659, 784, 1047].forEach((f, i) =>
    tone(f, i * 0.10, 0.26, "triangle", 0.14));
}
