/* Landing page JS — scroll reveal, card cycler, FAQ accordion, PWA install */

// ---- Live count (random 30–80) ----
const liveEl = document.getElementById('liveCount');
if (liveEl) liveEl.textContent = Math.floor(Math.random() * 51 + 30);

// ---- Word rotator in headline ----
const ROTATE_WORDS = ['noč', 'žur', 'ekipo', 'zabavo'];
let rotateIdx = 0;
const wordEl = document.getElementById('wordRotate');
if (wordEl) {
  setInterval(() => {
    wordEl.classList.add('wr-exit');
    setTimeout(() => {
      rotateIdx = (rotateIdx + 1) % ROTATE_WORDS.length;
      wordEl.textContent = ROTATE_WORDS[rotateIdx];
      wordEl.classList.replace('wr-exit', 'wr-enter');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        wordEl.classList.remove('wr-enter');
      }));
    }, 240);
  }, 2700);
}

// ---- Scroll reveal ----
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal, .reveal-child').forEach(el => io.observe(el));

// ---- FAQ accordion ----
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    // close all
    document.querySelectorAll('.faq-q').forEach(b => {
      b.setAttribute('aria-expanded', 'false');
      b.nextElementSibling?.classList.remove('open');
    });
    // open clicked (if it was closed)
    if (!expanded) {
      btn.setAttribute('aria-expanded', 'true');
      btn.nextElementSibling?.classList.add('open');
    }
  });
});

// ---- Card showcase cycler ----
const CARDS = [
  { type: 'Vprašanje', emoji: '💬', color: '#845ef7',
    text: 'Kam bi odpotoval/a takoj, če bi imel/a brezplačno karto?' },
  { type: 'Izziv', emoji: '🎯', color: '#ff922b',
    text: 'Naredi selfie z osebo na svoji levi.', sips: 1 },
  { type: 'Skupinski izziv', emoji: '👥', color: '#22b8cf',
    text: 'Skupinska nazdravica! Vsi trčite in pijte. 🍻' },
  { type: 'Pij!', emoji: '🍺', color: '#ff6b6b',
    text: 'Popij na zdravje vseh prisotnih!', sips: 2 },
  { type: 'Glasovanje', emoji: '🗳️', color: '#fab005',
    text: 'Kdo za mizo bi prvi končal v zaporu? Največ glasov popije 2. 🚔' },
  { type: 'Pravilo', emoji: '⚡', color: '#5c7cfa',
    text: "Zapomni si: OBLAK ☁️. Do konca kroga kdor to besedo izgovori, pije." },
  { type: 'Dogodek', emoji: '🎲', color: '#82c91e',
    text: 'Kip! Vsi zamrznejo. Kdor se prvi premakne, pije 2. 🗿' },
];

const cardEl = document.getElementById('showcaseCard');
const dotsEl = document.getElementById('cardDots');
let cardIdx = 0;
let cardTimer = null;

function renderCard(idx, animate) {
  const c = CARDS[idx];
  if (animate) {
    cardEl.classList.remove('flip');
    void cardEl.offsetWidth;
    cardEl.classList.add('flip');
  }
  cardEl.style.background = c.color;
  cardEl.innerHTML = `
    <span class="type-tag">${c.emoji} ${c.type}</span>
    <div class="card-text">${c.text}</div>
    ${c.sips ? `<span class="sips-badge">🍺 ${c.sips} požirek</span>` : ''}
  `;
  dotsEl.querySelectorAll('.card-dot').forEach((d, i) =>
    d.classList.toggle('active', i === idx)
  );
}

CARDS.forEach((c, i) => {
  const dot = document.createElement('button');
  dot.className = 'card-dot' + (i === 0 ? ' active' : '');
  dot.style.background = c.color;
  dot.setAttribute('aria-label', c.type);
  dot.addEventListener('click', () => { cardIdx = i; renderCard(i, true); restartTimer(); });
  dotsEl.appendChild(dot);
});
renderCard(0, false);

function startTimer() {
  cardTimer = setInterval(() => {
    cardIdx = (cardIdx + 1) % CARDS.length;
    renderCard(cardIdx, true);
  }, 2800);
}
function restartTimer() { clearInterval(cardTimer); startTimer(); }

const cardSection = document.getElementById('cardsSection');
new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) startTimer();
  else clearInterval(cardTimer);
}, { threshold: 0.1 }).observe(cardSection);

// ---- Apple touch icon via Canvas ----
(function () {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    const x = c.getContext('2d');
    const r = 40;
    x.fillStyle = '#ff6b6b';
    x.beginPath();
    x.moveTo(r,0); x.lineTo(192-r,0);
    x.arcTo(192,0,192,r,r); x.lineTo(192,192-r);
    x.arcTo(192,192,192-r,192,r); x.lineTo(r,192);
    x.arcTo(0,192,0,192-r,r); x.lineTo(0,r);
    x.arcTo(0,0,r,0,r); x.closePath(); x.fill();
    x.font = '120px serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('🍻', 96, 100);
    const link = document.getElementById('ati');
    if (link) link.href = c.toDataURL();
  } catch(e) {}
})();

// ---- PWA install ----
let deferredPrompt = null;
const installBtn  = document.getElementById('installBtn');
const installBtn2 = document.getElementById('installBtn2');
const androidBlock   = document.getElementById('androidBlock');
const androidTrigger = document.getElementById('androidTrigger');
const iosBlock = document.getElementById('iosBlock');

function triggerInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(choice => {
    if (choice.outcome === 'accepted') {
      [installBtn, installBtn2].forEach(b => b && (b.hidden = true));
      androidBlock.hidden = true;
    }
    deferredPrompt = null;
  });
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  [installBtn, installBtn2].forEach(b => b && (b.hidden = false));
  androidBlock.hidden = false;
  iosBlock.hidden = true;
});

[installBtn, installBtn2].forEach(b => b?.addEventListener('click', triggerInstall));
androidTrigger?.addEventListener('click', triggerInstall);

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

if (isStandalone) {
  [installBtn, installBtn2].forEach(b => b && (b.hidden = true));
  document.getElementById('installSection')?.style.setProperty('display','none');
} else if (isIOS) {
  [installBtn, installBtn2].forEach(b => {
    if (!b) return;
    b.hidden = false;
    b.textContent = 'Dodaj na telefon 📲';
  });
  installBtn?.addEventListener('click', () =>
    document.getElementById('installSection')?.scrollIntoView({ behavior: 'smooth' })
  );
  iosBlock.hidden = false;
  androidBlock.hidden = true;
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
