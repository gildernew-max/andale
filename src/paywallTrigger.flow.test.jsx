/**
 * Soft-paywall trigger. Day 1 is the first local calendar day.
 * Win starts on day 2. Locked Lectura can open once on day 1.
 * One show per local date, shared. Plain localStorage keys are the QA walk.
 */
import { describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { prevDayKey } from "./firstDoor.js";
import { FIRST_ACTIVITY_KEY, LOCKED_STORY_CAP_LINE, PAYWALL_SHOWN_KEY } from "./paywallTrigger.js";
import { installFlowHooks, LIVE_KEY, STORAGE_KEY, awaitHome, boot, localToday, seedProgress } from "./flowsHarness.jsx";

installFlowHooks();

const stampProgress = (patch) => {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
  const next = { ...raw, ...patch };
  if (!patch.paywallShownDay) delete next.paywallShownDay;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

const seedAnchor = (day) => {
  stampProgress({
    firstActivityDay: day,
    paywallSeen: false,
    unlockedPrem: false,
    paywallHold: false,
    bajioUnlockSeen: true,
    onboardingDone: true,
    firstSessionDone: true,
    welcomed: true,
  });
  localStorage.setItem(FIRST_ACTIVITY_KEY, day);
  localStorage.removeItem(PAYWALL_SHOWN_KEY);
};

const parkOnWin = () => {
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "done",
    tab: "camino",
    lessonStats: { right: 1, wrong: 0 },
    session: {
      title: "Hola",
      host: "luna",
      questions: [{}],
      awarded: true,
      earnedXP: 10,
      earnedGems: 1,
    },
  }));
};

const seen = () => (window.__andaleFunnelLog || []).filter((event) => event.event === "paywall_seen");

