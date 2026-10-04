/** Open-source ids for the paywall sheet. Routing is unchanged; the id only picks the headline. */
export const PAYWALL_SOURCE = {
  lecturaBirdHandoff: "lectura-bird-handoff",
  boot: "boot",
  brandHome: "brand-home",
  winContinue: "win-continue",
  sessionClose: "session-close",
  cubetas: "cubetas",
  hangman: "hangman",
  matchPairs: "match-pairs",
  memory: "memory",
  dialogue: "dialogue",
  flashcards: "flashcards",
  gamesHub: "games-hub",
  snake: "snake",
  safeRisky: "safe-risky",
  jeopardy: "jeopardy",
  storyClose: "story-close",
  lessonQuit: "lesson-quit",
  hearts: "hearts",
  rival: "rival",
};

/**
 * Story headline only when the sheet opens from the Lectura hook Continuar.
 * Every other source uses the cleared fallback once a story start is stored,
 * and the shorter line when lecturaStartedFromProgress is false.
 * lecturaStarted is that same boolean the wall gate passes as lecturaStartedStored.
 */
export function paywallHeadlineFor(copy, source, lecturaStarted = false) {
  if (source === PAYWALL_SOURCE.lecturaBirdHandoff) return copy?.paywallHeadline;
  return lecturaStarted ? copy?.paywallHeadlineFallback : copy?.paywallHeadlineNoStory;
}
