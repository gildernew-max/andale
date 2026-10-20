/** Story reader: checkpoint answers are lifted above the pinned BACK/NEXT row (Varys, Oct 20). */
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

function seedStory(paraIdx = 0) {
  localStorage.clear();
  sessionStorage.clear();
  mockBrowser();
  const today = dayKeyFromDate(new Date());
  const yd = prevDayKey(today);
  localStorage.setItem("andale-v3", JSON.stringify({ welcomed: true, xp: 42, gems: 9, name: "Ana", contentVersion: 2, hearts: 5, onboardingDone: true, firstSessionDone: true, paywallSeen: false, bajioUnlockSeen: true, cdmxUnlockSeen: true, lecturaStartedAt: 1, streak: 1, lastDay: today, firstActivityDay: yd, theme: "light", uiLang: "es", done: {} }));
  localStorage.setItem("andale-first-activity", yd);
  localStorage.setItem("andale-v3-live", JSON.stringify({ screen: "story", tab: "lectura", storyId: "story-0", paraIdx }));
}

const lifts = (fn) => fn.mock.calls.filter((c) => c[0] && typeof c[0] === "object" && c[0].behavior === "smooth");
const rect = (top, bottom) => () => ({ top, bottom, left: 0, right: 320, width: 320, height: bottom - top, x: 0, y: top, toJSON() {} });

describe("checkpoint answers vs the pinned row", () => {
  afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

  it("scrolling down until the answers slide under the row lifts them once", async () => {
    seedStory(0);
    render(<App />);
    const answers = await screen.findByTestId("lectura-checkpoint-answers");
    const bar = screen.getByTestId("lectura-advance");
    bar.getBoundingClientRect = rect(540, 640);
    answers.getBoundingClientRect = rect(800, 862);
    await new Promise((r) => setTimeout(r, 500));
    const scrollBy = vi.fn();
    window.scrollBy = scrollBy;
    window.scrollY = 100; window.dispatchEvent(new Event("scroll"));
    await new Promise((r) => setTimeout(r, 50));
    expect(lifts(scrollBy)).toHaveLength(0);
    answers.getBoundingClientRect = rect(512, 574);
    window.scrollY = 390; window.dispatchEvent(new Event("scroll"));
    await new Promise((r) => setTimeout(r, 50));
    expect(lifts(scrollBy)).toHaveLength(1);
    expect(lifts(scrollBy)[0][0].top).toBe(574 - (540 - 12));
    window.scrollY = 395; window.dispatchEvent(new Event("scroll"));
    await new Promise((r) => setTimeout(r, 50));
    expect(lifts(scrollBy)).toHaveLength(1);
  });

  it("scrolling up never pulls the page back down", async () => {
    seedStory(0);
    window.scrollY = 600;
    render(<App />);
    const answers = await screen.findByTestId("lectura-checkpoint-answers");
    screen.getByTestId("lectura-advance").getBoundingClientRect = rect(540, 640);
    answers.getBoundingClientRect = rect(800, 862);
    await new Promise((r) => setTimeout(r, 500));
    window.scrollY = 600; window.dispatchEvent(new Event("scroll"));
    await new Promise((r) => setTimeout(r, 50));
    const scrollBy = vi.fn();
    window.scrollBy = scrollBy;
    answers.getBoundingClientRect = rect(512, 574);
    window.scrollY = 300; window.dispatchEvent(new Event("scroll"));
    await new Promise((r) => setTimeout(r, 50));
    expect(lifts(scrollBy)).toHaveLength(0);
  });

  it("a page that opens with answers peeking under the row lifts them once it settles", async () => {
    seedStory(3);
    window.scrollY = 0;
    const scrollBy = vi.fn();
    window.scrollBy = scrollBy;
    const orig = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function () {
      const id = this.getAttribute && this.getAttribute("data-testid");
      if (id === "lectura-advance") return rect(744, 844)();
      if (id === "lectura-checkpoint-answers") return rect(736, 798)();
      return orig.call(this);
    });
    render(<App />);
    await screen.findByTestId("lectura-checkpoint-answers");
    await new Promise((r) => setTimeout(r, 600));
    expect(lifts(scrollBy)).toHaveLength(1);
    expect(lifts(scrollBy)[0][0].top).toBe(798 - (744 - 12));
  });
});
