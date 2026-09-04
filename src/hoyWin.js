/** First-session + day-2 return Hoy: win before the wall. Park under Más only if a scene grows past 4. */

import { isDay2Return } from "./firstDoor.js";

export const FIRST_HOY_BEAT_CAP = 4;
export const HOY_FULL_BEAT_CAP = 5;
export const HOY_WIN_ES = "¡Eso!";
export const HOY_WIN_EN = "That's it.";

/** Short path is first session / streak 0 only. */
export function isFirstHoySession({ streak } = {}) {
  return (Number(streak) || 0) < 1;
}

/**
 * Short Hoy: first session, or day-2+ return (streak ≥ 1, lastDay ≠ today).
 * Explicit firstHoy false keeps the full path (only if a scene grows past 4).
 */
export function isShortHoy({ firstHoy, streak, lastDay, today } = {}) {
  if (firstHoy === true) return true;
  if (firstHoy === false) return false;
  return isFirstHoySession({ streak }) || isDay2Return({ streak, lastDay, today });
}

/**
 * Native scene beats: setup · line · Q, plus any later scene.beats / scene.extras.
 * Live casero / airport are 3. No invented cut list.
 */
export function hoySceneBeatCount(scene) {
  if (!scene || typeof scene !== "object") return 0;
  let n = 0;
  if (scene.setup || scene.setupEn) n += 1;
  if (scene.line) n += 1;
  if (scene.question || scene.questionEn) n += 1;
  if (Array.isArray(scene.beats)) n += scene.beats.length;
  if (Array.isArray(scene.extras)) n += scene.extras.length;
  return n;
}

/** Long park under Más only when the scene itself grows past 4. */
export function shouldParkHoyUnderMas(scene) {
  return hoySceneBeatCount(scene) > FIRST_HOY_BEAT_CAP;
}

/** First / day-2 return Hoy ≤4 beats. Later / grown scenes keep full depth. */
export function hoyBeatCap(opts = {}) {
  return isShortHoy(opts) ? FIRST_HOY_BEAT_CAP : HOY_FULL_BEAT_CAP;
}

export function trimHoyBeats(items, opts = {}) {
  const list = Array.isArray(items) ? items : [];
  return list.slice(0, hoyBeatCap(opts));
}

/** After the first correct beat on a short Hoy (first session or day-2 return), finish. No pep. */
export function shouldHoyEarlyWin({ firstHoy, hits } = {}) {
  return !!firstHoy && (Number(hits) || 0) >= 1;
}

export function hoyWinCopy(lang) {
  return lang === "en" ? HOY_WIN_EN : HOY_WIN_ES;
}
