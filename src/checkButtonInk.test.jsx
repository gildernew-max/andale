/**
 * Lesson Check and the lime Continue share Btn with the paywall annual button.
 * Only the lesson labels move to #1F3A1A. The paywall ONE YEAR label stays white.
 * A wrong answer keeps the red Continue on the white label. Disabled Btn ink stays lockIcon.
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
const WHITE = "#ffffff";

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

const bootLesson = async (theme, uiLang = "es") => {
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
      questions: [question, { ...question, prompt: "Siguiente." }],
    },
  }));
  render(<App />);
  await waitFor(() => expect(norm(screen.getByTestId("app-shell").style.background)).toBe(theme === "dark" ? "#15171c" : "#f6efe4"));
  return screen.findByTestId("lesson-check");
};

const continueButton = (uiLang) => screen.getByRole("button", { name: uiLang === "en" ? /^Continue$/i : /^Continuar$/i });

describe("lesson Check and Continue ink", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("keeps the lime face and lip, and only the lesson label uses #1F3A1A", () => {
    expect(Number(contrastRatio(INK, LIME).toFixed(2))).toBe(5.99);
    expect(appSrc).toContain('const LESSON_LIME_INK = "#1F3A1A"');
    expect(appSrc).toContain("disabled ? D.lockIcon : (ink || CONTINUE_LABEL)");
    expect((appSrc.match(/data-testid="lesson-check" ink=\{LESSON_LIME_INK\}/g) || []).length).toBe(2);
    expect((appSrc.match(/ink=\{status === "wrong" \? CONTINUE_LABEL : LESSON_LIME_INK\}/g) || []).length).toBe(2);
    const annual = appSrc.slice(appSrc.indexOf('data-testid="soft-paywall-annual"') - 40, appSrc.indexOf('data-testid="soft-paywall-annual"') + 160);
    expect(annual).not.toContain("LESSON_LIME_INK");
    expect(annual).not.toContain("ink=");
  });

  it.each([
    ["light", "es", "Comprobar", "Continuar"],
    ["dark", "es", "Comprobar", "Continuar"],
    ["light", "en", "Check", "Continue"],
    ["dark", "en", "Check", "Continue"],
  ])("%s %s Check and lime Continue are #1F3A1A on #58CC02", async (theme, uiLang, checkLabel, continueLabel) => {
    const check = await bootLesson(theme, uiLang);
    expect(check.disabled).toBe(false);
    expect(check.textContent).toBe(checkLabel);
    expect(norm(check.style.background)).toBe(LIME);
    expect(norm(check.style.color)).toBe(INK);
    expect(norm(check.style.borderBottom)).toBe(LIP);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /vengas/ }));
    await user.click(check);
    const cont = await waitFor(() => continueButton(uiLang));
    expect(cont.disabled).toBe(false);
    expect(cont.textContent).toBe(continueLabel);
    expect(norm(cont.style.background)).toBe(LIME);
    expect(norm(cont.style.color)).toBe(INK);
    expect(norm(cont.style.borderBottom)).toBe(LIP);
    expect(screen.queryByTestId("lesson-check")).toBeNull();
  });

  it.each(["light", "dark"])("a wrong %s Continue stays white on red", async (theme) => {
    const check = await bootLesson(theme, "es");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /vienes/ }));
    await user.click(check);
    const cont = await waitFor(() => continueButton("es"));
    expect(cont.textContent).toBe("Continuar");
    expect(norm(cont.style.color)).toBe(WHITE);
    expect(norm(cont.style.background)).toBe(theme === "dark" ? "#ff6b6b" : "#ff4b4b");
    expect(norm(cont.style.borderBottom)).toBe("#ea2b2b");
  });

  it.each([
    ["light", "es", "Un año"],
    ["dark", "en", "One year"],
  ])("paywall ONE YEAR ink stays white in %s %s", async (theme, uiLang, label) => {
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
    expect(norm(annual.style.color)).toBe(WHITE);
    expect(norm(annual.style.borderBottom)).toBe(LIP);
    expect(norm(annual.style.color)).not.toBe(INK);
  });
});
