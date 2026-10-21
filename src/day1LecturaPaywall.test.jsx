/** Day-1 Lectura win opens the soft paywall after CONTINUE (Hand, team vote Oct 21). Other day-1 wins stay free. */
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

const LECTURA_WIN = { lecturaWin: true, storyId: "story-1", title: "La casa azul" };
const HOY_WIN = { firstHoy: true, title: "Hoy", host: "luna" };
const seenEvents = () => JSON.parse(localStorage.getItem("andale-funnel-log") || "[]").filter((e) => e.event === "paywall_seen");
const tapContinue = async () => {
  const btn = await screen.findByTestId(/win-continue$/);
  // The beat is on screen and the card is not painted over it.
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  fireEvent.click(btn);
  await new Promise((r) => setTimeout(r, 50));
};

describe("day-1 Lectura win paywall", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("a day-1 Lectura story win opens the card once, after CONTINUE, tagged lectura_win day 1", async () => {
    seedWin(LECTURA_WIN);
    await tapContinue();
    expect(await screen.findByTestId("soft-paywall")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-dismiss")).toBeTruthy();
    const seen = seenEvents();
    expect(seen).toHaveLength(1);
    expect(seen[0].source).toBe("lectura_win");
    expect(seen[0].day).toBe(1);
    expect(localStorage.getItem("andale-paywall-shown")).toBe(today());
  });

  it("another win the same day does not open it again", async () => {
    seedWin(LECTURA_WIN, { shownToday: true });
    await tapContinue();
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(seenEvents()).toHaveLength(0);
  });

  it("a day-1 Hoy win stays paywall-free", async () => {
    seedWin(HOY_WIN);
    await tapContinue();
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(localStorage.getItem("andale-paywall-shown")).toBeNull();
  });
});
