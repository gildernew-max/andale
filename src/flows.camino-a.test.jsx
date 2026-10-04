import { describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { CHOICE_CHIP_KEYS } from "./choiceChipKeys.js";
import { SAFE_RISKY_ANSWERS, SAFE_RISKY_MULTI_FIXTURE, setSafeRiskyPackOverride } from "./safeRisky.js";
import { OJALA_QUE_PACK } from "./cubetas.js";
import { HANGMAN_BANK, hangmanLetters } from "./hangman.js";
import { MEMORY_BANK } from "./memory.js";
import { FIRST_WIN_MINUTES, splashPromiseLine, splashPromiseSentences } from "./splashCopy.js";
import { onboardingCopy, onboardingLine } from "./onboardingCopy.js";
import {
  installFlowHooks,
  STORAGE_KEY,
  LIVE_KEY,
  seedProgress,
  seedColdFirstVisit,
  claimStories,
  mockBrowser,
  boot,
  awaitHome,
  contrastRatio,
  ELLIPSIS_RE,
  assertFullWordChip,
  assertMemoryBoardCard,
  assertCreamShell,
  assertHubFace,
  assertEqualHub,
  continueBtn,
  localToday,
  assertFreeWinFlyAway,
  awaitSoftPaywallAfterFirstWin,
  openCaminoMore,
} from "./flowsHarness.jsx";

installFlowHooks();

describe("simulated learner flows", { timeout: 15000 }, () => {
  it("boots Camino, starts subj1, answers one MC, persists andale-v3 without wipe", async () => {
    // Shuffle can put five non-MC beats first. Dummy wrongs burn the default 5
    // hearts and land on the fail screen — hasPrompt then stays false. Extra
    // hearts keep the skip loop on the lesson. Listen Skip does not cost a heart.
    seedProgress({ hearts: 20 });
    const user = await boot();
    await user.click(screen.getByRole("button", { name: "Subjuntivo presente" }));
    await waitFor(() => expect(screen.getByTestId("path-sheet")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Empezar · \+XP|Start · \+XP/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const hasPrompt = () => !!(
      document.querySelector(".choice-card")
      || document.querySelector("input[placeholder]")
      || screen.queryAllByTestId("bank-tile").length
      || document.querySelector(".tile")
    );
    await waitFor(() => expect(hasPrompt()).toBe(true));

    // Skip non-MC items (shuffle) until a multiple-choice prompt is up.
    for (let i = 0; i < 12 && !document.querySelector(".choice-card"); i++) {
      const listenSkip = screen.queryByTestId("lesson-listen-skip");
      const input = document.querySelector("input[placeholder]");
      const tiles = screen.queryAllByTestId("bank-tile");
      const orderTiles = document.querySelectorAll(".tile");
      if (listenSkip) {
        await user.click(listenSkip);
      } else if (input) {
        await user.type(input, "x");
        await user.click(screen.getByTestId("lesson-check"));
        await user.click(continueBtn());
      } else if (tiles.length) {
        await user.click(tiles[0]);
        await user.click(screen.getByTestId("lesson-check"));
        await user.click(continueBtn());
      } else if (orderTiles.length) {
        await user.click(orderTiles[0]);
        await user.click(screen.getByTestId("lesson-check"));
        await user.click(continueBtn());
      } else {
        break;
      }
      await waitFor(() => expect(hasPrompt()).toBe(true));
    }
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));

    await waitFor(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const prog = JSON.parse(raw);
      expect(prog && typeof prog === "object" && !Array.isArray(prog)).toBe(true);
      expect(prog.xp).toBe(42);
      expect(prog.gems).toBe(9);
      expect(prog.name).toBe("Dave");
      expect(prog.contentVersion).toBe(2);
      expect(prog.srs || prog.weak || prog.hearts != null).toBeTruthy();
    });
  });

  it("tabs Camino → Misiones → Lectura → Práctica → Perfil via nav-*", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-camino"));
    await awaitHome();
    assertEqualHub();
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/Continuar|Continue|Subjuntivo/);

    await user.click(screen.getByTestId("nav-misiones"));
    expect(screen.getByRole("heading", { name: /Misiones/ })).toBeTruthy();
    expect([...document.querySelectorAll("img")].some((img) => /coaches\/valeria-happy\.png/.test(img.getAttribute("src") || ""))).toBe(true);

    await user.click(screen.getByTestId("nav-lectura"));
    expect(screen.getByRole("heading", { name: /Biblioteca/ })).toBeTruthy();

    await user.click(screen.getByTestId("nav-practica"));
    expect(screen.getByTestId("safe-risky-start")).toBeTruthy();

    await user.click(screen.getByTestId("nav-perfil"));
    expect(screen.getByText("Tu perfil")).toBeTruthy();
  });

  it("starts Safe or Risky from Práctica via data-testid safe-risky-start", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => {
      expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy();
      expect(screen.getByText(/¿Lo dirías\?|Would you say it\?/)).toBeTruthy();
    });
  });

  it("Safe/Risky reveal shows Literal then Why above CONTINUE", async () => {
    const literals = {
      "No manches.": { es: "Vaya / no me digas.", en: "No way. / Come on." },
      "Quedo a sus órdenes.": { es: "Quedo bajo sus órdenes.", en: "I remain under your orders." },
      "¿Mande?": { es: "¿Cómo? / ¿perdón?", en: "Pardon?" },
      "¿Qué?": { es: "¿Qué?", en: "What?" },
      "¿Me da un café, por favor?": { es: "¿Me da un café, por favor?", en: "Can I have a coffee, please?" },
      "Está bien chido.": { es: "Está muy padre.", en: "It’s really cool." },
      "No obstante lo anterior...": { es: "A pesar de lo anterior...", en: "Notwithstanding the foregoing..." },
      "Ahorita vengo.": { es: "Vuelvo en un momento.", en: "I’ll be right back." },
    };
    const whys = {
      "No manches.": { es: "Suena a amigos en México. Con jefes o personas mayores, pásate a algo más suave.", en: "Sounds like friends in Mexico. With bosses or elders, switch to something softer." },
      "Quedo a sus órdenes.": { es: "En tono suave: estoy a su disposición. Cierre profesional mexicano — amable, claro, seguro en correo con clientas.", en: "Soft English: I’m at your service. Mexican professional close — warm, clear, safe for a client email." },
      "¿Mande?": { es: "De mandar / «mande usted»: el «¿perdón?» cortés de México. Con la suegra, gana a un «¿Qué?» seco.", en: "From mandar / «mande usted»: Mexico’s polite “Pardon?” With your mother-in-law, it beats a blunt «¿Qué?»" },
      "¿Qué?": { es: "Puede sonar brusco. Mejor «¿Mande?» o «¿Cómo?» según a quién le hablas.", en: "It can land blunt. Prefer «¿Mande?» or «¿Cómo?» depending on who you’re talking to." },
      "¿Me da un café, por favor?": { es: "Natural en el mostrador: directo y cortés. Mejor que «¿Puedo obtener un café?»", en: "Natural at the counter: direct and polite. Better than “Can I obtain a coffee?”" },
      "Está bien chido.": { es: "Suena mexicano y de amigos. En documentos o juntas formales, cámbialo.", en: "Sounds Mexican and friendly. In documents or formal meetings, swap it out." },
      "No obstante lo anterior...": { es: "Registro de contrato. En una charla normal pesa demasiado; guárdalo para el papel.", en: "Contract register. In normal chat it feels heavy — save it for the page." },
      "Ahorita vengo.": { es: "Muy mexicano. «Ahorita» puede ser pronto… o un poco más. El tono lo decide el contexto.", en: "Very Mexican. «Ahorita» can mean soon… or a bit later. Context sets the clock." },
    };
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy());
    const phrase = Object.keys(literals).find((p) => document.body.textContent.includes(p));
    expect(phrase).toBeTruthy();
    expect(screen.queryByTestId("safe-risky-literal")).toBeNull();
    expect(screen.queryByTestId("safe-risky-why")).toBeNull();
    const rights = SAFE_RISKY_ANSWERS[phrase];
    expect(rights.length).toBeGreaterThan(0);
    for (const key of rights) {
      if (screen.queryByTestId("safe-risky-continue")) break;
      await user.click(screen.getByTestId(`safe-risky-choice-${key}`));
    }
    await waitFor(() => expect(screen.getByTestId("safe-risky-continue")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("safe-risky-literal")).toBeTruthy());
    const literal = screen.getByTestId("safe-risky-literal");
    const why = screen.getByTestId("safe-risky-why");
    const cont = screen.getByTestId("safe-risky-continue");
    expect(literal.textContent).toContain("Traducción");
    expect(literal.textContent).toContain(literals[phrase].es);
    expect(why.textContent).toContain("Por qué");
    expect(why.textContent).toContain(whys[phrase].es);
    expect(why.textContent).not.toMatch(/^¿Por qué\?/);
    expect(cont.textContent).toMatch(/Continuar|Terminar/);
    expect(literal.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(why.compareDocumentPosition(cont) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    if (phrase === "Quedo a sus órdenes.") {
      expect(literal.textContent).toContain("Quedo bajo sus órdenes.");
      expect(literal.textContent).not.toMatch(/at your service/i);
      expect(literal.textContent).not.toMatch(/disposición/i);
      expect(why.textContent).toContain("En tono suave: estoy a su disposición.");
      expect(why.textContent).not.toContain("Encaja en correo con clientas.");
    }
    if (phrase === "Está bien chido.") {
      expect(literal.textContent).toContain("Está muy padre.");
      expect(literal.textContent).not.toMatch(/cool/i);
    }
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Literal"));
    expect(screen.getByTestId("safe-risky-literal").textContent).toContain(literals[phrase].en);
    if (phrase === "Quedo a sus órdenes.") {
      expect(screen.getByTestId("safe-risky-literal").textContent).toContain("I remain under your orders.");
      expect(screen.getByTestId("safe-risky-literal").textContent).not.toMatch(/at your service/i);
      expect(screen.getByTestId("safe-risky-why").textContent).toContain("Soft English: I’m at your service.");
    }
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Why");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain(whys[phrase].en);
    expect(screen.getByTestId("safe-risky-why").textContent).not.toMatch(/^Why\?/);
    expect(screen.getByTestId("safe-risky-continue").textContent).toMatch(/Continue|Finish/);
  });

  it("Safe/Risky wrong/better-answer reveal still shows Literal then Why above CONTINUE", async () => {
    const literals = {
      "No manches.": { es: "Vaya / no me digas." },
      "Quedo a sus órdenes.": { es: "Quedo bajo sus órdenes." },
      "¿Mande?": { es: "¿Cómo? / ¿perdón?" },
      "¿Qué?": { es: "¿Qué?" },
      "¿Me da un café, por favor?": { es: "¿Me da un café, por favor?" },
      "Está bien chido.": { es: "Está muy padre." },
      "No obstante lo anterior...": { es: "A pesar de lo anterior..." },
      "Ahorita vengo.": { es: "Vuelvo en un momento." },
    };
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy());
    const phrase = Object.keys(literals).find((p) => document.body.textContent.includes(p));
    expect(phrase).toBeTruthy();
    const rights = SAFE_RISKY_ANSWERS[phrase];
    const wrong = ["safe", "casual", "formal", "regional", "risky"].find((k) => !rights.includes(k));
    await user.click(screen.getByTestId(`safe-risky-choice-${wrong}`));
    if (rights.length > 1) {
      expect(screen.getByTestId(`safe-risky-choice-${wrong}`).getAttribute("data-safe-risky-state")).toBe("wrong");
      expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
      for (const key of rights) {
        await user.click(screen.getByTestId(`safe-risky-choice-${key}`));
      }
    }
    await waitFor(() => expect(screen.getByTestId("safe-risky-literal")).toBeTruthy());
    expect(document.body.textContent).toMatch(/Mejor respuesta|Better answer/);
    const literal = screen.getByTestId("safe-risky-literal");
    const why = screen.getByTestId("safe-risky-why");
    const cont = screen.getByTestId("safe-risky-continue");
    expect(literal.textContent).toContain("Traducción");
    expect(literal.textContent).toContain(literals[phrase].es);
    expect(why.textContent).toContain("Por qué");
    expect(literal.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(why.compareDocumentPosition(cont) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    if (phrase === "Quedo a sus órdenes.") {
      expect(literal.textContent).toContain("Quedo bajo sus órdenes.");
      expect(literal.textContent).not.toMatch(/at your service/i);
      expect(literal.textContent).not.toMatch(/disposición/i);
      expect(why.textContent).toContain("En tono suave: estoy a su disposición.");
    }
    if (phrase === "Está bien chido.") {
      expect(literal.textContent).toContain("Está muy padre.");
      expect(literal.textContent).not.toMatch(/cool/i);
    }
    if (phrase === "¿Qué?") {
      expect(literal.textContent).toContain("¿Qué?");
    }
  });

  it("Safe/Risky multi-correct waits for every right chip before CONTINUE", async () => {
    setSafeRiskyPackOverride([SAFE_RISKY_MULTI_FIXTURE]);
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy());
    expect(document.body.textContent).toContain("MULTI_CORRECT_FIXTURE");
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    expect(screen.queryByTestId("safe-risky-literal")).toBeNull();

    await user.click(screen.getByTestId("safe-risky-choice-safe"));
    expect(screen.getByTestId("safe-risky-choice-safe").getAttribute("data-safe-risky-state")).toBe("correct");
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    expect(screen.queryByTestId("safe-risky-literal")).toBeNull();
    expect(screen.getByTestId("safe-risky-choice-casual").disabled).toBe(false);

    await user.click(screen.getByTestId("safe-risky-choice-risky"));
    expect(screen.getByTestId("safe-risky-choice-risky").getAttribute("data-safe-risky-state")).toBe("wrong");
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    expect(screen.queryByTestId("safe-risky-why")).toBeNull();

    await user.click(screen.getByTestId("safe-risky-choice-casual"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-continue")).toBeTruthy());
    expect(screen.getByTestId("safe-risky-choice-casual").getAttribute("data-safe-risky-state")).toBe("correct");
    expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Traducción");
    expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Fixture literal.");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Por qué");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Fixture why.");
    expect(document.body.textContent).toMatch(/Mejor respuesta/);
    expect(document.body.textContent).toMatch(/Seguro · Casual|Casual · Seguro/);
    const literal = screen.getByTestId("safe-risky-literal");
    const why = screen.getByTestId("safe-risky-why");
    const cont = screen.getByTestId("safe-risky-continue");
    expect(literal.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(why.compareDocumentPosition(cont) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cont.textContent).toMatch(/Continuar|Terminar/);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Literal"));
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Why");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Fixture why.");
    expect(document.body.textContent).toMatch(/Better answer/);
    expect(screen.getByTestId("safe-risky-continue").textContent).toMatch(/Continue|Finish/);
  });

  it("Safe/Risky multi-correct names how many answers are left without naming tags", async () => {
    setSafeRiskyPackOverride([SAFE_RISKY_MULTI_FIXTURE]);
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy());

    const line = () => screen.getByTestId("safe-risky-remaining");
    expect(line().textContent).toBe("2 respuestas correctas · 2 por tocar");
    expect(line().style.fontSize).toBe("12px");
    expect(line().style.fontWeight).toBe("700");
    expect(line().style.textAlign).toBe("center");
    expect(line().style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
    expect(line().style.background).toBe("");
    expect(line().style.border).toBe("");

    await user.click(screen.getByTestId("lang-en"));
    expect(line().textContent).toBe("2 right answers · 2 left to tap");
    await user.click(screen.getByTestId("lang-es"));
    expect(line().textContent).toBe("2 respuestas correctas · 2 por tocar");

    await user.click(screen.getByTestId("safe-risky-choice-safe"));
    expect(line().textContent).toBe("2 respuestas correctas · 1 por tocar");
    await user.click(screen.getByTestId("safe-risky-choice-risky"));
    expect(screen.getByTestId("safe-risky-choice-risky").getAttribute("data-safe-risky-state")).toBe("wrong");
    expect(line().textContent).toBe("2 respuestas correctas · 1 por tocar");

    await user.click(screen.getByTestId("lang-en"));
    expect(line().textContent).toBe("2 right answers · 1 left to tap");
    await user.click(screen.getByTestId("lang-es"));

    await user.click(screen.getByTestId("safe-risky-choice-casual"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-continue")).toBeTruthy());
    expect(screen.queryByTestId("safe-risky-remaining")).toBeNull();

    setSafeRiskyPackOverride([{
      phrase: "SINGLE_CORRECT_FIXTURE",
      context: { es: "Fixture de una sola respuesta.", en: "Single-answer fixture." },
      answer: "safe",
      answers: ["safe"],
      literal: { es: "Una.", en: "One." },
      note: { es: "Por qué una.", en: "Why one." },
    }]);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.getByTestId("safe-risky-start")).toBeTruthy());
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByText("SINGLE_CORRECT_FIXTURE")).toBeTruthy());
    expect(screen.queryByTestId("safe-risky-remaining")).toBeNull();
    await user.click(screen.getByTestId("safe-risky-choice-safe"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-continue")).toBeTruthy());
    expect(screen.queryByTestId("safe-risky-remaining")).toBeNull();
  });

  it("Safe/Risky multi-correct clean tap-all unlocks CONTINUE with Literal then Why", async () => {
    setSafeRiskyPackOverride([SAFE_RISKY_MULTI_FIXTURE]);
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-choice-safe")).toBeTruthy());
    await user.click(screen.getByTestId("safe-risky-choice-casual"));
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    await user.click(screen.getByTestId("safe-risky-choice-safe"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-continue")).toBeTruthy());
    expect(document.body.textContent).toMatch(/Buen juicio|Good judgment/);
    expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Traducción");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Por qué");
    expect(screen.getByTestId("safe-risky-choice-risky").getAttribute("data-safe-risky-state")).toBe("idle");
    expect(screen.getByTestId("safe-risky-choice-risky").disabled).toBe(true);
  });

  it("Safe/Risky live No manches waits for casual + regional before CONTINUE", async () => {
    expect(SAFE_RISKY_ANSWERS["No manches."]).toEqual(["casual", "regional"]);
    setSafeRiskyPackOverride([{
      phrase: "No manches.",
      context: { es: "Tu amigo te cuenta que pagó $300 por dos cafés.", en: "Your friend says they paid $300 for two coffees." },
      answer: "casual",
      answers: ["casual", "regional"],
      literal: { es: "Vaya / no me digas.", en: "No way. / Come on." },
      note: { es: "Suena a amigos en México. Con jefes o personas mayores, pásate a algo más suave.", en: "Sounds like friends in Mexico. With bosses or elders, switch to something softer." },
    }]);
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("safe-risky-start"));
    await waitFor(() => expect(screen.getByText("No manches.")).toBeTruthy());
    await user.click(screen.getByTestId("safe-risky-choice-casual"));
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    await user.click(screen.getByTestId("safe-risky-choice-formal"));
    expect(screen.getByTestId("safe-risky-choice-formal").getAttribute("data-safe-risky-state")).toBe("wrong");
    expect(screen.queryByTestId("safe-risky-continue")).toBeNull();
    await user.click(screen.getByTestId("safe-risky-choice-regional"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-continue")).toBeTruthy());
    expect(screen.getByTestId("safe-risky-literal").textContent).toContain("Traducción");
    expect(screen.getByTestId("safe-risky-why").textContent).toContain("Por qué");
    expect(document.body.textContent).toMatch(/Mejor respuesta/);
  });

  const playMatchRound = async (user) => {
    await waitFor(() => expect(screen.getByTestId("match-pairs-board")).toBeTruthy());
    const lefts = [...document.querySelectorAll("[data-testid^='match-tile-left-']")];
    expect(lefts.length).toBeGreaterThan(1);
    for (const el of lefts) {
      const id = el.getAttribute("data-testid").replace("match-tile-left-", "");
      await user.click(el);
      await user.click(screen.getByTestId(`match-tile-right-${id}`));
    }
    await waitFor(() => expect(screen.getByTestId("match-pairs-done")).toBeTruthy());
  };

  const progressXp = () => JSON.parse(localStorage.getItem(STORAGE_KEY)).xp;

  it("starts match-pairs from Práctica and finishes a finite round", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    const start = screen.getByTestId("match-pairs-start");
    expect(start).toBeTruthy();
    await user.click(start);
    await playMatchRound(user);
    expect(screen.queryByTestId("match-pairs-board")).toBeNull();
    expect(screen.getByText(/¡Ronda terminada!|Round complete/)).toBeTruthy();
    await user.click(screen.getByTestId("match-pairs-back"));
    await waitFor(() => expect(screen.getByTestId("match-pairs-start")).toBeTruthy());
  });

  it("match-pairs rematch keeps XP at 4 (first +4, Otra ronda +0)", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("match-pairs-start"));
    await playMatchRound(user);
    await waitFor(() => expect(progressXp() - 42).toBe(4));
    await user.click(screen.getByTestId("match-pairs-again"));
    await playMatchRound(user);
    await waitFor(() => expect(progressXp() - 42).toBe(4));
  });

  it("opens story-0 from Lectura, taps a word, and leaves no definición pendiente", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    expect(screen.getByTestId("story-tip").textContent).toMatch(/Lee el párrafo\. Toca una palabra solo si te frena\./);
    expect(screen.getByTestId("lectura-paragraph-first")).toBeTruthy();
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/Cuando yo era niña,/);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).not.toMatch(/Cuando yo era niño,/);
    const still = screen.getByTestId("lectura-still-0");
    expect(still.getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-0/p0.png`);
    await waitFor(() => expect(screen.getAllByText(/cempasúchil/).length).toBeGreaterThan(0));
    await user.click(screen.getByRole("button", { name: /^Bilingüe$/ }));
    expect(document.body.textContent).toMatch(/her grandmother taught her/);
    expect(document.body.textContent).not.toMatch(/his grandmother taught him/);
    const storyWord = [...document.querySelectorAll("span")].find((el) =>
      el.textContent === "cempasúchil" && el.style.cursor === "pointer");
    expect(storyWord).toBeTruthy();
    await user.click(storyWord);
    await waitFor(() => expect(screen.getByText(/Mexican marigold/i)).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/definición pendiente|definition coming soon/i);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("story-tip").textContent).toMatch(/Read the paragraph\. Tap a word only if it stops you\./));
  });

  it("Lectura Wave A stills resolve via BASE_URL for story-0 p3, story-1, and story-2", async () => {
    seedProgress({ stories: claimStories("story-1", "story-2") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const story0 = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(story0[story0.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-3")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-3").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-0/p3.png`);
    await user.click(screen.getByRole("button", { name: /Cerrar|Close/ }));
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    const story1 = screen.getAllByRole("button", { name: /La casa azul/ });
    await user.click(story1[story1.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-1/p0.png`);
    await user.click(screen.getByRole("button", { name: /Cerrar|Close/ }));
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    const story2 = screen.getAllByRole("button", { name: /Más allá de la playa/ });
    await user.click(story2[story2.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-2/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/Sofía y Mateo llegaron a Cancún/);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).not.toMatch(/Llegué a Cancún/);
  });

  const finishStoryPages = async (user) => {
    for (;;) {
      const next = screen.queryByRole("button", { name: /^(Siguiente|Next) →$/ });
      if (!next) break;
      await user.click(next);
    }
    await user.click(screen.getByRole("button", { name: /^(Preguntas|Questions) →$/ }));
    await waitFor(() => expect(screen.getAllByTestId("story-q-prompt").length).toBeGreaterThan(0));
  };

  it("first story-0 Lectura (all pages) plays Cenzontle fly-away + ¡Eso! — no perch, no paywall", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    await finishStoryPages(user);
    await user.click(screen.getByRole("button", { name: /El olor del cempasúchil/ }));
    await user.click(screen.getByRole("button", { name: /En el panteón de la isla de Janitzio/ }));
    await user.click(screen.getByRole("button", { name: /El olvido/ }));
    await user.click(screen.getByRole("button", { name: /Reclamar|Claim/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-cliffhanger-line").textContent).toBe("Hay casas que no olvidan. ¿Conoces una que todavía espere a su dueña?"));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("lectura-bird-handoff-cta"));
    await waitFor(() => {
      expect(screen.getByTestId("story-0-win")).toBeTruthy();
      expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    });
    expect(screen.getByTestId("story-0-win").textContent).toBe("¡Eso!");
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.queryByTestId("lectura-handoff")).toBeNull();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).lecturaHandoffSeen).toBe(true));
    assertFreeWinFlyAway();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    assertCreamShell();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("story-0-win").textContent).toBe("That's it."));
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    assertFreeWinFlyAway();
    await user.click(screen.getByTestId("story-0-win-continue"));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await awaitHome();
    await user.click(screen.getByTestId("nav-lectura"));
    const again = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(again[again.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    await finishStoryPages(user);
    expect(screen.getAllByTestId("story-q-prompt").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("story-0-win")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
  });

  it("later Lectura stories show WinPerch static only — no 780ms beat", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true, stories: claimStories("story-0") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La casa azul/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    await finishStoryPages(user);
    await user.click(screen.getByRole("button", { name: /Porque era a quien mejor conocía/ }));
    await user.click(screen.getByRole("button", { name: /El tranvía y Diego/ }));
    await user.click(screen.getByRole("button", { name: /Viva la vida/ }));
    await user.click(screen.getByRole("button", { name: /Reclamar|Claim/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-cliffhanger")).toBeTruthy());
    expect(screen.getByRole("button", { name: /^XP reclamados$/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^XP ya reclamado$/ })).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    expect(screen.getByRole("button", { name: /^XP claimed$/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^XP already claimed$/ })).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("lectura-bird-handoff-cta"));
    await waitFor(() => {
      expect(screen.getByTestId("lectura-win")).toBeTruthy();
      expect(screen.getByTestId("win-perch-bird").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    });
    expect(screen.getByTestId("lectura-win").textContent).toBe("¡Eso!");
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.getByTestId("win-perch-chip")).toBeTruthy();
    expect(screen.getByTestId("win-perch-slot")).toBeTruthy();
    expect(screen.getByTestId("win-perch").textContent).not.toMatch(/¡Eso!|That's it\./);
    assertCreamShell();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("story-0-win")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lectura-win").textContent).toBe("That's it."));
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    expect(screen.getByTestId("win-perch").textContent).not.toMatch(/¡Eso!|That's it\./);
    await user.click(screen.getByTestId("lectura-win-continue"));
    await awaitHome();
    await user.click(screen.getByTestId("nav-lectura"));
    const again = screen.getAllByRole("button", { name: /La casa azul/ });
    await user.click(again[again.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    await finishStoryPages(user);
    await user.click(screen.getByRole("button", { name: /Porque era a quien mejor conocía/ }));
    await user.click(screen.getByRole("button", { name: /El tranvía y Diego/ }));
    await user.click(screen.getByRole("button", { name: /Viva la vida/ }));
    expect(screen.getByRole("button", { name: /^XP already claimed$/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^XP claimed$/ })).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    expect(screen.getByRole("button", { name: /^XP ya reclamado$/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^XP reclamados$/ })).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("lectura-win")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
  });

  it("Lectura Wave B stills resolve via BASE_URL for story-3 and story-9", async () => {
    seedProgress({ stories: claimStories("story-3", "story-9") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const story3 = screen.getAllByRole("button", { name: /El hijo del Rey Tigre/ });
    await user.click(story3[story3.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p0.png`);
    await user.click(screen.getByRole("button", { name: /Cerrar|Close/ }));
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    const story9 = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(story9[story9.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-9/p0.png`);
  });

  it("opens story-3 El hijo del Rey Tigre with Brand stills and current lucha words", async () => {
    seedProgress({ stories: claimStories("story-3") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /El hijo del Rey Tigre/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/se ponía la máscara antes de salir/);
    expect(document.body.textContent).toMatch(/Joaquín Méndez de Tlalnepantla/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-1")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-1").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p1.png`);
    expect(document.body.textContent).toMatch(/Mi madre las cosía a mano/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-2")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-2").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p2.png`);
    expect(document.body.textContent).toMatch(/fue rudo durante veintidós años/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-3")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-3").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p3.png`);
    expect(document.body.textContent).toMatch(/perdió la máscara/);
    expect(document.body.textContent).toMatch(/Vimos su cara por primera vez/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-4")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-4").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p4.png`);
    expect(document.body.textContent).toMatch(/se retiró esa misma noche/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-5")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-5").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-3/p5.png`);
    expect(document.body.textContent).toMatch(/Tigre Joven/);
    expect(document.body.textContent).toMatch(/plateada con detalles azules/);
  });

  it("opens story-7 El último dominó with Brand stills and Pepe, not Tito", async () => {
    seedProgress({ stories: claimStories("story-7") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /El último dominó/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-7/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/La cantina La Covadonga/);
    expect(document.body.textContent).not.toMatch(/\bTito\b/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-2")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-2").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-7/p2.png`);
    expect(document.body.textContent).toMatch(/Don Pepe, el más joven/);
    expect(document.body.textContent).not.toMatch(/\bTito\b/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-4")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-4").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-7/p4.png`);
    expect(document.body.textContent).toMatch(/Don Pepe ganó/);
    expect(document.body.textContent).not.toMatch(/\bTito\b/);
  });

  it("opens story-5 La frontera más larga del mundo with Brand stills and current Tijuana words", async () => {
    seedProgress({ stories: claimStories("story-5") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La frontera más larga del mundo/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-5/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/Llevo doce años cubriendo la frontera/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-1")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-1").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-5/p1.png`);
    expect(document.body.textContent).toMatch(/Tijuana no es lo que dicen las películas/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-3")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-3").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-5/p3.png`);
    expect(document.body.textContent).toMatch(/Anabel, una madre hondureña/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-5")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-5").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-5/p5.png`);
    expect(document.body.textContent).toMatch(/Tijuana se vuelve hogar/);
    expect(document.body.textContent).toMatch(/Roma en el año 50/);
  });

  it("opens story-6 La sirena del Pacífico with Brand stills and Mamá, not Papá", async () => {
    seedProgress({ stories: claimStories("story-6") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La sirena del Pacífico/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-6/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/En San Blas, Nayarit/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-4")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-4").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-6/p4.png`);
    expect(document.body.textContent).toMatch(/«Mamá, las sirenas/);
    expect(document.body.textContent).not.toMatch(/«Papá, las sirenas/);
  });

  it("opens story-8 El grito de mi padre with stills and balcony crate beside", async () => {
    seedProgress({ stories: claimStories("story-8") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /El grito de mi padre/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/se ponía la guayabera blanca/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-1")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-1").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p1.png`);
    expect(document.body.textContent).toMatch(/descorchábamos botellas de tequila/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-2")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-2").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p2.png`);
    expect(document.body.textContent).toMatch(/En la regadera, en el coche/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-3")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-3").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p3.png`);
    expect(document.body.textContent).toMatch(/me llevó al balcón con un cajón de botellas a un lado/);
    expect(document.body.textContent).toMatch(/camisa blanca planchada/);
    expect(document.body.textContent).toMatch(/el brazo en alto/);
    expect(document.body.textContent).not.toMatch(/se subió a un cajón/);
    expect(document.body.textContent).not.toMatch(/cajón de cerveza vacío/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-4")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-4").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p4.png`);
    expect(document.body.textContent).toMatch(/frente a mis hijos/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-5")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-5").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-8/p5.png`);
    expect(document.body.textContent).toMatch(/¡Viva México!/);
  });

  it("opens story-9 Las cerezas de don Adán with Brand stills and setenta, not cincuenta y nueve", async () => {
    seedProgress({ stories: claimStories("story-9") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-9/p0.png`);
    expect(screen.getByTestId("lectura-paragraph-first").textContent).toMatch(/Si usted alguna vez se ha tomado un café de Chiapas/);
    await user.click(screen.getByRole("button", { name: /Siguiente|Next/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-still-1")).toBeTruthy());
    expect(screen.getByTestId("lectura-still-1").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-9/p1.png`);
    expect(document.body.textContent).toMatch(/Don Adán tiene setenta años/);
    expect(document.body.textContent).toMatch(/metro cincuenta y cinco/);
    expect(document.body.textContent).not.toMatch(/cincuenta y nueve/);
  });

  it("Lectura + story Qs show a one-line gloss for stamped words only", async () => {
    seedProgress({ stories: claimStories("story-9") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    const cerezas = screen.getAllByTestId("gloss-word").find((el) => el.getAttribute("data-gloss-key") === "cerezas");
    expect(cerezas).toBeTruthy();
    await user.click(cerezas);
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("el fruto del café (no la fruta de postre)"));
    await user.click(screen.getByRole("button", { name: "Preguntas" }));
    await waitFor(() => expect(screen.getAllByTestId("story-q-prompt").length).toBeGreaterThan(0));
    const cosecha = [...document.querySelectorAll("[data-testid='story-q-prompt'] [data-testid='gloss-word']")]
      .find((el) => el.getAttribute("data-gloss-key") === "cosecha");
    expect(cosecha).toBeTruthy();
    await user.click(cosecha);
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("la recolección de ese año"));
    const passageCosecha = [...document.querySelectorAll("[data-testid='story-quiz-passage'] [data-testid='gloss-word']")]
      .find((el) => el.getAttribute("data-gloss-key") === "cosecha");
    expect(passageCosecha).toBeTruthy();
    await user.click(passageCosecha);
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("la recolección de ese año"));
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByText("Comprehension")).toBeTruthy());
    const cosechaEn = screen.getAllByTestId("gloss-word").find((el) => el.getAttribute("data-gloss-key") === "cosecha");
    await user.hover(cosechaEn);
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("harvest"));
  });

  it("header ES|EN toggle flips uiLang, persists andale-v3, and stays in sync with Perfil", async () => {
    const user = await boot();
    const toggle = screen.getByTestId("lang-toggle");
    const es = screen.getByTestId("lang-es");
    const en = screen.getByTestId("lang-en");
    expect(toggle).toBeTruthy();
    expect(es).toBeTruthy();
    expect(en).toBeTruthy();
    expect(es.textContent).toBe("ES");
    expect(en.textContent).toBe("EN");
    expect(es.getAttribute("aria-label")).toBe("Español");
    expect(en.getAttribute("aria-label")).toBe("English");
    expect(screen.getByRole("button", { name: "Pretérito vs. imperfecto (bloqueado)" })).toBeTruthy();
    await awaitHome();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(es.getAttribute("aria-pressed")).toBe("true");
    expect(en.getAttribute("aria-pressed")).toBe("false");

    await user.click(en);
    await waitFor(() => {
      expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByTestId("lang-es").getAttribute("aria-pressed")).toBe("false");
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.uiLang).toBe("en");
      expect(prog.name).toBe("Dave");
      expect(prog.contentVersion).toBe(2);
    });
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.getByRole("button", { name: "Pretérito vs. imperfecto (blocked)" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: / \(bloqueado\)/ })).toBeNull();

    for (const tab of ["nav-misiones", "nav-lectura", "nav-practica", "nav-perfil"]) {
      await user.click(screen.getByTestId(tab));
      expect(screen.getByTestId("lang-toggle")).toBeTruthy();
      expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
    }
    expect(screen.getByText("Your profile")).toBeTruthy();
    expect(screen.getByTestId("perfil-lang-en").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("perfil-lang-es").getAttribute("aria-pressed")).toBe("false");

    cleanup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).uiLang).toBe("en");
      expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
    });
    const user2 = userEvent.setup();
    await user2.click(screen.getByTestId("nav-camino"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    assertHubFace("en");
    await user2.click(screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user2.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.getByTestId("lang-toggle")).toBeTruthy();
    expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
  });

  it("ES chrome locks Tarjetas and DUELO; Rayo stays ON/OFF", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    assertEqualHub();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Hola, Dave!|Español mexicano real: cuentos, misiones/);
    expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy();
    expect(screen.getByText("Coach del día")).toBeTruthy();
    expect(screen.getByText("Mentor de cuentos")).toBeTruthy();
    expect(screen.getByText("Coach de precisión")).toBeTruthy();
    expect(screen.getByText("Rival")).toBeTruthy();

    const rayo = screen.getByRole("button", { name: /Rayo/ });
    expect(rayo.textContent).toMatch(/OFF/);
    expect(rayo.textContent).not.toMatch(/SÍ|NO|ENCENDIDO|APAGADO/);
    expect(document.body.textContent).not.toMatch(/DIÁLOGO DUEL/);
    await user.click(screen.getByTestId("camino-more"));
    expect(screen.getByTestId("hub-flashcards").textContent).toBe("Tarjetas");
    expect(screen.getByTestId("hub-pins").textContent).toBe("Caza de pines");

    await user.click(screen.getByTestId("nav-misiones"));
    expect(screen.getByText("DUELO")).toBeTruthy();
    expect(screen.getAllByText("Duelo").length).toBeGreaterThan(0);
    expect(screen.queryByText("DIÁLOGO DUEL")).toBeNull();

    await user.click(screen.getByTestId("nav-practica"));
    expect(screen.getByRole("heading", { name: "Tarjetas" })).toBeTruthy();
    expect(screen.queryByText("Flashcards")).toBeNull();
    expect(document.body.textContent).toMatch(/Tarjetas/);
    expect(document.body.textContent).not.toMatch(/Flashcards|DIÁLOGO DUEL/);

    await user.click(screen.getByTestId("nav-camino"));
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Hola, Dave!|Luna ya tiene tu rutina/);
    const rayoEn = screen.getByRole("button", { name: /Lightning|Rayo/ });
    expect(rayoEn.textContent).toMatch(/OFF/);
    expect(rayoEn.textContent).not.toMatch(/SÍ|NO/);
  });

  it("Práctica weakness CTA and Perfil Luna CTA use Rutina diaria / Daily routine", async () => {
    cleanup();
    seedProgress({ weak: { Subjuntivo: 2 } });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    await openCaminoMore(user);
    const caminoDailyEs = screen.getByTestId("camino-daily-workout");
    expect(caminoDailyEs.textContent).toMatch(/Rutina diaria/);
    expect(caminoDailyEs.textContent).not.toMatch(/Daily workout/);
    await user.click(screen.getByTestId("nav-practica"));
    await waitFor(() => expect(screen.getByText("Mapa de debilidades")).toBeTruthy());
    const weaknessEs = screen.getByTestId("weakness-workout");
    expect(weaknessEs.textContent).toBe("Rutina diaria");
    expect(weaknessEs.textContent).not.toMatch(/Workout/);

    await user.click(screen.getByTestId("nav-perfil"));
    const lunaEs = screen.getByTestId("coach-cta-luna");
    expect(lunaEs.textContent).toMatch(/Rutina diaria/);
    expect(lunaEs.textContent).not.toMatch(/Workout/);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
    await user.click(screen.getByTestId("nav-practica"));
    await waitFor(() => expect(screen.getByText("Weakness map")).toBeTruthy());
    expect(screen.getByTestId("weakness-workout").textContent).toBe("Daily routine");
    await user.click(screen.getByTestId("nav-perfil"));
    expect(screen.getByTestId("coach-cta-luna").textContent).toMatch(/Daily routine/);
    expect(screen.getByTestId("coach-cta-luna").textContent).not.toMatch(/Workout diario/);
    await user.click(screen.getByTestId("nav-camino"));
    await openCaminoMore(user);
    expect(screen.getByTestId("camino-daily-workout").textContent).toMatch(/Daily routine/);
    expect(screen.getByTestId("camino-daily-workout").textContent).not.toMatch(/Daily workout|Workout done|Today's workout/);
  });

  it("Camino hero done-state is Rutina hecha / Routine done, not Workout done", async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    cleanup();
    seedProgress({ missions: { [`daily-${today}`]: true } });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("camino-more")).toBeTruthy());
    await openCaminoMore(user);
    const doneEs = screen.getByTestId("camino-daily-workout");
    expect(doneEs.textContent).toMatch(/Rutina hecha/);
    expect(doneEs.textContent).not.toMatch(/Workout|Rutina completada/);
    expect(doneEs.disabled).toBe(true);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
    const doneEn = screen.getByTestId("camino-daily-workout");
    expect(doneEn.textContent).toMatch(/Routine done/);
    expect(doneEn.textContent).not.toMatch(/Workout done|Workout complete|Today's workout|Daily workout/);
  });

  it("ES flashcard-done heading is ¡Terminaste las tarjetas!, not Deck", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await waitFor(() => expect(screen.getByTestId("flash-card")).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/¡Deck terminado!|¡Tarjetas listas!/);

    for (let i = 0; i < 16; i++) {
      if (screen.queryByTestId("flash-session-done")) break;
      if (screen.queryByTestId("flash-reveal")) {
        await user.click(screen.getByTestId("flash-reveal"));
      }
      await waitFor(() => expect(screen.getByTestId("flash-easy")).toBeTruthy());
      await user.click(screen.getByTestId("flash-easy"));
    }

    await waitFor(() => expect(screen.getByTestId("flash-session-done")).toBeTruthy());
    expect(screen.getByRole("heading", { name: "¡Terminaste las tarjetas!" })).toBeTruthy();
    expect(screen.queryByText(/¡Deck terminado!/)).toBeNull();
    expect(screen.queryByText(/¡Tarjetas listas!/)).toBeNull();
    expect(screen.getByTestId("flash-session-done").textContent).not.toMatch(/Deck/);
    expect(screen.getByTestId("flash-again")).toBeTruthy();

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByRole("heading", { name: "You finished the cards!" })).toBeTruthy();
    expect(screen.queryByText(/Deck complete!/)).toBeNull();
    expect(screen.getByTestId("flash-session-done").textContent).not.toMatch(/Deck/);
  });

  it("splash has only header ES|EN — no Español/English dump", async () => {
    localStorage.clear();
    seedColdFirstVisit();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lang-toggle")).toBeTruthy());
    expect(screen.getByText("¡ándale!")).toBeTruthy();
    expect(screen.getByTestId("lang-es").textContent).toBe("ES");
    expect(screen.getByTestId("lang-en").textContent).toBe("EN");
    expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
    expect([...document.querySelectorAll("button")].filter((b) =>
      b.textContent === "Español" || b.textContent === "English")).toHaveLength(0);
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").uiLang).toBe("en");
    expect(screen.getByPlaceholderText("What should we call you?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start!" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("¿Cómo te dicen?")).toBeTruthy();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").uiLang).toBe("es");
    });
    expect(screen.getByRole("button", { name: "¡Empezar!" })).toBeTruthy();
  });

  it("splash locks exact line + one primary CTA, no equal Saltar, cenzontle hero", async () => {
    localStorage.clear();
    seedColdFirstVisit();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    expect(FIRST_WIN_MINUTES).toBeNull();
    expect(screen.getByTestId("splash-line").textContent).toBe(splashPromiseLine("en"));
    expect(screen.getByTestId("splash-line").textContent).toBe("Real Mexican Spanish. Your first win starts here.");
    expect(splashPromiseLine("en", 5)).toBe("Real Mexican Spanish. Your first win takes 5 minutes.");
    expect(splashPromiseLine("es", 1)).toBe("Español mexicano real. Tu primer logro toma 1 minuto.");
    const line = screen.getByTestId("splash-line");
    const blocks = () => [...line.querySelectorAll("[data-testid='splash-sentence']")];
    expect(blocks()).toHaveLength(2);
    expect(blocks().every((el) => el.style.display === "block")).toBe(true);
    expect(blocks()[0].textContent).toBe(splashPromiseSentences("en")[0]);
    expect(blocks()[1].textContent).toBe(splashPromiseSentences("en")[1]);
    expect(line.textContent).toBe(`${blocks()[0].textContent} ${blocks()[1].textContent}`);
    expect(line.style.fontSize).toBe("16px");
    expect(line.style.fontWeight).toBe("600");
    expect(line.style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
    expect(line.style.textWrap).toBe("balance");
    expect(line.style.webkitLineClamp).toBe("2");
    expect(screen.getByTestId("splash").style.background).toMatch(/#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
    expect(screen.getByTestId("splash-hero").getAttribute("width")).toBe("168");
    expect(screen.getByTestId("splash-wordmark").style.fontWeight).toBe("900");
    expect(screen.getByTestId("splash-wordmark").style.color).toMatch(/#5C7356|rgb\(\s*92,\s*115,\s*86\s*\)/i);
    const name = screen.getByPlaceholderText("What should we call you?");
    expect(name.style.background).toMatch(/#FFFFFF|#fff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
    expect(name.style.borderRadius).toBe("16px");
    expect(name.style.border).toMatch(/2px solid (#848A72|rgb\(\s*132,\s*138,\s*114\s*\))/i);
    const header = screen.getByTestId("brand-home").parentElement.parentElement;
    expect(header.style.background).toMatch(/#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
    expect(header.style.borderBottomStyle).toBe("none");
    expect(screen.getByTestId("splash-start").textContent).toBe("Start!");
    expect(screen.queryByTestId("splash-skip")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
    expect(screen.getByTestId("splash-actions").querySelectorAll("button")).toHaveLength(1);
    expect(screen.getByTestId("splash-actions").textContent.trim()).toBe("Start!");
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Start! ?Skip/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/\bSkip\b/);
    expect(screen.getByTestId("splash-hero").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("splash").querySelector("img[src*='sma-']")).toBeNull();
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Subjuntivo/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Orden distinto|Different order, same meaning/);
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
    expect(screen.queryByRole("button", { name: /Let's go!/ })).toBeNull();

    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("splash-line").textContent).toBe("Español mexicano real. Tu primer logro empieza aquí."));
    expect(blocks()[0].textContent).toBe("Español mexicano real.");
    expect(blocks()[1].textContent).toBe("Tu primer logro empieza aquí.");
    expect(blocks().every((el) => el.style.display === "block")).toBe(true);
    expect(screen.getByTestId("splash-start").textContent).toBe("¡Empezar!");
    expect(screen.queryByTestId("splash-skip")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
    expect(screen.getByTestId("splash-actions").querySelectorAll("button")).toHaveLength(1);
    expect(screen.getByTestId("splash-actions").textContent.trim()).toBe("¡Empezar!");
    expect(screen.getByTestId("splash").textContent).not.toMatch(/¡Empezar! ?Saltar/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Saltar/);
    expect(screen.getByTestId("splash-hero").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Subjuntivo/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Orden distinto|Different order, same meaning/);
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
  });

  it("dark first-open uses the Lectura page, wordmark, promise, and name field", async () => {
    localStorage.clear();
    mockBrowser();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: "dark", uiLang: "en" }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash-line").textContent).toBe(splashPromiseLine("en")));
    const cream = /#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i;
    expect(screen.getByTestId("splash").style.background).toMatch(/#15171C|rgb\(\s*21,\s*23,\s*28\s*\)/i);
    expect(screen.getByTestId("splash-wordmark").style.color).toMatch(cream);
    expect(screen.getByTestId("splash-line").style.color).toMatch(/#CDBBA6|rgb\(\s*205,\s*187,\s*166\s*\)/i);
    const name = screen.getByPlaceholderText("What should we call you?");
    expect(name.style.background).toMatch(/#1E2128|rgb\(\s*30,\s*33,\s*40\s*\)/i);
    expect(name.style.border).toMatch(/2px solid (#2A2E36|rgb\(\s*42,\s*46,\s*54\s*\))/i);
    expect(name.style.color).toMatch(cream);
    const header = screen.getByTestId("brand-home").parentElement.parentElement;
    expect(header.style.background).toMatch(/#15171C|rgb\(\s*21,\s*23,\s*28\s*\)/i);
    expect(header.style.borderBottomStyle).toBe("none");
    expect(screen.getByTestId("splash-actions").querySelectorAll("button")).toHaveLength(1);
  });

  it("first boot with empty storage shows onboarding, not the subjunctive question", async () => {
    localStorage.clear();
    mockBrowser();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("level");
      expect(screen.queryByTestId("splash")).toBeNull();
    });
    expect(screen.getByTestId("onboarding-title").textContent).toBe(onboardingLine(onboardingCopy.levelTitle, "en"));
    expect(document.body.textContent).not.toMatch(/Es obvio que Marisol/);
    await waitFor(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const saved = JSON.parse(raw);
      expect(saved.welcomed).toBeFalsy();
      expect(saved.xp > 0).toBeFalsy();
      expect(saved.uiLang).toBe("en");
      expect(saved.onboardingPending).toBe(true);
    });
    expect(screen.getByTestId("onboarding")).toBeTruthy();
    expect(screen.queryByTestId("splash-start")).toBeNull();
  });

  it("leftover LIVE lesson does not skip first-visit splash", async () => {
    localStorage.clear();
    mockBrowser();
    seedColdFirstVisit();
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      session: {
        title: "Subjuntivo presente",
        unitId: "subj1",
        host: "luna",
        questions: [{ type: "mc", prompt: "x", choices: ["a"], answer: "a", shuffledChoices: ["a"] }],
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash-start")).toBeTruthy());
    expect(screen.getByTestId("splash-line").textContent).toBe("Real Mexican Spanish. Your first win starts here.");
    expect(screen.getByTestId("splash-start").textContent).toBe("Start!");
    expect(screen.queryByTestId("lesson-exit")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
  });

  it("Learn home is the v01b equal hub — no pitch card, no slash tails", async () => {
    const user = await boot();
    await awaitHome();
    assertEqualHub();
    expect(document.body.textContent).not.toMatch(/para quien ya pasó lo básico/);
    expect(document.body.textContent).not.toMatch(/cuentos, misiones, tarjetas y cuatro coaches/);
    expect(document.body.textContent).not.toMatch(/for people past the basics/);
    expect(document.body.textContent).not.toMatch(/stories, challenges, flashcards, and four coaches/);
    expect(["nav-camino", "nav-misiones", "nav-lectura", "nav-practica", "nav-perfil"].map((id) => screen.getByTestId(id).textContent.trim())).toEqual([
      "Camino", "Misiones", "Lectura", "Práctica", "Perfil",
    ]);
    expect(screen.queryByRole("button", { name: /^Home$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Library$/ })).toBeNull();

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
    assertEqualHub();
    expect(["nav-camino", "nav-misiones", "nav-lectura", "nav-practica", "nav-perfil"].map((id) => screen.getByTestId(id).textContent.trim())).toEqual([
      "Learn", "Challenges", "Stories", "Review", "Profile",
    ]);
    expect(screen.queryByRole("button", { name: /^Home$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Library$/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/para quien ya pasó lo básico/);
    expect(document.body.textContent).not.toMatch(/for people past the basics/);
    expect(screen.getByTestId("brand-home").textContent).toMatch(/ándale/);
    expect(screen.getByTestId("brand-home").querySelector("img")?.getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
  });

  const assertBrandLearnHome = () => {
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    assertEqualHub();
    expect(screen.getByTestId("hub-sendero").textContent).toMatch(/Sendero/);
    expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy();
    expect(screen.getByTestId("nav-camino").getAttribute("aria-current")).toBe("page");
    expect(screen.queryByTestId("splash")).toBeNull();
    expect(screen.queryByTestId("lesson-exit")).toBeNull();
    expect(screen.queryByText("¿Salir de la lección?")).toBeNull();
    expect(screen.queryByText("Leave the lesson?")).toBeNull();
    expect(screen.getAllByTestId("brand-home")).toHaveLength(1);
  };

  it("top-left brand from Lectura lands on Learn home, not Lectura", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("nav-lectura").getAttribute("aria-current")).toBe("page"));
    expect(screen.queryByTestId("learn-hub")).toBeNull();
    expect(screen.getByTestId("recuerdos-cenzontle")).toBeTruthy();
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
    expect(screen.queryByTestId("recuerdos-map")).toBeNull();
  });

  it("top-left brand from Perfil lands on Learn home, not Perfil", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-perfil"));
    await waitFor(() => expect(screen.getByText("Tu perfil")).toBeTruthy());
    expect(screen.queryByTestId("learn-hub")).toBeNull();
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
    expect(screen.queryByText("Tu perfil")).toBeNull();
  });

  it("top-left brand from Phrase Doctor lands on Learn home", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("hub-phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(screen.getByTestId("nav-practica").getAttribute("aria-current")).toBe("page");
    expect(screen.queryByTestId("learn-hub")).toBeNull();
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
    expect(screen.queryByTestId("phrase-doctor-board")).toBeNull();
  });

  it("top-left brand from a lesson lands on Learn home with no confirm", async () => {
    const user = await boot();
    await user.click(screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.queryByTestId("learn-hub")).toBeNull();
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
  });

  it("top-left brand from a Lectura story lands on Learn home, not Lectura", async () => {
    seedProgress({ stories: claimStories("story-9") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    expect(screen.queryByTestId("learn-hub")).toBeNull();
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
    expect(screen.queryByTestId("story-tip")).toBeNull();
    expect(screen.queryByTestId("recuerdos-map")).toBeNull();
  });

  it("top-left brand after paywall dismiss stays on Learn home", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertBrandLearnHome();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
  });

  it("Learn hub Games tile opens Games hub with Cubetas, Hangman, Jeopardy, and Memory", async () => {
    const user = await boot();
    await awaitHome();
    expect(screen.queryByTestId("hub-hangman")).toBeNull();
    expect(screen.queryByTestId("hub-jeopardy")).toBeNull();
    expect(screen.queryByTestId("hub-memory")).toBeNull();
    expect(screen.getByTestId("learn-hub-tiles").querySelectorAll("button")).toHaveLength(6);
    await user.click(screen.getByTestId("hub-games"));
    await waitFor(() => expect(screen.getByTestId("games-hub")).toBeTruthy());
    expect(screen.getByTestId("games-hub-title").textContent).toBe("Juegos");
    expect(screen.getByTestId("cubetas-start").textContent).toContain("Cubetas");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Ahorcado");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Palabras de México");
    expect(screen.getByTestId("hangman-start").textContent).not.toContain("Hangman");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Jeopardy");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Elige categoría, elige valor, responde.");
    expect(screen.getByTestId("memory-start").textContent).toContain("Memoria");
    expect(screen.getByTestId("memory-start").textContent).toContain("Pares mexicanos");
    expect(screen.getByTestId("memory-start").textContent).not.toContain("Memory");
    expect(screen.queryByTestId("cubetas-board")).toBeNull();
    expect(screen.queryByTestId("hangman-board")).toBeNull();
    expect(screen.queryByTestId("jeopardy-board")).toBeNull();
    expect(screen.queryByTestId("memory-board")).toBeNull();
    expect(document.body.textContent).not.toMatch(/AHORCADO \/ HANGMAN|JEOPARDY SOLO|MEMORIA \/ MEMORY/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hangman-start").textContent).toContain("Hangman"));
    expect(screen.getByTestId("hangman-start").textContent).toContain("Mexican words");
    expect(screen.getByTestId("hangman-start").textContent).not.toContain("Ahorcado");
    expect(screen.getByTestId("cubetas-start").textContent).toContain("Bucket fly");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Pick a category, pick a value, answer.");
    expect(screen.getByTestId("memory-start").textContent).toContain("Memory");
    expect(screen.getByTestId("memory-start").textContent).toContain("Mexican pairs");
    expect(screen.getByTestId("memory-start").textContent).not.toContain("Memoria");
    await user.click(screen.getByTestId("cubetas-start"));
    await waitFor(() => expect(screen.getByTestId("cubetas-board")).toBeTruthy());
    expect(screen.getByTestId("cubetas-title").textContent).toBe("Bucket fly");
    expect(screen.getByTestId("cubetas-chip").textContent).toBe("Ojalá que");
    expect(screen.getByTestId("cubetas-hint").textContent).toBe("Drag or tap the phrase into Subjunctive or Indicative.");
  });

  it("Hangman round: guess letters then Literal then Why", async () => {
    const user = await boot();
    await awaitHome();
    await user.click(screen.getByTestId("hub-games"));
    await waitFor(() => expect(screen.getByTestId("hangman-start")).toBeTruthy());
    await user.click(screen.getByTestId("hangman-start"));
    await waitFor(() => expect(screen.getByTestId("hangman-board")).toBeTruthy());
    expect(screen.getByTestId("hangman-title").textContent).toBe("Ahorcado");
    expect(screen.getByTestId("hangman-quiet").textContent).toBe("Palabras de México");
    expect(screen.getByTestId("hangman-howto").textContent).toBe("Adivina la palabra. Una letra a la vez.");
    expect(screen.getByTestId("hangman-board").getAttribute("data-timer")).toBe("off");
    expect(screen.getByTestId("hangman-mark")).toBeTruthy();
    expect(screen.getByTestId("accent-row")).toBeTruthy();
    expect(screen.getAllByTestId("accent-chip").map((el) => el.textContent).join("")).toBe("ÁÉÍÓÚÜ");
    expect(document.body.textContent).not.toMatch(/AHORCADO \/ HANGMAN|Hanged!|Got it!|💀/);
    expect(screen.queryByTestId("cubetas-cenzontle")).toBeNull();
    const playWord = screen.getByTestId("hangman-board").getAttribute("data-word");
    const slots = screen.getAllByTestId("hangman-slot");
    expect(slots.length).toBe([...playWord.normalize("NFC")].length);
    slots.forEach((el, i) => {
      expect(el.getAttribute("data-slot")).toBe(String(i));
      expect(el.getAttribute("data-key")).toBe(CHOICE_CHIP_KEYS[i]);
      expect(el.style.overflow).not.toBe("hidden");
      expect(el.style.textOverflow).not.toBe("ellipsis");
      expect(el.style.minWidth === "min-content" || el.style.minWidth === "28px").toBe(true);
      expect(el.style.width).toBe("max-content");
    });
    expect(screen.getAllByTestId("hangman-slot-key").map((el) => el.textContent).join("")).toBe(
      CHOICE_CHIP_KEYS.slice(0, slots.length).join(""),
    );
    expect(slots[0].getAttribute("data-focus")).toBe("on");
    await user.keyboard("3");
    await waitFor(() => expect(screen.getAllByTestId("hangman-slot")[2].getAttribute("data-focus")).toBe("on"));
    const missChip = [...screen.getAllByTestId("letter-chip")].find((el) => el.getAttribute("data-letter") === "W");
    if (missChip && screen.getByTestId("hangman-board").getAttribute("data-word").toLocaleUpperCase("es").indexOf("W") < 0) {
      await user.click(missChip);
      await waitFor(() => expect(screen.getByTestId("hangman-wrong").textContent).toBe("Esa no."));
      expect(screen.getByTestId("hangman-literal")).toBeTruthy();
      expect(screen.getByTestId("hangman-why")).toBeTruthy();
      expect(screen.getByTestId("hangman-why").textContent).toMatch(/^Por qué/);
      expect(screen.getByTestId("hangman-region-chip")).toBeTruthy();
      expect(screen.getByTestId("hangman-region-chip").textContent).toMatch(/^MX/);
      expect(screen.queryByTestId("hangman-why-toggle")).toBeNull();
    }
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hangman-howto").textContent).toBe("Guess the word. One letter at a time."));
    expect(screen.getByTestId("hangman-title").textContent).toBe("Hangman");
    expect(screen.getByTestId("hangman-quiet").textContent).toBe("Mexican words");
    const word = screen.getByTestId("hangman-board").getAttribute("data-word");
    const keys = [...new Set([...word.normalize("NFC")].map((ch) => ch.toLocaleUpperCase("es")))];
    const chips = [...screen.getAllByTestId("letter-chip"), ...screen.getAllByTestId("accent-chip")];
    for (const key of keys) {
      const chip = chips.find((el) => el.getAttribute("data-letter") === key);
      expect(chip).toBeTruthy();
      if (!chip.disabled) await user.click(chip);
    }
    await waitFor(() => expect(screen.getByTestId("hangman-literal")).toBeTruthy());
    expect(screen.getByTestId("hangman-win").textContent).toBe("That's it.");
    expect(screen.getByTestId("hangman-word").textContent).toBe(word);
    expect(screen.getByTestId("hangman-end").style.background).toMatch(/#EEF0E6|rgb\(\s*238,\s*240,\s*230\s*\)/i);
    expect(screen.getByTestId("hangman-end").style.borderTopWidth).toBe("2px");
    expect(screen.getByTestId("hangman-end").style.borderBottomWidth).toBe("4px");
    expect(screen.getByTestId("hangman-end").style.borderTopColor).toMatch(/#6F7757|rgb\(\s*111,\s*119,\s*87\s*\)/i);
    expect(screen.getByTestId("hangman-end").style.borderBottomColor).toMatch(/#6F7757|rgb\(\s*111,\s*119,\s*87\s*\)/i);
    expect(screen.getByTestId("hangman-again").style.background).toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    const literal = screen.getByTestId("hangman-literal");
    const why = screen.getByTestId("hangman-why");
    expect(literal.textContent).toMatch(/^Literal/);
    expect(why.textContent).toMatch(/^Why/);
    expect(literal.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId("hangman-howto")).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("hangman-win").textContent).toBe("¡Eso!"));
    expect(screen.getByTestId("hangman-literal").textContent).toMatch(/^Literal/);
    expect(screen.getByTestId("hangman-why").textContent).toMatch(/^Por qué/);
  });

  it("Hangman Why and region lines italicize starred words and drop the asterisks", async () => {
    const show = async (word, theme, uiLang = "en") => {
      cleanup();
      localStorage.clear();
      seedProgress({ uiLang, theme });
      localStorage.setItem(LIVE_KEY, JSON.stringify({
        screen: "ahorcado",
        tab: "practica",
        ahorcado: {
          word,
          letters: hangmanLetters(word),
          guessed: hangmanLetters(word),
          status: "win",
        },
      }));
      render(<App />);
      await waitFor(() => expect(screen.getByTestId("hangman-why")).toBeTruthy());
    };
    await show("morra", "light");
    const why = screen.getByTestId("hangman-why");
    expect(why.textContent).toContain("Pair morro for guys");
    expect(why.textContent).not.toMatch(/\*/);
    expect(why.querySelector("em")?.textContent).toBe("morro");
    await show("cruda", "dark");
    const note = screen.getByTestId("hangman-region-note");
    expect(note.textContent).toBe("ES/AR/CO resaca");
    expect(note.textContent).not.toMatch(/\*/);
    expect(note.querySelector("em")?.textContent).toBe("resaca");
    expect(screen.getByTestId("hangman-why").textContent).not.toMatch(/\*/);
    for (const row of HANGMAN_BANK) {
      for (const uiLang of ["en", "es"]) {
        await show(row.word, "light", uiLang);
        for (const id of ["hangman-literal", "hangman-why"]) {
          expect(screen.getByTestId(id).textContent, `${row.word} ${uiLang} ${id}`).not.toMatch(/\*/);
        }
        const region = screen.queryByTestId("hangman-region-note");
        if (region) expect(region.textContent, `${row.word} ${uiLang} region`).not.toMatch(/\*/);
      }
    }
    // 20 bank words × 2 langs plus the two seeded boots. CI already spends ~15s here.
  }, 40000);

  it("Jeopardy round: pick a tile, answer, return to the board", async () => {
    const user = await boot();
    await awaitHome();
    await user.click(screen.getByTestId("hub-games"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-start")).toBeTruthy());
    await user.click(screen.getByTestId("jeopardy-start"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-board")).toBeTruthy());
    expect(screen.getByTestId("jeopardy-title").textContent).toBe("Jeopardy");
    expect(screen.getByTestId("jeopardy-quiet").textContent).toBe("Elige categoría, elige valor, responde.");
    expect(screen.getByTestId("jeopardy-howto").textContent).toBe("Elige categoría, elige valor, responde.");
    expect(screen.getByTestId("jeopardy-mark")).toBeTruthy();
    expect(screen.getByTestId("jeopardy-answered").textContent).toBe("0/18");
    expect(screen.getByTestId("jeopardy-grid")).toBeTruthy();
    expect(screen.getByTestId("jeopardy-tile-subj-100")).toBeTruthy();
    const lightFill = (el) => `${el.style.backgroundColor} ${el.style.background}`;
    expect(lightFill(screen.getByTestId("jeopardy-cat-reg"))).toMatch(/#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
    expect(lightFill(screen.getByTestId("jeopardy-tile-subj-100"))).toMatch(/#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
    expect(lightFill(screen.getByTestId("jeopardy-back"))).toMatch(/#fff|#ffffff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
    expect(screen.getByTestId("jeopardy-cat-reg").textContent).toBe("Registro");
    expect(screen.getByTestId("jeopardy-cat-subj").textContent).toBe("Subjuntivo");
    expect(screen.getByTestId("jeopardy-cat-mex").textContent).toBe("México");
    ["subj", "past", "porpara", "mex", "pron", "reg"].forEach((id) => {
      const el = screen.getByTestId(`jeopardy-cat-${id}`);
      expect(el.textContent.length).toBeGreaterThan(0);
      expect(el.textContent).not.toMatch(/…|\.\.\.$/);
      expect(el.className).toMatch(/word-chip/);
      expect(el.style.overflow).not.toBe("hidden");
      expect(el.style.textOverflow).not.toBe("ellipsis");
      expect(el.style.wordBreak).toBe("keep-all");
      expect(el.style.width).toBe("max-content");
    });
    expect(screen.getByTestId("jeopardy-grid").style.overflow).not.toBe("hidden");
    expect(document.body.textContent).not.toMatch(/JEOPARDY SOLO|Reto Ándale \/ Jeopardy|Register and tone|Registe|and ton/);
    expect(screen.queryByTestId("cubetas-cenzontle")).toBeNull();
    expect(screen.queryByTestId("memory-start")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-howto").textContent).toBe("Pick a category, pick a value, answer."));
    expect(screen.getByTestId("jeopardy-quiet").textContent).toBe("Pick a category, pick a value, answer.");
    expect(screen.getByTestId("jeopardy-cat-reg").textContent).toBe("Register");
    expect(screen.getByTestId("jeopardy-cat-subj").textContent).toBe("Subjunctive");
    expect(screen.getByTestId("jeopardy-cat-mex").textContent).toBe("Mexico");
    expect(screen.getByTestId("jeopardy-cat-pron").textContent).toBe("Pronouns");
    expect(screen.getByTestId("jeopardy-cat-past").textContent).toBe("Past");
    expect(screen.getByTestId("jeopardy-cat-porpara").textContent).toBe("Por/para");
    await user.click(screen.getByTestId("jeopardy-tile-mex-100"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-prompt")).toBeTruthy());
    expect(screen.getByTestId("jeopardy-question").textContent.length).toBeGreaterThan(0);
    expect(screen.getByTestId("jeopardy-choice-0")).toBeTruthy();
    expect(screen.queryByTestId("jeopardy-howto")).toBeNull();
    await user.click(screen.getByTestId("jeopardy-choice-0"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-result")).toBeTruthy());
    expect(screen.getByTestId("jeopardy-continue")).toBeTruthy();
    expect(screen.getByTestId("jeopardy-why")).toBeTruthy();
    await user.click(screen.getByTestId("jeopardy-continue"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-grid")).toBeTruthy());
    expect(screen.getByTestId("jeopardy-answered").textContent).toBe("1/18");
    expect(screen.getByTestId("jeopardy-tile-mex-100").disabled).toBe(true);
    await user.click(screen.getByTestId("jeopardy-back"));
    await waitFor(() => expect(screen.getByTestId("games-hub")).toBeTruthy());
    expect(screen.getByTestId("jeopardy-start")).toBeTruthy();
    expect(screen.getByTestId("cubetas-start")).toBeTruthy();
    expect(screen.getByTestId("hangman-start")).toBeTruthy();
    expect(screen.getByTestId("memory-start")).toBeTruthy();
  });

  it("Memory pairs: tap match, drag-to-pair, full-word bubbles, ✕ back to Games", async () => {
    const user = await boot();
    await awaitHome();
    await user.click(screen.getByTestId("hub-games"));
    await waitFor(() => expect(screen.getByTestId("memory-start")).toBeTruthy());
    expect(screen.getByTestId("memory-start").textContent).toBeTruthy();
    expect(screen.getByTestId("memory-start").textContent).toContain("Memoria");
    expect(screen.getByTestId("memory-start").textContent).toContain("Pares mexicanos");
    await user.click(screen.getByTestId("memory-start"));
    await waitFor(() => expect(screen.getByTestId("memory-board")).toBeTruthy());
    expect(screen.getByTestId("memory-title").textContent).toBe("Memoria");
    expect(screen.getByTestId("memory-quiet").textContent).toBe("Pares mexicanos");
    expect(screen.getByTestId("memory-howto").textContent).toBe("Toca dos cartas o arrastra un par.");
    expect(screen.getByTestId("memory-mark")).toBeTruthy();
    expect(screen.getByTestId("memory-grid")).toBeTruthy();
    expect(screen.queryByTestId("cubetas-cenzontle")).toBeNull();
    expect(document.body.textContent).not.toMatch(/MEMORIA \/ MEMORY|Memory \/ Memoria/);
    const board = screen.getByTestId("memory-board");
    expect(board.className).toMatch(/memory-board/);
    expect(board.style.maxWidth).toBe("none");
    expect(board.style.width).toBe("100%");
    expect(board.style.margin).toBe("0px");
    expect(board.getAttribute("data-board-pad")).toBe("4");
    const cards = screen.getAllByTestId("memory-card");
    expect(cards.length).toBe(12);
    expect(screen.getByTestId("memory-grid").getAttribute("data-cols")).toBe("3");
    expect(screen.getByTestId("memory-grid").style.gridTemplateColumns).toContain("repeat(3");
    expect(screen.getByTestId("memory-grid").style.width).toBe("100%");
    expect(screen.getByTestId("memory-grid").style.maxWidth).toBe("none");
    cards.forEach((el) => {
      assertMemoryBoardCard(el);
      expect(["none", "100%"]).toContain(el.style.maxWidth);
    });
    const tapCard = cards[0];
    const tapPair = tapCard.getAttribute("data-pair");
    const tapKind = tapCard.getAttribute("data-kind");
    const tapMate = cards.find((el) => el.getAttribute("data-pair") === tapPair && el.getAttribute("data-kind") !== tapKind);
    expect(tapMate).toBeTruthy();
    await user.click(tapCard);
    await waitFor(() => expect(tapCard.getAttribute("data-face")).toBe("up"));
    const tapEntry = MEMORY_BANK.find((row) => row.word === tapPair);
    const tapWord = tapKind === "word" ? tapEntry.word : tapEntry.meaning.es;
    const tapGloss = tapKind === "word" ? tapEntry.meaning.es : tapEntry.word;
    expect(tapCard.querySelector("[data-testid='memory-card-word']").textContent).toBe(tapWord);
    expect(tapCard.querySelector("[data-testid='memory-card-gloss']").textContent).toBe(`(${tapGloss})`);
    expect(tapCard.getAttribute("aria-label")).toBe(`${tapWord} (${tapGloss})`);
    const stillDown = cards.find((el) => el !== tapCard && el.getAttribute("data-face") === "down");
    expect(stillDown.querySelector("[data-testid='memory-card-gloss']")).toBeNull();
    await user.click(tapMate);
    await waitFor(() => expect(screen.getByTestId("memory-teach")).toBeTruthy());
    expect(tapCard.getAttribute("data-face")).toBe("up");
    expect(tapMate.getAttribute("data-face")).toBe("up");
    expect(tapCard.getAttribute("data-open")).toBe("yes");
    expect(screen.getByTestId("memory-literal-why").textContent).toBe("Literal · Por qué");
    expect(screen.getByTestId("memory-why").textContent.length).toBeGreaterThan(0);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("memory-howto").textContent).toBe("Tap two cards or drag a pair."));
    expect(screen.getByTestId("memory-title").textContent).toBe("Memory");
    expect(screen.getByTestId("memory-quiet").textContent).toBe("Mexican pairs");
    expect(screen.getByTestId("memory-literal-why").textContent).toBe("Literal · Why");
    const live = screen.getAllByTestId("memory-card");
    const dragCard = live.find((el) => el.getAttribute("data-open") !== "yes");
    expect(dragCard).toBeTruthy();
    const dragPair = dragCard.getAttribute("data-pair");
    const dragKind = dragCard.getAttribute("data-kind");
    const dragMate = live.find((el) => el.getAttribute("data-pair") === dragPair && el.getAttribute("data-kind") !== dragKind);
    fireEvent.pointerDown(dragCard, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(dragMate, { clientX: 40, clientY: 40 });
    await waitFor(() => expect(dragCard.getAttribute("data-open")).toBe("yes"));
    expect(dragMate.getAttribute("data-open")).toBe("yes");
    expect(screen.getByTestId("memory-why").textContent.length).toBeGreaterThan(0);
    const closeBtn = screen.getByTestId("memory-board").querySelector("button[aria-label='Close']");
    expect(closeBtn).toBeTruthy();
    await user.click(closeBtn);
    await waitFor(() => expect(screen.getByTestId("games-hub")).toBeTruthy());
    expect(screen.getByTestId("memory-start")).toBeTruthy();
    expect(screen.getByTestId("cubetas-start")).toBeTruthy();
    expect(screen.getByTestId("hangman-start")).toBeTruthy();
    expect(screen.getByTestId("jeopardy-start")).toBeTruthy();
  });

  it("section test-out starts from Camino and fails closed after 3 misses (failKind === test)", async () => {
    const user = await boot();
    await user.click(screen.getAllByTitle(/Examen de la sección|Section test/)[0]);
    await waitFor(() => {
      expect(screen.getByTestId("lesson-exit")).toBeTruthy();
      expect(screen.getByText(/EXAMEN/)).toBeTruthy();
    });
    await user.click(screen.getByTestId("lesson-exit"));
    await user.click(screen.getByTestId("quit-without-save"));
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    cleanup();

    // Drive the fail-closed branch through the real next() path: restore a
    // test-out lesson already sitting on the 3rd miss, then tap Continuar.
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "wrong",
      qi: 0,
      lessonStats: { right: 0, wrong: 3 },
      failKind: "hearts",
      session: {
        title: "EXAMEN: Sección 1 · Intermedio",
        unitId: "_test",
        testOut: 0,
        host: "valeria",
        questions: [{ type: "mc", prompt: "x", choices: ["a"], answer: "a", shuffledChoices: ["a"] }],
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await userEvent.setup().click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Esta vez no|Not this time/ })).toBeTruthy());
    expect(screen.getByText(/Tres errores, y el límite es dos\. Quedaron en Repaso\. Reintenta cuando quieras\.|Three mistakes, and the limit is two\. They're saved in Review\. Retry when you're ready\./)).toBeTruthy();
  });

  it("Hoy still matches city/title or the still is dropped", async () => {
    await boot();
    await awaitHome();
    assertEqualHub();
    expect(screen.queryByTestId("hoy-still")).toBeNull();
  });

  it("buries empty level theater, weakness map, and Atajos until earned", async () => {
    localStorage.clear();
    seedColdFirstVisit();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lang-toggle")).toBeTruthy());
    await user.click(screen.getByTestId("splash-start"));
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.queryByTestId("atajos")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Atajos: 1–4/);
    expect(screen.queryByText("Principiante")).toBeNull();
    expect(screen.queryByTestId("level-theater")).toBeNull();
    expect(screen.getByTestId("hub-section-title").textContent).toMatch(/Intermedio|Intermediate/);

    await user.click(screen.getByTestId("nav-perfil"));
    expect(screen.queryByTestId("level-theater")).toBeNull();
    expect(screen.queryByText("Principiante")).toBeNull();
    expect(screen.queryByText("Intermedio")).toBeNull();
    expect(screen.queryByText("Intermediate")).toBeNull();

    await user.click(screen.getByTestId("nav-practica"));
    expect(screen.queryByTestId("weakness-map")).toBeNull();
    expect(screen.queryByText("Mapa de debilidades")).toBeNull();
    expect(screen.queryByText(/Todavía no hay patrones claros/)).toBeNull();
    expect(screen.getByTestId("practica-fold")).toBeTruthy();
    expect(screen.getByTestId("phrase-doctor")).toBeTruthy();
    expect(screen.getByTestId("safe-risky-start")).toBeTruthy();
    expect(screen.getByTestId("match-pairs-start")).toBeTruthy();

    cleanup();
    seedProgress({ xp: 50, done: { subj1: 1 }, weak: { Subjuntivo: 3 } });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.getByTestId("atajos").textContent).toBe("Luna, Don Rafa, Valeria y Diego te acompañan. Atajos: 1–4 · Enter");
    await userEvent.setup().click(screen.getByTestId("nav-perfil"));
    expect(screen.getByTestId("level-theater").textContent).toMatch(/Intermedio/);
    expect(screen.getByTestId("level-theater").textContent).not.toMatch(/Principiante|beginner/i);
    await userEvent.setup().click(screen.getByTestId("nav-practica"));
    expect(screen.getByTestId("weakness-map")).toBeTruthy();
    expect(screen.getByText("Mapa de debilidades")).toBeTruthy();
  });

  it("Perfil level is Intermedio / Intermediate, never Principiante or beginner", async () => {
    seedProgress({ xp: 50, streak: 1, done: { subj1: 1 } });
    const user = await boot();
    await user.click(screen.getByTestId("nav-perfil"));
    const theater = screen.getByTestId("level-theater");
    expect(theater.textContent).toMatch(/Intermedio/);
    expect(theater.textContent).not.toMatch(/Principiante|beginner/i);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("level-theater").textContent).toMatch(/Intermediate/));
    expect(screen.getByTestId("level-theater").textContent).not.toMatch(/Principiante|beginner/i);
    expect(screen.getByTestId("level-theater").textContent).not.toMatch(/Intermedio/);
  });

  it("cold-open defaults uiLang EN; user can flip ES; skill chips stay Spanish", async () => {
    localStorage.clear();
    seedColdFirstVisit();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("lang-es").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("splash-line").textContent).toBe("Real Mexican Spanish. Your first win starts here.");
    expect(screen.getByTestId("splash-start").textContent).toBe("Start!");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").uiLang).toBe("en");
    });
    await user.click(screen.getByTestId("splash-start"));
    await waitFor(() => expect(screen.queryByTestId("splash")).toBeNull());
    expect(screen.getByRole("button", { name: /Subjuntivo presente/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pretérito vs\. imperfecto/ })).toBeTruthy();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("lang-es").getAttribute("aria-pressed")).toBe("true"));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).uiLang).toBe("es");
    expect(screen.getByRole("button", { name: /Subjuntivo presente/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pretérito vs\. imperfecto/ })).toBeTruthy();
  });

  it("Práctica Smart Practice ES uses locked ronda, not sprint or tanda", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    const cta = screen.getByTestId("smart-practice-cta");
    const reason = screen.getByTestId("smart-practice-reason");
    expect(cta.textContent).toBe("Empezar ronda de 5 — sin vidas");
    expect(cta.textContent).not.toMatch(/sprint|tanda|útil/i);
    expect(reason.textContent).toBe("Tu siguiente ronda.");
    expect(reason.textContent).not.toMatch(/sprint|tanda|útil/i);
    expect(document.body.textContent).toMatch(/PRÁCTICA INTELIGENTE/);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("smart-practice-cta").textContent).toBe("Start 5-item sprint — no hearts"));
    expect(screen.getByTestId("smart-practice-reason").textContent).toBe("Chosen as your next useful sprint.");
    expect(screen.getByTestId("smart-practice-cta").textContent).not.toMatch(/ronda/i);
    expect(document.body.textContent).toMatch(/SMART PRACTICE/);
  });

  it("Phrase Doctor accepts listed formal equivalent before hard fail and shows the word-order tip", async () => {
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true });
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    const guess = screen.getByTestId("phrase-doctor-guess");
    await user.type(guess, "Me dará mucho gusto verlo/la.");
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("word-order-tip")).toBeTruthy());
    expect(screen.getByTestId("word-order-tip").textContent).toBe("Orden distinto, mismo sentido. En formal, ambas valen.");
    expect(screen.getByTestId("phrase-doctor-miss")).toBeTruthy();
    expect(screen.getByTestId("phrase-doctor-guess").value).toBe("Me dará mucho gusto verlo/la.");
    const boardHtml = screen.getByTestId("phrase-doctor-board").innerHTML;
    expect(boardHtml.indexOf("phrase-doctor-miss")).toBeGreaterThan(-1);
    expect(boardHtml.indexOf("word-order-tip")).toBeGreaterThan(boardHtml.indexOf("phrase-doctor-miss"));
    expect(screen.queryByTestId("phrase-doctor-fail")).toBeNull();
    expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/NATURAL/);
    expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/Tengo muchas ganas de verte/);
    expect(screen.queryByTestId("splash")).toBeNull();
    expect(screen.getByTestId("word-order-tip").closest("[data-testid=\"soft-paywall\"]")).toBeNull();
    expect(screen.getByTestId("word-order-tip").style.position).not.toBe("fixed");

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("word-order-tip").textContent).toBe("Different order, same meaning. Formally, both work."));

    const otra = [...screen.getByTestId("phrase-doctor-board").querySelectorAll("button")].find((b) => /Otra|New/.test(b.textContent));
    expect(otra).toBeTruthy();
    await user.click(otra);
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-guess")).toBeTruthy());
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
    await user.type(screen.getByTestId("phrase-doctor-guess"), "Puedo obtener un cafe por favor");
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-fail")).toBeTruthy());
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
    expect(screen.getByTestId("phrase-doctor-board").textContent).not.toMatch(/NATURAL/);
  });

  it("Práctica fold leads with Phrase Doctor, Safe-or-Risky, and Emparejar", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    const fold = screen.getByTestId("practica-fold");
    const ids = [...fold.querySelectorAll("[data-testid]")].map((el) => el.getAttribute("data-testid"));
    expect(ids.filter((id) => ["phrase-doctor", "safe-risky-start", "match-pairs-start", "cubetas-start", "hangman-start", "jeopardy-start", "memory-start"].includes(id)))
      .toEqual(["phrase-doctor", "safe-risky-start", "match-pairs-start", "cubetas-start", "hangman-start", "jeopardy-start", "memory-start"]);
    const html = document.body.innerHTML;
    const foldAt = html.indexOf('data-testid="practica-fold"');
    const smartAt = html.search(/PRÁCTICA INTELIGENTE|SMART PRACTICE/);
    const flashAt = html.indexOf("Tarjetas");
    expect(foldAt).toBeGreaterThan(-1);
    expect(smartAt).toBeGreaterThan(foldAt);
    expect(flashAt).toBeGreaterThan(foldAt);
    expect(screen.getByTestId("phrase-doctor").textContent).toMatch(/Doctora de frases|Phrase Doctor/);
    expect(screen.getByTestId("safe-risky-start").textContent).toMatch(/¿Seguro o riesgoso\?|Safe or Risky\?/);
    expect(screen.getByTestId("match-pairs-start").textContent).toMatch(/Emparejar|Match pairs/);
    expect(screen.getByTestId("match-play")).toBeTruthy();
    expect(screen.getByTestId("match-play").textContent).toMatch(/Match & play|Empareja y juega/);
    expect(screen.getByTestId("cubetas-start").textContent).toContain("Cubetas");
    expect(screen.getByTestId("cubetas-start").textContent).not.toContain("Bucket fly");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Ahorcado");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Palabras de México");
    expect(screen.getByTestId("hangman-start").textContent).not.toContain("Hangman");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Jeopardy");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Elige categoría, elige valor, responde.");
    expect(screen.getByTestId("memory-start").textContent).toContain("Memoria");
    expect(screen.getByTestId("memory-start").textContent).toContain("Pares mexicanos");
    expect(screen.getByTestId("memory-start").textContent).not.toContain("Memory");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("cubetas-start").textContent).toContain("Bucket fly"));
    expect(screen.getByTestId("cubetas-start").textContent).not.toContain("Cubetas");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Hangman");
    expect(screen.getByTestId("hangman-start").textContent).toContain("Mexican words");
    expect(screen.getByTestId("hangman-start").textContent).not.toContain("Ahorcado");
    expect(screen.getByTestId("jeopardy-start").textContent).toContain("Pick a category, pick a value, answer.");
    expect(screen.getByTestId("memory-start").textContent).toContain("Memory");
    expect(screen.getByTestId("memory-start").textContent).toContain("Mexican pairs");
    expect(screen.getByTestId("memory-start").textContent).not.toContain("Memoria");
  });

  it("Cubetas: one chip, two mood buckets, wrong returns, correct flies then Literal/Why", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("cubetas-start"));
    await waitFor(() => expect(screen.getByTestId("cubetas-board")).toBeTruthy());
    expect(screen.getByTestId("cubetas-title").textContent).toBe("Cubetas");
    expect(screen.getByTestId("cubetas-chip").textContent).toBe("Ojalá que");
    expect(screen.getByTestId("cubetas-hint").textContent).toBe("Arrastra o toca la frase en Subjuntivo o Indicativo.");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("cubetas-hint").textContent).toBe("Drag or tap the phrase into Subjunctive or Indicative."));
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("cubetas-hint").textContent).toBe("Arrastra o toca la frase en Subjuntivo o Indicativo."));
    expect(screen.getByTestId("cubetas-bucket-subjunctive").textContent).toBe("Subjuntivo");
    expect(screen.getByTestId("cubetas-bucket-indicative").textContent).toBe("Indicativo");
    expect(screen.getByTestId("cubetas-bucket-label-subjunctive").textContent).toBe("Subjuntivo");
    expect(screen.getByTestId("cubetas-bucket-label-indicative").textContent).toBe("Indicativo");
    expect(screen.queryByTestId("cubetas-bucket-trigger")).toBeNull();
    expect(screen.queryByTestId("cubetas-bucket-use")).toBeNull();
    expect(screen.getByTestId("cubetas-board").textContent).not.toMatch(/Trigger|Disparador|\bUso\b/);
    expect(screen.getByTestId("cubetas-cenzontle").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("cubetas-cenzontle").getAttribute("data-state")).toBe("offstage");
    expect(screen.getByTestId("cubetas-bucket-art-subjunctive").getAttribute("src")).toMatch(/cubetas\/bucket-subjunctive\.png/);
    expect(screen.getByTestId("cubetas-bucket-art-indicative").getAttribute("src")).toMatch(/cubetas\/bucket-indicative\.png/);
    expect(screen.getByTestId("cubetas-handle-subjunctive").style.width).toBe("64px");
    expect(screen.getByTestId("cubetas-handle-indicative").style.height).toBe("64px");
    expect(screen.getByTestId("cubetas-bucket-subjunctive").textContent).toBe("Subjuntivo");
    expect(screen.queryByTestId("cubetas-literal")).toBeNull();

    const cubetasChip = screen.getByTestId("cubetas-chip");
    expect(cubetasChip.className).toMatch(/word-chip/);
    expect(cubetasChip.style.overflow).toBe("visible");
    expect(cubetasChip.style.textOverflow).not.toBe("ellipsis");
    expect(cubetasChip.style.width).toBe("max-content");
    expect(cubetasChip.style.minWidth).toBe("min-content");
    expect(cubetasChip.style.maxWidth).toBe("100%");
    await user.click(screen.getByTestId("cubetas-bucket-indicative"));
    await waitFor(() => expect(screen.getByTestId("cubetas-chip").textContent).toBe("Ojalá que"));
    expect(screen.queryByTestId("cubetas-hint")).toBeNull();
    expect(screen.getByTestId("cubetas-cenzontle").getAttribute("data-state")).toBe("offstage");
    expect(screen.getByTestId("cubetas-wrong-teach")).toBeTruthy();
    expect(screen.getByTestId("cubetas-literal").textContent).toContain("Ojalá que");
    expect(screen.getByTestId("cubetas-why").textContent).toContain("Deseo");
    expect(screen.queryByTestId("cubetas-exception")).toBeNull();
    expect(screen.queryByTestId("cubetas-why-toggle")).toBeNull();
    expect(screen.getByTestId("cubetas-board").textContent).not.toMatch(/Mejor respuesta|Better answer|shame/i);

    await user.click(screen.getByTestId("cubetas-bucket-subjunctive"));
    await waitFor(() => expect(screen.queryByTestId("cubetas-chip")).toBeNull());
    const winBird = screen.getByTestId("cubetas-cenzontle");
    expect(winBird.getAttribute("data-state")).toBe("win");
    expect(winBird.getAttribute("width")).toBe("64");
    expect(winBird.className).toContain("cubetas-bird-win");
    expect(screen.getByTestId("cubetas-bucket-subjunctive").querySelector(".cubetas-bucket-win-glow")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("cubetas-literal")).toBeTruthy(), { timeout: 2000 });
    const literal = screen.getByTestId("cubetas-literal");
    const why = screen.getByTestId("cubetas-why");
    const next = screen.getByTestId("cubetas-next");
    expect(literal.textContent).toContain("Traducción");
    expect(literal.textContent).toContain("Ojalá que");
    expect(why.textContent).toContain("Por qué");
    expect(why.textContent).toContain("Deseo");
    expect(literal.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(why.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(next.textContent).toMatch(/Siguiente/i);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("cubetas-literal").textContent).toContain("Literal"));
    expect(screen.getByTestId("cubetas-why").textContent).toContain("Why");
    expect(screen.getByTestId("cubetas-why").textContent).toContain("Wish");
    expect(screen.getByTestId("cubetas-next").textContent).toMatch(/Next chip/i);
    expect(screen.getByTestId("cubetas-title").textContent).toBe("Bucket fly");
    expect(screen.getByTestId("cubetas-bucket-label-subjunctive").textContent).toBe("Subjunctive");
    expect(screen.getByTestId("cubetas-bucket-label-indicative").textContent).toBe("Indicative");
    expect(screen.getByTestId("cubetas-bucket-label-indicative").textContent).not.toMatch(/^Indicate$/);
    const enIndicative = screen.getByTestId("cubetas-bucket-label-indicative");
    expect(enIndicative.style.overflow).toBe("visible");
    expect(enIndicative.style.textOverflow).not.toBe("ellipsis");
    expect(enIndicative.style.whiteSpace).toBe("normal");
  });

  it("long Mexicanismos / long chips are not truncated", async () => {
    const longChip = OJALA_QUE_PACK.find((c) => c.id === "despues-de-que-past");
    expect(longChip.phrase).toBe("Después de que (past done)");
    seedProgress({ uiLang: "en" });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "cubetas",
      tab: "practica",
      cubetasGame: {
        packId: "ojala-que",
        hub: "match-play",
        feeds: "eighty-twenty",
        queue: [longChip],
        scored: [],
        status: "idle",
        lastBucket: null,
        gems: 0,
        xp: 0,
        awarded: false,
        hint: true,
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("cubetas-chip")).toBeTruthy());
    assertFullWordChip(screen.getByTestId("cubetas-chip"), "Después de que (past done)");
    expect(screen.getByTestId("cubetas-chip").className).toMatch(/word-chip--phrase/);

    cleanup();
    seedProgress({ uiLang: "en" });
    const apa = MEMORY_BANK.find((r) => r.word === "apapacho");
    const tian = MEMORY_BANK.find((r) => r.word === "tianguis");
    const morra = MEMORY_BANK.find((r) => r.word === "morra");
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "memory",
      tab: "practica",
      memoryGame: {
        packId: "mexicanismos-v1",
        hub: "games",
        pairs: [apa, tian, morra],
        cards: [
          { id: "apapacho-word", pairId: "apapacho", kind: "word" },
          { id: "apapacho-meaning", pairId: "apapacho", kind: "meaning" },
          { id: "tianguis-word", pairId: "tianguis", kind: "word" },
          { id: "tianguis-meaning", pairId: "tianguis", kind: "meaning" },
          { id: "morra-word", pairId: "morra", kind: "word" },
          { id: "morra-meaning", pairId: "morra", kind: "meaning" },
        ],
        faceUp: ["apapacho-word", "apapacho-meaning", "tianguis-word", "morra-meaning"],
        matched: [],
        lastMatch: null,
        miss: false,
        lastWrong: [],
        status: "play",
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("memory-board")).toBeTruthy());
    const cards = screen.getAllByTestId("memory-card");
    const byId = (id) => cards.find((el) => el.getAttribute("data-card") === id);
    expect(byId("apapacho-word").getAttribute("data-face")).toBe("up");
    assertMemoryBoardCard(byId("apapacho-word"), "apapacho");
    expect(byId("apapacho-word").querySelector("[data-testid='memory-card-gloss']").textContent).toBe("(warm hug)");
    assertMemoryBoardCard(byId("apapacho-meaning"), "warm hug");
    expect(byId("apapacho-meaning").querySelector("[data-testid='memory-card-gloss']").textContent).toBe("(apapacho)");
    assertMemoryBoardCard(byId("tianguis-word"), "tianguis");
    expect(byId("tianguis-word").querySelector("[data-testid='memory-card-gloss']").textContent).toBe("(street market)");
    assertMemoryBoardCard(byId("morra-meaning"), "girl, young woman");
    expect(byId("morra-meaning").querySelector("[data-testid='memory-card-gloss']").textContent).toBe("(morra)");
    expect(byId("tianguis-meaning").getAttribute("data-face")).toBe("down");
    expect(byId("tianguis-meaning").querySelector("[data-testid='memory-card-gloss']")).toBeNull();
    expect(byId("morra-word").getAttribute("data-face")).toBe("down");
    expect(byId("morra-word").querySelector("[data-testid='memory-card-gloss']")).toBeNull();
    expect(byId("apapacho-meaning").className).toMatch(/word-chip--phrase/);
    expect(byId("apapacho-word").style.fontSize).toBe(byId("apapacho-meaning").style.fontSize);
    const creamFace = /#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i;
    const whiteFace = /#fff|#ffffff|white|rgb\(\s*255,\s*255,\s*255\s*\)/i;
    const terracotta = /#C46B3A|rgb\(\s*196,\s*107,\s*58\s*\)/i;
    const lightInk = /#3C3C3C|rgb\(\s*60,\s*60,\s*60\s*\)/i;
    expect(byId("tianguis-meaning").style.background).toMatch(creamFace);
    expect(byId("tianguis-meaning").style.borderTopColor).toMatch(terracotta);
    expect(byId("tianguis-meaning").style.borderBottomColor).toMatch(terracotta);
    expect(byId("apapacho-word").style.background).toMatch(whiteFace);
    expect(byId("apapacho-word").style.color).toMatch(lightInk);
    expect(byId("apapacho-word").style.borderTopColor).toMatch(terracotta);
    expect(screen.getByTestId("memory-title").style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
    expect(screen.getByTestId("memory-mark").querySelectorAll("rect")[1].getAttribute("fill")).toBe("#5C7356");
    expect(screen.getByTestId("app-shell").style.background).toMatch(creamFace);

    cleanup();
    seedProgress({ uiLang: "en" });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "ahorcado",
      tab: "practica",
      ahorcado: {
        word: "tianguis",
        letters: hangmanLetters("tianguis"),
        guessed: [],
        status: "play",
        focus: 0,
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hangman-board")).toBeTruthy());
    expect(screen.getByTestId("hangman-board").getAttribute("data-word")).toBe("tianguis");
    const slots = screen.getAllByTestId("hangman-slot");
    expect(slots).toHaveLength(8);
    slots.forEach((el) => {
      expect(el.className).toMatch(/word-chip/);
      expect(el.style.overflow).not.toBe("hidden");
      expect(el.style.textOverflow).not.toBe("ellipsis");
      expect(el.style.width).toBe("max-content");
    });

    cleanup();
    seedProgress({ uiLang: "en" });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "ahorcado",
      tab: "practica",
      ahorcado: {
        word: "apapacho",
        letters: hangmanLetters("apapacho"),
        guessed: hangmanLetters("apapacho"),
        status: "win",
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hangman-word")).toBeTruthy());
    assertFullWordChip(screen.getByTestId("hangman-word"), "apapacho");

    cleanup();
    localStorage.removeItem(LIVE_KEY);
    seedProgress();
    const user = await boot();
    await user.click(screen.getByTestId("sobremesa-cta"));
    await waitFor(() => expect(screen.getAllByTestId("sobremesa-line-title").length).toBe(5));
    const titles = screen.getAllByTestId("sobremesa-line-title");
    expect(titles.map((el) => el.textContent)).toEqual(expect.arrayContaining([
      "Pretérito vs imperfecto",
      "Por vs para",
      "Ser vs estar",
      "Gatillos del subjuntivo",
      "Deja de empacar el inglés",
    ]));
    titles.forEach((el) => {
      expect(el.textContent).not.toMatch(ELLIPSIS_RE);
      expect(el.style.overflow).not.toBe("hidden");
      expect(el.style.textOverflow).not.toBe("ellipsis");
      expect(el.className).toMatch(/word-chip/);
    });
  });

  it("Memory dark theme follows the dark-game board and keeps light chrome off it", async () => {
    cleanup();
    seedProgress({ uiLang: "es", theme: "dark" });
    const combi = MEMORY_BANK.find((r) => r.word === "combi");
    const tian = MEMORY_BANK.find((r) => r.word === "tianguis");
    const elote = MEMORY_BANK.find((r) => r.word === "elote");
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "memory",
      tab: "practica",
      memoryGame: {
        packId: "mexicanismos-v1",
        hub: "games",
        pairs: [combi, tian, elote],
        cards: [
          { id: "combi-word", pairId: "combi", kind: "word" },
          { id: "combi-meaning", pairId: "combi", kind: "meaning" },
          { id: "tianguis-word", pairId: "tianguis", kind: "word" },
          { id: "tianguis-meaning", pairId: "tianguis", kind: "meaning" },
          { id: "elote-word", pairId: "elote", kind: "word" },
          { id: "elote-meaning", pairId: "elote", kind: "meaning" },
        ],
        faceUp: ["combi-word", "combi-meaning", "tianguis-word"],
        matched: ["combi"],
        lastMatch: "combi",
        miss: false,
        lastWrong: [],
        status: "play",
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("memory-board")).toBeTruthy());
    const page = /#15171C|rgb\(\s*21,\s*23,\s*28\s*\)/i;
    const card = /#1E2128|rgb\(\s*30,\s*33,\s*40\s*\)/i;
    const edge = /#252830|rgb\(\s*37,\s*40,\s*48\s*\)/i;
    const cream = /#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i;
    const gloss = /#A0A4AB|rgb\(\s*160,\s*164,\s*171\s*\)/i;
    const sage = /#677050|rgb\(\s*103,\s*112,\s*80\s*\)/i;
    const label = /#A0A4AB|rgb\(\s*160,\s*164,\s*171\s*\)/i;
    expect(screen.getByTestId("app-shell").style.background).toMatch(page);
    expect(document.body.style.background).toMatch(page);
    expect(screen.getByTestId("memory-board").style.background).toMatch(page);
    expect(screen.getByTestId("memory-title").style.color).toMatch(label);
    expect(screen.getByTestId("memory-quiet").style.color).toMatch(label);
    expect(screen.getByTestId("memory-matched").style.color).toMatch(label);
    expect(screen.getByTestId("memory-howto").style.color).toMatch(label);
    const cards = screen.getAllByTestId("memory-card");
    const byId = (id) => cards.find((el) => el.getAttribute("data-card") === id);
    const down = byId("elote-meaning");
    expect(down.getAttribute("data-face")).toBe("down");
    expect(down.style.background).toMatch(card);
    expect(down.style.borderTopColor).toMatch(edge);
    expect(down.style.borderBottomColor).toMatch(edge);
    expect(down.style.background).not.toMatch(cream);
    const downMark = down.querySelectorAll("rect");
    expect(downMark[0].getAttribute("fill")).toBe("#F6EFE4");
    expect(downMark[1].getAttribute("fill")).toBe("#B8C0A0");
    expect(downMark[1].getAttribute("stroke")).toBe("#F6EFE4");
    const openCard = byId("tianguis-word");
    expect(openCard.getAttribute("data-face")).toBe("up");
    expect(openCard.style.background).toMatch(card);
    expect(openCard.style.color).toMatch(cream);
    expect(openCard.querySelector("[data-testid='memory-card-gloss']").style.color).toMatch(gloss);
    expect(openCard.querySelector("[data-testid='memory-card-gloss']").style.fontSize).toBe("0.7em");
    const matchedCard = byId("combi-meaning");
    expect(matchedCard.style.background).toMatch(sage);
    expect(matchedCard.style.color).toMatch(cream);
    expect(matchedCard.querySelector("[data-testid='memory-card-word']").textContent).toBe("camioneta colectiva");
    const matchedGloss = matchedCard.querySelector("[data-testid='memory-card-gloss']");
    expect(matchedGloss.style.color).toMatch(cream);
    expect(matchedGloss.style.fontSize).toBe("0.7em");
    expect(contrastRatio(matchedGloss.style.color, matchedCard.style.background)).toBeGreaterThanOrEqual(4.5);
    expect(screen.getByTestId("memory-mark").querySelectorAll("rect")[1].getAttribute("fill")).toBe("#B8C0A0");
  });

  it("Safe/Risky hub reward is extra por racha / streak extra, not bonus", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    const reward = screen.getByTestId("safe-risky-reward");
    expect(reward.textContent).toBe("5 rondas · extra por racha · gemas");
    expect(reward.textContent).not.toMatch(/bonus/i);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("safe-risky-reward").textContent).toBe("5 rounds · streak extra · gems"));
    expect(screen.getByTestId("safe-risky-reward").textContent).not.toMatch(/bonus/i);
  });
});
