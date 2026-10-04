/**
 * Coach postcards on Perfil.
 * Light stays #fff / #F7F7F7 with locked ink #6B6258.
 * Dark fills match the card token (#1E2128). Locked edge is D.line (#2A2E36).
 * The 0.62 fade stays on the portrait wrapper. Text and its card ancestors stay opaque.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";
import { contrastRatio } from "./spanishKeyboard.js";

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

const bootPerfil = async (theme) => {
  cleanup();
  localStorage.clear();
  mockBrowser();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    xp: 100,
    gems: 0,
    name: "Dave",
    contentVersion: 2,
    hearts: 5,
    uiLang: "es",
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
  await waitFor(() => expect(screen.getAllByText("BLOQ.").length).toBe(3));
};

const opacityOf = (node) => Number(node.style.opacity || "1");

const inheritedInk = (el) => {
  let node = el;
  while (node) {
    const painted = norm(node.style?.color);
    if (painted) return painted;
    node = node.parentElement;
  }
  return "";
};

const textParts = (card, label) => {
  const column = label.previousElementSibling;
  return {
    title: column.children[0],
    caption: column.children[1],
    label,
  };
};

const assertNoTextOpacity = (card, parts) => {
  for (const el of [parts.title, parts.caption, parts.label]) {
    let node = el;
    while (node) {
      expect(opacityOf(node)).toBeGreaterThanOrEqual(1);
      if (node === card) break;
      node = node.parentElement;
    }
    expect(node).toBe(card);
  }
};

describe("coach postcard colors", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("light cards keep white and #F7F7F7 fills, locked ink #6B6258, and an inherited title", async () => {
    await bootPerfil("light");
    const listo = screen.getByText("LISTO");
    const open = listo.parentElement;
    const openParts = textParts(open, listo);
    expect(norm(open.style.background)).toBe("#ffffff");
    expect(norm(open.style.borderTopColor)).toBe("#58cc02");
    expect(norm(open.style.borderRightColor)).toBe("#58cc02");
    expect(norm(open.style.borderLeftColor)).toBe("#58cc02");
    expect(norm(open.style.borderBottomColor)).toBe("#46a302");
    expect(openParts.title.style.color).toBe("");
    expect(inheritedInk(openParts.title)).toBe("#3c3c3c");
    expect(norm(openParts.caption.style.color)).toBe("#6b6258");
    expect(norm(openParts.label.style.color)).toBe("#58cc02");
    assertNoTextOpacity(open, openParts);
    expect(opacityOf(open)).toBeGreaterThanOrEqual(1);
    expect(open.firstElementChild.tagName).toBe("svg");

    const labels = screen.getAllByText("BLOQ.");
    expect(labels).toHaveLength(3);
    for (const label of labels) {
      const card = label.parentElement;
      const parts = textParts(card, label);
      expect(norm(card.style.background)).toBe("#f7f7f7");
      expect(norm(card.style.borderTopColor)).toBe("#e5e5e5");
      expect(norm(card.style.borderRightColor)).toBe("#e5e5e5");
      expect(norm(card.style.borderLeftColor)).toBe("#e5e5e5");
      expect(norm(card.style.borderBottomColor)).toBe("#e5e5e5");
      for (const el of [parts.title, parts.caption, parts.label]) {
        expect(norm(el.style.color)).toBe("#6b6258");
      }
      assertNoTextOpacity(card, parts);
      const art = card.firstElementChild;
      expect(art.style.opacity).toBe("0.62");
      expect(art.contains(parts.title)).toBe(false);
      expect(art.contains(parts.caption)).toBe(false);
      expect(art.contains(parts.label)).toBe(false);
    }
  });

  it("dark cards fill #1E2128, lock the edge at #2A2E36, and paint solid ink with no text fade", async () => {
    await bootPerfil("dark");
    const listo = screen.getByText("LISTO");
    const open = listo.parentElement;
    const openParts = textParts(open, listo);
    expect(norm(open.style.background)).toBe("#1e2128");
    expect(norm(open.style.borderTopColor)).toBe("#58cc02");
    expect(norm(open.style.borderRightColor)).toBe("#58cc02");
    expect(norm(open.style.borderLeftColor)).toBe("#58cc02");
    expect(norm(open.style.borderBottomColor)).toBe("#46a302");
    expect(norm(openParts.title.style.color)).toBe("#e8e8ea");
    expect(norm(openParts.caption.style.color)).toBe("#a0a4ab");
    expect(norm(openParts.label.style.color)).toBe("#58cc02");
    assertNoTextOpacity(open, openParts);

    const labels = screen.getAllByText("BLOQ.");
    expect(labels).toHaveLength(3);
    for (const label of labels) {
      const card = label.parentElement;
      const parts = textParts(card, label);
      expect(norm(card.style.background)).toBe("#1e2128");
      expect(norm(card.style.borderTopColor)).toBe("#2a2e36");
      expect(norm(card.style.borderRightColor)).toBe("#2a2e36");
      expect(norm(card.style.borderLeftColor)).toBe("#2a2e36");
      expect(norm(card.style.borderBottomColor)).toBe("#2a2e36");
      for (const el of [parts.title, parts.caption, parts.label]) {
        expect(norm(el.style.color)).toBe("#a0a4ab");
      }
      assertNoTextOpacity(card, parts);
      const art = card.firstElementChild;
      expect(art.style.opacity).toBe("0.62");
      expect(art.contains(parts.title)).toBe(false);
      expect(art.contains(parts.caption)).toBe(false);
      expect(art.contains(parts.label)).toBe(false);
    }
  });

  it("measures postcard ink and the unlocked coach edge with real luminance", () => {
    const ratio = (fg, bg) => Number(contrastRatio(fg, bg).toFixed(2));
    expect(ratio("#3C3C3C", "#FFFFFF")).toBe(11.03);
    expect(ratio("#6B6258", "#FFFFFF")).toBe(5.98);
    expect(ratio("#58CC02", "#FFFFFF")).toBe(2.09);
    expect(ratio("#6B6258", "#F7F7F7")).toBe(5.58);
    expect(ratio("#46A302", "#FFFFFF")).toBe(3.23);
    expect(ratio("#E8E8EA", "#1E2128")).toBe(13.17);
    expect(ratio("#A0A4AB", "#1E2128")).toBe(6.44);
    expect(ratio("#58CC02", "#1E2128")).toBe(7.71);
    expect(ratio("#46A302", "#1E2128")).toBe(4.99);
    expect(contrastRatio("#58CC02", "#1E2128")).toBeGreaterThanOrEqual(3);
    expect(contrastRatio("#46A302", "#1E2128")).toBeGreaterThanOrEqual(3);
  });
});
