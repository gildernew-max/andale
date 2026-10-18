import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { prevDayKey } from "./firstDoor.js";
import { forgetFirstStreakReturnLive } from "./firstStreakReturn.js";
import { installFlowHooks, seedProgress, boot, localToday, startHoyFromHub, finishColdFirstHoy, STORAGE_KEY, LIVE_KEY } from "./flowsHarness.jsx";

installFlowHooks();

afterEach(() => {
  forgetFirstStreakReturnLive();
});

const day2 = (extra = {}) => {
  const today = localToday();
  seedProgress({
    uiLang: "en",
    theme: "light",
    onboardingDone: true,
    firstSessionDone: true,
    paywallSeen: true,
    bajioUnlockSeen: true,
    lecturaHandoffSeen: true,
    streak: 1,
    lastDay: prevDayKey(today),
    hearts: 5,
    ...extra,
  });
};

describe("day-2 first streak return card is dark: no 2 until a win earns it", () => {
  it("does not render the 2 days card with stored streak 1, nothing done today, a claimed story-0", async () => {
    day2({ stories: { "story-0": true }, lecturaOpenId: "story-0" });
    await boot();
    expect(screen.queryByTestId("first-streak-return")).toBeNull();
    expect(screen.queryByText(/2 days in a row|2 días seguidos/)).toBeNull();
    expect((window.__andaleFunnelLog || []).some((event) => event.event === "first_streak_seen")).toBe(false);
    expect(localStorage.getItem("andale-first-streak-return")).toBeNull();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^1/);
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toContain("Streak: 1 day.");
    expect(screen.getByTestId("streak-home-note").textContent).toBe("Your 1-day streak ends tonight. Do one lesson to keep it.");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(1);
  });

  it("does not render it for a halfway story either, in ES", async () => {
    day2({ uiLang: "es", lecturaOpenId: "story-0", lecturaStartedAt: 1 });
    await boot();
    expect(screen.queryByTestId("first-streak-return")).toBeNull();
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^1/);
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toContain("Racha: 1 día.");
    expect(screen.getByTestId("hub-hoy-quiet").textContent).not.toMatch(/días/);
    expect(screen.getByTestId("streak-home-note").textContent).toBe("Tu racha de 1 día termina esta noche. Haz una lección para mantenerla.");
  });

  it("keeps the stored number for a longer streak at risk (stored 3)", async () => {
    day2({ streak: 3, uiLang: "es" });
    await boot();
    expect(screen.queryByTestId("first-streak-return")).toBeNull();
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^3/);
    expect(screen.getByTestId("streak-home-note").textContent).toBe("Tu racha de 3 días termina esta noche. Haz una lección para mantenerla.");
  });

  it("a real day-2 win makes the stored streak and the flame 2", async () => {
    day2({ uiLang: "es" });
    const user = await boot();
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^1/);
    await startHoyFromHub(user);
    await finishColdFirstHoy(user);
    await waitFor(() => expect(screen.getByTestId("hoy-win")).toBeTruthy());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(2);
    await user.click(screen.getByTestId("hoy-win-continue"));
    await waitFor(() => expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^2/), { timeout: 8000 });
  }, 30000);
});
