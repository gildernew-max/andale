import { describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import {
  installFlowHooks,
  STORAGE_KEY,
  seedProgress,
  mockBrowser,
  boot,
  openCaminoMore,
} from "./flowsHarness.jsx";

installFlowHooks();

const BANK_MC = "Me da gusto que ya te ___ mejor.";
const BANK_WHY_EN = "«Me da gusto que» (emotion) triggers the subjunctive. Tú → sientas.";
const ORIGINAL_MC = "Espero que ___ a la fiesta el sábado.";

const startSubj1 = async (user, label) => {
  const unitBtn = screen.queryByRole("button", { name: "Subjuntivo presente" })
    || (await openCaminoMore(user), screen.getByRole("button", { name: "Subjuntivo presente" }));
  await user.click(unitBtn);
  await waitFor(() => expect(screen.getByTestId("path-sheet")).toBeTruthy());
  await user.click(screen.getByRole("button", { name: label }));
  await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
};

describe("replay bank", { timeout: 20000 }, () => {
  it("first run of subj1 serves the original 11 plus the match round", async () => {
    cleanup();
    seedProgress({ hearts: 5, firstSessionDone: true, uiLang: "es", xp: 42, streak: 3, done: {} });
    const user = await boot();
    await startSubj1(user, /Empezar · \+XP/);
    await user.click(screen.getByTestId("lesson-exit"));
    await user.click(screen.getByTestId("save-and-quit"));
    await waitFor(() => {
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.resume?.order?.length).toBe(12);
    });
    const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const indexes = prog.resume.order.map((o) => o.i);
    expect(indexes[indexes.length - 1]).toBe(-1);
    const questions = indexes.filter((i) => i !== -1).sort((a, b) => a - b);
    expect(questions).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(prog.served.subj1.slice().sort((a, b) => a - b)).toEqual(questions);
    expect(prog.done?.subj1 || 0).toBe(0);
    expect(prog.xp).toBe(42);
    expect(prog.streak).toBe(3);
    expect(prog.hearts).toBe(5);
  });

  it("a replay can serve a bank item and leaves crowns, xp, streak, and hearts alone", async () => {
    cleanup();
    seedProgress({
      hearts: 5,
      firstSessionDone: true,
      uiLang: "es",
      xp: 42,
      streak: 3,
      done: { subj1: 1 },
      served: { subj1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    });
    const user = await boot();
    await startSubj1(user, /Practicar de nuevo/);
    await user.click(screen.getByTestId("lesson-exit"));
    await user.click(screen.getByTestId("save-and-quit"));
    await waitFor(() => {
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.resume?.order?.length).toBe(12);
    });
    const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const indexes = prog.resume.order.map((o) => o.i);
    expect(indexes[indexes.length - 1]).toBe(-1);
    const questions = indexes.filter((i) => i !== -1);
    expect(new Set(questions).size).toBe(11);
    expect(questions.some((i) => i >= 11)).toBe(true);
    expect(questions).toEqual(expect.arrayContaining([11, 12, 13]));
    expect(prog.done.subj1).toBe(1);
    expect(prog.xp).toBe(42);
    expect(prog.streak).toBe(3);
    expect(prog.hearts).toBe(5);
  });

  it("resumes a bank index and an old original index", async () => {
    cleanup();
    seedProgress({
      hearts: 5,
      firstSessionDone: true,
      uiLang: "es",
      done: { subj1: 1 },
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 11 }], qi: 0, xp: 4, right: 1, wrong: 0 },
    });
    const user = await boot();
    await startSubj1(user, /Practicar de nuevo|Empezar/);
    await waitFor(() => expect(document.body.textContent).toMatch(/Me da gusto que ya te/));
    expect(screen.getAllByTestId("choice-card").some((el) => el.textContent.includes("sientas"))).toBe(true);
    expect(document.body.textContent).not.toMatch(/Espero que ___ a la fiesta/);

    cleanup();
    localStorage.clear();
    mockBrowser();
    seedProgress({
      hearts: 5,
      firstSessionDone: true,
      uiLang: "es",
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 0 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user2 = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    await waitFor(() => expect(screen.queryByTestId("splash-start")).toBeNull());
    await startSubj1(user2, /Empezar · \+XP/);
    await waitFor(() => expect(document.body.textContent).toContain(ORIGINAL_MC));
    expect(document.body.textContent).not.toContain(BANK_MC);
  });

  it("a wrong bank answer is keyed in srs as unit|index and review can open it", async () => {
    cleanup();
    seedProgress({
      hearts: 5,
      firstSessionDone: true,
      uiLang: "en",
      paywallSeen: true,
      xp: 42,
      streak: 3,
      done: { subj1: 1 },
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 11 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user = await boot();
    await startSubj1(user, /Practice again|Start/);
    await waitFor(() => expect(document.body.textContent).toContain(BANK_MC));
    const wrong = screen.getAllByTestId("choice-card").find((el) => el.textContent.includes("sientes"));
    expect(wrong).toBeTruthy();
    await user.click(wrong);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => {
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.srs?.["subj1|11"]).toBeTruthy();
    });
    const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(prog.srs["subj1|11"].reps).toBe(0);
    expect(prog.mistakes || []).toEqual([]);
    expect(prog.weak?.Subjuntivo).toBe(1);
    expect(prog.done.subj1).toBe(1);
    expect(prog.xp).toBe(42);
    expect(prog.streak).toBe(3);
    expect(prog.hearts).toBe(4);
    await user.click(screen.getByRole("button", { name: /Why\?/ }));
    expect(screen.getByTestId("practice-why").textContent).toBe(BANK_WHY_EN);
    expect(screen.getByTestId("practice-why").textContent).not.toMatch(/^[a-z0-9_.]+$/);

    cleanup();
    localStorage.clear();
    mockBrowser();
    seedProgress({
      hearts: 5,
      firstSessionDone: true,
      uiLang: "es",
      paywallSeen: true,
      onboardingDone: true,
      done: { subj1: 1 },
      srs: { "subj1|11": { ef: 2.5, reps: 0, interval: 0, due: 1 } },
    });
    const user2 = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    await waitFor(() => expect(screen.queryByTestId("splash-start")).toBeNull());
    await openCaminoMore(user2);
    await user2.click(screen.getByTestId("camino-review"));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(document.body.textContent).toContain(BANK_MC);
  });
});
