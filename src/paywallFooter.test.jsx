/**
 * Annual and Continue free are pinned inside the paywall sheet.
 * Continue free's bottom edge is 16px above the bottom safe area.
 * The annual CTA sits 12px above that link. The rest of the sheet scrolls.
 * Checked at 360×640 and 390×844, light and dark, English and Spanish.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { dayKeyFromDate } from "./firstDoor.js";
import { FUNNEL_EVENTS } from "./funnel.js";
import {
  BUTTON_PIN_BOTTOM,
  BUTTON_PIN_GAP,
  PAYWALL_ANNUAL_BLOCK,
  PAYWALL_FREE_TAP,
  buttonPinBottomCss,
  paywallPinRects,
} from "./ButtonPin.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
];

const FACES = [
  { theme: "light", uiLang: "en", annual: "One year", free: "Continue free", freeInk: "#6b6258" },
  { theme: "light", uiLang: "es", annual: "Un año", free: "Seguir gratis", freeInk: "#6b6258" },
  { theme: "dark", uiLang: "en", annual: "One year", free: "Continue free", freeInk: "#cdbba6" },
  { theme: "dark", uiLang: "es", annual: "Un año", free: "Seguir gratis", freeInk: "#cdbba6" },
];

const norm = (value) => {
  const s = String(value || "").trim().toLowerCase();
  const hex = s.match(/#([0-9a-f]{3,8})/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
    return `#${h.slice(0, 6)}`;
  }
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!rgb) return "";
  return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
};

const mockBrowser = () => {
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { getVoices: () => [], speak: vi.fn(), cancel() {}, resume() {}, addEventListener() {}, removeEventListener() {} },
  });
  window.AudioContext = class {
    constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; }
    createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, detune: { setValueAtTime() {} }, type: "sine" }; }
    createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
    createBufferSource() { return { connect() {}, start() {}, stop() {}, buffer: null }; }
    createBiquadFilter() { return { connect() {}, type: "lowpass", frequency: { value: 0 } }; }
    resume() {}
  };
};

function setViewport({ width, height }) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: height });
}

function openPaywall({ theme, uiLang }) {
  localStorage.clear();
  delete window.__andaleFunnelLog;
  mockBrowser();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    xp: 42,
    gems: 9,
    name: "Ana",
    contentVersion: 2,
    hearts: 5,
    onboardingDone: true,
    firstSessionDone: true,
    paywallSeen: false,
    bajioUnlockSeen: true,
    lecturaStartedAt: 1,
    streak: 1,
    lastDay: dayKeyFromDate(new Date()),
    theme,
    uiLang,
    done: {},
  }));
  localStorage.removeItem(LIVE_KEY);
  render(<App />);
}

describe("paywall footer pin", () => {
  const prevW = window.innerWidth;
  const prevH = window.innerHeight;

  afterEach(() => {
    cleanup();
    localStorage.clear();
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: prevW });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: prevH });
  });

  it.each(VIEWPORTS)("both controls sit inside $width×$height without a scroll", ({ width, height }) => {
    const pin = paywallPinRects({ viewportHeight: height, viewportWidth: width });
    expect(buttonPinBottomCss()).toBe("calc(16px + env(safe-area-inset-bottom))");
    expect(BUTTON_PIN_BOTTOM).toBe(16);
    expect(BUTTON_PIN_GAP).toBe(12);
    expect(pin.withinViewport).toBe(true);
    expect(pin.freeInset).toBe(16);
    expect(pin.gap).toBe(12);
    expect(pin.freeBottom - pin.freeTop).toBe(PAYWALL_FREE_TAP);
    expect(pin.annualBottom - pin.annualTop).toBe(PAYWALL_ANNUAL_BLOCK);
    expect(pin.freeTop - pin.annualBottom).toBe(12);
    expect(pin.annualTop).toBeGreaterThanOrEqual(0);
    expect(pin.freeBottom).toBeLessThanOrEqual(height);
    expect(pin.left).toBeGreaterThanOrEqual(0);
    expect(pin.right).toBeLessThanOrEqual(width);
    expect(pin.width).toBeGreaterThanOrEqual(44);
    const safe = paywallPinRects({ viewportHeight: height, viewportWidth: width, safeAreaBottom: 34 });
    expect(safe.withinViewport).toBe(true);
    expect(safe.freeInset).toBe(16 + 34);
    expect(safe.gap).toBe(12);
    expect(safe.freeBottom).toBeLessThan(pin.freeBottom);
  });

  it.each(VIEWPORTS.flatMap((viewport) => FACES.map((face) => ({ ...viewport, ...face }))))(
    "$width×$height $theme $uiLang keeps One year and Continue free on screen and tappable",
    async ({ width, height, theme, uiLang, annual, free, freeInk }) => {
      setViewport({ width, height });
      openPaywall({ theme, uiLang });
      const year = await screen.findByTestId("soft-paywall-annual");
      const dismiss = screen.getByTestId("soft-paywall-dismiss");
      const scroll = screen.getByTestId("soft-paywall-scroll");
      const footer = screen.getByTestId("soft-paywall-footer");
      const card = screen.getByTestId("soft-paywall-card");

      expect(year.textContent).toBe(annual);
      expect(dismiss.textContent).toBe(free);
      expect(footer.contains(year)).toBe(true);
      expect(footer.contains(dismiss)).toBe(true);
      expect(scroll.contains(year)).toBe(false);
      expect(scroll.contains(dismiss)).toBe(false);
      expect(scroll.contains(screen.getByTestId("soft-paywall-monthly"))).toBe(true);
      expect(scroll.contains(screen.getByTestId("soft-paywall-annual-price"))).toBe(true);
      expect(scroll.style.overflowY).toBe("auto");
      expect(scroll.style.padding).toBe(`22px 20px ${BUTTON_PIN_GAP}px`);
      expect(card.style.overflow).toBe("hidden");
      expect(card.style.display).toBe("flex");
      expect(card.style.flexDirection).toBe("column");
      expect(card.style.maxHeight).toBe("calc(100vh - 40px)");
      expect(footer.style.gap).toBe("12px");
      expect(footer.style.paddingBottom).toBe(buttonPinBottomCss());
      expect(footer.style.flexShrink).toBe("0");
      expect(year.compareDocumentPosition(dismiss) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      expect(year.disabled).toBe(false);
      expect(year.style.pointerEvents).not.toBe("none");
      expect(year.style.width).toBe("100%");
      expect(norm(year.style.background)).toBe("#58cc02");
      expect(norm(year.style.color)).toBe("#1f3a1a");
      expect(dismiss.disabled).toBe(false);
      expect(dismiss.style.pointerEvents).not.toBe("none");
      expect(dismiss.style.background).toBe("none");
      expect(dismiss.style.borderStyle).toBe("none");
      expect(dismiss.style.borderBottom).not.toMatch(/4px/);
      expect(dismiss.style.minHeight).toBe("44px");
      expect(dismiss.style.padding).toBe("11px 0px");
      expect(dismiss.style.fontSize).toBe("15px");
      expect(dismiss.style.fontWeight).toBe("700");
      expect(norm(dismiss.style.color)).toBe(freeInk);
      expect(norm(dismiss.style.color)).not.toBe("#1f3a1a");

      const pin = paywallPinRects({ viewportHeight: height, viewportWidth: width });
      expect(pin.withinViewport).toBe(true);
      const annualCenterY = pin.annualTop + pin.annualBottom;
      const freeCenterY = pin.freeTop + pin.freeBottom;
      expect(annualCenterY / 2).toBeGreaterThanOrEqual(0);
      expect(annualCenterY / 2).toBeLessThanOrEqual(height);
      expect(freeCenterY / 2).toBeGreaterThanOrEqual(0);
      expect(freeCenterY / 2).toBeLessThanOrEqual(height);

      const user = userEvent.setup();
      await user.click(year);
      await waitFor(() => {
        const taps = (window.__andaleFunnelLog || []).filter((event) => event.event === FUNNEL_EVENTS.paywallTap && event.choice === "annual");
        expect(taps.length).toBeGreaterThan(0);
      });
      expect(screen.getByTestId("soft-paywall-annual")).toBeTruthy();
      expect(screen.getByTestId("soft-paywall-monthly").textContent).toBe(uiLang === "en" ? "One month" : "Un mes");
      await user.click(screen.getByTestId("soft-paywall-dismiss"));
      await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    },
  );
});
