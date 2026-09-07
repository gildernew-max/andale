/** George-stamped one-line glosses for Lectura + story Qs.
 *  Add `{ en, es }` under the Spanish lemma (space-separated for phrases).
 *  Only mapped words glow. Aliases map inflected forms to a lemma.
 *  Do not invent a dictionary.
 */
import { uiText } from "./practiceI18n.js";

export const STORY_GLOSSES = {
  cosecha: { en: "harvest", es: "la recolección de ese año" },
  cerezas: { en: "coffee cherries (the fruit)", es: "el fruto del café (no la fruta de postre)" },
  cereza: { en: "coffee cherry", es: "el fruto del café" },
  ladera: { en: "mountainside", es: "la pendiente de la montaña" },
  mimbre: { en: "wicker", es: "mimbre (tejido de varas)" },
  canasta: { en: "basket", es: "canasta / cesto" },
  lote: { en: "batch", es: "el lote (todo el café junto)" },
  cooperativa: { en: "cooperative", es: "la cooperativa (de productores)" },
  "comercio justo": { en: "fair trade", es: "comercio justo (certificación)" },
  orgullo: { en: "pride", es: "orgullo" },
  independencia: { en: "independence", es: "independencia" },
  premium: { en: "premium (high price)", es: "precio premium (alto)" },
  roya: { en: "coffee rust (a fungus)", es: "la roya (hongo del café)" },
  heladas: { en: "frosts", es: "las heladas" },
  tzotzil: { en: "Tzotzil (Maya people / language)", es: "tzotzil (pueblo / lengua maya)" },
  recolecta: { en: "harvests (picks)", es: "recoge / cosecha a mano" },
  recolectado: { en: "harvested", es: "cosechado / recogido" },
  condescendiente: { en: "condescending", es: "condescendiente" },
  excelencia: { en: "excellence (Cup of Excellence)", es: "excelencia (concurso de café)" },
  portada: { en: "cover (of a book)", es: "la portada" },
  hojeó: { en: "leafed through", es: "hojeó (pasó las páginas)" },
  hongo: { en: "fungus", es: "hongo" },
  altitudes: { en: "altitudes", es: "altitudes / alturas" },
};

/** Inflected form → lemma already in STORY_GLOSSES. */
export const GLOSS_ALIASES = {
  cosechas: "cosecha",
};

export function normalizeGlossToken(raw) {
  return String(raw ?? "").toLowerCase().replace(/[^a-záéíóúüñ]/gi, "");
}

function phraseKeyFromRaw(raw) {
  const words = String(raw ?? "").trim().split(/\s+/).map(normalizeGlossToken).filter(Boolean);
  if (words.length < 2) return null;
  const phrase = words.join(" ");
  return STORY_GLOSSES[phrase] ? phrase : null;
}

export function resolveGlossKey(raw) {
  const phrase = phraseKeyFromRaw(raw);
  if (phrase) return phrase;
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

function phraseSpecs() {
  return Object.keys(STORY_GLOSSES)
    .filter((key) => key.includes(" "))
    .map((key) => ({ key, words: key.split(/\s+/) }))
    .sort((a, b) => b.words.length - a.words.length);
}

function matchPhraseAt(tokens, i) {
  for (const { key, words } of phraseSpecs()) {
    let raw = "";
    let idx = i;
    let ok = true;
    for (let w = 0; w < words.length; w += 1) {
      if (w > 0) {
        if (idx >= tokens.length || !/^\s+$/.test(tokens[idx])) { ok = false; break; }
        raw += tokens[idx];
        idx += 1;
      }
      if (idx >= tokens.length || normalizeGlossToken(tokens[idx]) !== words[w]) {
        ok = false;
        break;
      }
      raw += tokens[idx];
      idx += 1;
    }
    if (ok) return { key, raw, next: idx };
  }
  return null;
}

/** Word/phrase segments. Phrases stay one target (e.g. comercio justo). */
export function segmentGlossText(text) {
  const tokens = splitGlossTokens(text);
  const parts = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^\s+$/.test(tok) || !tok) {
      parts.push({ raw: tok, key: null });
      i += 1;
      continue;
    }
    const phrase = matchPhraseAt(tokens, i);
    if (phrase) {
      parts.push({ raw: phrase.raw, key: phrase.key });
      i = phrase.next;
      continue;
    }
    parts.push({ raw: tok, key: resolveGlossKey(tok) });
    i += 1;
  }
  return parts;
}
