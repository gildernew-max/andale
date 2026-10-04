import { describe, expect, it } from "vitest";
import { StrictMode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { isBajioUnlockFlashDue, markBajioUnlockFlashDue } from "./recuerdos.js";
import { lettersForLayout } from "./letterBoard.js";
import { prevDayKey } from "./firstDoor.js";
import { isWhiteOrCreamFill } from "./spanishKeyboard.js";
import { SUBJ_FIVE, SUBJ_FIVE_LABEL } from "./subjFive.js";
import { SOBREMESA_FIVE, SOBREMESA_NAME, SOBREMESA_QUIET, SOBREMESA_SELL, sobremesaDeepen, sobremesaName, sobremesaTipText, sobremesaTips } from "./sobremesa.js";
import { startCubetasRun } from "./cubetas.js";
import { HANGMAN_BANK, startHangmanRun } from "./hangman.js";
import { startJeopardyRun } from "./jeopardy.js";
import { lecturaCliffhangers } from "./lecturaCliffhanger.js";
import {
  installFlowHooks,
  STORAGE_KEY,
  LIVE_KEY,
  seedProgress,
  mockBrowser,
  boot,
  awaitHome,
  CREAM_FILL,
  contrastRatio,
  assertCreamShell,
  assertHubFace,
  assertEqualHub,
  startHoyFromHub,
  firstSessionRoot,
  localToday,
  assertSoftPaywallAnnualPrimary,
  awaitSoftPaywallAfterFirstWin,
  awaitBajioFlashThenPaywall,
  assertNoWallBeforeLectura,
  openStory0,
  openCaminoMore,
  funnelOf,
} from "./flowsHarness.jsx";

installFlowHooks();

describe("simulated learner flows", { timeout: 15000 }, () => {
  const cssHex = (value) => {
    const s = String(value || "").trim().toLowerCase();
    const hex = s.match(/#([0-9a-f]{3,8})/);
    if (hex) {
      let h = hex[1];
      if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
      return `#${h.slice(0, 6)}`;
    }
    const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!rgb) return "";
    return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
  };
  const paintOf = (el) => ({
    fill: cssHex(el.style.backgroundColor) || cssHex(el.style.background),
    ink: cssHex(el.style.color),
  });
  const assertDarkControl = (el, label) => {
    const { fill, ink } = paintOf(el);
    expect(fill, `${label} fill`).toBeTruthy();
    expect(ink, `${label} ink`).toBeTruthy();
    expect(isWhiteOrCreamFill(fill), `${label} rendered a white or cream fill ${fill}`).toBe(false);
    expect(contrastRatio(ink, fill), `${label} ${ink} on ${fill}`).toBeGreaterThanOrEqual(4.5);
  };

  it("dark Completa la oración uses the brand chip plate, and lesson hooks stay findable", async () => {
    const typeQuestion = {
      type: "type",
      prompt: "Ojalá que no ___ mañana.",
      note: "(llover)",
      answers: ["llueva"],
      explain: "«Ojalá» siempre va con subjuntivo: llueva.",
      answerAid: {
        mode: "choices",
        tiles: [
          { id: "c0", w: "llueva" },
          { id: "c1", w: "llueve" },
          { id: "c2", w: "llover" },
        ],
      },
    };
    const lesson = (theme, extra = {}) => ({
      screen: "lesson",
      tab: "camino",
      qi: 0,
      status: "idle",
      selected: null,
      typed: "",
      typedTileIds: [],
      session: {
        title: "Subjuntivo presente",
        host: "luna",
        unitId: "subj1",
        color: "#58CC02",
        dark: "#46A302",
        questions: [typeQuestion],
      },
      ...extra,
    });
    const bootLesson = async (theme, extra) => {
      cleanup();
      localStorage.clear();
      mockBrowser();
      seedProgress({ theme, uiLang: "es", hearts: 5, welcomed: true, onboardingDone: true, firstSessionDone: true, paywallSeen: true });
      localStorage.setItem(LIVE_KEY, JSON.stringify(lesson(theme, extra)));
      render(<App />);
      await screen.findByText("Completa la oración");
    };
    const pair = (fg, bg) => contrastRatio(fg, bg);

    await bootLesson("dark");
    const card = screen.getByTestId("type-prompt");
    expect(cssHex(card.style.background)).toBe("#1e2128");
    expect(cssHex(card.style.color)).toBe("#f6efe4");
    expect(pair("#F6EFE4", "#1E2128")).toBeGreaterThanOrEqual(4.5);
    const note = screen.getByTestId("lesson-note");
    expect(note.textContent).toBe("(llover)");
    expect(cssHex(note.style.color)).toBe("#a0a4ab");
    expect(pair("#A0A4AB", "#1E2128")).toBeGreaterThanOrEqual(4.5);
    expect(Number(pair("#A0A4AB", "#1E2128").toFixed(2))).toBe(6.44);
    const input = document.querySelector("input.lesson-blank");
    expect(cssHex(input.style.background)).toBe("#252830");
    expect([...document.querySelectorAll("style")].some((el) => el.textContent.includes(".lesson-blank::placeholder{color:#A0A4AB;opacity:1}"))).toBe(true);
    expect(pair("#A0A4AB", "#252830")).toBeGreaterThanOrEqual(4.5);
    expect(Number(pair("#A0A4AB", "#252830").toFixed(2))).toBe(5.89);
    screen.getAllByTestId("bank-tile").forEach((tile) => {
      expect(paintOf(tile)).toMatchObject({ fill: "#252830", ink: "#f6efe4" });
      expect(cssHex(tile.style.borderTopColor)).toBe("#2a2e36");
    });
    expect(pair("#F6EFE4", "#252830")).toBeGreaterThanOrEqual(4.5);

    await bootLesson("dark", { typed: "llueve", typedTileIds: ["c1"] });
    const selected = screen.getAllByTestId("bank-tile").find((el) => el.textContent.trim() === "llueve");
    expect(paintOf(selected)).toMatchObject({ fill: "#1f3a1a", ink: "#58cc02" });
    expect(cssHex(selected.style.borderTopColor)).toBe("#58cc02");
    expect(pair("#58CC02", "#1F3A1A")).toBeGreaterThanOrEqual(4.5);
    expect(Number(pair("#58CC02", "#1F3A1A").toFixed(2))).toBe(5.99);
    const stillIdle = screen.getAllByTestId("bank-tile").find((el) => el.textContent.trim() === "llover");
    expect(paintOf(stillIdle)).toMatchObject({ fill: "#252830", ink: "#f6efe4" });

    await bootLesson("dark", { status: "wrong", typed: "llueve", typedTileIds: ["c1"], quip: { es: "Cerca.", en: "Close." } });
    const wrongChip = screen.getAllByTestId("bank-tile").find((el) => el.textContent.trim() === "llueve");
    expect(paintOf(wrongChip)).toMatchObject({ fill: "#3a1a1a", ink: "#ff6b6b" });
    expect(pair("#FF6B6B", "#3A1A1A")).toBeGreaterThanOrEqual(4.5);
    expect(Number(pair("#FF6B6B", "#3A1A1A").toFixed(2))).toBe(5.64);

    await bootLesson("light");
    expect(cssHex(screen.getByTestId("type-prompt").style.background)).toBe("#ffffff");
    expect(cssHex(screen.getByTestId("type-prompt").style.color)).toBe("#3c3c3c");
    expect(cssHex(document.querySelector("input.lesson-blank").style.background)).toBe("#f7f7f7");
    expect(document.querySelector("input.lesson-blank").style.color).toBe("");
    expect([...document.querySelectorAll("style")].some((el) => el.textContent.includes(".lesson-blank::placeholder"))).toBe(false);
    screen.getAllByTestId("bank-tile").forEach((tile) => {
      expect(paintOf(tile)).toMatchObject({ fill: "#ffffff", ink: "#2e7500" });
    });
    expect(cssHex(screen.getByTestId("lesson-note").style.color)).toBe("#6b6258");

    cleanup();
    localStorage.clear();
    mockBrowser();
    seedProgress({ theme: "dark", uiLang: "es", hearts: 5, welcomed: true });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      qi: 0,
      status: "wrong",
      selected: 0,
      session: {
        title: "Subjuntivo presente",
        host: "luna",
        unitId: "subj1",
        color: "#58CC02",
        dark: "#46A302",
        questions: [{
          type: "mc",
          prompt: "Espero que ___ a la fiesta.",
          choices: ["vienes", "vengas"],
          shuffledChoices: ["vienes", "vengas"],
          answer: "vengas",
          fixedChoices: true,
        }],
      },
    }));
    render(<App />);
    await screen.findByText("Elige la opción correcta");
    expect(screen.getByTestId("mc-option-0")).toBeTruthy();
    expect(screen.getByTestId("mc-option-1")).toBeTruthy();
    expect(screen.getByTestId("mc-option-wrong")).toBeTruthy();
    expect(screen.getAllByTestId("choice-card").length).toBe(2);

    cleanup();
    localStorage.clear();
    mockBrowser();
    seedProgress({ theme: "light", uiLang: "es", hearts: 5, welcomed: true });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      qi: 0,
      status: "idle",
      session: {
        title: "Parejas",
        host: "luna",
        unitId: "subj1",
        color: "#58CC02",
        dark: "#46A302",
        questions: [{
          type: "match",
          pairs: [["ojalá", "hopefully"]],
          left: [{ t: "ojalá", id: 0 }],
          right: [{ t: "hopefully", id: 0 }],
        }],
      },
    }));
    render(<App />);
    await screen.findByText("Une las parejas");
    expect(screen.getByTestId("match-tile-0").getAttribute("data-state")).toBe("idle");
    expect(screen.getByTestId("match-tile-1").getAttribute("data-state")).toBe("idle");
  });

  it("dark Jeopardy tiles, keyboard keys, and Games buttons stay off white and cream at 4.5:1", async () => {
    cleanup();
    seedProgress({ theme: "dark", uiLang: "en" });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(cssHex(screen.getByTestId("app-shell").style.background)).toBe("#15171c");
    await user.click(screen.getByTestId("hub-games"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-start")).toBeTruthy());
    await user.click(screen.getByTestId("jeopardy-start"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-grid")).toBeTruthy());
    ["subj", "past", "porpara", "mex", "pron", "reg"].forEach((id) => {
      assertDarkControl(screen.getByTestId(`jeopardy-cat-${id}`), `jeopardy-cat-${id}`);
    });
    screen.getAllByTestId(/^jeopardy-tile-/).forEach((tile) => {
      assertDarkControl(tile, tile.getAttribute("data-testid"));
    });
    assertDarkControl(screen.getByTestId("jeopardy-back"), "jeopardy games");
    await user.click(screen.getByTestId("jeopardy-tile-mex-100"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-choice-0")).toBeTruthy());
    await user.click(screen.getByTestId("jeopardy-choice-0"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-continue")).toBeTruthy());
    await user.click(screen.getByTestId("jeopardy-continue"));
    await waitFor(() => expect(screen.getByTestId("jeopardy-tile-mex-100").disabled).toBe(true));
    assertDarkControl(screen.getByTestId("jeopardy-tile-mex-100"), "used jeopardy tile");
    assertDarkControl(screen.getByTestId("jeopardy-tile-mex-200"), "open jeopardy tile");
    expect(paintOf(screen.getByTestId("jeopardy-tile-mex-100")).fill).toBe("#1e2128");
    expect(paintOf(screen.getByTestId("jeopardy-tile-mex-200")).fill).toBe("#1e2128");
    expect(paintOf(screen.getByTestId("jeopardy-tile-mex-100")).ink).toBe("#f6efe4");
    expect(paintOf(screen.getByTestId("jeopardy-cat-mex")).ink).toBe("#f6efe4");
    expect(paintOf(screen.getByTestId("jeopardy-back")).fill).toBe("#1e2128");
    expect(paintOf(screen.getByTestId("jeopardy-back")).ink).toBe("#f6efe4");

    await user.click(screen.getByTestId("jeopardy-back"));
    await waitFor(() => expect(screen.getByTestId("hangman-start")).toBeTruthy());
    await user.click(screen.getByTestId("hangman-start"));
    await waitFor(() => expect(screen.getByTestId("letter-board")).toBeTruthy());
    const keys = [...screen.getAllByTestId("letter-chip"), ...screen.getAllByTestId("accent-chip")];
    expect(keys.some((el) => el.getAttribute("data-letter") === "Ñ")).toBe(true);
    expect(paintOf(keys.find((el) => el.getAttribute("data-letter") === "Ñ")).fill).toBe("#1e2128");
    expect(paintOf(keys.find((el) => el.getAttribute("data-letter") === "Ñ")).ink).toBe("#f6efe4");
    expect(keys.filter((el) => el.getAttribute("data-testid") === "accent-chip").map((el) => el.textContent).join("")).toBe("ÁÉÍÓÚÜ");
    expect(paintOf(screen.getAllByTestId("accent-chip")[0]).fill).toBe("#1e2128");
    expect(paintOf(screen.getAllByTestId("accent-chip")[0]).ink).toBe("#f6efe4");
    keys.forEach((el) => assertDarkControl(el, `key ${el.getAttribute("data-letter")}`));
    const word = screen.getByTestId("hangman-board").getAttribute("data-word");
    const letters = [...new Set([...word.normalize("NFC")].map((ch) => ch.toLocaleUpperCase("es")))];
    const chipFor = (ch) => [...screen.getAllByTestId("letter-chip"), ...screen.getAllByTestId("accent-chip")]
      .find((el) => el.getAttribute("data-letter") === ch);
    expect(chipFor("W")).toBeTruthy();
    await user.click(chipFor("W"));
    await user.click(chipFor(letters[0]));
    await waitFor(() => expect(chipFor("W").getAttribute("data-state")).toBe("wrong"));
    expect(chipFor(letters[0]).getAttribute("data-state")).toBe("correct");
    expect(Number.parseInt(chipFor(letters[0]).style.fontWeight, 10)).toBeGreaterThanOrEqual(900);
    [...screen.getAllByTestId("letter-chip"), ...screen.getAllByTestId("accent-chip")].forEach((el) => {
      assertDarkControl(el, `played key ${el.getAttribute("data-letter")}`);
    });
    expect(paintOf(chipFor("W")).fill).toBe("#2a2e36");
    expect(paintOf(chipFor("W")).ink).toBe("#a0a4ab");
    expect(paintOf(chipFor(letters[0])).fill).toBe("#677050");
    expect(paintOf(chipFor(letters[0])).ink).toBe("#f6efe4");
    expect(contrastRatio("#A0A4AB", "#2A2E36")).toBeGreaterThanOrEqual(5.4);
    for (const ch of letters) {
      if (screen.queryAllByTestId("letter-chip").length + screen.queryAllByTestId("accent-chip").length === 0) break;
      const chip = chipFor(ch);
      if (chip && !chip.disabled) await user.click(chip);
    }
    await waitFor(() => expect(screen.getByTestId("hangman-back")).toBeTruthy());
    assertDarkControl(screen.getByTestId("hangman-back"), "hangman games");
    expect(paintOf(screen.getByTestId("hangman-back")).fill).toBe("#1e2128");
    expect(paintOf(screen.getByTestId("hangman-back")).ink).toBe("#f6efe4");
    const end = screen.getByTestId("hangman-end");
    expect(cssHex(end.style.background)).toBe("#1e2128");
    expect(end.style.border).toMatch(/2px solid/i);
    expect(cssHex(end.style.borderColor) || cssHex(end.style.border)).toBe("#677050");
    expect(cssHex(screen.getByTestId("hangman-win").style.color)).toBe("#e8e8ea");
    expect(cssHex(screen.getByTestId("hangman-word").style.color)).toBe("#e8e8ea");
    expect(cssHex(screen.getByTestId("hangman-literal").firstElementChild.style.color)).toBe("#a0a4ab");
    expect(cssHex(screen.getByTestId("hangman-again").style.background)).toBe("#58cc02");
    expect(screen.queryAllByTestId("letter-chip")).toHaveLength(0);
  });

  it("letter boards default to QWERTY with Ñ after L; ABC toggle persists", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("ahorcado-section-start"));
    await waitFor(() => expect(screen.getByTestId("letter-board")).toBeTruthy());
    expect(screen.getByTestId("letter-board").getAttribute("data-layout")).toBe("qwerty");
    const qwertyChips = screen.getAllByTestId("letter-chip");
    expect(qwertyChips.map((el) => el.textContent).join("")).toBe(lettersForLayout("qwerty").join(""));
    expect(qwertyChips.map((el) => el.textContent).join("")).toContain("LÑ");
    expect(screen.getByTestId("accent-row")).toBeTruthy();
    expect(screen.getAllByTestId("accent-chip").map((el) => el.textContent).join("")).toBe("ÁÉÍÓÚÜ");
    expect(screen.getByTestId("letter-layout-qwerty").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("letter-layout-abc").getAttribute("aria-pressed")).toBe("false");
    expect(document.body.textContent).not.toMatch(/switch to ABC|keyboard layout|elige el teclado|press QWERTY/i);
    const sageInk = /#4F5A36|rgb\(\s*79,\s*90,\s*54\s*\)/i;
    qwertyChips.forEach((chip) => {
      expect(chip.style.color).toMatch(sageInk);
      expect(chip.style.color).not.toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
      expect(chip.style.background).toMatch(/#fff|#ffffff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
      expect(Number.parseInt(chip.style.fontWeight, 10)).toBeGreaterThanOrEqual(800);
    });

    await user.click(screen.getByTestId("letter-layout-abc"));
    await waitFor(() => expect(screen.getByTestId("letter-board").getAttribute("data-layout")).toBe("abc"));
    const abcChips = screen.getAllByTestId("letter-chip");
    expect(abcChips.map((el) => el.textContent).join("")).toBe(lettersForLayout("abc").join(""));
    expect(abcChips.map((el) => el.textContent).join("")).toContain("NÑ");
    expect(screen.getByTestId("letter-layout-abc").getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).letterLayout).toBe("abc");
    });

    cleanup();
    localStorage.removeItem(LIVE_KEY);
    const user2 = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    await user2.click(screen.getByTestId("ahorcado-section-start"));
    await waitFor(() => expect(screen.getByTestId("letter-board")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("letter-board").getAttribute("data-layout")).toBe("abc"));
    expect(screen.getAllByTestId("letter-chip").map((el) => el.textContent).join("")).toBe(lettersForLayout("abc").join(""));
  });

  it("Learn hub one face — uiLang flip moves all six tiles, no salad", async () => {
    const user = await boot();
    assertHubFace("es");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-stories").textContent).toContain("Stories"));
    assertHubFace("en");
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("hub-stories").textContent).toContain("Cuentos"));
    assertHubFace("es");
  });

  it("Sendero opens Camino path; Hoy is the 10-min plan — George stamps", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("lang-es"));
    assertEqualHub();
    assertHubFace("es");
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("Plan de hoy");
    expect(screen.getByTestId("hub-sendero-quiet").textContent).toBe("Tu camino");
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Reglas del subjuntivo");
    expect(screen.getByTestId("eighty-twenty-cta")).toBeTruthy();
    expect(screen.queryByTestId("hub-sobremesa")).toBeNull();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("hub-hoy").style.border).toMatch(/58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.getByTestId("hub-sendero").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-sendero").style.border).toBe(screen.getByTestId("hub-stories").style.border);
    expect(screen.getByTestId("hub-sendero").style.border).toBe(screen.getByTestId("hub-games").style.border);

    await user.click(screen.getByTestId("hub-sendero"));
    await waitFor(() => expect(screen.getByTestId("path-sheet")).toBeTruthy());
    expect(screen.getByTestId("path-sheet").textContent).toMatch(/Subjuntivo presente/);
    expect(screen.getByRole("button", { name: /Empezar · \+XP|Start · \+XP/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Cerrar$|^Close$/ }));
    await waitFor(() => expect(screen.queryByTestId("path-sheet")).toBeNull());

    await user.click(screen.getByTestId("hub-hoy"));
    await waitFor(() => expect(screen.getByTestId("hoy-plan")).toBeTruthy());
    expect(screen.getByTestId("hoy-plan-eyebrow").textContent).toBe("HOY · ~10 MIN");
    expect(screen.getByTestId("hoy-plan-sell").textContent).toBe("Un plan corto para hoy. Unos diez minutos. Luego paras.");
    expect(screen.getByTestId("hoy-plan-step").textContent).toBe("Jugar la escena");
    expect(screen.getByTestId("hoy-plan-start").textContent).toBe("Empezar el plan");
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/Jugar la escena|Empezar el plan/);

    await user.click(screen.getByTestId("hoy-plan-close"));
    await waitFor(() => expect(screen.queryByTestId("hoy-plan")).toBeNull());
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("Today's plan"));
    assertHubFace("en");
    expect(screen.getByTestId("hub-sendero-quiet").textContent).toBe("Your path");
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Subjunctive rules");

    await user.click(screen.getByTestId("hub-hoy"));
    await waitFor(() => expect(screen.getByTestId("hoy-plan-eyebrow").textContent).toBe("TODAY · ~10 MIN"));
    expect(screen.getByTestId("hoy-plan-sell").textContent).toBe("A short plan for today. About ten minutes. Then you stop.");
    expect(screen.getByTestId("hoy-plan-step").textContent).toBe("Play the scene");
    expect(screen.getByTestId("hoy-plan-start").textContent).toBe("Start the plan");

    await user.click(screen.getByTestId("hoy-plan-start"));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const sceneChip = screen.getByTestId("lesson-scene-chip");
    expect(sceneChip.textContent.trim().length).toBeGreaterThan(8);
    expect(sceneChip.style.background).toMatch(/transparent|^$/);
    expect(`${sceneChip.style.border} ${sceneChip.style.borderColor} ${sceneChip.style.background}`).not.toMatch(/#FFC800|#FFC800|rgb\(\s*255,\s*200,\s*0\s*\)/i);
    expect(Number.parseInt(sceneChip.querySelector("div").style.fontSize, 10)).toBeLessThanOrEqual(12);
    expect(screen.getAllByTestId("choice-card").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("lesson-check")).toBeTruthy();
  });

  it("Learn first CTA is 80/20 Subjuntivo in five — George exact, no deck, no pep", async () => {
    const user = await boot();
    const cta = screen.getByTestId("eighty-twenty-cta");
    expect(cta).toBeTruthy();
    expect(screen.getByTestId("eighty-twenty-label").textContent).toBe(SUBJ_FIVE_LABEL);
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Reglas del subjuntivo");
    expect(screen.queryByTestId("eighty-twenty-sub")).toBeNull();
    expect(cta.closest("[data-testid='first-door-hero']")).toBeNull();
    const pathNode = screen.getByRole("button", { name: "Subjuntivo presente" });
    expect(cta.compareDocumentPosition(pathNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cta.querySelector("img")?.getAttribute("src")).toMatch(/hub\/eighty\.png/);
    expect(screen.queryByTestId("eighty-twenty-sheet")).toBeNull();

    await user.click(cta);
    await waitFor(() => expect(screen.getByTestId("eighty-twenty-sheet")).toBeTruthy());
    expect(screen.getAllByTestId("eighty-twenty-line").map((el) => el.textContent)).toEqual(SUBJ_FIVE.es);
    const sheet = screen.getByTestId("eighty-twenty-sheet");
    expect(sheet.querySelector("img")).toBeNull();
    expect(sheet.textContent).not.toMatch(/Deck|Practice this now|Practicar ahora|You've got this|¡Tú puedes|Master the/);
    expect(screen.queryByTestId("eighty-twenty-title")).toBeNull();

    await user.click(screen.getByTestId("eighty-twenty-close"));
    await waitFor(() => expect(screen.queryByTestId("eighty-twenty-sheet")).toBeNull());

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("eighty-twenty-label").textContent).toBe(SUBJ_FIVE_LABEL));
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Subjunctive rules");
    expect(screen.queryByTestId("eighty-twenty-sub")).toBeNull();

    await user.click(screen.getByTestId("eighty-twenty-cta"));
    await waitFor(() => expect(screen.getByTestId("eighty-twenty-sheet")).toBeTruthy());
    expect(screen.getAllByTestId("eighty-twenty-line").map((el) => el.textContent)).toEqual(SUBJ_FIVE.en);
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
  });

  it("Intermedio lane is the ROI5 entry — five first, tips behind, no seventh Learn tile", async () => {
    const user = await boot();
    expect(screen.queryByTestId("hub-sobremesa")).toBeNull();
    expect(screen.getByTestId("learn-hub-tiles").textContent).not.toMatch(/Sobremesa|Intermedio|Intermediate/);
    expect(screen.getByTestId("learn-hub-tiles").querySelectorAll("button")).toHaveLength(6);
    expect(screen.getByTestId("eighty-twenty-cta").textContent).toMatch(/80\/20/);
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Reglas del subjuntivo");
    expect(screen.getByTestId("eighty-twenty-cta").textContent).not.toMatch(/Sobremesa|Intermedio/);
    const lane = screen.getByTestId("intermedio-lane");
    const cta = screen.getByTestId("sobremesa-cta");
    expect(lane.contains(cta)).toBe(true);
    expect(screen.getByTestId("sobremesa-cta-label").textContent).toBe(sobremesaName("es"));
    expect(screen.getByTestId("hub-section-title").textContent).toBe(SOBREMESA_NAME.es);
    expect(screen.getByTestId("sobremesa-cta-quiet").textContent).toBe(SOBREMESA_QUIET.es);
    expect(screen.getByTestId("hub-section-quiet").textContent).toBe("Charla real");
    expect(screen.getByTestId("sobremesa-cta-sell").textContent).toBe(SOBREMESA_SELL.es);
    expect(screen.getByTestId("hub-section-sell").textContent).toBe(SOBREMESA_SELL.es);
    expect(cta.textContent).not.toMatch(/Club|80%|Sobremesa/);
    expect(lane.style.background).toMatch(CREAM_FILL);
    expect(lane.style.border).not.toMatch(/58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("hub-hoy").style.border).toMatch(/58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.queryByTestId("sobremesa-sheet")).toBeNull();

    await user.click(cta);
    await waitFor(() => expect(screen.getByTestId("sobremesa-sheet")).toBeTruthy());
    expect(screen.getByTestId("sobremesa-name").textContent).toBe(sobremesaName("es"));
    expect(screen.getByTestId("sobremesa-quiet").textContent).toBe(SOBREMESA_QUIET.es);
    expect(screen.getByTestId("sobremesa-sell").textContent).toBe(SOBREMESA_SELL.es);
    const five = screen.getByTestId("sobremesa-five");
    const tips = screen.getByTestId("sobremesa-tips");
    const deepen = screen.getByTestId("sobremesa-deepen");
    expect(five.compareDocumentPosition(tips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tips.compareDocumentPosition(deepen) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByTestId("sobremesa-line").map((el) => el.textContent)).toEqual(SOBREMESA_FIVE.es);
    screen.getAllByTestId("sobremesa-line").forEach((card) => {
      expect(card.style.background).toMatch(CREAM_FILL);
    });
    expect(screen.getByTestId("sobremesa-tips-summary").getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByTestId("sobremesa-deepen-summary").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("sobremesa-tips-list")).toBeNull();
    expect(screen.queryByTestId("sobremesa-tip")).toBeNull();
    expect(screen.queryByTestId("sobremesa-deepen-body")).toBeNull();
    expect(screen.queryByTestId("hub-sobremesa")).toBeNull();
    expect(screen.queryByTestId("eighty-twenty-sheet")).toBeNull();
    const sheet = screen.getByTestId("sobremesa-sheet");
    expect(screen.getByTestId("sobremesa-perch").getAttribute("src")).toMatch(/cenzontle\.png/);
    expect(sheet.querySelector(".cenzontle-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
    expect(sheet.textContent).not.toMatch(/Club|Practice this now|Practicar ahora|You've got this|Deck/);

    await user.click(screen.getByTestId("sobremesa-tips-summary"));
    await waitFor(() => expect(screen.getByTestId("sobremesa-tips-list")).toBeTruthy());
    expect(screen.getAllByTestId("sobremesa-tip").map((el) => el.textContent)).toEqual(
      sobremesaTips("es").map((tip) => sobremesaTipText(tip)),
    );
    expect(screen.getAllByTestId("sobremesa-tip").filter((el) => el.getAttribute("data-mexico") === "1").length).toBe(8);
    expect(screen.getAllByTestId("sobremesa-tip").some((el) => el.textContent.includes("🇲🇽"))).toBe(true);

    await user.click(screen.getByTestId("sobremesa-deepen-summary"));
    await waitFor(() => expect(screen.getByTestId("sobremesa-deepen-body")).toBeTruthy());
    expect(screen.getAllByTestId("sobremesa-deepen-line").map((el) => el.textContent)).toEqual([
      ...sobremesaDeepen("es").subjunctive,
      ...sobremesaDeepen("es").porpara,
    ]);

    await user.click(screen.getByTestId("sobremesa-close"));
    await waitFor(() => expect(screen.queryByTestId("sobremesa-sheet")).toBeNull());

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("sobremesa-cta-quiet").textContent).toBe(SOBREMESA_QUIET.en));
    expect(screen.getByTestId("sobremesa-cta-label").textContent).toBe(sobremesaName("en"));
    expect(screen.getByTestId("hub-section-title").textContent).toBe("Intermediate");
    expect(screen.getByTestId("hub-section-quiet").textContent).toBe("Real talk");
    expect(screen.getByTestId("sobremesa-cta-sell").textContent).toBe(SOBREMESA_SELL.en);
    expect(screen.getByTestId("hub-eighty-quiet").textContent).toBe("Subjunctive rules");
    await user.click(screen.getByTestId("sobremesa-cta"));
    await waitFor(() => expect(screen.getByTestId("sobremesa-sheet")).toBeTruthy());
    expect(screen.getByTestId("sobremesa-name").textContent).toBe(sobremesaName("en"));
    expect(screen.getByTestId("sobremesa-quiet").textContent).toBe(SOBREMESA_QUIET.en);
    expect(screen.getByTestId("sobremesa-sell").textContent).toBe(SOBREMESA_SELL.en);
    expect(screen.getAllByTestId("sobremesa-line").map((el) => el.textContent)).toEqual(SOBREMESA_FIVE.en);
    expect(screen.getByTestId("sobremesa-tips-summary").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("sobremesa-tips-list")).toBeNull();
    expect(screen.queryByTestId("hub-sobremesa")).toBeNull();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
  });

  it("locks one warm cream on Learn, Phrase Doctor, and Lectura shells", async () => {
    const user = await boot();
    assertCreamShell();
    expect(screen.getByTestId("learn-hub").style.background).toMatch(CREAM_FILL);
    [...screen.getByTestId("learn-hub-tiles").querySelectorAll("button")].forEach((tile) => {
      expect(tile.style.background).toMatch(CREAM_FILL);
    });

    await user.click(screen.getByTestId("hub-phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    assertCreamShell();

    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-map")).toBeTruthy());
    assertCreamShell();
  });

  it("timer-off chrome stays off Hoy, Lectura, Doctora, and untimed lessons", async () => {
    const user = await boot();
    expect(screen.queryByTestId("run-timer-toggle")).toBeNull();
    expect(screen.queryByTestId("run-timer-off-chip")).toBeNull();
    expect(screen.queryByTestId("rayo-clock")).toBeNull();

    await startHoyFromHub(user);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.queryByTestId("run-timer-toggle")).toBeNull();
    expect(screen.queryByTestId("run-timer-off-chip")).toBeNull();
    expect(screen.queryByTestId("rayo-clock")).toBeNull();
    await user.click(screen.getByTestId("lesson-exit"));
    await user.click(screen.getByTestId("quit-without-save"));
    await awaitHome();

    await user.click(screen.getByTestId("hub-phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(screen.queryByTestId("run-timer-toggle")).toBeNull();
    expect(screen.queryByTestId("rayo-clock")).toBeNull();

    await user.click(screen.getByTestId("nav-lectura"));
    const story0 = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(story0[story0.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    expect(screen.queryByTestId("run-timer-toggle")).toBeNull();
    expect(screen.queryByTestId("rayo-clock")).toBeNull();

    cleanup();
    localStorage.removeItem(LIVE_KEY);
    seedProgress({
      streak: 1,
      lastDay: localToday(),
      paywallSeen: true,
      hearts: 5,
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 0 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user2 = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    const unitBtn = screen.queryByRole("button", { name: "Subjuntivo presente" })
      || (await openCaminoMore(user2), screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user2.click(unitBtn);
    await user2.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.queryByTestId("run-timer-toggle")).toBeNull();
    expect(screen.queryByTestId("rayo-clock")).toBeNull();
  });

  it("timed challenge toggle off hides the clock + quiet chip; toggle on restores", async () => {
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: localToday(),
      paywallSeen: true,
      rayo: true,
      hearts: 5,
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 0 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    const unitBtn = screen.queryByRole("button", { name: "Subjuntivo presente" })
      || (await openCaminoMore(user), screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(unitBtn);
    await user.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("rayo-clock")).toBeTruthy());
    const toggle = screen.getByTestId("run-timer-toggle");
    expect(toggle.textContent).toBe("Con reloj");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.style.background).toMatch(/#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
    expect(toggle.style.borderBottom).not.toMatch(/[34]px/);
    expect(screen.queryByTestId("run-timer-off-chip")).toBeNull();
    expect(screen.getByTestId("rayo-clock").innerHTML).not.toMatch(/#FF4B4B|#FF6B6B|#EA2B2B/i);

    await user.click(toggle);
    await waitFor(() => expect(screen.queryByTestId("rayo-clock")).toBeNull());
    expect(screen.getByTestId("run-timer-toggle").textContent).toBe("Sin reloj");
    expect(screen.getByTestId("run-timer-toggle").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("run-timer-off-chip").textContent).toBe("Piensa. El reloj está apagado.");
    expect(screen.getByTestId("run-timer-off-chip").style.background).toMatch(/#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
    expect(screen.queryByTestId("practice-quip")).toBeNull();

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("run-timer-toggle").textContent).toBe("No timer"));
    expect(screen.getByTestId("run-timer-off-chip").textContent).toBe("Take your time. Timer’s off.");

    await user.click(screen.getByTestId("run-timer-toggle"));
    await waitFor(() => expect(screen.getByTestId("rayo-clock")).toBeTruthy());
    expect(screen.getByTestId("run-timer-toggle").textContent).toBe("Timer on");
    expect(screen.getByTestId("run-timer-toggle").getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByTestId("run-timer-off-chip")).toBeNull();
    expect(screen.getByTestId("rayo-clock").innerHTML).not.toMatch(/#FF4B4B|#FF6B6B|#EA2B2B/i);
  });

  it("long wrong listening answer stays on the at-rest footer in jsdom", async () => {
    const sentence = "El mesero nos trajo los platos calientes y después pidió la cuenta de la mesa.";
    expect(sentence.trim().split(/\s+/).length).toBeGreaterThanOrEqual(12);
    const prevW = window.innerWidth;
    const prevH = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 844 });
    try {
      cleanup();
      seedProgress({ uiLang: "en", hearts: 5, onboardingDone: true, firstSessionDone: true, theme: "light" });
      const filler = (i) => ({
        type: "mc",
        prompt: `filler ${i}`,
        choices: ["sí", "no"],
        answer: "sí",
        shuffledChoices: ["sí", "no"],
        _u: "mex",
        _i: i,
      });
      localStorage.setItem(LIVE_KEY, JSON.stringify({
        screen: "lesson",
        tab: "camino",
        status: "idle",
        qi: 4,
        typed: "",
        lessonStats: { right: 3, wrong: 0 },
        session: {
          title: "Sprint",
          unitId: "mex",
          host: "luna",
          questions: [filler(0), filler(1), filler(2), filler(3), {
            type: "listen",
            text: sentence,
            answers: [sentence],
            _u: "mex",
            _i: 4,
          }],
        },
      }));
      const user = userEvent.setup();
      render(<App />);
      const input = await screen.findByPlaceholderText("Write the full sentence…");
      input.focus();
      expect(document.activeElement).toBe(input);
      await user.type(input, "La mesera trajo platos frios y nunca pidio la cuenta de nadie");
      expect(document.activeElement).toBe(input);
      await user.keyboard("{Enter}");
      await waitFor(() => expect(screen.getByTestId("practice-quip")).toBeTruthy());

      const footer = screen.getByTestId("lesson-footer");
      expect(window.innerWidth).toBe(390);
      expect(window.innerHeight).toBe(844);
      // jsdom has no layout, so the footer stays on the at-rest row. The cap is proven in Chromium.
      expect(footer.getAttribute("data-capped")).toBe("0");
      expect(footer.style.position).toBe("fixed");
      expect(footer.style.bottom).toBe("0px");
      expect(footer.style.display).toBe("");
      expect(footer.style.overflow).toBe("");
      expect(footer.style.maxHeight).toBe("");
      expect(footer.className || "").not.toMatch(/lesson-footer-cap/);
      const css = [...document.querySelectorAll("style")].map((node) => node.textContent || "").join("\n");
      expect(css).toMatch(/\.lesson-footer-cap\s*\{[^}]*max-height:\s*60vh;\s*max-height:\s*60dvh;/);
      expect(screen.queryByTestId("lesson-footer-scroll")).toBeNull();
      expect(screen.queryByTestId("lesson-footer-actions")).toBeNull();
      const cont = screen.getByRole("button", { name: "Continue" });
      expect(footer.contains(cont)).toBe(true);
      const row = footer.firstElementChild;
      expect(row.contains(cont)).toBe(true);
      expect(row.style.display).toBe("flex");
      expect(row.style.alignItems).toBe("center");
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: prevW });
      Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: prevH });
    }
  });

  it("caps the lesson footer and blurs the field when the row is taller than 60vh", async () => {
    const proto = HTMLElement.prototype;
    const prev = Object.getOwnPropertyDescriptor(proto, "offsetHeight");
    Object.defineProperty(proto, "offsetHeight", { configurable: true, get() { return 900; } });
    const inputProto = HTMLInputElement.prototype;
    const prevBlur = inputProto.blur;
    const blurWhen = [];
    inputProto.blur = function blurSpy(...args) {
      blurWhen.push(document.querySelector("[data-testid='lesson-footer']")?.getAttribute("data-capped"));
      return prevBlur.apply(this, args);
    };
    try {
      cleanup();
      seedProgress({ uiLang: "en", hearts: 5, onboardingDone: true, firstSessionDone: true, theme: "light" });
      const sentence = "El mesero nos trajo los platos calientes y después pidió la cuenta de la mesa.";
      localStorage.setItem(LIVE_KEY, JSON.stringify({
        screen: "lesson",
        tab: "camino",
        status: "idle",
        qi: 0,
        typed: "",
        lessonStats: { right: 0, wrong: 0 },
        session: {
          title: "Sprint",
          unitId: "mex",
          host: "luna",
          questions: [{ type: "listen", text: sentence, answers: [sentence], _u: "mex", _i: 0 }],
        },
      }));
      const user = userEvent.setup();
      render(<App />);
      const input = await screen.findByPlaceholderText("Write the full sentence…");
      input.focus();
      await user.type(input, "La mesera trajo platos frios");
      await user.keyboard("{Enter}");
      const footer = await screen.findByTestId("lesson-footer");
      await waitFor(() => expect(footer.getAttribute("data-capped")).toBe("1"));
      expect(footer.className).toMatch(/lesson-footer-cap/);
      expect(screen.getByTestId("lesson-footer-scroll").contains(screen.getByTestId("practice-quip"))).toBe(true);
      expect(screen.getByTestId("lesson-footer-actions").contains(screen.getByRole("button", { name: "Continue" }))).toBe(true);
      expect(blurWhen).toContain("1");
    } finally {
      inputProto.blur = prevBlur;
      if (prev) Object.defineProperty(proto, "offsetHeight", prev);
    }
  });

  it("Safe/Risky wrong answer keeps Continue in the capped footer", async () => {
    const prevW = window.innerWidth;
    const prevH = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 844 });
    try {
      cleanup();
      seedProgress({ uiLang: "en", hearts: 5, onboardingDone: true, firstSessionDone: true, theme: "light" });
      const item = {
        phrase: "Quedo a sus órdenes.",
        context: { es: "Cierras un correo con una clienta.", en: "You are closing an email to a client." },
        answer: "formal",
        answers: ["formal"],
        literal: { es: "Quedo bajo sus órdenes.", en: "I remain under your orders." },
        note: { es: "En tono suave: estoy a su disposición. Cierre profesional mexicano — amable, claro, seguro en correo con clientas.", en: "Soft English: I’m at your service. Mexican professional close — warm, clear, safe for a client email." },
      };
      localStorage.setItem(LIVE_KEY, JSON.stringify({
        screen: "safeRisky",
        tab: "practica",
        safeGame: {
          items: [item],
          idx: 0,
          score: 0,
          streak: 0,
          bestStreak: 0,
          selected: "safe",
          tapped: [],
          tappedWrong: ["safe"],
          done: false,
          awarded: false,
        },
      }));
      render(<App />);
      await waitFor(() => expect(screen.getByTestId("safe-risky-continue")).toBeTruthy());
      expect(screen.getByText(/Better answer: Formal/)).toBeTruthy();
      expect(screen.queryByTestId("safe-risky-remaining")).toBeNull();
      expect(window.innerWidth).toBe(390);
      expect(window.innerHeight).toBe(844);

      const footer = screen.getByTestId("safe-risky-feedback");
      // jsdom's 0×0 layout takes the pinned branch. This checks containment, not a real viewport.
      expect(footer.className).toMatch(/lesson-footer-cap/);
      expect(footer.style.display).toBe("flex");
      expect(footer.style.flexDirection).toBe("column");
      expect(footer.style.overflow).toBe("hidden");
      expect(footer.style.maxHeight).toMatch(/60(d)?vh/);
      expect(footer.style.position).toBe("fixed");
      expect(footer.style.bottom).toBe("0px");
      const css = [...document.querySelectorAll("style")].map((node) => node.textContent || "").join("\n");
      expect(css).toMatch(/\.lesson-footer-cap\s*\{[^}]*max-height:\s*60vh;\s*max-height:\s*60dvh;/);
      const scroll = screen.getByTestId("safe-risky-feedback-scroll");
      expect(scroll.style.overflowY).toBe("auto");
      const actions = screen.getByTestId("safe-risky-feedback-actions");
      const cont = screen.getByTestId("safe-risky-continue");
      expect(actions.contains(cont)).toBe(true);
      expect(scroll.contains(cont)).toBe(false);
      expect(scroll.contains(screen.getByTestId("safe-risky-why"))).toBe(true);
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: prevW });
      Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: prevH });
    }
  });

  it("Safe/Risky Continue is CHECK green after a right answer and today's red after a wrong one", async () => {
    const normColor = (value) => {
      const s = String(value || "").trim().toLowerCase();
      const hex = s.match(/#([0-9a-f]{3,8})/);
      if (hex) {
        let h = hex[1];
        if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
        return `#${h.slice(0, 6)}`;
      }
      const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (!rgb) return "";
      return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
    };
    const continuePaint = (el) => {
      const computed = getComputedStyle(el);
      return {
        fill: normColor(el.style.background) || normColor(el.style.backgroundColor) || normColor(computed.backgroundColor),
        ink: normColor(el.style.color) || normColor(computed.color),
        lip: normColor(el.style.borderBottom) || normColor(computed.borderBottomColor),
        computedFill: normColor(computed.backgroundColor),
        computedInk: normColor(computed.color),
      };
    };
    const item = {
      phrase: "Quedo a sus órdenes.",
      context: { es: "Cierras un correo con una clienta.", en: "You are closing an email to a client." },
      answer: "formal",
      answers: ["formal"],
      literal: { es: "Quedo bajo sus órdenes.", en: "I remain under your orders." },
      note: { es: "Cierre profesional.", en: "A professional close." },
    };
    const show = async (theme, game) => {
      cleanup();
      seedProgress({ uiLang: "en", hearts: 5, onboardingDone: true, firstSessionDone: true, theme, paywallSeen: true });
      localStorage.setItem(LIVE_KEY, JSON.stringify({
        screen: "safeRisky",
        tab: "practica",
        safeGame: {
          items: [item],
          idx: 0,
          score: 0,
          streak: 0,
          bestStreak: 0,
          done: false,
          awarded: false,
          ...game,
        },
      }));
      render(<App />);
      const shellBg = theme === "dark" ? "#15171c" : "#f6efe4";
      await waitFor(() => expect(normColor(screen.getByTestId("app-shell").style.background)).toBe(shellBg));
      return screen.findByTestId("safe-risky-continue");
    };
    const GREEN = "#58cc02";
    const GREEN_DARK = "#46a302";
    const WHITE = "#ffffff";
    const RED_LIGHT = "#ff4b4b";
    const RED_DARK = "#ff6b6b";
    const RED_LIP = "#ea2b2b";
    const right = { selected: "formal", tapped: ["formal"], tappedWrong: [] };
    const wrong = { selected: "safe", tapped: [], tappedWrong: ["safe"] };

    for (const theme of ["light", "dark"]) {
      const hit = await show(theme, right);
      expect(document.body.textContent).toMatch(/Good judgment/);
      const hitPaint = continuePaint(hit);
      expect(hitPaint.fill, `${theme} right fill`).toBe(GREEN);
      expect(hitPaint.ink, `${theme} right ink`).toBe(WHITE);
      expect(hitPaint.lip, `${theme} right lip`).toBe(GREEN_DARK);
      if (hitPaint.computedFill) expect(hitPaint.computedFill, `${theme} right computed fill`).toBe(GREEN);
      if (hitPaint.computedInk) expect(hitPaint.computedInk, `${theme} right computed ink`).toBe(WHITE);

      const miss = await show(theme, wrong);
      expect(document.body.textContent).toMatch(/Better answer/);
      const missPaint = continuePaint(miss);
      expect(missPaint.fill, `${theme} wrong fill`).toBe(theme === "dark" ? RED_DARK : RED_LIGHT);
      expect(missPaint.ink, `${theme} wrong ink`).toBe(WHITE);
      expect(missPaint.lip, `${theme} wrong lip`).toBe(RED_LIP);
      if (missPaint.computedFill) expect(missPaint.computedFill, `${theme} wrong computed fill`).toBe(theme === "dark" ? RED_DARK : RED_LIGHT);
      if (missPaint.computedInk) expect(missPaint.computedInk, `${theme} wrong computed ink`).toBe(WHITE);
    }
  });

  it("drops the extra bottom padding when a pinned feedback card unmounts", async () => {
    const user = userEvent.setup();
    const chip = {
      id: "ojala-que", phrase: "Ojalá que", bucket: "subjunctive",
      literal: { es: "Ojalá que", en: "Ojalá que" },
      why: { es: "Deseo", en: "Wish" },
      exception: false,
    };
    const formal = {
      phrase: "Quedo a sus órdenes.",
      context: { es: "Cierras un correo con una clienta.", en: "You are closing an email to a client." },
      answer: "formal", answers: ["formal"],
      literal: { es: "Quedo bajo sus órdenes.", en: "I remain under your orders." },
      note: { es: "Cierre profesional.", en: "A professional close." },
    };
    const nextPhrase = {
      phrase: "Buenos días.",
      context: { es: "Saludas.", en: "You greet someone." },
      answer: "safe", answers: ["safe"],
      literal: { es: "Buenos días.", en: "Good morning." },
      note: { es: "Saludo.", en: "A greeting." },
    };
    const cases = [
      {
        board: "safe-risky-board",
        card: "safe-risky-feedback",
        dismiss: "safe-risky-continue",
        rest: "22px 20px 130px",
        live: {
          screen: "safeRisky", tab: "practica",
          safeGame: {
            items: [formal, nextPhrase], idx: 0, score: 0, streak: 0, bestStreak: 0,
            selected: "safe", tapped: [], tappedWrong: ["safe"], done: false, awarded: false,
          },
        },
      },
      {
        board: "snakes-board",
        card: "snakes-feedback",
        dismissText: /^continue$/i,
        rest: "22px 14px 130px",
        live: {
          screen: "snakes", tab: "practica",
          snakeGame: {
            tile: 3, pendingTile: 5, finalTile: 5, roll: 2, turn: 1,
            status: "correct", done: false, awarded: false, correct: 1, wrong: 0, ladders: 0, slides: 0,
            selected: "Hola", link: null,
            focus: { host: "luna", title: { es: "Vocab", en: "Vocab" } },
            questions: [{ type: "mc", prompt: "Hi", answer: "Hola", choices: ["Hola", "Adiós"], explain: "Hi." }],
            question: { prompt: "Hi", answer: "Hola", choices: ["Hola", "Adiós"], explain: "Hi.", skill: "vocab" },
          },
        },
      },
      {
        board: "cubetas-board",
        card: "cubetas-reveal",
        dismiss: "cubetas-next",
        rest: "22px 20px 40px",
        live: {
          screen: "cubetas", tab: "practica",
          cubetasGame: {
            packId: "ojala-que", status: "reveal", hint: false, lastBucket: "subjunctive",
            gems: 1, xp: 0, awarded: false,
            queue: [{ ...chip, id: "cuando", phrase: "Cuando", bucket: "indicative" }],
            scored: [chip],
          },
        },
      },
      {
        board: "hangman-board",
        card: "hangman-end",
        dismiss: "hangman-again",
        rest: "22px 20px 40px",
        live: {
          screen: "ahorcado", tab: "practica",
          ahorcado: { word: "gacho", status: "win", guessed: ["g", "a", "c", "h", "o"], awarded: true },
        },
      },
      {
        board: "jeopardy-board",
        card: "jeopardy-result",
        dismiss: "jeopardy-continue",
        rest: "22px 20px 40px",
        live: {
          screen: "jeopardy", tab: "practica",
          jeopardy: {
            score: 100, status: "correct", selected: "Hola", complete: false, awarded: false,
            active: {
              prompt: "Hi", answer: "Hola", choices: ["Hola", "Adiós"], value: 100, stake: 100,
              explain: "Hi.", double: false,
              focus: { title: { es: "Vocab", en: "Vocab" }, desc: { es: "Vocab", en: "Vocab" } },
            },
          },
        },
      },
      {
        board: "memory-board",
        card: "memory-end",
        dismiss: "memory-again",
        rest: "12px 4px 28px",
        live: {
          screen: "memory", tab: "practica",
          memoryGame: {
            pairs: [{ word: "gacho" }],
            cards: [
              { id: "gacho-word", pairId: "gacho", kind: "word" },
              { id: "gacho-meaning", pairId: "gacho", kind: "meaning" },
            ],
            matched: ["gacho"], status: "done", faceUp: [], awarded: true,
          },
        },
      },
    ];
    for (const spec of cases) {
      cleanup();
      seedProgress({ uiLang: "en", hearts: 5, onboardingDone: true, firstSessionDone: true, theme: "light", paywallSeen: true });
      localStorage.setItem(LIVE_KEY, JSON.stringify(spec.live));
      render(<App />);
      const board = await screen.findByTestId(spec.board);
      await waitFor(() => expect(screen.getByTestId(spec.card).getAttribute("data-pinned")).toBe("1"));
      await waitFor(() => expect(board.style.paddingBottom).toMatch(/240px/));
      const button = spec.dismiss
        ? screen.getByTestId(spec.dismiss)
        : screen.getByRole("button", { name: spec.dismissText });
      await user.click(button);
      await waitFor(() => expect(screen.queryByTestId(spec.card)).toBeNull());
      expect(screen.getByTestId(spec.board).style.padding).toBe(spec.rest);
    }
  });

  it("keeps Safe/Risky pinned padding under StrictMode until the card unmounts", async () => {
    cleanup();
    seedProgress({ uiLang: "en", hearts: 5, onboardingDone: true, firstSessionDone: true, theme: "light", paywallSeen: true });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "safeRisky", tab: "practica",
      safeGame: {
        items: [
          {
            phrase: "Quedo a sus órdenes.",
            context: { es: "Cierras un correo.", en: "You close an email." },
            answer: "formal", answers: ["formal"],
            literal: { es: "Quedo bajo sus órdenes.", en: "I remain under your orders." },
            note: { es: "Cierre.", en: "A close." },
          },
          {
            phrase: "Buenos días.",
            context: { es: "Saludas.", en: "You greet someone." },
            answer: "safe", answers: ["safe"],
            literal: { es: "Buenos días.", en: "Good morning." },
            note: { es: "Saludo.", en: "A greeting." },
          },
        ],
        idx: 0, score: 0, streak: 0, bestStreak: 0,
        selected: "safe", tapped: [], tappedWrong: ["safe"], done: false, awarded: false,
      },
    }));
    const user = userEvent.setup();
    render(<StrictMode><App /></StrictMode>);
    const board = await screen.findByTestId("safe-risky-board");
    await waitFor(() => expect(screen.getByTestId("safe-risky-feedback").getAttribute("data-pinned")).toBe("1"));
    await waitFor(() => expect(board.style.paddingBottom).toMatch(/240px/));
    await user.click(screen.getByTestId("safe-risky-continue"));
    await waitFor(() => expect(screen.queryByTestId("safe-risky-feedback")).toBeNull());
    expect(screen.getByTestId("safe-risky-board").style.padding).toBe("22px 20px 130px");
  });

  const outlinePaint = (el) => ({
    fill: cssHex(el.style.backgroundColor) || cssHex(el.style.background),
    ink: cssHex(el.style.color),
    edge: cssHex(el.style.borderTopColor) || cssHex(el.style.borderColor) || cssHex(el.style.border),
    lip: cssHex(el.style.borderBottomColor) || cssHex(el.style.borderBottom),
  });

  const mountThemed = (theme, live) => {
    cleanup();
    localStorage.removeItem(LIVE_KEY);
    seedProgress({
      theme,
      uiLang: "es",
      paywallSeen: true,
      bajioUnlockSeen: true,
      onboardingDone: true,
      firstSessionDone: true,
      streak: 1,
      lastDay: localToday(),
    });
    if (live) localStorage.setItem(LIVE_KEY, JSON.stringify(live));
    render(<App />);
  };

  it("dark outline Btn uses the card chip; light outline stays the white chip; cream overrides stay", async () => {
    const darkFill = "#1e2128";
    const darkLine = "#2a2e36";
    const darkInk = "#e8e8ea";
    const cream = "#f6efe4";
    const green = "#58cc02";

    mountThemed("dark", { screen: "story", storyId: "story-0", paraIdx: 0, tab: "lectura" });
    const disabledAnterior = await screen.findByRole("button", { name: /Anterior/ });
    expect(disabledAnterior.disabled).toBe(true);
    expect(outlinePaint(disabledAnterior)).toEqual({ fill: darkFill, ink: darkInk, edge: darkLine, lip: darkLine });
    expect(disabledAnterior.style.borderTopWidth).toBe("2px");
    expect(disabledAnterior.style.borderBottomWidth).toBe("4px");
    expect(disabledAnterior.style.padding).toBe("13px 24px");
    expect(disabledAnterior.style.fontSize).toBe("15px");
    expect(disabledAnterior.style.fontWeight).toBe("800");
    expect(disabledAnterior.style.opacity).toBe("");
    expect(contrastRatio("#E8E8EA", "#1E2128")).toBeGreaterThanOrEqual(3);
    const siguiente = screen.getByRole("button", { name: /Siguiente/ });
    expect(outlinePaint(siguiente).fill).toBe(green);
    expect(outlinePaint(siguiente).ink).toBe("#ffffff");

    mountThemed("dark", { screen: "story", storyId: "story-0", paraIdx: 1, tab: "lectura" });
    const anterior = await screen.findByRole("button", { name: /Anterior/ });
    expect(anterior.disabled).toBe(false);
    expect(outlinePaint(anterior)).toEqual({ fill: darkFill, ink: darkInk, edge: darkLine, lip: darkLine });

    mountThemed("light", { screen: "story", storyId: "story-0", paraIdx: 1, tab: "lectura" });
    const lightAnterior = await screen.findByRole("button", { name: /Anterior/ });
    expect(lightAnterior.style.background).toMatch(/#fff\b|#ffffff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
    expect(outlinePaint(lightAnterior)).toMatchObject({ fill: "#ffffff", ink: "#2e7500", edge: "#e5e5e5", lip: "#e5e5e5" });
    expect(lightAnterior.style.borderTopWidth).toBe("2px");
    expect(lightAnterior.style.borderBottomWidth).toBe("4px");
    expect(lightAnterior.style.padding).toBe("13px 24px");
    expect(lightAnterior.style.fontSize).toBe("15px");

    mountThemed("dark", {
      screen: "cubetas",
      tab: "practica",
      cubetasGame: { ...startCubetasRun(undefined, () => 0), status: "done" },
    });
    const cubetasBack = await screen.findByTestId("cubetas-back");
    expect(outlinePaint(cubetasBack)).toEqual({ fill: darkFill, ink: darkInk, edge: darkLine, lip: darkLine });

    mountThemed("light", {
      screen: "cubetas",
      tab: "practica",
      cubetasGame: { ...startCubetasRun(undefined, () => 0), status: "done" },
    });
    const lightBack = await screen.findByTestId("cubetas-back");
    expect(lightBack.style.background).toMatch(/#fff\b|#ffffff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
    expect(outlinePaint(lightBack)).toMatchObject({ fill: "#ffffff", ink: "#2e7500", edge: "#e5e5e5", lip: "#e5e5e5" });

    mountThemed("dark", {
      screen: "ahorcado",
      tab: "practica",
      ahorcado: { ...startHangmanRun(HANGMAN_BANK, () => 0), status: "win" },
    });
    const hangmanBack = await screen.findByTestId("hangman-back");
    expect(outlinePaint(hangmanBack).fill).toBe(darkFill);
    expect(outlinePaint(hangmanBack).ink).toBe(cream);

    mountThemed("dark", { screen: "jeopardy", tab: "practica", jeopardy: startJeopardyRun() });
    const jeopardyBack = await screen.findByTestId("jeopardy-back");
    expect(outlinePaint(jeopardyBack).fill).toBe(darkFill);
    expect(outlinePaint(jeopardyBack).ink).toBe(cream);

    cleanup();
    localStorage.removeItem(LIVE_KEY);
    markBajioUnlockFlashDue(false);
    seedProgress({ theme: "dark", uiLang: "es", streak: 1, lastDay: localToday(), paywallSeen: false, bajioUnlockSeen: true, lecturaStartedAt: 1 });
    render(<App />);
    const monthly = await screen.findByTestId("soft-paywall-monthly");
    expect(outlinePaint(monthly)).toMatchObject({ fill: darkFill, ink: cream, edge: "#4a5160", lip: "#4a5160" });
    expect(monthly.style.borderTopWidth).toBe("2px");
    expect(monthly.style.borderBottomWidth).toBe("4px");
  });

  it("an outline Btn follows a theme switch in the same visit", async () => {
    cleanup();
    localStorage.removeItem(LIVE_KEY);
    seedProgress({
      theme: "light",
      uiLang: "es",
      paywallSeen: true,
      bajioUnlockSeen: true,
      onboardingDone: true,
      firstSessionDone: true,
      streak: 1,
      lastDay: localToday(),
    });
    const user = userEvent.setup();
    render(<StrictMode><App /></StrictMode>);
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    await user.click(screen.getByTestId("nav-perfil"));
    await user.click(screen.getByRole("button", { name: /Oscuro/ }));
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    const darkAnterior = await screen.findByRole("button", { name: /Anterior/ });
    expect(outlinePaint(darkAnterior)).toEqual({ fill: "#1e2128", ink: "#e8e8ea", edge: "#2a2e36", lip: "#2a2e36" });

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.getByTestId("nav-perfil")).toBeTruthy());
    await user.click(screen.getByTestId("nav-perfil"));
    await user.click(screen.getByRole("button", { name: /Claro/ }));
    await user.click(screen.getByTestId("nav-lectura"));
    const again = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(again[again.length - 1]);
    const lightAnterior = await screen.findByRole("button", { name: /Anterior/ });
    expect(lightAnterior.style.background).toMatch(/#fff\b|#ffffff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
    expect(outlinePaint(lightAnterior).ink).toBe("#2e7500");
    expect(outlinePaint(lightAnterior).edge).toBe("#e5e5e5");
  });
});

