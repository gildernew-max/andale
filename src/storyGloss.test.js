import { GLOSS_ALIASES, STORY_GLOSSES, lookupGloss, normalizeGlossToken, resolveGlossKey } from "./storyGloss.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(STORY_GLOSSES.cosecha.en === "harvest", "cosecha EN is George harvest");
assert(STORY_GLOSSES.cosecha.es === "la recolección de ese año", "cosecha ES is George lock");
assert(Object.keys(STORY_GLOSSES).length === 1, "only cosecha until George table lands");

for (const [key, row] of Object.entries(STORY_GLOSSES)) {
  assert(row && typeof row.en === "string" && row.en.length > 0, `${key}: en`);
  assert(typeof row.es === "string" && row.es.length > 0, `${key}: es`);
}

assert(normalizeGlossToken("Cosecha,") === "cosecha", "strip case + punct");
assert(normalizeGlossToken("«cosecha»") === "cosecha", "strip quotes");
assert(resolveGlossKey("cosecha") === "cosecha", "lemma resolves");
assert(resolveGlossKey("Cosecha.") === "cosecha", "punctuated lemma resolves");
assert(resolveGlossKey("cosechas") === "cosecha", "plural alias → cosecha");
assert(GLOSS_ALIASES.cosechas === "cosecha", "alias table is extendable");
assert(resolveGlossKey("cerezas") === null, "unstamped cerezas is not invented");
assert(resolveGlossKey("ladera") === null, "unstamped ladera is not invented");
assert(resolveGlossKey("mesa") === null, "unmapped word is not invented");
assert(lookupGloss("cosecha", "en").gloss === "harvest", "lookup EN");
assert(lookupGloss("cosecha", "es").gloss === "la recolección de ese año", "lookup ES");
assert(lookupGloss("COSECHA!", "en").key === "cosecha", "lookup ignores case/punct");
assert(lookupGloss("cosechas", "en").gloss === "harvest", "alias inherits lemma gloss");
assert(lookupGloss("cosechando", "en") === null, "unstamped inflected form stays off");
assert(lookupGloss("una", "en") === null, "unknown → null");
assert(lookupGloss("", "en") === null, "empty → null");
assert(lookupGloss("de", "es") === null, "function word stays unglossed");

console.log("ok: story gloss map — George cosecha lock; lookup follows uiLang");
