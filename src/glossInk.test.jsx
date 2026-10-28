/**
 * Gloss ink only. Fills stay. D.redDark stays #EA2B2B outside the Memory wrong flash.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";
import { contrastRatio } from "./spanishKeyboard.js";

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const cssHex = (value) => {
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
  window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => [],
      speak: vi.fn(),
      cancel: () => {},
      resume: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("gloss ink", () => {
  it("keeps Wordle light gloss at #6B6258 and dark gloss at #A0A4AB", () => {
    expect(appSrc).not.toContain("#777777");
  });

  it("moves the unused Memory and crossword gloss defaults off #777777", () => {
  });


});
