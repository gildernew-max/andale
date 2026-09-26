/**
 * Bright CHECK lime must not come back on the sage surfaces.
 * Primary buttons (New word, and the shared Btn) stay lime and are skipped.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";
import { contrastRatio } from "./spanishKeyboard.js";
import { BRIGHT_GREEN, PINK_OR_RED } from "./sageChrome.js";
import { WORDLE_ABSENT, WORDLE_CORRECT } from "./wordle.js";
import { MEMORY_BANK } from "./memory.js";
import { freshWordleRun, isWordleGuess, WORDLE_STORAGE_KEY } from "./wordle.js";

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
  window.AudioContext = class {
    constructor() { this.currentTime = 0; this.destination = {}; }
    createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    resume() {}
  };
};

const seed = (progress, live) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    xp: 42,
    gems: 9,
    name: "Dave",
    contentVersion: 2,
    hearts: 5,
    done: {},
    ...progress,
  }));
  if (live) localStorage.setItem(LIVE_KEY, JSON.stringify(live));
};

const boot = async (progress, live, ready, prepare) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  seed(progress, live);
  prepare?.();
  render(<App />);
  await waitFor(() => expect(screen.getByTestId(ready)).toBeTruthy());
};

const nodeBlob = (el) => {
  const bits = [el.getAttribute("style") || ""];
  const fill = el.getAttribute("fill");
  const stroke = el.getAttribute("stroke");
  if (fill) bits.push(fill);
  if (stroke) bits.push(stroke);
  return bits.join(" ");
};

const assertNoPinkOrRedKeys = (label) => {
  const keys = [
    ...screen.queryAllByTestId("letter-chip"),
    ...screen.queryAllByTestId("accent-chip"),
    ...screen.queryAllByTestId("letter-board-enter"),
    ...screen.queryAllByTestId("letter-board-backspace"),
  ];
  expect(keys.length, label).toBeGreaterThan(0);
  keys.forEach((el) => {
    const blob = nodeBlob(el);
    const name = el.getAttribute("data-letter") || el.getAttribute("data-testid");
    expect(blob, `${label} ${name}`).not.toMatch(PINK_OR_RED);
    expect(blob, `${label} ${name}`).not.toMatch(BRIGHT_GREEN);
  });
};

/** Walk a surface. Skip the primary Btn chrome, which stays CHECK lime on purpose. */
const assertNoBrightGreen = (root, label) => {
  const nodes = [root, ...root.querySelectorAll("*")];
  for (const el of nodes) {
    if (el.closest(".duo-btn")) continue;
    const blob = nodeBlob(el);
    expect(blob, `${label} ${el.getAttribute("data-testid") || el.tagName}`).not.toMatch(BRIGHT_GREEN);
  }
};

const pairContrast = (el, label) => {
  let bg = "";
  let node = el;
  while (node && !bg) {
    bg = cssHex(node.style.background) || cssHex(node.style.backgroundColor);
    node = node.parentElement;
  }
  const ink = cssHex(el.style.color);
  expect(ink, `${label} ink`).toBeTruthy();
  expect(bg, `${label} fill`).toBeTruthy();
  expect(contrastRatio(ink, bg), `${label} ${ink} on ${bg}`).toBeGreaterThanOrEqual(4.5);
};

const memoryLive = () => {
  const words = ["neta", "chido", "chela", "onda", "bronca", "chisme"];
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
      faceUp: ["bronca-word"],
      matched: ["neta", "chido", "chela", "onda"],
      lastMatch: null,
      miss: false,
      lastWrong: [],
      status: "play",
    },
  };
};

