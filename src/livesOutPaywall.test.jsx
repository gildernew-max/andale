/** Out of lives on a day-2 lesson replaces the win; leaving it still reaches the day's wall
 *  (Varys, Oct 20). Same cap, reserved and day-1 rules as the post-win wall. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { dayKeyFromDate, prevDayKey } from "./firstDoor.js";
import { FUNNEL_EVENTS } from "./funnel.js";
import { RESERVE_DAY_KEY } from "./reserveAnnual.js";
import { WAITLIST_STORE_KEY } from "./waitlist.js";

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

async function outOfLives({ theme = "light", uiLang = "es", capped = false, reserved = false, day1 = false, gems = 0 } = {}) {
  localStorage.clear();
  sessionStorage.clear();
  delete window.__andaleFunnelLog;
  mockBrowser();
  const today = dayKeyFromDate(new Date());
  const first = day1 ? today : prevDayKey(today);
  localStorage.setItem("andale-v3", JSON.stringify({
    welcomed: true, xp: 42, gems, name: "Ana", contentVersion: 2, hearts: 0, heartT: Date.now(),
    onboardingDone: true, firstSessionDone: true, paywallSeen: false, bajioUnlockSeen: true, cdmxUnlockSeen: true,
    lecturaStartedAt: 1, streak: 2, lastDay: today, firstActivityDay: first, theme, uiLang, done: {},
  }));
  localStorage.setItem("andale-first-activity", first);
  if (capped) localStorage.setItem("andale-paywall-shown", today);
  if (reserved) {
    localStorage.setItem(WAITLIST_STORE_KEY, JSON.stringify({ email: "ana@example.com" }));
    localStorage.setItem(RESERVE_DAY_KEY, prevDayKey(today));
  }
  localStorage.setItem("andale-v3-live", JSON.stringify({
    screen: "failed", failKind: "hearts", tab: "camino", lessonStats: { right: 2, wrong: 5 },
    session: { title: "Hola", host: "luna", questions: [{}], day2Hoy: true },
  }));
  const user = userEvent.setup();
  render(<App />);
  await screen.findByTestId("out-of-lives");
  return user;
}

const seen = () => (window.__andaleFunnelLog || []).filter((e) => e.event === FUNNEL_EVENTS.paywallSeen);
const settle = () => new Promise((r) => setTimeout(r, 100));

describe("out of lives, then the day's wall", () => {
  afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });

  it.each([{ theme: "light", uiLang: "es" }, { theme: "dark", uiLang: "en" }])("$theme $uiLang: no wall over out-of-lives; leaving it opens the wall once and counts paywall_seen", async (face) => {
    const user = await outOfLives(face);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(seen()).toHaveLength(0);
    await user.click(screen.getByTestId("hearts-to-path"));
    expect(await screen.findByTestId("soft-paywall-annual")).toBeTruthy();
    expect(seen()).toHaveLength(1);
    expect(localStorage.getItem("andale-paywall-shown")).toBe(dayKeyFromDate(new Date()));
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(seen()).toHaveLength(1);
  });

  it("refill also leads to the wall", async () => {
    const user = await outOfLives({ gems: 500 });
    const refill = screen.getAllByRole("button").find((b) => /350|\u00b7/.test(b.textContent) && !b.disabled && b.getAttribute("data-testid") !== "hearts-to-path" && b.getAttribute("data-testid") !== "review-and-recover");
    expect(refill).toBeTruthy();
    await user.click(refill);
    expect(await screen.findByTestId("soft-paywall-annual")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("andale-v3")).hearts).toBe(5);
  });

  it("the one-wall-per-day cap holds: already shown today, no wall", async () => {
    const user = await outOfLives({ capped: true });
    await user.click(screen.getByTestId("hearts-to-path"));
    await settle();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(seen()).toHaveLength(0);
  });

  it("a reserved learner gets no wall", async () => {
    const user = await outOfLives({ reserved: true });
    await user.click(screen.getByTestId("hearts-to-path"));
    await settle();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(seen()).toHaveLength(0);
  });

  it("day 1 gets no wall (same rule as the post-win wall)", async () => {
    const user = await outOfLives({ day1: true });
    await user.click(screen.getByTestId("hearts-to-path"));
    await settle();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
  });
});
