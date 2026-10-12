/**
 * At 360×640 the last checkpoint answer can scroll 12px above the pinned
 * NEXT row. NEXT gating matches main: the button is never disabled, and a
 * checkpoint does not have to be answered before it advances. Back is
 * disabled only on paragraph 1.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";
import {
  lecturaCheckpointAnswerClears,
  lecturaGlossBlocksNext,
  lecturaNextBottomCss,
  lecturaNextClearanceCss,
  lecturaNextClearancePx,
  lecturaNextPinStyle,
  lecturaNextRowTop,
  LECTURA_NEXT_Z,
  LECTURA_WORD_SHEET_HOST_Z,
  LECTURA_WORD_SHEET_Z,
} from "./lecturaAdvance.js";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const here = dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");

const MAIN_BACK = '<Btn outline disabled={paraIdx === 0} onClick={() => advanceLectura(paraIdx - 1)} style={{ flex: 1 }}>';
const MAIN_NEXT = '<Btn onClick={() => advanceLectura(paraIdx + 1)} style={{ flex: 2 }}>';

describe("lectura NEXT pin clearance and main gating", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    localStorage.clear();
  });

  const boot = async ({ paraIdx = 0, storyChecks, width = 360, height = 640, theme = "light" } = {}) => {
    cleanup();
    localStorage.clear();
    mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, headers: { get: () => "text/html" } })));
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "en",
      onboardingDone: true, firstSessionDone: true, paywallSeen: true, done: {}, theme,
      ...(storyChecks ? { storyChecks } : {}),
    }));
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "story", tab: "lectura", storyId: "story-0", paraIdx, ansSel: {},
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lectura-advance")).toBeTruthy());
    return user;
  };

  it("pads 360x640 so the last checkpoint answer can clear the pinned row by 12px", async () => {
    await boot();
    expect(window.innerWidth).toBe(360);
    expect(window.innerHeight).toBe(640);
    expect(appSrc.includes("padding: `20px 20px ${lecturaNextClearanceCss()}`")).toBe(true);
    expect(lecturaNextClearanceCss()).toBe("calc(92px + env(safe-area-inset-bottom))");
    expect(lecturaNextClearancePx()).toBe(92);
    const rowTop = lecturaNextRowTop(640);
    expect(rowTop).toBe(560);
    const lastAnswer = 1000;
    expect(lecturaCheckpointAnswerClears({
      answerDocBottom: lastAnswer,
      documentHeight: lastAnswer + lecturaNextClearancePx(),
      viewportHeight: 640,
    })).toBe(true);
    const answers = [...screen.getByTestId("lectura-checkpoint-answers").querySelectorAll("button")];
    expect(answers.length).toBeGreaterThan(1);
    expect(answers.every((btn) => !btn.disabled)).toBe(true);
    const advance = screen.getByTestId("lectura-advance");
    expect(advance.style.position).toBe("fixed");
    expect(advance.style.paddingTop).toBe("12px");
  });

  it("keeps main's NEXT gating: enabled with or without a checkpoint answer", async () => {
    expect(appSrc.includes(MAIN_BACK)).toBe(true);
    expect(appSrc.includes(MAIN_NEXT)).toBe(true);
    const advanceAt = appSrc.indexOf('data-testid="lectura-advance"');
    const advanceBlock = appSrc.slice(advanceAt, advanceAt + 700);
    expect(advanceBlock.includes("disabled={paraIdx === 0}")).toBe(true);
    expect(advanceBlock.includes(MAIN_NEXT)).toBe(true);
    expect(advanceBlock.slice(advanceBlock.indexOf(MAIN_NEXT)).includes("disabled=")).toBe(false);

    const user = await boot();
    const next = screen.getByRole("button", { name: "Next →" });
    const back = screen.getByRole("button", { name: "← Back" });
    expect(next.disabled).toBe(false);
    expect(back.disabled).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).storyChecks).toBeUndefined();

    const first = screen.getByTestId("lectura-paragraph-first").textContent;
    await user.click(next);
    await waitFor(() => expect(screen.getByTestId("lectura-paragraph").textContent).not.toBe(first));
    expect(screen.getByRole("button", { name: "Next →" }).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "← Back" }).disabled).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).storyChecks).toBeUndefined();

    await boot({ storyChecks: { "story-0": { 0: "It visits once a year" } } });
    expect(screen.getByRole("button", { name: "Next →" }).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "← Back" }).disabled).toBe(true);

    await boot({ paraIdx: 5 });
    expect(screen.getByRole("button", { name: "Questions →" }).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "← Back" }).disabled).toBe(false);
  });

  it("paints a solid page band at 360x640, with a hairline only in dark", async () => {
    for (const theme of ["light", "dark"]) {
      await boot({ theme });
      expect(window.innerWidth).toBe(360);
      expect(window.innerHeight).toBe(640);
      expect(screen.getByTestId("app-shell").getAttribute("data-theme")).toBe(theme);
      const advance = screen.getByTestId("lectura-advance");
      const band = lecturaNextPinStyle(theme === "dark" ? "#15171C" : "#F6EFE4", theme === "dark" ? "#2A2E36" : undefined);
      const rgb = (hex) => {
        const h = hex.slice(1);
        const n = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
        return `rgb(${n.join(", ")})`;
      };
      expect(advance.style.position).toBe("fixed");
      expect(advance.style.bottom).toBe("0px");
      expect(advance.style.paddingBottom).toBe(lecturaNextBottomCss());
      expect([band.backgroundColor, rgb(band.backgroundColor)]).toContain(advance.style.backgroundColor);
      expect(advance.style.backgroundImage).toBe("none");
      expect(advance.style.boxShadow).toBe("none");
      expect(advance.style.background).not.toMatch(/gradient/i);
      expect(advance.style.paddingTop).toBe(`${band.paddingTop}px`);
      expect(advance.style.zIndex).toBe(String(LECTURA_NEXT_Z));
      if (theme === "dark") {
        expect(advance.style.borderTopWidth).toBe("1px");
        expect(advance.style.borderTopStyle).toBe("solid");
        expect([`1px solid ${band.borderTop.slice(10)}`, `1px solid ${rgb(band.borderTop.slice(10))}`]).toContain(advance.style.borderTop);
      } else {
        expect(advance.style.borderTopStyle).toBe("none");
        expect(band.borderTop).toBe("none");
      }
      const answers = [...screen.getByTestId("lectura-checkpoint-answers").querySelectorAll("button")];
      expect(answers.at(-1).textContent).toBe("It only brings sadness");
    }
    expect(appSrc.includes("lecturaNextPinStyle(D.bg, theme === \"dark\" ? D.line : undefined)")).toBe(true);
  });

  it("stacks the open gloss sheet above NEXT so a tap on the sheet is not NEXT", async () => {
    expect(lecturaGlossBlocksNext(LECTURA_WORD_SHEET_Z)).toBe(true);
    expect(lecturaGlossBlocksNext(LECTURA_WORD_SHEET_HOST_Z)).toBe(true);
    expect(LECTURA_WORD_SHEET_HOST_Z).toBeGreaterThan(LECTURA_WORD_SHEET_Z);
    expect(LECTURA_WORD_SHEET_Z).toBeGreaterThan(LECTURA_NEXT_Z);

    const user = await boot();
    const flores = [...document.querySelectorAll("span")].find((el) => el.textContent === "flores");
    expect(flores).toBeTruthy();
    await user.click(flores);
    const sheet = await screen.findByTestId("word-sheet");
    await waitFor(() => expect(sheet.style.visibility).toBe("visible"));
    const advance = screen.getByTestId("lectura-advance");
    const host = screen.getByTestId("lectura-checkpoint");
    expect(Number(sheet.style.zIndex)).toBe(LECTURA_WORD_SHEET_Z);
    expect(Number(host.style.zIndex)).toBe(LECTURA_WORD_SHEET_HOST_Z);
    expect(Number(advance.style.zIndex)).toBe(LECTURA_NEXT_Z);
    expect(lecturaGlossBlocksNext(Number(host.style.zIndex), Number(advance.style.zIndex))).toBe(true);
    expect(sheet.style.pointerEvents).toBe("auto");
    expect(sheet.style.pointerEvents).not.toBe("none");

    const next = screen.getByRole("button", { name: "Next →" });
    expect(next.disabled).toBe(false);
    const before = screen.getByTestId("lectura-paragraph-first").textContent;
    await user.click(sheet);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toBe(before);
    expect(screen.getByRole("button", { name: "Next →" }).disabled).toBe(false);
  });
});
