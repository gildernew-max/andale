/**
 * First lesson for a learner with no completed unit.
 * Not the 12-challenge Sendero unit (11 questions + match).
 * Five existing beats, three existing types, fewest taps that still teach:
 *   mc    — one tap, the contrast (indicative trap + a real subjunctive)
 *   type  — one-word chip, the form itself (no sentence keyboard)
 *   order — short tile sentence, syntax without dictation or matching
 * Listen, transform, and match stay on the full unit after this session.
 */

export const FIRST_SESSION_COUNT = 5;

/** Stable picks from subj1. Indexes are the authored question list, not a shuffle. */
export const FIRST_SESSION_MIX = Object.freeze([
  { unitId: "subj1", index: 3, type: "mc" },
  { unitId: "subj1", index: 1, type: "type" },
  { unitId: "subj1", index: 8, type: "order" },
  { unitId: "subj1", index: 0, type: "mc" },
  { unitId: "subj1", index: 4, type: "type" },
]);

/** Careful read + answer, one correct try. Used for the time estimate, not a stopwatch. */
export const CAREFUL_ANSWER_SECONDS = Object.freeze({
  mc: 25,
  type: 20,
  order: 35,
  listen: 50,
  transform: 40,
  match: 35,
});

export const FIRST_SESSION_ENTRY_TAPS = 2;
export const FIRST_SESSION_WIN_TAPS = 1;
export const FIRST_SESSION_ENTRY_SECONDS = 15;

/** Path crowns only. Hoy / mission / review ids start with "_" and are not a finished Sendero lesson. */
export function completedLessonCount(done) {
  if (!done || typeof done !== "object") return 0;
  return Object.entries(done).reduce((n, [id, v]) => {
    if (!(Number(v) > 0)) return n;
    if (String(id).startsWith("_")) return n;
    return n + 1;
  }, 0);
}

/** No unit crown yet, and this is not a saved longer resume. */
export function shouldUseFirstSession({ done, firstSessionDone, hasResume = false } = {}) {
  if (hasResume) return false;
  if (firstSessionDone) return false;
  if (completedLessonCount(done) > 0) return false;
  return true;
}

export function firstSessionQuestions(units) {
  const byId = new Map((units || []).map((u) => [u.id, u]));
  return FIRST_SESSION_MIX.map((pick) => {
    const q = byId.get(pick.unitId)?.questions?.[pick.index];
    if (!q) return null;
    return { ...q, _u: pick.unitId, _i: pick.index };
  }).filter(Boolean);
}

export function firstSessionTypes(questions) {
  return [...new Set((questions || []).map((q) => q.type))];
}

/** Fills as each exercise is answered, including the one on screen. Last answer is 100. */
export function firstSessionProgressPct(index, status, count = FIRST_SESSION_COUNT) {
  const total = Math.max(1, Number(count) || 1);
  const cursor = Math.max(0, Number(index) || 0);
  const answered = cursor + (status && status !== "idle" ? 1 : 0);
  return Math.round((Math.min(answered, total) / total) * 100);
}

function answerWordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Button taps for one correct answer. Chips and tiles count; a short type
 * is one chip. Match has no Check. Continue is included.
 */
export function scriptedAnswerTaps(q) {
  if (!q || typeof q !== "object") return { taps: 0, answers: 0 };
  if (q.type === "mc") return { taps: 3, answers: 1 };
  if (q.type === "match") {
    const pairs = Array.isArray(q.pairs) ? q.pairs.length : 0;
    return { taps: pairs * 2 + 1, answers: 1 };
  }
  if (q.type === "order") {
    return { taps: answerWordCount(q.answer) + 2, answers: 1 };
  }
  const primary = q.type === "listen" ? (q.text || q.answers?.[0]) : (q.answers?.[0] || q.answer || "");
  const words = answerWordCount(primary);
  if (q.type === "type" && words > 0 && words <= 3) return { taps: 3, answers: 1 };
  return { taps: Math.max(1, words) + 2, answers: 1 };
}

export function scriptedWalkStats(questions, {
  entryTaps = FIRST_SESSION_ENTRY_TAPS,
  winTaps = FIRST_SESSION_WIN_TAPS,
  entrySeconds = FIRST_SESSION_ENTRY_SECONDS,
} = {}) {
  const list = Array.isArray(questions) ? questions : [];
  let taps = entryTaps + winTaps;
  let answers = 0;
  let seconds = entrySeconds;
  for (const q of list) {
    const step = scriptedAnswerTaps(q);
    taps += step.taps;
    answers += step.answers;
    seconds += CAREFUL_ANSWER_SECONDS[q.type] || 20;
  }
  return { taps, answers, seconds, exercises: list.length };
}

export function formatWalkClock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m${String(s).padStart(2, "0")}s`;
}
