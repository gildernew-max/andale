/** Story comprehension lifts wait until Lectura is claimed, then show the passage. */

import { uiText } from "./practiceI18n.js";

/** George stamp — quiet label only when the passage is on screen. */
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

export function storyQuizPassage(q) {
  const p = typeof q?.passage === "string" ? q.passage.trim() : "";
  return p;
}

/** Eyebrow only when a passage is visible. Authored `cue` wins over the George default. */
export function storyQuizCue(q, lang) {
  if (!storyQuizPassage(q)) return "";
  if (q?.cue != null && q.cue !== "") return uiText(q.cue, lang, "");
  if (q?._u === "_story" || q?.storyId) return storyQuizEyebrow(lang);
  return storyQuizEyebrow(lang);
}

/** Second line stays off unless `cueLine` is true or a stamped string. */
export function storyQuizCueLine(q, lang) {
  if (!storyQuizPassage(q)) return "";
  if (!q || q.cueLine == null || q.cueLine === false || q.cueLine === "") return "";
  if (q.cueLine === true) return uiText(STORY_QUIZ_CUE_LINE, lang);
  return uiText(q.cueLine, lang, "");
}

const fold = (s) => String(s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const bitsFrom = (s, min) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= min);

/** Relevant Lectura paragraph for a comprehension Q. Authored `passage` / `passageIndex` win. */
export function passageForStoryQuestion(story, storyQ) {
  if (typeof storyQ?.passage === "string" && storyQ.passage.trim()) return storyQ.passage.trim();
  const paras = Array.isArray(story?.paragraphs) ? story.paragraphs.filter((p) => String(p || "").trim()) : [];
  if (Number.isInteger(storyQ?.passageIndex) && paras[storyQ.passageIndex]) return paras[storyQ.passageIndex];
  if (!paras.length || !storyQ) return "";
  const bits = [...new Set([
    ...bitsFrom(storyQ.answer, 4),
    ...bitsFrom(storyQ.prompt, 5),
  ])];
  if (!bits.length) return paras[0];
  let best = 0;
  let bestScore = -1;
  paras.forEach((p, i) => {
    const hay = fold(p);
    let score = 0;
    bits.forEach((w) => { if (hay.includes(w)) score += w.length; });
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return paras[best] || "";
}

/**
 * Lift a Lectura comprehension item into a practice MC.
 * Prefer an authored Why/Focus; attach the matching passage so a week-old read can still find the answer.
 */
export function liftStoryQuizItem(storyQ, prompt, fallback = {}, story) {
  if (!storyQ) return null;
  const authored = storyQ.explain != null;
  const passage = passageForStoryQuestion(story, storyQ);
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
  if (passage) {
    item.passage = passage;
    item.cue = storyQ.cue != null && storyQ.cue !== "" ? storyQ.cue : STORY_QUIZ_CUE;
  }
  if (storyQ.cueLine != null && storyQ.cueLine !== false && storyQ.cueLine !== "") item.cueLine = storyQ.cueLine;
  return item;
}

/** Same lift, only after that story’s Lectura is done. Passage rides with the item. */
export function gatedLiftStoryQuiz(claimedStories, story, storyQ, prompt, fallback) {
  if (!story || !isStoryLecturaDone(claimedStories, story.id)) return null;
  const q = storyQ || story.questions?.[0];
  if (!q) return null;
  const item = liftStoryQuizItem(q, prompt, fallback, story);
  if (item) item.storyId = story.id;
  return item;
}

/** Daily / random lifts only from stories the learner has finished in Lectura. */
export function pickCompletedStory(stories, claimedStories, rand = Math.random) {
  const done = (stories || []).filter((st) => isStoryLecturaDone(claimedStories, st.id) && st.questions?.length);
  if (!done.length) return null;
  return done[Math.floor(rand() * done.length)];
}

/** Fisher–Yates — same algorithm as lesson MC / match tiles. Does not mutate the authored list. */
export function shuffleChoices(choices, rng = Math.random) {
  const a = Array.isArray(choices) ? [...choices] : [];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Session order for one Lectura story: comprehension Qs + in-paragraph checkpoints. */
export function shuffleStoryChoiceOrder(story, checkpoints = [], rng = Math.random) {
  return {
    storyId: story?.id || null,
    questions: (story?.questions || []).map((qq) => shuffleChoices(qq?.choices, rng)),
    checkpoints: (checkpoints || []).map((cp) => shuffleChoices(cp?.choices, rng)),
  };
}

/** Display list: session shuffle wins, then an attached shuffledChoices, then authored. */
export function storyQuestionChoices(qq, shuffledList) {
  if (Array.isArray(shuffledList) && shuffledList.length) return shuffledList;
  if (Array.isArray(qq?.shuffledChoices) && qq.shuffledChoices.length) return qq.shuffledChoices;
  return Array.isArray(qq?.choices) ? qq.choices : [];
}

/** Resolve a stored pick to the choice value. Index is into the displayed list, never authored [0]. */
export function selectedStoryChoice(qq, selected, shuffledList) {
  if (selected == null) return undefined;
  const shown = storyQuestionChoices(qq, shuffledList);
  if (typeof selected === "number") return shown[selected];
  return selected;
}

/** Correctness by value — the authored answer string — not by authored index. */
export function isStoryChoiceCorrect(qq, selected, shuffledList) {
  if (!qq) return false;
  return selectedStoryChoice(qq, selected, shuffledList) === qq.answer;
}
