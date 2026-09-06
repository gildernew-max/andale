/** Story comprehension lifts (Hoy / misión / rutina) wait until that story’s Lectura is claimed. */

import { uiText } from "./practiceI18n.js";

/** George stamp — eyebrow only by default. */
export const STORY_QUIZ_CUE = {
  es: "Según el cuento",
  en: "From the story",
};

/** Optional second line. Off by default — do not render unless `cueLine` is set. */
export const STORY_QUIZ_CUE_LINE = {
  es: "Responde según lo que acabas de leer.",
  en: "Answer from what you just read.",
};

/** Lectura is done when the story XP was claimed (`prog.stories[id]`). */
export function isStoryLecturaDone(claimedStories, storyId) {
  return !!(storyId && claimedStories && claimedStories[storyId]);
}

export function storyQuizEyebrow(lang) {
  return uiText(STORY_QUIZ_CUE, lang);
}

/** Default George eyebrow on story lifts. Authored `cue` wins. Empty for non-story items. */
export function storyQuizCue(q, lang) {
  if (q?.cue != null && q.cue !== "") return uiText(q.cue, lang, "");
  if (q?._u === "_story" || q?.storyId) return storyQuizEyebrow(lang);
  return "";
}

/** Second line stays off unless `cueLine` is true or a stamped string. */
export function storyQuizCueLine(q, lang) {
  if (!q || q.cueLine == null || q.cueLine === false || q.cueLine === "") return "";
  if (q.cueLine === true) return uiText(STORY_QUIZ_CUE_LINE, lang);
  return uiText(q.cueLine, lang, "");
}

/**
 * Lift a Lectura comprehension item into a practice MC.
 * Prefer an authored Why/Focus on the story question; otherwise use the caller fallback.
 * Default cue is the George eyebrow; optional `cueLine` is not set.
 */
export function liftStoryQuizItem(storyQ, prompt, fallback = {}) {
  if (!storyQ) return null;
  const authored = storyQ.explain != null;
  const item = {
    type: "mc",
    prompt,
    choices: storyQ.choices,
    answer: storyQ.answer,
    explain: authored ? storyQ.explain : (fallback.es ?? fallback.explain ?? ""),
    explainEn: (typeof storyQ.explain === "object" && storyQ.explain?.en)
      || storyQ.explainEn
      || fallback.en
      || "",
    _u: "_story",
    _i: -1,
    skill: storyQ.skill || "Lectura",
    cue: storyQ.cue != null && storyQ.cue !== "" ? storyQ.cue : STORY_QUIZ_CUE,
  };
  if (storyQ.cueLine != null && storyQ.cueLine !== false && storyQ.cueLine !== "") item.cueLine = storyQ.cueLine;
  return item;
}

/** Same lift, but only after that story’s Lectura is done. No same-screen passage. */
export function gatedLiftStoryQuiz(claimedStories, story, storyQ, prompt, fallback) {
  if (!story || !isStoryLecturaDone(claimedStories, story.id)) return null;
  const q = storyQ || story.questions?.[0];
  if (!q) return null;
  const item = liftStoryQuizItem(q, prompt, fallback);
  if (item) item.storyId = story.id;
  return item;
}

/** Daily / random lifts only from stories the learner has finished in Lectura. */
export function pickCompletedStory(stories, claimedStories, rand = Math.random) {
  const done = (stories || []).filter((st) => isStoryLecturaDone(claimedStories, st.id) && st.questions?.length);
  if (!done.length) return null;
  return done[Math.floor(rand() * done.length)];
}
