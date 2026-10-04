/**
 * Gloss ink only. Fills stay. D.redDark stays #EA2B2B outside the Memory wrong flash.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";
import { MEMORY_CARD_GLOSS_COLOR } from "./MemoryCardFace.jsx";
import { crosswordColors } from "./crossword.js";
import { MEMORY_BANK } from "./memory.js";
import { contrastRatio } from "./spanishKeyboard.js";
import { WORDLE_DARK, WORDLE_LIGHT } from "./wordle.js";

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const cssHex = (value) => {
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
  window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => [],
      speak: vi.fn(),
      cancel: () => {},
      resume: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
};

const memoryLive = ({ matched = [], faceUp = [], miss = false, lastWrong = [], lastMatch = null }) => {
  const words = ["chamba", "morra", "elote"];
  const pairs = words.map((word) => MEMORY_BANK.find((row) => row.word === word));
  const cards = pairs.flatMap((row) => ([
    { id: `${row.word}-word`, pairId: row.word, kind: "word" },
    { id: `${row.word}-meaning`, pairId: row.word, kind: "meaning" },
  ]));
  return {
    screen: "memory",
    tab: "practica",
    memoryGame: {
      packId: "mexicanismos-v1",
      hub: "games",
      pairs,
      cards,
      faceUp,
      matched,
      lastMatch,
      miss,
      lastWrong,
      status: "play",
    },
  };
};

const bootMemory = async (theme, game) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    onboardingDone: true,
    xp: 42,
    gems: 9,
    name: "Dave",
    contentVersion: 2,
    hearts: 5,
    done: {},
    uiLang: "en",
    theme,
  }));
  localStorage.setItem(LIVE_KEY, JSON.stringify(memoryLive(game)));
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("memory-board")).toBeTruthy());
};

const card = (id) => screen.getAllByTestId("memory-card").find((el) => el.getAttribute("data-card") === id);

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("gloss ink", () => {
  it("keeps Wordle light gloss at #6B6258 and dark gloss at #A0A4AB", () => {
    expect(WORDLE_LIGHT.gloss).toBe("#6B6258");
    expect(WORDLE_DARK.gloss).toBe("#A0A4AB");
    expect(appSrc).toContain("color: var(--wordle-gloss, #6B6258)");
    expect(appSrc).not.toContain("#777777");
    expect(Number(contrastRatio(WORDLE_LIGHT.gloss, WORDLE_LIGHT.board).toFixed(2))).toBe(5.23);
    expect(Number(contrastRatio(WORDLE_DARK.gloss, WORDLE_DARK.board).toFixed(2))).toBe(6.44);
  });

  it("moves the unused Memory and crossword gloss defaults off #777777", () => {
    expect(MEMORY_CARD_GLOSS_COLOR).toBe("#6B6258");
    expect(crosswordColors(false).inactiveLang).toBe("#6B6258");
    expect(crosswordColors(true).inactiveLang).toBe("#A0A4AB");
  });

  it("paints the Memory wrong flash with card-only ink and the same fills", async () => {
    const lightBlock = appSrc.slice(appSrc.indexOf("const D_LIGHT"), appSrc.indexOf("const D_DARK"));
    const darkBlock = appSrc.slice(appSrc.indexOf("const D_DARK"), appSrc.indexOf("const D_DARK") + 700);
    expect(lightBlock).toContain('redDark: "#EA2B2B"');
    expect(lightBlock).toContain('redBg: "#FFF1F1"');
    expect(darkBlock).toContain('redDark: "#EA2B2B"');
    expect(darkBlock).toContain('redBg: "#3A1A1A"');
    expect(appSrc).toContain('const MEMORY_WRONG_INK_LIGHT = "#C62828"');
    expect(appSrc).toContain('const MEMORY_WRONG_INK_DARK = "#FF6B6B"');
    expect(appSrc).toContain("wrongInk: darkBoard ? MEMORY_WRONG_INK_DARK : MEMORY_WRONG_INK_LIGHT");
    expect(appSrc).toContain("wrongFill: D.redBg");
    expect(appSrc).toContain("wrongLip: D.redDark");
    expect(Number(contrastRatio("#C62828", "#FFF1F1").toFixed(2))).toBe(5.11);
    expect(Number(contrastRatio("#FF6B6B", "#3A1A1A").toFixed(2))).toBe(5.64);

    const wrong = {
      miss: true,
      lastWrong: ["chamba-word", "morra-meaning"],
      faceUp: ["chamba-word", "morra-meaning"],
    };
    await bootMemory("light", wrong);
    for (const id of ["chamba-word", "morra-meaning"]) {
      const el = card(id);
      const gloss = el.querySelector("[data-testid='memory-card-gloss']");
      const word = el.querySelector("[data-testid='memory-card-word']");
      expect(cssHex(el.style.background)).toBe("#fff1f1");
      expect(cssHex(el.style.color)).toBe("#c62828");
      expect(cssHex(gloss.style.color)).toBe("#c62828");
      expect(word.style.color).toBe("");
    }

    await bootMemory("dark", wrong);
    for (const id of ["chamba-word", "morra-meaning"]) {
      const el = card(id);
      const gloss = el.querySelector("[data-testid='memory-card-gloss']");
      const word = el.querySelector("[data-testid='memory-card-word']");
      expect(cssHex(el.style.background)).toBe("#3a1a1a");
      expect(cssHex(el.style.color)).toBe("#ff6b6b");
      expect(cssHex(gloss.style.color)).toBe("#ff6b6b");
      expect(word.style.color).toBe("");
    }
  });

  it("leaves matched and unmatched Memory gloss inks alone", async () => {
    const open = {
      matched: ["chamba"],
      faceUp: ["morra-word"],
      lastMatch: "chamba",
    };
    await bootMemory("light", open);
    expect(cssHex(card("chamba-word").querySelector("[data-testid='memory-card-gloss']").style.color)).toBe("#5e6650");
    expect(cssHex(card("chamba-meaning").querySelector("[data-testid='memory-card-gloss']").style.color)).toBe("#5e6650");
    expect(cssHex(card("morra-word").querySelector("[data-testid='memory-card-gloss']").style.color)).toBe("#6b6258");

    await bootMemory("dark", open);
    expect(cssHex(card("chamba-word").querySelector("[data-testid='memory-card-gloss']").style.color)).toBe("#f6efe4");
    expect(cssHex(card("chamba-meaning").querySelector("[data-testid='memory-card-gloss']").style.color)).toBe("#f6efe4");
    expect(cssHex(card("morra-word").querySelector("[data-testid='memory-card-gloss']").style.color)).toBe("#a0a4ab");
  });
});
