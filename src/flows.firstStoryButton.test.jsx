import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { passStory0Win } from "./story0WinHelper.js";
import App, { STORIES } from "./App.jsx";
import {
  installFlowHooks,
  STORAGE_KEY,
  answerFirstSessionBeat,
  claimStory0,
  freshEligible,
  funnelOf,
} from "./flowsHarness.jsx";

installFlowHooks();

const finishFirstLesson = async (user) => {
  await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
  await user.click(screen.getByTestId("hub-sendero"));
  await user.click(screen.getByRole("button", { name: /· \+XP/ }));
  for (let i = 0; i < 3; i++) await answerFirstSessionBeat(user);
  await waitFor(() => expect(screen.getByTestId("win-continue")).toBeTruthy());
};

describe("first-lesson win: one button into Lectura", () => {
  it("ES: «Leer mi primer cuento» opens story-0 page 1 in one tap and keeps the first-session events", async () => {
    cleanup();
    freshEligible();
    const user = userEvent.setup();
    render(<App />);
    await finishFirstLesson(user);
    const cta = screen.getByTestId("first-story-cta");
    expect(cta.textContent).toBe("Leer mi primer cuento");
    expect(cta.textContent.endsWith(".")).toBe(false);
    expect(cta.getAttribute("data-story-id")).toBe("story-0");
    expect(funnelOf("first_session_complete")).toHaveLength(1);
    const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    await user.click(cta);
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
    expect(screen.getByTestId("lectura-paragraph-first")).toBeTruthy();
    expect(document.body.textContent).toMatch(/1 \/ 6/);
    expect(screen.queryByTestId("lesson-win")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(funnelOf("lectura_start").filter((e) => e.storyId === "story-0")).toHaveLength(1);
    expect(funnelOf("first_session_complete")).toHaveLength(1);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.firstSessionDone).toBe(true);
    expect(saved.streak).toBe(1);
    expect(saved.lecturaOpenId).toBe("story-0");
    expect(scrollSpy).toHaveBeenCalledWith(0, 0);
    scrollSpy.mockRestore();
  }, 60000);

  it("EN label, and CONTINUE stays as the quiet way to Learn home", async () => {
    cleanup();
    freshEligible({ uiLang: "en" });
    const user = userEvent.setup();
    render(<App />);
    await finishFirstLesson(user);
    expect(screen.getByTestId("first-story-cta").textContent).toBe("Read my first story");
    const quiet = screen.getByTestId("win-continue");
    expect(quiet.textContent).toBe("Continue");
    expect(quiet.style.minHeight).toBe("44px");
    await user.click(quiet);
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("story-reader")).toBeNull();
    expect(funnelOf("lectura_start")).toHaveLength(0);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.firstSessionDone).toBe(true);
  }, 60000);

  it("goes through the same gate: with story-0 already read it opens La casa azul, never a locked story", async () => {
    cleanup();
    freshEligible();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    await claimStory0(user);
    await user.click(screen.getByTestId("lectura-bird-handoff-cta"));
    await passStory0Win(user);
    await user.click(screen.getByRole("button", { name: /Cerrar/ }));
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    await user.click(screen.getByTestId("nav-camino"));
    await finishFirstLesson(user);
    const cta = screen.getByTestId("first-story-cta");
    expect(cta.getAttribute("data-story-id")).toBe("story-1");
    await user.click(cta);
    await waitFor(() => expect(screen.getByTestId("story-reader-title").textContent).toBe("La casa azul"));
    expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-1");
  }, 90000);

  it("no button when every story is already read: CONTINUE is the only action", async () => {
    cleanup();
    const stories = Object.fromEntries(STORIES.map((s) => [s.id, true]));
    freshEligible({ stories });
    const user = userEvent.setup();
    render(<App />);
    await finishFirstLesson(user);
    expect(screen.queryByTestId("first-story-cta")).toBeNull();
    expect(screen.getByTestId("win-continue").textContent).toBe("Continuar");
  }, 60000);

  it("label follows the hub-line rule: story-0 claimed gives the next-story label, ES and EN (unclaimed keeps first-story labels, tests above)", async () => {
    cleanup();
    freshEligible();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    await claimStory0(user);
    await user.click(screen.getByTestId("lectura-bird-handoff-cta"));
    await passStory0Win(user);
    await user.click(screen.getByRole("button", { name: /Cerrar/ }));
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    await user.click(screen.getByTestId("nav-camino"));
    await finishFirstLesson(user);
    const cta = screen.getByTestId("first-story-cta");
    expect(cta.textContent).toBe("Leer el siguiente cuento");
    expect(cta.getAttribute("data-story-id")).toBe("story-1");
    expect(cta.textContent.endsWith(".")).toBe(false);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("first-story-cta").textContent).toBe("Read the next story"));
    expect(screen.getByTestId("win-continue").style.fontSize).toBe("15px");
    expect(screen.getByTestId("win-continue").style.minHeight).toBe("44px");
  }, 90000);

  it("source: the button reuses openStory and the Lectura gate, adds no event name", () => {
    const src = readFileSync(join(process.cwd(), "src", "App.jsx"), "utf8");
    const fn = src.slice(src.indexOf("const openFirstStoryFromWin"), src.indexOf("const goLearnHome"));
    expect(fn).toContain("lecturaHandoffTarget(STORIES, prog.stories)");
    expect(fn).toContain("continueFromWin({ toStory: story })");
    const cont = src.slice(src.indexOf("const continueFromWin"), src.indexOf("const openFirstStoryFromWin"));
    expect(cont).toContain("isLecturaStoryOpen(STORIES, prog.stories, toStory.id)");
    expect(cont).toContain("openStory(toStory)");
    expect(cont).toContain("setScreen(next)");
    expect(src).toContain('readFirstStory: "Leer mi primer cuento"');
    expect(src).toContain('readFirstStory: "Read my first story"');
    expect(src).toContain('readNextStory: "Leer el siguiente cuento"');
    expect(src).toContain('readNextStory: "Read the next story"');
    expect(src).toContain("firstLecturaClaimed({ stories: prog.stories }) ? L.readNextStory : L.readFirstStory");
  });
});
