import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  CAREFUL_ANSWER_SECONDS,
  FIRST_SESSION_AUTHORED_MIX,
  FIRST_SESSION_COUNT,
  FIRST_SESSION_MIX,
  FIRST_SESSION_PICKED_BEATS,
  firstSessionBeatOf,
  completedLessonCount,
  firstSessionProgressPct,
  findOndaBankQuestion,
  firstSessionChallengeCount,
  firstSessionQuestions,
  firstSessionTypes,
  someFirstSessionQuestions,
  formatWalkClock,
  migrateFirstSession,
  scriptedWalkStats,
  shouldUseFirstSession,
} from "./firstSession.js";
import { firstSessionWhyLine, firstSessionWinLine, firstSessionWords } from "./firstSessionWords.js";

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

assert(FIRST_SESSION_COUNT === 3, "first session is 3 exercises");
assert(FIRST_SESSION_AUTHORED_MIX.length === 5 && FIRST_SESSION_MIX.length === FIRST_SESSION_COUNT, "five authored beats, three played");
assert(FIRST_SESSION_PICKED_BEATS.join(",") === "0,2,3", "the first lesson plays authored beats 0, 2 and 3: mc, Build, mc");
assert(subj1.questions.length === 11, "subj1 questions stay 11; the replay bank is separate");
assert(Array.isArray(subj1.bank) && subj1.bank.length === 11, "subj1 replay bank is 11 extra questions");
assert(subj1.questions.length + 1 === 12, "Sendero subj1 is still the 12-challenge unit");

const questions = firstSessionQuestions(units);
assert(questions.length === FIRST_SESSION_COUNT, "all three picks resolve");
assert(questions[0].prompt === "Es obvio que Marisol ___ razón.", "the shared first session still opens on Marisol");

