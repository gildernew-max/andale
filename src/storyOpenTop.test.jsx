/** Story reader: opening a story from the Stories list lands at the top (Varys, Oct 20). */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

function seedList() {
  localStorage.clear();
  sessionStorage.clear();
  mockBrowser();
  const today = dayKeyFromDate(new Date());
  const yd = prevDayKey(today);
  localStorage.setItem("andale-v3", JSON.stringify({ welcomed: true, xp: 42, gems: 9, name: "Ana", contentVersion: 2, hearts: 5, onboardingDone: true, firstSessionDone: true, paywallSeen: false, bajioUnlockSeen: true, cdmxUnlockSeen: true, lecturaStartedAt: 1, streak: 1, lastDay: today, firstActivityDay: yd, theme: "light", uiLang: "es", done: {}, stories: { "story-0": true, "story-1": true, "story-2": true } }));
  localStorage.setItem("andale-first-activity", yd);
  localStorage.setItem("andale-v3-live", JSON.stringify({ screen: "home", tab: "lectura" }));
}

const lifts = (fn) => fn.mock.calls.filter((c) => c[0] && typeof c[0] === "object" && c[0].behavior === "smooth");
const rect = (top, bottom) => () => ({ top, bottom, left: 0, right: 320, width: 320, height: bottom - top, x: 0, y: top, toJSON() {} });

describe("opening a story lands at the top", () => {
  afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

  for (const id of ["story-2", "story-3"]) {
    it(`${id} from the list resets the list scroll and holds the arrival lift; scrolling down still lifts and the first tap counts`, async () => {
      seedList();
      Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 640 });
      const scrollTo = vi.fn((x, y) => { window.scrollY = typeof x === "object" ? x.top : y; });
      const scrollBy = vi.fn();
      window.scrollTo = scrollTo;
      window.scrollBy = scrollBy;
      let answersRect = rect(698, 794); // p1 answers below the fold at scroll 0 (360x640 walk)
      const orig = Element.prototype.getBoundingClientRect;
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function () {
        const tid = this.getAttribute && this.getAttribute("data-testid");
        if (tid === "lectura-advance") return rect(560, 640)();
        if (tid === "lectura-checkpoint-answers") return answersRect();
        return orig.call(this);
      });
      render(<App />);
      const nav = screen.queryByTestId("nav-lectura");
      if (nav) fireEvent.click(nav);
      const shelf = await screen.findByTestId(`story-shelf-${id}`);
      window.scrollY = 787;
      scrollTo.mockClear();
      fireEvent.click(shelf);
      await screen.findByTestId("story-reader");
      expect(scrollTo).toHaveBeenCalledWith(0, 0);
      expect(window.scrollY).toBe(0);
      await new Promise((r) => setTimeout(r, 1200));
      expect(lifts(scrollBy)).toHaveLength(0);
      answersRect = rect(520, 616);
      window.scrollY = 200; window.dispatchEvent(new Event("scroll"));
      await new Promise((r) => setTimeout(r, 50));
      expect(lifts(scrollBy)).toHaveLength(1);
      expect(lifts(scrollBy)[0][0].top).toBe(616 - (560 - 12));
      const answers = screen.getByTestId("lectura-checkpoint-answers");
      const first = answers.querySelector("button");
      fireEvent.click(first);
      expect([...answers.querySelectorAll("button")].every((b) => b.disabled)).toBe(true);
    });
  }
});
