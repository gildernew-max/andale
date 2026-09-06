import {
  SAFE_RISKY_ANSWERS,
  SAFE_RISKY_MULTI_FIXTURE,
  advanceSafeRiskyItem,
  applySafeRiskyTap,
  isSafeRiskyCorrect,
  resolveSafeRiskyPack,
  safeRiskyAllCorrectTapped,
  safeRiskyAnswerLabel,
  safeRiskyCorrectKeys,
  safeRiskyHit,
  safeRiskyIsRevealed,
  setSafeRiskyPackOverride,
  startSafeRiskyRun,
} from "./safeRisky.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); }

const single = { phrase: "One.", answer: "formal", answers: ["formal"] };
const legacy = { phrase: "Legacy.", answer: "risky" };
const alias = { phrase: "Alias.", correct: ["casual", "regional"] };
const labels = { safe: "Safe", casual: "Casual", formal: "Formal", regional: "Regional", risky: "Risky" };

assert(SAFE_RISKY_ANSWERS["No manches."].join(",") === "casual,regional", "George: No manches casual+regional");
assert(SAFE_RISKY_ANSWERS["¿Mande?"].join(",") === "regional,safe", "George: Mande regional+safe");
assert(SAFE_RISKY_ANSWERS["Está bien chido."].join(",") === "casual,regional", "George: chido casual+regional");
assert(SAFE_RISKY_ANSWERS["Ahorita vengo."].join(",") === "regional,casual", "George: ahorita regional+casual");
assert(SAFE_RISKY_ANSWERS["Quedo a sus órdenes."].join(",") === "formal", "George: Quedo formal");
assert(SAFE_RISKY_ANSWERS["¿Qué?"].join(",") === "risky", "George: Qué risky");
assert(SAFE_RISKY_ANSWERS["¿Me da un café, por favor?"].join(",") === "safe", "George: café safe");
assert(SAFE_RISKY_ANSWERS["No obstante lo anterior..."].join(",") === "formal", "George: no obstante formal");

assert(SAFE_RISKY_MULTI_FIXTURE.answers.length === 2, "fixture has 2+ answers");
assert(SAFE_RISKY_MULTI_FIXTURE.answers.includes("safe") && SAFE_RISKY_MULTI_FIXTURE.answers.includes("casual"), "fixture rights are safe + casual");
assert(safeRiskyCorrectKeys(SAFE_RISKY_MULTI_FIXTURE).join(",") === "safe,casual", "answers[] wins");
assert(safeRiskyCorrectKeys(single).join(",") === "formal", "single-correct answers[]");
assert(safeRiskyCorrectKeys(legacy).join(",") === "risky", "legacy answer string still works");
assert(safeRiskyCorrectKeys(alias).join(",") === "casual,regional", "correct[] alias still works");
assert(safeRiskyCorrectKeys({ answer: "safe", answers: ["casual", "regional"] }).join(",") === "casual,regional", "answers[] beats answer");
assert(safeRiskyCorrectKeys({}).length === 0, "empty item has no keys");
assert(isSafeRiskyCorrect(SAFE_RISKY_MULTI_FIXTURE, "safe"), "safe is a right");
assert(isSafeRiskyCorrect(SAFE_RISKY_MULTI_FIXTURE, "casual"), "casual is a right");
assert(!isSafeRiskyCorrect(SAFE_RISKY_MULTI_FIXTURE, "risky"), "risky is a wrong");
assert(safeRiskyAnswerLabel(SAFE_RISKY_MULTI_FIXTURE, labels) === "Safe · Casual", "multi Better-answer labels");
assert(safeRiskyAnswerLabel(single, labels) === "Formal", "single Better-answer label");

const emptyRun = { items: [SAFE_RISKY_MULTI_FIXTURE], idx: 0, score: 0, streak: 2, bestStreak: 2, selected: null, tapped: [], tappedWrong: [] };
assert(!safeRiskyIsRevealed(SAFE_RISKY_MULTI_FIXTURE, emptyRun), "multi starts locked");
assert(!safeRiskyAllCorrectTapped(SAFE_RISKY_MULTI_FIXTURE, emptyRun), "no rights tapped yet");