const mex = units.find((u) => u.id === "mex");
const ondaBank = mex.bank.find((q) => q.answer === "onda" && String(q.explain).includes("¿Qué onda?"));
const onda = findOndaBankQuestion(units);
assert(onda && ondaBank, "the onda item is already in the mex bank");
assert(onda.prompt === ondaBank.prompt && onda.answer === ondaBank.answer && onda.explain === ondaBank.explain && onda.note === ondaBank.note && onda.type === ondaBank.type, "the opener is the bank item, not a rewritten copy");
assert(onda.choices === ondaBank.choices, "onda choices stay the bank array");
assert(onda._u === "mex" && onda._i === mex.questions.length + mex.bank.indexOf(ondaBank), "resume index is the bank slot");
const someQuestions = someFirstSessionQuestions(units);
const dropped = questions[questions.length - 1];
assert(someQuestions.length === FIRST_SESSION_COUNT, "some stays at three");
assert(someQuestions[0].prompt === ondaBank.prompt && someQuestions[0].choices === ondaBank.choices && someQuestions[0].answer === "onda", "some exercise 1 is the onda bank item");
assert(someQuestions[1].prompt === "Es obvio que Marisol ___ razón." && someQuestions[1]._i === 3 && someQuestions[1]._u === "subj1", "Marisol moves to second");
assert(dropped.prompt === "Espero que ___ a la fiesta el sábado." && dropped._u === "subj1" && dropped._i === 0, "the dropped beat is the last pick");
assert(!someQuestions.some((q) => q.prompt === dropped.prompt), "some does not include the dropped Espero beat");
assert(someQuestions.map((q) => q.type).join(",") === "mc,mc,order", "some plays onda, Marisol, then the Build");
assert(someQuestions.slice(1).map((q) => `${q._u}:${q._i}:${q.prompt}`).join("|") === questions.slice(0, -1).map((q) => `${q._u}:${q._i}:${q.prompt}`).join("|"), "the kept beats are the picks minus the last item");
assert(firstSessionChallengeCount("some", units) === someQuestions.length, "the some sheet count matches the list");
assert(firstSessionChallengeCount("conversation", units) === FIRST_SESSION_COUNT && firstSessionChallengeCount("beginner", units) === FIRST_SESSION_COUNT && firstSessionChallengeCount(undefined, units) === FIRST_SESSION_COUNT, "other levels stay at three");
const mexWithoutOnda = units.map((u) => u.id === "mex" ? { ...u, bank: u.bank.filter((q) => q !== ondaBank) } : u);
assert(findOndaBankQuestion(mexWithoutOnda) == null, "a missing onda item is not invented");
assert(someFirstSessionQuestions(mexWithoutOnda)[0].prompt === "Es obvio que Marisol ___ razón.", "without the bank item, some does not grow a stand-in opener");
assert(firstSessionBeatOf(onda) === -1 && firstSessionWhyLine(firstSessionBeatOf(onda), "en") == null && firstSessionWhyLine(firstSessionBeatOf(onda), "es") == null, "the onda beat adds no why line");
assert(firstSessionBeatOf(someQuestions[1]) === 0 && firstSessionWhyLine(firstSessionBeatOf(someQuestions[1]), "en") === firstSessionWords[0].why.en, "Marisol keeps the existing why line");
assert(firstSessionBeatOf(someQuestions[2]) === 2 && firstSessionWhyLine(firstSessionBeatOf(someQuestions[2]), "es") === firstSessionWords[2].why.es, "the Build keeps the Dudo why line");
assert(questions.map((q) => firstSessionBeatOf(q)).join(",") === "0,2,3", "the shared lesson maps to authored beats 0, 2, 3");
assert(firstSessionWhyLine(firstSessionBeatOf(questions[2]), "en") === firstSessionWords[3].why.en, "the last pick keeps the Espero why");
assert(questions.every((q, i) => q.type === FIRST_SESSION_MIX[i].type), "pick types match the mix");
assert(questions.every((q, i) => q._i === FIRST_SESSION_MIX[i].index && q._u === "subj1"), "picks stay on authored subj1 items");
const types = firstSessionTypes(questions);
assert(types.length === 2, "two exercise types");
assert(types.join(",") === "mc,order", "mix is mc, order (the Build stays)");
assert(questions.map((q) => q.type).join(",") === "mc,order,mc", "order is mc, Build, mc");
assert(!questions.some((q) => q.type === "match" || q.type === "listen" || q.type === "transform"), "no match, listen, or transform in the first session");
assert(questions.length !== subj1.questions.length + 1, "first session is not the 12-challenge lesson");

assert(shouldUseFirstSession({ done: {}, firstSessionDone: false }), "no completed lessons → first session");
assert(shouldUseFirstSession({}), "empty progress → first session");
assert(!shouldUseFirstSession({ done: { subj1: 1 } }), "a crowned unit is not the first session");
assert(!shouldUseFirstSession({ firstSessionDone: true }), "a finished first session opens the full unit");
assert(!shouldUseFirstSession({ done: {}, hasResume: true }), "a saved resume is that lesson, not a new first session");
assert(completedLessonCount({ subj1: 0, pret: 2 }) === 1, "only crowns count as completed");
assert(completedLessonCount({ "_today:taqueria": 1 }) === 0, "a Hoy scene is not a completed Sendero lesson");

assert(migrateFirstSession(null) == null, "fresh storage stays eligible");
assert(migrateFirstSession(undefined) == null, "missing storage stays eligible");
const freshMarked = { xp: 0, firstSessionDone: false };
assert(migrateFirstSession(freshMarked) === freshMarked, "a this-release save keeps its marker");
assert(shouldUseFirstSession(migrateFirstSession(freshMarked)), "explicit false marker is still the first session");
for (const old of [
  { xp: 40, streak: 3, lastDay: "2026-01-02" },
  { streak: 1, lastDay: "2026-01-02", done: { "_today:taqueria": 1 } },
  { xp: 12, gems: 5, missions: { safeRiskyBest: 3 } },
  { welcomed: true, xp: 8, stories: { "story-0": true } },
]) {
  const migrated = migrateFirstSession(old);
  assert(migrated.firstSessionDone === true, "a pre-release save is marked done");
  assert(!shouldUseFirstSession(migrated), "a pre-release save keeps the 12-challenge unit");
}
assert(migrateFirstSession({ firstSessionDone: true, xp: 10 }).firstSessionDone === true, "a finished marker stays finished");
assert(!migrateFirstSession({ firstSessionArmed: true }).firstSessionDone, "an in-progress first session is not closed by migration");

