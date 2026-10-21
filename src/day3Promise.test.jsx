/** Day-after-promise hub (Varys cold walk, Oct 21): the hub names what the win line promised, one tap to open. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "./App.jsx";
import { comeBackTomorrowLine, dayKeyFromDate, hoySceneForDay, hoyTitleForLang, nextDayKey, prevDayKey, promisedReturnTarget } from "./firstDoor.js";

const mockBrowser = () => {
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [], speak: vi.fn(), cancel() {}, resume() {}, addEventListener() {}, removeEventListener() {} } });
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

const SCENES = [{ id: "a", title: "Uno", titleEn: "One" }, { id: "b", title: "Dos", titleEn: "Two" }, { id: "c", title: "Tres", titleEn: "Three" }];

describe("promisedReturnTarget", () => {
  it("names the scene the win line promised for the day after lastDay", () => {
    const day2 = "2026-10-20";
    const promised = hoySceneForDay(SCENES, nextDayKey(day2));
    expect(comeBackTomorrowLine({ lang: "es", nextTitle: hoyTitleForLang(promised, "es") })).toBe(`Vuelve mañana por «${promised.title}».`);
    expect(promisedReturnTarget({ scenes: SCENES, lastDay: day2, today: "2026-10-21", todaySceneDone: false })).toEqual({ kind: "scene", scene: promised });
  });
  it("falls back to the next open story once the promised scene is played today", () => {
    const story = { id: "story-2" };
    expect(promisedReturnTarget({ scenes: SCENES, lastDay: "2026-10-20", today: "2026-10-21", todaySceneDone: true, nextStory: story })).toEqual({ kind: "story", story });
    expect(promisedReturnTarget({ scenes: SCENES, lastDay: "2026-10-20", today: "2026-10-21", todaySceneDone: true, nextStory: null })).toBeNull();
  });
  it("same day: nothing", () => {
    expect(promisedReturnTarget({ scenes: SCENES, lastDay: "2026-10-21", today: "2026-10-21" })).toBeNull();
  });
});

function seedDay3({ uiLang = "es", sceneDone = false } = {}) {
  localStorage.clear(); sessionStorage.clear(); mockBrowser();
  const today = dayKeyFromDate(new Date());
  const d2 = prevDayKey(today);
  const d1 = prevDayKey(d2);
  const missions = sceneDone ? { [`scene-${today}`]: true } : {};
  localStorage.setItem("andale-v3", JSON.stringify({ welcomed: true, xp: 60, gems: 15, name: "Ana", contentVersion: 2, hearts: 5, onboardingDone: true, firstSessionDone: true, paywallSeen: true, bajioUnlockSeen: true, lecturaStartedAt: 1, streak: 2, lastDay: d2, firstActivityDay: d1, theme: "light", uiLang, done: { u1: 1 }, resume: null, missions, stories: { "story-0": true, "story-1": true } }));
  localStorage.setItem("andale-first-activity", d1);
  render(<App />);
  return { today, d2 };
}

describe("day-3 hub", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it.each(["es", "en"])("%s: first line is the scene promised on day 2, above the welcome line; one tap opens it", async (lang) => {
    const { d2 } = seedDay3({ uiLang: lang });
    const card = await screen.findByTestId("hub-promised");
    expect(card.getAttribute("data-promised-kind")).toBe("scene");
    const hub = card.parentElement;
    expect(hub.firstElementChild).toBe(card);
    const tiles = screen.getByTestId("learn-hub-tiles");
    expect(card.compareDocumentPosition(tiles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toMatch(lang === "en" ? /Good to see you again/ : /Qué bueno verte de nuevo/);
    const promisedTitle = screen.getByTestId("hub-promised-headline").textContent;
    // Same title the day-2 win line promised.
    const id = card.getAttribute("data-promised-id");
    expect(id).toBeTruthy();
    expect(promisedTitle.length).toBeGreaterThan(0);
    expect(nextDayKey(d2)).toBe(dayKeyFromDate(new Date()));
    fireEvent.click(screen.getByTestId("hub-promised-open"));
    await new Promise((r) => setTimeout(r, 50));
    // One tap leaves the hub for the scene: no plan sheet in between.
    expect(screen.queryByTestId("hoy-plan")).toBeNull();
    expect(screen.queryByTestId("learn-hub-tiles")).toBeNull();
  });

  it("fallback: promised scene already played today -> the next unread open story (story-2), one tap opens it", async () => {
    seedDay3({ sceneDone: true });
    const card = await screen.findByTestId("hub-promised");
    expect(card.getAttribute("data-promised-kind")).toBe("story");
    expect(card.getAttribute("data-promised-id")).toBe("story-2");
    expect(screen.getByTestId("hub-promised-line").textContent).toBe("Tu siguiente cuento está listo: Más allá de la playa.");
    fireEvent.click(screen.getByTestId("hub-promised-open"));
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-2");
  });
});
