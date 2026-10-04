import { PAYWALL_SOURCE, paywallHeadlineFor } from "./paywallHeadline.js";

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

assert(paywallHeadlineFor(es, PAYWALL_SOURCE.lecturaBirdHandoff, false) === "La historia sigue.", "ES cliffhanger stays La historia sigue. with no story start");
assert(paywallHeadlineFor(es, PAYWALL_SOURCE.lecturaBirdHandoff, true) === "La historia sigue.", "ES cliffhanger stays La historia sigue. after a story start");
assert(paywallHeadlineFor(en, PAYWALL_SOURCE.lecturaBirdHandoff, false) === "The story goes on.", "EN cliffhanger ignores a missing story start");
assert(paywallHeadlineFor(en, PAYWALL_SOURCE.lecturaBirdHandoff, true) === "The story goes on.", "EN cliffhanger ignores a stored story start");

for (const source of Object.values(PAYWALL_SOURCE)) {
  if (source === PAYWALL_SOURCE.lecturaBirdHandoff) continue;
  assert(paywallHeadlineFor(es, source, true) === "Hay mucho más por leer.", `ES ${source} keeps the cleared line once a story is started`);
  assert(paywallHeadlineFor(en, source, true) === "There's much\u00A0more to read.", `EN ${source} keeps the cleared line once a story is started`);
  assert(paywallHeadlineFor(es, source, false) === "Hay mucho por leer.", `ES ${source} with no story uses the shorter line`);
  assert(paywallHeadlineFor(en, source, false) === "There's a lot to read.", `EN ${source} with no story uses the shorter line`);
  assert(paywallHeadlineFor(es, source, false) !== "Hay mucho más por leer.", `ES ${source} no-story line is not the cleared line`);
  assert(paywallHeadlineFor(en, source) === "There's a lot to read.", `EN ${source} omitted start is no story`);
}

assert(paywallHeadlineFor(es, "boot", false) === "Hay mucho por leer.", "boot with no story is the shorter line");
assert(paywallHeadlineFor(es, "boot", true) === "Hay mucho más por leer.", "boot after a story start keeps the cleared line");
assert(paywallHeadlineFor(en, undefined, true) === "There's much\u00A0more to read.", "missing source with a story start keeps the cleared line");
assert(en.paywallHeadlineFallback.charCodeAt(en.paywallHeadlineFallback.indexOf("more") - 1) === 0x00A0, "cleared EN line keeps the non-breaking space");
assert(en.paywallHeadlineNoStory === "There's a lot to read.", "no-story EN line is the cleared shorter sentence");
assert(en.paywallHeadlineNoStory.endsWith("."), "no-story EN line keeps the period");
assert(en.paywallHeadlineNoStory.charCodeAt(en.paywallHeadlineNoStory.indexOf("s") - 1) === 0x27, "no-story EN line keeps the straight apostrophe");

console.log("paywallHeadline.test.js ok");
