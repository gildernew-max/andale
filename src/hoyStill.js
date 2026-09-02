/** Only still that ships today. Matches San Miguel / Noche de faroles. */
export const LANTERN_STILL = "stills/sma-lanterns.png";

const haystack = (scene) =>
  `${scene?.city || ""} ${scene?.title || ""} ${scene?.titleEn || ""}`.toLowerCase();

export function copyMatchesLanterns(scene) {
  const hay = haystack(scene);
  return /san miguel/.test(hay) && /farol|lantern/.test(hay);
}

export function stillIsLanterns(still) {
  return /sma-lanterns|lantern|farol/.test(String(still || "").toLowerCase());
}

/**
 * Wire a still only when it matches city/title.
 * Prefer the lantern asset when copy is San Miguel / faroles; drop a lying still.
 */
export function hoyStillFor(scene) {
  if (!scene) return null;
  const still = scene.still || null;
  if (copyMatchesLanterns(scene)) return still || LANTERN_STILL;
  if (stillIsLanterns(still)) return null;
  return still || null;
}
