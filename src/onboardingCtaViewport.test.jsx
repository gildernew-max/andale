/**
 * The onboarding CTA used to be position:absolute with a top of 780 inside an
 * overflow:hidden shell. On a 360×640 phone that put Continuar / Continue 140px
 * below the screen. It now pins to the viewport bottom. Checked at 360×640 and
 * 390×844 for level, why, goal, and plan. A learner can finish onboarding at 360×640.
 */
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import Onboarding from "./Onboarding.jsx";
import { installFlowHooks, STORAGE_KEY } from "./flowsHarness.jsx";
import {
  ONBOARDING_CTA_BOTTOM,
  ONBOARDING_CTA_CONTENT_GAP,
  ONBOARDING_CTA_HEIGHT,
  ONBOARDING_FRAME_HEIGHT,
  ONBOARDING_FRAME_WIDTH,
  onboardingCtaBottomCss,
  onboardingCtaClearanceCss,
  onboardingCtaRect,
} from "./onboarding.js";

installFlowHooks();

const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: ONBOARDING_FRAME_WIDTH, height: ONBOARDING_FRAME_HEIGHT },
];

const STEPS = [
  { step: "level", card: "onboarding-level-some", cta: "onboarding-cta" },
  { step: "why", card: "onboarding-why-live", cta: "onboarding-cta" },
  { step: "goal", card: "onboarding-goal-10", cta: "onboarding-cta" },
  { step: "plan", card: null, cta: "onboarding-start" },
];

function setViewport({ width, height }) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: height });
}

