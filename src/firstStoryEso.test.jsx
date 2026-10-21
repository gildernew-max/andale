/** Cold first-open path (Varys walk, Oct 21): the first finished story is story 0, ended through «Empieza a leer».
 * It lands «¡Eso!» (or the 0-right headline) with the bird, then «Continuar» opens the card once. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";
import { dayKeyFromDate } from "./firstDoor.js";

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
const seenEvents = () => JSON.parse(localStorage.getItem("andale-funnel-log") || "[]").filter((e) => e.event === "paywall_seen");

function seed({ uiLang = "es", shownToday = false } = {}) {
  localStorage.clear(); sessionStorage.clear(); mockBrowser();
  const t = today();
  localStorage.setItem("andale-v3", JSON.stringify({ welcomed: true, xp: 0, gems: 0, name: "Ana", contentVersion: 2, hearts: 5, onboardingDone: true, firstSessionDone: false, paywallSeen: false, bajioUnlockSeen: true, cdmxUnlockSeen: true, uiLang, theme: "light", done: {}, stories: {} }));
  if (shownToday) { localStorage.setItem("andale-first-activity", t); localStorage.setItem("andale-paywall-shown", t); }
  render(<App />);
}

const RIGHT = [/^El olor del cempasúchil$/, /^En el panteón de la isla de Janitzio$/, /^El olvido$/];
const MISS = [/^Los cohetes$/, /^En la playa$/, /^La vejez$/];
async function finishStory0({ right }) {
  fireEvent.click(await screen.findByTestId("nav-lectura"));
  const openers = await screen.findAllByRole("button", { name: /La noche en que vuelven/ });
  fireEvent.click(openers[openers.length - 1]);
  await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
  for (;;) {
    const next = screen.queryByRole("button", { name: /^(Siguiente|Next) →$/ });
    if (!next) break;
    fireEvent.click(next);
  }
  fireEvent.click(screen.getByRole("button", { name: /^(Preguntas|Questions) →$/ }));
  await waitFor(() => expect(screen.getAllByTestId("story-q-prompt").length).toBe(3));
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: i < right ? RIGHT[i] : MISS[i] }));
  fireEvent.click(await screen.findByTestId("lectura-claim-cta"));
  await waitFor(() => expect(screen.getByTestId("lectura-bird-handoff-cta")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  fireEvent.click(screen.getByTestId("lectura-bird-handoff-cta"));
  return screen.findByTestId("story-0-win");
}

describe("cold path: the first finished story lands its win screen", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("«Empieza a leer» lands «¡Eso!» first, then «Continuar» opens the card once", async () => {
    seed();
    const win = await finishStory0({ right: 1 });
    expect(win.textContent).toBe("¡Eso!");
    expect(screen.queryByTestId("story-reader")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("win-earned-xp").textContent).toBe("+15");
    fireEvent.click(screen.getByTestId("story-0-win-continue"));
    expect(await screen.findByTestId("soft-paywall", {}, { timeout: 3000 })).toBeTruthy();
    expect(seenEvents()).toHaveLength(1);
    expect(localStorage.getItem("andale-paywall-shown")).toBe(today());
  }, 30000);

  it("the once-per-day cap holds", async () => {
    seed({ shownToday: true });
    await finishStory0({ right: 3 });
    fireEvent.click(screen.getByTestId("story-0-win-continue"));
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(seenEvents()).toHaveLength(0);
  }, 30000);

  it("0 right gets «You finished the story!» with the bird", async () => {
    seed({ uiLang: "en" });
    const win = await finishStory0({ right: 0 });
    expect(win.textContent).toBe("You finished the story!");
    expect(screen.getByTestId("win-perch-slot")).toBeTruthy();
    expect(screen.getByTestId("win-earned-xp").textContent).toBe("+5");
  });
});
