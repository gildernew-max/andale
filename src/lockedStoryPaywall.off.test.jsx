import { describe, expect, it, vi } from "vitest";

vi.mock("./webPaywall.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, LOCKED_STORY_PAYWALL: false };
});

import { fireEvent, screen } from "@testing-library/react";
import { installFlowHooks, seedProgress, boot, localToday } from "./flowsHarness.jsx";

installFlowHooks();

describe("locked Lectura tap stays closed when the flag is off", () => {
  it("a locked camino node and shelf card stay disabled and do not open the wall", async () => {
    seedProgress({
      uiLang: "es",
      paywallSeen: true,
      onboardingDone: true,
      firstSessionDone: true,
      bajioUnlockSeen: true,
      streak: 1,
      lastDay: localToday(),
    });
    const user = await boot();
    const node = screen.getByTestId("camino-story-story-1");
    expect(node.disabled).toBe(true);
    expect(node.getAttribute("aria-disabled")).not.toBe("true");
    expect(node.getAttribute("data-locked")).toBe("true");
    expect(node.getAttribute("aria-label")).toBe("Cuento: La casa azul (cerrado)");
    fireEvent.click(node);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("story-reader")).toBeNull();

    await user.click(screen.getByTestId("nav-lectura"));
    const shelf = screen.getByTestId("story-shelf-story-1");
    expect(shelf.disabled).toBe(true);
    expect(shelf.getAttribute("aria-disabled")).not.toBe("true");
    expect(shelf.getAttribute("data-locked")).toBe("true");
    expect(shelf.getAttribute("aria-label")).toBe("La casa azul (cerrado)");
    fireEvent.click(shelf);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("story-reader")).toBeNull();
  });
});
