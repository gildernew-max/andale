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
import { SUBJ_FIVE, SUBJ_FIVE_LABEL } from "./subjFive.js";
import { SOBREMESA_FIVE, SOBREMESA_NAME, SOBREMESA_QUIET, SOBREMESA_SELL, sobremesaDeepen, sobremesaName, sobremesaTipText, sobremesaTips } from "./sobremesa.js";
import { SAFE_RISKY_ANSWERS, SAFE_RISKY_MULTI_FIXTURE, setSafeRiskyPackOverride } from "./safeRisky.js";
import { OJALA_QUE_PACK } from "./cubetas.js";
import { hangmanLetters } from "./hangman.js";
import { MEMORY_BANK } from "./memory.js";
import { LECTURA_HANDOFF_CTA, LECTURA_HANDOFF_QUIET } from "./lecturaHandoff.js";

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

/** Claimed stories stay open for a re-read. The first unread stays the frontier. */
const claimStories = (...ids) => Object.fromEntries(ids.map((id) => [id, true]));

const mockBrowser = () => {
  const voices = [];
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
      this.lang = "";
      this.rate = 1;
      this.pitch = 1;
      this.voice = null;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    }
  };
  const speak = vi.fn((u) => { try { u?.onstart?.(); } catch (e) {} });
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => voices,
      speak,
      cancel: () => {},
      resume: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      onvoiceschanged: null,
      speaking: false,
      pending: false,
      paused: false,
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

