/**
 * Typing accent keys and the ES level-up banner at phone sizes.
 * Nine keys that do not fit one row split 5 then 4, stay 44px, and the
 * lesson body can scroll them fully above Comprobar / Check.
 * ES drops «Ahora eres». The level chip does not wrap inside itself.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { LIVE_KEY, mockBrowser, seedProgress } from "./flowsHarness.jsx";
import {
  ACCENT_KEY_GAP,
  ACCENT_KEY_MIN,
  ACCENT_ROW_FOOTER_GAP,
  TYPE_ACCENTS,
  accentKeyRowWidth,
  accentRowScrollDelta,
  typeAccentContentWidth,
  typeAccentRows,
} from "./typeAccentRow.js";

const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 360, height: 844 },
  { width: 390, height: 844 },
];

const TYPE_QUESTION = {
  type: "type",
  prompt: "Ojalá que no ___ mañana.",
  note: "(llover)",
  answers: ["llueva"],
  explain: "«Ojalá» siempre va con subjuntivo: llueva.",
};

function setViewport({ width, height }) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: height });
}

function seedLesson({ theme = "light", uiLang = "es", xp = 42 } = {}) {
  localStorage.clear();
  mockBrowser();
  seedProgress({
    uiLang,
    theme,
    xp,
    hearts: 5,
    onboardingDone: true,
    firstSessionDone: true,
    paywallSeen: true,
  });
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "lesson",
    tab: "camino",
    status: "idle",
    qi: 0,
    typed: "",
    session: {
      title: "Subjuntivo",
      unitId: "subj1",
      host: "luna",
      color: "#58CC02",
      dark: "#46A302",
      questions: [TYPE_QUESTION],
    },
  }));
}

function normColor(value) {
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
}

describe("typing accent row", () => {
  const prevW = window.innerWidth;
  const prevH = window.innerHeight;

  afterEach(() => {
    cleanup();
    localStorage.clear();
    setViewport({ width: prevW, height: prevH });
  });

  it("keeps one row only when nine 44px keys fit", () => {
    expect(TYPE_ACCENTS).toEqual(["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"]);
    expect(accentKeyRowWidth(9)).toBe(9 * ACCENT_KEY_MIN + 8 * ACCENT_KEY_GAP);
    expect(typeAccentRows(accentKeyRowWidth(9))).toHaveLength(1);
    expect(typeAccentRows(accentKeyRowWidth(9) - 1).map((row) => row.length)).toEqual([5, 4]);
    expect(typeAccentContentWidth(600)).toBeGreaterThanOrEqual(accentKeyRowWidth(9));
    expect(typeAccentRows(typeAccentContentWidth(600))).toHaveLength(1);
  });

  it.each(VIEWPORTS)("splits 5 then 4 and clears the footer at $width×$height", async ({ width, height }) => {
    const content = typeAccentContentWidth(width);
    expect(content).toBeLessThan(accentKeyRowWidth(9));
    expect(typeAccentRows(content).map((row) => row.join(""))).toEqual(["áéíóú", "ñü¿¡"]);

    const footer = height - 79;
    const straddling = accentRowScrollDelta({
      rowTop: footer - 20,
      rowBottom: footer + 10,
      footerTop: footer,
    });
    expect(straddling).toBe(10 + ACCENT_ROW_FOOTER_GAP);
    expect(accentRowScrollDelta({
      rowTop: footer - 80,
      rowBottom: footer - ACCENT_ROW_FOOTER_GAP,
      footerTop: footer,
    })).toBe(0);
    expect(accentRowScrollDelta({ rowTop: 0, rowBottom: 0, footerTop: 0 })).toBe(0);

    for (const theme of ["light", "dark"]) {
      cleanup();
      setViewport({ width, height });
      seedLesson({ theme });
      render(<App />);
      const row = await waitFor(() => screen.getByTestId("type-accent-row"));
      const lines = screen.getAllByTestId("type-accent-line");
      const keys = screen.getAllByTestId("type-accent-key");
      const label = `${width}×${height} ${theme}`;
      expect(lines, label).toHaveLength(2);
      expect(lines[0].querySelectorAll("[data-testid='type-accent-key']"), label).toHaveLength(5);
      expect(lines[1].querySelectorAll("[data-testid='type-accent-key']"), label).toHaveLength(4);
      expect(keys.map((key) => key.textContent), label).toEqual(TYPE_ACCENTS);
      expect(row.style.paddingBottom, label).toBe(`${ACCENT_ROW_FOOTER_GAP}px`);
      expect(lines[0].style.flexWrap, label).toBe("nowrap");
      expect(lines[1].style.flexWrap, label).toBe("nowrap");
      expect(lines[0].style.gap, label).toBe(`${ACCENT_KEY_GAP}px`);

      const body = screen.getByTestId("lesson-body");
      const footerEl = screen.getByTestId("lesson-footer");
      const check = screen.getByTestId("lesson-check");
      expect(body.contains(row), label).toBe(true);
      expect(footerEl.contains(row), label).toBe(false);
      expect(body.parentElement, label).toBe(footerEl.parentElement);
      expect(body.style.overflowY, label).toBe("auto");
      expect(check.textContent, label).toMatch(/Comprobar|Check/);

      for (const key of keys) {
        expect(key.className, label).toContain("tile");
        expect(key.style.boxSizing, label).toBe("border-box");
        expect(key.style.minWidth, label).toBe(`${ACCENT_KEY_MIN}px`);
        expect(key.style.minHeight, label).toBe(`${ACCENT_KEY_MIN}px`);
        expect(key.style.padding, label).toBe("4px 11px");
        expect(key.style.fontSize, label).toBe("15px");
        expect(key.disabled, label).toBe(false);
        if (theme === "dark") {
          expect(normColor(key.style.background), label).toBe("#252830");
          expect(normColor(key.style.color), label).toBe("#f6efe4");
          expect(normColor(key.style.borderColor), label).toBe("#2a2e36");
        } else {
          expect(key.style.background, label).toBe("");
          expect(key.style.color, label).toBe("");
        }
      }
    }
  });

  it("inserts the tapped accent into the blank", async () => {
    setViewport(VIEWPORTS[0]);
    seedLesson({ theme: "light", uiLang: "es" });
    const user = userEvent.setup();
    render(<App />);
    const acute = await waitFor(() => screen.getAllByTestId("type-accent-key").find((key) => key.textContent === "á"));
    await user.click(acute);
    await waitFor(() => expect(document.querySelector("textarea.lesson-blank").value).toBe("á"));
  });
});

describe("level-up banner", () => {
  const prevW = window.innerWidth;
  const prevH = window.innerHeight;

  afterEach(() => {
    cleanup();
    localStorage.clear();
    setViewport({ width: prevW, height: prevH });
  });

  async function finishToBanner({ width, height, uiLang, xp, levelName }) {
    cleanup();
    setViewport({ width, height });
    seedLesson({ theme: "light", uiLang, xp });
    const user = userEvent.setup();
    render(<App />);
    const box = await waitFor(() => {
      const el = document.querySelector("textarea.lesson-blank");
      expect(el).toBeTruthy();
      return el;
    });
    await user.click(box);
    await user.type(box, "llueva");
    await user.click(screen.getByTestId("lesson-check"));
    await user.click(await screen.findByRole("button", { name: /^(Continuar|Continue)$/i }));
    const banner = await screen.findByTestId("level-up-banner");
    const chip = screen.getByTestId("level-up-chip");
    const text = screen.getByTestId("level-up-text");
    expect(chip.textContent).toBe(levelName);
    expect(chip.style.whiteSpace).toBe("nowrap");
    expect(chip.style.display).toBe("inline-block");
    expect(chip.style.textTransform).toBe("uppercase");
    expect(text.style.whiteSpace).toBe("nowrap");
    expect(banner.style.display).toBe("inline-block");
    expect(banner.style.maxWidth).toBe("100%");
    expect(banner.style.background).toMatch(/#FFFBEF|rgb\(\s*255,\s*251,\s*239\s*\)/i);
    expect(banner.style.borderRadius).toBe("14px");
    return { banner, chip, text };
  }

  it.each(VIEWPORTS)("ES drops Ahora eres and the chip stays one unit at $width×$height", async (viewport) => {
    const long = await finishToBanner({ ...viewport, uiLang: "es", xp: 1390, levelName: "Chilango honorario" });
    expect(long.text.textContent).toContain("¡Subiste de nivel!");
    expect(long.banner.textContent).not.toContain("Ahora eres");
    expect(long.text.textContent).not.toContain("Ahora eres");

    const short = await finishToBanner({ ...viewport, uiLang: "es", xp: 90, levelName: "Turista" });
    expect(short.text.textContent).toContain("¡Subiste de nivel!");
    expect(short.banner.textContent).not.toContain("Ahora eres");
    expect(short.chip.textContent).toBe("Turista");
  }, 30000);

  it("leaves the English level-up line unchanged", async () => {
    const { text, banner, chip } = await finishToBanner({
      width: 360,
      height: 844,
      uiLang: "en",
      xp: 1390,
      levelName: "Chilango honorario",
    });
    expect(text.textContent).toContain("Level up! You are now");
    expect(banner.textContent).not.toContain("¡Subiste de nivel!");
    expect(banner.textContent).not.toContain("Ahora eres");
    expect(chip.style.whiteSpace).toBe("nowrap");
  }, 20000);
});
