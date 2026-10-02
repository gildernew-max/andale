/**
 * Lectura word sheet sits above the checkpoint answer buttons.
 * Colors stay with the caller. This only decides the frame.
 *
 * When a word is open, wordSheetReveal keeps that word fully above the
 * sheet. If the definition does not fit between the word and the buttons,
 * spacer pushes the checkpoint down and scrollDelta lines them up.
 * maxHeight is the full definition, so the sheet is not clipped to make room.
 *
 * That plan runs when the sheet opens, the tapped word changes, the
 * definition changes size, or the viewport resizes. A later manual scroll
 * is not a reason to plan again.
 */

export function wordSheetFrame({
  viewportHeight = 0,
  viewportWidth = 0,
  checkpointTop = null,
  gap = 10,
  margin = 8,
} = {}) {
  const vh = Number(viewportHeight) || 0;
  const vw = Number(viewportWidth) || 0;
  const width = Math.min(320, Math.max(160, vw - margin * 2));
  const left = Math.max(margin, Math.round((vw - width) / 2));
  const openTop = checkpointTop == null || !Number.isFinite(Number(checkpointTop))
    ? null
    : Number(checkpointTop);
  if (openTop == null) {
    return {
      left,
      width,
      bottom: margin,
      maxHeight: Math.max(120, Math.round(vh * 0.46)),
      backdropBottom: 0,
    };
  }
  const limit = Math.max(0, openTop - gap);
  const bottom = Math.max(margin, vh - limit);
  const room = Math.max(0, limit - margin);
  const maxHeight = Math.min(Math.round(vh * 0.55), room);
  return { left, width, bottom, maxHeight, backdropBottom: bottom };
}

export function wordSheetReveal({
  viewportHeight = 0,
  viewportWidth = 0,
  wordTop = 0,
  wordBottom = 0,
  checkpointTop = null,
  checkpointBottom = null,
  contentHeight = 0,
  currentSpacer = 0,
  topInset = 0,
  gap = 10,
  wordGap = 8,
  margin = 8,
} = {}) {
  const vh = Number(viewportHeight) || 0;
  const vw = Number(viewportWidth) || 0;
  const width = Math.min(320, Math.max(160, vw - margin * 2));
  const left = Math.max(margin, Math.round((vw - width) / 2));
  const content = Math.max(0, Number(contentHeight) || 0);
  const wTop = Number(wordTop) || 0;
  const wBot = Number(wordBottom) || 0;
  const inset = Math.max(0, Number(topInset) || 0);
  const held = Math.max(0, Number(currentSpacer) || 0);

  const hasCheckpoint = checkpointTop != null && Number.isFinite(Number(checkpointTop));
  if (!hasCheckpoint) {
    const maxHeight = content || Math.max(120, Math.round(vh * 0.46));
    const bottom = margin;
    const sheetTop = vh - bottom - maxHeight;
    const scrollDelta = Math.max(0, wBot + wordGap - sheetTop);
    return {
      spacer: 0,
      scrollDelta,
      frame: { left, width, bottom, maxHeight, backdropBottom: 0 },
    };
  }

  const cTop = Number(checkpointTop);
  const cBot = Number.isFinite(Number(checkpointBottom)) ? Number(checkpointBottom) : cTop;
  const distance = cTop - wBot;
  const needed = content + wordGap + gap;
  const spacer = Math.max(0, held + (needed - distance));
  const additional = spacer - held;
  const clusterBottom = cBot + additional;
  const clusterHeight = clusterBottom - wTop;
  const available = vh - margin - inset;
  const scrollDelta = clusterHeight <= available
    ? clusterBottom - (vh - margin)
    : wTop - inset;
  const checkpointTopAfter = cTop + additional - scrollDelta;
  const sheetBottomY = checkpointTopAfter - gap;
  const bottom = vh - sheetBottomY;
  return {
    spacer,
    scrollDelta,
    frame: {
      left,
      width,
      bottom,
      maxHeight: content,
      backdropBottom: bottom,
    },
  };
}

/**
 * Placement runs for open, a definition size change, and a viewport
 * resize or rotation. Scroll and close are not placement.
 */
export function wordSheetPlacementReason(kind) {
  if (kind === "open" || kind === "content") return kind;
  if (kind === "resize" || kind === "orientationchange") return "resize";
  return null;
}

/**
 * Closing drops the spacer and leaves scrollY where the reader had it.
 */
export function wordSheetClose({ scrollY = 0, spacer = 0 } = {}) {
  return { spacer: 0, scrollY: Number(scrollY) || 0 };
}

/**
 * Listen for the placement triggers that are not the sheet opening itself.
 * Scroll is intentionally not one of them: the reader keeps the scroll
 * position, and the sheet is not pulled back over the word.
 */
export function watchWordSheetPlacement(target, {
  place,
  content = null,
  readContentHeight = null,
  ResizeObserver: Observer = globalThis.ResizeObserver,
} = {}) {
  if (!target || typeof place !== "function") return () => {};
  const onResize = () => {
    if (wordSheetPlacementReason("resize")) place("resize");
  };
  target.addEventListener("resize", onResize);
  const onOrientation = () => {
    if (wordSheetPlacementReason("orientationchange")) place("resize");
  };
  target.addEventListener("orientationchange", onOrientation);

  let observer = null;
  if (content && typeof Observer === "function") {
    let last = typeof readContentHeight === "function" ? readContentHeight() : 0;
    observer = new Observer(() => {
      const next = typeof readContentHeight === "function" ? readContentHeight() : last + 1;
      if (Math.abs(next - last) <= 0.5) return;
      last = next;
      if (wordSheetPlacementReason("content")) place("content");
    });
    observer.observe(content);
  }

  return () => {
    target.removeEventListener("resize", onResize);
    target.removeEventListener("orientationchange", onOrientation);
    if (observer) observer.disconnect();
  };
}
