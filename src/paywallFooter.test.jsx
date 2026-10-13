/**
 * Annual and Continue free sit in the card.
 * The card bottom is at least 16px above the bottom safe area.
 * Continue free sits 12px under annual. Nothing on the card scrolls.
 * Checked at 360×640 and 390×844, light and dark, English and Spanish.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { dayKeyFromDate, prevDayKey } from "./firstDoor.js";
import { FUNNEL_EVENTS } from "./funnel.js";
import { PAYWALL_ANNUAL_HOLD_GAP } from "./webPaywall.js";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
];

const FACES = [
  { theme: "light", uiLang: "en", annual: "Start annual plan", free: "Continue free", hold: "Annual plans aren't open yet. Keep reading free for now.", monthly: "$6.99\u00A0a\u00A0month", monthlyHold: "Monthly plans aren't open yet. Keep reading free for now.", freeLine: "Free: stories unlock one at a time, in order.", holdInk: "#6b6258", freeInk: "#6b6258", monthlyInk: "#1f3a1a", monthlyBorder: "#6b6258", page: "" },
  { theme: "light", uiLang: "es", annual: "Empezar plan anual", free: "Seguir gratis", hold: "El plan anual aún no está disponible. Sigue leyendo gratis por ahora.", monthly: "US$6.99\u00A0al\u00A0mes", monthlyHold: "El plan mensual aún no está disponible. Sigue leyendo gratis por ahora.", freeLine: "Gratis: los cuentos se abren uno a uno, en orden.", holdInk: "#6b6258", freeInk: "#6b6258", monthlyInk: "#1f3a1a", monthlyBorder: "#6b6258", page: "" },
  { theme: "dark", uiLang: "en", annual: "Start annual plan", free: "Continue free", hold: "Annual plans aren't open yet. Keep reading free for now.", monthly: "$6.99\u00A0a\u00A0month", monthlyHold: "Monthly plans aren't open yet. Keep reading free for now.", freeLine: "Free: stories unlock one at a time, in order.", holdInk: "#cdbba6", freeInk: "#f6efe4", monthlyInk: "#f5efe6", monthlyBorder: "#cdbba6", page: "#15171c" },
  { theme: "dark", uiLang: "es", annual: "Empezar plan anual", free: "Seguir gratis", hold: "El plan anual aún no está disponible. Sigue leyendo gratis por ahora.", monthly: "US$6.99\u00A0al\u00A0mes", monthlyHold: "El plan mensual aún no está disponible. Sigue leyendo gratis por ahora.", freeLine: "Gratis: los cuentos se abren uno a uno, en orden.", holdInk: "#cdbba6", freeInk: "#f6efe4", monthlyInk: "#f5efe6", monthlyBorder: "#cdbba6", page: "#15171c" },
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

async function openPaywall({ theme, uiLang }) {
  localStorage.clear();
  delete window.__andaleFunnelLog;
  delete window.__andalePurchaseLog;
  mockBrowser();
  const today = dayKeyFromDate(new Date());
  const yesterday = prevDayKey(today);
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
    lastDay: today,
    firstActivityDay: yesterday,
    theme,
    uiLang,
    done: {},
  }));
  localStorage.setItem("andale-first-activity", yesterday);
  localStorage.removeItem("andale-paywall-shown");
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
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByTestId("win-continue"));
}

describe("paywall card", () => {
  const prevW = window.innerWidth;
  const prevH = window.innerHeight;

  afterEach(() => {
    cleanup();
    localStorage.clear();
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: prevW });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: prevH });
  });

  it.each(VIEWPORTS.flatMap((viewport) => FACES.map((face) => ({ ...viewport, ...face }))))(
    "$width×$height $theme $uiLang keeps Start annual plan and Continue free on the card",
    async ({ width, height, theme, uiLang, annual, free, hold: holdLine, monthly: monthlyLabel, monthlyHold: monthlyHoldLine, freeLine, holdInk, freeInk, monthlyInk, monthlyBorder, page }) => {
      setViewport({ width, height });
      await openPaywall({ theme, uiLang });
      const year = await screen.findByTestId("soft-paywall-annual");
      const dismiss = screen.getByTestId("soft-paywall-dismiss");
      const card = screen.getByTestId("soft-paywall-card");
      const wall = screen.getByTestId("soft-paywall");

      expect(year.textContent).toBe(annual);
      expect(dismiss.textContent).toBe(free);
      expect(card.contains(year)).toBe(true);
      expect(card.contains(dismiss)).toBe(true);
      expect(screen.queryByTestId("soft-paywall-scroll")).toBeNull();
      expect(screen.queryByTestId("soft-paywall-footer")).toBeNull();
      const monthly = screen.getByTestId("soft-paywall-monthly");
      const note = screen.getByTestId("soft-paywall-free-line");
      expect(screen.queryByTestId("soft-paywall-honesty")).toBeNull();
      expect(wall.style.overflow).toBe("hidden");
      expect(wall.style.paddingBottom).toBe("calc(16px + env(safe-area-inset-bottom))");
      expect(wall.style.alignItems).toBe("center");
      expect(wall.style.justifyContent).toBe("center");
      if (page) expect(norm(wall.style.background)).toBe(page);
      expect(card.style.maxHeight).toBe("100%");
      expect(card.style.overflow).not.toBe("auto");
      expect(card.style.overflowY).not.toBe("auto");
      expect(dismiss.style.marginTop).toBe("12px");
      expect(monthly.style.marginTop).toBe("12px");
      expect(note.style.marginTop).toBe("8px");
      expect(note.textContent).toBe(freeLine);
      expect(note.style.fontSize).toBe("12px");
      expect(note.style.fontWeight).toBe("700");
      expect(note.style.textAlign).toBe("center");
      expect(norm(note.style.color)).toBe(holdInk);
      expect(monthly.textContent).toBe(monthlyLabel);
      expect(monthly.textContent.includes(" ")).toBe(false);
      expect(monthly.style.background).toBe("none");
      expect(monthly.style.width).toBe("100%");
      expect(norm(monthly.style.color)).toBe(monthlyInk);
      expect(norm(monthly.style.borderTopColor)).toBe(monthlyBorder);
      expect(monthly.style.borderTopWidth).toBe("2px");
      expect(norm(monthly.style.background)).not.toBe("#58cc02");
      expect(year.compareDocumentPosition(monthly) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(monthly.compareDocumentPosition(dismiss) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(dismiss.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

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
      expect(dismiss.style.fontWeight).toBe("500");
      expect(norm(dismiss.style.color)).toBe(freeInk);
      expect(norm(dismiss.style.color)).not.toBe("#1f3a1a");

      const priceLine = uiLang === "en" ? "$39.99\u00A0a\u00A0year" : "US$39.99\u00A0al\u00A0año";
      const price = screen.getByTestId("soft-paywall-annual-price");
      expect(price.textContent).toBe(priceLine);
      expect(price.style.fontSize).toBe("13.5px");
      expect(price.style.fontWeight).toBe("700");
      expect(price.style.textAlign).toBe("center");
      expect(norm(price.style.color)).toBe(holdInk);
      expect(price.compareDocumentPosition(year) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.queryByTestId("soft-paywall-annual-hold")).toBeNull();
      expect(wall.textContent).not.toMatch(/\[ANNUAL PRICE\]|\{price\}/);
      expect(screen.queryByTestId("soft-paywall-free-limit")).toBeNull();
      expect(screen.getByTestId("soft-paywall-headline").style.fontSize).toBe("22px");
      expect(screen.getByTestId("soft-paywall-headline").style.fontWeight).toBe("900");

      const user = userEvent.setup();
      const purchases = [];
      const onPurchase = (event) => purchases.push(event.detail);
      window.addEventListener("andale-purchase", onPurchase);
      await user.click(year);
      await waitFor(() => {
        const taps = (window.__andaleFunnelLog || []).filter((event) => event.event === FUNNEL_EVENTS.paywallTap && event.choice === "annual");
        expect(taps.length).toBeGreaterThan(0);
      });
      expect(purchases).toHaveLength(0);
      expect(screen.getByTestId("soft-paywall")).toBeTruthy();
      const hold = screen.getByTestId("soft-paywall-annual-hold");
      expect(hold.textContent).toBe(holdLine);
      expect(hold.style.marginTop).toBe(`${PAYWALL_ANNUAL_HOLD_GAP}px`);
      expect(hold.style.fontSize).toBe("13.5px");
      expect(hold.style.fontWeight).toBe("700");
      expect(norm(hold.style.color)).toBe(holdInk);
      expect(dismiss.style.marginTop).toBe("12px");
      expect(year.compareDocumentPosition(hold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(hold.compareDocumentPosition(monthly) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(monthly.compareDocumentPosition(dismiss) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(year.disabled).toBe(false);
      expect(year.style.pointerEvents).not.toBe("none");
      expect(norm(year.style.background)).toBe("#58cc02");
      expect(norm(year.style.color)).toBe("#1f3a1a");
      expect(year.style.animation || "").toBe("");
      expect(screen.queryByTestId("soft-paywall-honesty")).toBeNull();
      expect(screen.getByTestId("soft-paywall").textContent).not.toMatch(/charged|cobra|Apple|Restore|Un mes|One month/);
      expect(screen.getByTestId("soft-paywall").textContent).toContain(uiLang === "en" ? "$39.99\u00A0a\u00A0year" : "US$39.99\u00A0al\u00A0año");
      expect((window.__andaleFunnelLog || []).some((event) => event.event === FUNNEL_EVENTS.tapAnnual && event.source === "win")).toBe(true);
      expect(monthly.textContent).toBe(monthlyLabel);
      expect(norm(monthly.style.color)).toBe(monthlyInk);
      expect(norm(monthly.style.background)).not.toBe("#58cc02");
      await user.click(monthly);
      const monthHold = screen.getByTestId("soft-paywall-monthly-hold");
      expect(monthHold.textContent).toBe(monthlyHoldLine);
      expect(monthHold.style.marginTop).toBe(`${PAYWALL_ANNUAL_HOLD_GAP}px`);
      expect(monthHold.style.fontSize).toBe("13.5px");
      expect(monthHold.style.fontWeight).toBe("700");
      expect(norm(monthHold.style.color)).toBe(holdInk);
      expect(screen.getByTestId("soft-paywall-annual").textContent).toBe(annual);
      expect(screen.getByTestId("soft-paywall-monthly").textContent).toBe(monthlyLabel);
      expect(norm(screen.getByTestId("soft-paywall-annual").style.background)).toBe("#58cc02");
      expect((window.__andaleFunnelLog || []).filter((event) => event.event === "paywall_tap" && event.choice === "monthly")).toHaveLength(0);
      expect((window.__andaleFunnelLog || []).some((event) => event.event === "tap_monthly" && event.source === "win")).toBe(true);
      await user.click(screen.getByTestId("soft-paywall-dismiss"));
      await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
      expect((window.__andaleFunnelLog || []).some((event) => event.event === FUNNEL_EVENTS.paywallTap && event.choice === "continue_free")).toBe(true);
      window.removeEventListener("andale-purchase", onPurchase);
    },
  );
});
