import { readFileSync } from "node:fs";
import { WORDLE_ANSWERS } from "./wordle-answers.js";
import { WORDLE_FIVE } from "./wordle-words.js";
import {
  WORDLE_ENTER,
  WORDLE_HOWTO,
  WORDLE_INVALID,
  WORDLE_LENGTH,
  WORDLE_QUIET,
  WORDLE_TITLE,
  WORDLE_TRIES,
  freshWordleRun,
  isWordleGuess,
  loadWordleRun,
  normalizeWordle,
  saveWordleRun,
  scoreWordle,
  wordleAnswerForDate,
  wordleBackspace,
  wordleChars,
  wordleCommit,
  wordleDayKey,
  wordleGuessSet,
  wordleInvalidLine,
  wordleKeyState,
  wordleLetterFromKey,
  wordleLocalDayIndex,
  wordleTitle,
  wordleTypeLetter,
} from "./wordle.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const wordsSrc = readFileSync(new URL("./wordle-words.js", import.meta.url), "utf8");
assert(wordsSrc.includes("https://github.com/lorenbrichter/Words/blob/master/Words/es.txt"), "guess list records the source URL");
assert(wordsSrc.includes("CC0"), "guess list records the CC0 license");
assert(wordsSrc.includes("https://creativecommons.org/publicdomain/zero/1.0/"), "guess list records the CC0 deed");

assert(WORDLE_FIVE.length === 10836, "filtered list is 10836 five-letter words");
assert(new Set(WORDLE_FIVE).size === WORDLE_FIVE.length, "guess list is deduped");
for (const word of WORDLE_FIVE) {
  assert(wordleChars(word).length === 5, `${word} is 5 letters`);
  assert(word === normalizeWordle(word), `${word} is already normalized`);
  assert(!/[áéíóúü]/.test(word), `${word} has no accent`);
}
assert(WORDLE_FIVE.includes("niños"), "ñ stays ñ in niños");
assert(WORDLE_FIVE.includes("cañon") && WORDLE_FIVE.includes("canon"), "cañon and canon are both real and distinct");
assert(WORDLE_FIVE.includes("hagas") && WORDLE_FIVE.includes("digas") && WORDLE_FIVE.includes("sepas") && WORDLE_FIVE.includes("vayas"), "subjunctive forms are guessable");
assert(WORDLE_FIVE.includes("venga") && WORDLE_FIVE.includes("tenga") && WORDLE_FIVE.includes("pueda"), "more subjunctive forms are guessable");
assert(WORDLE_FIVE.includes("casas") && WORDLE_FIVE.includes("vivas"), "plurals are guessable");

assert(WORDLE_TITLE.es === "Palabra del día" && WORDLE_TITLE.en === "Word of the day", "title is ES/EN");
assert(wordleTitle("es") === "Palabra del día" && wordleTitle("en") === "Word of the day", "title helper follows uiLang");
assert(WORDLE_INVALID.es === "No está en la lista" && WORDLE_INVALID.en === "Not in the word list", "invalid copy");
assert(wordleInvalidLine("es") === "No está en la lista" && wordleInvalidLine("en") === "Not in the word list", "invalid helper");
assert(WORDLE_QUIET.es === "Cinco letras. Una al día." && WORDLE_QUIET.en === "Five letters. One a day.", "quiet line");
assert(WORDLE_HOWTO.es === "Cinco letras. Seis intentos." && WORDLE_HOWTO.en === "Five letters. Six tries.", "how-to");
assert(WORDLE_ENTER.es === "Enviar" && WORDLE_ENTER.en === "Enter", "enter label");
assert(WORDLE_TRIES === 6 && WORDLE_LENGTH === 5, "six tries, five letters");

assert(normalizeWordle("Vénga") === "venga", "accents fold on a guess");
assert(normalizeWordle("pingü") === "pingu", "ü folds to u");
assert(normalizeWordle("Ñandú") === "ñandu", "Ñ stays ñ and ú folds");
assert(normalizeWordle("cañón") === "cañon", "ñ is not n");
assert(normalizeWordle("a\u0301rbol") === "arbol", "decomposed accent folds");
assert(wordleLetterFromKey("Á") === "a" && wordleLetterFromKey("Ñ") === "ñ", "keyboard letters normalize");
assert(wordleLetterFromKey("Enter") === "" && wordleLetterFromKey("1") === "", "enter and digits are not letters");

