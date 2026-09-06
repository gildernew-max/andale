import { GLOSS_ALIASES, STORY_GLOSSES, lookupGloss, normalizeGlossToken, resolveGlossKey } from "./storyGloss.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(STORY_GLOSSES.cosecha.en === "harvest", "cosecha EN is harvest");
assert(STORY_GLOSSES.cosecha.es === "recolección", "cosecha ES is a short paraphrase");
assert(typeof STORY_GLOSSES.cerezas.en === "string" && STORY_GLOSSES.cerezas.en.length > 0, "cerezas EN");
assert(typeof STORY_GLOSSES.cerezas.es === "string" && STORY_GLOSSES.cerezas.es.length > 0, "cerezas ES");

for (const [key, row] of Object.entries(STORY_GLOSSES)) {
  assert(row && typeof row.en === "string" && row.en.length > 0, `${key}: en`);
  assert(typeof row.es === "string" && row.es.length > 0, `${key}: es`);
}

assert(normalizeGlossToken("Cosecha,") === "cosecha", "strip case + punct");
assert(normalizeGlossToken("«cerezas»") === "cerezas", "strip quotes");
assert(resolveGlossKey("cosecha") === "cosecha", "lemma resolves");
assert(resolveGlossKey("Cosecha.") === "cosecha", "punctuated lemma resolves");
assert(resolveGlossKey("cosechas") === "cosecha", "plural alias → cosecha");
assert(GLOSS_ALIASES.cosechas === "cosecha", "alias table is extendable");
assert(resolveGlossKey("mesa") === null, "unmapped word is not invented");
assert(resolveGlossKey("the") === null, "EN filler is not invented");
assert(lookupGloss("cosecha", "en").gloss === "harvest", "lookup EN");
assert(lookupGloss("cosecha", "es").gloss === "recolección", "lookup ES");
assert(lookupGloss("COSECHA!", "en").key === "cosecha", "lookup ignores case/punct");
assert(lookupGloss("cosechas", "en").gloss === "harvest", "alias inherits lemma gloss");
assert(lookupGloss("cosechando", "en").gloss === "harvesting", "inflected stamp stays its own row");
assert(lookupGloss("una", "en") === null, "unknown → null");
assert(lookupGloss("", "en") === null, "empty → null");
assert(lookupGloss("de", "es") === null, "function word stays unglossed");

console.log(`ok: story gloss map — ${Object.keys(STORY_GLOSSES).length} stamps; lookup follows uiLang`);
