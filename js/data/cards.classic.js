/* ===========================================================
   cards.classic.js — Klasično / Zabava (vsi)
   Tipi: vprasanje | izziv | skupinski | pijaca
   "sips" = za pijaca: koliko popiti; za izziv: kazen ob preskoku.
   =========================================================== */

export const CLASSIC = {
  /* ---------------------------------------------------------
     LAHKO — sproščeno, primerno za vsako družbo
     --------------------------------------------------------- */
  lahko: [
    { type: "vprasanje", text: "Kdo za mizo bi po tvoje preživel najdlje na samotnem otoku?" },
    { type: "vprasanje", text: "Katera je tvoja najljubša pijača za žur?" },
    { type: "vprasanje", text: "Kdaj si se nazadnje res do solz nasmejal/a?" },
    { type: "vprasanje", text: "Katero pesem vedno zavrtiš na polno?" },
    { type: "vprasanje", text: "Kateri film bi lahko gledal/a v neskončnost?" },
    { type: "vprasanje", text: "Sladko ali slano? Izberi in zagovarjaj." },
    { type: "vprasanje", text: "Kam bi odpotoval/a takoj, če bi imel/a brezplačno karto?" },
    { type: "vprasanje", text: "Kdo v skupini najbolje kuha?" },
    { type: "vprasanje", text: "Katera je tvoja najljubša risanka iz otroštva?" },
    { type: "vprasanje", text: "Mačke ali psi? Pojasni svojo odločitev." },

    { type: "izziv", text: "Naredi 5 počepov ali popij 2 požirka.", sips: 2 },
    { type: "izziv", text: "Govori v rimah do svojega naslednjega kroga.", sips: 2 },
    { type: "izziv", text: "Posnemaj žival, dokler nekdo ne ugane katero.", sips: 2 },
    { type: "izziv", text: "Reci abecedo nazaj od J do A.", sips: 2 },
    { type: "izziv", text: "Naredi selfie z osebo na svoji levi.", sips: 1 },
    { type: "izziv", text: "Zapoj refren katere koli pesmi na glas.", sips: 2 },
    { type: "izziv", text: "Pokaži zadnjo fotografijo v galeriji telefona.", sips: 3 },
    { type: "izziv", text: "Naredi svoj najboljši ples brez glasbe (10 sekund).", sips: 2 },
    { type: "izziv", text: "Povej vic. Če se nihče ne nasmeje, popij požirek.", sips: 1 },
    { type: "izziv", text: "Naslednji krog govori samo s šepetom.", sips: 1 },

    { type: "skupinski", text: "Vsi, ki so danes spili kavo — en požirek! ☕" },
    { type: "skupinski", text: "Vsi, ki nosijo nogavice — popijte požirek." },
    { type: "skupinski", text: "Zadnji, ki dvigne roko, popije 2 požirka. ✋" },
    { type: "skupinski", text: "Vsi, ki imajo brata ali sestro — nazdravite in pijte." },
    { type: "skupinski", text: "Vsi, ki so že bili na morju to leto — požirek." },
    { type: "skupinski", text: "Kdor ima najmlajši telefon, izbere nekoga, ki popije." },
    { type: "skupinski", text: "Vsi z rjavimi očmi — en požirek. 👀" },
    { type: "skupinski", text: "Skupinska nazdravica! Vsi trčite in pijte. 🍻" },
    { type: "skupinski", text: "Vsi, ki imajo radi pico — požirek (torej skoraj vsi)." },
    { type: "skupinski", text: "Zadnji, ki se dotakne tal, popije 2 požirka." },

    { type: "pijaca", text: "Popij na zdravje vseh prisotnih!", sips: 2 },
    { type: "pijaca", text: "Mali požirek za pogum. 😌", sips: 1 },
    { type: "pijaca", text: "Izberi soigralca, da pije s teboj.", sips: 2 },
    { type: "pijaca", text: "Nazdravi osebi nasproti in pij.", sips: 2 },
    { type: "pijaca", text: "Požirek za dobro vzdušje!", sips: 1 },

    { type: "vprasanje", text: "Katera hrana ti gre najbolj na živce?" },
    { type: "vprasanje", text: "Kateri je bil tvoj najljubši predmet v šoli?" },
    { type: "vprasanje", text: "Si bolj jutranji ali nočni tip?" },
    { type: "izziv", text: "Daj komplimentu vsakemu igralcu po vrsti.", sips: 1 },
    { type: "skupinski", text: "Vsi, ki znajo žvižgati — zažvižgajte ali pijte." },
  ],

  /* ---------------------------------------------------------
     SREDJE — bolj drzno, malo več adrenalina
     --------------------------------------------------------- */
  sredje: [
    { type: "vprasanje", text: "Kaj je najbolj noro, kar si kdaj naredil/a iz dolgčasa?" },
    { type: "vprasanje", text: "Kateri je tvoj najbolj neumen strah?" },
    { type: "vprasanje", text: "Kdaj si nazadnje pošteno zalomil/a v javnosti?" },
    { type: "vprasanje", text: "Katero skrivnost si kot otrok najdlje skrival/a pred starši?" },
    { type: "vprasanje", text: "Koga v skupini bi vzel/a kot partnerja za rop banke? 💰" },
    { type: "vprasanje", text: "Kakšen je tvoj 'guilty pleasure', ki ga neradi priznaš?" },
    { type: "vprasanje", text: "Kdaj si nazadnje jokal/a in zakaj (če smeš povedati)?" },
    { type: "vprasanje", text: "Kateri zakon bi prekršil/a, če ne bi bilo posledic?" },
    { type: "vprasanje", text: "Kdo v skupini te najbolj spravlja v smeh?" },
    { type: "vprasanje", text: "Najbolj neprijetna stvar, ki ti jo je kdo poslal v sporočilu?" },

    { type: "izziv", text: "Pokaži zadnje 3 poslane sporočila (brez imena). 📱", sips: 4 },
    { type: "izziv", text: "Pokliči 5. stik v imeniku in reci, da ga imaš rad/a.", sips: 5 },
    { type: "izziv", text: "Naredi 15 sklec ali popij 4 požirke.", sips: 4 },
    { type: "izziv", text: "Govori z napovedovalskim glasom do naslednjega kroga.", sips: 2 },
    { type: "izziv", text: "Pusti, da soigralec napiše tvoj status na družbenem omrežju.", sips: 5 },
    { type: "izziv", text: "Posnemaj enega od igralcev — drugi ugibajo, koga.", sips: 3 },
    { type: "izziv", text: "Naslednji krog ne smeš uporabiti besede 'jaz'. Vsaka napaka = požirek.", sips: 2 },
    { type: "izziv", text: "Pojej ali popij nekaj, kar ti izbere oseba na desni.", sips: 4 },
    { type: "izziv", text: "Naredi dramatičen monolog o svojem zadnjem obroku.", sips: 2 },
    { type: "izziv", text: "Zamenjaj en kos oblačila s soigralcem do konca kroga.", sips: 4 },

    { type: "skupinski", text: "Vsi, ki so že kdaj zamudili na pomemben dogodek — 2 požirka." },
    { type: "skupinski", text: "Vsi, ki so danes pogledali svoj bivši profil — pijte (vest!). 👀" },
    { type: "skupinski", text: "Zadnji, ki pošlje 🍻 v skupinski chat, popije 3 požirke." },
    { type: "skupinski", text: "Vsi, ki so že kdaj pevali karaoke — nazdravite in pijte." },
    { type: "skupinski", text: "Najglasnejši v skupini izbere dva, ki pijeta." },
    { type: "skupinski", text: "Vsi, ki so že kdaj 'pozabili' plačati rundo — 2 požirka." },
    { type: "skupinski", text: "Kdor se prvi nasmeje v naslednjih 10 sekundah, pije. Štejte!" },
    { type: "skupinski", text: "Vsi, ki imajo tetovažo — pokažite jo ali pijte." },

    { type: "pijaca", text: "Popij 3 požirke in izberi naslednjo žrtev.", sips: 3 },
    { type: "pijaca", text: "Dvojni požirek — pogum se splača!", sips: 2 },
    { type: "pijaca", text: "Ti in oseba s tvojim rojstnim mesecem pijeta skupaj.", sips: 3 },
    { type: "pijaca", text: "Waterfall! Začni piti, sosed lahko neha šele za tabo. 🌊", sips: 3 },
    { type: "pijaca", text: "Popij za vsako črko svojega imena en požirek (max 4).", sips: 3 },

    { type: "vprasanje", text: "Kateri je najbolj nenavaden kompliment, ki si ga kdaj dobil/a?" },
    { type: "vprasanje", text: "Kaj bi naredil/a, če bi bil/a en dan neviden/na?" },
    { type: "izziv", text: "Naredi svoj najbolj zapeljiv pogled v kamero in posnemi.", sips: 3 },
    { type: "izziv", text: "Pojdi do okna in zavpij nekaj prijaznega ven.", sips: 4 },
    { type: "skupinski", text: "Vsi samski — dvignite roko in nazdravite svobodi! 🥂" },
  ],

  /* ---------------------------------------------------------
     DIVJE — najbolj noro, samo za pogumne ekipe
     --------------------------------------------------------- */
  divje: [
    { type: "vprasanje", text: "Najbolj sramotna stvar, ki si jo kdaj naredil/a pijan/a?" },
    { type: "vprasanje", text: "Katero skrivnost o sebi nisi povedal/a še nikomur za to mizo?" },
    { type: "vprasanje", text: "Koga v skupini bi najraje poljubil/a (samo za igro)? 😏" },
    { type: "vprasanje", text: "Kakšna je tvoja najbolj nora 'pijana ideja', ki si jo izpeljal/a?" },
    { type: "vprasanje", text: "Kdaj si nazadnje rekel/a laž tej družbi? Razkrij jo!" },
    { type: "vprasanje", text: "Kateri od prisotnih bi bil po tvoje najboljši v postelji? (samo ugibanje 🔥)" },
    { type: "vprasanje", text: "Najbolj noro mesto, kjer si kdaj zaspal/a?" },
    { type: "vprasanje", text: "Katero stvar v tej sobi bi ukradel/a, če te nihče ne bi videl?" },
    { type: "vprasanje", text: "Kdo je tvoj skrivni 'crush' iz preteklosti, ki ga še nismo poznali?" },
    { type: "vprasanje", text: "Kaj je najbolj noro, kar si kdaj iskal/a na internetu?" },

    { type: "izziv", text: "Pusti, da soigralec pošlje eno sporočilo s tvojega telefona. 📲", sips: 6 },
    { type: "izziv", text: "Pokaži celotno zgodovino klicev zadnjega dne.", sips: 6 },
    { type: "izziv", text: "Naredi 20 sklec ali popij 6 požirkov.", sips: 6 },
    { type: "izziv", text: "Naslednja 2 kroga sediš v naročju soigralca po izbiri.", sips: 5 },
    { type: "izziv", text: "Pokliči naključen stik in zapoj mu 10 sekund pesmi.", sips: 6 },
    { type: "izziv", text: "Pojej žlico nečesa pikantnega ali popij 5 požirkov. 🌶️", sips: 5 },
    { type: "izziv", text: "Zamenjaj zgornji kos oblačila s soigralcem do konca igre.", sips: 5 },
    { type: "izziv", text: "Naredi 'tequila' ples na mizi (če je varno!) za 15 sekund.", sips: 4 },
    { type: "izziv", text: "Pusti skupini, da ti za 1 minuto izbere nov profilni vzdevek.", sips: 4 },
    { type: "izziv", text: "Razkrij zadnjo stvar, ki si jo iskal/a v brskalniku.", sips: 6 },

    { type: "skupinski", text: "Vsi, ki so že kdaj poljubili nekoga v tej sobi — 3 požirki. 💋" },
    { type: "skupinski", text: "Vsi, ki so že kdaj pošiljali sporočilo, ki ga obžalujejo — pijte." },
    { type: "skupinski", text: "Zadnji, ki se sleče en kos oblačila, popije 4 požirke." },
    { type: "skupinski", text: "Vsi, ki so že kdaj prespali pri komu iz te družbe — 3 požirki. 😳" },
    { type: "skupinski", text: "Najbolj 'nedolžen' v skupini izbere dva, ki na ex! 🍻" },
    { type: "skupinski", text: "Vsi, ki so danes lagali komu — dvojni požirek vesti." },
    { type: "skupinski", text: "Kdor zadnji reče 'na zdravje', popije 4 požirke." },
    { type: "skupinski", text: "Vsi, ki bi šli nocoj še na eno lokacijo — nazdravite in pijte!" },

    { type: "pijaca", text: "Na ex! Cel kozarec gre dol. 🥃", sips: 6 },
    { type: "pijaca", text: "Popij 5 in podari 5 komurkoli za mizo.", sips: 5 },
    { type: "pijaca", text: "Mega waterfall — vsi pijejo, ti voditelj/ica. 🌊", sips: 4 },
    { type: "pijaca", text: "Ti in najglasnejši igralec na ex skupaj!", sips: 5 },
    { type: "pijaca", text: "Za vsako prejšnjo rundo en požirek (max 6). 🍺", sips: 4 },

    { type: "vprasanje", text: "Kaj je najbolj tvegana stvar, ki si jo kdaj naredil/a za nekoga, ki ti je bil všeč?" },
    { type: "vprasanje", text: "Kateri je tvoj največji 'red flag' v zvezi?" },
    { type: "izziv", text: "Naredi zapeljiv ples za skupino (15 sekund) ali popij 5.", sips: 5 },
    { type: "izziv", text: "Pošlji 'pogrešam te 😘' zadnji osebi, s katero si si pisal/a.", sips: 6 },
    { type: "skupinski", text: "Vsi, ki so že kdaj imeli skrivno simpatijo do soigralca tukaj — pijte. 🙊" },
  ],
};
