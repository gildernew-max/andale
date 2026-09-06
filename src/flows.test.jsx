/**
 * Simulated learner flows (issue 5 #4). Not the content-schema lock
 * (src/content.test.js) and not the save/LIVE schema lock (src/schema.test.js).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { comeBackTomorrowLine, dayKeyFromDate, hoySceneForDay, hoyTitleForLang, nextDayKey, prevDayKey } from "./firstDoor.js";
import { IPHONE_SAFARI_UA, MAC_SAFARI_UA } from "./a2hs.js";
import { isBajioUnlockFlashDue, isCdmxUnlockFlashDue, isNorteUnlockFlashDue, isOaxacaUnlockFlashDue, isYucatanUnlockFlashDue, markBajioUnlockFlashDue, markBajioUnlockFlashLive, markCdmxUnlockFlashDue, markCdmxUnlockFlashLive, markNorteUnlockFlashDue, markNorteUnlockFlashLive, markOaxacaUnlockFlashDue, markOaxacaUnlockFlashLive, markYucatanUnlockFlashDue, markYucatanUnlockFlashLive, recuerdosHasProgressFraction, recuerdosSurfaceHasCuts, RECUERDOS_PIN_SHADOW, RECUERDOS_PIN_SHADOW_LOCKED } from "./recuerdos.js";
import { CHOICE_CHIP_KEYS } from "./choiceChipKeys.js";
import { lettersForLayout } from "./letterBoard.js";
import { SUBJ_FIVE, SUBJ_FIVE_LABEL, SUBJ_FIVE_SUB } from "./subjFive.js";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const seedProgress = (extra = {}) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    xp: 42,
    gems: 9,
    name: "Dave",
    contentVersion: 2,
    hearts: 5,
    done: {},
    ...extra,
  }));
};

const mockBrowser = () => {
  const voices = [];
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => voices,
      speak: () => {},
      cancel: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      onvoiceschanged: null,
    },
  });
  const toneNode = () => ({
    connect() {},
    start() {},
    stop() {},
    frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    detune: { setValueAtTime() {} },
    type: "sine",
  });
  const gainNode = () => ({
    connect() {},
    gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
  });
  window.AudioContext = class {
    constructor() {
      this.state = "running";
      this.currentTime = 0;
      this.destination = {};
      this.sampleRate = 44100;
    }
    createGain() { return gainNode(); }
    createOscillator() { return toneNode(); }
    createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
    createBufferSource() { return { connect() {}, start() {}, stop() {}, buffer: null }; }
    createBiquadFilter() { return { connect() {}, type: "lowpass", frequency: { value: 0 } }; }
    resume() {}
  };
  window.webkitAudioContext = window.AudioContext;
};

const boot = async () => {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
  // Seeded saves are returning visits. Wait out the default first-visit splash
  // so a slow storage.get cannot start a lesson on empty progress.
  await waitFor(() => expect(screen.queryByTestId("splash-start")).toBeNull());
  await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
  return user;
};

const awaitHome = async () => {
  await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
  expect(screen.getByTestId("learn-hub-tiles")).toBeTruthy();
  expect(screen.getByTestId("hub-hoy")).toBeTruthy();
};

const assertEqualHub = () => {
  const tiles = screen.getByTestId("learn-hub-tiles");
  expect(tiles).toBeTruthy();
  expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
  expect(screen.getByTestId("hub-hoy-quiet").textContent).toMatch(/Plan de 10 minutos|10-minute plan/);
  expect(screen.getByTestId("hub-stories").textContent).toMatch(/Stories/);
  expect(screen.getByTestId("hub-games").textContent).toMatch(/Games/);
  expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
  expect(screen.getByTestId("eighty-twenty-cta").textContent).toMatch(/80\/20/);
  expect(screen.getByTestId("hub-sendero").textContent).toMatch(/Sendero/);
  expect(screen.getByTestId("hub-sendero-quiet").textContent).toMatch(/Camino que crece|A path that grows/);
  expect(screen.queryByTestId("hub-sobremesa")).toBeNull();
  expect(tiles.textContent).not.toMatch(/Cuentos|Match & play|Arregla|Prioriza|Unlock Mexico|Flip & keep|Sobremesa|Pin chase|Flashcards/);
  expect(screen.queryByTestId("first-door-hero")).toBeNull();
  expect(screen.queryByTestId("home-pitch")).toBeNull();
  const gridIds = [...tiles.querySelectorAll("button")].map((el) => el.getAttribute("data-testid"));
  expect(gridIds).toEqual([
    "hub-hoy", "hub-stories", "hub-games", "hub-phrase-doctor",
    "eighty-twenty-cta", "hub-sendero",
  ]);
  const heights = gridIds.map((id) => screen.getByTestId(id).style.height);
  expect(new Set(heights).size).toBe(1);
  expect(screen.getByTestId("hub-hoy").querySelector("img")?.getAttribute("src")).toMatch(/hub\/hoy\.png/);
  expect(screen.getByTestId("hub-stories").querySelector("img")?.getAttribute("src")).toMatch(/hub\/stories\.png/);
  expect(screen.getByTestId("hub-games").querySelector("img")?.getAttribute("src")).toMatch(/hub\/games\.png/);
  expect(screen.getByTestId("hub-phrase-doctor").querySelector("img")?.getAttribute("src")).toMatch(/hub\/phrase-doctor\.png/);
  expect(screen.getByTestId("eighty-twenty-cta").querySelector("img")?.getAttribute("src")).toMatch(/hub\/eighty\.png/);
  expect(screen.getByTestId("hub-sendero").querySelector("img")?.getAttribute("src")).toMatch(/hub\/sendero\.png/);
  const quietBorder = screen.getByTestId("hub-stories").style.border;
  expect(screen.getByTestId("hub-games").style.border).toBe(quietBorder);
  expect(screen.getByTestId("hub-sendero").style.border).toBe(quietBorder);
  expect(quietBorder).not.toMatch(/58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
  expect(screen.getByTestId("hub-sendero").getAttribute("data-hub-loud")).toBeNull();
  expect(screen.getByTestId("hub-stories").getAttribute("data-hub-loud")).toBeNull();
  expect(screen.getByTestId("hub-games").getAttribute("data-hub-loud")).toBeNull();
};

const startHoyFromHub = async (user) => {
  await user.click(screen.getByTestId("hub-hoy"));
  await waitFor(() => expect(screen.getByTestId("hoy-plan")).toBeTruthy());
  await user.click(screen.getByTestId("hoy-plan-start"));
};

const continueBtn = () => screen.getByRole("button", { name: /^Continuar$/i });

/** First short-Hoy beat is the scene MC. Read the live answer — do not hardcode a day-hash list. */
const clickHoySceneMc = async (user) => {
  const live = JSON.parse(localStorage.getItem(LIVE_KEY) || "null");
  const q = live?.session?.questions?.[0];
  const answer = q?.answer || (Array.isArray(q?.answers) ? q.answers[0] : "");
  const choice = [...document.querySelectorAll(".choice-card")].find((el) =>
    answer && el.textContent.includes(answer));
  expect(choice).toBeTruthy();
  await user.click(choice);
};

const localToday = () => dayKeyFromDate(new Date());

/** Same nine Hoy titles, same day-hash as App TODAY_SCENES. Do not invent names. */
const HOY_TITLES = [
  { title: "Noche de faroles", titleEn: "Night of lanterns" },
  { title: "En la farmacia", titleEn: "At the pharmacy" },
  { title: "WhatsApp del plomero", titleEn: "Plumber WhatsApp" },
  { title: "WhatsApp del vecino", titleEn: "Neighbor WhatsApp" },
  { title: "En la calle", titleEn: "On the street" },
  { title: "Cita en el banco", titleEn: "Bank appointment" },
  { title: "WhatsApp del casero", titleEn: "Landlord WhatsApp" },
  { title: "Mostrador en caos", titleEn: "Airport Counter Chaos" },
  { title: "Cena con la suegra", titleEn: "Dinner With the In-Laws" },
];

const expectedComeBack = (lang) => {
  const next = hoySceneForDay(HOY_TITLES, nextDayKey(localToday()));
  return comeBackTomorrowLine({ lang, nextTitle: hoyTitleForLang(next, lang) });
};

