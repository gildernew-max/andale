/**
 * Learn home Hoy card: daily-goal caption. Display only.
 * Below the goal the card stays as it is. At or above, the done check
 * plus one caption. The number in the caption is DAILY_GOAL, not xpToday.
 */
import { describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { contrastRatio } from "./spanishKeyboard.js";
import { dayKeyFromDate } from "./firstDoor.js";
import {
  installFlowHooks,
  localToday,
  seedProgress,
} from "./flowsHarness.jsx";

installFlowHooks();

const GOAL = 40;
const ES = `Meta de hoy cumplida: ${GOAL}\u00a0XP.`;
const EN = `Today\u2019s goal done: ${GOAL}\u00a0XP.`;

const home = async (extra = {}) => {
  cleanup();
  seedProgress({
    welcomed: true,
    onboardingDone: true,
    firstSessionDone: true,
    paywallSeen: true,
    bajioUnlockSeen: true,
    uiLang: "es",
    streak: 1,
    lastDay: localToday(),
    xpToday: 0,
    ...extra,
  });
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
  await waitFor(() => expect(screen.queryByTestId("splash-start")).toBeNull());
};

const goalLine = () => screen.queryByTestId("hub-hoy-goal");

describe("Learn home daily goal caption", () => {
  it("shows no caption below the goal and keeps the Hoy quiet line", async () => {
    await home({ xpToday: 0, uiLang: "es" });
    expect(goalLine()).toBeNull();
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/cumplida|goal done/);
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("Plan de hoy");
    expect(screen.queryByTestId("hub-hoy-done")).toBeNull();
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Meta:\s*0\/40 XP/);

    await home({ xpToday: 39, uiLang: "en" });
    expect(goalLine()).toBeNull();
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/cumplida|goal done/);
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("Today's plan");
    expect(screen.queryByTestId("hub-hoy-done")).toBeNull();
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Goal:\s*39\/40 XP/);

    const today = dayKeyFromDate(new Date());
    await home({
      xpToday: 10,
      uiLang: "es",
      missions: { [`scene-${today}`]: "taqueria" },
    });
    expect(goalLine()).toBeNull();
    expect(screen.getByTestId("hub-hoy-done").textContent).toBe("✓");
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("Plan de hoy");
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Meta:\s*10\/40 XP/);
  });

  it("at the goal and above prints DAILY_GOAL in Spanish and English", async () => {
    await home({ xpToday: GOAL, uiLang: "es", theme: "light" });
    const exact = screen.getByTestId("hub-hoy-goal");
    expect(exact.textContent).toBe(ES);
    expect(exact.textContent.match(/\d+/g)).toEqual([String(GOAL)]);
    expect(screen.getByTestId("hub-hoy").contains(exact)).toBe(true);
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("Plan de hoy");
    expect(screen.getByTestId("hub-hoy-done").textContent).toBe("✓");
    expect(exact.style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
    expect(exact.style.fontWeight).toBe("800");
    expect(exact.style.fontSize).toBe("11px");
    expect(contrastRatio("#6B6258", "#F6EFE4")).toBeGreaterThanOrEqual(4.5);
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Meta:\s*40\/40 XP/);

    const user = userEvent.setup();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-hoy-goal").textContent).toBe(EN));
    expect(screen.getByTestId("hub-hoy-goal").textContent.match(/\d+/g)).toEqual([String(GOAL)]);
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("Today's plan");
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Goal:\s*40\/40 XP/);

    await home({ xpToday: 57, uiLang: "es", theme: "dark" });
    const above = screen.getByTestId("hub-hoy-goal");
    expect(above.textContent).toBe(ES);
    expect(above.textContent).not.toMatch(/57/);
    expect(above.textContent.match(/\d+/g)).toEqual([String(GOAL)]);
    expect(above.style.color).toMatch(/#A0A4AB|rgb\(\s*160,\s*164,\s*171\s*\)/i);
    expect(contrastRatio("#A0A4AB", "#1E2128")).toBeGreaterThanOrEqual(4.5);
    expect(screen.getByTestId("hub-hoy-done").textContent).toBe("✓");
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Meta:\s*57\/40 XP/);

    const userEn = userEvent.setup();
    await userEn.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-hoy-goal").textContent).toBe(EN));
    expect(screen.getByTestId("hub-hoy-goal").textContent.match(/\d+/g)).toEqual([String(GOAL)]);
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("Today's plan");
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Goal:\s*57\/40 XP/);

    await home({ xpToday: GOAL, uiLang: "en", theme: "light" });
    expect(screen.getByTestId("hub-hoy-goal").textContent).toBe(EN);
    expect(screen.getByTestId("hub-hoy-done").textContent).toBe("✓");
  });
});
