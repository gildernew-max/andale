/** Crucigrama — 10-word crossword. Games, next to Memory / Ahorcado / Jeopardy.
 *  Grid is built from crosswordWords.js at load. Same list → same grid.
 *  One Cenzontle platform-wide — this game never mounts the bird.
 *  No timer, score, XP, gems, streak, sound, or confetti.
 */

import { MEXICO_MAP_COLORS } from "./recuerdos.js";
import { CROSSWORD_WORDS } from "./crosswordWords.js";

/** Sage on the Cubetas subjunctive bucket (same token as the Mexico-map sage). */
export const CROSSWORD_SAGE = MEXICO_MAP_COLORS.sage;
/** Active-clue wash. A light mix of CROSSWORD_SAGE, not a second green. */
export const CROSSWORD_SAGE_TINT = `color-mix(in srgb, ${CROSSWORD_SAGE} 18%, #ffffff)`;
export const CROSSWORD_INK = "#3C3C3C";
export const CROSSWORD_CREAM = "#F6EFE4";
export const CROSSWORD_LINE = "#D9CFC3";
export const CROSSWORD_SQUARE = "#FFFFFF";

export const CROSSWORD_TITLE = { es: "Crucigrama", en: "Crossword" };
export const CROSSWORD_QUIET = { es: "Diez palabras cruzadas", en: "Ten words that cross" };
export const CROSSWORD_REVEAL = { es: "Revelar palabra", en: "Reveal word" };
export const CROSSWORD_ACROSS = { es: "Horizontales", en: "Across" };
export const CROSSWORD_DOWN = { es: "Verticales", en: "Down" };

const ANSWER_RE = /^[A-Z]+$/;

export function crosswordTitle(uiLang) {
  return uiLang === "en" ? CROSSWORD_TITLE.en : CROSSWORD_TITLE.es;
}

export function crosswordQuiet(uiLang) {
  return uiLang === "en" ? CROSSWORD_QUIET.en : CROSSWORD_QUIET.es;
}

export function crosswordRevealLabel(uiLang) {
  return uiLang === "en" ? CROSSWORD_REVEAL.en : CROSSWORD_REVEAL.es;
}

export function crosswordDirLabel(dir, uiLang) {
  const row = dir === "down" ? CROSSWORD_DOWN : CROSSWORD_ACROSS;
  return uiLang === "en" ? row.en : row.es;
}

const cellKey = (r, c) => `${r},${c}`;

const step = (dir) => (dir === "down" ? { dr: 1, dc: 0 } : { dr: 0, dc: 1 });

function normalizeAnswer(raw) {
  return String(raw || "").normalize("NFC").toUpperCase();
}

/** Strip accents so a phone keyboard's á still enters A. ñ becomes N. */
export function crosswordLetter(raw) {
  const ch = String(raw || "").normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  return /^[A-Z]$/.test(ch) ? ch : "";
}

function canPlace(grid, answer, r, c, dir, requireCross) {
  const { dr, dc } = step(dir);
  if (grid.has(cellKey(r - dr, c - dc))) return -1;
  if (grid.has(cellKey(r + dr * answer.length, c + dc * answer.length))) return -1;
  let crosses = 0;
  for (let i = 0; i < answer.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    const prev = grid.get(cellKey(rr, cc));
    if (prev) {
      if (prev.letter !== answer[i]) return -1;
      if (dir === "across" && prev.across) return -1;
      if (dir === "down" && prev.down) return -1;
      crosses += 1;
    } else if (dir === "across") {
      if (grid.has(cellKey(rr - 1, cc)) || grid.has(cellKey(rr + 1, cc))) return -1;
    } else if (grid.has(cellKey(rr, cc - 1)) || grid.has(cellKey(rr, cc + 1))) {
      return -1;
    }
  }
  if (requireCross && crosses < 1) return -1;
  return crosses;
}

