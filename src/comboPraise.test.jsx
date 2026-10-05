/**
 * Combo praise (¡PERFECTO! and the rest) leaves with the feedback panel on CONTINUE.
 * It must not still be on screen once the next prompt paints.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const question = {
  type: "mc",
  prompt: "Espero que ___ a la fiesta.",
  choices: ["vienes", "vengas"],
  shuffledChoices: ["vengas", "vienes"],
  answer: "vengas",
  fixedChoices: true,
};

const nextQuestion = {
  ...question,
  prompt: "Siguiente frase.",
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

const bootComboLesson = async () => {
  localStorage.clear();
  mockBrowser();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true, xp: 42, gems: 9, name: "Ana", contentVersion: 2, hearts: 5,
    onboardingDone: true, firstSessionDone: true, paywallSeen: true, bajioUnlockSeen: true, done: {},
    uiLang: "es",
  }));
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "lesson",
    tab: "camino",
    qi: 0,
    status: "idle",
    combo: 3,
    selected: null,
    lessonStats: { right: 3, wrong: 0 },
    session: {
      title: "Subjuntivo presente",
      host: "luna",
      unitId: "subj1",
      color: "#58CC02",
      dark: "#46A302",
      questions: [question, nextQuestion],
    },
  }));
  const user = userEvent.setup();
  render(<App />);
  await screen.findByTestId("lesson-check");
  return user;
};

describe("combo praise clears on CONTINUE", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("keeps the praise words and the orange ink, and CONTINUE clears before the next item", () => {
    expect(appSrc).toContain('const INTERSTITIALS = ["¡PERFECTO!", "¡INCREÍBLE!", "¡IMPARABLE!", "¡QUÉ PADRE!"]');
    expect(appSrc).toContain('data-testid="combo-praise"');
    expect(appSrc).toContain('color: "#FF9600"');
    expect(appSrc).toContain("fontWeight: 900, fontSize: 42");
    expect(appSrc).toContain('{inter && (status === "correct" || status === "almost") && (');
    expect(appSrc).toContain("key={`praise-${inter.key}`}");
    expect(appSrc).toContain("key={`burst-${burst}`}");
    const nextStart = appSrc.indexOf("const next = () => {");
    const nextBody = appSrc.slice(nextStart, nextStart + 280);
    expect(nextBody.startsWith("const next = () => {\n    clearComboPraise();")).toBe(true);
  });

  it("shows ¡PERFECTO! on the feedback panel, then drops it with CONTINUE before the next prompt", async () => {
    const user = await bootComboLesson();
    expect(screen.queryByTestId("combo-praise")).toBeNull();
    expect(screen.getByText("Espero que ___ a la fiesta.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /vengas/ }));
    await user.click(screen.getByTestId("lesson-check"));

    const praise = await screen.findByTestId("combo-praise");
    expect(praise.textContent).toBe("¡PERFECTO!");
    expect(screen.getByTestId("practice-quip")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy();
    expect(screen.queryByText("Siguiente frase.")).toBeNull();

    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));

    expect(screen.queryByTestId("combo-praise")).toBeNull();
    expect(screen.queryByText("¡PERFECTO!")).toBeNull();
    expect(screen.queryByText("¡INCREÍBLE!")).toBeNull();
    expect(screen.queryByTestId("practice-quip")).toBeNull();
    expect(screen.getByText("Siguiente frase.")).toBeTruthy();
    expect(screen.getByTestId("lesson-check")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /vengas/ }));
    await user.click(screen.getByTestId("lesson-check"));
    expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy();
    expect(screen.getByTestId("practice-quip")).toBeTruthy();
    expect(screen.queryByTestId("combo-praise")).toBeNull();
    expect(screen.queryByText("¡PERFECTO!")).toBeNull();
  });

  it("keeps praise on the feedback panel until CONTINUE", async () => {
    const user = await bootComboLesson();
    await user.click(screen.getByRole("button", { name: /vengas/ }));
    await user.click(screen.getByTestId("lesson-check"));
    expect((await screen.findByTestId("combo-praise")).textContent).toBe("¡PERFECTO!");

    await new Promise((resolve) => { setTimeout(resolve, 40); });
    expect(screen.getByTestId("combo-praise").textContent).toBe("¡PERFECTO!");
    expect(screen.getByText("Espero que ___ a la fiesta.")).toBeTruthy();
    expect(screen.queryByText("Siguiente frase.")).toBeNull();
  });
});
