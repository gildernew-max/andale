/** Learn-home welcome caption. Display only — does not write the save or touch streak math. */

import { calendarGap } from "./streakDisplay.js";
import { hasLearnerProgress } from "./theaterGate.js";

/** A saved resume counts even before the first crown or XP. */
export function hasWelcomeProgress(prog) {
  if (hasLearnerProgress(prog)) return true;
  const resume = prog?.resume;
  return !!(resume && typeof resume === "object" && !Array.isArray(resume) && resume.unitId);
}

/**
 * Prior progress, and last activity on an earlier local calendar day than today.
 * Gap uses the same day-key parse as the streak display.
 */
export function shouldShowWelcomeBack({ prog, today } = {}) {
  if (!hasWelcomeProgress(prog)) return false;
  const gap = calendarGap(prog?.lastDay, today);
  return gap != null && gap > 0;
}

function streakSentence(count, lang) {
  const n = Math.floor(Number(count));
  if (!Number.isFinite(n) || n < 1) return "";
  if (lang === "en") return n === 1 ? "Streak: 1 day." : `Streak: ${n} days.`;
  return n === 1 ? "Racha: 1 día." : `Racha: ${n} días.`;
}

/**
 * One caption. `streak` is the number already on the flame (0 drops the streak sentence).
 * `lesson` is the resume / next-lesson title the home already shows. Empty if that name is missing.
 */
export function welcomeBackLine({ lang = "es", streak = 0, lesson = "" } = {}) {
  const name = typeof lesson === "string" ? lesson.trim() : "";
  if (!name) return "";
  const en = lang === "en";
  const hello = en ? "Good to see you again." : "Qué bueno verte de nuevo.";
  const pickUp = en
    ? `Pick up where you left off: ${name}.`
    : `Sigue donde quedaste: ${name}.`;
  const streakBit = streakSentence(streak, en ? "en" : "es");
  return streakBit ? `${hello} ${streakBit} ${pickUp}` : `${hello} ${pickUp}`;
}
