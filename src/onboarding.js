import { completedLessonCount, hasFirstSessionMarker } from "./firstSession.js";

export const ONBOARDING_LEVELS = Object.freeze(["beginner", "some", "conversation"]);
export const ONBOARDING_GOALS = Object.freeze([1, 2, 3]);

/** Level, daily goal, then the plan button. */
export const ONBOARDING_TAPS = 3;

/** How long a tapped level or goal card holds its check before the next screen. */
export const ONBOARDING_SELECT_MS = 250;

/** Set on window to freeze the selected card for a screenshot or test. */
export const ONBOARDING_HOLD_KEY = "__andaleHoldOnboardingSelection";

export function onboardingSelectionHeld() {
  return typeof window !== "undefined" && window[ONBOARDING_HOLD_KEY] === true;
}

export const EASIEST_UNIT_ID = "subj1";

/** Lesson CONTINUE label. Green buttons use this text colour. */
export const CONTINUE_LABEL = "#fff";

export const ONBOARDING_PAINT = Object.freeze({
  light: Object.freeze({
    page: "#F6EFE4",
    card: "#FFFFFF",
    ink: "#3C3C3C",
    accent: "#6F7757",
    button: "#58CC02",
    buttonInk: CONTINUE_LABEL,
    buttonLip: "#46A302",
  }),
  dark: Object.freeze({
    page: "#15171C",
    card: "#1E2128",
    ink: "#F6EFE4",
    accent: "#6F7757",
    button: "#58CC02",
    buttonInk: CONTINUE_LABEL,
    buttonLip: "#46A302",
  }),
});

export function readLearnerLevel(saved) {
  return ONBOARDING_LEVELS.includes(saved?.learnerLevel) ? saved.learnerLevel : null;
}

export function readDailyGoalLessons(saved) {
  const n = Number(saved?.dailyGoalLessons);
  return ONBOARDING_GOALS.includes(n) ? n : null;
}

export function hasSavedResume(saved) {
  const resume = saved?.resume;
  return !!(resume && typeof resume === "object" && !Array.isArray(resume) && resume.unitId);
}

export function hasFinishedLesson(saved) {
  if (completedLessonCount(saved?.done) > 0) return true;
  const stories = saved?.stories;
  if (stories && typeof stories === "object" && !Array.isArray(stories)) {
    if (Object.values(stories).some((v) => !!v)) return true;
  }
  return false;
}

/**
 * Fresh storage only. Run this on the save after migrateFirstSession.
 * onboardingPending keeps a reload on the screens until the plan button.
 * onboardingDone wins, so a finished pass stays down even if pending is stale.
 */
export function shouldShowOnboarding(saved) {
  if (saved == null || typeof saved !== "object" || Array.isArray(saved)) return true;
  if (saved.onboardingDone === true) return false;
  if (saved.onboardingPending === true) return true;
  if (hasFirstSessionMarker(saved)) return false;
  if (hasSavedResume(saved)) return false;
  if (hasFinishedLesson(saved)) return false;
  return true;
}

export function onboardingResume(saved) {
  const level = readLearnerLevel(saved);
  const goal = readDailyGoalLessons(saved);
  if (level && goal) return { step: "plan", level, goal };
  if (level) return { step: "goal", level, goal: null };
  return { step: "level", level: null, goal: null };
}

/** Beginner → the zero-start first session. Anyone else → the existing five-exercise first session. */
export function firstLessonForLevel(level) {
  if (level === "beginner") return { kind: "firstSession", unitId: EASIEST_UNIT_ID, beginner: true };
  return { kind: "firstSession", unitId: EASIEST_UNIT_ID, beginner: false };
}
