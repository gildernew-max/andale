/**
 * Lectura NEXT / paragraph advance.
 * The new paragraph's top meets the sticky header's bottom — the top of the
 * readable area. The pinned NEXT row is not part of this scroll math.
 */
import { ONBOARDING_CTA_BOTTOM, ONBOARDING_CTA_CONTENT_GAP, onboardingCtaBottomCss } from "./onboarding.js";

export function lecturaAdvanceScrollY({ paragraphTop, scrollY = 0, headerBottom = 0 } = {}) {
  const top = Number(paragraphTop);
  const y = Number(scrollY);
  const header = Number(headerBottom);
  const base = Number.isFinite(y) ? y : 0;
  if (!Number.isFinite(top)) return Math.max(0, base);
  const inset = Number.isFinite(header) ? Math.max(0, header) : 0;
  return Math.max(0, base + top - inset);
}

/**
 * QUESTIONS open. The comprehension header's top meets the brand bar's bottom.
 * Q1 stays in the page under that header. No stuck chrome.
 */
export function lecturaQuestionsOpenScrollY({ headerTop, scrollY = 0, viewportTop = 0 } = {}) {
  return lecturaAdvanceScrollY({ paragraphTop: headerTop, scrollY, headerBottom: viewportTop });
}

/**
 * Once every question is answered, scroll so the claim block is fully inside
 * the readable viewport. The readable top is the brand bar only.
 * Already fully visible: stay put. Taller than the readable area: pin its top.
 */
export function lecturaClaimScrollY({
  claimTop,
  claimBottom,
  scrollY = 0,
  viewportHeight,
  viewportTop = 0,
  bottomGap = 12,
} = {}) {
  const y = Number.isFinite(Number(scrollY)) ? Number(scrollY) : 0;
  const top = Number(claimTop);
  const bottom = Number(claimBottom);
  const vh = Number(viewportHeight);
  const inset = Number.isFinite(Number(viewportTop)) ? Math.max(0, Number(viewportTop)) : 0;
  const gap = Number.isFinite(Number(bottomGap)) ? Math.max(0, Number(bottomGap)) : 0;
  const floor = vh - gap;
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || !Number.isFinite(vh) || floor <= inset) return Math.max(0, y);
  const height = bottom - top;
  if (!(height > 0)) return Math.max(0, y);
  if (height >= floor - inset) return Math.max(0, y + top - inset);
  if (top < inset) return Math.max(0, y + top - inset);
  if (bottom > floor) return Math.max(0, y + bottom - floor);
  return Math.max(0, y);
}

/** Bottom edge of the sticky bar that holds the brand lockup, in viewport px. */
export function lecturaStickyHeaderBottom(start) {
  let node = start || null;
  while (node) {
    const inline = node.style && node.style.position;
    let computed = "";
    try {
      computed = getComputedStyle(node).position;
    } catch (e) {
      computed = "";
    }
    if (inline === "sticky" || computed === "sticky" || computed === "-webkit-sticky") {
      const bottom = node.getBoundingClientRect().bottom;
      return Number.isFinite(bottom) ? bottom : 0;
    }
    node = node.parentElement;
  }
  return 0;
}

/** Same bottom inset and 12px content gap as the onboarding CTA pin. */
export const LECTURA_NEXT_BOTTOM = ONBOARDING_CTA_BOTTOM;
export const LECTURA_NEXT_GAP = ONBOARDING_CTA_CONTENT_GAP;
/** Measured Lectura Btn row: 13px pad + Nunito 800 line + 13px pad + 4px lip. */
export const LECTURA_NEXT_HEIGHT = 52;
/** Pin stacking. The gloss sheet and its checkpoint host sit above this. */
export const LECTURA_NEXT_Z = 11;
/**
 * Page-colored band over the pin while a gloss sheet is open.
 * Above the pin, below the sheet (30) and the checkpoint host (31),
 * so the right-edge sliver cannot take a tap and the checkpoint stays put.
 */
