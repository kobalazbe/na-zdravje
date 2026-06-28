# 🍻 Na Zdravje! — digitalna pivska igra

Mobilna spletna igra za **2–10 igralcev** na **eni napravi**. Telefon kroži med
igralci, vsak dobi karto z vprašanjem, izzivom ali ukazom za pitje. Svetli,
risankasti dizajn, brez registracije, dela tudi brez interneta.

> Pij odgovorno. Igra je namenjena polnoletnim. 🔞

---

## ▶️ Kako zagnati

Ker je vse **čisto statično** (HTML/CSS/JS, brez build koraka), so možnosti:

**Najpreprosteje** — dvoklikni `index.html` (odpre se v brskalniku).

> Opomba: ker igra uporablja ES-module, nekateri brskalniki ne dovolijo
> nalaganja `js/data/*` prek `file://`. Če ostane bela stran, zaženi mini
> strežnik (spodaj).

**Lokalni strežnik** (priporočeno):

```bash
# z Node.js
npx serve .

# ali s Pythonom
python -m http.server 8000
```

Nato odpri `http://localhost:8000` (oz. izpisani naslov). Za pravi mobilni
občutek vklopi v brskalniku **device toolbar** (~390px širine).

## 🌐 Objava (hosting)

Mapo lahko naložiš kamor koli za statične strani: **GitHub Pages**, **Netlify**,
**Vercel**, **Cloudflare Pages** … Build koraka ni — naloži datoteke in deluje.

---

## 🎮 Načini & težavnost

| Način | Opis | Težavnosti |
|-------|------|------------|
| 🎉 **Klasično** | Zabavna vprašanja in izzivi za vsako družbo | Lahko · Sredje · Divje |
| 🌶️ **Pikantno (18+)** | Drznejše, flirtavo — okusno, ne vulgarno | Lahko · Sredje · Divje |

Pikantni način je zaklenjen za potrditvijo starosti (18+).
Stikalo **„Vključi ukaze za pitje“** odstrani neposredne 🍺-karte, če želiš
bolj „suho“ različico.

### Tipi kart
- 💬 **Vprašanje** — odgovori (ali pij).
- 🎯 **Izziv** — opravi nalogo; če **preskočiš**, popiješ kazenske požirke.
- 👥 **Skupinski izziv** — velja za vse, ki ustrezajo pogoju.
- 🍺 **Pij!** — neposreden ukaz za pitje.

---

## ✏️ Kako dodati ali urediti karte

Vsebina živi v dveh datotekah:

- `js/data/cards.classic.js` — klasične karte
- `js/data/cards.spicy.js` — pikantne karte (18+)

Vsaka je objekt s tremi težavnostmi (`lahko`, `sredje`, `divje`), vsaka pa je
seznam kart. Ena karta:

```js
{ type: "izziv", text: "Naredi 5 počepov ali popij 2 požirka.", sips: 2 }
```

- `type`: `"vprasanje"`, `"izziv"`, `"skupinski"` ali `"pijaca"`.
- `text`: besedilo, prikazano na karti.
- `sips`: za `pijaca` = koliko požirkov; za `izziv` = kazen ob preskoku.
  (Za `vprasanje`/`skupinski` ni obvezen.)

Dodaj novo vrstico v ustrezni seznam, shrani, osveži stran — to je vse.

---

## 🗂️ Struktura projekta

```
.
├── index.html
├── css/styles.css           # tema, mobile-first
├── js/
│   ├── app.js               # vstop: kontroler, router, shranjevanje
│   ├── state.js             # stanje igre + pomožne funkcije
│   ├── screens.js           # izris vseh zaslonov
│   ├── deck.js              # gradnja & mešanje kupčka
│   ├── audio.js             # zvočni učinki (Web Audio, brez datotek)
│   ├── confetti.js          # konfeti animacija
│   └── data/
│       ├── cards.classic.js
│       └── cards.spicy.js
└── README.md
```

Stanje igre se shranjuje v `localStorage`, zato osvežitev strani ne prekine igre.

---

## 💡 Ideje za naprej
- Lastni paketi kart (uvoz/izvoz JSON)
- Angleški prevod (besedila so že ločena v `js/data/`)
- Pravi zvoki / glasba, vibracija na telefonu
- PWA — „dodaj na začetni zaslon“ za pravo offline izkušnjo
