/** First-session + day-2 return Hoy: win before the wall. Full scene parks under Más. */

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
 * Explicit firstHoy false keeps the full 5-beat / Más path.
 */
export function isShortHoy({ firstHoy, streak, lastDay, today } = {}) {
  if (firstHoy === true) return true;
  if (firstHoy === false) return false;
  return isFirstHoySession({ streak }) || isDay2Return({ streak, lastDay, today });
}

/** First / day-2 return Hoy ≤4 beats. Full / Más path keeps the existing 5-beat scene. */
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
