/* ===========================================================
   confetti.js — lightweight canvas confetti burst (no library)
   =========================================================== */

const COLORS = ["#ff6b6b", "#ffd93d", "#4dabf7", "#38d9a9", "#845ef7", "#ff8cc8"];

let canvas = null;
let cctx = null;
let pieces = [];
let running = false;

function init() {
  canvas = document.getElementById("confetti");
  if (!canvas) return false;
  cctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
  return true;
}

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

/**
 * Fire a burst of confetti.
 * @param {number} count   number of pieces
 * @param {number} originY 0..1 vertical origin (default near top)
 */
export function burst(count = 90, originY = 0.25) {
  if (!cctx && !init()) return;
  const cx = canvas.width / 2;
  const cy = canvas.height * originY;
  for (let i = 0; i < count; i++) {
    pieces.push({
      x: cx + (Math.random() - 0.5) * canvas.width * 0.4,
      y: cy + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 9,
      vy: Math.random() * -9 - 3,
      g: 0.22 + Math.random() * 0.12,
      size: 6 + Math.random() * 8,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 120 + Math.random() * 40,
    });
  }
  if (!running) { running = true; requestAnimationFrame(tick); }
}

function tick() {
  if (!cctx) { running = false; return; }
  cctx.clearRect(0, 0, canvas.width, canvas.height);
  pieces = pieces.filter((p) => p.life > 0 && p.y < canvas.height + 40);
  for (const p of pieces) {
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 1;
    cctx.save();
    cctx.translate(p.x, p.y);
    cctx.rotate(p.rot);
    cctx.fillStyle = p.color;
    cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    cctx.restore();
  }
  if (pieces.length > 0) {
    requestAnimationFrame(tick);
  } else {
    cctx.clearRect(0, 0, canvas.width, canvas.height);
    running = false;
  }
}
