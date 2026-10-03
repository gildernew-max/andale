/**
 * Win-card count line nouns.
 * ES: 1 is singular; 0 and 2+ are plural.
 * EN: "correct" does not change with the number; "miss" is singular only at 1.
 */

export const SCORE_WORDS = Object.freeze({
  es: Object.freeze({ hit: "acierto", hits: "aciertos", miss: "fallo", misses: "fallos" }),
  en: Object.freeze({ hit: "correct", hits: "correct", miss: "miss", misses: "misses" }),
});

export function scoreWords(lang) {
  return lang === "en" ? SCORE_WORDS.en : SCORE_WORDS.es;
}

export function hitWord(n, lang) {
  const words = scoreWords(lang);
  return Number(n) === 1 ? words.hit : words.hits;
}

export function missWord(n, lang) {
  const words = scoreWords(lang);
  return Number(n) === 1 ? words.miss : words.misses;
}

/** `{right} {hits}, {wrong} {misses}` — the count clause after the lesson title. */
export function scoreCountClause(right, wrong, lang) {
  return `${right} ${hitWord(right, lang)}, ${wrong} ${missWord(wrong, lang)}`;
}
