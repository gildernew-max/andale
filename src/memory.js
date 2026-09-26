/** Memory pairs / Memoria — Games, next to Cubetas + Ahorcado + Jeopardy.
 *  Brand CLEAR 2026-09-19 · Teaching CLEAR 2026-09-19 (Mexicanismos bank)
 *  One Cenzontle platform-wide — Memory never adds a coach/mascot.
 *  Soft chrome parked. Tap two cards or drag a pair. Full-word bubbles.
 *  Brand CLEAR 2026-09-20 — 3×4 board, bigger cards + larger type.
 *  Size lock: 140px / 26px hero (167's 96/20 still failed live).
 *  Width lock: near-full content width (169's 480 column still failed live).
 */

/** George + No Face CLEAR: language-split title, not a bilingual lockup. */
export const MEMORY_TITLE = { es: "Memoria", en: "Memory" };
export const MEMORY_QUIET = { es: "Pares mexicanos", en: "Mexican pairs" };
export const MEMORY_HOWTO = {
  es: "Toca dos cartas o arrastra un par.",
  en: "Tap two cards or drag a pair.",
};
export const MEMORY_WIN = { es: "¡Eso!", en: "That's it." };
export const MEMORY_LITERAL_LABEL = { es: "Literal", en: "Literal" };
export const MEMORY_WHY_LABEL = { es: "Por qué", en: "Why" };
export const MEMORY_LITERAL_WHY = { es: "Literal · Por qué", en: "Literal · Why" };

export const MEMORY_HUB = "games";
export const MEMORY_PACK_ID = "mexicanismos-v1";
export const MEMORY_ROUND_CAP = 6;
export const MEMORY_XP = 4;
export const MEMORY_GEM = 1;
export const MEMORY_MISS_MS = 400;

/** Dead chrome — never titles, never UI. */
export const MEMORY_DEAD_LABELS = [
  "MEMORIA / MEMORY",
  "Memory / Memoria",
  "AHORCADO / HANGMAN",
  "JEOPARDY SOLO",
];

/**
 * Pair bank v1 — George Teaching CLEAR 2026-09-19.
 * Same lemmas as Hangman. Meaning is the face; Why is the quiet beat.
 * odd[] drives `MX · odd in ES/AR` only when region is MX strong.
 */
const MEMORY_FACE_BANK = [
  ["chamba", "job, work", "trabajo", "MX strong", "Everyday MX for work", "Forma viva MX de trabajo", ["ES", "AR"]],
  ["neta", "for real, the truth", "la verdad", "MX strong", "¿Neta? = seriously?", "¿Neta? = ¿en serio?", ["ES", "AR"]],
  ["órale", "come on, all right", "ándale, de acuerdo", "MX strong", "Agree, urge, or wow", "Anima, acepta o sorprende", ["ES", "AR", "CO"]],
  ["carnal", "buddy, bro", "amigo, hermano", "MX strong", "Close friend", "Amigo cercano", ["ES", "AR"]],
  ["morra", "girl, young woman", "chica", "MX strong", "Pair: morro for guys", "Él: morro", ["ES", "AR", "CO"]],
  ["chido", "cool", "genial", "MX strong", "Default MX \u201Ccool\u201D", "El cool mexicano", ["ES", "AR"]],
  ["gacho", "lousy, mean", "feo, malo", "MX strong", "Bad vibe", "Mal plan o injusto", []],
  ["chafa", "cheap, shoddy", "de mala calidad", "MX strong", "Cheap that shows", "Barato que se nota", []],
  ["bronca", "trouble, fight", "problema, pelea", "Wide LATAM", "Hay bronca = problem", "Problema serio o pelea", []],
  ["onda", "vibe, what's up", "ambiente", "MX strong", "¿Qué onda?", "¿Qué onda? saluda", ["ES"]],
  ["chela", "beer", "cerveza", "MX / CO", "Casual beer", "Cerveza entre cuates", []],
  ["antro", "nightclub", "discoteca", "MX strong", "Nightlife spot", "Lugar de la noche", ["ES", "AR"]],
  ["elote", "corn on the cob", "mazorca de maíz", "MX / Wide", "Street food corn", "Maíz de puesto", []],
  ["esquites", "corn kernels in a cup", "maíz en vaso", "MX strong", "Cup + spoon", "Elote en vaso", ["ES", "AR", "CO"]],
  ["tianguis", "street market", "mercado al aire libre", "MX strong", "Barrio market day", "Mercado del barrio", ["ES"]],
  ["combi", "shared van", "camioneta colectiva", "MX strong", "Fixed-route van", "Ruta fija urbana", ["ES", "AR", "CO"]],
  ["cruda", "hangover", "resaca", "MX strong", "Morning after", "Después de la peda", ["ES", "AR", "CO"]],
  ["chisme", "gossip", "rumor", "Wide LATAM", "Social sport", "Cotilleo vivo", []],
  ["apapacho", "warm hug", "abrazo cariñoso", "MX strong", "Soft care", "Cariño que consuela", ["ES", "AR", "CO"]],
  ["fresa", "preppy, snobby", "presumido", "MX strong", "Posh type (can tease)", "Tipo zona nice", ["ES"]],
];

