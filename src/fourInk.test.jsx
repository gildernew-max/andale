/**
 * Four ink pins: dark Safe/Risky right heading, light coach name tag,
 * light Hoy ¡Eso!, and the section habilidades label.
 * Dark Hoy gold stays D_DARK.gold. The heading sits on the page, not a card.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";
import { startCubetasRun } from "./cubetas.js";

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
    onboardingDone: true, firstSessionDone: true, paywallSeen: true, bajioUnlockSeen: true,
    lecturaHandoffSeen: true, done: {}, ...extra,
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

const hoyLive = {
  screen: "done",
  tab: "camino",
  lessonStats: { right: 1, wrong: 0 },
  session: {
    firstHoy: true,
    title: "Noche de faroles",
    host: "luna",
    unitId: "_today",
    questions: [{}],
    awarded: true,
    earnedXP: 12,
    earnedGems: 1,
    todaySceneId: "faroles",
  },
};

const skillsLabel = () => {
  const banner = screen.getAllByTestId("hub-section-banner")[0];
  return [...banner.querySelectorAll("div")].find((el) => /habilidades/.test(el.textContent) && el.children.length === 0);
};

describe("four ink contrast", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("paints light Hoy ¡Eso! #85672C on the cream page and keeps dark gold on the page fill", async () => {
    expect(appSrc).toContain('(quietWin || perchCard) && theme !== "dark" ? "#85672C" : D.gold');
    expect(appSrc).toContain('color: theme === "dark" ? D.gold : "#85672C"');
    const dLight = appSrc.slice(appSrc.indexOf("const D_LIGHT"), appSrc.indexOf("const D_DARK"));
    expect(dLight).toContain('sub: "#777777"');
    expect(dLight).toContain('gold: "#FFC800"');
    const dDark = appSrc.slice(appSrc.indexOf("const D_DARK"), appSrc.indexOf("const D_DARK") + 700);
    expect(dDark).toContain('gold: "#FFD43B"');

    await boot("light", hoyLive);
    const light = await screen.findByTestId("hoy-win");
    expect(light.textContent).toBe("¡Eso!");
    expect(norm(light.style.color)).toBe("#85672c");
    const lightFill = norm(screen.getByTestId("app-shell").style.background);
    expect(lightFill).toBe("#f6efe4");
    expect(contrastRatio("#85672C", "#F6EFE4")).toBeGreaterThanOrEqual(4.5);
    expect(Number(contrastRatio("#85672C", "#F6EFE4").toFixed(2))).toBe(4.63);

    await boot("dark", hoyLive);
    const dark = await screen.findByTestId("hoy-win");
    expect(dark.textContent).toBe("¡Eso!");
    expect(norm(dark.style.color)).toBe("#ffd43b");
    const darkFill = norm(screen.getByTestId("app-shell").style.background);
    expect(darkFill).toBe("#15171c");
    expect(darkFill).not.toBe("#1e2128");
    expect(contrastRatio("#FFD43B", "#15171C")).toBeGreaterThanOrEqual(4.5);
    expect(Number(contrastRatio("#FFD43B", "#15171C").toFixed(2))).toBe(12.58);

    await boot("light", { screen: "cubetas", tab: "practica", cubetasGame: { ...startCubetasRun(undefined, () => 0), status: "clear" } });
    const clear = await screen.findByTestId("cubetas-eso");
    expect(clear.textContent).toBe("¡Eso!");
    expect(norm(clear.style.color)).toBe("#85672c");
    expect(norm(screen.getByTestId("app-shell").style.background)).toBe("#f6efe4");

    await boot("dark", { screen: "cubetas", tab: "practica", cubetasGame: { ...startCubetasRun(undefined, () => 0), status: "clear" } });
    const darkClear = await screen.findByTestId("cubetas-eso");
    expect(norm(darkClear.style.color)).toBe("#ffd43b");

    await boot("light", { screen: "cubetas", tab: "practica", cubetasGame: { ...startCubetasRun(undefined, () => 0), status: "done" } });
    const done = await screen.findByTestId("cubetas-eso");
    expect(done.tagName).toBe("H2");
    expect(done.style.color).toBe("");
  });

  it("paints the habilidades label solid #6B6258 on cream and #A0A4AB on the dark card", async () => {
    const bannerSrc = appSrc.slice(appSrc.indexOf('data-testid="hub-section-banner"'), appSrc.indexOf('data-testid="hub-section-banner"') + 1100);
    expect(bannerSrc).toContain('fontSize: 11, fontWeight: 700, color: theme === "dark" ? "#A0A4AB" : "#6B6258"');
    expect(bannerSrc).not.toContain("opacity: 0.7");

    await boot("light");
    const light = await waitFor(() => skillsLabel());
    expect(light.textContent).toMatch(/habilidades/);
    expect(light.style.fontSize).toBe("11px");
    expect(light.style.fontWeight).toBe("700");
    expect(light.style.opacity).toBe("");
    expect(norm(light.style.color)).toBe("#6b6258");
    const lightCard = light.closest('[data-testid="hub-section-banner"]');
    expect(norm(lightCard.style.background)).toBe("#f6efe4");
    expect(contrastRatio("#6B6258", "#F6EFE4")).toBeGreaterThanOrEqual(4.5);
    expect(Number(contrastRatio("#6B6258", "#F6EFE4").toFixed(2))).toBe(5.23);
    expect(contrastRatio("#6B6258", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);

    await boot("dark");
    const dark = await waitFor(() => skillsLabel());
    expect(dark.style.fontSize).toBe("11px");
    expect(dark.style.fontWeight).toBe("700");
    expect(dark.style.opacity).toBe("");
    expect(norm(dark.style.color)).toBe("#a0a4ab");
    const darkCard = dark.closest('[data-testid="hub-section-banner"]');
    expect(norm(darkCard.style.background)).toBe("#1e2128");
    expect(contrastRatio("#A0A4AB", "#1E2128")).toBeGreaterThanOrEqual(4.5);
    expect(Number(contrastRatio("#A0A4AB", "#1E2128").toFixed(2))).toBe(6.44);
  });
});
