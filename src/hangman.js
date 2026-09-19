/** Hangman / Ahorcado — Games, next to Cubetas. Soft chrome parked.
 *  Brand CLEAR 2026-09-18 · Teaching CLEAR 2026-09-19 (MX/ES/AR/CO faces)
 *  One Cenzontle platform-wide — Hangman never adds a coach/mascot.
 *  Mexicanismos bank. After solve: Literal, Why, quiet Region chip.
 *  Keyboard polish: on-screen Spanish board + numbered blanks.
 *  Number keys jump focus; letter keys type. Wrong auto-shows Literal/Why/Region (no Why tap).
 */

import { ABC_LETTERS } from "./letterBoard.js";
import { choiceChipIndexForKey, choiceChipKeyForIndex } from "./choiceChipKeys.js";

/** George + No Face CLEAR: language-split title, not a bilingual lockup. */
export const HANGMAN_TITLE = { es: "Ahorcado", en: "Hangman" };
export const HANGMAN_QUIET = { es: "Palabras de México", en: "Mexican words" };
export const HANGMAN_HOWTO = {
  es: "Adivina la palabra. Una letra a la vez.",
  en: "Guess the word. One letter at a time.",
};
export const HANGMAN_WRONG = { es: "Esa no.", en: "Not that one." };
export const HANGMAN_WIN = { es: "¡Eso!", en: "That's it." };
export const HANGMAN_LITERAL_LABEL = { es: "Literal", en: "Literal" };
export const HANGMAN_WHY_LABEL = { es: "Por qué", en: "Why" };

/** Timer parked. Off by default if a clock is ever wired. */
export const HANGMAN_TIMER_DEFAULT = false;
export const HANGMAN_TIMER = {
  es: { on: "Con reloj", off: "Sin reloj" },
  en: { on: "Timer on", off: "No timer" },
};

export const HANGMAN_HUB = "games";
export const HANGMAN_PACK_ID = "mexicanismos-v1";
export const HANGMAN_MAX = 6;
export const HANGMAN_XP = 4;
export const HANGMAN_GEM = 1;

/** Accented vowels match bank spelling. Not Spanish-alphabet letters. */
export const HANGMAN_ACCENTS = ["Á", "É", "Í", "Ó", "Ú", "Ü"];

/** Spanish alphabet on the on-screen board. Ñ is a letter. Accents are extra keys. */
export const HANGMAN_ALPHABET = ABC_LETTERS;

/** Dead chrome — never titles, never UI. */
export const HANGMAN_DEAD_LABELS = [
  "AHORCADO / HANGMAN",
  "Hanged!",
  "Got it!",
  "¡Lo adivinaste!",
  "leaderboard",
  "tabla de posiciones",
];

/**
 * Word bank v1 — George Teaching CLEAR 2026-09-19 (MX/ES/AR/CO).
 * Hangman-safe: no spaces. Accents count as the letter shown.
 * Same lemmas as Memory pairs. home/odd drive the quiet region chip.
 */