describe("sage cleanup", () => {
  beforeEach(() => {
    localStorage.clear();
    mockBrowser();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("keeps bright green off the Games screen, Memory board, keyboards, Hangman end card, and slot underline", async () => {
    await boot({ uiLang: "en" }, { screen: "games", tab: "camino" }, "games-hub");
    const hub = screen.getByTestId("games-hub");
    assertNoBrightGreen(hub, "games");
    expect(hub.textContent).not.toContain("🪣");
    const body = [...screen.getByTestId("cubetas-mark").querySelectorAll("path")].find((el) => el.getAttribute("fill") && el.getAttribute("fill") !== "none");
    expect(cssHex(body.getAttribute("fill"))).toBe("#6f7757");
    expect(screen.getByTestId("cubetas-mark").querySelector("path[stroke]").getAttribute("stroke")).toMatch(/#C46B3A/i);
    const tile = screen.getByTestId("cubetas-tile");
    expect(cssHex(tile.style.background)).toBe("#f6efe4");
    expect(tile.style.borderTopWidth).toBe("2px");
    expect(tile.style.borderBottomWidth).toBe("4px");
    expect(cssHex(tile.style.borderTopColor)).toBe("#c46b3a");
    expect(cssHex(tile.style.borderBottomColor)).toBe("#c46b3a");
    expect(tile.style.width).toBe("44px");
    expect(tile.style.borderRadius).toBe("14px");
    for (const id of ["cubetas-start", "hangman-start", "jeopardy-start", "wordle-start", "memory-start"]) {
      const card = screen.getByTestId(id);
      expect(card.className).toMatch(/games-hub-card/);
      expect(card.style.borderTopWidth).toBe("2px");
      expect(card.style.borderBottomWidth).toBe("5px");
      expect(cssHex(card.style.borderTopColor)).toBe("#b8c0a0");
      expect(cssHex(card.style.borderBottomColor)).toBe("#6f7757");
      expect(cssHex(card.style.background)).toBe("#ffffff");
    }
    expect(document.querySelector("style").textContent).toMatch(/\.games-hub-card:focus-visible \{ outline: 2px solid #6F7757/);

    cleanup();
    await boot({ uiLang: "en", theme: "dark" }, { screen: "games", tab: "camino" }, "games-hub");
    assertNoBrightGreen(screen.getByTestId("games-hub"), "games dark");
    expect(cssHex(screen.getByTestId("cubetas-tile").style.background)).toBe("#1e2128");
    expect(cssHex([...screen.getByTestId("cubetas-mark").querySelectorAll("path")].find((el) => el.getAttribute("fill") && el.getAttribute("fill") !== "none").getAttribute("fill"))).toBe("#b8c0a0");
    const darkCard = screen.getByTestId("hangman-start");
    expect(darkCard.style.borderTopWidth).toBe("2px");
    expect(darkCard.style.borderBottomWidth).toBe("5px");
    expect(cssHex(darkCard.style.borderTopColor)).toBe("#2a2e36");
    expect(cssHex(darkCard.style.borderBottomColor)).toBe("#677050");
    expect(cssHex(darkCard.style.background)).toBe("#1e2128");
    expect(document.querySelector("style").textContent).toMatch(/\.games-hub-card:focus-visible \{ outline: 2px solid #B8C0A0/);

    for (const uiLang of ["es", "en"]) {
      cleanup();
      await boot({ uiLang, theme: "light" }, memoryLive(), "memory-board");
      const matched = screen.getAllByTestId("memory-card").filter((el) => ["neta", "chido", "chela", "onda"].includes(el.getAttribute("data-pair")) && el.getAttribute("data-open") === "yes");
      expect(matched.length).toBeGreaterThanOrEqual(4);
      assertNoBrightGreen(screen.getByTestId("memory-grid"), `memory ${uiLang}`);
      const words = matched.filter((el) => el.getAttribute("data-kind") === "word");
      const meanings = matched.filter((el) => el.getAttribute("data-kind") === "meaning");
      expect(words.length).toBeGreaterThanOrEqual(2);
      expect(meanings.length).toBeGreaterThanOrEqual(2);
      words.forEach((el) => {
        expect(cssHex(el.style.background)).toBe("#eef0e6");
        expect(cssHex(el.style.color)).toBe("#4f5a36");
        expect(el.style.borderTopWidth).toBe("2px");
        expect(el.style.borderBottomWidth).toBe("4px");
        expect(cssHex(el.style.borderTopColor)).toBe("#6f7757");
        expect(cssHex(el.style.borderBottomColor)).toBe("#6f7757");
        pairContrast(el, `memory word ${uiLang}`);
      });
      meanings.forEach((el) => {
        expect(cssHex(el.style.color)).toBe("#5e6650");
        pairContrast(el, `memory gloss ${uiLang}`);
      });
      const open = screen.getAllByTestId("memory-card").find((el) => el.getAttribute("data-card") === "bronca-word");
      expect(cssHex(open.style.background)).toBe("#ffffff");
      expect(open.getAttribute("style")).not.toMatch(BRIGHT_GREEN);
    }

    cleanup();
    await boot({ uiLang: "en", theme: "dark" }, memoryLive(), "memory-board");
    assertNoBrightGreen(screen.getByTestId("memory-grid"), "memory dark");
    const darkWord = screen.getAllByTestId("memory-card").find((el) => el.getAttribute("data-card") === "neta-word");
    expect(cssHex(darkWord.style.background)).toBe("#677050");
    expect(cssHex(darkWord.style.color)).toBe("#f6efe4");
    pairContrast(darkWord, "dark matched memory");

    const fresh = freshWordleRun(new Date());
    const guess = ["perro", "lugar", "mesas"].find((word) => isWordleGuess(word) && word !== fresh.answer);
    await boot({ uiLang: "en" }, { screen: "wordle", tab: "practica" }, "letter-board", () => {
      localStorage.setItem(WORDLE_STORAGE_KEY, JSON.stringify({ day: fresh.day, guesses: [guess], draft: "sol", status: "play" }));
    });
    assertNoBrightGreen(screen.getByTestId("letter-board-actions"), "wordle enter");
    screen.getAllByTestId("letter-chip").filter((el) => !["correct", "present", "wrong", "absent"].includes(el.getAttribute("data-state"))).forEach((el) => {
      expect(el.getAttribute("style"), "unused wordle letter").not.toMatch(BRIGHT_GREEN);
      expect(cssHex(el.style.color)).toBe("#4f5a36");
      expect(cssHex(el.style.background)).toBe("#ffffff");
      pairContrast(el, "wordle letter");
    });
    const marked = screen.getAllByTestId("letter-chip").find((el) => el.getAttribute("data-state") === "correct");
    if (marked) expect(cssHex(marked.style.background)).toBe("#5c7356");
    const enter = screen.getByTestId("letter-board-enter");
    const back = screen.getByTestId("letter-board-backspace");
    expect(cssHex(enter.style.background)).toBe("#6f7757");
    expect(cssHex(enter.style.color)).toBe("#ffffff");
    expect(enter.style.borderTopWidth).toBe("2px");
    expect(enter.style.borderBottomWidth).toBe("4px");
    expect(cssHex(enter.style.borderTopColor)).toBe("#e5e5e5");
    expect(cssHex(back.style.background)).toBe("#6f7757");
    expect(cssHex(back.style.color)).toBe("#ffffff");
    pairContrast(enter, "wordle enter");
    pairContrast(back, "wordle backspace");
    assertNoPinkOrRedKeys("wordle light keys");

    cleanup();
    await boot({ uiLang: "en", theme: "dark" }, { screen: "wordle", tab: "practica" }, "letter-board", () => {
      localStorage.setItem(WORDLE_STORAGE_KEY, JSON.stringify({ day: fresh.day, guesses: [guess], draft: "sol", status: "play" }));
    });
    assertNoPinkOrRedKeys("wordle dark keys");

    cleanup();
    await boot({ uiLang: "en" }, {
      screen: "ahorcado",
      tab: "practica",
      ahorcado: { word: "chamba", guessed: ["C", "W"], status: "play", focus: 1 },
    }, "letter-board");
    screen.getAllByTestId("letter-chip").filter((el) => el.getAttribute("data-state") === "idle").forEach((el) => {
      expect(el.getAttribute("style"), "unused hangman letter").not.toMatch(BRIGHT_GREEN);
      expect(cssHex(el.style.color)).toBe("#4f5a36");
      expect(cssHex(el.style.background)).toBe("#ffffff");
    });
    const letter = screen.getAllByTestId("letter-chip").find((el) => el.getAttribute("data-letter") === "A");
    pairContrast(letter, "hangman idle key");
    const hit = screen.getAllByTestId("letter-chip").find((el) => el.getAttribute("data-letter") === "C");
    const miss = screen.getAllByTestId("letter-chip").find((el) => el.getAttribute("data-letter") === "W");
    expect(hit.getAttribute("data-state")).toBe("correct");
    expect(miss.getAttribute("data-state")).toBe("wrong");
    expect(cssHex(hit.style.background)).toBe(WORDLE_CORRECT.toLowerCase());
    expect(cssHex(hit.style.color)).toBe("#ffffff");
    expect(hit.style.borderTopColor).toBe("transparent");
    expect(cssHex(miss.style.background)).toBe(WORDLE_ABSENT.toLowerCase());
    expect(cssHex(miss.style.color)).toBe("#ffffff");
    expect(miss.style.borderTopColor).toBe("transparent");
    pairContrast(hit, "hangman correct key");
    pairContrast(miss, "hangman wrong key");
    assertNoPinkOrRedKeys("hangman light keys");
    assertNoBrightGreen(screen.getByTestId("hangman-slots"), "hangman slots");
    const slots = screen.getAllByTestId("hangman-slot");
    const focused = slots.find((el) => el.getAttribute("data-focus") === "on");
    const empty = slots.find((el) => el.getAttribute("data-focus") === "off" && !el.querySelector("[data-testid='hangman-slot-letter']").textContent);
    const filled = slots.find((el) => el.querySelector("[data-testid='hangman-slot-letter']").textContent);
    expect(focused.style.borderBottomWidth).toBe("3px");
    expect(cssHex(focused.style.borderBottomColor)).toBe("#6f7757");
    expect(empty.style.borderBottomWidth).toBe("3px");
    expect(cssHex(empty.style.borderBottomColor)).toBe("#b8c0a0");
    expect(cssHex(filled.style.borderBottomColor)).toBe("#3c3c3c");

    cleanup();
    await boot({ uiLang: "en", theme: "dark" }, {
      screen: "ahorcado",
      tab: "practica",
      ahorcado: { word: "chamba", guessed: ["C", "W"], status: "play", focus: 1 },
    }, "hangman-slots");
    const darkSlot = screen.getAllByTestId("hangman-slot").find((el) => el.getAttribute("data-focus") === "on");
    expect(darkSlot.style.borderBottomWidth).toBe("3px");
    expect(cssHex(darkSlot.style.borderBottomColor)).toBe("#b8c0a0");
    expect(darkSlot.getAttribute("style")).not.toMatch(BRIGHT_GREEN);
    const darkKey = screen.getAllByTestId("letter-chip").find((el) => el.getAttribute("data-letter") === "A");
    expect(cssHex(darkKey.style.color)).toBe("#f6efe4");
    expect(cssHex(darkKey.style.background)).toBe("#1e2128");
    const darkHit = screen.getAllByTestId("letter-chip").find((el) => el.getAttribute("data-letter") === "C");
    const darkMiss = screen.getAllByTestId("letter-chip").find((el) => el.getAttribute("data-letter") === "W");
    expect(darkHit.getAttribute("data-state")).toBe("correct");
    expect(darkMiss.getAttribute("data-state")).toBe("wrong");
    expect(cssHex(darkHit.style.background)).toBe("#677050");
    expect(cssHex(darkHit.style.color)).toBe("#f6efe4");
    expect(cssHex(darkMiss.style.background)).toBe("#2a2e36");
    expect(cssHex(darkMiss.style.color)).toBe("#a0a4ab");
    pairContrast(darkHit, "dark hangman correct key");
    pairContrast(darkMiss, "dark hangman wrong key");
    assertNoPinkOrRedKeys("hangman dark keys");

    cleanup();
    await boot({ uiLang: "en" }, {
      screen: "ahorcado",
      tab: "practica",
      ahorcado: { word: "chamba", guessed: ["C", "H", "A", "M", "B"], status: "win" },
    }, "hangman-end");
    const end = screen.getByTestId("hangman-end");
    assertNoBrightGreen(end, "hangman end");
    expect(cssHex(end.style.background)).toBe("#eef0e6");
    expect(end.style.borderTopWidth).toBe("2px");
    expect(end.style.borderBottomWidth).toBe("4px");
    expect(cssHex(end.style.borderTopColor)).toBe("#6f7757");
    expect(cssHex(end.style.borderBottomColor)).toBe("#6f7757");
    for (const id of ["hangman-win", "hangman-word"]) {
      expect(cssHex(screen.getByTestId(id).style.color)).toBe("#4f5a36");
      pairContrast(screen.getByTestId(id), id);
    }
    const quiet = screen.getByTestId("hangman-literal").firstElementChild;
    expect(cssHex(quiet.style.color)).toBe("#5e6650");
    pairContrast(quiet, "hangman end quiet");
    expect(cssHex(screen.getByTestId("hangman-why").lastElementChild.style.color)).toBe("#5e6650");
    expect(cssHex(screen.getByTestId("hangman-again").style.background)).toBe("#58cc02");
  });
});
