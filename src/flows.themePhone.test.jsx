import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";
import { installFlowHooks, STORAGE_KEY, localToday, seedProgress } from "./flowsHarness.jsx";

installFlowHooks();

const stubMatchMedia = (dark) => {
  window.matchMedia = (query) => ({
    matches: dark === true && String(query).includes("prefers-color-scheme: dark"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  });
};

const bootHome = async (extra = {}) => {
  const today = localToday();
  seedProgress({
    uiLang: "es",
    streak: 4,
    lastDay: today,
    ...extra,
  });
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
  await waitFor(() => expect(screen.queryByTestId("splash-start")).toBeNull());
  return today;
};

describe("phone theme when nothing is saved", () => {
  it("dark phone + no saved theme renders data-theme=dark and leaves the save alone", async () => {
    stubMatchMedia(true);
    const today = await bootHome();
    expect(screen.getByTestId("app-shell").getAttribute("data-theme")).toBe("dark");
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.theme).toBeUndefined();
    expect(saved.streak).toBe(4);
    expect(saved.lastDay).toBe(today);
  });

  it("light phone + no saved theme renders light", async () => {
    stubMatchMedia(false);
    await bootHome();
    expect(screen.getByTestId("app-shell").getAttribute("data-theme")).toBe("light");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).theme).toBeUndefined();
  });

  it("saved light on a dark phone stays light", async () => {
    stubMatchMedia(true);
    await bootHome({ theme: "light" });
    expect(screen.getByTestId("app-shell").getAttribute("data-theme")).toBe("light");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).theme).toBe("light");
  });

  it("saved dark on a light phone stays dark", async () => {
    stubMatchMedia(false);
    await bootHome({ theme: "dark" });
    expect(screen.getByTestId("app-shell").getAttribute("data-theme")).toBe("dark");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).theme).toBe("dark");
  });

  it("matchMedia undefined falls back to light", async () => {
    window.matchMedia = undefined;
    await bootHome();
    expect(screen.getByTestId("app-shell").getAttribute("data-theme")).toBe("light");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).theme).toBeUndefined();
  });
});
