/** First-door hero: Hoy scene when it exists, else Phrase Doctor. Never Subjuntivo Continuar. */

export const FIRST_DOOR_HOY = "hoy";
export const FIRST_DOOR_PHRASE_DOCTOR = "phrase-doctor";

export function firstDoorHero({ todayScene, todaySceneDone } = {}) {
  if (todayScene && !todaySceneDone) return FIRST_DOOR_HOY;
  return FIRST_DOOR_PHRASE_DOCTOR;
}

/** Home line after a first win today, or after today's scene is cleared. */
export function showComeBackTomorrow({ todaySceneDone, streak, lastDay, today } = {}) {
  if (todaySceneDone) return true;
  return (Number(streak) || 0) >= 1 && lastDay === today;
}

/** Session-one hook: first win of a new day is streak 1. Same day keeps the count. */
export function streakAfterWin(prev = {}, today, yesterday) {
  if (prev.lastDay === today) return Number(prev.streak) || 0;
  if (prev.lastDay === yesterday) return (Number(prev.streak) || 0) + 1;
  return 1;
}
