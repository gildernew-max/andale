import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  CAREFUL_ANSWER_SECONDS,
  FIRST_SESSION_COUNT,
  FIRST_SESSION_MIX,
  completedLessonCount,
  firstSessionProgressPct,
  firstSessionQuestions,
  firstSessionTypes,
  formatWalkClock,
  scriptedWalkStats,
  shouldUseFirstSession,
} from "./firstSession.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const extractConst = (src, name) => {
  const needle = `const ${name} =`;
  const start = src.indexOf(needle);
  if (start < 0) throw new Error(`App.jsx missing ${name}`);
  let i = start + needle.length;
  while (i < src.length && /\s/.test(src[i])) i++;
  const from = i;
  let depth = 0;
  let inStr = null;
  let escaped = false;
  for (; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (inStr) {
      if (escaped) { escaped = false; continue; }
      if (c === "\\") { escaped = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "/" && n === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && n === "*") { i = src.indexOf("*/", i + 2); if (i < 0) break; i += 1; continue; }
    if (c === "\"" || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  throw new Error(`App.jsx unclosed ${name}`);
};

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const units = Function(`"use strict"; return (${extractConst(appSrc, "UNITS")});`)();
const subj1 = units.find((u) => u.id === "subj1");

assert(FIRST_SESSION_COUNT === 5, "first session is 5 exercises");
assert(FIRST_SESSION_COUNT >= 4 && FIRST_SESSION_COUNT <= 6, "first session stays inside 4–6");
assert(subj1.questions.length + 1 === 12, "Sendero subj1 is still the 12-challenge unit");

const questions = firstSessionQuestions(units);
assert(questions.length === FIRST_SESSION_COUNT, "all five picks resolve");
assert(questions.every((q, i) => q.type === FIRST_SESSION_MIX[i].type), "pick types match the mix");
assert(questions.every((q, i) => q._i === FIRST_SESSION_MIX[i].index && q._u === "subj1"), "picks stay on authored subj1 items");
const types = firstSessionTypes(questions);
assert(types.length === 3, "three exercise types");
assert(types.join(",") === "mc,type,order", "mix is mc, type, order");
assert(!questions.some((q) => q.type === "match" || q.type === "listen" || q.type === "transform"), "no match, listen, or transform in the first session");
assert(questions.length !== subj1.questions.length + 1, "first session is not the 12-challenge lesson");

assert(shouldUseFirstSession({ done: {}, firstSessionDone: false }), "no completed lessons → first session");
assert(shouldUseFirstSession({}), "empty progress → first session");
assert(!shouldUseFirstSession({ done: { subj1: 1 } }), "a crowned unit is not the first session");
assert(!shouldUseFirstSession({ firstSessionDone: true }), "a finished first session opens the full unit");
assert(!shouldUseFirstSession({ done: {}, hasResume: true }), "a saved resume is that lesson, not a new first session");
assert(completedLessonCount({ subj1: 0, pret: 2 }) === 1, "only crowns count as completed");
assert(completedLessonCount({ "_today:taqueria": 1 }) === 0, "a Hoy scene is not a completed Sendero lesson");

assert(firstSessionProgressPct(0, "idle", 5) === 0, "bar starts empty");
assert(firstSessionProgressPct(2, "idle", 5) === 40, "two answered exercises fill 40%");
assert(firstSessionProgressPct(4, "correct", 5) === 100, "last answer fills the bar");

const twelve = [
  ...subj1.questions.map((q, i) => ({ ...q, _u: "subj1", _i: i })),
  { type: "match", pairs: subj1.pairs },
];
const before = scriptedWalkStats(twelve);
const after = scriptedWalkStats(questions);
assert(before.exercises === 12, "baseline lesson is 12 challenges");
assert(after.exercises === 5, "after lesson is 5");
assert(after.taps < before.taps, "first session takes fewer taps than the 12-challenge unit");
assert(after.answers < before.answers, "first session takes fewer answers");
assert(after.answers === 5, "one answer per exercise");
assert(after.seconds < 5 * 60, "careful-read estimate is inside five minutes");
assert(after.seconds < 8 * 60 + 54, "estimate is under the 8m54s cold-walk baseline");
assert(CAREFUL_ANSWER_SECONDS.mc < CAREFUL_ANSWER_SECONDS.listen, "mc is the short type");

const cold = { seconds: 8 * 60 + 54, taps: 53, answers: 25 };
console.log(JSON.stringify({
  baselineColdWalk: { ...cold, clock: formatWalkClock(cold.seconds) },
  scriptedTwelve: { ...before, clock: formatWalkClock(before.seconds) },
  scriptedFirst: { ...after, clock: formatWalkClock(after.seconds), mix: FIRST_SESSION_MIX.map((p) => p.type).join("/") },
}, null, 2));

assert(/const MAX_HEARTS = 5/.test(appSrc), "hearts stay at 5");
assert(appSrc.includes("paywallHold: !!prog.paywallHold"), "hearts-fail hold is wired into the paywall gate");
assert(appSrc.includes('data-testid="review-and-recover"'), "Review and recover stays on the out-of-lives screen");
assert(appSrc.includes("XP reclamados") && appSrc.includes("XP claimed"), "XP claimed / XP reclamados wording stays");
assert(!/TODO-WORDS/.test(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "firstSession.js"), "utf8")), "first session adds no new learner-facing strings");

console.log("firstSession.test.js: ok");
