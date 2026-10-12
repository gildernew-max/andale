import { readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { migrateFirstSession } from "./firstSession.js";
import {
  CONTINUE_LABEL,
  EASIEST_UNIT_ID,
  ONBOARDING_CTA_BOTTOM,
  ONBOARDING_CTA_CONTENT_GAP,
  ONBOARDING_CTA_HEIGHT,
  ONBOARDING_FRAME_HEIGHT,
  ONBOARDING_FRAME_WIDTH,
  ONBOARDING_GOALS,
  ONBOARDING_LEVELS,
  ONBOARDING_MINUTE_CHIP,
  ONBOARDING_PAINT,
  ONBOARDING_TAPS,
  ONBOARDING_WHYS,
  firstLessonForLevel,
  hasFinishedLesson,
  hasSavedResume,
  onboardingResume,
  readDailyGoalMinutes,
  readLearnerLevel,
  readLearningWhy,
  shouldShowOnboarding,
  onboardingCtaBottomCss,
  onboardingCtaClearanceCss,
  onboardingCtaRect,
} from "./onboarding.js";
import { onboardingCopy, onboardingLine, onboardingPlanLine } from "./onboardingCopy.js";

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

assert(ONBOARDING_TAPS === 7, "four screens: three choice CTAs plus the plan CTA, each choice preceded by its card");
assert(ONBOARDING_CTA_BOTTOM === 14, "CTA sits 14px off the viewport bottom, the gap left by top 780 on an 844 frame");
assert(ONBOARDING_CTA_HEIGHT === 50, "single-line CTA block is 50px");
assert(ONBOARDING_FRAME_WIDTH === 390 && ONBOARDING_FRAME_HEIGHT === 844, "the old pin was drawn on a 390×844 frame");
const frameCta = onboardingCtaRect({ viewportHeight: ONBOARDING_FRAME_HEIGHT, viewportWidth: ONBOARDING_FRAME_WIDTH });
assert(frameCta.top === 780 && frameCta.bottom === 830 && frameCta.withinViewport, "390×844 keeps the button where top 780 put it");
const phoneCta = onboardingCtaRect({ viewportHeight: 640, viewportWidth: 360 });
assert(phoneCta.withinViewport && phoneCta.top === 576 && phoneCta.bottom === 626, "360×640 keeps the CTA on screen");
assert(780 + ONBOARDING_CTA_HEIGHT > 640, "the old top 780 pin was below a 640 screen");
const insetCta = onboardingCtaRect({ viewportHeight: 640, viewportWidth: 360, safeAreaBottom: 34 });
assert(insetCta.withinViewport && insetCta.bottom === 640 - 14 - 34 && insetCta.top === 542, "a home-indicator inset still leaves the CTA on a 640 screen");
assert(onboardingCtaBottomCss() === "calc(14px + env(safe-area-inset-bottom))", "bottom pin includes the safe area");
assert(onboardingCtaClearanceCss() === "calc(64px + env(safe-area-inset-bottom))", "content clears the 50px button plus the 14px gap");
assert(ONBOARDING_CTA_CONTENT_GAP === 12, "cards keep 12px of air above the CTA");
assert(ONBOARDING_LEVELS.join(",") === "beginner,some,conversation", "three named levels");
assert(ONBOARDING_WHYS.join(",") === "travel,family,live,work,me", "five reasons");
assert(ONBOARDING_GOALS.join(",") === "5,10,15,20", "daily goal is 5, 10, 15, or 20 minutes");
assert(ONBOARDING_MINUTE_CHIP === "min", "the minute chip abbreviation is min");

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
assert(shouldShowOnboarding({ learnerLevel: "beginner", learningWhy: "travel", dailyGoalMinutes: 10, onboardingDone: true, firstSessionDone: false }) === false, "a finished onboarding stays down");
assert(shouldShowOnboarding({ learnerLevel: "some", dailyGoalLessons: 2, onboardingDone: true }) === false, "an older finished save does not see the new screens");

assert(readLearnerLevel({}) == null && readLearnerLevel({ learnerLevel: "nope" }) == null, "a missing level is skip-safe");
assert(readLearnerLevel({ learnerLevel: "beginner" }) === "beginner", "a stored level reads back");
assert(readLearningWhy({}) == null && readLearningWhy({ learningWhy: "nope" }) == null, "a missing reason is skip-safe");
assert(readLearningWhy({ learningWhy: "work" }) === "work", "a stored reason reads back");
assert(readDailyGoalMinutes({}) == null && readDailyGoalMinutes({ dailyGoalMinutes: 9 }) == null, "a missing minute goal is skip-safe");
assert(readDailyGoalMinutes({ dailyGoalLessons: 2 }) == null, "an old lesson count is not a minute goal");
assert(readDailyGoalMinutes({ dailyGoalMinutes: 10 }) === 10, "a stored minute goal reads back");
assert(onboardingResume(null).step === "level", "a fresh pass starts on level");
assert(onboardingResume({ learnerLevel: "some" }).step === "why", "a saved level resumes on why");
assert(onboardingResume({ learnerLevel: "some", dailyGoalLessons: 3 }).step === "why", "an old lesson count does not skip why");
assert(onboardingResume({ learnerLevel: "some", learningWhy: "live" }).step === "goal", "level and reason resume on the goal");
assert(onboardingResume({ learnerLevel: "conversation", learningWhy: "me", dailyGoalMinutes: 20 }).step === "plan", "all three choices resume on the plan");

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
assert(appSrc.includes("some ? someFirstSessionQuestions(UNITS)"), "I know some uses its own first-session order");
assert(appSrc.includes(": firstSessionQuestions(UNITS)"), "conversation and unmarked saves keep the existing first session");
assert(startFn.includes("level"), "the chosen level reaches the first session");

const lines = slots(onboardingCopy);
assert(lines.length >= 12, "every screen string is an EN/ES pair");
for (const slot of lines) {
  assert(slot.en.trim() && slot.es.trim(), "EN and ES are non-empty");
  assert(slot.en !== slot.es, "EN and ES are not the same string");
  assert(onboardingLine(slot, "en") === slot.en && onboardingLine(slot, "es") === slot.es, "the helper returns the file strings");
  const pair = `${slot.en} ${slot.es}`;
  if (slot !== onboardingCopy.planBody) {
    assert(!/minute|minuto|hour|hora|fluent|fluido|audio|stripe|paypal|revenuecat/i.test(pair), "no time claim outside the plan sentence");
  }
  assert(!/streak|racha|heart|coraz[oó]n|price|precio|paywall|\$/i.test(pair), "no streak, hearts, or price words");
  assert(copySrc.includes(slot.en) && copySrc.includes(slot.es), "the string lives in onboardingCopy.js");
  assert(!uiSrc.includes(`"${slot.en}"`) && !uiSrc.includes(`"${slot.es}"`) && !uiSrc.includes(`'${slot.en}'`) && !uiSrc.includes(`'${slot.es}'`), "Onboarding.jsx does not inline the string");
}
const onboardingRender = appSrc.slice(appSrc.indexOf("<Onboarding"), appSrc.indexOf("/>", appSrc.indexOf("<Onboarding")) + 2);
assert(onboardingRender.includes("lang={uiLang}"), "App passes the live language into the screen");
assert(!/>[^<]*[A-Za-zÁÉÍÓÚáéíóúñ]{3,}/.test(onboardingRender), "App does not put screen words on the onboarding element");
assert(uiSrc.includes('from "./onboardingCopy.js"'), "the screen reads onboardingCopy.js");
assert(uiSrc.includes("onLevel(selectedId)"), "the CTA continues with the chosen level");
assert(uiSrc.includes("onWhy(selectedId)"), "the CTA continues with the chosen reason");
assert(uiSrc.includes("onGoal(selectedId)"), "the CTA continues with the chosen minutes");
assert(uiSrc.includes("setSelectedId(id)") && uiSrc.includes("setSelectedId(count)"), "a card tap selects and does not advance");
assert(!uiSrc.includes("setTimeout"), "a card tap does not advance on a timer");
assert(uiSrc.includes('data-testid="onboarding-check"'), "the selected card shows a check");
assert(uiSrc.includes("2px solid ${paint.accent}"), "an unselected card keeps the sage edge");
assert(uiSrc.includes("3px solid ${paint.selectedEdge}"), "a selected card uses a 3px picked edge");
assert(uiSrc.includes('padding: selected ? "11px 13px" : "12px 14px"'), "the selected card trims 1px of padding so the 3px edge does not grow the card");
assert(ONBOARDING_PAINT.light.selectedEdge === "#2E7500", "light selected edge is #2E7500");
assert(ONBOARDING_PAINT.dark.selectedEdge === "#58CC02", "dark selected edge is #58CC02");
assert(uiSrc.includes("onStart()"), "the plan CTA starts the lesson");
assert(uiSrc.includes('position: "fixed"') && uiSrc.includes("bottom: onboardingCtaBottomCss()"), "the CTA is fixed to the viewport bottom");
assert(uiSrc.includes("paddingBottom: onboardingCtaClearanceCss()"), "the shell reserves the CTA block");
assert(uiSrc.includes('data-testid="onboarding-scroll"') && uiSrc.includes('overflowY: "auto"'), "content above the CTA scrolls");
assert(!uiSrc.includes('overflow: "hidden"'), "the onboarding shell does not clip with overflow hidden");
assert(!/top:\s*780\b/.test(uiSrc) && !uiSrc.includes("ONBOARDING_CTA_" + "TOP"), "the y=780 pin is gone");
assert(appSrc.includes("shouldShowOnboarding(p)"), "the gate runs on the loaded save");
assert(appSrc.includes("migrateFirstSession(p)"), "existing saves still migrate first");
assert(appSrc.includes("firstLessonForLevel("), "the level chooses the first lesson");
assert(appSrc.includes("onboardingPending: true"), "a fresh save is marked pending");
assert(appSrc.includes("learnerLevel: level"), "the level is stored on the save");
assert(appSrc.includes("learningWhy: why"), "the reason is stored on the save");
assert(appSrc.includes("dailyGoalMinutes: goal"), "the minute goal is stored on the save");
assert(!appSrc.includes("dailyGoalLessons"), "the lesson-count goal is no longer written");

for (const mode of ["light", "dark"]) {
  const paint = ONBOARDING_PAINT[mode];
  assert(contrast(paint.ink, paint.page) >= 4.5, `${mode} ink on the page clears 4.5`);
  assert(contrast(paint.ink, paint.card) >= 4.5, `${mode} ink on the card clears 4.5`);
  assert(paint.buttonInk === "#1F3A1A", `${mode} CTA label is #1F3A1A`);
  assert(paint.button === "#58CC02" && paint.buttonLip === "#46A302", `${mode} CTA is the lime CHECK`);
  assert(paint.accent === "#6F7757", `${mode} card edge stays sage`);
  const empty = mode === "dark"
    ? { fill: "#2A2E36", ink: "#6B7078", lip: "#1E2128" }
    : { fill: "#E5E5E5", ink: "#AFAFAF", lip: "#CECECE" };
  assert(paint.emptyFill === empty.fill && paint.emptyInk === empty.ink && paint.emptyLip === empty.lip, `${mode} empty CTA is the empty CHECK`);
}
assert(CONTINUE_LABEL === "#fff", "CONTINUE label is white");
assert(appSrc.includes("CONTINUE_LABEL"), "the lesson CONTINUE button uses the same token");
assert(!uiSrc.includes("CONTINUE_LABEL"), "the onboarding CTA does not use the white CONTINUE label");
assert(uiSrc.includes('letterSpacing: ".06em"') && uiSrc.includes('textTransform: "uppercase"'), "the CTA matches the CHECK button");
assert(!uiSrc.includes("#15171C"), "the CTA does not use the dark page ink");
assert(ONBOARDING_PAINT.dark.page === "#15171C", "dark page");
assert(ONBOARDING_PAINT.dark.card === "#1E2128", "dark card");
assert(ONBOARDING_PAINT.dark.ink === "#F6EFE4", "dark ink is cream");
assert(ONBOARDING_PAINT.light.page === "#F6EFE4", "light page stays cream");
assert(uiSrc.includes("paint.button") && uiSrc.includes("paint.buttonLip") && uiSrc.includes("paint.buttonInk"), "lime fill, lip, and ink come from the paint");
assert(uiSrc.includes("paint.emptyFill") && uiSrc.includes("paint.emptyInk") && uiSrc.includes("paint.emptyLip"), "the empty CTA uses the empty CHECK paint");
assert(uiSrc.includes("onboardingPlanLine(lang, goal)"), "the plan sentence fills {n}");
assert(uiSrc.includes("mascot/cenzontle.png"), "the plan reuses the static Cenzontle");
assert(!/cenzontle-bounce|cenzontle-courier|animation:/.test(uiSrc), "the plan bird does not animate");

assert(onboardingCopy.levelPromise.en === "Mexican Spanish past the basics — for people who already know some.", "level promise EN is the stamped line");
assert(onboardingCopy.levelPromise.es === "Español mexicano más allá de lo básico — para quien ya sabe algo.", "level promise ES is the stamped line");
assert(uiSrc.includes("onboardingCopy.levelPromise"), "the subline reads the stamped slot");
assert(uiSrc.includes('const levelStep = step !== "why" && step !== "goal" && step !== "plan"'), "the promise is the level step only");
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
assert(Number(contrast("#1F3A1A", "#58CC02").toFixed(2)) === 5.99, "CTA ink on lime is 5.99:1");

assert(onboardingCopy.levelTitle.en === "Where are you with Spanish?" && onboardingCopy.levelTitle.es === "¿En qué punto estás con el español?", "level title stays the live line");
assert(onboardingCopy.whyTitle.en === "Why are you learning Spanish?" && onboardingCopy.whyTitle.es === "¿Para qué aprendes español?", "why title is the locked line");
assert(onboardingCopy.whys.travel.en === "Travel in Mexico" && onboardingCopy.whys.travel.es === "Viajar por México", "travel option");
assert(onboardingCopy.whys.family.en === "Talk with family or friends" && onboardingCopy.whys.family.es === "Hablar con familia o amigos", "family option");
assert(onboardingCopy.whys.live.en === "Live or retire in Mexico" && onboardingCopy.whys.live.es === "Vivir o retirarme en México", "live option");
assert(onboardingCopy.whys.work.en === "Work" && onboardingCopy.whys.work.es === "Trabajo", "work option");
assert(onboardingCopy.whys.me.en === "Just for me" && onboardingCopy.whys.me.es === "Por gusto", "for-me option");
assert(onboardingCopy.goalTitle.en === "How much time a day?" && onboardingCopy.goalTitle.es === "¿Cuánto tiempo al día?", "goal title is the locked line");
assert(onboardingCopy.goals[5].en === "Easy" && onboardingCopy.goals[5].es === "Tranquilo", "5 min adjective");
assert(onboardingCopy.goals[10].en === "Steady" && onboardingCopy.goals[10].es === "Constante", "10 min adjective");
assert(onboardingCopy.goals[15].en === "Serious" && onboardingCopy.goals[15].es === "En serio", "15 min adjective");
assert(onboardingCopy.goals[20].en === "All in" && onboardingCopy.goals[20].es === "A fondo", "20 min adjective");
assert(onboardingCopy.goalNote == null, "the goal note is gone");
assert(!copySrc.includes("You can change this anytime in Profile.") && !copySrc.includes("Puedes cambiarlo cuando quieras en Perfil."), "the goal note strings are gone");
assert(!uiSrc.includes("onboarding-goal-note"), "the goal screen has no note");
assert(onboardingCopy.planTitle.en === "Your plan" && onboardingCopy.planTitle.es === "Tu plan", "plan title");
assert(onboardingCopy.planBody.en === "{n} minutes a day: one short lesson, then a story in Lectura.", "plan body EN");
assert(onboardingCopy.planBody.es === "{n} minutos al día: una lección corta y luego un cuento en Lectura.", "plan body ES");
assert(onboardingPlanLine("en", 10) === "10 minutes a day: one short lesson, then a story in Lectura.", "plan fills the chosen count");
assert(onboardingPlanLine("es", 5) === "5 minutos al día: una lección corta y luego un cuento en Lectura.", "plan fills the chosen count in ES");
assert(onboardingCopy.planStart.en === "Start my first lesson" && onboardingCopy.planStart.es === "Empezar mi primera lección", "plan CTA");
assert(onboardingCopy.ctaContinue.en === "Continue" && onboardingCopy.ctaContinue.es === "Continuar", "choice CTA reuses Continue");
for (const id of ONBOARDING_WHYS) {
  assert(!onboardingCopy.whys[id].en.includes(".") && !onboardingCopy.whys[id].es.includes("."), "why options have no period");
}
for (const count of ONBOARDING_GOALS) {
  assert(!onboardingCopy.goals[count].en.includes(".") && !onboardingCopy.goals[count].es.includes("."), "goal options have no period");
}

const bannedTop = "ONBOARDING_CTA_" + "TOP";
const topPin = new RegExp("top:\\s*" + "780\\b");
function sourceFiles(folder, acc = []) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      sourceFiles(path, acc);
    } else if (/\.(js|jsx)$/.test(entry.name)) acc.push(path);
  }
  return acc;
}
for (const file of sourceFiles(dir)) {
  const text = readFileSync(file, "utf8");
  assert(!text.includes(bannedTop), `${file} still exports or applies the y=780 CTA pin`);
  assert(!topPin.test(text), `${file} still pins a CTA at top 780`);
}

console.log("onboarding.test.js: ok");
