/**
 * Lectura Q2/Q3 (Varys cold walk, Oct 21): at 360x640 the story quote above the next
 * question can run ~9 lines, which leaves every answer below the fold. After an answer,
 * land the scroll so the next question's answers are in view, keeping as much of
 * the quote as fits and never pushing the prompt under the brand bar.
 * Returns the target scrollY, or null when an answer is already in view.
 */
export function quizNextAnswersScrollY({ scrollY, viewportTop, viewportHeight, promptTop, firstChoiceBottom, lastChoiceBottom, margin = 12 }) {
  const fold = viewportHeight - margin;
  if (firstChoiceBottom <= fold && promptTop >= viewportTop) return null;
  const toAll = lastChoiceBottom - fold;
  const promptCap = promptTop - (viewportTop + margin);
  const delta = Math.min(toAll, promptCap);
  if (!(delta > 0)) return null;
  return Math.round(scrollY + delta);
}

/** Wait after the tap so the answer's own green/red and why card register before the page moves. */
export const QUIZ_NEXT_SCROLL_DELAY_MS = 450;