function place(grid, answer, r, c, dir) {
  const { dr, dc } = step(dir);
  const undo = [];
  for (let i = 0; i < answer.length; i++) {
    const k = cellKey(r + dr * i, c + dc * i);
    const prev = grid.get(k);
    undo.push([k, prev ? { ...prev } : null]);
    if (!prev) {
      grid.set(k, { letter: answer[i], across: dir === "across", down: dir === "down" });
    } else {
      grid.set(k, {
        letter: prev.letter,
        across: prev.across || dir === "across",
        down: prev.down || dir === "down",
      });
    }
  }
  return () => {
    for (const [k, prev] of undo) {
      if (prev) grid.set(k, prev);
      else grid.delete(k);
    }
  };
}

function gridBounds(grid) {
  let minR = Infinity;
  let minC = Infinity;
  let maxR = -Infinity;
  let maxC = -Infinity;
  for (const k of grid.keys()) {
    const [r, c] = k.split(",").map(Number);
    if (r < minR) minR = r;
    if (c < minC) minC = c;
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  if (!Number.isFinite(minR)) return { minR: 0, minC: 0, maxR: 0, maxC: 0, h: 0, w: 0, area: 0 };
  const h = maxR - minR + 1;
  const w = maxC - minC + 1;
  return { minR, minC, maxR, maxC, h, w, area: h * w };
}

function slotsFor(grid, answer, requireCross, maxDim, bestArea) {
  if (!requireCross) return [{ r: 0, c: 0, dir: "across", crosses: 0, area: answer.length }];
  const seen = new Set();
  const out = [];
  for (const [k, cell] of grid) {
    const [r, c] = k.split(",").map(Number);
    for (let i = 0; i < answer.length; i++) {
      if (answer[i] !== cell.letter) continue;
      for (const dir of ["across", "down"]) {
        const { dr, dc } = step(dir);
        const sr = r - dr * i;
        const sc = c - dc * i;
        const id = `${sr},${sc},${dir}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const crosses = canPlace(grid, answer, sr, sc, dir, true);
        if (crosses < 1) continue;
        const undo = place(grid, answer, sr, sc, dir);
        const box = gridBounds(grid);
        undo();
        if (box.w > maxDim || box.h > maxDim || box.area >= bestArea) continue;
        out.push({ r: sr, c: sc, dir, crosses, area: box.area });
      }
    }
  }
  out.sort((a, b) => b.crosses - a.crosses || a.area - b.area || a.r - b.r || a.c - b.c || (a.dir === "across" ? -1 : 1));
  return out;
}

function numberGrid(words, grid, minR, minC) {
  const starts = new Map();
  const numbered = words.map((word) => {
    const row = word.r - minR;
    const col = word.c - minC;
    return { ...word, row, col };
  });
  const scan = [...grid.keys()]
    .map((k) => k.split(",").map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let n = 0;
  for (const [r, c] of scan) {
    const cell = grid.get(cellKey(r, c));
    const row = r - minR;
    const col = c - minC;
    const startsAcross = cell.across && !grid.has(cellKey(r, c - 1));
    const startsDown = cell.down && !grid.has(cellKey(r - 1, c));
    if (!startsAcross && !startsDown) continue;
    n += 1;
    starts.set(cellKey(row, col), n);
  }
  return numbered.map((word) => ({
    id: word.answer,
    answer: word.answer,
    clue: word.clue,
    dir: word.dir,
    row: word.row,
    col: word.col,
    number: starts.get(cellKey(word.row, word.col)),
  }));
}

/** Build one connected grid. Throws naming the word that cannot be placed. */
export function buildCrossword(entries = CROSSWORD_WORDS) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Could not place crossword: empty word list");
  }
  const seen = new Set();
  const words = entries.map((entry) => {
    const answer = normalizeAnswer(entry?.answer);
    const clue = typeof entry?.clue === "string" ? entry.clue : "";
    if (!ANSWER_RE.test(answer)) {
      throw new Error(`Could not place ${entry?.answer}: answer must be A–Z with no accents or ñ`);
    }
    if (seen.has(answer)) throw new Error(`Could not place ${answer}: duplicate answer`);
    seen.add(answer);
    return { answer, clue };
  });
  const sharesLetter = (a, b) => [...a].some((ch) => b.includes(ch));
  if (words.length > 1) {
    const isolated = words.find((word) => !words.some((other) => other !== word && sharesLetter(word.answer, other.answer)));
    if (isolated) throw new Error(`Could not place ${isolated.answer}`);
  }
  const order = [...words].sort((a, b) => b.answer.length - a.answer.length || a.answer.localeCompare(b.answer));

  const solveWithin = (maxDim) => {
    const grid = new Map();
    const placed = [];
    let best = null;
    let bestArea = Infinity;
    let bestSig = "";
    const search = (i) => {
      if (i === order.length) {
        const box = gridBounds(grid);
        const sig = placed.map((p) => `${p.answer}:${p.dir}:${p.r}:${p.c}`).join("|");
        const tighter = box.area < bestArea || (box.area === bestArea && best && (box.w < best.box.w || (box.w === best.box.w && sig < bestSig)));
        if (tighter) {
          bestArea = box.area;
          bestSig = sig;
          best = { box, placed: placed.map((p) => ({ ...p })) };
        }
        return true;
      }
      const slots = slotsFor(grid, order[i].answer, i > 0, maxDim, bestArea);
      if (!slots.length) return order[i].answer;
      let failure = order[i].answer;
      let ok = false;
      for (const slot of slots) {
        const undo = place(grid, order[i].answer, slot.r, slot.c, slot.dir);
        placed[i] = { ...order[i], r: slot.r, c: slot.c, dir: slot.dir };
        const res = search(i + 1);
        undo();
        if (res === true) ok = true;
        else failure = res;
      }
      return ok ? true : failure;
    };
    const res = search(0);
    return res === true ? best : res;
  };

  let solved = null;
  let failure = order[order.length - 1].answer;
  for (const maxDim of [13, 16, 22]) {
    const res = solveWithin(maxDim);
    if (res && typeof res === "object") {
      solved = res;
      break;
    }
    failure = typeof res === "string" ? res : failure;
  }
  if (!solved) throw new Error(`Could not place ${failure}`);

  const grid = new Map();
  for (const word of solved.placed) place(grid, word.answer, word.r, word.c, word.dir);
  const { minR, minC, maxR, maxC } = solved.box;
  const builtWords = numberGrid(solved.placed, grid, minR, minC);
  const cells = [];
  for (let r = 0; r <= maxR - minR; r++) {
    const row = [];
    for (let c = 0; c <= maxC - minC; c++) {
      const src = grid.get(cellKey(r + minR, c + minC));
      if (!src) {
        row.push(null);
        continue;
      }
      const across = builtWords.find((w) => w.dir === "across" && covers(w, r, c));
      const down = builtWords.find((w) => w.dir === "down" && covers(w, r, c));
      row.push({
        letter: src.letter,
        number: (across && across.row === r && across.col === c) || (down && down.row === r && down.col === c)
          ? (across?.row === r && across?.col === c ? across.number : down.number)
          : null,
        acrossId: across?.id || null,
        downId: down?.id || null,
      });
    }
    cells.push(row);
  }
  const puzzle = {
    rows: cells.length,
    cols: cells[0]?.length || 0,
    words: builtWords.sort((a, b) => a.number - b.number || (a.dir === "across" ? -1 : 1) || a.answer.localeCompare(b.answer)),
    cells,
  };
  const problem = validateCrossword(puzzle);
  if (problem) throw new Error(problem);
  return puzzle;
}

function covers(word, row, col) {
  if (word.dir === "across") return row === word.row && col >= word.col && col < word.col + word.answer.length;
  return col === word.col && row >= word.row && row < word.row + word.answer.length;
}

export function wordCells(word) {
  const { dr, dc } = step(word.dir);
  const cells = [];
  for (let i = 0; i < word.answer.length; i++) {
    cells.push({ row: word.row + dr * i, col: word.col + dc * i, letter: word.answer[i], index: i });
  }
  return cells;
}

export function wordsAt(grid, row, col) {
  return (grid?.words || []).filter((word) => covers(word, row, col));
}

function runsOf(puzzle) {
  const across = [];
  const down = [];
  for (let r = 0; r < puzzle.rows; r++) {
    let c = 0;
    while (c < puzzle.cols) {
      if (!puzzle.cells[r][c]) { c += 1; continue; }
      const start = c;
      let letters = "";
      while (c < puzzle.cols && puzzle.cells[r][c]) {
        letters += puzzle.cells[r][c].letter;
        c += 1;
      }
      across.push({ row: r, col: start, letters });
    }
  }
  for (let c = 0; c < puzzle.cols; c++) {
    let r = 0;
    while (r < puzzle.rows) {
      if (!puzzle.cells[r][c]) { r += 1; continue; }
      const start = r;
      let letters = "";
      while (r < puzzle.rows && puzzle.cells[r][c]) {
        letters += puzzle.cells[r][c].letter;
        r += 1;
      }
      down.push({ row: start, col: c, letters });
    }
  }
  return { across, down };
}

/** Empty string when the grid is valid. Otherwise the reason, including the word that failed. */
export function validateCrossword(puzzle, entries = null) {
  if (!puzzle?.words?.length || !puzzle.cells?.length) return "Could not place crossword: empty grid";
  const expected = entries || null;
  if (expected && puzzle.words.length !== expected.length) {
    const have = new Set(puzzle.words.map((w) => w.answer));
    const missing = expected.map((e) => normalizeAnswer(e.answer)).find((a) => !have.has(a));
    return `Could not place ${missing || "crossword"}`;
  }
  for (const word of puzzle.words) {
    if (!ANSWER_RE.test(word.answer)) return `Could not place ${word.answer}`;
    const cells = wordCells(word);
    for (const cell of cells) {
      const got = puzzle.cells[cell.row]?.[cell.col];
      if (!got || got.letter !== cell.letter) return `Could not place ${word.answer}: crossing mismatch at ${cell.row},${cell.col}`;
    }
  }
  const seenCells = new Map();
  for (const word of puzzle.words) {
    for (const cell of wordCells(word)) {
      const k = cellKey(cell.row, cell.col);
      const prev = seenCells.get(k);
      if (prev && prev.letter !== cell.letter) return `Could not place ${word.answer}: ${prev.answer} crosses as ${prev.letter} not ${cell.letter}`;
      if (prev && prev.dir === word.dir) return `Could not place ${word.answer}: overlaps ${prev.answer}`;
      seenCells.set(k, { letter: cell.letter, answer: word.answer, dir: word.dir });
    }
  }
  const { across, down } = runsOf(puzzle);
  const acrossWords = puzzle.words.filter((w) => w.dir === "across");
  const downWords = puzzle.words.filter((w) => w.dir === "down");
  for (const run of across) {
    if (run.letters.length < 2) {
      const owner = downWords.find((w) => covers(w, run.row, run.col));
      if (!owner) return `Invalid letter run "${run.letters}" at ${run.row},${run.col}`;
      continue;
    }
    const owner = acrossWords.find((w) => w.row === run.row && w.col === run.col && w.answer === run.letters);
    if (!owner) return `Invalid letter run "${run.letters}" at ${run.row},${run.col}`;
  }
  for (const run of down) {
    if (run.letters.length < 2) {
      const owner = acrossWords.find((w) => covers(w, run.row, run.col));
      if (!owner) return `Invalid letter run "${run.letters}" at ${run.row},${run.col}`;
      continue;
    }
    const owner = downWords.find((w) => w.row === run.row && w.col === run.col && w.answer === run.letters);
    if (!owner) return `Invalid letter run "${run.letters}" at ${run.row},${run.col}`;
  }
  for (const word of acrossWords) {
    const run = across.find((r) => r.row === word.row && r.col === word.col);
    if (!run || run.letters !== word.answer) return `Could not place ${word.answer}: not a clean across run`;
  }
  for (const word of downWords) {
    const run = down.find((r) => r.row === word.row && r.col === word.col);
    if (!run || run.letters !== word.answer) return `Could not place ${word.answer}: not a clean down run`;
  }
  const adj = new Map(puzzle.words.map((w) => [w.id, new Set()]));
  for (let i = 0; i < puzzle.words.length; i++) {
    for (let j = i + 1; j < puzzle.words.length; j++) {
      const a = puzzle.words[i];
      const b = puzzle.words[j];
      const share = wordCells(a).some((cell) => covers(b, cell.row, cell.col));
      if (share) {
        adj.get(a.id).add(b.id);
        adj.get(b.id).add(a.id);
      }
    }
  }
  const start = puzzle.words[0]?.id;
  const queue = start ? [start] : [];
  const hit = new Set(queue);
  while (queue.length) {
    const id = queue.shift();
    for (const next of adj.get(id) || []) {
      if (hit.has(next)) continue;
      hit.add(next);
      queue.push(next);
    }
  }
  if (hit.size !== puzzle.words.length) {
    const loose = puzzle.words.find((w) => !hit.has(w.id));
    return `Could not place ${loose?.answer}: grid is not connected`;
  }
  return "";
}

function fillKey(row, col) {
  return cellKey(row, col);
}

export function crosswordCursor(grid, run) {
  const word = (grid?.words || []).find((w) => w.id === run?.wordId) || null;
  if (!word) return null;
  const index = Math.max(0, Math.min(word.answer.length - 1, run.index || 0));
  const { dr, dc } = step(word.dir);
  return { word, index, row: word.row + dr * index, col: word.col + dc * index };
}

function cellLocked(grid, run, row, col) {
  return wordsAt(grid, row, col).some((word) => (run.locked || []).includes(word.id));
}

function readFill(run, row, col) {
  return run.fills?.[fillKey(row, col)] || "";
}

function withFill(run, row, col, letter) {
  const fills = { ...(run.fills || {}) };
  const k = fillKey(row, col);
  if (letter) fills[k] = letter;
  else delete fills[k];
  return { ...run, fills };
}

export function isWordCorrect(grid, run, word) {
  return wordCells(word).every((cell) => readFill(run, cell.row, cell.col) === cell.letter);
}

function lockCompleted(grid, run) {
  const locked = [];
  for (const word of grid.words) {
    if (isWordCorrect(grid, run, word)) locked.push(word.id);
  }
  const same = locked.length === (run.locked || []).length && locked.every((id, i) => (run.locked || [])[i] === id);
  return same ? run : { ...run, locked };
}

function focusWord(run, word, index) {
  const next = Math.max(0, Math.min(word.answer.length - 1, index));
  if (run.wordId === word.id && run.index === next) return run;
  return { ...run, wordId: word.id, index: next };
}

export function startCrosswordRun(grid) {
  const first = (grid?.words || [])[0];
  return {
    fills: {},
    locked: [],
    wordId: first?.id || "",
    index: 0,
  };
}

export function selectCrosswordClue(grid, run, wordId) {
  const word = (grid?.words || []).find((w) => w.id === wordId);
  if (!word || !run) return run;
  const open = wordCells(word).find((cell) => !cellLocked(grid, run, cell.row, cell.col) && !readFill(run, cell.row, cell.col));
  const index = open ? open.index : 0;
  return focusWord(run, word, index);
}

export function selectCrosswordCell(grid, run, row, col) {
  if (!run) return run;
  const here = wordsAt(grid, row, col);
  if (!here.length) return run;
  const cursor = crosswordCursor(grid, run);
  const same = cursor && cursor.row === row && cursor.col === col;
  if (same && here.length > 1) {
    const other = here.find((w) => w.id !== run.wordId) || here[0];
    const index = wordCells(other).find((cell) => cell.row === row && cell.col === col).index;
    return focusWord(run, other, index);
  }
  const stay = here.find((w) => w.id === run.wordId);
  const word = stay || here.find((w) => w.dir === "across") || here[0];
  const index = wordCells(word).find((cell) => cell.row === row && cell.col === col).index;
  return focusWord(run, word, index);
}

function nextOpenIndex(grid, run, cells, index) {
  let after = index;
  while (after < cells.length && cellLocked(grid, run, cells[after].row, cells[after].col)) after += 1;
  if (after >= cells.length) return cells.length - 1;
  return after;
}

export function typeCrosswordLetter(grid, run, raw) {
  if (!run) return run;
  const letter = crosswordLetter(raw);
  if (!letter) return run;
  const cursor = crosswordCursor(grid, run);
  if (!cursor) return run;
  const cells = wordCells(cursor.word);
  const index = cursor.index;
  const here = cells[index];
  if (cellLocked(grid, run, here.row, here.col)) {
    if (letter !== here.letter) return run;
    const after = nextOpenIndex(grid, run, cells, index + 1);
    return after === index ? run : { ...run, index: after };
  }
  let next = withFill(run, here.row, here.col, letter);
  next = lockCompleted(grid, next);
  const after = (next.locked || []).includes(cursor.word.id)
    ? cells.length - 1
    : nextOpenIndex(grid, next, cells, index + 1);
  return { ...next, wordId: cursor.word.id, index: after };
}

export function backspaceCrossword(grid, run) {
  if (!run) return run;
  const cursor = crosswordCursor(grid, run);
  if (!cursor) return run;
  const cells = wordCells(cursor.word);
  const current = cells[cursor.index];
  if (!cellLocked(grid, run, current.row, current.col) && readFill(run, current.row, current.col)) {
    const cleared = withFill(run, current.row, current.col, "");
    const index = cursor.index > 0 ? cursor.index - 1 : 0;
    return lockCompleted(grid, { ...cleared, index });
  }
  if (cursor.index <= 0) return run;
  const prev = cells[cursor.index - 1];
  let next = { ...run, index: cursor.index - 1 };
  if (!cellLocked(grid, run, prev.row, prev.col)) next = withFill(next, prev.row, prev.col, "");
  return lockCompleted(grid, next);
}

export function revealCrosswordWord(grid, run) {
  if (!run) return run;
  const word = (grid?.words || []).find((w) => w.id === run.wordId);
  if (!word || (run.locked || []).includes(word.id)) return run;
  let next = run;
  for (const cell of wordCells(word)) {
    if (cellLocked(grid, next, cell.row, cell.col)) continue;
    next = withFill(next, cell.row, cell.col, cell.letter);
  }
  return lockCompleted(grid, next);
}

export function hydrateCrossword(grid, raw) {
  if (!raw || typeof raw !== "object" || !grid?.words?.length) return null;
  const fills = {};
  if (raw.fills && typeof raw.fills === "object") {
    for (const [k, v] of Object.entries(raw.fills)) {
      const [r, c] = k.split(",").map(Number);
      if (!puzzleCell(grid, r, c)) continue;
      const letter = crosswordLetter(v);
      if (letter) fills[k] = letter;
    }
  }
  const wordId = grid.words.some((w) => w.id === raw.wordId) ? raw.wordId : grid.words[0].id;
  const word = grid.words.find((w) => w.id === wordId);
  const index = Number.isInteger(raw.index) && raw.index >= 0 && raw.index < word.answer.length ? raw.index : 0;
  return lockCompleted(grid, { fills, locked: [], wordId, index });
}

function puzzleCell(grid, row, col) {
  return grid.cells?.[row]?.[col] || null;
}

export const CROSSWORD_GRID = buildCrossword(CROSSWORD_WORDS);
