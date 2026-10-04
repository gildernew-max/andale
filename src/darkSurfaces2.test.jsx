/**
 * Dark Rayo ON and the Avanzado / Maestría lane blooms.
 * Light Rayo stays #FFF6DC / #E6A800 / #FFC800. Light lanes keep the white bloom.
 * Approved dark Rayo: fill #3A2A1A, edge #FFD43B, ink #FFD43B (9.65:1).
 * Dark lanes drop the white radial glow and stay on card #1E2128, edge #2A2E36.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

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
    welcomed: true, xp: 80, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "es",
    onboardingDone: true, firstSessionDone: true, paywallSeen: true, streak: 1, sound: false, done: {}, stories: {},
    ...extra,
  }));
};

const boot = async (theme, extra = {}) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  seed({ theme, ...extra });
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("app-shell")).toBeTruthy());
};

const lane = (n) => document.querySelector(`[data-testid="section-lane"][data-section="${n}"]`);
const banner = (n) => document.querySelector(`[data-testid="hub-section-banner"][data-section="${n}"]`);
const blooms = (n) => [...lane(n).children].slice(0, 2).map((el) => el.style.background);
const LIGHT_BLOOM_HI = "radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0) 70%)";
const LIGHT_BLOOM_LO = "radial-gradient(circle, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0) 70%)";

describe("dark Rayo ON and Camino lane blooms", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("paints Rayo ON with the dark gold plate and keeps the light cream pill", async () => {
    await boot("dark", { rayo: true });
    const on = await screen.findByTestId("rayo-toggle");
    expect(on.textContent).toMatch(/ON/);
    const cs = getComputedStyle(on);
    expect(norm(cs.backgroundColor)).toBe("#3a2a1a");
    expect(norm(cs.color)).toBe("#ffd43b");
    expect(norm(cs.borderTopColor)).toBe("#ffd43b");
    expect(norm(cs.borderBottomColor)).toBe("#ffd43b");
    expect(norm(screen.getByTestId("app-shell").style.background)).toBe("#15171c");
    expect(Number(contrastRatio("#FFD43B", "#3A2A1A").toFixed(2))).toBe(9.65);
    expect(contrastRatio("#FFD43B", "#3A2A1A")).toBeGreaterThanOrEqual(4.5);

    await boot("light", { rayo: true });
    const light = await screen.findByTestId("rayo-toggle");
    expect(light.textContent).toMatch(/ON/);
    const lightCs = getComputedStyle(light);
    expect(norm(lightCs.backgroundColor)).toBe("#fff6dc");
    expect(norm(lightCs.color)).toBe("#e6a800");
    expect(norm(lightCs.borderTopColor)).toBe("#ffc800");
    expect(norm(lightCs.borderBottomColor)).toBe("#e6a800");
  });

  it("drops the white bloom on dark Avanzado and Maestría and keeps it in light", async () => {
    await boot("dark");
    await waitFor(() => expect(lane(2)).toBeTruthy());
    expect(norm(screen.getByTestId("app-shell").style.background)).toBe("#15171c");
    for (const n of [1, 2]) {
      expect(norm(lane(n).style.background)).toBe("#1e2128");
      expect(norm(banner(n).style.background)).toBe("#1e2128");
      expect(norm(getComputedStyle(banner(n)).borderTopColor)).toBe("#2a2e36");
      expect(blooms(n)).toEqual(["transparent", "transparent"]);
      expect(lane(n).innerHTML).not.toContain("rgba(255, 255, 255");
    }
    expect(blooms(0)).toEqual(["transparent", "transparent"]);

    await boot("light");
    await waitFor(() => expect(lane(2)).toBeTruthy());
    expect(norm(lane(0).style.background)).toBe("#f3fbea");
    expect(norm(lane(1).style.background)).toBe("#f8f0ff");
    expect(norm(lane(2).style.background)).toBe("#eaf7fe");
    for (const n of [0, 1, 2]) {
      expect(blooms(n)).toEqual([LIGHT_BLOOM_HI, LIGHT_BLOOM_LO]);
    }
  });
});
