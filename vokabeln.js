// ════════════════════════════════════════════════════════════
//  WÖRTERLISTEN
//  Neue Liste ergänzen: unten bei der passenden Gruppe ein Deck
//  hinzufügen. index.html muss dafür nicht angefasst werden.
//
//  Deck-Felder:
//    id      eindeutig, wird für den Fortschritt gespeichert → nie ändern
//    icon    Emoji für die Menü-Karte
//    titel   Anzeigename
//    typ     'vokabeln' | 'artikel' | 'konjugation' | 'zahlen' | 'fehler'
//    woerter [{ fr, de }] bzw. je nach Typ (siehe Generatoren unten)
// ════════════════════════════════════════════════════════════

// ── Französische Zahlwörter (Schweizer Form: septante / nonante) ──
function franzZahl(n) {
  const eins = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf',
    'dix','onze','douze','treize','quatorze','quinze','seize',
    'dix-sept','dix-huit','dix-neuf'];
  if (n === 0) return 'zéro';
  if (n <= 19) return eins[n];
  if (n <= 69) {
    const z = ['','','vingt','trente','quarante','cinquante','soixante'][Math.floor(n/10)];
    const e = n % 10;
    if (e === 0) return z;
    if (e === 1) return z + ' et un';
    return z + '-' + eins[e];
  }
  if (n <= 79) {
    if (n === 70) return 'septante';
    if (n === 71) return 'septante et un';
    return 'septante-' + eins[n - 70];
  }
  if (n <= 89) {
    // 80 mit s, danach ohne: quatre-vingt-un, quatre-vingt-deux …
    if (n === 80) return 'quatre-vingts';
    return 'quatre-vingt-' + eins[n - 80];
  }
  if (n <= 99) {
    if (n === 90) return 'nonante';
    if (n === 91) return 'nonante et un';
    return 'nonante-' + eins[n - 90];
  }
  if (n === 100) return 'cent';
  if (n === 1000) return 'mille';
  if (n < 200) return 'cent ' + franzZahl(n - 100);
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (r === 0) return eins[h] + ' cents';
  return eins[h] + ' cent ' + franzZahl(r);
}

// ── Generator: Konjugation regelmässiger -er-Verben ──
function baueKonjugation(verben) {
  const personen = [
    { pron: 'je',        sprech: 'je',   endung: 'e'   },
    { pron: 'tu',        sprech: 'tu',   endung: 'es'  },
    { pron: 'il/elle',   sprech: 'il',   endung: 'e'   },
    { pron: 'nous',      sprech: 'nous', endung: 'ons' },
    { pron: 'vous',      sprech: 'vous', endung: 'ez'  },
    { pron: 'ils/elles', sprech: 'ils',  endung: 'ent' },
  ];
  const liste = [];
  for (const verb of verben) {
    const formen = personen.map((p, i) =>
      ((i === 3 && verb.stammNous) ? verb.stammNous : verb.stamm) + p.endung);
    personen.forEach((p, i) => {
      const form = formen[i];
      // Elision: je + Vokal → j'
      const sprech = (p.sprech === 'je' && /^[aeiouéè]/i.test(form))
        ? `j'${form}` : `${p.sprech} ${form}`;
      liste.push({
        fr: `${p.pron} (${verb.inf})`,
        de: form,
        falsche: [...new Set(formen.filter(f => f !== form))],
        sprechAntwort: sprech,
      });
    });
  }
  return liste;
}

// ── Generator: un / une / des aus einer Wörterliste ──
function baueArtikel(woerter) {
  return woerter.filter(w => w.art).map(w => ({
    fr: `___ ${w.nomen}`,
    de: w.art,
    sprechFrage: w.nomen,                  // vor der Antwort nur das Nomen …
    sprechAntwort: `${w.art} ${w.nomen}`,  // … danach die ganze Form
    falsche: ['un', 'une', 'des'].filter(a => a !== w.art),
  }));
}

