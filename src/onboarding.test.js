import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { migrateFirstSession } from "./firstSession.js";
import {
  CONTINUE_LABEL,
  EASIEST_UNIT_ID,
  ONBOARDING_GOALS,
  ONBOARDING_HOLD_KEY,
  ONBOARDING_LEVELS,
  ONBOARDING_PAINT,
  ONBOARDING_SELECT_MS,
  ONBOARDING_TAPS,
  firstLessonForLevel,
  hasFinishedLesson,
  hasSavedResume,
  onboardingResume,
  readDailyGoalLessons,
  readLearnerLevel,
  shouldShowOnboarding,
} from "./onboarding.js";
import { onboardingCopy, onboardingLine } from "./onboardingCopy.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const dir = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(dir, name), "utf8");
const appSrc = read("App.jsx");
const uiSrc = read("Onboarding.jsx");
const copySrc = read("onboardingCopy.js");
const gateSrc = read("onboarding.js");

function channelLum(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function contrast(fg, bg) {
  const lum = (hex) => {
    const n = Number.parseInt(hex.slice(1), 16);
    return 0.2126 * channelLum((n >> 16) & 255) + 0.7152 * channelLum((n >> 8) & 255) + 0.0722 * channelLum(n & 255);
  };
  const hi = Math.max(lum(fg), lum(bg));
  const lo = Math.min(lum(fg), lum(bg));
  return (hi + 0.05) / (lo + 0.05);
}

function slots(node, acc = []) {
  if (!node || typeof node !== "object") return acc;
  if (typeof node.en === "string" && typeof node.es === "string") {
    acc.push(node);
    return acc;
  }
  for (const value of Object.values(node)) slots(value, acc);
  return acc;
}

assert(ONBOARDING_TAPS <= 3 && ONBOARDING_TAPS === 3, "onboarding is 3 taps");
assert(ONBOARDING_LEVELS.join(",") === "beginner,some,conversation", "three named levels");
assert(ONBOARDING_GOALS.join(",") === "1,2,3", "daily goal is 1, 2, or 3 lessons");

assert(shouldShowOnboarding(null) === true, "fresh storage sees onboarding");
assert(shouldShowOnboarding(undefined) === true, "missing storage sees onboarding");
assert(shouldShowOnboarding({ onboardingPending: true, firstSessionDone: false }) === true, "a reload mid-onboarding stays on the screens");
assert(shouldShowOnboarding({ onboardingDone: true, onboardingPending: true, firstSessionDone: false }) === false, "a finished onboarding stays down");
assert(shouldShowOnboarding({ firstSessionDone: false }) === false, "a false first-session marker skips onboarding");
assert(shouldShowOnboarding({ firstSessionDone: true }) === false, "a finished first session skips onboarding");
assert(shouldShowOnboarding({ firstSessionArmed: true }) === false, "an armed first session skips onboarding");
assert(hasSavedResume({ resume: { unitId: "_first", qi: 1 } }), "a saved resume counts");
assert(shouldShowOnboarding({ resume: { unitId: "subj1", order: [] } }) === false, "a saved resume skips onboarding");
assert(hasFinishedLesson({ done: { subj1: 1 } }), "a crowned unit is a finished lesson");
assert(hasFinishedLesson({ stories: { "story-0": true } }), "a claimed story is a finished lesson");
assert(shouldShowOnboarding({ done: { subj1: 1 } }) === false, "a finished lesson skips onboarding");
assert(shouldShowOnboarding({ stories: { "story-0": true } }) === false, "a finished story skips onboarding");
assert(shouldShowOnboarding(migrateFirstSession({ xp: 40, streak: 3 })) === false, "a pre-release save is migrated and skips onboarding");
assert(shouldShowOnboarding(migrateFirstSession({ theme: "dark", uiLang: "en" })) === false, "a theme-only save keeps today's splash path");
assert(shouldShowOnboarding({ learnerLevel: "beginner", dailyGoalLessons: 1, onboardingDone: true, firstSessionDone: false }) === false, "stored level and goal do not bring the screens back");

assert(readLearnerLevel({}) == null && readLearnerLevel({ learnerLevel: "nope" }) == null, "a missing level is skip-safe");
assert(readLearnerLevel({ learnerLevel: "beginner" }) === "beginner", "a stored level reads back");
assert(readDailyGoalLessons({}) == null && readDailyGoalLessons({ dailyGoalLessons: 9 }) == null, "a missing goal is skip-safe");
assert(readDailyGoalLessons({ dailyGoalLessons: 2 }) === 2, "a stored goal reads back");
assert(onboardingResume(null).step === "level", "a fresh pass starts on level");
assert(onboardingResume({ learnerLevel: "some" }).step === "goal", "a saved level resumes on the goal");
assert(onboardingResume({ learnerLevel: "conversation", dailyGoalLessons: 3 }).step === "plan", "both choices resume on the plan");

const beginner = firstLessonForLevel("beginner");
const some = firstLessonForLevel("some");
const conversation = firstLessonForLevel("conversation");
assert(beginner.kind === "firstSession" && beginner.beginner === true && beginner.unitId === EASIEST_UNIT_ID, "a beginner opens the zero-start first session");
assert(beginner.storyId == null, "beginner is not a story");
assert(some.kind === "firstSession" && some.beginner === false && some.unitId === EASIEST_UNIT_ID, "some Spanish keeps the existing first session");
assert(conversation.kind === "firstSession" && conversation.beginner === false && conversation.unitId === "subj1", "conversation keeps the existing first session");
assert(!gateSrc.includes("story-0") && !gateSrc.includes("lectura"), "the story-0 stopgap is gone");
const startFn = appSrc.slice(appSrc.indexOf("const startOnboardingLesson"), appSrc.indexOf("return (", appSrc.indexOf("const startOnboardingLesson")));
assert(!startFn.includes("openStory") && !startFn.includes("story-0"), "onboarding start does not open Lectura");
assert(startFn.includes("beginner: route.beginner === true"), "the beginner flag reaches the first session");
assert(appSrc.includes("beginner ? beginnerFirstQuestions() : firstSessionQuestions(UNITS)"), "only the beginner level swaps the question list");

const lines = slots(onboardingCopy);
assert(lines.length >= 12, "every screen string is an EN/ES pair");
for (const slot of lines) {
  assert(slot.en.trim() && slot.es.trim(), "EN and ES are non-empty");
  assert(slot.en !== slot.es, "EN and ES are not the same string");
  assert(onboardingLine(slot, "en") === slot.en && onboardingLine(slot, "es") === slot.es, "the helper returns the file strings");
  assert(!/minute|minuto|hour|hora|fluent|fluido|audio|stripe|paypal|revenuecat/i.test(`${slot.en} ${slot.es}`), "no time, audio, or payment-provider claims");
  assert(copySrc.includes(slot.en) && copySrc.includes(slot.es), "the string lives in onboardingCopy.js");
  assert(!uiSrc.includes(`"${slot.en}"`) && !uiSrc.includes(`"${slot.es}"`) && !uiSrc.includes(`'${slot.en}'`) && !uiSrc.includes(`'${slot.es}'`), "Onboarding.jsx does not inline the string");
}
const onboardingRender = appSrc.slice(appSrc.indexOf("<Onboarding"), appSrc.indexOf("/>", appSrc.indexOf("<Onboarding")) + 2);
assert(onboardingRender.includes("lang={uiLang}"), "App passes the live language into the screen");
assert(!/>[^<]*[A-Za-zÁÉÍÓÚáéíóúñ]{3,}/.test(onboardingRender), "App does not put screen words on the onboarding element");
assert(uiSrc.includes('from "./onboardingCopy.js"'), "the screen reads onboardingCopy.js");
assert(uiSrc.includes("onLevel(id)"), "a level tap advances by itself");
assert(uiSrc.includes("onGoal(count)"), "a goal tap advances by itself");
assert(ONBOARDING_SELECT_MS === 250, "the selected card holds for 250 ms");
assert(uiSrc.includes("ONBOARDING_SELECT_MS"), "the screen uses that hold");
assert(uiSrc.includes(ONBOARDING_HOLD_KEY) || uiSrc.includes("onboardingSelectionHeld"), "a hold hook can freeze the selected card");
assert(uiSrc.includes('data-testid="onboarding-check"'), "the selected card shows a check");
assert(uiSrc.includes("2px solid ${paint.accent}"), "level and goal cards keep the sage edge");
assert(uiSrc.includes("onClick={onStart}"), "the plan button is the start tap");
assert(appSrc.includes("shouldShowOnboarding(p)"), "the gate runs on the loaded save");
assert(appSrc.includes("migrateFirstSession(p)"), "existing saves still migrate first");
assert(appSrc.includes("firstLessonForLevel("), "the level chooses the first lesson");
assert(appSrc.includes("onboardingPending: true"), "a fresh save is marked pending");
assert(appSrc.includes("learnerLevel: level"), "the level is stored on the save");
assert(appSrc.includes("dailyGoalLessons: goal"), "the goal is stored on the save");

for (const mode of ["light", "dark"]) {
  const paint = ONBOARDING_PAINT[mode];
  assert(contrast(paint.ink, paint.page) >= 4.5, `${mode} ink on the page clears 4.5`);
  assert(contrast(paint.ink, paint.card) >= 4.5, `${mode} ink on the card clears 4.5`);
  assert(paint.buttonInk === CONTINUE_LABEL, `${mode} button text is the CONTINUE label`);
  assert(paint.accent === "#6F7757", `${mode} card edge stays sage`);
}
assert(CONTINUE_LABEL === "#fff", "CONTINUE label is white");
assert(appSrc.includes("CONTINUE_LABEL"), "the lesson CONTINUE button uses the same token");
assert(uiSrc.includes("CONTINUE_LABEL"), "the plan button uses the same token");
assert(uiSrc.includes('letterSpacing: ".06em"') && uiSrc.includes('textTransform: "uppercase"'), "the plan button matches the CONTINUE button");
assert(!uiSrc.includes("#15171C"), "the plan button does not use the dark ink");
assert(ONBOARDING_PAINT.dark.page === "#15171C", "dark page");
assert(ONBOARDING_PAINT.dark.card === "#1E2128", "dark card");
assert(ONBOARDING_PAINT.dark.ink === "#F6EFE4", "dark ink is cream");
assert(ONBOARDING_PAINT.light.page === "#F6EFE4", "light page stays cream");
assert(uiSrc.includes("paint.button") && uiSrc.includes("paint.buttonLip"), "green fill and lip come from the paint");
assert(uiSrc.includes("{onboardingLine(onboardingCopy.planLevel, lang)}: {onboardingLine(levelSlot?.name, lang)}"), "the plan level line is label, colon, name");
assert(uiSrc.includes("{onboardingLine(onboardingCopy.planGoal, lang)}: {onboardingLine(goalSlot, lang)}"), "the plan goal line is label, colon, goal");

assert(onboardingCopy.levelPromise.en === "Mexican Spanish past the basics — for people who already know some.", "level promise EN is the stamped line");
assert(onboardingCopy.levelPromise.es === "Español mexicano más allá de lo básico — para quien ya sabe algo.", "level promise ES is the stamped line");
assert(uiSrc.includes("onboardingCopy.levelPromise"), "the subline reads the stamped slot");
assert(uiSrc.includes("const levelStep = step !== \"goal\" && step !== \"plan\""), "the promise is the level step only");
const promiseAt = uiSrc.indexOf('data-testid="onboarding-promise"');
assert(promiseAt > 0, "level screen paints a promise subline");
assert(uiSrc.slice(promiseAt - 180, promiseAt).includes("levelStep ?"), "the subline renders only on the level step");
assert(uiSrc.includes('fontWeight: 600') && uiSrc.includes("fontSize: 16"), "promise line is 16px weight 600");
assert(uiSrc.includes('theme === "dark" ? "#CDBBA6" : "#6B6258"'), "promise ink is #6B6258 on cream and #CDBBA6 on dark");
const promiseStyle = uiSrc.slice(uiSrc.indexOf("/** Level-screen promise"), uiSrc.indexOf("const cardStyle"));
assert(promiseStyle.includes('textWrap: "balance"'), "promise wraps balanced");
assert(!/LineClamp|line-clamp|WebkitBoxOrient/.test(promiseStyle), "the two-line clamp is gone from the promise");
assert(!promiseStyle.includes('overflow: "hidden"'), "the promise does not clip its own overflow");
assert(/below 360px/.test(promiseStyle) && /three lines/.test(promiseStyle), "below 360 the promise may use three lines");
assert(Number(contrast("#6B6258", ONBOARDING_PAINT.light.page).toFixed(2)) === 5.23, "promise ink on cream is 5.23:1");
assert(contrast("#6B6258", ONBOARDING_PAINT.light.page) >= 5.1, "promise ink on cream clears 5.1:1");
assert(contrast("#CDBBA6", ONBOARDING_PAINT.dark.page) >= 4.5, "promise ink on the dark page clears 4.5");

console.log("onboarding.test.js: ok");
