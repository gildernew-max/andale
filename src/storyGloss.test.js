import { GLOSS_ALIASES, STORY_GLOSSES, lookupGloss, normalizeGlossToken, resolveGlossKey, segmentGlossText } from "./storyGloss.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const GEORGE = {
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

assert(Object.keys(STORY_GLOSSES).length === Object.keys(GEORGE).length, "table size is George lock");
for (const [key, row] of Object.entries(GEORGE)) {
  assert(STORY_GLOSSES[key]?.en === row.en, `${key} EN`);
  assert(STORY_GLOSSES[key]?.es === row.es, `${key} ES`);
}

assert(normalizeGlossToken("Cosecha,") === "cosecha", "strip case + punct");
assert(resolveGlossKey("cosecha") === "cosecha", "lemma resolves");
assert(resolveGlossKey("Cosecha.") === "cosecha", "punctuated lemma resolves");
assert(resolveGlossKey("cosechas") === "cosecha", "plural alias → cosecha");
assert(GLOSS_ALIASES.cosechas === "cosecha", "alias table is extendable");
assert(resolveGlossKey("comercio justo") === "comercio justo", "phrase lemma");
assert(resolveGlossKey("Comercio justo,") === "comercio justo", "punctuated phrase");
assert(resolveGlossKey("comercio") === null, "comercio alone is not invented");
assert(resolveGlossKey("justo") === null, "justo alone is not invented");
assert(resolveGlossKey("mesa") === null, "unmapped word is not invented");
assert(lookupGloss("cosecha", "en").gloss === "harvest", "lookup EN");
assert(lookupGloss("cosecha", "es").gloss === "la recolección de ese año", "lookup ES");
assert(lookupGloss("cerezas", "en").gloss === "coffee cherries (the fruit)", "cerezas EN");
assert(lookupGloss("cerezas", "es").gloss === "el fruto del café (no la fruta de postre)", "cerezas ES");
assert(lookupGloss("comercio justo", "en").gloss === "fair trade", "phrase EN");
assert(lookupGloss("comercio justo,", "es").gloss === "comercio justo (certificación)", "phrase ES");
assert(lookupGloss("hojeó", "en").gloss === "leafed through", "accented lemma");
assert(lookupGloss("cosechando", "en") === null, "unstamped inflected form stays off");
assert(lookupGloss("una", "en") === null, "unknown → null");

const segs = segmentGlossText("sobre el comercio justo, una etiqueta");
const phrase = segs.find((s) => s.key === "comercio justo");
assert(phrase && /comercio\s+justo/.test(phrase.raw), "segment keeps comercio justo together");
assert(!segs.some((s) => s.key === "comercio" || s.key === "justo"), "phrase parts are not separate targets");

console.log(`ok: story gloss map — ${Object.keys(STORY_GLOSSES).length} George stamps; lookup follows uiLang`);
