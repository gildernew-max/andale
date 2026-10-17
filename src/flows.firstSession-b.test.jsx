import { describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { firstSessionWords } from "./firstSessionWords.js";
import {
  installFlowHooks,
  STORAGE_KEY,
  LIVE_KEY,
  continueBtn,
  firstSessionRoot,
  answerFirstSessionBeat,
  waitFirstSessionTapReady,
  freshEligible,
  claimStory0,
} from "./flowsHarness.jsx";

installFlowHooks();

describe("first session before the paywall", () => {
  it("Save & quit resumes the first session at the saved beat", async () => {
    cleanup();
    freshEligible();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
    await user.click(screen.getByTestId("hub-sendero"));
    await user.click(screen.getByRole("button", { name: /Empezar · \+XP/ }));
    await answerFirstSessionBeat(user);
    await waitFor(() => expect(firstSessionRoot()?.getAttribute("data-qtype")).toBe("order"));
    await user.click(screen.getByTestId("lesson-exit"));
    await user.click(screen.getByTestId("save-and-quit"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.resume.unitId).toBe("_first");
    expect(saved.resume.qi).toBe(1);
    expect(saved.firstSessionDone).not.toBe(true);
    await user.click(screen.getByTestId("hub-sendero"));
    await user.click(screen.getByRole("button", { name: /Empezar · \+XP/ }));
    await waitFor(() => expect(firstSessionRoot()?.getAttribute("data-qtype")).toBe("order"));
    expect(document.body.textContent).toMatch(/I doubt that it/);
    expect(document.body.textContent).not.toMatch(/Es obvio que Marisol/);
    expect(firstSessionRoot().getAttribute("data-first-session")).toBe("1");
  }, 20000);

  it("story-0 Start reading opens La casa azul and a later Sendero win stays off the bird handoff", async () => {
    cleanup();
    freshEligible();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    await claimStory0(user);
    await user.click(screen.getByTestId("lectura-bird-handoff-cta"));
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-1"));
    expect(document.querySelector("[data-first-session]")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Cerrar/ }));
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    await user.click(screen.getByTestId("nav-camino"));
    await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
    await user.click(screen.getByTestId("hub-sendero"));
    await user.click(screen.getByRole("button", { name: /Empezar · \+XP/ }));
    for (let i = 0; i < 3; i++) await answerFirstSessionBeat(user);
    await waitFor(() => expect(screen.getByTestId("win-continue")).toBeTruthy());
    expect(screen.getByRole("heading", { name: /¡Lección completada!/ }).getAttribute("data-lectura-paywall")).toBe("0");
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
  }, 60000);

  it("story-0 Start reading with no hearts opens La casa azul and does not start the first session", async () => {
    cleanup();
    freshEligible({ hearts: 0 });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    await claimStory0(user);
    await user.click(screen.getByTestId("lectura-bird-handoff-cta"));
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-1"));
    expect(screen.queryByTestId("hearts-modal")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(document.querySelector("[data-first-session]")).toBeNull();
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toContain("lectura/story-1/p0.png");
  }, 30000);

  it("George's why and win lines render only for a first session, and nothing when null", async () => {
    const why = firstSessionWords[0].why;
    const win = firstSessionWords.win;
    const prev = { en: why.en, es: why.es, winEn: win.en, winEs: win.es };
    why.en = "«Es obvio que» stays indicative.";
    why.es = "«Es obvio que» se queda en indicativo.";
    win.en = "First session done.";
    win.es = "Primera sesión lista.";
    try {
      cleanup();
      freshEligible({ uiLang: "es" });
      const user = userEvent.setup();
      render(<App />);
      await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
      await user.click(screen.getByTestId("hub-sendero"));
      await user.click(screen.getByRole("button", { name: /Empezar · \+XP/ }));
      const wrong = [...document.querySelectorAll(".choice-card")].find((el) => !el.textContent.includes("tiene"));
      await waitFirstSessionTapReady();
      await user.click(wrong);
      await waitFor(() => expect(screen.getByTestId("first-session-why").textContent).toBe("«Es obvio que» se queda en indicativo."));
      const whyLine = screen.getByTestId("first-session-why");
      expect(whyLine.textContent).toMatch(/«Es obvio que»/);
      expect(whyLine.style.fontSize).toBe("13px");
      expect(whyLine.style.fontWeight).toBe("800");
      expect(whyLine.style.color).toBe("rgb(60, 60, 60)");
      await user.click(screen.getByTestId("lang-en"));
      await waitFor(() => expect(screen.getByTestId("first-session-why").textContent).toBe("«Es obvio que» stays indicative."));
      cleanup();

      freshEligible({ firstSessionDone: true, uiLang: "en" });
      localStorage.setItem(LIVE_KEY, JSON.stringify({
        screen: "lesson",
        qi: 0,
        status: "wrong",
        lessonStats: { right: 0, wrong: 1 },
        session: {
          title: "Subjuntivo presente",
          host: "luna",
          unitId: "subj1",
          questions: [{ type: "mc", prompt: "Hola", choices: ["no"], answer: "sí", shuffledChoices: ["no"], explain: "Nota." }],
        },
      }));
      render(<App />);
      await waitFor(() => expect(screen.getByTestId("practice-quip")).toBeTruthy());
      expect(screen.queryByTestId("first-session-why")).toBeNull();
      cleanup();

      freshEligible({ uiLang: "es" });
      localStorage.setItem(LIVE_KEY, JSON.stringify({
        screen: "done",
        qi: 4,
        status: "correct",
        lessonStats: { right: 5, wrong: 0 },
        session: {
          title: "Subjuntivo presente",
          host: "luna",
          unitId: "_first",
          firstSession: true,
          lecturaPaywallAfterWin: false,
          earnedXP: 62,
          earnedGems: 15,
          questions: [{ type: "type", prompt: "Te llamo", answers: ["salga"] }],
        },
      }));
      render(<App />);
      const winLine = await screen.findByTestId("first-session-win-line");
      expect(winLine.textContent).toBe("Primera sesión lista.");
      expect(winLine.style.fontSize).toBe("15px");
      expect(winLine.style.fontWeight).toBe("700");
      expect(winLine.style.color).toBe("rgb(107, 98, 88)");
      const continueBtn = screen.getByTestId("win-continue");
      expect(winLine.compareDocumentPosition(continueBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      await user.click(screen.getByTestId("lang-en"));
      await waitFor(() => expect(screen.getByTestId("first-session-win-line").textContent).toBe("First session done."));
      cleanup();

      why.en = null;
      why.es = null;
      win.en = null;
      win.es = null;
      localStorage.removeItem(LIVE_KEY);
      freshEligible({ uiLang: "es" });
      render(<App />);
      await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
      await user.click(screen.getByTestId("hub-sendero"));
      await user.click(screen.getByRole("button", { name: /Empezar · \+XP/ }));
      const wrongAgain = [...document.querySelectorAll(".choice-card")].find((el) => !el.textContent.includes("tiene"));
      await waitFirstSessionTapReady();
      await user.click(wrongAgain);
      await waitFor(() => expect(screen.getByTestId("practice-quip")).toBeTruthy());
      expect(screen.queryByTestId("first-session-why")).toBeNull();
    } finally {
      why.en = prev.en;
      why.es = prev.es;
      win.en = prev.winEn;
      win.es = prev.winEs;
    }
  }, 20000);
});
