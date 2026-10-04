import { readFileSync } from "fs";
import { MEXICO_MAP_COLORS } from "./recuerdos.js";
import { CROSSWORD_WORDS } from "./crosswordWords.js";
import {
  CROSSWORD_ACROSS,
  CROSSWORD_DOWN,
  CROSSWORD_REVEAL,
  CROSSWORD_BOARD_DARK,
  CROSSWORD_CREAM,
  CROSSWORD_INK_DARK,
  CROSSWORD_LINE_DARK,
  CROSSWORD_LOCKED_DARK,
  CROSSWORD_PAGE_DARK,
  CROSSWORD_QUIET_DARK,
  CROSSWORD_SAGE,
  CROSSWORD_SAGE_TEXT_DARK,
  CROSSWORD_SAGE_TINT_DARK,
  CROSSWORD_TITLE,
  CROSSWORD_GRID,
  backspaceCrossword,
  buildCrossword,
  crosswordColors,
  crosswordDirLabel,
  crosswordLetter,
  crosswordRevealLabel,
  crosswordTitle,
  hydrateCrossword,
  isWordCorrect,
  revealCrosswordWord,
  selectCrosswordCell,
  selectCrosswordClue,
  startCrosswordRun,
  typeCrosswordLetter,
  validateCrossword,
  wordCells,
} from "./crossword.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const CLUES = {
  MERCADO: "Market where you buy fruit and tortillas",
  PROPINA: "The tip you leave the waiter",
  CUENTA: "The check at a restaurant (\"La ___, por favor.\")",
  LLAVE: "Key to your front door",
  VECINO: "Neighbor (he lives next door)",
  ALQUILER: "Rent you pay each month",
  FARMACIA: "Pharmacy",
  VENGAS: "\"Ojalá que ___ a la fiesta.\" (I hope you come, tú)",
  HAYA: "\"Espero que ___ agua caliente.\" (I hope there is hot water)",
  PUEDAS: "\"Me alegra que ___ venir.\" (I'm glad you can come, tú)",
};

assert(CROSSWORD_WORDS.length === 10, "ten locked words");
assert(CROSSWORD_WORDS.every((row) => CLUES[row.answer] === row.clue), "clues are the locked English lines");
assert(CROSSWORD_SAGE === MEXICO_MAP_COLORS.sage && CROSSWORD_SAGE === "#6f7757", "lock color is the Cubetas-bucket sage token");
assert(CROSSWORD_TITLE.es === "Crucigrama" && CROSSWORD_TITLE.en === "Crossword", "title is Crucigrama / Crossword");
assert(crosswordTitle("es") === "Crucigrama" && crosswordTitle("en") === "Crossword", "title helper follows uiLang");
assert(CROSSWORD_REVEAL.es === "Revelar palabra" && crosswordRevealLabel("es") === "Revelar palabra", "ES reveal is Revelar palabra");
assert(CROSSWORD_REVEAL.en === "Reveal word" && crosswordRevealLabel("en") === "Reveal word", "EN reveal is Reveal word");
assert(CROSSWORD_ACROSS.es === "Horizontales" && crosswordDirLabel("across", "es") === "Horizontales", "ES across is Horizontales");
assert(CROSSWORD_DOWN.es === "Verticales" && crosswordDirLabel("down", "es") === "Verticales", "ES down is Verticales");
assert(crosswordDirLabel("across", "en") === "Across" && crosswordDirLabel("down", "en") === "Down", "EN headers are Across / Down");

const problem = validateCrossword(CROSSWORD_GRID, CROSSWORD_WORDS);
assert(!problem, problem || "grid valid");
assert(CROSSWORD_GRID.words.length === 10, "all 10 words placed");
const placed = new Set(CROSSWORD_GRID.words.map((w) => w.answer));
for (const row of CROSSWORD_WORDS) assert(placed.has(row.answer), `placed ${row.answer}`);

for (const word of CROSSWORD_GRID.words) {
  for (const cell of wordCells(word)) {
    const got = CROSSWORD_GRID.cells[cell.row][cell.col];
    assert(got && got.letter === cell.letter, `${word.answer} letter ${cell.letter} at ${cell.row},${cell.col}`);
    const other = CROSSWORD_GRID.words.find((w) => w.id !== word.id && wordCells(w).some((c) => c.row === cell.row && c.col === cell.col));
    if (other) {
      const cross = wordCells(other).find((c) => c.row === cell.row && c.col === cell.col);
      assert(cross.letter === cell.letter, `${word.answer} crosses ${other.answer} at the same letter`);
      assert(other.dir !== word.dir, "a crossing changes direction");
    }
  }
}

const again = buildCrossword(CROSSWORD_WORDS);
assert(JSON.stringify(again.words) === JSON.stringify(CROSSWORD_GRID.words), "layout is deterministic");
assert(again.rows === CROSSWORD_GRID.rows && again.cols === CROSSWORD_GRID.cols, "bounds are stable");

let missing = null;
try {
  buildCrossword([{ answer: "XXXX", clue: "no" }, ...CROSSWORD_WORDS]);
} catch (e) {
  missing = e.message;
}
assert(missing && missing.includes("XXXX"), `unplaceable word is named, got ${missing}`);

