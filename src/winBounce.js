/** First-win Cenzontle: firstHoy + story-0 Cubetas v2 780ms beat, Doctora 720ms courier, later Lectura WinPerch. Soft chrome parked. */

import {
  CUBETAS_EASE_ENTER,
  CUBETAS_EASE_EXIT,
  CUBETAS_ENTER_MS,
  CUBETAS_EXIT_MS,
  CUBETAS_LIFT_MS,
  CUBETAS_SQUASH_MS,
  CUBETAS_WIN_MS,
} from "./cubetas.js";
import { HOY_WIN_EN, HOY_WIN_ES } from "./hoyWin.js";

export const WIN_BOUNCE_MS = 720;
export const WIN_BOUNCE_SRC = "mascot/cenzontle.png";

/** Lectura story-0 only. Cubetas v2 780ms family. Do not replay on later stories. */
export const STORY0_ID = "story-0";
export const STORY0_BEAT_MS = CUBETAS_WIN_MS;
export const STORY0_ENTER_MS = CUBETAS_ENTER_MS;
export const STORY0_DROP_MS = CUBETAS_SQUASH_MS;
export const STORY0_HOLD_MS = CUBETAS_LIFT_MS;
export const STORY0_EXIT_MS = CUBETAS_EXIT_MS;
export const STORY0_EASE_ENTER = CUBETAS_EASE_ENTER;
export const STORY0_EASE_CHIP = "cubic-bezier(.35,.05,.7,.45)";
export const STORY0_EASE_EXIT = CUBETAS_EASE_EXIT;
export const STORY0_WIN_ES = HOY_WIN_ES;
export const STORY0_WIN_EN = HOY_WIN_EN;

/**
 * Phrase Doctor first-win / ¡Eso! 720ms courier.
 * firstHoy is the Cubetas 780ms beat — not this courier.
 * firstStory0 is the Lectura story-0 780ms beat — not this courier.
 * lecturaWin is later Lectura static WinPerch — not this courier.
 * esoWin / todaySceneId are wider unlock stamps — do not use them here.
 */
export function shouldPlayWinBounce(session) {
  if (!session || typeof session !== "object") return false;
  return !!session.firstDoctora;
}

/** Live done-screen gate. firstHoy only — Cubetas v2 780ms, then WinPerch. Later Hoy same day does not replay. */
export function shouldPlayHoyBeat(session) {
  if (!session || typeof session !== "object") return false;
  return !!session.firstHoy;
}

/** Arm the 780ms beat only on first claim of Lectura story-0 after every page. Later stories stay static. */
export function shouldArmStory0Beat({ storyId, claimed, pagesSeen, pageCount } = {}) {
  if (storyId !== STORY0_ID || claimed) return false;
  const n = Number(pageCount) || 0;
  if (n < 1) return false;
  const seen = Array.isArray(pagesSeen) ? pagesSeen : [];
  return [...Array(n).keys()].every((i) => seen.includes(i));
}

/** Live done-screen gate. firstStory0 + story-0 only — never later stories or Hoy/Doctora. */
export function shouldPlayStory0Beat(session) {
  if (!session || typeof session !== "object") return false;
  return !!(session.firstStory0 && session.storyId === STORY0_ID);
}

/** Static WinPerch on first claim of later Lectura. No 780ms enter/drop/hold/exit. */
export function shouldArmLecturaWin({ storyId, claimed } = {}) {
  if (!storyId || claimed || storyId === STORY0_ID) return false;
  return String(storyId).startsWith("story-");
}

/** Live done-screen gate. Later Lectura static perch — never the 780ms beat or Doctora courier. */
export function shouldPlayLecturaWin(session) {
  if (!session || typeof session !== "object") return false;
  return !!(session.lecturaWin && session.storyId && session.storyId !== STORY0_ID);
}

export function story0WinCopy(lang) {
  return lang === "en" ? STORY0_WIN_EN : STORY0_WIN_ES;
}
