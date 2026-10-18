/**
 * Build, wrong or right after CHECK: the result panel never covers a placed tile.
 * The panel is a flow sibling under the scrolling lesson body, so at 360x640 a
 * four-tile answer that wraps to two rows has its last row under the panel when
 * the body sits at the top. jsdom has no layout, so the geometry is stubbed
 * from the live 360x640 numbers (body 100..417, panel top 373.5, answer row
 * 285..413 at scrollTop 0) and the test checks that the app scrolls the body
 * until the answer row ends above the panel, and again after any scroll back up.
 */
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const WORDS = ["Un", "café,", "por", "favor", "una", "de"];

const BODY = { top: 100, height: 317 };
const PANEL = { top: 373.5, height: 266.5 };
const ROW = { top: 285, height: 128 };

const rect = (top, height) => ({ top, bottom: top + height, height, left: 0, right: 360, width: 360, x: 0, y: top, toJSON() {} });

const mockSpeech = () => {
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  window.speechSynthesis = { getVoices: () => [], speak() {}, cancel() {}, resume() {}, addEventListener() {}, removeEventListener() {}, onvoiceschanged: null, speaking: false, pending: false, paused: false };
};

const seed = (uiLang) => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang, done: {} }));
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "lesson", tab: "camino", status: "idle", qi: 0, placed: [],
    session: {
      title: "Primera lección", unitId: "registro", host: "luna", color: "#58CC02", dark: "#46A302",
      questions: [{
        type: "order", prompt: "Construye: “A coffee, please.”", words: WORDS, answer: "Un café, por favor",
        shuffledWords: WORDS.map((w, id) => ({ w, id })),
      }],
    },
  }));
};

let restore = [];
const stubLayout = () => {
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function stub() {
    const id = this.getAttribute && this.getAttribute("data-testid");
    if (id === "lesson-body") return rect(BODY.top, BODY.height);
    if (id === "lesson-footer") return rect(PANEL.top, PANEL.height);
    if (id === "order-answer-row") return rect(ROW.top - (this.closest("[data-testid='lesson-body']")?.__scrollTop || 0), ROW.height);
    return original.call(this);
  };
  restore.push(() => { Element.prototype.getBoundingClientRect = original; });
};

/** jsdom's scrollTop is a constant 0. Give the body a real one that the stub can read. */
const liveScrollTop = (body) => {
  body.__scrollTop = 0;
  Object.defineProperty(body, "scrollTop", { configurable: true, get() { return this.__scrollTop; }, set(v) { this.__scrollTop = Math.max(0, v); } });
};

const rowBottom = (body) => ROW.top + ROW.height - body.__scrollTop;

const openAndCheckWrong = async (uiLang) => {
  seed(uiLang);
  mockSpeech();
  stubLayout();
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("order-tile-bank")).toBeTruthy());
  const body = screen.getByTestId("lesson-body");
  liveScrollTop(body);
  const user = userEvent.setup();
  // Four tiles, wrong order: wraps to two rows at 360.
  for (const w of ["un", "favor", "café,", "una"]) await user.click(screen.getByRole("button", { name: w }));
  await user.click(screen.getByTestId("lesson-check"));
  await waitFor(() => expect(screen.getByTestId("lesson-footer-text").textContent.length).toBeGreaterThan(0));
  return { body, user };
};

describe("Build keeps every placed tile above the result panel", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    restore.forEach((fn) => fn());
    restore = [];
  });

  for (const lang of ["es", "en"]) {
    it(`scrolls a wrapped wrong answer clear of the panel, and again after a scroll back to the top (${lang})`, async () => {
      const { body } = await openAndCheckWrong(lang);
      const limit = PANEL.top - 8 + 0.5;
      await waitFor(() => expect(rowBottom(body)).toBeLessThanOrEqual(limit));
      expect(body.scrollTop).toBeGreaterThan(0);
      // Back to the top (a user scroll, or a tool): the last tile row must not slide under the panel.
      act(() => { body.scrollTop = 0; fireEvent.scroll(body); });
      expect(rowBottom(body)).toBeLessThanOrEqual(limit);
      expect(body.scrollTop).toBeGreaterThan(0);
    });
  }

  it("lets the body scroll further down without pulling it back", async () => {
    const { body } = await openAndCheckWrong("es");
    const settled = body.scrollTop;
    act(() => { body.scrollTop = settled + 60; fireEvent.scroll(body); });
    expect(body.scrollTop).toBe(settled + 60);
  });

  it("leaves a row taller than the visible body alone so its top stays reachable", async () => {
    const { body } = await openAndCheckWrong("es");
    ROW.height = BODY.height; // taller than body minus the margin
    try {
      act(() => { body.scrollTop = 0; fireEvent.scroll(body); });
      expect(body.scrollTop).toBe(0);
    } finally {
      ROW.height = 128;
    }
  });

  it("keeps the panel and the answer row in normal flow, the row inside the scrolling body", async () => {
    const { body } = await openAndCheckWrong("es");
    const footer = screen.getByTestId("lesson-footer");
    const row = screen.getByTestId("order-answer-row");
    expect(body.contains(row)).toBe(true);
    expect(body.contains(footer)).toBe(false);
    expect(body.nextElementSibling).toBe(footer);
    for (const el of [footer, row, body]) {
      expect(getComputedStyle(el).position).not.toBe("absolute");
      expect(getComputedStyle(el).position).not.toBe("fixed");
    }
    expect(screen.getByTestId("lesson-result-pad").contains(row)).toBe(true);
  });
});
