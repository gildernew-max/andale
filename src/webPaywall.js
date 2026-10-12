/** Amount only. Null until a real price is set. Dropped into the locked "{price} a year" / "{price} al año" line. Not a charge. */
export const ANNUAL_PRICE_PLACEHOLDER = null;

/** Locked price line, or null when no amount is set so the card renders no price text. */
export function annualPriceLine(template, price = ANNUAL_PRICE_PLACEHOLDER) {
  if (price == null || String(price).trim() === "") return null;
  return String(template).replace("{price}", String(price));
}

/** Card bottom sits at least this many pixels above the safe area. */
export const PAYWALL_CARD_BOTTOM_INSET = 16;

/** Continue free sits this many pixels under the annual button, or under the post-tap line once that line is up. */
export const PAYWALL_FREE_GAP = 12;

/** The post-tap line sits this many pixels under the annual button. */
export const PAYWALL_ANNUAL_HOLD_GAP = 8;
