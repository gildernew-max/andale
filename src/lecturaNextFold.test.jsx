/**
 * Story-0 paragraph 1 keeps NEXT on screen at 360×640 and 390×844.
 * The still crops to a 16:9 band, and NEXT is pinned like the onboarding CTA.
 * Advance still scrolls the next paragraph to the brand bar.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";
import {
  LECTURA_NEXT_HEIGHT,
  lecturaAdvanceScrollY,
  lecturaLinesAboveNext,
  lecturaNextBottomCss,
  lecturaNextButtonTop,
  lecturaStillAtLeast16x9,
  lecturaStillBandHeight,
  lecturaStoryOpenTextTop,
} from "./lecturaAdvance.js";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const rect = (top, height, width = 358) => ({
  x: 16, y: top, top, left: 16, right: 16 + width, bottom: top + height, width, height, toJSON() {},
});

describe("lectura paragraph 1 NEXT above the fold", () => {
  let realRect;
  let realInnerHeight;
  let realInnerWidth;
  let scrollY;

  afterEach(() => {
    if (realRect) HTMLElement.prototype.getBoundingClientRect = realRect;
    if (realInnerHeight != null) Object.defineProperty(window, "innerHeight", { configurable: true, value: realInnerHeight });
    if (realInnerWidth != null) Object.defineProperty(window, "innerWidth", { configurable: true, value: realInnerWidth });
    delete window.scrollY;
    delete window.pageYOffset;
    vi.restoreAllMocks();
    cleanup();
    localStorage.clear();
  });

  const bootParagraph1 = async (width, height, theme) => {
    cleanup();
    localStorage.clear();
    mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, headers: { get: () => "text/html" } })));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "en",
      onboardingDone: true, firstSessionDone: true, paywallSeen: true, done: {}, theme,
    }));
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "story", tab: "lectura", storyId: "story-0", paraIdx: 0, ansSel: {},
    }));
    scrollY = 0;
    realInnerHeight = window.innerHeight;
    realInnerWidth = window.innerWidth;
    realRect = HTMLElement.prototype.getBoundingClientRect;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
    Object.defineProperty(window, "pageYOffset", { configurable: true, get: () => scrollY });
    HTMLElement.prototype.getBoundingClientRect = function lecturaFoldRect() {
      const id = this.getAttribute && this.getAttribute("data-testid");
      if (id === "lectura-paragraph" || id === "lectura-paragraph-first") return rect(820, 580, width);
      if (id === "lectura-questions-header") return rect(1180, 80, width);
      if (this.style && this.style.position === "sticky") return rect(0, 72, width);
      return realRect.call(this);
    };
    vi.spyOn(window, "scrollTo").mockImplementation((x, y) => {
      scrollY = typeof x === "object" ? Number(x.top) || 0 : Number(y) || 0;
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lectura-advance")).toBeTruthy());
    await waitFor(() => expect(screen.getByRole("button", { name: "Next →" })).toBeTruthy());
    return user;
  };

  for (const [width, height, theme] of [[390, 844, "dark"], [360, 640, "light"], [360, 640, "dark"]]) {
    it(`shows NEXT, the 16:9 still, and the Spanish lines at ${width}x${height} ${theme}`, async () => {
      const user = await bootParagraph1(width, height, theme);
      expect(window.innerWidth).toBe(width);
      expect(window.innerHeight).toBe(height);
      expect(screen.getByTestId("app-shell").getAttribute("data-theme")).toBe(theme);
      expect(scrollY).toBe(0);

      const advance = screen.getByTestId("lectura-advance");
      expect(advance.style.position).toBe("fixed");
      expect(advance.style.bottom).toBe("0px");
      expect(advance.style.paddingBottom).toBe(lecturaNextBottomCss());
      expect(advance.style.paddingTop).toBe(theme === "dark" ? "11px" : "12px");
      expect(advance.style.boxShadow).toBe("none");
      expect(advance.style.backgroundImage).toBe("none");
      expect(advance.style.background).not.toMatch(/gradient/i);
      if (theme === "dark") {
        expect(advance.style.borderTopWidth).toBe("1px");
        expect(advance.style.borderTopStyle).toBe("solid");
        expect(advance.style.borderTopColor).toMatch(/#2a2e36|rgb\(\s*42,\s*46,\s*54\s*\)/i);
        expect(advance.style.backgroundColor).toMatch(/#15171c|rgb\(\s*21,\s*23,\s*28\s*\)/i);
      } else {
        expect(advance.style.borderTopStyle).toBe("none");
        expect(advance.style.backgroundColor).toMatch(/#f6efe4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
      }
      expect(advance.style.marginBottom).toBe("0px");
      expect(advance.style.display).toBe("flex");
      const buttonTop = lecturaNextButtonTop(height);
      expect(buttonTop).toBeGreaterThan(0);
      expect(buttonTop + LECTURA_NEXT_HEIGHT).toBe(height - 16);
      expect(buttonTop).toBeLessThan(height);

      const next = screen.getByRole("button", { name: "Next →" });
      expect(next.style.fontSize).toBe("15px");
      expect(next.style.fontWeight).toBe("800");
      expect(next.style.padding).toBe("13px 24px");
      expect(next.style.textTransform).toBe("uppercase");
      expect(next.style.letterSpacing).toBe("0.06em");
      expect(next.style.borderRadius).toBe("14px");
      expect(next.style.background).toMatch(/#58cc02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
      expect(next.style.color).toMatch(/#fff(?:fff)?|white|rgb\(\s*255,\s*255,\s*255\s*\)/i);
      expect(next.style.borderBottom).toMatch(/4px solid/i);

      const still = screen.getByTestId("lectura-still-0");
      expect(still.style.display).toBe("block");
      expect(still.style.aspectRatio).toBe("16 / 9");
      expect(still.style.objectFit).toBe("cover");
      expect(still.style.objectPosition).toBe("center");
      expect(still.style.borderRadius).toBe("10px");
      expect(still.getAttribute("src")).toMatch(/lectura\/story-0\/p0\.png$/);
      const bandWidth = parseFloat(still.style.maxWidth);
      const bandHeight = lecturaStillBandHeight(bandWidth);
      expect(still.style.maxWidth).toBe("160px");
      expect(still.style.marginBottom).toBe("6px");
      expect(lecturaStillAtLeast16x9(bandWidth, bandHeight)).toBe(true);
      expect(bandHeight).toBe(90);
      expect(bandHeight).toBeLessThan(148);
      expect(screen.getByTestId("story-tip").style.marginTop).toBe("4px");
      expect(screen.getByTestId("story-tip").style.marginBottom).toBe("6px");
      expect(screen.getByRole("button", { name: "Story" }).parentElement.style.marginBottom).toBe("6px");
      expect(screen.getByTestId("lectura-progress").style.marginTop).toBe("0px");
      expect(screen.getByTestId("lectura-progress").style.marginBottom).toBe("6px");
      expect(screen.getByText("Paragraph 1 / 6").style.marginBottom).toBe("4px");
      expect(screen.getByTestId("lectura-paragraph-first").style.paddingTop).toBe("8px");
      expect(screen.getByTestId("lectura-paragraph-first").style.paddingBottom).toBe("14px");

      const para = screen.getByTestId("lectura-paragraph-first");
      expect(para.textContent).toMatch(/Cuando yo era niña/);
      const copy = para.querySelector("p");
      expect(copy.style.fontSize).toBe("17px");
      expect(copy.style.lineHeight).toBe("1.75");
      const textTop = lecturaStoryOpenTextTop(bandHeight);
      expect(lecturaLinesAboveNext({ textTop, viewportHeight: height })).toBeGreaterThanOrEqual(height === 640 ? 5 : 2);

      expect(screen.getByTestId("lectura-checkpoint").style.marginTop).toBe("6px");
      expect(para.style.marginBottom).toBe("8px");

      const first = para.textContent;
      await user.click(next);
      await waitFor(() => expect(screen.getByTestId("lectura-paragraph").textContent).not.toBe(first));
      expect(screen.getByTestId("lectura-paragraph").textContent).toMatch(/A finales de octubre/);
      expect(screen.getByTestId("lectura-advance").style.position).toBe("fixed");
      expect(screen.getByTestId("lectura-still-1").style.aspectRatio).toBe("16 / 9");
      expect(scrollY).toBe(lecturaAdvanceScrollY({ paragraphTop: 820, scrollY: 0, headerBottom: 72 }));
      expect(screen.queryByTestId("lectura-questions")).toBeNull();
      expect(screen.queryByTestId("lectura-claim")).toBeNull();
    });
  }
});
