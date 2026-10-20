/** Cleared Lectura still for the story page the learner stopped on.
 *  Questions (an index past the last paragraph) use that last story page.
 *  Null when there is no story page — the paywall keeps the centered bird. */
export function paywallStillPath(story, pageIndex) {
  const pages = story?.paragraphs;
  if (!story?.id || !Array.isArray(pages) || pages.length === 0) return null;
  if (!Number.isInteger(pageIndex) || pageIndex < 0) return null;
  const last = pages.length - 1;
  const idx = pageIndex > last ? last : pageIndex;
  return `lectura/${story.id}/p${idx}.png`;
}

/** Hero still for the paywall band when there is no story page (Hand option 1, Oct 20). */
export const PAYWALL_HERO_PATH = "stills/paywall-hero-bird.jpg";
export const PAYWALL_HERO_ALT = {
  es: "Un cenzontle sobre un libro abierto lleno de historias de México.",
  en: "A mockingbird perched on an open book full of stories from Mexico.",
};

/** What the 248x140 band shows. The learner's story page wins (alt=""), then the hero
 *  with alt text by language, then nothing (centered 44px bird). */
export function paywallBandImage({ storyRel, storyMiss = false, heroMiss = false, lang = "es" } = {}) {
  if (storyRel && !storyMiss) return { kind: "story", rel: storyRel, alt: "" };
  if (!heroMiss) return { kind: "hero", rel: PAYWALL_HERO_PATH, alt: lang === "en" ? PAYWALL_HERO_ALT.en : PAYWALL_HERO_ALT.es };
  return null;
}
