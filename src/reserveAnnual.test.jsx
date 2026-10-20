/** Reserve founding annual: inline email, on-device save, reserve_tap / reserve_submit, never charges. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { dayKeyFromDate, prevDayKey } from "./firstDoor.js";
import { FUNNEL_EVENTS } from "./funnel.js";
import { RESERVE_WORDS, RESERVE_DAY_KEY } from "./reserveAnnual.js";
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

const FACES = [
  { theme: "light", uiLang: "en" },
  { theme: "light", uiLang: "es" },
  { theme: "dark", uiLang: "en" },
  { theme: "dark", uiLang: "es" },
];
const VIEWPORTS = [{ width: 360, height: 640 }, { width: 390, height: 844 }];
const limeCount = () => screen.getByTestId("soft-paywall").querySelectorAll("button[style*=\"background: rgb(88, 204, 2)\"]").length;

describe("founding annual reserve", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it.each(VIEWPORTS.flatMap((v) => FACES.map((f) => ({ ...v, ...f }))))("$width×$height $theme $uiLang: A→B→C→D, on-device only, never charges", async ({ width, height, theme, uiLang }) => {
    setViewport({ width, height });
    await openPaywall({ theme, uiLang });
    const w = RESERVE_WORDS[uiLang];
    const user = userEvent.setup();
    const purchases = [];
    const onPurchase = (event) => purchases.push(event.detail);
    window.addEventListener("andale-purchase", onPurchase);
    const quiet = theme === "dark" ? "#cdbba6" : "#6b6258";
    const ink = theme === "dark" ? "#f6efe4" : "#1f3a1a";

    // A
    const year = await screen.findByTestId("soft-paywall-annual");
    expect(screen.getByTestId("soft-paywall-annual-label").textContent).toBe(w.label);
    expect(screen.getByTestId("soft-paywall-annual-price").textContent).toBe(uiLang === "en" ? "$39.99\u00A0a\u00A0year" : "US$39.99\u00A0al\u00A0año");
    expect(screen.getByTestId("soft-paywall-annual-action").textContent).toBe(w.action);
    expect(screen.getByTestId("soft-paywall-annual-small").textContent).toBe(w.small);
    expect(screen.getByTestId("soft-paywall-saving").textContent).toBe(w.saving);
    expect(norm(screen.getByTestId("soft-paywall-saving").style.color)).toBe(quiet);
    expect(limeCount()).toBe(1);
    expect(screen.queryByLabelText(/close|cerrar/i)).toBeNull();
    expect(screen.getByTestId("soft-paywall").textContent).not.toMatch(/TBD|GEORGE_LINE/);

    // B
    await user.click(year);
    const log = () => window.__andaleFunnelLog || [];
    expect(log().filter((e) => e.event === FUNNEL_EVENTS.tapAnnual)).toHaveLength(1);
    expect(screen.queryByTestId("soft-paywall-annual")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-annual-small")).toBeNull();
    const input = screen.getByTestId("soft-paywall-reserve-email");
    const submit = screen.getByTestId("soft-paywall-reserve-submit");
    expect(input.style.height).toBe("48px");
    expect(input.placeholder).toBe(w.placeholder);
    expect(submit.textContent).toBe(w.submit);
    expect(submit.style.height).toBe("48px");
    expect(limeCount()).toBe(1);
    expect(screen.getByTestId("soft-paywall-reserve-note").textContent).toBe(w.note);
    expect(norm(screen.getByTestId("soft-paywall-reserve-note").style.color)).toBe(quiet);
    expect(screen.getByTestId("soft-paywall-monthly")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-dismiss")).toBeTruthy();

    // C
    await user.type(input, "ana@nope");
    await user.click(submit);
    const err = screen.getByTestId("soft-paywall-reserve-error");
    expect(err.textContent).toBe(w.error);
    expect(norm(err.style.color)).toBe(ink);
    expect(log().filter((e) => e.event === FUNNEL_EVENTS.reserveSubmit)).toHaveLength(0);
    expect(localStorage.getItem(WAITLIST_STORE_KEY)).toBeNull();

    // D
    await user.clear(input);
    await user.type(input, "ana@example.com");
    await user.click(screen.getByTestId("soft-paywall-reserve-submit"));
    expect(screen.getByTestId("soft-paywall-reserved-title").textContent).toBe(w.doneTitle);
    expect(screen.getByTestId("soft-paywall-reserved-line").textContent).toBe(w.doneLine);
    expect(screen.getByTestId("soft-paywall-reserved-keep").textContent).toBe(w.keepReading);
    expect(screen.getByTestId("soft-paywall-reserved-keep").style.minHeight).toBe("44px");
    const subs = log().filter((e) => e.event === FUNNEL_EVENTS.reserveSubmit);
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ plan: "annual", price: 39.99 });
    expect(JSON.parse(localStorage.getItem(WAITLIST_STORE_KEY))).toEqual({ email: "ana@example.com" });
    expect(localStorage.getItem(RESERVE_DAY_KEY)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(JSON.stringify(log())).not.toContain("ana@");
    expect(localStorage.getItem("andale-funnel-log")).not.toContain("ana@");
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(screen.getAllByTestId("soft-paywall-cenzontle")).toHaveLength(1);
    expect(purchases).toHaveLength(0);
    window.removeEventListener("andale-purchase", onPurchase);
  });
});

describe("monthly hold line", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it.each(FACES)("360×640 $theme $uiLang: monthly tap swaps the saving line, annual open clears it", async ({ theme, uiLang }) => {
    setViewport({ width: 360, height: 640 });
    await openPaywall({ theme, uiLang });
    const w = RESERVE_WORDS[uiLang];
    const user = userEvent.setup();
    const quiet = theme === "dark" ? "#cdbba6" : "#6b6258";
    const saving = await screen.findByTestId("soft-paywall-saving");
    const savingStyle = { fontSize: saving.style.fontSize, fontWeight: saving.style.fontWeight, marginTop: saving.style.marginTop };
    expect(screen.queryByTestId("soft-paywall-monthly-hold")).toBeNull();

    await user.click(screen.getByTestId("soft-paywall-monthly"));
    const hold = screen.getByTestId("soft-paywall-monthly-hold");
    expect(hold.textContent).toBe(w.monthlyHold);
    expect(w.monthlyHold).toBe(uiLang === "en" ? "Monthly isn't open yet. Reserve annual." : "El mensual aún no abre. Aparta el anual.");
    // One line at 360×640: jsdom has no layout, so this guards the budget (≤44 chars at 13px bold in the ~312px slot)
    // and asserts equal box height; the Chrome frames (shoot3-monthly.mjs) measure the real pixels.
    expect(w.monthlyHold.length).toBeLessThanOrEqual(44);
    expect(hold.getBoundingClientRect().height).toBe(saving.getBoundingClientRect().height);
    expect(screen.queryByTestId("soft-paywall-saving")).toBeNull();
    expect(hold.parentElement).toBe(screen.getByTestId("soft-paywall-annual").parentElement);
    expect({ fontSize: hold.style.fontSize, fontWeight: hold.style.fontWeight, marginTop: hold.style.marginTop }).toEqual(savingStyle);
    expect(norm(hold.style.color)).toBe(quiet);
    expect(limeCount()).toBe(1);

    await user.click(screen.getByTestId("soft-paywall-annual"));
    expect(screen.getByTestId("soft-paywall-reserve-email")).toBeTruthy();
    expect(screen.queryByTestId("soft-paywall-monthly-hold")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-reserve-submit"));
    expect(screen.getByTestId("soft-paywall-reserve-error")).toBeTruthy();
    expect(screen.queryByTestId("soft-paywall-monthly-hold")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-monthly"));
    expect(screen.queryByTestId("soft-paywall-monthly-hold")).toBeNull();
  });
});

describe("reserve email after the error", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it.each(FACES)("360×640 $theme $uiLang: error slot is always reserved, first typed character survives, html lang follows toggle", async ({ theme, uiLang }) => {
    setViewport({ width: 360, height: 640 });
    await openPaywall({ theme, uiLang });
    expect(document.documentElement.lang).toBe(uiLang);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("soft-paywall-annual"));
    const input = screen.getByTestId("soft-paywall-reserve-email");
    const slot = screen.getByTestId("soft-paywall-reserve-error-slot");
    const slotStyle = { height: slot.style.height, marginTop: slot.style.marginTop };
    expect(slotStyle).toEqual({ height: "17px", marginTop: "2px" });
    expect(screen.queryByTestId("soft-paywall-reserve-error")).toBeNull();

    await user.type(input, "abc");
    await user.click(screen.getByTestId("soft-paywall-reserve-submit"));
    const err = screen.getByTestId("soft-paywall-reserve-error");
    expect(err.parentElement).toBe(screen.getByTestId("soft-paywall-reserve-error-slot"));
    expect({ height: err.parentElement.style.height, marginTop: err.parentElement.style.marginTop }).toEqual(slotStyle);

    await user.clear(input);
    expect(screen.queryByTestId("soft-paywall-reserve-error")).toBeNull();
    expect(screen.getByTestId("soft-paywall-reserve-email")).toBe(input);
    await user.type(input, "test@example.com");
    expect(input.value).toBe("test@example.com");
    await user.click(screen.getByTestId("soft-paywall-reserve-submit"));
    expect(JSON.parse(localStorage.getItem(WAITLIST_STORE_KEY))).toEqual({ email: "test@example.com" });
  });
});
