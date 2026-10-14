/**
 * QUESTIONS open scrolls the comprehension header to just under the brand bar,
 * with Q1 still in view. After the last answer, CLAIM sits fully above the
 * fold with a 12px margin. The readable top is the brand bar only.
 * Checked at 360×640 and 390×844.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";
import { lecturaAdvanceScrollY, lecturaQuestionsOpenScrollY } from "./lecturaAdvance.js";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const STICKY = 72;
const HEADER_H = 80;
const HEADER_DOC = 1500;
const Q1_DOC = 1900;
const BACK_DOC = 1400;
const CLAIM_DOC = 3400;
const CLAIM_H = 96;
/** Header line plus the outline lip. Without a second scroll the card crosses the fold. */
const CLAIMED_SHIFT = 36;
const CLAIMED_GROWTH = 2;

const rect = (top, height, width = 358) => ({
  x: 16, y: top, top, left: 16, right: 16 + width, bottom: top + height, width, height, toJSON() {},
});

describe("lectura questions open and claim scroll", () => {
  let realRect;
  let realInnerHeight;
  let realInnerWidth;
  let scrollY;

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = realRect;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: realInnerHeight });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: realInnerWidth });
    delete window.scrollY;
    delete window.pageYOffset;
    vi.restoreAllMocks();
    cleanup();
    localStorage.clear();
  });

  const bootLastParagraph = async (width, height, uiLang = "es") => {
    cleanup();
    localStorage.clear();
    mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, headers: { get: () => "text/html" } })));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang,
      onboardingDone: true, firstSessionDone: true, paywallSeen: true, done: {}, theme: "light",
    }));
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "story", tab: "lectura", storyId: "story-0", paraIdx: 5, ansSel: {},
    }));
    scrollY = 900;
    realInnerHeight = window.innerHeight;
    realInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
    Object.defineProperty(window, "pageYOffset", { configurable: true, get: () => scrollY });
    realRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function lecturaQuestionsRect() {
      const id = this.getAttribute && this.getAttribute("data-testid");
      const y = scrollY;
      if (id === "lectura-questions-header") return rect(HEADER_DOC - y, HEADER_H, width);
      if (id === "story-q-prompt") {
        const prompts = document.querySelectorAll("[data-testid='story-q-prompt']");
        const index = [...prompts].indexOf(this);
        return rect(Q1_DOC + index * 420 - y, 48, width);
      }
      if (id === "lectura-claim" || id === "lectura-score") {
        const claim = id === "lectura-claim" ? this : this.closest("[data-testid='lectura-claim']");
        const text = (claim && claim.textContent) || "";
        const claimed = /XP reclamados|XP ya reclamado|XP already claimed|XP claimed/.test(text);
        const doc = CLAIM_DOC + (claimed ? CLAIMED_SHIFT : 0);
        const h = id === "lectura-score" ? 28 : CLAIM_H + (claimed ? CLAIMED_GROWTH : 0);
        return rect(doc - y, h, Math.max(0, width - 32));
      }
      if (id === "lectura-paragraph" || id === "lectura-paragraph-first") return rect(820, 580, width);
      if (this.tagName === "BUTTON" && (this.textContent || "").includes("Volver al cuento")) return rect(BACK_DOC - y, 40, width);
      if (this.style && this.style.position === "sticky") return rect(0, STICKY, width);
      return realRect.call(this);
    };
    vi.spyOn(window, "scrollTo").mockImplementation((x, y) => {
      scrollY = typeof x === "object" ? Number(x.top) || 0 : Number(y) || 0;
    });
    const user = userEvent.setup();
    render(<App />);
    const questionsName = uiLang === "en" ? "Questions →" : "Preguntas →";
    await waitFor(() => expect(screen.getByRole("button", { name: questionsName })).toBeTruthy());
    return user;
  };

  for (const [width, height] of [[360, 640], [390, 844]]) {
    it(`opens QUESTIONS with the header and Q1 at the top, then fits CLAIM, at ${width}x${height}`, async () => {
      const user = await bootLastParagraph(width, height);
      expect(window.innerWidth).toBe(width);
      expect(window.innerHeight).toBe(height);
      expect(screen.queryByTestId("lectura-questions")).toBeNull();
      expect(screen.queryByTestId("soft-paywall")).toBeNull();

      await user.click(screen.getByRole("button", { name: "Preguntas →" }));
      const header = await screen.findByTestId("lectura-questions-header");
      const q1 = screen.getAllByTestId("story-q-prompt")[0];
      expect(header.textContent).toMatch(/Comprensión/);
      expect(q1.textContent).toMatch(/^1\./);
      expect(header.style.position).not.toBe("sticky");
      expect(header.getAttribute("style") || "").not.toMatch(/background|z-index|zIndex/);
      expect(document.documentElement.style.getPropertyValue("--lectura-brand-bottom")).toBe("");
      expect(scrollY).toBe(lecturaQuestionsOpenScrollY({
        headerTop: HEADER_DOC - 900,
        scrollY: 900,
        viewportTop: STICKY,
      }));

      expect(header.getBoundingClientRect().top).toBe(STICKY);
      expect(q1.getBoundingClientRect().top).toBeGreaterThan(header.getBoundingClientRect().bottom);
      expect(q1.getBoundingClientRect().bottom).toBeLessThanOrEqual(height);
      const back = screen.getByRole("button", { name: /Volver al cuento/ });
      expect(back.getBoundingClientRect().bottom).toBeLessThanOrEqual(STICKY);
      expect(screen.queryByTestId("lectura-claim")).toBeNull();
      expect(screen.queryByTestId("soft-paywall")).toBeNull();

      const openScroll = scrollY;
      const prompts = screen.getAllByTestId("story-q-prompt");
      expect(prompts).toHaveLength(3);
      for (const prompt of prompts) {
        const choice = prompt.parentElement.querySelector("button.choice-card");
        await user.click(choice);
      }
      const claim = await screen.findByTestId("lectura-claim");
      expect(claim.textContent).toMatch(/\+35 XP · 💎10/);
      expect(claim.textContent).not.toMatch(/Reclamar/);
      const score = screen.getByTestId("lectura-score");
      const claimBox = claim.getBoundingClientRect();
      const readableTop = STICKY;
      expect(score.getBoundingClientRect().top).toBe(readableTop);
      expect(claimBox.top).toBeGreaterThanOrEqual(readableTop);
      expect(claimBox.bottom).toBeLessThanOrEqual(height);
      expect(claimBox.bottom - claimBox.top).toBe(CLAIM_H);
      expect(scrollY).toBe(lecturaAdvanceScrollY({
        paragraphTop: CLAIM_DOC - openScroll,
        scrollY: openScroll,
        headerBottom: readableTop,
      }));
      expect(screen.queryByTestId("soft-paywall")).toBeNull();
    });
  }

  for (const [width, height] of [[360, 640], [390, 844]]) {
    for (const uiLang of ["es", "en"]) {
      it(`keeps the XP-claimed card fully inside the viewport at ${width}x${height} (${uiLang})`, async () => {
        const user = await bootLastParagraph(width, height, uiLang);
        const questionsName = uiLang === "en" ? "Questions →" : "Preguntas →";
        const claimedName = uiLang === "en" ? /^XP claimed$/ : /^XP reclamados$/;
        await user.click(screen.getByRole("button", { name: questionsName }));
        const prompts = await screen.findAllByTestId("story-q-prompt");
        expect(prompts).toHaveLength(3);
        for (const prompt of prompts) {
          await user.click(prompt.parentElement.querySelector("button.choice-card"));
        }
        const claim = await screen.findByTestId("lectura-claim");
        expect(claim.textContent).toMatch(/\+35 XP · 💎10/);
        const before = scrollY;
        await user.click(screen.getByTestId("lectura-claim-cta"));
        await waitFor(() => expect(screen.getByTestId("lectura-claim-cta").textContent).toMatch(claimedName));
        const box = claim.getBoundingClientRect();
        const score = screen.getByTestId("lectura-score");
        expect(scrollY).toBeGreaterThan(before);
        expect(box.height).toBe(CLAIM_H + CLAIMED_GROWTH);
        expect(score.getBoundingClientRect().top).toBe(STICKY);
        expect(box.top).toBeGreaterThanOrEqual(STICKY);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width);
        expect(box.bottom).toBeLessThanOrEqual(height);
        expect(height - box.bottom).toBeGreaterThanOrEqual(12);
        expect(screen.queryByTestId("soft-paywall")).toBeNull();
      });
    }
  }
});
