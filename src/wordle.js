/** Palabra del día — five letters, six tries, one puzzle per local day.
 *  Accents fold (áéíóúü → aeiou). Ñ is its own letter and is not N.
 *  Duplicate letters follow Wordle rules: greens first, then the leftover
 *  counts mark present, and anything beyond that is absent.
 *  Guesses come from the CC0 Letterpress list in wordle-words.js.
 *  Answers are not added to that set. A missing answer fails the test.
 */

import { WORDLE_ANSWERS } from "./wordle-answers.js";
import { WORDLE_FIVE } from "./wordle-words.js";

export const WORDLE_TRIES = 6;
export const WORDLE_LENGTH = 5;
export const WORDLE_STORAGE_KEY = "andale-wordle";

/** Local calendar day 0. Same local date → same index in every timezone. */
export const WORDLE_EPOCH_UTC = Date.UTC(2026, 0, 1);

export const WORDLE_TITLE = { es: "Palabra del día", en: "Word of the day" };
export const WORDLE_QUIET = { es: "Cinco letras. Una al día.", en: "Five letters. One a day." };
export const WORDLE_HOWTO = { es: "Cinco letras. Seis intentos.", en: "Five letters. Six tries." };
export const WORDLE_INVALID = { es: "No está en la lista", en: "Not in the word list" };
export const WORDLE_ENTER = { es: "Enviar", en: "Enter" };
export const WORDLE_DELETE = { es: "Borrar", en: "Delete" };

/** Light correct tile. Same sage as MARK_INK in App.jsx. */
export const WORDLE_CORRECT = "#5C7356";
/** Muted mustard. White letters clear 4.5:1 and it stays lighter than the sage. */
export const WORDLE_PRESENT = "#96702F";
/** Warm mid-gray. White letters clear 4.5:1. */
export const WORDLE_ABSENT = "#7E756E";

/** Light surfaces from the Wordle brief. Cream page, white empty tiles, warm-gray border. */
export const WORDLE_LIGHT = {
  page: "#F6EFE4",
  board: "#F6EFE4",
  square: "#FFFFFF",
  line: "#C9BBA8",
  letter: "#3C3C3C",
  quiet: "#6F6560",
  clue: "#3C3C3C",
  gloss: "#777777",
};

/**
 * Dark mode. Brand ruling: page is the app background, the board and empty
 * tiles are the app card, borders are the app soft gray, text is cream.
 * Right spot is the map sage with cream letters. Wrong spot keeps the light
 * ochre. Absent is a neutral mid-gray, darker than that ochre so cream letters
 * clear 4.5:1 and the fill stays apart from the card, the sage, and the ochre.
 */
export const WORDLE_DARK = {
  page: "#15171C",
  board: "#1E2128",
  square: "#1E2128",
  line: "#2A2E36",
  letter: "#F6EFE4",
  quiet: "#A0A4AB",
  clue: "#F6EFE4",
  gloss: "#A0A4AB",
  correct: "#6F7757",
  present: WORDLE_PRESENT,
  absent: "#62666E",
  tileInk: "#F6EFE4",
};

export function wordleChrome(dark) {
  return dark ? WORDLE_DARK : WORDLE_LIGHT;
}

const ACCENT = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u",
  Á: "a", É: "e", Í: "i", Ó: "o", Ú: "u", Ü: "u",
};

const MARK_RANK = { absent: 1, present: 2, correct: 3 };

export function wordleTitle(uiLang) {
  return uiLang === "en" ? WORDLE_TITLE.en : WORDLE_TITLE.es;
}

export function wordleQuiet(uiLang) {
  return uiLang === "en" ? WORDLE_QUIET.en : WORDLE_QUIET.es;
}

export function wordleHowTo(uiLang) {
  return uiLang === "en" ? WORDLE_HOWTO.en : WORDLE_HOWTO.es;
}

export function wordleInvalidLine(uiLang) {
  return uiLang === "en" ? WORDLE_INVALID.en : WORDLE_INVALID.es;
}

export function wordleEnterLabel(uiLang) {
  return uiLang === "en" ? WORDLE_ENTER.en : WORDLE_ENTER.es;
}

export function wordleDeleteLabel(uiLang) {
  return uiLang === "en" ? WORDLE_DELETE.en : WORDLE_DELETE.es;
}

/** Fold accents. Keep ñ. Lowercase with Spanish rules so Ñ → ñ. */
export function normalizeWordle(raw) {
  const nfc = String(raw ?? "").normalize("NFC").toLocaleLowerCase("es");
  let out = "";
  for (const ch of nfc) out += ACCENT[ch] || ch;
  return out;
}

export function wordleChars(word) {
  return [...normalizeWordle(word)];
}

export function wordleLetterFromKey(key) {
  const n = normalizeWordle(key);
  if ([...n].length !== 1) return "";
  if (n >= "a" && n <= "z") return n;
  if (n === "ñ") return n;
  return "";
}

/** Greens consume letters first. Leftover copies can be present. The rest are absent. */
export function scoreWordle(guess, answer) {
  const g = wordleChars(guess);
  const a = wordleChars(answer);
  const marks = Array(g.length).fill("absent");
  const remaining = [];
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) marks[i] = "correct";
    else remaining.push(a[i]);
  }
  for (let i = 0; i < g.length; i++) {
    if (marks[i] === "correct") continue;
    const at = remaining.indexOf(g[i]);
    if (at >= 0) {
      marks[i] = "present";
      remaining.splice(at, 1);
    }
  }
  return marks;
}