const CREAM_FILL = /#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i;
const PAGE_WHITE = /^(#fff|#ffffff|white|rgb\(\s*255,\s*255,\s*255\s*\))$/i;

const ELLIPSIS_RE = /…|\.\.\.$/;

const assertFullWordChip = (el, text) => {
  expect(el.textContent).toBe(text);
  expect(el.textContent).not.toMatch(ELLIPSIS_RE);
  expect(el.className).toMatch(/word-chip/);
  expect(el.style.overflow).not.toBe("hidden");
  expect(el.style.textOverflow).not.toBe("ellipsis");
  expect(el.style.width).toBe("max-content");
  expect(el.style.minWidth).not.toBe("0");
  expect(["min-content", "max-content", "28px", "72px"]).toContain(el.style.minWidth);
};

const assertMemoryBoardCard = (el, text) => {
  if (text != null) {
    const wordEl = el.querySelector("[data-testid='memory-card-word']");
    const glossEl = el.querySelector("[data-testid='memory-card-gloss']");
    expect(wordEl).toBeTruthy();
    expect(wordEl.textContent).toBe(text);
    expect(wordEl.textContent).not.toMatch(ELLIPSIS_RE);
    expect(glossEl).toBeTruthy();
    expect(glossEl.textContent.startsWith("(")).toBe(true);
    expect(glossEl.textContent.endsWith(")")).toBe(true);
    expect(glossEl.textContent).not.toMatch(ELLIPSIS_RE);
    expect(glossEl.style.fontSize).toBe("0.7em");
    expect(glossEl.style.fontFamily).toBe("inherit");
    expect(glossEl.style.fontWeight).toBe("inherit");
    expect(glossEl.style.color).toMatch(/#777777|rgb\(119,\s*119,\s*119\)/i);
    expect(el.textContent).toContain(text);
    expect(el.textContent).toContain(glossEl.textContent);
    expect(el.getAttribute("aria-label")).toBe(`${text} ${glossEl.textContent}`);
  }
  expect(el.className).toMatch(/word-chip/);
  expect(el.className).toMatch(/memory-card/);
  expect(el.style.overflow).not.toBe("hidden");
  expect(el.style.textOverflow).not.toBe("ellipsis");
  expect(el.style.width).toBe("100%");
  expect(el.style.minHeight).toBe("140px");
  expect(Number.parseFloat(el.style.fontSize)).toBeGreaterThanOrEqual(26);
  expect(el.style.fontWeight).toBe("900");
  expect(el.getAttribute("data-card-min")).toBe("140");
  expect(el.getAttribute("data-card-type")).toBe("26");
};

const assertCreamShell = () => {
  const shell = screen.getByTestId("app-shell");
  expect(shell.style.background).toMatch(CREAM_FILL);
  expect(shell.style.background).not.toMatch(PAGE_WHITE);
  expect(document.body.style.background).toMatch(CREAM_FILL);
  expect(document.body.style.background).not.toMatch(PAGE_WHITE);
};

const HUB_FACE = {
  es: {
    hoy: "Hoy",
    hoyQuiet: "Plan de 10 minutos",
    stories: "Cuentos",
    games: "Juegos",
    doctor: "Doctora de frases",
    eighty: "80/20",
    eightyQuiet: "Reglas del subjuntivo",
    sendero: "Sendero",
    senderoQuiet: "Tu camino",
  },
  en: {
    hoy: "Hoy",
    hoyQuiet: "10-minute plan",
    stories: "Stories",
    games: "Games",
    doctor: "Phrase Doctor",
    eighty: "80/20",
    eightyQuiet: "Subjunctive rules",
    sendero: "Sendero",
    senderoQuiet: "Your path",
  },
};

const hubUiLang = () => (
  screen.getByTestId("lang-es").getAttribute("aria-pressed") === "true" ? "es" : "en"
);

const HUB_DOCTOR_RE = /Doctora de frases|Phrase Doctor/;

const assertHubFace = (lang = hubUiLang()) => {
  const face = HUB_FACE[lang];
  const tiles = screen.getByTestId("learn-hub-tiles");
  expect(screen.getByTestId("hub-hoy-label").textContent).toBe(face.hoy);
  expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe(face.hoyQuiet);
  expect(screen.getByTestId("hub-stories").textContent).toContain(face.stories);
  expect(screen.getByTestId("hub-games").textContent).toContain(face.games);
  expect(screen.getByTestId("hub-phrase-doctor").textContent).toContain(face.doctor);
  expect(screen.getByTestId("eighty-twenty-label").textContent).toBe(face.eighty);
  expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe(face.eightyQuiet);
  expect(screen.getByTestId("hub-sendero-label").textContent).toBe(face.sendero);
  expect(screen.getByTestId("hub-sendero-quiet").textContent).toBe(face.senderoQuiet);
  const salad = lang === "es"
    ? /Stories|Games|Phrase Doctor|10-minute plan|Subjunctive rules|Your path/
    : /Cuentos|Juegos|Doctora de frases|Plan de 10 minutos|Reglas del subjuntivo|Tu camino/;
  expect(tiles.textContent).not.toMatch(salad);
};

const assertEqualHub = () => {
  const tiles = screen.getByTestId("learn-hub-tiles");
  expect(tiles).toBeTruthy();
  assertHubFace();
  expect(screen.queryByTestId("hub-sobremesa")).toBeNull();
  expect(tiles.textContent).not.toMatch(/Match & play|Arregla|Prioriza|Unlock Mexico|Flip & keep|Sobremesa|Pin chase|Flashcards/);
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
  expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
  expect(screen.getByTestId("hub-section-title").textContent).toMatch(/Intermedio|Intermediate/);
  expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más|More/);
  const sectionBanners = screen.getAllByTestId("hub-section-banner");
  expect(sectionBanners.length).toBeGreaterThanOrEqual(1);
  sectionBanners.forEach((banner) => {
    expect(banner.style.background).toMatch(CREAM_FILL);
    expect(banner.style.background).not.toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(banner.textContent).not.toMatch(/Sección \d/);
  });
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

/** Free story-win / CONTINUAR: fly-away in flight or already off-screen. No perch. Soft chrome parked. */
const assertFreeWinFlyAway = () => {
  const slot = screen.getByTestId("win-perch-slot");
  const stage = screen.getByTestId("win-fly-away");
  const bird = screen.queryByTestId("win-fly-away-bird");
  const css = stage.querySelector("style")?.textContent || "";
  expect(stage.getAttribute("data-reduced-motion")).toBe("0");
  expect(stage.getAttribute("data-surface")).toBe("win");
  expect(css).toMatch(/@keyframes paywallFlyAway/);
  expect(css).toMatch(/position: fixed;/);
  expect(css).toMatch(/overflow: hidden;/);
  expect(css).toMatch(/translate\(calc\(-50% \+ 100vw \+ 168px\)/);
  expect(css).toMatch(/78% \{ transform: translate\(calc\(-50% \+ 100vw \+ 168px\), -40px\) rotate\(-10deg\); opacity: 1; \}/);
  expect(css).toMatch(/100% \{ transform: translate\(calc\(-50% \+ 100vw \+ 168px\), -40px\) rotate\(-10deg\); opacity: 0; \}/);
  expect(css).not.toMatch(/260px/);
  expect(css).not.toMatch(/780ms|cenzontle-courier|story0Courier/);
  if (bird) {
    expect(bird.getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(bird.getAttribute("style") || "").not.toMatch(/scaleX\s*\(\s*-1\s*\)/);
    expect(screen.getByTestId("win-fly-away-wing")).toBeTruthy();
    expect(screen.getByTestId("win-fly-away-clip").className).toBe("paywall-fly-clip");
    expect(slot.querySelectorAll("img[src*='cenzontle']")).toHaveLength(1);
  } else {
    expect(screen.queryByTestId("win-fly-away-clip")).toBeNull();
    expect(slot.querySelectorAll("img[src*='cenzontle']")).toHaveLength(0);
  }
  expect(slot.querySelector("[data-testid='win-perch']")).toBeNull();
  expect(screen.queryByTestId("win-perch")).toBeNull();
  expect(screen.queryByTestId("story-0-beat")).toBeNull();
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
};

/** Loud annual / outline monthly / quietest continue free. George words. One static Cenzontle. */
const assertSoftPaywallAnnualPrimary = (lang = "es") => {
  const wall = screen.getByTestId("soft-paywall");
  const bird = screen.getByTestId("soft-paywall-cenzontle");
  const annual = screen.getByTestId("soft-paywall-annual");
  const monthly = screen.getByTestId("soft-paywall-monthly");
  const honesty = screen.getByTestId("soft-paywall-honesty");
  const dismiss = screen.getByTestId("soft-paywall-dismiss");
  const copy = lang === "en"
    ? { title: "Keep your streak", benefit: "Stories, Cubetas, and Phrase Doctor — no ceiling.", annual: "One year", monthly: "One month", honesty: "Practice · no charge yet", dismiss: "Continue free" }
    : { title: "Sigue con tu racha", benefit: "Escenas, Cubetas y la doctora — sin techo.", annual: "Un año", monthly: "Un mes", honesty: "Práctica · sin cobro todavía", dismiss: "Seguir gratis" };
  expect(screen.getByTestId("soft-paywall-headline").textContent).toBe(copy.title);
  expect(screen.getByTestId("soft-paywall-body").textContent).toBe(copy.benefit);
  expect(annual.textContent).toBe(copy.annual);
  expect(monthly.textContent).toBe(copy.monthly);
  expect(honesty.textContent).toBe(copy.honesty);
  expect(dismiss.textContent).toBe(copy.dismiss);
  expect(annual.textContent).not.toMatch(/\$39\.99|\$6\.99/);
  expect(monthly.textContent).not.toMatch(/\$39\.99|\$6\.99/);
  expect(bird.tagName).toBe("IMG");
  expect(bird.getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
  expect(bird.getAttribute("width")).toBe("44");
  expect(bird.getAttribute("style") || "").not.toMatch(/scaleX\s*\(\s*-1\s*\)|animation/);
  expect(screen.queryByTestId("soft-paywall-cenzontle-stage")).toBeNull();
  expect(screen.queryByTestId("soft-paywall-cenzontle-wing")).toBeNull();
  expect(wall.querySelector("[data-testid='soft-paywall-cenzontle']").compareDocumentPosition(screen.getByTestId("soft-paywall-headline")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(wall.querySelectorAll("img[src*='cenzontle']")).toHaveLength(1);
  expect(wall.textContent).not.toMatch(/Tell me when the store opens|Avísame cuando abramos la tienda|I’ll write when it’s ready|Te escribo cuando esté listo/);
  expect(wall.querySelector("[data-testid='win-bounce']")).toBeNull();
  expect(wall.querySelector("[data-testid='story-0-beat']")).toBeNull();
  expect(wall.querySelector("[data-testid='win-perch']")).toBeNull();
  expect(wall.querySelector("[data-testid='coach-strip']")).toBeNull();
  expect(wall.textContent).not.toMatch(/780ms|bonus \+5 XP|bonus \+5/);
  const cream = /#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i;
  const card = screen.getByTestId("soft-paywall-card");
  expect(card.style.background).toMatch(cream);
  expect(screen.getByTestId("learn-hub").style.background).toMatch(cream);
  expect(card.style.background).not.toMatch(/#fff|#ffffff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
  expect(annual.className).toMatch(/duo-btn/);
  expect(annual.style.background).toMatch(/#58CC02|rgb\(88,\s*204,\s*2\)/i);
  expect(annual.style.borderBottom).toMatch(/4px solid/);
  expect(monthly.className).toMatch(/duo-btn/);
  expect(monthly.style.background).toMatch(cream);
  expect(monthly.style.background).not.toMatch(/#fff|#ffffff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
  expect(monthly.style.borderBottom).toMatch(/4px solid/);
  expect(dismiss.className).not.toMatch(/duo-btn/);
  expect(dismiss.style.background).toBe("none");
  expect(dismiss.style.padding).toBe("11px 0px");
  expect(dismiss.style.borderBottom).not.toMatch(/4px/);
  expect(dismiss.style.color).toMatch(/#777777|rgb\(119,\s*119,\s*119\)/i);
  const filled = [...wall.querySelectorAll("button.duo-btn")]
    .filter((el) => /#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i.test(el.style.background));
  expect(filled).toHaveLength(1);
  expect(filled[0]).toBe(annual);
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
    const cue = screen.queryByTestId("story-quiz-cue");
    const passage = screen.queryByTestId("story-quiz-passage");
    if (cue) lifts.push(`CUE:${cue.textContent}`);
    if (passage) lifts.push(`PASSAGE:${passage.textContent}`);
    if (cue) expect(passage).toBeTruthy();
    expect(screen.queryByTestId("story-quiz-cue-line")).toBeNull();
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

/** Learn home after Hoy, before lectura_start, must hold the glow and the wall. */
const assertNoWallBeforeLectura = () => {
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect((window.__andaleFunnelLog || []).some((e) => e.event === "paywall_seen")).toBe(false);
};

/** story-0 start, then Learn home — glow, then the wall. */
const openStory0 = async (user) => {
  await user.click(screen.getByTestId("nav-lectura"));
  const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
  expect(openers.length).toBeGreaterThan(0);
  await user.click(openers[openers.length - 1]);
  await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
};

const lecturaThenBajioWall = async (user) => {
  assertNoWallBeforeLectura();
  await openStory0(user);
  await user.click(screen.getByTestId("brand-home"));
  await awaitBajioFlashThenPaywall();
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
  delete window.__andaleIapEnv;
  delete window.__andaleNativePurchase;
  delete window.__andaleNativeRestore;
  delete window.__andaleNativeGetProducts;
  delete window.__andalePurchaseLog;
  delete window.__andaleFunnelLog;
  setSafeRiskyPackOverride(null);
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

describe("simulated learner flows", { timeout: 15000 }, () => {
  it("boots Camino, starts subj1, answers one MC, persists andale-v3 without wipe", async () => {
    // Shuffle can put five non-MC beats first. Dummy wrongs burn the default 5
    // hearts and land on the fail screen — hasPrompt then stays false. Extra
    // hearts keep the skip loop on the lesson. Listen Skip does not cost a heart.
    seedProgress({ hearts: 20 });
    const user = await boot();
    await user.click(screen.getByRole("button", { name: "Subjuntivo presente" }));
    await waitFor(() => expect(screen.getByTestId("path-sheet")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Empezar · \+XP|Start · \+XP/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const hasPrompt = () => !!(
      document.querySelector(".choice-card")
      || document.querySelector("input[placeholder]")
      || screen.queryAllByTestId("bank-tile").length
      || document.querySelector(".tile")
    );
    await waitFor(() => expect(hasPrompt()).toBe(true));

    // Skip non-MC items (shuffle) until a multiple-choice prompt is up.
    for (let i = 0; i < 12 && !document.querySelector(".choice-card"); i++) {
      const listenSkip = screen.queryByTestId("lesson-listen-skip");
      const input = document.querySelector("input[placeholder]");
      const tiles = screen.queryAllByTestId("bank-tile");
      const orderTiles = document.querySelectorAll(".tile");
      if (listenSkip) {
        await user.click(listenSkip);
      } else if (input) {
        await user.type(input, "x");
        await user.click(screen.getByTestId("lesson-check"));
        await user.click(continueBtn());
      } else if (tiles.length) {
        await user.click(tiles[0]);
        await user.click(screen.getByTestId("lesson-check"));
        await user.click(continueBtn());
      } else if (orderTiles.length) {
        await user.click(orderTiles[0]);
        await user.click(screen.getByTestId("lesson-check"));
        await user.click(continueBtn());
      } else {
        break;
      }
      await waitFor(() => expect(hasPrompt()).toBe(true));
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
    const rights = SAFE_RISKY_ANSWERS[phrase];
    expect(rights.length).toBeGreaterThan(0);
    for (const key of rights) {
      if (screen.queryByTestId("safe-risky-continue")) break;
      await user.click(screen.getByTestId(`safe-risky-choice-${key}`));
    }
    await waitFor(() => expect(screen.getByTestId("safe-risky-continue")).toBeTruthy());
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
      "No manches.": { es: "Vaya / no me digas." },
      "Quedo a sus órdenes.": { es: "Quedo bajo sus órdenes." },
      "¿Mande?": { es: "¿Cómo? / ¿perdón?" },
      "¿Qué?": { es: "¿Qué?" },
      "¿Me da un café, por favor?": { es: "¿Me da un café, por favor?" },
      "Está bien chido.": { es: "Está muy padre." },
      "No obstante lo anterior...": { es: "A pesar de lo anterior..." },
      "Ahorita vengo.": { es: "Vuelvo en un momento." },
    };
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy());
    const phrase = Object.keys(literals).find((p) => document.body.textContent.includes(p));
    expect(phrase).toBeTruthy();
    const rights = SAFE_RISKY_ANSWERS[phrase];
    const wrong = ["safe", "casual", "formal", "regional", "risky"].find((k) => !rights.includes(k));
    await user.click(screen.getByTestId(`safe-risky-choice-${wrong}`));
    if (rights.length > 1) {
      expect(screen.getByTestId(`safe-risky-choice-${wrong}`).getAttribute("data-safe-risky-state")).toBe("wrong");
      expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
      for (const key of rights) {
        await user.click(screen.getByTestId(`safe-risky-choice-${key}`));
      }
    }
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

  it("Safe/Risky multi-correct waits for every right chip before CONTINUE", async () => {
    setSafeRiskyPackOverride([SAFE_RISKY_MULTI_FIXTURE]);
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy());
    expect(document.body.textContent).toContain("MULTI_CORRECT_FIXTURE");
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    expect(screen.queryByTestId("safe-risky-literal")).toBeNull();

    await user.click(screen.getByTestId("safe-risky-choice-safe"));
    expect(screen.getByTestId("safe-risky-choice-safe").getAttribute("data-safe-risky-state")).toBe("correct");
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    expect(screen.queryByTestId("safe-risky-literal")).toBeNull();
    expect(screen.getByTestId("safe-risky-choice-casual").disabled).toBe(false);

    await user.click(screen.getByTestId("safe-risky-choice-risky"));
    expect(screen.getByTestId("safe-risky-choice-risky").getAttribute("data-safe-risky-state")).toBe("wrong");
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    expect(screen.queryByTestId("safe-risky-why")).toBeNull();

    await user.click(screen.getByTestId("safe-risky-choice-casual"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-continue")).toBeTruthy());
    expect(screen.getByTestId("safe-risky-choice-casual").getAttribute("data-safe-risky-state")).toBe("correct");
    expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Traducción");
    expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Fixture literal.");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Por qué");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Fixture why.");
    expect(document.body.textContent).toMatch(/Mejor respuesta/);
    expect(document.body.textContent).toMatch(/Seguro · Casual|Casual · Seguro/);
    const literal = screen.getByTestId("safe-risky-literal");
    const why = screen.getByTestId("safe-risky-why");
    const cont = screen.getByTestId("safe-risky-continue");
    expect(literal.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(why.compareDocumentPosition(cont) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cont.textContent).toMatch(/Continuar|Terminar/);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Literal"));
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Why");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Fixture why.");
    expect(document.body.textContent).toMatch(/Better answer/);
    expect(screen.getByTestId("safe-risky-continue").textContent).toMatch(/Continue|Finish/);
  });

  it("Safe/Risky multi-correct clean tap-all unlocks CONTINUE with Literal then Why", async () => {
    setSafeRiskyPackOverride([SAFE_RISKY_MULTI_FIXTURE]);
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy());
    await user.click(screen.getByTestId("safe-risky-choice-casual"));
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    await user.click(screen.getByTestId("safe-risky-choice-safe"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-continue")).toBeTruthy());
    expect(document.body.textContent).toMatch(/Buen juicio|Good judgment/);
    expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Traducción");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Por qué");
    expect(screen.getByTestId("safe-risky-choice-risky").getAttribute("data-safe-risky-state")).toBe("idle");
    expect(screen.getByTestId("safe-risky-choice-risky").disabled).toBe(true);
  });

  it("Safe/Risky live No manches waits for casual + regional before CONTINUE", async () => {
    expect(SAFE_RISKY_ANSWERS["No manches."]).toEqual(["casual", "regional"]);
    setSafeRiskyPackOverride([{
      phrase: "No manches.",
      context: { es: "Tu amigo te cuenta que pagó $300 por dos cafés.", en: "Your friend says they paid $300 for two coffees." },
      answer: "casual",
      answers: ["casual", "regional"],
      literal: { es: "Vaya / no me digas.", en: "No way. / Come on." },
      note: { es: "Suena a amigos en México. Con jefes o personas mayores, pásate a algo más suave.", en: "Sounds like friends in Mexico. With bosses or elders, switch to something softer." },
    }]);
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByText("No manches.")).toBeTruthy());
    await user.click(screen.getByTestId("safe-risky-choice-casual"));
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    await user.click(screen.getByTestId("safe-risky-choice-formal"));
    expect(screen.getByTestId("safe-risky-choice-formal").getAttribute("data-safe-risky-state")).toBe("wrong");
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    await user.click(screen.getByTestId("safe-risky-choice-regional"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-continue")).toBeTruthy());
    expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Traducción");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Por qué");
    expect(document.body.textContent).toMatch(/Mejor respuesta/);
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
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/Cuando yo era niña,/);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).not.toMatch(/Cuando yo era niño,/);
    const still = screen.getByTestId("lectura-still-0");
    expect(still.getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-0/p0.png`);
    await waitFor(() => expect(screen.getAllByText(/cempasúchil/).length).toBeGreaterThan(0));
    await user.click(screen.getByRole("button", { name: /^Bilingüe$/ }));
    expect(document.body.textContent).toMatch(/her grandmother taught her/);
    expect(document.body.textContent).not.toMatch(/his grandmother taught him/);
    const storyWord = [...document.querySelectorAll("span")].find((el) =>
      el.textContent === "cempasúchil" && el.style.cursor === "pointer");
    expect(storyWord).toBeTruthy();
    await user.click(storyWord);
    await waitFor(() => expect(screen.getByText(/Mexican marigold/i)).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/definición pendiente|definition coming soon/i);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("story-tip").textContent).toMatch(/Read the paragraph\. Tap a word only if it stops you\./));
  });

  it("Lectura Wave A stills resolve via BASE_URL for story-0 p3, story-1, and story-2", async () => {
    seedProgress({ stories: claimStories("story-1", "story-2") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const story0 = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(story0[story0.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-3")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-3").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-0/p3.png`);
    await user.click(screen.getByRole("button", { name: /Cerrar|Close/ }));
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    const story1 = screen.getAllByRole("button", { name: /La casa azul/ });
    await user.click(story1[story1.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-1/p0.png`);
    await user.click(screen.getByRole("button", { name: /Cerrar|Close/ }));
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    const story2 = screen.getAllByRole("button", { name: /Más allá de la playa/ });
    await user.click(story2[story2.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-2/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/Sofía y Mateo llegaron a Cancún/);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).not.toMatch(/Llegué a Cancún/);
  });

  const finishStoryPages = async (user) => {
    for (;;) {
      const next = screen.queryByRole("button", { name: /^(Siguiente|Next) →$/ });
      if (!next) break;
      await user.click(next);
    }
    await user.click(screen.getByRole("button", { name: /^(Preguntas|Questions) →$/ }));
    await waitFor(() => expect(screen.getAllByTestId("story-q-prompt").length).toBeGreaterThan(0));
  };

  it("first story-0 Lectura (all pages) plays Cenzontle fly-away + ¡Eso! — no perch, no paywall", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    await finishStoryPages(user);
    await user.click(screen.getByRole("button", { name: /El olor del cempasúchil/ }));
    await user.click(screen.getByRole("button", { name: /En el panteón de la isla de Janitzio/ }));
    await user.click(screen.getByRole("button", { name: /El olvido/ }));
    await user.click(screen.getByRole("button", { name: /Reclamar|Claim/ }));
    await waitFor(() => {
      expect(screen.getByTestId("story-0-win")).toBeTruthy();
      expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    });
    expect(screen.getByTestId("story-0-win").textContent).toBe("¡Eso!");
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.queryByTestId("lectura-handoff")).toBeNull();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).lecturaHandoffSeen).toBe(true));
    assertFreeWinFlyAway();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    assertCreamShell();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("story-0-win").textContent).toBe("That's it."));
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    assertFreeWinFlyAway();
    await user.click(screen.getByTestId("story-0-win-continue"));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await awaitHome();
    await user.click(screen.getByTestId("nav-lectura"));
    const again = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(again[again.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    await finishStoryPages(user);
    expect(screen.getAllByTestId("story-q-prompt").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("story-0-win")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
  });

  it("later Lectura stories show WinPerch static only — no 780ms beat", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true, stories: claimStories("story-0") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La casa azul/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    await finishStoryPages(user);
    await user.click(screen.getByRole("button", { name: /Porque era a quien mejor conocía/ }));
    await user.click(screen.getByRole("button", { name: /El tranvía y Diego/ }));
    await user.click(screen.getByRole("button", { name: /Viva la vida/ }));
    await user.click(screen.getByRole("button", { name: /Reclamar|Claim/ }));
    await waitFor(() => {
      expect(screen.getByTestId("lectura-win")).toBeTruthy();
      expect(screen.getByTestId("win-perch-bird").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    });
    expect(screen.getByTestId("lectura-win").textContent).toBe("¡Eso!");
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.getByTestId("win-perch-chip")).toBeTruthy();
    expect(screen.getByTestId("win-perch-slot")).toBeTruthy();
    expect(screen.getByTestId("win-perch").textContent).not.toMatch(/¡Eso!|That's it\./);
    assertCreamShell();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("story-0-win")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lectura-win").textContent).toBe("That's it."));
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    expect(screen.getByTestId("win-perch").textContent).not.toMatch(/¡Eso!|That's it\./);
    await user.click(screen.getByTestId("lectura-win-continue"));
    await awaitHome();
    await user.click(screen.getByTestId("nav-lectura"));
    const again = screen.getAllByRole("button", { name: /La casa azul/ });
    await user.click(again[again.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    await finishStoryPages(user);
    await user.click(screen.getByRole("button", { name: /Porque era a quien mejor conocía/ }));
    await user.click(screen.getByRole("button", { name: /El tranvía y Diego/ }));
    await user.click(screen.getByRole("button", { name: /Viva la vida/ }));
    expect(screen.getByRole("button", { name: /XP ya reclamado|XP already claimed/ })).toBeTruthy();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("lectura-win")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
  });

  it("Lectura Wave B stills resolve via BASE_URL for story-3 and story-9", async () => {
    seedProgress({ stories: claimStories("story-3", "story-9") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const story3 = screen.getAllByRole("button", { name: /El hijo del Rey Tigre/ });
    await user.click(story3[story3.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p0.png`);
    await user.click(screen.getByRole("button", { name: /Cerrar|Close/ }));
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    const story9 = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(story9[story9.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-9/p0.png`);
  });

  it("opens story-3 El hijo del Rey Tigre with Brand stills and current lucha words", async () => {
    seedProgress({ stories: claimStories("story-3") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /El hijo del Rey Tigre/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/se ponía la máscara antes de salir/);
    expect(document.body.textContent).toMatch(/Joaquín Méndez de Tlalnepantla/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-1")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-1").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p1.png`);
    expect(document.body.textContent).toMatch(/Mi madre las cosía a mano/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-2")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-2").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p2.png`);
    expect(document.body.textContent).toMatch(/fue rudo durante veintidós años/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-3")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-3").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p3.png`);
    expect(document.body.textContent).toMatch(/perdió la máscara/);
    expect(document.body.textContent).toMatch(/Vimos su cara por primera vez/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-4")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-4").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p4.png`);
    expect(document.body.textContent).toMatch(/se retiró esa misma noche/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-5")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-5").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p5.png`);
    expect(document.body.textContent).toMatch(/Tigre Joven/);
    expect(document.body.textContent).toMatch(/plateada con detalles azules/);
  });

  it("opens story-7 El último dominó with Brand stills and Pepe, not Tito", async () => {
    seedProgress({ stories: claimStories("story-7") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /El último dominó/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-7/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/La cantina La Covadonga/);
    expect(document.body.textContent).not.toMatch(/\bTito\b/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-2")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-2").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-7/p2.png`);
    expect(document.body.textContent).toMatch(/Don Pepe, el más joven/);
    expect(document.body.textContent).not.toMatch(/\bTito\b/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-4")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-4").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-7/p4.png`);
    expect(document.body.textContent).toMatch(/Don Pepe ganó/);
    expect(document.body.textContent).not.toMatch(/\bTito\b/);
  });

  it("opens story-5 La frontera más larga del mundo with Brand stills and current Tijuana words", async () => {
    seedProgress({ stories: claimStories("story-5") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La frontera más larga del mundo/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-5/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/Llevo doce años cubriendo la frontera/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-1")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-1").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-5/p1.png`);
    expect(document.body.textContent).toMatch(/Tijuana no es lo que dicen las películas/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-3")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-3").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-5/p3.png`);
    expect(document.body.textContent).toMatch(/Anabel, una madre hondureña/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-5")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-5").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-5/p5.png`);
    expect(document.body.textContent).toMatch(/Tijuana se vuelve hogar/);
    expect(document.body.textContent).toMatch(/Roma en el año 50/);
  });

  it("opens story-6 La sirena del Pacífico with Brand stills and Mamá, not Papá", async () => {
    seedProgress({ stories: claimStories("story-6") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La sirena del Pacífico/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-6/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/En San Blas, Nayarit/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-4")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-4").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-6/p4.png`);
    expect(document.body.textContent).toMatch(/«Mamá, las sirenas/);
    expect(document.body.textContent).not.toMatch(/«Papá, las sirenas/);
  });

  it("opens story-8 El grito de mi padre with stills and balcony crate beside", async () => {
    seedProgress({ stories: claimStories("story-8") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /El grito de mi padre/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/se ponía la guayabera blanca/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-1")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-1").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p1.png`);
    expect(document.body.textContent).toMatch(/descorchábamos botellas de tequila/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-2")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-2").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p2.png`);
    expect(document.body.textContent).toMatch(/En la regadera, en el coche/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-3")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-3").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p3.png`);
    expect(document.body.textContent).toMatch(/me llevó al balcón con un cajón de botellas a un lado/);
    expect(document.body.textContent).toMatch(/camisa blanca planchada/);
    expect(document.body.textContent).toMatch(/el brazo en alto/);
    expect(document.body.textContent).not.toMatch(/se subió a un cajón/);
    expect(document.body.textContent).not.toMatch(/cajón de cerveza vacío/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-4")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-4").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p4.png`);
    expect(document.body.textContent).toMatch(/frente a mis hijos/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-5")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-5").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p5.png`);
    expect(document.body.textContent).toMatch(/¡Viva México!/);
  });

  it("opens story-9 Las cerezas de don Adán with Brand stills and setenta, not cincuenta y nueve", async () => {
    seedProgress({ stories: claimStories("story-9") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-9/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/Si usted alguna vez se ha tomado un café de Chiapas/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-1")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-1").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-9/p1.png`);
    expect(document.body.textContent).toMatch(/Don Adán tiene setenta años/);
    expect(document.body.textContent).toMatch(/metro cincuenta y cinco/);
    expect(document.body.textContent).not.toMatch(/cincuenta y nueve/);
  });

  it("Lectura + story Qs show a one-line gloss for stamped words only", async () => {
    seedProgress({ stories: claimStories("story-9") });
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
    const cosecha = [...document.querySelectorAll("[data-testid='story-q-prompt'] [data-testid='gloss-word']")]
      .find((el) => el.getAttribute("data-gloss-key") === "cosecha");
    expect(cosecha).toBeTruthy();
    await user.click(cosecha);
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("la recolección de ese año"));
    const passageCosecha = [...document.querySelectorAll("[data-testid='story-quiz-passage'] [data-testid='gloss-word']")]
      .find((el) => el.getAttribute("data-gloss-key") === "cosecha");
    expect(passageCosecha).toBeTruthy();
    await user.click(passageCosecha);
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
    assertHubFace("en");
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
    expect(screen.getByTestId("brand-home").textContent).toMatch(/ándale/);
    expect(screen.getByTestId("brand-home").querySelector("img")?.getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
  });

  const assertBrandLearnHome = () => {
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    assertEqualHub();
    expect(screen.getByTestId("hub-sendero").textContent).toMatch(/Sendero/);
    expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy();
    expect(screen.getByTestId("nav-camino").getAttribute("aria-current")).toBe("page");
    expect(screen.queryByTestId("splash")).toBeNull();
    expect(screen.queryByTestId("lesson-exit")).toBeNull();
    expect(screen.queryByText("¿Salir de la lección?")).toBeNull();
    expect(screen.queryByText("Leave the lesson?")).toBeNull();
    expect(screen.getAllByTestId("brand-home")).toHaveLength(1);
  };

  it("top-left brand from Lectura lands on Learn home, not Lectura", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("nav-lectura").getAttribute("aria-current")).toBe("page"));
    expect(screen.queryByTestId("learn-hub")).toBeNull();
    expect(screen.getByTestId("recuerdos-cenzontle")).toBeTruthy();
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
    expect(screen.queryByTestId("recuerdos-map")).toBeNull();
  });

  it("top-left brand from Perfil lands on Learn home, not Perfil", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-perfil"));
    await waitFor(() => expect(screen.getByText("Tu perfil")).toBeTruthy());
    expect(screen.queryByTestId("learn-hub")).toBeNull();
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
    expect(screen.queryByText("Tu perfil")).toBeNull();
  });

  it("top-left brand from Phrase Doctor lands on Learn home", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("hub-phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(screen.getByTestId("nav-practica").getAttribute("aria-current")).toBe("page");
    expect(screen.queryByTestId("learn-hub")).toBeNull();
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
    expect(screen.queryByTestId("phrase-doctor-board")).toBeNull();
  });

  it("top-left brand from a lesson lands on Learn home with no confirm", async () => {
    const user = await boot();
    await user.click(screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.queryByTestId("learn-hub")).toBeNull();
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
  });

  it("top-left brand from a Lectura story lands on Learn home, not Lectura", async () => {
    seedProgress({ stories: claimStories("story-9") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    expect(screen.queryByTestId("learn-hub")).toBeNull();
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
    expect(screen.queryByTestId("story-tip")).toBeNull();
    expect(screen.queryByTestId("recuerdos-map")).toBeNull();
  });

  it("top-left brand after paywall dismiss stays on Learn home", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday() });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
  });

  it("Learn hub Games tile opens Games hub with Cubetas, Hangman, Jeopardy, and Memory", async () => {
    const user = await boot();
    await awaitHome();
    expect(screen.queryByTestId("hub-hangman")).toBeNull();
    expect(screen.queryByTestId("hub-jeopardy")).toBeNull();
    expect(screen.queryByTestId("hub-memory")).toBeNull();
    expect(screen.getByTestId("learn-hub-tiles").querySelectorAll("button")).toHaveLength(6);
    await user.click(screen.getByTestId("hub-games"));
    await waitFor(() => expect(screen.getByTestId("games-hub")).toBeTruthy());
    expect(screen.getByTestId("games-hub-title").textContent).toBe("Juegos");
    expect(screen.getByTestId("cubetas-start").textContent).toContain("Cubetas");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Ahorcado");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Palabras de México");
    expect(screen.getByTestId("hangman-start").textContent).not.toContain("Hangman");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Jeopardy");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Elige categoría, elige valor, responde.");
    expect(screen.getByTestId("memory-start").textContent).toContain("Memoria");
    expect(screen.getByTestId("memory-start").textContent).toContain("Pares mexicanos");
    expect(screen.getByTestId("memory-start").textContent).not.toContain("Memory");
    expect(screen.queryByTestId("cubetas-board")).toBeNull();
    expect(screen.queryByTestId("hangman-board")).toBeNull();
    expect(screen.queryByTestId("jeopardy-board")).toBeNull();
    expect(screen.queryByTestId("memory-board")).toBeNull();
    expect(document.body.textContent).not.toMatch(/AHORCADO \/ HANGMAN|JEOPARDY SOLO|MEMORIA \/ MEMORY/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hangman-start").textContent).toContain("Hangman"));
    expect(screen.getByTestId("hangman-start").textContent).toContain("Mexican words");
    expect(screen.getByTestId("hangman-start").textContent).not.toContain("Ahorcado");
    expect(screen.getByTestId("cubetas-start").textContent).toContain("Bucket fly");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Pick a category, pick a value, answer.");
    expect(screen.getByTestId("memory-start").textContent).toContain("Memory");
    expect(screen.getByTestId("memory-start").textContent).toContain("Mexican pairs");
    expect(screen.getByTestId("memory-start").textContent).not.toContain("Memoria");
    await user.click(screen.getByTestId("cubetas-start"));
    await waitFor(() => expect(screen.getByTestId("cubetas-board")).toBeTruthy());
    expect(screen.getByTestId("cubetas-title").textContent).toBe("Bucket fly");
    expect(screen.getByTestId("cubetas-chip").textContent).toBe("Ojalá que");
    expect(screen.getByTestId("cubetas-hint").textContent).toBe("Drag or tap the phrase into Subjunctive or Indicative.");
  });

  it("Hangman round: guess letters then Literal then Why", async () => {
    const user = await boot();
    await awaitHome();
    await user.click(screen.getByTestId("hub-games"));
    await waitFor(() => expect(screen.getByTestId("hangman-start")).toBeTruthy());
    await user.click(screen.getByTestId("hangman-start"));
    await waitFor(() => expect(screen.getByTestId("hangman-board")).toBeTruthy());
    expect(screen.getByTestId("hangman-title").textContent).toBe("Ahorcado");
    expect(screen.getByTestId("hangman-quiet").textContent).toBe("Palabras de México");
    expect(screen.getByTestId("hangman-howto").textContent).toBe("Adivina la palabra. Una letra a la vez.");
    expect(screen.getByTestId("hangman-board").getAttribute("data-timer")).toBe("off");
    expect(screen.getByTestId("hangman-mark")).toBeTruthy();
    expect(screen.getByTestId("accent-row")).toBeTruthy();
    expect(screen.getAllByTestId("accent-chip").map((el) => el.textContent).join("")).toBe("ÁÉÍÓÚÜ");
    expect(document.body.textContent).not.toMatch(/AHORCADO \/ HANGMAN|Hanged!|Got it!|💀/);
    expect(screen.queryByTestId("cubetas-cenzontle")).toBeNull();
    const playWord = screen.getByTestId("hangman-board").getAttribute("data-word");
    const slots = screen.getAllByTestId("hangman-slot");
    expect(slots.length).toBe([...playWord.normalize("NFC")].length);
    slots.forEach((el, i) => {
      expect(el.getAttribute("data-slot")).toBe(String(i));
      expect(el.getAttribute("data-key")).toBe(CHOICE_CHIP_KEYS[i]);
      expect(el.style.overflow).not.toBe("hidden");
      expect(el.style.textOverflow).not.toBe("ellipsis");
      expect(el.style.minWidth === "min-content" || el.style.minWidth === "28px").toBe(true);
      expect(el.style.width).toBe("max-content");
    });
    expect(screen.getAllByTestId("hangman-slot-key").map((el) => el.textContent).join("")).toBe(
      CHOICE_CHIP_KEYS.slice(0, slots.length).join(""),
    );
    expect(slots[0].getAttribute("data-focus")).toBe("on");
    await user.keyboard("3");
    await waitFor(() => expect(screen.getAllByTestId("hangman-slot")[2].getAttribute("data-focus")).toBe("on"));
    const missChip = [...screen.getAllByTestId("letter-chip")].find((el) => el.getAttribute("data-letter") === "W");
    if (missChip && screen.getByTestId("hangman-board").getAttribute("data-word").toLocaleUpperCase("es").indexOf("W") < 0) {
      await user.click(missChip);
      await waitFor(() => expect(screen.getByTestId("hangman-wrong").textContent).toBe("Esa no."));
      expect(screen.getByTestId("hangman-literal")).toBeTruthy();
      expect(screen.getByTestId("hangman-why")).toBeTruthy();
      expect(screen.getByTestId("hangman-why").textContent).toMatch(/^Por qué/);
      expect(screen.getByTestId("hangman-region-chip")).toBeTruthy();
      expect(screen.getByTestId("hangman-region-chip").textContent).toMatch(/^MX/);
      expect(screen.queryByTestId("hangman-why-toggle")).toBeNull();
    }
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hangman-howto").textContent).toBe("Guess the word. One letter at a time."));
    expect(screen.getByTestId("hangman-title").textContent).toBe("Hangman");
    expect(screen.getByTestId("hangman-quiet").textContent).toBe("Mexican words");
    const word = screen.getByTestId("hangman-board").getAttribute("data-word");
    const keys = [...new Set([...word.normalize("NFC")].map((ch) => ch.toLocaleUpperCase("es")))];
    const chips = [...screen.getAllByTestId("letter-chip"), ...screen.getAllByTestId("accent-chip")];
    for (const key of keys) {
      const chip = chips.find((el) => el.getAttribute("data-letter") === key);
      expect(chip).toBeTruthy();
      if (!chip.disabled) await user.click(chip);
    }
    await waitFor(() => expect(screen.getByTestId("hangman-literal")).toBeTruthy());
    expect(screen.getByTestId("hangman-win").textContent).toBe("That's it.");
    expect(screen.getByTestId("hangman-word").textContent).toBe(word);
    const literal = screen.getByTestId("hangman-literal");
    const why = screen.getByTestId("hangman-why");
    expect(literal.textContent).toMatch(/^Literal/);
    expect(why.textContent).toMatch(/^Why/);
    expect(literal.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId("hangman-howto")).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("hangman-win").textContent).toBe("¡Eso!"));
    expect(screen.getByTestId("hangman-literal").textContent).toMatch(/^Literal/);
    expect(screen.getByTestId("hangman-why").textContent).toMatch(/^Por qué/);
  });

  it("Jeopardy round: pick a tile, answer, return to the board", async () => {
    const user = await boot();
    await awaitHome();
    await user.click(screen.getByTestId("hub-games"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-start")).toBeTruthy());
    await user.click(screen.getByTestId("jeopardy-start"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-board")).toBeTruthy());
    expect(screen.getByTestId("jeopardy-title").textContent).toBe("Jeopardy");
    expect(screen.getByTestId("jeopardy-quiet").textContent).toBe("Elige categoría, elige valor, responde.");
    expect(screen.getByTestId("jeopardy-howto").textContent).toBe("Elige categoría, elige valor, responde.");
    expect(screen.getByTestId("jeopardy-mark")).toBeTruthy();
    expect(screen.getByTestId("jeopardy-answered").textContent).toBe("0/18");
    expect(screen.getByTestId("jeopardy-grid")).toBeTruthy();
    expect(screen.getByTestId("jeopardy-tile-subj-100")).toBeTruthy();
    expect(screen.getByTestId("jeopardy-cat-reg").textContent).toBe("Registro");
    expect(screen.getByTestId("jeopardy-cat-subj").textContent).toBe("Subjuntivo");
    expect(screen.getByTestId("jeopardy-cat-mex").textContent).toBe("México");
    ["subj", "past", "porpara", "mex", "pron", "reg"].forEach((id) => {
      const el = screen.getByTestId(`jeopardy-cat-${id}`);
      expect(el.textContent.length).toBeGreaterThan(0);
      expect(el.textContent).not.toMatch(/…|\.\.\.$/);
      expect(el.className).toMatch(/word-chip/);
      expect(el.style.overflow).not.toBe("hidden");
      expect(el.style.textOverflow).not.toBe("ellipsis");
      expect(el.style.wordBreak).toBe("keep-all");
      expect(el.style.width).toBe("max-content");
    });
    expect(screen.getByTestId("jeopardy-grid").style.overflow).not.toBe("hidden");
    expect(document.body.textContent).not.toMatch(/JEOPARDY SOLO|Reto Ándale \/ Jeopardy|Register and tone|Registe|and ton/);
    expect(screen.queryByTestId("cubetas-cenzontle")).toBeNull();
    expect(screen.queryByTestId("memory-start")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-howto").textContent).toBe("Pick a category, pick a value, answer."));
    expect(screen.getByTestId("jeopardy-quiet").textContent).toBe("Pick a category, pick a value, answer.");
    expect(screen.getByTestId("jeopardy-cat-reg").textContent).toBe("Register");
    expect(screen.getByTestId("jeopardy-cat-subj").textContent).toBe("Subjunctive");
    expect(screen.getByTestId("jeopardy-cat-mex").textContent).toBe("Mexico");
    expect(screen.getByTestId("jeopardy-cat-pron").textContent).toBe("Pronouns");
    expect(screen.getByTestId("jeopardy-cat-past").textContent).toBe("Past");
    expect(screen.getByTestId("jeopardy-cat-porpara").textContent).toBe("Por/para");
    await user.click(screen.getByTestId("jeopardy-tile-mex-100"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-prompt")).toBeTruthy());
    expect(screen.getByTestId("jeopardy-question").textContent.length).toBeGreaterThan(0);
    expect(screen.getByTestId("jeopardy-choice-0")).toBeTruthy();
    expect(screen.queryByTestId("jeopardy-howto")).toBeNull();
    await user.click(screen.getByTestId("jeopardy-choice-0"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-result")).toBeTruthy());
    expect(screen.getByTestId("jeopardy-continue")).toBeTruthy();
    expect(screen.getByTestId("jeopardy-why")).toBeTruthy();
    await user.click(screen.getByTestId("jeopardy-continue"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-grid")).toBeTruthy());
    expect(screen.getByTestId("jeopardy-answered").textContent).toBe("1/18");
    expect(screen.getByTestId("jeopardy-tile-mex-100").disabled).toBe(true);
    await user.click(screen.getByTestId("jeopardy-back"));
    await waitFor(() => expect(screen.getByTestId("games-hub")).toBeTruthy());
    expect(screen.getByTestId("jeopardy-start")).toBeTruthy();
    expect(screen.getByTestId("cubetas-start")).toBeTruthy();
    expect(screen.getByTestId("hangman-start")).toBeTruthy();
    expect(screen.getByTestId("memory-start")).toBeTruthy();
  });

  it("Memory pairs: tap match, drag-to-pair, full-word bubbles, ✕ back to Games", async () => {
    const user = await boot();
    await awaitHome();
    await user.click(screen.getByTestId("hub-games"));
    await waitFor(() => expect(screen.getByTestId("memory-start")).toBeTruthy());
    expect(screen.getByTestId("memory-start").textContent).toBeTruthy();
    expect(screen.getByTestId("memory-start").textContent).toContain("Memoria");
    expect(screen.getByTestId("memory-start").textContent).toContain("Pares mexicanos");
    await user.click(screen.getByTestId("memory-start"));
    await waitFor(() => expect(screen.getByTestId("memory-board")).toBeTruthy());
    expect(screen.getByTestId("memory-title").textContent).toBe("Memoria");
    expect(screen.getByTestId("memory-quiet").textContent).toBe("Pares mexicanos");
    expect(screen.getByTestId("memory-howto").textContent).toBe("Toca dos cartas o arrastra un par.");
    expect(screen.getByTestId("memory-mark")).toBeTruthy();
    expect(screen.getByTestId("memory-grid")).toBeTruthy();
    expect(screen.queryByTestId("cubetas-cenzontle")).toBeNull();
    expect(document.body.textContent).not.toMatch(/MEMORIA \/ MEMORY|Memory \/ Memoria/);
    const board = screen.getByTestId("memory-board");
    expect(board.className).toMatch(/memory-board/);
    expect(board.style.maxWidth).toBe("none");
    expect(board.style.width).toBe("100%");
    expect(board.style.margin).toBe("0px");
    expect(board.getAttribute("data-board-pad")).toBe("4");
    const cards = screen.getAllByTestId("memory-card");
    expect(cards.length).toBe(12);
    expect(screen.getByTestId("memory-grid").getAttribute("data-cols")).toBe("3");
    expect(screen.getByTestId("memory-grid").style.gridTemplateColumns).toContain("repeat(3");
    expect(screen.getByTestId("memory-grid").style.width).toBe("100%");
    expect(screen.getByTestId("memory-grid").style.maxWidth).toBe("none");
    cards.forEach((el) => {
      assertMemoryBoardCard(el);
      expect(["none", "100%"]).toContain(el.style.maxWidth);
    });
    const tapCard = cards[0];
    const tapPair = tapCard.getAttribute("data-pair");
    const tapKind = tapCard.getAttribute("data-kind");
    const tapMate = cards.find((el) => el.getAttribute("data-pair") === tapPair && el.getAttribute("data-kind") !== tapKind);
    expect(tapMate).toBeTruthy();
    await user.click(tapCard);
    await waitFor(() => expect(tapCard.getAttribute("data-face")).toBe("up"));
    const tapEntry = MEMORY_BANK.find((row) => row.word === tapPair);
    const tapWord = tapKind === "word" ? tapEntry.word : tapEntry.meaning.es;
    const tapGloss = tapKind === "word" ? tapEntry.meaning.es : tapEntry.word;
    expect(tapCard.querySelector("[data-testid='memory-card-word']").textContent).toBe(tapWord);
    expect(tapCard.querySelector("[data-testid='memory-card-gloss']").textContent).toBe(`(${tapGloss})`);
    expect(tapCard.getAttribute("aria-label")).toBe(`${tapWord} (${tapGloss})`);
    const stillDown = cards.find((el) => el !== tapCard && el.getAttribute("data-face") === "down");
    expect(stillDown.querySelector("[data-testid='memory-card-gloss']")).toBeNull();
    await user.click(tapMate);
    await waitFor(() => expect(screen.getByTestId("memory-teach")).toBeTruthy());
    expect(tapCard.getAttribute("data-face")).toBe("up");
    expect(tapMate.getAttribute("data-face")).toBe("up");
    expect(tapCard.getAttribute("data-open")).toBe("yes");
    expect(screen.getByTestId("memory-literal-why").textContent).toBe("Literal · Por qué");
    expect(screen.getByTestId("memory-why").textContent.length).toBeGreaterThan(0);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("memory-howto").textContent).toBe("Tap two cards or drag a pair."));
    expect(screen.getByTestId("memory-title").textContent).toBe("Memory");
    expect(screen.getByTestId("memory-quiet").textContent).toBe("Mexican pairs");
    expect(screen.getByTestId("memory-literal-why").textContent).toBe("Literal · Why");
    const live = screen.getAllByTestId("memory-card");
    const dragCard = live.find((el) => el.getAttribute("data-open") !== "yes");
    expect(dragCard).toBeTruthy();
    const dragPair = dragCard.getAttribute("data-pair");
    const dragKind = dragCard.getAttribute("data-kind");
    const dragMate = live.find((el) => el.getAttribute("data-pair") === dragPair && el.getAttribute("data-kind") !== dragKind);
    fireEvent.pointerDown(dragCard, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(dragMate, { clientX: 40, clientY: 40 });
    await waitFor(() => expect(dragCard.getAttribute("data-open")).toBe("yes"));
    expect(dragMate.getAttribute("data-open")).toBe("yes");
    expect(screen.getByTestId("memory-why").textContent.length).toBeGreaterThan(0);
    const closeBtn = screen.getByTestId("memory-board").querySelector("button[aria-label='Close']");
    expect(closeBtn).toBeTruthy();
    await user.click(closeBtn);
    await waitFor(() => expect(screen.getByTestId("games-hub")).toBeTruthy());
    expect(screen.getByTestId("memory-start")).toBeTruthy();
    expect(screen.getByTestId("cubetas-start")).toBeTruthy();
    expect(screen.getByTestId("hangman-start")).toBeTruthy();
    expect(screen.getByTestId("jeopardy-start")).toBeTruthy();
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
    expect(screen.queryByTestId("level-theater")).toBeNull();
    expect(screen.getByTestId("hub-section-title").textContent).toMatch(/Intermedio|Intermediate/);

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
    expect(ids.filter((id) => ["phrase-doctor", "safe-risky-start", "match-pairs-start", "cubetas-start", "hangman-start", "jeopardy-start", "memory-start"].includes(id)))
      .toEqual(["phrase-doctor", "safe-risky-start", "match-pairs-start", "cubetas-start", "hangman-start", "jeopardy-start", "memory-start"]);
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
    expect(screen.getByTestId("match-play")).toBeTruthy();
    expect(screen.getByTestId("match-play").textContent).toMatch(/Match & play|Empareja y juega/);
    expect(screen.getByTestId("cubetas-start").textContent).toContain("Cubetas");
    expect(screen.getByTestId("cubetas-start").textContent).not.toContain("Bucket fly");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Ahorcado");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Palabras de México");
    expect(screen.getByTestId("hangman-start").textContent).not.toContain("Hangman");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Jeopardy");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Elige categoría, elige valor, responde.");
    expect(screen.getByTestId("memory-start").textContent).toContain("Memoria");
    expect(screen.getByTestId("memory-start").textContent).toContain("Pares mexicanos");
    expect(screen.getByTestId("memory-start").textContent).not.toContain("Memory");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("cubetas-start").textContent).toContain("Bucket fly"));
    expect(screen.getByTestId("cubetas-start").textContent).not.toContain("Cubetas");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Hangman");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Mexican words");
    expect(screen.getByTestId("hangman-start").textContent).not.toContain("Ahorcado");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Pick a category, pick a value, answer.");
    expect(screen.getByTestId("memory-start").textContent).toContain("Memory");
    expect(screen.getByTestId("memory-start").textContent).toContain("Mexican pairs");
    expect(screen.getByTestId("memory-start").textContent).not.toContain("Memoria");
  });

  it("Cubetas: one chip, two mood buckets, wrong returns, correct flies then Literal/Why", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("cubetas-start"));
    await waitFor(() => expect(screen.getByTestId("cubetas-board")).toBeTruthy());
    expect(screen.getByTestId("cubetas-title").textContent).toBe("Cubetas");
    expect(screen.getByTestId("cubetas-chip").textContent).toBe("Ojalá que");
    expect(screen.getByTestId("cubetas-hint").textContent).toBe("Arrastra o toca la frase en Subjuntivo o Indicativo.");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("cubetas-hint").textContent).toBe("Drag or tap the phrase into Subjunctive or Indicative."));
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("cubetas-hint").textContent).toBe("Arrastra o toca la frase en Subjuntivo o Indicativo."));
    expect(screen.getByTestId("cubetas-bucket-subjunctive").textContent).toBe("Subjuntivo");
    expect(screen.getByTestId("cubetas-bucket-indicative").textContent).toBe("Indicativo");
    expect(screen.getByTestId("cubetas-bucket-label-subjunctive").textContent).toBe("Subjuntivo");
    expect(screen.getByTestId("cubetas-bucket-label-indicative").textContent).toBe("Indicativo");
    expect(screen.queryByTestId("cubetas-bucket-trigger")).toBeNull();
    expect(screen.queryByTestId("cubetas-bucket-use")).toBeNull();
    expect(screen.getByTestId("cubetas-board").textContent).not.toMatch(/Trigger|Disparador|\bUso\b/);
    expect(screen.getByTestId("cubetas-cenzontle").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("cubetas-cenzontle").getAttribute("data-state")).toBe("offstage");
    expect(screen.getByTestId("cubetas-bucket-art-subjunctive").getAttribute("src")).toMatch(/cubetas\/bucket-subjunctive\.png/);
    expect(screen.getByTestId("cubetas-bucket-art-indicative").getAttribute("src")).toMatch(/cubetas\/bucket-indicative\.png/);
    expect(screen.getByTestId("cubetas-handle-subjunctive").style.width).toBe("64px");
    expect(screen.getByTestId("cubetas-handle-indicative").style.height).toBe("64px");
    expect(screen.getByTestId("cubetas-bucket-subjunctive").textContent).toBe("Subjuntivo");
    expect(screen.queryByTestId("cubetas-literal")).toBeNull();

    const cubetasChip = screen.getByTestId("cubetas-chip");
    expect(cubetasChip.className).toMatch(/word-chip/);
    expect(cubetasChip.style.overflow).toBe("visible");
    expect(cubetasChip.style.textOverflow).not.toBe("ellipsis");
    expect(cubetasChip.style.width).toBe("max-content");
    expect(cubetasChip.style.minWidth).toBe("min-content");
    expect(cubetasChip.style.maxWidth).toBe("100%");
    await user.click(screen.getByTestId("cubetas-bucket-indicative"));
    await waitFor(() => expect(screen.getByTestId("cubetas-chip").textContent).toBe("Ojalá que"));
    expect(screen.queryByTestId("cubetas-hint")).toBeNull();
    expect(screen.getByTestId("cubetas-cenzontle").getAttribute("data-state")).toBe("offstage");
    expect(screen.getByTestId("cubetas-wrong-teach")).toBeTruthy();
    expect(screen.getByTestId("cubetas-literal").textContent).toContain("Ojalá que");
    expect(screen.getByTestId("cubetas-why").textContent).toContain("Deseo");
    expect(screen.queryByTestId("cubetas-exception")).toBeNull();
    expect(screen.queryByTestId("cubetas-why-toggle")).toBeNull();
    expect(screen.getByTestId("cubetas-board").textContent).not.toMatch(/Mejor respuesta|Better answer|shame/i);

    await user.click(screen.getByTestId("cubetas-bucket-subjunctive"));
    await waitFor(() => expect(screen.queryByTestId("cubetas-chip")).toBeNull());
    const winBird = screen.getByTestId("cubetas-cenzontle");
    expect(winBird.getAttribute("data-state")).toBe("win");
    expect(winBird.getAttribute("width")).toBe("64");
    expect(winBird.className).toContain("cubetas-bird-win");
    expect(screen.getByTestId("cubetas-bucket-subjunctive").querySelector(".cubetas-bucket-win-glow")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("cubetas-literal")).toBeTruthy(), { timeout: 2000 });
    const literal = screen.getByTestId("cubetas-literal");
    const why = screen.getByTestId("cubetas-why");
    const next = screen.getByTestId("cubetas-next");
    expect(literal.textContent).toContain("Traducción");
    expect(literal.textContent).toContain("Ojalá que");
    expect(why.textContent).toContain("Por qué");
    expect(why.textContent).toContain("Deseo");
    expect(literal.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(why.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(next.textContent).toMatch(/Siguiente/i);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("cubetas-literal").textContent).toContain("Literal"));
    expect(screen.getByTestId("cubetas-why").textContent).toContain("Why");
    expect(screen.getByTestId("cubetas-why").textContent).toContain("Wish");
    expect(screen.getByTestId("cubetas-next").textContent).toMatch(/Next chip/i);
    expect(screen.getByTestId("cubetas-title").textContent).toBe("Bucket fly");
    expect(screen.getByTestId("cubetas-bucket-label-subjunctive").textContent).toBe("Subjunctive");
    expect(screen.getByTestId("cubetas-bucket-label-indicative").textContent).toBe("Indicative");
    expect(screen.getByTestId("cubetas-bucket-label-indicative").textContent).not.toMatch(/^Indicate$/);
    const enIndicative = screen.getByTestId("cubetas-bucket-label-indicative");
    expect(enIndicative.style.overflow).toBe("visible");
    expect(enIndicative.style.textOverflow).not.toBe("ellipsis");
    expect(enIndicative.style.whiteSpace).toBe("normal");
  });

  it("long Mexicanismos / long chips are not truncated", async () => {
    const longChip = OJALA_QUE_PACK.find((c) => c.id === "despues-de-que-past");
    expect(longChip.phrase).toBe("Después de que (past done)");
    seedProgress({ uiLang: "en" });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "cubetas",
      tab: "practica",
      cubetasGame: {
        packId: "ojala-que",
        hub: "match-play",
        feeds: "eighty-twenty",
        queue: [longChip],
        scored: [],
        status: "idle",
        lastBucket: null,
        gems: 0,
        xp: 0,
        awarded: false,
        hint: true,
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("cubetas-chip")).toBeTruthy());
    assertFullWordChip(screen.getByTestId("cubetas-chip"), "Después de que (past done)");
    expect(screen.getByTestId("cubetas-chip").className).toMatch(/word-chip--phrase/);

    cleanup();
    seedProgress({ uiLang: "en" });
    const apa = MEMORY_BANK.find((r) => r.word === "apapacho");
    const tian = MEMORY_BANK.find((r) => r.word === "tianguis");
    const morra = MEMORY_BANK.find((r) => r.word === "morra");
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "memory",
      tab: "practica",
      memoryGame: {
        packId: "mexicanismos-v1",
        hub: "games",
        pairs: [apa, tian, morra],
        cards: [
          { id: "apapacho-word", pairId: "apapacho", kind: "word" },
          { id: "apapacho-meaning", pairId: "apapacho", kind: "meaning" },
          { id: "tianguis-word", pairId: "tianguis", kind: "word" },
          { id: "tianguis-meaning", pairId: "tianguis", kind: "meaning" },
          { id: "morra-word", pairId: "morra", kind: "word" },
          { id: "morra-meaning", pairId: "morra", kind: "meaning" },
        ],
        faceUp: ["apapacho-word", "apapacho-meaning", "tianguis-word", "morra-meaning"],
        matched: [],
        lastMatch: null,
        miss: false,
        lastWrong: [],
        status: "play",
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("memory-board")).toBeTruthy());
    const cards = screen.getAllByTestId("memory-card");
    const byId = (id) => cards.find((el) => el.getAttribute("data-card") === id);
    expect(byId("apapacho-word").getAttribute("data-face")).toBe("up");
    assertMemoryBoardCard(byId("apapacho-word"), "apapacho");
    expect(byId("apapacho-word").querySelector("[data-testid='memory-card-gloss']").textContent).toBe("(warm hug / comfort)");
    assertMemoryBoardCard(byId("apapacho-meaning"), "warm hug / comfort");
    expect(byId("apapacho-meaning").querySelector("[data-testid='memory-card-gloss']").textContent).toBe("(apapacho)");
    assertMemoryBoardCard(byId("tianguis-word"), "tianguis");
    expect(byId("tianguis-word").querySelector("[data-testid='memory-card-gloss']").textContent).toBe("(open-air market)");
    assertMemoryBoardCard(byId("morra-meaning"), "young woman (casual)");
    expect(byId("morra-meaning").querySelector("[data-testid='memory-card-gloss']").textContent).toBe("(morra)");
    expect(byId("tianguis-meaning").getAttribute("data-face")).toBe("down");
    expect(byId("tianguis-meaning").querySelector("[data-testid='memory-card-gloss']")).toBeNull();
    expect(byId("morra-word").getAttribute("data-face")).toBe("down");
    expect(byId("morra-word").querySelector("[data-testid='memory-card-gloss']")).toBeNull();
    expect(byId("apapacho-meaning").className).toMatch(/word-chip--phrase/);
    expect(byId("apapacho-word").style.fontSize).toBe(byId("apapacho-meaning").style.fontSize);

    cleanup();
    seedProgress({ uiLang: "en" });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "ahorcado",
      tab: "practica",
      ahorcado: {
        word: "tianguis",
        letters: hangmanLetters("tianguis"),
        guessed: [],
        status: "play",
        focus: 0,
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hangman-board")).toBeTruthy());
    expect(screen.getByTestId("hangman-board").getAttribute("data-word")).toBe("tianguis");
    const slots = screen.getAllByTestId("hangman-slot");
    expect(slots).toHaveLength(8);
    slots.forEach((el) => {
      expect(el.className).toMatch(/word-chip/);
      expect(el.style.overflow).not.toBe("hidden");
      expect(el.style.textOverflow).not.toBe("ellipsis");
      expect(el.style.width).toBe("max-content");
    });

    cleanup();
    seedProgress({ uiLang: "en" });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "ahorcado",
      tab: "practica",
      ahorcado: {
        word: "apapacho",
        letters: hangmanLetters("apapacho"),
        guessed: hangmanLetters("apapacho"),
        status: "win",
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hangman-word")).toBeTruthy());
    assertFullWordChip(screen.getByTestId("hangman-word"), "apapacho");

    cleanup();
    localStorage.removeItem(LIVE_KEY);
    seedProgress();
    const user = await boot();
    await user.click(screen.getByTestId("sobremesa-cta"));
    await waitFor(() => expect(screen.getAllByTestId("sobremesa-line-title").length).toBe(5));
    const titles = screen.getAllByTestId("sobremesa-line-title");
    expect(titles.map((el) => el.textContent)).toEqual(expect.arrayContaining([
      "Pretérito vs imperfecto",
      "Por vs para",
      "Ser vs estar",
      "Gatillos del subjuntivo",
      "Deja de empacar el inglés",
    ]));
    titles.forEach((el) => {
      expect(el.textContent).not.toMatch(ELLIPSIS_RE);
      expect(el.style.overflow).not.toBe("hidden");
      expect(el.style.textOverflow).not.toBe("ellipsis");
      expect(el.className).toMatch(/word-chip/);
    });
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
  }, 15_000);

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
  }, 15_000);

  it("after Lectura claim, that story’s comprehension can lift into rutina", async () => {
    laterHoySeed({ stories: { "story-9": true } });
    const user = await boot();
    await openCaminoMore(user);
    await user.click(screen.getByTestId("camino-daily-workout"));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const lifts = await collectStoryLifts(user);
    expect(lifts.join(" ")).toMatch(/Del cuento/);
    expect(lifts.join(" ")).toMatch(CEREZAS_Q_RE);
    expect(lifts.join(" ")).toMatch(/CUE:Según el cuento/);
    expect(lifts.join(" ")).toMatch(/PASSAGE:/);
    expect(lifts.join(" ")).toMatch(/quince y veinte pesos|dependo de una sola empresa|cambio climático|roya/);
    expect(lifts.join(" ")).not.toMatch(/Responde según lo que acabas de leer|Answer from what you just read/);
  }, 15000);

  it("Lectura still shows comprehension after the last paragraph (ungated in-reader)", async () => {
    seedProgress({ stories: claimStories("story-9") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    expect(document.body.textContent).not.toMatch(CEREZAS_Q_RE);
    await user.click(screen.getByRole("button", { name: "Preguntas" }));
    await waitFor(() => {
      const prompts = screen.getAllByTestId("story-q-prompt");
      expect(prompts.some((el) => el.textContent.includes("¿Por qué se negó"))).toBe(true);
      expect(prompts.some((el) => el.textContent.includes("¿Cuánto recibe don Adán por cada kilo"))).toBe(true);
    });
    expect(screen.getByRole("button", { name: /Volver al cuento|Back to the story/ })).toBeTruthy();
    const passages = screen.getAllByTestId("story-quiz-passage");
    expect(passages.length).toBe(3);
    expect(passages.some((el) => /dependo de una sola empresa/.test(el.textContent))).toBe(true);
    expect(screen.getAllByTestId("story-quiz-cue").every((el) => el.textContent === "Según el cuento")).toBe(true);
    expect(screen.queryByTestId("story-quiz-cue-line")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Responde según lo que acabas de leer|Answer from what you just read/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getAllByTestId("story-quiz-cue")[0].textContent).toBe("From the story"));
    expect(screen.getAllByTestId("story-quiz-cue").every((el) => el.textContent === "From the story")).toBe(true);
    expect(screen.queryByTestId("story-quiz-cue-line")).toBeNull();
  });

  it("cerezas reading quiz Why + Focus follow uiLang after the refused item", async () => {
    seedProgress({ stories: claimStories("story-9") });
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
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
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
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByTestId("home-pitch")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Español mexicano real\. Más allá de lo básico/);
    assertEqualHub();
    expect(screen.getByTestId("camino-more")).toBeTruthy();
  });

  it("Hoy + Doctora door buries EMPIEZA / Repasar / Rutina diaria under Intermedio", async () => {
    cleanup();
    seedProgress({
      srs: { "subj1|0": { ef: 2.5, reps: 1, interval: 1, due: Date.now() - 1000 } },
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("nav-camino").textContent).toBe("Camino");
    expect(screen.getByTestId("hub-section-title").textContent).toBe("Intermedio");
    expect(screen.getByTestId("hub-section-quiet").textContent).toBe("Charla real");
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más|More/);
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
    expect(screen.getByTestId("hub-section-title").textContent).toBe("Intermedio");

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-section-title").textContent).toBe("Intermediate"));
    expect(screen.getByTestId("hub-section-quiet").textContent).toBe("Real talk");
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más|More/);
    expect(screen.getByTestId("path-entry").textContent).toBe("START");
    expect(screen.getByTestId("camino-review").textContent).toMatch(/Review/);
    expect(screen.getByTestId("camino-daily-workout").textContent).toMatch(/Daily routine/);
    expect(screen.getByTestId("nav-camino").textContent).toBe("Learn");
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más opciones|See more|More options/);
  });

  it("Doctora hero still buries path CTAs under Intermedio; life door stays first", async () => {
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
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-hoy")).toBeTruthy();
    expect(screen.getByTestId("hub-section-title").textContent).toBe("Intermedio");
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más|More/);
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

  it("Bank appointment Hoy card shows unit tags, not Las cerezas de don Adán", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 8, 7, 12, 0, 0));
    try {
      cleanup();
      seedProgress();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);
      await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
      expect(hoySceneForDay(HOY_TITLES, dayKeyFromDate(new Date())).title).toBe("Cita en el banco");
      await startHoyFromHub(user);
      await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
      expect(document.body.textContent).toMatch(/Cita en el banco|agendar una cita/);
      expect(document.body.textContent).not.toMatch(/Las cerezas de don Adán/);
      expect(document.body.textContent).not.toMatch(CEREZAS_Q_RE);
      expect(screen.queryByTestId("hoy-story-chip")).toBeNull();
      await user.click(screen.getByTestId("lang-en"));
      await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
      expect(document.body.textContent).not.toMatch(/Las cerezas de don Adán/);
    } finally {
      vi.useRealTimers();
    }
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
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");

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
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-hoy-done")).toBe("1");
    expect(screen.getByTestId("hub-hoy-done")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").getAttribute("data-hub-loud")).toBeNull();
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
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Sigue con tu racha|Keep your streak/);
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
    await waitFor(() => {
      expect(screen.getByTestId("hoy-win")).toBeTruthy();
      expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    });
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    assertFreeWinFlyAway();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
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
      expect(document.body.textContent).not.toMatch(/Sigue con tu racha|Keep your streak/);
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
    expect(document.body.textContent).not.toMatch(/Sigue con tu racha|Keep your streak/);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
  });

  it("tomorrow teaser is inert — plain text, not a button and not clickable", async () => {
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

  it("Hoy connector selected-state is marked and Listen plays the scene line", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const line = "¿Con todo, joven, o se lo preparo sin cebolla?";
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
        questions: [{
          type: "mc",
          prompt: "Si el taquero pregunta «¿con todo?», normalmente habla de:",
          text: line,
          line,
          choices: ["cilantro, cebolla, salsa y guarnición", "la cuenta con propina"],
          answer: "cilantro, cebolla, salsa y guarnición",
          shuffledChoices: ["cilantro, cebolla, salsa y guarnición", "la cuenta con propina"],
          _u: "_today",
          _i: -1,
        }],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-listen")).toBeTruthy());
    const cards = screen.getAllByTestId("choice-card");
    expect(cards.length).toBe(2);
    expect(cards[0].getAttribute("aria-pressed")).toBe("false");
    expect(cards[0].getAttribute("data-selected")).toBeNull();
    await user.click(cards[0]);
    expect(cards[0].getAttribute("aria-pressed")).toBe("true");
    expect(cards[0].getAttribute("data-selected")).toBe("true");
    expect(cards[1].getAttribute("aria-pressed")).toBe("false");
    expect(cards[1].getAttribute("data-selected")).toBeNull();
    expect(cards[0].style.boxShadow).toMatch(/3px/);
    window.speechSynthesis.speak.mockClear();
    await user.click(screen.getByTestId("lesson-listen"));
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
    const uttered = window.speechSynthesis.speak.mock.calls[0][0];
    expect(uttered.text).toBe(line);
    expect(uttered.text).not.toMatch(/normalmente habla/);
    expect(screen.queryByTestId("lesson-listen-skip")).toBeNull();
  });

  it("Hoy Listen Skip continues when you cannot hear", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, hearts: 5 });
    const line = "¿Con todo, joven, o se lo preparo sin cebolla?";
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
          {
            type: "listen",
            text: line,
            answers: [line],
            _u: "_today",
            _i: -1,
          },
          {
            type: "mc",
            prompt: "after-skip connector",
            text: line,
            line,
            choices: ["cilantro, cebolla, salsa y guarnición", "la cuenta con propina"],
            answer: "cilantro, cebolla, salsa y guarnición",
            shuffledChoices: ["cilantro, cebolla, salsa y guarnición", "la cuenta con propina"],
            _u: "_today",
            _i: -1,
          },
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-listen-skip")).toBeTruthy());
    expect(screen.getByTestId("lesson-listen")).toBeTruthy();
    expect(screen.getByTestId("lesson-listen").className).toMatch(/duo-btn/);
    const skip = screen.getByTestId("lesson-listen-skip");
    expect(skip.textContent).toBe("Saltar");
    expect(screen.getByTestId("lesson-listen-skip-hint").textContent).toBe("Si no puedes oír");
    expect(skip.className).not.toMatch(/duo-btn/);
    expect(skip.style.background).toMatch(CREAM_FILL);
    expect(skip.style.fontSize).toBe("11px");
    expect(screen.queryByRole("button", { name: /^SALTAR$|^SKIP$/ })).toBeNull();

    await user.click(skip);
    await waitFor(() => expect(screen.getByText("after-skip connector")).toBeTruthy());
    expect(screen.queryByTestId("lesson-listen-skip")).toBeNull();
    expect(screen.queryByTestId("lesson-listen-skip-hint")).toBeNull();
    expect(screen.queryByTestId("hoy-win")).toBeNull();
    expect(document.body.textContent).toMatch(/Escribe lo que escuchas|after-skip connector/);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").hearts ?? 5).toBe(5);
  });

  it("Listen Skip on a last dictation beat finishes the lesson", async () => {
    cleanup();
    seedProgress({ hearts: 5 });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Listen skip last",
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
    await waitFor(() => expect(screen.getByTestId("lesson-listen-skip")).toBeTruthy());
    await user.click(screen.getByTestId("lesson-listen-skip"));
    await waitFor(() => expect(screen.getByRole("heading", { name: /completada|complete/i })).toBeTruthy());
    expect(screen.queryByTestId("lesson-listen-skip")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").hearts ?? 5).toBe(5);
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
      expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    });
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    assertFreeWinFlyAway();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Ganaste!|You won!/);
    expect(document.body.textContent).not.toMatch(/¡IMPECABLE!|FLAWLESS!/);
    expect(document.body.textContent).not.toMatch(/beat 2 must not run|beat 5 must not run/);
    assertCreamShell();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("That's it."));
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /You won!|¡Ganaste!|Lesson complete/ })).toBeNull();
    assertFreeWinFlyAway();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    await waitFor(() => {
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.streak).toBe(1);
      expect(prog.lastDay).toBe(today);
      expect(prog.missions[`scene-${today}`]).toBe("taqueria");
    });
    await user.click(screen.getByTestId("hoy-win-continue"));
    await lecturaThenBajioWall(user);
    await awaitHome();
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Vuelve mañana por «.+»\.$/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).not.toBe("Vuelve mañana por la siguiente escena.");
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Sigue con tu racha");
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-hoy-done")).toBe("1");
    expect(screen.getByTestId("hub-hoy-done")).toBeTruthy();
    expect(screen.getByTestId("hub-stories").getAttribute("data-hub-loud")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-hoy-done")).toBe("1");
    expect(screen.getByTestId("hub-hoy-done")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("learn-hub-tiles").querySelectorAll("button")).toHaveLength(6);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Meta:\s*\d+\/40/);
    expect(screen.getByTestId("rayo-toggle")).toBeTruthy();
    expect(screen.getByTestId("coach-strip")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.queryByTestId("first-door-hero")).toBeNull();
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/Continuar|Subjuntivo/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("en")));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Come back tomorrow for “.+”\.$/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).not.toBe("Come back tomorrow for the next scene.");
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
  });

  it("locked Lectura stories stay closed on the path and the shelf", async () => {
    const user = await boot();
    const camino2 = screen.getByTestId("camino-story-story-2");
    expect(camino2.getAttribute("data-locked")).toBe("true");
    expect(camino2.disabled).toBe(true);
    expect(screen.getByTestId("camino-story-story-0").getAttribute("data-locked")).toBe("false");
    expect(screen.getByTestId("camino-story-story-1").getAttribute("data-locked")).toBe("true");
    fireEvent.click(camino2);
    expect(screen.queryByTestId("story-reader")).toBeNull();
    await user.click(screen.getByTestId("nav-lectura"));
    const shelf2 = screen.getByTestId("story-shelf-story-2");
    expect(shelf2.getAttribute("data-locked")).toBe("true");
    expect(shelf2.disabled).toBe(true);
    expect(screen.getByTestId("story-shelf-story-0").getAttribute("data-locked")).toBe("false");
    expect(screen.getByTestId("story-shelf-story-9").getAttribute("data-locked")).toBe("true");
    fireEvent.click(shelf2);
    fireEvent.click(screen.getByTestId("story-shelf-story-9"));
    expect(screen.queryByTestId("story-reader")).toBeNull();
    await user.click(screen.getByTestId("story-shelf-story-0"));
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-0");
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-0/p0.png`);
  });

  it("first Cenzontle win shows one quiet Lectura handoff and opens story-0", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, uiLang: "es" });
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
        questions: [hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:")],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelector(".choice-card"));
    await user.click(screen.getByTestId("lesson-check"));
    await user.click(await screen.findByRole("button", { name: /^Continuar$/i }));
    const strip = await screen.findByTestId("lectura-handoff");
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    expect(strip.querySelector("img")).toBeNull();
    expect(screen.getByTestId("lectura-handoff-quiet").textContent).toBe(LECTURA_HANDOFF_QUIET.es);
    const cta = screen.getByTestId("lectura-handoff-cta");
    expect(cta.textContent).toBe(LECTURA_HANDOFF_CTA.es);
    expect(cta.getAttribute("data-story-id")).toBe("story-0");
    expect(cta.className).not.toMatch(/duo-btn/);
    expect(cta.style.backgroundColor).toBe("rgb(246, 239, 228)");
    expect(cta.style.color).toBe("rgb(92, 115, 86)");
    expect(cta.style.backgroundColor).not.toBe(screen.getByTestId("hoy-win-continue").style.backgroundColor);
    expect(strip.textContent).not.toContain(LECTURA_HANDOFF_QUIET.en);
    expect(strip.textContent).not.toContain(LECTURA_HANDOFF_CTA.en);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).lecturaHandoffSeen).toBe(true));
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lectura-handoff-quiet").textContent).toBe(LECTURA_HANDOFF_QUIET.en));
    expect(screen.getByTestId("lectura-handoff-cta").textContent).toBe(LECTURA_HANDOFF_CTA.en);
    expect(screen.getByTestId("lectura-handoff").textContent).not.toMatch(/El cuento es lo que sigue|Leer el cuento/);
    expect(screen.getByTestId("hoy-win").textContent).toBe("That's it.");
    await user.click(screen.getByTestId("lectura-handoff-cta"));
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-0");
    expect(reader.textContent).toMatch(/La noche en que vuelven/);
    expect(screen.queryByTestId("lectura-handoff")).toBeNull();
    expect(screen.queryByTestId("hoy-win")).toBeNull();
  });

  it("Lectura handoff once-gate stays down, and a claimed story-0 opens the next unread", async () => {
    cleanup();
    seedProgress({ uiLang: "es", lecturaHandoffSeen: true, streak: 1, lastDay: localToday() });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "done",
      tab: "camino",
      lessonStats: { right: 1, wrong: 0 },
      session: {
        firstHoy: true,
        title: "Noche de faroles",
        host: "luna",
        questions: [{}],
        awarded: true,
        earnedXP: 12,
        earnedGems: 1,
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("lectura-handoff")).toBeNull();
    expect(screen.getByTestId("win-fly-away")).toBeTruthy();

    cleanup();
    seedProgress({ uiLang: "es", stories: { "story-0": true }, streak: 1, lastDay: localToday() });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "done",
      tab: "camino",
      lessonStats: { right: 1, wrong: 0 },
      session: {
        firstHoy: true,
        title: "Noche de faroles",
        host: "luna",
        questions: [{}],
        awarded: true,
        earnedXP: 12,
        earnedGems: 1,
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    const cta = await screen.findByTestId("lectura-handoff-cta");
    expect(cta.getAttribute("data-story-id")).toBe("story-1");
    expect(screen.getByTestId("lectura-handoff-quiet").textContent).toBe(LECTURA_HANDOFF_QUIET.es);
    await user.click(cta);
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-1");
    expect(reader.textContent).toMatch(/La casa azul/);
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
      expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    });
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    assertFreeWinFlyAway();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
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
    await lecturaThenBajioWall(user);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Sigue con tu racha");
    assertSoftPaywallAnnualPrimary("es");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
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
    assertNoWallBeforeLectura();
    await openStory0(user);
    await user.click(screen.getByTestId("brand-home"));
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
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Sigue con tu racha");

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
      await lecturaThenBajioWall(user);
      expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Sigue con tu racha");
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
    await lecturaThenBajioWall(user);
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Sigue con tu racha");
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
      await lecturaThenBajioWall(user);
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
      expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
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
    await lecturaThenBajioWall(user);
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Sigue con tu racha");
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
    await lecturaThenBajioWall(user);
    expect(screen.getByTestId("soft-paywall-dismiss").textContent).toBe("Seguir gratis");
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    const handoff = screen.getByTestId("post-dismiss-handoff");
    expect(handoff).toBeTruthy();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(handoff.textContent).not.toMatch(/Phrase Doctor/);
    expect(screen.queryByTestId("phrase-doctor-board")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE));
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
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
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
    expect(document.body.textContent).toMatch(/later Hoy beat 2/);
    expect(document.body.textContent).not.toMatch(/¡Eso!|That's it\./);
  });

  it("later Hoy same day does not replay the 780ms Cenzontle beat", async () => {
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
    await waitFor(() => expect(screen.getByRole("heading", { name: /Lección completada|Lesson complete/ })).toBeTruthy());
    expect(screen.queryByTestId("hoy-win")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
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
      expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    });
    expect(screen.getByTestId("doctora-win").textContent).toBe("¡Eso!");
    assertFreeWinFlyAway();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Ganaste!|You won!/);
    expect(document.body.textContent).not.toMatch(/¡IMPECABLE!|FLAWLESS!/);
    expect(document.body.textContent).not.toMatch(/Necesito hacer una decisión|Voy a aplicar para el trabajo|beat 5/);
    expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    expect(screen.queryByTestId("win-earned-xp")).toBeNull();
    expect(screen.queryByTestId("win-earned-gems")).toBeNull();
    expect(screen.getByTestId("win-earned-streak")).toBeTruthy();
    const doctoraWinScreen = screen.getByTestId("doctora-win").parentElement;
    expect(doctoraWinScreen.textContent).not.toMatch(/\+\d+/);
    expect(doctoraWinScreen.textContent).not.toMatch(/\bXP\b/);
    expect(doctoraWinScreen.textContent).not.toMatch(/gemas|\bgems\b/i);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).xp).toBe(42);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).gems).toBe(9);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("doctora-win").textContent).toBe("That's it."));
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /You won!|¡Ganaste!|Lesson complete/ })).toBeNull();
    assertFreeWinFlyAway();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("doctora-win").textContent).toBe("¡Eso!"));
    await user.click(screen.getByTestId("doctora-win-continue"));
    await waitFor(() => expect(screen.getByTestId("session-close")).toBeTruthy());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).lastDay).toBe(today);
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("session-close-next").textContent).toBe("Jugar la escena");
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
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
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByText(/Vuelve mañana|Come back tomorrow/)).toBeNull();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Sigue con tu racha");
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    const handoff = screen.getByTestId("post-dismiss-handoff");
    expect(handoff).toBeTruthy();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Jugar la escena|Continuar|Subjuntivo/);
    expect(handoff.textContent).not.toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hub-phrase-doctor")).toBeTruthy();
    expect(screen.getByTestId("hub-hoy")).toBeTruthy();
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE));
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByText(/Come back tomorrow for/)).toBeNull();
  });

  it("first-session Doctora win lands on next-beat card — streak + playScene + Listo/Done", async () => {
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
    expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    expect(screen.queryByTestId("win-earned-xp")).toBeNull();
    expect(screen.queryByTestId("win-earned-gems")).toBeNull();
    expect(screen.getByTestId("win-earned-streak")).toBeTruthy();
    expect(screen.getByTestId("doctora-win").parentElement.textContent).not.toMatch(/\+\d+|\bXP\b|gemas|\bgems\b/i);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).xp).toBe(42);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).gems).toBe(9);
    await user.click(screen.getByTestId("doctora-win-continue"));
    await waitFor(() => expect(screen.getByTestId("session-close")).toBeTruthy());
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("session-close-next").tagName).toBe("P");
    expect(screen.getByTestId("session-close-next").textContent).toBe("Jugar la escena");
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
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
    expect(screen.getByTestId("session-close-next").textContent).toBe("Play the scene");
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
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
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Eso!|That's it\./);
    const otra = [...screen.getByTestId("phrase-doctor-board").querySelectorAll("button")].find((b) => /Otra|New/.test(b.textContent));
    expect(otra).toBeTruthy();
    await user.click(otra);
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-guess")).toBeTruthy());
    expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/¿Puedo obtener un café\?/);
    expect(screen.queryByTestId("doctora-win")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
  });

  it("later Doctora same day does not replay the 780ms Cenzontle beat", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-practica")).toBeTruthy());
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/NATURAL/));
    expect(screen.queryByTestId("doctora-win")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
    const otra = [...screen.getByTestId("phrase-doctor-board").querySelectorAll("button")].find((b) => /Otra|New/.test(b.textContent));
    expect(otra).toBeTruthy();
    await user.click(otra);
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-guess")).toBeTruthy());
    expect(screen.queryByTestId("doctora-win")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
  });

  it("soft paywall does not render on splash or boot before a win", async () => {
    cleanup();
    localStorage.clear();
    render(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: /¡Empezar!|Start!/ })).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Sigue con tu racha|Keep your streak/);
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
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Sigue con tu racha");
    expect(screen.getByTestId("soft-paywall-body").textContent).toBe("Escenas, Cubetas y la doctora — sin techo.");
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.getByTestId("soft-paywall").textContent).not.toMatch(/Orden distinto, mismo sentido|Different order, same meaning/);
    expect(screen.getByTestId("soft-paywall").querySelector("[data-testid=\"word-order-tip\"]")).toBeNull();

    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);

    await user.click(screen.getByTestId("nav-camino"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByText(/Vuelve mañana|Come back tomorrow/)).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hero-cta")).toBeTruthy();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Subjuntivo/);
    expect(screen.getByTestId("hub-hoy")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor")).toBeTruthy();

    cleanup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
  });

  it("soft paywall EN strings after first-win state; annual CTA on web does not fake a charge", async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: today });
    window.__andalePurchaseLog = [];
    const events = [];
    const onPurchase = (e) => events.push(e.detail);
    window.addEventListener("andale-purchase", onPurchase);
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Keep your streak");
    expect(screen.getByTestId("soft-paywall-body").textContent).toBe("Stories, Cubetas, and Phrase Doctor — no ceiling.");
    assertSoftPaywallAnnualPrimary("en");

    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(events.length).toBeGreaterThan(0));
    expect(events[0].status).toBe("failure");
    expect(events[0].charged).toBe(false);
    expect(events[0].reason).toBe("web_no_iap");
    expect(events[0].plan).toBe("annual");
    expect(events[0].productId).toBe("com.andale.app.premium.annual");
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-honesty").textContent).toBe("Practice · no charge yet");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.unlockedPrem).not.toBe(true);
    expect(stored.paywallPlan).toBeFalsy();
    expect(stored.paywallSeen).not.toBe(true);
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByText(/Come back tomorrow for/)).toBeNull();
    expect(screen.getByTestId("hero-cta")).toBeTruthy();
    window.removeEventListener("andale-purchase", onPurchase);
  });

  it("soft paywall monthly CTA on web stays honest and does not unlock", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday() });
    const events = [];
    const onPurchase = (e) => events.push(e.detail);
    window.addEventListener("andale-purchase", onPurchase);
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("es");
    await user.click(screen.getByTestId("soft-paywall-monthly"));
    await waitFor(() => expect(events.at(-1)?.reason).toBe("web_no_iap"));
    expect(events.at(-1).plan).toBe("monthly");
    expect(events.at(-1).charged).toBe(false);
    expect(events.at(-1).productId).toBe("com.andale.app.premium.monthly");
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-honesty").textContent).toBe("Práctica · sin cobro todavía");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.unlockedPrem).not.toBe(true);
    expect(stored.paywallPlan).toBeFalsy();
    window.removeEventListener("andale-purchase", onPurchase);
  });

  it("soft paywall annual unlocks only after a real purchase success event", async () => {
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: localToday() });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativePurchase = async ({ productId }) => ({ status: "success", productId });
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    const events = [];
    const onPurchase = (e) => events.push(e.detail);
    window.addEventListener("andale-purchase", onPurchase);
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(events.some((e) => e.status === "success" && e.charged === true && e.plan === "annual")).toBe(true);
    const bought = funnelOf("purchase");
    expect(bought).toHaveLength(1);
    expect(bought[0].plan).toBe("annual");
    expect(bought[0].productId).toBe("com.andale.app.premium.annual");
    expect(Object.keys(bought[0]).sort()).toEqual(["at", "event", "plan", "productId"]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.paywallSeen).toBe(true);
    expect(stored.paywallPlan).toBe("annual");
    expect(stored.unlockedPrem).toBe(true);
    expect(stored.iapProductId).toBe("com.andale.app.premium.annual");
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    window.removeEventListener("andale-purchase", onPurchase);
    delete window.__andaleIapEnv;
    delete window.__andaleNativePurchase;
    delete window.__andaleNativeRestore;
  });

  it("soft paywall yearly is sole filled primary; monthly is outline; continue free is quiet", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday() });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.getByTestId("soft-paywall-honesty").textContent).toBe("Práctica · sin cobro todavía");
    expect(screen.getByTestId("soft-paywall-dismiss").textContent).toBe("Seguir gratis");
  });

  it("soft paywall conversion look: one bird, George hierarchy, dismiss leaves hub unchanged", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday() });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.getByTestId("soft-paywall").querySelectorAll("img[src*='cenzontle']")).toHaveLength(1);
    const hubSnap = {
      hoy: screen.getByTestId("hub-hoy").textContent,
      stories: screen.getByTestId("hub-stories").textContent,
      games: screen.getByTestId("hub-games").textContent,
      doctor: screen.getByTestId("hub-phrase-doctor").textContent,
      eighty: screen.getByTestId("eighty-twenty-cta").textContent,
      sendero: screen.getByTestId("hub-sendero").textContent,
      tiles: screen.getByTestId("learn-hub-tiles").childElementCount,
    };
    expect(hubSnap.hoy).toMatch(/Hoy/);
    expect(hubSnap.hoy).toMatch(/Plan de 10 minutos/);
    expect(hubSnap.sendero).toMatch(/Tu camino/);
    expect(hubSnap.hoy + hubSnap.stories + hubSnap.games).not.toMatch(/Un año|Seguir gratis|Mexicanismos|Lección perfecta/);
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-hoy").textContent).toBe(hubSnap.hoy);
    expect(screen.getByTestId("hub-stories").textContent).toBe(hubSnap.stories);
    expect(screen.getByTestId("hub-games").textContent).toBe(hubSnap.games);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toBe(hubSnap.doctor);
    expect(screen.getByTestId("eighty-twenty-cta").textContent).toBe(hubSnap.eighty);
    expect(screen.getByTestId("hub-sendero").textContent).toBe(hubSnap.sendero);
    expect(screen.getByTestId("learn-hub-tiles").childElementCount).toBe(hubSnap.tiles);
    expect(screen.queryByTestId("soft-paywall-cenzontle")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.getByTestId("learn-hub").textContent).not.toMatch(/Sigue con tu racha|Un año|Seguir gratis/);
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
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).a2hsSeen).toBe(true);
    expect(document.body.textContent).not.toMatch(/Sigue con tu racha/);
    expect(screen.getByTestId("a2hs-sheet").textContent).not.toMatch(/\$39\.99|\$6\.99/);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("a2hs-title").textContent).toBe("Add Ándale to your Home Screen"));
    expect(screen.getByTestId("a2hs-how").textContent).toBe("Tap Share, then Add to Home Screen.");
    expect(screen.getByTestId("a2hs-dismiss").textContent).toBe("Not now");
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);

    await user.click(screen.getByTestId("a2hs-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("a2hs-sheet")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
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
    await waitFor(() => expect(window.__andalePurchaseLog?.at(-1)?.reason).toBe("web_no_iap"));
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);
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
    expect(screen.getByTestId("lesson-listen-skip").textContent).toBe("Saltar");
    expect(screen.getByTestId("lesson-listen-skip-hint").textContent).toBe("Si no puedes oír");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Listen" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Listen" }).getAttribute("aria-label")).toBe("Listen");
    expect(screen.getByRole("button", { name: "Slower" }).getAttribute("aria-label")).toBe("Slower");
    expect(screen.queryByRole("button", { name: "Escuchar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Más lento" })).toBeNull();
    expect(screen.getByTestId("lesson-listen-skip").textContent).toBe("Skip");
    expect(screen.getByTestId("lesson-listen-skip-hint").textContent).toBe("If you can’t hear");
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("lesson-listen-skip").textContent).toBe("Saltar"));
    expect(screen.getByTestId("lesson-listen-skip-hint").textContent).toBe("Si no puedes oír");
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
    expect(screen.getByTestId("accent-row")).toBeTruthy();
    expect(screen.getAllByTestId("accent-chip").map((el) => el.textContent).join("")).toBe("ÁÉÍÓÚÜ");
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

  it("Learn hub one face — uiLang flip moves all six tiles, no salad", async () => {
    const user = await boot();
    assertHubFace("es");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-stories").textContent).toContain("Stories"));
    assertHubFace("en");
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("hub-stories").textContent).toContain("Cuentos"));
    assertHubFace("es");
  });

  it("Sendero opens Camino path; Hoy is the 10-min plan — George stamps", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("lang-es"));
    assertEqualHub();
    assertHubFace("es");
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("Plan de 10 minutos");
    expect(screen.getByTestId("hub-sendero-quiet").textContent).toBe("Tu camino");
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Reglas del subjuntivo");
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
    assertHubFace("en");
    expect(screen.getByTestId("hub-sendero-quiet").textContent).toBe("Your path");
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Subjunctive rules");

    await user.click(screen.getByTestId("hub-hoy"));
    await waitFor(() => expect(screen.getByTestId("hoy-plan-eyebrow").textContent).toBe("TODAY · 10 MIN"));
    expect(screen.getByTestId("hoy-plan-sell").textContent).toBe("A short plan for today. Ten minutes. Then you stop.");
    expect(screen.getByTestId("hoy-plan-step").textContent).toBe("Play the scene");
    expect(screen.getByTestId("hoy-plan-start").textContent).toBe("Start the plan");

    await user.click(screen.getByTestId("hoy-plan-start"));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const sceneChip = screen.getByTestId("lesson-scene-chip");
    expect(sceneChip.textContent.trim().length).toBeGreaterThan(8);
    expect(sceneChip.style.background).toMatch(/transparent|^$/);
    expect(`${sceneChip.style.border} ${sceneChip.style.borderColor} ${sceneChip.style.background}`).not.toMatch(/#FFC800|#FFC800|rgb\(\s*255,\s*200,\s*0\s*\)/i);
    expect(Number.parseInt(sceneChip.querySelector("div").style.fontSize, 10)).toBeLessThanOrEqual(12);
    expect(screen.getAllByTestId("choice-card").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("lesson-check")).toBeTruthy();
  });

  it("Learn first CTA is 80/20 Subjuntivo in five — George exact, no deck, no pep", async () => {
    const user = await boot();
    const cta = screen.getByTestId("eighty-twenty-cta");
    expect(cta).toBeTruthy();
    expect(screen.getByTestId("eighty-twenty-label").textContent).toBe(SUBJ_FIVE_LABEL);
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Reglas del subjuntivo");
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
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Subjunctive rules");
    expect(screen.queryByTestId("eighty-twenty-sub")).toBeNull();

    await user.click(screen.getByTestId("eighty-twenty-cta"));
    await waitFor(() => expect(screen.getByTestId("eighty-twenty-sheet")).toBeTruthy());
    expect(screen.getAllByTestId("eighty-twenty-line").map((el) => el.textContent)).toEqual(SUBJ_FIVE.en);
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
  });

  it("Intermedio lane is the ROI5 entry — five first, tips behind, no seventh Learn tile", async () => {
    const user = await boot();
    expect(screen.queryByTestId("hub-sobremesa")).toBeNull();
    expect(screen.getByTestId("learn-hub-tiles").textContent).not.toMatch(/Sobremesa|Intermedio|Intermediate/);
    expect(screen.getByTestId("learn-hub-tiles").querySelectorAll("button")).toHaveLength(6);
    expect(screen.getByTestId("eighty-twenty-cta").textContent).toMatch(/80\/20/);
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Reglas del subjuntivo");
    expect(screen.getByTestId("eighty-twenty-cta").textContent).not.toMatch(/Sobremesa|Intermedio/);
    const lane = screen.getByTestId("intermedio-lane");
    const cta = screen.getByTestId("sobremesa-cta");
    expect(lane.contains(cta)).toBe(true);
    expect(screen.getByTestId("sobremesa-cta-label").textContent).toBe(sobremesaName("es"));
    expect(screen.getByTestId("hub-section-title").textContent).toBe(SOBREMESA_NAME.es);
    expect(screen.getByTestId("sobremesa-cta-quiet").textContent).toBe(SOBREMESA_QUIET.es);
    expect(screen.getByTestId("hub-section-quiet").textContent).toBe("Charla real");
    expect(screen.getByTestId("sobremesa-cta-sell").textContent).toBe(SOBREMESA_SELL.es);
    expect(screen.getByTestId("hub-section-sell").textContent).toBe(SOBREMESA_SELL.es);
    expect(cta.textContent).not.toMatch(/Club|80%|Sobremesa/);
    expect(lane.style.background).toMatch(CREAM_FILL);
    expect(lane.style.border).not.toMatch(/58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("hub-hoy").style.border).toMatch(/58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.queryByTestId("sobremesa-sheet")).toBeNull();

    await user.click(cta);
    await waitFor(() => expect(screen.getByTestId("sobremesa-sheet")).toBeTruthy());
    expect(screen.getByTestId("sobremesa-name").textContent).toBe(sobremesaName("es"));
    expect(screen.getByTestId("sobremesa-quiet").textContent).toBe(SOBREMESA_QUIET.es);
    expect(screen.getByTestId("sobremesa-sell").textContent).toBe(SOBREMESA_SELL.es);
    const five = screen.getByTestId("sobremesa-five");
    const tips = screen.getByTestId("sobremesa-tips");
    const deepen = screen.getByTestId("sobremesa-deepen");
    expect(five.compareDocumentPosition(tips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tips.compareDocumentPosition(deepen) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByTestId("sobremesa-line").map((el) => el.textContent)).toEqual(SOBREMESA_FIVE.es);
    screen.getAllByTestId("sobremesa-line").forEach((card) => {
      expect(card.style.background).toMatch(CREAM_FILL);
    });
    expect(screen.getByTestId("sobremesa-tips-summary").getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByTestId("sobremesa-deepen-summary").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("sobremesa-tips-list")).toBeNull();
    expect(screen.queryByTestId("sobremesa-tip")).toBeNull();
    expect(screen.queryByTestId("sobremesa-deepen-body")).toBeNull();
    expect(screen.queryByTestId("hub-sobremesa")).toBeNull();
    expect(screen.queryByTestId("eighty-twenty-sheet")).toBeNull();
    const sheet = screen.getByTestId("sobremesa-sheet");
    expect(screen.getByTestId("sobremesa-perch").getAttribute("src")).toMatch(/cenzontle\.png/);
    expect(sheet.querySelector(".cenzontle-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
    expect(sheet.textContent).not.toMatch(/Club|Practice this now|Practicar ahora|You've got this|Deck/);

    await user.click(screen.getByTestId("sobremesa-tips-summary"));
    await waitFor(() => expect(screen.getByTestId("sobremesa-tips-list")).toBeTruthy());
    expect(screen.getAllByTestId("sobremesa-tip").map((el) => el.textContent)).toEqual(
      sobremesaTips("es").map((tip) => sobremesaTipText(tip)),
    );
    expect(screen.getAllByTestId("sobremesa-tip").filter((el) => el.getAttribute("data-mexico") === "1").length).toBe(8);
    expect(screen.getAllByTestId("sobremesa-tip").some((el) => el.textContent.includes("🇲🇽"))).toBe(true);

    await user.click(screen.getByTestId("sobremesa-deepen-summary"));
    await waitFor(() => expect(screen.getByTestId("sobremesa-deepen-body")).toBeTruthy());
    expect(screen.getAllByTestId("sobremesa-deepen-line").map((el) => el.textContent)).toEqual([
      ...sobremesaDeepen("es").subjunctive,
      ...sobremesaDeepen("es").porpara,
    ]);

    await user.click(screen.getByTestId("sobremesa-close"));
    await waitFor(() => expect(screen.queryByTestId("sobremesa-sheet")).toBeNull());

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("sobremesa-cta-quiet").textContent).toBe(SOBREMESA_QUIET.en));
    expect(screen.getByTestId("sobremesa-cta-label").textContent).toBe(sobremesaName("en"));
    expect(screen.getByTestId("hub-section-title").textContent).toBe("Intermediate");
    expect(screen.getByTestId("hub-section-quiet").textContent).toBe("Real talk");
    expect(screen.getByTestId("sobremesa-cta-sell").textContent).toBe(SOBREMESA_SELL.en);
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Subjunctive rules");
    await user.click(screen.getByTestId("sobremesa-cta"));
    await waitFor(() => expect(screen.getByTestId("sobremesa-sheet")).toBeTruthy());
    expect(screen.getByTestId("sobremesa-name").textContent).toBe(sobremesaName("en"));
    expect(screen.getByTestId("sobremesa-quiet").textContent).toBe(SOBREMESA_QUIET.en);
    expect(screen.getByTestId("sobremesa-sell").textContent).toBe(SOBREMESA_SELL.en);
    expect(screen.getAllByTestId("sobremesa-line").map((el) => el.textContent)).toEqual(SOBREMESA_FIVE.en);
    expect(screen.getByTestId("sobremesa-tips-summary").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("sobremesa-tips-list")).toBeNull();
    expect(screen.queryByTestId("hub-sobremesa")).toBeNull();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
  });

  it("locks one warm cream on Learn, Phrase Doctor, and Lectura shells", async () => {
    const user = await boot();
    assertCreamShell();
    expect(screen.getByTestId("learn-hub").style.background).toMatch(CREAM_FILL);
    [...screen.getByTestId("learn-hub-tiles").querySelectorAll("button")].forEach((tile) => {
      expect(tile.style.background).toMatch(CREAM_FILL);
    });

    await user.click(screen.getByTestId("hub-phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    assertCreamShell();

    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-map")).toBeTruthy());
    assertCreamShell();
  });

  it("timer-off chrome stays off Hoy, Lectura, Doctora, and untimed lessons", async () => {
    const user = await boot();
    expect(screen.queryByTestId("run-timer-toggle")).toBeNull();
    expect(screen.queryByTestId("run-timer-off-chip")).toBeNull();
    expect(screen.queryByTestId("rayo-clock")).toBeNull();

    await startHoyFromHub(user);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.queryByTestId("run-timer-toggle")).toBeNull();
    expect(screen.queryByTestId("run-timer-off-chip")).toBeNull();
    expect(screen.queryByTestId("rayo-clock")).toBeNull();
    await user.click(screen.getByTestId("lesson-exit"));
    await user.click(screen.getByTestId("quit-without-save"));
    await awaitHome();

    await user.click(screen.getByTestId("hub-phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(screen.queryByTestId("run-timer-toggle")).toBeNull();
    expect(screen.queryByTestId("rayo-clock")).toBeNull();

    await user.click(screen.getByTestId("nav-lectura"));
    const story0 = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(story0[story0.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.queryByTestId("run-timer-toggle")).toBeNull();
    expect(screen.queryByTestId("rayo-clock")).toBeNull();

    cleanup();
    localStorage.removeItem(LIVE_KEY);
    seedProgress({
      streak: 1,
      lastDay: localToday(),
      paywallSeen: true,
      hearts: 5,
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 0 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user2 = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    const unitBtn = screen.queryByRole("button", { name: "Subjuntivo presente" })
      || (await openCaminoMore(user2), screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user2.click(unitBtn);
    await user2.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.queryByTestId("run-timer-toggle")).toBeNull();
    expect(screen.queryByTestId("rayo-clock")).toBeNull();
  });

  it("timed challenge toggle off hides the clock + quiet chip; toggle on restores", async () => {
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: localToday(),
      paywallSeen: true,
      rayo: true,
      hearts: 5,
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 0 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    const unitBtn = screen.queryByRole("button", { name: "Subjuntivo presente" })
      || (await openCaminoMore(user), screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(unitBtn);
    await user.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("rayo-clock")).toBeTruthy());
    const toggle = screen.getByTestId("run-timer-toggle");
    expect(toggle.textContent).toBe("Con reloj");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.style.background).toMatch(/#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
    expect(toggle.style.borderBottom).not.toMatch(/[34]px/);
    expect(screen.queryByTestId("run-timer-off-chip")).toBeNull();
    expect(screen.getByTestId("rayo-clock").innerHTML).not.toMatch(/#FF4B4B|#FF6B6B|#EA2B2B/i);

    await user.click(toggle);
    await waitFor(() => expect(screen.queryByTestId("rayo-clock")).toBeNull());
    expect(screen.getByTestId("run-timer-toggle").textContent).toBe("Sin reloj");
    expect(screen.getByTestId("run-timer-toggle").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("run-timer-off-chip").textContent).toBe("Piensa. El reloj está apagado.");
    expect(screen.getByTestId("run-timer-off-chip").style.background).toMatch(/#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
    expect(screen.queryByTestId("practice-quip")).toBeNull();

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("run-timer-toggle").textContent).toBe("No timer"));
    expect(screen.getByTestId("run-timer-off-chip").textContent).toBe("Take your time. Timer’s off.");

    await user.click(screen.getByTestId("run-timer-toggle"));
    await waitFor(() => expect(screen.getByTestId("rayo-clock")).toBeTruthy());
    expect(screen.getByTestId("run-timer-toggle").textContent).toBe("Timer on");
    expect(screen.getByTestId("run-timer-toggle").getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByTestId("run-timer-off-chip")).toBeNull();
    expect(screen.getByTestId("rayo-clock").innerHTML).not.toMatch(/#FF4B4B|#FF6B6B|#EA2B2B/i);
  });
});

const funnelOf = (name) => (window.__andaleFunnelLog || []).filter((e) => e.event === name);

describe("Pages funnel log", { timeout: 15000 }, () => {
  it("open fires on app mount with no PII", async () => {
    localStorage.clear();
    mockBrowser();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    await waitFor(() => expect(funnelOf("open").length).toBeGreaterThan(0));
    const open = funnelOf("open")[0];
    expect(open.event).toBe("open");
    expect(open.name).toBeUndefined();
    expect(open.email).toBeUndefined();
    expect(open.deviceId).toBeUndefined();
    expect(JSON.stringify(open)).not.toMatch(/Dave|@|device/i);
  });

  it("cenzontle_complete fires when the first-Hoy bird beat finishes", async () => {
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
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("win-fly-away")).toBeTruthy());
    expect(funnelOf("cenzontle_complete")).toHaveLength(0);
    expect(screen.queryByTestId("win-perch")).toBeNull();
    await waitFor(() => expect(funnelOf("cenzontle_complete").length).toBeGreaterThan(0), { timeout: 1500 });
    const bird = funnelOf("cenzontle_complete");
    expect(bird.length).toBeGreaterThan(0);
    expect(bird.at(-1).beat).toBe("hoy");
    expect(JSON.stringify(bird.at(-1))).not.toMatch(/Dave|@/);
  });

  it("lectura_start fires when a Lectura story opens", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    const starts = funnelOf("lectura_start");
    expect(starts.some((e) => e.storyId === "story-0")).toBe(true);
    expect(starts.every((e) => e.title == null && e.name == null)).toBe(true);
  });

  it("paywall_seen and paywall_tap fire for annual, monthly, and continue-free", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday() });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(funnelOf("paywall_seen").length).toBeGreaterThan(0);
    expect(funnelOf("paywall_seen")[0].name).toBeUndefined();

    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "annual")).toBe(true));
    await user.click(screen.getByTestId("soft-paywall-monthly"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "monthly")).toBe(true));
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    assertSoftPaywallAnnualPrimary("es");

    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(funnelOf("paywall_tap").some((e) => e.choice === "continue_free")).toBe(true);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/\$39\.99|\$6\.99|Dave@/);
  });

  it("waitlist strip is gone on the paywall and the hub", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday() });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Tell me when the store opens|Avísame cuando abramos la tienda|I’ll write when it’s ready|Te escribo cuando esté listo/);
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(screen.getByTestId("learn-hub").textContent).not.toMatch(/Tell me when the store opens|Avísame cuando abramos la tienda|I’ll write when it’s ready|Te escribo cuando esté listo/);
    expect(funnelOf("waitlist_submit")).toHaveLength(0);
    expect(funnelOf("paywall_tap").some((e) => e.choice === "continue_free")).toBe(true);
    expect(funnelOf("purchase")).toHaveLength(0);
  }, 15000);

  it("StoreKit cancel does not emit purchase", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday() });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    window.__andaleNativePurchase = async () => ({
      status: "cancelled",
      receipt: "receipt-body",
      email: "dave@example.com",
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(window.__andalePurchaseLog?.some((e) => e.reason === "user_cancelled")).toBe(true));
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(funnelOf("paywall_tap").some((e) => e.choice === "annual")).toBe(true);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/receipt-body|dave@example/);
  });

  it("conversion chain is open, first-Hoy win, Lectura, paywall, then purchase on success", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, uiLang: "es" });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    window.__andaleNativePurchase = async ({ productId }) => ({
      status: "success",
      productId,
      receipt: "receipt-body",
      transactionId: "tx-9",
      email: "dave@example.com",
      deviceId: "device-1",
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
        host: "luna",
        questions: [hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:")],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(funnelOf("open").length).toBeGreaterThan(0));
    expect(funnelOf("purchase")).toHaveLength(0);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelector(".choice-card"));
    await user.click(screen.getByTestId("lesson-check"));
    await user.click(await screen.findByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("win-fly-away")).toBeTruthy());
    await waitFor(() => expect(funnelOf("cenzontle_complete").some((e) => e.beat === "hoy")).toBe(true), { timeout: 1500 });
    expect(funnelOf("lectura_start")).toHaveLength(0);
    await user.click(screen.getByTestId("lectura-handoff-cta"));
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
    expect(funnelOf("lectura_start").some((e) => e.storyId === "story-0")).toBe(true);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(funnelOf("purchase")).toHaveLength(0);

    cleanup();
    localStorage.removeItem(LIVE_KEY);
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(funnelOf("paywall_seen").length).toBeGreaterThan(0);
    expect(funnelOf("purchase")).toHaveLength(0);
    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(funnelOf("purchase")).toHaveLength(1));
    const bought = funnelOf("purchase")[0];
    expect(bought.plan).toBe("annual");
    expect(bought.productId).toBe("com.andale.app.premium.annual");
    expect(Object.keys(bought).sort()).toEqual(["at", "event", "plan", "productId"]);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/receipt-body|tx-9|dave@example|device-1|\$/);
    const names = window.__andaleFunnelLog.map((e) => e.event);
    const at = (name) => names.indexOf(name);
    expect(at("open")).toBeGreaterThanOrEqual(0);
    expect(at("cenzontle_complete")).toBeGreaterThan(at("open"));
    expect(at("lectura_start")).toBeGreaterThan(at("cenzontle_complete"));
    expect(at("paywall_seen")).toBeGreaterThan(at("lectura_start"));
    expect(at("purchase")).toBeGreaterThan(at("paywall_seen"));
  });

  it("return home after Hoy win and Lectura start shows the soft paywall and does not emit purchase on web", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, uiLang: "es" });
    delete window.__andaleIapEnv;
    delete window.__andaleNativePurchase;
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
        questions: [hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:")],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(funnelOf("open").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelector(".choice-card"));
    await user.click(screen.getByTestId("lesson-check"));
    await user.click(await screen.findByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("lectura-handoff-cta")).toBeTruthy());
    await waitFor(() => expect(funnelOf("cenzontle_complete").some((e) => e.beat === "hoy")).toBe(true), { timeout: 1500 });
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("lectura-handoff-cta"));
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
    expect(funnelOf("lectura_start").some((e) => e.storyId === "story-0")).toBe(true);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(funnelOf("purchase")).toHaveLength(0);

    await user.click(screen.getByTestId("brand-home"));
    await awaitBajioFlashThenPaywall();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Sigue con tu racha");
    expect(funnelOf("paywall_seen").length).toBeGreaterThan(0);
    expect(funnelOf("purchase")).toHaveLength(0);

    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "annual")).toBe(true));
    await user.click(screen.getByTestId("soft-paywall-monthly"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "monthly")).toBe(true));
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-honesty").textContent).toBe("Práctica · sin cobro todavía");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);
    const names = window.__andaleFunnelLog.map((e) => e.event);
    const at = (name) => names.indexOf(name);
    expect(at("cenzontle_complete")).toBeGreaterThan(at("open"));
    expect(at("lectura_start")).toBeGreaterThan(at("cenzontle_complete"));
    expect(at("paywall_seen")).toBeGreaterThan(at("lectura_start"));
    expect(at("purchase")).toBe(-1);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/@|device|receipt|\$/);
  });

  it("Learn home after Hoy does not show the soft paywall until lectura_start, then glow and wall, and web taps do not purchase", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, uiLang: "es" });
    delete window.__andaleIapEnv;
    delete window.__andaleNativePurchase;
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
        questions: [hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:")],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(funnelOf("open").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelector(".choice-card"));
    await user.click(screen.getByTestId("lesson-check"));
    await user.click(await screen.findByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("lectura-handoff-cta")).toBeTruthy());
    await waitFor(() => expect(funnelOf("cenzontle_complete").some((e) => e.beat === "hoy")).toBe(true), { timeout: 1500 });
    expect(funnelOf("lectura_start")).toHaveLength(0);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(funnelOf("purchase")).toHaveLength(0);

    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertNoWallBeforeLectura();
    expect(funnelOf("lectura_start")).toHaveLength(0);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(isBajioUnlockFlashDue()).toBe(true);

    await openStory0(user);
    expect(funnelOf("lectura_start").some((e) => e.storyId === "story-0")).toBe(true);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();

    await user.click(screen.getByTestId("brand-home"));
    await awaitBajioFlashThenPaywall();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Sigue con tu racha");
    expect(funnelOf("paywall_seen").length).toBeGreaterThan(0);
    expect(funnelOf("purchase")).toHaveLength(0);

    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "annual")).toBe(true));
    await user.click(screen.getByTestId("soft-paywall-monthly"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "monthly")).toBe(true));
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);
    const names = window.__andaleFunnelLog.map((e) => e.event);
    const at = (name) => names.indexOf(name);
    expect(at("cenzontle_complete")).toBeGreaterThan(at("open"));
    expect(at("lectura_start")).toBeGreaterThan(at("cenzontle_complete"));
    expect(at("paywall_seen")).toBeGreaterThan(at("lectura_start"));
    expect(at("purchase")).toBe(-1);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/@|device|receipt|\$/);
  }, 15000);
});

const EN_DISCLOSURE = [
  "Ándale Premium is an auto-renewing subscription.",
  "One year: $39.99 per year (about $3.33 a month). One month: $6.99 per month.",
  "Payment is charged to your Apple ID when you confirm your purchase. Your subscription renews automatically unless you cancel at least 24 hours before the current period ends. Your account is charged for the renewal within the 24 hours before the period ends. You can manage or cancel anytime in Settings > Apple ID > Subscriptions.",
];
const ES_DISCLOSURE = [
  "Ándale Premium es una suscripción con renovación automática.",
  "Un año: $39.99 al año (unos $3.33 al mes). Un mes: $6.99 al mes.",
  "El pago se carga a tu ID de Apple al confirmar la compra. La suscripción se renueva sola a menos que la canceles al menos 24 horas antes de que termine el periodo actual. El cargo de la renovación se hace dentro de las 24 horas previas al fin del periodo. Puedes administrarla o cancelarla cuando quieras en Ajustes > ID de Apple > Suscripciones.",
];

describe("paywall 3.1.2 disclosure", () => {
  it("renders EN prices, fine print, restore, and legal links without a purchase", async () => {
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: localToday() });
    delete window.__andaleIapEnv;
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("en");
    expect(screen.getByTestId("soft-paywall-annual").textContent).toBe("One year");
    expect(screen.getByTestId("soft-paywall-monthly").textContent).toBe("One month");
    expect(screen.getByTestId("soft-paywall-annual-price").textContent).toBe("$39.99 / year");
    expect(screen.getByTestId("soft-paywall-monthly-price").textContent).toBe("$6.99 / month");
    const annual = screen.getByTestId("soft-paywall-annual");
    const annualPrice = screen.getByTestId("soft-paywall-annual-price");
    const monthly = screen.getByTestId("soft-paywall-monthly");
    const monthlyPrice = screen.getByTestId("soft-paywall-monthly-price");
    expect(annual.compareDocumentPosition(annualPrice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(annualPrice.compareDocumentPosition(monthly) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(monthly.compareDocumentPosition(monthlyPrice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    EN_DISCLOSURE.forEach((line, i) => {
      expect(screen.getByTestId(`soft-paywall-disclosure-${i}`).textContent).toBe(line);
    });
    expect(screen.queryByText(ES_DISCLOSURE[0])).toBeNull();
    const fine = screen.getByTestId("soft-paywall-disclosure");
    expect(parseFloat(fine.style.fontSize)).toBeLessThan(parseFloat(annual.style.fontSize));
    expect(parseFloat(annualPrice.style.fontSize)).toBeLessThan(parseFloat(annual.style.fontSize));
    expect(screen.getByTestId("soft-paywall-legal").textContent).toBe("Terms of Use · Privacy Policy · Restore Purchases");
    const terms = screen.getByTestId("soft-paywall-terms");
    const privacy = screen.getByTestId("soft-paywall-privacy");
    expect(terms.tagName).toBe("A");
    expect(terms.getAttribute("href")).toBe("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/");
    expect(terms.textContent).toBe("Terms of Use");
    expect(privacy.tagName).toBe("A");
    expect(privacy.getAttribute("href")).toBe("https://gildernew-max.github.io/andale/privacy.html");
    expect(privacy.textContent).toBe("Privacy Policy");
    const restore = screen.getByTestId("soft-paywall-restore");
    expect(restore.tagName).toBe("A");
    expect(restore.textContent).toBe("Restore Purchases");
    expect(restore.closest("[data-testid='soft-paywall-legal']")).toBe(screen.getByTestId("soft-paywall-legal"));
    expect(screen.getByTestId("soft-paywall-legal").querySelector("button")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(monthlyPrice.compareDocumentPosition(fine) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fine.compareDocumentPosition(screen.getByTestId("soft-paywall-dismiss")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("soft-paywall").querySelectorAll("img[src*='cenzontle']")).toHaveLength(1);

    expect(funnelOf("paywall_seen").length).toBeGreaterThan(0);
    expect(funnelOf("purchase")).toHaveLength(0);
    await user.click(restore);
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(funnelOf("paywall_tap")).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);

    await user.click(annual);
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "annual")).toBe(true));
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(funnelOf("paywall_tap").every((e) => e.event === "paywall_tap")).toBe(true);
    const names = window.__andaleFunnelLog.map((e) => e.event);
    expect(names.indexOf("paywall_seen")).toBeGreaterThanOrEqual(0);
    expect(names.indexOf("paywall_tap")).toBeGreaterThan(names.indexOf("paywall_seen"));
    expect(names.includes("purchase")).toBe(false);
  }, 15000);

  it("renders ES prices, fine print, restore, and legal links", async () => {
    cleanup();
    seedProgress({ uiLang: "es", streak: 1, lastDay: localToday() });
    delete window.__andaleIapEnv;
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.getByTestId("soft-paywall-annual").textContent).toBe("Un año");
    expect(screen.getByTestId("soft-paywall-monthly").textContent).toBe("Un mes");
    expect(screen.getByTestId("soft-paywall-annual-price").textContent).toBe("$39.99 al año");
    expect(screen.getByTestId("soft-paywall-monthly-price").textContent).toBe("$6.99 al mes");
    ES_DISCLOSURE.forEach((line, i) => {
      expect(screen.getByTestId(`soft-paywall-disclosure-${i}`).textContent).toBe(line);
    });
    expect(screen.queryByText(EN_DISCLOSURE[0])).toBeNull();
    expect(screen.getByTestId("soft-paywall-legal").textContent).toBe("Términos de uso · Política de privacidad · Restaurar compras");
    expect(screen.getByTestId("soft-paywall-terms").getAttribute("href")).toBe("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/");
    expect(screen.getByTestId("soft-paywall-terms").textContent).toBe("Términos de uso");
    expect(screen.getByTestId("soft-paywall-privacy").getAttribute("href")).toBe("https://gildernew-max.github.io/andale/privacy.html");
    expect(screen.getByTestId("soft-paywall-privacy").textContent).toBe("Política de privacidad");
    const restore = screen.getByTestId("soft-paywall-restore");
    expect(restore.tagName).toBe("A");
    expect(restore.textContent).toBe("Restaurar compras");
    expect(restore.closest("[data-testid='soft-paywall-legal']")).toBe(screen.getByTestId("soft-paywall-legal"));
    expect(parseFloat(screen.getByTestId("soft-paywall-disclosure").style.fontSize)).toBeLessThan(parseFloat(screen.getByTestId("soft-paywall-annual").style.fontSize));
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(funnelOf("purchase")).toHaveLength(0);
  }, 15000);

  it("prefers StoreKit displayPrice and the restore link adds no purchase", async () => {
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: localToday() });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    let restoreCalls = 0;
    let purchaseCalls = 0;
    let allowRestore = false;
    window.__andaleNativePurchase = async () => {
      purchaseCalls += 1;
      return { status: "success", productId: "com.andale.app.premium.annual" };
    };
    window.__andaleNativeRestore = async () => {
      restoreCalls += 1;
      if (!allowRestore) return { status: "failure", reason: "nothing_to_restore" };
      return { status: "success", productId: "com.andale.app.premium.monthly" };
    };
    window.__andaleNativeGetProducts = async ({ productIds }) => ({
      products: [
        { id: productIds[0], displayPrice: "€39.99" },
        { id: productIds[1], displayPrice: "€6.99" },
      ],
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await waitFor(() => expect(restoreCalls).toBeGreaterThanOrEqual(1));
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(screen.getByTestId("soft-paywall-restore").tagName).toBe("A");
    expect(document.body.textContent).not.toMatch(/Tell me when the store opens|Avísame cuando abramos la tienda/);
    expect(screen.queryByTestId("soft-paywall-honesty")).toBeNull();
    expect(screen.getByTestId("soft-paywall").textContent).not.toMatch(/Practice · no charge yet|Práctica · sin cobro todavía/);
    await waitFor(() => expect(screen.getByTestId("soft-paywall-annual-price").textContent).toBe("€39.99 / year"));
    expect(screen.getByTestId("soft-paywall-monthly-price").textContent).toBe("€6.99 / month");
    expect(screen.getByTestId("soft-paywall-disclosure-0").textContent).toBe(EN_DISCLOSURE[0]);
    expect(screen.getByTestId("soft-paywall-disclosure-1").textContent).toBe("One year: €39.99 per year. One month: €6.99 per month.");
    expect(screen.getByTestId("soft-paywall-disclosure-1").textContent).not.toMatch(/\$3\.33/);
    expect(screen.getByTestId("soft-paywall-disclosure-2").textContent).toBe(EN_DISCLOSURE[2]);
    expect(screen.getByTestId("soft-paywall-annual").className).toMatch(/duo-btn/);
    expect(screen.getByTestId("soft-paywall-dismiss").textContent).toBe("Continue free");
    expect(screen.getByTestId("soft-paywall-dismiss").style.background).toBe("none");
    expect(funnelOf("paywall_seen").length).toBeGreaterThan(0);
    expect(funnelOf("purchase")).toHaveLength(0);

    expect(screen.queryByTestId("soft-paywall-restore-status")).toBeNull();
    const restoresBeforeClick = restoreCalls;
    allowRestore = true;
    await user.click(screen.getByTestId("soft-paywall-restore"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall-restore-status").textContent).toBe("Purchases restored."));
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(restoreCalls).toBeGreaterThan(restoresBeforeClick);
    expect(purchaseCalls).toBe(0);
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(funnelOf("paywall_tap")).toHaveLength(0);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.unlockedPrem).toBe(true);
    expect(stored.paywallPlan).toBe("monthly");
    expect(stored.iapProductId).toBe("com.andale.app.premium.monthly");
    const names = window.__andaleFunnelLog.map((e) => e.event);
    expect(names.indexOf("paywall_seen")).toBeGreaterThanOrEqual(0);
    expect(names.includes("purchase")).toBe(false);
  }, 15000);

  it("falls back to locked prices when getProducts fails", async () => {
    cleanup();
    seedProgress({ uiLang: "es", streak: 1, lastDay: localToday() });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    window.__andaleNativeGetProducts = async () => {
      throw new Error("store_down");
    };
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-honesty")).toBeNull();
    expect(screen.getByTestId("soft-paywall-annual-price").textContent).toBe("$39.99 al año");
    expect(screen.getByTestId("soft-paywall-monthly-price").textContent).toBe("$6.99 al mes");
    ES_DISCLOSURE.forEach((line, i) => {
      expect(screen.getByTestId(`soft-paywall-disclosure-${i}`).textContent).toBe(line);
    });
    expect(screen.getByTestId("soft-paywall-restore").tagName).toBe("A");
    expect(screen.getByTestId("soft-paywall-restore").textContent).toBe("Restaurar compras");
    expect(funnelOf("purchase")).toHaveLength(0);
  }, 15000);

  const restoreFaces = {
    en: {
      success: "Purchases restored.",
      empty: "No purchases to restore on this Apple ID.",
      failure: "Couldn't reach the App Store. Try again.",
      web: "Restore works in the iPhone app.",
    },
    es: {
      success: "Compras restauradas.",
      empty: "No hay compras que restaurar en este ID de Apple.",
      failure: "No se pudo conectar con la App Store. Inténtalo de nuevo.",
      web: "Restaurar compras funciona en la app para iPhone.",
    },
  };

  const assertRestoreLine = (lang, key) => {
    const line = screen.getByTestId("soft-paywall-restore-status");
    const legal = screen.getByTestId("soft-paywall-legal");
    const other = lang === "en" ? "es" : "en";
    expect(line.textContent).toBe(restoreFaces[lang][key]);
    expect(line.textContent).not.toBe(restoreFaces[other][key]);
    expect(line.style.fontSize).toBe(legal.style.fontSize);
    expect(line.style.fontWeight).toBe(legal.style.fontWeight);
    expect(line.style.color).toBe(legal.style.color);
    expect(legal.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.compareDocumentPosition(screen.getByTestId("soft-paywall-dismiss")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.querySelector("svg, img, button")).toBeNull();
    expect(legal.contains(line)).toBe(false);
    expect(funnelOf("purchase")).toHaveLength(0);
  };

  it.each(["en", "es"])("restore success shows one status line in %s and does not emit purchase", async (lang) => {
    cleanup();
    seedProgress({ uiLang: lang, streak: 1, lastDay: localToday() });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    let allowRestore = false;
    let restoreCalls = 0;
    window.__andaleNativeRestore = async () => {
      restoreCalls += 1;
      if (!allowRestore) return { status: "failure", reason: "nothing_to_restore" };
      return { status: "success", productId: "com.andale.app.premium.annual" };
    };
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await waitFor(() => expect(restoreCalls).toBeGreaterThanOrEqual(1));
    expect(screen.queryByTestId("soft-paywall-restore-status")).toBeNull();
    allowRestore = true;
    await user.click(screen.getByTestId("soft-paywall-restore"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall-restore-status")).toBeTruthy());
    assertRestoreLine(lang, "success");
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.unlockedPrem).toBe(true);
    expect(stored.paywallPlan).toBe("annual");
  }, 15000);

  it.each(["en", "es"])("restore with nothing to restore shows one status line in %s and does not emit purchase", async (lang) => {
    cleanup();
    seedProgress({ uiLang: lang, streak: 1, lastDay: localToday() });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("soft-paywall-restore-status")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-restore"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall-restore-status")).toBeTruthy());
    assertRestoreLine(lang, "empty");
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
  }, 15000);

  it.each(["en", "es"])("a failed store restore shows one status line in %s and does not emit purchase", async (lang) => {
    cleanup();
    seedProgress({ uiLang: lang, streak: 1, lastDay: localToday() });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => {
      throw new Error("store_down");
    };
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("soft-paywall-restore-status")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-restore"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall-restore-status")).toBeTruthy());
    assertRestoreLine(lang, "failure");
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
  }, 15000);

  it.each(["en", "es"])("web restore shows the iPhone-app line in %s and does not emit purchase", async (lang) => {
    cleanup();
    seedProgress({ uiLang: lang, streak: 1, lastDay: localToday() });
    delete window.__andaleIapEnv;
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("soft-paywall-restore-status")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-restore"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall-restore-status")).toBeTruthy());
    assertRestoreLine(lang, "web");
    expect(screen.getByTestId("soft-paywall-restore-status").textContent).not.toBe(restoreFaces[lang].failure);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
    expect(funnelOf("paywall_tap")).toHaveLength(0);
  }, 15000);

  it("a partial StoreKit price list falls back to both locked prices", async () => {
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: localToday() });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    window.__andaleNativeGetProducts = async () => ({
      products: [{ id: "com.andale.app.premium.annual", displayPrice: "€39.99" }],
    });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.getByTestId("soft-paywall-annual-price").textContent).toBe("$39.99 / year");
    expect(screen.getByTestId("soft-paywall-monthly-price").textContent).toBe("$6.99 / month");
    expect(screen.getByTestId("soft-paywall-disclosure-1").textContent).toBe(EN_DISCLOSURE[1]);
    expect(screen.getByTestId("soft-paywall").textContent).not.toMatch(/€/);
    expect(funnelOf("purchase")).toHaveLength(0);
  }, 15000);
});
