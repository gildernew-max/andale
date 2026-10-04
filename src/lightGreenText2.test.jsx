/**
 * Light greenDark / okText body ink uses D.greenText (#2E7500).
 * Dark paints keep the previous greenDark / okText / #58CC02 values.
 * The four faded rows drop opacity below 1 in light only.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { contrastRatio } from "./spanishKeyboard.js";
import { dayKeyFromDate } from "./firstDoor.js";

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const LIGHT = "#2e7500";
const LIME = "#58cc02";
const GREEN_DARK = "#46a302";
const OK_DARK = "#9ce16a";
const PALE = "#f3fbea";
const MINT = "#d7ffb8";
const CREAM = "#f6efe4";
const WHITE = "#ffffff";

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

const seed = (theme, extra = {}) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true, xp: 120, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "es",
    theme, onboardingDone: true, firstSessionDone: true, paywallSeen: true, bajioUnlockSeen: true,
    lecturaHandoffSeen: true, done: {}, stories: {}, missions: {}, streak: 1,
    lastDay: new Date().toISOString().slice(0, 10),
    ...extra,
  }));
};

const boot = async (theme, live, extra = {}) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  seed(theme, extra);
  if (live) localStorage.setItem(LIVE_KEY, JSON.stringify(live));
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("app-shell")).toBeTruthy());
};

const mcQuestion = {
  type: "mc", prompt: "Espero que ___ a la fiesta.", choices: ["vienes", "vengas"],
  shuffledChoices: ["vienes", "vengas"], answer: "vengas", fixedChoices: true,
};
const lesson = (questions, extra = {}) => ({
  screen: "lesson", tab: "camino", qi: 0, status: "idle", selected: null,
  session: { title: "Subjuntivo", host: "luna", unitId: "subj1", color: "#58CC02", dark: "#46A302", questions },
  ...extra,
});
const snakeGame = {
  focus: { title: { es: "Subjuntivo", en: "Subjunctive" }, host: "luna" },
  tile: 1, turn: 0, roll: 2, selected: "vengas", status: "correct",
  pendingTile: 3, finalTile: 3, link: null, correct: 1, wrong: 0, ladders: 0, slides: 0, done: false,
  question: { prompt: "Espero que ___", answer: "vengas", choices: ["vienes", "vengas"], skill: "Subjuntivo", explain: "Subjuntivo." },
};
const jeopardy = {
  score: 100, used: {}, complete: false, status: "correct", selected: "vengas",
  active: {
    prompt: "Espero que ___", answer: "vengas", choices: ["vienes", "vengas"], value: 100, stake: 100,
    focus: { title: { es: "Subjuntivo", en: "Subjunctive" } }, explain: "Subjuntivo.",
  },
};
const safeItem = {
  phrase: "Quedo a sus órdenes.", context: { es: "Cierras un correo.", en: "You close an email." },
  answer: "formal", answers: ["formal"],
  literal: { es: "Quedo bajo sus órdenes.", en: "I remain under your orders." },
  note: { es: "Cierre profesional.", en: "A professional close." },
};
const safeGame = {
  items: [safeItem], idx: 0, score: 0, streak: 1, bestStreak: 1, done: false, awarded: false,
  selected: "formal", tapped: ["formal"], tappedWrong: [],
};
const matchQuestion = {
  type: "match",
  pairs: [["ojalá", "hopefully"], ["dudar", "to doubt"]],
  left: [{ t: "ojalá", id: 0 }, { t: "dudar", id: 1 }],
  right: [{ t: "hopefully", id: 0 }, { t: "to doubt", id: 1 }],
};

describe("light greenText part 2", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("keeps a single #2E7500 and clears the measured fills", () => {
    expect(appSrc.match(/#2E7500/g)).toEqual(["#2E7500"]);
    expect(appSrc).toContain('fontSize: 28, fontWeight: 900, color: D.greenDark');
    expect(appSrc).not.toContain("fontSize: 28, fontWeight: 900, color: limeText");
    const pairs = [
      ["#FFFFFF", 5.74],
      ["#F3FBEA", 5.41],
      ["#F6EFE4", 5.02],
      ["#DDF4FF", 5.04],
      ["#FFDFE0", 4.61],
      ["#D7FFB8", 5.16],
    ];
    for (const [fill, ratio] of pairs) {
      expect(Number(contrastRatio("#2E7500", fill).toFixed(2))).toBe(ratio);
      expect(contrastRatio("#2E7500", fill)).toBeGreaterThanOrEqual(4.5);
    }
    for (const fill of ["#FFFBEF", "#F7F7F7", "#FFF1F1", "#FBF8F3", "#E5F8CC"]) {
      expect(contrastRatio("#2E7500", fill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("paints snake, Safe/Risky, and Jeopardy correct ink", async () => {
    await boot("light", { screen: "snakes", tab: "practica", snakeGame });
    const lightRoll = await screen.findByTestId("snake-roll-heading");
    expect(lightRoll.textContent).toMatch(/Tiro 2/);
    expect(norm(lightRoll.style.color)).toBe(LIGHT);
    expect(norm(screen.getByTestId("snake-choice-1").style.color)).toBe(LIGHT);
    expect(norm(screen.getByTestId("snake-choice-1").style.background)).toBe(PALE);

    await boot("dark", { screen: "snakes", tab: "practica", snakeGame });
    expect(norm((await screen.findByTestId("snake-roll-heading")).style.color)).toBe(GREEN_DARK);
    expect(norm(screen.getByTestId("snake-choice-1").style.color)).toBe(GREEN_DARK);

    await boot("light", { screen: "safeRisky", tab: "practica", safeGame });
    expect(norm((await screen.findByText(/Buen juicio/)).style.color)).toBe(LIGHT);
    const safeBtn = screen.getByTestId("safe-risky-choice-formal");
    expect(norm(safeBtn.style.color)).toBe(LIGHT);
    expect(norm(safeBtn.style.background)).toBe(PALE);
    expect(norm(safeBtn.style.borderTopColor)).toBe(LIME);

    await boot("dark", { screen: "safeRisky", tab: "practica", safeGame });
    expect(norm((await screen.findByText(/Buen juicio/)).style.color)).toBe(LIME);
    expect(norm(screen.getByTestId("safe-risky-choice-formal").style.color)).toBe(GREEN_DARK);

    await boot("light", { screen: "jeopardy", tab: "practica", jeopardy });
    expect(norm((await screen.findByTestId("jeopardy-score-heading")).style.color)).toBe(LIGHT);
    expect(norm(screen.getByTestId("jeopardy-choice-1").style.color)).toBe(LIGHT);

    await boot("dark", { screen: "jeopardy", tab: "practica", jeopardy });
    expect(norm((await screen.findByTestId("jeopardy-score-heading")).style.color)).toBe(GREEN_DARK);
    expect(norm(screen.getByTestId("jeopardy-choice-1").style.color)).toBe(GREEN_DARK);
  });

  it("paints the correct option, the lesson quip, and ok words on the wrong footer", async () => {
    await boot("light", lesson([mcQuestion], { status: "correct", selected: 1, quip: { es: "Eso suena natural.", en: "That sounds natural." } }));
    const correct = (await screen.findAllByTestId("choice-card")).find((el) => el.textContent.includes("vengas"));
    expect(norm(correct.style.color)).toBe(LIGHT);
    expect(norm(correct.style.background)).toBe(MINT);
    const quip = screen.getByTestId("practice-quip");
    expect(norm(quip.parentElement.style.color)).toBe(LIGHT);
    expect(norm(quip.closest("[data-testid='lesson-footer']").style.background)).toBe(MINT);

    await boot("dark", lesson([mcQuestion], { status: "correct", selected: 1, quip: { es: "Eso suena natural.", en: "That sounds natural." } }));
    const darkCorrect = (await screen.findAllByTestId("choice-card")).find((el) => el.textContent.includes("vengas"));
    expect(norm(darkCorrect.style.color)).toBe(OK_DARK);
    expect(norm(screen.getByTestId("practice-quip").parentElement.style.color)).toBe(OK_DARK);

    const typed = {
      type: "type", prompt: "Ojalá que no ___ mañana.", answers: ["llueva hoy"], answer: "llueva hoy",
    };
    await boot("light", lesson([typed], { status: "wrong", typed: "llueva ayer", quip: { es: "Casi.", en: "Close." } }));
    const okWord = [...(await screen.findByTestId("lesson-footer")).querySelectorAll("b")].find((el) => el.textContent === "llueva");
    expect(norm(okWord.style.color)).toBe(LIGHT);
    expect(norm(screen.getByTestId("lesson-footer").style.background)).toBe("#ffdfe0");

    await boot("dark", lesson([typed], { status: "wrong", typed: "llueva ayer", quip: { es: "Casi.", en: "Close." } }));
    const darkOk = [...screen.getByTestId("lesson-footer").querySelectorAll("b")].find((el) => el.textContent === "llueva");
    expect(norm(darkOk.style.color)).toBe(OK_DARK);
  });

  it("paints coach pills, the language picker, the souvenir line, and the Hoy check", async () => {
    await boot("light", { screen: "home", tab: "perfil" });
    const pill = await screen.findByTestId("coach-cta-luna");
    expect(norm(pill.style.color)).toBe(LIGHT);
    expect(norm(pill.style.background)).toBe(PALE);
    const lang = screen.getByTestId("perfil-lang-es");
    expect(norm(lang.style.color)).toBe(LIGHT);
    expect(norm(lang.style.background)).toBe(PALE);
    expect(lang.textContent).toMatch(/Español/);

    await boot("dark", { screen: "home", tab: "perfil" });
    expect(norm((await screen.findByTestId("coach-cta-luna")).style.color)).toBe(GREEN_DARK);
    expect(norm(screen.getByTestId("perfil-lang-es").style.color)).toBe(GREEN_DARK);

    await boot("light", { screen: "home", tab: "lectura" }, { stories: { "story-0": true } });
    const souvenir = [...(await screen.findByTestId("story-shelf-story-0")).querySelectorAll("div")].find((el) => el.style.fontSize === "11.5px");
    expect(souvenir.textContent).toMatch(/Recuerdo/);
    expect(norm(souvenir.style.color)).toBe(LIGHT);
    expect(norm(screen.getByTestId("story-shelf-story-0").style.background)).toBe(PALE);

    await boot("dark", { screen: "home", tab: "lectura" }, { stories: { "story-0": true } });
    const darkSouvenir = [...(await screen.findByTestId("story-shelf-story-0")).querySelectorAll("div")].find((el) => el.style.fontSize === "11.5px");
    expect(norm(darkSouvenir.style.color)).toBe(LIME);

    const today = dayKeyFromDate(new Date());
    await boot("light", { screen: "home", tab: "camino" }, { missions: { [`scene-${today}`]: "taqueria" } });
    const check = await screen.findByTestId("hub-hoy-done");
    expect(check.textContent).toBe("✓");
    expect(norm(check.style.color)).toBe(LIGHT);
    expect(norm(check.style.background)).toBe(PALE);

    await boot("dark", { screen: "home", tab: "camino" }, { missions: { [`scene-${today}`]: "taqueria" } });
    const darkCheck = await screen.findByTestId("hub-hoy-done");
    expect(norm(darkCheck.style.color)).toBe(OK_DARK);
    expect(norm(darkCheck.style.background)).toBe("#1f3a1a");
  });

  it("drops opacity below 1 on the four faded rows in light and keeps dark fades", async () => {
    const user = userEvent.setup();
    await boot("light", { screen: "home", tab: "practica" });
    await user.click(await screen.findByTestId("flash-reveal"));
    const answer = [...document.querySelectorAll("div")].find((el) => el.style.fontSize === "28px");
    expect(norm(answer.style.color)).toBe(GREEN_DARK);
    await user.click(screen.getByTestId("flash-easy"));
    const reviewed = await screen.findByTestId("flash-deck-reviewed");
    const mark = screen.getByTestId("flash-deck-check");
    expect(mark.textContent).toBe("✓");
    expect(norm(mark.style.color)).toBe(LIGHT);
    expect(Number(mark.style.opacity || 1)).toBeGreaterThanOrEqual(1);
    expect(reviewed.style.opacity).toBe("1");
    expect(norm(reviewed.style.background)).toBe(PALE);
    expect(norm(reviewed.style.borderTopColor)).toBe("#e5e5e5");

    await boot("dark", { screen: "home", tab: "practica" });
    await user.click(await screen.findByTestId("flash-reveal"));
    await user.click(screen.getByTestId("flash-easy"));
    const darkReviewed = await screen.findByTestId("flash-deck-reviewed");
    expect(norm(screen.getByTestId("flash-deck-check").style.color)).toBe(LIME);
    expect(darkReviewed.style.opacity).toBe("0.55");
    expect(norm(darkReviewed.style.background)).toBe("#1e2128");

    const order = {
      type: "type", prompt: "Escribe.", answers: ["llueva hoy", "hoy llueva"], answer: "llueva hoy",
    };
    await boot("light", lesson([order]));
    const input = await screen.findByPlaceholderText("Escribe la palabra que falta…");
    await user.type(input, "hoy llueva");
    await user.click(screen.getByTestId("lesson-check"));
    const miss = await screen.findByTestId("word-order-miss");
    expect(miss.textContent).toMatch(/Tu respuesta/);
    expect(miss.style.opacity).toBe("1");
    expect(Number(getComputedStyle(miss).opacity)).toBeGreaterThanOrEqual(1);
    expect(norm(getComputedStyle(miss).color)).toBe(LIGHT);

    await boot("dark", lesson([order]));
    const darkInput = await screen.findByPlaceholderText("Escribe la palabra que falta…");
    await user.type(darkInput, "hoy llueva");
    await user.click(screen.getByTestId("lesson-check"));
    const darkMiss = await screen.findByTestId("word-order-miss");
    expect(darkMiss.style.opacity).toBe("0.85");
    expect(norm(getComputedStyle(darkMiss).color)).toBe(OK_DARK);

    await boot("light", lesson([matchQuestion], { matched: [0] }));
    const matched = await screen.findByTestId("match-tile-0");
    const open = screen.getByTestId("match-tile-1");
    expect(matched.getAttribute("data-state")).toBe("matched");
    expect(open.getAttribute("data-state")).toBe("idle");
    expect(matched.disabled).toBe(true);
    expect(matched.style.opacity).toBe("1");
    expect(norm(matched.style.color)).toBe(LIGHT);
    expect(norm(matched.style.background)).toBe(MINT);
    expect(norm(matched.style.borderTopColor)).toBe("#e5e5e5");
    expect(norm(open.style.background)).toBe(WHITE);

    await boot("dark", lesson([matchQuestion], { matched: [0] }));
    const darkMatched = await screen.findByTestId("match-tile-0");
    expect(darkMatched.style.opacity).toBe("1");
    expect(norm(darkMatched.style.color)).toBe(LIME);

    const practice = {
      screen: "matchPairs", tab: "practica",
      matchGame: {
        pairs: [["ojalá", "hopefully"], ["dudar", "to doubt"]],
        left: [{ t: "ojalá", id: 0 }, { t: "dudar", id: 1 }],
        right: [{ t: "hopefully", id: 0 }, { t: "to doubt", id: 1 }],
        matched: [0], sel: null, done: false,
      },
    };
    await boot("light", practice);
    const practiceMatched = await screen.findByTestId("match-tile-left-0");
    expect(practiceMatched.disabled).toBe(true);
    expect(practiceMatched.style.opacity).toBe("1");
    expect(norm(practiceMatched.style.color)).toBe(LIGHT);
    expect(norm(practiceMatched.style.background)).toBe(MINT);
    expect(norm(practiceMatched.style.borderTopColor)).toBe("#e5e5e5");
    expect(norm(screen.getByTestId("match-tile-left-1").style.background)).toBe(WHITE);

    await boot("dark", practice);
    const darkPractice = await screen.findByTestId("match-tile-left-0");
    expect(darkPractice.style.opacity).toBe("0.55");
    expect(norm(darkPractice.style.color)).toBe(OK_DARK);
    expect(norm(darkPractice.style.borderTopColor)).toBe(LIME);
  });
});
