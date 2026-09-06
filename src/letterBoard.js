/** Shared A–Z / Ñ letter-pick layouts.
 *  Default is Spanish QWERTY (Ñ after L). ABC is the A–Z grid.
 *  Quiet toggle labels stay ABC / QWERTY. Persist via progress.letterLayout.
 */

export const DEFAULT_LETTER_LAYOUT = "qwerty";

export const ABC_LETTERS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

/** Spanish QWERTY rows. Ñ sits after L on the home row. */
export const QWERTY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

/** A–Z grid (ABC mode). Ñ stays after N. */
export const ABC_ROWS = [
  ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
  ["J", "K", "L", "M", "N", "Ñ", "O", "P", "Q"],
  ["R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
];

export function normalizeLetterLayout(value) {
  return value === "abc" ? "abc" : DEFAULT_LETTER_LAYOUT;
}

export function rowsForLayout(layout) {
  return normalizeLetterLayout(layout) === "abc" ? ABC_ROWS : QWERTY_ROWS;
}

export function lettersForLayout(layout) {
  return rowsForLayout(layout).flat();
}
