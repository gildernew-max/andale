/**
 * Light body-size lime text uses D_LIGHT.greenText (#2E7500).
 * Dark greenText stays #58CC02, so a dark paint that used D.green does not move.
 * Dark outline buttons stay on D_DARK.ink; they were never lime.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";
import { contrastRatio } from "./spanishKeyboard.js";

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const LIGHT_TEXT = "#2e7500";
const LIME = "#58cc02";
const WHITE = "#ffffff";
const PALE = "#f3fbea";
const DARK_INK = "#e8e8ea";

const palette = (name) => {
  const start = appSrc.indexOf(`const ${name} = {`);
  const end = appSrc.indexOf("};", start);
  return appSrc.slice(start, end);
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

const seed = (theme) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true, xp: 120, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "es",
    theme, onboardingDone: true, firstSessionDone: true, paywallSeen: true, bajioUnlockSeen: true,
    lecturaHandoffSeen: true, done: {}, stories: {}, missions: {}, streak: 1,
    lastDay: new Date().toISOString().slice(0, 10),
  }));
};

const boot = async (theme, live) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  seed(theme);
  if (live) localStorage.setItem(LIVE_KEY, JSON.stringify(live));
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("app-shell")).toBeTruthy());
};

describe("light greenText token", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("pins one light hex and keeps the dark token on the current lime", () => {
    const light = palette("D_LIGHT");
    const dark = palette("D_DARK");
    expect(light).toContain('greenText: "#2E7500"');
    expect(dark).toContain('greenText: "#58CC02"');
    expect(light).toContain('green: "#58CC02"');
    expect(dark).toContain('green: "#58CC02"');
    expect(appSrc.match(/#2E7500/g)).toEqual(["#2E7500"]);
    expect(contrastRatio("#2E7500", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#2E7500", "#F3FBEA")).toBeGreaterThanOrEqual(4.5);
    expect(Number(contrastRatio("#2E7500", "#FFFFFF").toFixed(2))).toBe(5.74);
    expect(Number(contrastRatio("#2E7500", "#F3FBEA").toFixed(2))).toBe(5.41);
    expect(Number(contrastRatio("#58CC02", "#FFFFFF").toFixed(2))).toBe(2.09);
    expect(Number(contrastRatio("#58CC02", "#F3FBEA").toFixed(2))).toBe(1.97);
  });

  it("paints the light outline label with greenText and leaves the dark outline on ink", async () => {
    const live = {
      screen: "cubetas",
      tab: "practica",
      cubetasGame: { status: "done", xp: 15, queue: [], scored: [], awarded: true },
    };
    await boot("light", live);
    const lightBtn = await screen.findByTestId("cubetas-back");
    expect(lightBtn.textContent).toMatch(/Juegos/i);
    expect(norm(lightBtn.style.color)).toBe(LIGHT_TEXT);
    expect(norm(lightBtn.style.background)).toBe(WHITE);
    expect(norm(lightBtn.style.borderTopColor)).toBe("#e5e5e5");
    expect(norm(lightBtn.style.borderBottomColor)).toBe("#e5e5e5");
    const again = screen.getByTestId("cubetas-again");
    expect(norm(again.style.background)).toBe(LIME);
    expect(norm(again.style.color)).toBe(WHITE);

    await boot("dark", live);
    const darkBtn = await screen.findByTestId("cubetas-back");
    expect(norm(darkBtn.style.color)).toBe(DARK_INK);
    expect(norm(darkBtn.style.color)).not.toBe(LIGHT_TEXT);
    expect(norm(darkBtn.style.background)).toBe("#1e2128");
    expect(norm(screen.getByTestId("cubetas-again").style.background)).toBe(LIME);
    expect(norm(screen.getByTestId("cubetas-again").style.color)).toBe(WHITE);
  });

  it("moves the light LISTO label and active tab label, and keeps dark lime and the tab icon", async () => {
    await boot("light", { screen: "home", tab: "perfil" });
    const listo = await screen.findByText("LISTO");
    expect(norm(listo.style.color)).toBe(LIGHT_TEXT);
    expect(norm(listo.parentElement.style.background)).toBe(WHITE);
    const perfil = screen.getByTestId("nav-perfil");
    const label = perfil.querySelectorAll("div")[1];
    expect(norm(label.style.color)).toBe(LIGHT_TEXT);
    expect(perfil.querySelector("path").getAttribute("fill").toLowerCase()).toBe(LIME);
    const claro = screen.getByRole("button", { name: /Claro/ });
    expect(norm(claro.style.color)).toBe(LIGHT_TEXT);
    expect(norm(claro.style.background)).toBe(PALE);
    expect(norm(claro.style.borderTopColor)).toBe(LIME);

    await boot("dark", { screen: "home", tab: "perfil" });
    expect(norm((await screen.findByText("LISTO")).style.color)).toBe(LIME);
    const darkPerfil = screen.getByTestId("nav-perfil");
    expect(norm(darkPerfil.querySelectorAll("div")[1].style.color)).toBe(LIME);
    expect(darkPerfil.querySelector("path").getAttribute("fill").toLowerCase()).toBe(LIME);
    const oscuro = screen.getByRole("button", { name: /Oscuro/ });
    expect(norm(oscuro.style.color)).toBe(LIME);
  });
});
