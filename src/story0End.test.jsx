/**
 * Story-0 end screen: checkpoint 6 in Spanish, a quiet claim pill,
 * and Start reading opens La casa azul at page 1.
 * The next card shows with the score line, including a later finish.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";

const appSrc = readFileSync(join(process.cwd(), "src/App.jsx"), "utf8");
const STORAGE_PROGRESS = "andale-v3";

const STORAGE_KEY = STORAGE_PROGRESS;
const LIVE_KEY = "andale-v3-live";

const pillBorder = (node) => [node.style.borderTop, node.style.borderRight, node.style.borderBottom, node.style.borderLeft];

const expectLightPill = (node) => {
  expect(node.style.background).toBe("rgb(255, 255, 255)");
  expect(node.style.color).toBe("rgb(88, 167, 0)");
  for (const edge of pillBorder(node)) {
    expect(edge).toMatch(/1\.5px solid (#E2D6C3|rgb\(226, 214, 195\))/);
  }
};

const expectDarkPill = (node) => {
  expect(node.style.background).toBe("rgb(30, 33, 40)");
  expect(node.style.color).toBe("rgb(88, 204, 2)");
  for (const edge of pillBorder(node)) {
    expect(edge).toMatch(/1\.5px solid (#3A3F49|rgb\(58, 63, 73\))/);
  }
};

const expectNextCard = (uiLang) => {
  const card = screen.getByTestId("lectura-cliffhanger");
  expect(card.getAttribute("data-story-id")).toBe("story-0");
  expect(screen.getByTestId("lectura-next-still").getAttribute("src")).toContain("lectura/story-1/p0.png");
  expect(screen.getByTestId("lectura-cliffhanger-next").textContent).toBe(uiLang === "en" ? "Next: La casa azul" : "Sigue: La casa azul");
  expect(screen.getByTestId("lectura-bird-handoff-cta").textContent).toBe(uiLang === "en" ? "Start reading" : "Empieza a leer");
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
};

const answerStory0 = async (user) => {
  await screen.findAllByTestId("story-q-prompt");
  await user.click(screen.getByRole("button", { name: "El olor del cempasúchil" }));
  await user.click(screen.getByRole("button", { name: "En el panteón de la isla de Janitzio" }));
  await user.click(screen.getByRole("button", { name: "El olvido" }));
  await screen.findByTestId("lectura-score");
};

const readAgain = async (user) => {
  await user.click(screen.getByRole("button", { name: /^(Cerrar|Close)$/ }));
  await waitFor(() => expect(screen.getByTestId("story-shelf-story-0")).toBeTruthy());
  await user.click(screen.getByTestId("story-shelf-story-0"));
  await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
  for (;;) {
    const next = screen.queryByRole("button", { name: /^(Siguiente|Next) →$/ });
    if (!next) break;
    await user.click(next);
  }
  await user.click(screen.getByRole("button", { name: /^(Preguntas|Questions) →$/ }));
  await answerStory0(user);
};

describe("story-0 end screen", () => {
  it("names the three dark claim-pill colors", () => {
    expect(appSrc).toContain('const STORY0_CLAIM_DARK_FILL = "#1E2128"');
    expect(appSrc).toContain('const STORY0_CLAIM_DARK_BORDER = "#3A3F49"');
    expect(appSrc).toContain('const STORY0_CLAIM_DARK_TEXT = "#58CC02"');
    expect(appSrc).toContain('theme === "dark" ? STORY0_CLAIM_DARK_FILL : "#FFFFFF"');
    expect(appSrc).toContain('theme === "dark" ? STORY0_CLAIM_DARK_TEXT : "#58A700"');
    expect(appSrc).toContain('theme === "dark" ? STORY0_CLAIM_DARK_BORDER : "#E2D6C3"');
    expect(appSrc).toContain('uiLang === "en" ? L.xpClaimed : "XP ya reclamados"');
    const pill = appSrc.slice(appSrc.indexOf('data-testid="lectura-claim-cta"'), appSrc.indexOf('data-testid="lectura-claim-cta"') + 800);
    expect(pill).toContain("story0ClaimFill");
    expect(pill).toContain("story0ClaimInk");
    expect(pill).toContain("story0ClaimBorder");
    expect(pill).toContain("story0ClaimAgain");
    expect(pill).not.toContain("#2A2E36");
    expect(appSrc).toContain('story.id === "story-0" && paraIdx >= story.paragraphs.length && answered === story.questions.length');
    expect(appSrc).not.toContain('lecturaCliffhanger?.storyId === story.id && story.id === "story-0"');
  });

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
    expectLightPill(claim);
    expect(claim.style.background).not.toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.queryByRole("button", { name: /Reclamar|Claim/ })).toBeNull();
    expectNextCard("es");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).xp).toBe(42);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).gems).toBe(9);

    await user.click(claim);
    await waitFor(() => expect(screen.getByTestId("lectura-claim-cta").textContent).toBe("XP reclamados"));
    expectLightPill(screen.getByTestId("lectura-claim-cta"));
    expectNextCard("es");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).xp).toBe(77);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).gems).toBe(19);
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
    expectNextCard("en");
    await user.click(claim);
    await waitFor(() => expect(screen.getByTestId("lectura-claim-cta").textContent).toBe("XP claimed"));
    expect(screen.getByTestId("lectura-cliffhanger-line").textContent).toBe("Some houses don\u2019t forget. Do you know one still waiting for its owner?");
    expect(screen.getByTestId("lectura-cliffhanger-next").textContent).toBe("Next: La casa azul");
    expect(screen.getByTestId("lectura-bird-handoff-cta").textContent).toBe("Start reading");
    expect(screen.queryByRole("button", { name: /^Continue$/ })).toBeNull();
  });

  it("a second finish in the same session still shows the card when the pill says XP ya reclamados", async () => {
    const user = await boot({ paraIdx: 6 });
    await answerStory0(user);
    expectNextCard("es");
    await user.click(screen.getByTestId("lectura-claim-cta"));
    await waitFor(() => expect(screen.getByTestId("lectura-claim-cta").textContent).toBe("XP reclamados"));
    await readAgain(user);
    expect(screen.getByTestId("lectura-claim-cta").textContent).toBe("XP ya reclamados");
    expect(screen.getByTestId("lectura-claim-cta").textContent).not.toBe("XP ya reclamado");
    expectLightPill(screen.getByTestId("lectura-claim-cta"));
    expectNextCard("es");
    expect(screen.getByTestId("lectura-cliffhanger-line").textContent).toBe("Hay casas que no olvidan. ¿Conoces una que todavía espere a su dueña?");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).xp).toBe(77);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).gems).toBe(19);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Continuar$/ })).toBeNull();
  });

  it("EN second finish reads XP already claimed and still shows Start reading", async () => {
    const user = await boot({ paraIdx: 6, uiLang: "en" });
    await answerStory0(user);
    await user.click(screen.getByTestId("lectura-claim-cta"));
    await waitFor(() => expect(screen.getByTestId("lectura-claim-cta").textContent).toBe("XP claimed"));
    await readAgain(user);
    expect(screen.getByTestId("lectura-claim-cta").textContent).toBe("XP already claimed");
    expectNextCard("en");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).xp).toBe(77);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).gems).toBe(19);
  });

  it("the next card is dark #1E2128 with a 14px radius and no border", async () => {
    const user = await boot({ paraIdx: 6, theme: "dark" });
    await screen.findAllByTestId("story-q-prompt");
    await answerStory0(user);
    const before = screen.getByTestId("lectura-claim-cta");
    expect(before.textContent).toBe("+35 XP · 💎10");
    expectDarkPill(before);
    expectNextCard("es");
    await user.click(before);
    await waitFor(() => expect(screen.getByTestId("lectura-claim-cta").textContent).toBe("XP reclamados"));
    expectDarkPill(screen.getByTestId("lectura-claim-cta"));
    const card = screen.getByTestId("lectura-cliffhanger");
    expect(card.style.background).toBe("rgb(30, 33, 40)");
    expect(card.style.borderRadius).toBe("14px");
    expect(card.style.borderTop).toBe("");
    expect(card.style.borderRight).toBe("");
    expect(card.style.borderBottom).toBe("");
    expect(card.style.borderLeft).toBe("");
    await readAgain(user);
    expect(screen.getByTestId("lectura-claim-cta").textContent).toBe("XP ya reclamados");
    expectDarkPill(screen.getByTestId("lectura-claim-cta"));
    expectNextCard("es");
  });
});
