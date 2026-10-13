/** Soft-paywall timing. Display only.
 *  Day 1 is the learner's first local calendar day.
 *  Win and timed stay down on day 1. A locked Lectura tap can still open
 *  the card once that day. One show per local date, shared by all three.
 *
 *  QA walk (no URL params, no debug UI):
 *  localStorage "andale-first-activity" and "andale-paywall-shown"
 *  are plain YYYY-MM-DD strings. The same strings are mirrored on the
 *  andale-v3 progress object as firstActivityDay and paywallShownDay.
 *  On reload the plain keys win.
 */

import { dayKeyFromDate } from "./firstDoor.js";

export const FIRST_ACTIVITY_KEY = "andale-first-activity";
export const PAYWALL_SHOWN_KEY = "andale-paywall-shown";

export const LOCKED_STORY_CAP_LINE = Object.freeze({
  en: "Read the stories before this one to open it.",
  es: "Lee los cuentos anteriores para abrir este.",
});

/** 8px under the tapped card. Body type is 13.5; this is one size down. */
export const LOCKED_CAP_GAP_PX = 8;
export const LOCKED_CAP_SIZE = 12;
export const LOCKED_CAP_FADE_MS = 150;
export const LOCKED_CAP_INK = Object.freeze({
  light: "#6B6258",
  dark: "#CDBBA6",
});

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isLocalDayKey(value) {
  if (typeof value !== "string" || !DAY_KEY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const local = new Date(y, m - 1, d);
  return dayKeyFromDate(local) === value;
}

function civilDayNumber(dayKey) {
  if (!isLocalDayKey(dayKey)) return null;
  const [y, m, d] = dayKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** 1 on the first-activity date. The next local calendar date is 2. */
export function learnerDayNumber(firstActivityDay, today) {
  const from = civilDayNumber(firstActivityDay);
  const to = civilDayNumber(today);
  if (from == null || to == null) return 1;
  const delta = to - from;
  if (delta < 0) return 1;
  return delta + 1;
}

export function paywallShownOnDay(shownDay, today) {
  return isLocalDayKey(shownDay) && isLocalDayKey(today) && shownDay === today;
}

/**
 * open — show the card.
 * capped — locked story only: keep it locked and show the quiet line.
 * skip — win and timed stay down (day 1, cap used, subscribed, or hearts hold).
 * Locked story still opens for a subscribed learner; story locking is unchanged.
 */
export function paywallOpenDecision({
  source,
  dayNumber = 1,
  shownDay = "",
  today = "",
  unlockedPrem = false,
  paywallHold = false,
} = {}) {
  const capped = paywallShownOnDay(shownDay, today);
  if (source === "locked_story") return capped ? "capped" : "open";
  if (source !== "win" && source !== "timed") return "skip";
  if (paywallHold || unlockedPrem) return "skip";
  if ((Number(dayNumber) || 1) < 2) return "skip";
  if (capped) return "skip";
  return "open";
}

/** Win and timed never paint over a lesson, quiz, or story. */
export function isPaywallMidFlow(screen) {
  return screen === "lesson" || screen === "story" || screen === "failed";
}

export function readPlainDay(storage, key) {
  try {
    const raw = storage?.getItem?.(key);
    return isLocalDayKey(raw) ? raw : "";
  } catch {
    return "";
  }
}

export function writePlainDay(storage, key, day) {
  if (!isLocalDayKey(day)) return false;
  try {
    storage?.setItem?.(key, day);
    return true;
  } catch {
    return false;
  }
}

/** Plain key wins over the progress mirror so a tester edit survives reload. */
export function resolveFirstActivityDay({ keyValue, progressValue, today } = {}) {
  if (isLocalDayKey(keyValue)) return keyValue;
  if (isLocalDayKey(progressValue)) return progressValue;
  return isLocalDayKey(today) ? today : "";
}

/** A missing plain key clears the cap. Progress does not resurrect it. */
export function resolvePaywallShownDay({ keyValue } = {}) {
  return isLocalDayKey(keyValue) ? keyValue : "";
}