describe("post-win paywall day and shared cap", () => {
  it("day 1 keeps the win screen and Continue free of the card", async () => {
    seedAnchor(localToday());
    parkOnWin();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("win-continue")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("win-continue"));
    await awaitHome();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(seen().some((event) => event.source === "win")).toBe(false);
    expect(localStorage.getItem(PAYWALL_SHOWN_KEY)).toBeNull();
  });

  it("a lesson screen never shows the card, and day 2 Continue does", async () => {
    const yesterday = prevDayKey(localToday());
    seedAnchor(yesterday);
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Hola",
        host: "luna",
        unitId: "greetings",
        questions: [{ type: "mc", prompt: "Hola", choices: ["sí"], answer: "sí", shuffledChoices: ["sí"] }],
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();

    cleanup();
    seedAnchor(yesterday);
    parkOnWin();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("win-continue")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("win-continue"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    expect(screen.getByTestId("soft-paywall-headline").getAttribute("data-paywall-source")).toBe("win-continue");
    const row = seen().at(-1);
    expect(row.source).toBe("win");
    expect(row.day).toBe(2);
    expect(localStorage.getItem(PAYWALL_SHOWN_KEY)).toBe(localToday());
    expect(localStorage.getItem(FIRST_ACTIVITY_KEY)).toBe(yesterday);
  });

  it("day 1 locked Lectura opens once with day 1, then the quiet line", async () => {
    seedAnchor(localToday());
    seedProgress({
      uiLang: "en",
      theme: "light",
      firstActivityDay: localToday(),
      paywallSeen: false,
      onboardingDone: true,
      firstSessionDone: true,
      bajioUnlockSeen: true,
      streak: 1,
      lastDay: localToday(),
    });
    localStorage.setItem(FIRST_ACTIVITY_KEY, localToday());
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const card = screen.getByTestId("story-shelf-story-1");
    const before = card.getAttribute("data-locked");
    fireEvent.click(card);
    const wall = await screen.findByTestId("soft-paywall");
    expect(screen.queryByTestId("story-reader")).toBeNull();
    expect(seen().some((event) => event.source === "locked_story" && event.day === 1)).toBe(true);
    expect(localStorage.getItem(PAYWALL_SHOWN_KEY)).toBe(localToday());
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());

    fireEvent.click(screen.getByTestId("story-shelf-story-1"));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    const line = screen.getByTestId("locked-story-cap-line");
    expect(line.textContent).toBe(LOCKED_STORY_CAP_LINE.en);
    expect(line.style.marginTop).toBe("8px");
    expect(line.style.fontSize).toBe("12px");
    expect(line.style.fontWeight).toBe("700");
    expect(line.style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
    expect(line.style.animation).toMatch(/lockedCapFade/);
    expect(line.style.animation).toMatch(/150ms/);
    expect(screen.getByTestId("story-shelf-story-1").getAttribute("data-locked")).toBe(before);
    expect((window.__andaleFunnelLog || []).some((event) => event.event === "locked_story_capped" && event.day === 1)).toBe(true);

    await user.click(screen.getByTestId("lang-es"));
    fireEvent.click(screen.getByTestId("story-shelf-story-1"));
    expect(screen.getByTestId("locked-story-cap-line").textContent).toBe(LOCKED_STORY_CAP_LINE.es);

    cleanup();
    seedProgress({
      uiLang: "en",
      theme: "dark",
      firstActivityDay: localToday(),
      paywallShownDay: localToday(),
      onboardingDone: true,
      firstSessionDone: true,
      bajioUnlockSeen: true,
      streak: 1,
      lastDay: localToday(),
    });
    localStorage.setItem(FIRST_ACTIVITY_KEY, localToday());
    localStorage.setItem(PAYWALL_SHOWN_KEY, localToday());
    const darkUser = await boot();
    await darkUser.click(screen.getByTestId("nav-lectura"));
    fireEvent.click(screen.getByTestId("story-shelf-story-1"));
    const darkLine = screen.getByTestId("locked-story-cap-line");
    expect(darkLine.style.color).toMatch(/#CDBBA6|rgb\(\s*205,\s*187,\s*166\s*\)/i);
    await new Promise((resolve) => setTimeout(resolve, 0));
    window.dispatchEvent(new Event("scroll"));
    await waitFor(() => expect(screen.queryByTestId("locked-story-cap-line")).toBeNull());
  });

  it("a locked show spends the shared cap, so the same-day win stays down", async () => {
    seedAnchor(localToday());
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    fireEvent.click(screen.getByTestId("story-shelf-story-1"));
    await screen.findByTestId("soft-paywall");
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());

    cleanup();
    parkOnWin();
    const again = userEvent.setup();
    render(<App />);
    await again.click(await screen.findByTestId("win-continue"));
    await awaitHome();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(seen().filter((event) => event.source === "win")).toHaveLength(0);
  });

  it("clearing the shown key, or setting it to yesterday, lets the next win show", async () => {
    const yesterday = prevDayKey(localToday());
    const earlier = prevDayKey(yesterday);
    seedAnchor(earlier);
    localStorage.setItem(PAYWALL_SHOWN_KEY, yesterday);
    stampProgress({ firstActivityDay: earlier, paywallShownDay: localToday() });
    parkOnWin();
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByTestId("win-continue"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    expect(seen().at(-1).source).toBe("win");
    expect(localStorage.getItem(PAYWALL_SHOWN_KEY)).toBe(localToday());

    cleanup();
    seedAnchor(earlier);
    stampProgress({ firstActivityDay: localToday(), paywallShownDay: localToday() });
    localStorage.removeItem(PAYWALL_SHOWN_KEY);
    parkOnWin();
    const next = userEvent.setup();
    render(<App />);
    await next.click(await screen.findByTestId("win-continue"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    expect(localStorage.getItem(FIRST_ACTIVITY_KEY)).toBe(earlier);
  });

  it("home boot on day 2 does not open a timed wall", async () => {
    const yesterday = prevDayKey(localToday());
    seedProgress({
      streak: 1,
      lastDay: localToday(),
      lecturaStartedAt: 1,
      firstActivityDay: yesterday,
      bajioUnlockSeen: true,
      paywallSeen: false,
    });
    localStorage.setItem(FIRST_ACTIVITY_KEY, yesterday);
    localStorage.removeItem(PAYWALL_SHOWN_KEY);
    render(<App />);
    await awaitHome();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(seen()).toHaveLength(0);
  });
});
