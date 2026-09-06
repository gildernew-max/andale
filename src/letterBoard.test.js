import {
  ABC_LETTERS,
  ABC_ROWS,
  DEFAULT_LETTER_LAYOUT,
  QWERTY_ROWS,
  lettersForLayout,
  normalizeLetterLayout,
  rowsForLayout,
} from "./letterBoard.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(DEFAULT_LETTER_LAYOUT === "qwerty", "default letter layout is QWERTY");
assert(normalizeLetterLayout(undefined) === "qwerty", "missing layout is QWERTY");
assert(normalizeLetterLayout("nope") === "qwerty", "junk layout is QWERTY");
assert(normalizeLetterLayout("QWERTY") === "qwerty", "case-mismatch QWERTY falls back to default");
assert(normalizeLetterLayout("abc") === "abc", "abc stays abc");

const qwerty = lettersForLayout("qwerty");
const abc = lettersForLayout("abc");
assert(qwerty.join("") === "QWERTYUIOPASDFGHJKLÑZXCVBNM", "QWERTY order with Ñ after L");
assert(abc.join("") === "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ", "ABC is A–Z with Ñ after N");
assert(qwerty[qwerty.indexOf("L") + 1] === "Ñ", "Ñ sits after L on QWERTY");
assert(abc[abc.indexOf("N") + 1] === "Ñ", "Ñ sits after N on ABC");
assert(ABC_LETTERS.join("") === abc.join(""), "ABC_LETTERS matches ABC rows");

const qSet = new Set(qwerty);
const aSet = new Set(abc);
assert(qwerty.length === 27 && abc.length === 27, "both layouts have 26 + Ñ");
assert(qSet.size === 27 && aSet.size === 27, "no duplicate letters");
ABC_LETTERS.forEach((ch) => {
  assert(qSet.has(ch), `QWERTY includes ${ch}`);
  assert(aSet.has(ch), `ABC includes ${ch}`);
});

assert(rowsForLayout("qwerty") === QWERTY_ROWS, "qwerty rows");
assert(rowsForLayout("abc") === ABC_ROWS, "abc rows");
assert(QWERTY_ROWS[0].length === 10 && QWERTY_ROWS[1].length === 10 && QWERTY_ROWS[2].length === 7, "QWERTY 10-10-7");
assert(ABC_ROWS.every((row) => row.length === 9), "ABC is a 9-wide grid");

console.log("ok: letter-board QWERTY / ABC layouts");
