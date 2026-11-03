/** Scene 2 scaffold: the flag gates App.jsx's Scene2Shell the same way
 *  ../scene1PhoneLangPersist.test.jsx exercises Scene 1's isScene1Enabled()
 *  gate — off by default, on behind ?scene2=1. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "../App.jsx";
import { mockBrowser } from "../flowsHarness.jsx";
import { SCENE2_TITLE } from "./copy.js";

beforeEach(() => {
  localStorage.clear();
  mockBrowser();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

describe("App + Scene2: flag gate", () => {
  it("is off by default, leaving App's existing screens in place", async () => {
    window.history.pushState({}, "", "/");
    render(<App />);
    expect(screen.queryByTestId("scene2-shell")).toBeNull();
  });

  it("?scene2=1 renders Scene2Shell's first beat", async () => {
    window.history.pushState({}, "", "/?scene2=1");
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("scene2-intro")).toBeTruthy());
    expect(screen.getByTestId("scene2-intro").textContent).toMatch(SCENE2_TITLE.en);
  });
});
