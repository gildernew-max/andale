import { drawLessonIndexes, questionByIndex } from "./replayBank.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Today's lesson shuffle: Fisher-Yates over the authored indexes only. */
function todayShuffle(n, random) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = a[i];
    a[i] = a[j];
    a[j] = swap;
  }
  return a;
}

const unit = {
  questions: [{ prompt: "q0" }, { prompt: "q1" }, { prompt: "q2" }],
  bank: [{ prompt: "b0" }, { prompt: "b1" }],
};

assert(questionByIndex(unit, 0).prompt === "q0", "index 0 is the first authored question");
assert(questionByIndex(unit, 2).prompt === "q2", "last authored index stays on questions");
assert(questionByIndex(unit, 3).prompt === "b0", "bank starts at questions.length");
assert(questionByIndex(unit, 4).prompt === "b1", "bank index is questions.length + bankIndex");
assert(questionByIndex(unit, -1) == null, "match sentinel is not a question");
assert(questionByIndex(unit, 5) == null, "past the bank is missing");
assert(questionByIndex({ questions: unit.questions }, 3) == null, "no bank leaves a high index unresolved");

const original = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

for (let seed = 1; seed <= 40; seed++) {
  const first = drawLessonIndexes({
    questionCount: 11,
    bankCount: 3,
    crowns: 0,
    previous: original,
    random: mulberry32(seed),
  });
  assert(first.length === 11, "first run draws 11");
  assert(first.every((i) => i >= 0 && i <= 10), `first run stays on the original 11 (seed ${seed})`);
  assert(new Set(first).size === 11, "first run has no duplicates");
  const same = todayShuffle(11, mulberry32(seed));
  const drawn = drawLessonIndexes({
    questionCount: 11,
    bankCount: 3,
    crowns: 0,
    random: mulberry32(seed),
  });
  assert(drawn.join(",") === same.join(","), "first run matches today's shuffle call-for-call");

  for (const crowns of [0, 1, 4]) {
    const empty = drawLessonIndexes({
      questionCount: 11,
      bankCount: 0,
      crowns,
      previous: [11, 12],
      random: mulberry32(seed),
    });
    assert(empty.join(",") === todayShuffle(11, mulberry32(seed)).join(","), "empty bank is today's shuffle");
  }

  const replay = drawLessonIndexes({
    questionCount: 11,
    bankCount: 3,
    crowns: 1,
    previous: original,
    random: mulberry32(seed),
  });
  assert(replay.length === 11, "replay draws 11");
  assert(new Set(replay).size === 11, "replay has no duplicates");
  assert(replay.every((i) => i >= 0 && i < 14), "replay stays inside questions + bank");
  assert([11, 12, 13].every((i) => replay.includes(i)), "replay prefers the unseen bank indexes");
}

const freshReplay = drawLessonIndexes({
  questionCount: 11,
  bankCount: 3,
  crowns: 2,
  previous: [],
  random: mulberry32(7),
});
assert(freshReplay.length === 11 && new Set(freshReplay).size === 11, "replay with no memory still draws 11 unique");
assert(freshReplay.every((i) => i >= 0 && i < 14), "memory-less replay stays inside questions + bank");

let servedBank = false;
for (let seed = 1; seed <= 30 && !servedBank; seed++) {
  const draw = drawLessonIndexes({
    questionCount: 11,
    bankCount: 3,
    crowns: 1,
    previous: [],
    random: mulberry32(seed + 100),
  });
  if (draw.some((i) => i >= 11)) servedBank = true;
}
assert(servedBank, "a replay can serve a bank item");

const prev = [0, 1, 2];
drawLessonIndexes({ questionCount: 3, bankCount: 1, crowns: 1, previous: prev, random: mulberry32(3) });
assert(prev.join(",") === "0,1,2", "draw does not mutate the previous-run array");

console.log("replayBank.test.js: ok");
