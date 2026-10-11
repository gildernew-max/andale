/**
 * Lectura NEXT / paragraph advance.
 * The new paragraph's top meets the sticky header's bottom — the top of the
 * readable area. The pinned footer is not part of this math.
 */

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
 * QUESTIONS open. The comprehension header sticks under the brand bar, and
 * Q1's top meets the bottom of that header. The back-to-story control sits
 * above the header and scrolls off.
 */
export function lecturaQuestionsOpenScrollY({
  headerTop,
  headerHeight = 0,
  q1Top,
  scrollY = 0,
  viewportTop = 0,
} = {}) {
  const y = Number.isFinite(Number(scrollY)) ? Number(scrollY) : 0;
  const inset = Number.isFinite(Number(viewportTop)) ? Math.max(0, Number(viewportTop)) : 0;
  const headH = Number.isFinite(Number(headerHeight)) ? Math.max(0, Number(headerHeight)) : 0;
  const qTop = Number(q1Top);
  const headTop = Number(headerTop);
  if (Number.isFinite(qTop)) return Math.max(0, y + qTop - (inset + headH));
  if (!Number.isFinite(headTop)) return Math.max(0, y);
  return Math.max(0, y + headTop - inset);
}

/**
 * Once every question is answered, scroll so the claim block is fully inside
 * the readable viewport (under the stuck header, above the fold).
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
