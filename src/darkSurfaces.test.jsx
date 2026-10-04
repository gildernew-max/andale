/**
 * Dark surfaces that still painted light literals on main.
 * Light mode keeps the same literals. Approved darks only:
 * card #1E2128, line #2A2E36, subtle #252830, green tint #1F3A1A,
 * ink #E8E8EA, cream ink #F6EFE4, streak aside #FE9F17.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

const seed = (extra = {}) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true, xp: 80, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "es",
    onboardingDone: true, firstSessionDone: true, paywallSeen: true, streak: 1, sound: false, done: {}, stories: {},
    ...extra,
  }));
};

const boot = async (theme, live, extra = {}) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  seed({ theme, ...extra });
  if (live) localStorage.setItem(LIVE_KEY, JSON.stringify(live));
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("app-shell")).toBeTruthy());
};

const lane = (n) => document.querySelector(`[data-testid="section-lane"][data-section="${n}"]`);
const fills = (root) => [...root.querySelectorAll("rect")].map((el) => (el.getAttribute("fill") || "").toLowerCase());

describe("failing dark surfaces use the approved app darks", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("paints Avanzado and Maestría lanes, and locked lips, with the dark card and line", async () => {
    await boot("dark");
    await waitFor(() => expect(lane(1)).toBeTruthy());
    expect(norm(lane(0).style.background)).toBe("#1e2128");
    expect(norm(lane(1).style.background)).toBe("#1e2128");
    expect(norm(lane(2).style.background)).toBe("#1e2128");
    const locked = [...document.querySelectorAll(".node-btn")].filter((el) => el.disabled && /solid/i.test(el.style.borderBottom));
    expect(locked.length).toBeGreaterThan(0);
    locked.forEach((el) => expect(norm(el.style.borderBottomColor)).toBe("#2a2e36"));
    expect(lane(1).innerHTML).not.toContain("rgba(255, 255, 255");
    expect(lane(2).innerHTML).not.toContain("rgba(255, 255, 255");
    expect(fills(screen.getByTestId("jeopardy-section-start"))).toContain("#1e2128");
    expect(fills(screen.getByTestId("jeopardy-section-start"))).not.toContain("#f6efe4");
    const darkLabels = [...lane(1).querySelectorAll("[data-testid='section-lane-label']")];
    expect(darkLabels.length).toBeGreaterThan(0);
    darkLabels.forEach((el) => expect(norm(el.style.color)).toBe("#e8e8ea"));

    await boot("light");
    await waitFor(() => expect(lane(1)).toBeTruthy());
    expect(norm(lane(0).style.background)).toBe("#f3fbea");
    expect(norm(lane(1).style.background)).toBe("#f8f0ff");
    expect(norm(lane(2).style.background)).toBe("#eaf7fe");
    expect(lane(1).innerHTML).toContain("rgba(255, 255, 255");
    expect(lane(2).innerHTML).toContain("rgba(255, 255, 255");
    const lightLocked = [...document.querySelectorAll(".node-btn")].filter((el) => el.disabled && /solid/i.test(el.style.borderBottom));
    expect(lightLocked.some((el) => norm(el.style.borderBottomColor) === "#cfcfcf")).toBe(true);
    const lightLabels = [...lane(1).querySelectorAll("[data-testid='section-lane-label']")];
    expect(lightLabels.some((el) => norm(el.style.color) === "#afafaf")).toBe(true);
    expect(fills(screen.getByTestId("jeopardy-section-start"))).toContain("#f6efe4");
  });

  it("paints the listen-skip chip and Rayo timer chips with the dark card", async () => {
    const live = {
      screen: "lesson", tab: "camino", qi: 0, status: "idle",
      session: {
        title: "Escucha", host: "luna", unitId: "subj1", color: "#58CC02", dark: "#46A302", runTimerOff: true,
        questions: [{ type: "listen", prompt: "Se me hace tarde.", text: "Se me hace tarde.", answers: ["tarde"] }],
      },
    };
    await boot("dark", live, { rayo: true });
    const skip = await screen.findByTestId("lesson-listen-skip");
    expect(norm(skip.style.background)).toBe("#1e2128");
    expect(norm(skip.style.color)).toBe("#a0a4ab");
    expect(norm(screen.getByTestId("run-timer-toggle").style.background)).toBe("#1e2128");
    expect(norm(screen.getByTestId("run-timer-toggle").style.color)).toBe("#e8e8ea");
    expect(norm(screen.getByTestId("run-timer-off-chip").style.background)).toBe("#1e2128");
    expect(norm(screen.getByTestId("run-timer-off-chip").style.color)).toBe("#a0a4ab");

    await boot("light", live, { rayo: true });
    const lightSkip = await screen.findByTestId("lesson-listen-skip");
    expect(norm(lightSkip.style.background)).toBe("#f6efe4");
    expect(norm(lightSkip.style.color)).toBe("#6b6258");
    expect(norm(screen.getByTestId("run-timer-toggle").style.background)).toBe("#f6efe4");
    expect(norm(screen.getByTestId("run-timer-toggle").style.color)).toBe("#3c3c3c");
    expect(norm(screen.getByTestId("run-timer-off-chip").style.background)).toBe("#f6efe4");
    expect(norm(screen.getByTestId("run-timer-off-chip").style.color)).toBe("#6b6258");
  });

  it("paints Práctica game tiles, the games Wordle tile, and dark crossword cells", async () => {
    await boot("dark", { screen: "home", tab: "practica" });
    await screen.findByTestId("hangman-start");
    for (const id of ["hangman-start", "jeopardy-start", "wordle-start", "memory-start", "crossword-start"]) {
      const tile = screen.getByTestId(id).querySelector("span");
      expect(norm(tile.style.background), id).toBe("#1e2128");
    }
    const paper = fills(screen.getByTestId("crossword-start")).filter((fill) => fill === "#1e2128" || fill === "#ffffff" || fill === "#f6efe4");
    expect(paper).toContain("#1e2128");
    expect(paper).not.toContain("#ffffff");
    expect(paper).not.toContain("#f6efe4");

    await boot("light", { screen: "home", tab: "practica" });
    await screen.findByTestId("hangman-start");
    for (const id of ["hangman-start", "jeopardy-start", "wordle-start", "memory-start", "crossword-start"]) {
      expect(norm(screen.getByTestId(id).querySelector("span").style.background), id).toBe("#f6efe4");
    }
    expect(fills(screen.getByTestId("crossword-start"))).toContain("#ffffff");

    await boot("dark", { screen: "games", tab: "camino" });
    await screen.findByTestId("games-hub");
    expect(norm(screen.getByTestId("wordle-start").querySelector("span").style.background)).toBe("#1e2128");
    expect(fills(screen.getByTestId("wordle-start"))).not.toContain("#f6efe4");
    expect(fills(screen.getByTestId("crossword-start")).filter((fill) => fill === "#252830").length).toBeGreaterThan(0);
    expect(fills(screen.getByTestId("crossword-start"))).not.toContain("#ffffff");
  });

  it("paints the Cubetas chip, Jeopardy double card, and Perfil language disc", async () => {
    await boot("dark", {
      screen: "cubetas", tab: "practica",
      cubetasGame: { queue: [{ id: "c1", phrase: "Ojalá que llueva", bucket: "subjunctive" }], scored: [], status: "idle", hint: false },
    });
    const chip = await screen.findByTestId("cubetas-chip");
    expect(norm(chip.style.background)).toBe("#1e2128");
    expect(norm(chip.style.color)).toBe("#58cc02");

    await boot("light", {
      screen: "cubetas", tab: "practica",
      cubetasGame: { queue: [{ id: "c1", phrase: "Ojalá que llueva", bucket: "subjunctive" }], scored: [], status: "idle", hint: false },
    });
    const lightChip = await screen.findByTestId("cubetas-chip");
    expect(norm(lightChip.style.background)).toBe("#ffffff");
    expect(norm(lightChip.style.color)).toBe("#2e7500");

    const jeopardy = {
      screen: "jeopardy", tab: "practica",
      jeopardy: {
        score: 0, status: "idle", used: {}, doubleKey: "mood-200",
        active: {
          key: "mood-200", double: true, stake: 400, value: 200,
          prompt: "Ojalá que ___", answer: "llueva", choices: ["llueva", "llueve"],
          focus: { title: { es: "Modo", en: "Mood" } },
        },
      },
    };
    await boot("dark", jeopardy);
    const double = await screen.findByTestId("jeopardy-double");
    expect(norm(double.style.background)).toBe("#1e2128");
    expect(norm(double.style.color)).toBe("#e8e8ea");
    expect(norm(double.style.borderTopColor)).toBe("#c46b3a");

    await boot("light", jeopardy);
    const lightDouble = await screen.findByTestId("jeopardy-double");
    expect(norm(lightDouble.style.background)).toBe("#f6efe4");
    expect(norm(lightDouble.style.color)).toBe("#c46b3a");

    await boot("dark", { screen: "home", tab: "perfil" });
    const disc = await screen.findByTestId("perfil-lang-es");
    expect(norm(disc.querySelector("span").style.background)).toBe("#1e2128");
    await boot("light", { screen: "home", tab: "perfil" });
    expect(norm((await screen.findByTestId("perfil-lang-es")).querySelector("span").style.background)).toBe("#ffffff");
  });

  it("paints the unstyled name tag, the win handoff, and the streak aside", async () => {
    await boot("dark", { screen: "dialogue", tab: "misiones", dialogue: { idx: 0, score: 0, done: false, log: [] } });
    const tag = await waitFor(() => {
      const el = document.querySelector(".nametag");
      expect(el).toBeTruthy();
      return el;
    });
    expect(tag.textContent).toBe("Cliente");
    expect(norm(getComputedStyle(tag).backgroundColor)).toBe("#1e2128");
    expect(norm(getComputedStyle(tag).color)).toBe("#f6efe4");
    expect(norm(getComputedStyle(tag).borderTopColor)).toBe("#2a2e36");

    await boot("light", { screen: "dialogue", tab: "misiones", dialogue: { idx: 0, score: 0, done: false, log: [] } });
    const lightTag = document.querySelector(".nametag");
    expect(norm(getComputedStyle(lightTag).backgroundColor)).toBe("#ffffff");
    expect(norm(getComputedStyle(lightTag).color)).toBe("#6b6258");
    expect(norm(getComputedStyle(lightTag).borderTopColor)).toBe("#e5e5e5");

    const handoff = {
      screen: "done", tab: "camino", lessonStats: { right: 1, wrong: 0 },
      session: { title: "Hoy", host: "luna", firstHoy: true, questions: [{ type: "mc", prompt: "x", choices: ["a"], answer: "a" }], unitId: "subj1", color: "#58CC02", dark: "#46A302" },
    };
    await boot("dark", handoff);
    const strip = await screen.findByTestId("lectura-handoff");
    const quiet = screen.getByTestId("lectura-handoff-quiet");
    const cta = screen.getByTestId("lectura-handoff-cta");
    expect(norm(strip.style.background)).toBe("#1e2128");
    expect(norm(quiet.style.color)).toBe("#a0a4ab");
    expect(norm(cta.style.background)).toBe("#1e2128");
    expect(norm(cta.style.color)).toBe("#e8e8ea");
    expect(norm(cta.style.borderTopColor)).toBe("#5c7356");

    await boot("light", handoff);
    expect(norm((await screen.findByTestId("lectura-handoff")).style.background)).toBe("#f6efe4");
    expect(norm(screen.getByTestId("lectura-handoff-quiet").style.color)).toBe("#6b6258");
    expect(norm(screen.getByTestId("lectura-handoff-cta").style.background)).toBe("#f6efe4");
    expect(norm(screen.getByTestId("lectura-handoff-cta").style.color)).toBe("#5c7356");

    await boot("dark", {
      screen: "done", tab: "camino", lessonStats: { right: 2, wrong: 1 },
      session: { title: "Subjuntivo", host: "valeria", questions: [{ type: "mc", prompt: "x", choices: ["a"], answer: "a" }], unitId: "subj1", color: "#58CC02", dark: "#46A302" },
    }, { streak: 7 });
    const aside = await waitFor(() => {
      const el = [...document.querySelectorAll("span")].find((n) => n.textContent.trim() === "una semana entera");
      expect(el).toBeTruthy();
      return el;
    });
    expect(norm(aside.style.color)).toBe("#fe9f17");

    await boot("light", {
      screen: "done", tab: "camino", lessonStats: { right: 2, wrong: 1 },
      session: { title: "Subjuntivo", host: "valeria", questions: [{ type: "mc", prompt: "x", choices: ["a"], answer: "a" }], unitId: "subj1", color: "#58CC02", dark: "#46A302" },
    }, { streak: 7 });
    const lightAside = [...document.querySelectorAll("span")].find((n) => n.textContent.trim() === "una semana entera");
    expect(norm(lightAside.style.color)).toBe("#b97500");
  });
});
