/** Recuerdos / Souvenir trail — Mexico map pins. George + No face lock. */

export const RECUERDOS_TITLE_ES = "Recuerdos";
export const RECUERDOS_TITLE_EN = "Souvenir trail";

export const RECUERDOS_OPEN_ES = "Abierto";
export const RECUERDOS_OPEN_EN = "Open";
export const RECUERDOS_LOCKED_ES = "Cerrado";
export const RECUERDOS_LOCKED_EN = "Locked";

export const FIRST_GLOW_PIN = "bajio";

/** Dave-cleared illustrated Mexico map. Not the PR 81 SVG silhouette. */
export const MEXICO_MAP_SRC = "assets/dave-cleared-mexico-map.png";

/**
 * Contrast-darkened land fills on the Recuerdos PNG (cream paper unchanged).
 * Pastel source → darker earth tones so the silhouette reads on #F4EDE0.
 */
export const MEXICO_MAP_COLORS = {
  paper: "#f8f0e8",
  terracotta: "#b37856",
  sage: "#858e69",
  yellow: "#9f8d59",
  stroke: "#564834",
};

/** Pin marker ring — slightly stronger so gold / lime / lock stay readable on darker land. */
export const RECUERDOS_PIN_SHADOW = "0 0 0 1px rgba(58,42,24,.42), 0 3px 8px rgba(0,0,0,.34)";
export const RECUERDOS_PIN_SHADOW_LOCKED = "0 0 0 1px rgba(58,42,24,.28)";

/**
 * Five regional pins. Percent positions sit on the illustrated Mexico map.
 * Bajío is the first-glow pin and starts open.
 * Yucatán 75,66 sits the pin *dot* on peninsula land (button % is center of dot+label).
 * Was 82,40 — Gulf water north of the hook on the Dave-cleared art.
 */
