import { buildMatchRound, MATCH_ROUND_CAP, MATCH_PRACTICE_XP, startMatchRun, applyMatchPick, matchRoundDone } from "./matchPairs.js";

const units = [
  { id: "subj1", title: "Subjuntivo", pairs: [["ojalá", "hopefully"], ["dudar", "to doubt"], ["esperar", "to hope"], ["aunque", "although"], ["quizás", "maybe"]] },
  { id: "pret", title: "Pretérito", pairs: [{ es: "anoche", en: "last night" }, { es: "ojalá", en: "hopefully" }, { es: "mientras", en: "while" }] },
];

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const empty = buildMatchRound({}, units);
assert(empty.length >= 2, `expected a playable round from unit pairs, got ${empty.length}`);
assert(empty.length <= MATCH_ROUND_CAP, "round exceeded cap");
assert(empty.every((pr) => Array.isArray(pr) && pr[0] && pr[1]), "pairs must be [es, en]");
assert(empty.some((pr) => pr[0] === "ojalá" || pr[0] === "dudar"), "must use authored unit pairs, not invented vocab");
assert(new Set(empty.map((pr) => pr[0])).size === empty.length, "round resampled duplicate es");

const started = buildMatchRound({ done: { pret: 1 } }, units);
assert(started[0][0] === "anoche", "started unit pairs should lead the round");
assert(started.every((pr) => ["anoche", "ojalá", "mientras"].includes(pr[0])), "started-unit round must stay on that unit's pairs");

assert(MATCH_PRACTICE_XP === 4, "practice XP must match a review item, not lesson +5");

let run = startMatchRun(empty, () => 0.5);
assert(!matchRoundDone(run), "fresh run should not be done");
for (let i = 0; i < empty.length; i++) {
  run = applyMatchPick(run, 0, i);
  run = applyMatchPick(run, 1, i);
}
assert(matchRoundDone(run), "run should end after the last pair");
assert(run.done === true, "done flag missing");
assert(run.matched.length === empty.length, `matched ${run.matched.length}, expected ${empty.length}`);
const again = applyMatchPick(run, 0, 0);
assert(again.done === true && again.matched.length === run.matched.length, "done run must not wrap or add pairs");

console.log(`ok: ${empty.length} unique pairs from units; session ends after ${empty.length}; XP ${MATCH_PRACTICE_XP}`);
