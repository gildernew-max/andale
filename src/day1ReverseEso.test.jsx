/** Reversed day-1 path (Varys walk, Oct 20): first lesson quit, then a story claim.
 * «¡Eso!» shows with final numbers, «Continuar» opens the paywall once, never over XP CLAIMED or the lesson. */
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
  localStorage.setItem("andale-v3", JSON.stringify({ welcomed: true, xp: 10, gems: 9, name: "Ana", contentVersion: 2, hearts: 5, onboardingDone: true, firstSessionDone: false, paywallSeen: false, bajioUnlockSeen: true, cdmxUnlockSeen: true, lecturaStartedAt: 1, streak: 1, lastDay: t, firstActivityDay: t, theme: "light", uiLang, done: {}, stories: { "story-0": true } }));
  localStorage.setItem("andale-first-activity", t);
  if (shownToday) localStorage.setItem("andale-paywall-shown", t);
  render(<App />);
}

async function readStory1({ right }) {
  const shelf = await screen.findByTestId("hub-stories").catch(() => null);
  if (shelf) fireEvent.click(shelf);
  const tile = await screen.findByTestId("story-shelf-story-1", {}, { timeout: 3000 }).catch(() => null);
  if (tile) fireEvent.click(tile);
  await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-1"));
  for (;;) {
    const next = screen.queryByRole("button", { name: /^(Siguiente|Next) →$/ });
    if (!next) break;
    fireEvent.click(next);
  }
  fireEvent.click(screen.getByRole("button", { name: /^(Preguntas|Questions) →$/ }));
  await waitFor(() => expect(screen.getAllByTestId("story-q-prompt").length).toBe(3));
  // Story 1 answers: the right one for the first `right` questions, a miss for the rest.
  const RIGHT = [/^Porque era a quien mejor conocía$/, /^El tranvía y Diego$/, /^«Viva la vida»$/];
  const MISS = [/^Porque odiaba los paisajes$/, /^Diego y la fama$/, /^«México lindo»$/];
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: i < right ? RIGHT[i] : MISS[i] }));
  fireEvent.click(await screen.findByRole("button", { name: /^(reclamar|claim) \+\d+ xp/i }));
  await waitFor(() => expect(screen.getByTestId("lectura-cliffhanger")).toBeTruthy());
}

describe("reversed day-1 path: lesson quit, then a story", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("Continue on the cliffhanger shows «¡Eso!», then «Continuar» opens the paywall once", async () => {
    seed();
    await readStory1({ right: 3 });
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^(Continuar|Continue)$/i }));
    const win = await screen.findByTestId("lectura-win");
    expect(document.querySelector("[data-first-session]")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(win.getAttribute("data-lectura-paywall")).toBe("1");
    expect(win.textContent).toBe("¡Eso!");
    fireEvent.click(screen.getByTestId("lectura-win-continue"));
    expect(await screen.findByTestId("soft-paywall", {}, { timeout: 3000 })).toBeTruthy();
    expect(seenEvents()).toHaveLength(1);
    expect(localStorage.getItem("andale-paywall-shown")).toBe(today());
  });

  it("the cap holds: a card already shown today stays closed", async () => {
    seed({ shownToday: true });
    await readStory1({ right: 1 });
    fireEvent.click(screen.getByRole("button", { name: /^(Continuar|Continue)$/i }));
    await screen.findByTestId("lectura-win");
    fireEvent.click(screen.getByTestId("lectura-win-continue"));
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(seenEvents()).toHaveLength(0);
  });

  it("numbers are final on the first frame, and 0 correct gets George's headline", async () => {
    seed({ uiLang: "en" });
    await readStory1({ right: 0 });
    fireEvent.click(screen.getByRole("button", { name: /^(Continuar|Continue)$/i }));
    const win = await screen.findByTestId("lectura-win");
    expect(win.textContent).toBe("You finished the story!");
    expect(screen.getByTestId("win-earned-xp").textContent).toMatch(/\+5\b/);
    expect(document.body.textContent).toMatch(/0 correct, 3 misses/);
  });
});
