/**
 * Lesson Check, the lime Continue, and the paywall ONE YEAR label use #1F3A1A on #58CC02.
 * Continue free and the fine print stay on their own colors.
 * A wrong answer paints the red Continue label #3A1A1A. Disabled Btn ink stays lockIcon.
 * An empty lesson Check is the grey face and a no-op. The first answer paints lime #1F3A1A.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { dayKeyFromDate } from "./firstDoor.js";

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const LIME = "#58cc02";
const LIP = "#46a302";
const INK = "#1f3a1a";
const WRONG_INK = "#3a1a1a";

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

const question = {
  type: "mc",
  prompt: "Espero que ___ a la fiesta.",
  choices: ["vienes", "vengas"],
  shuffledChoices: ["vengas", "vienes"],
  answer: "vengas",
  fixedChoices: true,
};

const mockBrowser = () => {
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { getVoices: () => [], speak: vi.fn(), cancel() {}, resume() {}, addEventListener() {}, removeEventListener() {} },
  });
  window.AudioContext = class {
    constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; }
    createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, detune: { setValueAtTime() {} }, type: "sine" }; }
    createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
    createBufferSource() { return { connect() {}, start() {}, stop() {}, buffer: null }; }
    createBiquadFilter() { return { connect() {}, type: "lowpass", frequency: { value: 0 } }; }
    resume() {}
  };
};

const seed = (extra = {}) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true, xp: 42, gems: 9, name: "Ana", contentVersion: 2, hearts: 5,
    onboardingDone: true, firstSessionDone: true, paywallSeen: true, bajioUnlockSeen: true, done: {},
    ...extra,
  }));
};

const bootLesson = async (theme, uiLang = "es", questions) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  seed({ theme, uiLang });
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "lesson",
    tab: "camino",
    qi: 0,
    status: "idle",
    selected: null,
    lessonStats: { right: 0, wrong: 0 },
    session: {
      title: "Subjuntivo presente",
      host: "luna",
      unitId: "subj1",
      color: "#58CC02",
      dark: "#46A302",
      questions: questions || [question, { ...question, prompt: "Siguiente." }],
    },
  }));
  render(<App />);
  await waitFor(() => expect(norm(screen.getByTestId("app-shell").style.background)).toBe(theme === "dark" ? "#15171c" : "#f6efe4"));
  return screen.findByTestId("lesson-check");
};

const emptyFace = (theme) => (theme === "dark"
  ? { fill: "#2a2e36", lip: "#1e2128", label: "#6b7078" }
  : { fill: "#e5e5e5", lip: "#cecece", label: "#afafaf" });

const expectEmptyCheck = (check, theme) => {
  const face = emptyFace(theme);
  expect(check.disabled).toBe(true);
  expect(norm(check.style.background)).toBe(face.fill);
  expect(norm(check.style.color)).toBe(face.label);
  expect(norm(check.style.borderBottom)).toBe(face.lip);
  expect(check.style.padding).toBe("13px 24px");
  expect(check.style.fontSize).toBe("15px");
  expect(check.style.borderRadius).toBe("14px");
};

const expectLimeCheck = (check) => {
  expect(check.disabled).toBe(false);
  expect(norm(check.style.background)).toBe(LIME);
  expect(norm(check.style.color)).toBe(INK);
  expect(norm(check.style.borderBottom)).toBe(LIP);
  expect(check.style.padding).toBe("13px 24px");
  expect(check.style.fontSize).toBe("15px");
  expect(check.style.borderRadius).toBe("14px");
};

const continueButton = (uiLang) => screen.getByRole("button", { name: uiLang === "en" ? /^Continue$/i : /^Continuar$/i });

describe("lesson Check and Continue ink", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("keeps the lime face and lip, and the lesson and paywall ONE YEAR labels use #1F3A1A", () => {
    expect(contrastRatio(INK, LIME)).toBeGreaterThanOrEqual(4.5);
    expect(Number(contrastRatio(INK, LIME).toFixed(2))).toBe(5.99);
    expect(appSrc).toContain('const LESSON_LIME_INK = "#1F3A1A"');
    expect(appSrc).toContain('fill: "#E5E5E5", lip: "#CECECE", label: "#AFAFAF"');
    expect(appSrc).toContain('fill: "#2A2E36", lip: "#1E2128", label: "#6B7078"');
    expect(appSrc).toContain("disabled ? D.lockIcon : (ink || CONTINUE_LABEL)");
    expect((appSrc.match(/data-testid="lesson-check" ink=\{LESSON_LIME_INK\}/g) || []).length).toBe(2);
    expect(appSrc).toContain('const WRONG_CONTINUE_INK = "#3A1A1A"');
    expect((appSrc.match(/ink=\{status === "wrong" \? WRONG_CONTINUE_INK : LESSON_LIME_INK\}/g) || []).length).toBe(2);
    expect((appSrc.match(/data-testid="soft-paywall-annual" ink=\{LESSON_LIME_INK\}/g) || []).length).toBe(1);
    const annual = appSrc.slice(appSrc.indexOf('data-testid="soft-paywall-annual"'), appSrc.indexOf('data-testid="soft-paywall-annual"') + 160);
    expect(annual).toContain("ink={LESSON_LIME_INK}");
    expect(appSrc).not.toContain('data-testid="soft-paywall-monthly" ink=');
    expect(appSrc).not.toContain('data-testid="soft-paywall-dismiss" ink=');
  });

  it.each([
    ["light", "es", "Comprobar", "Continuar"],
    ["dark", "es", "Comprobar", "Continuar"],
    ["light", "en", "Check", "Continue"],
    ["dark", "en", "Check", "Continue"],
  ])("%s %s Check and lime Continue are #1F3A1A on #58CC02", async (theme, uiLang, checkLabel, continueLabel) => {
    const check = await bootLesson(theme, uiLang);
    expect(check.textContent).toBe(checkLabel);
    expectEmptyCheck(check, theme);
    check.click();
    expect(screen.getByTestId("lesson-check")).toBe(check);
    expect(screen.queryByRole("button", { name: uiLang === "en" ? /^Continue$/i : /^Continuar$/i })).toBeNull();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /vengas/ }));
    expectLimeCheck(check);
    await user.click(check);
    const cont = await waitFor(() => continueButton(uiLang));
    expect(cont.disabled).toBe(false);
    expect(cont.textContent).toBe(continueLabel);
    expect(norm(cont.style.background)).toBe(LIME);
    expect(norm(cont.style.color)).toBe(INK);
    expect(norm(cont.style.borderBottom)).toBe(LIP);
    expect(screen.queryByTestId("lesson-check")).toBeNull();
  });

  it.each(["light", "dark"])("a %s keystroke, choice chip, or order tile turns the empty Check lime", async (theme) => {
    const user = userEvent.setup();
    const typed = await bootLesson(theme, "en", [{
      type: "type",
      prompt: "Escribe la oración.",
      answers: ["ojalá que llueva"],
      note: "una palabra de nueve letras",
    }]);
    expect(typed.textContent).toBe("Check");
    expectEmptyCheck(typed, theme);
    const field = screen.getByRole("textbox");
    await user.type(field, " ");
    expectEmptyCheck(typed, theme);
    await user.type(field, "o");
    expectLimeCheck(typed);
    await user.clear(field);
    expectEmptyCheck(typed, theme);

    const chip = await bootLesson(theme, "es", [{
      type: "type",
      prompt: "Ojalá que no ___ mañana.",
      answers: ["llueva"],
      answerAid: { mode: "choices", tiles: [{ id: "choice-0", w: "llueva" }, { id: "choice-1", w: "salga" }] },
    }]);
    expectEmptyCheck(chip, theme);
    chip.click();
    expect(screen.getByTestId("lesson-check")).toBe(chip);
    await user.click(screen.getByRole("button", { name: "llueva" }));
    expectLimeCheck(chip);

    const order = await bootLesson(theme, "es", [{
      type: "order",
      prompt: "Arma la frase.",
      answer: "dudo que sea verdad",
      words: ["dudo", "que", "sea", "verdad"],
      shuffledWords: [
        { w: "dudo", id: 0 },
        { w: "que", id: 1 },
        { w: "sea", id: 2 },
        { w: "verdad", id: 3 },
      ],
    }]);
    expectEmptyCheck(order, theme);
    await user.click(screen.getAllByTestId("bank-tile")[0]);
    expectLimeCheck(order);
    await user.click(screen.getByTestId("placed-tile"));
    expectEmptyCheck(order, theme);
  });

  it.each(["light", "dark"])("a wrong %s Continue is #3A1A1A on the red fill", async (theme) => {
    const check = await bootLesson(theme, "es");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /vienes/ }));
    await user.click(check);
    const cont = await waitFor(() => continueButton("es"));
    const fill = theme === "dark" ? "#ff6b6b" : "#ff4b4b";
    expect(cont.textContent).toBe("Continuar");
    expect(norm(cont.style.color)).toBe(WRONG_INK);
    expect(norm(cont.style.background)).toBe(fill);
    expect(norm(cont.style.borderBottom)).toBe("#ea2b2b");
    expect(contrastRatio(WRONG_INK, fill)).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ["light", "es", "Un año", "Seguir gratis", "#6b6258", "#6b6258"],
    ["dark", "en", "One year", "Continue free", "#cdbba6", "#a0a4ab"],
  ])("paywall ONE YEAR ink is #1F3A1A in %s %s", async (theme, uiLang, label, freeLabel, freeInk, fineInk) => {
    cleanup();
    localStorage.clear();
    mockBrowser();
    seed({
      theme,
      uiLang,
      paywallSeen: false,
      bajioUnlockSeen: true,
      lecturaStartedAt: 1,
      streak: 1,
      lastDay: dayKeyFromDate(new Date()),
    });
    localStorage.removeItem(LIVE_KEY);
    render(<App />);
    const annual = await screen.findByTestId("soft-paywall-annual");
    expect(annual.textContent).toBe(label);
    expect(annual.disabled).toBe(false);
    expect(norm(annual.style.background)).toBe(LIME);
    expect(norm(annual.style.color)).toBe(INK);
    expect(norm(annual.style.borderBottom)).toBe(LIP);
    expect(contrastRatio(norm(annual.style.color), LIME)).toBeGreaterThanOrEqual(4.5);

    const free = screen.getByTestId("soft-paywall-dismiss");
    expect(free.textContent).toBe(freeLabel);
    expect(norm(free.style.color)).toBe(freeInk);
    expect(norm(free.style.color)).not.toBe(INK);
    expect(free.style.background).toBe("none");

    const fine = screen.getByTestId("soft-paywall-disclosure");
    expect(norm(fine.style.color)).toBe(fineInk);
    expect(norm(fine.style.color)).not.toBe(INK);
  });
});
