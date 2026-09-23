import { FUNNEL_EVENTS, FUNNEL_LOG } from "./funnel.js";
import { STORY0_ID } from "./winBounce.js";
import {
  LECTURA_HANDOFF_CTA,
  LECTURA_HANDOFF_QUIET,
  LECTURA_HANDOFF_STORY0,
  isFirstCenzontleWin,
  lecturaHandoffCta,
  lecturaHandoffQuiet,
  lecturaHandoffSeenLogged,
  lecturaHandoffStoryId,
  shouldShowLecturaHandoff,
} from "./lecturaHandoff.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const IDS = ["story-0", "story-1", "story-2"];

assert(LECTURA_HANDOFF_STORY0 === STORY0_ID, "handoff story-0 id matches the Cenzontle beat");
assert(LECTURA_HANDOFF_QUIET.es === "El cuento es lo que sigue.", "quiet line ES");
assert(LECTURA_HANDOFF_QUIET.en === "The story is what\u2019s next.", "quiet line EN uses George apostrophe");
assert(LECTURA_HANDOFF_CTA.es === "Leer el cuento" && LECTURA_HANDOFF_CTA.en === "Read the story", "CTA George lock");
assert(lecturaHandoffQuiet("es") === LECTURA_HANDOFF_QUIET.es && lecturaHandoffQuiet("en") === LECTURA_HANDOFF_QUIET.en, "quiet follows uiLang");
assert(lecturaHandoffCta("es") === LECTURA_HANDOFF_CTA.es && lecturaHandoffCta("en") === LECTURA_HANDOFF_CTA.en, "CTA follows uiLang");
assert(lecturaHandoffQuiet("fr") === LECTURA_HANDOFF_QUIET.es && lecturaHandoffCta() === LECTURA_HANDOFF_CTA.es, "unknown uiLang stays ES");
assert(!/The story/.test(LECTURA_HANDOFF_QUIET.es + LECTURA_HANDOFF_CTA.es), "ES face has no EN salad");
assert(!/cuento|Leer/.test(LECTURA_HANDOFF_QUIET.en + LECTURA_HANDOFF_CTA.en), "EN face has no ES salad");

assert(isFirstCenzontleWin({ firstHoy: true }), "first Hoy is a Cenzontle win");
assert(isFirstCenzontleWin({ firstDoctora: true }), "first Doctora is a Cenzontle win");
assert(isFirstCenzontleWin({ firstStory0: true }), "story-0 beat is a Cenzontle win");
assert(!isFirstCenzontleWin({ lecturaWin: true, storyId: "story-1" }), "later Lectura perch is not the handoff win");
assert(!isFirstCenzontleWin({ esoWin: true }), "esoWin stamp alone is not the handoff");
assert(!isFirstCenzontleWin(null) && !isFirstCenzontleWin({}), "missing session is not a Cenzontle win");

assert(lecturaHandoffStoryId(IDS, {}) === "story-0", "unread library opens story-0");
assert(lecturaHandoffStoryId(IDS, { "story-1": true }) === "story-0", "story-0 unread wins over a later claim");
assert(lecturaHandoffStoryId(IDS, { "story-0": true }) === "story-1", "claimed story-0 opens the next unread");
assert(lecturaHandoffStoryId(IDS, { "story-0": true, "story-1": true }) === "story-2", "next unread skips claimed stories");
assert(lecturaHandoffStoryId(IDS, { "story-0": true, "story-1": true, "story-2": true }) == null, "fully read library has no destination");
assert(lecturaHandoffStoryId([], {}) == null, "empty library has no destination");

const show = (extra) => shouldShowLecturaHandoff({
  session: { firstHoy: true },
  handoffSeen: false,
  lecturaStartedThisSession: false,
  story0Claimed: false,
  storyId: "story-0",
  ...extra,
});

assert(show(), "first Hoy with unread story-0 shows the handoff");
assert(show({ session: { firstDoctora: true } }), "first Doctora shows the handoff");
assert(show({ lecturaStartedThisSession: true, story0Claimed: false }), "started Lectura with story-0 incomplete still shows");
assert(show({ lecturaStartedThisSession: false, story0Claimed: true, storyId: "story-1" }), "story-0 already read this earlier session opens the next unread");
assert(!show({ lecturaStartedThisSession: true, story0Claimed: true, storyId: "story-1" }), "Lectura started and story-0 complete does not show");
assert(!show({ session: { firstStory0: true }, lecturaStartedThisSession: true, story0Claimed: true }), "story-0 win itself does not offer the handoff");
assert(!show({ handoffSeen: true }), "persisted once-gate does not repeat");
assert(!show({ session: { lecturaWin: true, storyId: "story-1" } }), "later Lectura win does not show");
assert(!show({ session: {} }), "a normal lesson win does not show");
assert(!show({ storyId: null }), "no unread story does not show");
assert(!show({ session: null }), "missing session does not show");

const bus = { [FUNNEL_LOG]: [{ event: FUNNEL_EVENTS.lecturaHandoffSeen, at: "t" }] };
assert(lecturaHandoffSeenLogged(bus), "seen-event already in the page log");
assert(!lecturaHandoffSeenLogged({ [FUNNEL_LOG]: [{ event: "open" }] }), "other events do not count as seen");
assert(!lecturaHandoffSeenLogged({}), "empty bus has not seen the handoff");

console.log("ok: Cenzontle → Lectura handoff — once-gate, uiLang, story-0 then next unread.");
