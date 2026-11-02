/** Regression for the Varys review note: App.jsx's own uiLang hydrate/save
 *  effect (the "first visit keeps EN, returning saves without uiLang stay
 *  ES" logic) must never leave a uiLang value in andale-v3 while Scene1 is
 *  on, or a later mount's scene1DefaultUiLang (./scene1/uiLang.js) reads it
 *  back as an explicit choice and beats the phone-language fallback. App's
 *  own uiLang picker never actually runs while the isScene1Enabled() early
 *  return is taken, so nothing legitimate is lost by not persisting it. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";
import { SCENE1_COLD_OPEN } from "./scene1/copy.js";

function setPhoneLanguage(tag) {
  Object.defineProperty(window.navigator, "language", { configurable: true, get: () => tag });
  Object.defineProperty(window.navigator, "languages", { configurable: true, get: () => [tag] });
}

beforeEach(() => {
  localStorage.clear();
  mockBrowser();
  setPhoneLanguage("es-MX");
  window.history.pushState({}, "", "/?scene1=1");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

describe("App + Scene1: phone-language default survives App's hydrate write", () => {
  it("a fresh Spanish phone still opens Scene1 in Spanish on the next visit", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("scene1-cold-open")).toBeTruthy());
    expect(screen.getByTestId("scene1-cold-open").textContent).toMatch(SCENE1_COLD_OPEN.es);

    // Let App's load+save effect finish hydrating and writing andale-v3.
    await waitFor(() => expect(localStorage.getItem("andale-v3")).not.toBeNull());
    const saved = JSON.parse(localStorage.getItem("andale-v3"));
    expect(saved.uiLang).toBeUndefined();

    cleanup();

    // Simulated reload: same device, same Spanish phone, storage now carries
    // whatever the first visit wrote.
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("scene1-cold-open")).toBeTruthy());
    expect(screen.getByTestId("scene1-cold-open").textContent).toMatch(SCENE1_COLD_OPEN.es);
  });
});
