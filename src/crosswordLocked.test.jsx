import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CrosswordPlayfield } from "./CrosswordPlayfield.jsx";
import {
  CROSSWORD_CREAM,
  CROSSWORD_GRID,
  CROSSWORD_SAGE,
  revealCrosswordWord,
  startCrosswordRun,
} from "./crossword.js";

afterEach(cleanup);

const lin = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const contrastRatio = (fg, bg) => {
  const lum = (hex) => {
    const n = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  return (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05);
};
const norm = (value) => {
  const s = String(value || "").trim().toLowerCase();
  const hex = s.match(/#([0-9a-f]{3,8})/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
    return `#${h.slice(0, 6)}`;
  }
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!rgb) return "";
  return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
};

const paint = (el) => ({
  fill: norm(el.style.backgroundColor || el.style.background),
  ink: norm(el.style.color),
});

function lockedCell(dark) {
  const run = revealCrosswordWord(CROSSWORD_GRID, startCrosswordRun(CROSSWORD_GRID));
  render(
    <CrosswordPlayfield
      run={run}
      grid={CROSSWORD_GRID}
      uiLang="es"
      dark={dark}
      onType={() => {}}
      onBackspace={() => {}}
      onSelectCell={() => {}}
      onSelectClue={() => {}}
      onReveal={() => {}}
      onClose={() => {}}
    />,
  );
  const cell = screen.getAllByTestId("crossword-cell").find((el) => el.getAttribute("data-state") === "locked");
  expect(cell, "locked cell").toBeTruthy();
  return cell;
}

describe("dark locked crossword cell", () => {
  it("paints #5C7356 under cream at 4.5:1 and leaves the light locked cell on sage", () => {
    const darkCell = lockedCell(true);
    const darkPaint = paint(darkCell);
    expect(darkCell.getAttribute("data-testid")).toBe("crossword-cell");
    expect(darkCell.getAttribute("data-state")).toBe("locked");
    expect(darkPaint.fill).toBe("#5c7356");
    expect(darkPaint.ink).toBe("#f6efe4");
    expect(CROSSWORD_CREAM).toBe("#F6EFE4");
    expect(contrastRatio(darkPaint.ink, darkPaint.fill)).toBeGreaterThanOrEqual(4.5);
    cleanup();

    const lightCell = lockedCell(false);
    const lightPaint = paint(lightCell);
    expect(lightCell.getAttribute("data-state")).toBe("locked");
    expect(lightPaint.fill).toBe(CROSSWORD_SAGE);
    expect(lightPaint.fill).toBe("#6f7757");
    expect(lightPaint.ink).toBe("#ffffff");
    expect(lightPaint.fill).not.toBe(darkPaint.fill);
  });
});
