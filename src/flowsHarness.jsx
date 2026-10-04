/**
 * Simulated learner flows (issue 5 #4). Not the content-schema lock
 * (src/content.test.js) and not the save/LIVE schema lock (src/schema.test.js).
 */
import { afterEach, beforeEach, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { comeBackTomorrowLine, dayKeyFromDate, hoySceneForDay, hoyTitleForLang, nextDayKey } from "./firstDoor.js";
import { IPHONE_SAFARI_UA } from "./a2hs.js";
import { markBajioUnlockFlashDue, markBajioUnlockFlashLive, markCdmxUnlockFlashDue, markCdmxUnlockFlashLive, markNorteUnlockFlashDue, markNorteUnlockFlashLive, markOaxacaUnlockFlashDue, markOaxacaUnlockFlashLive, markYucatanUnlockFlashDue, markYucatanUnlockFlashLive, recuerdosHasProgressFraction, recuerdosSurfaceHasCuts } from "./recuerdos.js";
import { setSafeRiskyPackOverride } from "./safeRisky.js";
import { setCollectorEndpointOverride } from "./collector.js";

export const STORAGE_KEY = "andale-v3";
export const LIVE_KEY = "andale-v3-live";

export const seedProgress = (extra = {}) => {
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

/** First visit that already has a first-session marker: splash as today, no onboarding. */
export const seedColdFirstVisit = (extra = {}) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    firstSessionDone: false,
    uiLang: "en",
    ...extra,
  }));
};

/** Claimed stories stay open for a re-read. The first unread stays the frontier. */
export const claimStories = (...ids) => Object.fromEntries(ids.map((id) => [id, true]));

export const mockBrowser = ({ voices: seedVoices = [] } = {}) => {
  const voices = seedVoices.map((v) => ({ localService: true, name: "Voz", ...v }));
  const voiceListeners = [];
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
  const synth = {
    getVoices: () => voices,
    speak,
    cancel: () => {},
    resume: () => {},
    addEventListener: (type, fn) => {
      if (type === "voiceschanged" && typeof fn === "function") voiceListeners.push(fn);
    },
    removeEventListener: (type, fn) => {
      if (type !== "voiceschanged") return;
      const idx = voiceListeners.indexOf(fn);
      if (idx >= 0) voiceListeners.splice(idx, 1);
    },
    onvoiceschanged: null,
    speaking: false,
    pending: false,
    paused: false,
    pushVoices(next) {
      voices.splice(0, voices.length, ...next.map((v) => ({ localService: true, name: "Voz", ...v })));
      try { if (typeof synth.onvoiceschanged === "function") synth.onvoiceschanged(); } catch (e) {}
      voiceListeners.slice().forEach((fn) => { try { fn(); } catch (e) {} });
    },
  };
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: synth,
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

export const boot = async () => {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
  // Seeded saves are returning visits. Wait out the default first-visit splash
  // so a slow storage.get cannot start a lesson on empty progress.
  await waitFor(() => expect(screen.queryByTestId("splash-start")).toBeNull());
  await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
  return user;
};

export const awaitHome = async () => {
  await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
  expect(screen.getByTestId("learn-hub-tiles")).toBeTruthy();
  expect(screen.getByTestId("hub-hoy")).toBeTruthy();
};

export const CREAM_FILL = /#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i;

export const channelLum = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const parseCssColor = (value) => {
  const hex = String(value).trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = String(value).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!rgb) throw new Error(`unparsed color ${value}`);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
};