assert(crosswordLetter("á") === "A" && crosswordLetter("n") === "N" && crosswordLetter("1") === "", "letters normalize");

const mercado = CROSSWORD_GRID.words.find((w) => w.answer === "MERCADO");
let run = selectCrosswordClue(CROSSWORD_GRID, startCrosswordRun(CROSSWORD_GRID), mercado.id);
run = typeCrosswordLetter(CROSSWORD_GRID, run, "m");
assert(!run.locked.includes("MERCADO"), "one letter does not lock");
assert(run.fills[`${mercado.row},${mercado.col}`] === "M", "first letter lands on the start square");
run = typeCrosswordLetter(CROSSWORD_GRID, run, "Z");
assert(!run.locked.includes("MERCADO"), "a wrong letter does not lock");
assert(!isWordCorrect(CROSSWORD_GRID, run, mercado), "wrong letter is not the word");
run = backspaceCrossword(CROSSWORD_GRID, run);
run = backspaceCrossword(CROSSWORD_GRID, run);
assert(!run.fills[`${mercado.row},${mercado.col}`], "backspace clears back to the start");

run = selectCrosswordClue(CROSSWORD_GRID, run, mercado.id);
for (const ch of mercado.answer) run = typeCrosswordLetter(CROSSWORD_GRID, run, ch);
assert(run.locked.includes("MERCADO"), "a full correct word locks");
assert(isWordCorrect(CROSSWORD_GRID, run, mercado), "locked word matches the answer");
const frozen = typeCrosswordLetter(CROSSWORD_GRID, run, "Q");
assert(frozen.fills[`${mercado.row},${mercado.col}`] === "M", "a locked square does not change");

const haya = CROSSWORD_GRID.words.find((w) => w.answer === "HAYA");
run = selectCrosswordClue(CROSSWORD_GRID, startCrosswordRun(CROSSWORD_GRID), haya.id);
run = revealCrosswordWord(CROSSWORD_GRID, run);
assert(run.locked.includes("HAYA"), "reveal locks the selected word");
assert(isWordCorrect(CROSSWORD_GRID, run, haya), "reveal fills the answer");
assert(revealCrosswordWord(CROSSWORD_GRID, run) === run || revealCrosswordWord(CROSSWORD_GRID, run).locked.includes("HAYA"), "second reveal stays locked");
const revealedAgain = revealCrosswordWord(CROSSWORD_GRID, run);
assert(revealedAgain === run, "reveal of a locked word is a no-op");

const cross = CROSSWORD_GRID.cells[1][2];
assert(cross.acrossId && cross.downId, "a crossing square belongs to two words");
run = selectCrosswordCell(CROSSWORD_GRID, startCrosswordRun(CROSSWORD_GRID), 1, 2);
const firstId = run.wordId;
run = selectCrosswordCell(CROSSWORD_GRID, run, 1, 2);
assert(run.wordId !== firstId, "tapping the same crossing toggles direction");
assert([cross.acrossId, cross.downId].includes(run.wordId), "toggle stays on a word through that square");

const hydrated = hydrateCrossword(CROSSWORD_GRID, { fills: run.fills, wordId: "HAYA", index: 1, locked: [] });
assert(hydrated && hydrated.wordId === "HAYA" && hydrated.index === 1, "hydrate keeps the cursor");
const solved = {};
for (const cell of wordCells(haya)) solved[`${cell.row},${cell.col}`] = cell.letter;
const hydratedLock = hydrateCrossword(CROSSWORD_GRID, { fills: solved, wordId: "HAYA", index: 0 });
assert(hydratedLock.locked.includes("HAYA"), "hydrate locks a word that is already correct");

const playSrc = readFileSync(new URL("./CrosswordPlayfield.jsx", import.meta.url), "utf8");
assert(playSrc.includes("if (locked) background = C.locked"), "locked squares take the palette fill");
assert(playSrc.includes("CROSSWORD_SAGE"), "hub mark and active ring keep the sage token");
assert(!playSrc.includes("#58CC02"), "crossword does not use bright green");
assert(!/cenzontle|Confetti|penguin/i.test(playSrc), "crossword keeps the bird off");
assert(playSrc.includes('data-testid="crossword-input"'), "phone keyboard uses a hidden input");
assert(playSrc.includes('data-testid="crossword-reveal"'), "reveal control is testable");
assert(!playSrc.includes("duo-btn"), "reveal is not a filled button");
assert(playSrc.includes("crosswordColors(dark)"), "playfield takes the dark palette");
assert(playSrc.includes("color: C.quiet"), "Reveal word uses the quiet ink");

const light = crosswordColors(false);
assert(light.board === "#F6EFE4" && light.page === "#F6EFE4", "light board stays cream");
assert(light.square === "#FFFFFF" && light.letter === "#3C3C3C", "light squares stay white with ink letters");
assert(light.line === "#D9CFC3" && light.lockedLetter === "#FFFFFF", "light lines and locked letters stay put");
assert(light.quiet === "#8A8175" && light.number === "#8A8175", "light chrome stays the warm gray");
assert(light.tint === `color-mix(in srgb, ${CROSSWORD_SAGE} 18%, #ffffff)`, "light active clue stays the white sage wash");
assert(light.locked === CROSSWORD_SAGE && light.locked === "#6f7757", "light locked squares stay #6F7757");

