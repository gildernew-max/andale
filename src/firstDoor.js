/** First-door hero: Hoy scene when it exists, else Phrase Doctor. Never Subjuntivo Continuar. */

export const FIRST_DOOR_HOY = "hoy";
export const FIRST_DOOR_PHRASE_DOCTOR = "phrase-doctor";

export const COME_BACK_GENERIC_ES = "Vuelve mañana por la siguiente escena.";
export const COME_BACK_GENERIC_EN = "Come back tomorrow for the next scene.";

export function firstDoorHero({ todayScene, todaySceneDone } = {}) {
  if (todayScene && !todaySceneDone) return FIRST_DOOR_HOY;
  return FIRST_DOOR_PHRASE_DOCTOR;
}

/** Local calendar key YYYY-MM-DD — same clock App uses for todayKey. */
export function dayKeyFromDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nextDayKey(dayKey) {
  const parts = String(dayKey || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return "";
  const [y, m, day] = parts;
  if (!y || !m || !day) return "";
  return dayKeyFromDate(new Date(y, m - 1, day + 1));
}

/** Same hash as Camino: sum of todayKey char codes % scene list length. */
export function hoySceneForDay(scenes, dayKey) {
  if (!Array.isArray(scenes) || !scenes.length || !dayKey) return null;
  const idx = [...String(dayKey)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % scenes.length;
  return scenes[idx] || null;
}

export function hoyTitleForLang(scene, lang) {
  if (!scene) return "";
  const title = lang === "en" ? scene.titleEn : scene.title;
  return typeof title === "string" ? title.trim() : "";
}

/** Named teaser when tomorrow's Hoy title is known; else generic siguiente escena / next scene. */
export function comeBackTomorrowLine({ lang = "es", nextTitle, fallback } = {}) {
  const title = typeof nextTitle === "string" ? nextTitle.trim() : "";
  if (!title) {
    return fallback || (lang === "en" ? COME_BACK_GENERIC_EN : COME_BACK_GENERIC_ES);
  }
  return lang === "en"
    ? `Come back tomorrow for “${title}”.`
    : `Vuelve mañana por «${title}».`;
}

/** Home line after a first win today, or after today's scene is cleared. */
export function showComeBackTomorrow({ todaySceneDone, streak, lastDay, today } = {}) {
  if (todaySceneDone) return true;
  return (Number(streak) || 0) >= 1 && lastDay === today;
}

/** Meta / Rayo / four-coach strip after first win. Same streak ≥ 1 gate as teaser/paywall. */
export function showDoorMetaChrome({ streak } = {}) {
  return (Number(streak) || 0) >= 1;
}

/** Session-one hook: first win of a new day is streak 1. Same day keeps the count. */
export function streakAfterWin(prev = {}, today, yesterday) {
  if (prev.lastDay === today) return Number(prev.streak) || 0;
  if (prev.lastDay === yesterday) return (Number(prev.streak) || 0) + 1;
  return 1;
}

/**
 * Soft paywall once after first win: showComeBackTomorrow && !paywallSeen && !splash.
 * Hook waits for home so Hoy celebration is first; Phrase Doctor Curarla has no done screen.
 */
export function shouldShowSoftPaywall({
  paywallSeen,
  todaySceneDone,
  streak,
  lastDay,
  today,
  screen = "home",
  splash = false,
} = {}) {
  if (paywallSeen) return false;
  if (splash) return false;
  if (screen !== "home") return false;
  return showComeBackTomorrow({ todaySceneDone, streak, lastDay, today });
}
