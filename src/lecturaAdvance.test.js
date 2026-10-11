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

assert(lecturaQuestionsOpenScrollY({ headerTop: 135, headerHeight: 80, q1Top: 491, scrollY: 596, viewportTop: 56 }) === 951, "Q1 meets the bottom of the stuck comprehension header");
assert(lecturaQuestionsOpenScrollY({ headerTop: 56, headerHeight: 80, q1Top: 136, scrollY: 400, viewportTop: 56 }) === 400, "header and Q1 already stacked stay put");
assert(lecturaQuestionsOpenScrollY({ headerTop: 200, headerHeight: 70, scrollY: 40, viewportTop: 56 }) === 184, "missing Q1 still parks the header at the readable top");
assert(lecturaQuestionsOpenScrollY({ scrollY: 12 }) === 12, "missing questions measures keep the current scroll");
assert(lecturaQuestionsOpenScrollY({ q1Top: 10, headerHeight: 80, scrollY: 0, viewportTop: 64 }) === 0, "does not scroll the questions above the document");

assert(lecturaClaimScrollY({ claimTop: 900, claimBottom: 990, scrollY: 400, viewportHeight: 640, viewportTop: 136 }) === 762, "a claim below the fold scrolls until it sits fully above the fold");
assert(lecturaClaimScrollY({ claimTop: 200, claimBottom: 290, scrollY: 400, viewportHeight: 844, viewportTop: 136 }) === 400, "a claim already fully visible does not move");
assert(lecturaClaimScrollY({ claimTop: 20, claimBottom: 110, scrollY: 500, viewportHeight: 640, viewportTop: 136 }) === 384, "a claim under the stuck header comes back down into view");
assert(lecturaClaimScrollY({ claimTop: 80, claimBottom: 900, scrollY: 100, viewportHeight: 640, viewportTop: 136 }) === 44, "a claim taller than the readable area pins its top");
assert(lecturaClaimScrollY({ claimTop: 10, claimBottom: 40, scrollY: 0, viewportHeight: 360, viewportTop: 56 }) === 0, "claim scroll does not go above the document");
assert(lecturaClaimScrollY({ scrollY: 30, viewportHeight: 640 }) === 30, "a missing claim measure stays put");
assert(lecturaClaimScrollY({ claimTop: 900, claimBottom: 990, scrollY: 200, viewportHeight: 640, viewportTop: 136 }) === 562, "640-tall fold still fits the claim");
assert(lecturaClaimScrollY({ claimTop: 900, claimBottom: 990, scrollY: 200, viewportHeight: 844, viewportTop: 136 }) === 358, "844-tall fold still fits the claim");

const paraAt = appSrc.indexOf('data-testid={pi === 0 ? "lectura-paragraph-first" : "lectura-paragraph"}');
const advanceAt = appSrc.indexOf('data-testid="lectura-advance"');
const narrationAt = appSrc.indexOf('data-testid="narration-card"');
const huntAt = appSrc.indexOf('data-testid="word-hunt-card"');
assert(paraAt > 0 && advanceAt > paraAt, "NEXT row follows the paragraph");
assert(narrationAt > advanceAt && huntAt > narrationAt, "NEXT sits above narration and word hunt");
assert(appSrc.includes("lecturaAdvanceScrollY"), "advance scrolls with the readable-top math");
assert(appSrc.includes("lecturaQuestionsOpenScrollY"), "QUESTIONS open scrolls the header and Q1");
assert(appSrc.includes("lecturaClaimScrollY"), "a finished quiz scrolls the claim into view");
assert(appSrc.includes('data-testid="lectura-questions-header"'), "comprehension header is the questions scroll target");
assert(appSrc.includes('data-testid="lectura-claim"'), "claim block is the finished-quiz scroll target");
assert(/data-testid="lectura-questions-header" style=\{\{ position: "sticky"/.test(appSrc), "comprehension header sticks under the brand bar");
assert(appSrc.includes("advanceLectura(paraIdx + 1)"), "NEXT uses the advance scroll");
assert(appSrc.includes("advanceLectura(paraIdx - 1)"), "Back uses the same advance scroll");
assert(/<Btn onClick=\{\(\) => advanceLectura\(paraIdx \+ 1\)\} style=\{\{ flex: 2 \}\}>/.test(appSrc), "NEXT keeps flex 2 and no extra style");
assert(/<Btn outline disabled=\{paraIdx === 0\} onClick=\{\(\) => advanceLectura\(paraIdx - 1\)\} style=\{\{ flex: 1 \}\}>/.test(appSrc), "Back keeps flex 1 and outline");
assert(/<nav aria-label=\{uiLang === "en" \? "Primary navigation" : "Navegación principal"\} style=\{\{ position: "fixed", bottom: 0,/.test(appSrc), "footer nav stays pinned to the bottom edge");

console.log("ok: lectura advance scroll + NEXT placement");