const dark = crosswordColors(true);
assert(dark.page === CROSSWORD_PAGE_DARK && dark.page === "#15171C", "dark page is #15171C");
assert(dark.board === CROSSWORD_BOARD_DARK && dark.square === "#1E2128", "dark board and squares are #1E2128");
assert(dark.line === CROSSWORD_LINE_DARK && dark.line === "#2A2E36", "dark lines are the app soft gray");
assert(dark.letter === CROSSWORD_CREAM && dark.lockedLetter === CROSSWORD_CREAM, "dark letters are cream");
assert(CROSSWORD_LOCKED_DARK === "#5C7356" && dark.locked === CROSSWORD_LOCKED_DARK, "dark locked squares are #5C7356");
assert(dark.locked !== light.locked, "dark locked fill is not the light sage");
assert(dark.tint === CROSSWORD_SAGE_TINT_DARK, "dark active clue is sage mixed into the board");
assert(dark.quiet === CROSSWORD_QUIET_DARK && dark.activeLang === CROSSWORD_INK_DARK, "dark quiet and active language use the app inks");
assert(dark.sageText === CROSSWORD_SAGE_TEXT_DARK, "dark sage text is the lifted sage");

const hexRgb = (hex) => {
  const n = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const channel = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rel = (rgb) => 0.2126 * channel(rgb[0] / 255) + 0.7152 * channel(rgb[1] / 255) + 0.0722 * channel(rgb[2] / 255);
const ratio = (a, b) => {
  const hi = Math.max(rel(a), rel(b));
  const lo = Math.min(rel(a), rel(b));
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (fg, bg, p) => fg.map((c, i) => Math.round(c * p + bg[i] * (1 - p)));
const board = hexRgb(dark.board);
const cream = hexRgb(CROSSWORD_CREAM);
const sage = hexRgb(CROSSWORD_SAGE);
const tint = mix(sage, board, 0.18);
const quiet = hexRgb(dark.quiet);
const active = hexRgb(dark.activeLang);
const sageText = hexRgb(dark.sageText);
assert(ratio(cream, board) >= 4.5, "cream letters clear 4.5 on the dark board");
assert(ratio(cream, tint) >= 4.5, "cream letters clear 4.5 on the active-clue tint");
assert(ratio(quiet, board) >= 4.5, "Reveal word and inactive language clear 4.5");
assert(ratio(active, board) >= 4.5, "active language clears 4.5");
assert(rel(active) > rel(quiet), "active language is brighter than the inactive one");
assert(ratio(sageText, board) >= 4.5, "Across/Down and locked clues clear 4.5");
assert(ratio(cream, hexRgb(dark.locked)) >= 4.5, "cream on the dark locked square clears 4.5");
assert(Number(ratio(cream, hexRgb("#5C7356")).toFixed(2)) === 4.55, "cream on #5C7356 is 4.55:1");

const appSrc = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const gamesAt = appSrc.indexOf('screen === "games"');
const games = appSrc.slice(gamesAt, appSrc.indexOf("MATCH PAIRS", gamesAt));
for (const id of ["hangman-start", "jeopardy-start", "wordle-start", "memory-start", "crossword-start"]) {
  const at = games.indexOf(`data-testid="${id}"`);
  const chunk = games.slice(at, at + 900);
  assert(chunk.includes('theme === "dark" ? D.card : HUB_CREAM'), `${id} tile uses the dark card`);
}
assert(games.includes("<JeopardyMark size={28} tile={theme === \"dark\" ? D.card : HUB_CREAM} />"), "Jeopardy plate follows the tile");
assert(games.includes("<WordleMark size={28} tile={theme === \"dark\" ? D.card : HUB_CREAM} />"), "Wordle plate follows the tile");
assert(games.includes("<MemoryMark size={28} tile={theme === \"dark\" ? D.card : HUB_CREAM} />"), "Memory plate follows the tile");
assert(games.includes("<CrosswordMark size={28} tile={theme === \"dark\" ? D.card : HUB_CREAM} paper={theme === \"dark\" ? D.subtle : \"#FFFFFF\"} />"), "Crossword plate follows the tile and dark cells are slate, not white");
const practicaAt = appSrc.indexOf('startAhorcado("practica")');
const practicaEnd = appSrc.indexOf('startCrossword("practica")', practicaAt);
const practica = appSrc.slice(practicaAt, practicaEnd);
assert(practica.includes('theme === "dark" ? D.card : HUB_CREAM'), "Práctica tiles use the dark card");
const practicaCross = appSrc.slice(practicaEnd, practicaEnd + 900);
assert(practicaCross.includes('paper={theme === "dark" ? D.card : "#FFFFFF"}'), "Práctica crossword cells use the dark card");

console.log("ok: crossword — 10-word grid, lock, reveal, sage");
