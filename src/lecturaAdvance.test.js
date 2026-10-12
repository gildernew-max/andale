import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { lecturaAdvanceScrollY, lecturaClaimScrollY, lecturaQuestionsOpenScrollY, lecturaStickyHeaderBottom } from "./lecturaAdvance.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const here = dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");

assert(lecturaAdvanceScrollY({ paragraphTop: 820, scrollY: 900, headerBottom: 72 }) === 1648, "paragraph top meets the header bottom");
assert(lecturaAdvanceScrollY({ paragraphTop: 72, scrollY: 200, headerBottom: 72 }) === 200, "already at the readable top stays put");
assert(lecturaAdvanceScrollY({ paragraphTop: -200, scrollY: 800, headerBottom: 64 }) === 536, "a paragraph above the fold comes back to the readable top");
assert(lecturaAdvanceScrollY({ paragraphTop: 10, scrollY: 0, headerBottom: 64 }) === 0, "does not scroll above the document");
assert(lecturaAdvanceScrollY({}) === 0, "missing measures stay at the top");
assert(lecturaAdvanceScrollY({ paragraphTop: Number.NaN, scrollY: 40 }) === 40, "a bad paragraph measure keeps the current scroll");

const chain = {
  style: { position: "" },
  parentElement: {
    style: { position: "sticky" },
    parentElement: null,
    getBoundingClientRect: () => ({ bottom: 78 }),
  },
  getBoundingClientRect: () => ({ bottom: 12 }),
};
assert(lecturaStickyHeaderBottom(chain) === 78, "sticky ancestor supplies the readable top");
assert(lecturaStickyHeaderBottom(null) === 0, "missing header does not invent an inset");

assert(lecturaQuestionsOpenScrollY({ headerTop: 135, scrollY: 596, viewportTop: 56 }) === 675, "comprehension header top meets the brand bar");
assert(lecturaQuestionsOpenScrollY({ headerTop: 56, scrollY: 400, viewportTop: 56 }) === 400, "a header already under the brand bar stays put");
assert(lecturaQuestionsOpenScrollY({ scrollY: 12 }) === 12, "a missing header measure keeps the current scroll");
assert(lecturaQuestionsOpenScrollY({ headerTop: 10, scrollY: 0, viewportTop: 64 }) === 0, "does not scroll the questions above the document");

assert(lecturaClaimScrollY({ claimTop: 900, claimBottom: 990, scrollY: 400, viewportHeight: 640, viewportTop: 56 }) === 762, "a claim below the fold scrolls until it sits fully above the fold");
assert(lecturaClaimScrollY({ claimTop: 200, claimBottom: 290, scrollY: 400, viewportHeight: 844, viewportTop: 56 }) === 400, "a claim already fully visible does not move");
assert(lecturaClaimScrollY({ claimTop: 20, claimBottom: 110, scrollY: 500, viewportHeight: 640, viewportTop: 56 }) === 464, "a claim under the brand bar comes back into view");
assert(lecturaClaimScrollY({ claimTop: 80, claimBottom: 900, scrollY: 100, viewportHeight: 640, viewportTop: 56 }) === 124, "a claim taller than the readable area pins its top to the brand bar");
assert(lecturaClaimScrollY({ claimTop: 10, claimBottom: 40, scrollY: 0, viewportHeight: 360, viewportTop: 56 }) === 0, "claim scroll does not go above the document");
assert(lecturaClaimScrollY({ scrollY: 30, viewportHeight: 640 }) === 30, "a missing claim measure stays put");
assert(lecturaClaimScrollY({ claimTop: 900, claimBottom: 990, scrollY: 200, viewportHeight: 640, viewportTop: 56 }) === 562, "640-tall fold still fits the claim with a 12px margin");
assert(lecturaClaimScrollY({ claimTop: 900, claimBottom: 990, scrollY: 200, viewportHeight: 844, viewportTop: 56 }) === 358, "844-tall fold still fits the claim with a 12px margin");

const paraAt = appSrc.indexOf('data-testid={pi === 0 ? "lectura-paragraph-first" : "lectura-paragraph"}');
const advanceAt = appSrc.indexOf('data-testid="lectura-advance"');
const narrationAt = appSrc.indexOf('data-testid="narration-card"');
const huntAt = appSrc.indexOf('data-testid="word-hunt-card"');
assert(paraAt > 0 && advanceAt > paraAt, "NEXT row follows the paragraph");
assert(narrationAt > advanceAt && huntAt > narrationAt, "NEXT sits above narration and word hunt");
assert(appSrc.includes("lecturaAdvanceScrollY"), "advance scrolls with the readable-top math");
assert(appSrc.includes("lecturaQuestionsOpenScrollY"), "QUESTIONS open scrolls the comprehension header");
assert(appSrc.includes("lecturaClaimScrollY"), "a finished quiz scrolls the claim into view");
assert(appSrc.includes('data-testid="lectura-questions-header"'), "comprehension header is the questions scroll target");
assert(appSrc.includes('data-testid="lectura-claim"'), "claim block is the finished-quiz scroll target");
assert(!appSrc.includes("--lectura-brand-bottom"), "questions header does not use a brand-bottom CSS var");
const questionsHeaderTag = appSrc.slice(appSrc.indexOf('data-testid="lectura-questions-header"'), appSrc.indexOf('data-testid="lectura-questions-header"') + 220);
assert(!/sticky|background|zIndex/.test(questionsHeaderTag), "comprehension header wrapper has no sticky chrome");
assert(appSrc.includes("advanceLectura(paraIdx + 1)"), "NEXT uses the advance scroll");
assert(appSrc.includes("advanceLectura(paraIdx - 1)"), "Back uses the same advance scroll");
assert(/<Btn onClick=\{\(\) => advanceLectura\(paraIdx \+ 1\)\} style=\{\{ flex: 2 \}\}>/.test(appSrc), "NEXT keeps flex 2 and no extra style");
assert(/<Btn outline disabled=\{paraIdx === 0\} onClick=\{\(\) => advanceLectura\(paraIdx - 1\)\} style=\{\{ flex: 1 \}\}>/.test(appSrc), "Back keeps flex 1 and outline");
assert(/<nav aria-label=\{uiLang === "en" \? "Primary navigation" : "Navegación principal"\} style=\{\{ position: "fixed", bottom: 0,/.test(appSrc), "footer nav stays pinned to the bottom edge");

console.log("ok: lectura advance scroll + NEXT placement");
