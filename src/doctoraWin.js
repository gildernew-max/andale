/** First-session Doctora: win before the wall. Later sessions keep full depth. */

import { HOY_WIN_EN, HOY_WIN_ES } from "./hoyWin.js";

export const FIRST_DOCTORA_BEAT_CAP = 4;
export const DOCTORA_FULL_BEAT_CAP = 6;
export const DOCTORA_WIN_ES = HOY_WIN_ES;
export const DOCTORA_WIN_EN = HOY_WIN_EN;

/**
 * George + No face LOCKED first-Doctora keep (≤4).
 * Existing naturals only — café, ganas, sentido, esperando.
 * Parked (later path only): decisión, postularse.
 */
export const FIRST_DOCTORA_KEEP_NATURALS = [
  "¿Me da un café, por favor?",
  "Tengo muchas ganas de verte.",
  "Eso tiene sentido.",
  "Te estoy esperando.",
];

export const FIRST_DOCTORA_PARK_NATURALS = [
  "Necesito tomar una decisión.",
  "Voy a postularme al trabajo.",
];

/** Short path is first session / streak 0 only. */
export function isFirstDoctoraSession({ streak } = {}) {
  return (Number(streak) || 0) < 1;
}

function isShortDoctora({ firstDoctora, streak } = {}) {
  return firstDoctora === true || (firstDoctora == null && isFirstDoctoraSession({ streak }));
}

/** First Doctora ≤4 beats. Later sessions keep the full phrase list. */
export function doctoraBeatCap({ firstDoctora, streak } = {}) {
  return isShortDoctora({ firstDoctora, streak }) ? FIRST_DOCTORA_BEAT_CAP : DOCTORA_FULL_BEAT_CAP;
}

/** First session: locked keep 4 in stamp order. Later: full list (parked included). */
export function pickFirstDoctoraBeats(items) {
  const list = Array.isArray(items) ? items : [];
  const byNatural = new Map();
  for (const item of list) {
    if (item && typeof item === "object" && item.natural) byNatural.set(item.natural, item);
  }
  return FIRST_DOCTORA_KEEP_NATURALS.map((n) => byNatural.get(n)).filter(Boolean);
}

export function trimDoctoraBeats(items, opts = {}) {
  const list = Array.isArray(items) ? items : [];
  if (!isShortDoctora(opts)) return list.slice(0, DOCTORA_FULL_BEAT_CAP);
  const locked = pickFirstDoctoraBeats(list);
  if (locked.length) return locked.slice(0, FIRST_DOCTORA_BEAT_CAP);
  return list.slice(0, FIRST_DOCTORA_BEAT_CAP);
}

/** After the first correct beat on a first-session Doctora, finish. No pep. */
export function shouldDoctoraEarlyWin({ firstDoctora, hits } = {}) {
  return !!firstDoctora && (Number(hits) || 0) >= 1;
}

export function doctoraWinCopy(lang) {
  return lang === "en" ? DOCTORA_WIN_EN : DOCTORA_WIN_ES;
}
