import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WinBounce, WinPerch } from "./WinBounce.jsx";
import { WIN_BOUNCE_MS } from "./winBounce.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("WinBounce", () => {
  it("plays the live right-facing Cenzontle, then unmounts at 720ms", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<WinBounce onComplete={onComplete} />);
    const bird = screen.getByTestId("win-bounce-bird");
    expect(bird.getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(bird.getAttribute("style") || "").not.toMatch(/scaleX\s*\(\s*-1\s*\)/);
    expect(screen.getByTestId("win-bounce-chip")).toBeTruthy();
    expect(screen.getByTestId("win-bounce-wing")).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(WIN_BOUNCE_MS - 1);
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("keeps a landed bird + chip when motion is reduced", () => {
    const prev = window.matchMedia;
    window.matchMedia = (query) => ({
      matches: String(query).includes("prefers-reduced-motion"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
    const onComplete = vi.fn();
    render(<WinBounce onComplete={onComplete} />);
    expect(screen.getByTestId("win-bounce")).toBeTruthy();
    expect(screen.getByTestId("win-bounce-bird").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("win-bounce-chip")).toBeTruthy();
    expect(onComplete).toHaveBeenCalledTimes(1);
    window.matchMedia = prev;
  });

  it("perch keeps the live Cenzontle and XP chip on screen", () => {
    render(<WinPerch />);
    expect(screen.getByTestId("win-perch-bird").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("win-perch-chip").textContent).toMatch(/XP/);
  });
});
