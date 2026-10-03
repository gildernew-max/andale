/**
 * Optional Lectura paragraph files. A missing file is not audio.
 * Playback uses the file when the probe succeeds, otherwise device speech.
 * .m4a (AAC) plays in Chrome, Edge, Firefox, and Safari.
 */

export const STORY_AUDIO = Object.freeze({
  "story-0": Object.freeze([
    "audio/story-0-p0.m4a",
    "audio/story-0-p1.m4a",
    "audio/story-0-p2.m4a",
    "audio/story-0-p3.m4a",
    "audio/story-0-p4.m4a",
    "audio/story-0-p5.m4a",
  ]),
});

export function storyAudioPath(storyId, paragraphIndex) {
  const list = STORY_AUDIO[storyId];
  if (!list || paragraphIndex == null || paragraphIndex < 0) return null;
  return list[paragraphIndex] || null;
}

export function storyAudioUrl(storyId, paragraphIndex, base = "") {
  const rel = storyAudioPath(storyId, paragraphIndex);
  if (!rel) return null;
  const root = base && !base.endsWith("/") ? `${base}/` : (base || "");
  return `${root}${rel}`;
}

function looksLikeMedia(response) {
  if (!response || !response.ok) return false;
  const type = String(response.headers?.get?.("content-type") || "").toLowerCase();
  if (!type) return true;
  if (type.includes("text/html")) return false;
  return true;
}

/** True only when the paragraph file itself loads. A 404 hides the player. */
export async function probeAudioFile(url, fetchImpl = globalThis.fetch) {
  if (!url || typeof fetchImpl !== "function") return false;
  try {
    const head = await fetchImpl(url, { method: "HEAD" });
    if (looksLikeMedia(head)) return true;
    if (head && (head.status === 405 || head.status === 501)) {
      const get = await fetchImpl(url, { method: "GET" });
      return looksLikeMedia(get);
    }
    return false;
  } catch {
    return false;
  }
}
