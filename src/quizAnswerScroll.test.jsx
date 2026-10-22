/** Lectura Q2/Q3 open with an answer in view at 360x640 (Varys cold walk, Oct 21). */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { quizNextAnswersScrollY, QUIZ_NEXT_SCROLL_DELAY_MS } from "./quizAnswerScroll.js";

// Varys's frame es-light-22: brand bar 44px, 9-line quote, answers at y 730-979 in a 640 viewport.
const VARYS = { scrollY: 2000, viewportTop: 44, viewportHeight: 640, promptTop: 650, firstChoiceBottom: 790, lastChoiceBottom: 979 };

describe("next question lands on its answers", () => {
  it("Varys's Q2: scrolls so answers are in view and the prompt stays under the brand bar", () => {
    const y = quizNextAnswersScrollY(VARYS);
    const delta = y - VARYS.scrollY;
    expect(VARYS.firstChoiceBottom - delta).toBeLessThanOrEqual(640 - 12);
    expect(VARYS.promptTop - delta).toBeGreaterThanOrEqual(44);
  });

  it("all four answers fit: the last one lands just above the fold", () => {
    const y = quizNextAnswersScrollY({ ...VARYS, promptTop: 900, firstChoiceBottom: 1040, lastChoiceBottom: 1229 });
    expect(1229 - (y - 2000)).toBe(628);
  });

  it("a tall prompt never goes under the bar; at least the first answer still shows", () => {
    const s = { ...VARYS, promptTop: 700, firstChoiceBottom: 900, lastChoiceBottom: 1400 };
    const d = quizNextAnswersScrollY(s) - s.scrollY;
    expect(s.promptTop - d).toBe(56);
    expect(s.firstChoiceBottom - d).toBeLessThanOrEqual(628);
  });

  it("does nothing when an answer is already in view", () => {
    expect(quizNextAnswersScrollY({ ...VARYS, promptTop: 300, firstChoiceBottom: 420, lastChoiceBottom: 640 })).toBeNull();
  });

  it("App wires it to Q2 and Q3 only, after the answer registers, without touching the quote", () => {
    const src = readFileSync(join(process.cwd(), "src", "App.jsx"), "utf8");
    const at = src.indexOf("quizNextAnswersScrollY({");
    expect(at).toBeGreaterThan(0);
    const block = src.slice(src.lastIndexOf("useEffect(", at), at + 1400);
    expect(block).toContain("QUIZ_NEXT_SCROLL_DELAY_MS");
    expect(block).toMatch(/next\s*<\s*1|next\s*>=\s*1|next < 1/);
    expect(QUIZ_NEXT_SCROLL_DELAY_MS).toBeLessThan(900);
  });
});