// ── Generator: Zahlen 1–1000 ──
function baueZahlen(bis) {
  const liste = [];
  for (let i = 1; i <= bis; i++) liste.push({ num: i, fr: franzZahl(i) });
  return liste;
}

// ════════════════════════════════════════════════════════════
//  DIS DONC ! UNITÉ 1 · Klassenwortschatz (rosa), 5. Klasse
//  art/nomen = Grundlage für die un/une-Übung
// ════════════════════════════════════════════════════════════
const U1_ROSA = [
  { fr: "Chouette, c'est la rentrée !", de: "Toll, es ist Schulanfang!" },
  { fr: "Zut, c'est la rentrée !", de: "Oje, es ist Schulanfang!" },
  { fr: "le cartable", de: "der Schulsack", art: 'un', nomen: 'cartable' },
  { fr: "un agenda", de: "eine Agenda", art: 'un', nomen: 'agenda' },
  { fr: "les ciseaux (m pl)", de: "die Schere", art: 'des', nomen: 'ciseaux' },
  { fr: "le livre", de: "das Buch", art: 'un', nomen: 'livre' },
  { fr: "la règle", de: "das Lineal", art: 'une', nomen: 'règle' },
  { fr: "le classeur", de: "der Ordner", art: 'un', nomen: 'classeur' },
  { fr: "le cahier", de: "das Heft", art: 'un', nomen: 'cahier' },
  { fr: "le crayon", de: "der Bleistift", art: 'un', nomen: 'crayon' },
  { fr: "le stylo", de: "der Kugelschreiber", art: 'un', nomen: 'stylo' },
  { fr: "la gomme", de: "der Gummi", art: 'une', nomen: 'gomme' },
  { fr: "le tableau noir", de: "die Wandtafel", art: 'un', nomen: 'tableau noir' },
  { fr: "la trousse", de: "das Etui", art: 'une', nomen: 'trousse' },
  { fr: "la table", de: "der Tisch", art: 'une', nomen: 'table' },
  { fr: "la chaise", de: "der Stuhl", art: 'une', nomen: 'chaise' },
  { fr: "la matière scolaire", de: "das Schulfach", art: 'une', nomen: 'matière scolaire' },
  { fr: "l'allemand (m)", de: "das Deutsch", art: 'un', nomen: 'allemand' },
  { fr: "le français", de: "das Französisch", art: 'un', nomen: 'français' },
  { fr: "l'anglais (m)", de: "das Englisch", art: 'un', nomen: 'anglais' },
  { fr: "les maths / les mathématiques (f pl)", de: "die Mathematik", art: 'des', nomen: 'mathématiques' },
  { fr: "le dessin", de: "das bildnerische Gestalten / die Zeichnung", art: 'un', nomen: 'dessin' },
  { fr: "la géo / la géographie", de: "die Geografie", art: 'une', nomen: 'géographie' },
  { fr: "l'histoire (f)", de: "die Geschichte", art: 'une', nomen: 'histoire' },
  { fr: "la gym / la gymnastique", de: "das Turnen", art: 'une', nomen: 'gymnastique' },
  { fr: "les sciences de la nature (f pl)", de: "die Naturwissenschaften", art: 'des', nomen: 'sciences de la nature' },
  { fr: "la musique", de: "die Musik", art: 'une', nomen: 'musique' },
  { fr: "les ACM / les activités créatrices manuelles", de: "das textile und technische Gestalten", art: 'des', nomen: 'activités créatrices manuelles' },
];

