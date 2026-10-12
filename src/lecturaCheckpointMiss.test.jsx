/**
 * A wrong Lectura checkpoint is a miss on the story summary.
 * Comprehension can still be 3/3. The pause does not add a new label.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";
import { scoreCountClause } from "./scoreLine.js";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const WRONG = "It never returns";

describe("lectura checkpoint miss on the story summary", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const boot = async ({ storyId, paraIdx, storyChecks, stories, uiLang = "es" }) => {
    cleanup();
    localStorage.clear();
    mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, headers: { get: () => "text/html" } })));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang,
      onboardingDone: true, firstSessionDone: true, paywallSeen: true, done: {}, theme: "light",
      sound: false, stories,
      ...(storyChecks ? { storyChecks } : {}),
    }));
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "story", tab: "lectura", storyId, paraIdx, ansSel: {},
    }));
    const user = userEvent.setup();
    render(<App />);
    await screen.findAllByTestId("story-q-prompt");
    return user;
  };

  const answerAll = async (user, names) => {
    for (const name of names) {
      await user.click(screen.getByRole("button", { name }));
    }
  };

  it("counts one wrong story-0 checkpoint as a miss and leaves a clean run as 3/3", async () => {
    const user = await boot({
      storyId: "story-0",
      paraIdx: 6,
      storyChecks: { "story-0": { 0: WRONG } },
    });
    await answerAll(user, [
      "El olor del cempasúchil",
      "En el panteón de la isla de Janitzio",
      "El olvido",
    ]);
    const score = await screen.findByTestId("lectura-score");
    expect(score.textContent).toBe(scoreCountClause(3, 1, "es"));
    expect(score.textContent).toBe("3 aciertos, 1 fallo");
    expect(score.textContent).not.toMatch(/qué padre/);

    const clean = await boot({ storyId: "story-0", paraIdx: 6 });
    await answerAll(clean, [
      "El olor del cempasúchil",
      "En el panteón de la isla de Janitzio",
      "El olvido",
    ]);
    expect((await screen.findByTestId("lectura-score")).textContent).toBe("3/3 correctas — ¡qué padre!");
  });

  it("carries that checkpoint miss onto the lesson-end summary", async () => {
    const user = await boot({
      storyId: "story-1",
      paraIdx: 6,
      stories: { "story-0": true },
      storyChecks: { "story-1": { 0: "A hotel" } },
      uiLang: "en",
    });
    await answerAll(user, [
      "Porque era a quien mejor conocía",
      "El tranvía y Diego",
      "«Viva la vida»",
    ]);
    expect((await screen.findByTestId("lectura-score")).textContent).toBe("3 correct, 1 miss");
    await user.click(screen.getByRole("button", { name: /Claim/ }));
    await user.click(await screen.findByTestId("lectura-bird-handoff-cta"));
    const summary = await screen.findByTestId("lesson-win");
    expect(summary.textContent).toMatch(/3 correct, 1 miss/);
    expect(summary.textContent).not.toMatch(/3 correct, 0 misses/);
  });
});
