/** Reserved return (Hand ruling Oct 20, option A): one device reserved state, reserved view on every wall entry,
 *  no post-win wall, reserve_submit once per device. All on device, live words only. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { dayKeyFromDate, prevDayKey } from "./firstDoor.js";
import { FUNNEL_EVENTS } from "./funnel.js";
import { RESERVE_WORDS, RESERVE_DAY_KEY, readReservation } from "./reserveAnnual.js";
import { WAITLIST_STORE_KEY } from "./waitlist.js";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

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

async function winContinue({ theme, uiLang, reservedOn = null }) {
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
  if (reservedOn) {
    localStorage.setItem(WAITLIST_STORE_KEY, JSON.stringify({ email: "ana@example.com" }));
    localStorage.setItem(RESERVE_DAY_KEY, reservedOn);
  }
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByTestId("win-continue"));
  return user;
}


const FACES = [
  { theme: "light", uiLang: "es" },
  { theme: "dark", uiLang: "en" },
];
const yesterday = () => prevDayKey(dayKeyFromDate(new Date()));
const log = () => window.__andaleFunnelLog || [];
const LIME = /rgb\(\s*88,\s*204,\s*2\s*\)|#58CC02/i;

describe("reserved return", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("readReservation is the device state: day key plus email, gone after remove", () => {
    expect(readReservation(localStorage)).toBeNull();
    localStorage.setItem(WAITLIST_STORE_KEY, JSON.stringify({ email: "ana@example.com" }));
    localStorage.setItem(RESERVE_DAY_KEY, "2026-10-01");
    expect(readReservation(localStorage)).toEqual({ email: "ana@example.com" });
  });

  it.each(FACES)("$theme $uiLang: a day-2+ win for a reserved learner shows no wall (item 3)", async ({ theme, uiLang }) => {
    setViewport({ width: 360, height: 640 });
    await winContinue({ theme, uiLang, reservedOn: yesterday() });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(log().some((e) => e.event === FUNNEL_EVENTS.paywallSeen)).toBe(false);
    expect(localStorage.getItem("andale-paywall-shown")).toBeNull();
  });

  it.each(FACES)("$theme $uiLang: the same win for a non-reserved learner still shows today's wall (control)", async ({ theme, uiLang }) => {
    setViewport({ width: 360, height: 640 });
    await winContinue({ theme, uiLang });
    expect(await screen.findByTestId("soft-paywall")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-annual")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-annual-price")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-monthly")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-dismiss")).toBeTruthy();
    expect(screen.queryByTestId("soft-paywall-reserved")).toBeNull();
  });

  it.each(FACES)("$theme $uiLang: first reserve fires reserve_submit once; a later wall opens reserved, with no lime, no price, Keep reading only (items 1, 2, 4)", async ({ theme, uiLang }) => {
    setViewport({ width: 360, height: 640 });
    const user = await winContinue({ theme, uiLang });
    const w = RESERVE_WORDS[uiLang];
    await user.click(await screen.findByTestId("soft-paywall-annual"));
    await user.type(screen.getByTestId("soft-paywall-reserve-email"), "ana@example.com");
    await user.click(screen.getByTestId("soft-paywall-reserve-submit"));
    // Just-reserved view is unchanged from main.
    expect(screen.getByTestId("soft-paywall-reserved-line").textContent).toBe(w.doneLine);
    expect(log().filter((e) => e.event === FUNNEL_EVENTS.reserveSubmit)).toHaveLength(1);
    await user.click(screen.getByTestId("soft-paywall-reserved-keep"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());

    // Next entry: a locked story tap in Lectura.
    await user.click(screen.getByTestId("nav-lectura"));
    const locked = document.querySelector("[data-testid^='story-shelf-'][data-locked='true']");
    expect(locked).toBeTruthy();
    fireEvent.click(locked);
    const wall = await screen.findByTestId("soft-paywall");
    expect(screen.queryByTestId("story-reader")).toBeNull();
    expect(screen.getByTestId("soft-paywall-reserved-title").textContent).toBe(w.doneTitle);
    expect(screen.queryByTestId("soft-paywall-reserved-line")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-reserve-form")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-annual")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-annual-price")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-monthly")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-dismiss")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-free-line")).toBeNull();
    expect(wall.textContent).not.toMatch(/39\.99|6\.99/);
    expect([...wall.querySelectorAll("*")].some((el) => LIME.test(el.getAttribute("style") || ""))).toBe(false);
    expect(wall.querySelectorAll("button")).toHaveLength(1);
    expect(screen.getByTestId("soft-paywall-reserved-keep").textContent).toBe(w.keepReading);
    expect(log().filter((e) => e.event === FUNNEL_EVENTS.reserveSubmit)).toHaveLength(1);
    await user.click(screen.getByTestId("soft-paywall-reserved-keep"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(locked.getAttribute("data-locked")).toBe("true");
  });

  it("a reserved learner's locked tap shows the reserved view even after the daily cap", async () => {
    setViewport({ width: 360, height: 640 });
    const user = await winContinue({ theme: "light", uiLang: "es", reservedOn: yesterday() });
    localStorage.setItem("andale-paywall-shown", dayKeyFromDate(new Date()));
    await user.click(screen.getByTestId("nav-lectura"));
    const locked = document.querySelector("[data-testid^='story-shelf-'][data-locked='true']");
    fireEvent.click(locked);
    expect(await screen.findByTestId("soft-paywall-reserved")).toBeTruthy();
    expect(screen.queryByTestId("locked-story-cap-line")).toBeNull();
    expect(log().some((e) => e.event === FUNNEL_EVENTS.paywallSeen)).toBe(false);
    await user.click(screen.getByTestId("soft-paywall-reserved-keep"));
    expect(log().some((e) => e.event === FUNNEL_EVENTS.paywallTap)).toBe(false);
  });

  it("Perfil Remove sets the shared state back to not reserved: the next locked tap opens today's wall", async () => {
    setViewport({ width: 360, height: 640 });
    const user = await winContinue({ theme: "light", uiLang: "en", reservedOn: yesterday() });
    await user.click(screen.getByTestId("nav-perfil"));
    await user.click(await screen.findByTestId("perfil-reservation-remove"));
    await user.click(screen.getByTestId("perfil-reservation-confirm-remove"));
    expect(readReservation(localStorage)).toBeNull();
    await user.click(screen.getByTestId("nav-lectura"));
    fireEvent.click(document.querySelector("[data-testid^='story-shelf-'][data-locked='true']"));
    await screen.findByTestId("soft-paywall");
    expect(screen.getByTestId("soft-paywall-annual")).toBeTruthy();
    expect(screen.queryByTestId("soft-paywall-reserved")).toBeNull();
  });

  it("Perfil Change keeps the learner reserved and fires no reserve_submit", async () => {
    setViewport({ width: 360, height: 640 });
    const user = await winContinue({ theme: "dark", uiLang: "es", reservedOn: yesterday() });
    await user.click(screen.getByTestId("nav-perfil"));
    await user.click(await screen.findByTestId("perfil-reservation-change"));
    const input = screen.getByTestId("perfil-reservation-email");
    await user.clear(input);
    await user.type(input, "otra@example.com");
    await user.click(screen.getByTestId("perfil-reservation-save"));
    expect(readReservation(localStorage)).toEqual({ email: "otra@example.com" });
    expect(log().some((e) => e.event === FUNNEL_EVENTS.reserveSubmit)).toBe(false);
    await user.click(screen.getByTestId("nav-lectura"));
    fireEvent.click(document.querySelector("[data-testid^='story-shelf-'][data-locked='true']"));
    expect(await screen.findByTestId("soft-paywall-reserved")).toBeTruthy();
  });
});
