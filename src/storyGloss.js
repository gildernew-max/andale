/** George-stamped one-line glosses for Lectura + story Qs.
 *  Add `{ en, es }` under the Spanish lemma. Only mapped words glow.
 *  Aliases map inflected forms to a lemma. Do not invent a dictionary.
 */
import { uiText } from "./practiceI18n.js";

/** Key cerezas words + room for later stamps. */
export const STORY_GLOSSES = {
  cosecha: { en: "harvest", es: "recolección" },
  cosechando: { en: "harvesting", es: "recogiendo la cosecha" },
  cereza: { en: "coffee cherry", es: "fruto del café" },
  cerezas: { en: "coffee cherries", es: "frutos del café" },
  recolecta: { en: "harvests", es: "recoge" },
  recolectado: { en: "harvested", es: "recogido" },
  mimbre: { en: "wicker", es: "tejido de varas" },
  ladera: { en: "hillside", es: "pendiente del cerro" },
  tzotzil: { en: "Tzotzil Maya", es: "pueblo maya de Chiapas" },
  roya: { en: "coffee rust", es: "hongo del café" },
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