export const LECTURA_NEXT_COVER_Z = 12;
export const LECTURA_WORD_SHEET_Z = 30;
export const LECTURA_WORD_SHEET_HOST_Z = 31;
export const LECTURA_PARAGRAPH_FONT = 17;
export const LECTURA_PARAGRAPH_LEADING = 1.75;

/** 4:3 stills (1152×864) were capped at 148px tall. Story open keeps that width. */
export const LECTURA_STILL_CAP_HEIGHT = 148;
export const LECTURA_STILL_BAND_WIDTH = LECTURA_STILL_CAP_HEIGHT * (1152 / 864);
/** Thinnest crop allowed. At the old cap width the band is exactly 111px tall. */
export const LECTURA_STILL_BAND_RATIO = 16 / 9;
export const LECTURA_STILL_MARGIN_BOTTOM = 12;

/**
 * Scroll-0 distance from the viewport top to the still on story open
 * (sticky brand bar through the paragraph card's top border and padding).
 * Measured at 360×640 and 390×844; the title does not wrap, so it matches.
 */
export const LECTURA_STORY_OPEN_STILL_TOP = 340.4;

export function lecturaNextBottomCss() {
  return onboardingCtaBottomCss();
}

/**
 * Page pad under the story column. The pin row is gap + buttons + the 16px
 * inset. One more gap lets the lowest box, including a checkpoint answer,
 * scroll to 12px above that row instead of stopping flush with it.
 */
export function lecturaNextClearancePx(safeAreaBottom = 0) {
  const safe = Number(safeAreaBottom);
  const inset = Number.isFinite(safe) ? Math.max(0, safe) : 0;
  return LECTURA_NEXT_GAP + LECTURA_NEXT_HEIGHT + LECTURA_NEXT_BOTTOM + LECTURA_NEXT_GAP + inset;
}

export function lecturaNextClearanceCss() {
  const px = lecturaNextClearancePx(0);
  return `calc(${px}px + env(safe-area-inset-bottom))`;
}

/** Top of the pinned row. The row's own 12px pad sits above the buttons. */
export function lecturaNextRowTop(viewportHeight, safeAreaBottom = 0) {
  return lecturaNextButtonTop(viewportHeight, safeAreaBottom) - LECTURA_NEXT_GAP;
}

export function lecturaStillBandHeight(width = LECTURA_STILL_BAND_WIDTH) {
  const w = Number(width);
  if (!(w > 0)) return 0;
  return (w * 9) / 16;
}

export function lecturaStillAtLeast16x9(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!(w > 0) || !(h > 0)) return false;
  return h + 0.01 >= (w * 9) / 16;
}

/** Top edge of the NEXT buttons. The 12px gap sits above this, inside the pin. */
export function lecturaNextButtonTop(viewportHeight, safeAreaBottom = 0) {
  const vh = Number(viewportHeight);
  const safe = Number(safeAreaBottom);
  if (!Number.isFinite(vh)) return 0;
  const inset = LECTURA_NEXT_BOTTOM + (Number.isFinite(safe) ? Math.max(0, safe) : 0);
  return vh - inset - LECTURA_NEXT_HEIGHT;
}

/**
 * Scroll that parks a checkpoint answer 12px above the pinned row.
 * answerBottom is a viewport coordinate. Already clear: stay put.
 */
export function lecturaCheckpointAnswerScrollY({
  answerBottom,
  scrollY = 0,
  viewportHeight,
  safeAreaBottom = 0,
} = {}) {
  const y = Number.isFinite(Number(scrollY)) ? Number(scrollY) : 0;
  const bottom = Number(answerBottom);
  const rowTop = lecturaNextRowTop(viewportHeight, safeAreaBottom);
  if (!Number.isFinite(bottom) || !Number.isFinite(rowTop)) return Math.max(0, y);
  const limit = rowTop - LECTURA_NEXT_GAP;
  if (bottom <= limit) return Math.max(0, y);
  return Math.max(0, y + bottom - limit);
}

