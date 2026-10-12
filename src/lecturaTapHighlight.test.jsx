/**
 * Dark Lectura tap highlight while the word sheet is open.
 * Light keeps the cream chip. The highlight clears when the sheet closes.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

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

const seed = (theme) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "es",
    onboardingDone: true, firstSessionDone: true, paywallSeen: true, theme, done: {},
  }));
};

const boot = async (theme) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  seed(theme);
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "story", tab: "lectura", storyId: "story-0", paraIdx: 0, ansSel: {},
  }));
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("lectura-paragraph-first")).toBeTruthy());
};

const word = (label) => {
  const para = screen.getByTestId("lectura-paragraph-first");
  const el = [...para.querySelectorAll("span")].find((node) => node.textContent === label);
  expect(el, label).toBeTruthy();
  return el;
};

const transparent = (value) => value === "transparent" || value === "rgba(0, 0, 0, 0)";

describe("lectura tapped-word highlight", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("paints the dark tap with a brown chip, cream ink, and a gold underline while the sheet is open", async () => {
    const user = userEvent.setup();
    await boot("dark");
    const story = word("flores").closest("p");
    expect(getComputedStyle(story).fontWeight).toBe("600");

    await user.click(word("flores"));
    const sheet = await screen.findByTestId("word-sheet");
    await waitFor(() => expect(sheet.style.visibility).toBe("visible"));

    const open = getComputedStyle(word("flores"));
    expect(norm(open.backgroundColor)).toBe("#3a3324");
    expect(norm(open.color)).toBe("#f6efe4");
    expect(open.fontWeight).toBe(getComputedStyle(story).fontWeight);
    expect(open.textDecorationLine).toBe("underline");
    expect(norm(open.textDecorationColor)).toBe("#f2b33d");
    expect(open.textDecorationThickness).toBe("2px");
    expect(open.borderRadius).toBe("4px");
    expect(open.borderTopStyle).toBe("none");
    expect(open.borderRightStyle).toBe("none");
    expect(open.borderBottomStyle).toBe("none");
    expect(open.borderLeftStyle).toBe("none");
    expect(open.boxShadow).toBe("none");

    const idle = getComputedStyle(word("muerte"));
    expect(transparent(idle.backgroundColor)).toBe(true);
    expect(idle.textDecorationLine).toBe("none");
    expect(norm(idle.color)).not.toBe("#f6efe4");

    await user.click(sheet.querySelector("button[aria-label='Cerrar']"));
    await waitFor(() => expect(screen.queryByTestId("word-sheet")).toBeNull());
    const closed = getComputedStyle(word("flores"));
    expect(transparent(closed.backgroundColor)).toBe(true);
    expect(norm(closed.color)).not.toBe("#f6efe4");
    expect(closed.textDecorationLine).toBe("none");
    expect(closed.textDecorationThickness).not.toBe("2px");
  });

  it("leaves the light tap on the cream chip with no gold underline", async () => {
    const user = userEvent.setup();
    await boot("light");
    await user.click(word("flores"));
    const sheet = await screen.findByTestId("word-sheet");
    await waitFor(() => expect(sheet.style.visibility).toBe("visible"));

    const open = getComputedStyle(word("flores"));
    expect(norm(open.backgroundColor)).toBe("#ffe9a8");
    expect(norm(open.color)).toBe("#3c3c3c");
    expect(open.fontWeight).toBe("600");
    expect(open.textDecorationLine).toBe("none");
    expect(open.textDecorationThickness).toBe("auto");
    expect(open.borderRadius).toBe("4px");
    expect(open.borderBottomStyle).toBe("dotted");
    expect(open.borderBottomWidth).toBe("2px");
    expect(open.borderBottomColor).toBe("rgba(88, 204, 2, 0.4)");
    expect(open.boxShadow).toBe("");
    expect(word("flores").style.color).toBe("");

    await user.click(sheet.querySelector("button[aria-label='Cerrar']"));
    await waitFor(() => expect(screen.queryByTestId("word-sheet")).toBeNull());
    const closed = getComputedStyle(word("flores"));
    expect(transparent(closed.backgroundColor)).toBe(true);
    expect(norm(closed.color)).toBe("#3c3c3c");
    expect(closed.textDecorationLine).toBe("none");
    expect(closed.borderBottomStyle).toBe("dotted");
    expect(closed.borderBottomWidth).toBe("2px");
  });
});
