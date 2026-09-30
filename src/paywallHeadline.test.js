import { PAYWALL_SOURCE, paywallHeadlineFor } from "./paywallHeadline.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const es = {
  paywallHeadline: "La historia sigue.",
  paywallHeadlineFallback: "Hay mucho más por leer.",
};
const en = {
  paywallHeadline: "The story goes on.",
  paywallHeadlineFallback: "There's much\u00A0more to read.",
};

assert(paywallHeadlineFor(es, PAYWALL_SOURCE.lecturaBirdHandoff) === "La historia sigue.", "ES hook source keeps the story headline");
assert(paywallHeadlineFor(en, PAYWALL_SOURCE.lecturaBirdHandoff) === "The story goes on.", "EN hook source keeps the story headline");

for (const source of Object.values(PAYWALL_SOURCE)) {
  if (source === PAYWALL_SOURCE.lecturaBirdHandoff) continue;
  assert(paywallHeadlineFor(es, source) === "Hay mucho más por leer.", `ES ${source} uses the fallback headline`);
  assert(paywallHeadlineFor(en, source) === "There's much\u00A0more to read.", `EN ${source} uses the fallback headline`);
}

assert(paywallHeadlineFor(es, "boot") === "Hay mucho más por leer.", "boot is a fallback source");
assert(paywallHeadlineFor(en, undefined) === "There's much\u00A0more to read.", "missing source is the fallback headline");

console.log("paywallHeadline.test.js ok");
