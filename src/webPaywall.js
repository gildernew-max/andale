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
