/** Pure review scheduler for the Scene 1 speaking loop. A chunk that needed a
 *  «Lo repito» retry comes back sooner than one nailed on the first try — no
 *  clock reads, no storage, just arithmetic so it's trivially testable. */

export const SCENE1_BASE_REVIEW_DAYS = 3;
export const SCENE1_MIN_REVIEW_DAYS = 1;

/** Days until the next review. Each retry pulls it a day closer, floored at 1. */
export function scene1ReviewIntervalDays(retries = 0) {
  const n = Number.isFinite(Number(retries)) ? Math.max(0, Number(retries)) : 0;
  return Math.max(SCENE1_MIN_REVIEW_DAYS, SCENE1_BASE_REVIEW_DAYS - n);
}

/** Local-midnight Date for the next review, counted from `fromDate`. */
export function scene1NextReviewDate(fromDate, retries = 0) {
  const base = fromDate instanceof Date && !Number.isNaN(fromDate.getTime()) ? fromDate : new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  next.setDate(next.getDate() + scene1ReviewIntervalDays(retries));
  return next;
}
