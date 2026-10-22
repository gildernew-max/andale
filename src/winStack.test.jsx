/** Win screen: the sticky CONTINUE sits on an opaque bar and the page reserves room for it, so REPASAR is never half-covered (No face, Oct 21). */
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

const today = () => dayKeyFromDate(new Date());

function seedWin(session, { shownToday = false } = {}) {
  localStorage.clear(); sessionStorage.clear(); mockBrowser();
  const t = today();
  localStorage.setItem("andale-v3", JSON.stringify({ welcomed: true, xp: 42, gems: 9, name: "Ana", contentVersion: 2, hearts: 5, onboardingDone: true, firstSessionDone: true, paywallSeen: false, bajioUnlockSeen: true, cdmxUnlockSeen: true, lecturaStartedAt: 1, streak: 1, lastDay: t, firstActivityDay: t, theme: "light", uiLang: "es", done: {}, stories: { "story-0": true } }));
  localStorage.setItem("andale-first-activity", t);
  if (shownToday) localStorage.setItem("andale-paywall-shown", t);
  localStorage.setItem("andale-v3-live", JSON.stringify({ screen: "done", tab: "lectura", lessonStats: { right: 3, wrong: 0 }, session: { questions: [{}], awarded: true, earnedXP: 35, earnedGems: 10, host: "rafa", ...session } }));
  render(<App />);
}

describe("win stack: CONTINUE never covers REPASAR", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("CONTINUE sits alone on an opaque fixed bar; the page reserves the bar plus a 12px gap", async () => {
    seedWin({ firstStory0: true, storyId: "story-0", title: "La noche en que vuelven" });
    const btn = await screen.findByTestId(/win-continue$/);
    const bar = screen.getByTestId("win-continue-bar");
    expect(bar.contains(btn)).toBe(true);
    expect(bar.style.position).toBe("fixed");
    expect(bar.style.bottom).toBe("0px");
    expect(bar.style.background).not.toBe("");
    expect(bar.style.background).not.toMatch(/transparent/);
    expect(btn.style.position).not.toBe("fixed");
    expect(bar.querySelectorAll("button")).toHaveLength(1);
    // Bar = 8 top + 50 button + 16 bottom; reserve = that + 12 gap.
    expect(screen.getByTestId("lesson-win").style.paddingBottom).toMatch(/calc\(86px/);
  }, 30000);
});
