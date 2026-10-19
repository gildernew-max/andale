/** One line. false = locked Lectura cards stay disabled and the tap does nothing. */
export const LOCKED_STORY_PAYWALL = true;

/** Amount only. Null hides the line. One assignment to clear or set. Not a charge. */
export const ANNUAL_PRICE_PLACEHOLDER = "39.99";

function pricedAmount(price, spanish) {
  const raw = String(price).trim();
  const bare = raw.replace(/^US\$/, "").replace(/^\$/, "");
  if (!/^\d+(?:\.\d+)?$/.test(bare)) return raw;
  return `${spanish ? "US$" : "$"}${bare}`;
}

/** Locked price line, or null when no amount is set so the card renders no price text. */
export function annualPriceLine(template, price = ANNUAL_PRICE_PLACEHOLDER) {
  if (price == null || String(price).trim() === "") return null;
  const text = String(template);
  const spanish = text.includes("año");
  const line = text.replace("{price}", pricedAmount(price, spanish));
  return line.replace(/ /g, "\u00A0");
}

/** Card bottom sits at least this many pixels above the safe area. */
export const PAYWALL_CARD_BOTTOM_INSET = 16;

/** Monthly sits this many pixels under the annual button, or under the post-tap line once that line is up. */
export const PAYWALL_MONTHLY_GAP = 12;

/** Continue free sits this many pixels under the monthly button. */
export const PAYWALL_FREE_GAP = 12;

/** The free-line sits this many pixels under Continue free. Body type, one size down from 13.5. */
export const PAYWALL_FREE_LINE_GAP = 8;
export const PAYWALL_FREE_LINE_SIZE = 12;

/** The post-tap line sits this many pixels under the annual button. Monthly uses the same slot. */
export const PAYWALL_ANNUAL_HOLD_GAP = 8;

/** Still above the headline: 140px tall at 16:9. One static 48px Cenzontle perches on its bottom-right corner. */
export const PAYWALL_STILL_HEIGHT = 140;
export const PAYWALL_BIRD_SIZE = 48;

/** The annual card is the only filled element: lime, whole card tappable, 96px. Monthly is outlined at 64px. */
export const PAYWALL_LIME = "#58CC02";
export const PAYWALL_ANNUAL_HEIGHT = 96;
export const PAYWALL_MONTHLY_HEIGHT = 64;

/**
 * The cleared story still sits in a frame that shrinks when the card runs out of room (the
 * "plans aren't open yet" lines grow the card). The image keeps its own height unless it is
 * capped, so it spilled out of the shrunk frame over the headline. Returns the max height that
 * keeps the image inside its frame, or null when it already fits. Never below minHeight.
 */
export function paywallStillMaxHeight({ frameHeight, imgHeight, minHeight = 48 } = {}) {
  const frame = Number(frameHeight);
  const img = Number(imgHeight);
  if (!Number.isFinite(frame) || !Number.isFinite(img) || !(frame > 0)) return null;
  if (img <= frame + 1) return null;
  return Math.max(Number(minHeight) || 0, Math.floor(frame));
}

/**
 * Re-runs the still fit whenever the viewport changes while the paywall is open (resize, rotation,
 * or the fixed overlay changing size). Runs on the spot so the image never paints a stale height.
 * Returns the cleanup that drops every listener and the observer. No-op without a window.
 */
export function watchPaywallStillResize({ win = typeof window !== "undefined" ? window : null, target = null, onResize } = {}) {
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
