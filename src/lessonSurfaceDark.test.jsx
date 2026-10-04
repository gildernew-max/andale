/**
 * Dark-only lesson plates. Light literals stay the main strings.
 * Wrong ink #FF6B6B on #3A1A1A is 5.64:1 (the old #EA2B2B pair was 3.63:1).
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const lin = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const contrastRatio = (fg, bg) => {
  const lum = (hex) => {
    const n = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  return (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05);
};
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
const paint = (el) => ({
  fill: norm(el.style.background || el.style.backgroundColor),
  ink: norm(el.style.color),
  line: norm(el.style.borderColor || el.style.borderTopColor),
});
const darkBlock = appSrc.slice(appSrc.indexOf("const D_DARK = {"), appSrc.indexOf("const D_DARK = {") + 900);
const token = (key) => {
  const m = darkBlock.match(new RegExp(`${key}:\\s*"(#[0-9A-Fa-f]{6})"`));
  expect(m, key).toBeTruthy();
  return m[1].toLowerCase();
};
const sliceBetween = (start, end) => appSrc.slice(appSrc.indexOf(start), appSrc.indexOf(end));
const card = (text) => [...document.querySelectorAll(".choice-card")].find((el) => el.textContent.includes(text));

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

const seed = (extra = {}) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "es",
    onboardingDone: true, firstSessionDone: true, paywallSeen: true, done: {}, ...extra,
  }));
};
const boot = async (theme, live) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  seed({ theme });
  if (live) localStorage.setItem(LIVE_KEY, JSON.stringify(live));
  render(<App />);
  await waitFor(() => expect(norm(screen.getByTestId("app-shell").style.background)).toBe(theme === "dark" ? "#15171c" : "#f6efe4"));
};

const mcQuestion = {
  type: "mc", prompt: "Espero que ___ a la fiesta.", choices: ["vienes", "vengas"],
  shuffledChoices: ["vienes", "vengas"], answer: "vengas", fixedChoices: true,
};
const lessonLive = (extra) => ({
  screen: "lesson", tab: "camino", qi: 0, status: "idle", selected: null,
  session: { title: "Subjuntivo presente", host: "luna", unitId: "subj1", color: "#58CC02", dark: "#46A302", questions: [mcQuestion] },
  ...extra,
});
const typeSession = {
  title: "Tipo", host: "luna", unitId: "subj1", color: "#58CC02", dark: "#46A302",
  questions: [{ type: "type", prompt: "Ojalá que no ___ mañana.", answers: ["llueva"], answerAid: { mode: "bank", tiles: [{ id: "word-0", w: "llueva" }, { id: "distractor-0", w: "llover" }] } }],
};
const matchSession = {
  title: "Parejas", host: "luna", unitId: "subj1", color: "#58CC02", dark: "#46A302",
  questions: [{ type: "match", pairs: [["ojalá", "hopefully"]], left: [{ t: "ojalá", id: 0 }], right: [{ t: "hopefully", id: 0 }] }],
};

describe("dark lesson surfaces", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("pins dark tokens and the light literals from main", () => {
    expect(token("bg")).toBe("#15171c");
    expect(token("card")).toBe("#1e2128");
    expect(token("subtle")).toBe("#252830");
    expect(token("line")).toBe("#2a2e36");
    expect(token("ink")).toBe("#e8e8ea");
    expect(token("red")).toBe("#ff6b6b");
    expect(token("green")).toBe("#58cc02");
    expect(token("okBg")).toBe("#1f3a1a");
    expect(token("badBg")).toBe("#3a1a1a");
    expect(appSrc).toContain('const HUB_CREAM = "#F6EFE4"');
    expect(Number(contrastRatio("#FF6B6B", "#3A1A1A").toFixed(2))).toBe(5.64);
    expect(contrastRatio("#FF6B6B", "#3A1A1A")).toBeGreaterThanOrEqual(4.5);
    expect(Number(contrastRatio("#EA2B2B", "#3A1A1A").toFixed(2))).toBe(3.63);
    expect(contrastRatio("#F6EFE4", "#252830")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#58CC02", "#252830")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#9CE16A", "#1F3A1A")).toBeGreaterThanOrEqual(4.5);

    const mc = sliceBetween('{q.type === "mc" && (', '{(q.type === "type"');
    expect(mc).toContain('let bg = "#fff", bd = D.line, col = D.ink;');
    expect(mc).toContain('bg = "#DDF4FF"; bd = D.blue; col = D.blueDark;');
    expect(mc).toContain('col = theme === "dark" ? D.red : D.badText;');
    expect(mc).toContain('else if (theme === "dark") { bg = D.subtle; col = HUB_CREAM; }');
    expect(mc.indexOf('"#fff"')).toBeLessThan(mc.indexOf("hoyListenChoicePaint"));
    const story = sliceBetween("story.questions.map", "answered === story.questions.length");
    expect(story).toContain('let bg = "#fff", bd = D.line, col = D.ink;');
    expect(story).toContain("if (done && isAns) { bg = D.okBg; bd = D.green; col = D.okText; }");
    expect(story).toContain('else if (theme === "dark") { bg = D.subtle; col = HUB_CREAM; }');
    for (const needle of [
      'background: status === "idle" ? (theme === "dark" ? D.subtle : "#F7F7F7")',
      'background: used ? D.greenBg : "#fff"',
      "color: used ? D.greenDark : D.green",
      "function darkLessonChipPaint",
      "background: D.subtle, borderColor: D.line, borderBottomColor: D.line, color: cream",
      'theme === "dark" ? D.subtle : (isSel ? "#DDF4FF" : "#fff")',
      "theme === \"dark\" ? HUB_CREAM : (isSel ? D.blueDark : D.ink)",
      "showWrong ? (theme === \"dark\" ? D.red : D.redDark)",
      "hit ? D.greenDark : (theme === \"dark\" ? D.red : D.redDark)",
      ".lesson-blank::placeholder{color:${D.sub};opacity:1}",
    ]) expect(appSrc).toContain(needle);
    expect((appSrc.match(/theme === "dark" \? D\.subtle : \(isSel \? "#DDF4FF" : "#fff"\)/g) || []).length).toBe(2);
    const light = appSrc.slice(appSrc.indexOf("const D_LIGHT"), appSrc.indexOf("const D_DARK"));
    expect(light).toContain('red: "#FF4B4B", redDark: "#EA2B2B"');
    expect(light).toContain('badText: "#EA2B2B"');
    expect(light).toContain('okBg: "#D7FFB8"');
    expect(light).toContain('card: "#FFFFFF"');
  });

  it("paints Lectura claim choices dark and leaves the light plates white", async () => {
    const live = { screen: "story", tab: "lectura", storyId: "story-0", paraIdx: 6, ansSel: {} };
    const user = userEvent.setup();
    await boot("dark", live);
    await waitFor(() => expect(screen.getByTestId("story-reader")).toBeTruthy());
    expect(paint(card("Dormidos en casa"))).toMatchObject({ fill: "#252830", ink: "#f6efe4", line: "#2a2e36" });
    await user.click(card("En el panteón de la isla de Janitzio"));
    expect(paint(card("En el panteón de la isla de Janitzio"))).toMatchObject({ fill: "#1f3a1a", line: "#58cc02" });
    expect(paint(card("Dormidos en casa")).fill).toBe("#252830");
    await boot("light", live);
    await waitFor(() => expect(screen.getByTestId("story-reader")).toBeTruthy());
    expect(paint(card("Dormidos en casa"))).toMatchObject({ fill: "#ffffff", ink: "#3c3c3c", line: "#e5e5e5" });
    await user.click(card("En el panteón de la isla de Janitzio"));
    expect(paint(card("En el panteón de la isla de Janitzio"))).toMatchObject({ fill: "#d7ffb8", line: "#58cc02", ink: "#58a700" });
  });

  it("paints lesson choices, the idle input, the word bank, and match tiles", async () => {
    await boot("dark", lessonLive());
    await waitFor(() => expect(screen.getAllByTestId("choice-card").length).toBe(2));
    screen.getAllByTestId("choice-card").forEach((el) => expect(paint(el)).toMatchObject({ fill: "#252830", ink: "#f6efe4", line: "#2a2e36" }));
    await boot("dark", lessonLive({ status: "correct", selected: 1 }));
    await waitFor(() => expect(screen.getAllByTestId("choice-card").length).toBe(2));
    expect(paint(screen.getAllByTestId("choice-card").find((el) => el.textContent.includes("vengas")))).toMatchObject({ fill: "#1f3a1a", line: "#58cc02" });
    await boot("dark", lessonLive({ status: "wrong", selected: 0 }));
    await waitFor(() => expect(screen.getAllByTestId("choice-card").length).toBe(2));
    const wrong = screen.getAllByTestId("choice-card").find((el) => el.textContent.includes("vienes"));
    expect(paint(wrong)).toMatchObject({ fill: "#3a1a1a", ink: "#ff6b6b", line: "#ff6b6b" });
    expect(contrastRatio(paint(wrong).ink, paint(wrong).fill)).toBeGreaterThanOrEqual(4.5);
    await boot("light", lessonLive());
    await waitFor(() => expect(screen.getAllByTestId("choice-card").length).toBe(2));
    screen.getAllByTestId("choice-card").forEach((el) => expect(paint(el)).toMatchObject({ fill: "#ffffff", ink: "#3c3c3c" }));
    await boot("light", lessonLive({ status: "wrong", selected: 0 }));
    expect(paint(screen.getAllByTestId("choice-card").find((el) => el.textContent.includes("vienes")))).toMatchObject({ fill: "#ffdfe0", ink: "#ea2b2b", line: "#ff4b4b" });

    await boot("dark", lessonLive({ session: typeSession }));
    const input = await screen.findByPlaceholderText("Escribe la palabra que falta…");
    expect(norm(input.style.background)).toBe("#252830");
    expect(norm(input.style.color)).toBe("#f6efe4");
    expect([...document.querySelectorAll("style")].some((el) => el.textContent.includes(".lesson-blank::placeholder{color:#A0A4AB;opacity:1}"))).toBe(true);
    expect(paint(screen.getAllByTestId("bank-tile")[0])).toMatchObject({ fill: "#252830", ink: "#f6efe4", line: "#2a2e36" });
    await boot("light", lessonLive({ session: typeSession }));
    const lightInput = await screen.findByPlaceholderText("Escribe la palabra que falta…");
    expect(norm(lightInput.style.background)).toBe("#f7f7f7");
    expect(lightInput.style.color).toBe("");
    expect([...document.querySelectorAll("style")].some((el) => el.textContent.includes(".lesson-blank::placeholder"))).toBe(false);
    expect(paint(screen.getAllByTestId("bank-tile")[0])).toMatchObject({ fill: "#ffffff", ink: "#58cc02" });

    const pairs = {
      screen: "matchPairs", tab: "practica",
      matchGame: { pairs: [["ojalá", "hopefully"], ["dudar", "to doubt"]], left: [{ t: "ojalá", id: 0 }, { t: "dudar", id: 1 }], right: [{ t: "hopefully", id: 0 }, { t: "to doubt", id: 1 }], matched: [], sel: null, done: false },
    };
    await boot("dark", pairs);
    expect(paint(await screen.findByTestId("match-tile-left-0"))).toMatchObject({ fill: "#252830", ink: "#f6efe4" });
    await boot("light", pairs);
    expect(paint(await screen.findByTestId("match-tile-left-0"))).toMatchObject({ fill: "#ffffff", ink: "#3c3c3c" });
    await boot("dark", lessonLive({ session: matchSession }));
    await waitFor(() => expect(screen.getByText("Une las parejas")).toBeTruthy());
    expect(paint(card("ojalá"))).toMatchObject({ fill: "#252830", ink: "#f6efe4" });
    await boot("light", lessonLive({ session: matchSession }));
    await waitFor(() => expect(screen.getByText("Une las parejas")).toBeTruthy());
    expect(paint(card("ojalá"))).toMatchObject({ fill: "#ffffff", ink: "#3c3c3c" });
  });

  it("paints the Safe/Risky wrong reveal #FF6B6B on #3A1A1A and keeps the light red", async () => {
    const item = {
      phrase: "Quedo a sus órdenes.", context: { es: "Cierras un correo.", en: "You close an email." },
      answer: "formal", answers: ["formal"],
      literal: { es: "Quedo bajo sus órdenes.", en: "I remain under your orders." },
      note: { es: "Cierre profesional.", en: "A professional close." },
    };
    const show = async (theme, game) => {
      await boot(theme, { screen: "safeRisky", tab: "practica", safeGame: { items: [item], idx: 0, score: 0, streak: 0, bestStreak: 0, done: false, awarded: false, ...game } });
      await screen.findByTestId("safe-risky-continue");
    };
    await show("dark", { selected: "safe", tapped: [], tappedWrong: ["safe"] });
    expect(norm(screen.getByText(/Mejor respuesta/).style.color)).toBe("#ff6b6b");
    const wrongBtn = screen.getByTestId("safe-risky-choice-safe");
    expect(paint(wrongBtn)).toMatchObject({ fill: "#3a1a1a", ink: "#ff6b6b" });
    expect(norm(wrongBtn.style.borderBottomColor)).toBe("#ff6b6b");
    await show("dark", { selected: "formal", tapped: ["formal"], tappedWrong: [] });
    expect(norm(screen.getByText(/Buen juicio/).style.color)).toBe("#46a302");
    const rightBtn = screen.getByTestId("safe-risky-choice-formal");
    expect(paint(rightBtn).fill).toBe("#1f3a1a");
    expect(norm(rightBtn.style.borderTopColor) || paint(rightBtn).line).toBe("#58cc02");
    await show("light", { selected: "safe", tapped: [], tappedWrong: ["safe"] });
    expect(norm(screen.getByText(/Mejor respuesta/).style.color)).toBe("#ea2b2b");
    const lightWrong = screen.getByTestId("safe-risky-choice-safe");
    expect(paint(lightWrong)).toMatchObject({ fill: "#fff1f1", ink: "#ff4b4b" });
    expect(norm(lightWrong.style.borderBottomColor)).toBe("#ea2b2b");
  });
});
