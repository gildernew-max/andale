/** George-stamped one-line glosses for Lectura + story Qs.
 *  Add `{ en, es }` under the Spanish lemma. Only mapped words glow.
 *  Aliases map inflected forms to a lemma. Do not invent a dictionary.
 *
 *  First lock: cosecha. Next stamps (wire when George sends exact lines):
 *  cerezas, cereza, ladera, mimbre, cooperativa, comercio justo, roya,
 *  heladas, independencia, …
 */
import { uiText } from "./practiceI18n.js";

export const STORY_GLOSSES = {
  cosecha: { en: "harvest", es: "la recolección de ese año" },
};

/** Inflected form → lemma already in STORY_GLOSSES. */
export const GLOSS_ALIASES = {
  cosechas: "cosecha",
};

export function normalizeGlossToken(raw) {
  return String(raw ?? "").toLowerCase().replace(/[^a-záéíóúüñ]/gi, "");
}

export function resolveGlossKey(raw) {
  const clean = normalizeGlossToken(raw);
  if (!clean) return null;
  if (STORY_GLOSSES[clean]) return clean;
  const alias = GLOSS_ALIASES[clean];
  if (alias && STORY_GLOSSES[alias]) return alias;
  return null;
}

/** One-line gloss for uiLang, or null when the word is not stamped. */
export function lookupGloss(raw, lang) {
  const key = resolveGlossKey(raw);
  if (!key) return null;
  const entry = STORY_GLOSSES[key];
  const gloss = uiText(entry, lang === "en" ? "en" : "es");
  if (!gloss) return null;
  return { key, gloss, entry };
}

export function splitGlossTokens(text) {
  return String(text ?? "").split(/(\s+)/);
}
