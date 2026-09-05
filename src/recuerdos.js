/** Recuerdos / Souvenir trail — Mexico map pins. George + No face lock. */

export const RECUERDOS_TITLE_ES = "Recuerdos";
export const RECUERDOS_TITLE_EN = "Souvenir trail";

export const RECUERDOS_OPEN_ES = "Abierto";
export const RECUERDOS_OPEN_EN = "Open";
export const RECUERDOS_LOCKED_ES = "Cerrado";
export const RECUERDOS_LOCKED_EN = "Locked";

export const FIRST_GLOW_PIN = "bajio";

/** Clean Mexico outline (viewBox 0 0 300 190). Baja hook · Yucatán thumb. */
export const MEXICO_OUTLINE_PATH =
  "M34,52 C28,36 36,20 52,22 L44,50 36,78 30,108 26,128 36,132 46,114 56,86 66,58 78,38 " +
  "L100,26 134,24 168,30 190,40 L204,34 238,40 270,54 276,68 260,78 230,70 204,62 " +
  "L190,74 178,100 166,120 146,130 126,122 116,108 L104,120 86,128 72,116 68,98 " +
  "L54,104 42,94 44,74 40,60 Z";

/**
 * Five regional pins. Percent positions sit on the Mexico outline.
 * Bajío is the first-glow pin and starts open.
 */
export const RECUERDOS_PINS = [
  { id: "bajio", es: "Bajío", en: "Bajío", x: 39, y: 54, firstGlow: true, storyIds: ["story-0"] },
  { id: "cdmx", es: "CDMX", en: "CDMX", x: 47, y: 62, storyIds: ["story-1", "story-3", "story-7", "story-8"] },
  { id: "oaxaca", es: "Oaxaca", en: "Oaxaca", x: 53, y: 74, storyIds: ["story-4"] },
  { id: "yucatan", es: "Yucatán", en: "Yucatán", x: 82, y: 40, storyIds: ["story-2"] },
  { id: "norte", es: "Norte", en: "North", x: 28, y: 30, storyIds: ["story-5"] },
];

export function recuerdosTitle(lang) {
  return lang === "en" ? RECUERDOS_TITLE_EN : RECUERDOS_TITLE_ES;
}

export function recuerdosPinLabel(pin, lang) {
  if (!pin) return "";
  return lang === "en" ? pin.en : pin.es;
}

export function recuerdosPinState(open, lang) {
  if (open) return lang === "en" ? RECUERDOS_OPEN_EN : RECUERDOS_OPEN_ES;
  return lang === "en" ? RECUERDOS_LOCKED_EN : RECUERDOS_LOCKED_ES;
}

export const CDMX_PIN = "cdmx";

/** Bajío first-glow always open. CDMX opens on souvenir claim or day-2 Hoy unlock. */
export function isRecuerdosPinOpen(pin, claimedStories = {}, unlocks = {}) {
  if (!pin) return false;
  if (pin.firstGlow || pin.id === FIRST_GLOW_PIN) return true;
  if (pin.id === CDMX_PIN && unlocks.cdmxUnlockSeen) return true;
  return (pin.storyIds || []).some((id) => !!claimedStories[id]);
}

export function storyIdForRecuerdosPin(pin, claimedStories = {}) {
  const ids = pin?.storyIds || [];
  if (!ids.length) return null;
  return ids.find((id) => !claimedStories[id]) || ids[0];
}

/** Cuts George / Dave / No face do not ship on this surface. */
export const RECUERDOS_CUTS = [
  /¡Sigue explorando!/i,
  /sigue explorando/i,
  /sigue-exploring/i,
  /\b12\s*\/\s*25\b/,
  /backpack/i,
  /parroquia/i,
];

export function recuerdosSurfaceHasCuts(text) {
  const hay = String(text || "");
  return RECUERDOS_CUTS.some((re) => re.test(hay));
}

/** Backpack-style progress fraction (12/25, 0/10) — not on the Recuerdos map. */
export function recuerdosHasProgressFraction(text) {
  return /\b\d+\s*\/\s*\d+\b/.test(String(text || ""));
}

/** Fog sits on locked regions only. Bajío first-glow stays clear. */
export function recuerdosLockedPins(pins = RECUERDOS_PINS, claimedStories = {}, unlocks = {}) {
  return (pins || []).filter((pin) => !isRecuerdosPinOpen(pin, claimedStories, unlocks));
}

export const BAJIO_UNLOCK_FLASH_MS = 1400;

/** Survives React StrictMode remount so persist-on-show cannot swallow the flash. */
let bajioUnlockFlashLive = false;

