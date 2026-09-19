import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CenzontleFlyAway, PaywallFlyAway } from "./PaywallFlyAway.jsx";
import { PAYWALL_FLY_MS, PAYWALL_REDUCE_FADE_MS, PAYWALL_WING_MS, WIN_FLY_SIZE } from "./paywallFlyAway.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const cssText = () => document.querySelector(".paywall-fly-stage style")?.textContent || "";

describe("PaywallFlyAway", () => {
  it("plays one right-facing Cenzontle along an exit path that leaves the frame", () => {
    render(<PaywallFlyAway />);
    const bird = screen.getByTestId("soft-paywall-cenzontle");
    const layer = screen.getByTestId("soft-paywall-cenzontle-layer");
    const css = cssText();
    expect(bird.getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(bird.getAttribute("style") || "").not.toMatch(/scaleX\s*\(\s*-1\s*\)/);
    expect(screen.getByTestId("soft-paywall-cenzontle-wing")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-cenzontle-stage").getAttribute("data-reduced-motion")).toBe("0");
    expect(layer.className).toBe("paywall-fly-bird");
    expect(css).toMatch(/@keyframes paywallFlyAway/);
    expect(css).toMatch(new RegExp(`paywallFlyAway ${PAYWALL_FLY_MS}ms ease-in-out both`));
    expect(css).toMatch(new RegExp(`paywallWingBeat ${PAYWALL_WING_MS}ms ease-in-out infinite`));
    expect(css).toMatch(/translate\(calc\(-50% \+ 260px\), -40px\)/);
    expect(css).toMatch(/100% \{ transform: translate\(calc\(-50% \+ 260px\), -40px\) rotate\(-10deg\); opacity: 0; \}/);
    expect(css).not.toMatch(/780ms|cenzontle-courier|story0Courier/);
    expect(document.querySelectorAll("img[src*='cenzontle']")).toHaveLength(1);
    expect(screen.queryByTestId("win-perch")).toBeNull();
  });

  it("skips flight under prefers-reduced-motion and fades the static frame", () => {
    const prev = window.matchMedia;
    window.matchMedia = (query) => ({
      matches: String(query).includes("prefers-reduced-motion"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
    render(<PaywallFlyAway />);
    const css = cssText();
    expect(screen.getByTestId("soft-paywall-cenzontle-stage").getAttribute("data-reduced-motion")).toBe("1");
    expect(screen.getByTestId("soft-paywall-cenzontle").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("soft-paywall-cenzontle-layer").className).toMatch(/paywall-fly-bird--reduce/);
    expect(screen.queryByTestId("soft-paywall-cenzontle-wing")).toBeNull();
    expect(css).toMatch(new RegExp(`paywallFlyFade ${PAYWALL_REDUCE_FADE_MS}ms ease-out both`));
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(document.querySelectorAll("img[src*='cenzontle']")).toHaveLength(1);
    window.matchMedia = prev;
  });
});

describe("CenzontleFlyAway on free story-win / CONTINUAR", () => {
  it("plays the same leave-frame fly-away — no perch, no paywall chrome", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<CenzontleFlyAway surface="win" onComplete={onComplete} />);
    const bird = screen.getByTestId("win-fly-away-bird");
    const stage = screen.getByTestId("win-fly-away");
    const css = stage.querySelector("style")?.textContent || "";
    expect(bird.getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(bird.getAttribute("width")).toBe(String(WIN_FLY_SIZE));
    expect(stage.getAttribute("data-surface")).toBe("win");
    expect(stage.getAttribute("data-reduced-motion")).toBe("0");
    expect(screen.getByTestId("win-fly-away-wing")).toBeTruthy();
    expect(css).toMatch(/@keyframes paywallFlyAway/);
    expect(css).toMatch(new RegExp(`paywallFlyAway ${PAYWALL_FLY_MS}ms ease-in-out both`));
    expect(css).toMatch(new RegExp(`paywallWingBeat ${PAYWALL_WING_MS}ms ease-in-out infinite`));
    expect(css).toMatch(/100% \{ transform: translate\(calc\(-50% \+ 260px\), -40px\) rotate\(-10deg\); opacity: 0; \}/);
    expect(css).not.toMatch(/780ms|cenzontle-courier|story0Courier|WinPerch/);
    expect(screen.queryByTestId("win-perch")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(document.querySelectorAll("img[src*='cenzontle']")).toHaveLength(1);
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(PAYWALL_FLY_MS - 1);
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    expect(screen.queryByTestId("win-perch")).toBeNull();
    vi.useRealTimers();
  });

  it("skips flight under prefers-reduced-motion and never settles to a perch", () => {
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
    render(<CenzontleFlyAway surface="win" onComplete={onComplete} />);
    const css = screen.getByTestId("win-fly-away").querySelector("style")?.textContent || "";
    expect(screen.getByTestId("win-fly-away").getAttribute("data-reduced-motion")).toBe("1");
    expect(screen.getByTestId("win-fly-away-layer").className).toMatch(/paywall-fly-bird--reduce/);
    expect(screen.queryByTestId("win-fly-away-wing")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
    expect(css).toMatch(new RegExp(`paywallFlyFade ${PAYWALL_REDUCE_FADE_MS}ms ease-out both`));
    expect(onComplete).toHaveBeenCalledTimes(1);
    window.matchMedia = prev;
  });
});