/** Yearly is the sole filled primary; monthly is quiet text under it. Existing copy only. */
const assertSoftPaywallAnnualPrimary = (lang = "es") => {
  const annual = screen.getByTestId("soft-paywall-annual");
  const monthly = screen.getByTestId("soft-paywall-monthly");
  const honesty = screen.getByTestId("soft-paywall-honesty");
  const dismiss = screen.getByTestId("soft-paywall-dismiss");
  const copy = lang === "en"
    ? { annual: "$39.99 / year", monthly: "$6.99 / month", honesty: "Practice · no charge yet", dismiss: "Continue free for now" }
    : { annual: "$39.99 al año", monthly: "$6.99 al mes", honesty: "Práctica · sin cobro todavía", dismiss: "Seguir gratis por ahora" };
  expect(annual.textContent).toBe(copy.annual);
  expect(monthly.textContent).toBe(copy.monthly);
  expect(honesty.textContent).toBe(copy.honesty);
  expect(dismiss.textContent).toBe(copy.dismiss);
  expect(annual.className).toMatch(/duo-btn/);
  expect(annual.style.background).toMatch(/#58CC02|rgb\(88,\s*204,\s*2\)/i);
  expect(annual.style.borderBottom).toMatch(/4px solid/);
  expect(monthly.className).not.toMatch(/duo-btn/);
  expect(monthly.style.background).toBe("none");
  expect(monthly.style.padding).toBe("11px 0px");
  expect(monthly.style.borderBottom).not.toMatch(/4px/);
  expect(monthly.style.color).toMatch(/#777777|rgb\(119,\s*119,\s*119\)/i);
  const filled = [...screen.getByTestId("soft-paywall").querySelectorAll("button.duo-btn")]
    .filter((el) => !/^(#fff|#ffffff|rgb\(255,\s*255,\s*255\))$/i.test(el.style.background));
  expect(filled).toHaveLength(1);
  expect(filled[0]).toBe(annual);
  expect(dismiss.className).toMatch(/duo-btn/);
  expect(dismiss.style.background).toMatch(/#fff|#ffffff|rgb\(255,\s*255,\s*255\)/i);
};

const STORY_LIFT_RE = /Del cuento|Postal de|Lectura relámpago/;
const CEREZAS_Q_RE = /¿Por qué se negó a vender toda su cosecha|¿Cuánto recibe don Adán por cada kilo|¿Qué le preocupa más a don Adán/;

const laterHoySeed = (extra = {}) => seedProgress({
  streak: 1,
  lastDay: localToday(),
  paywallSeen: true,
  ...extra,
});

async function advanceLessonBeat(user) {
  const choices = document.querySelectorAll(".choice-card:not([disabled])");
  const input = document.querySelector("input[placeholder]");
  const tiles = screen.queryAllByTestId("bank-tile");
  if (choices.length) {
    await user.click(choices[0]);
  } else if (input) {
    await user.type(input, "x");
  } else if (tiles.length) {
    await user.click(tiles[0]);
  }
  const check = screen.queryByTestId("lesson-check");
  if (!check) return false;
  await user.click(check);
  const cont = screen.queryByRole("button", { name: /^Continuar$/i });
  if (cont) await user.click(cont);
  return true;
}

async function collectStoryLifts(user, { maxBeats = 8 } = {}) {
  const lifts = [];
  for (let i = 0; i < maxBeats; i++) {
    if (!screen.queryByTestId("lesson-exit")) break;
    const text = document.body.textContent || "";
    if (STORY_LIFT_RE.test(text) || CEREZAS_Q_RE.test(text)) {
      const from = text.search(STORY_LIFT_RE);
      const qAt = text.search(CEREZAS_Q_RE);
      const start = from >= 0 ? from : qAt;
      lifts.push(text.slice(start, start + 160));
    }
    const advanced = await advanceLessonBeat(user);
    if (!advanced) break;
  }
  return lifts;
}

/** Eso → Bajío glow beat → paywall. Skips wait when the glow already fired. */
const awaitSoftPaywallAfterFirstWin = async () => {
  await waitFor(() => {
    expect(screen.queryByTestId("bajio-unlock-flash") || screen.queryByTestId("soft-paywall")).toBeTruthy();
  }, { timeout: 3000 });
  if (screen.queryByTestId("bajio-unlock-flash")) {
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy(), { timeout: 3000 });
  }
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.getByTestId("soft-paywall")).toBeTruthy();
};

/** First streak-1 Eso CONTINUE must show the glow. Fail if paywall lands first. */
const awaitBajioFlashThenPaywall = async () => {
  await waitFor(() => expect(screen.getByTestId("bajio-unlock-flash")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
  expect(screen.getByTestId("bajio-unlock-flash-copy").textContent).toMatch(/^(Abierto|Open)$/);
  expect(screen.getByTestId("bajio-unlock-flash").textContent.trim()).toMatch(/^(Abierto|Open)$/);
  expect(screen.getByTestId("bajio-unlock-flash").textContent).not.toMatch(/Bajío|¡Sigue explorando!|Sigue explorando/);
  await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy(), { timeout: 3000 });
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
};

/** Day-2 Hoy Eso CONTINUE must show CDMX glow before close or idle. Fail if paywall/idle land first. */
const awaitCdmxFlashThenIdle = async () => {
  await waitFor(() => expect(screen.getByTestId("cdmx-unlock-flash")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
  expect(screen.getByTestId("cdmx-unlock-flash-copy").textContent).toMatch(/^(Abierto|Open)$/);
  expect(screen.getByTestId("cdmx-unlock-flash").textContent.trim()).toMatch(/^(Abierto|Open)$/);
  expect(screen.getByTestId("cdmx-unlock-flash").textContent).not.toMatch(/CDMX|Bajío|¡Sigue explorando!|Sigue explorando/);
  expect(screen.getByTestId("cdmx-unlock-flash-glow").className).toMatch(/bajio-glow/);
  expect(recuerdosSurfaceHasCuts(screen.getByTestId("cdmx-unlock-flash").textContent)).toBe(false);
  expect(recuerdosHasProgressFraction(screen.getByTestId("cdmx-unlock-flash").textContent)).toBe(false);
  await waitFor(() => expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull(), { timeout: 3000 });
  await awaitHome();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
};

/** CONTINUE must paint the glow. Due-only / idle-home is the official skip. */
const awaitCdmxFlashVisible = async () => {
  await waitFor(() => expect(screen.getByTestId("cdmx-unlock-flash")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
  expect(screen.getByTestId("cdmx-unlock-flash-copy").textContent).toMatch(/^(Abierto|Open)$/);
};

/** Streak-3 Hoy Eso CONTINUE must show Oaxaca glow before close or idle. Fail if paywall/idle land first. */
const awaitOaxacaFlashThenIdle = async () => {
  await waitFor(() => expect(screen.getByTestId("oaxaca-unlock-flash")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
  expect(screen.getByTestId("oaxaca-unlock-flash-copy").textContent).toMatch(/^(Abierto|Open)$/);
  expect(screen.getByTestId("oaxaca-unlock-flash").textContent.trim()).toMatch(/^(Abierto|Open)$/);
  expect(screen.getByTestId("oaxaca-unlock-flash").textContent).not.toMatch(/Oaxaca|CDMX|Bajío|Yucatán|Norte|¡Sigue explorando!|Sigue explorando/);
  expect(screen.getByTestId("oaxaca-unlock-flash-glow").className).toMatch(/bajio-glow/);
  expect(recuerdosSurfaceHasCuts(screen.getByTestId("oaxaca-unlock-flash").textContent)).toBe(false);
  expect(recuerdosHasProgressFraction(screen.getByTestId("oaxaca-unlock-flash").textContent)).toBe(false);
  await waitFor(() => expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull(), { timeout: 3000 });
  await awaitHome();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
};

/** CONTINUE must paint the Oaxaca glow. Due-only / idle-home is the official skip. */
const awaitOaxacaFlashVisible = async () => {
  await waitFor(() => expect(screen.getByTestId("oaxaca-unlock-flash")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
  expect(screen.getByTestId("oaxaca-unlock-flash-copy").textContent).toMatch(/^(Abierto|Open)$/);
};

/** Streak-4 Hoy Eso CONTINUE must show Yucatán glow before close or idle. Fail if paywall/idle land first. */
const awaitYucatanFlashThenIdle = async () => {
  await waitFor(() => expect(screen.getByTestId("yucatan-unlock-flash")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
  expect(screen.getByTestId("yucatan-unlock-flash-copy").textContent).toMatch(/^(Abierto|Open)$/);
  expect(screen.getByTestId("yucatan-unlock-flash").textContent.trim()).toMatch(/^(Abierto|Open)$/);
  expect(screen.getByTestId("yucatan-unlock-flash").textContent).not.toMatch(/Yucatán|Yucatan|Oaxaca|CDMX|Bajío|Norte|North|¡Sigue explorando!|Sigue explorando/);
  expect(screen.getByTestId("yucatan-unlock-flash-glow").className).toMatch(/bajio-glow/);
  expect(recuerdosSurfaceHasCuts(screen.getByTestId("yucatan-unlock-flash").textContent)).toBe(false);
  expect(recuerdosHasProgressFraction(screen.getByTestId("yucatan-unlock-flash").textContent)).toBe(false);
  await waitFor(() => expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull(), { timeout: 3000 });
  await awaitHome();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
};

/** CONTINUE must paint the Yucatán glow. Due-only / idle-home is the official skip. */
const awaitYucatanFlashVisible = async () => {
  await waitFor(() => expect(screen.getByTestId("yucatan-unlock-flash")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
  expect(screen.getByTestId("yucatan-unlock-flash-copy").textContent).toMatch(/^(Abierto|Open)$/);
};

/** Streak-5 Hoy Eso CONTINUE must show Norte glow before close or idle. Fail if paywall/idle land first. */
const awaitNorteFlashThenIdle = async () => {
  await waitFor(() => expect(screen.getByTestId("norte-unlock-flash")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.getByTestId("norte-unlock-flash-copy").textContent).toMatch(/^(Abierto|Open)$/);
  expect(screen.getByTestId("norte-unlock-flash").textContent.trim()).toMatch(/^(Abierto|Open)$/);
  expect(screen.getByTestId("norte-unlock-flash").textContent).not.toMatch(/Norte|North|Yucatán|Yucatan|Oaxaca|CDMX|Bajío|¡Sigue explorando!|Sigue explorando/);
  expect(screen.getByTestId("norte-unlock-flash-glow").className).toMatch(/bajio-glow/);
  expect(recuerdosSurfaceHasCuts(screen.getByTestId("norte-unlock-flash").textContent)).toBe(false);
  expect(recuerdosHasProgressFraction(screen.getByTestId("norte-unlock-flash").textContent)).toBe(false);
  await waitFor(() => expect(screen.queryByTestId("norte-unlock-flash")).toBeNull(), { timeout: 3000 });
  await awaitHome();
  expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
};

/** CONTINUE must paint the Norte glow. Due-only / idle-home is the official skip. */
const awaitNorteFlashVisible = async () => {
  await waitFor(() => expect(screen.getByTestId("norte-unlock-flash")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.getByTestId("norte-unlock-flash-copy").textContent).toMatch(/^(Abierto|Open)$/);
};

const playShortHoyBeat = async (user, answer) => {
  await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
  const choice = [...document.querySelectorAll(".choice-card")].find((el) =>
    el.textContent.includes(answer));
  expect(choice).toBeTruthy();
  await user.click(choice);
  await user.click(screen.getByTestId("lesson-check"));
  await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
  await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
};

const openCaminoMore = async (user) => {
  const more = screen.getByTestId("camino-more");
  if (more.getAttribute("aria-expanded") !== "true") await user.click(more);
  await waitFor(() => expect(screen.getByTestId("camino-more-panel")).toBeTruthy());
};

const JSDOM_UA = "Mozilla/5.0 (linux) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/26.0.0";

const mockA2hsEnv = ({ userAgent = IPHONE_SAFARI_UA, standalone = false, platform = "", maxTouchPoints = 0 } = {}) => {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    get: () => userAgent,
  });
  Object.defineProperty(window.navigator, "standalone", {
    configurable: true,
    get: () => standalone,
  });
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    get: () => platform,
  });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    get: () => maxTouchPoints,
  });
  window.matchMedia = (query) => ({
    matches: standalone && String(query).includes("display-mode: standalone"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  });
};

beforeEach(() => {
  localStorage.clear();
  mockBrowser();
  mockA2hsEnv({ userAgent: JSDOM_UA, standalone: false });
  seedProgress();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  markBajioUnlockFlashDue(false);
  markBajioUnlockFlashLive(false);
  markCdmxUnlockFlashDue(false);
  markCdmxUnlockFlashLive(false);
  markOaxacaUnlockFlashDue(false);
  markOaxacaUnlockFlashLive(false);
  markYucatanUnlockFlashDue(false);
  markYucatanUnlockFlashLive(false);
  markNorteUnlockFlashDue(false);
  markNorteUnlockFlashLive(false);
  mockA2hsEnv({ userAgent: JSDOM_UA, standalone: false });
});

describe("simulated learner flows", () => {
  it("boots Camino, starts subj1, answers one MC, persists andale-v3 without wipe", async () => {
    const user = await boot();
    await user.click(screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(screen.getByRole("button", { name: /Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await waitFor(() => expect(
      document.querySelector(".choice-card")
      || document.querySelector("input[placeholder]")
      || screen.queryAllByTestId("bank-tile").length,
    ).toBeTruthy());

    // Skip non-MC items (shuffle) until a multiple-choice prompt is up.
    for (let i = 0; i < 12 && !document.querySelector(".choice-card"); i++) {
      const input = document.querySelector("input[placeholder]");
      const tiles = screen.queryAllByTestId("bank-tile");
      if (input) {
        await user.type(input, "x");
        await user.click(screen.getByTestId("lesson-check"));
      } else if (tiles.length) {
        await user.click(tiles[0]);
        await user.click(screen.getByTestId("lesson-check"));
      } else {
        break;
      }
      await user.click(continueBtn());
      await waitFor(() => expect(
        document.querySelector(".choice-card")
        || document.querySelector("input[placeholder]")
        || screen.queryAllByTestId("bank-tile").length,
      ).toBeTruthy());
    }
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));

    await waitFor(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const prog = JSON.parse(raw);
      expect(prog && typeof prog === "object" && !Array.isArray(prog)).toBe(true);
      expect(prog.xp).toBe(42);
      expect(prog.gems).toBe(9);
      expect(prog.name).toBe("Dave");
      expect(prog.contentVersion).toBe(2);
      expect(prog.srs || prog.weak || prog.hearts != null).toBeTruthy();
    });
  });

  it("tabs Camino → Misiones → Lectura → Práctica → Perfil via nav-*", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-camino"));
    await awaitHome();
    assertEqualHub();
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/Continuar|Continue|Subjuntivo/);

    await user.click(screen.getByTestId("nav-misiones"));
    expect(screen.getByRole("heading", { name: /Misiones/ })).toBeTruthy();
    expect([...document.querySelectorAll("img")].some((img) => /coaches\/valeria-happy\.png/.test(img.getAttribute("src") || ""))).toBe(true);

    await user.click(screen.getByTestId("nav-lectura"));
    expect(screen.getByRole("heading", { name: /Biblioteca/ })).toBeTruthy();

    await user.click(screen.getByTestId("nav-practica"));
    expect(screen.getByTestId("safe-risky-start")).toBeTruthy();

    await user.click(screen.getByTestId("nav-perfil"));
    expect(screen.getByText("Tu perfil")).toBeTruthy();
  });

  it("starts Safe or Risky from Práctica via data-testid safe-risky-start", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => {
      expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy();
      expect(screen.getByText(/¿Lo dirías\?|Would you say it\?/)).toBeTruthy();
    });
  });

  it("Safe/Risky reveal shows Literal then Why above CONTINUE", async () => {
    const literals = {
      "No manches.": { es: "Vaya / no me digas.", en: "No way. / Come on." },
      "Quedo a sus órdenes.": { es: "Quedo bajo sus órdenes.", en: "I remain under your orders." },
      "¿Mande?": { es: "¿Cómo? / ¿perdón?", en: "Pardon?" },
      "¿Qué?": { es: "¿Qué?", en: "What?" },
      "¿Me da un café, por favor?": { es: "¿Me da un café, por favor?", en: "Can I have a coffee, please?" },
      "Está bien chido.": { es: "Está muy padre.", en: "It’s really cool." },
      "No obstante lo anterior...": { es: "A pesar de lo anterior...", en: "Notwithstanding the foregoing..." },
      "Ahorita vengo.": { es: "Vuelvo en un momento.", en: "I’ll be right back." },
    };
    const whys = {
      "No manches.": { es: "Suena a amigos en México. Con jefes o personas mayores, pásate a algo más suave.", en: "Sounds like friends in Mexico. With bosses or elders, switch to something softer." },
      "Quedo a sus órdenes.": { es: "En tono suave: estoy a su disposición. Cierre profesional mexicano — amable, claro, seguro en correo con clientas.", en: "Soft English: I’m at your service. Mexican professional close — warm, clear, safe for a client email." },
      "¿Mande?": { es: "De mandar / «mande usted»: el «¿perdón?» cortés de México. Con la suegra, gana a un «¿Qué?» seco.", en: "From mandar / «mande usted»: Mexico’s polite “Pardon?” With your mother-in-law, it beats a blunt «¿Qué?»" },
      "¿Qué?": { es: "Puede sonar brusco. Mejor «¿Mande?» o «¿Cómo?» según a quién le hablas.", en: "It can land blunt. Prefer «¿Mande?» or «¿Cómo?» depending on who you’re talking to." },
      "¿Me da un café, por favor?": { es: "Natural en el mostrador: directo y cortés. Mejor que «¿Puedo obtener un café?»", en: "Natural at the counter: direct and polite. Better than “Can I obtain a coffee?”" },
      "Está bien chido.": { es: "Suena mexicano y de amigos. En documentos o juntas formales, cámbialo.", en: "Sounds Mexican and friendly. In documents or formal meetings, swap it out." },
      "No obstante lo anterior...": { es: "Registro de contrato. En una charla normal pesa demasiado; guárdalo para el papel.", en: "Contract register. In normal chat it feels heavy — save it for the page." },
      "Ahorita vengo.": { es: "Muy mexicano. «Ahorita» puede ser pronto… o un poco más. El tono lo decide el contexto.", en: "Very Mexican. «Ahorita» can mean soon… or a bit later. Context sets the clock." },
    };
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy());
    const phrase = Object.keys(literals).find((p) => document.body.textContent.includes(p));
    expect(phrase).toBeTruthy();
    expect(screen.queryByTestId("safe-risky-literal")).toBeNull();
    expect(screen.queryByTestId("safe-risky-why")).toBeNull();
    await user.click(screen.getByTestId("safe-risky-choice-safe"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-literal")).toBeTruthy());
    const literal = screen.getByTestId("safe-risky-literal");
    const why = screen.getByTestId("safe-risky-why");
    const cont = screen.getByTestId("safe-risky-continue");
    expect(literal.textContent).toContain("Traducción");
    expect(literal.textContent).toContain(literals[phrase].es);
    expect(why.textContent).toContain("Por qué");
    expect(why.textContent).toContain(whys[phrase].es);
    expect(why.textContent).not.toMatch(/^¿Por qué\?/);
    expect(cont.textContent).toMatch(/Continuar|Terminar/);
    expect(literal.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(why.compareDocumentPosition(cont) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    if (phrase === "Quedo a sus órdenes.") {
      expect(literal.textContent).toContain("Quedo bajo sus órdenes.");
      expect(literal.textContent).not.toMatch(/at your service/i);
      expect(literal.textContent).not.toMatch(/disposición/i);
      expect(why.textContent).toContain("En tono suave: estoy a su disposición.");
      expect(why.textContent).not.toContain("Encaja en correo con clientas.");
    }
    if (phrase === "Está bien chido.") {
      expect(literal.textContent).toContain("Está muy padre.");
      expect(literal.textContent).not.toMatch(/cool/i);
    }
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Literal"));
    expect(screen.getByTestId("safe-risky-literal").textContent).toContain(literals[phrase].en);
    if (phrase === "Quedo a sus órdenes.") {
      expect(screen.getByTestId("safe-risky-literal").textContent).toContain("I remain under your orders.");
      expect(screen.getByTestId("safe-risky-literal").textContent).not.toMatch(/at your service/i);
      expect(screen.getByTestId("safe-risky-why").textContent).toContain("Soft English: I’m at your service.");
    }
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Why");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain(whys[phrase].en);
    expect(screen.getByTestId("safe-risky-why").textContent).not.toMatch(/^Why\?/);
    expect(screen.getByTestId("safe-risky-continue").textContent).toMatch(/Continue|Finish/);
  });

  it("Safe/Risky wrong/better-answer reveal still shows Literal then Why above CONTINUE", async () => {
    const literals = {
      "No manches.": { es: "Vaya / no me digas.", answer: "casual" },
      "Quedo a sus órdenes.": { es: "Quedo bajo sus órdenes.", answer: "formal" },
      "¿Mande?": { es: "¿Cómo? / ¿perdón?", answer: "regional" },
      "¿Qué?": { es: "¿Qué?", answer: "risky" },
      "¿Me da un café, por favor?": { es: "¿Me da un café, por favor?", answer: "safe" },
      "Está bien chido.": { es: "Está muy padre.", answer: "casual" },
      "No obstante lo anterior...": { es: "A pesar de lo anterior...", answer: "formal" },
      "Ahorita vengo.": { es: "Vuelvo en un momento.", answer: "regional" },
    };
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy());
    const phrase = Object.keys(literals).find((p) => document.body.textContent.includes(p));
    expect(phrase).toBeTruthy();
    const wrong = literals[phrase].answer === "safe" ? "risky" : "safe";
    await user.click(screen.getByTestId(`safe-risky-choice-${wrong}`));
    await waitFor(() => expect(screen.getByTestId("safe-risky-literal")).toBeTruthy());
    expect(document.body.textContent).toMatch(/Mejor respuesta|Better answer/);
    const literal = screen.getByTestId("safe-risky-literal");
    const why = screen.getByTestId("safe-risky-why");
    const cont = screen.getByTestId("safe-risky-continue");
    expect(literal.textContent).toContain("Traducción");
    expect(literal.textContent).toContain(literals[phrase].es);
    expect(why.textContent).toContain("Por qué");
    expect(literal.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(why.compareDocumentPosition(cont) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    if (phrase === "Quedo a sus órdenes.") {
      expect(literal.textContent).toContain("Quedo bajo sus órdenes.");
      expect(literal.textContent).not.toMatch(/at your service/i);
      expect(literal.textContent).not.toMatch(/disposición/i);
      expect(why.textContent).toContain("En tono suave: estoy a su disposición.");
    }
    if (phrase === "Está bien chido.") {
      expect(literal.textContent).toContain("Está muy padre.");
      expect(literal.textContent).not.toMatch(/cool/i);
    }
    if (phrase === "¿Qué?") {
      expect(literal.textContent).toContain("¿Qué?");
    }
  });

  const playMatchRound = async (user) => {
    await waitFor(() => expect(screen.getByTestId("match-pairs-board")).toBeTruthy());
    const lefts = [...document.querySelectorAll("[data-testid^='match-tile-left-']")];
    expect(lefts.length).toBeGreaterThan(1);
    for (const el of lefts) {
      const id = el.getAttribute("data-testid").replace("match-tile-left-", "");
      await user.click(el);
      await user.click(screen.getByTestId(`match-tile-right-${id}`));
    }
    await waitFor(() => expect(screen.getByTestId("match-pairs-done")).toBeTruthy());
  };

  const progressXp = () => JSON.parse(localStorage.getItem(STORAGE_KEY)).xp;

  it("starts match-pairs from Práctica and finishes a finite round", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    const start = screen.getByTestId("match-pairs-start");
    expect(start).toBeTruthy();
    await user.click(start);
    await playMatchRound(user);
    expect(screen.queryByTestId("match-pairs-board")).toBeNull();
    expect(screen.getByText(/¡Ronda terminada!|Round complete/)).toBeTruthy();
    await user.click(screen.getByTestId("match-pairs-back"));
    await waitFor(() => expect(screen.getByTestId("match-pairs-start")).toBeTruthy());
  });

  it("match-pairs rematch keeps XP at 4 (first +4, Otra ronda +0)", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("match-pairs-start"));
    await playMatchRound(user);
    await waitFor(() => expect(progressXp() - 42).toBe(4));
    await user.click(screen.getByTestId("match-pairs-again"));
    await playMatchRound(user);
    await waitFor(() => expect(progressXp() - 42).toBe(4));
  });

  it("opens story-0 from Lectura, taps a word, and leaves no definición pendiente", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    expect(screen.getByTestId("story-tip").textContent).toMatch(/Lee el párrafo\. Toca una palabra solo si te frena\./);
    expect(screen.getByTestId("lectura-paragraph-first")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText(/cempasúchil/).length).toBeGreaterThan(0));
    const storyWord = [...document.querySelectorAll("span")].find((el) =>
      el.textContent === "cempasúchil" && el.style.cursor === "pointer");
    expect(storyWord).toBeTruthy();
    await user.click(storyWord);
    await waitFor(() => expect(screen.getByText(/Mexican marigold/i)).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/definición pendiente|definition coming soon/i);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("story-tip").textContent).toMatch(/Read the paragraph\. Tap a word only if it stops you\./));
  });

  it("Lectura + story Qs show a one-line gloss for stamped words only", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    const cerezas = screen.getAllByTestId("gloss-word").find((el) => el.getAttribute("data-gloss-key") === "cerezas");
    expect(cerezas).toBeTruthy();
    await user.click(cerezas);
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("el fruto del café (no la fruta de postre)"));
    await user.click(screen.getByRole("button", { name: "Preguntas" }));
    await waitFor(() => expect(screen.getAllByTestId("story-q-prompt").length).toBeGreaterThan(0));
    const cosecha = screen.getAllByTestId("gloss-word").find((el) => el.getAttribute("data-gloss-key") === "cosecha");
    expect(cosecha).toBeTruthy();
    await user.click(cosecha);
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("la recolección de ese año"));
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByText("Comprehension")).toBeTruthy());
    const cosechaEn = screen.getAllByTestId("gloss-word").find((el) => el.getAttribute("data-gloss-key") === "cosecha");
    await user.hover(cosechaEn);
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("harvest"));
  });

  it("header ES|EN toggle flips uiLang, persists andale-v3, and stays in sync with Perfil", async () => {
    const user = await boot();
    const toggle = screen.getByTestId("lang-toggle");
    const es = screen.getByTestId("lang-es");
    const en = screen.getByTestId("lang-en");
    expect(toggle).toBeTruthy();
    expect(es).toBeTruthy();
    expect(en).toBeTruthy();
    expect(es.textContent).toBe("ES");
    expect(en.textContent).toBe("EN");
    expect(es.getAttribute("aria-label")).toBe("Español");
    expect(en.getAttribute("aria-label")).toBe("English");
    expect(screen.getByRole("button", { name: "Pretérito vs. imperfecto (bloqueado)" })).toBeTruthy();
    await awaitHome();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(es.getAttribute("aria-pressed")).toBe("true");
    expect(en.getAttribute("aria-pressed")).toBe("false");

    await user.click(en);
    await waitFor(() => {
      expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByTestId("lang-es").getAttribute("aria-pressed")).toBe("false");
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.uiLang).toBe("en");
      expect(prog.name).toBe("Dave");
      expect(prog.contentVersion).toBe(2);
    });
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.getByRole("button", { name: "Pretérito vs. imperfecto (blocked)" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: / \(bloqueado\)/ })).toBeNull();

    for (const tab of ["nav-misiones", "nav-lectura", "nav-practica", "nav-perfil"]) {
      await user.click(screen.getByTestId(tab));
      expect(screen.getByTestId("lang-toggle")).toBeTruthy();
      expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
    }
    expect(screen.getByText("Your profile")).toBeTruthy();
    expect(screen.getByTestId("perfil-lang-en").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("perfil-lang-es").getAttribute("aria-pressed")).toBe("false");

    cleanup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).uiLang).toBe("en");
      expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
    });
    const user2 = userEvent.setup();
    await user2.click(screen.getByTestId("nav-camino"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    await user2.click(screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user2.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.getByTestId("lang-toggle")).toBeTruthy();
    expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
  });

  it("ES chrome locks Tarjetas and DUELO; Rayo stays ON/OFF", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    assertEqualHub();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Hola, Dave!|Español mexicano real: cuentos, misiones/);
    expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy();
    expect(screen.getByText("Coach del día")).toBeTruthy();
    expect(screen.getByText("Mentor de cuentos")).toBeTruthy();
    expect(screen.getByText("Coach de precisión")).toBeTruthy();
    expect(screen.getByText("Rival")).toBeTruthy();

    const rayo = screen.getByRole("button", { name: /Rayo/ });
    expect(rayo.textContent).toMatch(/OFF/);
    expect(rayo.textContent).not.toMatch(/SÍ|NO|ENCENDIDO|APAGADO/);
    expect(document.body.textContent).not.toMatch(/DIÁLOGO DUEL/);
    await user.click(screen.getByTestId("camino-more"));
    expect(screen.getByTestId("hub-flashcards").textContent).toMatch(/Flashcards/);

    await user.click(screen.getByTestId("nav-misiones"));
    expect(screen.getByText("DUELO")).toBeTruthy();
    expect(screen.getAllByText("Duelo").length).toBeGreaterThan(0);
    expect(screen.queryByText("DIÁLOGO DUEL")).toBeNull();

    await user.click(screen.getByTestId("nav-practica"));
    expect(screen.getByRole("heading", { name: "Tarjetas" })).toBeTruthy();
    expect(screen.queryByText("Flashcards")).toBeNull();
    expect(document.body.textContent).toMatch(/Tarjetas/);
    expect(document.body.textContent).not.toMatch(/Flashcards|DIÁLOGO DUEL/);

    await user.click(screen.getByTestId("nav-camino"));
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Hola, Dave!|Luna ya tiene tu rutina/);
    const rayoEn = screen.getByRole("button", { name: /Lightning|Rayo/ });
    expect(rayoEn.textContent).toMatch(/OFF/);
    expect(rayoEn.textContent).not.toMatch(/SÍ|NO/);
  });

  it("Práctica weakness CTA and Perfil Luna CTA use Rutina diaria / Daily routine", async () => {
    cleanup();
    seedProgress({ weak: { Subjuntivo: 2 } });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    await openCaminoMore(user);
    const caminoDailyEs = screen.getByTestId("camino-daily-workout");
    expect(caminoDailyEs.textContent).toMatch(/Rutina diaria/);
    expect(caminoDailyEs.textContent).not.toMatch(/Daily workout/);
    await user.click(screen.getByTestId("nav-practica"));
    await waitFor(() => expect(screen.getByText("Mapa de debilidades")).toBeTruthy());
    const weaknessEs = screen.getByTestId("weakness-workout");
    expect(weaknessEs.textContent).toBe("Rutina diaria");
    expect(weaknessEs.textContent).not.toMatch(/Workout/);

    await user.click(screen.getByTestId("nav-perfil"));
    const lunaEs = screen.getByTestId("coach-cta-luna");
    expect(lunaEs.textContent).toMatch(/Rutina diaria/);
    expect(lunaEs.textContent).not.toMatch(/Workout/);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
    await user.click(screen.getByTestId("nav-practica"));
    await waitFor(() => expect(screen.getByText("Weakness map")).toBeTruthy());
    expect(screen.getByTestId("weakness-workout").textContent).toBe("Daily routine");
    await user.click(screen.getByTestId("nav-perfil"));
    expect(screen.getByTestId("coach-cta-luna").textContent).toMatch(/Daily routine/);
    expect(screen.getByTestId("coach-cta-luna").textContent).not.toMatch(/Workout diario/);
    await user.click(screen.getByTestId("nav-camino"));
    await openCaminoMore(user);
    expect(screen.getByTestId("camino-daily-workout").textContent).toMatch(/Daily routine/);
    expect(screen.getByTestId("camino-daily-workout").textContent).not.toMatch(/Daily workout|Workout done|Today's workout/);
  });

  it("Camino hero done-state is Rutina hecha / Routine done, not Workout done", async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    cleanup();
    seedProgress({ missions: { [`daily-${today}`]: true } });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("camino-more")).toBeTruthy());
    await openCaminoMore(user);
    const doneEs = screen.getByTestId("camino-daily-workout");
    expect(doneEs.textContent).toMatch(/Rutina hecha/);
    expect(doneEs.textContent).not.toMatch(/Workout|Rutina completada/);
    expect(doneEs.disabled).toBe(true);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
    const doneEn = screen.getByTestId("camino-daily-workout");
    expect(doneEn.textContent).toMatch(/Routine done/);
    expect(doneEn.textContent).not.toMatch(/Workout done|Workout complete|Today's workout|Daily workout/);
  });

  it("ES flashcard-done heading is ¡Terminaste las tarjetas!, not Deck", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await waitFor(() => expect(screen.getByTestId("flash-card")).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/¡Deck terminado!|¡Tarjetas listas!/);

    for (let i = 0; i < 16; i++) {
      if (screen.queryByTestId("flash-session-done")) break;
      if (screen.queryByTestId("flash-reveal")) {
        await user.click(screen.getByTestId("flash-reveal"));
      }
      await waitFor(() => expect(screen.getByTestId("flash-easy")).toBeTruthy());
      await user.click(screen.getByTestId("flash-easy"));
    }

    await waitFor(() => expect(screen.getByTestId("flash-session-done")).toBeTruthy());
    expect(screen.getByRole("heading", { name: "¡Terminaste las tarjetas!" })).toBeTruthy();
    expect(screen.queryByText(/¡Deck terminado!/)).toBeNull();
    expect(screen.queryByText(/¡Tarjetas listas!/)).toBeNull();
    expect(screen.getByTestId("flash-session-done").textContent).not.toMatch(/Deck/);
    expect(screen.getByTestId("flash-again")).toBeTruthy();

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByRole("heading", { name: "You finished the cards!" })).toBeTruthy();
    expect(screen.queryByText(/Deck complete!/)).toBeNull();
    expect(screen.getByTestId("flash-session-done").textContent).not.toMatch(/Deck/);
  });

  it("splash has only header ES|EN — no Español/English dump", async () => {
    localStorage.clear();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lang-toggle")).toBeTruthy());
    expect(screen.getByText("¡ándale!")).toBeTruthy();
    expect(screen.getByTestId("lang-es").textContent).toBe("ES");
    expect(screen.getByTestId("lang-en").textContent).toBe("EN");
    expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
    expect([...document.querySelectorAll("button")].filter((b) =>
      b.textContent === "Español" || b.textContent === "English")).toHaveLength(0);
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").uiLang).toBe("en");
    expect(screen.getByPlaceholderText("What do they call you?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start!" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("¿Cómo te dicen?")).toBeTruthy();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").uiLang).toBe("es");
    });
    expect(screen.getByRole("button", { name: "¡Empezar!" })).toBeTruthy();
  });

  it("splash locks exact line + one primary CTA, no equal Saltar, cenzontle hero", async () => {
    localStorage.clear();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    expect(screen.getByTestId("splash-line").textContent).toBe("Real Mexican Spanish. Past the basics.");
    expect(screen.getByTestId("splash-start").textContent).toBe("Start!");
    expect(screen.queryByTestId("splash-skip")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
    expect(screen.getByTestId("splash-actions").querySelectorAll("button")).toHaveLength(1);
    expect(screen.getByTestId("splash-actions").textContent.trim()).toBe("Start!");
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Start! ?Skip/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/\bSkip\b/);
    expect(screen.getByTestId("splash-hero").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("splash").querySelector("img[src*='sma-']")).toBeNull();
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Subjuntivo/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Orden distinto|Different order, same meaning/);
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
    expect(screen.queryByRole("button", { name: /Let's go!/ })).toBeNull();

    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("splash-line").textContent).toBe("Español mexicano real. Más allá de lo básico."));
    expect(screen.getByTestId("splash-start").textContent).toBe("¡Empezar!");
    expect(screen.queryByTestId("splash-skip")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
    expect(screen.getByTestId("splash-actions").querySelectorAll("button")).toHaveLength(1);
    expect(screen.getByTestId("splash-actions").textContent.trim()).toBe("¡Empezar!");
    expect(screen.getByTestId("splash").textContent).not.toMatch(/¡Empezar! ?Saltar/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Saltar/);
    expect(screen.getByTestId("splash-hero").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Subjuntivo/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Orden distinto|Different order, same meaning/);
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
  });

  it("first boot with empty storage always shows splash Start after hydrate", async () => {
    localStorage.clear();
    mockBrowser();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("splash-start").textContent).toBe("Start!"));
    expect(screen.getByTestId("splash-line").textContent).toBe("Real Mexican Spanish. Past the basics.");
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
    expect(screen.getByTestId("splash-actions").querySelectorAll("button")).toHaveLength(1);
    // Async load + persist must not dismiss splash on a true first visit.
    await waitFor(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        expect(saved.welcomed).toBeFalsy();
        expect(saved.xp > 0).toBeFalsy();
        expect(saved.uiLang).toBe("en");
      }
      expect(screen.getByTestId("splash")).toBeTruthy();
      expect(screen.getByTestId("splash-start").textContent).toBe("Start!");
    });
    expect(screen.queryByTestId("nav-camino")).toBeTruthy();
    expect(screen.queryByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("splash")).toBeTruthy();
  });

  it("leftover LIVE lesson does not skip first-visit splash", async () => {
    localStorage.clear();
    mockBrowser();
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      session: {
        title: "Subjuntivo presente",
        unitId: "subj1",
        host: "luna",
        questions: [{ type: "mc", prompt: "x", choices: ["a"], answer: "a", shuffledChoices: ["a"] }],
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash-start")).toBeTruthy());
    expect(screen.getByTestId("splash-line").textContent).toBe("Real Mexican Spanish. Past the basics.");
    expect(screen.getByTestId("splash-start").textContent).toBe("Start!");
    expect(screen.queryByTestId("lesson-exit")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
  });

  it("Learn home is the v01b equal hub — no pitch card, no slash tails", async () => {
    const user = await boot();
    await awaitHome();
    assertEqualHub();
    expect(document.body.textContent).not.toMatch(/para quien ya pasó lo básico/);
    expect(document.body.textContent).not.toMatch(/cuentos, misiones, tarjetas y cuatro coaches/);
    expect(document.body.textContent).not.toMatch(/for people past the basics/);
    expect(document.body.textContent).not.toMatch(/stories, challenges, flashcards, and four coaches/);
    expect(["nav-camino", "nav-misiones", "nav-lectura", "nav-practica", "nav-perfil"].map((id) => screen.getByTestId(id).textContent.trim())).toEqual([
      "Camino", "Misiones", "Lectura", "Práctica", "Perfil",
    ]);
    expect(screen.queryByRole("button", { name: /^Home$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Library$/ })).toBeNull();

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
    assertEqualHub();
    expect(["nav-camino", "nav-misiones", "nav-lectura", "nav-practica", "nav-perfil"].map((id) => screen.getByTestId(id).textContent.trim())).toEqual([
      "Learn", "Challenges", "Stories", "Review", "Profile",
    ]);
    expect(screen.queryByRole("button", { name: /^Home$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Library$/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/para quien ya pasó lo básico/);
    expect(document.body.textContent).not.toMatch(/for people past the basics/);
  });

  it("section test-out starts from Camino and fails closed after 3 misses (failKind === test)", async () => {
    const user = await boot();
    await user.click(screen.getAllByTitle(/Examen de la sección|Section test/)[0]);
    await waitFor(() => {
      expect(screen.getByTestId("lesson-exit")).toBeTruthy();
      expect(screen.getByText(/EXAMEN/)).toBeTruthy();
    });
    await user.click(screen.getByTestId("lesson-exit"));
    await user.click(screen.getByTestId("quit-without-save"));
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    cleanup();

    // Drive the fail-closed branch through the real next() path: restore a
    // test-out lesson already sitting on the 3rd miss, then tap Continuar.
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "wrong",
      qi: 0,
      lessonStats: { right: 0, wrong: 3 },
      failKind: "hearts",
      session: {
        title: "EXAMEN: Sección 1 · Intermedio",
        unitId: "_test",
        testOut: 0,
        host: "valeria",
        questions: [{ type: "mc", prompt: "x", choices: ["a"], answer: "a", shuffledChoices: ["a"] }],
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await userEvent.setup().click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Examen no superado|Test not passed/ })).toBeTruthy());
    expect(screen.getByText(/Tres errores|Three mistakes/)).toBeTruthy();
  });

  it("Hoy still matches city/title or the still is dropped", async () => {
    await boot();
    await awaitHome();
    assertEqualHub();
    expect(screen.queryByTestId("hoy-still")).toBeNull();
  });

  it("buries empty level theater, weakness map, and Atajos until earned", async () => {
    localStorage.clear();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lang-toggle")).toBeTruthy());
    await user.click(screen.getByTestId("splash-start"));
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.queryByTestId("atajos")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Atajos: 1–4/);
    expect(screen.queryByText("Principiante")).toBeNull();
    expect(screen.queryByText("Intermedio")).toBeNull();
    expect(screen.queryByText("Intermediate")).toBeNull();

    await user.click(screen.getByTestId("nav-perfil"));
    expect(screen.queryByTestId("level-theater")).toBeNull();
    expect(screen.queryByText("Principiante")).toBeNull();
    expect(screen.queryByText("Intermedio")).toBeNull();
    expect(screen.queryByText("Intermediate")).toBeNull();

    await user.click(screen.getByTestId("nav-practica"));
    expect(screen.queryByTestId("weakness-map")).toBeNull();
    expect(screen.queryByText("Mapa de debilidades")).toBeNull();
    expect(screen.queryByText(/Todavía no hay patrones claros/)).toBeNull();
    expect(screen.getByTestId("practica-fold")).toBeTruthy();
    expect(screen.getByTestId("phrase-doctor")).toBeTruthy();
    expect(screen.getByTestId("safe-risky-start")).toBeTruthy();
    expect(screen.getByTestId("match-pairs-start")).toBeTruthy();

    cleanup();
    seedProgress({ xp: 50, done: { subj1: 1 }, weak: { Subjuntivo: 3 } });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.getByTestId("atajos").textContent).toMatch(/Atajos: 1–4/);
    await userEvent.setup().click(screen.getByTestId("nav-perfil"));
    expect(screen.getByTestId("level-theater").textContent).toMatch(/Intermedio/);
    expect(screen.getByTestId("level-theater").textContent).not.toMatch(/Principiante|beginner/i);
    await userEvent.setup().click(screen.getByTestId("nav-practica"));
    expect(screen.getByTestId("weakness-map")).toBeTruthy();
    expect(screen.getByText("Mapa de debilidades")).toBeTruthy();
  });

  it("Perfil level is Intermedio / Intermediate, never Principiante or beginner", async () => {
    seedProgress({ xp: 50, streak: 1, done: { subj1: 1 } });
    const user = await boot();
    await user.click(screen.getByTestId("nav-perfil"));
    const theater = screen.getByTestId("level-theater");
    expect(theater.textContent).toMatch(/Intermedio/);
    expect(theater.textContent).not.toMatch(/Principiante|beginner/i);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("level-theater").textContent).toMatch(/Intermediate/));
    expect(screen.getByTestId("level-theater").textContent).not.toMatch(/Principiante|beginner/i);
    expect(screen.getByTestId("level-theater").textContent).not.toMatch(/Intermedio/);
  });

  it("cold-open defaults uiLang EN; user can flip ES; skill chips stay Spanish", async () => {
    localStorage.clear();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("lang-es").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("splash-line").textContent).toBe("Real Mexican Spanish. Past the basics.");
    expect(screen.getByTestId("splash-start").textContent).toBe("Start!");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").uiLang).toBe("en");
    });
    await user.click(screen.getByTestId("splash-start"));
    await waitFor(() => expect(screen.queryByTestId("splash")).toBeNull());
    expect(screen.getByRole("button", { name: /Subjuntivo presente/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pretérito vs\. imperfecto/ })).toBeTruthy();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("lang-es").getAttribute("aria-pressed")).toBe("true"));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).uiLang).toBe("es");
    expect(screen.getByRole("button", { name: /Subjuntivo presente/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pretérito vs\. imperfecto/ })).toBeTruthy();
  });

  it("Práctica Smart Practice ES uses locked ronda, not sprint or tanda", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    const cta = screen.getByTestId("smart-practice-cta");
    const reason = screen.getByTestId("smart-practice-reason");
    expect(cta.textContent).toBe("Empezar ronda de 5 — sin vidas");
    expect(cta.textContent).not.toMatch(/sprint|tanda|útil/i);
    expect(reason.textContent).toBe("Tu siguiente ronda.");
    expect(reason.textContent).not.toMatch(/sprint|tanda|útil/i);
    expect(document.body.textContent).toMatch(/PRÁCTICA INTELIGENTE/);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("smart-practice-cta").textContent).toBe("Start 5-item sprint — no hearts"));
    expect(screen.getByTestId("smart-practice-reason").textContent).toBe("Chosen as your next useful sprint.");
    expect(screen.getByTestId("smart-practice-cta").textContent).not.toMatch(/ronda/i);
    expect(document.body.textContent).toMatch(/SMART PRACTICE/);
  });

  it("Phrase Doctor accepts listed formal equivalent before hard fail and shows the word-order tip", async () => {
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true });
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    const guess = screen.getByTestId("phrase-doctor-guess");
    await user.type(guess, "Me dará mucho gusto verlo/la.");
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("word-order-tip")).toBeTruthy());
    expect(screen.getByTestId("word-order-tip").textContent).toBe("Orden distinto, mismo sentido. En formal, ambas valen.");
    expect(screen.getByTestId("phrase-doctor-miss")).toBeTruthy();
    expect(screen.getByTestId("phrase-doctor-guess").value).toBe("Me dará mucho gusto verlo/la.");
    const boardHtml = screen.getByTestId("phrase-doctor-board").innerHTML;
    expect(boardHtml.indexOf("phrase-doctor-miss")).toBeGreaterThan(-1);
    expect(boardHtml.indexOf("word-order-tip")).toBeGreaterThan(boardHtml.indexOf("phrase-doctor-miss"));
    expect(screen.queryByTestId("phrase-doctor-fail")).toBeNull();
    expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/NATURAL/);
    expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/Tengo muchas ganas de verte/);
    expect(screen.queryByTestId("splash")).toBeNull();
    expect(screen.getByTestId("word-order-tip").closest("[data-testid=\"soft-paywall\"]")).toBeNull();
    expect(screen.getByTestId("word-order-tip").style.position).not.toBe("fixed");

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("word-order-tip").textContent).toBe("Different order, same meaning. Formally, both work."));

    const otra = [...screen.getByTestId("phrase-doctor-board").querySelectorAll("button")].find((b) => /Otra|New/.test(b.textContent));
    expect(otra).toBeTruthy();
    await user.click(otra);
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-guess")).toBeTruthy());
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
    await user.type(screen.getByTestId("phrase-doctor-guess"), "Puedo obtener un cafe por favor");
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-fail")).toBeTruthy());
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
    expect(screen.getByTestId("phrase-doctor-board").textContent).not.toMatch(/NATURAL/);
  });

  it("Práctica fold leads with Phrase Doctor, Safe-or-Risky, and Emparejar", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    const fold = screen.getByTestId("practica-fold");
    const ids = [...fold.querySelectorAll("[data-testid]")].map((el) => el.getAttribute("data-testid"));
    expect(ids.filter((id) => ["phrase-doctor", "safe-risky-start", "match-pairs-start"].includes(id)))
      .toEqual(["phrase-doctor", "safe-risky-start", "match-pairs-start"]);
    const html = document.body.innerHTML;
    const foldAt = html.indexOf('data-testid="practica-fold"');
    const smartAt = html.search(/PRÁCTICA INTELIGENTE|SMART PRACTICE/);
    const flashAt = html.indexOf("Tarjetas");
    expect(foldAt).toBeGreaterThan(-1);
    expect(smartAt).toBeGreaterThan(foldAt);
    expect(flashAt).toBeGreaterThan(foldAt);
    expect(screen.getByTestId("phrase-doctor").textContent).toMatch(/Doctora de frases|Phrase Doctor/);
    expect(screen.getByTestId("safe-risky-start").textContent).toMatch(/¿Seguro o riesgoso\?|Safe or Risky\?/);
    expect(screen.getByTestId("match-pairs-start").textContent).toMatch(/Emparejar|Match pairs/);
  });

  it("Safe/Risky hub reward is extra por racha / streak extra, not bonus", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    const reward = screen.getByTestId("safe-risky-reward");
    expect(reward.textContent).toBe("5 rondas · extra por racha · gemas");
    expect(reward.textContent).not.toMatch(/bonus/i);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-reward").textContent).toBe("5 rounds · streak extra · gems"));
    expect(screen.getByTestId("safe-risky-reward").textContent).not.toMatch(/bonus/i);
  });

  it("Lectura narration chrome is NARRACIÓN / NARRATION, not LAB", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("narration-label")).toBeTruthy());
    expect(screen.getByTestId("narration-label").textContent).toBe("NARRACIÓN");
    expect(screen.getByTestId("narration-label").textContent).not.toMatch(/LAB/);
    expect(document.body.textContent).not.toMatch(/LAB DE NARRACIÓN|NARRATION LAB/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("narration-label").textContent).toBe("NARRATION"));
    expect(screen.getByTestId("narration-label").textContent).not.toMatch(/LAB/);
    expect(document.body.textContent).not.toMatch(/LAB DE NARRACIÓN|NARRATION LAB/);
  });

  it("unread Lectura does not lift cerezas / story comprehension into later Hoy", async () => {
    laterHoySeed();
    const user = await boot();
    await startHoyFromHub(user);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const hoyLifts = await collectStoryLifts(user);
    expect(hoyLifts).toEqual([]);
    expect(document.body.textContent).not.toMatch(STORY_LIFT_RE);
    expect(document.body.textContent).not.toMatch(CEREZAS_Q_RE);
  });

  it("unread Lectura does not lift cerezas / story comprehension into rutina", async () => {
    laterHoySeed();
    const user = await boot();
    await openCaminoMore(user);
    await user.click(screen.getByTestId("camino-daily-workout"));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const dailyLifts = await collectStoryLifts(user);
    expect(dailyLifts).toEqual([]);
    expect(document.body.textContent).not.toMatch(STORY_LIFT_RE);
    expect(document.body.textContent).not.toMatch(CEREZAS_Q_RE);
  });

  it("after Lectura claim, that story’s comprehension can lift into rutina", async () => {
    laterHoySeed({ stories: { "story-9": true } });
    const user = await boot();
    await openCaminoMore(user);
    await user.click(screen.getByTestId("camino-daily-workout"));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const lifts = await collectStoryLifts(user);
    expect(lifts.join(" ")).toMatch(/Del cuento/);
    expect(lifts.join(" ")).toMatch(CEREZAS_Q_RE);
  });

  it("Lectura still shows comprehension after the last paragraph (ungated in-reader)", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    expect(document.body.textContent).not.toMatch(CEREZAS_Q_RE);
    await user.click(screen.getByRole("button", { name: "Preguntas" }));
    await waitFor(() => expect(screen.getByText(/¿Por qué se negó a vender toda su cosecha/)).toBeTruthy());
    expect(screen.getByText(/¿Cuánto recibe don Adán por cada kilo/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Volver al cuento|Back to the story/ })).toBeTruthy();
  });

  it("cerezas reading quiz Why + Focus follow uiLang after the refused item", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Preguntas" }));
    await waitFor(() => {
      const prompts = screen.getAllByTestId("story-q-prompt");
      expect(prompts.some((el) => el.textContent.includes("¿Por qué se negó"))).toBe(true);
    });
    const refused = [...document.querySelectorAll(".choice-card")].find((el) =>
      el.textContent.includes("Porque no quería depender de una sola empresa"));
    expect(refused).toBeTruthy();
    await user.click(refused);
    await waitFor(() => expect(screen.getByTestId("story-quiz-why")).toBeTruthy());
    expect(screen.getByTestId("story-quiz-focus").textContent).toBe("Foco: Lectura");
    expect(screen.getByTestId("story-quiz-why").textContent).toBe("El texto dice que la oferta japonesa era premium — «no pagaba bien» no es lo que pasó. Se negó para no depender de un solo comprador. La independencia ganó al mejor cheque.");
    expect(screen.getAllByTestId("story-quiz-why")).toHaveLength(1);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("story-quiz-focus").textContent).toBe("Focus: Reading"));
    expect(screen.getByTestId("story-quiz-why").textContent).toBe("The text says the Japanese offer was premium — so “didn’t pay well” isn’t what happened. He refused so he wouldn’t depend on one buyer. Independence beat the better check.");
  });

  it("Learn hub is equal tiles — Hoy starts the scene, not Subjuntivo Continuar", async () => {
    const user = await boot();
    assertEqualHub();
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/Continuar|Continue|Subjuntivo/);
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    await openCaminoMore(user);
    expect(screen.getByTestId("path-entry").textContent).toMatch(/EMPIEZA|START/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("streak").textContent).toMatch(/0/);
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
    assertEqualHub();
  });

  it("cold open / streak 0 hides Meta, Rayo OFF, and the four-coach strip", async () => {
    cleanup();
    localStorage.clear();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash-start")).toBeTruthy());
    await user.click(screen.getByTestId("splash-start"));
    await awaitHome();
    assertEqualHub();
    expect(screen.getByTestId("camino-more")).toBeTruthy();
    expect(screen.queryByTestId("door-meta")).toBeNull();
    expect(screen.queryByTestId("rayo-toggle")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(screen.queryByText(/¡Hola,/)).toBeNull();
    expect(screen.queryByText("Luna ya tiene tu rutina de hoy.")).toBeNull();
    expect(screen.queryByText("Luna has your daily routine ready.")).toBeNull();
    expect(screen.queryByRole("button", { name: /Rayo|Lightning/ })).toBeNull();
    expect(screen.queryByText(/Meta:|Goal:/)).toBeNull();
    expect(screen.queryByText("Coach del día")).toBeNull();
    expect(screen.queryByText("Daily coach")).toBeNull();
    expect(screen.getByTestId("streak").textContent).toMatch(/0/);

    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    render(<App />);
    await awaitHome();
    assertEqualHub();
    expect(screen.getByTestId("camino-more")).toBeTruthy();
    expect(screen.queryByTestId("door-meta")).toBeNull();
    expect(screen.queryByTestId("rayo-toggle")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(screen.queryByText(/¡Hola,/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Rayo|Lightning/ })).toBeNull();
    expect(screen.queryByText("Coach del día")).toBeNull();
  });

  it("after streak ≥ 1 Meta, Rayo, and coaches return with Vuelve mañana", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 1, lastDay: today, paywallSeen: true });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("door-meta")).toBeTruthy());
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Meta:\s*0\/40/);
    expect(screen.getByTestId("rayo-toggle").textContent).toMatch(/Rayo\s*OFF/);
    expect(screen.getByTestId("coach-strip")).toBeTruthy();
    expect(screen.getByTestId("coach-strip").querySelector("img[src*='valeria-happy.png']")).toBeTruthy();
    expect(screen.getByTestId("coach-strip").querySelector("img[src*='luna-happy.png']")).toBeTruthy();
    expect(screen.getByTestId("coach-strip").querySelector("img[src*='rafa-happy.png']")).toBeTruthy();
    expect(screen.getByTestId("coach-strip").querySelector("img[src*='diego-happy.png']")).toBeTruthy();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(screen.getByText("Coach del día")).toBeTruthy();
    expect(screen.getByText("Mentor de cuentos")).toBeTruthy();
    expect(screen.getByText("Coach de precisión")).toBeTruthy();
    expect(screen.getByText("Rival")).toBeTruthy();
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.queryByTestId("home-pitch")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Español mexicano real\. Más allá de lo básico/);
    assertEqualHub();
    expect(screen.getByTestId("camino-more")).toBeTruthy();
  });

  it("Hoy + Doctora door buries EMPIEZA / Repasar / Rutina diaria under quiet Más / More", async () => {
    cleanup();
    seedProgress({
      srs: { "subj1|0": { ef: 2.5, reps: 1, interval: 1, due: Date.now() - 1000 } },
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("nav-camino").textContent).toBe("Camino");
    expect(screen.getByTestId("camino-more").textContent).toBe("Más");
    expect(screen.getByTestId("camino-more").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("camino-more-panel")).toBeNull();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    expect(screen.queryByTestId("camino-review")).toBeNull();
    expect(screen.queryByTestId("camino-daily-workout")).toBeNull();
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    expect(screen.queryByRole("button", { name: /^EMPIEZA$|^START$/ })).toBeNull();
    expect(screen.queryByTestId("camino-review")).toBeNull();
    expect(screen.queryByRole("button", { name: /Rutina diaria|Daily routine/ })).toBeNull();
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más opciones|See more|More options|Camino extra/);

    await user.click(screen.getByTestId("camino-more"));
    await waitFor(() => expect(screen.getByTestId("camino-more-panel")).toBeTruthy());
    expect(screen.getByTestId("camino-more").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("path-entry").textContent).toBe("EMPIEZA");
    expect(screen.getByTestId("camino-review").textContent).toMatch(/Repasar/);
    expect(screen.getByTestId("camino-daily-workout").textContent).toMatch(/Rutina diaria/);
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    expect(screen.getByTestId("nav-camino").textContent).toBe("Camino");
    expect(screen.getByTestId("camino-more").textContent).toBe("Más");

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("camino-more").textContent).toBe("More"));
    expect(screen.getByTestId("path-entry").textContent).toBe("START");
    expect(screen.getByTestId("camino-review").textContent).toMatch(/Review/);
    expect(screen.getByTestId("camino-daily-workout").textContent).toMatch(/Daily routine/);
    expect(screen.getByTestId("nav-camino").textContent).toBe("Learn");
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más opciones|See more|More options/);
  });

  it("Doctora hero still buries path CTAs under Más; life door stays first", async () => {
    const today = localToday();
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: today,
      paywallSeen: true,
      missions: { [`scene-${today}`]: "taqueria" },
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hub-hoy")).toBeTruthy();
    expect(screen.getByTestId("camino-more").textContent).toBe("Más");
    expect(screen.queryByTestId("path-entry")).toBeNull();
    expect(screen.queryByTestId("camino-daily-workout")).toBeNull();
    await user.click(screen.getByTestId("camino-more"));
    await waitFor(() => expect(screen.getByTestId("path-entry").textContent).toBe("EMPIEZA"));
    expect(screen.getByTestId("camino-daily-workout").textContent).toMatch(/Rutina diaria/);
  });

  it("name field warm line is ¿Cómo te dicen? / What do they call you?", async () => {
    localStorage.clear();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    expect(screen.getByPlaceholderText("What do they call you?")).toBeTruthy();
    expect(screen.queryByPlaceholderText("What should we call you?")).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByPlaceholderText("¿Cómo te dicen?")).toBeTruthy());
    expect(screen.queryByPlaceholderText("¿Cómo te llamamos?")).toBeNull();
  });

  it("landlord Hoy scene keeps title and uses locked casero copy", async () => {
    await boot();
    assertEqualHub();
    const landlord = HOY_TITLES.find((s) => s.title === "WhatsApp del casero");
    expect(landlord.titleEn).toBe("Landlord WhatsApp");
  });

  it("return door with streak ≥ 1: Hoy CTA if scene open, Doctora if Hoy done — never Subjuntivo Continuar", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 1, lastDay: today, paywallSeen: true });
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Continue|Subjuntivo|Phrase Doctor|Arreglar una frase/);
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    await openCaminoMore(userEvent.setup());
    expect(screen.getByTestId("path-entry").textContent).toMatch(/EMPIEZA|START/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/«.+»/);

    cleanup();
    seedProgress({
      streak: 1,
      lastDay: today,
      paywallSeen: true,
      missions: { [`scene-${today}`]: "taqueria" },
    });
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Continue|Subjuntivo|Phrase Doctor|Jugar la escena/);
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    await openCaminoMore(userEvent.setup());
    expect(screen.getByTestId("path-entry").textContent).toMatch(/EMPIEZA|START/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
  });

  it("day-2 return with streak ≥ 1 opens the promised Hoy as the hero CTA", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    const promised = hoySceneForDay(HOY_TITLES, today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "taqueria" },
    });
    render(<App />);
    await awaitHome();
    assertEqualHub();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/Continuar|Continue|Subjuntivo|Arreglar una frase|Fix a phrase/);
    expect(promised.title).toBeTruthy();
    expect(screen.queryByTestId("home-pitch")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Español mexicano real\. Más allá de lo básico/);
    expect(document.body.textContent).not.toMatch(/Real Mexican Spanish\. Past the basics/);
    expect(screen.queryByTestId("first-door-title")).toBeNull();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Ya empezó tu racha|Your streak just started/);
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    await openCaminoMore(userEvent.setup());
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
  });

  it("day-2 return Hoy wins early (≤4 beats) with ¡Eso! / That's it.", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "taqueria" },
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    await user.click(screen.getByTestId("lang-es"));
    await startHoyFromHub(user);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const liveShort = JSON.parse(localStorage.getItem(LIVE_KEY));
    expect(liveShort.session.firstHoy).toBe(true);
    expect(liveShort.session.questions.length).toBeLessThanOrEqual(4);
    expect(liveShort.session.questions.length).toBeGreaterThan(0);
    await clickHoySceneMc(user);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win")).toBeTruthy());
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Ganaste!|You won!/);
    expect(document.body.textContent).not.toMatch(/¡IMPECABLE!|FLAWLESS!/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("That's it."));
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /You won!|¡Ganaste!|Lesson complete/ })).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitCdmxFlashThenIdle();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
  });

  it("day-2 live Hoy does not park under Más — scenes are already ≤4", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    const promised = hoySceneForDay(HOY_TITLES, today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "taqueria" },
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    await openCaminoMore(user);
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    expect(screen.getByTestId("camino-more-panel")).toBeTruthy();
    expect(promised.title).toMatch(/WhatsApp del casero|Mostrador en caos|Noche de faroles|Cena con la suegra|En la farmacia|WhatsApp del plomero|WhatsApp del vecino|En la calle|Cita en el banco/);
  });

  it("undismissed soft paywall clears when the day rolls — no stale Doctora handoff", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 8, 4, 23, 50, 0));
    try {
      cleanup();
      seedProgress({ streak: 1, lastDay: "2026-09-04", paywallSeen: false });
      render(<App />);
      await awaitSoftPaywallAfterFirstWin();
      expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);

      vi.setSystemTime(new Date(2026, 8, 5, 0, 1, 0));
      await vi.advanceTimersByTimeAsync(30000);
      await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
      expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);
      expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
      expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
      expect(screen.queryByTestId("first-door-title")).toBeNull();
      expect(document.body.textContent).not.toMatch(/Ya empezó tu racha|Your streak just started/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("day-2 return does not re-show soft paywall when paywallSeen", async () => {
    const yesterday = prevDayKey(localToday());
    cleanup();
    seedProgress({ streak: 1, lastDay: yesterday, paywallSeen: true });
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Ya empezó tu racha|Your streak just started/);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
  });

  it("tomorrow teaser is inert — plain text, not a button and not clickable", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 1, lastDay: today, paywallSeen: true });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow")).toBeTruthy());
    const teaser = screen.getByTestId("come-back-tomorrow");
    expect(teaser.textContent).toBe(expectedComeBack("es"));
    expect(teaser.textContent).toMatch(/^Vuelve mañana por «.+»\.$/);
    expect(teaser.textContent).not.toBe("Vuelve mañana por la siguiente escena.");
    expect(screen.queryByTestId("home-pitch")).toBeNull();
    expect(teaser.tagName).toBe("P");
    expect(teaser.tagName).not.toBe("BUTTON");
    expect(teaser.tagName).not.toBe("A");
    expect(teaser.getAttribute("role")).not.toBe("button");
    expect(teaser.getAttribute("href")).toBeNull();
    expect(teaser.closest("button")).toBeNull();
    expect(teaser.closest("a")).toBeNull();
    expect(teaser.closest("[data-testid='first-door-hero']")).toBeNull();
    expect(screen.queryByRole("button", { name: /Vuelve mañana|Come back tomorrow/ })).toBeNull();
    expect(window.getComputedStyle(teaser).cursor).not.toBe("pointer");
    expect(window.getComputedStyle(teaser).pointerEvents).toBe("none");
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);

    fireEvent.click(teaser);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("nav-camino")).toBeTruthy();
    expect(screen.getByTestId("hero-cta")).toBeTruthy();
    expect(screen.queryByTestId("lesson-exit")).toBeNull();
    expect(screen.queryByTestId("phrase-doctor-board")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("splash")).toBeNull();

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("en")));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Come back tomorrow for “.+”\.$/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).not.toBe("Come back tomorrow for the next scene.");
    expect(screen.queryByRole("button", { name: /Vuelve mañana|Come back tomorrow/ })).toBeNull();
    expect(screen.getByTestId("come-back-tomorrow").closest("[data-testid='first-door-hero']")).toBeNull();
  });

  it("first win shows streak 1 and the vuelve mañana home line", async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        firstHoy: true,
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
          hoyMc("beat 3 must not run — early checkpoint"),
          hoyMc("beat 4 must not run — early checkpoint"),
          hoyMc("beat 5 must not run — later Hoy only"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(document.body.textContent).toMatch(/Si el taquero pregunta/);
    expect(document.body.textContent).not.toMatch(/beat 2 must not run/);
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => {
      expect(screen.getByTestId("hoy-win")).toBeTruthy();
      expect(screen.getByTestId("win-bounce")).toBeTruthy();
    });
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    expect(screen.getByTestId("win-bounce-bird").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("win-bounce-chip")).toBeTruthy();
    expect(screen.getByTestId("win-perch-slot")).toBeTruthy();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Ganaste!|You won!/);
    expect(document.body.textContent).not.toMatch(/¡IMPECABLE!|FLAWLESS!/);
    expect(document.body.textContent).not.toMatch(/beat 2 must not run|beat 5 must not run/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("That's it."));
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /You won!|¡Ganaste!|Lesson complete/ })).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    await waitFor(() => {
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.streak).toBe(1);
      expect(prog.lastDay).toBe(today);
      expect(prog.missions[`scene-${today}`]).toBe("taqueria");
    });
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitBajioFlashThenPaywall();
    await awaitHome();
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Vuelve mañana por «.+»\.$/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).not.toBe("Vuelve mañana por la siguiente escena.");
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Ya empezó tu racha.");
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Meta:\s*\d+\/40/);
    expect(screen.getByTestId("rayo-toggle")).toBeTruthy();
    expect(screen.getByTestId("coach-strip")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.queryByTestId("first-door-hero")).toBeNull();
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/Continuar|Subjuntivo/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("en")));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Come back tomorrow for “.+”\.$/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).not.toBe("Come back tomorrow for the next scene.");
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
  });

  it("bank Hoy first-win That's it. plays the Cenzontle bounce, not avatars + confetti", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["claro y práctico"],
      answer: "claro y práctico",
      shuffledChoices: ["claro y práctico"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Cita en el banco",
        unitId: "_today:tramites-cita",
        todaySceneId: "tramites-cita",
        firstHoy: true,
        host: "luna",
        questions: [
          hoyMc("En WhatsApp con el banco, «Quiero agendar una cita para abrir una cuenta» suena:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(document.body.textContent).toMatch(/Cita en el banco|agendar una cita/);
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => {
      expect(screen.getByTestId("hoy-win")).toBeTruthy();
      expect(screen.getByTestId("win-bounce")).toBeTruthy();
    });
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    expect(screen.getByTestId("win-bounce-bird").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("win-bounce-chip")).toBeTruthy();
    expect(screen.getByTestId("win-perch-slot")).toBeTruthy();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    await waitFor(() => {
      expect(screen.getByTestId("win-perch-bird").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
      expect(screen.getByTestId("win-perch-chip")).toBeTruthy();
    }, { timeout: 1500 });
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("That's it."));
  });

  it("cold first Hoy CONTINUE shows soft paywall once before idle home", async () => {
    cleanup();
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash-start")).toBeTruthy());
    await user.click(screen.getByTestId("splash-start"));
    await awaitHome();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await startHoyFromHub(user);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await clickHoySceneMc(user);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitBajioFlashThenPaywall();
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Ya empezó tu racha.");
    assertSoftPaywallAnnualPrimary("es");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("come-back-tomorrow")).toBeTruthy();
    cleanup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
  });

  it("first streak-1 Eso shows Bajío unlock flash once, then existing paywall", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    const seedFirstHoyLive = () => {
      localStorage.setItem(LIVE_KEY, JSON.stringify({
        screen: "lesson",
        tab: "camino",
        status: "idle",
        qi: 0,
        lessonStats: { right: 0, wrong: 0 },
        session: {
          title: "Noche de faroles",
          unitId: "_today:taqueria",
          todaySceneId: "taqueria",
          firstHoy: true,
          host: "luna",
          questions: [
            hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
            hoyMc("beat 2 must not run — early checkpoint"),
          ],
        },
      }));
    };
    seedFirstHoyLive();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await waitFor(() => expect(screen.getByTestId("bajio-unlock-flash")).toBeTruthy());
    const flash = screen.getByTestId("bajio-unlock-flash");
    expect(screen.getByTestId("bajio-unlock-flash-copy").textContent).toBe("Abierto");
    expect(flash.textContent.trim()).toBe("Abierto");
    expect(flash.textContent).not.toMatch(/Bajío|¡Sigue explorando!|Sigue explorando/);
    expect(screen.getByTestId("bajio-unlock-flash-glow").className).toMatch(/bajio-glow/);
    expect(recuerdosSurfaceHasCuts(flash.textContent)).toBe(false);
    expect(recuerdosHasProgressFraction(flash.textContent)).toBe(false);
    expect(flash.textContent).not.toMatch(/¡Sigue explorando!|12\/25|backpack/i);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).toBe(true);
    expect(isBajioUnlockFlashDue()).toBe(true);
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy(), { timeout: 3000 });
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Ya empezó tu racha.");

    cleanup();
    seedProgress({ streak: 0, lastDay: null, bajioUnlockSeen: true, paywallSeen: false });
    seedFirstHoyLive();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const replay = userEvent.setup();
    await replay.click(document.querySelectorAll(".choice-card")[0]);
    await replay.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await replay.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win")).toBeTruthy());
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    await replay.click(screen.getByTestId("hoy-win-continue"));
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    assertSoftPaywallAnnualPrimary("es");
  });

  it("CONTINUE after first streak-1 Eso cannot skip the Bajío flash onto the paywall", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 8, 8, 12, 0, 0));
    try {
      cleanup();
      localStorage.clear();
      markBajioUnlockFlashDue(false);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <StrictMode>
          <App />
        </StrictMode>
      );
      await waitFor(() => expect(screen.getByTestId("splash-start")).toBeTruthy());
      await user.click(screen.getByTestId("splash-start"));
      await awaitHome();
      await user.click(screen.getByTestId("lang-es"));
      await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
      await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
      await startHoyFromHub(user);
      await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
      const choice = [...document.querySelectorAll(".choice-card")].find((el) =>
        el.textContent.includes("natural y firme"));
      expect(choice).toBeTruthy();
      await user.click(choice);
      await user.click(screen.getByTestId("lesson-check"));
      await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
      await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
      await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
      expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
      expect(screen.queryByTestId("soft-paywall")).toBeNull();
      await user.click(screen.getByTestId("hoy-win-continue"));
      await awaitBajioFlashThenPaywall();
      expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Ya empezó tu racha.");
      assertSoftPaywallAnnualPrimary("es");
    } finally {
      vi.useRealTimers();
    }
  });

  it("Landlord WhatsApp first streak-1 CONTINUE shows Abierto before paywall", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const landlordMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["natural y firme"],
      answer: "natural y firme",
      shuffledChoices: ["natural y firme"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "WhatsApp del casero",
        unitId: "_today:landlord",
        todaySceneId: "landlord",
        firstHoy: true,
        host: "valeria",
        questions: [
          landlordMc("En WhatsApp con el casero, «Oye, ¿el depósito cuenta…?» suena:"),
          landlordMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(document.body.textContent).toMatch(/WhatsApp del casero|depósito cuenta/);
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitBajioFlashThenPaywall();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Ya empezó tu racha.");
    assertSoftPaywallAnnualPrimary("es");
  });

  it("remount after first Eso CONTINUE still plays Bajío flash before paywall", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        firstHoy: true,
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win-continue")).toBeTruthy());
    await user.click(screen.getByTestId("hoy-win-continue"));
    await waitFor(() => expect(isBajioUnlockFlashDue() || screen.queryByTestId("bajio-unlock-flash")).toBeTruthy());
    const saved = localStorage.getItem(STORAGE_KEY);
    cleanup();
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("bajio-unlock-flash")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("bajio-unlock-flash-copy").textContent).toBe("Abierto");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy(), { timeout: 3000 });
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  });

  it("day-2 Hoy Eso CONTINUE shows CDMX Abierto before idle — not paywall", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "landlord" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["contraste"],
      answer: "contraste",
      shuffledChoices: ["contraste"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Mostrador en caos",
        unitId: "_today:airport",
        todaySceneId: "airport",
        firstHoy: true,
        day2Hoy: true,
        host: "luna",
        questions: [
          hoyMc("«Mostrador» frente a «ventanilla» en el aeropuerto marca:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("session-close")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitCdmxFlashThenIdle();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-pin-cdmx")).toBeTruthy());
    expect(screen.getByTestId("recuerdos-pin-cdmx").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Abierto/);
    expect(screen.queryByTestId("recuerdos-fog-cdmx")).toBeNull();
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").getAttribute("data-open")).toBe("false");
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").getAttribute("data-open")).toBe("false");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
  });

  it("CONTINUE after day-2 Hoy Eso cannot skip the CDMX flash onto idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "taqueria" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["contraste"],
      answer: "contraste",
      shuffledChoices: ["contraste"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Mostrador en caos",
        unitId: "_today:airport",
        todaySceneId: "airport",
        host: "luna",
        questions: [
          hoyMc("«Mostrador» frente a «ventanilla» en el aeropuerto marca:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitCdmxFlashVisible();
    expect(isCdmxUnlockFlashDue()).toBe(true);
    expect(screen.queryByTestId("hero-cta") && !screen.queryByTestId("cdmx-unlock-flash")).toBeFalsy();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await awaitCdmxFlashThenIdle();
  });

  it("official walk day-2 Hoy CONTINUE shows CDMX glow before idle — StrictMode", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 8, 8, 12, 0, 0));
    try {
      cleanup();
      localStorage.clear();
      markBajioUnlockFlashDue(false);
      markCdmxUnlockFlashDue(false);
      markOaxacaUnlockFlashDue(false);
      markYucatanUnlockFlashDue(false);
      markNorteUnlockFlashDue(false);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { unmount } = render(
        <StrictMode>
          <App />
        </StrictMode>
      );
      await waitFor(() => expect(screen.getByTestId("splash-start")).toBeTruthy());
      await user.click(screen.getByTestId("splash-start"));
      await awaitHome();
      await user.click(screen.getByTestId("lang-es"));
      await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
      await startHoyFromHub(user);
      await playShortHoyBeat(user, "natural y firme");
      await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
      await user.click(screen.getByTestId("hoy-win-continue"));
      await awaitBajioFlashThenPaywall();
      await user.click(screen.getByTestId("soft-paywall-dismiss"));
      await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
      const saved = localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(saved).bajioUnlockSeen).toBe(true);
      expect(JSON.parse(saved).paywallSeen).toBe(true);
      expect(JSON.parse(saved).cdmxUnlockSeen).not.toBe(true);
      expect(JSON.parse(saved).oaxacaUnlockSeen).not.toBe(true);
      expect(JSON.parse(saved).yucatanUnlockSeen).not.toBe(true);
      expect(JSON.parse(saved).norteUnlockSeen).not.toBe(true);
      unmount();
      markBajioUnlockFlashDue(false);
      markCdmxUnlockFlashDue(false);
      markOaxacaUnlockFlashDue(false);
      markYucatanUnlockFlashDue(false);
      markNorteUnlockFlashDue(false);
      vi.setSystemTime(new Date(2026, 8, 9, 12, 0, 0));
      localStorage.setItem(STORAGE_KEY, saved);
      localStorage.removeItem(LIVE_KEY);
      const day2 = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <StrictMode>
          <App />
        </StrictMode>
      );
      await awaitHome();
      await day2.click(screen.getByTestId("lang-es"));
      await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
      expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
      await startHoyFromHub(day2);
      await playShortHoyBeat(day2, "contraste");
      await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
      expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
      expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
      await day2.click(screen.getByTestId("hoy-win-continue"));
      await awaitCdmxFlashVisible();
      expect(screen.queryByTestId("soft-paywall")).toBeNull();
      expect(screen.queryByTestId("session-close")).toBeNull();
      await awaitCdmxFlashThenIdle();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(2);
      expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^2/);
      expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
      expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  }, 15000);

  it("remount after day-2 Hoy CONTINUE still plays CDMX flash before idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "landlord" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["contraste"],
      answer: "contraste",
      shuffledChoices: ["contraste"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Mostrador en caos",
        unitId: "_today:airport",
        todaySceneId: "airport",
        firstHoy: true,
        day2Hoy: true,
        host: "luna",
        questions: [
          hoyMc("«Mostrador» frente a «ventanilla» en el aeropuerto marca:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win-continue")).toBeTruthy());
    await user.click(screen.getByTestId("hoy-win-continue"));
    await waitFor(() => expect(isCdmxUnlockFlashDue() || screen.queryByTestId("cdmx-unlock-flash")).toBeTruthy());
    const saved = localStorage.getItem(STORAGE_KEY);
    cleanup();
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    await awaitCdmxFlashVisible();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("cdmx-unlock-flash-copy").textContent).toBe("Abierto");
    await waitFor(() => expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull(), { timeout: 3000 });
    await awaitHome();
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
  });

  it("streak-3 Hoy Eso CONTINUE shows Oaxaca Abierto before idle — not paywall", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 2,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "airport" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["habla de un momento futuro"],
      answer: "habla de un momento futuro",
      shuffledChoices: ["habla de un momento futuro"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Cena con la suegra",
        unitId: "_today:family",
        todaySceneId: "family",
        firstHoy: true,
        day2Hoy: true,
        host: "rafa",
        questions: [
          hoyMc("En «Cuando llegue el momento…», usamos subjuntivo porque:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("session-close")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitOaxacaFlashThenIdle();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-pin-oaxaca")).toBeTruthy());
    expect(screen.getByTestId("recuerdos-pin-oaxaca").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Abierto/);
    expect(screen.queryByTestId("recuerdos-fog-oaxaca")).toBeNull();
    expect(screen.getByTestId("recuerdos-pin-cdmx").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").getAttribute("data-open")).toBe("false");
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-norte").getAttribute("data-open")).toBe("false");
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Cerrado/);
  });

  it("CONTINUE after streak-3 Hoy Eso cannot skip the Oaxaca flash onto idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 2,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "airport" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["habla de un momento futuro"],
      answer: "habla de un momento futuro",
      shuffledChoices: ["habla de un momento futuro"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Cena con la suegra",
        unitId: "_today:family",
        todaySceneId: "family",
        host: "rafa",
        questions: [
          hoyMc("En «Cuando llegue el momento…», usamos subjuntivo porque:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitOaxacaFlashVisible();
    expect(isOaxacaUnlockFlashDue()).toBe(true);
    expect(screen.queryByTestId("hero-cta") && !screen.queryByTestId("oaxaca-unlock-flash")).toBeFalsy();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await awaitOaxacaFlashThenIdle();
  });

  it("remount after streak-3 Hoy CONTINUE still plays Oaxaca flash before idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 2,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "airport" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["habla de un momento futuro"],
      answer: "habla de un momento futuro",
      shuffledChoices: ["habla de un momento futuro"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Cena con la suegra",
        unitId: "_today:family",
        todaySceneId: "family",
        firstHoy: true,
        day2Hoy: true,
        host: "rafa",
        questions: [
          hoyMc("En «Cuando llegue el momento…», usamos subjuntivo porque:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win-continue")).toBeTruthy());
    await user.click(screen.getByTestId("hoy-win-continue"));
    await waitFor(() => expect(isOaxacaUnlockFlashDue() || screen.queryByTestId("oaxaca-unlock-flash")).toBeTruthy());
    const saved = localStorage.getItem(STORAGE_KEY);
    cleanup();
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    await awaitOaxacaFlashVisible();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("oaxaca-unlock-flash-copy").textContent).toBe("Abierto");
    await waitFor(() => expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull(), { timeout: 3000 });
    await awaitHome();
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
  });

  it("streak-4 Hoy Eso CONTINUE shows Yucatán Abierto before idle — not paywall", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 3,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      oaxacaUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "family" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        firstHoy: true,
        day2Hoy: true,
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("session-close")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitYucatanFlashThenIdle();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-pin-yucatan")).toBeTruthy());
    expect(screen.getByTestId("recuerdos-pin-yucatan").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Yucatán/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Abierto/);
    expect(screen.queryByTestId("recuerdos-fog-yucatan")).toBeNull();
    expect(screen.getByTestId("recuerdos-pin-oaxaca").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-cdmx").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-norte").getAttribute("data-open")).toBe("false");
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Cerrado/);
  });

  it("CONTINUE after streak-4 Hoy Eso cannot skip the Yucatán flash onto idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 3,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      oaxacaUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "family" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitYucatanFlashVisible();
    expect(isYucatanUnlockFlashDue()).toBe(true);
    expect(screen.queryByTestId("hero-cta") && !screen.queryByTestId("yucatan-unlock-flash")).toBeFalsy();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await awaitYucatanFlashThenIdle();
  });

  it("remount after streak-4 Hoy CONTINUE still plays Yucatán flash before idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 3,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      oaxacaUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "family" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        firstHoy: true,
        day2Hoy: true,
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win-continue")).toBeTruthy());
    await user.click(screen.getByTestId("hoy-win-continue"));
    await waitFor(() => expect(isYucatanUnlockFlashDue() || screen.queryByTestId("yucatan-unlock-flash")).toBeTruthy());
    const saved = localStorage.getItem(STORAGE_KEY);
    cleanup();
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    await awaitYucatanFlashVisible();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("yucatan-unlock-flash-copy").textContent).toBe("Abierto");
    await waitFor(() => expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull(), { timeout: 3000 });
    await awaitHome();
    expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
  });

  it("streak-5 Hoy Eso CONTINUE shows Norte Abierto before idle — not paywall", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 4,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      oaxacaUnlockSeen: true,
      yucatanUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "family" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        firstHoy: true,
        day2Hoy: true,
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("session-close")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitNorteFlashThenIdle();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-pin-norte")).toBeTruthy());
    expect(screen.getByTestId("recuerdos-pin-norte").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Norte/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Abierto/);
    expect(screen.queryByTestId("recuerdos-fog-norte")).toBeNull();
    expect(screen.getByTestId("recuerdos-pin-yucatan").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-cdmx").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Abierto/);
  });

  it("CONTINUE after streak-5 Hoy Eso cannot skip the Norte flash onto idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 4,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      oaxacaUnlockSeen: true,
      yucatanUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "family" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitNorteFlashVisible();
    expect(isNorteUnlockFlashDue()).toBe(true);
    expect(screen.queryByTestId("hero-cta") && !screen.queryByTestId("norte-unlock-flash")).toBeFalsy();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await awaitNorteFlashThenIdle();
  });

  it("remount after streak-5 Hoy CONTINUE still plays Norte flash before idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 4,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      oaxacaUnlockSeen: true,
      yucatanUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "family" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        firstHoy: true,
        day2Hoy: true,
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win-continue")).toBeTruthy());
    await user.click(screen.getByTestId("hoy-win-continue"));
    await waitFor(() => expect(isNorteUnlockFlashDue() || screen.queryByTestId("norte-unlock-flash")).toBeTruthy());
    const saved = localStorage.getItem(STORAGE_KEY);
    cleanup();
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    await awaitNorteFlashVisible();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("norte-unlock-flash-copy").textContent).toBe("Abierto");
    await waitFor(() => expect(screen.queryByTestId("norte-unlock-flash")).toBeNull(), { timeout: 3000 });
    await awaitHome();
    expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).toBe(true);
  });

  it("Landlord WhatsApp first streak-1 CONTINUE still shows Bajío before paywall, not CDMX", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const landlordMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["natural y firme"],
      answer: "natural y firme",
      shuffledChoices: ["natural y firme"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "WhatsApp del casero",
        unitId: "_today:landlord",
        todaySceneId: "landlord",
        firstHoy: true,
        host: "valeria",
        questions: [
          landlordMc("En WhatsApp con el casero, «Oye, ¿el depósito cuenta…?» suena:"),
          landlordMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitBajioFlashThenPaywall();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Ya empezó tu racha.");
    assertSoftPaywallAnnualPrimary("es");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
  });

  it("first streak-1 win CONTINUE dismiss free lands on Doctora CTA, not idle home", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        firstHoy: true,
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win-continue")).toBeTruthy());
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitBajioFlashThenPaywall();
    expect(screen.getByTestId("soft-paywall-dismiss").textContent).toBe("Seguir gratis por ahora");
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    const handoff = screen.getByTestId("post-dismiss-handoff");
    expect(handoff).toBeTruthy();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(handoff.textContent).not.toMatch(/Phrase Doctor/);
    expect(screen.queryByTestId("phrase-doctor-board")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/));
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    await user.click(screen.getByTestId("hub-phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
  });

  it("later Hoy keeps full depth — no early checkpoint after one hit", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 1, lastDay: today, paywallSeen: true });
    const laterMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["contraste"],
      answer: "contraste",
      shuffledChoices: ["contraste"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Mostrador en caos",
        unitId: "_today:airport",
        todaySceneId: "airport",
        firstHoy: false,
        host: "diego",
        questions: [
          laterMc("«Sin embargo» introduce:"),
          laterMc("later Hoy beat 2"),
          laterMc("later Hoy beat 3"),
          laterMc("later Hoy beat 4"),
          laterMc("later Hoy beat 5"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(document.body.textContent).toMatch(/«Sin embargo» introduce/);
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.queryByTestId("hoy-win")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
    expect(document.body.textContent).toMatch(/later Hoy beat 2/);
    expect(document.body.textContent).not.toMatch(/¡Eso!|That's it\./);
  });

  it("first-session Doctora wins early (≤4 beats) with ¡Eso! / That's it.", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("first-door-alt")).toBeTruthy());
    await user.click(screen.getByTestId("lang-es"));
    await user.click(screen.getByTestId("first-door-alt"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(document.body.textContent).toMatch(/¿Puedo obtener un café\?/);
    expect(document.body.textContent).not.toMatch(/Necesito hacer una decisión|Voy a aplicar para el trabajo/);
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/NATURAL/));
    expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/¿Me da un café/);
    expect(screen.queryByTestId("doctora-win")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => {
      expect(screen.getByTestId("doctora-win")).toBeTruthy();
      expect(screen.getByTestId("win-bounce")).toBeTruthy();
    });
    expect(screen.getByTestId("doctora-win").textContent).toBe("¡Eso!");
    expect(screen.getByTestId("win-bounce-bird").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("win-perch-slot")).toBeTruthy();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Ganaste!|You won!/);
    expect(document.body.textContent).not.toMatch(/¡IMPECABLE!|FLAWLESS!/);
    expect(document.body.textContent).not.toMatch(/Necesito hacer una decisión|Voy a aplicar para el trabajo|beat 5/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("doctora-win").textContent).toBe("That's it."));
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /You won!|¡Ganaste!|Lesson complete/ })).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("doctora-win").textContent).toBe("¡Eso!"));
    await user.click(screen.getByTestId("doctora-win-continue"));
    await waitFor(() => expect(screen.getByTestId("session-close")).toBeTruthy());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).lastDay).toBe(today);
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("session-close-dismiss").textContent).toBe("Listo");
    expect(screen.queryByTestId("camino-more")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    expect(screen.queryByTestId("door-meta")).toBeNull();
    expect(screen.queryByTestId("hero-cta")).toBeNull();
    expect(screen.queryByTestId("first-door-hero")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("session-close-dismiss"));
    await awaitBajioFlashThenPaywall();
    await awaitHome();
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Ya empezó tu racha.");
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    const handoff = screen.getByTestId("post-dismiss-handoff");
    expect(handoff).toBeTruthy();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Jugar la escena|Continuar|Subjuntivo/);
    expect(handoff.textContent).not.toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hub-phrase-doctor")).toBeTruthy();
    expect(screen.getByTestId("hub-hoy")).toBeTruthy();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/));
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
  });

  it("first-session Doctora win lands on come-back card only — streak + teaser + Listo/Done", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("first-door-alt")).toBeTruthy());
    await user.click(screen.getByTestId("lang-es"));
    await user.click(screen.getByTestId("first-door-alt"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-fix").textContent).toMatch(/Continuar|Continue/));
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("doctora-win")).toBeTruthy());
    expect(screen.getByTestId("doctora-win").textContent).toBe("¡Eso!");
    await user.click(screen.getByTestId("doctora-win-continue"));
    await waitFor(() => expect(screen.getByTestId("session-close")).toBeTruthy());
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("come-back-tomorrow").tagName).toBe("P");
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Vuelve mañana por «.+»\.$/);
    expect(screen.getByTestId("session-close-dismiss").textContent).toBe("Listo");
    expect(screen.getByTestId("session-close-dismiss").textContent).not.toMatch(/Cerrar|Continuar|Ya está|Vale|Close|Continue|All set|Ready/);
    expect(screen.queryByRole("button", { name: /Cerrar|Continuar|Ya está|Close|Continue|All set/ })).toBeNull();
    expect(screen.queryByTestId("nav-camino")).toBeNull();
    expect(screen.queryByTestId("camino-more")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    expect(screen.queryByTestId("door-meta")).toBeNull();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(screen.queryByTestId("first-door-hero")).toBeNull();
    expect(screen.queryByTestId("hero-cta")).toBeNull();
    expect(screen.queryByRole("button", { name: /Vuelve mañana|Come back tomorrow/ })).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("session-close-dismiss").textContent).toBe("Done"));
    expect(screen.getByTestId("session-close-dismiss").textContent).not.toMatch(/Close|Continue|All set|Ready|Cerrar|Listo/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("en"));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Come back tomorrow for “.+”\.$/);
    expect(screen.queryByTestId("camino-more")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
  });

  it("later Doctora does not early-exit after beat 1", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-practica")).toBeTruthy());
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(document.body.textContent).toMatch(/Estoy emocionado para verte/);
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/NATURAL/));
    expect(screen.queryByTestId("doctora-win")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Eso!|That's it\./);
    const otra = [...screen.getByTestId("phrase-doctor-board").querySelectorAll("button")].find((b) => /Otra|New/.test(b.textContent));
    expect(otra).toBeTruthy();
    await user.click(otra);
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-guess")).toBeTruthy());
    expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/¿Puedo obtener un café\?/);
    expect(screen.queryByTestId("doctora-win")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
  });

  it("soft paywall does not render on splash or boot before a win", async () => {
    cleanup();
    localStorage.clear();
    render(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: /¡Empezar!|Start!/ })).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Ya empezó tu racha|Your streak just started/);
    expect(document.body.textContent).not.toMatch(/Orden distinto, mismo sentido|Different order, same meaning/);

    cleanup();
    localStorage.clear();
    seedProgress({ streak: 0, lastDay: null });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
  });

  it("soft paywall after first Phrase Doctor win: vuelve first, then once, dismiss stays free", async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    cleanup();
    seedProgress({ streak: 0, lastDay: null, xp: 0 });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();

    await user.click(screen.getByTestId("first-door-alt"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-fix").textContent).toMatch(/Continuar|Continue/));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("doctora-win")).toBeTruthy());
    expect(screen.getByTestId("doctora-win").textContent).toBe("¡Eso!");
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("doctora-win-continue"));
    await waitFor(() => expect(screen.getByTestId("session-close")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("session-close-dismiss"));
    await awaitBajioFlashThenPaywall();
    await waitFor(() => {
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.streak).toBe(1);
      expect(prog.lastDay).toBe(today);
    });
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Ya empezó tu racha.");
    expect(screen.getByTestId("soft-paywall-body").textContent).toBe("Camino completo: escenas, Doctora de frases, cuentos. Mexicano real, más allá de lo básico.");
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.getByTestId("soft-paywall").textContent).not.toMatch(/Orden distinto, mismo sentido|Different order, same meaning/);
    expect(screen.getByTestId("soft-paywall").querySelector("[data-testid=\"word-order-tip\"]")).toBeNull();

    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);

    await user.click(screen.getByTestId("nav-camino"));
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es")));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hero-cta")).toBeTruthy();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Subjuntivo/);
    expect(screen.getByTestId("hub-hoy")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor")).toBeTruthy();

    cleanup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
  });

  it("soft paywall EN strings after first-win state; annual CTA is local-only", async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: today });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("en")));
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Your streak just started.");
    expect(screen.getByTestId("soft-paywall-body").textContent).toBe("Full path: scenes, Phrase Doctor, stories. Real Mexican Spanish past the basics.");
    assertSoftPaywallAnnualPrimary("en");

    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.paywallSeen).toBe(true);
    expect(stored.paywallPlan).toBe("annual");
    expect(stored.unlockedPrem).toBe(true);
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.getByTestId("come-back-tomorrow")).toBeTruthy();
    expect(screen.getByTestId("hero-cta")).toBeTruthy();
  });

  it("soft paywall yearly is sole filled primary; monthly is quiet text", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday() });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.getByTestId("soft-paywall-honesty").textContent).toBe("Práctica · sin cobro todavía");
    expect(screen.getByTestId("soft-paywall-dismiss").textContent).toBe("Seguir gratis por ahora");
  });

  it("armed soft-paywall backdrop free-dismiss lands on post-dismiss-handoff", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 1, lastDay: today });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 450));
    fireEvent.click(screen.getByTestId("soft-paywall"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
  });

  it("A2HS after iOS Safari free dismiss sits on Doctora handoff — once, locked copy", async () => {
    const today = localToday();
    cleanup();
    mockA2hsEnv();
    seedProgress({ streak: 1, lastDay: today });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("a2hs-sheet")).toBeTruthy();
    expect(screen.getByTestId("a2hs-title").textContent).toBe("Agrega Ándale a tu pantalla de inicio");
    expect(screen.getByTestId("a2hs-how").textContent).toBe("Toca Compartir, luego «Agregar a pantalla de inicio».");
    expect(screen.getByTestId("a2hs-dismiss").textContent).toBe("Ahora no");
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).a2hsSeen).toBe(true);
    expect(document.body.textContent).not.toMatch(/Ya empezó tu racha/);
    expect(screen.getByTestId("a2hs-sheet").textContent).not.toMatch(/\$39\.99|\$6\.99/);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("a2hs-title").textContent).toBe("Add Ándale to your Home Screen"));
    expect(screen.getByTestId("a2hs-how").textContent).toBe("Tap Share, then Add to Home Screen.");
    expect(screen.getByTestId("a2hs-dismiss").textContent).toBe("Not now");
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);

    await user.click(screen.getByTestId("a2hs-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("a2hs-sheet")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(/Phrase Doctor/);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();

    cleanup();
    mockA2hsEnv();
    render(<App />);
    await awaitHome();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).a2hsSeen).toBe(true);
  });

  it("A2HS skips non-iOS Safari, standalone, seen flag, and price-plan dismiss", async () => {
    const today = localToday();
    const user = userEvent.setup();

    cleanup();
    mockA2hsEnv({ userAgent: JSDOM_UA, standalone: false });
    seedProgress({ streak: 1, lastDay: today });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).a2hsSeen).not.toBe(true);

    cleanup();
    mockA2hsEnv({ standalone: true });
    seedProgress({ streak: 1, lastDay: today });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await userEvent.setup().click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();

    cleanup();
    mockA2hsEnv();
    seedProgress({ streak: 1, lastDay: today, a2hsSeen: true });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await userEvent.setup().click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();

    cleanup();
    mockA2hsEnv();
    seedProgress({ uiLang: "en", streak: 1, lastDay: today });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await userEvent.setup().click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).a2hsSeen).not.toBe(true);

    cleanup();
    mockA2hsEnv({ userAgent: MAC_SAFARI_UA, platform: "MacIntel", maxTouchPoints: 0 });
    seedProgress({ streak: 1, lastDay: today });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await userEvent.setup().click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
  });

  it("A2HS shows on iPadOS Safari desktop mode (Macintosh UA + touch)", async () => {
    const today = localToday();
    cleanup();
    mockA2hsEnv({ userAgent: MAC_SAFARI_UA, platform: "MacIntel", maxTouchPoints: 5 });
    seedProgress({ streak: 1, lastDay: today });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("a2hs-sheet")).toBeTruthy();
    expect(screen.getByTestId("a2hs-title").textContent).toBe("Agrega Ándale a tu pantalla de inicio");
    expect(screen.getByTestId("a2hs-how").textContent).toBe("Toca Compartir, luego «Agregar a pantalla de inicio».");
    expect(screen.getByTestId("a2hs-dismiss").textContent).toBe("Ahora no");
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).a2hsSeen).toBe(true);
  });

  it("header mute and locked unit-node aria follow uiLang", async () => {
    cleanup();
    seedProgress({ sound: false });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Sonido" }).getAttribute("aria-label")).toBe("Sonido");
    expect(screen.getByRole("button", { name: "Pretérito vs. imperfecto (bloqueado)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Subjuntivo presente \((bloqueado|blocked)\)/ })).toBeNull();

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Sound" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Sound" }).getAttribute("aria-label")).toBe("Sound");
    expect(screen.getByRole("button", { name: "Pretérito vs. imperfecto (blocked)" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: / \(bloqueado\)/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sonido" })).toBeNull();
  });

  it("perfil context-lang aria follows uiLang", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-perfil"));
    expect(screen.getByTestId("perfil-lang-en").getAttribute("aria-label")).toBe("Idioma de contexto: inglés");
    expect(screen.getByTestId("perfil-lang-es").getAttribute("aria-label")).toBe("Idioma de contexto: español");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("perfil-lang-en").getAttribute("aria-label")).toBe("English context language"));
    expect(screen.getByTestId("perfil-lang-es").getAttribute("aria-label")).toBe("Spanish context language");
    expect(screen.getByText("Context language")).toBeTruthy();
  });

  it("lesson listen aria follows uiLang", async () => {
    cleanup();
    seedProgress();
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Listen lock",
        unitId: "subj1",
        host: "luna",
        questions: [{
          type: "listen",
          text: "Es importante que llegues temprano a la reunión.",
          answers: ["Es importante que llegues temprano a la reunión"],
        }],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Escuchar" }).getAttribute("aria-label")).toBe("Escuchar");
    expect(screen.getByRole("button", { name: "Más lento" }).getAttribute("aria-label")).toBe("Más lento");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Listen" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Listen" }).getAttribute("aria-label")).toBe("Listen");
    expect(screen.getByRole("button", { name: "Slower" }).getAttribute("aria-label")).toBe("Slower");
    expect(screen.queryByRole("button", { name: "Escuchar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Más lento" })).toBeNull();
  });

  it("story listen and nav aria follow uiLang", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Párrafo 1" }).getAttribute("aria-label")).toBe("Párrafo 1");
    expect(screen.getByRole("button", { name: "Preguntas" }).getAttribute("aria-label")).toBe("Preguntas");
    expect(screen.getByRole("button", { name: "Escuchar párrafo" }).getAttribute("aria-label")).toBe("Escuchar párrafo");
    const storyWord = [...document.querySelectorAll("span")].find((el) =>
      el.textContent === "cempasúchil" && el.style.cursor === "pointer");
    expect(storyWord).toBeTruthy();
    await user.click(storyWord);
    await waitFor(() => expect(screen.getByRole("button", { name: "Escuchar palabra" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Escuchar palabra" }).getAttribute("aria-label")).toBe("Escuchar palabra");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Paragraph 1" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Paragraph 1" }).getAttribute("aria-label")).toBe("Paragraph 1");
    expect(screen.getByRole("button", { name: "Questions" }).getAttribute("aria-label")).toBe("Questions");
    expect(screen.getByRole("button", { name: "Listen to paragraph" }).getAttribute("aria-label")).toBe("Listen to paragraph");
    expect(screen.getByRole("button", { name: "Listen to word" }).getAttribute("aria-label")).toBe("Listen to word");
    expect(screen.queryByRole("button", { name: "Párrafo 1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Escuchar párrafo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Escuchar palabra" })).toBeNull();
  });

  it("Recuerdos / Souvenir trail is a Mexico map with locked pin labels", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const map = screen.getByTestId("recuerdos-map");
    expect(map.textContent).toMatch(/Recuerdos/);
    expect(map.textContent).not.toMatch(/Ruta de recuerdos/);
    expect(screen.getByTestId("recuerdos-outline")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-outline").tagName).toBe("IMG");
    expect(screen.getByTestId("recuerdos-outline").getAttribute("src")).toMatch(/assets\/dave-cleared-mexico-map\.png/);
    expect(screen.getByTestId("recuerdos-fog")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-fog-cdmx")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-fog-oaxaca")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-fog-yucatan")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-fog-norte")).toBeTruthy();
    expect(screen.queryByTestId("recuerdos-fog-bajio")).toBeNull();
    expect(screen.getByTestId("recuerdos-cenzontle").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("recuerdos-bajio-glow")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-bajio-glow").className).toMatch(/bajio-glow/);
    expect(screen.getByTestId("recuerdos-bajio-glow").style.boxShadow).toBe(RECUERDOS_PIN_SHADOW);
    expect(screen.getByTestId("recuerdos-bajio-glow").style.background).toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    const cream = /#F4EDE0|rgb\(\s*244,\s*237,\s*224\s*\)/i;
    const bajioLabels = screen.getByTestId("recuerdos-pin-bajio").querySelectorAll("span span");
    expect(bajioLabels[0].style.color).toMatch(cream);
    expect(bajioLabels[1].style.color).toMatch(cream);
    const cdmxDot = screen.getByTestId("recuerdos-pin-cdmx").querySelector("span");
    expect(cdmxDot.style.boxShadow).toBe(RECUERDOS_PIN_SHADOW_LOCKED);
    const cdmxLabels = screen.getByTestId("recuerdos-pin-cdmx").querySelectorAll("span span");
    expect(cdmxLabels[0].style.color).toMatch(cream);
    expect(map.querySelector("nav")).toBeNull();
    expect(screen.queryByTestId("nav-recuerdos")).toBeNull();

    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Bajío/);
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-bajio").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/CDMX/);
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Oaxaca/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Yucatán/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Norte/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Cerrado/);

    expect(recuerdosSurfaceHasCuts(map.textContent)).toBe(false);
    expect(recuerdosHasProgressFraction(map.textContent)).toBe(false);
    expect(map.innerHTML).not.toMatch(/parroquia|sma-lanterns|12\/25|¡Sigue explorando!|Sigue explorando|backpack/i);
    expect(screen.getByTestId("nav-lectura").textContent).toMatch(/Lectura/);
    expect(screen.getByTestId("nav-lectura").textContent).not.toMatch(/Sigue|explorando|NEW|12\/25/i);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-map").textContent).toMatch(/Souvenir trail/));
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Bajío/);
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Open/);
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Locked/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Locked/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Locked/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/North/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Locked/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).not.toMatch(/Norte/);
    expect(recuerdosSurfaceHasCuts(screen.getByTestId("recuerdos-map").textContent)).toBe(false);
    expect(recuerdosHasProgressFraction(screen.getByTestId("recuerdos-map").textContent)).toBe(false);
  });

  it("Recuerdos Yucatán opens after a claimed souvenir; cuts stay off the map", async () => {
    cleanup();
    seedProgress({ stories: { "story-2": true }, storyCollectibles: { "story-2": true } });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    await user.click(screen.getByTestId("nav-lectura"));
    expect(screen.getByTestId("recuerdos-pin-bajio").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-yucatan").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Yucatán/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Abierto/);
    expect(screen.queryByTestId("recuerdos-fog-yucatan")).toBeNull();
    expect(screen.getByTestId("recuerdos-fog-cdmx")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Cerrado/);
    expect(recuerdosHasProgressFraction(screen.getByTestId("recuerdos-map").textContent)).toBe(false);
    expect(screen.getByTestId("recuerdos-map").innerHTML).not.toMatch(/¡Sigue explorando!|12\/25|parroquia/i);
  });

  it("practice miss feedback, Focus, and Why follow uiLang", async () => {
    cleanup();
    seedProgress({
      uiLang: "en",
      hearts: 5,
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 4 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    const unitBtn = screen.queryByRole("button", { name: "Subjuntivo presente" })
      || (await openCaminoMore(user), screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(unitBtn);
    await user.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await waitFor(() => expect(document.body.textContent).toMatch(/Te llamo cuando/));
    const saldre = [...screen.getAllByTestId("bank-tile")].find((el) => el.textContent.trim() === "saldré");
    expect(saldre).toBeTruthy();
    await user.click(saldre);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByTestId("practice-quip")).toBeTruthy());
    expect(screen.getByTestId("practice-quip").textContent).not.toMatch(/La idea está|Cerca\.|Respira\.|mal estacionado/);
    expect(screen.getByTestId("practice-focus").textContent).toBe("Focus: Verb mood");
    expect(screen.getByTestId("practice-focus").textContent).not.toMatch(/Modo verbal/);
    await user.click(screen.getByRole("button", { name: /Why\?/ }));
    expect(screen.getByTestId("practice-why").textContent).toBe("«Cuando» + future action → subjunctive. Habit would be indicative: «cuando salgo».");
    expect(screen.getByTestId("practice-why").textContent).not.toMatch(/acción futura|Hábito sería/);

    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("practice-focus").textContent).toBe("Foco: Modo verbal"));
    expect(screen.getByTestId("practice-quip").textContent).toMatch(/Cerca\.|La idea está|Respira\.|mal estacionado/);
    expect(screen.getByTestId("practice-why").textContent).toBe("«Cuando» + acción futura → subjuntivo. Hábito sería indicativo: «cuando salgo».");
  });

  it("number-row keys insert TAP AN ANSWER chips without breaking tap", async () => {
    cleanup();
    seedProgress({
      uiLang: "en",
      hearts: 5,
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 4 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    const unitBtn = screen.queryByRole("button", { name: "Subjuntivo presente" })
      || (await openCaminoMore(user), screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(unitBtn);
    await user.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await waitFor(() => expect(document.body.textContent).toMatch(/Te llamo cuando/));
    const tiles = screen.getAllByTestId("bank-tile");
    expect(tiles.length).toBeGreaterThan(1);
    const hints = screen.getAllByTestId("choice-chip-key");
    expect(hints.map((el) => el.textContent)).toEqual(CHOICE_CHIP_KEYS.slice(0, tiles.length));
    expect(document.body.textContent).not.toMatch(/press 1|Press 1|pulsa 1|Pulsa 1/);
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("lang-es").getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getAllByTestId("choice-chip-key").map((el) => el.textContent)).toEqual(CHOICE_CHIP_KEYS.slice(0, tiles.length));
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
    const tilesAfter = screen.getAllByTestId("bank-tile");
    const saldreIdx = tilesAfter.findIndex((el) => el.textContent.trim() === "saldré");
    expect(saldreIdx).toBeGreaterThanOrEqual(0);
    const key = CHOICE_CHIP_KEYS[saldreIdx];
    expect(key).toBeTruthy();
    const blank = document.querySelector("input[placeholder]");
    expect(blank).toBeTruthy();
    blank.focus();
    await user.keyboard(key);
    expect(blank.value).toBe("saldré");
    expect(blank.value).not.toBe(key);

    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByTestId("practice-focus")).toBeTruthy());
    expect(screen.getByTestId("practice-focus").textContent).toBe("Focus: Verb mood");
    await user.click(screen.getByRole("button", { name: /Why\?/ }));
    expect(screen.getByTestId("practice-why").textContent).toBe("«Cuando» + future action → subjunctive. Habit would be indicative: «cuando salgo».");
  });

  it("BUILD WITH WORDS unused chip labels use CHECK lime on a white chip, including dark theme", async () => {
    cleanup();
    seedProgress({
      uiLang: "en",
      theme: "dark",
      hearts: 5,
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 10 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    const unitBtn = screen.queryByRole("button", { name: "Subjuntivo presente" })
      || (await openCaminoMore(user), screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(unitBtn);
    await user.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await waitFor(() => expect(document.body.textContent).toMatch(/BUILD WITH WORDS/));
    expect(document.body.textContent).toMatch(/Write what you hear|Write the full sentence/);
    const tiles = screen.getAllByTestId("bank-tile");
    expect(tiles.length).toBeGreaterThan(3);
    const check = screen.getByTestId("lesson-check");
    const lime = /#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i;
    expect(check.style.background).toMatch(lime);
    tiles.forEach((tile) => {
      expect(tile.style.color).toMatch(lime);
      expect(tile.style.color).toBe(check.style.background);
      expect(tile.style.background).toMatch(/#fff|#ffffff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
      expect(Number.parseInt(tile.style.fontWeight, 10)).toBeGreaterThanOrEqual(800);
    });
    expect(tiles.some((tile) => /llegues|temprano|reunión/i.test(tile.textContent))).toBe(true);
  });

  it("letter boards default to QWERTY with Ñ after L; ABC toggle persists", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("ahorcado-section-start"));
    await waitFor(() => expect(screen.getByTestId("letter-board")).toBeTruthy());
    expect(screen.getByTestId("letter-board").getAttribute("data-layout")).toBe("qwerty");
    const qwertyChips = screen.getAllByTestId("letter-chip");
    expect(qwertyChips.map((el) => el.textContent).join("")).toBe(lettersForLayout("qwerty").join(""));
    expect(qwertyChips.map((el) => el.textContent).join("")).toContain("LÑ");
    expect(screen.getByTestId("letter-layout-qwerty").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("letter-layout-abc").getAttribute("aria-pressed")).toBe("false");
    expect(document.body.textContent).not.toMatch(/switch to ABC|keyboard layout|elige el teclado|press QWERTY/i);
    const lime = /#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i;
    qwertyChips.forEach((chip) => {
      expect(chip.style.color).toMatch(lime);
      expect(chip.style.background).toMatch(/#fff|#ffffff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
      expect(Number.parseInt(chip.style.fontWeight, 10)).toBeGreaterThanOrEqual(800);
    });

    await user.click(screen.getByTestId("letter-layout-abc"));
    await waitFor(() => expect(screen.getByTestId("letter-board").getAttribute("data-layout")).toBe("abc"));
    const abcChips = screen.getAllByTestId("letter-chip");
    expect(abcChips.map((el) => el.textContent).join("")).toBe(lettersForLayout("abc").join(""));
    expect(abcChips.map((el) => el.textContent).join("")).toContain("NÑ");
    expect(screen.getByTestId("letter-layout-abc").getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).letterLayout).toBe("abc");
    });

    cleanup();
    localStorage.removeItem(LIVE_KEY);
    const user2 = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    await user2.click(screen.getByTestId("ahorcado-section-start"));
    await waitFor(() => expect(screen.getByTestId("letter-board")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("letter-board").getAttribute("data-layout")).toBe("abc"));
    expect(screen.getAllByTestId("letter-chip").map((el) => el.textContent).join("")).toBe(lettersForLayout("abc").join(""));
  });

  it("Sendero opens Camino path; Hoy is the 10-min plan — George stamps", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("lang-es"));
    assertEqualHub();
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("Plan de 10 minutos");
    expect(screen.getByTestId("hub-sendero-quiet").textContent).toBe("Camino que crece");
    expect(screen.getByTestId("eighty-twenty-cta")).toBeTruthy();
    expect(screen.queryByTestId("hub-sobremesa")).toBeNull();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("hub-hoy").style.border).toMatch(/58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.getByTestId("hub-sendero").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-sendero").style.border).toBe(screen.getByTestId("hub-stories").style.border);
    expect(screen.getByTestId("hub-sendero").style.border).toBe(screen.getByTestId("hub-games").style.border);

    await user.click(screen.getByTestId("hub-sendero"));
    await waitFor(() => expect(screen.getByTestId("path-sheet")).toBeTruthy());
    expect(screen.getByTestId("path-sheet").textContent).toMatch(/Subjuntivo presente/);
    expect(screen.getByRole("button", { name: /Empezar · \+XP|Start · \+XP/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Cerrar$|^Close$/ }));
    await waitFor(() => expect(screen.queryByTestId("path-sheet")).toBeNull());

    await user.click(screen.getByTestId("hub-hoy"));
    await waitFor(() => expect(screen.getByTestId("hoy-plan")).toBeTruthy());
    expect(screen.getByTestId("hoy-plan-eyebrow").textContent).toBe("HOY · 10 MIN");
    expect(screen.getByTestId("hoy-plan-sell").textContent).toBe("Un plan corto para hoy. Diez minutos. Luego paras.");
    expect(screen.getByTestId("hoy-plan-step").textContent).toBe("Jugar la escena");
    expect(screen.getByTestId("hoy-plan-start").textContent).toBe("Empezar el plan");
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/Jugar la escena|Empezar el plan/);

    await user.click(screen.getByTestId("hoy-plan-close"));
    await waitFor(() => expect(screen.queryByTestId("hoy-plan")).toBeNull());
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("10-minute plan"));
    expect(screen.getByTestId("hub-sendero-quiet").textContent).toBe("A path that grows");

    await user.click(screen.getByTestId("hub-hoy"));
    await waitFor(() => expect(screen.getByTestId("hoy-plan-eyebrow").textContent).toBe("TODAY · 10 MIN"));
    expect(screen.getByTestId("hoy-plan-sell").textContent).toBe("A short plan for today. Ten minutes. Then you stop.");
    expect(screen.getByTestId("hoy-plan-step").textContent).toBe("Play the scene");
    expect(screen.getByTestId("hoy-plan-start").textContent).toBe("Start the plan");

    await user.click(screen.getByTestId("hoy-plan-start"));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
  });

  it("Learn first CTA is 80/20 Subjuntivo in five — George exact, no deck, no pep", async () => {
    const user = await boot();
    const cta = screen.getByTestId("eighty-twenty-cta");
    expect(cta).toBeTruthy();
    expect(screen.getByTestId("eighty-twenty-label").textContent).toBe(SUBJ_FIVE_LABEL);
    expect(screen.queryByTestId("eighty-twenty-sub")).toBeNull();
    expect(cta.closest("[data-testid='first-door-hero']")).toBeNull();
    const pathNode = screen.getByRole("button", { name: "Subjuntivo presente" });
    expect(cta.compareDocumentPosition(pathNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cta.querySelector("img")?.getAttribute("src")).toMatch(/hub\/eighty\.png/);
    expect(screen.queryByTestId("eighty-twenty-sheet")).toBeNull();

    await user.click(cta);
    await waitFor(() => expect(screen.getByTestId("eighty-twenty-sheet")).toBeTruthy());
    expect(screen.getAllByTestId("eighty-twenty-line").map((el) => el.textContent)).toEqual(SUBJ_FIVE.es);
    const sheet = screen.getByTestId("eighty-twenty-sheet");
    expect(sheet.querySelector("img")).toBeNull();
    expect(sheet.textContent).not.toMatch(/Deck|Practice this now|Practicar ahora|You've got this|¡Tú puedes|Master the/);
    expect(screen.queryByTestId("eighty-twenty-title")).toBeNull();

    await user.click(screen.getByTestId("eighty-twenty-close"));
    await waitFor(() => expect(screen.queryByTestId("eighty-twenty-sheet")).toBeNull());

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("eighty-twenty-label").textContent).toBe(SUBJ_FIVE_LABEL));
    expect(screen.queryByTestId("eighty-twenty-sub")).toBeNull();

    await user.click(screen.getByTestId("eighty-twenty-cta"));
    await waitFor(() => expect(screen.getByTestId("eighty-twenty-sheet")).toBeTruthy());
    expect(screen.getAllByTestId("eighty-twenty-line").map((el) => el.textContent)).toEqual(SUBJ_FIVE.en);
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
  });
});
