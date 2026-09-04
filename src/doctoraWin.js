/** First-session Doctora: win before the wall. Later sessions keep full depth. */

import { HOY_WIN_EN, HOY_WIN_ES } from "./hoyWin.js";

export const FIRST_DOCTORA_BEAT_CAP = 4;
export const DOCTORA_FULL_BEAT_CAP = 6;
export const DOCTORA_WIN_ES = HOY_WIN_ES;
export const DOCTORA_WIN_EN = HOY_WIN_EN;

/** Short path is first session / streak 0 only. */
export function isFirstDoctoraSession({ streak } = {}) {
  return (Number(streak) || 0) < 1;
}

/** First Doctora ≤4 beats. Later sessions keep the full phrase list. */
export function doctoraBeatCap({ firstDoctora, streak } = {}) {
  const short = firstDoctora === true || (firstDoctora == null && isFirstDoctoraSession({ streak }));
  return short ? FIRST_DOCTORA_BEAT_CAP : DOCTORA_FULL_BEAT_CAP;
}

export function trimDoctoraBeats(items, opts = {}) {
  const list = Array.isArray(items) ? items : [];
  return list.slice(0, doctoraBeatCap(opts));
}

/** After the first correct beat on a first-session Doctora, finish. No pep. */
export function shouldDoctoraEarlyWin({ firstDoctora, hits } = {}) {
  return !!firstDoctora && (Number(hits) || 0) >= 1;
}

export function doctoraWinCopy(lang) {
  return lang === "en" ? DOCTORA_WIN_EN : DOCTORA_WIN_ES;
}