/** Best mark seen for each letter. correct > present > absent. Keys are uppercase. */
export function wordleKeyState(guesses, answer) {
  const best = {};
  for (const guess of guesses || []) {
    const marks = scoreWordle(guess, answer);
    const chars = wordleChars(guess);
    chars.forEach((ch, i) => {
      const key = ch.toLocaleUpperCase("es");
      const mark = marks[i];
      if (!best[key] || MARK_RANK[mark] > MARK_RANK[best[key]]) best[key] = mark;
    });
  }
  return best;
}

export function wordleDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Days from 2026-01-01 using the local calendar date, not the UTC offset. */
export function wordleLocalDayIndex(date = new Date()) {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc - WORDLE_EPOCH_UTC) / 86400000);
}

export function wordleAnswerIndex(dayIndex, length) {
  if (!length) return 0;
  return ((dayIndex % length) + length) % length;
}

export function wordleAnswerForDate(date = new Date(), answers = WORDLE_ANSWERS) {
  if (!answers.length) return null;
  return answers[wordleAnswerIndex(wordleLocalDayIndex(date), answers.length)];
}

let guessCache = null;

/** The filtered list alone. Answers are not unioned in. */
export function wordleGuessSet() {
  if (!guessCache) guessCache = new Set(WORDLE_FIVE);
  return guessCache;
}

export function isWordleGuess(word) {
  return wordleGuessSet().has(normalizeWordle(word));
}

export function freshWordleRun(date = new Date(), answers = WORDLE_ANSWERS) {
  const entry = wordleAnswerForDate(date, answers) || { word: "", display: "", es: "", en: "" };
  return {
    day: wordleDayKey(date),
    word: entry.word,
    display: entry.display || "",
    es: entry.es || "",
    en: entry.en || "",
    answer: normalizeWordle(entry.word),
    guesses: [],
    draft: "",
    status: "play",
  };
}

export function wordleRunFromSave(save, date = new Date(), answers = WORDLE_ANSWERS) {
  const fresh = freshWordleRun(date, answers);
  if (!save || save.day !== fresh.day) return fresh;
  const guesses = [];
  for (const raw of save.guesses || []) {
    const guess = normalizeWordle(raw);
    if (wordleChars(guess).length !== WORDLE_LENGTH) continue;
    guesses.push(guess);
    if (guesses.length >= WORDLE_TRIES) break;
  }
  let status = "play";
  if (guesses.some((g) => g === fresh.answer)) status = "win";
  else if (guesses.length >= WORDLE_TRIES) status = "lose";
  const draft = status === "play" ? wordleChars(save.draft || "").slice(0, WORDLE_LENGTH).join("") : "";
  return { ...fresh, guesses, draft, status };
}

export function readWordleSave(storage) {
  try {
    const raw = storage?.getItem?.(WORDLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function wordleSaveFromRun(run) {
  return {
    day: run.day,
    guesses: run.guesses,
    draft: run.draft,
    status: run.status,
  };
}

export function saveWordleRun(storage, run) {
  if (!storage?.setItem || !run) return;
  storage.setItem(WORDLE_STORAGE_KEY, JSON.stringify(wordleSaveFromRun(run)));
}

export function loadWordleRun(storage, date = new Date(), answers = WORDLE_ANSWERS) {
  return wordleRunFromSave(readWordleSave(storage), date, answers);
}

export function wordleTypeLetter(run, letter) {
  if (!run || run.status !== "play") return run;
  const ch = wordleLetterFromKey(letter);
  if (!ch) return run;
  const chars = [...run.draft];
  if (chars.length >= WORDLE_LENGTH) return run;
  return { ...run, draft: chars.join("") + ch };
}

export function wordleBackspace(run) {
  if (!run || run.status !== "play") return run;
  const chars = [...run.draft];
  if (!chars.length) return run;
  chars.pop();
  return { ...run, draft: chars.join("") };
}

/** Invalid and short guesses do not consume a try. A finished day does not move. */
export function wordleCommit(run, dict = wordleGuessSet()) {
  if (!run || run.status !== "play") return { run, invalid: false, short: false };
  const guess = run.draft;
  if (wordleChars(guess).length !== WORDLE_LENGTH) return { run, invalid: false, short: true };
  if (!dict.has(guess)) return { run, invalid: true, short: false };
  const guesses = [...run.guesses, guess];
  let status = "play";
  if (guess === run.answer) status = "win";
  else if (guesses.length >= WORDLE_TRIES) status = "lose";
  return { run: { ...run, guesses, draft: "", status }, invalid: false, short: false };
}

export function wordleRows(run) {
  const rows = [];
  const guesses = run?.guesses || [];
  for (let i = 0; i < WORDLE_TRIES; i++) {
    if (i < guesses.length) {
      const guess = guesses[i];
      rows.push({
        letters: wordleChars(guess).map((ch) => ch.toLocaleUpperCase("es")),
        marks: scoreWordle(guess, run.answer),
        current: false,
      });
    } else if (i === guesses.length && run?.status === "play") {
      const draft = wordleChars(run.draft || []);
      const letters = Array(WORDLE_LENGTH).fill("");
      draft.forEach((ch, n) => { letters[n] = ch.toLocaleUpperCase("es"); });
      rows.push({ letters, marks: Array(WORDLE_LENGTH).fill(null), current: true });
    } else {
      rows.push({
        letters: Array(WORDLE_LENGTH).fill(""),
        marks: Array(WORDLE_LENGTH).fill(null),
        current: false,
      });
    }
  }
  return rows;
}
