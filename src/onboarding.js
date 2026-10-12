import { completedLessonCount, hasFirstSessionMarker } from "./firstSession.js";

export const ONBOARDING_LEVELS = Object.freeze(["beginner", "some", "conversation"]);
export const ONBOARDING_WHYS = Object.freeze(["travel", "family", "live", "work", "me"]);
/** Minutes per day. Chip prefix is this abbreviation in both languages. */
export const ONBOARDING_MINUTE_CHIP = "min";
export const ONBOARDING_GOALS = Object.freeze([5, 10, 15, 20]);

/** Four screens. Each choice screen is a card tap plus the CTA. The plan is the CTA. */
export const ONBOARDING_TAPS = 7;

/**
 * Gap from the viewport bottom to the CTA's bottom edge, plus the home-indicator inset.
 * On a 390×844 frame the old absolute top of 780 and this button's 50px block left 14px (844 - 780 - 50).
 * A 360×640 phone put that same top 140px below the screen.
 */
export const ONBOARDING_CTA_BOTTOM = 14;
/** Measured single-line block: 13px padding + 20px Nunito line + 13px padding + 4px lip. */
export const ONBOARDING_CTA_HEIGHT = 50;
/** Air between the last card and the pinned CTA so the card is not hidden behind it. */
export const ONBOARDING_CTA_CONTENT_GAP = 12;
export const ONBOARDING_FRAME_WIDTH = 390;
export const ONBOARDING_FRAME_HEIGHT = 844;

export function onboardingCtaBottomCss() {
  return `calc(${ONBOARDING_CTA_BOTTOM}px + env(safe-area-inset-bottom))`;
}

/** Shell padding that keeps the scrolling column above the fixed CTA. */
export function onboardingCtaClearanceCss() {
  return `calc(${ONBOARDING_CTA_BOTTOM + ONBOARDING_CTA_HEIGHT}px + env(safe-area-inset-bottom))`;
}

/** Where the pinned CTA sits. safeAreaBottom is px (0 when env() is 0). */
export function onboardingCtaRect({
  viewportHeight,
  viewportWidth,
  safeAreaBottom = 0,
  buttonHeight = ONBOARDING_CTA_HEIGHT,
} = {}) {
  const bottomInset = ONBOARDING_CTA_BOTTOM + Number(safeAreaBottom || 0);
  const height = buttonHeight;
  const top = viewportHeight - bottomInset - height;
  const left = 20;
  const right = viewportWidth - 20;
  const bottom = top + height;
  const withinViewport = top >= 0
    && bottom <= viewportHeight
    && left >= 0
    && right <= viewportWidth
    && height > 0
    && right > left;
  return { top, left, right, bottom, width: right - left, height, withinViewport };
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
    selectedEdge: "#2E7500",
    button: "#58CC02",
    buttonInk: "#1F3A1A",
    buttonLip: "#46A302",
    emptyFill: "#E5E5E5",
    emptyInk: "#AFAFAF",
    emptyLip: "#CECECE",
  }),
  dark: Object.freeze({
    page: "#15171C",
    card: "#1E2128",
    ink: "#F6EFE4",
    accent: "#6F7757",
    selectedEdge: "#58CC02",
    button: "#58CC02",
    buttonInk: "#1F3A1A",
    buttonLip: "#46A302",
    emptyFill: "#2A2E36",
    emptyInk: "#6B7078",
    emptyLip: "#1E2128",
  }),
});

export function readLearnerLevel(saved) {
  return ONBOARDING_LEVELS.includes(saved?.learnerLevel) ? saved.learnerLevel : null;
}

export function readLearningWhy(saved) {
  return ONBOARDING_WHYS.includes(saved?.learningWhy) ? saved.learningWhy : null;
}

export function readDailyGoalMinutes(saved) {
  const n = Number(saved?.dailyGoalMinutes);
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
  const why = readLearningWhy(saved);
  const goal = readDailyGoalMinutes(saved);
  if (!level) return { step: "level", level: null, why: null, goal: null };
  if (!why) return { step: "why", level, why: null, goal: null };
  if (!goal) return { step: "goal", level, why, goal: null };
  return { step: "plan", level, why, goal };
}

/** Beginner → the zero-start first session. Anyone else → a first session. "some" order lives in firstSession.js. */
export function firstLessonForLevel(level) {
  if (level === "beginner") return { kind: "firstSession", unitId: EASIEST_UNIT_ID, beginner: true };
  return { kind: "firstSession", unitId: EASIEST_UNIT_ID, beginner: false };
}
