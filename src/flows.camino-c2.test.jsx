import { describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { prevDayKey } from "./firstDoor.js";
import { MAC_SAFARI_UA } from "./a2hs.js";
import { isNorteUnlockFlashDue, isYucatanUnlockFlashDue, markBajioUnlockFlashDue, recuerdosHasProgressFraction, recuerdosSurfaceHasCuts, RECUERDOS_PIN_SHADOW, RECUERDOS_PIN_SHADOW_LOCKED } from "./recuerdos.js";
import { CHOICE_CHIP_KEYS } from "./choiceChipKeys.js";
import {
  installFlowHooks,
  STORAGE_KEY,
  LIVE_KEY,
  seedProgress,
  seedColdFirstVisit,
  boot,
  awaitHome,
  HUB_DOCTOR_RE,
  localToday,
  assertFreeWinFlyAway,
  assertSoftPaywallAnnualPrimary,
  awaitSoftPaywallAfterFirstWin,
  assertNoWallBeforeLectura,
  openStory0,
  lecturaThenBajioWall,
  awaitYucatanFlashThenIdle,
  awaitYucatanFlashVisible,
  awaitNorteFlashThenIdle,
  awaitNorteFlashVisible,
  openCaminoMore,
  JSDOM_UA,
  mockA2hsEnv,
  funnelOf,
} from "./flowsHarness.jsx";

installFlowHooks();

describe("simulated learner flows", { timeout: 15000 }, () => {
  it("CONTINUE after streak-4 Hoy Eso cannot skip the Yucatán flash onto idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 3,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      oaxacaUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "family" },
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
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitYucatanFlashVisible();
    expect(isYucatanUnlockFlashDue()).toBe(true);
    expect(screen.queryByTestId("hero-cta") && !screen.queryByTestId("yucatan-unlock-flash")).toBeFalsy();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await awaitYucatanFlashThenIdle();
  });

  it("remount after streak-4 Hoy CONTINUE still plays Yucatán flash before idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 3,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      oaxacaUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "family" },
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
        day2Hoy: true,
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win-continue")).toBeTruthy());
    await user.click(screen.getByTestId("hoy-win-continue"));
    await waitFor(() => expect(isYucatanUnlockFlashDue() || screen.queryByTestId("yucatan-unlock-flash")).toBeTruthy());
    const saved = localStorage.getItem(STORAGE_KEY);
    cleanup();
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    await awaitYucatanFlashVisible();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("yucatan-unlock-flash-copy").textContent).toBe("Abierto");
    await waitFor(() => expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull(), { timeout: 3000 });
    await awaitHome();
    expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
  });

  it("streak-5 Hoy Eso CONTINUE shows Norte Abierto before idle — not paywall", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 4,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      oaxacaUnlockSeen: true,
      yucatanUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "family" },
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
        day2Hoy: true,
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("session-close")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitNorteFlashThenIdle();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-pin-norte")).toBeTruthy());
    expect(screen.getByTestId("recuerdos-pin-norte").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Norte/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Abierto/);
    expect(screen.queryByTestId("recuerdos-fog-norte")).toBeNull();
    expect(screen.getByTestId("recuerdos-pin-yucatan").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-cdmx").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Abierto/);
  });

  it("CONTINUE after streak-5 Hoy Eso cannot skip the Norte flash onto idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 4,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      oaxacaUnlockSeen: true,
      yucatanUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "family" },
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
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitNorteFlashVisible();
    expect(isNorteUnlockFlashDue()).toBe(true);
    expect(screen.queryByTestId("hero-cta") && !screen.queryByTestId("norte-unlock-flash")).toBeFalsy();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await awaitNorteFlashThenIdle();
  });

  it("remount after streak-5 Hoy CONTINUE still plays Norte flash before idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 4,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      oaxacaUnlockSeen: true,
      yucatanUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "family" },
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
        day2Hoy: true,
        host: "luna",
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
          hoyMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win-continue")).toBeTruthy());
    await user.click(screen.getByTestId("hoy-win-continue"));
    await waitFor(() => expect(isNorteUnlockFlashDue() || screen.queryByTestId("norte-unlock-flash")).toBeTruthy());
    const saved = localStorage.getItem(STORAGE_KEY);
    cleanup();
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    await awaitNorteFlashVisible();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("norte-unlock-flash-copy").textContent).toBe("Abierto");
    await waitFor(() => expect(screen.queryByTestId("norte-unlock-flash")).toBeNull(), { timeout: 3000 });
    await awaitHome();
    expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).toBe(true);
  });

  it("Landlord WhatsApp first streak-1 CONTINUE still shows Bajío before paywall, not CDMX", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const landlordMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["natural y firme"],
      answer: "natural y firme",
      shuffledChoices: ["natural y firme"],
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
        title: "WhatsApp del casero",
        unitId: "_today:landlord",
        todaySceneId: "landlord",
        firstHoy: true,
        host: "valeria",
        questions: [
          landlordMc("En WhatsApp con el casero, «Oye, ¿el depósito cuenta…?» suena:"),
          landlordMc("beat 2 must not run — early checkpoint"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await lecturaThenBajioWall(user);
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Hay mucho más por leer.");
    assertSoftPaywallAnnualPrimary("es");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
  });

  it("first streak-1 win CONTINUE dismiss free lands on Doctora CTA, not idle home", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
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
        questions: [
          hoyMc("Si el taquero pregunta «¿con todo?», normalmente habla de:"),
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
    await waitFor(() => expect(screen.getByTestId("hoy-win-continue")).toBeTruthy());
    await user.click(screen.getByTestId("hoy-win-continue"));
    await lecturaThenBajioWall(user);
    expect(screen.getByTestId("soft-paywall-dismiss").textContent).toBe("Seguir gratis");
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    const handoff = screen.getByTestId("post-dismiss-handoff");
    expect(handoff).toBeTruthy();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(handoff.textContent).not.toMatch(/Phrase Doctor/);
    expect(screen.queryByTestId("phrase-doctor-board")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE));
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    await user.click(screen.getByTestId("hub-phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
  });

  it("later Hoy keeps full depth — no early checkpoint after one hit", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 1, lastDay: today, paywallSeen: true });
    const laterMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["contraste"],
      answer: "contraste",
      shuffledChoices: ["contraste"],
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
        title: "Mostrador en caos",
        unitId: "_today:airport",
        todaySceneId: "airport",
        firstHoy: false,
        host: "diego",
        questions: [
          laterMc("«Sin embargo» introduce:"),
          laterMc("later Hoy beat 2"),
          laterMc("later Hoy beat 3"),
          laterMc("later Hoy beat 4"),
          laterMc("later Hoy beat 5"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(document.body.textContent).toMatch(/«Sin embargo» introduce/);
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.queryByTestId("hoy-win")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
    expect(document.body.textContent).toMatch(/later Hoy beat 2/);
    expect(document.body.textContent).not.toMatch(/¡Eso!|That's it\./);
  });

  it("later Hoy same day does not replay the 780ms Cenzontle beat", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 1, lastDay: today, paywallSeen: true });
    const laterMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["contraste"],
      answer: "contraste",
      shuffledChoices: ["contraste"],
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
        title: "Mostrador en caos",
        unitId: "_today:airport",
        todaySceneId: "airport",
        firstHoy: false,
        host: "diego",
        questions: [
          laterMc("«Sin embargo» introduce:"),
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
    await waitFor(() => expect(screen.getByRole("heading", { name: /Lección completada|Lesson complete/ })).toBeTruthy());
    expect(screen.queryByTestId("hoy-win")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
  });

  it("first-session Doctora wins early (≤4 beats) with ¡Eso! / That's it.", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("first-door-alt")).toBeTruthy());
    await user.click(screen.getByTestId("lang-es"));
    await user.click(screen.getByTestId("first-door-alt"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(document.body.textContent).toMatch(/¿Puedo obtener un café\?/);
    expect(document.body.textContent).not.toMatch(/Necesito hacer una decisión|Voy a aplicar para el trabajo/);
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/NATURAL/));
    expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/¿Me da un café/);
    expect(screen.queryByTestId("doctora-win")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => {
      expect(screen.getByTestId("doctora-win")).toBeTruthy();
      expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    });
    expect(screen.getByTestId("doctora-win").textContent).toBe("¡Eso!");
    assertFreeWinFlyAway();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Ganaste!|You won!/);
    expect(document.body.textContent).not.toMatch(/¡IMPECABLE!|FLAWLESS!/);
    expect(document.body.textContent).not.toMatch(/Necesito hacer una decisión|Voy a aplicar para el trabajo|beat 5/);
    expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    expect(screen.queryByTestId("win-earned-xp")).toBeNull();
    expect(screen.queryByTestId("win-earned-gems")).toBeNull();
    expect(screen.getByTestId("win-earned-streak").textContent.replace(/\s+/g, " ").trim()).toBe("Racha de 1 día");
    expect(screen.getByTestId("win-earned-streak").textContent).not.toMatch(/streak days/);
    const doctoraWinScreen = screen.getByTestId("doctora-win").parentElement;
    expect(doctoraWinScreen.textContent).not.toMatch(/\+\d+/);
    expect(doctoraWinScreen.textContent).not.toMatch(/\bXP\b/);
    expect(doctoraWinScreen.textContent).not.toMatch(/gemas|\bgems\b/i);
    expect(doctoraWinScreen.textContent).not.toMatch(/streak days/);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).xp).toBe(42);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).gems).toBe(9);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("doctora-win").textContent).toBe("That's it."));
    expect(screen.getByTestId("win-earned-streak").textContent.replace(/\s+/g, " ").trim()).toBe("1-day streak");
    expect(screen.getByTestId("win-earned-streak").textContent).not.toMatch(/streak days/);
    expect(screen.getByTestId("doctora-win").parentElement.textContent).not.toMatch(/streak days/);
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /You won!|¡Ganaste!|Lesson complete/ })).toBeNull();
    assertFreeWinFlyAway();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("doctora-win").textContent).toBe("¡Eso!"));
    await user.click(screen.getByTestId("doctora-win-continue"));
    await waitFor(() => expect(screen.getByTestId("session-close")).toBeTruthy());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).lastDay).toBe(today);
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("session-close-next").textContent).toBe("Jugar la escena");
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.getByTestId("session-close-dismiss").textContent).toBe("Listo");
    expect(screen.queryByTestId("camino-more")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    expect(screen.queryByTestId("door-meta")).toBeNull();
    expect(screen.queryByTestId("hero-cta")).toBeNull();
    expect(screen.queryByTestId("first-door-hero")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("session-close-dismiss"));
    await waitFor(() => expect(screen.getByTestId("bajio-unlock-flash")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await waitFor(() => expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull(), { timeout: 3000 });
    assertNoWallBeforeLectura();
    await openStory0(user);
    await user.click(screen.getByTestId("brand-home"));
    await awaitSoftPaywallAfterFirstWin();
    await awaitHome();
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByText(/Vuelve mañana|Come back tomorrow/)).toBeNull();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Hay mucho más por leer.");
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    const handoff = screen.getByTestId("post-dismiss-handoff");
    expect(handoff).toBeTruthy();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Jugar la escena|Continuar|Subjuntivo/);
    expect(handoff.textContent).not.toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hub-phrase-doctor")).toBeTruthy();
    expect(screen.getByTestId("hub-hoy")).toBeTruthy();
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE));
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByText(/Come back tomorrow for/)).toBeNull();
  });

  it("first-session Doctora win lands on next-beat card — streak + playScene + Listo/Done", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("first-door-alt")).toBeTruthy());
    await user.click(screen.getByTestId("lang-es"));
    await user.click(screen.getByTestId("first-door-alt"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-fix").textContent).toMatch(/Continuar|Continue/));
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("doctora-win")).toBeTruthy());
    expect(screen.getByTestId("doctora-win").textContent).toBe("¡Eso!");
    expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    expect(screen.queryByTestId("win-earned-xp")).toBeNull();
    expect(screen.queryByTestId("win-earned-gems")).toBeNull();
    expect(screen.getByTestId("win-earned-streak").textContent.replace(/\s+/g, " ").trim()).toBe("Racha de 1 día");
    expect(screen.getByTestId("win-earned-streak").textContent).not.toMatch(/streak days/);
    expect(screen.getByTestId("doctora-win").parentElement.textContent).not.toMatch(/\+\d+|\bXP\b|gemas|\bgems\b/i);
    expect(screen.getByTestId("doctora-win").parentElement.textContent).not.toMatch(/streak days/);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).xp).toBe(42);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).gems).toBe(9);
    await user.click(screen.getByTestId("doctora-win-continue"));
    await waitFor(() => expect(screen.getByTestId("session-close")).toBeTruthy());
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("session-close-next").tagName).toBe("P");
    expect(screen.getByTestId("session-close-next").textContent).toBe("Jugar la escena");
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.getByTestId("session-close-dismiss").textContent).toBe("Listo");
    expect(screen.getByTestId("session-close-dismiss").textContent).not.toMatch(/Cerrar|Continuar|Ya está|Vale|Close|Continue|All set|Ready/);
    expect(screen.queryByRole("button", { name: /Cerrar|Continuar|Ya está|Close|Continue|All set/ })).toBeNull();
    expect(screen.queryByTestId("nav-camino")).toBeNull();
    expect(screen.queryByTestId("camino-more")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    expect(screen.queryByTestId("door-meta")).toBeNull();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(screen.queryByTestId("first-door-hero")).toBeNull();
    expect(screen.queryByTestId("hero-cta")).toBeNull();
    expect(screen.queryByRole("button", { name: /Vuelve mañana|Come back tomorrow/ })).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("session-close-dismiss").textContent).toBe("Done"));
    expect(screen.getByTestId("session-close-dismiss").textContent).not.toMatch(/Close|Continue|All set|Ready|Cerrar|Listo/);
    expect(screen.getByTestId("session-close-next").textContent).toBe("Play the scene");
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByTestId("camino-more")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
  });

  it("later Doctora does not early-exit after beat 1", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-practica")).toBeTruthy());
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(document.body.textContent).toMatch(/Estoy emocionado para verte/);
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/NATURAL/));
    expect(screen.queryByTestId("doctora-win")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Eso!|That's it\./);
    const otra = [...screen.getByTestId("phrase-doctor-board").querySelectorAll("button")].find((b) => /Otra|New/.test(b.textContent));
    expect(otra).toBeTruthy();
    await user.click(otra);
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-guess")).toBeTruthy());
    expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/¿Puedo obtener un café\?/);
    expect(screen.queryByTestId("doctora-win")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
  });

  it("later Doctora same day does not replay the 780ms Cenzontle beat", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: true });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-practica")).toBeTruthy());
    await user.click(screen.getByTestId("nav-practica"));
    await user.click(screen.getByTestId("phrase-doctor"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board").textContent).toMatch(/NATURAL/));
    expect(screen.queryByTestId("doctora-win")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
    expect(screen.queryByRole("heading", { name: /^¡Eso!$|^That's it\.$/ })).toBeNull();
    const otra = [...screen.getByTestId("phrase-doctor-board").querySelectorAll("button")].find((b) => /Otra|New/.test(b.textContent));
    expect(otra).toBeTruthy();
    await user.click(otra);
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-guess")).toBeTruthy());
    expect(screen.queryByTestId("doctora-win")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
  });

  it("fresh session with today's win and no story started holds the soft paywall until story-0", async () => {
    cleanup();
    markBajioUnlockFlashDue(false);
    seedProgress({
      streak: 1,
      lastDay: localToday(),
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect((window.__andaleFunnelLog || []).some((e) => e.event === "paywall_seen")).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).lecturaStartedAt).toBeFalsy();

    await openStory0(user);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).lecturaStartedAt).toBeTruthy();
    expect((window.__andaleFunnelLog || []).some((e) => e.event === "paywall_seen")).toBe(false);

    await user.click(screen.getByTestId("brand-home"));
    await awaitSoftPaywallAfterFirstWin();
    expect((window.__andaleFunnelLog || []).some((e) => e.event === "paywall_seen")).toBe(true);
  });

  it("a claimed story already in progress counts as started for the soft paywall", async () => {
    cleanup();
    markBajioUnlockFlashDue(false);
    seedProgress({ streak: 1, lastDay: localToday(), stories: { "story-0": true } });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect((window.__andaleFunnelLog || []).some((e) => e.event === "paywall_seen")).toBe(true);
  });

  it("soft paywall does not render on splash or boot before a win", async () => {
    cleanup();
    localStorage.clear();
    seedColdFirstVisit();
    render(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: /¡Empezar!|Start!/ })).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
    expect(document.body.textContent).not.toMatch(/La historia sigue\.|The story goes on\.|Hay mucho más por leer\.|There's much\u00A0more to read\./);
    expect(document.body.textContent).not.toMatch(/Orden distinto, mismo sentido|Different order, same meaning/);

    cleanup();
    localStorage.clear();
    seedProgress({ streak: 0, lastDay: null });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
  });

  it("soft paywall after first Phrase Doctor win: vuelve first, then once, dismiss stays free", async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    cleanup();
    seedProgress({ streak: 0, lastDay: null, xp: 0 });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();

    await user.click(screen.getByTestId("first-door-alt"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-board")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("phrase-doctor-fix").textContent).toMatch(/Continuar|Continue/));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("phrase-doctor-fix"));
    await waitFor(() => expect(screen.getByTestId("doctora-win")).toBeTruthy());
    expect(screen.getByTestId("doctora-win").textContent).toBe("¡Eso!");
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("doctora-win-continue"));
    await waitFor(() => expect(screen.getByTestId("session-close")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("session-close-dismiss"));
    await waitFor(() => expect(screen.getByTestId("bajio-unlock-flash")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await waitFor(() => expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull(), { timeout: 3000 });
    assertNoWallBeforeLectura();
    await openStory0(user);
    await user.click(screen.getByTestId("brand-home"));
    await awaitSoftPaywallAfterFirstWin();
    await waitFor(() => {
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.streak).toBe(1);
      expect(prog.lastDay).toBe(today);
    });
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Hay mucho más por leer.");
    expect(screen.getByTestId("soft-paywall-body").textContent).toBe("Todas las historias, la Doctora de frases y el camino completo. Español mexicano de verdad, más allá de lo básico.");
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.getByTestId("soft-paywall").textContent).not.toMatch(/Orden distinto, mismo sentido|Different order, same meaning/);
    expect(screen.getByTestId("soft-paywall").querySelector("[data-testid=\"word-order-tip\"]")).toBeNull();

    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);

    await user.click(screen.getByTestId("nav-camino"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByText(/Vuelve mañana|Come back tomorrow/)).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hero-cta")).toBeTruthy();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Subjuntivo/);
    expect(screen.getByTestId("hub-hoy")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor")).toBeTruthy();

    cleanup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
  });

  it("soft paywall EN strings after first-win state; annual CTA on web does not fake a charge", async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: today, lecturaStartedAt: 1 });
    window.__andalePurchaseLog = [];
    const events = [];
    const onPurchase = (e) => events.push(e.detail);
    window.addEventListener("andale-purchase", onPurchase);
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("There's much\u00A0more to read.");
    expect(screen.getByTestId("soft-paywall-body").textContent).toBe("Every story, Phrase Doctor, and the full path. Real Mexican Spanish, past the basics.");
    assertSoftPaywallAnnualPrimary("en");

    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(events.length).toBeGreaterThan(0));
    expect(events[0].status).toBe("failure");
    expect(events[0].charged).toBe(false);
    expect(events[0].reason).toBe("web_no_iap");
    expect(events[0].plan).toBe("annual");
    expect(events[0].productId).toBe("com.andale.app.premium.annual");
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-honesty").textContent).toBe("Preview · you won\u2019t be charged yet");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.unlockedPrem).not.toBe(true);
    expect(stored.paywallPlan).toBeFalsy();
    expect(stored.paywallSeen).not.toBe(true);
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByText(/Come back tomorrow for/)).toBeNull();
    expect(screen.getByTestId("hero-cta")).toBeTruthy();
    window.removeEventListener("andale-purchase", onPurchase);
  });

  it("soft paywall monthly CTA on web stays honest and does not unlock", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    const events = [];
    const onPurchase = (e) => events.push(e.detail);
    window.addEventListener("andale-purchase", onPurchase);
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("es");
    await user.click(screen.getByTestId("soft-paywall-monthly"));
    await waitFor(() => expect(events.at(-1)?.reason).toBe("web_no_iap"));
    expect(events.at(-1).plan).toBe("monthly");
    expect(events.at(-1).charged).toBe(false);
    expect(events.at(-1).productId).toBe("com.andale.app.premium.monthly");
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-honesty").textContent).toBe("Vista previa · aún no se cobra");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.unlockedPrem).not.toBe(true);
    expect(stored.paywallPlan).toBeFalsy();
    window.removeEventListener("andale-purchase", onPurchase);
  });

  it("soft paywall annual unlocks only after a real purchase success event", async () => {
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativePurchase = async ({ productId }) => ({ status: "success", productId });
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    const events = [];
    const onPurchase = (e) => events.push(e.detail);
    window.addEventListener("andale-purchase", onPurchase);
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(events.some((e) => e.status === "success" && e.charged === true && e.plan === "annual")).toBe(true);
    const bought = funnelOf("purchase");
    expect(bought).toHaveLength(1);
    expect(bought[0].plan).toBe("annual");
    expect(bought[0].productId).toBe("com.andale.app.premium.annual");
    expect(Object.keys(bought[0]).sort()).toEqual(["at", "event", "plan", "productId"]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.paywallSeen).toBe(true);
    expect(stored.paywallPlan).toBe("annual");
    expect(stored.unlockedPrem).toBe(true);
    expect(stored.iapProductId).toBe("com.andale.app.premium.annual");
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    window.removeEventListener("andale-purchase", onPurchase);
    delete window.__andaleIapEnv;
    delete window.__andaleNativePurchase;
    delete window.__andaleNativeRestore;
  });

  it("soft paywall yearly is sole filled primary; monthly is outline; continue free is quiet", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.getByTestId("soft-paywall-honesty").textContent).toBe("Vista previa · aún no se cobra");
    expect(screen.getByTestId("soft-paywall-dismiss").textContent).toBe("Seguir gratis");
  });

  it("soft paywall conversion look: one bird, George hierarchy, dismiss leaves hub unchanged", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.getByTestId("soft-paywall").querySelectorAll("img[src*='cenzontle']")).toHaveLength(1);
    const hubSnap = {
      hoy: screen.getByTestId("hub-hoy").textContent,
      stories: screen.getByTestId("hub-stories").textContent,
      games: screen.getByTestId("hub-games").textContent,
      doctor: screen.getByTestId("hub-phrase-doctor").textContent,
      eighty: screen.getByTestId("eighty-twenty-cta").textContent,
      sendero: screen.getByTestId("hub-sendero").textContent,
      tiles: screen.getByTestId("learn-hub-tiles").childElementCount,
    };
    expect(hubSnap.hoy).toMatch(/Hoy/);
    expect(hubSnap.hoy).toMatch(/Plan de hoy/);
    expect(hubSnap.sendero).toMatch(/Tu camino/);
    expect(hubSnap.hoy + hubSnap.stories + hubSnap.games).not.toMatch(/Un año|Seguir gratis|Mexicanismos|Lección perfecta/);
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-hoy").textContent).toBe(hubSnap.hoy);
    expect(screen.getByTestId("hub-stories").textContent).toBe(hubSnap.stories);
    expect(screen.getByTestId("hub-games").textContent).toBe(hubSnap.games);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toBe(hubSnap.doctor);
    expect(screen.getByTestId("eighty-twenty-cta").textContent).toBe(hubSnap.eighty);
    expect(screen.getByTestId("hub-sendero").textContent).toBe(hubSnap.sendero);
    expect(screen.getByTestId("learn-hub-tiles").childElementCount).toBe(hubSnap.tiles);
    expect(screen.queryByTestId("soft-paywall-cenzontle")).toBeNull();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.getByTestId("learn-hub").textContent).not.toMatch(/La historia sigue\.|Hay mucho más por leer\.|Un año|Seguir gratis/);
  });

  it("armed soft-paywall backdrop free-dismiss lands on post-dismiss-handoff", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 1, lastDay: today, lecturaStartedAt: 1 });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 450));
    fireEvent.click(screen.getByTestId("soft-paywall"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
  });

  it("A2HS after iOS Safari free dismiss sits on Doctora handoff — once, locked copy", async () => {
    const today = localToday();
    cleanup();
    mockA2hsEnv();
    seedProgress({ streak: 1, lastDay: today, lecturaStartedAt: 1 });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("a2hs-sheet")).toBeTruthy();
    expect(screen.getByTestId("a2hs-title").textContent).toBe("Agrega Ándale a tu pantalla de inicio");
    expect(screen.getByTestId("a2hs-how").textContent).toBe("Toca Compartir, luego «Agregar a pantalla de inicio».");
    expect(screen.getByTestId("a2hs-dismiss").textContent).toBe("Ahora no");
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).a2hsSeen).toBe(true);
    expect(document.body.textContent).not.toMatch(/La historia sigue\.|Hay mucho más por leer\./);
    expect(screen.getByTestId("a2hs-sheet").textContent).not.toMatch(/\$39\.99|\$6\.99/);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("a2hs-title").textContent).toBe("Add Ándale to your Home Screen"));
    expect(screen.getByTestId("a2hs-how").textContent).toBe("Tap Share, then Add to Home Screen.");
    expect(screen.getByTestId("a2hs-dismiss").textContent).toBe("Not now");
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);

    await user.click(screen.getByTestId("a2hs-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("a2hs-sheet")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();

    cleanup();
    mockA2hsEnv();
    render(<App />);
    await awaitHome();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).a2hsSeen).toBe(true);
  });

  it("A2HS skips non-iOS Safari, standalone, seen flag, and price-plan dismiss", async () => {
    const today = localToday();
    const user = userEvent.setup();

    cleanup();
    mockA2hsEnv({ userAgent: JSDOM_UA, standalone: false });
    seedProgress({ streak: 1, lastDay: today, lecturaStartedAt: 1 });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).a2hsSeen).not.toBe(true);

    cleanup();
    mockA2hsEnv({ standalone: true });
    seedProgress({ streak: 1, lastDay: today, lecturaStartedAt: 1 });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await userEvent.setup().click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();

    cleanup();
    mockA2hsEnv();
    seedProgress({ streak: 1, lastDay: today, a2hsSeen: true, lecturaStartedAt: 1 });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await userEvent.setup().click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();

    cleanup();
    mockA2hsEnv();
    seedProgress({ uiLang: "en", streak: 1, lastDay: today, lecturaStartedAt: 1 });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await userEvent.setup().click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(window.__andalePurchaseLog?.at(-1)?.reason).toBe("web_no_iap"));
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).a2hsSeen).not.toBe(true);

    cleanup();
    mockA2hsEnv({ userAgent: MAC_SAFARI_UA, platform: "MacIntel", maxTouchPoints: 0 });
    seedProgress({ streak: 1, lastDay: today, lecturaStartedAt: 1 });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await userEvent.setup().click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
  });

  it("A2HS shows on iPadOS Safari desktop mode (Macintosh UA + touch)", async () => {
    const today = localToday();
    cleanup();
    mockA2hsEnv({ userAgent: MAC_SAFARI_UA, platform: "MacIntel", maxTouchPoints: 5 });
    seedProgress({ streak: 1, lastDay: today, lecturaStartedAt: 1 });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("a2hs-sheet")).toBeTruthy();
    expect(screen.getByTestId("a2hs-title").textContent).toBe("Agrega Ándale a tu pantalla de inicio");
    expect(screen.getByTestId("a2hs-how").textContent).toBe("Toca Compartir, luego «Agregar a pantalla de inicio».");
    expect(screen.getByTestId("a2hs-dismiss").textContent).toBe("Ahora no");
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).a2hsSeen).toBe(true);
  });

  it("header mute and locked unit-node aria follow uiLang", async () => {
    cleanup();
    seedProgress({ sound: false });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Sonido" }).getAttribute("aria-label")).toBe("Sonido");
    expect(screen.getByRole("button", { name: "Pretérito vs. imperfecto (bloqueado)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Subjuntivo presente \((bloqueado|blocked)\)/ })).toBeNull();

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Sound" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Sound" }).getAttribute("aria-label")).toBe("Sound");
    expect(screen.getByRole("button", { name: "Pretérito vs. imperfecto (blocked)" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: / \(bloqueado\)/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sonido" })).toBeNull();
  });

  it("perfil context-lang aria follows uiLang", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-perfil"));
    expect(screen.getByTestId("perfil-lang-en").getAttribute("aria-label")).toBe("Idioma de contexto: inglés");
    expect(screen.getByTestId("perfil-lang-es").getAttribute("aria-label")).toBe("Idioma de contexto: español");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("perfil-lang-en").getAttribute("aria-label")).toBe("English context language"));
    expect(screen.getByTestId("perfil-lang-es").getAttribute("aria-label")).toBe("Spanish context language");
    expect(screen.getByText("Context language")).toBeTruthy();
  });

  it("lesson listen aria follows uiLang", async () => {
    cleanup();
    seedProgress();
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Listen lock",
        unitId: "subj1",
        host: "luna",
        questions: [{
          type: "listen",
          text: "Es importante que llegues temprano a la reunión.",
          answers: ["Es importante que llegues temprano a la reunión"],
        }],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Escuchar" }).getAttribute("aria-label")).toBe("Escuchar");
    expect(screen.getByRole("button", { name: "Más lento" }).getAttribute("aria-label")).toBe("Más lento");
    expect(screen.getByTestId("lesson-listen-skip").textContent).toBe("Saltar");
    expect(screen.getByTestId("lesson-listen-skip-hint").textContent).toBe("Si no puedes oír");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Listen" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Listen" }).getAttribute("aria-label")).toBe("Listen");
    expect(screen.getByRole("button", { name: "Slower" }).getAttribute("aria-label")).toBe("Slower");
    expect(screen.queryByRole("button", { name: "Escuchar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Más lento" })).toBeNull();
    expect(screen.getByTestId("lesson-listen-skip").textContent).toBe("Skip");
    expect(screen.getByTestId("lesson-listen-skip-hint").textContent).toBe("If you can’t hear");
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("lesson-listen-skip").textContent).toBe("Saltar"));
    expect(screen.getByTestId("lesson-listen-skip-hint").textContent).toBe("Si no puedes oír");
  });

  it("story listen and nav aria follow uiLang", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Párrafo 1" }).getAttribute("aria-label")).toBe("Párrafo 1");
    expect(screen.getByRole("button", { name: "Preguntas" }).getAttribute("aria-label")).toBe("Preguntas");
    expect(screen.queryByRole("button", { name: "Escuchar párrafo" })).toBeNull();
    const storyWord = [...document.querySelectorAll("span")].find((el) =>
      el.textContent === "cempasúchil" && el.style.cursor === "pointer");
    expect(storyWord).toBeTruthy();
    await user.click(storyWord);
    await waitFor(() => expect(screen.getByRole("button", { name: "Escuchar palabra" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Escuchar palabra" }).getAttribute("aria-label")).toBe("Escuchar palabra");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Paragraph 1" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Paragraph 1" }).getAttribute("aria-label")).toBe("Paragraph 1");
    expect(screen.getByRole("button", { name: "Questions" }).getAttribute("aria-label")).toBe("Questions");
    expect(screen.queryByRole("button", { name: "Listen to paragraph" })).toBeNull();
    expect(screen.getByRole("button", { name: "Listen to word" }).getAttribute("aria-label")).toBe("Listen to word");
    expect(screen.queryByRole("button", { name: "Párrafo 1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Escuchar párrafo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Escuchar palabra" })).toBeNull();
  });

  it("Recuerdos / Souvenir trail is a Mexico map with locked pin labels", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const map = screen.getByTestId("recuerdos-map");
    expect(map.textContent).toMatch(/Recuerdos/);
    expect(map.textContent).not.toMatch(/Ruta de recuerdos/);
    expect(screen.getByTestId("recuerdos-outline")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-outline").tagName).toBe("IMG");
    expect(screen.getByTestId("recuerdos-outline").getAttribute("src")).toMatch(/assets\/dave-cleared-mexico-map\.png/);
    expect(screen.getByTestId("recuerdos-fog")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-fog-cdmx")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-fog-oaxaca")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-fog-yucatan")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-fog-norte")).toBeTruthy();
    expect(screen.queryByTestId("recuerdos-fog-bajio")).toBeNull();
    expect(screen.getByTestId("recuerdos-cenzontle").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.getByTestId("recuerdos-bajio-glow")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-bajio-glow").className).toMatch(/bajio-glow/);
    expect(screen.getByTestId("recuerdos-bajio-glow").style.boxShadow).toBe(RECUERDOS_PIN_SHADOW);
    expect(screen.getByTestId("recuerdos-bajio-glow").style.background).toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    const cream = /#F4EDE0|rgb\(\s*244,\s*237,\s*224\s*\)/i;
    const bajioLabels = screen.getByTestId("recuerdos-pin-bajio").querySelectorAll("span span");
    expect(bajioLabels[0].style.color).toMatch(cream);
    expect(bajioLabels[1].style.color).toMatch(cream);
    const cdmxDot = screen.getByTestId("recuerdos-pin-cdmx").querySelector("span");
    expect(cdmxDot.style.boxShadow).toBe(RECUERDOS_PIN_SHADOW_LOCKED);
    const cdmxLabels = screen.getByTestId("recuerdos-pin-cdmx").querySelectorAll("span span");
    expect(cdmxLabels[0].style.color).toMatch(cream);
    expect(map.querySelector("nav")).toBeNull();
    expect(screen.queryByTestId("nav-recuerdos")).toBeNull();

    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Bajío/);
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-bajio").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/CDMX/);
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Oaxaca/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Yucatán/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Norte/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Cerrado/);

    expect(recuerdosSurfaceHasCuts(map.textContent)).toBe(false);
    expect(recuerdosHasProgressFraction(map.textContent)).toBe(false);
    expect(map.innerHTML).not.toMatch(/parroquia|sma-lanterns|12\/25|¡Sigue explorando!|Sigue explorando|backpack/i);
    expect(screen.getByTestId("nav-lectura").textContent).toMatch(/Lectura/);
    expect(screen.getByTestId("nav-lectura").textContent).not.toMatch(/Sigue|explorando|NEW|12\/25/i);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-map").textContent).toMatch(/Souvenir trail/));
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Bajío/);
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Open/);
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Locked/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Locked/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Locked/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/North/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Locked/);
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).not.toMatch(/Norte/);
    expect(recuerdosSurfaceHasCuts(screen.getByTestId("recuerdos-map").textContent)).toBe(false);
    expect(recuerdosHasProgressFraction(screen.getByTestId("recuerdos-map").textContent)).toBe(false);
  });

  it("Recuerdos Yucatán opens after a claimed souvenir; cuts stay off the map", async () => {
    cleanup();
    seedProgress({ stories: { "story-2": true }, storyCollectibles: { "story-2": true } });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    await user.click(screen.getByTestId("nav-lectura"));
    expect(screen.getByTestId("recuerdos-pin-bajio").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-yucatan").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Yucatán/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Abierto/);
    expect(screen.queryByTestId("recuerdos-fog-yucatan")).toBeNull();
    expect(screen.getByTestId("recuerdos-fog-cdmx")).toBeTruthy();
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Cerrado/);
    expect(recuerdosHasProgressFraction(screen.getByTestId("recuerdos-map").textContent)).toBe(false);
    expect(screen.getByTestId("recuerdos-map").innerHTML).not.toMatch(/¡Sigue explorando!|12\/25|parroquia/i);
  });

  it("practice miss feedback, Focus, and Why follow uiLang", async () => {
    cleanup();
    seedProgress({
      uiLang: "en",
      hearts: 5,
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 4 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    const unitBtn = screen.queryByRole("button", { name: "Subjuntivo presente" })
      || (await openCaminoMore(user), screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(unitBtn);
    await user.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await waitFor(() => expect(document.body.textContent).toMatch(/Te llamo cuando/));
    const saldre = [...screen.getAllByTestId("bank-tile")].find((el) => el.textContent.trim() === "saldré");
    expect(saldre).toBeTruthy();
    await user.click(saldre);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByTestId("practice-quip")).toBeTruthy());
    expect(screen.getByTestId("practice-quip").textContent).not.toMatch(/La idea está|Cerca\.|Respira\.|mal estacionado/);
    expect(screen.getByTestId("practice-focus").textContent).toBe("Focus: Verb mood");
    expect(screen.getByTestId("practice-focus").textContent).not.toMatch(/Modo verbal/);
    await user.click(screen.getByRole("button", { name: /Why\?/ }));
    expect(screen.getByTestId("practice-why").textContent).toBe("«Cuando» + future action → subjunctive. Habit would be indicative: «cuando salgo».");
    expect(screen.getByTestId("practice-why").textContent).not.toMatch(/acción futura|Hábito sería/);

    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("practice-focus").textContent).toBe("Foco: Modo verbal"));
    expect(screen.getByTestId("practice-quip").textContent).toMatch(/Cerca\.|La idea está|Respira\.|mal estacionado/);
    expect(screen.getByTestId("practice-why").textContent).toBe("«Cuando» + acción futura → subjuntivo. Hábito sería indicativo: «cuando salgo».");
  });

  it("number-row keys insert TAP AN ANSWER chips without breaking tap", async () => {
    cleanup();
    seedProgress({
      uiLang: "en",
      hearts: 5,
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 4 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    const unitBtn = screen.queryByRole("button", { name: "Subjuntivo presente" })
      || (await openCaminoMore(user), screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(unitBtn);
    await user.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await waitFor(() => expect(document.body.textContent).toMatch(/Te llamo cuando/));
    const tiles = screen.getAllByTestId("bank-tile");
    expect(tiles.length).toBeGreaterThan(1);
    const hints = screen.getAllByTestId("choice-chip-key");
    expect(hints.map((el) => el.textContent)).toEqual(CHOICE_CHIP_KEYS.slice(0, tiles.length));
    expect(document.body.textContent).not.toMatch(/press 1|Press 1|pulsa 1|Pulsa 1/);
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("lang-es").getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getAllByTestId("choice-chip-key").map((el) => el.textContent)).toEqual(CHOICE_CHIP_KEYS.slice(0, tiles.length));
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
    const tilesAfter = screen.getAllByTestId("bank-tile");
    const saldreIdx = tilesAfter.findIndex((el) => el.textContent.trim() === "saldré");
    expect(saldreIdx).toBeGreaterThanOrEqual(0);
    const key = CHOICE_CHIP_KEYS[saldreIdx];
    expect(key).toBeTruthy();
    const blank = document.querySelector("input[placeholder]");
    expect(blank).toBeTruthy();
    blank.focus();
    await user.keyboard(key);
    expect(blank.value).toBe("saldré");
    expect(blank.value).not.toBe(key);

    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByTestId("practice-focus")).toBeTruthy());
    expect(screen.getByTestId("practice-focus").textContent).toBe("Focus: Verb mood");
    await user.click(screen.getByRole("button", { name: /Why\?/ }));
    expect(screen.getByTestId("practice-why").textContent).toBe("«Cuando» + future action → subjunctive. Habit would be indicative: «cuando salgo».");
  });

  it("BUILD WITH WORDS unused chips use the dark idle plate and cream labels", async () => {
    cleanup();
    seedProgress({
      uiLang: "en",
      theme: "dark",
      hearts: 5,
      resume: { unitId: "subj1", order: [{ u: "subj1", i: 10 }], qi: 0, xp: 0, right: 0, wrong: 0 },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    const unitBtn = screen.queryByRole("button", { name: "Subjuntivo presente" })
      || (await openCaminoMore(user), screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(unitBtn);
    await user.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await waitFor(() => expect(document.body.textContent).toMatch(/BUILD WITH WORDS/));
    expect(document.body.textContent).toMatch(/Write what you hear|Write the full sentence/);
    const tiles = screen.getAllByTestId("bank-tile");
    expect(tiles.length).toBeGreaterThan(3);
    const check = screen.getByTestId("lesson-check");
    const lime = /#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i;
    const cream = /#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i;
    expect(check.style.background).toMatch(lime);
    tiles.forEach((tile) => {
      expect(tile.style.color).toMatch(cream);
      expect(tile.style.background).toMatch(/#252830|rgb\(\s*37,\s*40,\s*48\s*\)/i);
      expect(tile.style.background).not.toMatch(/#fff|#ffffff|rgb\(\s*255,\s*255,\s*255\s*\)/i);
      expect(Number.parseInt(tile.style.fontWeight, 10)).toBeGreaterThanOrEqual(800);
    });
    expect(tiles.some((tile) => /llegues|temprano|reunión/i.test(tile.textContent))).toBe(true);
  });
});
