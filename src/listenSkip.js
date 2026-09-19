/** Quiet Skip on gated Listen / dictation. Meeting-safe. Soft chrome parked.
 *  George + No face CLEAR — one uiLang face. Not L.skip (SALTAR / SKIP).
 */

export const LISTEN_SKIP = { es: "Saltar", en: "Skip" };
export const LISTEN_SKIP_HINT = { es: "Si no puedes oír", en: "If you can’t hear" };

export function listenSkipLabel(lang) {
  return lang === "en" ? LISTEN_SKIP.en : LISTEN_SKIP.es;
}

export function listenSkipHint(lang) {
  return lang === "en" ? LISTEN_SKIP_HINT.en : LISTEN_SKIP_HINT.es;
}

/** Dictation: the line is audio-only. MC / transform / Lectura stills keep their text. */
export function isAudioGatedStep(q) {
  return !!q && q.type === "listen";
}