const HANGMAN_FACE_BANK = [
  ["chamba", "Trabajo / chamba", "Work / a job", "Forma viva MX de trabajo", "Everyday MX for work", "MX strong", ["MX"], ["ES", "AR"], "ES/AR prefieren *trabajo*; CO a veces lo conoce", "ES/AR prefer *trabajo*; CO may know it"],
  ["neta", "De verdad / la neta", "For real / the truth", "¿Neta? = ¿en serio?", "¿Neta? = seriously?", "MX strong", ["MX"], ["ES", "AR"], "Raro en ES/AR; CO a veces", "Odd in ES/AR; CO sometimes"],
  ["órale", "Ándale / órale", "Come on / alright / wow", "Anima, acepta o sorprende", "Agree, urge, or surprise", "MX strong", ["MX"], ["ES", "AR", "CO"], "Clásico MX; raro en ES/AR/CO", "Classic MX; rare in ES/AR/CO"],
  ["carnal", "Cuate / carnal", "Buddy / brother (friend)", "Amigo cercano", "Close friend", "MX strong", ["MX"], ["ES", "AR"], "ES *colega*; AR *boludo/amigo*", "ES *colega*; AR *boludo/amigo*"],
  ["morra", "Chava / morra", "Young woman (casual)", "Él: *morro*", "Pair *morro* for guys", "MX strong", ["MX"], ["ES", "AR", "CO"], "Raro en ES/AR/CO", "Odd in ES/AR/CO"],
  ["chido", "Padre / chido", "Cool / nice", "El cool mexicano", "Default MX “cool”", "MX strong", ["MX"], ["ES", "AR"], "ES *guay*; AR *copado/piola*", "ES *guay*; AR *copado/piola*"],
  ["gacho", "Feo / gacho", "Lame / mean / rough", "Mal plan o injusto", "Bad vibe", "MX strong", ["MX"], [], "Local MX", "Local MX"],
  ["chafa", "De mala calidad", "Low-quality / cheap", "Barato que se nota", "Cheap that shows", "MX strong", ["MX"], [], "Local MX", "Local MX"],
  ["bronca", "Lío / bronca", "Trouble / a fight", "Problema serio o pelea", "Hay bronca = problem", "Wide LATAM", ["MX", "CO", "AR"], [], "Bien en MX/CO/AR; ES también *bronca*", "OK in MX/CO/AR; ES *bronca* exists"],
  ["onda", "Rollo / onda", "Vibe / what’s up", "¿Qué onda? saluda", "¿Qué onda?", "MX strong", ["MX"], ["ES"], "ES *qué tal*; AR *qué onda* a veces", "ES *qué tal*; AR *qué onda* sometimes"],
  ["chela", "Cerveza (coloquial)", "Beer", "Cerveza entre cuates", "Casual beer", "MX / CO", ["MX", "CO"], ["ES", "AR"], "ES *caña/cerveza*; AR *birra*", "ES *caña/cerveza*; AR *birra*"],
  ["antro", "Antro / club", "Club / nightlife", "Lugar de la noche", "Nightlife spot", "MX strong", ["MX"], ["ES", "AR"], "ES/AR *boliche/discoteca*", "ES/AR *boliche/discoteca*"],
  ["elote", "Elote", "Street corn (cob)", "Maíz de puesto", "Street-food corn", "MX / Wide", ["MX"], ["ES", "AR"], "ES *mazorca*; AR *choclo*", "ES *mazorca*; AR *choclo*"],
  ["esquites", "Esquites", "Corn in a cup", "Elote en vaso", "Cup + spoon", "MX strong", ["MX"], ["ES", "AR", "CO"], "Muy de calle MX", "Very MX street food"],
  ["tianguis", "Tianguis / mercado", "Open-air market", "Mercado del barrio", "Barrio market day", "MX strong", ["MX"], ["ES"], "Náhuatl MX; ES *mercadillo*", "Nahuatl MX; ES *mercadillo*"],
  ["combi", "Combi / camioneta", "Shared van", "Ruta fija urbana", "Fixed-route van", "MX strong", ["MX"], ["ES", "AR", "CO"], "Otros países: *buseta/colectivo*", "Other countries: *buseta/colectivo*"],
  ["cruda", "Resaca / cruda", "Hangover", "Después de la peda", "Morning after", "MX strong", ["MX"], ["ES", "AR", "CO"], "ES/AR/CO *resaca*", "ES/AR/CO *resaca*"],
  ["chisme", "Chisme", "Gossip", "Cotilleo vivo", "Social sport", "Wide LATAM", ["MX", "ES", "AR", "CO"], [], "Vale en todos; ES también *chisme*", "Fine across; ES also *chisme*"],
  ["apapacho", "Apapacho / mimo", "Warm hug / comfort", "Cariño que consuela", "Soft care", "MX strong", ["MX"], ["ES", "AR", "CO"], "Querido MX; raro en otros", "Beloved MX; rare elsewhere"],
  ["fresa", "Fresa", "Preppy / posh person", "Tipo zona nice", "Posh type (can tease)", "MX strong", ["MX"], ["ES"], "Tipo social MX; no el *fresa* de ES (fruta)", "MX social type; not ES *fresa* fruit sense"],
];

export const HANGMAN_REGIONS = ["MX home", "MX strong", "Wide LATAM", "MX / CO", "MX / Wide"];

export const HANGMAN_BANK = HANGMAN_FACE_BANK.map(([word, literalEs, literalEn, whyEs, whyEn, region, home, odd, weirdEs, weirdEn]) => ({
  word,
  literal: { es: literalEs, en: literalEn },
  why: { es: whyEs, en: whyEn },
  region,
  home,
  odd,
  weird: { es: weirdEs, en: weirdEn },
}));

