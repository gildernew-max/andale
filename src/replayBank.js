/** Replay bank for a lesson.
 *  Resume indexes stay stable: 0 .. questions.length-1 are the authored
 *  questions, and a bank item is questions.length + its index in `bank`.
 *  i === -1 is still the match round, not a question.
 *
 *  The previous run, when remembered, is prog.served[unitId]: a short array
 *  of those indexes inside the existing andale-v3 record. No new storage key.
 */

export function questionByIndex(unit, index) {
  if (!unit || !Number.isInteger(index) || index < 0) return null;
  const questions = Array.isArray(unit.questions) ? unit.questions : [];
  if (index < questions.length) return questions[index] || null;
  const bank = Array.isArray(unit.bank) ? unit.bank : [];
  return bank[index - questions.length] || null;
}

function fisherYates(items, random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = a[i];
    a[i] = a[j];
    a[j] = swap;
  }
  return a;
}

/**
 * Question indexes for one lesson run, without the match round.
 * A first run (crowns falsy) and an empty bank both Fisher-Yates the authored
 * indexes only — the same shuffle as a lesson with no bank.
 * A replay with a bank draws `questionCount` indexes from questions + bank,
 * preferring indexes that were not in `previous`, with no duplicates.
 */
export function drawLessonIndexes({
  questionCount,
  bankCount = 0,
  crowns = 0,
  previous = [],
  random = Math.random,
} = {}) {
  const n = Math.max(0, questionCount | 0);
  const banks = Math.max(0, bankCount | 0);
  const original = Array.from({ length: n }, (_, i) => i);
  const replay = Number(crowns) > 0 && banks > 0;
  if (!replay) return fisherYates(original, random);

  const pool = original.concat(Array.from({ length: banks }, (_, i) => n + i));
  const prev = new Set(
    (Array.isArray(previous) ? previous : []).filter((i) => Number.isInteger(i) && i >= 0 && i < pool.length),
  );
  const unseen = pool.filter((i) => !prev.has(i));
  const seen = pool.filter((i) => prev.has(i));
  const picked = fisherYates(unseen, random).concat(fisherYates(seen, random)).slice(0, n);
  return fisherYates(picked, random);
}
