/** Story comprehension lifts (Hoy / misión / rutina) wait until that story’s Lectura is claimed. */

import { uiText } from "./practiceI18n.js";

/** Lectura is done when the story XP was claimed (`prog.stories[id]`). */
export function isStoryLecturaDone(claimedStories, storyId) {
  return !!(storyId && claimedStories && claimedStories[storyId]);
}

/** George may stamp a short “from the story” cue. Empty until then — do not invent copy. */
export function storyQuizCue(q, lang) {
  if (!q || q.cue == null || q.cue === "") return "";
  return uiText(q.cue, lang, "");
}

/**
 * Lift a Lectura comprehension item into a practice MC.
 * Prefer an authored Why/Focus on the story question; otherwise use the caller fallback.
 * Optional `cue` is passed through if George stamped one.
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
  };
  if (storyQ.cue != null && storyQ.cue !== "") item.cue = storyQ.cue;
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
