/** Perfil «Idioma de contexto»: subtitles wrap to two lines (Varys walk-interfaz, Oct 21). */
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

function openPerfil(uiLang, theme) {
  localStorage.clear();
  sessionStorage.clear();
  mockBrowser();
  const today = dayKeyFromDate(new Date());
  const yd = prevDayKey(today);
  localStorage.setItem("andale-v3", JSON.stringify({ welcomed: true, xp: 42, gems: 9, name: "Ana", contentVersion: 2, hearts: 5, onboardingDone: true, firstSessionDone: true, paywallSeen: true, bajioUnlockSeen: true, cdmxUnlockSeen: true, lecturaStartedAt: 1, streak: 1, lastDay: today, firstActivityDay: yd, theme, uiLang, done: {} }));
  localStorage.setItem("andale-first-activity", yd);
  localStorage.setItem("andale-v3-live", JSON.stringify({ screen: "home", tab: "perfil" }));
  render(<App />);
}

describe("Perfil context-language subtitles wrap instead of ellipsizing", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it.each([["es", "light", "Interfaz en español", "Interfaz en inglés"], ["en", "dark", "Spanish UI", "English UI"]])("%s %s: full subtitle, no nowrap or ellipsis, same type and ink; buttons stretch together", async (lang, theme, es, en) => {
    openPerfil(lang, theme);
    const esDetail = await screen.findByTestId("perfil-lang-es-detail");
    const enDetail = screen.getByTestId("perfil-lang-en-detail");
    expect(esDetail.textContent).toBe(es);
    expect(enDetail.textContent).toBe(en);
    for (const el of [esDetail, enDetail]) {
      expect(el.style.whiteSpace).not.toBe("nowrap");
      expect(el.style.textOverflow).toBe("");
      expect(el.style.overflow).toBe("");
      expect(el.style.fontSize).toBe("10.5px");
      expect(el.style.fontWeight).toBe("800");
      expect(el.style.overflowWrap).toBe("break-word");
    }
    const grid = screen.getByTestId("perfil-lang-grid");
    expect(grid.style.display).toBe("grid");
    expect(grid.style.alignItems).toBe("stretch");
    expect(screen.getByTestId("perfil-lang-es").style.minWidth).toBe("0px");
  });
});
