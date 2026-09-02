import { hasLearnerProgress, hasUnlockedShortcuts, hasWeaknessData } from "./theaterGate.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const empty = { xp: 0, streak: 0, done: {}, weak: {}, stories: {}, srs: {}, flashcards: {}, missions: {} };
assert(!hasLearnerProgress(empty), "new session has no progress");
assert(!hasLearnerProgress(null), "null prog is not progress");
assert(!hasWeaknessData(empty), "new session has no weakness data");
assert(!hasUnlockedShortcuts(empty), "new session has not unlocked Atajos");
assert(!hasWeaknessData({ weak: { Subjuntivo: 0 } }), "zeroed weakness is still empty");

assert(hasLearnerProgress({ ...empty, xp: 42 }), "XP is progress");
assert(hasLearnerProgress({ ...empty, done: { subj1: 1 } }), "a crown is progress");
assert(hasLearnerProgress({ ...empty, streak: 2 }), "streak is progress");
assert(hasWeaknessData({ weak: { Subjuntivo: 2 } }), "positive weak count is data");
assert(hasUnlockedShortcuts({ done: { subj1: 1 } }), "first crown unlocks Atajos");
assert(!hasUnlockedShortcuts({ xp: 42, done: {} }), "XP alone does not unlock Atajos");

console.log("ok: theater stays buried until earned");