// ════════════════════════════════════════════════════════════
//  WETTER, 4. Klasse
// ════════════════════════════════════════════════════════════
const WETTER_8 = [
  { fr: "la montagne", de: "der Berg" },
  { fr: "la rivière", de: "der Fluss" },
  { fr: "le lac", de: "der See" },
  { fr: "le champ", de: "das Feld" },
  { fr: "la vallée", de: "das Tal" },
  { fr: "le ciel", de: "der Himmel" },
  { fr: "le temps", de: "das Wetter / die Zeit" },
  { fr: "les nuages", de: "die Wolken" },
  { fr: "le soleil", de: "die Sonne" },
  { fr: "la lune", de: "der Mond" },
  { fr: "le vent", de: "der Wind" },
  { fr: "la neige", de: "der Schnee" },
  { fr: "la pluie", de: "der Regen" },
  { fr: "le verglas", de: "das Glatteis" },
  { fr: "Il y a du soleil.", de: "Die Sonne scheint." },
  { fr: "Il y a des nuages.", de: "Es hat Wolken." },
  { fr: "Il y a du vent.", de: "Es windet." },
  { fr: "Il y a de la neige.", de: "Es hat Schnee." },
  { fr: "Il y a du verglas.", de: "Es hat Glatteis." },
  { fr: "Il pleut.", de: "Es regnet." },
];

const WETTER_9 = [
  { fr: "faire", de: "machen" },
  { fr: "Il fait mauvais temps.", de: "Es ist schlechtes Wetter." },
  { fr: "Il fait beau temps.", de: "Es ist schönes Wetter." },
  { fr: "Il fait chaud.", de: "Es ist heiss." },
  { fr: "Il fait froid.", de: "Es ist kalt." },
  { fr: "pleuvoir", de: "regnen" },
  { fr: "Il pleut.", de: "Es regnet." },
  { fr: "neiger", de: "schneien" },
  { fr: "Il neige.", de: "Es schneit." },
  { fr: "gêler", de: "gefrieren" },
  { fr: "Il gèle.", de: "Es gefriert." },
  { fr: "briller", de: "scheinen" },
  { fr: "Le soleil brille.", de: "Die Sonne scheint." },
  { fr: "souffler", de: "blasen / wehen" },
  { fr: "Le vent souffle.", de: "Der Wind weht." },
  { fr: "Qu'est-ce que c'est?", de: "Was ist das?" },
];

const WETTER_10 = [
  { fr: "regarder", de: "schauen" },
  { fr: "le bulletin météo", de: "der Wetterbericht" },
  { fr: "Est-ce que …", de: "… (Anfang einer Frage)" },
  { fr: "Est-ce que tu regardes le bulletin météo?", de: "Schaust du den Wetterbericht?" },
  { fr: "partir", de: "weggehen" },
  { fr: "Est-ce que tu pars?", de: "Gehst du weg?" },
  { fr: "passer", de: "vorbeigehen" },
  { fr: "Est-ce que tu passes par la gare?", de: "Gehst du am Bahnhof vorbei?" },
  { fr: "arriver", de: "ankommen" },
  { fr: "Est-ce que tu arrives à la gare?", de: "Kommst du am Bahnhof an?" },
  { fr: "tomber", de: "fallen / stürzen" },
  { fr: "Est-ce que tu es tombé?", de: "Bist du gestürzt?" },
  { fr: "se lever", de: "aufstehen" },
  { fr: "Est-ce que tu te lèves?", de: "Stehst du auf?" },
  { fr: "commencer", de: "beginnen" },
  { fr: "Est-ce que tu commences les devoirs?", de: "Beginnst du die Hausaufgaben?" },
  { fr: "terminer", de: "beenden" },
  { fr: "Est-ce que tu termines les devoirs?", de: "Beendest du die Hausaufgaben?" },
  { fr: "D'accord.", de: "Einverstanden / Okay." },
];

const ER_VERBEN = [
  { inf: 'regarder',  stamm: 'regard' },
  { inf: 'passer',    stamm: 'pass' },
  { inf: 'arriver',   stamm: 'arriv' },
  { inf: 'commencer', stamm: 'commenc', stammNous: 'commenç' },
  { inf: 'terminer',  stamm: 'termin' },
  { inf: 'briller',   stamm: 'brill' },
  { inf: 'souffler',  stamm: 'souffl' },
  { inf: 'tomber',    stamm: 'tomb' },
];

