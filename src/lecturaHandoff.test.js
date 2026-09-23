import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  LECTURA_HANDOFF_CTA,
  LECTURA_HANDOFF_QUIET,
  LECTURA_HANDOFF_SEEN,
  isCenzontleWin,
  lecturaHandoffCta,
  lecturaHandoffQuiet,
  nextUnreadStory,
  shouldShowLecturaHandoff,
  shouldStampLecturaHandoff,
} from "./lecturaHandoff.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const here = dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");

assert(LECTURA_HANDOFF_SEEN === "lecturaHandoffSeen", "once-gate key is lecturaHandoffSeen");
assert(LECTURA_HANDOFF_QUIET.es === "El cuento es lo que sigue.", "ES quiet line is George");
assert(LECTURA_HANDOFF_QUIET.en === "The story is what\u2019s next.", "EN quiet line is George, curly apostrophe");
assert(LECTURA_HANDOFF_QUIET.en.includes("\u2019"), "EN quiet line keeps U+2019");
assert(!LECTURA_HANDOFF_QUIET.en.includes("'"), "EN quiet line is not a straight apostrophe");
assert(LECTURA_HANDOFF_CTA.es === "Leer el cuento", "ES CTA is George");
assert(LECTURA_HANDOFF_CTA.en === "Read the story", "EN CTA is George");
assert(lecturaHandoffQuiet("es") === LECTURA_HANDOFF_QUIET.es, "es quiet");
assert(lecturaHandoffQuiet("en") === LECTURA_HANDOFF_QUIET.en, "en quiet");
assert(lecturaHandoffQuiet("fr") === LECTURA_HANDOFF_QUIET.es, "non-en face is Spanish");
assert(lecturaHandoffQuiet() === LECTURA_HANDOFF_QUIET.es, "missing lang is Spanish");
assert(lecturaHandoffCta("en") === LECTURA_HANDOFF_CTA.en && lecturaHandoffCta("es") === LECTURA_HANDOFF_CTA.es, "CTA follows uiLang");
assert(lecturaHandoffQuiet("en") !== lecturaHandoffQuiet("es") && !lecturaHandoffQuiet("en").includes("cuento"), "one language face");

const stories = [{ id: "story-0" }, { id: "story-1" }, { id: "story-2" }];
assert(nextUnreadStory(stories, {})?.id === "story-0", "unread story-0 is the CTA");
assert(nextUnreadStory(stories, { "story-0": true })?.id === "story-1", "claimed story-0 opens the next unread");
assert(nextUnreadStory(stories, { "story-0": true, "story-1": true })?.id === "story-2", "skips claimed stories in order");
assert(nextUnreadStory(stories, { "story-0": true, "story-1": true, "story-2": true }) == null, "no unread story");
assert(nextUnreadStory(null, {}) == null, "missing list has no destination");
assert(nextUnreadStory(stories, null)?.id === "story-0", "missing claimed map treats every story as unread");

const hoy = { firstHoy: true };
const doctora = { firstDoctora: true };
const story0 = { firstStory0: true, storyId: "story-0" };
const later = { lecturaWin: true, storyId: "story-1" };
const plain = { title: "Plain", host: "luna" };

assert(isCenzontleWin(hoy) && isCenzontleWin(doctora) && isCenzontleWin(story0) && isCenzontleWin(later), "bird wins are Cenzontle wins");
assert(!isCenzontleWin(plain) && !isCenzontleWin({ esoWin: true }) && !isCenzontleWin(null) && !isCenzontleWin({}), "plain lesson and esoWin alone are not the handoff");

const show = (extra) => shouldShowLecturaHandoff({
  handoffSeen: false,
  session: hoy,
  lecturaStarted: false,
  story0Claimed: false,
  hasUnread: true,
  ready: true,
  ...extra,
});

assert(show(), "first Hoy win with Lectura unstarted shows the strip");
assert(show({ lecturaStarted: true, story0Claimed: false }), "story-0 still incomplete shows the strip");
assert(!show({ lecturaStarted: true, story0Claimed: true }), "Lectura already started and story-0 done stays quiet");
assert(!show({ hasUnread: false }), "no unread story, no CTA");
assert(!show({ handoffSeen: true }), "persisted once-gate hides the strip");
assert(!show({ ready: false }), "unstored progress does not fire");
assert(!show({ session: plain }), "plain lesson win does not fire");
assert(show({ session: doctora }), "first Doctora win can fire");
assert(!show({ session: story0, lecturaStarted: true, story0Claimed: true }), "story-0 claim win does not offer another story");
assert(show({ session: later, lecturaStarted: true, story0Claimed: false }), "later Lectura win still points at incomplete story-0");

assert(shouldStampLecturaHandoff({ handoffSeen: false, session: hoy }), "first Cenzontle win stamps the once-gate");
assert(shouldStampLecturaHandoff({ handoffSeen: false, session: story0, ready: true }), "a Lectura win still consumes the once-gate");
assert(!shouldStampLecturaHandoff({ handoffSeen: true, session: hoy }), "seen gate does not stamp again");
assert(!shouldStampLecturaHandoff({ handoffSeen: false, session: plain }), "plain win does not stamp");
assert(!shouldStampLecturaHandoff({ handoffSeen: false, session: hoy, ready: false }), "stamp waits until progress is loaded");

assert(appSrc.includes("from \"./lecturaHandoff.js\""), "App imports the handoff gate");
assert(appSrc.includes("LECTURA_HANDOFF_SEEN") || appSrc.includes("lecturaHandoffSeen"), "once-gate is written on progress");
assert(appSrc.includes("shouldShowLecturaHandoff"), "done screen uses the show gate");
assert(appSrc.includes("shouldStampLecturaHandoff"), "done screen stamps the once-gate");
assert(appSrc.includes("nextUnreadStory(STORIES, prog.stories)"), "CTA destination is the next unread story");
assert(appSrc.includes("lecturaHandoffQuiet(uiLang)"), "quiet line follows uiLang");
assert(appSrc.includes("lecturaHandoffCta(uiLang)"), "CTA follows uiLang");
assert(appSrc.includes('data-testid="lectura-handoff"'), "strip is testable");
assert(appSrc.includes('data-testid="lectura-handoff-quiet"'), "quiet line is testable");
assert(appSrc.includes('data-testid="lectura-handoff-cta"'), "CTA is testable");
assert(appSrc.includes('data-testid="story-reader"'), "story open is testable");
assert(appSrc.includes("lecturaStartedRef"), "Lectura-started is this session, not a second persist");

const strip = appSrc.slice(appSrc.indexOf('data-testid="lectura-handoff"'), appSrc.indexOf('data-testid="lectura-handoff"') + 1600);
assert(strip.includes("HUB_CREAM"), "strip surface is cream");
assert(strip.includes("MARK_INK"), "outline CTA uses sage ink, not filled green");
assert(strip.includes("D.sub"), "quiet line is soft secondary type");
assert(!/background:\s*D\.green/.test(strip), "handoff CTA is not filled green");
assert(!strip.includes("<Btn"), "handoff CTA is not the filled duo button");
assert(!/cenzontle|LogoMark|WinPerch|CenzontleFlyAway/.test(strip), "strip adds no second bird");
assert(appSrc.includes("surface=\"win\""), "existing Cenzontle win motion stays");

console.log("ok: Cenzontle → Lectura handoff — once-gate, uiLang words, next unread.");
