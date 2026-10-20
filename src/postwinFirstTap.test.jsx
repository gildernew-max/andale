/** Post-win wall: the first tap works as soon as the wall is visible (Varys cold walk, Oct 20),
 *  and Keep reading after a post-win reserve lands on Stories. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { dayKeyFromDate, prevDayKey } from "./firstDoor.js";
import { RESERVE_DAY_KEY } from "./reserveAnnual.js";
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

async function winContinue({ theme, uiLang, reservedOn = null, day2 = false }) {
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
    streak: day2 ? 2 : 1,
    cdmxUnlockSeen: !day2,
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
      ...(day2 ? { day2Hoy: true } : {}),
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
  { theme: "dark", uiLang: "en" },
  { theme: "light", uiLang: "es" },
];

describe("post-win wall first tap", () => {
  afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });

  it.each(FACES)("$theme $uiLang: day-2 Hoy win: the wall waits for the CDMX flash, then the first annual tap opens the form", async ({ theme, uiLang }) => {
    setViewport({ width: 360, height: 640 });
    const user = await winContinue({ theme, uiLang, day2: true });
    // The unlock flash plays first; the wall is not mounted under it.
    expect(await screen.findByTestId("cdmx-unlock-flash")).toBeTruthy();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    // Once the wall is visible, nothing covers it: the first tap opens the reserve form.
    const card = await screen.findByTestId("soft-paywall-annual", {}, { timeout: 5000 });
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    await user.click(card);
    expect(screen.getByTestId("soft-paywall-reserve-form")).toBeTruthy();
  }, 15000);

  it.each(FACES)("$theme $uiLang: Keep reading after a post-win reserve lands on Stories", async ({ theme, uiLang }) => {
    setViewport({ width: 360, height: 640 });
    const user = await winContinue({ theme, uiLang });
    await user.click(await screen.findByTestId("soft-paywall-annual"));
    await user.type(screen.getByTestId("soft-paywall-reserve-email"), "ana@example.com");
    await user.click(screen.getByTestId("soft-paywall-reserve-submit"));
    await user.click(screen.getByTestId("soft-paywall-reserved-keep"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("nav-lectura").getAttribute("aria-current")).toBe("page");
    expect(screen.getByTestId("nav-camino").getAttribute("aria-current")).toBeNull();
  });

  it("Continue free on the post-win wall (not reserved) still lands on Learn", async () => {
    setViewport({ width: 360, height: 640 });
    const user = await winContinue({ theme: "light", uiLang: "es" });
    await user.click(await screen.findByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("nav-camino").getAttribute("aria-current")).toBe("page");
  });
});
