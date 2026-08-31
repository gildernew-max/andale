/**
 * Simulated learner flows (issue 5 #4). Not the content-schema lock
 * (src/content.test.js) and not the save/LIVE schema lock (src/schema.test.js).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const seedProgress = (extra = {}) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    xp: 42,
    gems: 9,
    name: "Dave",
    contentVersion: 2,
    hearts: 5,
    done: {},
    ...extra,
  }));
};

const mockBrowser = () => {
  const voices = [];
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => voices,
      speak: () => {},
      cancel: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      onvoiceschanged: null,
    },
  });
  const toneNode = () => ({
    connect() {},
    start() {},
    stop() {},
    frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    detune: { setValueAtTime() {} },
    type: "sine",
  });
  const gainNode = () => ({
    connect() {},
    gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
  });
  window.AudioContext = class {
    constructor() {
      this.state = "running";
      this.currentTime = 0;
      this.destination = {};
      this.sampleRate = 44100;
    }
    createGain() { return gainNode(); }
    createOscillator() { return toneNode(); }
    createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
    createBufferSource() { return { connect() {}, start() {}, stop() {}, buffer: null }; }
    createBiquadFilter() { return { connect() {}, type: "lowpass", frequency: { value: 0 } }; }
    resume() {}
  };
  window.webkitAudioContext = window.AudioContext;
};

const boot = async () => {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
  return user;
};

const continueBtn = () => screen.getByRole("button", { name: /^Continuar$/i });

beforeEach(() => {
  localStorage.clear();
  mockBrowser();
  seedProgress();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("simulated learner flows", () => {
  it("boots Camino, starts subj1, answers one MC, persists andale-v3 without wipe", async () => {
    const user = await boot();
    await user.click(screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(screen.getByRole("button", { name: /Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());

    // Skip non-MC items (shuffle) until a multiple-choice prompt is up.
    for (let i = 0; i < 12 && !document.querySelector(".choice-card"); i++) {
      const input = document.querySelector("input[placeholder]");
      const tiles = screen.queryAllByTestId("bank-tile");
      if (input) {
        await user.type(input, "x");
        await user.click(screen.getByTestId("lesson-check"));
      } else if (tiles.length) {
        await user.click(tiles[0]);
        await user.click(screen.getByTestId("lesson-check"));
      } else {
        break;
      }
      await user.click(continueBtn());
    }
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));

    await waitFor(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const prog = JSON.parse(raw);
      expect(prog && typeof prog === "object" && !Array.isArray(prog)).toBe(true);
      expect(prog.xp).toBe(42);
      expect(prog.gems).toBe(9);
      expect(prog.name).toBe("Dave");
      expect(prog.contentVersion).toBe(2);
      expect(prog.srs || prog.weak || prog.hearts != null).toBeTruthy();
    });
  });

  it("tabs Camino → Misiones → Lectura → Práctica → Perfil via nav-*", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-camino"));
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeTruthy();

    await user.click(screen.getByTestId("nav-misiones"));
    expect(screen.getByRole("heading", { name: /Misiones/ })).toBeTruthy();

    await user.click(screen.getByTestId("nav-lectura"));
    expect(screen.getByRole("heading", { name: /Biblioteca/ })).toBeTruthy();

    await user.click(screen.getByTestId("nav-practica"));
    expect(screen.getByTestId("safe-risky-start")).toBeTruthy();

    await user.click(screen.getByTestId("nav-perfil"));
    expect(screen.getByText("Tu perfil")).toBeTruthy();
  });

  it("starts Safe or Risky from Práctica via data-testid safe-risky-start", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => {
      expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy();
      expect(screen.getByText(/¿Lo dirías\?|Would you say it\?/)).toBeTruthy();
    });
  });

  const playMatchRound = async (user) => {
    await waitFor(() => expect(screen.getByTestId("match-pairs-board")).toBeTruthy());
    const lefts = [...document.querySelectorAll("[data-testid^='match-tile-left-']")];
    expect(lefts.length).toBeGreaterThan(1);
    for (const el of lefts) {
      const id = el.getAttribute("data-testid").replace("match-tile-left-", "");
      await user.click(el);
      await user.click(screen.getByTestId(`match-tile-right-${id}`));
    }
    await waitFor(() => expect(screen.getByTestId("match-pairs-done")).toBeTruthy());
  };

  const progressXp = () => JSON.parse(localStorage.getItem(STORAGE_KEY)).xp;

  it("starts match-pairs from Práctica and finishes a finite round", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    const start = screen.getByTestId("match-pairs-start");
    expect(start).toBeTruthy();
    await user.click(start);
    await playMatchRound(user);
    expect(screen.queryByTestId("match-pairs-board")).toBeNull();
    expect(screen.getByText(/¡Ronda terminada!|Round complete/)).toBeTruthy();
    await user.click(screen.getByTestId("match-pairs-back"));
    await waitFor(() => expect(screen.getByTestId("match-pairs-start")).toBeTruthy());
  });

  it("match-pairs rematch keeps XP at 4 (first +4, Otra ronda +0)", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("match-pairs-start"));
    await playMatchRound(user);
    await waitFor(() => expect(progressXp() - 42).toBe(4));
    await user.click(screen.getByTestId("match-pairs-again"));
    await playMatchRound(user);
    await waitFor(() => expect(progressXp() - 42).toBe(4));
  });

  it("opens story-0 from Lectura, taps a word, and leaves no definición pendiente", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getAllByText(/cempasúchil/).length).toBeGreaterThan(0));
    const storyWord = [...document.querySelectorAll("span")].find((el) =>
      el.textContent === "cempasúchil" && el.style.cursor === "pointer");
    expect(storyWord).toBeTruthy();
    await user.click(storyWord);
    await waitFor(() => expect(screen.getByText(/Mexican marigold/i)).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/definición pendiente|definition coming soon/i);
  });

  it("section test-out starts from Camino and fails closed after 3 misses (failKind === test)", async () => {
    const user = await boot();
    await user.click(screen.getAllByTitle(/Examen de la sección|Section test/)[0]);
    await waitFor(() => {
      expect(screen.getByTestId("lesson-exit")).toBeTruthy();
      expect(screen.getByText(/EXAMEN/)).toBeTruthy();
    });
    await user.click(screen.getByTestId("lesson-exit"));
    await user.click(screen.getByTestId("quit-without-save"));
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    cleanup();

    // Drive the fail-closed branch through the real next() path: restore a
    // test-out lesson already sitting on the 3rd miss, then tap Continuar.
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "wrong",
      qi: 0,
      lessonStats: { right: 0, wrong: 3 },
      failKind: "hearts",
      session: {
        title: "EXAMEN: Sección 1 · Intermedio",
        unitId: "_test",
        testOut: 0,
        host: "valeria",
        questions: [{ type: "mc", prompt: "x", choices: ["a"], answer: "a", shuffledChoices: ["a"] }],
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await userEvent.setup().click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Examen no superado|Test not passed/ })).toBeTruthy());
    expect(screen.getByText(/Tres errores|Three mistakes/)).toBeTruthy();
  });
});
