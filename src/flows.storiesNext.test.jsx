/**
 * After Hoy is ticked, Stories is the one loud hub tile until the first
 * Lectura claim. Then it returns to the quiet Cuentos / Stories label.
 */
import { describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { dayKeyFromDate } from "./firstDoor.js";
import { contrastRatio } from "./spanishKeyboard.js";
import {
  installFlowHooks,
  localToday,
  seedProgress,
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
});
