/** Under the EN toggle, <html lang> is "en" but Spanish story and lesson content stays tagged lang="es". */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";

const boot = async (uiLang) => {
  cleanup();
  localStorage.clear();
  mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, headers: { get: () => "text/html" } })));
  localStorage.setItem("andale-v3", JSON.stringify({
    welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang, theme: "dark",
    onboardingDone: true, firstSessionDone: true, paywallSeen: true, done: {},
  }));
  localStorage.setItem("andale-v3-live", JSON.stringify({ screen: "story", tab: "lectura", storyId: "story-0", paraIdx: 0, ansSel: {} }));
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("lectura-paragraph-first")).toBeTruthy());
};

describe("Spanish content keeps lang=es", () => {
  afterEach(() => { vi.restoreAllMocks(); cleanup(); localStorage.clear(); });

  it("EN toggle: html lang is en, story title, paragraph, quote, question and choices are lang=es", async () => {
    await boot("en");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByTestId("story-reader-title").getAttribute("lang")).toBe("es");
    const p = screen.getByTestId("lectura-paragraph-first").querySelector("p");
    expect(p.getAttribute("lang")).toBe("es");
    expect(p.querySelector("[data-lectura-word]").closest("[lang]").getAttribute("lang")).toBe("es");
    // UI chrome stays in the UI language.
    expect(screen.getByTestId("story-reader").closest("[lang]")).toBe(document.documentElement);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Questions" }));
    await waitFor(() => expect(screen.getAllByTestId("story-q-prompt").length).toBeGreaterThan(0));
    for (const el of screen.getAllByTestId("story-q-prompt")) expect(el.getAttribute("lang")).toBe("es");
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    for (const el of choices) expect(el.getAttribute("lang")).toBe("es");
    for (const el of screen.queryAllByTestId("story-quiz-passage")) expect(el.querySelector('[lang="es"]')).toBeTruthy();
  });

  it("ES toggle: html lang is es", async () => {
    await boot("es");
    expect(document.documentElement.lang).toBe("es");
  });
});
