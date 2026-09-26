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
  WORDLE_ABSENT,
  WORDLE_CORRECT,
  WORDLE_PRESENT,
  wordleChars,
  wordleChrome,
  WORDLE_DARK,
  WORDLE_LIGHT,
  wordleCommit,
  wordleDayKey,
  wordleGuessSet,
  wordleInvalidLine,
  wordleKeyState,
  wordleLetterFromKey,
  wordleLocalDayIndex,
  wordleSentenceParts,
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
for (const form of ["venga", "hagas", "digas", "sepan", "hayan", "quepa", "oigas", "pague", "sigas", "pedir", "pagar", "salir", "tomar", "niños", "tacos"]) {
  assert(WORDLE_FIVE.includes(form), `${form} is a native guess`);
}

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
assert(dict.size === WORDLE_FIVE.length, "guess set is the word list alone");
assert(WORDLE_ANSWERS.length === 60, "60-day list");
for (const row of WORDLE_ANSWERS) {
  const norm = normalizeWordle(row.word);
  assert(wordleChars(norm).length === WORDLE_LENGTH, `${row.word} is 5 letters after normalization`);
  assert(row.word === norm.toLocaleUpperCase("es"), `${row.word} is stored unaccented and uppercase`);
  assert(normalizeWordle(row.display) === norm, `${row.display} folds to ${row.word}`);
  assert(WORDLE_FIVE.includes(norm), `${row.word} is in the valid-guess set`);
  assert(isWordleGuess(row.word), `${row.word} passes isWordleGuess`);
  assert(row.es && row.en, `${row.word} has Spanish and English`);
  assert(row.es.toLocaleLowerCase("es").includes(row.display.toLocaleLowerCase("es")), `${row.display} is in the Spanish sentence`);
  const parts = wordleSentenceParts(row.es, row.display);
  assert(parts.bold, `${row.display} is in the Spanish sentence`);
  assert(parts.bold.toLocaleLowerCase("es") === row.display, `${row.word}: bold word equals the stored accented display spelling`);
  assert(parts.before + parts.bold + parts.after === row.es, `${row.word}: sentence text is unchanged`);
  const beforeTail = [...parts.before].at(-1) || "";
  const afterHead = [...parts.after][0] || "";
  assert(!/\p{L}/u.test(beforeTail) && !/\p{L}/u.test(afterHead), `${row.word}: bold span is the answer word`);
}
assert(wordleSentenceParts("Ya no hay jabon en el baño.", "jabón").bold === "", "an unaccented stand-in is not the stored spelling");
assert(WORDLE_ANSWERS[18].word === "JABON" && WORDLE_ANSWERS[18].display === "jabón", "jabón keeps its display accent");
assert(WORDLE_ANSWERS[25].word === "NIÑOS" && WORDLE_ANSWERS[25].display === "niños", "ñ stays in NIÑOS");
assert(WORDLE_ANSWERS[27].word === "SUEÑO" && WORDLE_ANSWERS[27].display === "sueño", "sueño keeps ñ");
assert(WORDLE_ANSWERS[36].word === "LIMON" && WORDLE_ANSWERS[36].display === "limón", "limón keeps its display accent");
assert(WORDLE_ANSWERS[44].word === "ESTES" && WORDLE_ANSWERS[44].display === "estés", "estés keeps its display accent");
assert(!isWordleGuess("qqqqq"), "a gap is not filled by unioning the answer in");

