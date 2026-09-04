import {
  COME_BACK_GENERIC_EN,
  COME_BACK_GENERIC_ES,
  FIRST_DOOR_HOY,
  FIRST_DOOR_PHRASE_DOCTOR,
  comeBackTomorrowLine,
  dayKeyFromDate,
  firstDoorHero,
  hoySceneForDay,
  hoyTitleForLang,
  nextDayKey,
  shouldShowSoftPaywall,
  showComeBackTomorrow,
  streakAfterWin,
} from "./firstDoor.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(firstDoorHero({ todayScene: { id: "taqueria" }, todaySceneDone: false }) === FIRST_DOOR_HOY, "today scene is the Hoy hero");
assert(firstDoorHero({ todayScene: { id: "taqueria" }, todaySceneDone: true }) === FIRST_DOOR_PHRASE_DOCTOR, "cleared scene falls to Phrase Doctor");
assert(firstDoorHero({ todayScene: null, todaySceneDone: false }) === FIRST_DOOR_PHRASE_DOCTOR, "no scene → Phrase Doctor");
assert(firstDoorHero({}) === FIRST_DOOR_PHRASE_DOCTOR, "empty args → Phrase Doctor");
assert(firstDoorHero({ todayScene: { id: "taqueria" }, todaySceneDone: false }) !== "subj1", "hero is never Subjuntivo");
assert(firstDoorHero({ todayScene: { id: "taqueria" }, todaySceneDone: false }) === FIRST_DOOR_HOY, "return door streak≥1: open Hoy stays hero");
assert(firstDoorHero({ todayScene: { id: "taqueria" }, todaySceneDone: true }) === FIRST_DOOR_PHRASE_DOCTOR, "return door streak≥1: done Hoy → Doctora");

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

const HOY_TITLES = [
  { title: "Noche de faroles", titleEn: "Night of lanterns" },
  { title: "WhatsApp del casero", titleEn: "Landlord WhatsApp" },
  { title: "Mostrador en caos", titleEn: "Airport Counter Chaos" },
  { title: "Cena con la suegra", titleEn: "Dinner With the In-Laws" },
];
assert(nextDayKey("2026-09-04") === "2026-09-05", "nextDayKey rolls to 2026-09-05");
assert(nextDayKey("2026-09-30") === "2026-10-01", "nextDayKey rolls the month");
assert(nextDayKey("") === "", "nextDayKey unknown stays empty");
assert(dayKeyFromDate(new Date(2026, 8, 4)) === "2026-09-04", "dayKeyFromDate is local YYYY-MM-DD");
const tomorrowHoy = hoySceneForDay(HOY_TITLES, nextDayKey("2026-09-04"));
assert(tomorrowHoy?.title === "Mostrador en caos", "2026-09-05 Hoy title is Mostrador en caos");
assert(hoyTitleForLang(tomorrowHoy, "es") === "Mostrador en caos", "ES tomorrow title");
assert(hoyTitleForLang(tomorrowHoy, "en") === "Airport Counter Chaos", "EN tomorrow title");
assert(hoySceneForDay([], "2026-09-05") === null, "empty list → no invented title");
assert(hoySceneForDay(HOY_TITLES, "") === null, "missing day → no invented title");
assert(comeBackTomorrowLine({ lang: "es", nextTitle: "Mostrador en caos" }) === "Vuelve mañana por «Mostrador en caos».", "ES teaser uses guillemets");
assert(comeBackTomorrowLine({ lang: "en", nextTitle: "Airport Counter Chaos" }) === "Come back tomorrow for “Airport Counter Chaos”.", "EN teaser uses curly quotes");
assert(comeBackTomorrowLine({ lang: "es" }) === COME_BACK_GENERIC_ES, "ES fallback when title unknown");
assert(comeBackTomorrowLine({ lang: "en", nextTitle: "" }) === COME_BACK_GENERIC_EN, "EN fallback when title empty");
assert(comeBackTomorrowLine({ lang: "es", nextTitle: "   " }) === COME_BACK_GENERIC_ES, "whitespace title is unknown");
assert(comeBackTomorrowLine({ lang: "en", nextTitle: null, fallback: COME_BACK_GENERIC_EN }) === COME_BACK_GENERIC_EN, "null title uses generic");

console.log("ok: first door is Hoy or Phrase Doctor; streak-1 + come-back line");
