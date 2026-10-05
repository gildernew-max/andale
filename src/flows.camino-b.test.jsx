import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { dayKeyFromDate, hoySceneForDay, prevDayKey } from "./firstDoor.js";
import { LECTURA_HANDOFF_CTA, LECTURA_HANDOFF_QUIET } from "./lecturaHandoff.js";
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
  CREAM_FILL,
  contrastRatio,
  assertCreamShell,
  HUB_DOCTOR_RE,
  assertEqualHub,
  startHoyFromHub,
  clickHoySceneMc,
  localToday,
  HOY_TITLES,
  expectedComeBack,
  assertHoyWinBird,
  STORY_LIFT_RE,
  CEREZAS_Q_RE,
  laterHoySeed,
  collectStoryLifts,
  awaitSoftPaywallAfterFirstWin,
  lecturaThenBajioWall,
  awaitCdmxFlashThenIdle,
  openCaminoMore,
} from "./flowsHarness.jsx";

installFlowHooks();

describe("simulated learner flows", { timeout: 15000 }, () => {
  const NARRATION_BANNED = /cached|cacheado/i;
  const LIBRARY_ES = "párrafos · toca palabras · escucha por párrafo";
  const LIBRARY_EN = "paragraphs · tap words · listen by paragraph";
  const LIBRARY_QUIET_ES = "párrafos · toca palabras";
  const LIBRARY_QUIET_EN = "paragraphs · tap words";
  const NARRATION_ES = "La voz en español de tu dispositivo, frase por frase.";
  const NARRATION_EN = "Your device's Spanish voice, one sentence at a time.";
  const NARRATION_RECORDED_ES = "Voz en español grabada, párrafo por párrafo.";
  const NARRATION_RECORDED_EN = "Recorded Spanish voice, one paragraph at a time.";
  const audioProbe = (ok) => vi.fn(async () => ({
    ok,
    status: ok ? 200 : 404,
    headers: { get: (name) => (name === "content-type" ? (ok ? "audio/mp4" : "text/html") : null) },
  }));
  const NARRATION_FAIL_ES = "El audio no suena ahora. Puedes leer el cuento sin él.";
  const NARRATION_FAIL_EN = "Audio isn't playing right now. The story reads fine without it.";

  const withVoices = (voices) => {
    cleanup();
    mockBrowser({ voices });
    seedProgress();
  };

  const openShelfStory = async (user, storyId) => {
    if (screen.queryByTestId("story-reader")) {
      await user.click(screen.getByRole("button", { name: /^(Cerrar|Close)$/ }));
      await waitFor(() => expect(screen.queryByTestId("story-reader")).toBeNull());
    }
    if (!screen.queryByTestId(`story-shelf-${storyId}`)) {
      await user.click(screen.getByTestId("nav-lectura"));
    }
    const shelf = screen.getByTestId(`story-shelf-${storyId}`);
    expect(shelf.getAttribute("data-locked")).toBe("false");
    await user.click(shelf);
    await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe(storyId));
  };

  it("Lectura narration uses the device voice line in both languages", async () => {
    withVoices([{ lang: "es-MX", name: "Paulina" }]);
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    expect(screen.getByTestId("story-shelf-story-0").textContent).toContain(LIBRARY_ES);
    expect(document.body.textContent).not.toMatch(NARRATION_BANNED);
    await user.click(screen.getByTestId("story-shelf-story-0"));
    await waitFor(() => expect(screen.getByTestId("narration-card")).toBeTruthy());
    expect(screen.getByTestId("narration-label").textContent).toBe("NARRACIÓN");
    expect(screen.getByTestId("narration-sub").textContent).toBe(NARRATION_ES);
    expect(screen.getByRole("button", { name: "Escuchar párrafo" })).toBeTruthy();
    expect(screen.queryByTestId("narration-fail")).toBeNull();
    expect(screen.getByTestId("story-reader").textContent).not.toMatch(NARRATION_BANNED);
    expect(document.body.textContent).not.toMatch(/LAB DE NARRACIÓN|NARRATION LAB/);
    const paragraph = screen.getByTestId("lectura-paragraph-first");
    const hunt = screen.getByTestId("word-hunt-card");
    expect(paragraph.compareDocumentPosition(hunt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hunt.textContent).toMatch(/CACERÍA DE PALABRAS/);
    expect(hunt.textContent).toMatch(/0\/8/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("narration-sub").textContent).toBe(NARRATION_EN));
    expect(screen.getByTestId("narration-label").textContent).toBe("NARRATION");
    expect(screen.getByRole("button", { name: "Listen to paragraph" })).toBeTruthy();
    expect(screen.getByTestId("word-hunt-card").textContent).toMatch(/WORD HUNT/);
    expect(screen.queryByTestId("narration-fail")).toBeNull();
    expect(screen.getByTestId("story-reader").textContent).not.toMatch(NARRATION_BANNED);
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.getByTestId("story-shelf-story-0")).toBeTruthy());
    expect(screen.getByTestId("story-shelf-story-0").textContent).toContain(LIBRARY_EN);
    expect(document.body.textContent).not.toMatch(NARRATION_BANNED);
  });

  it("Lectura narration uses the recorded line when the paragraph file probe is green", async () => {
    vi.stubGlobal("fetch", audioProbe(true));
    withVoices([{ lang: "es-MX", name: "Paulina" }]);
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    await user.click(screen.getByTestId("story-shelf-story-0"));
    await waitFor(() => expect(screen.getByTestId("narration-sub").textContent).toBe(NARRATION_RECORDED_ES));
    const sub = screen.getByTestId("narration-sub");
    expect(sub.style.fontSize).toBe("12.5px");
    expect(sub.style.fontWeight).toBe("800");
    expect(screen.getByTestId("narration-label").textContent).toBe("NARRACIÓN");
    expect(screen.queryByTestId("narration-fail")).toBeNull();
    expect(screen.getByRole("button", { name: "Escuchar párrafo" })).toBeTruthy();
    expect(screen.getByTestId("story-reader").textContent).not.toMatch(NARRATION_BANNED);
    await user.click(screen.getByRole("button", { name: "Párrafo 2" }));
    await waitFor(() => expect(screen.getByTestId("narration-sub").textContent).toBe(NARRATION_RECORDED_ES));
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("narration-sub").textContent).toBe(NARRATION_RECORDED_EN));
    expect(screen.getByTestId("narration-label").textContent).toBe("NARRATION");
    expect(screen.queryByTestId("narration-fail")).toBeNull();
  });

  it("Lectura narration keeps the device voice line when the paragraph file probe fails", async () => {
    vi.stubGlobal("fetch", audioProbe(false));
    withVoices([{ lang: "es-MX", name: "Paulina" }]);
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    await user.click(screen.getByTestId("story-shelf-story-0"));
    await waitFor(() => expect(screen.getByTestId("narration-card")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("narration-sub").textContent).toBe(NARRATION_ES));
    expect(screen.queryByTestId("narration-fail")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("narration-sub").textContent).toBe(NARRATION_EN));
  });

  it("library subtitle keeps the listen clause in ES and EN when a Latin American voice exists", async () => {
    withVoices([{ lang: "es-MX", name: "Paulina" }]);
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    for (const id of ["story-0", "story-9"]) {
      expect(screen.getByTestId(`story-shelf-${id}`).textContent).toContain(LIBRARY_ES);
    }
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("story-shelf-story-0").textContent).toContain(LIBRARY_EN));
    expect(screen.getByTestId("story-shelf-story-9").textContent).toContain(LIBRARY_EN);
  });

  it("library subtitle drops the listen clause in ES and EN when no Latin American voice exists", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    for (const id of ["story-0", "story-9"]) {
      const text = screen.getByTestId(`story-shelf-${id}`).textContent;
      expect(text).toContain(LIBRARY_QUIET_ES);
      expect(text).not.toContain("escucha por párrafo");
      expect(text).not.toContain("audio por párrafo");
    }
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("story-shelf-story-0").textContent).toContain(LIBRARY_QUIET_EN));
    for (const id of ["story-0", "story-9"]) {
      const text = screen.getByTestId(`story-shelf-${id}`).textContent;
      expect(text).toContain(LIBRARY_QUIET_EN);
      expect(text).not.toContain("listen by paragraph");
      expect(text).not.toContain("audio by paragraph");
    }
  });

  it.each([
    ["es-MX", "Paulina"],
    ["es-US", "Monica"],
    ["es-419", "Paulina"],
    ["es_MX", "Paulina"],
    ["ES-us", "Monica"],
  ])("Lectura shows narration for a %s voice", async (lang, name) => {
    withVoices([{ lang, name }]);
    const user = await boot();
    await openShelfStory(user, "story-0");
    expect(screen.getByTestId("narration-card")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Escuchar párrafo" })).toBeTruthy();
    expect(screen.getByTestId("narration-sub").textContent).toBe(NARRATION_ES);
    expect(screen.queryByTestId("narration-fail")).toBeNull();
  });

  it("Lectura shows narration when es-ES is installed beside es-MX", async () => {
    withVoices([
      { lang: "es-ES", name: "Helena" },
      { lang: "es-MX", name: "Paulina" },
    ]);
    const user = await boot();
    await openShelfStory(user, "story-0");
    expect(screen.getByTestId("narration-card")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Escuchar párrafo" })).toBeTruthy();
  });

  it.each([
    ["no voices", []],
    ["es-ES only", [{ lang: "es-ES", name: "Helena" }]],
    ["generic es only", [{ lang: "es", name: "Spanish" }]],
    ["ES_ES only", [{ lang: "ES_ES", name: "Helena" }]],
  ])("Lectura hides narration for %s", async (_label, voices) => {
    withVoices(voices);
    const user = await boot();
    await openShelfStory(user, "story-0");
    expect(screen.queryByTestId("narration-card")).toBeNull();
    expect(screen.queryByTestId("narration-label")).toBeNull();
    expect(screen.queryByRole("button", { name: "Escuchar párrafo" })).toBeNull();
    expect(screen.getByTestId("story-reader").textContent).not.toMatch(NARRATION_BANNED);
  });

  it("Lectura narration is on stories 1-9 with a Latin American voice", async () => {
    cleanup();
    mockBrowser({ voices: [{ lang: "es-419", name: "Paulina" }] });
    seedProgress({ stories: claimStories(...Array.from({ length: 10 }, (_, i) => `story-${i}`)) });
    const user = await boot();
    for (let i = 1; i <= 9; i++) {
      await openShelfStory(user, `story-${i}`);
      expect(screen.getByTestId("narration-card")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Escuchar párrafo" })).toBeTruthy();
      expect(screen.getByTestId("narration-sub").textContent).toBe(NARRATION_ES);
      expect(screen.getByTestId("story-reader").textContent).not.toMatch(NARRATION_BANNED);
    }
  });

  it("Lectura narration appears when a Latin American voice loads on voiceschanged", async () => {
    const user = await boot();
    await openShelfStory(user, "story-0");
    expect(screen.queryByTestId("narration-card")).toBeNull();
    expect(screen.queryByRole("button", { name: "Escuchar párrafo" })).toBeNull();
    window.speechSynthesis.pushVoices([{ lang: "es_MX", name: "Paulina" }]);
    await waitFor(() => expect(screen.getByTestId("narration-card")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Escuchar párrafo" })).toBeTruthy();
    expect(screen.getByTestId("narration-sub").textContent).toBe(NARRATION_ES);
  });

  it("narration failure line appears only after speech fails", async () => {
    withVoices([{ lang: "es-US", name: "Monica" }]);
    const user = await boot();
    await openShelfStory(user, "story-0");
    expect(screen.getByTestId("narration-sub").textContent).toBe(NARRATION_ES);
    expect(screen.queryByTestId("narration-fail")).toBeNull();
    window.__andaleSpoke = false;
    window.__andaleRetried = false;
    window.__andaleVoiceDead = false;
    await user.click(screen.getByRole("button", { name: "Escuchar párrafo" }));
    await new Promise((r) => setTimeout(r, 2800));
    expect(screen.queryByTestId("narration-fail")).toBeNull();
    window.__andaleSpoke = false;
    window.__andaleRetried = false;
    window.__andaleVoiceDead = false;
    window.speechSynthesis.speak = vi.fn(() => {});
    await user.click(screen.getByRole("button", { name: "Escuchar párrafo" }));
    await waitFor(() => {
      expect(screen.getByTestId("narration-fail").textContent).toBe(NARRATION_FAIL_ES);
    }, { timeout: 9000 });
    const sub = screen.getByTestId("narration-sub");
    const fail = screen.getByTestId("narration-fail");
    expect(screen.getByTestId("narration-card").contains(fail)).toBe(true);
    expect(fail.style.fontSize).toBe(sub.style.fontSize);
    expect(fail.style.fontWeight).toBe(sub.style.fontWeight);
    expect(fail.style.color).toBe(sub.style.color);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("narration-fail").textContent).toBe(NARRATION_FAIL_EN));
    await user.click(screen.getByRole("button", { name: "STOP" }));
  }, 20000);

  it("unread Lectura does not lift cerezas / story comprehension into later Hoy", async () => {
    laterHoySeed();
    const user = await boot();
    await startHoyFromHub(user);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const hoyLifts = await collectStoryLifts(user);
    expect(hoyLifts).toEqual([]);
    expect(document.body.textContent).not.toMatch(STORY_LIFT_RE);
    expect(document.body.textContent).not.toMatch(CEREZAS_Q_RE);
  }, 15_000);

  it("unread Lectura does not lift cerezas / story comprehension into rutina", async () => {
    laterHoySeed();
    const user = await boot();
    await openCaminoMore(user);
    await user.click(screen.getByTestId("camino-daily-workout"));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const dailyLifts = await collectStoryLifts(user);
    expect(dailyLifts).toEqual([]);
    expect(document.body.textContent).not.toMatch(STORY_LIFT_RE);
    expect(document.body.textContent).not.toMatch(CEREZAS_Q_RE);
  }, 15_000);

  it("after Lectura claim, that story’s comprehension can lift into rutina", async () => {
    laterHoySeed({ stories: { "story-9": true } });
    const user = await boot();
    await openCaminoMore(user);
    await user.click(screen.getByTestId("camino-daily-workout"));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const lifts = await collectStoryLifts(user);
    expect(lifts.join(" ")).toMatch(/Del cuento/);
    expect(lifts.join(" ")).toMatch(CEREZAS_Q_RE);
    expect(lifts.join(" ")).toMatch(/CUE:Según el cuento/);
    expect(lifts.join(" ")).toMatch(/PASSAGE:/);
    expect(lifts.join(" ")).toMatch(/quince y veinte pesos|dependo de una sola empresa|cambio climático|roya/);
    expect(lifts.join(" ")).not.toMatch(/Responde según lo que acabas de leer|Answer from what you just read/);
  }, 15000);

  it("Lectura still shows comprehension after the last paragraph (ungated in-reader)", async () => {
    seedProgress({ stories: claimStories("story-9") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    expect(document.body.textContent).not.toMatch(CEREZAS_Q_RE);
    await user.click(screen.getByRole("button", { name: "Preguntas" }));
    await waitFor(() => {
      const prompts = screen.getAllByTestId("story-q-prompt");
      expect(prompts.some((el) => el.textContent.includes("¿Por qué se negó"))).toBe(true);
      expect(prompts.some((el) => el.textContent.includes("¿Cuánto recibe don Adán por cada kilo"))).toBe(true);
    });
    expect(screen.getByRole("button", { name: /Volver al cuento|Back to the story/ })).toBeTruthy();
    const passages = screen.getAllByTestId("story-quiz-passage");
    expect(passages.length).toBe(3);
    expect(passages.some((el) => /dependo de una sola empresa/.test(el.textContent))).toBe(true);
    expect(screen.getAllByTestId("story-quiz-cue").every((el) => el.textContent === "Según el cuento")).toBe(true);
    expect(screen.queryByTestId("story-quiz-cue-line")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Responde según lo que acabas de leer|Answer from what you just read/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getAllByTestId("story-quiz-cue")[0].textContent).toBe("From the story"));
    expect(screen.getAllByTestId("story-quiz-cue").every((el) => el.textContent === "From the story")).toBe(true);
    expect(screen.queryByTestId("story-quiz-cue-line")).toBeNull();
  });

  it("cerezas reading quiz Why + Focus follow uiLang after the refused item", async () => {
    seedProgress({ stories: claimStories("story-9") });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /Las cerezas de don Adán/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Preguntas" }));
    await waitFor(() => {
      const prompts = screen.getAllByTestId("story-q-prompt");
      expect(prompts.some((el) => el.textContent.includes("¿Por qué se negó"))).toBe(true);
    });
    const refused = [...document.querySelectorAll(".choice-card")].find((el) =>
      el.textContent.includes("Porque no quería depender de una sola empresa"));
    expect(refused).toBeTruthy();
    await user.click(refused);
    await waitFor(() => expect(screen.getByTestId("story-quiz-why")).toBeTruthy());
    expect(screen.getByTestId("story-quiz-focus").textContent).toBe("Foco: Lectura");
    expect(screen.getByTestId("story-quiz-why").textContent).toBe("El texto dice que la oferta japonesa era premium — «no pagaba bien» no es lo que pasó. Se negó para no depender de un solo comprador. La independencia ganó al mejor cheque.");
    expect(screen.getAllByTestId("story-quiz-why")).toHaveLength(1);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("story-quiz-focus").textContent).toBe("Focus: Reading"));
    expect(screen.getByTestId("story-quiz-why").textContent).toBe("The text says the Japanese offer was premium — so “didn’t pay well” isn’t what happened. He refused so he wouldn’t depend on one buyer. Independence beat the better check.");
  });

  it("Learn hub is equal tiles — Hoy starts the scene, not Subjuntivo Continuar", async () => {
    const user = await boot();
    assertEqualHub();
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/Continuar|Continue|Subjuntivo/);
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    await openCaminoMore(user);
    expect(screen.getByTestId("path-entry").textContent).toMatch(/EMPIEZA|START/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("streak").textContent).toMatch(/0/);
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/));
    assertEqualHub();
  });

  it("cold open / streak 0 hides Meta, Rayo OFF, and the four-coach strip", async () => {
    cleanup();
    localStorage.clear();
    seedColdFirstVisit();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash-start")).toBeTruthy());
    await user.click(screen.getByTestId("splash-start"));
    await awaitHome();
    assertEqualHub();
    expect(screen.getByTestId("camino-more")).toBeTruthy();
    expect(screen.queryByTestId("door-meta")).toBeNull();
    expect(screen.queryByTestId("rayo-toggle")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(screen.queryByText(/¡Hola,/)).toBeNull();
    expect(screen.queryByText("Luna ya tiene tu rutina de hoy.")).toBeNull();
    expect(screen.queryByText("Luna has your daily routine ready.")).toBeNull();
    expect(screen.queryByRole("button", { name: /Rayo|Lightning/ })).toBeNull();
    expect(screen.queryByText(/Meta:|Goal:/)).toBeNull();
    expect(screen.queryByText("Coach del día")).toBeNull();
    expect(screen.queryByText("Daily coach")).toBeNull();
    expect(screen.getByTestId("streak").textContent).toMatch(/0/);

    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    render(<App />);
    await awaitHome();
    assertEqualHub();
    expect(screen.getByTestId("camino-more")).toBeTruthy();
    expect(screen.queryByTestId("door-meta")).toBeNull();
    expect(screen.queryByTestId("rayo-toggle")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(screen.queryByText(/¡Hola,/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Rayo|Lightning/ })).toBeNull();
    expect(screen.queryByText("Coach del día")).toBeNull();
  });

  it("after streak ≥ 1 Meta, Rayo, and coaches return with Vuelve mañana", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 1, lastDay: today, paywallSeen: true });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("door-meta")).toBeTruthy());
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Meta:\s*0\/40/);
    expect(screen.getByTestId("rayo-toggle").textContent).toMatch(/Rayo\s*OFF/);
    expect(screen.getByTestId("coach-strip")).toBeTruthy();
    expect(screen.getByTestId("coach-strip").querySelector("img[src*='valeria-happy.png']")).toBeTruthy();
    expect(screen.getByTestId("coach-strip").querySelector("img[src*='luna-happy.png']")).toBeTruthy();
    expect(screen.getByTestId("coach-strip").querySelector("img[src*='rafa-happy.png']")).toBeTruthy();
    expect(screen.getByTestId("coach-strip").querySelector("img[src*='diego-happy.png']")).toBeTruthy();
    expect(screen.queryByTestId("luna-greeting")).toBeNull();
    expect(screen.getByText("Coach del día")).toBeTruthy();
    expect(screen.getByText("Mentor de cuentos")).toBeTruthy();
    expect(screen.getByText("Coach de precisión")).toBeTruthy();
    expect(screen.getByText("Rival")).toBeTruthy();
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByTestId("home-pitch")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Español mexicano real\. Tu primer logro empieza aquí/);
    assertEqualHub();
    expect(screen.getByTestId("camino-more")).toBeTruthy();
  });

  it("dark Intermedio lane and Rayo OFF follow the theme; light keeps mint, ink, and the white pill", async () => {
    const crowned = {
      uiLang: "es",
      onboardingDone: true,
      firstSessionDone: true,
      streak: 1,
      lastDay: localToday(),
      paywallSeen: true,
      rayo: false,
      done: { subj1: 1 },
    };
    const MINT = /#F3FBEA|rgb\(\s*243,\s*251,\s*234\s*\)/i;
    const CARD = /#1E2128|rgb\(\s*30,\s*33,\s*40\s*\)/i;
    const CREAM_INK = /#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i;
    const LIGHT_INK = /#3C3C3C|rgb\(\s*60,\s*60,\s*60\s*\)/i;
    const LOCK_INK = /#AFAFAF|rgb\(\s*175,\s*175,\s*175\s*\)/i;
    const LIGHT_SUB = /#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i;
    const WHITE = /#fff\b|#ffffff|white|rgb\(\s*255,\s*255,\s*255\s*\)/i;

    cleanup();
    seedProgress({ ...crowned, theme: "dark" });
    render(<App />);
    await awaitHome();
    const darkLane = screen.getAllByTestId("section-lane")[0];
    expect(darkLane.getAttribute("data-section")).toBe("0");
    expect(darkLane.style.background).toMatch(CARD);
    expect(darkLane.style.background).not.toMatch(MINT);
    const darkLabels = [...darkLane.querySelectorAll("[data-testid='section-lane-label']")];
    expect(darkLabels.map((el) => el.textContent)).toEqual(expect.arrayContaining(["Subjuntivo presente", "Pretérito vs. imperfecto"]));
    darkLabels.forEach((el) => expect(el.style.color).toMatch(CREAM_INK));
    const darkRayo = screen.getByTestId("rayo-toggle");
    expect(darkRayo.textContent).toMatch(/Rayo\s*OFF/);
    expect(darkRayo.style.background).toMatch(CARD);
    expect(darkRayo.style.background).not.toMatch(WHITE);
    expect(darkRayo.style.color).toMatch(CREAM_INK);
    expect(contrastRatio(darkLabels[0].style.color, darkLane.style.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkRayo.style.color, darkRayo.style.background)).toBeGreaterThanOrEqual(4.5);

    cleanup();
    seedProgress({ ...crowned, theme: "light" });
    render(<App />);
    await awaitHome();
    const lightLane = screen.getAllByTestId("section-lane")[0];
    expect(lightLane.style.background).toMatch(MINT);
    const lightLabels = [...lightLane.querySelectorAll("[data-testid='section-lane-label']")];
    expect(lightLabels[0].textContent).toBe("Subjuntivo presente");
    expect(lightLabels[1].textContent).toBe("Pretérito vs. imperfecto");
    expect(lightLabels[0].style.color).toMatch(LIGHT_INK);
    expect(lightLabels[1].style.color).toMatch(LIGHT_INK);
    expect(lightLabels[2].style.color).toMatch(LOCK_INK);
    const lightRayo = screen.getByTestId("rayo-toggle");
    expect(lightRayo.textContent).toMatch(/Rayo\s*OFF/);
    expect(lightRayo.style.background).toMatch(WHITE);
    expect(lightRayo.style.color).toMatch(LIGHT_SUB);
  });

  it("dark Lectura shelf and reader chips follow the theme; light keeps the original fills", async () => {
    const CARD = /#1E2128|rgb\(\s*30,\s*33,\s*40\s*\)/i;
    const GREEN_BG = /#1F3A1A|rgb\(\s*31,\s*58,\s*26\s*\)/i;
    const EDGE = /#2A2E36|rgb\(\s*42,\s*46,\s*54\s*\)/i;
    const INK = /#E8E8EA|rgb\(\s*232,\s*232,\s*234\s*\)/i;
    const SUB = /#A0A4AB|rgb\(\s*160,\s*164,\s*171\s*\)/i;
    const GREEN = /#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i;
    const SUBTLE = /#252830|rgb\(\s*37,\s*40,\s*48\s*\)/i;
    const BLUE_BG = /#0F2A3A|rgb\(\s*15,\s*42,\s*58\s*\)/i;
    const CREAM = /#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i;
    const MINT = /#F3FBEA|rgb\(\s*243,\s*251,\s*234\s*\)/i;
    const WHITE = /#fff\b|#ffffff|white|rgb\(\s*255,\s*255,\s*255\s*\)/i;
    const LIGHT_INK = /#3C3C3C|rgb\(\s*60,\s*60,\s*60\s*\)/i;
    const LIGHT_SUB = /#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i;
    const LIGHT_BLUE = /#DDF4FF|rgb\(\s*221,\s*244,\s*255\s*\)/i;
    const LIGHT_SUBTLE = /#F7F7F7|rgb\(\s*247,\s*247,\s*247\s*\)/i;
    const TRACK = /#E8E8E8|rgb\(\s*232,\s*232,\s*232\s*\)/i;
    const GREEN_DARK = /#46A302|rgb\(\s*70,\s*163,\s*2\s*\)/i;
    const SAGE = /#5C7356|rgb\(\s*92,\s*115,\s*86\s*\)/i;
    const shelfText = (card, size) => [...card.querySelectorAll("div")].find((el) => el.style.fontSize === size);
    const huntChip = (root, word) => [...root.querySelectorAll("span")].find((el) => el.textContent.replace(/^✓\s*/, "") === word);

    const openDarkReader = async () => {
      cleanup();
      mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
      seedProgress({
        uiLang: "es",
        theme: "dark",
        stories: claimStories("story-0"),
        storyFinds: { "story-0": ["muerte"] },
      });
      const user = userEvent.setup();
      render(<App />);
      await awaitHome();
      await user.click(screen.getByTestId("nav-lectura"));
      await waitFor(() => expect(screen.getByTestId("story-shelf-story-0")).toBeTruthy());
      return user;
    };

    const user = await openDarkReader();
    const claimed = screen.getByTestId("story-shelf-story-0");
    const unclaimed = screen.getByTestId("story-shelf-story-1");
    expect(claimed.style.background).toMatch(GREEN_BG);
    expect(claimed.style.background).not.toMatch(MINT);
    expect(unclaimed.style.background).toMatch(CARD);
    expect(unclaimed.style.background).not.toMatch(WHITE);
    expect(claimed.style.borderTopColor || claimed.style.borderColor).toMatch(EDGE);
    expect(unclaimed.style.borderColor).toMatch(EDGE);
    expect(getComputedStyle(claimed).borderTopWidth).toBe("2px");
    expect(getComputedStyle(claimed).borderBottomWidth).toBe("4px");
    const darkTitle = shelfText(claimed, "18px");
    const darkSub = shelfText(claimed, "13px");
    const darkStatus = shelfText(claimed, "12px");
    const darkSouvenir = shelfText(claimed, "11.5px");
    expect(darkTitle.style.color).toMatch(INK);
    expect(darkSub.style.color).toMatch(SUB);
    expect(darkStatus.style.color).toMatch(SUB);
    expect(darkSouvenir.style.color).toMatch(GREEN);
    expect(darkSouvenir.style.color).not.toMatch(SAGE);
    expect(darkSouvenir.style.color).not.toMatch(GREEN_DARK);
    expect(contrastRatio(darkTitle.style.color, claimed.style.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkSub.style.color, claimed.style.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkStatus.style.color, claimed.style.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(darkSouvenir.style.color, claimed.style.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(shelfText(unclaimed, "18px").style.color, unclaimed.style.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(shelfText(unclaimed, "13px").style.color, unclaimed.style.background)).toBeGreaterThanOrEqual(4.5);

    await user.click(claimed);
    await waitFor(() => expect(screen.getByTestId("narration-card")).toBeTruthy());
    const activeMode = screen.getByRole("button", { name: "Cuento" });
    const idleMode = screen.getByRole("button", { name: "Bilingüe" });
    expect(activeMode.style.background).toMatch(GREEN_BG);
    expect(activeMode.style.background).not.toMatch(WHITE);
    expect(activeMode.style.color).toMatch(GREEN);
    expect(activeMode.style.color).not.toMatch(GREEN_DARK);
    expect(contrastRatio(activeMode.style.color, activeMode.style.background)).toBeGreaterThanOrEqual(4.5);
    expect(idleMode.style.background).toMatch(SUBTLE);
    expect(idleMode.style.background).not.toMatch(LIGHT_SUBTLE);
    expect(contrastRatio(idleMode.style.color, idleMode.style.background)).toBeGreaterThanOrEqual(4.5);
    const futureBar = screen.getByTestId("lectura-progress").querySelectorAll("button")[1];
    const questionMark = screen.getByRole("button", { name: "Preguntas" });
    expect(futureBar.style.background).toMatch(EDGE);
    expect(futureBar.style.background).not.toMatch(TRACK);
    expect(questionMark.style.background).toMatch(EDGE);
    expect(questionMark.style.color).toMatch(INK);
    expect(questionMark.textContent).toBe("?");
    expect(contrastRatio(questionMark.style.color, questionMark.style.background)).toBeGreaterThanOrEqual(4.5);
    const activeAudio = screen.getByRole("button", { name: "Normal" });
    const idleAudio = screen.getByRole("button", { name: "Lento" });
    expect(activeAudio.style.background).toMatch(BLUE_BG);
    expect(activeAudio.style.background).not.toMatch(LIGHT_BLUE);
    expect(idleAudio.style.background).toMatch(SUBTLE);
    expect(activeAudio.style.color).toMatch(CREAM);
    expect(idleAudio.style.color).toMatch(CREAM);
    expect(contrastRatio(activeAudio.style.color, activeAudio.style.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(idleAudio.style.color, idleAudio.style.background)).toBeGreaterThanOrEqual(4.5);
    const hunt = screen.getByTestId("word-hunt-card");
    const foundChip = huntChip(hunt, "muerte");
    const plainChip = huntChip(hunt, "ofrenda");
    expect(foundChip.style.background).toMatch(GREEN_BG);
    expect(foundChip.style.background).not.toMatch(MINT);
    expect(plainChip.style.background).toMatch(SUBTLE);
    expect(plainChip.style.background).not.toMatch(LIGHT_SUBTLE);
    expect(foundChip.style.color).toMatch(INK);
    expect(plainChip.style.color).toMatch(INK);
    expect(contrastRatio(foundChip.style.color, foundChip.style.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(plainChip.style.color, plainChip.style.background)).toBeGreaterThanOrEqual(4.5);

    cleanup();
    localStorage.removeItem(LIVE_KEY);
    mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
    seedProgress({
      uiLang: "es",
      theme: "light",
      stories: claimStories("story-0"),
      storyFinds: { "story-0": ["muerte"] },
    });
    const lightUser = userEvent.setup();
    render(<App />);
    await awaitHome();
    await lightUser.click(screen.getByTestId("nav-lectura"));
    const lightClaimed = screen.getByTestId("story-shelf-story-0");
    const lightOpen = screen.getByTestId("story-shelf-story-1");
    expect(lightClaimed.style.background).toMatch(MINT);
    expect(lightOpen.style.background).toMatch(WHITE);
    expect(lightClaimed.style.borderColor).toMatch(GREEN);
    expect(shelfText(lightClaimed, "18px").style.color).toMatch(LIGHT_INK);
    expect(shelfText(lightClaimed, "13px").style.color).toMatch(LIGHT_SUB);
    expect(shelfText(lightClaimed, "12px").style.color).toMatch(/#2E7500|rgb\(\s*46,\s*117,\s*0\s*\)/i);
    expect(shelfText(lightClaimed, "11.5px").style.color).toMatch(/#2E7500|rgb\(\s*46,\s*117,\s*0\s*\)/i);
    await lightUser.click(lightClaimed);
    await waitFor(() => expect(screen.getByTestId("narration-card")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Cuento" }).style.background).toMatch(WHITE);
    expect(screen.getByRole("button", { name: "Cuento" }).style.color).toMatch(/#2E7500|rgb\(\s*46,\s*117,\s*0\s*\)/i);
    expect(screen.getByRole("button", { name: "Bilingüe" }).style.background).toMatch(LIGHT_SUBTLE);
    expect(screen.getByTestId("lectura-progress").querySelectorAll("button")[1].style.background).toMatch(TRACK);
    expect(screen.getByRole("button", { name: "Preguntas" }).style.background).toMatch(TRACK);
    expect(screen.getByRole("button", { name: "Preguntas" }).style.color).toMatch(LIGHT_SUB);
    expect(screen.getByRole("button", { name: "Normal" }).style.background).toMatch(LIGHT_BLUE);
    expect(screen.getByRole("button", { name: "Normal" }).style.color).toMatch(/#1899D6|rgb\(\s*24,\s*153,\s*214\s*\)/i);
    expect(screen.getByRole("button", { name: "Lento" }).style.background).toMatch(LIGHT_SUBTLE);
    expect(screen.getByRole("button", { name: "Lento" }).style.color).toMatch(LIGHT_SUB);
    const lightHunt = screen.getByTestId("word-hunt-card");
    expect(huntChip(lightHunt, "muerte").style.background).toMatch(MINT);
    expect(huntChip(lightHunt, "muerte").style.color).toMatch(/#2E7500|rgb\(\s*46,\s*117,\s*0\s*\)/i);
    expect(huntChip(lightHunt, "ofrenda").style.background).toMatch(LIGHT_SUBTLE);
    expect(huntChip(lightHunt, "ofrenda").style.color).toMatch(LIGHT_SUB);
  });

  it("Hoy + Doctora door buries EMPIEZA / Repasar / Rutina diaria under Intermedio", async () => {
    cleanup();
    seedProgress({
      srs: { "subj1|0": { ef: 2.5, reps: 1, interval: 1, due: Date.now() - 1000 } },
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("nav-camino").textContent).toBe("Camino");
    expect(screen.getByTestId("hub-section-title").textContent).toBe("Intermedio");
    expect(screen.getByTestId("hub-section-quiet").textContent).toBe("Charla real");
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más|More/);
    expect(screen.getByTestId("camino-more").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("camino-more-panel")).toBeNull();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    expect(screen.queryByTestId("camino-review")).toBeNull();
    expect(screen.queryByTestId("camino-daily-workout")).toBeNull();
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    expect(screen.queryByRole("button", { name: /^EMPIEZA$|^START$/ })).toBeNull();
    expect(screen.queryByTestId("camino-review")).toBeNull();
    expect(screen.queryByRole("button", { name: /Rutina diaria|Daily routine/ })).toBeNull();
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más opciones|See more|More options|Camino extra/);

    await user.click(screen.getByTestId("camino-more"));
    await waitFor(() => expect(screen.getByTestId("camino-more-panel")).toBeTruthy());
    expect(screen.getByTestId("camino-more").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("path-entry").textContent).toBe("EMPIEZA");
    expect(screen.getByTestId("camino-review").textContent).toMatch(/Repasar/);
    expect(screen.getByTestId("camino-daily-workout").textContent).toMatch(/Rutina diaria/);
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    expect(screen.getByTestId("nav-camino").textContent).toBe("Camino");
    expect(screen.getByTestId("hub-section-title").textContent).toBe("Intermedio");

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-section-title").textContent).toBe("Intermediate"));
    expect(screen.getByTestId("hub-section-quiet").textContent).toBe("Real talk");
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más|More/);
    expect(screen.getByTestId("path-entry").textContent).toBe("START");
    expect(screen.getByTestId("camino-review").textContent).toMatch(/Review/);
    expect(screen.getByTestId("camino-daily-workout").textContent).toMatch(/Daily routine/);
    expect(screen.getByTestId("nav-camino").textContent).toBe("Learn");
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más opciones|See more|More options/);
  });

  it("Doctora hero still buries path CTAs under Intermedio; life door stays first", async () => {
    const today = localToday();
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: today,
      paywallSeen: true,
      missions: { [`scene-${today}`]: "taqueria" },
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-hoy")).toBeTruthy();
    expect(screen.getByTestId("hub-section-title").textContent).toBe("Intermedio");
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más|More/);
    expect(screen.queryByTestId("path-entry")).toBeNull();
    expect(screen.queryByTestId("camino-daily-workout")).toBeNull();
    await user.click(screen.getByTestId("camino-more"));
    await waitFor(() => expect(screen.getByTestId("path-entry").textContent).toBe("EMPIEZA"));
    expect(screen.getByTestId("camino-daily-workout").textContent).toMatch(/Rutina diaria/);
  });

  it("name field warm line is ¿Cómo te dicen? / What should we call you?", async () => {
    localStorage.clear();
    seedColdFirstVisit();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    expect(screen.getByPlaceholderText("What should we call you?")).toBeTruthy();
    expect(screen.queryByPlaceholderText("What do they call you?")).toBeNull();
    expect(screen.queryByPlaceholderText("¿Cómo te llamamos?")).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByPlaceholderText("¿Cómo te dicen?")).toBeTruthy());
    expect(screen.queryByPlaceholderText("¿Cómo te llamamos?")).toBeNull();
  });

  it("landlord Hoy scene keeps title and uses locked casero copy", async () => {
    await boot();
    assertEqualHub();
    const landlord = HOY_TITLES.find((s) => s.title === "WhatsApp del casero");
    expect(landlord.titleEn).toBe("Landlord WhatsApp");
  });

  it("Bank appointment Hoy card shows unit tags, not Las cerezas de don Adán", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 8, 7, 12, 0, 0));
    try {
      cleanup();
      seedProgress();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);
      await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
      expect(hoySceneForDay(HOY_TITLES, dayKeyFromDate(new Date())).title).toBe("Cita en el banco");
      await startHoyFromHub(user);
      await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
      expect(document.body.textContent).toMatch(/Cita en el banco|agendar una cita/);
      expect(document.body.textContent).not.toMatch(/Las cerezas de don Adán/);
      expect(document.body.textContent).not.toMatch(CEREZAS_Q_RE);
      expect(screen.queryByTestId("hoy-story-chip")).toBeNull();
      await user.click(screen.getByTestId("lang-en"));
      await waitFor(() => expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true"));
      expect(document.body.textContent).not.toMatch(/Las cerezas de don Adán/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("return door with streak ≥ 1: Hoy CTA if scene open, Doctora if Hoy done — never Subjuntivo Continuar", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 1, lastDay: today, paywallSeen: true });
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Continue|Subjuntivo|Phrase Doctor|Arreglar una frase/);
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    await openCaminoMore(userEvent.setup());
    expect(screen.getByTestId("path-entry").textContent).toMatch(/EMPIEZA|START/);
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");

    cleanup();
    seedProgress({
      streak: 1,
      lastDay: today,
      paywallSeen: true,
      missions: { [`scene-${today}`]: "taqueria" },
    });
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-hoy-done")).toBe("1");
    expect(screen.getByTestId("hub-hoy-done")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Continue|Subjuntivo|Phrase Doctor|Jugar la escena/);
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    await openCaminoMore(userEvent.setup());
    expect(screen.getByTestId("path-entry").textContent).toMatch(/EMPIEZA|START/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
  });

  it("day-2 return with streak ≥ 1 opens the promised Hoy as the hero CTA", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    const promised = hoySceneForDay(HOY_TITLES, today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "taqueria" },
    });
    render(<App />);
    await awaitHome();
    assertEqualHub();
    expect(screen.getByTestId("hub-hoy-label").textContent).toBe("Hoy");
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toBe("Qué bueno verte de nuevo. Racha: 1 día. Sigue donde quedaste: Subjuntivo presente.");
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/Continuar|Continue|Arreglar una frase|Fix a phrase/);
    expect(promised.title).toBeTruthy();
    expect(screen.queryByTestId("home-pitch")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Español mexicano real\. Tu primer logro empieza aquí/);
    expect(document.body.textContent).not.toMatch(/Real Mexican Spanish\. Your first win starts here/);
    expect(screen.queryByTestId("first-door-title")).toBeNull();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/La historia sigue\.|The story goes on\.|Hay mucho más por leer\.|There's much\u00A0more to read\./);
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    await openCaminoMore(userEvent.setup());
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
  });

  it("day-2 return Hoy wins early (≤4 beats) with ¡Eso! / That's it.", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "taqueria" },
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    await user.click(screen.getByTestId("lang-es"));
    await startHoyFromHub(user);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    const liveShort = JSON.parse(localStorage.getItem(LIVE_KEY));
    expect(liveShort.session.firstHoy).toBe(true);
    expect(liveShort.session.questions.length).toBeLessThanOrEqual(4);
    expect(liveShort.session.questions.length).toBeGreaterThan(0);
    await clickHoySceneMc(user);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => {
      expect(screen.getByTestId("hoy-win")).toBeTruthy();
      expect(screen.getByTestId("hoy-win-bird-img")).toBeTruthy();
    });
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    assertHoyWinBird();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.queryByTestId("bajio-unlock-flash")).toBeNull();
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Ganaste!|You won!/);
    expect(document.body.textContent).not.toMatch(/¡IMPECABLE!|FLAWLESS!/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("That's it."));
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /You won!|¡Ganaste!|Lesson complete/ })).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    await user.click(screen.getByTestId("hoy-win-continue"));
    await awaitCdmxFlashThenIdle();
    expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).cdmxUnlockSeen).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).bajioUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).oaxacaUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).yucatanUnlockSeen).not.toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).norteUnlockSeen).not.toBe(true);
  });

  it("day-2 live Hoy does not park under Más — scenes are already ≤4", async () => {
    const today = localToday();
    const yesterday = prevDayKey(today);
    const promised = hoySceneForDay(HOY_TITLES, today);
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: yesterday,
      paywallSeen: true,
      missions: { [`scene-${yesterday}`]: "taqueria" },
    });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    await openCaminoMore(user);
    expect(screen.queryByTestId("camino-more-full-hoy")).toBeNull();
    expect(screen.getByTestId("camino-more-panel")).toBeTruthy();
    expect(promised.title).toMatch(/WhatsApp del casero|Mostrador en caos|Noche de faroles|Cena con la suegra|En la farmacia|WhatsApp del plomero|WhatsApp del vecino|En la calle|Cita en el banco/);
  });

  it("undismissed soft paywall clears when the day rolls — no stale Doctora handoff", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 8, 4, 23, 50, 0));
    try {
      cleanup();
      seedProgress({ streak: 1, lastDay: "2026-09-04", paywallSeen: false, lecturaStartedAt: 1 });
      render(<App />);
      await awaitSoftPaywallAfterFirstWin();
      expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);

      vi.setSystemTime(new Date(2026, 8, 5, 0, 1, 0));
      await vi.advanceTimersByTimeAsync(30000);
      await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
      expect(screen.queryByTestId("post-dismiss-handoff")).toBeNull();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).not.toBe(true);
      expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
      expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
      expect(screen.queryByTestId("first-door-title")).toBeNull();
      expect(document.body.textContent).not.toMatch(/La historia sigue\.|The story goes on\.|Hay mucho más por leer\.|There's much\u00A0more to read\./);
    } finally {
      vi.useRealTimers();
    }
  });

  it("day-2 return does not re-show soft paywall when paywallSeen", async () => {
    const yesterday = prevDayKey(localToday());
    cleanup();
    seedProgress({ streak: 1, lastDay: yesterday, paywallSeen: true });
    render(<App />);
    await awaitHome();
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(document.body.textContent).not.toMatch(/La historia sigue\.|The story goes on\.|Hay mucho más por leer\.|There's much\u00A0more to read\./);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
  });

  it("tomorrow teaser is inert — plain text, not a button and not clickable", async () => {
    const today = localToday();
    cleanup();
    seedProgress({
      streak: 1,
      lastDay: today,
      paywallSeen: true,
      missions: { [`scene-${today}`]: "taqueria" },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow")).toBeTruthy());
    const teaser = screen.getByTestId("come-back-tomorrow");
    expect(teaser.textContent).toBe(expectedComeBack("es"));
    expect(teaser.textContent).toMatch(/^Vuelve mañana por «.+»\.$/);
    expect(teaser.textContent).not.toBe("Vuelve mañana por la siguiente escena.");
    expect(screen.queryByTestId("home-pitch")).toBeNull();
    expect(teaser.tagName).toBe("P");
    expect(teaser.tagName).not.toBe("BUTTON");
    expect(teaser.tagName).not.toBe("A");
    expect(teaser.getAttribute("role")).not.toBe("button");
    expect(teaser.getAttribute("href")).toBeNull();
    expect(teaser.closest("button")).toBeNull();
    expect(teaser.closest("a")).toBeNull();
    expect(teaser.closest("[data-testid='first-door-hero']")).toBeNull();
    expect(screen.queryByRole("button", { name: /Vuelve mañana|Come back tomorrow/ })).toBeNull();
    expect(window.getComputedStyle(teaser).cursor).not.toBe("pointer");
    expect(window.getComputedStyle(teaser).pointerEvents).toBe("none");
    expect(screen.getByTestId("hub-hoy").textContent).toMatch(/Hoy/);

    fireEvent.click(teaser);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("nav-camino")).toBeTruthy();
    expect(screen.getByTestId("hero-cta")).toBeTruthy();
    expect(screen.queryByTestId("lesson-exit")).toBeNull();
    expect(screen.queryByTestId("phrase-doctor-board")).toBeNull();
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("splash")).toBeNull();

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("en")));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Come back tomorrow for “.+”\.$/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).not.toBe("Come back tomorrow for the next scene.");
    expect(screen.queryByRole("button", { name: /Vuelve mañana|Come back tomorrow/ })).toBeNull();
    expect(screen.getByTestId("come-back-tomorrow").closest("[data-testid='first-door-hero']")).toBeNull();
  });

  it("Hoy connector selected-state is marked and Listen plays the scene line", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    const line = "¿Con todo, joven, o se lo preparo sin cebolla?";
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
        questions: [{
          type: "mc",
          prompt: "Si el taquero pregunta «¿con todo?», normalmente habla de:",
          text: line,
          line,
          choices: ["cilantro, cebolla, salsa y guarnición", "la cuenta con propina"],
          answer: "cilantro, cebolla, salsa y guarnición",
          shuffledChoices: ["cilantro, cebolla, salsa y guarnición", "la cuenta con propina"],
          _u: "_today",
          _i: -1,
        }],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-listen")).toBeTruthy());
    const cards = screen.getAllByTestId("choice-card");
    expect(cards.length).toBe(2);
    expect(cards[0].getAttribute("aria-pressed")).toBe("false");
    expect(cards[0].getAttribute("data-selected")).toBeNull();
    await user.click(cards[0]);
    expect(cards[0].getAttribute("aria-pressed")).toBe("true");
    expect(cards[0].getAttribute("data-selected")).toBe("true");
    expect(cards[1].getAttribute("aria-pressed")).toBe("false");
    expect(cards[1].getAttribute("data-selected")).toBeNull();
    expect(cards[0].style.boxShadow).toMatch(/3px/);
    window.speechSynthesis.speak.mockClear();
    await user.click(screen.getByTestId("lesson-listen"));
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
    const uttered = window.speechSynthesis.speak.mock.calls[0][0];
    expect(uttered.text).toBe(line);
    expect(uttered.text).not.toMatch(/normalmente habla/);
    expect(screen.queryByTestId("lesson-listen-skip")).toBeNull();
  });

  it("Hoy Listen Skip continues when you cannot hear", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, hearts: 5 });
    const line = "¿Con todo, joven, o se lo preparo sin cebolla?";
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
          {
            type: "listen",
            text: line,
            answers: [line],
            _u: "_today",
            _i: -1,
          },
          {
            type: "mc",
            prompt: "after-skip connector",
            text: line,
            line,
            choices: ["cilantro, cebolla, salsa y guarnición", "la cuenta con propina"],
            answer: "cilantro, cebolla, salsa y guarnición",
            shuffledChoices: ["cilantro, cebolla, salsa y guarnición", "la cuenta con propina"],
            _u: "_today",
            _i: -1,
          },
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-listen-skip")).toBeTruthy());
    expect(screen.getByTestId("lesson-listen")).toBeTruthy();
    expect(screen.getByTestId("lesson-listen").className).toMatch(/duo-btn/);
    const skip = screen.getByTestId("lesson-listen-skip");
    expect(skip.textContent).toBe("Saltar");
    expect(screen.getByTestId("lesson-listen-skip-hint").textContent).toBe("Si no puedes oír");
    expect(skip.className).not.toMatch(/duo-btn/);
    expect(skip.style.background).toMatch(CREAM_FILL);
    expect(skip.style.fontSize).toBe("11px");
    expect(screen.queryByRole("button", { name: /^SALTAR$|^SKIP$/ })).toBeNull();

    await user.click(skip);
    await waitFor(() => expect(screen.getByText("after-skip connector")).toBeTruthy());
    expect(screen.queryByTestId("lesson-listen-skip")).toBeNull();
    expect(screen.queryByTestId("lesson-listen-skip-hint")).toBeNull();
    expect(screen.queryByTestId("hoy-win")).toBeNull();
    expect(document.body.textContent).toMatch(/Escribe lo que escuchas|after-skip connector/);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").hearts ?? 5).toBe(5);
  });

  it("Listen Skip on a last dictation beat finishes the lesson", async () => {
    cleanup();
    seedProgress({ hearts: 5 });
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "lesson",
      tab: "camino",
      status: "idle",
      qi: 0,
      lessonStats: { right: 0, wrong: 0 },
      session: {
        title: "Listen skip last",
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
    await waitFor(() => expect(screen.getByTestId("lesson-listen-skip")).toBeTruthy());
    await user.click(screen.getByTestId("lesson-listen-skip"));
    await waitFor(() => expect(screen.getByRole("heading", { name: /completada|complete/i })).toBeTruthy());
    expect(screen.queryByTestId("lesson-listen-skip")).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").hearts ?? 5).toBe(5);
  });

  it("first win shows streak 1 and the vuelve mañana home line", async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
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
          hoyMc("beat 3 must not run — early checkpoint"),
          hoyMc("beat 4 must not run — early checkpoint"),
          hoyMc("beat 5 must not run — later Hoy only"),
        ],
      },
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(document.body.textContent).toMatch(/Si el taquero pregunta/);
    expect(document.body.textContent).not.toMatch(/beat 2 must not run/);
    const choices = document.querySelectorAll(".choice-card");
    expect(choices.length).toBeGreaterThan(0);
    await user.click(choices[0]);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continuar$/i })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => {
      expect(screen.getByTestId("hoy-win")).toBeTruthy();
      expect(screen.getByTestId("hoy-win-bird-img")).toBeTruthy();
    });
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    assertHoyWinBird();
    expect(screen.queryByTestId("win-bounce")).toBeNull();
    expect(document.querySelectorAll(".confetti-bit").length).toBe(0);
    expect(document.querySelectorAll(".jump").length).toBe(0);
    expect(screen.getByRole("heading", { name: /^¡Eso!$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Lección completada|Lesson complete|¡Ganaste!|You won!/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/¡Ganaste!|You won!/);
    expect(document.body.textContent).not.toMatch(/¡IMPECABLE!|FLAWLESS!/);
    expect(document.body.textContent).not.toMatch(/beat 2 must not run|beat 5 must not run/);
    assertCreamShell();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("That's it."));
    expect(screen.getByRole("heading", { name: /^That's it\.$/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /You won!|¡Ganaste!|Lesson complete/ })).toBeNull();
    assertHoyWinBird();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!"));
    await waitFor(() => {
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.streak).toBe(1);
      expect(prog.lastDay).toBe(today);
      expect(prog.missions[`scene-${today}`]).toBe("taqueria");
    });
    await user.click(screen.getByTestId("hoy-win-continue"));
    await lecturaThenBajioWall(user);
    await awaitHome();
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Vuelve mañana por «.+»\.$/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).not.toBe("Vuelve mañana por la siguiente escena.");
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Hay mucho más por leer.");
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-hoy-done")).toBe("1");
    expect(screen.getByTestId("hub-hoy-done")).toBeTruthy();
    expect(screen.getByTestId("hub-stories").getAttribute("data-hub-loud")).toBeNull();
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.getByTestId("post-dismiss-handoff")).toBeTruthy();
    expect(screen.queryByTestId("a2hs-sheet")).toBeNull();
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-hoy-done")).toBe("1");
    expect(screen.getByTestId("hub-hoy-done")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("learn-hub-tiles").querySelectorAll("button")).toHaveLength(6);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Meta:\s*\d+\/40/);
    expect(screen.getByTestId("rayo-toggle")).toBeTruthy();
    expect(screen.getByTestId("coach-strip")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.queryByTestId("first-door-hero")).toBeNull();
    expect(screen.getByTestId("hub-hoy").textContent).not.toMatch(/Continuar|Subjuntivo/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("en")));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Come back tomorrow for “.+”\.$/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).not.toBe("Come back tomorrow for the next scene.");
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("hub-phrase-doctor").textContent).toMatch(HUB_DOCTOR_RE);
    expect(screen.getByTestId("learn-hub")).toBeTruthy();
  });

  it("locked Lectura stories stay closed on the path and the shelf", async () => {
    const user = await boot();
    const camino2 = screen.getByTestId("camino-story-story-2");
    expect(camino2.getAttribute("data-locked")).toBe("true");
    expect(camino2.disabled).toBe(true);
    expect(screen.getByTestId("camino-story-story-0").getAttribute("data-locked")).toBe("false");
    expect(screen.getByTestId("camino-story-story-1").getAttribute("data-locked")).toBe("true");
    fireEvent.click(camino2);
    expect(screen.queryByTestId("story-reader")).toBeNull();
    await user.click(screen.getByTestId("nav-lectura"));
    const shelf2 = screen.getByTestId("story-shelf-story-2");
    expect(shelf2.getAttribute("data-locked")).toBe("true");
    expect(shelf2.disabled).toBe(true);
    expect(screen.getByTestId("story-shelf-story-0").getAttribute("data-locked")).toBe("false");
    expect(screen.getByTestId("story-shelf-story-9").getAttribute("data-locked")).toBe("true");
    fireEvent.click(shelf2);
    fireEvent.click(screen.getByTestId("story-shelf-story-9"));
    expect(screen.queryByTestId("story-reader")).toBeNull();
    await user.click(screen.getByTestId("story-shelf-story-0"));
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-0");
    expect(screen.getByTestId("lectura-still-0").getAttribute("src")).toBe(`${import.meta.env.BASE_URL}lectura/story-0/p0.png`);
  });

  it("first Cenzontle win shows one quiet Lectura handoff and opens story-0", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, uiLang: "es" });
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
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await user.click(document.querySelector(".choice-card"));
    await user.click(screen.getByTestId("lesson-check"));
    await user.click(await screen.findByRole("button", { name: /^Continuar$/i }));
    const strip = await screen.findByTestId("lectura-handoff");
    expect(screen.getByTestId("hoy-win").textContent).toBe("¡Eso!");
    assertHoyWinBird();
    expect(strip.querySelector("img")).toBeNull();
    expect(screen.getByTestId("lectura-handoff-quiet").textContent).toBe(LECTURA_HANDOFF_QUIET.es);
    const cta = screen.getByTestId("lectura-handoff-cta");
    expect(cta.textContent).toBe(LECTURA_HANDOFF_CTA.es);
    expect(cta.getAttribute("data-story-id")).toBe("story-0");
    expect(cta.className).not.toMatch(/duo-btn/);
    expect(cta.style.backgroundColor).toBe("rgb(246, 239, 228)");
    expect(cta.style.color).toBe("rgb(92, 115, 86)");
    expect(cta.style.backgroundColor).not.toBe(screen.getByTestId("hoy-win-continue").style.backgroundColor);
    expect(strip.textContent).not.toContain(LECTURA_HANDOFF_QUIET.en);
    expect(strip.textContent).not.toContain(LECTURA_HANDOFF_CTA.en);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).lecturaHandoffSeen).toBe(true));
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lectura-handoff-quiet").textContent).toBe(LECTURA_HANDOFF_QUIET.en));
    expect(screen.getByTestId("lectura-handoff-cta").textContent).toBe(LECTURA_HANDOFF_CTA.en);
    expect(screen.getByTestId("lectura-handoff").textContent).not.toMatch(/El cuento es lo que sigue|Leer el cuento/);
    expect(screen.getByTestId("hoy-win").textContent).toBe("That's it.");
    await user.click(screen.getByTestId("lectura-handoff-cta"));
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-0");
    expect(reader.textContent).toMatch(/La noche en que vuelven/);
    expect(screen.queryByTestId("lectura-handoff")).toBeNull();
    expect(screen.queryByTestId("hoy-win")).toBeNull();
  });
});