export const RECUERDOS_PINS = [
  { id: "bajio", es: "Bajío", en: "Bajío", x: 39, y: 54, firstGlow: true, storyIds: ["story-0"] },
  { id: "cdmx", es: "CDMX", en: "CDMX", x: 47, y: 62, storyIds: ["story-1", "story-3", "story-7", "story-8"] },
  { id: "oaxaca", es: "Oaxaca", en: "Oaxaca", x: 53, y: 74, storyIds: ["story-4"] },
  { id: "yucatan", es: "Yucatán", en: "Yucatán", x: 75, y: 66, storyIds: ["story-2"] },
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
export const OAXACA_PIN = "oaxaca";
export const YUCATAN_PIN = "yucatan";
export const NORTE_PIN = "norte";

/** Bajío first-glow always open. CDMX / Oaxaca / Yucatán / Norte open on souvenir claim or streak unlock. */
export function isRecuerdosPinOpen(pin, claimedStories = {}, unlocks = {}) {
  if (!pin) return false;
  if (pin.firstGlow || pin.id === FIRST_GLOW_PIN) return true;
  if (pin.id === CDMX_PIN && unlocks.cdmxUnlockSeen) return true;
  if (pin.id === OAXACA_PIN && unlocks.oaxacaUnlockSeen) return true;
  if (pin.id === YUCATAN_PIN && unlocks.yucatanUnlockSeen) return true;
  if (pin.id === NORTE_PIN && unlocks.norteUnlockSeen) return true;
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

/**
 * Streak CONTINUE must pass. Raw `prog.streak` can still be 1 on day-2
 * (lastDay = yesterday) if persist has not committed yet — that skip
 * flipped the map Open without a glow.
 */
export function cdmxUnlockFlashStreak({ streak, lastDay, today, yesterday } = {}) {
  const n = Number(streak) || 0;
  if (lastDay && today && lastDay === today) return n;
  if (lastDay && yesterday && lastDay === yesterday) return n + 1;
  return n;
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

/** Same Abierto / Open stamps as Bajío / CDMX. No new copy. */
export function oaxacaUnlockFlashCopy(lang) {
  return bajioUnlockFlashCopy(lang);
}

export const OAXACA_UNLOCK_FLASH_MS = BAJIO_UNLOCK_FLASH_MS;

let oaxacaUnlockFlashLive = false;

export const OAXACA_UNLOCK_FLASH_DUE_KEY = "andale-oaxaca-flash-due";

export function isOaxacaUnlockFlashLive() {
  return oaxacaUnlockFlashLive;
}

export function markOaxacaUnlockFlashLive(on) {
  oaxacaUnlockFlashLive = !!on;
}

export function isOaxacaUnlockFlashDue() {
  if (oaxacaUnlockFlashLive) return true;
  try {
    return sessionStorage.getItem(OAXACA_UNLOCK_FLASH_DUE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function markOaxacaUnlockFlashDue(on) {
  markOaxacaUnlockFlashLive(on);
  try {
    if (on) sessionStorage.setItem(OAXACA_UNLOCK_FLASH_DUE_KEY, "1");
    else sessionStorage.removeItem(OAXACA_UNLOCK_FLASH_DUE_KEY);
  } catch (e) {}
}

/**
 * Streak-3 Hoy ¡Eso! / That's it. Same scene stamps as day-2
 * (`todaySceneId` / `_today:` / firstHoy / esoWin). Not first-Doctora.
 */
export function isStreak3HoyEsoWin(session) {
  return isDay2HoyEsoWin(session);
}

/**
 * Streak CONTINUE must pass. Raw `prog.streak` can still be 2 on day-3
 * (lastDay = yesterday) if persist has not committed yet.
 */
export function oaxacaUnlockFlashStreak(opts) {
  return cdmxUnlockFlashStreak(opts);
}

/** After streak-3 Hoy ¡Eso! / That's it. CONTINUE — glow beat, then close or idle. Once only. */
export function shouldShowOaxacaUnlockFlash({
  oaxacaUnlockSeen,
  streak3HoyEso,
  streak,
} = {}) {
  if (oaxacaUnlockSeen) return false;
  if (!streak3HoyEso) return false;
  return (Number(streak) || 0) === 3;
}

/** Same Abierto / Open stamps as Bajío / CDMX / Oaxaca. No new copy. */
export function yucatanUnlockFlashCopy(lang) {
  return bajioUnlockFlashCopy(lang);
}

export const YUCATAN_UNLOCK_FLASH_MS = BAJIO_UNLOCK_FLASH_MS;

let yucatanUnlockFlashLive = false;

export const YUCATAN_UNLOCK_FLASH_DUE_KEY = "andale-yucatan-flash-due";

export function isYucatanUnlockFlashLive() {
  return yucatanUnlockFlashLive;
}

export function markYucatanUnlockFlashLive(on) {
  yucatanUnlockFlashLive = !!on;
}

export function isYucatanUnlockFlashDue() {
  if (yucatanUnlockFlashLive) return true;
  try {
    return sessionStorage.getItem(YUCATAN_UNLOCK_FLASH_DUE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function markYucatanUnlockFlashDue(on) {
  markYucatanUnlockFlashLive(on);
  try {
    if (on) sessionStorage.setItem(YUCATAN_UNLOCK_FLASH_DUE_KEY, "1");
    else sessionStorage.removeItem(YUCATAN_UNLOCK_FLASH_DUE_KEY);
  } catch (e) {}
}

/**
 * Streak-4 Hoy ¡Eso! / That's it. Same scene stamps as day-2
 * (`todaySceneId` / `_today:` / firstHoy / esoWin). Not first-Doctora.
 */
export function isStreak4HoyEsoWin(session) {
  return isDay2HoyEsoWin(session);
}

/**
 * Streak CONTINUE must pass. Raw `prog.streak` can still be 3 on day-4
 * (lastDay = yesterday) if persist has not committed yet.
 */
export function yucatanUnlockFlashStreak(opts) {
  return cdmxUnlockFlashStreak(opts);
}

/** After streak-4 Hoy ¡Eso! / That's it. CONTINUE — glow beat, then close or idle. Once only. */
export function shouldShowYucatanUnlockFlash({
  yucatanUnlockSeen,
  streak4HoyEso,
  streak,
} = {}) {
  if (yucatanUnlockSeen) return false;
  if (!streak4HoyEso) return false;
  return (Number(streak) || 0) === 4;
}

/** Same Abierto / Open stamps as Bajío / CDMX / Oaxaca / Yucatán. No new copy. */
export function norteUnlockFlashCopy(lang) {
  return bajioUnlockFlashCopy(lang);
}

export const NORTE_UNLOCK_FLASH_MS = BAJIO_UNLOCK_FLASH_MS;

let norteUnlockFlashLive = false;

export const NORTE_UNLOCK_FLASH_DUE_KEY = "andale-norte-flash-due";

export function isNorteUnlockFlashLive() {
  return norteUnlockFlashLive;
}

export function markNorteUnlockFlashLive(on) {
  norteUnlockFlashLive = !!on;
}

export function isNorteUnlockFlashDue() {
  if (norteUnlockFlashLive) return true;
  try {
    return sessionStorage.getItem(NORTE_UNLOCK_FLASH_DUE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function markNorteUnlockFlashDue(on) {
  markNorteUnlockFlashLive(on);
  try {
    if (on) sessionStorage.setItem(NORTE_UNLOCK_FLASH_DUE_KEY, "1");
    else sessionStorage.removeItem(NORTE_UNLOCK_FLASH_DUE_KEY);
  } catch (e) {}
}

/**
 * Streak-5 Hoy ¡Eso! / That's it. Same scene stamps as day-2
 * (`todaySceneId` / `_today:` / firstHoy / esoWin). Not first-Doctora.
 */
export function isStreak5HoyEsoWin(session) {
  return isDay2HoyEsoWin(session);
}

/**
 * Streak CONTINUE must pass. Raw `prog.streak` can still be 4 on day-5
 * (lastDay = yesterday) if persist has not committed yet.
 */
export function norteUnlockFlashStreak(opts) {
  return cdmxUnlockFlashStreak(opts);
}

/** After streak-5 Hoy ¡Eso! / That's it. CONTINUE — glow beat, then close or idle. Once only. */
export function shouldShowNorteUnlockFlash({
  norteUnlockSeen,
  streak5HoyEso,
  streak,
} = {}) {
  if (norteUnlockSeen) return false;
  if (!streak5HoyEso) return false;
  return (Number(streak) || 0) === 5;
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
