/**
 * Lesson results stay one row beside Continue, long or short.
 * The text column keeps minWidth 0 and a 14px gap to the button.
 * A result taller than 60vh still uses the footer cap.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";
import { LIVE_KEY, mockBrowser, seedProgress } from "./flowsHarness.jsx";

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");

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

const FOOTER_BG = {
  light: { correct: "#d7ffb8", almost: "#d7ffb8", wrong: "#ffdfe0" },
  dark: { correct: "#1f3a1a", almost: "#1f3a1a", wrong: "#3a1a1a" },
};
const BUTTON_BG = {
  light: { correct: "#58cc02", almost: "#58cc02", wrong: "#ff4b4b" },
  dark: { correct: "#58cc02", almost: "#58cc02", wrong: "#ff6b6b" },
};
const BUTTON_INK = { correct: "#1f3a1a", almost: "#1f3a1a", wrong: "#ffffff" };

const QUIP = { es: "Eso suena natural.", en: "That sounds natural." };
const SHORT_EXPLAIN = { es: "Claro.", en: "Clear." };
const LONG_EXPLAIN = {
  es: "«Ojalá» siempre pide subjuntivo, y aquí el verbo tiene que concordar con la lluvia de mañana, no con el presente de indicativo.",
  en: "«Ojalá» always takes the subjunctive, and here the verb has to agree with tomorrow’s rain, not the present indicative.",
};

const continueLabel = (uiLang) => (uiLang === "en" ? "Continue" : "Continuar");

const bootResult = async ({ theme, uiLang, status, explain, quip = QUIP, review = false }) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  seedProgress({
    uiLang,
    theme,
    hearts: 5,
    onboardingDone: true,
    firstSessionDone: true,
    paywallSeen: true,
    bajioUnlockSeen: true,
  });
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "lesson",
    tab: "camino",
    status,
    qi: 0,
    typed: "",
    selected: status === "wrong" ? 0 : 1,
    quip,
    showWhy: false,
    lessonStats: { right: status === "wrong" ? 0 : 1, wrong: status === "wrong" ? 1 : 0 },
    session: {
      title: "Subjuntivo",
      host: "luna",
      unitId: "subj1",
      color: "#58CC02",
      dark: "#46A302",
      review,
      questions: [{
        type: "mc",
        prompt: "Espero que ___ a la fiesta.",
        choices: ["vienes", "vengas"],
        shuffledChoices: ["vengas", "vienes"],
        answer: "vengas",
        fixedChoices: true,
        explain,
      }],
    },
  }));
  render(<App />);
};

const expectSideBySide = (label) => {
  const footer = screen.getByTestId("lesson-footer");
  const row = footer.firstElementChild;
  const text = screen.getByTestId("lesson-footer-text");
  expect(footer.getAttribute("data-capped"), label).toBe("0");
  expect(screen.queryByTestId("lesson-footer-scroll"), label).toBeNull();
  expect(screen.queryByTestId("lesson-footer-actions"), label).toBeNull();
  expect(screen.queryByTestId("lesson-footer-continue-block"), label).toBeNull();
  expect(screen.queryByTestId("lesson-footer-feedback-row"), label).toBeNull();
  expect(row.style.display, label).toBe("flex");
  expect(row.style.flexWrap, label).toBe("nowrap");
  expect(row.style.alignItems, label).toBe("center");
  expect(row.style.gap, label).toBe("14px");
  expect(text.style.minWidth, label).toBe("0px");
  expect(text.style.overflowWrap, label).toBe("break-word");
  expect(text.style.whiteSpace, label).toBe("normal");
  expect(text.style.textOverflow, label).toBe("clip");
  expect(text.style.overflow, label).toBe("visible");
  expect(row.contains(text), label).toBe(true);
  return { footer, row, text };
};

describe("lesson results stay beside Continue", () => {
  const prevW = window.innerWidth;
  const prevH = window.innerHeight;

  afterEach(() => {
    cleanup();
    localStorage.clear();
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: prevW });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: prevH });
  });

  it("pads the lesson body by the measured panel and does not stack Continue", () => {
    expect(appSrc).not.toContain("LESSON_FOOTER_LONG_FEEDBACK_CHARS");
    expect(appSrc).not.toContain("lesson-footer-continue-block");
    expect(appSrc).not.toContain("lesson-footer-feedback-row");
    expect(appSrc).toContain("const [lessonResultPad, setLessonResultPad] = useState(0)");
    expect(appSrc).toContain("paddingBottom: lessonResultPad");
    expect(appSrc).toContain('flexWrap: "nowrap"');
    expect(appSrc).toContain('data-testid="lesson-footer-text"');
  });

  it("keeps a long explain on the same row as Continue", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 844 });
    for (const status of ["correct", "almost", "wrong"]) {
      for (const theme of ["light", "dark"]) {
        for (const uiLang of ["en", "es"]) {
          const label = `${status} ${theme} ${uiLang}`;
          await bootResult({ theme, uiLang, status, explain: LONG_EXPLAIN });
          const cont = await waitFor(() => screen.getByRole("button", { name: continueLabel(uiLang) }));
          const { footer, row } = expectSideBySide(label);
          const quip = screen.getByTestId("practice-quip");
          expect(cont.parentElement, label).toBe(row);
          expect(cont.style.width, label).toBe("");
          expect(cont.style.flexBasis, label).toBe("");
          expect(cont.style.flexShrink, label).toBe("0");
          expect(cont.style.marginTop, label).toBe("auto");
          expect(row.contains(quip), label).toBe(true);
          expect(row.querySelector("svg")?.getAttribute("width"), label).toBe("58");
          expect(norm(footer.style.background), label).toBe(FOOTER_BG[theme][status]);
          expect(norm(cont.style.background), label).toBe(BUTTON_BG[theme][status]);
          expect(norm(cont.style.color), label).toBe(BUTTON_INK[status]);
          expect(quip.textContent, label).toContain(QUIP[uiLang]);
          if (status !== "wrong") expect(quip.textContent, label).toContain(LONG_EXPLAIN[uiLang].slice(0, 24));
        }
      }
    }
  }, 60000);

  it("keeps a short explain on that same row", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 844 });
    for (const status of ["correct", "almost", "wrong"]) {
      for (const theme of ["light", "dark"]) {
        for (const uiLang of ["en", "es"]) {
          const label = `${status} ${theme} ${uiLang}`;
          await bootResult({ theme, uiLang, status, explain: SHORT_EXPLAIN });
          const cont = await waitFor(() => screen.getByRole("button", { name: continueLabel(uiLang) }));
          const { footer, row } = expectSideBySide(label);
          expect(cont.parentElement, label).toBe(row);
          expect(cont.style.width, label).toBe("");
          expect(cont.style.flexBasis, label).toBe("");
          expect(cont.style.flexShrink, label).toBe("0");
          expect(cont.style.marginTop, label).toBe("auto");
          expect(row.contains(screen.getByTestId("practice-quip")), label).toBe(true);
          expect(row.querySelector("svg")?.getAttribute("width"), label).toBe("58");
          expect(norm(footer.style.background), label).toBe(FOOTER_BG[theme][status]);
          expect(norm(cont.style.background), label).toBe(BUTTON_BG[theme][status]);
          expect(norm(cont.style.color), label).toBe(BUTTON_INK[status]);
        }
      }
    }
  }, 60000);

  it("follows uiLang for a long explain and a short one without stacking", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 844 });
    const quip = { es: "Listo.", en: "Done." };
    await bootResult({
      theme: "light",
      uiLang: "es",
      status: "correct",
      quip,
      explain: { es: "x".repeat(120), en: "Short." },
    });
    const longEs = await waitFor(() => screen.getByRole("button", { name: "Continuar" }));
    expectSideBySide("long es");
    expect(longEs.parentElement).toBe(screen.getByTestId("lesson-footer").firstElementChild);
    expect(screen.getByTestId("practice-quip").textContent).toContain("x".repeat(40));

    await bootResult({
      theme: "dark",
      uiLang: "en",
      status: "correct",
      quip,
      explain: { es: "x".repeat(120), en: "Short." },
    });
    const shortEn = await waitFor(() => screen.getByRole("button", { name: "Continue" }));
    expectSideBySide("short en");
    expect(shortEn.parentElement).toBe(screen.getByTestId("lesson-footer").firstElementChild);
    expect(screen.getByTestId("practice-quip").textContent).toContain("Short.");
  }, 30000);

  it("leaves review self-grade buttons on the single row", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 844 });
    await bootResult({ theme: "light", uiLang: "en", status: "correct", explain: LONG_EXPLAIN, review: true });
    const easy = await waitFor(() => screen.getByRole("button", { name: "Easy" }));
    const { row } = expectSideBySide("review");
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(row.contains(easy)).toBe(true);
    expect(row.contains(screen.getByRole("button", { name: "Hard" }))).toBe(true);
    expect(row.contains(screen.getByRole("button", { name: "Good" }))).toBe(true);
  });
});
