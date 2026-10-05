import { describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { prevDayKey } from "./firstDoor.js";
import { FIRST_SESSION_FUNNEL_KEY } from "./firstSessionFunnel.js";
import {
  installFlowHooks,
  LIVE_KEY,
  STORAGE_KEY,
  answerFirstSessionBeat,
  funnelOf,
  localToday,
  missFirstSessionBeat,
  seedProgress,
} from "./flowsHarness.jsx";

installFlowHooks();

const startOnboarding = async (user) => {
  localStorage.clear();
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("onboarding-level-conversation")).toBeTruthy());
  await user.click(screen.getByTestId("onboarding-level-conversation"));
  await waitFor(() => expect(screen.getByTestId("onboarding-goal-1")).toBeTruthy());
  await user.click(screen.getByTestId("onboarding-goal-1"));
  await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy());
  await user.click(screen.getByTestId("onboarding-start"));
  await waitFor(() => expect(document.querySelector("[data-first-session]")?.getAttribute("data-first-session")).toBe("1"));
};

const names = (event) => funnelOf(event).map((row) => row.event);

describe("first-session measurement events", () => {
  it("fires first_session_start once from the plan CTA and not again from Sendero", async () => {
    const user = userEvent.setup();
    await startOnboarding(user);
    expect(names("first_session_start")).toEqual(["first_session_start"]);
    expect(funnelOf("first_session_start")[0] && Object.keys(funnelOf("first_session_start")[0]).sort()).toEqual(["at", "event"]);
    expect(names("day2_return")).toEqual([]);
    expect(names("first_session_exercise1_correct")).toEqual([]);
    expect(names("first_session_complete")).toEqual([]);

    cleanup();
    localStorage.removeItem(LIVE_KEY);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
    await user.click(screen.getByTestId("hub-sendero"));
    await waitFor(() => expect(screen.getByRole("button", { name: /Start · \+XP/ })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Start · \+XP/ }));
    await waitFor(() => expect(document.querySelector("[data-first-session]")?.getAttribute("data-first-session")).toBe("1"));
    expect(names("first_session_start")).toEqual(["first_session_start"]);
    expect(names("day2_return")).toEqual([]);
  });

  it("fires exercise 1 only when that beat is correct", async () => {
    const user = userEvent.setup();
    await startOnboarding(user);
    await missFirstSessionBeat(user);
    expect(names("first_session_exercise1_correct")).toEqual([]);
    await answerFirstSessionBeat(user);
    expect(names("first_session_exercise1_correct")).toEqual([]);

    cleanup();
    localStorage.clear();
    delete window.__andaleFunnelLog;
    await startOnboarding(user);
    await answerFirstSessionBeat(user);
    expect(names("first_session_exercise1_correct")).toEqual(["first_session_exercise1_correct"]);
    await answerFirstSessionBeat(user);
    expect(names("first_session_exercise1_correct")).toEqual(["first_session_exercise1_correct"]);
  }, 15000);

  it("fires first_session_complete once on the win and not on a remount", async () => {
    const user = userEvent.setup();
    await startOnboarding(user);
    for (let i = 0; i < 5; i++) await answerFirstSessionBeat(user);
    await waitFor(() => expect(screen.getByTestId("win-continue")).toBeTruthy());
    expect(names("first_session_start")).toEqual(["first_session_start"]);
    expect(names("first_session_exercise1_correct")).toEqual(["first_session_exercise1_correct"]);
    expect(names("first_session_complete")).toEqual(["first_session_complete"]);
    expect(Object.keys(funnelOf("first_session_complete")[0]).sort()).toEqual(["at", "event"]);

    cleanup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(names("first_session_complete")).toEqual(["first_session_complete"]);
    expect(names("first_session_exercise1_correct")).toEqual(["first_session_exercise1_correct"]);
    expect(names("first_session_start")).toEqual(["first_session_start"]);
  }, 40000);

  it("fires day2_return once for a later-day open after session one started", async () => {
    const yesterday = prevDayKey(localToday());
    localStorage.clear();
    localStorage.setItem(FIRST_SESSION_FUNNEL_KEY, JSON.stringify({ start: true, startDay: yesterday }));
    seedProgress({
      firstSessionDone: false,
      firstSessionArmed: false,
      streak: 0,
      lastDay: null,
      uiLang: "en",
      onboardingDone: true,
      welcomed: true,
    });
    render(<App />);
    await waitFor(() => expect(funnelOf("day2_return")).toHaveLength(1));
    expect(funnelOf("day2_return")[0].event).toBe("day2_return");
    expect(Object.keys(funnelOf("day2_return")[0]).sort()).toEqual(["at", "event"]);
    cleanup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(funnelOf("day2_return")).toHaveLength(1);

    cleanup();
    delete window.__andaleFunnelLog;
    localStorage.clear();
    seedProgress({
      firstSessionDone: true,
      streak: 4,
      lastDay: yesterday,
      uiLang: "en",
      onboardingDone: true,
      welcomed: true,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(funnelOf("day2_return")).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).firstSessionDone).toBe(true);
  });
});
