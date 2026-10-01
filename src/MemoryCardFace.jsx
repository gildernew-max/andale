import { useLayoutEffect, useRef, useState } from "react";

/** Gloss is 70% of this card's hero. A 26px hero keeps an 18.2px gloss. */
export const MEMORY_CARD_GLOSS_SCALE = 0.7;
export const MEMORY_CARD_GLOSS_COLOR = "#777777";

/** Gloss size for a fitted hero. 26 → 18.2, 20 → 14. */
export function memoryGlossPx(heroPx) {
  return heroPx * MEMORY_CARD_GLOSS_SCALE;
}

/** Hero starts at the card type lock and steps down by 1px. Never below 18. */
export const MEMORY_CARD_HERO_MAX = 26;
export const MEMORY_CARD_HERO_MIN = 18;

/** Card face text wraps only at spaces. No mid-word breaks, no hyphenation. */
export const MEMORY_FACE_WRAP = {
  whiteSpace: "normal",
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "none",
};

/** Whitespace-delimited tokens. These are the only legal wrap points. */
export function memoryFaceTokens(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean);
}

/**
 * Hero size for one card. `widthAt(px)` is the widest token at that size.
 * Starts at 26px. Steps down by 1px until every token fits `innerWidth`.
 * Floor is 18px. A card that already fits stays at 26. Unknown width stays at 26.
 */
export function memoryHeroPx(widthAt, innerWidth) {
  const limit = Number(innerWidth);
  if (!Number.isFinite(limit) || limit <= 0) return MEMORY_CARD_HERO_MAX;
  let size = MEMORY_CARD_HERO_MAX;
  while (size > MEMORY_CARD_HERO_MIN) {
    const width = Number(widthAt(size));
    if (!Number.isFinite(width) || width <= limit) break;
    size -= 1;
  }
  return size;
}

function widestTokenWidth(probe, tokens, px) {
  probe.style.fontSize = `${px}px`;
  let widest = 0;
  for (const token of tokens) {
    probe.textContent = token;
    const width = probe.getBoundingClientRect().width || probe.scrollWidth || 0;
    if (width > widest) widest = width;
  }
  return widest;
}

/** Face-up Memory card: hero word, then the partner in parentheses on the next line. */
export function MemoryCardFace({ word, translation, color = MEMORY_CARD_GLOSS_COLOR }) {
  const faceRef = useRef(null);
  const probeRef = useRef(null);
  const [heroPx, setHeroPx] = useState(MEMORY_CARD_HERO_MAX);
  const tokens = memoryFaceTokens(word);

  useLayoutEffect(() => {
    const face = faceRef.current;
    const probe = probeRef.current;
    const parts = memoryFaceTokens(word);
    if (!face || !probe || !parts.length) return undefined;

    const fit = () => {
      const inner = face.clientWidth;
      const next = memoryHeroPx((px) => widestTokenWidth(probe, parts, px), inner);
      setHeroPx((prev) => (prev === next ? prev : next));
    };

    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(fit);
    observer.observe(face);
    return () => observer.disconnect();
  }, [word]);

  if (!word) return null;

  return (
    <span
      ref={faceRef}
      data-testid="memory-card-face"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        textAlign: "center",
        gap: 1,
        fontSize: `${heroPx}px`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <span
          ref={probeRef}
          data-testid="memory-card-probe"
          style={{
            display: "inline-block",
            whiteSpace: "nowrap",
            visibility: "hidden",
          }}
        >{tokens[0] || ""}</span>
      </span>
      <span
        data-testid="memory-card-word"
        data-hero-px={heroPx}
        style={{
          display: "block",
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          lineHeight: 1.1,
          ...MEMORY_FACE_WRAP,
        }}
      >{word}</span>
      {translation ? (
        <span
          data-testid="memory-card-gloss"
          style={{
            display: "block",
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            fontFamily: "inherit",
            fontWeight: "inherit",
            fontSize: `${MEMORY_CARD_GLOSS_SCALE}em`,
            color,
            lineHeight: 1.05,
            ...MEMORY_FACE_WRAP,
          }}
        >{`(${translation})`}</span>
      ) : null}
    </span>
  );
}