export const MEMORY_REGIONS = ["MX home", "MX strong", "Wide LATAM", "MX / CO", "MX / Wide"];

export const MEMORY_BANK = MEMORY_FACE_BANK.map(([word, meaningEn, meaningEs, region, whyEn, whyEs, odd]) => ({
  word,
  meaning: { es: meaningEs, en: meaningEn },
  why: { es: whyEs, en: whyEn },
  region,
  home: ["MX"],
  odd,
}));

const shuffle = (arr, rng = Math.random) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function memoryTitle(uiLang) {
  return uiLang === "en" ? MEMORY_TITLE.en : MEMORY_TITLE.es;
}

export function memoryQuiet(uiLang) {
  return uiLang === "en" ? MEMORY_QUIET.en : MEMORY_QUIET.es;
}

export function memoryHowTo(uiLang) {
  return uiLang === "en" ? MEMORY_HOWTO.en : MEMORY_HOWTO.es;
}

export function memoryWinLine(uiLang) {
  return uiLang === "en" ? MEMORY_WIN.en : MEMORY_WIN.es;
}

export function memoryLiteralLabel(uiLang) {
  return uiLang === "en" ? MEMORY_LITERAL_LABEL.en : MEMORY_LITERAL_LABEL.es;
}

export function memoryWhyLabel(uiLang) {
  return uiLang === "en" ? MEMORY_WHY_LABEL.en : MEMORY_WHY_LABEL.es;
}

export function memoryLiteralWhyLabel(uiLang) {
  return uiLang === "en" ? MEMORY_LITERAL_WHY.en : MEMORY_LITERAL_WHY.es;
}

export function memoryMeaning(entry, uiLang) {
  if (!entry?.meaning) return "";
  return uiLang === "en" ? entry.meaning.en : entry.meaning.es;
}

export function memoryWhy(entry, uiLang) {
  if (!entry?.why) return "";
  return uiLang === "en" ? entry.why.en : entry.why.es;
}

/** Quiet region chip — only MX strong. `MX` / `MX · odd in ES/AR`. */
export function memoryRegionChip(entry) {
  if (entry?.region !== "MX strong") return "";
  const odd = (entry?.odd || []).filter(Boolean);
  if (!odd.length) return "MX";
  return `MX · odd in ${odd.join("/")}`;
}

export function memorySoundsWeirdOutside(entry) {
  return entry?.region === "MX strong" && (entry?.odd || []).length > 0;
}

export function memoryHasDeadLabel(text) {
  const s = String(text || "");
  return MEMORY_DEAD_LABELS.some((dead) => s.includes(dead));
}

export function memoryEntry(run, pairId) {
  return (run?.pairs || []).find((row) => row.word === pairId)
    || MEMORY_BANK.find((row) => row.word === pairId)
    || null;
}

export function memoryCardText(card, uiLang, run) {
  const entry = memoryEntry(run, card?.pairId);
  if (!entry) return "";
  if (card.kind === "word") return entry.word;
  return memoryMeaning(entry, uiLang);
}

/** Partner face. A lemma card reads the meaning; a meaning card reads the lemma. */
export function memoryCardTranslation(card, uiLang, run) {
  const entry = memoryEntry(run, card?.pairId);
  if (!entry || !card) return "";
  if (card.kind === "word") return memoryMeaning(entry, uiLang);
  return entry.word;
}

/** Face-up accessible name: the card word plus its parenthesized partner. */
export function memoryCardLabel(card, uiLang, run) {
  const word = memoryCardText(card, uiLang, run);
  const gloss = memoryCardTranslation(card, uiLang, run);
  if (!word) return "";
  if (!gloss) return word;
  return `${word} (${gloss})`;
}

export function memoryIsOpen(run, card) {
  if (!run || !card) return false;
  return (run.matched || []).includes(card.pairId) || (run.faceUp || []).includes(card.id);
}

export function memoryShowTeach(run) {
  return !!run?.lastMatch;
}

export function isMemoryDone(run) {
  if (!run) return false;
  if (run.status === "done") return true;
  const n = run.pairs?.length || 0;
  return n > 0 && (run.matched?.length || 0) >= n;
}

export function pickMemoryEntries(bank = MEMORY_BANK, rng = Math.random, cap = MEMORY_ROUND_CAP) {
  const n = Math.min(cap, bank.length);
  return shuffle(bank, rng).slice(0, n);
}

