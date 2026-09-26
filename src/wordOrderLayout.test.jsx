/**
 * Word-order tiles size to the word and wrap in normal flow.
 * The old bank was repeat(auto-fill, minmax(4.6rem, max-content)), so a full
 * row clamped tracks to 4.6rem and longer words painted over the next tile.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

/** Longest authored order answer in the deck, by character length. */
export const LONGEST_ORDER_SENTENCE = "Por lo tanto, decidimos cancelar el contrato";

const AGRADEZCO_WORDS = ["tu", "te", "agradezco", "su", "antemano", "de", "atención", "Le"];
const LONGEST_WORDS = ["Por", "lo", "tanto,", "decidimos", "cancelar", "el", "contrato", "embargo"];

const orderQuestion = (words, answer, prompt) => ({
  type: "order",
  prompt,
  words,
  answer,
  shuffledWords: words.map((w, id) => ({ w, id })),
});

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

const seedLesson = (q) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    xp: 42,
    gems: 9,
    name: "Dave",
    contentVersion: 2,
    hearts: 5,
    uiLang: "es",
    done: {},
  }));
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "lesson",
    tab: "camino",
    status: "idle",
    qi: 0,
    placed: [],
    session: {
      title: "Registro y modismos",
      unitId: "registro",
      host: "valeria",
      color: "#58CC02",
      dark: "#46A302",
      questions: [q],
    },
  }));
};

const openOrder = async (q) => {
  localStorage.clear();
  mockSpeech();
  seedLesson(q);
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("order-tile-bank")).toBeTruthy());
};

const isFlow = (css) => {
  expect(css.display).toBe("flex");
  expect(css.flexWrap).toBe("wrap");
  expect(css.position).not.toBe("absolute");
  expect(css.position).not.toBe("fixed");
  expect(css.gap).toBe("8px");
};

const isIntrinsicTile = (tile) => {
  const css = getComputedStyle(tile);
  expect(css.position).not.toBe("absolute");
  expect(css.position).not.toBe("fixed");
  expect(css.width).toBe("max-content");
  expect(css.flexGrow).toBe("0");
  expect(css.flexShrink).toBe("0");
  expect(css.whiteSpace).toBe("nowrap");
  expect(tile.style.width).toBe("");
  expect(css.fontSize).toBe("16px");
  expect(css.fontWeight).toBe("700");
};

describe("word-order tile layout", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("sizes each agradezco tile to its word, with a gap, and wraps in normal flow", async () => {
    const user = userEvent.setup();
    await openOrder(orderQuestion(
      AGRADEZCO_WORDS,
      "Le agradezco de antemano su atención",
      "Construye el cierre formal: “I thank you in advance for your attention.”",
    ));

    const bank = screen.getByTestId("order-tile-bank");
    isFlow(getComputedStyle(bank));
    expect(getComputedStyle(bank).justifyContent).toBe("center");

    const slots = [...bank.querySelectorAll("[data-tile-slot]")];
    expect(slots.map((slot) => slot.textContent)).toEqual(AGRADEZCO_WORDS);
    for (const slot of slots) {
      const css = getComputedStyle(slot);
      expect(css.position).not.toBe("absolute");
      expect(css.width).toBe("max-content");
      expect(css.flexGrow).toBe("0");
      expect(css.minWidth).not.toBe("4.6rem");
    }

    const tiles = screen.getAllByTestId("bank-tile");
    expect(tiles.map((el) => el.textContent)).toEqual(AGRADEZCO_WORDS);
    tiles.forEach(isIntrinsicTile);

    const row = screen.getByTestId("order-answer-row");
    isFlow(getComputedStyle(row));

    for (const word of ["Le", "agradezco", "de"]) {
      await user.click(screen.getByRole("button", { name: word }));
    }

    const placed = screen.getAllByTestId("placed-tile");
    expect(placed.map((el) => el.textContent.replace(/×/g, "").trim())).toEqual(["Le", "agradezco", "de"]);
    placed.forEach(isIntrinsicTile);
    expect(getComputedStyle(placed[0]).backgroundColor).not.toBe(getComputedStyle(tiles[0]).backgroundColor);

    expect(bank.querySelectorAll("[data-tile-slot]")).toHaveLength(AGRADEZCO_WORDS.length);
    expect(screen.getAllByTestId("bank-tile").map((el) => el.textContent)).toEqual([
      "tu", "te", "su", "antemano", "atención",
    ]);
    const hidden = [...bank.querySelectorAll(".tile")].filter((el) => getComputedStyle(el).visibility === "hidden");
    expect(hidden.map((el) => el.textContent)).toEqual(["agradezco", "de", "Le"]);

    const cssText = [...document.querySelectorAll("style")].map((el) => el.textContent).join("\n");
    expect(cssText).not.toMatch(/repeat\(\s*auto-fill\s*,\s*minmax\(\s*4\.6rem/);
    expect(cssText).not.toMatch(/\.tile-slot\s*\{[^}]*min-width:\s*4\.6rem/);
    expect(cssText).toMatch(/\.tile-bank,\s*\.tile-row\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/);
    expect(cssText).toMatch(/\.tile\s*\{[^}]*border-radius:\s*12px[^}]*padding:\s*9px 14px[^}]*font-size:\s*16px/);
  });

  it("uses the same intrinsic wrap for the longest order sentence", async () => {
    await openOrder(orderQuestion(
      LONGEST_WORDS,
      LONGEST_ORDER_SENTENCE,
      "Construye: “Therefore, we decided to cancel the contract.”",
    ));
    const tiles = screen.getAllByTestId("bank-tile");
    expect(tiles.map((el) => el.textContent)).toEqual(LONGEST_WORDS);
    expect(tiles.map((el) => el.textContent).join(" ")).toContain("decidimos");
    expect(LONGEST_ORDER_SENTENCE.length).toBeGreaterThan("Le agradezco de antemano su atención".length);
    isFlow(getComputedStyle(screen.getByTestId("order-tile-bank")));
    isFlow(getComputedStyle(screen.getByTestId("order-answer-row")));
    tiles.forEach(isIntrinsicTile);
  });
});
