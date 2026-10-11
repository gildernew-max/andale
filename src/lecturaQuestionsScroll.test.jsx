/**
 * QUESTIONS open parks the comprehension header and Q1 at the readable top.
 * After the last answer, CLAIM is fully inside the viewport. Checked at the
 * two phone sizes: 360×640 and 390×844.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";
import { lecturaClaimScrollY, lecturaQuestionsOpenScrollY } from "./lecturaAdvance.js";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const STICKY = 72;
const HEADER_H = 80;
const HEADER_DOC = 1500;
const Q1_DOC = 1900;
const BACK_DOC = 1400;
const CLAIM_DOC = 3400;
const CLAIM_H = 96;

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

  const bootLastParagraph = async (width, height) => {
    cleanup();
    localStorage.clear();
    mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, headers: { get: () => "text/html" } })));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "es",
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
      if (id === "lectura-claim") return rect(CLAIM_DOC - y, CLAIM_H, width);
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
    await waitFor(() => expect(screen.getByRole("button", { name: "Preguntas →" })).toBeTruthy());
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
      expect(header.style.position).toBe("sticky");
      expect(header.style.background).toBeTruthy();
      expect(header.style.top).toBe("var(--lectura-brand-bottom, 0px)");
      expect(document.documentElement.style.getPropertyValue("--lectura-brand-bottom")).toBe(`${STICKY}px`);
      expect(scrollY).toBe(lecturaQuestionsOpenScrollY({
        headerTop: HEADER_DOC - 900,
        headerHeight: HEADER_H,
        q1Top: Q1_DOC - 900,
        scrollY: 900,
        viewportTop: STICKY,
      }));

      expect(q1.getBoundingClientRect().top).toBe(STICKY + HEADER_H);
      expect(q1.getBoundingClientRect().top).toBeLessThan(height);
      expect(header.getBoundingClientRect().top).toBeLessThanOrEqual(STICKY);
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
      expect(claim.textContent).toMatch(/Reclamar/);
      const claimBox = claim.getBoundingClientRect();
      const readableTop = STICKY + HEADER_H;
      expect(claimBox.top).toBeGreaterThanOrEqual(readableTop);
      expect(claimBox.bottom).toBe(height - 12);
      expect(claimBox.bottom - claimBox.top).toBe(CLAIM_H);
      expect(scrollY).toBe(lecturaClaimScrollY({
        claimTop: CLAIM_DOC - openScroll,
        claimBottom: CLAIM_DOC + CLAIM_H - openScroll,
        scrollY: openScroll,
        viewportHeight: height,
        viewportTop: readableTop,
      }));
      expect(screen.queryByTestId("soft-paywall")).toBeNull();
    });
  }
});