const markInk = readFileSync(new URL("./App.jsx", import.meta.url), "utf8").match(/const MARK_INK = "([^"]+)"/);
assert(markInk && WORDLE_CORRECT === markInk[1] && WORDLE_CORRECT === "#5C7356", "light correct reuses MARK_INK");
assert(wordleChrome(false) === WORDLE_LIGHT, "light chrome is the brief palette");
assert(WORDLE_LIGHT.board === "#F6EFE4" && WORDLE_LIGHT.page === "#F6EFE4", "light board stays cream");
assert(WORDLE_LIGHT.square === "#FFFFFF" && WORDLE_LIGHT.letter === "#3C3C3C", "light squares stay white with ink letters");
assert(WORDLE_LIGHT.line === "#C9BBA8", "light empty tiles use a thin warm-gray border");
assert(WORDLE_LIGHT.gloss === "#777777", "light gloss stays the memory gray");
assert(wordleChrome(true) === WORDLE_DARK, "dark chrome is one isolated object");
assert(WORDLE_DARK.page === "#15171C", "dark page is the app background");
assert(WORDLE_DARK.board === "#1E2128" && WORDLE_DARK.square === "#1E2128", "dark board and empty tiles are the app card");
assert(WORDLE_DARK.line === "#2A2E36", "dark tile borders are the app soft gray");
assert(WORDLE_DARK.letter === "#F6EFE4" && WORDLE_DARK.square === "#1E2128" && WORDLE_DARK.line === "#2A2E36", "empty dark tiles are card, soft-gray edge, cream letters");
assert(WORDLE_DARK.correct === "#677050" && WORDLE_DARK.correctInk === "#F6EFE4", "dark right spot is #677050 with cream");
assert(WORDLE_DARK.present === "#85672C" && WORDLE_DARK.presentInk === "#F6EFE4", "dark wrong spot is #85672C with cream");
assert(WORDLE_DARK.absent === "#2A2E36" && WORDLE_DARK.absentInk === "#A0A4AB", "dark absent is #2A2E36 with #A0A4AB letters");

const channel = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rel = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * channel(rgb[0] / 255) + 0.7152 * channel(rgb[1] / 255) + 0.0722 * channel(rgb[2] / 255);
};
const ratio = (fg, bg) => {
  const hi = Math.max(rel(fg), rel(bg));
  const lo = Math.min(rel(fg), rel(bg));
  return (hi + 0.05) / (lo + 0.05);
};
for (const [name, bg] of [["correct", WORDLE_CORRECT], ["present", WORDLE_PRESENT], ["absent", WORDLE_ABSENT]]) {
  assert(ratio("#FFFFFF", bg) >= 4.5, `${name} white letters clear 4.5:1`);
}
assert(rel(WORDLE_PRESENT) > rel(WORDLE_CORRECT), "ochre stays lighter than the sage");
assert(ratio(WORDLE_DARK.correctInk, WORDLE_DARK.correct) >= 4.5, "cream on the dark right spot clears 4.5:1");
assert(ratio(WORDLE_DARK.presentInk, WORDLE_DARK.present) >= 4.5, "cream on the dark wrong spot clears 4.5:1");
assert(ratio(WORDLE_DARK.absentInk, WORDLE_DARK.absent) >= 4.5, "absent letters clear 4.5:1");
assert(ratio(WORDLE_DARK.letter, WORDLE_DARK.square) >= 4.5, "cream on an empty dark tile clears 4.5:1");
for (const hex of [WORDLE_DARK.letter, WORDLE_DARK.quiet, WORDLE_DARK.gloss]) {
  assert(ratio(hex, WORDLE_DARK.board) >= 4.5, `${hex} clears 4.5:1 on the dark board`);
}
const appSrc = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const darkAt = appSrc.indexOf("const D_DARK");
const darkBlock = appSrc.slice(darkAt, appSrc.indexOf("const D =", darkAt));
const darkInk = darkBlock.match(/ink: "([^"]+)"/)[1];
const darkSub = darkBlock.match(/sub: "([^"]+)"/)[1];
assert(ratio(darkInk, WORDLE_DARK.board) >= 4.5 && ratio(darkSub, WORDLE_DARK.board) >= 4.5, "ES/EN ink and quiet label clear 4.5:1 on the dark board");
const darkFills = [WORDLE_DARK.correct, WORDLE_DARK.present, WORDLE_DARK.absent, WORDLE_DARK.square];
assert(new Set(darkFills).size === 4, "dark right, wrong, absent, and empty tiles are four fills");
const wordleKeysAt = appSrc.indexOf("const wordleKeyStatus");
const wordleKeys = appSrc.slice(wordleKeysAt, wordleKeysAt + 2600);
assert(wordleKeys.includes("<SpanishKeyboardKey"), "Wordle letters render SpanishKeyboardKey");
assert(wordleKeys.includes('status={status}'), "Wordle passes a shared key status");
assert(wordleKeys.includes('mark === "absent") return "wrong"'), "absent keys use the shared wrong status");
assert(wordleKeys.includes('return "unused"'), "unplayed keys use unused");
assert(!wordleKeys.includes("LetterBoard") && !wordleKeys.includes("chrome"), "Wordle does not keep its own keyboard");
const gridAt = appSrc.indexOf('data-testid="wordle-grid"');
const gridBlock = appSrc.slice(gridAt, gridAt + 450);
assert(gridBlock.includes("chrome.correct") && gridBlock.includes("chrome.absentInk"), "dark tile colors sit on the grid");
const letterSig = appSrc.slice(appSrc.indexOf("const LetterBoard"), appSrc.indexOf("=> {", appSrc.indexOf("const LetterBoard")));
assert(!letterSig.includes("marks") && !letterSig.includes("chrome"), "Ahorcado LetterBoard has no Wordle keyboard");
assert(appSrc.includes("wordleSentenceParts(run.es, run.display)"), "finish sentence bolds the stored display");
assert(appSrc.includes('data-testid="wordle-answer"'), "the accented answer is the bold span");
assert(appSrc.includes('.wordle-reveal [data-testid="wordle-answer"] { font-weight: 900; }'), "the answer is heavier weight only");
const glossAt = appSrc.indexOf('.wordle-reveal [data-testid="wordle-gloss"]');
const glossRule = appSrc.slice(glossAt, glossAt + 160);
assert(glossRule.includes("font-weight: 700") && !glossRule.includes("900"), "the English line stays plain");