assert([0, 1, 2, 3, 4].every((beat) => {
  const why = firstSessionWords[beat].why;
  return typeof why.en === "string" && why.en.trim() && typeof why.es === "string" && why.es.trim()
    && firstSessionWhyLine(beat, "en") === why.en && firstSessionWhyLine(beat, "es") === why.es
    && why.es.includes("«") && why.es.includes("»");
}), "each beat why is a non-empty EN and ES line, and the Spanish line keeps both guillemets");
assert(typeof firstSessionWords.win.en === "string" && firstSessionWords.win.en.trim() && typeof firstSessionWords.win.es === "string" && firstSessionWords.win.es.trim(), "win lines are non-empty strings");
assert(firstSessionWinLine("en") === firstSessionWords.win.en && firstSessionWinLine("es") === firstSessionWords.win.es, "win helper returns the slot strings");
assert(!firstSessionWords.win.es.includes("«") && !firstSessionWords.win.es.includes("»"), "the Spanish win line has no guillemets");

assert(firstSessionProgressPct(0, "idle", 3) === 0, "bar starts empty");
assert(firstSessionProgressPct(1, "idle", 3) === 33, "one answered exercise fills a third");
assert(firstSessionProgressPct(2, "correct", 3) === 100, "last answer fills the bar");
assert(firstSessionProgressPct(0, "correct") === 33, "the default count is three");

const twelve = [
  ...subj1.questions.map((q, i) => ({ ...q, _u: "subj1", _i: i })),
  { type: "match", pairs: subj1.pairs },
];
const before = scriptedWalkStats(twelve);
const after = scriptedWalkStats(questions);
assert(before.exercises === 12, "baseline lesson is 12 challenges");
assert(after.exercises === 3, "after lesson is 3");
assert(after.taps < before.taps, "first session takes fewer taps than the 12-challenge unit");
assert(after.answers < before.answers, "first session takes fewer answers");
assert(after.answers === 3, "one answer per exercise");
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
assert(appSrc.includes("migrateFirstSession(p)"), "old saves are migrated at load");
assert(appSrc.includes("resume?.unitId === \"_first\""), "first-session Save & quit resumes at the saved beat");
assert(appSrc.includes("if ((prog.hearts ?? 0) <= 0) { setHeartsModal(true); return; }"), "hearts check still gates a lesson start");
const cleared = appSrc.split("lecturaPaywallAfterWin.current = false").length - 1;
assert(cleared >= 6, "the Lectura handoff flag clears on session start, hearts fail, both quits, win, and continue");

// Tap-to-check is first-session multiple choice only, behind the 350 ms settle guard.
assert(appSrc.includes('const tapCheckMc = !!(session?.firstSession && q?.type === "mc");'), "tap-check is first-session mc only");
assert(appSrc.includes("Date.now() < tapSettleUntilRef.current"), "tap-check keeps the settle guard");
assert(appSrc.includes("tapSettleUntilRef.current = session?.firstSession ? Date.now() + ONBOARDING_SETTLE_MS : 0"), "the guard window is the PR 347 settle time");
assert(appSrc.includes("xpToday: session.firstSession ? Math.max(xpToday + earned, DAILY_GOAL) : xpToday + earned"), "a finished first lesson still counts as the daily goal");
// The short-phone clip fix is scoped to first-session multiple choice on short viewports.
assert(/@media \(max-height: 700px\) \{\s+\[data-first-session="1"\]\[data-qtype="mc"\]/.test(appSrc), "short-viewport spacing is scoped to first-session mc");

console.log("firstSession.test.js: ok");
