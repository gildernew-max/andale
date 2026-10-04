/** Cenzontle → Lectura retention handoff. Once after the first Cenzontle win. Soft chrome parked. */

export const LECTURA_HANDOFF_SEEN = "lecturaHandoffSeen";

export const LECTURA_HANDOFF_QUIET = {
  es: "El cuento es lo que sigue.",
  en: "The story is what\u2019s next.",
};

export const LECTURA_HANDOFF_CTA = {
  es: "Leer el cuento",
  en: "Read the story",
};

export function lecturaHandoffQuiet(lang) {
  return lang === "en" ? LECTURA_HANDOFF_QUIET.en : LECTURA_HANDOFF_QUIET.es;
}

export function lecturaHandoffCta(lang) {
  return lang === "en" ? LECTURA_HANDOFF_CTA.en : LECTURA_HANDOFF_CTA.es;
}

/** Quiet Cenzontle win: Hoy / Doctora / story-0 / later Lectura. Not a plain lesson. */
export function isCenzontleWin(session) {
  if (!session || typeof session !== "object") return false;
  return !!(session.firstHoy || session.firstDoctora || session.firstStory0 || session.lecturaWin);
}

/**
 * story-0 when it is unread; otherwise the next unread story in list order.
 * Unread = XP not claimed (`stories[id]` unset).
 */
export function nextUnreadStory(stories, claimed) {
  const list = Array.isArray(stories) ? stories : [];
  const done = claimed && typeof claimed === "object" ? claimed : {};
  return list.find((story) => story?.id && !done[story.id]) || null;
}

/**
 * Claimed stories stay open for a re-read.
 * Otherwise only the first unread story is open — later stories stay closed.
 */
export function isLecturaStoryOpen(stories, claimed, storyId) {
  if (!storyId) return false;
  const done = claimed && typeof claimed === "object" ? claimed : {};
  if (done[storyId]) return true;
  return nextUnreadStory(stories, done)?.id === storyId;
}

/** Handoff CTA: the open unread story. Never a locked id. */
export function lecturaHandoffTarget(stories, claimed) {
  const next = nextUnreadStory(stories, claimed);
  if (!next || !isLecturaStoryOpen(stories, claimed, next.id)) return null;
  return next;
}

/**
 * Camino shows one story per section: the first story with that section index.
 * Later stories in the same section are off the path.
 */
function caminoShowsStory(stories, sectionCount, storyId) {
  const list = Array.isArray(stories) ? stories : [];
  const n = Number.isFinite(sectionCount) && sectionCount > 0 ? sectionCount : 0;
  for (let si = 0; si < n; si += 1) {
    if (list.find((story) => story?.section === si)?.id === storyId) return true;
  }
  return false;
}

/**
 * The open unread story when the Camino path does not already show it.
 * Null when the frontier is a path node, locked, or missing.
 * Open/locked rules stay in isLecturaStoryOpen — this never returns a locked id.
 */
export function nextOffPathStory(stories, claimed, sectionCount) {
  const next = nextUnreadStory(stories, claimed);
  if (!next?.id || !isLecturaStoryOpen(stories, claimed, next.id)) return null;
  if (caminoShowsStory(stories, sectionCount, next.id)) return null;
  return next;
}

/** Persist on the first Cenzontle win so the strip cannot return. */
export function shouldStampLecturaHandoff({ handoffSeen, session, ready = true } = {}) {
  if (!ready || handoffSeen) return false;
  return isCenzontleWin(session);
}

/**
 * Show once, on that first win, when Lectura has not started this session
 * or story-0 is still incomplete, and an unread story exists.
 */
export function shouldShowLecturaHandoff({
  handoffSeen,
  session,
  lecturaStarted,
  story0Claimed,
  hasUnread,
  ready = true,
} = {}) {
  if (!shouldStampLecturaHandoff({ handoffSeen, session, ready })) return false;
  if (lecturaStarted && story0Claimed) return false;
  if (!hasUnread) return false;
  return true;
}