const late = new Date(2026, 8, 26, 23, 59, 30);
const early = new Date(2026, 8, 27, 0, 0, 1);
assert(wordleDayKey(late) === "2026-09-26", "local date key before midnight");
assert(wordleDayKey(early) === "2026-09-27", "local midnight rolls the day");
assert(wordleLocalDayIndex(early) === wordleLocalDayIndex(late) + 1, "midnight advances the day index by one");
assert(wordleLocalDayIndex(new Date(2026, 0, 1, 0, 30)) === 0, "epoch morning is day 0");
assert(wordleLocalDayIndex(new Date(2026, 8, 26, 15)) === 268, "2026-09-26 is day 268");
assert(wordleAnswerForDate(new Date(2026, 8, 26, 8)).word === wordleAnswerForDate(new Date(2026, 8, 26, 23)).word, "same local date, same answer");
assert(wordleAnswerForDate(late).word !== wordleAnswerForDate(early).word, "next local day is a different answer");
assert(wordleAnswerForDate(new Date(2026, 8, 26)).word === "PEDIR", "day 268 picks PEDIR");
assert(wordleAnswerForDate(new Date(2026, 8, 26)).display === "pedir", "PEDIR reveal spelling");
assert(wordleAnswerForDate(new Date(2026, 8, 26)).es === "Voy a pedir la cuenta.", "PEDIR Spanish sentence");
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
assert(restored.guesses.join("|") === "salsa|dicha" && restored.status === "play" && restored.answer === "pedir", "reload restores today's board");
const nextDay = loadWordleRun(store, new Date(2026, 8, 27, 1));
assert(nextDay.guesses.length === 0 && nextDay.status === "play" && nextDay.day === "2026-09-27", "a new local day starts empty");

for (const ch of "pedir") run = wordleTypeLetter(run, ch);
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
