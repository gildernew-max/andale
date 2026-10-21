/** Hoy tile ✓ only when today is done (Varys walk-381-382, Oct 21). The tile art used to carry a baked-in ✓. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "./App.jsx";
import { dayKeyFromDate, prevDayKey } from "./firstDoor.js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const mockBrowser = () => {
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [], speak: vi.fn(), cancel() {}, resume() {}, addEventListener() {}, removeEventListener() {} } });
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

function seed({ today, lastDay, missions = {}, xpToday = 0, uiLang = "es" }) {
  localStorage.clear(); sessionStorage.clear(); mockBrowser();
  const d1 = prevDayKey(prevDayKey(today));
  localStorage.setItem("andale-v3", JSON.stringify({ welcomed: true, xp: 60, xpToday, gems: 15, name: "Ana", contentVersion: 2, hearts: 5, onboardingDone: true, firstSessionDone: true, paywallSeen: true, bajioUnlockSeen: true, lecturaStartedAt: 1, streak: 2, lastDay, firstActivityDay: d1, theme: "light", uiLang, done: { u1: 1 }, missions, stories: { "story-0": true, "story-1": true } }));
  localStorage.setItem("andale-first-activity", d1);
  render(<App />);
}

describe("Hoy tile done check", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it.each(["es", "en"])("%s: new day after completing yesterday (scene + goal) shows no check", async (uiLang) => {
    const today = dayKeyFromDate(new Date());
    const yd = prevDayKey(today);
    seed({ today, lastDay: yd, missions: { [`scene-${yd}`]: true }, xpToday: 80, uiLang });
    const tile = await screen.findByTestId("hub-hoy");
    expect(screen.queryByTestId("hub-hoy-done")).toBeNull();
    expect(tile.getAttribute("data-hub-hoy-done")).toBeNull();
  });

  it("today's scene completed shows the check", async () => {
    const today = dayKeyFromDate(new Date());
    seed({ today, lastDay: today, missions: { [`scene-${today}`]: true } });
    await screen.findByTestId("hub-hoy");
    expect(screen.getByTestId("hub-hoy-done").textContent).toBe("✓");
  });

  it("the Hoy tile art carries no baked-in check (bubble painted out)", () => {
    const sha = createHash("sha256").update(readFileSync("public/hub/hoy.png")).digest("hex");
    expect(sha).toBe("712bad3faca8bb2dd75922f959e955b7efba226ef7a562418489b0b89a09dca4");
  });
});
