import { FIRST_DOOR_HOY, FIRST_DOOR_PHRASE_DOCTOR, firstDoorHero, shouldShowSoftPaywall, showComeBackTomorrow, streakAfterWin } from "./firstDoor.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(firstDoorHero({ todayScene: { id: "taqueria" }, todaySceneDone: false }) === FIRST_DOOR_HOY, "today scene is the Hoy hero");
assert(firstDoorHero({ todayScene: { id: "taqueria" }, todaySceneDone: true }) === FIRST_DOOR_PHRASE_DOCTOR, "cleared scene falls to Phrase Doctor");
assert(firstDoorHero({ todayScene: null, todaySceneDone: false }) === FIRST_DOOR_PHRASE_DOCTOR, "no scene → Phrase Doctor");
assert(firstDoorHero({}) === FIRST_DOOR_PHRASE_DOCTOR, "empty args → Phrase Doctor");
assert(firstDoorHero({ todayScene: { id: "taqueria" }, todaySceneDone: false }) !== "subj1", "hero is never Subjuntivo");

assert(streakAfterWin({ streak: 0, lastDay: null }, "2026-09-04", "2026-09-03") === 1, "first win is streak 1");
assert(streakAfterWin({}, "2026-09-04", "2026-09-03") === 1, "empty progress first win is streak 1");
assert(streakAfterWin({ streak: 1, lastDay: "2026-09-04" }, "2026-09-04", "2026-09-03") === 1, "same-day win keeps streak 1");
assert(streakAfterWin({ streak: 1, lastDay: "2026-09-03" }, "2026-09-04", "2026-09-03") === 2, "yesterday continues the streak");

assert(showComeBackTomorrow({ todaySceneDone: true, streak: 1, lastDay: "2026-09-04", today: "2026-09-04" }), "cleared scene shows home line");
assert(showComeBackTomorrow({ todaySceneDone: false, streak: 1, lastDay: "2026-09-04", today: "2026-09-04" }), "first win today shows home line");
assert(!showComeBackTomorrow({ todaySceneDone: false, streak: 0, lastDay: null, today: "2026-09-04" }), "new session has no home line yet");

const firstWinHome = { todaySceneDone: false, streak: 1, lastDay: "2026-09-04", today: "2026-09-04", screen: "home", splash: false };
assert(shouldShowSoftPaywall(firstWinHome), "first win on home shows paywall after vuelve");
assert(!shouldShowSoftPaywall({ ...firstWinHome, splash: true }), "paywall never on splash");
assert(!shouldShowSoftPaywall({ ...firstWinHome, screen: "done" }), "paywall waits until after celebration");
assert(shouldShowSoftPaywall(firstWinHome), "Phrase Doctor Curarla (home, no done screen) can fire the gate");
assert(!shouldShowSoftPaywall({ ...firstWinHome, streak: 0, lastDay: null }), "paywall never before a win");
assert(!shouldShowSoftPaywall({ ...firstWinHome, paywallSeen: true }), "seen flag stops the loop");

console.log("ok: first door is Hoy or Phrase Doctor; streak-1 + come-back line");
