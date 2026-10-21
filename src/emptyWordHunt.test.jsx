/** Lectura: no empty word-hunt card on stories without key words; «← Anterior» stays on one line. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "./App.jsx";
import { dayKeyFromDate, prevDayKey } from "./firstDoor.js";

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

function openStory(storyId, uiLang = "es") {
  localStorage.clear();
  sessionStorage.clear();
  mockBrowser();
  const today = dayKeyFromDate(new Date());
  const yd = prevDayKey(today);
  const n = Number(storyId.split("-")[1]);
  const stories = Object.fromEntries(Array.from({ length: n }, (_, i) => [`story-${i}`, true]));
  localStorage.setItem("andale-v3", JSON.stringify({ welcomed: true, xp: 42, gems: 9, name: "Ana", contentVersion: 2, hearts: 5, onboardingDone: true, firstSessionDone: true, paywallSeen: false, bajioUnlockSeen: true, cdmxUnlockSeen: true, lecturaStartedAt: 1, streak: 1, lastDay: today, firstActivityDay: yd, theme: "light", uiLang, done: {}, stories }));
  localStorage.setItem("andale-first-activity", yd);
  localStorage.setItem("andale-v3-live", JSON.stringify({ screen: "story", tab: "lectura", storyId, paraIdx: 0 }));
  render(<App />);
}

describe("word hunt card", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it.each(["story-3", "story-5", "story-9"])("%s has no key words: no hunt card and no 0/0 counter", async (id) => {
    openStory(id);
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe(id);
    expect(screen.queryByTestId("word-hunt-card")).toBeNull();
    expect(document.body.textContent).not.toMatch(/0\/0 palabras clave/);
  });

  it.each(["story-0", "story-2"])("%s keeps its hunt card unchanged", async (id) => {
    openStory(id);
    await screen.findByTestId("story-reader");
    const card = screen.getByTestId("word-hunt-card");
    expect(card.textContent).toMatch(/CACERÍA DE PALABRAS/);
    expect(card.textContent).toMatch(/0\/[1-9]\d* palabras clave encontradas/);
  });
});

describe("Lectura BACK label", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it.each(["es", "en"])("%s: the arrow and the word share one line, words unchanged", async (lang) => {
    openStory("story-3", lang);
    await screen.findByTestId("story-reader");
    const back = screen.getByTestId("lectura-back");
    expect(back.textContent).toBe(lang === "en" ? "← Back" : "← Anterior");
    expect(back.style.whiteSpace).toBe("nowrap");
  });
});
