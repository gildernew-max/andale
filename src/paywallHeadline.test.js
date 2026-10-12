import { PAYWALL_BIRD_TRIGGER, PAYWALL_SOURCE, paywallHeadlineFor } from "./paywallHeadline.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const es = {
  paywallHeadline: "La historia sigue.",
  paywallHeadlineFallback: "Hay mucho más por leer.",
  paywallHeadlineNoStory: "Hay mucho por leer.",
};
const en = {
  paywallHeadline: "The story goes on.",
  paywallHeadlineFallback: "There's much\u00A0more to read.",
  paywallHeadlineNoStory: "There's a lot to read.",
};

assert(PAYWALL_BIRD_TRIGGER === PAYWALL_SOURCE.lecturaBirdHandoff, "the bird trigger is the Lectura cliffhanger source");
assert(paywallHeadlineFor(es, PAYWALL_BIRD_TRIGGER, false) === "La historia sigue.", "ES cliffhanger stays La historia sigue.");
assert(paywallHeadlineFor(es, PAYWALL_SOURCE.lecturaBirdHandoff, true) === "La historia sigue.", "ES cliffhanger stays La historia sigue. after a story start");
assert(paywallHeadlineFor(en, PAYWALL_BIRD_TRIGGER, false) === "The story goes on.", "EN cliffhanger ignores a missing story start");
assert(paywallHeadlineFor(en, PAYWALL_SOURCE.lecturaBirdHandoff, true) === "The story goes on.", "EN cliffhanger ignores a stored story start");

for (const source of Object.values(PAYWALL_SOURCE)) {
  if (source === PAYWALL_BIRD_TRIGGER) continue;
  assert(paywallHeadlineFor(es, source, true) === "Hay mucho más por leer.", `ES ${source} uses the much-more line`);
  assert(paywallHeadlineFor(en, source, true) === "There's much\u00A0more to read.", `EN ${source} uses the much-more line`);
  assert(paywallHeadlineFor(es, source, false) === "Hay mucho más por leer.", `ES ${source} with no story still uses the much-more line`);
  assert(paywallHeadlineFor(en, source, false) === "There's much\u00A0more to read.", `EN ${source} with no story still uses the much-more line`);
  assert(paywallHeadlineFor(es, source, false) !== "Hay mucho por leer.", `ES ${source} does not use the shorter line`);
  assert(paywallHeadlineFor(en, source) === "There's much\u00A0more to read.", `EN ${source} omitted start is still the much-more line`);
}

assert(paywallHeadlineFor(es, "boot", false) === "Hay mucho más por leer.", "boot with no story is the much-more line");
assert(paywallHeadlineFor(es, "boot", true) === "Hay mucho más por leer.", "boot after a story start stays the much-more line");
assert(paywallHeadlineFor(en, undefined, true) === "There's much\u00A0more to read.", "missing source uses the much-more line");
assert(en.paywallHeadlineFallback.charCodeAt(en.paywallHeadlineFallback.indexOf("more") - 1) === 0x00A0, "much-more EN line keeps the non-breaking space");

console.log("paywallHeadline.test.js ok");
