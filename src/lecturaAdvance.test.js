import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  LECTURA_NEXT_BOTTOM,
  LECTURA_NEXT_GAP,
  LECTURA_NEXT_HEIGHT,
  LECTURA_STILL_BAND_WIDTH,
  LECTURA_STILL_CAP_HEIGHT,
  LECTURA_STORY_OPEN_STILL_TOP,
  lecturaAdvanceScrollY,
  lecturaClaimScrollY,
  lecturaLinesAboveNext,
  lecturaCheckpointAnswerClears,
  lecturaCheckpointAnswerScrollY,
  lecturaNextBottomCss,
  lecturaNextButtonTop,
  lecturaNextClearanceCss,
  lecturaNextClearancePx,
  lecturaNextRowTop,
  lecturaGlossBlocksNext,
  lecturaNextPinStyle,
  LECTURA_NEXT_Z,
  LECTURA_WORD_SHEET_HOST_Z,
  LECTURA_WORD_SHEET_Z,
  lecturaQuestionsOpenScrollY,
  lecturaStillAtLeast16x9,
  lecturaStillBandHeight,
  lecturaStickyHeaderBottom,
  lecturaStoryOpenTextTop,
} from "./lecturaAdvance.js";

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

const stillBand = lecturaStillBandHeight();
assert(Math.abs(stillBand - 111) < 0.001, "16:9 crop of the old 148px cap is a 111px band");
assert(stillBand < LECTURA_STILL_CAP_HEIGHT, "the story-open still is shorter than the old cap");
assert(lecturaStillAtLeast16x9(LECTURA_STILL_BAND_WIDTH, stillBand), "the band is not thinner than 16:9");
assert(!lecturaStillAtLeast16x9(LECTURA_STILL_BAND_WIDTH, stillBand - 1), "a shorter band would be thinner than 16:9");
assert(lecturaNextBottomCss() === "calc(16px + env(safe-area-inset-bottom))", "NEXT uses the onboarding CTA bottom inset");
assert(LECTURA_NEXT_BOTTOM === 16 && LECTURA_NEXT_GAP === 12, "NEXT pin keeps the 16px inset and 12px gap");
assert(lecturaNextClearancePx() === 92, "page pad is the pin row plus 12px above it");
assert(lecturaNextClearanceCss() === "calc(92px + env(safe-area-inset-bottom))", "story column clears the pin with 12px above the row");
assert(lecturaNextRowTop(640) === 560 && lecturaNextRowTop(844) === 764, "pin row top sits 12px above the buttons");
const answerOnPin = 1000;
assert(lecturaCheckpointAnswerScrollY({ answerBottom: answerOnPin, scrollY: 0, viewportHeight: 640 }) === 452, "360x640 scroll parks the answer 12px above the row");
assert(lecturaCheckpointAnswerClears({
  answerDocBottom: answerOnPin,
  documentHeight: answerOnPin + lecturaNextClearancePx(),
  viewportHeight: 640,
}), "padding alone lets the last checkpoint answer clear the pin at 360x640");
assert(!lecturaCheckpointAnswerClears({
  answerDocBottom: answerOnPin,
  documentHeight: answerOnPin + lecturaNextClearancePx() - 12,
  viewportHeight: 640,
}), "12px less padding leaves the last answer under the pin");
assert(lecturaCheckpointAnswerClears({
  answerDocBottom: 1060.6,
  documentHeight: 1511 - 80 + lecturaNextClearancePx(),
  viewportHeight: 640,
}), "story-0 paragraph 1 at 360x640 can scroll its last answer clear");
const pin = lecturaNextPinStyle("#F6EFE4");
assert(pin.position === "fixed" && pin.bottom === 0 && pin.paddingBottom === lecturaNextBottomCss() && pin.paddingTop === 12, "the band reaches the viewport edge and keeps the 16px inset as padding");
assert(pin.marginBottom === 0 && pin.display === "flex" && pin.gap === 10, "NEXT row keeps the button gap; margin would add to the 16px inset");
assert(pin.backgroundColor === "#F6EFE4" && pin.backgroundImage === "none" && pin.boxShadow === "none" && pin.borderTop === "none", "light band is solid page color, no shadow, no gradient, no hairline");
const darkPin = lecturaNextPinStyle("#15171C", "#2A2E36");
assert(darkPin.backgroundColor === "#15171C" && darkPin.backgroundImage === "none" && darkPin.boxShadow === "none", "dark band is solid page color");
assert(darkPin.borderTop === "1px solid #2A2E36" && darkPin.paddingTop === 11, "dark hairline replaces 1px of the gap so the row top stays put");
assert(LECTURA_WORD_SHEET_Z > LECTURA_NEXT_Z && LECTURA_WORD_SHEET_HOST_Z > LECTURA_WORD_SHEET_Z, "gloss sheet and its host paint above the pin");
assert(lecturaGlossBlocksNext(LECTURA_WORD_SHEET_Z) && lecturaGlossBlocksNext(LECTURA_WORD_SHEET_HOST_Z), "an open gloss sheet takes the tap");
assert(!lecturaGlossBlocksNext(LECTURA_NEXT_Z), "the pin does not block itself");
assert(appSrc.includes("lecturaNextPinStyle(D.bg, theme === \"dark\" ? D.line : undefined)"), "dark NEXT row gets the D.line hairline");
assert(appSrc.includes("zIndex: LECTURA_WORD_SHEET_Z") && appSrc.includes("zIndex: sheetBlocksAnswers ? LECTURA_WORD_SHEET_HOST_Z : \"auto\""), "gloss sheet stacking uses the shared constants");
const textTop = lecturaStoryOpenTextTop(stillBand);
assert(Math.abs(textTop - (LECTURA_STORY_OPEN_STILL_TOP + stillBand + 12)) < 0.001, "paragraph text starts under the cropped still");
for (const [width, height] of [[360, 640], [390, 844]]) {
  const buttonTop = lecturaNextButtonTop(height);
  assert(buttonTop > 0 && buttonTop + LECTURA_NEXT_HEIGHT === height - 16, `${width}x${height} NEXT sits 16px above the bottom`);
  assert(lecturaLinesAboveNext({ textTop, viewportHeight: height }) >= 2, `${width}x${height} keeps at least two Spanish lines above NEXT`);
}
assert(appSrc.includes("lecturaNextPinStyle(D.bg,"), "NEXT row uses the shared pin");
assert(appSrc.includes("lecturaNextClearanceCss()"), "story column pads for the pin");
assert(appSrc.includes('aspectRatio: "16 / 9"'), "still crop is 16:9");
assert(appSrc.includes("advanceLectura(paraIdx + 1)"), "NEXT click still advances");
assert(appSrc.includes("lecturaAdvanceScrollY"), "advance scroll math is unchanged");
assert(appSrc.includes("lecturaQuestionsOpenScrollY") && appSrc.includes("lecturaClaimScrollY"), "questions and claim scroll stay");

console.log("ok: lectura advance scroll + NEXT placement");