// ════════════════════════════════════════════════════════════
//  ENGLISCH, 5. Klasse · Vocabulary Pre-Unit
//  → Wörter hier eintragen: { fr: "englisch", de: "deutsch" }
//    (das Feld heisst überall fr, egal welche Fremdsprache)
// ════════════════════════════════════════════════════════════
const EN_PRE_UNIT = [
  { fr: "pen", de: "der Stift" },
  { fr: "pencil", de: "der Bleistift" },
  { fr: "teacher", de: "der Lehrer / die Lehrerin" },
  { fr: "ruler", de: "das Lineal" },
  { fr: "rubber", de: "der Radiergummi" },
  { fr: "pencil case", de: "das Etui" },
  { fr: "glue", de: "der Leim" },
  { fr: "scissors", de: "die Schere" },
  { fr: "folder", de: "der Ordner" },
  { fr: "bin", de: "der Papierkorb" },
  { fr: "desk", de: "das Pult" },
  { fr: "chair", de: "der Stuhl" },
  { fr: "schoolbag", de: "der Schulsack" },
  { fr: "paper", de: "das Papier" },
  { fr: "book", de: "das Buch" },
  { fr: "sharpener", de: "der Spitzer" },
  { fr: "student", de: "der Schüler / die Schülerin" },
  { fr: "whiteboard", de: "die Wandtafel" },
];

// ════════════════════════════════════════════════════════════
//  AUFBAU DES MENÜS
// ════════════════════════════════════════════════════════════
const QUIZ_DATEN = {
  gruppen: [
    {
      titel: 'Französisch · 5. Klasse',
      sprache: 'fr', farbe: '#7b1f2b', hell: '#f0d9d2', offen: true,
      decks: [
        { id: 'fr5-u1-woerter', icon: '📘', titel: 'Unité 1 · Klassenwortschatz',
          typ: 'vokabeln', woerter: U1_ROSA },
        { id: 'fr5-u1-artikel', icon: '✏️', titel: 'Unité 1 · un / une',
          typ: 'artikel', woerter: baueArtikel(U1_ROSA) },
        { id: 'fr5-konjugation', icon: '💜', titel: 'Konjugation · -er-Verben',
          typ: 'konjugation', woerter: baueKonjugation(ER_VERBEN) },
        { id: 'fr5-zahlen', icon: '🔢', titel: 'Zahlen 1–1000',
          typ: 'zahlen', woerter: baueZahlen(1000) },
      ],
    },
    {
      titel: 'Französisch · 4. Klasse',
      sprache: 'fr', farbe: '#1f5136', hell: '#d9e8dd', offen: false,
      decks: [
        { id: 'fr4-wetter8',  icon: '🌸', titel: 'Wetter · Liste 8',
          typ: 'vokabeln', woerter: WETTER_8 },
        { id: 'fr4-wetter9',  icon: '🌟', titel: 'Wetter · Liste 9',
          typ: 'vokabeln', woerter: WETTER_9 },
        { id: 'fr4-wetter10', icon: '🌿', titel: 'Fragen & Verben · Liste 10',
          typ: 'vokabeln', woerter: WETTER_10 },
      ],
    },
    {
      titel: 'Englisch · 5. Klasse',
      sprache: 'en', farbe: '#1d3a6e', hell: '#d8e0ee', offen: true,
      decks: [
        { id: 'en5-preunit', icon: '🇬🇧', titel: 'Pre-Unit · Wörter',
          typ: 'vokabeln', woerter: EN_PRE_UNIT },
      ],
    },
    {
      titel: 'Wiederholen',
      sprache: null, farbe: '#6b4a17', hell: '#eee0c4', offen: true,
      decks: [
        { id: 'fehler', icon: '🔁', titel: 'Meine Fehler',
          typ: 'fehler', woerter: [] },
      ],
    },
  ],
};
