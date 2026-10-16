import { describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { firstSessionWords } from "./firstSessionWords.js";
import {
  installFlowHooks,
  STORAGE_KEY,
  seedProgress,
  firstSessionRoot,
  answerFirstSessionBeat,
  waitFirstSessionTapReady,
  funnelOf,
  pickOnboarding,
  startOnboarding,
} from "./flowsHarness.jsx";

installFlowHooks();

const ONDA_PROMPT = "—¡Hola, Memo! ¿Qué ___? Hacía mucho que no te veía.";
const MARISOL_PROMPT = "Es obvio que Marisol ___ razón.";

const choiceLabels = () => screen.getAllByTestId("choice-card").map((el) => el.textContent.replace(/^\d+/, ""));

const startSomeLesson = async (user) => {
  localStorage.clear();
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("onboarding-level-some")).toBeTruthy());
  expect(screen.getByTestId("onboarding-level-some").textContent).toContain("I know some");
  await pickOnboarding(user, "onboarding-level-some");
  await waitFor(() => expect(screen.getByTestId("onboarding-why-live")).toBeTruthy());
  await pickOnboarding(user, "onboarding-why-live");
  await waitFor(() => expect(screen.getByTestId("onboarding-goal-10")).toBeTruthy());
  await pickOnboarding(user, "onboarding-goal-10");
  await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy());
  await startOnboarding(user);
  await waitFor(() => expect(firstSessionRoot()?.getAttribute("data-first-session")).toBe("1"));
};

describe("I know some first session", () => {
  it("opens on the onda bank item, then Marisol, and still emits first_session_start", async () => {
    const user = userEvent.setup();
    await startSomeLesson(user);
    expect(firstSessionRoot().getAttribute("data-beginner-first")).toBe("0");
    expect(firstSessionRoot().getAttribute("data-qtype")).toBe("mc");
    expect(firstSessionRoot().getAttribute("data-count")).toBe("3");
    expect(document.body.textContent).toContain(ONDA_PROMPT);
    expect(document.body.textContent).not.toContain(MARISOL_PROMPT);
    expect(choiceLabels().slice().sort()).toEqual(["al rato", "mande", "onda", "padre"]);
    // A first-session multiple choice checks on the tap, so there is no Check button to press.
    expect(screen.queryByTestId("lesson-check")).toBeNull();
    expect(funnelOf("first_session_start").map((row) => row.event)).toEqual(["first_session_start"]);

    await answerFirstSessionBeat(user);
    await waitFor(() => expect(document.body.textContent).toContain(MARISOL_PROMPT));
    expect(document.body.textContent).not.toContain(ONDA_PROMPT);
    expect(choiceLabels()).toEqual(expect.arrayContaining(["tenga", "tuviera", "tiene", "tendría"]));
    expect(funnelOf("first_session_start")).toHaveLength(1);
    expect(funnelOf("first_session_exercise1_correct").map((row) => row.event)).toEqual(["first_session_exercise1_correct"]);

    const wrong = [...document.querySelectorAll(".choice-card")].find((el) => !el.textContent.includes("tiene"));
    await waitFirstSessionTapReady();
    await user.click(wrong);
    await waitFor(() => expect(screen.getByTestId("first-session-why").textContent).toBe(firstSessionWords[0].why.en));
  }, 20000);

  it("keeps conversation on Marisol and a stored some level on the onda opener", async () => {
    const user = userEvent.setup();
    localStorage.clear();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding-level-conversation")).toBeTruthy());
    await pickOnboarding(user, "onboarding-level-conversation");
    await waitFor(() => expect(screen.getByTestId("onboarding-why-travel")).toBeTruthy());
    await pickOnboarding(user, "onboarding-why-travel");
    await waitFor(() => expect(screen.getByTestId("onboarding-goal-5")).toBeTruthy());
    await pickOnboarding(user, "onboarding-goal-5");
    await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy());
    await startOnboarding(user);
    await waitFor(() => expect(firstSessionRoot()?.getAttribute("data-first-session")).toBe("1"));
    expect(firstSessionRoot().getAttribute("data-count")).toBe("3");
    expect(document.body.textContent).toContain(MARISOL_PROMPT);
    expect(document.body.textContent).not.toContain(ONDA_PROMPT);
    expect(funnelOf("first_session_start")).toHaveLength(1);

    cleanup();
    localStorage.clear();
    seedProgress({
      uiLang: "en",
      firstSessionDone: false,
      onboardingDone: true,
      learnerLevel: "some",
      hearts: 5,
      welcomed: true,
      bajioUnlockSeen: true,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
    await user.click(screen.getByTestId("hub-sendero"));
    await waitFor(() => expect(screen.getByTestId("path-sheet")).toBeTruthy());
    expect(screen.getByTestId("path-sheet").textContent).toMatch(/3 challenges/);
    await user.click(screen.getByRole("button", { name: /Start · \+XP/ }));
    await waitFor(() => expect(firstSessionRoot()?.getAttribute("data-qtype")).toBe("mc"));
    expect(document.body.textContent).toContain(ONDA_PROMPT);
    expect(document.body.textContent).not.toContain(MARISOL_PROMPT);

    cleanup();
    localStorage.clear();
    seedProgress({
      uiLang: "en",
      firstSessionDone: false,
      onboardingDone: true,
      learnerLevel: "conversation",
      hearts: 5,
      welcomed: true,
      bajioUnlockSeen: true,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
    await user.click(screen.getByTestId("hub-sendero"));
    await waitFor(() => expect(screen.getByTestId("path-sheet")).toBeTruthy());
    expect(screen.getByTestId("path-sheet").textContent).toMatch(/3 challenges/);
    await user.click(screen.getByRole("button", { name: /Start · \+XP/ }));
    await waitFor(() => expect(document.body.textContent).toContain(MARISOL_PROMPT));
    expect(document.body.textContent).not.toContain(ONDA_PROMPT);
  }, 20000);
});
