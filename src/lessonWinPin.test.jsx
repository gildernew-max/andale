/**
 * Lesson-end Continue uses the onboarding pin: 16px above the safe area,
 * and the column keeps a 12px gap above the button. Fully on screen at
 * 360×640 and 390×844 without scrolling. Size, ink, and label stay put.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";
import {
  ONBOARDING_CTA_BOTTOM,
  ONBOARDING_CTA_CONTENT_GAP,
  ONBOARDING_CTA_HEIGHT,
  onboardingCtaBottomCss,
  onboardingCtaRect,
} from "./onboarding.js";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
];

describe("lesson-end Continue stays on screen", () => {
  const prevW = window.innerWidth;
  const prevH = window.innerHeight;

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: prevW });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: prevH });
  });

  const boot = async (width, height, theme) => {
    cleanup();
    localStorage.clear();
    mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: height });
    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      welcomed: true, xp: 40, gems: 4, name: "Dave", contentVersion: 2, hearts: 5,
      uiLang: "en", onboardingDone: true, firstSessionDone: true, paywallSeen: true,
      done: { subj1: 1 }, theme, sound: false,
    }));
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "done",
      tab: "camino",
      lessonStats: { right: 4, wrong: 1 },
      session: {
        title: "Subjuntivo",
        host: "valeria",
        unitId: "subj1",
        questions: [{ type: "mc", prompt: "x", choices: ["a"], answer: "a" }],
        awarded: true,
        earnedXP: 20,
        earnedGems: 5,
      },
    }));
    render(<App />);
    return screen.findByTestId("win-continue");
  };

  it.each(VIEWPORTS)("Continue is fully visible and tappable without scrolling at $width×$height", async ({ width, height }) => {
    const user = userEvent.setup();
    for (const theme of ["light", "dark"]) {
      const btn = await boot(width, height, theme);
      expect(window.innerWidth).toBe(width);
      expect(window.innerHeight).toBe(height);
      expect(window.scrollY).toBe(0);
      expect(btn.style.position).toBe("fixed");
      expect(btn.style.bottom).toBe(onboardingCtaBottomCss());
      expect(btn.style.bottom).toBe("calc(16px + env(safe-area-inset-bottom))");
      expect(btn.style.width).toBe("fit-content");
      expect(btn.style.padding).toBe("13px 24px");
      expect(btn.style.fontSize).toBe("15px");
      expect(btn.style.fontWeight).toBe("800");
      expect(btn.style.letterSpacing).toBe("0.06em");
      expect(btn.style.textTransform).toBe("uppercase");
      expect(btn.style.color).toMatch(/#fff|#ffffff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
      expect(btn.disabled).toBe(false);
      expect(btn.style.pointerEvents).not.toBe("none");
      expect(btn.textContent).toBe("Continue");

      const pin = onboardingCtaRect({ viewportHeight: height, viewportWidth: width });
      expect(ONBOARDING_CTA_BOTTOM).toBe(16);
      expect(pin.withinViewport).toBe(true);
      expect(pin.bottomGap).toBe(16);
      expect(pin.bottom).toBe(height - 16);
      expect(pin.top).toBe(height - 16 - ONBOARDING_CTA_HEIGHT);
      expect(pin.top).toBeGreaterThanOrEqual(0);
      expect(pin.bottom).toBeLessThanOrEqual(height);
      expect(pin.contentGap).toBe(12);
      expect(ONBOARDING_CTA_CONTENT_GAP).toBe(12);

      const column = screen.getByTestId("lesson-win");
      expect(column.style.paddingBottom).toBe(`calc(${ONBOARDING_CTA_BOTTOM + ONBOARDING_CTA_HEIGHT + ONBOARDING_CTA_CONTENT_GAP}px + env(safe-area-inset-bottom))`);
      expect(column.style.paddingBottom).toBe("calc(78px + env(safe-area-inset-bottom))");
      expect(column.contains(btn)).toBe(true);

      await user.click(btn);
      await waitFor(() => expect(screen.queryByTestId("win-continue")).toBeNull());
      expect(window.scrollY).toBe(0);
      expect(screen.getByTestId("nav-camino")).toBeTruthy();
    }
  });
});