export function hangmanTitle(uiLang) {
  return uiLang === "en" ? HANGMAN_TITLE.en : HANGMAN_TITLE.es;
}

export function hangmanQuiet(uiLang) {
  return uiLang === "en" ? HANGMAN_QUIET.en : HANGMAN_QUIET.es;
}

export function hangmanHowTo(uiLang) {
  return uiLang === "en" ? HANGMAN_HOWTO.en : HANGMAN_HOWTO.es;
}

export function hangmanWrongLine(uiLang) {
  return uiLang === "en" ? HANGMAN_WRONG.en : HANGMAN_WRONG.es;
}

export function hangmanWinLine(uiLang) {
  return uiLang === "en" ? HANGMAN_WIN.en : HANGMAN_WIN.es;
}

export function hangmanLiteralLabel(uiLang) {
  return uiLang === "en" ? HANGMAN_LITERAL_LABEL.en : HANGMAN_LITERAL_LABEL.es;
}

export function hangmanWhyLabel(uiLang) {
  return uiLang === "en" ? HANGMAN_WHY_LABEL.en : HANGMAN_WHY_LABEL.es;
}

export function hangmanTimerLabel(uiLang, on) {
  const row = uiLang === "en" ? HANGMAN_TIMER.en : HANGMAN_TIMER.es;
  return on ? row.on : row.off;
}

export function hangmanKey(ch) {
  return String(ch || "").normalize("NFC").toLocaleUpperCase("es");
}

export function hangmanLetters(word) {
  return [...String(word || "").normalize("NFC")].map(hangmanKey).filter(Boolean);
}

export function hangmanLiteral(entry, uiLang) {
  if (!entry?.literal) return "";
  return uiLang === "en" ? entry.literal.en : entry.literal.es;
}

export function hangmanWhy(entry, uiLang) {
  if (!entry?.why) return "";
  return uiLang === "en" ? entry.why.en : entry.why.es;
}

/** Quiet region chip — same codes in ES and EN. `MX` / `MX · raro en ES/AR`. */
export function hangmanRegionChip(entry) {
  const home = (entry?.home || []).filter(Boolean);
  const odd = (entry?.odd || []).filter(Boolean);
  if (!home.length) return "";
  const base = home.join(" · ");
  if (!odd.length) return base;
  return `${base} · raro en ${odd.join("/")}`;
}

export function hangmanRegionNote(entry, uiLang) {
  if (!entry?.weird) return "";
  return uiLang === "en" ? (entry.weird.en || "") : (entry.weird.es || "");
}

export function hangmanSoundsWeirdOutside(entry) {
  return (entry?.odd || []).length > 0;
}

export function hangmanMisses(run) {
  const letters = run?.letters || [];
  return (run?.guessed || []).filter((g) => !letters.includes(g));
}

export function hangmanSlot(run, index) {
  const ch = run?.letters?.[index];
  if (!ch) return "";
  return (run.guessed || []).includes(ch) ? ch : "";
}

/** Quiet digit under a blank — same second-row map as TAP AN ANSWER chips. */
export function hangmanSlotKey(index) {
  return choiceChipKeyForIndex(index);
}

export function hangmanSlotIndexForKey(key) {
  return choiceChipIndexForKey(key);
}

export function hangmanIsLetterKey(key) {
  const k = hangmanKey(key);
  if (!k || [...k].length !== 1) return false;
  return HANGMAN_ALPHABET.includes(k) || HANGMAN_ACCENTS.includes(k);
}

export function hangmanNextEmptySlot(run, from = 0) {
  const letters = run?.letters || [];
  const n = letters.length;
  if (!n) return null;
  const start = ((Number(from) || 0) % n + n) % n;
  for (let step = 0; step < n; step++) {
    const i = (start + step) % n;
    if (!hangmanSlot(run, i)) return i;
  }
  return null;
}

export function hangmanShowTeach(run) {
  return run?.lastHit === false || isHangmanOver(run);
}

export function focusHangmanSlot(run, index) {
  if (!run || run.status !== "play") return run;
  const n = (run.letters || []).length;
  if (!Number.isInteger(index) || index < 0 || index >= n) return run;
  if (run.focus === index) return run;
  return { ...run, focus: index };
}

