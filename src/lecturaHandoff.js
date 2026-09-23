/** Cenzontle → Lectura retention handoff. George words. One uiLang face. Soft chrome parked. */

import { FUNNEL_EVENTS, FUNNEL_LOG } from "./funnel.js";

export const LECTURA_HANDOFF_QUIET = Object.freeze({
  es: "El cuento es lo que sigue.",
  en: "The story is what\u2019s next.",
});

export const LECTURA_HANDOFF_CTA = Object.freeze({
  es: "Leer el cuento",
  en: "Read the story",
});

/** Same Lectura id as the story-0 Cenzontle beat. */
export const LECTURA_HANDOFF_STORY0 = "story-0";

export function lecturaHandoffQuiet(uiLang) {
  return uiLang === "en" ? LECTURA_HANDOFF_QUIET.en : LECTURA_HANDOFF_QUIET.es;
}

export function lecturaHandoffCta(uiLang) {
  return uiLang === "en" ? LECTURA_HANDOFF_CTA.en : LECTURA_HANDOFF_CTA.es;
}

/** First-win bird surfaces only. Later Lectura perch is not this handoff. */
export function isFirstCenzontleWin(session) {
  if (!session || typeof session !== "object") return false;
  return !!(session.firstHoy || session.firstDoctora || session.firstStory0);
}

/** story-0 if unread; otherwise the next unread id in library order. */
export function lecturaHandoffStoryId(storyIds, claimed = {}) {
  const ids = Array.isArray(storyIds) ? storyIds.filter((id) => typeof id === "string" && id) : [];
  if (!ids.length) return null;
  const unread = (id) => !claimed?.[id];
  if (ids.includes(LECTURA_HANDOFF_STORY0) && unread(LECTURA_HANDOFF_STORY0)) return LECTURA_HANDOFF_STORY0;
  return ids.find((id) => unread(id)) || null;
}

/**
 * Once, under the first Cenzontle win, when Lectura has not started this
 * session or story-0 is still incomplete. `handoffSeen` is the persisted gate.
 */
export function shouldShowLecturaHandoff({
  session,
  handoffSeen,
  lecturaStartedThisSession,
  story0Claimed,
  storyId,
} = {}) {
  if (handoffSeen) return false;
  if (!isFirstCenzontleWin(session)) return false;
  if (lecturaStartedThisSession && story0Claimed) return false;
  if (!storyId) return false;
  return true;
}

/** Page log already has the once seen-event. Survives a StrictMode remount. */
export function lecturaHandoffSeenLogged(bus) {
  const target = bus || (typeof window !== "undefined" ? window : null);
  const log = target?.[FUNNEL_LOG];
  return Array.isArray(log) && log.some((entry) => entry?.event === FUNNEL_EVENTS.lecturaHandoffSeen);
}
