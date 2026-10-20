/** Perfil reservation row: trace after reserve, change, remove; footer words follow uiLang. Device only. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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


async function reserveOnPaywall({ theme, uiLang, email = "ana@correo.com" }) {
  await openPaywall({ theme, uiLang });
  const user = userEvent.setup();
  await user.click(await screen.findByTestId("soft-paywall-annual"));
  await user.type(screen.getByTestId("soft-paywall-reserve-email"), email);
  await user.click(screen.getByTestId("soft-paywall-reserve-submit"));
  await screen.findByText(RESERVE_WORDS[uiLang].doneTitle);
}

/** Reload: unmount, keep storage, boot straight onto Perfil. */
async function reloadToPerfil(uiLang, theme) {
  cleanup();
  mockBrowser();
  const prog = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prog, uiLang, theme, paywallSeen: true }));
  localStorage.setItem(LIVE_KEY, JSON.stringify({ screen: "home", tab: "perfil" }));
  render(<App />);
  await screen.findByTestId("perfil-footer");
}

async function bootPerfil({ uiLang, theme, reservation }) {
  cleanup();
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ welcomed: true, xp: 10, gems: 0, name: "Ana", contentVersion: 2, hearts: 5, uiLang, theme, onboardingDone: true, firstSessionDone: true, paywallSeen: true, bajioUnlockSeen: true, lecturaHandoffSeen: true, done: {}, stories: {}, missions: {} }));
  if (reservation) {
    localStorage.setItem(WAITLIST_STORE_KEY, JSON.stringify({ email: reservation }));
    localStorage.setItem(RESERVE_DAY_KEY, dayKeyFromDate(new Date()));
  }
  await reloadToPerfil(uiLang, theme);
}

const FACES = [
  { theme: "light", uiLang: "es" },
  { theme: "dark", uiLang: "en" },
  { theme: "light", uiLang: "en" },
  { theme: "dark", uiLang: "es" },
];
const LIME = /rgb\(88, 204, 2\)|#58cc02/i;