export const contrastRatio = (fg, bg) => {
  const lum = (channels) => 0.2126 * channelLum(channels[0]) + 0.7152 * channelLum(channels[1]) + 0.0722 * channelLum(channels[2]);
  const lighter = Math.max(lum(parseCssColor(fg)), lum(parseCssColor(bg)));
  const darker = Math.min(lum(parseCssColor(fg)), lum(parseCssColor(bg)));
  return (lighter + 0.05) / (darker + 0.05);
};
export const PAGE_WHITE = /^(#fff|#ffffff|white|rgb\(\s*255,\s*255,\s*255\s*\))$/i;

export const ELLIPSIS_RE = /…|\.\.\.$/;

export const assertFullWordChip = (el, text) => {
  expect(el.textContent).toBe(text);
  expect(el.textContent).not.toMatch(ELLIPSIS_RE);
  expect(el.className).toMatch(/word-chip/);
  expect(el.style.overflow).not.toBe("hidden");
  expect(el.style.textOverflow).not.toBe("ellipsis");
  expect(el.style.width).toBe("max-content");
  expect(el.style.minWidth).not.toBe("0");
  expect(["min-content", "max-content", "28px", "72px"]).toContain(el.style.minWidth);
};

export const assertMemoryBoardCard = (el, text) => {
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
    expect(glossEl.style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
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

export const assertCreamShell = () => {
  const shell = screen.getByTestId("app-shell");
  expect(shell.style.background).toMatch(CREAM_FILL);
  expect(shell.style.background).not.toMatch(PAGE_WHITE);
  expect(document.body.style.background).toMatch(CREAM_FILL);
  expect(document.body.style.background).not.toMatch(PAGE_WHITE);
};

export const HUB_FACE = {
  es: {
    hoy: "Hoy",
    hoyQuiet: "Plan de hoy",
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
    hoyQuiet: "Today's plan",
    stories: "Stories",
    games: "Games",
    doctor: "Phrase Doctor",
    eighty: "80/20",
    eightyQuiet: "Subjunctive rules",
    sendero: "Sendero",
    senderoQuiet: "Your path",
  },
};

export const hubUiLang = () => (
  screen.getByTestId("lang-es").getAttribute("aria-pressed") === "true" ? "es" : "en"
);

export const HUB_DOCTOR_RE = /Doctora de frases|Phrase Doctor/;

export const assertHubFace = (lang = hubUiLang()) => {
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
    ? /Stories|Games|Phrase Doctor|Today's plan|Subjunctive rules|Your path/
    : /Cuentos|Juegos|Doctora de frases|Plan de hoy|Reglas del subjuntivo|Tu camino/;
  expect(tiles.textContent).not.toMatch(salad);
};

export const assertEqualHub = () => {
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

export const startHoyFromHub = async (user) => {
  await user.click(screen.getByTestId("hub-hoy"));
  await waitFor(() => expect(screen.getByTestId("hoy-plan")).toBeTruthy());
  await user.click(screen.getByTestId("hoy-plan-start"));
};

export const continueBtn = () => screen.getByRole("button", { name: /^Continuar$/i });

export const firstSessionRoot = () => document.querySelector("[data-first-session]");

export const answerFirstSessionBeat = async (user) => {
  await waitFor(() => expect(firstSessionRoot()?.getAttribute("data-first-session")).toBe("1"));
  const type = firstSessionRoot().getAttribute("data-qtype");
  const body = document.body.textContent;
  let taps = 0;
  const tap = async (el) => { taps += 1; await user.click(el); };
  if (type === "mc") {
    const want = body.includes("Es obvio") ? "tiene" : "vengas";
    const card = [...document.querySelectorAll(".choice-card")].find((el) => el.textContent.includes(want));
    expect(card, want).toBeTruthy();
    await tap(card);
  } else if (type === "type") {
    const want = body.includes("Ojalá") ? "llueva" : "salga";
    const tile = [...screen.getAllByTestId("bank-tile")].find((el) => el.textContent.trim() === want);
    expect(tile, want).toBeTruthy();
    await tap(tile);
  } else if (type === "order") {
    for (const word of ["dudo", "que", "sea", "verdad"]) {
      const tile = [...screen.getAllByTestId("bank-tile")].find((el) => el.textContent.trim().toLowerCase() === word);
      expect(tile, word).toBeTruthy();
      await tap(tile);
    }
  } else {
    throw new Error(`unexpected first-session type ${type}`);
  }
  await tap(screen.getByTestId("lesson-check"));
  await tap(screen.getByRole("button", { name: /^(Continuar|Continue)$/ }));
  return taps;
};

export const missFirstSessionBeat = async (user) => {
  await waitFor(() => expect(firstSessionRoot()?.getAttribute("data-first-session")).toBe("1"));
  const type = firstSessionRoot().getAttribute("data-qtype");
  const body = document.body.textContent;
  if (type === "mc") {
    const avoid = body.includes("Es obvio") ? "tiene" : "vengas";
    const card = [...document.querySelectorAll(".choice-card")].find((el) => !el.textContent.includes(avoid));
    expect(card).toBeTruthy();
    await user.click(card);
  } else if (type === "type") {
    const avoid = body.includes("Ojalá") ? "llueva" : "salga";
    const tile = [...screen.getAllByTestId("bank-tile")].find((el) => el.textContent.trim() !== avoid);
    expect(tile).toBeTruthy();
    await user.click(tile);
  } else {
    await user.click(screen.getAllByTestId("bank-tile")[0]);
  }
  await user.click(screen.getByTestId("lesson-check"));
  await user.click(screen.getByRole("button", { name: /^(Continuar|Continue)$/ }));
};

/** First short-Hoy beat is the scene MC. Read the live answer — do not hardcode a day-hash list. */
export const clickHoySceneMc = async (user) => {
  const live = JSON.parse(localStorage.getItem(LIVE_KEY) || "null");
  const q = live?.session?.questions?.[0];
  const answer = q?.answer || (Array.isArray(q?.answers) ? q.answers[0] : "");
  const choice = [...document.querySelectorAll(".choice-card")].find((el) =>
    answer && el.textContent.includes(answer));
  expect(choice).toBeTruthy();
  await user.click(choice);
};

export const localToday = () => dayKeyFromDate(new Date());

/** Same nine Hoy titles, same day-hash as App TODAY_SCENES. Do not invent names. */
export const HOY_TITLES = [
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

export const expectedComeBack = (lang) => {
  const next = hoySceneForDay(HOY_TITLES, nextDayKey(localToday()));
  return comeBackTomorrowLine({ lang, nextTitle: hoyTitleForLang(next, lang) });
};

/** Free story-win / CONTINUAR: fly-away in flight or already off-screen. No perch. Soft chrome parked. */
export const assertFreeWinFlyAway = () => {
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
  expect(css).toMatch(/78% \{ transform: translate\(calc\(-50% \+ 40vw\), -\d+px\) rotate\(-10deg\); opacity: 1; \}/);
  expect(css).toMatch(/100% \{ transform: translate\(calc\(-50% \+ 100vw \+ 168px\), -\d+px\) rotate\(-10deg\); opacity: 0; \}/);
  expect(css).not.toMatch(/-40px/);
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
export const assertSoftPaywallAnnualPrimary = (lang = "es") => {
  const wall = screen.getByTestId("soft-paywall");
  const bird = screen.getByTestId("soft-paywall-cenzontle");
  const annual = screen.getByTestId("soft-paywall-annual");
  const monthly = screen.getByTestId("soft-paywall-monthly");
  const honesty = screen.getByTestId("soft-paywall-honesty");
  const dismiss = screen.getByTestId("soft-paywall-dismiss");
  const copy = lang === "en"
    ? { title: "There's much\u00A0more to read.", benefit: "Every story, Phrase Doctor, and the full path. Real Mexican Spanish, past the basics.", annual: "One year", monthly: "One month", honesty: "Preview · you won\u2019t be charged yet", dismiss: "Continue free" }
    : { title: "Hay mucho más por leer.", benefit: "Todas las historias, la Doctora de frases y el camino completo. Español mexicano de verdad, más allá de lo básico.", annual: "Un año", monthly: "Un mes", honesty: "Vista previa · aún no se cobra", dismiss: "Seguir gratis" };
  expect(screen.getByTestId("soft-paywall-headline").textContent).toBe(copy.title);
  expect(screen.getByTestId("soft-paywall-body").textContent).toBe(copy.benefit);
  expect(annual.textContent).toBe(copy.annual);
  expect(monthly.textContent).toBe(copy.monthly);
  expect(honesty.textContent).toBe(copy.honesty);
  expect(honesty.style.fontSize).toBe("11px");
  expect(honesty.style.fontWeight).toBe("700");
  expect(honesty.style.lineHeight).toBe("1.45");
  expect(honesty.style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
  expect(dismiss.textContent).toBe(copy.dismiss);
  expect(annual.textContent).not.toMatch(/\$39\.99|\$6\.99/);
  expect(monthly.textContent).not.toMatch(/\$39\.99|\$6\.99/);
  expect(bird.tagName).toBe("IMG");
  expect(bird.getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
  const still = screen.queryByTestId("soft-paywall-still");
  if (still) {
    expect(bird.getAttribute("width")).toBe("48");
    expect(still.getAttribute("src")).toMatch(/lectura\/story-/);
    expect(still.style.aspectRatio).toMatch(/16\s*\/\s*9/);
    expect(still.style.borderRadius).toBe("16px");
    expect(still.style.objectFit).toBe("cover");
    expect(still.style.borderStyle || "none").toBe("none");
    expect(wall.querySelectorAll("[data-testid='soft-paywall-cenzontle']")).toHaveLength(1);
  } else {
    expect(bird.getAttribute("width")).toBe("44");
    expect(screen.queryByTestId("soft-paywall-still")).toBeNull();
  }
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
  expect(dismiss.style.minHeight).toBe("44px");
  expect(dismiss.style.fontSize).toBe("15px");
  expect(dismiss.style.fontWeight).toBe("700");
  expect(dismiss.style.borderBottom).not.toMatch(/4px/);
  expect(dismiss.style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
  const fine = screen.getByTestId("soft-paywall-disclosure");
  expect(fine.style.fontSize).toBe("11px");
  expect(fine.style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
  expect(screen.getByTestId("soft-paywall-terms").style.textDecoration).toMatch(/underline/);
  expect(fine.compareDocumentPosition(dismiss) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(dismiss.compareDocumentPosition(honesty) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const filled = [...wall.querySelectorAll("button.duo-btn")]
    .filter((el) => /#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i.test(el.style.background));
  expect(filled).toHaveLength(1);
  expect(filled[0]).toBe(annual);
};

export const STORY_LIFT_RE = /Del cuento|Postal de|Lectura relámpago/;
export const CEREZAS_Q_RE = /¿Por qué se negó a vender toda su cosecha|¿Cuánto recibe don Adán por cada kilo|¿Qué le preocupa más a don Adán/;

export const laterHoySeed = (extra = {}) => seedProgress({
  streak: 1,
  lastDay: localToday(),
  paywallSeen: true,
  ...extra,
});

export async function advanceLessonBeat(user) {
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

export async function collectStoryLifts(user, { maxBeats = 8 } = {}) {
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
export const awaitSoftPaywallAfterFirstWin = async () => {
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
export const awaitBajioFlashThenPaywall = async () => {
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
export const assertNoWallBeforeLectura = () => {
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect((window.__andaleFunnelLog || []).some((e) => e.event === "paywall_seen")).toBe(false);
};

/** story-0 start, then Learn home — glow, then the wall. */
export const openStory0 = async (user) => {
  await user.click(screen.getByTestId("nav-lectura"));
  const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
  expect(openers.length).toBeGreaterThan(0);
  await user.click(openers[openers.length - 1]);
  await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
};

export const lecturaThenBajioWall = async (user) => {
  assertNoWallBeforeLectura();
  await openStory0(user);
  await user.click(screen.getByTestId("brand-home"));
  await awaitBajioFlashThenPaywall();
};

/** Day-2 Hoy Eso CONTINUE must show CDMX glow before close or idle. Fail if paywall/idle land first. */
export const awaitCdmxFlashThenIdle = async () => {
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
export const awaitCdmxFlashVisible = async () => {
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
export const awaitOaxacaFlashThenIdle = async () => {
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
export const awaitOaxacaFlashVisible = async () => {
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
export const awaitYucatanFlashThenIdle = async () => {
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
export const awaitYucatanFlashVisible = async () => {
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
export const awaitNorteFlashThenIdle = async () => {
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
export const awaitNorteFlashVisible = async () => {
  await waitFor(() => expect(screen.getByTestId("norte-unlock-flash")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  expect(screen.queryByTestId("session-close")).toBeNull();
  expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
  expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
  expect(screen.getByTestId("norte-unlock-flash-copy").textContent).toMatch(/^(Abierto|Open)$/);
};

export const playShortHoyBeat = async (user, answer) => {
  await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
  const choice = [...document.querySelectorAll(".choice-card")].find((el) =>
    el.textContent.includes(answer));
  expect(choice).toBeTruthy();
  await user.click(choice);
  await user.click(screen.getByTestId("lesson-check"));
  await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
  await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
};

export const openCaminoMore = async (user) => {
  const more = screen.getByTestId("camino-more");
  if (more.getAttribute("aria-expanded") !== "true") await user.click(more);
  await waitFor(() => expect(screen.getByTestId("camino-more-panel")).toBeTruthy());
};

export const JSDOM_UA = "Mozilla/5.0 (linux) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/26.0.0";

export const mockA2hsEnv = ({ userAgent = IPHONE_SAFARI_UA, standalone = false, platform = "", maxTouchPoints = 0 } = {}) => {
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

export const freshEligible = (extra = {}) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    xp: 0,
    gems: 0,
    streak: 0,
    lastDay: null,
    hearts: 5,
    heartT: Date.now(),
    done: {},
    firstSessionDone: false,
    uiLang: "es",
    bajioUnlockSeen: true,
    contentVersion: 2,
    name: "Ana",
    ...extra,
  }));
};

export const claimStory0 = async (user) => {
  await openStory0(user);
  for (;;) {
    const next = screen.queryByRole("button", { name: /^(Siguiente|Next) →$/ });
    if (!next) break;
    await user.click(next);
  }
  await user.click(screen.getByRole("button", { name: /^(Preguntas|Questions) →$/ }));
  await waitFor(() => expect(screen.getAllByTestId("story-q-prompt").length).toBeGreaterThan(0));
  await user.click(screen.getByRole("button", { name: /El olor del cempasúchil/ }));
  await user.click(screen.getByRole("button", { name: /En el panteón de la isla de Janitzio/ }));
  await user.click(screen.getByRole("button", { name: /El olvido/ }));
  await user.click(screen.getByRole("button", { name: /Reclamar|Claim/ }));
  await waitFor(() => expect(screen.getByTestId("lectura-cliffhanger")).toBeTruthy());
};

export const funnelOf = (name) => (window.__andaleFunnelLog || []).filter((e) => e.event === name);

export const WALL_STRING_IDS = [
  "soft-paywall-headline",
  "soft-paywall-body",
  "soft-paywall-annual",
  "soft-paywall-annual-price",
  "soft-paywall-monthly",
  "soft-paywall-monthly-price",
  "soft-paywall-disclosure",
  "soft-paywall-terms",
  "soft-paywall-privacy",
  "soft-paywall-restore",
  "soft-paywall-dismiss",
  "soft-paywall-honesty",
];

const originalSendBeacon = navigator.sendBeacon;

export function installFlowHooks() {
  beforeEach(() => {
    localStorage.clear();
    mockBrowser();
    mockA2hsEnv({ userAgent: JSDOM_UA, standalone: false });
    seedProgress();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    setCollectorEndpointOverride(undefined);
    vi.unstubAllGlobals();
    if (navigator.sendBeacon !== originalSendBeacon) {
      if (originalSendBeacon) {
        Object.defineProperty(navigator, "sendBeacon", { configurable: true, writable: true, value: originalSendBeacon });
      } else {
        delete navigator.sendBeacon;
      }
    }
    delete window.__andaleSpoke;
    delete window.__andaleRetried;
    delete window.__andaleVoiceDead;
    delete window.__andaleVoiceName;
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
}
