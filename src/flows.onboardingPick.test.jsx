/**
 * Cheap first-open pack. Level, why, and goal advance on the card pick with no
 * Continue button. One tap moves exactly one screen, and a double tap cannot
 * skip the next one. Hint text is 15px or more and the ES|EN toggle is a 44px target.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { installFlowHooks, pickOnboarding, startOnboarding, STORAGE_KEY, waitOnboardingReady } from "./flowsHarness.jsx";
import { onboardingCopy, onboardingLine, onboardingPlanLine } from "./onboardingCopy.js";
import { ONBOARDING_SETTLE_MS } from "./Onboarding.jsx";

installFlowHooks();

const stepNow = () => screen.getByTestId("onboarding").getAttribute("data-step");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const openFresh = async () => {
  localStorage.clear();
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(stepNow()).toBe("level"));
  await waitOnboardingReady();
  return user;
};

describe("onboarding advances on the pick", () => {
  it("no choice screen has a Continue button", async () => {
    const user = await openFresh();
    for (const [card, next] of [["onboarding-level-some", "why"], ["onboarding-why-work", "goal"]]) {
      expect(screen.queryByTestId("onboarding-cta")).toBeNull();
      expect(screen.queryByText(onboardingLine(onboardingCopy.ctaContinue, "en"))).toBeNull();
      await pickOnboarding(user, card);
      await waitFor(() => expect(stepNow()).toBe(next));
    }
    expect(screen.queryByTestId("onboarding-cta")).toBeNull();
  });

  it("one tap advances exactly one screen, and each pick is saved as it happens", async () => {
    const user = await openFresh();
    await pickOnboarding(user, "onboarding-level-conversation");
    expect(screen.getByTestId("onboarding-check")).toBeTruthy();
    await waitFor(() => expect(stepNow()).toBe("why"));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).learnerLevel).toBe("conversation"));
    await sleep(100);
    expect(stepNow()).toBe("why");

    await pickOnboarding(user, "onboarding-why-live");
    await waitFor(() => expect(stepNow()).toBe("goal"));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).learningWhy).toBe("live"));
    await sleep(100);
    expect(stepNow()).toBe("goal");
  });

  it("a double tap on a card does not skip the next screen", async () => {
    const user = await openFresh();
    await user.dblClick(screen.getByTestId("onboarding-level-some"));
    await waitFor(() => expect(stepNow()).toBe("why"));
    await sleep(ONBOARDING_SETTLE_MS + 150);
    expect(stepNow()).toBe("why");
    expect(screen.queryByTestId("onboarding-check")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).learningWhy).toBeUndefined();
  });

  it("a second tap landing on the next screen's card right after the change is ignored", async () => {
    const user = await openFresh();
    await user.click(screen.getByTestId("onboarding-level-some"));
    await waitFor(() => expect(stepNow()).toBe("why"));
    // Same finger spot, a moment later: the next screen's card is under it.
    await user.click(screen.getByTestId("onboarding-why-travel"));
    await sleep(ONBOARDING_SETTLE_MS - 100);
    expect(stepNow()).toBe("why");
    expect(screen.queryByTestId("onboarding-check")).toBeNull();
    // Once the screen has settled, a real pick works.
    await pickOnboarding(user, "onboarding-why-travel");
    await waitFor(() => expect(stepNow()).toBe("goal"));
  });

  it("the plan Start button ignores a tap that lands as the plan appears", async () => {
    const user = await openFresh();
    await pickOnboarding(user, "onboarding-level-some");
    await waitFor(() => expect(stepNow()).toBe("why"));
    await pickOnboarding(user, "onboarding-why-me");
    await waitFor(() => expect(stepNow()).toBe("goal"));
    await pickOnboarding(user, "onboarding-goal-20");
    await waitFor(() => expect(stepNow()).toBe("plan"));
    await user.click(screen.getByTestId("onboarding-start"));
    expect(stepNow()).toBe("plan");
    expect(screen.getByTestId("onboarding")).toBeTruthy();
    await startOnboarding(user);
    await waitFor(() => expect(document.querySelector("[data-first-session]")).toBeTruthy());
  });

  it("the goal pick reaches the plan screen with the picked minutes, and Start is unchanged", async () => {
    const user = await openFresh();
    await pickOnboarding(user, "onboarding-level-some");
    await waitFor(() => expect(stepNow()).toBe("why"));
    await pickOnboarding(user, "onboarding-why-family");
    await waitFor(() => expect(stepNow()).toBe("goal"));
    await pickOnboarding(user, "onboarding-goal-15");
    await waitFor(() => expect(stepNow()).toBe("plan"));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).dailyGoalMinutes).toBe(15));
    expect(screen.getByTestId("onboarding-plan-body").textContent).toBe("15 minutes a day: one short lesson, then a story in Lectura.");
    expect(screen.getByTestId("onboarding-plan-body").textContent).toBe(onboardingPlanLine("en", 15));
    expect(onboardingPlanLine("es", 15)).toBe("15 minutos al día: una lección corta y luego un cuento en Lectura.");
    expect(screen.getByTestId("onboarding-start").textContent).toBe("Start my first lesson");
    expect(onboardingCopy.planStart.es).toBe("Empezar mi primera lección");
  });

  it("a reload after a pick resumes on the next screen", async () => {
    const user = await openFresh();
    await pickOnboarding(user, "onboarding-level-beginner");
    await waitFor(() => expect(stepNow()).toBe("why"));
    document.body.innerHTML = "";
    render(<App />);
    await waitFor(() => expect(screen.getAllByTestId("onboarding").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getAllByTestId("onboarding").pop().getAttribute("data-step")).toBe("why"));
  });
});

describe("hint text and language toggle sizes", () => {
  it("card hints on the level and goal screens are at least 15px", async () => {
    const user = await openFresh();
    const hints = () => [...screen.getByTestId("onboarding-scroll").querySelectorAll("button > span > span > span")].filter((el) => el.style.fontWeight === "700");
    const sizes = (nodes) => nodes.map((el) => parseFloat(el.style.fontSize));
    expect(sizes(hints())).toHaveLength(3);
    expect(Math.min(...sizes(hints()))).toBeGreaterThanOrEqual(15);
    expect(parseFloat(screen.getByTestId("onboarding-promise").style.fontSize)).toBeGreaterThanOrEqual(15);
    await pickOnboarding(user, "onboarding-level-some");
    await waitFor(() => expect(stepNow()).toBe("why"));
    await pickOnboarding(user, "onboarding-why-travel");
    await waitFor(() => expect(stepNow()).toBe("goal"));
    expect(sizes(hints())).toHaveLength(4);
    expect(Math.min(...sizes(hints()))).toBeGreaterThanOrEqual(15);
  });

  it("the ES|EN toggle buttons are at least 44px tall and the row height is unchanged", async () => {
    await openFresh();
    for (const id of ["lang-es", "lang-en"]) {
      expect(parseFloat(screen.getByTestId(id).style.minHeight)).toBeGreaterThanOrEqual(44);
    }
    // Group margin offsets the extra height: 44 - 2 * 10 = 24, the old button height.
    expect(screen.getByTestId("lang-toggle").style.margin).toBe("-10px 0px");
  });
});