/** True when max scroll can put the answer 12px above the pinned row. */
export function lecturaCheckpointAnswerClears({
  answerDocBottom,
  documentHeight,
  viewportHeight,
  safeAreaBottom = 0,
} = {}) {
  const answer = Number(answerDocBottom);
  const doc = Number(documentHeight);
  const vh = Number(viewportHeight);
  if (!Number.isFinite(answer) || !Number.isFinite(doc) || !Number.isFinite(vh)) return false;
  const maxScroll = Math.max(0, doc - vh);
  const y = lecturaCheckpointAnswerScrollY({
    answerBottom: answer,
    scrollY: 0,
    viewportHeight: vh,
    safeAreaBottom,
  });
  return y <= maxScroll + 0.5;
}

/** How many paragraph lines sit fully above the pin, leaving the 12px gap. */
export function lecturaLinesAboveNext({
  textTop,
  viewportHeight,
  safeAreaBottom = 0,
  lineHeight = LECTURA_PARAGRAPH_FONT * LECTURA_PARAGRAPH_LEADING,
} = {}) {
  const limit = lecturaNextButtonTop(viewportHeight, safeAreaBottom) - LECTURA_NEXT_GAP;
  const top = Number(textTop);
  const line = Number(lineHeight);
  if (!Number.isFinite(limit) || !Number.isFinite(top) || !(line > 0)) return 0;
  return Math.max(0, Math.floor((limit - top) / line + 1e-9));
}

export function lecturaStoryOpenTextTop(stillHeight = lecturaStillBandHeight()) {
  return LECTURA_STORY_OPEN_STILL_TOP + stillHeight + LECTURA_STILL_MARGIN_BOTTOM;
}

/**
 * True when the gloss sheet's stacking context paints above the pin,
 * so a tap on the sheet cannot land on NEXT.
 */
export function lecturaGlossBlocksNext(sheetZ, pinZ = LECTURA_NEXT_Z) {
  const sheet = Number(sheetZ);
  const pin = Number(pinZ);
  return Number.isFinite(sheet) && Number.isFinite(pin) && sheet > pin;
}

/**
 * Solid page-color band. The box itself runs to the viewport edge, so the
 * 16px inset is background, not a shadow. `line` is the dark hairline only.
 * Button faces keep their own ink. Aligned to the 600px story column.
 */
export function lecturaNextPinStyle(background, line) {
  const hairline = typeof line === "string" && line.length > 0;
  return {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: LECTURA_NEXT_Z,
    display: "flex",
    gap: 10,
    marginBottom: 0,
    paddingTop: hairline ? LECTURA_NEXT_GAP - 1 : LECTURA_NEXT_GAP,
    paddingBottom: lecturaNextBottomCss(),
    paddingLeft: "max(20px, calc(50% - 280px))",
    paddingRight: "max(20px, calc(50% - 280px))",
    backgroundColor: background,
    backgroundImage: "none",
    boxSizing: "border-box",
    boxShadow: "none",
    borderTop: hairline ? `1px solid ${line}` : "none",
  };
}

/** Height of the pinned row, including the 16px inset and the safe area. */
export function lecturaNextPinHeightPx() {
  return LECTURA_NEXT_GAP + LECTURA_NEXT_HEIGHT + LECTURA_NEXT_BOTTOM;
}

/**
 * Solid page-color cover for the pinned row. Same fill as the pin, no
 * border, shadow, or extra chrome. It only exists while a gloss sheet is open.
 */
export function lecturaNextCoverStyle(background) {
  return {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    height: `calc(${lecturaNextPinHeightPx()}px + env(safe-area-inset-bottom))`,
    zIndex: LECTURA_NEXT_COVER_Z,
    backgroundColor: background,
    backgroundImage: "none",
    boxSizing: "border-box",
    boxShadow: "none",
    border: "none",
    pointerEvents: "auto",
  };
}