let g = applySafeRiskyTap(emptyRun, "safe");
assert(g !== emptyRun, "first right tap mutates");
assert(g.tapped.join(",") === "safe", "first right is recorded");
assert(g.score === 0, "score waits for every right");
assert(g.streak === 2, "streak waits for every right");
assert(!safeRiskyIsRevealed(SAFE_RISKY_MULTI_FIXTURE, g), "one right does not unlock CONTINUE");
assert(applySafeRiskyTap(g, "safe") === g, "repeat right is ignored");

g = applySafeRiskyTap(g, "risky");
assert(g.tappedWrong.join(",") === "risky", "wrong tap marks");
assert(g.streak === 0, "wrong tap breaks streak");
assert(g.score === 0, "wrong tap does not score");
assert(!safeRiskyIsRevealed(SAFE_RISKY_MULTI_FIXTURE, g), "wrong does not unlock multi CONTINUE");

g = applySafeRiskyTap(g, "casual");
assert(safeRiskyAllCorrectTapped(SAFE_RISKY_MULTI_FIXTURE, g), "both rights are in");
assert(safeRiskyIsRevealed(SAFE_RISKY_MULTI_FIXTURE, g), "CONTINUE unlocks after every right");
assert(!safeRiskyHit(SAFE_RISKY_MULTI_FIXTURE, g), "a wrong on the way is a miss");
assert(g.score === 0, "miss does not increment score");
assert(g.streak === 0, "miss streak stays 0");
assert(applySafeRiskyTap(g, "formal") === g, "taps freeze after reveal");

const cleanStart = { items: [SAFE_RISKY_MULTI_FIXTURE], idx: 0, score: 0, streak: 1, bestStreak: 1, selected: null, tapped: [], tappedWrong: [] };
let clean = applySafeRiskyTap(cleanStart, "casual");
clean = applySafeRiskyTap(clean, "safe");
assert(safeRiskyHit(SAFE_RISKY_MULTI_FIXTURE, clean), "tap-all with no wrongs is a hit");
assert(clean.score === 1, "clean multi increments score once");
assert(clean.streak === 2, "clean multi increments streak once");
assert(clean.bestStreak === 2, "clean multi updates best streak");

const singleRun = { items: [single], idx: 0, score: 0, streak: 0, bestStreak: 0, selected: null, tapped: [], tappedWrong: [] };
const singleHit = applySafeRiskyTap(singleRun, "formal");
assert(safeRiskyIsRevealed(single, singleHit), "single right reveals");
assert(safeRiskyHit(single, singleHit), "single right is a hit");
assert(singleHit.score === 1 && singleHit.streak === 1, "single right scores");

const singleMiss = applySafeRiskyTap(singleRun, "risky");
assert(safeRiskyIsRevealed(single, singleMiss), "single wrong still reveals (existing miss path)");
assert(!safeRiskyHit(single, singleMiss), "single wrong is a miss");
assert(singleMiss.score === 0 && singleMiss.streak === 0, "single wrong does not score");
assert(singleMiss.tappedWrong.join(",") === "risky", "single wrong is marked");

const liveRestore = { selected: "formal" };
assert(safeRiskyIsRevealed(single, liveRestore), "LIVE selected-only still reveals");
assert(safeRiskyHit(single, liveRestore), "LIVE selected-only correct is a hit");

const next = advanceSafeRiskyItem(clean);
assert(next.idx === 1 && next.selected == null && next.tapped.length === 0 && next.tappedWrong.length === 0, "advance clears taps");

setSafeRiskyPackOverride([SAFE_RISKY_MULTI_FIXTURE]);
assert(resolveSafeRiskyPack([{ phrase: "nope" }])[0].phrase === "MULTI_CORRECT_FIXTURE", "override wins");
const run = startSafeRiskyRun([{ phrase: "nope", answer: "safe" }]);
assert(run.items.length === 1 && run.items[0].phrase === "MULTI_CORRECT_FIXTURE", "run uses override pack");
assert(run.tapped.length === 0 && run.tappedWrong.length === 0, "run starts with empty taps");
setSafeRiskyPackOverride(null);
assert(resolveSafeRiskyPack(["live"])[0] === "live", "override clears");

console.log("ok: safe-risky multi-correct");
