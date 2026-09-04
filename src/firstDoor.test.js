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
  progressAfterWinContinue,
  shouldShowSoftPaywall,
  showComeBackTomorrow,
  showDoorMetaChrome,
  streakAfterWin,
  todaySceneIdFromSession,
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

assert(!showDoorMetaChrome({ streak: 0 }), "streak 0 hides Meta / Rayo / coaches / Luna greeting");
assert(!showDoorMetaChrome({}), "empty progress hides door meta chrome");
assert(!showDoorMetaChrome({ streak: null }), "null streak hides door meta chrome");
assert(showDoorMetaChrome({ streak: 1 }), "streak 1 shows Meta / Rayo / coaches");
assert(showDoorMetaChrome({ streak: 4 }), "streak above 1 keeps door meta chrome");

const firstWinHome = { streak: 1, lastDay: "2026-09-04", today: "2026-09-04", splash: false };
assert(!shouldShowSoftPaywall(firstWinHome), "idle home does not open paywall");
assert(shouldShowSoftPaywall({ ...firstWinHome, fromFirstWin: true }), "first streak-1 Hoy CONTINUE / Curarla opens paywall");
assert(!shouldShowSoftPaywall({ ...firstWinHome, fromFirstWin: true, splash: true }), "paywall never on splash");
assert(!shouldShowSoftPaywall({ ...firstWinHome, fromFirstWin: true, streak: 2 }), "not every later Hoy win");
assert(!shouldShowSoftPaywall({ ...firstWinHome, fromFirstWin: true, streak: 0, lastDay: null }), "paywall never before a win");
assert(!shouldShowSoftPaywall({ ...firstWinHome, fromFirstWin: true, paywallSeen: true }), "seen flag stops the loop");

assert(todaySceneIdFromSession({ todaySceneId: "taqueria" }) === "taqueria", "session todaySceneId wins");
assert(todaySceneIdFromSession({ unitId: "_today:landlord" }) === "landlord", "unitId _today: recovers scene");
assert(todaySceneIdFromSession({ unitId: "subj1" }) === "", "grammar unit is not a Hoy scene");
assert(todaySceneIdFromSession({}) === "", "empty session has no Hoy scene");

const stamped = progressAfterWinContinue({ streak: 0, lastDay: null, missions: {} }, { today: "2026-09-04", todaySceneId: "taqueria" });
assert(stamped.streak === 1, "CONTINUE stamps streak 1");
assert(stamped.lastDay === "2026-09-04", "CONTINUE stamps lastDay today");
assert(stamped.missions["scene-2026-09-04"] === "taqueria", "CONTINUE stamps today's Hoy scene");
assert(stamped.paywallSeen == null, "CONTINUE never stamps paywallSeen");
assert(showComeBackTomorrow({
  todaySceneDone: !!stamped.missions["scene-2026-09-04"],
  streak: stamped.streak,
  lastDay: stamped.lastDay,
  today: "2026-09-04",
}), "CONTINUE lands with Fh come-back true");
assert(shouldShowSoftPaywall({
  ...stamped,
  today: "2026-09-04",
  fromFirstWin: true,
  splash: false,
}), "first-win CONTINUE opens paywall once");
assert(!shouldShowSoftPaywall({
  ...stamped,
  today: "2026-09-04",
  fromFirstWin: false,
  splash: false,
}), "same flags on idle home do not reopen");

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
