import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryCardFace, MEMORY_CARD_GLOSS_COLOR, MEMORY_CARD_GLOSS_SCALE } from "./MemoryCardFace.jsx";
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
    expect(word.style.fontFamily).toBe("");
    expect(word.style.color).toBe("");
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
});
