/**
 * Answer chips wrap inside the lesson card.
 * Choice tiles used to share word-order's width:max-content and white-space:nowrap,
 * so a long TAP AN ANSWER phrase widened the page past the phone.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const LONG_CHOICE = "Ahora, en un rato, o en un futuro gloriosamente indefinido";

const mockSpeech = () => {
  window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
  window.speechSynthesis = {
    getVoices: () => [],
    speak() {},
    cancel() {},
    resume() {},
    addEventListener() {},
    removeEventListener() {},
    onvoiceschanged: null,
    speaking: false,
    pending: false,
    paused: false,
  };
};

const seed = (question) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    xp: 42,
    gems: 9,
    name: "Dave",
    contentVersion: 2,
    hearts: 5,
    uiLang: "en",
    theme: "light",
    done: {},
    firstSessionDone: true,
  }));
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "lesson",
    tab: "camino",
    status: "idle",
    qi: 0,
    selected: null,
    typed: "",
    session: {
      title: "Mexicanismos",
      unitId: "mex",
      host: "rafa",
      color: "#CE82FF",
      dark: "#A567CC",
      questions: [question],
    },
  }));
};

const expectWrap = (el) => {
  const css = getComputedStyle(el);
  expect(css.whiteSpace).toBe("normal");
  expect(css.overflowWrap).toBe("anywhere");
  expect(css.minWidth).toBe("0px");
  expect(css.maxWidth).toBe("100%");
  expect(el.textContent).toContain(LONG_CHOICE);
};

describe("answer chip wrap", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("lets a long multiple-choice chip wrap inside the card", async () => {
    localStorage.clear();
    mockSpeech();
    seed({
      type: "mc",
      prompt: "En México, «ahorita» puede significar:",
      choices: ["Solo «en este preciso instante»", "Nunca", LONG_CHOICE],
      shuffledChoices: ["Solo «en este preciso instante»", "Nunca", LONG_CHOICE],
      answer: LONG_CHOICE,
      explain: "«Ahorita» es elástico. El contexto manda.",
    });
    render(<App />);
    const card = await waitFor(() => {
      const found = [...document.querySelectorAll(".choice-card")].find((el) => el.textContent.includes(LONG_CHOICE));
      expect(found).toBeTruthy();
      return found;
    });
    expectWrap(card);
    expect(card.getAttribute("data-testid")).toBe("choice-card");
  });

  it("lets a long typed-answer chip wrap and keeps the full phrase", async () => {
    localStorage.clear();
    mockSpeech();
    seed({
      type: "type",
      prompt: "Fuimos a Xochimilco y el paseo en trajinera estuvo ___.",
      answers: ["padrísimo"],
      explain: "«Padre» = genial.",
      answerAid: {
        mode: "choices",
        tiles: [
          { id: "choice-0", w: "padrísimo" },
          { id: "choice-1", w: LONG_CHOICE },
        ],
      },
    });
    render(<App />);
    const chip = await waitFor(() => {
      const found = [...document.querySelectorAll(".tile")].find((el) => el.textContent.includes(LONG_CHOICE));
      expect(found).toBeTruthy();
      return found;
    });
    expectWrap(chip);
    expect(chip.className).toMatch(/\btile\b/);
    expect(getComputedStyle(chip).flexGrow).toBe("0");
    expect(getComputedStyle(chip).flexShrink).toBe("1");
    expect(chip.closest(".tile-slot").querySelector("[data-testid='choice-chip-key']")).toBeTruthy();
    expect(screen.getByText("padrísimo")).toBeTruthy();
    expect(getComputedStyle(screen.getByText("padrísimo")).whiteSpace).toBe("normal");
  });
});
