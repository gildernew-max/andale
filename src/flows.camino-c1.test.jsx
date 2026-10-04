import { describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { prevDayKey } from "./firstDoor.js";
import { isBajioUnlockFlashDue, isCdmxUnlockFlashDue, isOaxacaUnlockFlashDue, markBajioUnlockFlashDue, markCdmxUnlockFlashDue, markNorteUnlockFlashDue, markOaxacaUnlockFlashDue, markYucatanUnlockFlashDue, recuerdosHasProgressFraction, recuerdosSurfaceHasCuts } from "./recuerdos.js";
import { SAFE_RISKY_MULTI_FIXTURE, startSafeRiskyRun } from "./safeRisky.js";
import { startCubetasRun } from "./cubetas.js";
import { startHangmanRun } from "./hangman.js";
import { startMemoryRun } from "./memory.js";
import { startJeopardyRun } from "./jeopardy.js";
import { startMatchRun } from "./matchPairs.js";
import { LECTURA_HANDOFF_CTA, LECTURA_HANDOFF_QUIET } from "./lecturaHandoff.js";
import { WAITLIST_STORE_KEY } from "./waitlist.js";
import { FIRST_WIN_EMAIL_ERROR, FIRST_WIN_EMAIL_PRIVACY_LINK, FIRST_WIN_EMAIL_SUCCESS } from "./firstWinEmail.js";
import { COLLECTOR_DEVICE_KEY, setCollectorEndpointOverride } from "./collector.js";
import { PAYWALL_SOURCE } from "./paywallHeadline.js";
import {
  installFlowHooks,
  STORAGE_KEY,
  LIVE_KEY,
  seedProgress,
  seedColdFirstVisit,
  mockBrowser,
  boot,
  awaitHome,
  contrastRatio,
  HUB_DOCTOR_RE,
  startHoyFromHub,
  clickHoySceneMc,
  localToday,
  expectedComeBack,
  assertFreeWinFlyAway,
  assertSoftPaywallAnnualPrimary,
  awaitSoftPaywallAfterFirstWin,
  assertNoWallBeforeLectura,
  openStory0,
  lecturaThenBajioWall,
  awaitCdmxFlashThenIdle,
  awaitCdmxFlashVisible,
  awaitOaxacaFlashThenIdle,
  awaitOaxacaFlashVisible,
  awaitYucatanFlashThenIdle,
  playShortHoyBeat,
  funnelOf,
  WALL_STRING_IDS,
} from "./flowsHarness.jsx";

installFlowHooks();

describe("simulated learner flows", { timeout: 15000 }, () => {
  const FIRST_WIN_TEST_ENDPOINT = "https://example.test/collector";

  const reachFirstHoyWin = async (user, extra = {}, { endpoint = "" } = {}) => {
    cleanup();
    setCollectorEndpointOverride(endpoint || undefined);
    if (endpoint) {
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, type: "opaque", status: 0 })));
      Object.defineProperty(navigator, "sendBeacon", { configurable: true, writable: true, value: () => true });
    }
    const uiLang = extra.uiLang || "es";
    seedProgress({ streak: 0, lastDay: null, uiLang: "es", ...extra });
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
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelector(".choice-card"));
    await user.click(screen.getByTestId("lesson-check"));
    await user.click(await screen.findByRole("button", { name: uiLang === "en" ? /^Continue$/i : /^Continuar$/i }));
    await screen.findByTestId("hoy-win");
    if (endpoint) await screen.findByTestId("first-win-email");
    await screen.findByTestId("lectura-handoff-cta");
  };

  const styleHas = (el, hex) => {
    const raw = (el.getAttribute("style") || "").toLowerCase().replace(/\s/g, "");
    const n = hex.replace("#", "");
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return raw.includes(hex.toLowerCase()) || raw.includes(`rgb(${r},${g},${b})`);
  };

  it("with both endpoints empty, the first-win email card is not rendered", async () => {
    const user = userEvent.setup();
    await reachFirstHoyWin(user);
    expect(screen.queryByTestId("first-win-email")).toBeNull();
    expect(screen.queryByTestId("first-win-email-input")).toBeNull();
    expect(screen.queryByTestId("first-win-email-skip")).toBeNull();
    expect(screen.queryByTestId("first-win-email-submit")).toBeNull();
    expect(screen.getByTestId("lectura-handoff")).toBeTruthy();
    expect(localStorage.getItem(WAITLIST_STORE_KEY)).toBeNull();
  });

  it("with both endpoints empty, first win sends no usage events and writes no device id", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true }));
    const beaconSpy = vi.fn(() => true);
    vi.stubGlobal("fetch", fetchSpy);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, writable: true, value: beaconSpy });
    const user = userEvent.setup();
    await reachFirstHoyWin(user);
    expect(screen.queryByTestId("first-win-email")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(COLLECTOR_DEVICE_KEY)).toBeNull();
    expect(localStorage.getItem(WAITLIST_STORE_KEY)).toBeNull();
  });

  it("first-win email skip still opens Lectura, and a bad address does not", async () => {
    const user = userEvent.setup();
    await reachFirstHoyWin(user, {}, { endpoint: FIRST_WIN_TEST_ENDPOINT });
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    expect(screen.getByTestId("first-win-email-skip").textContent).toBe("Ahora no");
    expect(screen.getByTestId("first-win-email-prompt").textContent).toBe("Déjanos tu correo y te avisamos cuando haya historias nuevas.");
    expect(screen.getByTestId("first-win-email").textContent).not.toMatch(/Leave your email/);
    const privacyEs = screen.getByTestId("first-win-email-privacy-link");
    expect(privacyEs.textContent).toBe(FIRST_WIN_EMAIL_PRIVACY_LINK.es);
    expect(privacyEs.tagName).toBe("A");
    expect(privacyEs.getAttribute("href")).toMatch(/privacy\.html#correo-y-datos$/);
    expect(styleHas(privacyEs, "#5E6650")).toBe(true);
    expect(privacyEs.className).not.toMatch(/duo-btn/);
    expect(screen.getByTestId("first-win-email-skip").className).not.toMatch(/duo-btn/);
    await waitFor(() => expect(funnelOf("first-win-seen").length).toBeGreaterThan(0));
    expect(funnelOf("email-submitted")).toHaveLength(0);
    expect(funnelOf("email-skipped")).toHaveLength(0);

    await user.click(screen.getByTestId("first-win-email-submit"));
    expect(screen.getByTestId("first-win-email-error").textContent).toBe(FIRST_WIN_EMAIL_ERROR.es);
    expect(screen.queryByTestId("story-reader")).toBeNull();
    expect(screen.getByTestId("lectura-handoff-cta")).toBeTruthy();
    expect(funnelOf("email-submitted")).toHaveLength(0);

    await user.type(screen.getByTestId("first-win-email-input"), "not-an-email");
    await user.click(screen.getByTestId("first-win-email-submit"));
    expect(screen.getByTestId("first-win-email-error").textContent).toBe(FIRST_WIN_EMAIL_ERROR.es);
    expect(screen.queryByTestId("story-reader")).toBeNull();
    expect(screen.getByTestId("hoy-win")).toBeTruthy();
    expect(localStorage.getItem(WAITLIST_STORE_KEY)).toBeNull();
    expect(funnelOf("email-submitted")).toHaveLength(0);

    await user.click(screen.getByTestId("first-win-email-skip"));
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-0");
    expect(reader.textContent).toMatch(/La noche en que vuelven/);
    expect(funnelOf("email-skipped").length).toBeGreaterThan(0);
    expect(funnelOf("lectura_start").some((e) => e.storyId === "story-0")).toBe(true);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/not-an-email|@/);
    for (const step of funnelOf("email-skipped").concat(funnelOf("first-win-seen"))) {
      expect(step.email).toBeUndefined();
      expect(Object.keys(step).sort()).toEqual(["at", "event"]);
    }
  });

  it("a valid first-win email does not block Lectura", async () => {
    const user = userEvent.setup();
    await reachFirstHoyWin(user, {}, { endpoint: FIRST_WIN_TEST_ENDPOINT });
    await user.type(screen.getByTestId("first-win-email-input"), "  ada@example.com ");
    await user.click(screen.getByTestId("first-win-email-submit"));
    await waitFor(() => expect(screen.getByTestId("first-win-email-success").textContent).toBe(FIRST_WIN_EMAIL_SUCCESS.es));
    expect(screen.queryByTestId("first-win-email-error")).toBeNull();
    expect(JSON.parse(localStorage.getItem(WAITLIST_STORE_KEY)).email).toBe("ada@example.com");
    await waitFor(() => expect(funnelOf("email-submitted").length).toBeGreaterThan(0));
    expect(JSON.stringify(funnelOf("email-submitted"))).not.toMatch(/ada@example|@/);
    expect(screen.getByTestId("lectura-handoff-cta")).toBeTruthy();
    await user.click(screen.getByTestId("lectura-handoff-cta"));
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-0");
    expect(funnelOf("lectura_start").some((e) => e.storyId === "story-0")).toBe(true);
    expect(JSON.stringify(window.__andaleFunnelLog)).not.toMatch(/ada@example/);
  });

  it("a set endpoint shows the dark email card, and the Lectura handoff stays the main cream card", async () => {
    const user = userEvent.setup();
    await reachFirstHoyWin(user, { theme: "dark", uiLang: "en" }, { endpoint: FIRST_WIN_TEST_ENDPOINT });
    const box = screen.getByTestId("lectura-handoff");
    const quiet = screen.getByTestId("lectura-handoff-quiet");
    const cta = screen.getByTestId("lectura-handoff-cta");
    expect(quiet.textContent).toBe(LECTURA_HANDOFF_QUIET.en);
    expect(cta.textContent).toBe(LECTURA_HANDOFF_CTA.en);
    expect(styleHas(box, "#F6EFE4")).toBe(true);
    expect(styleHas(cta, "#5C7356")).toBe(true);
    expect(quiet.style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
    expect(quiet.style.fontSize).toBe("13px");
    expect(quiet.style.fontWeight).toBe("700");
    expect(cta.className).not.toMatch(/duo-btn/);
    const privacyEn = screen.getByTestId("first-win-email-privacy-link");
    expect(privacyEn.textContent).toBe(FIRST_WIN_EMAIL_PRIVACY_LINK.en);
    expect(privacyEn.tagName).toBe("A");
    expect(privacyEn.getAttribute("href")).toMatch(/privacy\.html#correo-y-datos$/);
    expect(styleHas(privacyEn, "#CDBBA6")).toBe(true);
    expect(screen.getByTestId("first-win-email").textContent).not.toMatch(/Privacidad/);
  });

  it("Lectura handoff quiet line is #6B6258 on the cream strip in dark and stays #777777 in light", async () => {
    const user = userEvent.setup();
    await reachFirstHoyWin(user, { theme: "dark", uiLang: "es" });
    const darkQuiet = screen.getByTestId("lectura-handoff-quiet");
    const darkStrip = screen.getByTestId("lectura-handoff");
    const darkCta = screen.getByTestId("lectura-handoff-cta");
    expect(darkQuiet.textContent).toBe(LECTURA_HANDOFF_QUIET.es);
    expect(darkQuiet.style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
    expect(darkQuiet.style.fontSize).toBe("13px");
    expect(darkQuiet.style.fontWeight).toBe("700");
    expect(styleHas(darkStrip, "#F6EFE4")).toBe(true);
    expect(styleHas(darkCta, "#5C7356")).toBe(true);
    expect(contrastRatio("#6B6258", "#F6EFE4")).toBeGreaterThanOrEqual(4.5);

    await reachFirstHoyWin(user, { theme: "light", uiLang: "es" });
    const lightQuiet = screen.getByTestId("lectura-handoff-quiet");
    expect(lightQuiet.textContent).toBe(LECTURA_HANDOFF_QUIET.es);
    expect(lightQuiet.style.color).toMatch(/#777777|rgb\(\s*119,\s*119,\s*119\s*\)/i);
    expect(styleHas(screen.getByTestId("lectura-handoff"), "#F6EFE4")).toBe(true);
    expect(styleHas(screen.getByTestId("lectura-handoff-cta"), "#5C7356")).toBe(true);
  });

  it("Lectura handoff once-gate stays down, and a claimed story-0 opens the next unread", async () => {
    cleanup();
    seedProgress({ uiLang: "es", lecturaHandoffSeen: true, streak: 1, lastDay: localToday() });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "done",
      tab: "camino",
      lessonStats: { right: 1, wrong: 0 },
      session: {
        firstHoy: true,
        title: "Noche de faroles",
        host: "luna",
        questions: [{}],
        awarded: true,
        earnedXP: 12,
        earnedGems: 1,
      },
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("lectura-handoff")).toBeNull();
    expect(screen.getByTestId("win-fly-away")).toBeTruthy();

    cleanup();
    seedProgress({ uiLang: "es", stories: { "story-0": true }, streak: 1, lastDay: localToday() });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "done",
      tab: "camino",
      lessonStats: { right: 1, wrong: 0 },
      session: {
        firstHoy: true,
        title: "Noche de faroles",
        host: "luna",
        questions: [{}],
        awarded: true,
        earnedXP: 12,
        earnedGems: 1,
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    const cta = await screen.findByTestId("lectura-handoff-cta");
    expect(cta.getAttribute("data-story-id")).toBe("story-1");
    expect(screen.getByTestId("lectura-handoff-quiet").textContent).toBe(LECTURA_HANDOFF_QUIET.es);
    await user.click(cta);
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-1");
    expect(reader.textContent).toMatch(/La casa azul/);
  });

  it("bank Hoy first-win That's it. plays the Cenzontle bounce, not avatars + confetti", async () => {
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
    expect(document.body.textContent).toMatch(/Cita en el banco|agendar una cita/);
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => {
      expect(screen.getByTestId("hoy-win")).toBeTruthy();
      expect(screen.getByTestId("win-fly-away")).toBeTruthy();
    });
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    assertFreeWinFlyAway();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.queryByTestId("story-0-beat")).toBeNull();
    expect(screen.queryByTestId("win-perch")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("That's it."));
  });

  it("dark soft paywall title and prices are cream on #1E2128, not near-white on cream", async () => {
    cleanup();
    seedProgress({ theme: "dark", uiLang: "es", streak: 1, lastDay: localToday(), paywallSeen: false, lecturaStartedAt: 1 });
    await boot();
    await waitFor(() => expect(screen.getByTestId("soft-paywall-card")).toBeTruthy());
    const cream = /#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i;
    const nearWhite = /#E8E8EA|#FFFFFF|rgb\(\s*232,\s*232,\s*234\s*\)|rgb\(\s*255,\s*255,\s*255\s*\)/i;
    const darkCard = /#1E2128|rgb\(\s*30,\s*33,\s*40\s*\)/i;
    const card = screen.getByTestId("soft-paywall-card");
    const headline = screen.getByTestId("soft-paywall-headline");
    const annualPrice = screen.getByTestId("soft-paywall-annual-price");
    const monthlyPrice = screen.getByTestId("soft-paywall-monthly-price");
    expect(card.style.background).toMatch(darkCard);
    expect(card.style.background).not.toMatch(/rgba|hsla|\/\s*0?\.\d/);
    expect(card.style.opacity).toBe("1");
    expect(card.style.backdropFilter).toBe("none");
    expect(card.className).not.toMatch(/\bpop\b/);
    expect(card.style.background).not.toMatch(cream);
    expect(headline.style.color).toMatch(cream);
    expect(headline.style.color).not.toMatch(nearWhite);
    expect(annualPrice.style.color).toMatch(cream);
    expect(annualPrice.style.color).not.toMatch(nearWhite);
    expect(monthlyPrice.style.color).toMatch(cream);
    expect(monthlyPrice.style.color).not.toMatch(nearWhite);
    expect(screen.getByTestId("soft-paywall-monthly").style.background).toMatch(darkCard);
    expect(screen.getByTestId("soft-paywall-monthly").style.color).toMatch(cream);
    expect(screen.getByTestId("soft-paywall-annual").style.background).toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.getByTestId("soft-paywall-dismiss").style.color).toMatch(/#CDBBA6|rgb\(\s*205,\s*187,\s*166\s*\)/i);
    const honesty = screen.getByTestId("soft-paywall-honesty");
    expect(honesty.style.fontSize).toBe("11px");
    expect(honesty.style.fontWeight).toBe("700");
    expect(honesty.style.lineHeight).toBe("1.45");
    expect(honesty.style.color).toMatch(/#A0A4AB|rgb\(\s*160,\s*164,\s*171\s*\)/i);
    expect(screen.getByTestId("soft-paywall-disclosure").style.color).toMatch(/#A0A4AB|rgb\(\s*160,\s*164,\s*171\s*\)/i);
  });

  it("cold first Hoy CONTINUE shows soft paywall once before idle home", async () => {
    cleanup();
    localStorage.clear();
    seedColdFirstVisit();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash-start")).toBeTruthy());
    await user.click(screen.getByTestId("splash-start"));
    await awaitHome();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await startHoyFromHub(user);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await clickHoySceneMc(user);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await lecturaThenBajioWall(user);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Hay mucho más por leer.");
    assertSoftPaywallAnnualPrimary("es");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("come-back-tomorrow")).toBeTruthy();
    cleanup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
  });

  it("first streak-1 Eso shows Bajío unlock flash once, then existing paywall", async () => {
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
    const seedFirstHoyLive = () => {
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
    };
    seedFirstHoyLive();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    assertNoWallBeforeLectura();
    await openStory0(user);
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("bajio-unlock-flash")).toBeTruthy());
    const flash = screen.getByTestId("bajio-unlock-flash");
    expect(screen.getByTestId("bajio-unlock-flash-copy").textContent).toBe("Abierto");
    expect(flash.textContent.trim()).toBe("Abierto");
    expect(flash.textContent).not.toMatch(/Bajío|¡Sigue explorando!|Sigue explorando/);
    expect(screen.getByTestId("bajio-unlock-flash-glow").className).toMatch(/bajio-glow/);
    expect(recuerdosSurfaceHasCuts(flash.textContent)).toBe(false);
    expect(recuerdosHasProgressFraction(flash.textContent)).toBe(false);
    expect(flash.textContent).not.toMatch(/¡Sigue explorando!|12\/25|backpack/i);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).toBe(true);
    expect(isBajioUnlockFlashDue()).toBe(true);
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy(), { timeout: 3000 });
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Hay mucho más por leer.");

    cleanup();
    seedProgress({ streak: 0, lastDay: null, bajioUnlockSeen: true, paywallSeen: false });
    seedFirstHoyLive();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const replay = userEvent.setup();
    await replay.click(document.querySelectorAll(".choice-card")[0]);
    await replay.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await replay.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win")).toBeTruthy());
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    await replay.click(screen.getByTestId("hoy-win-continue"));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    await openStory0(replay);
    await replay.click(screen.getByTestId("brand-home"));
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    assertSoftPaywallAnnualPrimary("es");
  });

  it("CONTINUE after first streak-1 Eso cannot skip the Bajío flash onto the paywall", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 8, 8, 12, 0, 0));
    try {
      cleanup();
      localStorage.clear();
      seedColdFirstVisit();
      markBajioUnlockFlashDue(false);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <StrictMode>
          <App />
        </StrictMode>
      );
      await waitFor(() => expect(screen.getByTestId("splash-start")).toBeTruthy());
      await user.click(screen.getByTestId("splash-start"));
      await awaitHome();
      await user.click(screen.getByTestId("lang-es"));
      await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
      await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
      await startHoyFromHub(user);
      await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
      const choice = [...document.querySelectorAll(".choice-card")].find((el) =>
        el.textContent.includes("natural y firme"));
      expect(choice).toBeTruthy();
      await user.click(choice);
      await user.click(screen.getByTestId("lesson-check"));
      await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
      await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
      await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
      expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
      expect(screen.queryByTestId("soft-paywall")).toBeNull();
      await user.click(screen.getByTestId("hoy-win-continue"));
      await lecturaThenBajioWall(user);
      expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Hay mucho más por leer.");
      assertSoftPaywallAnnualPrimary("es");
    } finally {
      vi.useRealTimers();
    }
  });

  it("Landlord WhatsApp first streak-1 CONTINUE shows Abierto before paywall", async () => {
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
    expect(document.body.textContent).toMatch(/WhatsApp del casero|depósito cuenta/);
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await lecturaThenBajioWall(user);
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Hay mucho más por leer.");
    assertSoftPaywallAnnualPrimary("es");
  });

  it("remount after first Eso CONTINUE still plays Bajío flash before paywall", async () => {
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
    await user.click(document.querySelectorAll(".choice-card")[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hoy-win-continue")).toBeTruthy());
    await user.click(screen.getByTestId("hoy-win-continue"));
    await waitFor(() => expect(isBajioUnlockFlashDue() || screen.queryByTestId("bajio-unlock-flash")).toBeTruthy());
    const saved = localStorage.getItem(STORAGE_KEY);
    cleanup();
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("bajio-unlock-flash")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("bajio-unlock-flash-copy").textContent).toBe("Abierto");
    await waitFor(() => expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull(), { timeout: 3000 });
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect((window.__andaleFunnelLog || []).some((e) => e.event === "paywall_seen")).toBe(false);
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
  });

  it("day-2 Hoy Eso CONTINUE shows CDMX Abierto before idle — not paywall", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "landlord" },
    });
    const hoyMc = (prompt) => ({
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
        firstHoy: true,
        day2Hoy: true,
        host: "luna",
        questions: [
          hoyMc("«Mostrador» frente a «ventanilla» en el aeropuerto marca:"),
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
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("session-close")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitCdmxFlashThenIdle();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-pin-cdmx")).toBeTruthy());
    expect(screen.getByTestId("recuerdos-pin-cdmx").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Abierto/);
    expect(screen.queryByTestId("recuerdos-fog-cdmx")).toBeNull();
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-oaxaca").getAttribute("data-open")).toBe("false");
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").getAttribute("data-open")).toBe("false");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
  });

  it("CONTINUE after day-2 Hoy Eso cannot skip the CDMX flash onto idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "taqueria" },
    });
    const hoyMc = (prompt) => ({
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
        host: "luna",
        questions: [
          hoyMc("«Mostrador» frente a «ventanilla» en el aeropuerto marca:"),
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
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitCdmxFlashVisible();
    expect(isCdmxUnlockFlashDue()).toBe(true);
    expect(screen.queryByTestId("hero-cta") && !screen.queryByTestId("cdmx-unlock-flash")).toBeFalsy();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await awaitCdmxFlashThenIdle();
  });

  it("official walk day-2 Hoy CONTINUE shows CDMX glow before idle — StrictMode", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 8, 8, 12, 0, 0));
    try {
      cleanup();
      localStorage.clear();
      seedColdFirstVisit();
      markBajioUnlockFlashDue(false);
      markCdmxUnlockFlashDue(false);
      markOaxacaUnlockFlashDue(false);
      markYucatanUnlockFlashDue(false);
      markNorteUnlockFlashDue(false);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { unmount } = render(
        <StrictMode>
          <App />
        </StrictMode>
      );
      await waitFor(() => expect(screen.getByTestId("splash-start")).toBeTruthy());
      await user.click(screen.getByTestId("splash-start"));
      await awaitHome();
      await user.click(screen.getByTestId("lang-es"));
      await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
      await startHoyFromHub(user);
      await playShortHoyBeat(user, "natural y firme");
      await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
      await user.click(screen.getByTestId("hoy-win-continue"));
      await lecturaThenBajioWall(user);
      await user.click(screen.getByTestId("soft-paywall-dismiss"));
      await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
      const saved = localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(saved).bajioUnlockSeen).toBe(true);
      expect(JSON.parse(saved).paywallSeen).toBe(true);
      expect(JSON.parse(saved).cdmxUnlockSeen).not.toBe(true);
      expect(JSON.parse(saved).oaxacaUnlockSeen).not.toBe(true);
      expect(JSON.parse(saved).yucatanUnlockSeen).not.toBe(true);
      expect(JSON.parse(saved).norteUnlockSeen).not.toBe(true);
      unmount();
      markBajioUnlockFlashDue(false);
      markCdmxUnlockFlashDue(false);
      markOaxacaUnlockFlashDue(false);
      markYucatanUnlockFlashDue(false);
      markNorteUnlockFlashDue(false);
      vi.setSystemTime(new Date(2026, 8, 9, 12, 0, 0));
      localStorage.setItem(STORAGE_KEY, saved);
      localStorage.removeItem(LIVE_KEY);
      const day2 = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <StrictMode>
          <App />
        </StrictMode>
      );
      await awaitHome();
      await day2.click(screen.getByTestId("lang-es"));
      await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
      expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
      await startHoyFromHub(day2);
      await playShortHoyBeat(day2, "contraste");
      await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
      expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
      expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
      await day2.click(screen.getByTestId("hoy-win-continue"));
      await awaitCdmxFlashVisible();
      expect(screen.queryByTestId("soft-paywall")).toBeNull();
      expect(screen.queryByTestId("session-close")).toBeNull();
      await awaitCdmxFlashThenIdle();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(2);
      expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^2/);
      expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
      expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  }, 15000);

  it("remount after day-2 Hoy CONTINUE still plays CDMX flash before idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "landlord" },
    });
    const hoyMc = (prompt) => ({
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
        firstHoy: true,
        day2Hoy: true,
        host: "luna",
        questions: [
          hoyMc("«Mostrador» frente a «ventanilla» en el aeropuerto marca:"),
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
    await waitFor(() => expect(isCdmxUnlockFlashDue() || screen.queryByTestId("cdmx-unlock-flash")).toBeTruthy());
    const saved = localStorage.getItem(STORAGE_KEY);
    cleanup();
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    await awaitCdmxFlashVisible();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("cdmx-unlock-flash-copy").textContent).toBe("Abierto");
    await waitFor(() => expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull(), { timeout: 3000 });
    await awaitHome();
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
  });

  it("streak-3 Hoy Eso CONTINUE shows Oaxaca Abierto before idle — not paywall", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 2,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "airport" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["habla de un momento futuro"],
      answer: "habla de un momento futuro",
      shuffledChoices: ["habla de un momento futuro"],
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
        title: "Cena con la suegra",
        unitId: "_today:family",
        todaySceneId: "family",
        firstHoy: true,
        day2Hoy: true,
        host: "rafa",
        questions: [
          hoyMc("En «Cuando llegue el momento…», usamos subjuntivo porque:"),
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
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("session-close")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitOaxacaFlashThenIdle();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-pin-oaxaca")).toBeTruthy());
    expect(screen.getByTestId("recuerdos-pin-oaxaca").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Abierto/);
    expect(screen.queryByTestId("recuerdos-fog-oaxaca")).toBeNull();
    expect(screen.getByTestId("recuerdos-pin-cdmx").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").getAttribute("data-open")).toBe("false");
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Cerrado/);
    expect(screen.getByTestId("recuerdos-pin-norte").getAttribute("data-open")).toBe("false");
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Cerrado/);
  });

  it("CONTINUE after streak-3 Hoy Eso cannot skip the Oaxaca flash onto idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 2,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "airport" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["habla de un momento futuro"],
      answer: "habla de un momento futuro",
      shuffledChoices: ["habla de un momento futuro"],
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
        title: "Cena con la suegra",
        unitId: "_today:family",
        todaySceneId: "family",
        host: "rafa",
        questions: [
          hoyMc("En «Cuando llegue el momento…», usamos subjuntivo porque:"),
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
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitOaxacaFlashVisible();
    expect(isOaxacaUnlockFlashDue()).toBe(true);
    expect(screen.queryByTestId("hero-cta") && !screen.queryByTestId("oaxaca-unlock-flash")).toBeFalsy();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await awaitOaxacaFlashThenIdle();
  });

  it("remount after streak-3 Hoy CONTINUE still plays Oaxaca flash before idle", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 2,
      lastDay: yesterday,
      bajioUnlockSeen: true,
      cdmxUnlockSeen: true,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "airport" },
    });
    const hoyMc = (prompt) => ({
      type: "mc",
      prompt,
      choices: ["habla de un momento futuro"],
      answer: "habla de un momento futuro",
      shuffledChoices: ["habla de un momento futuro"],
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
        title: "Cena con la suegra",
        unitId: "_today:family",
        todaySceneId: "family",
        firstHoy: true,
        day2Hoy: true,
        host: "rafa",
        questions: [
          hoyMc("En «Cuando llegue el momento…», usamos subjuntivo porque:"),
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
    await waitFor(() => expect(isOaxacaUnlockFlashDue() || screen.queryByTestId("oaxaca-unlock-flash")).toBeTruthy());
    const saved = localStorage.getItem(STORAGE_KEY);
    cleanup();
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    await awaitOaxacaFlashVisible();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("oaxaca-unlock-flash-copy").textContent).toBe("Abierto");
    await waitFor(() => expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull(), { timeout: 3000 });
    await awaitHome();
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
  });

  it("streak-4 Hoy Eso CONTINUE shows Yucatán Abierto before idle — not paywall", async () => {
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
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(screen.queryByTestId("yucatan-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("norte-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("oaxaca-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("cdmx-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("session-close")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitYucatanFlashThenIdle();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    await user.click(screen.getByTestId("nav-lectura"));
    await waitFor(() => expect(screen.getByTestId("recuerdos-pin-yucatan")).toBeTruthy());
    expect(screen.getByTestId("recuerdos-pin-yucatan").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Yucatán/);
    expect(screen.getByTestId("recuerdos-pin-yucatan").textContent).toMatch(/Abierto/);
    expect(screen.queryByTestId("recuerdos-fog-yucatan")).toBeNull();
    expect(screen.getByTestId("recuerdos-pin-oaxaca").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-oaxaca").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-cdmx").getAttribute("data-open")).toBe("true");
    expect(screen.getByTestId("recuerdos-pin-cdmx").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-bajio").textContent).toMatch(/Abierto/);
    expect(screen.getByTestId("recuerdos-pin-norte").getAttribute("data-open")).toBe("false");
    expect(screen.getByTestId("recuerdos-pin-norte").textContent).toMatch(/Cerrado/);
  });
});

const FALLBACK_HEADLINE = {
  es: "Hay mucho más por leer.",
  en: "There's much\u00A0more to read.",
};
const HOOK_BODY = {
  es: "Todas las historias, la Doctora de frases y el camino completo. Español mexicano de verdad, más allá de lo básico.",
  en: "Every story, Phrase Doctor, and the full path. Real Mexican Spanish, past the basics.",
};

const assertPaywallHeadline = (source, lang = "es") => {
  const headline = screen.getByTestId("soft-paywall-headline");
  const expected = source === PAYWALL_SOURCE.lecturaBirdHandoff ? (lang === "en" ? "The story goes on." : "La historia sigue.") : FALLBACK_HEADLINE[lang];
  expect(headline.textContent).toBe(expected);
  expect(headline.getAttribute("data-paywall-source")).toBe(source);
  expect(headline.style.fontWeight).toBe("900");
  expect(headline.style.fontSize).toBe("22px");
  expect(headline.style.textWrap).toBe("balance");
  expect(headline.style.letterSpacing).toBe("");
  expect(screen.getByTestId("soft-paywall-body").textContent).toBe(HOOK_BODY[lang]);
};

const lessonLive = (screenName, extra = {}) => ({
  screen: screenName,
  qi: 0,
  status: "idle",
  lessonStats: { right: 1, wrong: 0 },
  session: {
    title: "Hola",
    host: "luna",
    unitId: "greetings",
    questions: [{ type: "mc", prompt: "Hola", choices: ["sí"], answer: "sí", shuffledChoices: ["sí"] }],
  },
  ...extra,
});

const openPaywallFrom = async (live, { streak = 1 } = {}) => {
  cleanup();
  markBajioUnlockFlashDue(false);
  localStorage.removeItem(LIVE_KEY);
  seedProgress({
    streak,
    lastDay: streak ? localToday() : null,
    paywallSeen: false,
    bajioUnlockSeen: true,
    uiLang: "es",
    lecturaStartedAt: 1,
  });
  if (live) localStorage.setItem(LIVE_KEY, JSON.stringify(live));
  const user = userEvent.setup();
  render(<App />);
  return user;
};

const waitSurfaceClear = async (testid) => {
  await waitFor(() => expect(screen.getByTestId(testid)).toBeTruthy());
  await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
};

const clickClose = async (user, rootTestId) => {
  const root = screen.getByTestId(rootTestId);
  const btn = [...root.querySelectorAll("button")].find((el) => /^(Cerrar|Close)$/.test(el.getAttribute("aria-label") || ""));
  expect(btn).toBeTruthy();
  await user.click(btn);
};

const NO_STORY_HEADLINE = {
  es: "Hay mucho por leer.",
  en: "There's a lot to read.",
};
const STARTED_HEADLINE = {
  es: "Hay mucho más por leer.",
  en: "There's much\u00A0more to read.",
};

const wallStrings = () => {
  const card = screen.getByTestId("soft-paywall-card").textContent;
  const parts = Object.fromEntries(WALL_STRING_IDS.map((id) => [id, screen.getByTestId(id).textContent]));
  return { card, parts };
};

const bootStoryStartWall = async (extra = {}) => {
  cleanup();
  localStorage.clear();
  markBajioUnlockFlashDue(false);
  seedProgress({
    streak: 1,
    lastDay: localToday(),
    paywallSeen: false,
    bajioUnlockSeen: true,
    uiLang: "es",
    ...extra,
  });
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
  return wallStrings();
};

describe("paywall headline depends on a stored story start", () => {
  it("winDays 2 with no story shows the shorter line and not the cleared line", async () => {
    const es = await bootStoryStartWall({ winDays: 2, uiLang: "es" });
    expect(es.parts["soft-paywall-headline"]).toBe(NO_STORY_HEADLINE.es);
    expect(es.parts["soft-paywall-headline"]).not.toBe(STARTED_HEADLINE.es);
    expect(es.card).not.toContain(STARTED_HEADLINE.es);
    expect(es.card).not.toContain("La historia sigue.");
    expect(es.parts["soft-paywall-honesty"]).toBe("Vista previa · aún no se cobra");
    expect(es.parts["soft-paywall-annual-price"]).toMatch(/\$39\.99/);
    expect(es.parts["soft-paywall-monthly-price"]).toMatch(/\$6\.99/);
    expect(es.parts["soft-paywall-dismiss"]).toBe("Seguir gratis");

    const en = await bootStoryStartWall({ winDays: 2, uiLang: "en" });
    expect(en.parts["soft-paywall-headline"]).toBe(NO_STORY_HEADLINE.en);
    expect(en.parts["soft-paywall-headline"]).not.toBe(STARTED_HEADLINE.en);
    expect(en.card).not.toContain(STARTED_HEADLINE.en);
    expect(en.card).not.toContain("The story goes on.");
    expect(en.parts["soft-paywall-honesty"]).toBe("Preview · you won\u2019t be charged yet");
    expect(en.parts["soft-paywall-annual-price"]).toMatch(/\$39\.99/);
    expect(en.parts["soft-paywall-monthly-price"]).toMatch(/\$6\.99/);
    expect(en.parts["soft-paywall-dismiss"]).toBe("Continue free");
  });

  it("lecturaStartedAt or a claimed story keeps the cleared line", async () => {
    for (const lang of ["es", "en"]) {
      const byAt = await bootStoryStartWall({ uiLang: lang, lecturaStartedAt: 1 });
      expect(byAt.parts["soft-paywall-headline"]).toBe(STARTED_HEADLINE[lang]);
      expect(byAt.parts["soft-paywall-headline"]).not.toBe(NO_STORY_HEADLINE[lang]);

      const byStory = await bootStoryStartWall({ uiLang: lang, stories: { "story-0": true } });
      expect(byStory.parts["soft-paywall-headline"]).toBe(STARTED_HEADLINE[lang]);
      expect(byStory.parts["soft-paywall-headline"]).not.toBe(NO_STORY_HEADLINE[lang]);
    }
  });

  it("the headline is the only wall string that differs", async () => {
    for (const lang of ["es", "en"]) {
      const none = await bootStoryStartWall({ uiLang: lang, winDays: 2 });
      const started = await bootStoryStartWall({ uiLang: lang, lecturaStartedAt: 1 });
      const claimed = await bootStoryStartWall({ uiLang: lang, stories: { "story-0": true } });
      for (const id of WALL_STRING_IDS) {
        if (id === "soft-paywall-headline") {
          expect(none.parts[id]).toBe(NO_STORY_HEADLINE[lang]);
          expect(started.parts[id]).toBe(STARTED_HEADLINE[lang]);
          expect(claimed.parts[id]).toBe(STARTED_HEADLINE[lang]);
          expect(none.parts[id]).not.toBe(started.parts[id]);
          continue;
        }
        expect(none.parts[id]).toBe(started.parts[id]);
        expect(none.parts[id]).toBe(claimed.parts[id]);
      }
      const swap = (text, headline) => text.split(headline).join("HEADLINE");
      expect(swap(none.card, NO_STORY_HEADLINE[lang])).toBe(swap(started.card, STARTED_HEADLINE[lang]));
      expect(swap(none.card, NO_STORY_HEADLINE[lang])).toBe(swap(claimed.card, STARTED_HEADLINE[lang]));
    }
  });
});

describe("paywall headline follows the open source", () => {
  it("boot on the hub uses the fallback headline", async () => {
    await openPaywallFrom(null);
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.boot);
  });

  it("boot in English uses the English fallback headline", async () => {
    cleanup();
    markBajioUnlockFlashDue(false);
    seedProgress({ streak: 1, lastDay: localToday(), paywallSeen: false, bajioUnlockSeen: true, uiLang: "en", lecturaStartedAt: 1 });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.boot, "en");
  });

  it("brand-home uses the fallback headline", async () => {
    const user = await openPaywallFrom(lessonLive("lesson"));
    await waitSurfaceClear("lesson-exit");
    await user.click(screen.getByTestId("brand-home"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.brandHome);
  });

  it("win continue uses the fallback headline", async () => {
    const user = await openPaywallFrom(lessonLive("done"), { streak: 0 });
    await waitSurfaceClear("win-continue");
    await user.click(screen.getByTestId("win-continue"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.winContinue);
  });

  it("session close uses the fallback headline", async () => {
    const user = await openPaywallFrom({ screen: "sessionClose" });
    await waitSurfaceClear("session-close-dismiss");
    await user.click(screen.getByTestId("session-close-dismiss"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.sessionClose);
  });

  it("cubetas close uses the fallback headline", async () => {
    const user = await openPaywallFrom({ screen: "cubetas", cubetasGame: startCubetasRun() });
    await waitSurfaceClear("cubetas-board");
    await clickClose(user, "cubetas-board");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.cubetas);
  });

  it("hangman close uses the fallback headline", async () => {
    const user = await openPaywallFrom({ screen: "ahorcado", ahorcado: startHangmanRun() });
    await waitSurfaceClear("hangman-board");
    await clickClose(user, "hangman-board");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.hangman);
  });

  it("match pairs close uses the fallback headline", async () => {
    const user = await openPaywallFrom({ screen: "matchPairs", matchGame: startMatchRun([["hola", "hi"], ["adiós", "bye"]]) });
    await waitSurfaceClear("match-pairs-screen");
    await clickClose(user, "match-pairs-screen");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.matchPairs);
  });

  it("memory close uses the fallback headline", async () => {
    const user = await openPaywallFrom({ screen: "memory", memoryGame: startMemoryRun() });
    await waitSurfaceClear("memory-board");
    await clickClose(user, "memory-board");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.memory);
  });

  it("dialogue close uses the fallback headline", async () => {
    const user = await openPaywallFrom({ screen: "dialogue" });
    await waitSurfaceClear("dialogue-board");
    await clickClose(user, "dialogue-board");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.dialogue);
  });

  it("flashcard grade uses the fallback headline", async () => {
    cleanup();
    markBajioUnlockFlashDue(false);
    seedProgress({
      streak: 0,
      lastDay: null,
      paywallSeen: false,
      bajioUnlockSeen: true,
      uiLang: "es",
      lecturaStartedAt: 1,
      flashcards: {
        hola: { word: "hola", en: "hi", note: "", story: "Hola", sentence: "Hola.", added: 1, due: 0, interval: 0, reps: 0, lapses: 0 },
      },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("camino-more")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("camino-more"));
    await user.click(screen.getByTestId("hub-flashcards"));
    await waitFor(() => expect(screen.getByTestId("flash-reveal")).toBeTruthy());
    await user.click(screen.getByTestId("flash-reveal"));
    await user.click(screen.getByTestId("flash-hard"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.flashcards);
  });

  it("games hub close uses the fallback headline", async () => {
    const user = await openPaywallFrom({ screen: "games" });
    await waitSurfaceClear("games-hub");
    await clickClose(user, "games-hub");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.gamesHub);
  });

  it("snake close uses the fallback headline", async () => {
    const user = await openPaywallFrom({
      screen: "snakes",
      snakeGame: {
        tile: 1, turn: 0, status: "idle", done: false, correct: 0, wrong: 0, ladders: 0, slides: 0,
        focus: { host: "luna", title: { es: "Vocab", en: "Vocab" } },
        question: { prompt: "Hola", answer: "Hi", choices: ["Hi", "Bye"], explain: "", skill: "vocab" },
      },
    });
    await waitSurfaceClear("snakes-board");
    await clickClose(user, "snakes-board");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.snake);
  });

  it("safe-or-risky close uses the fallback headline", async () => {
    const user = await openPaywallFrom({ screen: "safeRisky", safeGame: startSafeRiskyRun([SAFE_RISKY_MULTI_FIXTURE]) });
    await waitSurfaceClear("safe-risky-board");
    await clickClose(user, "safe-risky-board");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.safeRisky);
  });

  it("jeopardy close uses the fallback headline", async () => {
    const user = await openPaywallFrom({ screen: "jeopardy", jeopardy: startJeopardyRun() });
    await waitSurfaceClear("jeopardy-board");
    await clickClose(user, "jeopardy-board");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.jeopardy);
  });

  it("story close uses the fallback headline", async () => {
    const user = await openPaywallFrom({ screen: "story", storyId: "story-0", paraIdx: 0 });
    await waitSurfaceClear("story-reader");
    await clickClose(user, "story-reader");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.storyClose);
  });

  it("lesson quit uses the fallback headline", async () => {
    const user = await openPaywallFrom(lessonLive("lesson"));
    await waitSurfaceClear("lesson-exit");
    await user.click(screen.getByTestId("lesson-exit"));
    await user.click(screen.getByTestId("quit-without-save"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.lessonQuit);
  });

  it("out of hearts uses the fallback headline", async () => {
    const user = await openPaywallFrom(lessonLive("failed"));
    await waitSurfaceClear("hearts-to-path");
    await user.click(screen.getByTestId("hearts-to-path"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.hearts);
  });

  it("rival back uses the fallback headline", async () => {
    const user = await openPaywallFrom({ screen: "rivalIntro" });
    await waitSurfaceClear("rival-back");
    await user.click(screen.getByTestId("rival-back"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.rival);
  });

  it("rival done uses the fallback headline", async () => {
    const user = await openPaywallFrom({
      screen: "rivalDone",
      rivalOutcome: { won: true, you: 3, diego: 1, delta: 1, rankName: "Novato", reaction: "Otra.", record: "1–0" },
    });
    await waitSurfaceClear("rival-done-back");
    await user.click(screen.getByTestId("rival-done-back"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    assertPaywallHeadline(PAYWALL_SOURCE.rival);
  });
});

const EN_DISCLOSURE = [
  "Ándale Premium is an auto-renewing subscription: one year at $39.99 or one month at $6.99.",
  "Payment is charged to your Apple ID when you confirm. It renews automatically at the same price unless you cancel at least 24 hours before the period ends; the renewal is charged within those 24 hours. Manage or cancel in Settings > Apple ID > Subscriptions.",
];
const ES_DISCLOSURE = [
  "Ándale Premium es una suscripción con renovación automática: un año por $39.99 o un mes por $6.99.",
  "El pago se carga a tu ID de Apple al confirmar. Se renueva sola al mismo precio, a menos que la canceles al menos 24 horas antes de que termine el periodo; la renovación se cobra dentro de esas 24 horas. Administra o cancela en Ajustes > ID de Apple > Suscripciones.",
];

const assertFinePrintMatchesButtons = (lang) => {
  const annual = screen.getByTestId("soft-paywall-annual-price").textContent.split(" ")[0];
  const monthly = screen.getByTestId("soft-paywall-monthly-price").textContent.split(" ")[0];
  const lead = screen.getByTestId("soft-paywall-disclosure-0").textContent;
  expect(lead).toContain(annual);
  expect(lead).toContain(monthly);
  const expected = lang === "en"
    ? `Ándale Premium is an auto-renewing subscription: one year at ${annual} or one month at ${monthly}.`
    : `Ándale Premium es una suscripción con renovación automática: un año por ${annual} o un mes por ${monthly}.`;
  expect(lead).toBe(expected);
  expect(screen.queryByTestId("soft-paywall-disclosure-2")).toBeNull();
};

describe("paywall 3.1.2 disclosure", () => {
  it("renders EN prices, fine print, restore, and legal links without a purchase", async () => {
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    delete window.__andaleIapEnv;
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("en");
    expect(screen.getByTestId("soft-paywall-annual").textContent).toBe("One year");
    expect(screen.getByTestId("soft-paywall-monthly").textContent).toBe("One month");
    expect(screen.getByTestId("soft-paywall-annual-price").textContent).toBe("$39.99 / year");
    expect(screen.getByTestId("soft-paywall-monthly-price").textContent).toBe("$6.99 / month");
    const annual = screen.getByTestId("soft-paywall-annual");
    const annualPrice = screen.getByTestId("soft-paywall-annual-price");
    const monthly = screen.getByTestId("soft-paywall-monthly");
    const monthlyPrice = screen.getByTestId("soft-paywall-monthly-price");
    expect(annual.compareDocumentPosition(annualPrice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(annualPrice.compareDocumentPosition(monthly) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(monthly.compareDocumentPosition(monthlyPrice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    EN_DISCLOSURE.forEach((line, i) => {
      expect(screen.getByTestId(`soft-paywall-disclosure-${i}`).textContent).toBe(line);
    });
    assertFinePrintMatchesButtons("en");
    expect(screen.queryByText(ES_DISCLOSURE[0])).toBeNull();
    const fine = screen.getByTestId("soft-paywall-disclosure");
    expect(parseFloat(fine.style.fontSize)).toBeLessThan(parseFloat(annual.style.fontSize));
    expect(parseFloat(annualPrice.style.fontSize)).toBeLessThan(parseFloat(annual.style.fontSize));
    expect(screen.getByTestId("soft-paywall-legal").textContent).toBe("Terms of Use · Privacy Policy · Restore Purchases");
    const terms = screen.getByTestId("soft-paywall-terms");
    const privacy = screen.getByTestId("soft-paywall-privacy");
    expect(terms.tagName).toBe("A");
    expect(terms.getAttribute("href")).toBe("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/");
    expect(terms.textContent).toBe("Terms of Use");
    expect(privacy.tagName).toBe("A");
    expect(privacy.getAttribute("href")).toBe("https://gildernew-max.github.io/andale/privacy.html");
    expect(privacy.textContent).toBe("Privacy Policy");
    const restore = screen.getByTestId("soft-paywall-restore");
    expect(restore.tagName).toBe("A");
    expect(restore.textContent).toBe("Restore Purchases");
    expect(restore.closest("[data-testid='soft-paywall-legal']")).toBe(screen.getByTestId("soft-paywall-legal"));
    expect(screen.getByTestId("soft-paywall-legal").querySelector("button")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(monthlyPrice.compareDocumentPosition(fine) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fine.compareDocumentPosition(screen.getByTestId("soft-paywall-dismiss")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("soft-paywall").querySelectorAll("img[src*='cenzontle']")).toHaveLength(1);

    await waitFor(() => expect(funnelOf("paywall_seen").length).toBeGreaterThan(0));
    expect(funnelOf("purchase")).toHaveLength(0);
    await user.click(restore);
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(funnelOf("paywall_tap")).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);

    await user.click(annual);
    await waitFor(() => expect(funnelOf("paywall_tap").some((e) => e.choice === "annual")).toBe(true));
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(funnelOf("paywall_tap").every((e) => e.event === "paywall_tap")).toBe(true);
    const names = window.__andaleFunnelLog.map((e) => e.event);
    expect(names.indexOf("paywall_seen")).toBeGreaterThanOrEqual(0);
    expect(names.indexOf("paywall_tap")).toBeGreaterThan(names.indexOf("paywall_seen"));
    expect(names.includes("purchase")).toBe(false);
  }, 15000);

  it("renders ES prices, fine print, restore, and legal links", async () => {
    cleanup();
    seedProgress({ uiLang: "es", streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    delete window.__andaleIapEnv;
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    assertSoftPaywallAnnualPrimary("es");
    expect(screen.getByTestId("soft-paywall-annual").textContent).toBe("Un año");
    expect(screen.getByTestId("soft-paywall-monthly").textContent).toBe("Un mes");
    expect(screen.getByTestId("soft-paywall-annual-price").textContent).toBe("$39.99 al año");
    expect(screen.getByTestId("soft-paywall-monthly-price").textContent).toBe("$6.99 al mes");
    ES_DISCLOSURE.forEach((line, i) => {
      expect(screen.getByTestId(`soft-paywall-disclosure-${i}`).textContent).toBe(line);
    });
    assertFinePrintMatchesButtons("es");
    expect(screen.queryByText(EN_DISCLOSURE[0])).toBeNull();
    expect(screen.getByTestId("soft-paywall-legal").textContent).toBe("Términos de uso · Política de privacidad · Restaurar compras");
    expect(screen.getByTestId("soft-paywall-terms").getAttribute("href")).toBe("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/");
    expect(screen.getByTestId("soft-paywall-terms").textContent).toBe("Términos de uso");
    expect(screen.getByTestId("soft-paywall-privacy").getAttribute("href")).toBe("https://gildernew-max.github.io/andale/privacy.html");
    expect(screen.getByTestId("soft-paywall-privacy").textContent).toBe("Política de privacidad");
    const restore = screen.getByTestId("soft-paywall-restore");
    expect(restore.tagName).toBe("A");
    expect(restore.textContent).toBe("Restaurar compras");
    expect(restore.closest("[data-testid='soft-paywall-legal']")).toBe(screen.getByTestId("soft-paywall-legal"));
    expect(parseFloat(screen.getByTestId("soft-paywall-disclosure").style.fontSize)).toBeLessThan(parseFloat(screen.getByTestId("soft-paywall-annual").style.fontSize));
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(funnelOf("purchase")).toHaveLength(0);
  }, 15000);

  it("prefers StoreKit displayPrice and the restore link adds no purchase", async () => {
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    let restoreCalls = 0;
    let purchaseCalls = 0;
    let allowRestore = false;
    window.__andaleNativePurchase = async () => {
      purchaseCalls += 1;
      return { status: "success", productId: "com.andale.app.premium.annual" };
    };
    window.__andaleNativeRestore = async () => {
      restoreCalls += 1;
      if (!allowRestore) return { status: "failure", reason: "nothing_to_restore" };
      return { status: "success", productId: "com.andale.app.premium.monthly" };
    };
    window.__andaleNativeGetProducts = async ({ productIds }) => ({
      products: [
        { id: productIds[0], displayPrice: "€39.99" },
        { id: productIds[1], displayPrice: "€6.99" },
      ],
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await waitFor(() => expect(restoreCalls).toBeGreaterThanOrEqual(1));
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(screen.getByTestId("soft-paywall-restore").tagName).toBe("A");
    expect(document.body.textContent).not.toMatch(/Tell me when the store opens|Avísame cuando abramos la tienda/);
    expect(screen.queryByTestId("soft-paywall-honesty")).toBeNull();
    expect(screen.getByTestId("soft-paywall").textContent).not.toMatch(/Preview · you won\u2019t be charged yet|Vista previa · aún no se cobra/);
    await waitFor(() => expect(screen.getByTestId("soft-paywall-annual-price").textContent).toBe("€39.99 / year"));
    expect(screen.getByTestId("soft-paywall-monthly-price").textContent).toBe("€6.99 / month");
    expect(screen.getByTestId("soft-paywall-disclosure-0").textContent).toBe("Ándale Premium is an auto-renewing subscription: one year at €39.99 or one month at €6.99.");
    expect(screen.getByTestId("soft-paywall-disclosure-0").textContent).not.toMatch(/\$3\.33/);
    expect(screen.getByTestId("soft-paywall-disclosure-1").textContent).toBe(EN_DISCLOSURE[1]);
    assertFinePrintMatchesButtons("en");
    expect(screen.getByTestId("soft-paywall-annual").className).toMatch(/duo-btn/);
    expect(screen.getByTestId("soft-paywall-dismiss").textContent).toBe("Continue free");
    expect(screen.getByTestId("soft-paywall-dismiss").style.background).toBe("none");
    await waitFor(() => expect(funnelOf("paywall_seen").length).toBeGreaterThan(0));
    expect(funnelOf("purchase")).toHaveLength(0);

    expect(screen.queryByTestId("soft-paywall-restore-status")).toBeNull();
    const restoresBeforeClick = restoreCalls;
    allowRestore = true;
    await user.click(screen.getByTestId("soft-paywall-restore"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall-restore-status").textContent).toBe("Purchases restored."));
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(restoreCalls).toBeGreaterThan(restoresBeforeClick);
    expect(purchaseCalls).toBe(0);
    expect(funnelOf("purchase")).toHaveLength(0);
    expect(funnelOf("paywall_tap")).toHaveLength(0);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.unlockedPrem).toBe(true);
    expect(stored.paywallPlan).toBe("monthly");
    expect(stored.iapProductId).toBe("com.andale.app.premium.monthly");
    const names = window.__andaleFunnelLog.map((e) => e.event);
    expect(names.indexOf("paywall_seen")).toBeGreaterThanOrEqual(0);
    expect(names.includes("purchase")).toBe(false);
  }, 15000);

  it("falls back to locked prices when getProducts fails", async () => {
    cleanup();
    seedProgress({ uiLang: "es", streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    window.__andaleNativeGetProducts = async () => {
      throw new Error("store_down");
    };
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("soft-paywall-waitlist")).toBeNull();
    expect(screen.queryByTestId("soft-paywall-honesty")).toBeNull();
    expect(screen.getByTestId("soft-paywall-annual-price").textContent).toBe("$39.99 al año");
    expect(screen.getByTestId("soft-paywall-monthly-price").textContent).toBe("$6.99 al mes");
    ES_DISCLOSURE.forEach((line, i) => {
      expect(screen.getByTestId(`soft-paywall-disclosure-${i}`).textContent).toBe(line);
    });
    expect(screen.getByTestId("soft-paywall-restore").tagName).toBe("A");
    expect(screen.getByTestId("soft-paywall-restore").textContent).toBe("Restaurar compras");
    expect(funnelOf("purchase")).toHaveLength(0);
  }, 15000);

  const restoreFaces = {
    en: {
      success: "Purchases restored.",
      empty: "No purchases to restore on this Apple ID.",
      failure: "Couldn't reach the App Store. Try again.",
      web: "Restore works in the iPhone app.",
    },
    es: {
      success: "Compras restauradas.",
      empty: "No hay compras que restaurar en este ID de Apple.",
      failure: "No se pudo conectar con la App Store. Inténtalo de nuevo.",
      web: "Restaurar compras funciona en la app para iPhone.",
    },
  };

  const assertRestoreLine = (lang, key) => {
    const line = screen.getByTestId("soft-paywall-restore-status");
    const legal = screen.getByTestId("soft-paywall-legal");
    const other = lang === "en" ? "es" : "en";
    expect(line.textContent).toBe(restoreFaces[lang][key]);
    expect(line.textContent).not.toBe(restoreFaces[other][key]);
    expect(line.style.fontSize).toBe(legal.style.fontSize);
    expect(line.style.fontWeight).toBe(legal.style.fontWeight);
    expect(line.style.color).toBe(legal.style.color);
    expect(legal.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.compareDocumentPosition(screen.getByTestId("soft-paywall-dismiss")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.querySelector("svg, img, button")).toBeNull();
    expect(legal.contains(line)).toBe(false);
    expect(funnelOf("purchase")).toHaveLength(0);
  };

  it.each(["en", "es"])("restore success shows one status line in %s and does not emit purchase", async (lang) => {
    cleanup();
    seedProgress({ uiLang: lang, streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    let allowRestore = false;
    let restoreCalls = 0;
    window.__andaleNativeRestore = async () => {
      restoreCalls += 1;
      if (!allowRestore) return { status: "failure", reason: "nothing_to_restore" };
      return { status: "success", productId: "com.andale.app.premium.annual" };
    };
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    await waitFor(() => expect(restoreCalls).toBeGreaterThanOrEqual(1));
    expect(screen.queryByTestId("soft-paywall-restore-status")).toBeNull();
    allowRestore = true;
    await user.click(screen.getByTestId("soft-paywall-restore"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall-restore-status")).toBeTruthy());
    assertRestoreLine(lang, "success");
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.unlockedPrem).toBe(true);
    expect(stored.paywallPlan).toBe("annual");
  }, 15000);

  it.each(["en", "es"])("restore with nothing to restore shows one status line in %s and does not emit purchase", async (lang) => {
    cleanup();
    seedProgress({ uiLang: lang, streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("soft-paywall-restore-status")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-restore"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall-restore-status")).toBeTruthy());
    assertRestoreLine(lang, "empty");
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
  }, 15000);

  it.each(["en", "es"])("a failed store restore shows one status line in %s and does not emit purchase", async (lang) => {
    cleanup();
    seedProgress({ uiLang: lang, streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => {
      throw new Error("store_down");
    };
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("soft-paywall-restore-status")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-restore"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall-restore-status")).toBeTruthy());
    assertRestoreLine(lang, "failure");
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
  }, 15000);

  it.each(["en", "es"])("web restore shows the iPhone-app line in %s and does not emit purchase", async (lang) => {
    cleanup();
    seedProgress({ uiLang: lang, streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    delete window.__andaleIapEnv;
    const user = userEvent.setup();
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.queryByTestId("soft-paywall-restore-status")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-restore"));
    await waitFor(() => expect(screen.getByTestId("soft-paywall-restore-status")).toBeTruthy());
    assertRestoreLine(lang, "web");
    expect(screen.getByTestId("soft-paywall-restore-status").textContent).not.toBe(restoreFaces[lang].failure);
    expect(screen.getByTestId("soft-paywall")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).unlockedPrem).not.toBe(true);
    expect(funnelOf("paywall_tap")).toHaveLength(0);
  }, 15000);

  it("a partial StoreKit price list falls back to both locked prices", async () => {
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: localToday(), lecturaStartedAt: 1 });
    window.__andaleIapEnv = { isNative: true, platform: "ios" };
    window.__andaleNativeRestore = async () => ({ status: "failure", reason: "nothing_to_restore" });
    window.__andaleNativeGetProducts = async () => ({
      products: [{ id: "com.andale.app.premium.annual", displayPrice: "€39.99" }],
    });
    render(<App />);
    await awaitSoftPaywallAfterFirstWin();
    expect(screen.getByTestId("soft-paywall-annual-price").textContent).toBe("$39.99 / year");
    expect(screen.getByTestId("soft-paywall-monthly-price").textContent).toBe("$6.99 / month");
    expect(screen.getByTestId("soft-paywall-disclosure-0").textContent).toBe(EN_DISCLOSURE[0]);
    expect(screen.getByTestId("soft-paywall-disclosure-1").textContent).toBe(EN_DISCLOSURE[1]);
    assertFinePrintMatchesButtons("en");
    expect(screen.getByTestId("soft-paywall").textContent).not.toMatch(/€/);
    expect(funnelOf("purchase")).toHaveLength(0);
  }, 15000);
});

describe("cream caption contrast", { timeout: 20000 }, () => {
  const LIGHT_CAPTION = /#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i;
  const DARK_SUB = /#A0A4AB|rgb\(\s*160,\s*164,\s*171\s*\)/i;
  const LIGHT_SUB = /#777777|rgb\(\s*119,\s*119,\s*119\s*\)/i;

  const assertCaption = (el, colorRe) => {
    expect(el.style.color).toMatch(colorRe);
    expect(el.style.fontSize).toBe("12px");
    expect(el.style.fontWeight).toBe("700");
  };

  const captionProgress = (theme) => ({
    uiLang: "es",
    theme,
    onboardingDone: true,
    paywallSeen: true,
    firstSessionDone: true,
    xp: 50,
    done: { subj1: 1 },
    srs: { "subj1|0": { ef: 2.5, reps: 1, interval: 1, due: 1 } },
  });

  const bootHome = async (theme) => {
    cleanup();
    localStorage.clear();
    mockBrowser();
    seedProgress(captionProgress(theme));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("atajos")).toBeTruthy());
    return user;
  };

  const bootLive = async (theme, live, testId) => {
    cleanup();
    localStorage.clear();
    mockBrowser();
    seedProgress(captionProgress(theme));
    localStorage.setItem(LIVE_KEY, JSON.stringify(live));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId(testId)).toBeTruthy());
  };

  it("light cream captions are #6B6258 at 12px/700 and D_LIGHT.sub still paints #777777", async () => {
    const user = await bootHome("light");
    assertCaption(screen.getByTestId("atajos"), LIGHT_CAPTION);
    expect(screen.getByTestId("atajos").style.color).not.toMatch(LIGHT_SUB);
    const divider = screen.getByTestId("lang-toggle").querySelector("[aria-hidden='true']");
    expect(divider.textContent).toBe("|");
    expect(divider.style.color).toMatch(LIGHT_SUB);

    await user.click(screen.getByTestId("nav-practica"));
    await waitFor(() => expect(screen.getByTestId("memory-window")).toBeTruthy());
    expect(screen.getByRole("button", { name: /Repasar hoy/ })).toBeTruthy();
    expect(screen.getByTestId("memory-window").textContent).toMatch(/60/);
    assertCaption(screen.getByTestId("memory-window"), LIGHT_CAPTION);

    await user.click(screen.getByTestId("nav-perfil"));
    await waitFor(() => expect(screen.getAllByTestId("achievement-desc").length).toBeGreaterThan(0));
    const descs = screen.getAllByTestId("achievement-desc");
    expect(descs[0].textContent).toBe("Completa una lección");
    descs.forEach((el) => assertCaption(el, LIGHT_CAPTION));

    await bootLive("light", { screen: "ahorcado", tab: "practica", ahorcado: startHangmanRun() }, "hangman-quiet");
    assertCaption(screen.getByTestId("hangman-quiet"), LIGHT_CAPTION);

    await bootLive("light", { screen: "jeopardy", tab: "practica", jeopardy: startJeopardyRun() }, "jeopardy-quiet");
    assertCaption(screen.getByTestId("jeopardy-quiet"), LIGHT_CAPTION);
  });

  it("dark cream captions stay D.sub #A0A4AB at 12px/700", async () => {
    const user = await bootHome("dark");
    assertCaption(screen.getByTestId("atajos"), DARK_SUB);
    expect(screen.getByTestId("atajos").style.color).not.toMatch(LIGHT_CAPTION);
    const divider = screen.getByTestId("lang-toggle").querySelector("[aria-hidden='true']");
    expect(divider.style.color).toMatch(DARK_SUB);

    await user.click(screen.getByTestId("nav-practica"));
    await waitFor(() => expect(screen.getByTestId("memory-window")).toBeTruthy());
    assertCaption(screen.getByTestId("memory-window"), DARK_SUB);

    await user.click(screen.getByTestId("nav-perfil"));
    await waitFor(() => expect(screen.getAllByTestId("achievement-desc").length).toBeGreaterThan(0));
    screen.getAllByTestId("achievement-desc").forEach((el) => assertCaption(el, DARK_SUB));

    await bootLive("dark", { screen: "ahorcado", tab: "practica", ahorcado: startHangmanRun() }, "hangman-quiet");
    assertCaption(screen.getByTestId("hangman-quiet"), DARK_SUB);

    await bootLive("dark", { screen: "jeopardy", tab: "practica", jeopardy: startJeopardyRun() }, "jeopardy-quiet");
    assertCaption(screen.getByTestId("jeopardy-quiet"), DARK_SUB);
  });
});
