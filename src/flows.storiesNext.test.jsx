/**
 * After Hoy is ticked, Stories is the one loud hub tile until the first
 * Lectura claim. Then it returns to the quiet Cuentos / Stories label.
 */
import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { dayKeyFromDate } from "./firstDoor.js";
import { contrastRatio } from "./spanishKeyboard.js";
import {
  answerFirstSessionBeat,
  installFlowHooks,
  localToday,
  seedProgress,
  STORAGE_KEY,
  pickOnboarding,
  startOnboarding,
} from "./flowsHarness.jsx";

installFlowHooks();

const LIME = /#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i;
const LIP = /#46A302|rgb\(\s*70,\s*163,\s*2\s*\)/i;
const INK = /#1F3A1A|rgb\(\s*31,\s*58,\s*26\s*\)/i;
const NEXT = { es: "Sigue: tu primer cuento", en: "Next: your first story" };
const USUAL = { es: "Cuentos", en: "Stories" };

const home = async (extra = {}) => {
  cleanup();
  const today = dayKeyFromDate(new Date());
  seedProgress({
    welcomed: true,
    onboardingDone: true,
    firstSessionDone: true,
    paywallSeen: true,
    bajioUnlockSeen: true,
    uiLang: "es",
    theme: "light",
    streak: 1,
    lastDay: localToday(),
    xpToday: 0,
    missions: { [`scene-${today}`]: "taqueria" },
    ...extra,
  });
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
  await waitFor(() => expect(screen.queryByTestId("splash-start")).toBeNull());
};

const loudTiles = () => [...document.querySelectorAll("[data-hub-loud]")];