describe("Pages funnel log", { timeout: 15000 }, () => {
  it("open fires on app mount with no PII", async () => {
    localStorage.clear();
    mockBrowser();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding")).toBeTruthy());
    await waitFor(() => expect(funnelOf("open").length).toBeGreaterThan(0));
    const open = funnelOf("open")[0];
    expect(open.event).toBe("open");
    expect(open.name).toBeUndefined();
    expect(open.email).toBeUndefined();
    expect(open.deviceId).toBeUndefined();
    expect(JSON.stringify(open)).not.toMatch(/Dave|@|device/i);
    expect(open.daysSinceLast).toBeUndefined();
    expect(localStorage.getItem("andale-device-id")).toBeNull();
  });

  it("open carries daysSinceLast from stored lastDay", async () => {
    const today = localToday();
    let fiveAgo = today;
    for (let i = 0; i < 5; i += 1) fiveAgo = prevDayKey(fiveAgo);
    const cases = [
      { lastDay: today, days: 0 },
      { lastDay: prevDayKey(today), days: 1 },
      { lastDay: fiveAgo, days: 5 },
    ];
    for (const item of cases) {
      cleanup();
      delete window.__andaleFunnelLog;
      localStorage.clear();
      mockBrowser();
      seedProgress({
        lastDay: item.lastDay,
        streak: 2,
        name: "Dave",
        onboardingDone: true,
        firstSessionDone: true,
      });
      render(<App />);
      await waitFor(() => expect(funnelOf("open").length).toBeGreaterThan(0));
      const open = funnelOf("open")[0];
      expect(open.daysSinceLast).toBe(item.days);
      expect(open.name).toBeUndefined();
      expect(open.email).toBeUndefined();
      expect(JSON.stringify(open)).not.toMatch(/Dave|@/);
      expect(localStorage.getItem("andale-device-id")).toBeNull();
    }
    cleanup();
    delete window.__andaleFunnelLog;
    localStorage.clear();
    mockBrowser();
    render(<App />);
    await waitFor(() => expect(funnelOf("open").length).toBeGreaterThan(0));
    expect(funnelOf("open")[0].daysSinceLast).toBeUndefined();
    expect(localStorage.getItem("andale-device-id")).toBeNull();
  });

  it("cenzontle_complete fires when the first-Hoy bird beat finishes", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["claro y práctico"],
      answer: "claro y práctico",
      shuffledChoices: ["claro y práctico"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Cita en el banco",
        unitId: "_today:tramites-cita",
        todaySceneId: "tramites-cita",
        firstHoy: true,
        host: "luna",
        questions: [
          hoyMc("En WhatsApp con el banco, «Quiero agendar una cita para abrir una cuenta» suena:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("win-fly-away")).toBeTruthy());
    expect(funnelOf("cenzontle_complete")).toHaveLength(0);
    expect(screen.queryByTestId("win-perch")).toBeNull();
    await waitFor(() => expect(funnelOf("cenzontle_complete").length).toBeGreaterThan(0), { timeout: 1500 });
    const bird = funnelOf("cenzontle_complete");
    expect(bird.length).toBeGreaterThan(0);
    expect(bird.at(-1).beat).toBe("hoy");
    expect(JSON.stringify(bird.at(-1))).not.toMatch(/Dave|@/);
  });

  it("lectura_start fires when a Lectura story opens", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("lectura-still-0")).toBeTruthy());
    const starts = funnelOf("lectura_start");
    expect(starts.some((e) => e.storyId === "story-0")).toBe(true);
    expect(starts.every((e) => e.title == null && e.name == null)).toBe(true);
  });

  it("paywall_seen and paywall_tap fire for annual, monthly, and continue-free", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await waitFor(() => expect(funnelOf("paywall_seen").length).toBeGreaterThan(0));
    expect(funnelOf("paywall_seen")[0].name).toBeUndefined();

    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "annual")).toBe(true));
    await user.click(screen.getByTestId("soft-paywall-monthly"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "monthly")).toBe(true));
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    assertSoftPaywallAnnualPrimary("es");

    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(funnelOf("paywall_tap").some((e) => e.choice === "continue_free")).toBe(true);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/\$39\.99|\$6\.99|Dave@/);
  });

  it("waitlist strip is gone on the paywall and the hub", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Tell me when the store opens|Avísame cuando abramos la tienda|I’ll write when it’s ready|Te escribo cuando esté listo/);
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(screen.getByTestId("learn-hub").textContent).not.toMatch(/Tell me when the store opens|Avísame cuando abramos la tienda|I’ll write when it’s ready|Te escribo cuando esté listo/);
    expect(funnelOf("waitlist_submit")).toHaveLength(0);
    expect(funnelOf("paywall_tap").some((e) => e.choice === "continue_free")).toBe(true);
    expect(funnelOf("purchase")).toHaveLength(0);
  }, 15000);

  it("StoreKit cancel does not emit purchase", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    window.__andaleNativePurchase = async () => ({
      status: "cancelled",
      receipt: "receipt-body",
      email: "dave@example.com",
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(window.__andalePurchaseLog?.some((e) => e.reason === "user_cancelled")).toBe(true));
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(funnelOf("paywall_tap").some((e) => e.choice === "annual")).toBe(true);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/receipt-body|dave@example/);
  });

  it("conversion chain is open, first-Hoy win, Lectura, paywall, then purchase on success", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, uiLang: "es" });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    window.__andaleNativePurchase = async ({ productId }) => ({
      status: "success",
      productId,
      receipt: "receipt-body",
      transactionId: "tx-9",
      email: "dave@example.com",
      deviceId: "device-1",
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        firstHoy: true,
        host: "luna",
        questions: [hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:")],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(funnelOf("open").length).toBeGreaterThan(0));
    expect(funnelOf("purchase")).toHaveLength(0);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelector(".choice-card"));
    await user.click(screen.getByTestId("lesson-check"));
    await user.click(await screen.findByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("win-fly-away")).toBeTruthy());
    await waitFor(() => expect(funnelOf("cenzontle_complete").some((e) => e.beat === "hoy")).toBe(true), { timeout: 1500 });
    expect(funnelOf("lectura_start")).toHaveLength(0);
    await user.click(screen.getByTestId("lectura-handoff-cta"));
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
    expect(funnelOf("lectura_start").some((e) => e.storyId === "story-0")).toBe(true);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(funnelOf("purchase")).toHaveLength(0);

    cleanup();
    localStorage.removeItem(LIVE_KEY);
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await waitFor(() => expect(funnelOf("paywall_seen").length).toBeGreaterThan(0));
    expect(funnelOf("purchase")).toHaveLength(0);
    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(funnelOf("purchase")).toHaveLength(1));
    const bought = funnelOf("purchase")[0];
    expect(bought.plan).toBe("annual");
    expect(bought.productId).toBe("com.andale.app.premium.annual");
    expect(Object.keys(bought).sort()).toEqual(["at", "event", "plan", "productId"]);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/receipt-body|tx-9|dave@example|device-1|\$/);
    const names = window.__andaleFunnelLog.map((e) => e.event);
    const at = (name) => names.indexOf(name);
    expect(at("open")).toBeGreaterThanOrEqual(0);
    expect(at("cenzontle_complete")).toBeGreaterThan(at("open"));
    expect(at("lectura_start")).toBeGreaterThan(at("cenzontle_complete"));
    expect(at("paywall_seen")).toBeGreaterThan(at("lectura_start"));
    expect(at("purchase")).toBeGreaterThan(at("paywall_seen"));
  });

  it("return home after Hoy win and Lectura start shows the soft paywall and does not emit purchase on web", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, uiLang: "es" });
    delete window.__andaleIapEnv;
    delete window.__andaleNativePurchase;
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        firstHoy: true,
        host: "luna",
        questions: [hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:")],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(funnelOf("open").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelector(".choice-card"));
    await user.click(screen.getByTestId("lesson-check"));
    await user.click(await screen.findByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("lectura-handoff-cta")).toBeTruthy());
    await waitFor(() => expect(funnelOf("cenzontle_complete").some((e) => e.beat === "hoy")).toBe(true), { timeout: 1500 });
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("lectura-handoff-cta"));
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
    expect(funnelOf("lectura_start").some((e) => e.storyId === "story-0")).toBe(true);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(funnelOf("purchase")).toHaveLength(0);

    await user.click(screen.getByTestId("brand-home"));
    await awaitBajioFlashThenPaywall();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Hay mucho más por leer.");
    await waitFor(() => expect(funnelOf("paywall_seen").length).toBeGreaterThan(0));
    expect(funnelOf("purchase")).toHaveLength(0);

    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "annual")).toBe(true));
    await user.click(screen.getByTestId("soft-paywall-monthly"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "monthly")).toBe(true));
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-honesty").textContent).toBe("Vista previa · aún no se cobra");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);
    const names = window.__andaleFunnelLog.map((e) => e.event);
    const at = (name) => names.indexOf(name);
    expect(at("cenzontle_complete")).toBeGreaterThan(at("open"));
    expect(at("lectura_start")).toBeGreaterThan(at("cenzontle_complete"));
    expect(at("paywall_seen")).toBeGreaterThan(at("lectura_start"));
    expect(at("purchase")).toBe(-1);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/@|device|receipt|\$/);
  });

  it("Learn home after Hoy does not show the soft paywall until lectura_start, then glow and wall, and web taps do not purchase", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, uiLang: "es" });
    delete window.__andaleIapEnv;
    delete window.__andaleNativePurchase;
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        firstHoy: true,
        host: "luna",
        questions: [hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:")],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(funnelOf("open").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelector(".choice-card"));
    await user.click(screen.getByTestId("lesson-check"));
    await user.click(await screen.findByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("lectura-handoff-cta")).toBeTruthy());
    await waitFor(() => expect(funnelOf("cenzontle_complete").some((e) => e.beat === "hoy")).toBe(true), { timeout: 1500 });
    expect(funnelOf("lectura_start")).toHaveLength(0);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(funnelOf("purchase")).toHaveLength(0);

    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    assertNoWallBeforeLectura();
    expect(funnelOf("lectura_start")).toHaveLength(0);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(isBajioUnlockFlashDue()).toBe(true);

    await openStory0(user);
    expect(funnelOf("lectura_start").some((e) => e.storyId === "story-0")).toBe(true);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();

    await user.click(screen.getByTestId("brand-home"));
    await awaitBajioFlashThenPaywall();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Hay mucho más por leer.");
    expect(funnelOf("paywall_seen").length).toBeGreaterThan(0);
    expect(funnelOf("purchase")).toHaveLength(0);

    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "annual")).toBe(true));
    await user.click(screen.getByTestId("soft-paywall-monthly"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "monthly")).toBe(true));
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);
    const names = window.__andaleFunnelLog.map((e) => e.event);
    const at = (name) => names.indexOf(name);
    expect(at("cenzontle_complete")).toBeGreaterThan(at("open"));
    expect(at("lectura_start")).toBeGreaterThan(at("cenzontle_complete"));
    expect(at("paywall_seen")).toBeGreaterThan(at("lectura_start"));
    expect(at("purchase")).toBe(-1);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/@|device|receipt|\$/);
  }, 15000);

  it("Hoy win, then lectura_start, then the chapter cliffhanger hands off to the paywall bird", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, uiLang: "es" });
    delete window.__andaleIapEnv;
    delete window.__andaleNativePurchase;
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["cilantro, cebolla, salsa y guarnición"],
      answer: "cilantro, cebolla, salsa y guarnición",
      shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
      _u: "_today",
      _i: -1,
    });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Noche de faroles",
        unitId: "_today:taqueria",
        todaySceneId: "taqueria",
        firstHoy: true,
        host: "luna",
        questions: [hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:")],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(funnelOf("open").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelector(".choice-card"));
    await user.click(screen.getByTestId("lesson-check"));
    await user.click(await screen.findByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("lectura-handoff-cta")).toBeTruthy());
    await waitFor(() => expect(funnelOf("cenzontle_complete").some((e) => e.beat === "hoy")).toBe(true), { timeout: 1500 });
    assertNoWallBeforeLectura();
    expect(funnelOf("lectura_start")).toHaveLength(0);
    expect(funnelOf("lectura_chapter_done")).toHaveLength(0);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(funnelOf("purchase")).toHaveLength(0);

    await user.click(screen.getByTestId("lectura-handoff-cta"));
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-0"));
    expect(funnelOf("lectura_start").some((e) => e.storyId === "story-0")).toBe(true);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("lectura-cliffhanger")).toBeNull();

    for (;;) {
      const next = screen.queryByRole("button", { name: /^(Siguiente|Next) →$/ });
      if (!next) break;
      await user.click(next);
    }
    await user.click(screen.getByRole("button", { name: /^(Preguntas|Questions) →$/ }));
    await waitFor(() => expect(screen.getAllByTestId("story-q-prompt").length).toBeGreaterThan(0));
    expect(funnelOf("lectura_chapter_done")).toHaveLength(0);
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: /El olor del cempasúchil/ }));
    await user.click(screen.getByRole("button", { name: /En el panteón de la isla de Janitzio/ }));
    await user.click(screen.getByRole("button", { name: /El olvido/ }));
    await user.click(screen.getByRole("button", { name: /Reclamar|Claim/ }));

    await waitFor(() => expect(screen.getByTestId("lectura-cliffhanger")).toBeTruthy());
    const done = funnelOf("lectura_chapter_done");
    expect(done).toHaveLength(1);
    expect(done[0].storyId).toBe("story-0");
    expect(done[0].title).toBeUndefined();
    expect(screen.getByTestId("lectura-cliffhanger-line").textContent).toBe(lecturaCliffhangers["story-0"].es);
    expect(screen.getByTestId("lectura-bird-handoff-cta").textContent).toBe("Continuar");
    expect(screen.getByTestId("lectura-bird-handoff-cta").className).not.toMatch(/duo-btn/);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(funnelOf("paywall_seen")).toHaveLength(0);
    expect(screen.queryByTestId("soft-paywall-cenzontle")).toBeNull();

    await user.click(screen.getByTestId("lectura-bird-handoff-cta"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall-cenzontle")).toBeTruthy());
    expect(firstSessionRoot()).toBeNull();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("La historia sigue.");
    expect(screen.getByTestId("soft-paywall-headline").getAttribute("data-paywall-source")).toBe("lectura-bird-handoff");
    expect(screen.getByTestId("soft-paywall-headline").style.fontWeight).toBe("900");
    expect(screen.getByTestId("soft-paywall-headline").style.fontSize).toBe("22px");
    expect(screen.getByTestId("soft-paywall-headline").style.textWrap).toBe("balance");
    expect(screen.getByTestId("soft-paywall-headline").style.letterSpacing).toBe("");
    expect(screen.getByTestId("soft-paywall-body").textContent).toBe("Todas las historias, la Doctora de frases y el camino completo. Español mexicano de verdad, más allá de lo básico.");
    expect(funnelOf("paywall_seen")).toHaveLength(1);
    expect(funnelOf("lectura_chapter_done")).toHaveLength(1);
    expect(screen.getByTestId("soft-paywall").querySelectorAll("img[src*='cenzontle']")).toHaveLength(1);
    expect(screen.getByTestId("soft-paywall-annual").textContent).toBe("Un año");
    expect(screen.getByTestId("soft-paywall-dismiss").textContent).toBe("Seguir gratis");
    expect(screen.getByTestId("soft-paywall-annual").style.background).toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.getByTestId("soft-paywall-dismiss").style.background).toBe("none");
    expect(funnelOf("purchase")).toHaveLength(0);

    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "annual")).toBe(true));
    expect(funnelOf("paywall_tap").filter((e) => e.choice === "annual")).toHaveLength(1);
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
    const names = window.__andaleFunnelLog.map((e) => e.event);
    const at = (name) => names.indexOf(name);
    expect(at("open")).toBeGreaterThanOrEqual(0);
    expect(at("cenzontle_complete")).toBeGreaterThan(at("open"));
    expect(at("lectura_start")).toBeGreaterThan(at("cenzontle_complete"));
    expect(at("lectura_chapter_done")).toBeGreaterThan(at("lectura_start"));
    expect(at("paywall_seen")).toBeGreaterThan(at("lectura_chapter_done"));
    expect(at("paywall_tap")).toBeGreaterThan(at("paywall_seen"));
    expect(at("purchase")).toBe(-1);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/@|device|receipt|\$/);
  }, 30000);
});
