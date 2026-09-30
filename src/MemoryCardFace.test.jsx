import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  MemoryCardFace,
  MEMORY_CARD_GLOSS_COLOR,
  MEMORY_CARD_GLOSS_SCALE,
  MEMORY_CARD_HERO_MAX,
  MEMORY_CARD_HERO_MIN,
  MEMORY_FACE_WRAP,
  memoryFaceTokens,
  memoryGlossPx,
  memoryHeroPx,
} from "./MemoryCardFace.jsx";
import {
  MEMORY_BANK,
  memoryCardLabel,
  memoryCardText,
  memoryCardTranslation,
} from "./memory.js";

afterEach(() => cleanup());

const chamba = MEMORY_BANK.find((row) => row.word === "chamba");
const run = { pairs: [chamba] };
const wordCard = { id: "chamba-word", pairId: "chamba", kind: "word" };
const meaningCard = { id: "chamba-meaning", pairId: "chamba", kind: "meaning" };

function FaceUpCard({ card, uiLang }) {
  const word = memoryCardText(card, uiLang, run);
  const translation = memoryCardTranslation(card, uiLang, run);
  return (
    <button type="button" data-testid="memory-card" aria-label={memoryCardLabel(card, uiLang, run)} style={{ fontSize: 26 }}>
      <MemoryCardFace word={word} translation={translation} />
    </button>
  );
}

