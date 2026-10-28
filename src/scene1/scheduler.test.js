import { SCENE1_BASE_REVIEW_DAYS, SCENE1_MIN_REVIEW_DAYS, scene1NextReviewDate, scene1ReviewIntervalDays } from "./scheduler.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(scene1ReviewIntervalDays(0) === SCENE1_BASE_REVIEW_DAYS, "no retries uses the base interval");
assert(scene1ReviewIntervalDays() === SCENE1_BASE_REVIEW_DAYS, "missing retries defaults to the base interval");
assert(scene1ReviewIntervalDays(1) < scene1ReviewIntervalDays(0), "one retry schedules sooner than zero retries");
assert(scene1ReviewIntervalDays(2) < scene1ReviewIntervalDays(1), "two retries schedules sooner than one retry");
assert(scene1ReviewIntervalDays(99) === SCENE1_MIN_REVIEW_DAYS, "the interval never drops below the floor");
assert(scene1ReviewIntervalDays(-5) === SCENE1_BASE_REVIEW_DAYS, "negative retries is treated as zero");

{
  const from = new Date(2026, 9, 1); // Oct 1, 2026, local midnight
  const noRetry = scene1NextReviewDate(from, 0);
  const oneRetry = scene1NextReviewDate(from, 1);
  assert(noRetry.getTime() > from.getTime(), "the next review is after the given day");
  assert(oneRetry.getTime() < noRetry.getTime(), "a repeated chunk comes back sooner than a clean one");
  assert(noRetry.getDate() === 1 + SCENE1_BASE_REVIEW_DAYS, "zero retries lands exactly on the base interval");
}

{
  // An invalid fromDate falls back to a real Date instead of throwing.
  const d = scene1NextReviewDate(new Date("not-a-date"), 0);
  assert(d instanceof Date && !Number.isNaN(d.getTime()), "an invalid fromDate still returns a valid Date");
}

console.log("scene1/scheduler.test.js: ok");
