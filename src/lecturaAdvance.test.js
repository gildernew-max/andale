import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  LECTURA_NEXT_BOTTOM,
  LECTURA_NEXT_GAP,
  LECTURA_NEXT_HEIGHT,
  LECTURA_STILL_BAND_HEIGHT,
  LECTURA_CARD_RADIUS,
  LECTURA_STILL_CARD_INSET,
  LECTURA_STILL_CARD_TOP_INSET,
  LECTURA_STILL_FOCUS,
  LECTURA_STILL_OBJECT_POSITION,
  LECTURA_STILL_CAP_HEIGHT,
  LECTURA_STILL_MARGIN_BOTTOM,
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
  lecturaNextPinHeightPx,
  lecturaNextPinStyle,
  lecturaSheetCanReachBottom,
  lecturaSheetReachStyle,
  lecturaSheetTop,
  LECTURA_NEXT_HELD_OPACITY,
  LECTURA_NEXT_Z,
  LECTURA_SHEET_REACH_Z,
  LECTURA_WORD_SHEET_HOST_Z,
  LECTURA_WORD_SHEET_Z,
  lecturaQuestionsOpenScrollY,
  LECTURA_GLOSS_DISMISS_MS,
  lecturaPointInRect,
  lecturaStillBandHeight,
  lecturaStillCornerRadius,
  lecturaStillObjectPosition,
  lecturaStillOuterWidth,
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
assert(lecturaClaimScrollY({ claimTop: 742.4, claimBottom: 834.4, scrollY: 1458, viewportHeight: 844, viewportTop: 56 }) === 1461, "a fractional overflow rounds up so the margin is not short of 12px");
assert(lecturaClaimScrollY({ claimTop: 700, claimBottom: 790, scrollY: 100, viewportHeight: 640, viewportTop: 56, safeAreaBottom: 34 }) === 296, "the safe-area inset lifts the claim 12px above the home indicator");
assert(lecturaClaimScrollY({ claimTop: 700, claimBottom: 790, scrollY: 100, viewportHeight: 640, viewportTop: 56, bandTop: 560 }) === 342, "a pinned NEXT or footer band keeps the claim 12px above the row");
assert(lecturaClaimScrollY({ claimTop: 400, claimBottom: 490, scrollY: 80, viewportHeight: 844, viewportTop: 56, bandTop: 764, safeAreaBottom: 34 }) === 80, "a claim already clear of the band and the safe area stays put");

