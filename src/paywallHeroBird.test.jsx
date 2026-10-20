/** Paywall hero bird: shows in the 248x140 band when there is no Lectura story page (Hand option 1, Oct 20). */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { dayKeyFromDate, prevDayKey } from "./firstDoor.js";
const storyStill = vi.hoisted(() => ({ rel: null }));
vi.mock("./paywallStill.js", async (orig) => {
  const m = await orig();
  return { ...m, paywallStillPath: (...a) => storyStill.rel ?? m.paywallStillPath(...a) };
});
import { PAYWALL_HERO_ALT, PAYWALL_HERO_PATH, paywallBandImage } from "./paywallStill.js";
const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
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

describe("paywall hero bird", () => {
  afterEach(() => { cleanup(); localStorage.clear(); storyStill.rel = null; });

  it("story page wins with alt=''; hero only when there is no page or it fails", () => {
    expect(paywallBandImage({ storyRel: "lectura/story-0/p1.png", lang: "en" })).toEqual({ kind: "story", rel: "lectura/story-0/p1.png", alt: "" });
    expect(paywallBandImage({ storyRel: null, lang: "es" })).toEqual({ kind: "hero", rel: PAYWALL_HERO_PATH, alt: PAYWALL_HERO_ALT.es });
    expect(paywallBandImage({ storyRel: "lectura/story-0/p1.png", storyMiss: true, lang: "en" })).toEqual({ kind: "hero", rel: PAYWALL_HERO_PATH, alt: PAYWALL_HERO_ALT.en });
    expect(paywallBandImage({ storyRel: null, heroMiss: true })).toBeNull();
    expect(PAYWALL_HERO_ALT.es).toBe("Un cenzontle sobre un libro abierto lleno de historias de México.");
    expect(PAYWALL_HERO_ALT.en).toBe("A mockingbird perched on an open book full of stories from Mexico.");
  });

  for (const { uiLang, theme } of [{ uiLang: "es", theme: "light" }, { uiLang: "en", theme: "dark" }]) {
    it(`no story page: hero fills the band with ${uiLang} alt text and the corner bird`, async () => {
      await openPaywall({ theme, uiLang });
      const still = screen.getByTestId("soft-paywall-still");
      expect(still.getAttribute("src")).toMatch(/stills\/paywall-hero-bird\.jpg$/);
      expect(still.getAttribute("data-paywall-still-kind")).toBe("hero");
      expect(still.getAttribute("alt")).toBe(PAYWALL_HERO_ALT[uiLang]);
      expect(still.style.height).toBe("140px");
      expect(screen.getByTestId("soft-paywall-still-frame")).toBeTruthy();
      // No face brand hold: the hero is the bird, so no 48px corner Cenzontle.
      expect(screen.queryAllByTestId("soft-paywall-cenzontle")).toHaveLength(0);
      expect(document.querySelectorAll("[data-testid='soft-paywall'] img[src*='cenzontle']")).toHaveLength(0);
    });

    it(`story page (${uiLang}): learner's page with alt="" and the 48px corner bird, as before`, async () => {
      storyStill.rel = "lectura/story-1/p5.png";
      await openPaywall({ theme, uiLang });
      const still = screen.getByTestId("soft-paywall-still");
      expect(still.getAttribute("src")).toMatch(/lectura\/story-1\/p5\.png$/);
      expect(still.getAttribute("data-paywall-still-kind")).toBe("story");
      expect(still.getAttribute("alt")).toBe("");
      const birds = screen.getAllByTestId("soft-paywall-cenzontle");
      expect(birds).toHaveLength(1);
      expect(birds[0].getAttribute("width")).toBe("48");
      expect(birds[0].style.position).toBe("absolute");
      expect(birds[0].style.right).toBe("8px");
      expect(birds[0].style.bottom).toBe("-8px");
    });
  }

  it("hero that fails to load falls back to the centered 44px bird", async () => {
    await openPaywall({ theme: "light", uiLang: "es" });
    fireEvent.error(screen.getByTestId("soft-paywall-still"));
    expect(screen.queryByTestId("soft-paywall-still")).toBeNull();
    const bird = screen.getByTestId("soft-paywall-cenzontle");
    expect(bird.style.width).toBe("44px");
  });
});
