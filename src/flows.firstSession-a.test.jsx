import { describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { passStory0Win } from "./story0WinHelper.js";
import App from "./App.jsx";
import { markBajioUnlockFlashDue } from "./recuerdos.js";
import {
  installFlowHooks,
  STORAGE_KEY,
  LIVE_KEY,
  seedProgress,
  firstSessionRoot,
  answerFirstSessionBeat,
  missFirstSessionBeat,
  waitFirstSessionTapReady,
  localToday,
  openStory0,
  freshEligible,
  claimStory0,
  pickOnboarding,
  startOnboarding,
} from "./flowsHarness.jsx";

installFlowHooks();

describe("first session before the paywall", () => {
  it("a learner with no completed lessons gets 3 exercises, then a win, and the wall stays down", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, hearts: 5, uiLang: "es", bajioUnlockSeen: true, firstSessionDone: false });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
    let taps = 0;
    const tap = async (el) => { taps += 1; await user.click(el); };
    await tap(screen.getByTestId("hub-sendero"));
    await waitFor(() => expect(screen.getByTestId("path-sheet")).toBeTruthy());
    expect(screen.getByTestId("path-sheet").textContent).toMatch(/3 retos/);
    expect(screen.getByTestId("path-sheet").textContent).not.toMatch(/12 retos/);
    await tap(screen.getByRole("button", { name: /Empezar · \+XP/ }));
    await waitFor(() => expect(firstSessionRoot()?.getAttribute("data-first-session")).toBe("1"));
    expect(Number(firstSessionRoot().getAttribute("data-count"))).toBe(3);
    expect(screen.getByTestId("lesson-progress").getAttribute("data-pct")).toBe("0");
    const seen = [];
    for (let i = 0; i < 3; i++) {
      await waitFor(() => expect(firstSessionRoot()?.getAttribute("data-qtype")).toBeTruthy());
      seen.push(firstSessionRoot().getAttribute("data-qtype"));
      if (i === 1) expect(screen.getByTestId("lesson-progress").getAttribute("data-pct")).toBe("33");
      if (i === 2) {
        const type = firstSessionRoot().getAttribute("data-qtype");
        const body = document.body.textContent;
        if (type !== "mc") throw new Error(`expected the last beat to be mc, got ${type}`);
        expect(body).toMatch(/Espero que/);
        const card = [...document.querySelectorAll(".choice-card")].find((el) => el.textContent.includes("vengas"));
        await waitFirstSessionTapReady();
        await tap(card);
        await waitFor(() => expect(screen.getByTestId("lesson-progress").getAttribute("data-pct")).toBe("100"));
        expect(screen.queryByTestId("soft-paywall")).toBeNull();
        await tap(screen.getByRole("button", { name: /^Continuar$/ }));
      } else {
        taps += await answerFirstSessionBeat(user);
      }
    }
    expect(seen).toEqual(["mc", "order", "mc"]);
    await waitFor(() => expect(screen.getByTestId("win-continue")).toBeTruthy());
    expect(screen.getByRole("heading", { name: /¡Lección completada!/ })).toBeTruthy();
    expect(screen.getByTestId("win-earned-xp")).toBeTruthy();
    expect(screen.getByTestId("win-earned-streak").textContent).toMatch(/Racha de 1 día/);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("out-of-lives")).toBeNull();
    await tap(screen.getByTestId("win-continue"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect((window.__andaleFunnelLog || []).some((e) => e.event === "paywall_seen")).toBe(false);
    // Sendero, Empezar, mc (pick, Continue), Build (4 tiles, Check, Continue), mc (pick, Continue), win Continue.
    expect(taps).toBe(13);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).firstSessionDone).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).done?._first).toBeUndefined();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).done?.subj1 || 0).toBe(0);
  }, 40000);

  it("after the first session, Sendero is the full 12-challenge unit", async () => {
    cleanup();
    seedProgress({ firstSessionDone: true, hearts: 5, paywallSeen: true, streak: 1, lastDay: localToday() });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
    await user.click(screen.getByTestId("hub-sendero"));
    await waitFor(() => expect(screen.getByTestId("path-sheet")).toBeTruthy());
    expect(screen.getByTestId("path-sheet").textContent).toMatch(/12 retos/);
    await user.click(screen.getByRole("button", { name: /Empezar · \+XP/ }));
    await waitFor(() => expect(document.querySelector("[data-count]")).toBeTruthy());
    expect(document.querySelector("[data-first-session]").getAttribute("data-first-session")).toBe("0");
    expect(Number(document.querySelector("[data-count]").getAttribute("data-count"))).toBe(12);
  });

  it("running out of hearts in the first session shows Review and recover and no paywall (three misses on three hearts)", async () => {
    cleanup();
    // Three questions can cost three hearts, so this learner starts on three.
    seedProgress({ streak: 0, lastDay: null, hearts: 3, uiLang: "es", bajioUnlockSeen: true, firstSessionDone: false });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
    await user.click(screen.getByTestId("hub-sendero"));
    await user.click(screen.getByRole("button", { name: /Empezar · \+XP/ }));
    for (let i = 0; i < 3; i++) await missFirstSessionBeat(user);
    await waitFor(() => expect(screen.getByTestId("out-of-lives")).toBeTruthy());
    expect(screen.getByTestId("out-of-lives").textContent).toBe("¡Te quedaste sin vidas!");
    expect(screen.getByTestId("review-and-recover").textContent).toMatch(/Practicar y recuperar/);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).hearts).toBe(0);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallHold).toBe(true);
    await user.click(screen.getByTestId("hearts-to-path"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("out-of-lives")).toBeNull();
  }, 20000);

  it("a held first-session hearts fail does not open the paywall on an existing streak", async () => {
    cleanup();
    markBajioUnlockFlashDue(false);
    seedProgress({
      streak: 1,
      lastDay: localToday(),
      paywallSeen: false,
      bajioUnlockSeen: true,
      paywallHold: true,
      hearts: 0,
      uiLang: "en",
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "failed",
      failKind: "hearts",
      tab: "camino",
      lessonStats: { right: 0, wrong: 5 },
      session: {
        title: "Subjuntivo presente",
        host: "luna",
        unitId: "_first",
        firstSession: true,
        questions: [{ type: "mc", prompt: "Hola", choices: ["no"], answer: "sí", shuffledChoices: ["no"] }],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("out-of-lives")).toBeTruthy());
    expect(screen.getByTestId("out-of-lives").textContent).toBe("Out of lives!");
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("hearts-to-path"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
  });

  it("a pre-release save with xp, streak, Hoy, or games keeps the 12-challenge unit", async () => {
    const openSheet = async () => {
      const user = userEvent.setup();
      render(<App />);
      await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
      await user.click(screen.getByTestId("hub-sendero"));
      await waitFor(() => expect(screen.getByTestId("path-sheet")).toBeTruthy());
      expect(screen.getByTestId("path-sheet").textContent).toMatch(/12 retos/);
      expect(screen.getByTestId("path-sheet").textContent).not.toMatch(/3 retos/);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).firstSessionDone).toBe(true);
      cleanup();
    };
    seedProgress({ xp: 40, streak: 4, lastDay: localToday(), hearts: 5, paywallSeen: true });
    await openSheet();
    seedProgress({ streak: 2, lastDay: localToday(), hearts: 5, done: { "_today:taqueria": 1 }, paywallSeen: true });
    await openSheet();
    seedProgress({ xp: 12, gems: 5, hearts: 5, missions: { safeRiskyBest: 3 } });
    await openSheet();
  });

  it("empty storage is eligible for the 3-exercise session", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding-level-conversation")).toBeTruthy());
    await pickOnboarding(user, "onboarding-level-conversation");
    await waitFor(() => expect(screen.getByTestId("onboarding-why-work")).toBeTruthy());
    await pickOnboarding(user, "onboarding-why-work");
    await waitFor(() => expect(screen.getByTestId("onboarding-goal-10")).toBeTruthy());
    await pickOnboarding(user, "onboarding-goal-10");
    await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy());
    await startOnboarding(user);
    await waitFor(() => expect(document.querySelector("[data-first-session]")?.getAttribute("data-first-session")).toBe("1"));
    expect(document.querySelector("[data-count]").getAttribute("data-count")).toBe("3");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).firstSessionDone).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).firstSessionArmed).toBe(true);
    expect(document.body.textContent).toMatch(/Es obvio que Marisol/);
  });

  it("records xp, gems, and a single streak for Sendero and for the story-0 claim", async () => {
    cleanup();
    freshEligible();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
    await user.click(screen.getByTestId("hub-sendero"));
    await user.click(screen.getByRole("button", { name: /Empezar · \+XP/ }));
    for (let i = 0; i < 3; i++) await answerFirstSessionBeat(user);
    await user.click(await screen.findByTestId("win-continue"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await openStory0(user);
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    const sendero = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // Three correct answers (10 + 10 + 12 for the Build) plus the 5 XP flawless bonus.
    expect(sendero.xp).toBe(37);
    expect(sendero.gems).toBe(15);
    expect(sendero.streak).toBe(1);
    cleanup();
    freshEligible();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    await claimStory0(user);
    const afterChapter = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(afterChapter.xp).toBe(35);
    expect(afterChapter.gems).toBe(10);
    expect(afterChapter.streak).toBe(1);
    await user.click(screen.getByTestId("lectura-bird-handoff-cta"));
    await passStory0Win(user);
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toContain("lectura/story-1/p0.png");
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(document.querySelector("[data-first-session]")).toBeNull();
    const lectura = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(lectura.xp).toBe(35);
    expect(lectura.gems).toBe(10);
    expect(lectura.streak).toBe(1);
  }, 90000);

  it("first-session win uses the ochre heading, one bird, and a plain perfect line", async () => {
    cleanup();
    freshEligible({ uiLang: "es", theme: "light", quickTipSeen: true });
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
        perfectBonus: 5,
        earnedXP: 62,
        earnedGems: 15,
        questions: [{ type: "type", prompt: "Te llamo", answers: ["salga"] }],
      },
    }));
    render(<App />);
    const heading = await screen.findByRole("heading", { name: /¡Lección completada!/ });
    expect(heading.style.color).toBe("rgb(133, 103, 44)");
    expect(document.querySelector(".confetti-bit")).toBeNull();
    expect(screen.getByTestId("win-perch-bird").getAttribute("src")).toMatch(/cenzontle\.png/);
    const xp = screen.getByTestId("win-earned-xp");
    const gems = screen.getByTestId("win-earned-gems");
    expect(xp.style.color).toBe("rgb(133, 103, 44)");
    expect(gems.style.color).toBe("rgb(15, 111, 166)");
    expect(xp.querySelector("span").style.color).toBe("");
    expect(gems.querySelector("span").style.color).toBe("");
    expect(xp.parentElement.style.borderTopColor).toBe("rgb(255, 200, 0)");
    expect(gems.parentElement.style.borderTopColor).toBe("rgb(28, 176, 246)");
    const perfect = screen.getByTestId("perfect-lesson");
    expect(perfect.tagName).toBe("P");
    expect(perfect.textContent).toBe("Lección perfecta — +5 XP");
    expect(perfect.style.borderStyle).toBe("none");
    expect(perfect.style.backgroundColor).toBe("transparent");
    cleanup();

    freshEligible({ uiLang: "en", theme: "dark", quickTipSeen: true });
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
        perfectBonus: 5,
        earnedXP: 62,
        earnedGems: 15,
        questions: [{ type: "type", prompt: "Te llamo", answers: ["salga"] }],
      },
    }));
    render(<App />);
    const darkHeading = await screen.findByRole("heading", { name: /Lesson complete!/ });
    expect(darkHeading.style.color).toBe("rgb(255, 212, 59)");
    expect(screen.getByTestId("win-earned-xp").style.color).toBe("rgb(255, 212, 59)");
    expect(screen.getByTestId("win-earned-gems").style.color).toBe("rgb(28, 176, 246)");
    expect(document.querySelector(".confetti-bit")).toBeNull();
    cleanup();

    freshEligible({ uiLang: "es", theme: "light", quickTipSeen: true, firstSessionDone: true });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "done",
      qi: 11,
      status: "correct",
      lessonStats: { right: 12, wrong: 0 },
      session: {
        title: "Subjuntivo presente",
        host: "luna",
        unitId: "subj1",
        perfectBonus: 5,
        earnedXP: 80,
        earnedGems: 15,
        questions: [{ type: "mc", prompt: "Hola", choices: ["no"], answer: "sí" }],
      },
    }));
    render(<App />);
    const later = await screen.findByRole("heading", { name: /¡Lección completada!/ });
    expect(later.style.color).toBe("rgb(133, 103, 44)");
    expect(screen.getByTestId("win-earned-xp").style.color).toBe("rgb(133, 103, 44)");
    expect(screen.getByTestId("win-earned-gems").style.color).toBe("rgb(15, 111, 166)");
    expect(document.querySelector(".confetti-bit")).toBeNull();
    expect(screen.getByTestId("win-perch-bird")).toBeTruthy();
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.getByTestId("win-perch-chip").style.color).toBe("rgb(133, 103, 44)");
    const laterPerfect = screen.getByTestId("perfect-lesson");
    expect(laterPerfect.tagName).toBe("DIV");
    expect(laterPerfect.style.borderTopWidth).toBe("2px");
    expect(laterPerfect.style.backgroundColor).not.toBe("transparent");
  });
});