describe("perfil reservation row", () => {
  afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

  it.each(FACES)("$theme $uiLang: no row without a reservation", async ({ theme, uiLang }) => {
    await bootPerfil({ uiLang, theme });
    expect(screen.queryByTestId("perfil-reservation")).toBeNull();
  });

  it("a launch-notice email alone is not a reservation", async () => {
    await bootPerfil({ uiLang: "es", theme: "light" });
    localStorage.setItem(WAITLIST_STORE_KEY, JSON.stringify({ email: "a@b.co" }));
    await reloadToPerfil("es", "light");
    expect(screen.queryByTestId("perfil-reservation")).toBeNull();
  });

  it.each(FACES)("$theme $uiLang: row appears after reserve and survives a reload, George's words, no lime", async ({ theme, uiLang }) => {
    setViewport({ width: 360, height: 640 });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.reject(new Error("no network")));
    await reserveOnPaywall({ theme, uiLang });
    await reloadToPerfil(uiLang, theme);
    const row = screen.getByTestId("perfil-reservation");
    const w = RESERVE_WORDS[uiLang].perfil;
    expect(screen.getByTestId("perfil-reservation-title").textContent).toBe(w.title);
    expect(screen.getByTestId("perfil-reservation-line").textContent).toBe(uiLang === "en" ? "ana@correo.com · Nothing is charged today." : "ana@correo.com · Hoy no se cobra nada.");
    expect(screen.getByTestId("perfil-reservation-change").textContent).toBe(w.change);
    expect(screen.getByTestId("perfil-reservation-remove").textContent).toBe(w.remove);
    expect(row.outerHTML).not.toMatch(LIME);
    expect(row.textContent).not.toMatch(/TODO|George/);
    await waitFor(() => expect(document.documentElement.lang).toBe(uiLang));
    // near the top: before the stats grid and footer
    expect(row.compareDocumentPosition(screen.getByTestId("perfil-streak")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("George's final strings, ES and EN", () => {
    expect(RESERVE_WORDS.es.perfil).toEqual({ title: "Plan anual fundador: apartado", line: "{correo} · Hoy no se cobra nada.", change: "Cambiar", remove: "Quitar", confirm: "¿Quitar tu reserva? Tu correo se borra de este dispositivo.", confirmRemove: "Quitar", confirmKeep: "Dejarla", save: "Guardar" });
    expect(RESERVE_WORDS.en.perfil).toEqual({ title: "Founding annual: reserved", line: "{email} · Nothing is charged today.", change: "Change", remove: "Remove", confirm: "Remove your reservation? Your email is deleted from this device.", confirmRemove: "Remove", confirmKeep: "Keep it", save: "Save" });
  });

  it.each(FACES)("$theme $uiLang: change validates with the reserve error, no shift, and saves to the device record", async ({ theme, uiLang }) => {
    await bootPerfil({ uiLang, theme, reservation: "ana@correo.com" });
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await user.click(screen.getByTestId("perfil-reservation-change"));
    const input = screen.getByTestId("perfil-reservation-email");
    expect(input.value).toBe("ana@correo.com");
    expect(input.className).toContain("reserve-email");
    expect(screen.getByTestId("perfil-reservation-save").textContent).toBe(RESERVE_WORDS[uiLang].perfil.save);
    expect(screen.getByTestId("perfil-reservation-save").textContent).toBe(uiLang === "es" ? "Guardar" : "Save");
    expect(RESERVE_WORDS[uiLang].submit).toBe(uiLang === "es" ? "Reservar" : "Reserve");
    expect(screen.getByTestId("perfil-reservation-save").outerHTML).not.toMatch(LIME);
    const slot = screen.getByTestId("perfil-reservation-error-slot");
    expect(slot.style.height).toBe("17px");
    await user.clear(input);
    await user.type(input, "ana@correo");
    await user.click(screen.getByTestId("perfil-reservation-save"));
    expect(screen.getByTestId("perfil-reservation-error").textContent).toBe(RESERVE_WORDS[uiLang].error);
    expect(slot.style.height).toBe("17px");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(JSON.parse(localStorage.getItem(WAITLIST_STORE_KEY)).email).toBe("ana@correo.com");
    await user.type(input, ".mx");
    expect(screen.queryByTestId("perfil-reservation-error")).toBeNull();
    await user.click(screen.getByTestId("perfil-reservation-save"));
    expect(screen.queryByTestId("perfil-reservation-email")).toBeNull();
    expect(JSON.parse(localStorage.getItem(WAITLIST_STORE_KEY))).toEqual({ email: "ana@correo.mx" });
    expect(screen.getByTestId("perfil-reservation-line").textContent).toMatch(/^ana@correo\.mx · /);
    await reloadToPerfil(uiLang, theme);
    expect(screen.getByTestId("perfil-reservation-line").textContent).toMatch(/^ana@correo\.mx · /);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(FACES)("$theme $uiLang: remove asks, Keep it closes, Remove deletes the device record", async ({ theme, uiLang }) => {
    await bootPerfil({ uiLang, theme, reservation: "ana@correo.com" });
    const user = userEvent.setup();
    const w = RESERVE_WORDS[uiLang].perfil;
    await user.click(screen.getByTestId("perfil-reservation-remove"));
    const confirm = screen.getByTestId("perfil-reservation-confirm");
    expect(confirm.textContent).toContain(w.confirm);
    expect(screen.getByTestId("perfil-reservation-confirm-remove").textContent).toBe(w.confirmRemove);
    expect(screen.getByTestId("perfil-reservation-confirm-keep").textContent).toBe(w.confirmKeep);
    expect(confirm.outerHTML).not.toMatch(LIME);
    await user.click(screen.getByTestId("perfil-reservation-confirm-keep"));
    expect(screen.queryByTestId("perfil-reservation-confirm")).toBeNull();
    expect(readReservation(localStorage)).toEqual({ email: "ana@correo.com" });
    await user.click(screen.getByTestId("perfil-reservation-remove"));
    await user.click(screen.getByTestId("perfil-reservation-confirm-remove"));
    await waitFor(() => expect(screen.queryByTestId("perfil-reservation")).toBeNull());
    expect(localStorage.getItem(WAITLIST_STORE_KEY)).toBeNull();
    expect(localStorage.getItem(RESERVE_DAY_KEY)).toBeNull();
    await reloadToPerfil(uiLang, theme);
    expect(screen.queryByTestId("perfil-reservation")).toBeNull();
  });
});

describe("perfil footer words", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });
  it.each([["es", "Privacidad", "Soporte"], ["en", "Privacy", "Support"]])("%s footer: %s · %s", async (uiLang, privacy, support) => {
    await bootPerfil({ uiLang, theme: "light" });
    const footer = screen.getByTestId("perfil-footer");
    const links = [...footer.querySelectorAll("a")].map((a) => a.textContent);
    expect(links.slice(0, 2)).toEqual([privacy, support]);
    await waitFor(() => expect(document.documentElement.lang).toBe(uiLang));
  });
});
