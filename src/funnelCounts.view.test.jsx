import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FunnelCounts from "./FunnelCounts.jsx";
import { dayKeyFromDate } from "./firstDoor.js";
import { FUNNEL_STORE_KEY } from "./funnel.js";

describe("funnel count view", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("shows today and an earlier day from the device log, in light and dark", async () => {
    const user = userEvent.setup();
    localStorage.setItem("andale-v3", JSON.stringify({ theme: "light" }));
    const now = new Date();
    const today = dayKeyFromDate(now);
    const earlier = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 15, 0, 0);
    const earlierKey = dayKeyFromDate(earlier);
    localStorage.setItem(FUNNEL_STORE_KEY, JSON.stringify([
      { event: "lectura_start", at: earlier.toISOString(), storyId: "story-0" },
      { event: "paywall_seen", at: now.toISOString(), source: "locked_story", day: 1 },
      { event: "tap_annual", at: now.toISOString(), source: "locked_story" },
    ]));
    render(<FunnelCounts />);
    const root = screen.getByTestId("funnel-counts");
    expect(root.getAttribute("data-mode")).toBe("light");
    expect(root.style.background).toMatch(/#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
    expect(screen.getByTestId("funnel-scope").textContent).toMatch(/This browser only/);
    expect(screen.getByTestId("funnel-scope").textContent).toMatch(/andale-funnel-log/);
    expect(screen.getByTestId("funnel-scope").textContent).toMatch(/Nothing is sent/);
    const days = screen.getAllByTestId("funnel-day").map((node) => node.getAttribute("data-day"));
    expect(days[0]).toBe(today);
    expect(days).toContain(earlierKey);
    expect(screen.getByTestId(`funnel-count-${today}-paywall_locked_story`).textContent).toBe("1");
    expect(screen.getByTestId(`funnel-count-${today}-paywall_locked_story_day1`).textContent).toBe("1");
    expect(screen.getByTestId(`funnel-count-${today}-tap_annual`).textContent).toBe("1");
    expect(screen.getByTestId(`funnel-count-${today}-lectura_win`).textContent).toBe("0");
    expect(screen.getByTestId(`funnel-count-${earlierKey}-lectura_start`).textContent).toBe("1");
    expect(screen.queryByTestId("funnel-no-past")).toBeNull();

    await user.click(screen.getByTestId("funnel-mode-dark"));
    expect(screen.getByTestId("funnel-counts").getAttribute("data-mode")).toBe("dark");
    expect(screen.getByTestId("funnel-counts").style.background).toMatch(/#15171C|rgb\(\s*21,\s*23,\s*28\s*\)/i);
    expect(screen.getByTestId(`funnel-count-${today}-tap_annual`).textContent).toBe("1");
  });
});
