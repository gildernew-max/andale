import {
  LESSON_GEM_CAP,
  LESSON_GEM_REVIEW_CAP,
  LESSON_GEM_RIVAL_LOSS,
  LESSON_GEM_RIVAL_WIN,
  LESSON_XP_ALMOST,
  LESSON_XP_HARD,
  LESSON_XP_PERFECT,
  LESSON_XP_REQUEUED,
  LESSON_XP_REVIEW,
  LESSON_XP_REVIEW_ALMOST,
  LESSON_XP_TYPE,
  lessonFinishReward,
  lessonItemXP,
} from "./lessonAward.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(LESSON_XP_TYPE === 10, "type-in / MC is 10");
assert(LESSON_XP_ALMOST === 7, "almost is 7");
assert(LESSON_XP_HARD === 12, "order · listen · transform is 12");
assert(LESSON_XP_REQUEUED === 5, "requeued miss is 5");
assert(LESSON_XP_REVIEW === 4, "Repasar Bien is 4");
assert(LESSON_XP_REVIEW_ALMOST === 3, "Repasar almost is 3");
assert(LESSON_XP_PERFECT === 5, "perfect lesson bonus is +5");
assert(LESSON_GEM_CAP === 15, "real session gem cap is 15");
assert(LESSON_GEM_REVIEW_CAP === 10, "Repasar gem cap is 10");
assert(LESSON_GEM_RIVAL_WIN === 20 && LESSON_GEM_RIVAL_LOSS === 5, "rival gems stay 20 / 5");

assert(lessonItemXP({}) === 10, "default item is type-in 10");
assert(lessonItemXP({ almost: true }) === 7, "almost type-in is 7");
assert(lessonItemXP({ hard: true }) === 12, "hard item is 12");
assert(lessonItemXP({ review: true }) === 4, "Repasar item is 4");
assert(lessonItemXP({ review: true, almost: true }) === 3, "Repasar almost is 3");
assert(lessonItemXP({ requeued: true }) === 5, "requeued is 5");
assert(lessonItemXP({ rayo: true }) === 13, "Rayo adds +3 on a live item");
assert(lessonItemXP({ review: true, rayo: true }) === 4, "Rayo does not bump Repasar");

const firstHoy = lessonFinishReward({ sessionXP: 10, wrongs: 0, questionCount: 4, hits: 1 });
assert(firstHoy.earnedXP === 15 && firstHoy.perfectBonus === 5, "first-Hoy 1-hit clean is 10+5");
assert(firstHoy.earnedGems === 15, "queue >2 uses the 15 gem cap");

const shortQueue = lessonFinishReward({ sessionXP: 10, wrongs: 0, questionCount: 2, hits: 1 });
assert(shortQueue.earnedGems === 1, "queue ≤2 gems are hits");

const missed = lessonFinishReward({ sessionXP: 10, wrongs: 1, questionCount: 4, hits: 1 });
assert(missed.earnedXP === 10 && missed.perfectBonus === 0, "a miss drops the perfect +5");
assert(missed.earnedGems === 15, "a miss still takes the session gem cap");

const review = lessonFinishReward({ sessionXP: 4, wrongs: 0, review: true, questionCount: 1, hits: 1 });
assert(review.earnedXP === 4 && review.perfectBonus === 0, "Repasar never takes perfect +5");
assert(review.earnedGems === 1, "1-card Repasar gems are hits, not the review cap");

const none = lessonFinishReward({ sessionXP: 0, wrongs: 1, questionCount: 0, hits: 0 });
assert(none.earnedXP === 0 && none.earnedGems === 0, "nothing earned is honest zero");

console.log("ok: lesson award rates — type 10 / perfect +5 / gem cap 15.");