export function dealMemoryCards(entries, rng = Math.random) {
  const cards = [];
  (entries || []).forEach((entry) => {
    cards.push({ id: `${entry.word}-word`, pairId: entry.word, kind: "word" });
    cards.push({ id: `${entry.word}-meaning`, pairId: entry.word, kind: "meaning" });
  });
  return shuffle(cards, rng);
}

export function startMemoryRun(bank = MEMORY_BANK, rng = Math.random, cap = MEMORY_ROUND_CAP) {
  const pairs = pickMemoryEntries(bank, rng, cap);
  return {
    packId: MEMORY_PACK_ID,
    hub: MEMORY_HUB,
    pairs,
    cards: dealMemoryCards(pairs, rng),
    faceUp: [],
    matched: [],
    lastMatch: null,
    miss: false,
    lastWrong: [],
    status: "play",
    awarded: false,
    xp: 0,
    gems: 0,
  };
}

export function hydrateMemory(raw) {
  if (!raw || !Array.isArray(raw.cards) || !raw.cards.length) return null;
  const pairs = (Array.isArray(raw.pairs) ? raw.pairs : [])
    .map((row) => MEMORY_BANK.find((b) => b.word === (row?.word || row)) || row)
    .filter((row) => row?.word);
  if (!pairs.length) return null;
  const cards = raw.cards.map((card) => ({
    id: card.id || `${card.pairId}-${card.kind}`,
    pairId: card.pairId,
    kind: card.kind === "meaning" ? "meaning" : "word",
  })).filter((card) => card.pairId);
  if (!cards.length) return null;
  const matched = (raw.matched || []).filter(Boolean);
  const done = raw.status === "done" || matched.length >= pairs.length;
  return {
    packId: raw.packId || MEMORY_PACK_ID,
    hub: raw.hub || MEMORY_HUB,
    pairs,
    cards,
    faceUp: done ? [] : (raw.faceUp || []).filter(Boolean),
    matched,
    lastMatch: raw.lastMatch || null,
    miss: !!raw.miss && !done,
    lastWrong: done ? [] : (raw.lastWrong || []),
    status: done ? "done" : "play",
    awarded: !!raw.awarded,
    xp: raw.xp || 0,
    gems: raw.gems || 0,
  };
}

const cardById = (run, id) => (run?.cards || []).find((card) => card.id === id) || null;

export function applyMemoryTap(run, cardId) {
  if (!run || run.status !== "play") return run;
  if (run.miss) return run;
  const card = cardById(run, cardId);
  if (!card) return run;
  if ((run.matched || []).includes(card.pairId)) return run;
  if ((run.faceUp || []).includes(card.id)) return run;
  const faceUp = [...(run.faceUp || [])];
  if (faceUp.length === 0) {
    return { ...run, faceUp: [card.id], miss: false, lastWrong: [] };
  }
  if (faceUp.length !== 1) return run;
  const first = cardById(run, faceUp[0]);
  if (!first) return { ...run, faceUp: [card.id], miss: false, lastWrong: [] };
  if (first.pairId === card.pairId && first.id !== card.id) {
    const matched = [...(run.matched || []), card.pairId];
    const done = matched.length >= (run.pairs || []).length;
    return {
      ...run,
      faceUp: [],
      matched,
      lastMatch: card.pairId,
      miss: false,
      lastWrong: [],
      status: done ? "done" : "play",
    };
  }
  return {
    ...run,
    faceUp: [first.id, card.id],
    miss: true,
    lastWrong: [first.id, card.id],
  };
}

export function applyMemoryPair(run, fromId, toId) {
  if (!run || run.status !== "play") return run;
  if (run.miss) return run;
  if (!fromId || !toId || fromId === toId) return run;
  const a = cardById(run, fromId);
  const b = cardById(run, toId);
  if (!a || !b) return run;
  if ((run.matched || []).includes(a.pairId) || (run.matched || []).includes(b.pairId)) return run;
  if (a.pairId === b.pairId) {
    const matched = [...(run.matched || []), a.pairId];
    const done = matched.length >= (run.pairs || []).length;
    return {
      ...run,
      faceUp: [],
      matched,
      lastMatch: a.pairId,
      miss: false,
      lastWrong: [],
      status: done ? "done" : "play",
    };
  }
  return {
    ...run,
    faceUp: [a.id, b.id],
    miss: true,
    lastWrong: [a.id, b.id],
  };
}

export function clearMemoryMiss(run) {
  if (!run?.miss) return run;
  return { ...run, miss: false, faceUp: [], lastWrong: [] };
}

export function finishMemoryRun(run) {
  if (!run || run.awarded) return run;
  return { ...run, status: "done", awarded: true, xp: MEMORY_XP, gems: MEMORY_GEM };
}
