/**
 * Perfil footer mailto. Ink matches Soporte: light D_LIGHT.sub #6B6258, dark #A0A4AB.
 * The link only builds a mailto. Nothing is sent, stored, or counted.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ANDALE_BUILD, andaleBuildFromSha } from "./buildId.js";
import App from "./App.jsx";

const here = dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");
const supportHtml = readFileSync(join(here, "..", "public", "support.html"), "utf8");
const supportMail = supportHtml.match(/mailto:([^"'\s>]+)/)[1];
const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const TESTER_NAME = "Dave";
const TESTER_XP = 424242;

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
    value: { getVoices: () => [], speak() {}, cancel() {}, resume() {}, addEventListener() {}, removeEventListener() {} },
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

const readableDevice = () => {
  try {
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    return typeof ua === "string" ? ua : "";
  } catch {
    return "";
  }
};

const georgeBody = (uiLang, theme, screenKey, build, device) => {
  const tail = device ? (uiLang === "en" ? ` · device ${device}` : ` · dispositivo ${device}`) : "";
  if (uiLang === "en") {
    const mode = theme === "dark" ? "dark" : "light";
    return `What were you doing?\n\nWhat did you expect to happen?\n\nWhat happened?\n\nIf you can, attach a screenshot.\n\n—\nDetails to help us (please keep them): version ${build} · language en · mode ${mode} · screen ${screenKey}${tail}`;
  }
  const mode = theme === "dark" ? "oscuro" : "claro";
  return `¿Qué estabas haciendo?\n\n¿Qué esperabas que pasara?\n\n¿Qué pasó?\n\nSi puedes, adjunta una captura de pantalla.\n\n—\nDatos para ayudarnos (por favor no los borres): versión ${build} · idioma es · modo ${mode} · pantalla ${screenKey}${tail}`;
};

const bootPerfil = async (uiLang, theme) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    xp: TESTER_XP,
    gems: 0,
    name: TESTER_NAME,
    contentVersion: 2,
    hearts: 5,
    uiLang,
    theme,
    onboardingDone: true,
    firstSessionDone: true,
    paywallSeen: true,
    bajioUnlockSeen: true,
    lecturaHandoffSeen: true,
    done: {},
    stories: {},
    missions: {},
  }));
  localStorage.setItem(LIVE_KEY, JSON.stringify({ screen: "home", tab: "perfil" }));
  render(<App />);
  const label = uiLang === "en" ? "Report a problem" : "Reportar un problema";
  await waitFor(() => expect(screen.getByTestId("report-problem").textContent).toBe(label));
};

describe("perfil problem report", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("uses the support.html address and encodes subject and body", () => {
    expect(supportMail).toBe("gildernew@gmail.com");
    expect(appSrc).toContain(`const PROBLEM_REPORT_MAIL = "${supportMail}"`);
    expect(appSrc).toContain("mailto:${PROBLEM_REPORT_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}");
    expect(appSrc).toContain('from "./buildId.js"');
    expect(typeof ANDALE_BUILD).toBe("string");
    expect(ANDALE_BUILD).not.toBe("");
    const pkgVersion = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")).version;
    expect(andaleBuildFromSha("", pkgVersion)).toBe(pkgVersion);
    expect(andaleBuildFromSha("   ", pkgVersion)).toBe(pkgVersion);
    const footer = appSrc.slice(appSrc.indexOf('data-testid="perfil-footer"'), appSrc.indexOf('data-testid="perfil-footer"') + 900);
    expect(footer).toContain("flexWrap: \"wrap\"");
    expect(footer).not.toContain("emitFunnelEvent");
    expect(footer).not.toContain("shipFunnelEvent");
    expect(footer).not.toContain("localStorage");
  });

  it.each([
    ["es", "light", "Reportar un problema", "Ándale: reporte de problema", "#6b6258"],
    ["es", "dark", "Reportar un problema", "Ándale: reporte de problema", "#a0a4ab"],
    ["en", "light", "Report a problem", "Ándale: problem report", "#6b6258"],
    ["en", "dark", "Report a problem", "Ándale: problem report", "#a0a4ab"],
  ])("renders Perfil in %s %s with George's mailto and Soporte ink", async (uiLang, theme, label, subject, ink) => {
    await bootPerfil(uiLang, theme);
    const link = screen.getByTestId("report-problem");
    const soporte = screen.getByRole("link", { name: "Soporte" });
    expect(link.textContent).toBe(label);
    expect(link.parentElement).toBe(soporte.parentElement);
    expect(link.style.fontSize).toBe(soporte.style.fontSize);
    expect(link.style.fontWeight).toBe(soporte.style.fontWeight);
    expect(link.style.textDecoration).toBe(soporte.style.textDecoration);
    expect(link.style.fontSize).toBe("13px");
    expect(String(link.style.fontWeight)).toBe("800");
    expect(link.style.textDecoration).toContain("underline");
    expect(norm(link.style.color)).toBe(ink);
    expect(norm(link.style.color)).toBe(norm(soporte.style.color));

    const href = link.getAttribute("href");
    expect(href.startsWith("mailto:")).toBe(true);
    expect(href.startsWith(`mailto:${supportMail}?`)).toBe(true);
    expect(href).not.toMatch(/\n/);
    expect(href).not.toContain(TESTER_NAME);
    expect(href).not.toContain(String(TESTER_XP));
    const parsed = new URL(href);
    expect(parsed.pathname).toBe(supportMail);
    expect([...parsed.searchParams.keys()].sort()).toEqual(["body", "subject"]);
    expect(parsed.searchParams.get("subject")).toBe(subject);
    const body = parsed.searchParams.get("body");
    expect(body).toBe(georgeBody(uiLang, theme, "perfil", ANDALE_BUILD, readableDevice()));
    expect(body).not.toContain(TESTER_NAME);
    expect(body).not.toContain("@");
    expect(body).not.toContain(String(TESTER_XP));
    const facts = body.split("\n").at(-1);
    const mode = uiLang === "en"
      ? (theme === "dark" ? "dark" : "light")
      : (theme === "dark" ? "oscuro" : "claro");
    const device = readableDevice();
    const deviceTail = device ? (uiLang === "en" ? ` · device ${device}` : ` · dispositivo ${device}`) : "";
    const factsLead = uiLang === "en"
      ? `Details to help us (please keep them): version ${ANDALE_BUILD} · language en · mode ${mode} · screen perfil`
      : `Datos para ayudarnos (por favor no los borres): versión ${ANDALE_BUILD} · idioma es · modo ${mode} · pantalla perfil`;
    expect(facts).toBe(`${factsLead}${deviceTail}`);
    expect(facts).not.toMatch(/name|email|correo|id\b/i);

    if (uiLang === "en") {
      expect(screen.getByTestId("nav-perfil").textContent.trim()).toBe("Profile");
    }
  });
});
