/** Typing-exercise accent keys. Same nine labels, in this order. */
export const TYPE_ACCENTS = ["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"];

/** Tap target. Border box, so the 4px lip is inside the 44. */
export const ACCENT_KEY_MIN = 44;
export const ACCENT_KEY_GAP = 6;

/** Room between the last accent key and the pinned Comprobar / Check bar. */
export const ACCENT_ROW_FOOTER_GAP = 12;

/** Lesson body is width 100% up to 600, with 20px of padding on each side. */
export const LESSON_BODY_MAX = 600;
export const LESSON_BODY_PAD_X = 20;

export function accentKeyRowWidth(count, key = ACCENT_KEY_MIN, gap = ACCENT_KEY_GAP) {
  const n = Number(count) || 0;
  if (n <= 0) return 0;
  return n * key + (n - 1) * gap;
}

/** Content box inside the lesson body at this viewport width. */
export function typeAccentContentWidth(viewportWidth) {
  const shell = Math.min(LESSON_BODY_MAX, Math.max(0, Number(viewportWidth) || 0));
  return Math.max(0, shell - LESSON_BODY_PAD_X * 2);
}

/**
 * One row when all nine keys fit at the 44px floor.
 * Otherwise two even rows: 5 then 4. Never 8 + a lone ¡.
 */
export function typeAccentRows(contentWidth, accents = TYPE_ACCENTS) {
  const keys = accents.slice();
  const width = Number(contentWidth) || 0;
  if (width + 0.5 >= accentKeyRowWidth(keys.length)) return [keys];
  return [keys.slice(0, 5), keys.slice(5)];
}

/**
 * How far to scroll the lesson body so the accent keys sit fully above the
 * footer, with ACCENT_ROW_FOOTER_GAP between them. A row that is entirely
 * below the footer is left for the learner to scroll to; the bottom pad
 * still keeps it clear once they do. Zero rects (jsdom) scroll nothing.
 */
export function accentRowScrollDelta({
  rowTop,
  rowBottom,
  footerTop,
  gap = ACCENT_ROW_FOOTER_GAP,
} = {}) {
  const top = Number(rowTop);
  const bottom = Number(rowBottom);
  const limit = Number(footerTop);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || !Number.isFinite(limit)) return 0;
  if (limit <= 0 || bottom <= 0) return 0;
  if (top >= limit) return 0;
  const overflow = bottom - (limit - gap);
  return overflow > 0.5 ? overflow : 0;
}
