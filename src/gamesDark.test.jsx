/**
 * Dark Games hub crossword mark and Ordena coach tags.
 * Light mark cells stay #FFFFFF. Light name tags stay the .nametag #fff rule.
 * Dark empty mark cells are #252830. Dark tags are #CDBBA6 on #1E2128 (8.63:1).
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";
import { CrosswordMark } from "./CrosswordPlayfield.jsx";

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
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
const fills = (container) => [...container.querySelectorAll("rect")].map((el) => el.getAttribute("fill"));

const ORDER_Q = {
  type: "order",
  prompt: "Construye: “I doubt that it’s true.”",
  words: ["Dudo", "que", "sea", "verdad", "es"],
  answer: "Dudo que sea verdad",
  shuffledWords: ["Dudo", "que", "sea", "verdad", "es"].map((w, id) => ({ w, id })),
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

const bootOrder = async (theme, host) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    theme, uiLang: "es", welcomed: true, firstSessionDone: true, contentVersion: 2,
    hearts: 5, name: "Dave", xp: 40, onboardingDone: true, paywallSeen: true,
  }));
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "lesson", tab: "camino", status: "idle", qi: 0, placed: [],
    session: {
      title: "Registro", unitId: "registro", host, color: "#58CC02", dark: "#46A302",
      questions: [ORDER_Q],
    },
  }));
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("order-tile-bank")).toBeTruthy());
};

describe("dark games hub mark and ordena tags", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("keeps light crossword-mark cells white and paints dark cells slate", () => {
    const light = render(<CrosswordMark />);
    const lightFills = fills(light.container);
    expect(lightFills.filter((fill) => fill === "#FFFFFF")).toHaveLength(5);
    expect(lightFills).toContain("#F6EFE4");
    light.unmount();

    const dark = render(<CrosswordMark tile="#1E2128" paper="#252830" />);
    const darkFills = fills(dark.container).map((fill) => fill.toLowerCase());
    expect(darkFills).not.toContain("#ffffff");
    expect(darkFills.filter((fill) => fill === "#252830")).toHaveLength(5);
    expect(darkFills).toContain("#1e2128");
    const strokes = [...dark.container.querySelectorAll("rect")].map((el) => (el.getAttribute("stroke") || "").toLowerCase());
    expect(strokes).toContain("#2a2e36");
    expect(strokes).not.toContain("#ffffff");

    const gamesAt = appSrc.indexOf('screen === "games"');
    const games = appSrc.slice(gamesAt, appSrc.indexOf("MATCH PAIRS", gamesAt));
    expect(games).toContain('paper={theme === "dark" ? D.subtle : "#FFFFFF"}');
    expect(appSrc).toContain(".nametag { display:inline-block; background:#fff;");
    expect(appSrc).not.toContain('theme === "dark" && name === "Luna"');
  });

  it("paints Ordena tiles and every coach tag without a white fill in dark, and keeps light tiles cream", async () => {
    await bootOrder("dark", "valeria");
    const tag = document.querySelector(".nametag");
    expect(norm(tag.style.background)).toBe("#1e2128");
    expect(norm(tag.style.color)).toBe("#cdbba6");
    expect(norm(tag.style.borderColor) || norm(tag.style.borderTopColor)).toBe("#2a2e36");
    expect(Number(contrastRatio("#CDBBA6", "#1E2128").toFixed(2))).toBe(8.63);
    screen.getAllByTestId("bank-tile").forEach((el) => {
      expect(norm(el.style.background)).toBe("#252830");
      expect(norm(el.style.color)).toBe("#f6efe4");
      expect(norm(el.style.background)).not.toBe("#ffffff");
    });
    expect(norm(screen.getByTestId("order-answer-row").style.background)).toBe("#1e2128");
    expect(norm(screen.getByTestId("order-prompt").style.background)).toBe("#1e2128");
    expect(Number(contrastRatio("#F6EFE4", "#252830").toFixed(2))).toBe(12.9);
    expect(Number(contrastRatio("#F6EFE4", "#1E2128").toFixed(2))).toBe(14.11);

    await bootOrder("light", "valeria");
    const lightTag = document.querySelector(".nametag");
    expect(lightTag.style.background).toBe("");
    expect(lightTag.style.color).toBe("");
    screen.getAllByTestId("bank-tile").forEach((el) => {
      expect(norm(el.style.background)).toBe("#f6efe4");
      expect(norm(el.style.color)).toBe("#3c3c3c");
    });
    expect(norm(screen.getByTestId("order-answer-row").style.background)).toBe("#f6efe4");
    expect(screen.getByTestId("order-cream-page")).toBeTruthy();
  });
});
