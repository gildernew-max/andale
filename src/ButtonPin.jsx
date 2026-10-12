/**
 * In-sheet pin. PR 316 fixed one CTA to the viewport with
 * bottom: calc(16px + env(safe-area-inset-bottom)) and a 12px gap above it.
 * A modal is not the viewport: a viewport-fixed button would leave the card
 * on a short phone and sit on the dimmed backdrop when the sheet is centered.
 * This footer stays inside the sheet. The last control's bottom edge is 16px
 * above the bottom safe area. The control above it sits 12px higher. The
 * sheet's scroll region is the sibling above this footer.
 */

export const BUTTON_PIN_BOTTOM = 16;
export const BUTTON_PIN_GAP = 12;
/** Continue free tap. padding 11px + 15px line at 1.35 stays inside this floor. */
export const PAYWALL_FREE_TAP = 44;
/** Filled Btn block: 13px pad + 20px line + 13px pad + 4px lip. */
export const PAYWALL_ANNUAL_BLOCK = 50;
export const PAYWALL_OVERLAY_PAD = 20;
export const PAYWALL_CARD_BORDER = 2;
export const PAYWALL_CARD_MAX_WIDTH = 340;
export const PAYWALL_CARD_PAD_X = 20;

export function buttonPinBottomCss() {
  return `calc(${BUTTON_PIN_BOTTOM}px + env(safe-area-inset-bottom))`;
}

/**
 * Where the pinned annual CTA and Continue free sit when the sheet is at its
 * max height (the short-phone case). safeAreaBottom is px, 0 when env() is 0.
 * Both rects are inside the viewport, so neither depends on scrolling.
 */
export function paywallPinRects({
  viewportHeight,
  viewportWidth,
  safeAreaBottom = 0,
  annualHeight = PAYWALL_ANNUAL_BLOCK,
  freeHeight = PAYWALL_FREE_TAP,
} = {}) {
  const vh = Number(viewportHeight);
  const vw = Number(viewportWidth);
  const safe = Math.max(0, Number(safeAreaBottom) || 0);
  const maxCard = vh - PAYWALL_OVERLAY_PAD * 2;
  const cardTop = PAYWALL_OVERLAY_PAD;
  const cardBottom = cardTop + maxCard;
  const innerBottom = cardBottom - PAYWALL_CARD_BORDER;
  const freeBottom = innerBottom - BUTTON_PIN_BOTTOM - safe;
  const freeTop = freeBottom - freeHeight;
  const annualBottom = freeTop - BUTTON_PIN_GAP;
  const annualTop = annualBottom - annualHeight;
  const cardWidth = Math.min(PAYWALL_CARD_MAX_WIDTH, vw - PAYWALL_OVERLAY_PAD * 2);
  const left = (vw - cardWidth) / 2 + PAYWALL_CARD_BORDER + PAYWALL_CARD_PAD_X;
  const right = left + (cardWidth - PAYWALL_CARD_BORDER * 2 - PAYWALL_CARD_PAD_X * 2);
  const withinViewport = annualTop >= cardTop
    && freeBottom <= cardBottom
    && freeBottom <= vh
    && annualTop >= 0
    && freeTop > annualBottom
    && right - left >= PAYWALL_FREE_TAP
    && left >= 0
    && right <= vw;
  return {
    annualTop,
    annualBottom,
    freeTop,
    freeBottom,
    left,
    right,
    width: right - left,
    gap: freeTop - annualBottom,
    freeInset: innerBottom - freeBottom,
    withinViewport,
    cardTop,
    cardBottom,
  };
}

export function ButtonPin({ children, testId = "button-pin", style }) {
  return (
    <div
      data-testid={testId}
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: BUTTON_PIN_GAP,
        boxSizing: "border-box",
        ...style,
        paddingBottom: buttonPinBottomCss(),
      }}
    >
      {children}
    </div>
  );
}
