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
 * The floor is 12px above the viewport bottom. A safe-area inset and a pinned
 * NEXT or footer band raise that floor so the block stays clear of both.
 * A fractional overflow rounds up so the margin cannot land short of 12px.
 */
export function lecturaClaimScrollY({
  claimTop,
  claimBottom,
  scrollY = 0,
  viewportHeight,
  viewportTop = 0,
  bottomGap = 12,
  safeAreaBottom = 0,
  bandTop = null,
} = {}) {
  const y = Number.isFinite(Number(scrollY)) ? Number(scrollY) : 0;
  const top = Number(claimTop);
  const bottom = Number(claimBottom);
  const vh = Number(viewportHeight);
  const inset = Number.isFinite(Number(viewportTop)) ? Math.max(0, Number(viewportTop)) : 0;
  const gap = Number.isFinite(Number(bottomGap)) ? Math.max(0, Number(bottomGap)) : 0;
  const safe = Number.isFinite(Number(safeAreaBottom)) ? Math.max(0, Number(safeAreaBottom)) : 0;
  let floor = vh - gap - safe;
  if (bandTop != null && Number.isFinite(Number(bandTop))) floor = Math.min(floor, Number(bandTop) - gap);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || !Number.isFinite(vh) || floor <= inset) return Math.max(0, y);
  const height = bottom - top;
  if (!(height > 0)) return Math.max(0, y);
  if (height >= floor - inset) return Math.max(0, y + top - inset);
  if (top < inset) return Math.max(0, y + top - inset);
  if (bottom > floor) return Math.max(0, Math.ceil((y + bottom - floor) - 1e-9));
  return Math.max(0, y);
}

/** Pixels of env(safe-area-inset-bottom). Zero when the inset is unsupported. */
export function lecturaSafeAreaBottom() {
  if (typeof document === "undefined" || !document.body) return 0;
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom);pointer-events:none;visibility:hidden;";
  document.body.appendChild(probe);
  let px = 0;
  try {
    const cssH = getComputedStyle(probe).height || "";
    const match = /^(\d+(\.\d+)?)px$/.exec(cssH);
    px = match ? Number(match[1]) : probe.getBoundingClientRect().height;
  } catch (e) {
    px = 0;
  }
  probe.remove();
  return Number.isFinite(px) ? Math.max(0, px) : 0;
}

/**
 * Top of a pinned bottom band that would cover the claim card: the Lectura
 * NEXT row, or the home footer. Null when neither is on screen.
 */
export function lecturaPinnedBandTop(viewportHeight) {
  if (typeof document === "undefined") return null;
  const vh = Number(viewportHeight);
  const nodes = [
    document.querySelector("[data-testid='lectura-advance']"),
    document.querySelector("[data-testid='app-shell'] > nav"),
  ];
  let top = null;
  for (const node of nodes) {
    if (!node) continue;
    let pos = "";
    try { pos = getComputedStyle(node).position || ""; } catch (e) { pos = ""; }
    if (!pos && node.style) pos = node.style.position || "";
    if (pos !== "fixed" && pos !== "sticky" && pos !== "-webkit-sticky") continue;
    const rect = node.getBoundingClientRect();
    if (!Number.isFinite(rect.top) || !(rect.height > 0)) continue;
    if (Number.isFinite(vh) && (rect.top >= vh || rect.bottom <= 0)) continue;
    top = top == null ? rect.top : Math.min(top, rect.top);
  }
  return top;
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
/** NEXT ink while an open gloss sheet starts too low to cover the pin. */
export const LECTURA_NEXT_HELD_OPACITY = 0.4;
export const LECTURA_WORD_SHEET_Z = 30;
export const LECTURA_WORD_SHEET_HOST_Z = 31;
/** Portaled reach. Above the checkpoint host so the card paint is not trapped in that box. */
export const LECTURA_SHEET_REACH_Z = 32;
export const LECTURA_PARAGRAPH_FONT = 17;
export const LECTURA_PARAGRAPH_LEADING = 1.75;

/** Old 4:3 cap (1152×864 at 148px tall). The open band stays shorter than this. */
export const LECTURA_STILL_CAP_HEIGHT = 148;
/** Story-open still. 160px wide at 16:9 is a 90px band, never thinner. */
export const LECTURA_STILL_BAND_WIDTH = 160;
/** Thinnest crop allowed. The 160px band is exactly this ratio. */
export const LECTURA_STILL_BAND_RATIO = 16 / 9;
export const LECTURA_STILL_MARGIN_BOTTOM = 8;

/**
 * Scroll-0 distance from the viewport top to the still on story open
 * (sticky brand bar through the paragraph card's top border and padding).
 * Measured at 360×640 and 390×844; the title block is the same height at both.
 */
export const LECTURA_STORY_OPEN_STILL_TOP = 312.4;

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
 * Viewport y of the definition's top edge. `bottom` is the distance from
 * the viewport bottom to the definition's bottom edge.
 */
export function lecturaSheetTop({ viewportHeight, bottom, height } = {}) {
  const vh = Number(viewportHeight);
  const edge = Number(bottom);
  const h = Number(height);
  if (!Number.isFinite(vh) || !Number.isFinite(edge) || !Number.isFinite(h)) return null;
  return vh - edge - h;
}

/**
 * Stretching the sheet downward covers the pinned row only when the
 * definition already starts above that row. A top on or below the row
 * leaves NEXT visible above the sheet.
 */
export function lecturaSheetCanReachBottom({ sheetTop, pinTop } = {}) {
  if (sheetTop == null || pinTop == null) return false;
  const top = Number(sheetTop);
  const pin = Number(pinTop);
  return Number.isFinite(top) && Number.isFinite(pin) && top < pin;
}

/**
 * The gloss card from the definition's top through the bottom safe area.
 * Sides are flush and the bottom corners are square, so the pin cannot
 * show beside or below the sheet. The top accent stays.
 */
export function lecturaSheetReachStyle({ top, background, accent }) {
  return {
    position: "fixed",
    left: 0,
    right: 0,
    top,
    bottom: 0,
    width: "100%",
    zIndex: LECTURA_SHEET_REACH_Z,
    boxSizing: "border-box",
    background,
    backgroundImage: "none",
    borderLeft: "none",
    borderRight: "none",
    borderBottom: "none",
    borderTop: `3px solid ${accent}`,
    borderRadius: "14px 14px 0 0",
    boxShadow: "0 8px 24px rgba(0,0,0,.16)",
    maxHeight: "none",
    overflowY: "auto",
    pointerEvents: "auto",
  };
}
