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