function expectCtaInViewport(cta, viewport, { ready, theme }) {
  expect(cta.style.position).toBe("fixed");
  expect(cta.style.bottom).toBe(onboardingCtaBottomCss());
  expect(cta.style.top).toBe("");
  expect(cta.style.left).toBe("20px");
  expect(cta.style.right).toBe("20px");
  expect(cta.style.pointerEvents).not.toBe("none");
  expect(cta.style.fontWeight).toBe("800");
  expect(cta.style.fontSize).toBe("15px");
  expect(cta.style.letterSpacing).toBe("0.06em");
  expect(cta.style.textTransform).toBe("uppercase");
  expect(cta.style.borderRadius).toBe("14px");
  expect(cta.style.padding).toBe("13px 24px");
  expect(cta.style.opacity).toBe("1");

  const rect = onboardingCtaRect({ viewportHeight: viewport.height, viewportWidth: viewport.width });
  expect(onboardingCtaBottomCss()).toBe(`calc(${ONBOARDING_CTA_BOTTOM}px + env(safe-area-inset-bottom))`);
  expect(ONBOARDING_CTA_BOTTOM).toBe(16);
  expect(rect.withinViewport).toBe(true);
  expect(rect.bottomGap).toBe(16);
  expect(rect.bottom).toBe(viewport.height - 16);
  expect(rect.top).toBe(viewport.height - 16 - ONBOARDING_CTA_HEIGHT);
  expect(rect.contentGap).toBe(12);
  expect(ONBOARDING_CTA_CONTENT_GAP).toBe(12);
  expect(rect.lastContentBottom).toBe(rect.top - 12);
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.right).toBeLessThanOrEqual(viewport.width);
  expect(rect.height).toBe(ONBOARDING_CTA_HEIGHT);
  expect(rect.width).toBeGreaterThanOrEqual(44);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  expect(centerX).toBeGreaterThanOrEqual(0);
  expect(centerX).toBeLessThanOrEqual(viewport.width);
  expect(centerY).toBeGreaterThanOrEqual(0);
  expect(centerY).toBeLessThanOrEqual(viewport.height);

  const shell = screen.getByTestId("onboarding");
  expect(shell.style.overflow).not.toBe("hidden");
  expect(shell.style.paddingBottom).toBe(onboardingCtaClearanceCss());
  const scroll = screen.getByTestId("onboarding-scroll");
  expect(scroll.style.overflowY).toBe("auto");
  expect(scroll.contains(cta)).toBe(false);
  expect(scroll.style.padding).toBe(`76px 20px ${ONBOARDING_CTA_CONTENT_GAP}px`);
  expect(scroll.style.paddingBottom || scroll.style.padding.split(" ").pop()).toBe("12px");

  if (ready) {
    expect(cta.disabled).toBe(false);
    expect(cta.style.background).toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(cta.style.color).toMatch(/#1F3A1A|rgb\(\s*31,\s*58,\s*26\s*\)/i);
    expect(cta.style.borderBottom).toMatch(/#46A302|rgb\(\s*70,\s*163,\s*2\s*\)/i);
  } else if (theme === "dark") {
    expect(cta.disabled).toBe(true);
    expect(cta.style.background).toMatch(/#2A2E36|rgb\(\s*42,\s*46,\s*54\s*\)/i);
    expect(cta.style.color).toMatch(/#6B7078|rgb\(\s*107,\s*112,\s*120\s*\)/i);
    expect(cta.style.borderBottom).toMatch(/#1E2128|rgb\(\s*30,\s*33,\s*40\s*\)/i);
  } else {
    expect(cta.disabled).toBe(true);
    expect(cta.style.background).toMatch(/#E5E5E5|rgb\(\s*229,\s*229,\s*229\s*\)/i);
    expect(cta.style.color).toMatch(/#AFAFAF|rgb\(\s*175,\s*175,\s*175\s*\)/i);
    expect(cta.style.borderBottom).toMatch(/#CECECE|rgb\(\s*206,\s*206,\s*206\s*\)/i);
  }
  return rect;
}

function StepHarness({ theme, step, onAdvance }) {
  const [goal, setGoal] = useState(10);
  return (
    <Onboarding
      lang="en"
      theme={theme}
      step={step}
      goal={goal}
      onLevel={() => onAdvance("level")}
      onWhy={() => onAdvance("why")}
      onGoal={(minutes) => { setGoal(minutes); onAdvance("goal"); }}
      onStart={() => onAdvance("plan")}
    />
  );
}

describe("onboarding CTA stays on screen", () => {
  const prevW = window.innerWidth;
  const prevH = window.innerHeight;

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: prevW });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: prevH });
  });

  it.each(VIEWPORTS)("button bottom is 16px above the safe area and content stops 12px above the button at $width×$height", (viewport) => {
    const pin = onboardingCtaRect({ viewportHeight: viewport.height, viewportWidth: viewport.width });
    expect(onboardingCtaBottomCss()).toBe("calc(16px + env(safe-area-inset-bottom))");
    expect(pin.bottomGap).toBe(16);
    expect(pin.bottom).toBe(viewport.height - 16);
    expect(pin.contentGap).toBe(12);
    expect(pin.lastContentBottom).toBe(pin.top - 12);
    expect(pin.withinViewport).toBe(true);
  });

  it.each(VIEWPORTS)("level, why, goal, and plan CTAs are in the viewport and tappable at $width×$height", async (viewport) => {
    setViewport(viewport);
    const user = userEvent.setup();
    for (const theme of ["light", "dark"]) {
      for (const spec of STEPS) {
        const advanced = [];
        cleanup();
        render(
          <StepHarness
            theme={theme}
            step={spec.step}
            onAdvance={(name) => advanced.push(name)}
          />,
        );
        const cta = screen.getByTestId(spec.cta);
        expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe(spec.step);
        expectCtaInViewport(cta, viewport, { ready: spec.step === "plan", theme });
        if (spec.card) {
          await user.click(screen.getByTestId(spec.card));
          expectCtaInViewport(screen.getByTestId(spec.cta), viewport, { ready: true, theme });
        }
        await user.click(screen.getByTestId(spec.cta));
        expect(advanced).toEqual([spec.step]);
      }
    }
  });

  it("a learner finishes onboarding at 360×640", async () => {
    const viewport = { width: 360, height: 640 };
    setViewport(viewport);
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("level"));

    expectCtaInViewport(screen.getByTestId("onboarding-cta"), viewport, { ready: false, theme: "light" });
    await user.click(screen.getByTestId("onboarding-level-conversation"));
    expectCtaInViewport(screen.getByTestId("onboarding-cta"), viewport, { ready: true, theme: "light" });
    await user.click(screen.getByTestId("onboarding-cta"));

    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("why"));
    expectCtaInViewport(screen.getByTestId("onboarding-cta"), viewport, { ready: false, theme: "light" });
    await user.click(screen.getByTestId("onboarding-why-travel"));
    expectCtaInViewport(screen.getByTestId("onboarding-cta"), viewport, { ready: true, theme: "light" });
    await user.click(screen.getByTestId("onboarding-cta"));

    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("goal"));
    expectCtaInViewport(screen.getByTestId("onboarding-cta"), viewport, { ready: false, theme: "light" });
    await user.click(screen.getByTestId("onboarding-goal-15"));
    expectCtaInViewport(screen.getByTestId("onboarding-cta"), viewport, { ready: true, theme: "light" });
    await user.click(screen.getByTestId("onboarding-cta"));

    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("plan"));
    expectCtaInViewport(screen.getByTestId("onboarding-start"), viewport, { ready: true, theme: "light" });
    await user.click(screen.getByTestId("onboarding-start"));

    await waitFor(() => expect(document.querySelector("[data-first-session]")?.getAttribute("data-first-session")).toBe("1"));
    expect(screen.queryByTestId("onboarding")).toBeNull();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.onboardingDone).toBe(true);
    expect(saved.onboardingPending).toBe(false);
    expect(saved.learnerLevel).toBe("conversation");
    expect(saved.learningWhy).toBe("travel");
    expect(saved.dailyGoalMinutes).toBe(15);
  });
});