const paraAt = appSrc.indexOf('data-testid={pi === 0 ? "lectura-paragraph-first" : "lectura-paragraph"}');
const advanceAt = appSrc.indexOf('data-testid="lectura-advance"');
const narrationAt = appSrc.indexOf('data-testid="narration-card"');
const huntAt = appSrc.indexOf('data-testid="word-hunt-card"');
assert(paraAt > 0 && advanceAt > paraAt, "NEXT row follows the paragraph");
assert(narrationAt > advanceAt && huntAt > narrationAt, "NEXT sits above narration and word hunt");
assert(appSrc.includes("lecturaAdvanceScrollY"), "advance scrolls with the readable-top math");
assert(appSrc.includes("lecturaQuestionsOpenScrollY"), "QUESTIONS open scrolls the comprehension header");
assert(appSrc.includes("lecturaClaimScrollY"), "a finished quiz scrolls the claim into view");
assert(/\[screen, paraIdx, ansSel, freshClaimId\]/.test(appSrc), "a fresh claim remeasures the XP-claimed card");
assert(appSrc.includes("lecturaSafeAreaBottom()") && appSrc.includes("lecturaPinnedBandTop(window.innerHeight)"), "the claimed card clears the safe area and any pinned NEXT or footer");
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
assert(LECTURA_STILL_BAND_HEIGHT === 90, "story-open still is a 90px band");
assert(stillBand === 90, "band height stays 90px at any column width");
assert(LECTURA_STILL_OBJECT_POSITION === "center 28%", "the default cover crop stays center 28%");
assert(LECTURA_STILL_CARD_INSET === 18, "the band bleeds through 16px padding and the 2px border");
assert(LECTURA_STILL_CARD_TOP_INSET === 10, "the band cancels the 8px top padding and the 2px top border");
assert(LECTURA_CARD_RADIUS === 16, "the band's top corners use the card's 16px radius");
assert(lecturaStillCornerRadius() === "16px 16px 0 0", "bottom corners of the band stay square");
assert(lecturaStillOuterWidth(284) === 320, "at 360px the still is the 320px card");
assert(lecturaStillOuterWidth(314) === 350, "at 390px the still is the 350px card");
assert(LECTURA_STILL_FOCUS["story-0"].length === 6, "story-0 has a face lock on every page");
assert(lecturaStillObjectPosition("story-0", 0) === "center 28%", "story-0 page 1 keeps the default face lock");
assert(lecturaStillObjectPosition("story-0", 1) === "center 36%", "story-0 market page drops the crop onto the girl");
assert(lecturaStillObjectPosition("story-0", 5) === "center 40%", "story-0 last page drops the crop onto the girl and the boy");
assert(lecturaStillObjectPosition("story-0", 2) === "center 28%" && lecturaStillObjectPosition("story-0", 3) === "center 28%" && lecturaStillObjectPosition("story-0", 4) === "center 28%", "the other story-0 pages keep center 28%");
assert(lecturaStillObjectPosition("story-3", 1) === "center 28%", "a story without overrides uses the default face lock");
assert(LECTURA_STILL_MARGIN_BOTTOM === 8, "still margin under the band is 8px");
assert(stillBand < LECTURA_STILL_CAP_HEIGHT, "the story-open still is shorter than the old 148px cap");
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
assert(lecturaNextPinHeightPx() === 80, "the pin row is gap + button + 16px inset");
assert(LECTURA_WORD_SHEET_HOST_Z > LECTURA_WORD_SHEET_Z && LECTURA_WORD_SHEET_Z > LECTURA_NEXT_Z, "the gloss sheet and its checkpoint host sit above the pin");
const floresTop = lecturaSheetTop({ viewportHeight: 640, bottom: 126.9, height: 205 });
assert(Math.abs(floresTop - 308.1) < 0.001, "sheet top is the definition's top edge");
assert(lecturaSheetCanReachBottom({ sheetTop: floresTop, pinTop: lecturaNextRowTop(640) }), "the 360x640 flores sheet starts above the pin and can cover it");
assert(lecturaSheetCanReachBottom({ sheetTop: 308, pinTop: 560 }), "a sheet above the pin covers the row");
assert(!lecturaSheetCanReachBottom({ sheetTop: 560, pinTop: 560 }), "a sheet that starts on the pin cannot cover it");
assert(!lecturaSheetCanReachBottom({ sheetTop: 592, pinTop: 560 }), "a sheet below the pin leaves NEXT visible");
assert(!lecturaSheetCanReachBottom({ sheetTop: null, pinTop: 560 }), "an unmeasured sheet does not claim the pin");
const reach = lecturaSheetReachStyle({ top: floresTop, background: "#FFFFFF", accent: "#CE82FF" });
assert(reach.position === "fixed" && reach.left === 0 && reach.right === 0 && reach.bottom === 0 && reach.width === "100%", "the open sheet runs full width to the viewport bottom");
assert(reach.top === floresTop && reach.background === "#FFFFFF" && reach.backgroundImage === "none", "the reach is the sheet card, from the definition down");
assert(reach.borderTop === "3px solid #CE82FF" && reach.borderLeft === "none" && reach.borderRight === "none" && reach.borderBottom === "none", "the top accent stays and the sides stay flush");
assert(reach.borderRadius === "14px 14px 0 0", "square bottom corners do not reveal the pin");
assert(reach.zIndex === LECTURA_SHEET_REACH_Z && LECTURA_SHEET_REACH_Z > LECTURA_WORD_SHEET_HOST_Z && reach.pointerEvents === "auto", "the reach paints above the checkpoint host and takes the NEXT tap");
assert(appSrc.includes("createPortal(node, document.body)"), "the full-width sheet is not clipped by the story column");
assert(LECTURA_NEXT_HELD_OPACITY === 0.4, "a sheet that cannot reach dims NEXT to 40%");
assert(appSrc.includes("if (wordSel) return"), "an open gloss sheet makes advance a no-op");
assert(LECTURA_GLOSS_DISMISS_MS === 150, "a Next tap dismisses the gloss sheet within 150ms");
const nextBox = { left: 152, top: 572, right: 340, bottom: 624, width: 188, height: 52 };
assert(lecturaPointInRect(246, 598, nextBox), "the center of NEXT counts as a Next tap");
assert(!lecturaPointInRect(20, 598, nextBox), "a point on Back is not a Next tap");
assert(!lecturaPointInRect(340, 598, nextBox), "the right edge is outside the Next box");
assert(appSrc.includes("onPointerUp={dismissGlossOnNextTap}"), "a tap on the covered NEXT dismisses the gloss sheet");
assert(appSrc.includes("glossNextDismissRef.current"), "the same gesture cannot advance after it dismisses the sheet");
assert(appSrc.includes("lecturaSheetReachStyle"), "the open gloss sheet uses the full-width reach");
assert(!appSrc.includes("lecturaNextCoverStyle") && !appSrc.includes("lectura-next-cover"), "the page-color cover is gone");
assert(appSrc.includes("opacity: LECTURA_NEXT_HELD_OPACITY") && appSrc.includes('transition: "none"'), "dimmed NEXT returns to full ink with no fade");
assert(appSrc.includes("lectura-next-held"), "an open sheet kills the NEXT press state");
assert(lecturaGlossBlocksNext(LECTURA_WORD_SHEET_Z) && lecturaGlossBlocksNext(LECTURA_WORD_SHEET_HOST_Z), "an open gloss sheet takes the tap");
assert(!lecturaGlossBlocksNext(LECTURA_NEXT_Z), "the pin does not block itself");
assert(appSrc.includes("lecturaNextPinStyle(D.bg, theme === \"dark\" ? D.line : undefined)"), "dark NEXT row gets the D.line hairline");
assert(appSrc.includes("zIndex: LECTURA_WORD_SHEET_Z") && appSrc.includes("zIndex: sheetBlocksAnswers ? LECTURA_WORD_SHEET_HOST_Z : \"auto\""), "gloss sheet stacking uses the shared constants");
const textTop = lecturaStoryOpenTextTop(stillBand);
assert(Math.abs(textTop - (LECTURA_STORY_OPEN_STILL_TOP + stillBand + LECTURA_STILL_MARGIN_BOTTOM)) < 0.001, "paragraph text starts under the cropped still");
assert(lecturaLinesAboveNext({ textTop, viewportHeight: 640 }) >= 5, "360x640 keeps at least five Spanish lines above NEXT");
for (const [width, height] of [[360, 640], [390, 844]]) {
  const buttonTop = lecturaNextButtonTop(height);
  assert(buttonTop > 0 && buttonTop + LECTURA_NEXT_HEIGHT === height - 16, `${width}x${height} NEXT sits 16px above the bottom`);
  assert(lecturaLinesAboveNext({ textTop, viewportHeight: height }) >= (height === 640 ? 5 : 2), `${width}x${height} keeps Spanish lines above NEXT`);
}
assert(appSrc.includes("lecturaNextPinStyle(D.bg,"), "NEXT row uses the shared pin");
assert(appSrc.includes("lecturaNextClearanceCss()"), "story column pads for the pin");
assert(appSrc.includes("height: LECTURA_STILL_BAND_HEIGHT") && appSrc.includes("objectPosition: lecturaStillObjectPosition(story.id, pi)"), "the story still is the 90px face band");
assert(appSrc.includes("LECTURA_STILL_CARD_INSET") && appSrc.includes("LECTURA_STILL_CARD_TOP_INSET") && appSrc.includes("borderRadius: lecturaStillCornerRadius()") && appSrc.includes("borderRadius: LECTURA_CARD_RADIUS"), "the still is the card's top edge and shares its corner radius");
assert(appSrc.includes('aspectRatio: "16 / 9"'), "the paywall still stays 16:9");
assert(appSrc.includes("advanceLectura(paraIdx + 1)"), "NEXT click still advances");
assert(appSrc.includes("lecturaAdvanceScrollY"), "advance scroll math is unchanged");
assert(appSrc.includes("lecturaQuestionsOpenScrollY") && appSrc.includes("lecturaClaimScrollY"), "questions and claim scroll stay");

console.log("ok: lectura advance scroll + NEXT placement");