const marksOf = (guess, answer) => scoreWordle(guess, answer).join(",");

assert(marksOf("digas", "digas") === "correct,correct,correct,correct,correct", "exact guess is all correct");
assert(marksOf("canon", "cañon") === "correct,correct,absent,correct,correct", "ñ is not n");
assert(marksOf("cañon", "cañon") === "correct,correct,correct,correct,correct", "ñ matches ñ");
assert(marksOf("salsa", "digas") === "present,present,absent,absent,absent", "second s and second a in salsa are absent");
assert(marksOf("llave", "plaza") === "absent,correct,correct,absent,absent", "extra l in llave is absent once the green l is used");
assert(marksOf("llama", "calle") === "present,present,present,absent,absent", "calle has two l and one a, so llama's second a is absent");
assert(marksOf("venga", "vénga") === "correct,correct,correct,correct,correct", "accented answer matches a plain guess");

const keys = wordleKeyState(["salsa", "dicha"], "digas");
assert(keys.S === "present" && keys.A === "present" && keys.L === "absent", "salsa paints S/A present and L absent");
assert(keys.D === "correct" && keys.I === "correct" && keys.C === "absent" && keys.H === "absent", "dicha upgrades D and I to correct");
assert(wordleKeyState(["aaaaa", "plaza"], "plaza").A === "correct", "correct beats an earlier absent");
assert(wordleKeyState(["zzzzz", "feria"], "feria").Z === "absent", "absent stays when the letter is missing");
assert(wordleKeyState(["aroma"], "feria").R === "present", "present is kept");
const upgraded = wordleKeyState(["aroma", "feria"], "feria");
assert(upgraded.R === "correct" && upgraded.A === "correct", "a later correct replaces present");

const dict = wordleGuessSet();
assert(dict.size >= WORDLE_FIVE.length, "guess set includes the filtered list");
for (const row of WORDLE_ANSWERS) {
  const norm = normalizeWordle(row.word);
  assert(wordleChars(norm).length === WORDLE_LENGTH, `${row.word} is 5 letters after normalization`);
  assert(dict.has(norm), `${row.word} is in the valid-guess set`);
  assert(isWordleGuess(row.word), `${row.word} passes isWordleGuess`);
  assert(typeof row.sentence === "string" && row.sentence.trim(), `${row.word} has a sentence`);
}
assert(WORDLE_ANSWERS.length > 0, "answers list is not empty");

const late = new Date(2026, 8, 26, 23, 59, 30);
const early = new Date(2026, 8, 27, 0, 0, 1);
assert(wordleDayKey(late) === "2026-09-26", "local date key before midnight");
assert(wordleDayKey(early) === "2026-09-27", "local midnight rolls the day");
assert(wordleLocalDayIndex(early) === wordleLocalDayIndex(late) + 1, "midnight advances the day index by one");
assert(wordleLocalDayIndex(new Date(2026, 0, 1, 0, 30)) === 0, "epoch morning is day 0");
assert(wordleLocalDayIndex(new Date(2026, 8, 26, 15)) === 268, "2026-09-26 is day 268");
assert(wordleAnswerForDate(new Date(2026, 8, 26, 8)).word === wordleAnswerForDate(new Date(2026, 8, 26, 23)).word, "same local date, same answer");
assert(wordleAnswerForDate(late).word !== wordleAnswerForDate(early).word, "next local day is a different answer");
assert(wordleAnswerForDate(new Date(2026, 8, 26)).word === "digas", "day 268 picks digas from the placeholder bank");
assert(wordleLocalDayIndex(new Date(2028, 2, 1)) === wordleLocalDayIndex(new Date(2028, 1, 29)) + 1, "leap day is its own index");
assert(wordleLocalDayIndex(new Date(2028, 1, 29)) === wordleLocalDayIndex(new Date(2028, 1, 28)) + 1, "2028-02-29 follows 2028-02-28");
const beforeEpoch = wordleAnswerForDate(new Date(2025, 11, 31));
assert(beforeEpoch && WORDLE_ANSWERS.some((row) => row.word === beforeEpoch.word), "dates before the epoch still pick a bank word");

