import { describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import {
  installFlowHooks,
  STORAGE_KEY,
  firstSessionRoot,
  waitFirstSessionTapReady,
  freshEligible,
} from "./flowsHarness.jsx";

installFlowHooks();

const startSome = async (user, extra = {}) => {
  cleanup();
  freshEligible({ uiLang: "es", learnerLevel: "some", onboardingDone: true, ...extra });
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
  await user.click(screen.getByTestId("hub-sendero"));
  await user.click(screen.getByRole("button", { name: /Empezar · \+XP/ }));
  await waitFor(() => expect(firstSessionRoot()?.getAttribute("data-qtype")).toBe("mc"));
};
const cards = () => [...document.querySelectorAll(".choice-card")];
const cardWith = (text) => cards().find((el) => el.textContent.includes(text));
const cardWithout = (text) => cards().find((el) => !el.textContent.includes(text));
const continueNow = () => screen.queryByRole("button", { name: /^Continuar$/ });
const heartsSaved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)).hearts;

describe("first session checks a multiple choice on the tap", () => {
  it("a right tap checks at once with no Check button, and Continue stays", async () => {
    const user = userEvent.setup();
    await startSome(user);
    expect(screen.queryByTestId("lesson-check")).toBeNull();
    await waitFirstSessionTapReady();
    await user.click(cardWith("onda"));
    await waitFor(() => expect(continueNow()).toBeTruthy());
    expect(screen.queryByTestId("lesson-check")).toBeNull();
    expect(heartsSaved()).toBe(5);
    await user.click(continueNow());
    await waitFor(() => expect(document.body.textContent).toMatch(/Marisol/));
  }, 20000);

  it("a wrong tap checks at once, costs one heart, and a second tap does not change it", async () => {
    const user = userEvent.setup();
    await startSome(user);
    await waitFirstSessionTapReady();
    await user.click(cardWithout("onda"));
    await waitFor(() => expect(continueNow()).toBeTruthy());
    expect(heartsSaved()).toBe(4);
    await user.click(cardWithout("onda"));
    await user.click(cardWith("onda"));
    expect(heartsSaved()).toBe(4);
    expect(continueNow()).toBeTruthy();
    await user.click(continueNow());
    await waitFor(() => expect(document.body.textContent).toMatch(/Marisol/));
  }, 20000);

  it("a tap in the first 350 ms of a question is ignored, and so is a double tap that lands on the next question", async () => {
    const user = userEvent.setup();
    await startSome(user);
    await user.click(cardWith("onda"));
    expect(continueNow()).toBeNull();
    expect(heartsSaved()).toBe(5);
    await waitFirstSessionTapReady();
    await user.click(cardWith("onda"));
    await waitFor(() => expect(continueNow()).toBeTruthy());
    await user.click(continueNow());
    await waitFor(() => expect(document.body.textContent).toMatch(/Marisol/));
    await user.click(cardWithout("tiene"));
    expect(continueNow()).toBeNull();
    expect(heartsSaved()).toBe(5);
    await waitFirstSessionTapReady();
    await user.click(cardWith("tiene"));
    await waitFor(() => expect(continueNow()).toBeTruthy());
    expect(heartsSaved()).toBe(5);
  }, 20000);

  it("the digit keys check at once in the first session too", async () => {
    const user = userEvent.setup();
    await startSome(user);
    await waitFirstSessionTapReady();
    const idx = cards().findIndex((el) => el.textContent.includes("onda"));
    await user.keyboard(String(idx + 1));
    await waitFor(() => expect(continueNow()).toBeTruthy());
    expect(heartsSaved()).toBe(5);
  }, 20000);
});
