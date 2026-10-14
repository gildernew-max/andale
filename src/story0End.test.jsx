/**
 * Story-0 end screen: checkpoint 6 in Spanish, a quiet claim pill,
 * and Start reading opens La casa azul at page 1.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

describe("story-0 end screen", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const boot = async ({ paraIdx, uiLang = "es", theme = "light" }) => {
    cleanup();
    localStorage.clear();
    mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, headers: { get: () => "text/html" } })));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      welcomed: true, xp: 42, gems: 9, name: "Ada", contentVersion: 2, hearts: 5, uiLang,
      onboardingDone: true, firstSessionDone: true, paywallSeen: true, done: {}, theme,
    }));
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "story", tab: "lectura", storyId: "story-0", paraIdx, ansSel: {},
    }));
    const user = userEvent.setup();
    render(<App />);
    return user;
  };

  it("checkpoint 6 is Spanish in ES and stays English in EN", async () => {
    const user = await boot({ paraIdx: 5 });
    const pause = await screen.findByTestId("lectura-checkpoint");
    expect(pause.textContent).toMatch(/Pausa rápida 6: ¿Qué espera el narrador\?/);
    const labels = [...pause.querySelectorAll("button")].map((node) => node.textContent);
    expect(labels).toEqual(expect.arrayContaining(["Irse de México", "Vender la casa", "Que lo recuerden"]));
    expect(labels).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Que lo recuerden" }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.storyChecks["story-0"]["5"]).toBe("To be remembered");

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lectura-checkpoint").textContent).toMatch(/Checkpoint 6: What does the narrator hope for\?/));
    const enLabels = [...screen.getByTestId("lectura-checkpoint").querySelectorAll("button")].map((node) => node.textContent);
    expect(enLabels).toEqual(expect.arrayContaining(["To leave Mexico", "To sell the house", "To be remembered"]));
  });

  it("the claim pill reads +35 XP, then XP reclamados, and Start reading opens page 1", async () => {
    const user = await boot({ paraIdx: 6 });
    await screen.findAllByTestId("story-q-prompt");
    expect(screen.getByTestId("lectura-questions-header").textContent).toMatch(/0\/6 pausas/);
    await user.click(screen.getByRole("button", { name: "El olor del cempasúchil" }));
    await user.click(screen.getByRole("button", { name: "En el panteón de la isla de Janitzio" }));
    await user.click(screen.getByRole("button", { name: "El olvido" }));
    const score = await screen.findByTestId("lectura-score");
    expect(score.textContent).toBe("3/3 correctas — ¡qué padre!");
    const claim = screen.getByTestId("lectura-claim-cta");
    expect(claim.textContent).toBe("+35 XP · 💎10");
    expect(claim.style.background).toBe("rgb(255, 255, 255)");
    expect(claim.style.color).toBe("rgb(88, 167, 0)");
    expect(claim.style.borderTop).toMatch(/1\.5px solid (#E2D6C3|rgb\(226, 214, 195\))/);
    expect(claim.style.background).not.toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.queryByRole("button", { name: /Reclamar|Claim/ })).toBeNull();

    await user.click(claim);
    await waitFor(() => expect(screen.getByTestId("lectura-claim-cta").textContent).toBe("XP reclamados"));
    expect(screen.getByTestId("lectura-claim-cta").style.background).toBe("rgb(255, 255, 255)");
    expect(screen.getByTestId("lectura-questions-header").textContent).toMatch(/0\/6 pausas/);
    const card = screen.getByTestId("lectura-cliffhanger");
    expect(card.style.background).toBe("rgb(255, 255, 255)");
    expect(card.style.borderRadius).toBe("18px");
    expect(card.style.borderTop).toMatch(/1\.5px solid (#E2D6C3|rgb\(226, 214, 195\))/);
    expect(screen.getByTestId("lectura-cliffhanger-line").textContent).toBe("Hay casas que no olvidan. ¿Conoces una que todavía espere a su dueña?");
    expect(screen.getByTestId("lectura-cliffhanger-line").style.fontSize).toBe("16px");
    expect(screen.getByTestId("lectura-cliffhanger-line").style.fontWeight).toBe("500");
    expect(screen.getByTestId("lectura-cliffhanger-next").textContent).toBe("Sigue: La casa azul");
    expect(screen.getByTestId("lectura-cliffhanger-next").style.fontSize).toBe("17px");
    expect(screen.getByTestId("lectura-cliffhanger-next").style.fontWeight).toBe("700");
    expect(screen.getByTestId("lectura-cliffhanger-next").querySelector("i").style.fontStyle).toBe("italic");
    expect(screen.getByTestId("lectura-next-still").getAttribute("src")).toContain("lectura/story-1/p0.png");
    expect(screen.getByTestId("lectura-next-still").style.aspectRatio).toMatch(/16\s*\/\s*9/);
    const button = screen.getByTestId("lectura-bird-handoff-cta");
    expect(button.textContent).toBe("Empieza a leer");
    expect(button.style.height).toBe("52px");
    expect(button.style.width).toBe("100%");
    expect(button.style.background).toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(button.style.color).toMatch(/#1F3A1A|rgb\(\s*31,\s*58,\s*26\s*\)/i);
    expect(screen.queryByRole("button", { name: /^Continuar$/ })).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();

    await user.click(button);
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-1"));
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toContain("lectura/story-1/p0.png");
    expect(screen.getByTestId("story-reader-title").textContent).toBe("La casa azul");
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/En el barrio de Coyoacán/);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("story-0-win")).toBeNull();
  });

  it("EN claim reads XP claimed and the button reads Start reading", async () => {
    const user = await boot({ paraIdx: 6, uiLang: "en" });
    await screen.findAllByTestId("story-q-prompt");
    await user.click(screen.getByRole("button", { name: "El olor del cempasúchil" }));
    await user.click(screen.getByRole("button", { name: "En el panteón de la isla de Janitzio" }));
    await user.click(screen.getByRole("button", { name: "El olvido" }));
    const claim = await screen.findByTestId("lectura-claim-cta");
    expect(claim.textContent).toBe("+35 XP · 💎10");
    expect(screen.getByTestId("lectura-score").textContent).toBe("3/3 correct — ¡qué padre!");
    await user.click(claim);
    await waitFor(() => expect(screen.getByTestId("lectura-claim-cta").textContent).toBe("XP claimed"));
    expect(screen.getByTestId("lectura-cliffhanger-line").textContent).toBe("Some houses don\u2019t forget. Do you know one still waiting for its owner?");
    expect(screen.getByTestId("lectura-cliffhanger-next").textContent).toBe("Next: La casa azul");
    expect(screen.getByTestId("lectura-bird-handoff-cta").textContent).toBe("Start reading");
    expect(screen.queryByRole("button", { name: /^Continue$/ })).toBeNull();
  });

  it("the next card is dark #1E2128 with a 14px radius and no border", async () => {
    const user = await boot({ paraIdx: 6, theme: "dark" });
    await screen.findAllByTestId("story-q-prompt");
    await user.click(screen.getByRole("button", { name: "El olor del cempasúchil" }));
    await user.click(screen.getByRole("button", { name: "En el panteón de la isla de Janitzio" }));
    await user.click(screen.getByRole("button", { name: "El olvido" }));
    await user.click(await screen.findByTestId("lectura-claim-cta"));
    const card = await screen.findByTestId("lectura-cliffhanger");
    expect(card.style.background).toBe("rgb(30, 33, 40)");
    expect(card.style.borderRadius).toBe("14px");
    expect(card.style.borderTop).toBe("");
    expect(card.style.borderRight).toBe("");
    expect(card.style.borderBottom).toBe("");
    expect(card.style.borderLeft).toBe("");
    expect(screen.getByTestId("lectura-claim-cta").style.background).toBe("rgb(255, 255, 255)");
    expect(screen.getByTestId("lectura-claim-cta").style.color).toBe("rgb(88, 167, 0)");
  });
});
