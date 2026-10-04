/**
 * A wrong Lectura checkpoint tap paints the tapped choice red and the
 * authored answer green, with the same border, fill, and ink a right tap
 * already uses. A right tap leaves every other choice untouched.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const CORRECT = "It visits once a year";
const WRONG = "It never returns";
const OTHER = "It only brings sadness";

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

const paint = (el) => ({
  line: norm(el.style.borderColor || el.style.borderTopColor),
  fill: norm(el.style.background || el.style.backgroundColor),
  ink: norm(el.style.color),
});

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
    welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "es",
    onboardingDone: true, firstSessionDone: true, paywallSeen: true, done: {}, ...extra,
  }));
};

const boot = async (theme) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  seed({ theme });
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "story", tab: "lectura", storyId: "story-0", paraIdx: 0, ansSel: {},
  }));
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("lectura-checkpoint-answers")).toBeTruthy());
};

const choice = (label) => {
  const el = [...screen.getByTestId("lectura-checkpoint-answers").querySelectorAll("button")]
    .find((btn) => btn.textContent === label);
  expect(el, label).toBeTruthy();
  return el;
};

describe("lectura checkpoint answer paint", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("marks the authored answer green after a wrong tap and leaves siblings alone after a right tap", async () => {
    const user = userEvent.setup();
    const looks = {
      light: {
        idle: { line: "#e5e5e5", fill: "#f7f7f7", ink: "#3c3c3c" },
        right: { line: "#58cc02", fill: "#ffffff", ink: "#3c3c3c" },
        wrong: { line: "#ff4b4b", fill: "#ffffff", ink: "#ea2b2b" },
      },
      dark: {
        idle: { line: "#4a5160", fill: "#1e2128", ink: "#f6efe4" },
        right: { line: "#58cc02", fill: "#1e2128", ink: "#f6efe4" },
        wrong: { line: "#ff6b6b", fill: "#1e2128", ink: "#ff8c8c" },
      },
    };

    for (const theme of ["light", "dark"]) {
      const look = looks[theme];
      await boot(theme);
      expect(paint(choice(CORRECT))).toEqual(look.idle);
      expect(paint(choice(WRONG))).toEqual(look.idle);
      expect(paint(choice(OTHER))).toEqual(look.idle);

      const otherBefore = paint(choice(OTHER));
      await user.click(choice(WRONG));
      expect(paint(choice(WRONG))).toEqual(look.wrong);
      expect(paint(choice(CORRECT))).toEqual(look.right);
      expect(paint(choice(OTHER))).toEqual(otherBefore);
      expect(choice(WRONG).disabled).toBe(true);
      expect(choice(CORRECT).disabled).toBe(true);
      const savedWrong = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(savedWrong.storyChecks["story-0"]["0"]).toBe(WRONG);

      await boot(theme);
      const wrongBefore = paint(choice(WRONG));
      const otherIdle = paint(choice(OTHER));
      await user.click(choice(CORRECT));
      expect(paint(choice(CORRECT))).toEqual(look.right);
      expect(paint(choice(WRONG))).toEqual(wrongBefore);
      expect(paint(choice(OTHER))).toEqual(otherIdle);
      const savedRight = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(savedRight.storyChecks["story-0"]["0"]).toBe(CORRECT);
    }
  });
});