describe("Stories is loud after Hoy until the first claim", () => {
  it.each([
    ["light", "es"],
    ["light", "en"],
    ["dark", "es"],
    ["dark", "en"],
  ])("paints the Stories tile lime in %s %s and keeps Hoy quiet", async (theme, uiLang) => {
    await home({ theme, uiLang });
    const stories = screen.getByTestId("hub-stories");
    const label = screen.getByTestId("hub-stories-label");
    const hoy = screen.getByTestId("hub-hoy");
    expect(loudTiles()).toHaveLength(1);
    expect(stories.getAttribute("data-hub-loud")).toBe("stories");
    expect(hoy.getAttribute("data-hub-loud")).toBeNull();
    expect(hoy.getAttribute("data-hub-hoy-done")).toBe("1");
    expect(screen.getByTestId("hub-hoy-done").textContent).toBe("✓");
    expect(label.textContent).toBe(NEXT[uiLang]);
    expect(label.textContent.endsWith(".")).toBe(false);
    expect(stories.textContent).not.toMatch(/Cuentos|Stories/);
    expect(stories.style.background).toMatch(LIME);
    expect(stories.style.borderBottom).toMatch(LIP);
    expect(stories.style.borderTopWidth === "" || stories.style.borderTopWidth === "0px" || stories.style.border === "none" || stories.style.borderTopStyle === "none").toBe(true);
    expect(label.style.color).toMatch(INK);
    expect(stories.style.color).toMatch(INK);
    expect(contrastRatio("#1F3A1A", "#58CC02")).toBeGreaterThanOrEqual(4.5);
    expect(hoy.style.background).not.toMatch(LIME);
    expect(hoy.style.border).not.toMatch(LIME);
    expect(screen.getByTestId("hub-games").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-phrase-doctor").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-sendero").getAttribute("data-hub-loud")).toBeNull();
    expect(stories.querySelector("[data-testid='hub-hoy-done']")).toBeNull();
    expect(stories.className).not.toMatch(/pop|jump|wiggle/);
  });

  it("a goal check with no scene mission louds Stories and drops Hoy's outline", async () => {
    await home({ missions: {}, xpToday: 62, uiLang: "en", theme: "dark" });
    const stories = screen.getByTestId("hub-stories");
    const hoy = screen.getByTestId("hub-hoy");
    expect(loudTiles()).toHaveLength(1);
    expect(stories.getAttribute("data-hub-loud")).toBe("stories");
    expect(hoy.getAttribute("data-hub-loud")).toBeNull();
    expect(hoy.getAttribute("data-hub-hoy-done")).toBeNull();
    expect(screen.getByTestId("hub-hoy-done").textContent).toBe("✓");
    expect(hoy.style.border).not.toMatch(LIME);
    expect(hoy.style.boxShadow).not.toMatch(LIME);
    expect(stories.style.background).toMatch(LIME);
    expect(screen.getByTestId("hub-stories-label").textContent).toBe(NEXT.en);
    expect(screen.getByTestId("hub-hoy-goal").textContent).toBe("Today\u2019s goal done: 40\u00a0XP.");
  });

  it("a new day after an earlier claim leaves Hoy outlined and Stories quiet", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.setSystemTime(new Date(2026, 9, 10, 15, 0, 0));
      const claimedDay = dayKeyFromDate(new Date());
      cleanup();
      seedProgress({
        welcomed: true,
        onboardingDone: true,
        firstSessionDone: true,
        paywallSeen: true,
        bajioUnlockSeen: true,
        uiLang: "en",
        theme: "light",
        streak: 1,
        lastDay: claimedDay,
        xpToday: 62,
        stories: { "story-0": true },
        missions: { [`scene-${claimedDay}`]: "taqueria" },
      });
      vi.setSystemTime(new Date(2026, 9, 11, 15, 0, 0));
      const today = dayKeyFromDate(new Date());
      expect(today).not.toBe(claimedDay);
      render(<App />);
      await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(saved.stories["story-0"]).toBeTruthy();
      expect(saved.missions[`scene-${today}`]).toBeUndefined();
      expect(saved.xpToday).toBe(62);
      expect(screen.getByTestId("door-meta").textContent).toMatch(/Goal:\s*0\/40 XP/);
      expect(screen.queryByTestId("hub-hoy-goal")).toBeNull();

      const hoy = screen.getByTestId("hub-hoy");
      const stories = screen.getByTestId("hub-stories");
      expect(screen.queryByTestId("hub-hoy-done")).toBeNull();
      expect(hoy.getAttribute("data-hub-hoy-done")).toBeNull();
      expect(hoy.getAttribute("data-hub-loud")).toBe("hoy");
      expect(hoy.style.border).toMatch(LIME);
      expect(hoy.style.boxShadow).toMatch(LIME);
      expect(stories.getAttribute("data-hub-loud")).toBeNull();
      expect(stories.style.background).not.toMatch(LIME);
      expect(screen.getByTestId("hub-stories-label").textContent).toBe(USUAL.en);
      expect(loudTiles()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the usual Stories label while Hoy is still open", async () => {
    await home({ missions: {}, uiLang: "en" });
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("hub-stories").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-stories-label").textContent).toBe(USUAL.en);
    expect(screen.getByTestId("hub-stories").style.background).not.toMatch(LIME);
    expect(loudTiles()).toHaveLength(1);
  });

  it("stays loud after a story is opened and goes quiet after the first claim", async () => {
    await home({ uiLang: "es", lecturaStartedAt: 1 });
    expect(screen.getByTestId("hub-stories-label").textContent).toBe(NEXT.es);
    expect(screen.getByTestId("hub-stories").getAttribute("data-hub-loud")).toBe("stories");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-stories-label").textContent).toBe(NEXT.en));
    expect(screen.getByTestId("hub-stories").style.background).toMatch(LIME);

    await home({ uiLang: "en", stories: { "story-0": true } });
    const stories = screen.getByTestId("hub-stories");
    const games = screen.getByTestId("hub-games");
    expect(screen.getByTestId("hub-stories-label").textContent).toBe(USUAL.en);
    expect(stories.getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-hoy-done")).toBe("1");
    expect(loudTiles()).toHaveLength(0);
    expect(stories.style.background).toBe(games.style.background);
    expect(stories.style.border).toBe(games.style.border);
    expect(stories.style.borderBottom).toBe(games.style.borderBottom);
    expect(screen.getByTestId("hub-stories-label").style.color).toBe(screen.getByTestId("hub-games").style.color || screen.getByTestId("hub-sendero-label").style.color);

    await home({ uiLang: "es", stories: { "story-1": true } });
    expect(screen.getByTestId("hub-stories-label").textContent).toBe(USUAL.es);
    expect(screen.getByTestId("hub-stories").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-hoy-done").textContent).toBe("✓");
  });

  it("a fresh I-know-some lesson checks Hoy without the outline and opens story 1 in one tap", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding-level-some")).toBeTruthy());
    await pickOnboarding(user, "onboarding-level-some");
    await waitFor(() => expect(screen.getByTestId("onboarding-why-live")).toBeTruthy());
    await pickOnboarding(user, "onboarding-why-live");
    await waitFor(() => expect(screen.getByTestId("onboarding-goal-10")).toBeTruthy());
    await pickOnboarding(user, "onboarding-goal-10");
    await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy());
    await startOnboarding(user);
    await waitFor(() => expect(document.querySelector("[data-first-session]")?.getAttribute("data-first-session")).toBe("1"));
    for (let i = 0; i < 3; i++) await answerFirstSessionBeat(user);
    await user.click(await screen.findByTestId("win-continue"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const today = dayKeyFromDate(new Date());
    expect(saved.firstSessionDone).toBe(true);
    expect(saved.missions?.[`scene-${today}`]).toBeUndefined();
    expect(saved.xpToday).toBeGreaterThanOrEqual(40);
    expect(saved.xp).toBe(37);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();

    const stories = screen.getByTestId("hub-stories");
    const hoy = screen.getByTestId("hub-hoy");
    expect(loudTiles()).toHaveLength(1);
    expect(stories.getAttribute("data-hub-loud")).toBe("stories");
    expect(hoy.getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-hoy-done").textContent).toBe("✓");
    expect(hoy.style.border).not.toMatch(LIME);
    expect(hoy.style.boxShadow).not.toMatch(LIME);
    expect(stories.style.background).toMatch(LIME);
    expect(stories.style.borderBottom).toMatch(LIP);
    expect(screen.getByTestId("hub-stories-label").textContent).toBe(NEXT.en);
    expect(screen.getByTestId("hub-stories-label").style.color).toMatch(INK);
    expect(screen.getByTestId("hub-hoy-goal").textContent).toBe("Today\u2019s goal done: 40\u00a0XP.");
    expect(screen.getByTestId("door-meta").textContent).toMatch(new RegExp(`Goal:\\s*${saved.xpToday}/40 XP`));

    await user.click(stories);
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
    expect(screen.getByTestId("lectura-paragraph-first")).toBeTruthy();
    expect(document.body.textContent).toMatch(/Paragraph 1 \/ /);
    expect(screen.queryByTestId("story-shelf-story-0")).toBeNull();
    expect(screen.queryByTestId("learn-hub")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).stories?.["story-0"]).toBeFalsy();

    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("hub-stories").getAttribute("data-hub-loud")).toBe("stories");
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-hoy").style.border).not.toMatch(LIME);
    expect(screen.getByTestId("hub-stories-label").textContent).toBe(NEXT.en);

    await user.click(screen.getByTestId("hub-stories"));
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
    for (;;) {
      const next = screen.queryByRole("button", { name: /^(Siguiente|Next) →$/ });
      if (!next) break;
      await user.click(next);
    }
    await user.click(screen.getByRole("button", { name: /^(Preguntas|Questions) →$/ }));
    await waitFor(() => expect(screen.getAllByTestId("story-q-prompt").length).toBeGreaterThan(0));
    await user.click(screen.getByRole("button", { name: /El olor del cempasúchil/ }));
    await user.click(screen.getByRole("button", { name: /En el panteón de la isla de Janitzio/ }));
    await user.click(screen.getByRole("button", { name: /El olvido/ }));
    await user.click(screen.getByTestId("lectura-claim-cta"));
    await waitFor(() => expect(screen.getByTestId("lectura-cliffhanger")).toBeTruthy());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).stories?.["story-0"]).toBeTruthy();

    await user.click(screen.getByTestId("brand-home"));
    const wall = await screen.findByTestId("soft-paywall", {}, { timeout: 4000 }).catch(() => null);
    if (wall) {
      await user.click(screen.getByTestId("soft-paywall-dismiss"));
      await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    }
    await waitFor(() => expect(screen.getByTestId("hub-stories-label").textContent).toBe(USUAL.en));
    expect(screen.getByTestId("hub-stories").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-hoy-done").textContent).toBe("✓");
    expect(loudTiles()).toHaveLength(0);
    expect(screen.queryByTestId("story-reader")).toBeNull();

    await user.click(screen.getByTestId("hub-stories"));
    await waitFor(() => expect(screen.getByTestId("story-shelf-story-0")).toBeTruthy());
    expect(screen.queryByTestId("story-reader")).toBeNull();
  }, 90000);
});