export function isHangmanSolved(run) {
  return run?.status === "win";
}

export function isHangmanLost(run) {
  return run?.status === "lose";
}

export function isHangmanOver(run) {
  return isHangmanSolved(run) || isHangmanLost(run);
}

export function pickHangmanEntry(bank = HANGMAN_BANK, rng = Math.random) {
  if (!bank.length) return null;
  const i = Math.min(bank.length - 1, Math.floor(rng() * bank.length));
  return bank[i];
}

export function startHangmanRun(bank = HANGMAN_BANK, rng = Math.random) {
  const entry = pickHangmanEntry(bank, rng) || HANGMAN_BANK[0];
  return {
    packId: HANGMAN_PACK_ID,
    hub: HANGMAN_HUB,
    word: entry.word,
    letters: hangmanLetters(entry.word),
    literal: entry.literal,
    why: entry.why,
    region: entry.region,
    home: entry.home || [],
    odd: entry.odd || [],
    weird: entry.weird,
    guessed: [],
    status: "play",
    lastHit: null,
    focus: 0,
    timerOn: HANGMAN_TIMER_DEFAULT,
    gems: 0,
    xp: 0,
    awarded: false,
  };
}

export function hydrateHangman(raw) {
  if (!raw?.word) return null;
  const entry = HANGMAN_BANK.find((row) => row.word === raw.word) || {
    word: raw.word,
    literal: raw.literal || { es: "", en: raw.hint || "" },
    why: raw.why || { es: "", en: "" },
  };
  const letters = Array.isArray(raw.letters) && raw.letters.length
    ? raw.letters.map(hangmanKey)
    : hangmanLetters(entry.word);
  const guessed = (raw.guessed || []).map(hangmanKey);
  let status = raw.status;
  if (status !== "play" && status !== "win" && status !== "lose") {
    if (raw.done) status = raw.won ? "win" : "lose";
    else status = "play";
  }
  return {
    packId: raw.packId || HANGMAN_PACK_ID,
    hub: raw.hub || HANGMAN_HUB,
    word: entry.word,
    letters,
    literal: entry.literal,
    why: entry.why,
    region: entry.region || raw.region,
    home: entry.home || raw.home || [],
    odd: entry.odd || raw.odd || [],
    weird: entry.weird || raw.weird,
    guessed,
    status,
    lastHit: raw.lastHit ?? null,
    focus: Number.isInteger(raw.focus) ? raw.focus : hangmanNextEmptySlot({ letters, guessed, status: "play" }) ?? 0,
    timerOn: HANGMAN_TIMER_DEFAULT,
    gems: raw.gems || 0,
    xp: raw.xp || 0,
    awarded: !!raw.awarded,
  };
}

export function guessHangmanLetter(run, letter) {
  if (!run || run.status !== "play") return run;
  const key = hangmanKey(letter);
  if (!key || (run.guessed || []).includes(key)) return run;
  const guessed = [...(run.guessed || []), key];
  const hit = (run.letters || []).includes(key);
  const allRevealed = (run.letters || []).every((ch) => guessed.includes(ch));
  const misses = guessed.filter((g) => !(run.letters || []).includes(g));
  const dead = misses.length >= HANGMAN_MAX;
  const next = { ...run, guessed, lastHit: hit, status: "play" };
  if (allRevealed) {
    return { ...next, lastHit: true, status: "win" };
  }
  if (dead) {
    return { ...next, lastHit: false, status: "lose" };
  }
  if (hit) {
    const from = hangmanSlot(next, run.focus ?? 0) ? (run.focus ?? 0) + 1 : (run.focus ?? 0);
    next.focus = hangmanNextEmptySlot(next, from) ?? run.focus ?? 0;
  }
  return next;
}

export function finishHangmanRun(run, won) {
  if (!run || run.awarded) return run;
  if (won) {
    return { ...run, status: "win", awarded: true, xp: HANGMAN_XP, gems: HANGMAN_GEM };
  }
  return { ...run, status: run.status === "lose" ? "lose" : "win", awarded: true, xp: 0, gems: 0 };
}

export function hangmanHasDeadLabel(text) {
  const s = String(text || "");
  return HANGMAN_DEAD_LABELS.some((dead) => s.includes(dead));
}
