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
 * Where a new paragraph arrives. The «Paragraph n / N» counter sits just above the card; landing
 * the card top on the header bottom tucked the counter under the header. counterLift is the
 * counter's distance above the card (card offsetTop minus counter offsetTop). When it is known the
 * arrival target moves up by that much plus an 8px gap under the header, so the counter and the
 * first line both show. Without a counter (or no layout) it is the card top, as before.
 */
export function lecturaParagraphArrivalTop({ paragraphTop, counterLift, gap = 8 } = {}) {
  const top = Number(paragraphTop);
  if (!Number.isFinite(top)) return top;
  const lift = Number(counterLift);
  if (!Number.isFinite(lift) || !(lift > 0) || lift > 120) return top;
  const pad = Number.isFinite(Number(gap)) ? Math.max(0, Number(gap)) : 0;
  return top - lift - pad;
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

/**
 * After CLAIM on a story whose next step (the cliffhanger card with its Continue button) mounts
 * under the claim block: keep the claim visible as the claim scroll above does, then scroll
 * further down only as far as it takes to bring the card's bottom to the same 12px floor. The
 * claim's top never goes above the readable top. Without a card it is exactly lecturaClaimScrollY.
 */
export function lecturaClaimNextScrollY({ nextBottom, ...claim } = {}) {
  const base = lecturaClaimScrollY(claim);
  const y = Number.isFinite(Number(claim.scrollY)) ? Number(claim.scrollY) : 0;
  const top = Number(claim.claimTop);
  const bottom = Number(nextBottom);
  const vh = Number(claim.viewportHeight);
  if (!Number.isFinite(bottom) || !Number.isFinite(top) || !Number.isFinite(vh)) return base;
  const inset = Number.isFinite(Number(claim.viewportTop)) ? Math.max(0, Number(claim.viewportTop)) : 0;
  const gap = Number.isFinite(Number(claim.bottomGap)) ? Math.max(0, Number(claim.bottomGap)) : 12;
  const safe = Number.isFinite(Number(claim.safeAreaBottom)) ? Math.max(0, Number(claim.safeAreaBottom)) : 0;
  let floor = vh - gap - safe;
  if (claim.bandTop != null && Number.isFinite(Number(claim.bandTop))) floor = Math.min(floor, Number(claim.bandTop) - gap);
  if (floor <= inset) return base;
  const want = Math.ceil((y + bottom - floor) - 1e-9);
  const cap = Math.max(0, y + top - inset);
  return Math.max(base, Math.min(want, cap));
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
/** Story-open still. Full card width, fixed 90px, cover-cropped onto the faces. */
export const LECTURA_STILL_BAND_HEIGHT = 90;
/**
 * Default face lock. A 320×90 card band shows 324px of a 1152×864 still.
 * 28% keeps eyes and mouths in frame on the pages that are not overridden.
 */
export const LECTURA_STILL_OBJECT_POSITION = "center 28%";
/**
 * Card padding 16px plus the 2px border. The band bleeds sideways by this
 * much so a 360px viewport's 320px card is the still's width.
 */
export const LECTURA_STILL_CARD_INSET = 18;
/**
 * Card top padding 8px plus the 2px top border. The band uses this so it
 * sits on the card's top edge, with no padding above or beside it.
 */
export const LECTURA_STILL_CARD_TOP_INSET = 10;
/** Paragraph-card corner. The band's top corners use it; the bottom corners stay square. */
export const LECTURA_CARD_RADIUS = 16;
/**
 * Per-page object-position, set on the live 320×90 band.
 * story-0 pages 2 and 6 sit lower than the default: 36% and 40%.
 * Some later pages sit higher (26%, 24%, 22%, 18%, 14%) or lower (36%, 40%)
 * so the 90px band keeps eyes and lips whole. Omitted pages stay at the default.
 */
export const LECTURA_STILL_FOCUS = {
  "story-0": [
    "center 28%",
    "center 36%",
    "center 28%",
    "center 28%",
    "center 28%",
    "center 40%",
  ],
  "story-1": [
    "center 28%",
    "center 22%",
    "center 28%",
    "center 18%",
    "center 28%",
    "center 28%",
  ],
  "story-2": [
    "center 22%",
    "center 28%",
    "center 28%",
    "center 18%",
    "center 36%",
    "center 28%",
  ],
  "story-3": [
    "center 40%",
    "center 28%",
    "center 18%",
    "center 28%",
    "center 28%",
    "center 40%",
  ],
  "story-4": [
    "center 28%",
    "center 14%",
    "center 18%",
    "center 28%",
    "center 28%",
    "center 28%",
  ],
  "story-5": [
    "center 28%",
    "center 28%",
    "center 28%",
    "center 22%",
    "center 28%",
    "center 28%",
  ],
  "story-6": [
    "center 22%",
    "center 28%",
    "center 28%",
    "center 28%",
    "center 22%",
    "center 28%",
  ],
  "story-7": [
    "center 28%",
    "center 28%",
    "center 28%",
    "center 28%",
    "center 28%",
    "center 22%",
  ],
  "story-8": [
    "center 28%",
    "center 28%",
    "center 28%",
    "center 28%",
    "center 14%",
    "center 26%",
  ],
  "story-9": [
    "center 24%",
    "center 28%",
    "center 22%",
    "center 28%",
    "center 28%",
    "center 28%",
  ],
};
export const LECTURA_STILL_MARGIN_BOTTOM = 8;

/**
 * Scroll-0 distance from the viewport top to the still on story open.
 * The band is the card's top edge (no top padding above it).
 * Measured at 360×640; the title block is the same height at 390×844.
 */
export const LECTURA_STORY_OPEN_STILL_TOP = 302.4;

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

/** The band stays 90px at every column width. Width does not change the line count. */
export function lecturaStillBandHeight() {
  return LECTURA_STILL_BAND_HEIGHT;
}

/** Border-box width of the still. contentWidth is the card's inner box. */
export function lecturaStillOuterWidth(contentWidth) {
  const w = Number(contentWidth);
  if (!(w > 0)) return 0;
  return w + LECTURA_STILL_CARD_INSET * 2;
}

/** Top corners follow the card. Bottom corners stay square where the band meets the text. */
export function lecturaStillCornerRadius() {
  return `${LECTURA_CARD_RADIUS}px ${LECTURA_CARD_RADIUS}px 0 0`;
}

/** Face lock for one still. Unknown pages keep the default. */
export function lecturaStillObjectPosition(storyId, page) {
  const row = LECTURA_STILL_FOCUS[storyId];
  const focus = row && row[page];
  return typeof focus === "string" && focus.length > 0 ? focus : LECTURA_STILL_OBJECT_POSITION;
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

/** A Next tap dismisses an open gloss sheet inside this window. The sheet does not linger. */
export const LECTURA_GLOSS_DISMISS_MS = 150;

/** True when a viewport point lands on the Next button's box. */
export function lecturaPointInRect(x, y, rect) {
  const px = Number(x);
  const py = Number(y);
  if (!rect || !Number.isFinite(px) || !Number.isFinite(py)) return false;
  const left = Number(rect.left);
  const top = Number(rect.top);
  const width = Number(rect.width);
  const height = Number(rect.height);
  const right = Number.isFinite(Number(rect.right)) ? Number(rect.right) : left + width;
  const bottom = Number.isFinite(Number(rect.bottom)) ? Number(rect.bottom) : top + height;
  if (![left, top, right, bottom].every((n) => Number.isFinite(n))) return false;
  return px >= left && px < right && py >= top && py < bottom;
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

/**
 * Home after a win screen's CONTINUE lands at the top. The win screen can be a few pixels taller
 * than a short phone, and the window keeps that scroll when Home mounts, which tucks the top of
 * the first tile row under the sticky header. Returns 0 when a win-to-Home arrival is pending and
 * the page is not already at the top, else null (leave the scroll alone). Other arrivals (launch,
 * tab switch) never set the pending flag.
 */
export function homeArrivalScrollY({ pending, screen, scrollY } = {}) {
  if (!pending || screen !== "home") return null;
  return (Number(scrollY) || 0) > 0.5 ? 0 : null;
}

/**
 * Comprensión fit on short phones. On arrival the «Comprensión» header sits under the brand bar
 * (#315). Q1 shows its «Según el cuento» quote, the prompt and four choices. At 360×640 a long
 * quote pushed the 4th choice below the fold. Each step frees space in this order: spacing first,
 * then the quote's line height, then the quote's size. Choice and question type never shrink,
 * choices keep a 44px+ tap target, and the quote is never clamped. Step 0 is the layout as it was.
 */
export const COMPRENSION_FIT_STEPS = Object.freeze([
  Object.freeze({ headerGap: 16, quotePad: "12px 14px", quoteGap: 10, cueGap: 6, quoteSize: 15, quoteLine: 1.55, promptGap: 8, choiceGap: 8, choicePadY: 11 }),
  Object.freeze({ headerGap: 8, quotePad: "8px 14px", quoteGap: 8, cueGap: 4, quoteSize: 15, quoteLine: 1.55, promptGap: 6, choiceGap: 6, choicePadY: 10 }),
  Object.freeze({ headerGap: 8, quotePad: "8px 12px", quoteGap: 8, cueGap: 4, quoteSize: 14, quoteLine: 1.4, promptGap: 6, choiceGap: 6, choicePadY: 10 }),
  Object.freeze({ headerGap: 8, quotePad: "8px 12px", quoteGap: 8, cueGap: 4, quoteSize: 13, quoteLine: 1.3, promptGap: 6, choiceGap: 6, choicePadY: 10 }),
]);

/** The step's styles. Out-of-range or bad input is step 0. */
export function comprensionFitStep(level) {
  const n = Number(level);
  return COMPRENSION_FIT_STEPS[Number.isInteger(n) && n > 0 && n < COMPRENSION_FIT_STEPS.length ? n : 0];
}

/**
 * The next step to try. With the header under the brand bar, Q1 fits when its last choice ends
 * at least `gap` px above the viewport bottom. Fits, last step, or no layout: stay.
 */
export function comprensionNextFitLevel({ level = 0, headerTop, lastChoiceBottom, viewportTop = 0, viewportHeight, gap = 8 } = {}) {
  const cur = Number.isInteger(Number(level)) && Number(level) > 0 ? Math.min(Number(level), COMPRENSION_FIT_STEPS.length - 1) : 0;
  const top = Number(headerTop);
  const bottom = Number(lastChoiceBottom);
  const vh = Number(viewportHeight);
  if (![top, bottom, vh].every(Number.isFinite) || !(vh > 0) || !(bottom > top)) return cur;
  const inset = Number.isFinite(Number(viewportTop)) ? Math.max(0, Number(viewportTop)) : 0;
  const room = vh - inset - (Number.isFinite(Number(gap)) ? Math.max(0, Number(gap)) : 0);
  if (bottom - top <= room + 0.5) return cur;
  return Math.min(cur + 1, COMPRENSION_FIT_STEPS.length - 1);
}

/**
 * A resize, rotation or ES/EN switch can reflow the page above the Comprensión header, so the header
 * drifts off the brand bar while the fit step is re-measured (Codex P2 on #360). While Q1 is still
 * open, put the header back under the brand bar before measuring. Returns the scroll target, or
 * null when there is nothing to do: no pending re-align, Q1 already answered, no layout, or the
 * header is already in place.
 */
export function comprensionRealignScrollY({ pending, q1Answered, headerTop, scrollY = 0, viewportTop = 0 } = {}) {
  if (!pending || q1Answered) return null;
  const top = Number(headerTop);
  if (!Number.isFinite(top)) return null;
  const y = lecturaQuestionsOpenScrollY({ headerTop: top, scrollY, viewportTop });
  return Math.abs(y - (Number(scrollY) || 0)) > 0.5 ? y : null;
}

/**
 * True when the header box changed width (a resize or rotation the window events can miss).
 * Height is left out on purpose: the header grows by a line when the story is claimed
 * («— coleccionable desbloqueado»), and that must not reset the fit under the claim card.
 */
export function comprensionHeaderResized(prev, next) {
  if (!prev || !next) return false;
  return Math.abs((Number(prev.width) || 0) - (Number(next.width) || 0)) > 0.5;
}

/**
 * Re-measure the Comprensión fit on resize, as watchPaywallStillResize does for the paywall still:
 * a ResizeObserver on the header plus window resize and orientationchange. Returns the cleanup.
 */
export function watchComprensionFit({ win = typeof window !== "undefined" ? window : null, target = null, onResize } = {}) {
  if (!win || typeof win.addEventListener !== "function" || typeof onResize !== "function") return () => {};
  let live = true;
  const run = () => { if (live) onResize(); };
  let observer = null;
  if (target && typeof win.ResizeObserver === "function") {
    observer = new win.ResizeObserver(run);
    observer.observe(target);
  }
  win.addEventListener("resize", run);
  win.addEventListener("orientationchange", run);
  return () => {
    live = false;
    if (observer) observer.disconnect();
    win.removeEventListener("resize", run);
    win.removeEventListener("orientationchange", run);
  };
}

/**
 * Checkpoint answers peeking under the pinned BACK/NEXT row look tappable but the row
 * takes the tap. While the learner scrolls down, once the answers start to slide under
 * the row, return how far to scroll so their bottom sits one gap above it. 0 = leave it.
 */
export function checkpointUnderBarNudge({ answersTop, answersBottom, barTop, gap = LECTURA_NEXT_GAP } = {}) {
  const top = Number(answersTop);
  const bottom = Number(answersBottom);
  const bar = Number(barTop);
  if (![top, bottom, bar].every(Number.isFinite)) return 0;
  if (top >= bar) return 0; // not in sight yet
  if (bottom <= bar - gap) return 0; // already clear
  return Math.ceil(bottom - (bar - gap));
}
