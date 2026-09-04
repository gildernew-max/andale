import {
  FIRST_HOY_BEAT_CAP,
  HOY_FULL_BEAT_CAP,
  HOY_WIN_EN,
  HOY_WIN_ES,
  hoyBeatCap,
  hoyWinCopy,
  isFirstHoySession,
  isShortHoy,
  shouldHoyEarlyWin,
  trimHoyBeats,
} from "./hoyWin.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(HOY_WIN_ES === "¡Eso!", "ES first-Hoy win is ¡Eso!");
assert(HOY_WIN_EN === "That's it.", "EN first-Hoy win is That's it.");
assert(hoyWinCopy("es") === "¡Eso!", "hoyWinCopy ES");
assert(hoyWinCopy("en") === "That's it.", "hoyWinCopy EN");
assert(hoyWinCopy() === "¡Eso!", "hoyWinCopy default is ES");
assert(!/¡Ganaste!|Ganaste|You won!/i.test(`${HOY_WIN_ES}${HOY_WIN_EN}`), "win copy is not ¡Ganaste!/You won!");

assert(isFirstHoySession({ streak: 0 }), "streak 0 is first Hoy session");
assert(isFirstHoySession({}), "empty progress is first Hoy session");
assert(isFirstHoySession({ streak: null }), "null streak is first Hoy session");
assert(!isFirstHoySession({ streak: 1 }), "streak 1 is not first Hoy");
assert(!isFirstHoySession({ streak: 4 }), "later streak keeps full Hoy");

assert(isShortHoy({ streak: 0 }), "streak 0 is a short Hoy");
assert(isShortHoy({ firstHoy: true, streak: 1 }), "firstHoy flag is a short Hoy");
assert(isShortHoy({ streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }), "day-2 return is a short Hoy");
assert(isShortHoy({ streak: 4, lastDay: "2026-09-03", today: "2026-09-05" }), "day-2 after a gap is still short");
assert(!isShortHoy({ streak: 1 }), "streak 1 without a prior lastDay is not short");
assert(!isShortHoy({ streak: 1, lastDay: "2026-09-05", today: "2026-09-05" }), "same-day after win is not short");
assert(!isShortHoy({ firstHoy: false, streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }), "explicit full / Más path is not short");

assert(FIRST_HOY_BEAT_CAP === 4, "first Hoy cap is 4");
assert(HOY_FULL_BEAT_CAP === 5, "later Hoy keeps 5 beats");
assert(hoyBeatCap({ firstHoy: true }) === 4, "firstHoy flag caps at 4");
assert(hoyBeatCap({ streak: 0 }) === 4, "streak 0 caps at 4");
assert(hoyBeatCap({ firstHoy: false, streak: 0 }) === 5, "explicit later path keeps 5");
assert(hoyBeatCap({ streak: 1 }) === 5, "streak 1 keeps full depth");
assert(hoyBeatCap({ firstHoy: false }) === 5, "returning Hoy keeps full depth");
assert(hoyBeatCap({ streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }) === 4, "day-2 return caps at 4");
assert(hoyBeatCap({ firstHoy: false, streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }) === 5, "Más full path keeps 5 on day-2");

const six = [1, 2, 3, 4, 5, 6];
assert(trimHoyBeats(six, { firstHoy: true }).length === 4, "first session trims to 4");
assert(trimHoyBeats(six, { firstHoy: true }).join(",") === "1,2,3,4", "first session keeps the front beats");
assert(trimHoyBeats(six, { firstHoy: false }).length === 5, "later Hoy trims to 5");
assert(trimHoyBeats(six, { streak: 1 }).length === 5, "streak 1 trim is full depth");
assert(trimHoyBeats(six, { streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }).length === 4, "day-2 return trims to 4");
assert(trimHoyBeats(six, { firstHoy: false, streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }).length === 5, "Más full trim is 5");
assert(trimHoyBeats([], { firstHoy: true }).length === 0, "empty queue stays empty");

assert(shouldHoyEarlyWin({ firstHoy: true, hits: 1 }), "first correct is the early checkpoint");
assert(shouldHoyEarlyWin({ firstHoy: true, hits: 2 }), "later hits still count as the checkpoint");
assert(!shouldHoyEarlyWin({ firstHoy: true, hits: 0 }), "no hit yet — stay in the scene");
assert(!shouldHoyEarlyWin({ firstHoy: false, hits: 1 }), "later Hoy does not early-win");
assert(!shouldHoyEarlyWin({ hits: 1 }), "missing firstHoy flag does not early-win");
assert(!shouldHoyEarlyWin({ firstHoy: true }), "missing hits does not early-win");
assert(shouldHoyEarlyWin({ firstHoy: true, hits: 1 }), "day-2 return reuses the same firstHoy early-win lock");
assert(!shouldHoyEarlyWin({ firstHoy: false, hits: 1 }), "Más / full path does not early-win");

console.log("ok: first + day-2 Hoy ≤4 beats + early checkpoint + ¡Eso!/That's it.");