/** Survives a full remount/reload in the same tab after Eso CONTINUE. */
export const BAJIO_UNLOCK_FLASH_DUE_KEY = "andale-bajio-flash-due";

export function isBajioUnlockFlashLive() {
  return bajioUnlockFlashLive;
}

export function markBajioUnlockFlashLive(on) {
  bajioUnlockFlashLive = !!on;
}

export function isBajioUnlockFlashDue() {
  if (bajioUnlockFlashLive) return true;
  try {
    return sessionStorage.getItem(BAJIO_UNLOCK_FLASH_DUE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function markBajioUnlockFlashDue(on) {
  markBajioUnlockFlashLive(on);
  try {
    if (on) sessionStorage.setItem(BAJIO_UNLOCK_FLASH_DUE_KEY, "1");
    else sessionStorage.removeItem(BAJIO_UNLOCK_FLASH_DUE_KEY);
  } catch (e) {}
}

/** ¡Eso! / That's it. first-win (Hoy scene — including Landlord WhatsApp — or first Doctora). */
export function isFirstStreakEsoWin(session) {
  const todayScene = !!(session?.todaySceneId || String(session?.unitId || "").startsWith("_today:"));
  return !!(session?.firstHoy || session?.firstDoctora || session?.esoWin || todayScene);
}

/** After first streak-1 ¡Eso! / That's it. CONTINUE — short glow beat, then paywall. Once only. */
export function shouldShowBajioUnlockFlash({
  bajioUnlockSeen,
  firstStreakEso,
  streak,
  paywallSeen,
} = {}) {
  if (bajioUnlockSeen) return false;
  if (paywallSeen) return false;
  if (!firstStreakEso) return false;
  return (Number(streak) || 0) === 1;
}

/** George + No face stamp: flash copy is Abierto / Open only. No pep, no new lines. */
export function bajioUnlockFlashCopy(lang) {
  return recuerdosPinState(true, lang);
}

/** Same Abierto / Open stamps as Bajío. No new copy. */
export function cdmxUnlockFlashCopy(lang) {
  return bajioUnlockFlashCopy(lang);
}

export const CDMX_UNLOCK_FLASH_MS = BAJIO_UNLOCK_FLASH_MS;

let cdmxUnlockFlashLive = false;

export const CDMX_UNLOCK_FLASH_DUE_KEY = "andale-cdmx-flash-due";

export function isCdmxUnlockFlashLive() {
  return cdmxUnlockFlashLive;
}

export function markCdmxUnlockFlashLive(on) {
  cdmxUnlockFlashLive = !!on;
}

export function isCdmxUnlockFlashDue() {
  if (cdmxUnlockFlashLive) return true;
  try {
    return sessionStorage.getItem(CDMX_UNLOCK_FLASH_DUE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function markCdmxUnlockFlashDue(on) {
  markCdmxUnlockFlashLive(on);
  try {
    if (on) sessionStorage.setItem(CDMX_UNLOCK_FLASH_DUE_KEY, "1");
    else sessionStorage.removeItem(CDMX_UNLOCK_FLASH_DUE_KEY);
  } catch (e) {}
}

/**
 * Day-2 Hoy ¡Eso! / That's it. (scene id / `_today:` count if firstHoy dropped).
 * Not first-Doctora — that stays on the Bajío path.
 */
export function isDay2HoyEsoWin(session) {
  if (!session || session.firstDoctora) return false;
  const todayScene = !!(session.todaySceneId || String(session.unitId || "").startsWith("_today:"));
  return !!(session.day2Hoy || session.firstHoy || session.esoWin || todayScene);
}

/** After day-2 Hoy ¡Eso! / That's it. CONTINUE — glow beat, then close or idle. Once only. */
export function shouldShowCdmxUnlockFlash({
  cdmxUnlockSeen,
  day2HoyEso,
  streak,
} = {}) {
  if (cdmxUnlockSeen) return false;
  if (!day2HoyEso) return false;
  return (Number(streak) || 0) === 2;
}

/** Fog-of-war: mist over the map, clear around open pins (Bajío first). */
export function recuerdosFogBackground(pins = RECUERDOS_PINS, claimedStories = {}, theme = "light", unlocks = {}) {
  const fog = theme === "dark" ? "rgba(18,22,28,.58)" : "rgba(232,238,242,.7)";
  const open = (pins || []).filter((pin) => isRecuerdosPinOpen(pin, claimedStories, unlocks));
  if (!open.length) return fog;
  return open
    .map((pin) => `radial-gradient(circle at ${pin.x}% ${pin.y}%, transparent 0 11%, ${fog} 30%)`)
    .join(", ");
}
