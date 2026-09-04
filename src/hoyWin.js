/** First-session Hoy: win before the wall. Later Hoys keep full depth. */

export const FIRST_HOY_BEAT_CAP = 4;
export const HOY_FULL_BEAT_CAP = 5;
export const HOY_WIN_ES = "¡Eso!";
export const HOY_WIN_EN = "That's it.";

/** Short path is first session / streak 0 only. */
export function isFirstHoySession({ streak } = {}) {
  return (Number(streak) || 0) < 1;
}

/** First Hoy ≤4 beats. Later Hoys keep the existing 5-beat scene. */
export function hoyBeatCap({ firstHoy, streak } = {}) {
  const short = firstHoy === true || (firstHoy == null && isFirstHoySession({ streak }));
  return short ? FIRST_HOY_BEAT_CAP : HOY_FULL_BEAT_CAP;
}

export function trimHoyBeats(items, opts = {}) {
  const list = Array.isArray(items) ? items : [];
  return list.slice(0, hoyBeatCap(opts));
}

/** After the first correct beat on a first-session Hoy, finish. No pep. */
export function shouldHoyEarlyWin({ firstHoy, hits } = {}) {
  return !!firstHoy && (Number(hits) || 0) >= 1;
}

export function hoyWinCopy(lang) {
  return lang === "en" ? HOY_WIN_EN : HOY_WIN_ES;
}