describe("MemoryCardFace", () => {
  it("shows the Spanish lemma with the English partner in parentheses", () => {
    render(<FaceUpCard card={wordCard} uiLang="en" />);
    expect(screen.getByTestId("memory-card-word").textContent).toBe("chamba");
    expect(screen.getByTestId("memory-card-gloss").textContent).toBe("(job, work)");
    expect(screen.getByTestId("memory-card").getAttribute("aria-label")).toBe("chamba (job, work)");
    const gloss = screen.getByTestId("memory-card-gloss");
    const word = screen.getByTestId("memory-card-word");
    expect(MEMORY_CARD_GLOSS_COLOR).toBe("#777777");
    expect(MEMORY_CARD_GLOSS_SCALE).toBeCloseTo(0.7);
    expect(gloss.style.fontSize).toBe(`${MEMORY_CARD_GLOSS_SCALE}em`);
    expect(gloss.style.fontFamily).toBe("inherit");
    expect(gloss.style.fontWeight).toBe("inherit");
    expect(gloss.style.color).toMatch(/#777777|rgb\(119,\s*119,\s*119\)/i);
    expect(word.style.fontSize).toBe("");
    expect(screen.getByTestId("memory-card-face").style.fontSize).toBe(`${MEMORY_CARD_HERO_MAX}px`);
    expect(word.getAttribute("data-hero-px")).toBe(String(MEMORY_CARD_HERO_MAX));
    expect(memoryGlossPx(MEMORY_CARD_HERO_MAX)).toBeCloseTo(18.2);
    expect(word.style.fontFamily).toBe("");
    expect(word.style.color).toBe("");
    expect(word.style.overflowWrap).toBe("normal");
    expect(word.style.wordBreak).toBe("normal");
    expect(word.style.hyphens).toBe("none");
    expect(gloss.style.overflowWrap).toBe("normal");
    expect(gloss.style.wordBreak).toBe("normal");
    expect(gloss.style.hyphens).toBe("none");
  });

  it("shows the English meaning with the Spanish lemma in parentheses", () => {
    render(<FaceUpCard card={meaningCard} uiLang="en" />);
    expect(screen.getByTestId("memory-card-word").textContent).toBe("job, work");
    expect(screen.getByTestId("memory-card-gloss").textContent).toBe("(chamba)");
    expect(screen.getByTestId("memory-card-gloss").style.fontSize).toBe("0.7em");
    expect(screen.getByTestId("memory-card-gloss").style.color).toMatch(/#777777|rgb\(119,\s*119,\s*119\)/i);
    expect(screen.getByTestId("memory-card").getAttribute("aria-label")).toBe("job, work (chamba)");
  });

  it("follows uiLang for the meaning side in both directions", () => {
    const { unmount } = render(<FaceUpCard card={wordCard} uiLang="es" />);
    expect(screen.getByTestId("memory-card-word").textContent).toBe("chamba");
    expect(screen.getByTestId("memory-card-gloss").textContent).toBe("(trabajo)");
    expect(screen.getByRole("button", { name: "chamba (trabajo)" })).toBeTruthy();
    unmount();

    render(<FaceUpCard card={meaningCard} uiLang="es" />);
    expect(screen.getByTestId("memory-card-word").textContent).toBe("trabajo");
    expect(screen.getByTestId("memory-card-gloss").textContent).toBe("(chamba)");
    expect(screen.getByRole("button", { name: "trabajo (chamba)" })).toBeTruthy();
  });

  it("wraps only at spaces on both the hero and the gloss", () => {
    render(<FaceUpCard card={meaningCard} uiLang="es" />);
    const word = screen.getByTestId("memory-card-word");
    const gloss = screen.getByTestId("memory-card-gloss");
    for (const el of [word, gloss]) {
      expect(el.style.overflowWrap).toBe(MEMORY_FACE_WRAP.overflowWrap);
      expect(el.style.wordBreak).toBe(MEMORY_FACE_WRAP.wordBreak);
      expect(el.style.hyphens).toBe(MEMORY_FACE_WRAP.hyphens);
      expect(el.style.whiteSpace).toBe("normal");
      expect(el.style.overflowWrap).not.toMatch(/anywhere|break-word/);
      expect(el.style.wordBreak).not.toMatch(/break-all|break-word/);
    }
    expect(gloss.style.fontSize).toBe("0.7em");
    expect(memoryFaceTokens("camioneta colectiva")).toEqual(["camioneta", "colectiva"]);
    expect(memoryFaceTokens("mercado al aire libre")).toEqual(["mercado", "al", "aire", "libre"]);
  });

  it("keeps 26px when the longest word fits and steps down to a floor of 18", () => {
    const fits = () => 80;
    expect(memoryHeroPx(fits, 100)).toBe(26);
    expect(memoryHeroPx(fits, 0)).toBe(MEMORY_CARD_HERO_MAX);

    const widths = { 26: 120, 25: 115, 24: 110, 23: 105, 22: 100, 21: 96 };
    expect(memoryHeroPx((px) => widths[px] ?? 90, 100)).toBe(22);

    expect(memoryHeroPx(() => 400, 40)).toBe(MEMORY_CARD_HERO_MIN);
    expect(MEMORY_CARD_HERO_MIN).toBe(18);
    expect(MEMORY_CARD_HERO_MAX).toBe(26);
    expect(memoryGlossPx(26)).toBeCloseTo(18.2);
    expect(memoryGlossPx(20)).toBeCloseTo(14);
    expect(memoryGlossPx(21)).toBeCloseTo(14.7);
    expect(memoryGlossPx(25)).toBeCloseTo(17.5);
  });

  it("steps the gloss to 70% of a hero that had to shrink", () => {
    const widths = { 26: 200, 25: 180, 24: 150, 23: 120, 22: 100, 21: 90, 20: 80 };
    const rect = HTMLElement.prototype.getBoundingClientRect;
    const client = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return this.getAttribute("data-testid") === "memory-card-face" ? 100 : 0;
      },
    });
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.getAttribute("data-testid") !== "memory-card-probe") return rect.call(this);
      const px = Number.parseFloat(this.style.fontSize) || 26;
      const width = widths[px] ?? 70;
      return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0, toJSON() { return {}; } };
    };
    try {
      render(<FaceUpCard card={meaningCard} uiLang="es" />);
      const word = screen.getByTestId("memory-card-word");
      const gloss = screen.getByTestId("memory-card-gloss");
      const face = screen.getByTestId("memory-card-face");
      expect(word.getAttribute("data-hero-px")).toBe("22");
      expect(face.style.fontSize).toBe("22px");
      expect(word.style.fontSize).toBe("");
      expect(gloss.style.fontSize).toBe("0.7em");
      expect(memoryGlossPx(22)).toBeCloseTo(15.4);
      expect(gloss.style.color).toMatch(/#777777|rgb\(119,\s*119,\s*119\)/i);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = rect;
      if (client) Object.defineProperty(HTMLElement.prototype, "clientWidth", client);
      else delete HTMLElement.prototype.clientWidth;
    }
  });
});