const memory = () => {
  const box = new Map();
  return {
    getItem: (k) => (box.has(k) ? box.get(k) : null),
    setItem: (k, v) => box.set(k, v),
  };
};

const store = memory();
const today = new Date(2026, 8, 26, 12);
let run = freshWordleRun(today);
run = wordleTypeLetter(run, "s");
run = wordleTypeLetter(run, "Á");
run = wordleTypeLetter(run, "l");
run = wordleTypeLetter(run, "s");
run = wordleTypeLetter(run, "a");
assert(run.draft === "salsa", "accented key folds into the draft");
let step = wordleCommit(run, dict);
assert(!step.invalid && step.run.guesses.length === 1 && step.run.draft === "" && step.run.status === "play", "valid guess consumes one try");
run = step.run;
const bad = wordleTypeLetter(wordleTypeLetter(wordleTypeLetter(wordleTypeLetter(wordleTypeLetter(run, "z"), "z"), "z"), "z"), "z");
step = wordleCommit(bad, dict);
assert(step.invalid && step.run.guesses.length === 1 && step.run.draft === "zzzzz", "invalid guess does not consume a try");
const short = wordleCommit(wordleTypeLetter(run, "a"), dict);
assert(short.short && short.run.guesses.length === 1, "short guess does not consume a try");
run = wordleBackspace(bad);
assert(run.draft === "zzzz", "backspace drops one letter");
run = step.run;
run = { ...run, draft: "" };
for (const ch of "dicha") run = wordleTypeLetter(run, ch);
step = wordleCommit(run, dict);
run = step.run;
assert(run.guesses.join("|") === "salsa|dicha" && run.status === "play", "second guess is kept");
saveWordleRun(store, run);
const restored = loadWordleRun(store, new Date(2026, 8, 26, 18));
assert(restored.guesses.join("|") === "salsa|dicha" && restored.status === "play" && restored.answer === "digas", "reload restores today's board");
const nextDay = loadWordleRun(store, new Date(2026, 8, 27, 1));
assert(nextDay.guesses.length === 0 && nextDay.status === "play" && nextDay.day === "2026-09-27", "a new local day starts empty");

for (const ch of "digas") run = wordleTypeLetter(run, ch);
step = wordleCommit(run, dict);
assert(step.run.status === "win" && step.run.guesses.length === 3, "the answer wins");
saveWordleRun(store, step.run);
const locked = loadWordleRun(store, new Date(2026, 8, 26, 20));
assert(locked.status === "win", "a finished day reloads as finished");
const again = wordleCommit(wordleTypeLetter(locked, "a"), dict);
assert(again.run === locked && again.run.guesses.length === 3, "a finished day cannot be replayed");
const typed = wordleTypeLetter(locked, "a");
assert(typed === locked && typed.draft === "", "a finished day ignores new letters");

const loseStore = memory();
let losing = freshWordleRun(today);
const misses = ["salsa", "dicha", "casas", "vivas", "meses", "niños"];
for (const guess of misses) {
  let draft = { ...losing, draft: "" };
  for (const ch of guess) draft = wordleTypeLetter(draft, ch);
  const got = wordleCommit(draft, dict);
  assert(!got.invalid, `${guess} is a real guess`);
  losing = got.run;
}
assert(losing.status === "lose" && losing.guesses.length === 6, "six misses loses");
saveWordleRun(loseStore, losing);
const lost = loadWordleRun(loseStore, today);
assert(lost.status === "lose" && wordleTypeLetter(lost, "a") === lost, "a lost day cannot be replayed");

console.log(`ok: wordle — ${wordleGuessSet().size} valid 5-letter guesses`);
