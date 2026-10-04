/**
 * Locked coach postcards: text ink is solid. The 0.62 fade stays on the portrait.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const LIGHT_INK = /#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i;

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

const bootPerfil = async (theme) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    xp: 100,
    gems: 0,
    name: "Dave",
    contentVersion: 2,
    hearts: 5,
    uiLang: "es",
    theme,
    onboardingDone: true,
    firstSessionDone: true,
    paywallSeen: true,
    bajioUnlockSeen: true,
    lecturaHandoffSeen: true,
    done: {},
    stories: {},
    missions: {},
  }));
  localStorage.setItem(LIVE_KEY, JSON.stringify({ screen: "home", tab: "perfil" }));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("BLOQ.").length).toBe(3));
};

const opacityOf = (node) => Number(node.style.opacity || "1");

describe("locked coach postcard ink", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("locked postcard text has no opacity below 1 inside the card and paints #6B6258 in light", async () => {
    await bootPerfil("light");
    const labels = screen.getAllByText("BLOQ.");
    expect(labels).toHaveLength(3);
    for (const label of labels) {
      const card = label.parentElement;
      const column = label.previousElementSibling;
      const title = column.children[0];
      const caption = column.children[1];
      for (const el of [title, caption, label]) {
        expect(el.style.color).toMatch(LIGHT_INK);
        let node = el;
        while (node) {
          expect(opacityOf(node)).toBeGreaterThanOrEqual(1);
          if (node === card) break;
          node = node.parentElement;
        }
        expect(node).toBe(card);
      }
      const art = card.firstElementChild;
      expect(art.style.opacity).toBe("0.62");
      expect(art.contains(title)).toBe(false);
    }
    const open = screen.getByText("LISTO").parentElement;
    expect(opacityOf(open)).toBeGreaterThanOrEqual(1);
    expect(open.firstElementChild.tagName).toBe("svg");
    expect(open.children[1].children[0].style.color).toBe("");
  });
});
