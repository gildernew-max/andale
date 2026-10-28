/** Open-source ids for the paywall sheet. Routing is unchanged; the id only picks the headline. */
export const PAYWALL_SOURCE = {
  lecturaBirdHandoff: "lectura-bird-handoff",
  boot: "boot",
  brandHome: "brand-home",
  winContinue: "win-continue",
  sessionClose: "session-close",
  cubetas: "cubetas",
  hangman: "hangman",
  dialogue: "dialogue",
  flashcards: "flashcards",
  gamesHub: "games-hub",
  snake: "snake",
  safeRisky: "safe-risky",
  storyClose: "story-close",
  lessonQuit: "lesson-quit",
  hearts: "hearts",
  rival: "rival",
  lockedStory: "locked-story",
};

/** One config value for the Lectura cliffhanger bird that opens the story headline. */
export const PAYWALL_BIRD_TRIGGER = PAYWALL_SOURCE.lecturaBirdHandoff;

/**
 * Story headline only when the sheet opens from the Lectura cliffhanger bird.
 * Every other path uses the much-more line. lecturaStarted is ignored.
 */
export function paywallHeadlineFor(copy, source) {
  if (source === PAYWALL_BIRD_TRIGGER) return copy?.paywallHeadline;
  return copy?.paywallHeadlineFallback;
}
