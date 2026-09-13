/** Shared Hoy / lesson XP + gem rates. Doctora finish must reuse these — no parallel economy. */

export const LESSON_XP_TYPE = 10;
export const LESSON_XP_ALMOST = 7;
export const LESSON_XP_HARD = 12;
export const LESSON_XP_REQUEUED = 5;
export const LESSON_XP_REVIEW = 4;
export const LESSON_XP_REVIEW_ALMOST = 3;
export const LESSON_XP_RAYO = 3;
export const LESSON_XP_COMBO = 5;
export const LESSON_XP_PERFECT = 5;

export const LESSON_GEM_CAP = 15;
export const LESSON_GEM_REVIEW_CAP = 10;
export const LESSON_GEM_RIVAL_WIN = 20;
export const LESSON_GEM_RIVAL_LOSS = 5;

/** Per-item XP from applyResult. Type-in / MC is 10; order · listen · transform is 12. */
export function lessonItemXP({
  review = false,
  requeued = false,
  almost = false,
  hard = false,
  rayo = false,
} = {}) {
  if (review) return almost ? LESSON_XP_REVIEW_ALMOST : LESSON_XP_REVIEW;
  let base = requeued
    ? LESSON_XP_REQUEUED
    : almost
      ? LESSON_XP_ALMOST
      : hard
        ? LESSON_XP_HARD
        : LESSON_XP_TYPE;
  if (!review && rayo) base += LESSON_XP_RAYO;
  return base;
}

/**
 * Finish-screen XP + gems. Perfect +5 only on a clean real lesson (never Repasar).
 * Gems: rival 20/5; else hits when the queue is ≤2; else 15 / review 10.
 */
export function lessonFinishReward({
  sessionXP = 0,
  wrongs = 0,
  review = false,
  questionCount = 0,
  hits = 0,
  rival = false,
  rivalWon = false,
} = {}) {
  const perfectBonus = (Number(wrongs) || 0) === 0 && !review ? LESSON_XP_PERFECT : 0;
  const earnedXP = (Number(sessionXP) || 0) + perfectBonus;
  const gemCap = review ? LESSON_GEM_REVIEW_CAP : LESSON_GEM_CAP;
  const earnedGems = rival
    ? (rivalWon ? LESSON_GEM_RIVAL_WIN : LESSON_GEM_RIVAL_LOSS)
    : ((Number(questionCount) || 0) <= 2 ? (Number(hits) || 0) : gemCap);
  return { earnedXP, earnedGems, perfectBonus };
}
