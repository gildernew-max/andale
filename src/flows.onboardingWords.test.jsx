import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { lecturaCliffhangers } from "./lecturaCliffhanger.js";
import * as flashDeck from "./flashDeck.js";
import { onboardingCopy, onboardingLine, onboardingPlanLine } from "./onboardingCopy.js";
import {
  installFlowHooks,
  STORAGE_KEY,
  LIVE_KEY,
  seedProgress,
  awaitHome,
  awaitSoftPaywallAfterFirstWin,
  openStory0,
  openCaminoMore,
} from "./flowsHarness.jsx";

installFlowHooks();

describe("short onboarding", () => {
  const onboardingText = (lang) => screen.getByTestId("onboarding").textContent;
  const choose = async (user, id) => {
    await user.click(screen.getByTestId(id));
    await user.click(screen.getByTestId("onboarding-cta"));
  };

  it("a fresh save shows onboarding and reaches a non-beginner lesson", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("level"));
    expect(screen.queryByTestId("splash")).toBeNull();
    expect(screen.getByTestId("onboarding").style.overflow).toBe("hidden");
    expect(screen.queryByTestId("streak")).toBeNull();
    const cta = screen.getByTestId("onboarding-cta");
    expect(cta.disabled).toBe(true);
    expect(cta.style.top).toBe("780px");
    expect(cta.textContent).toBe(onboardingLine(onboardingCopy.ctaContinue, "en"));
    expect(cta.style.background).toMatch(/#E5E5E5|rgb\(\s*229,\s*229,\s*229\s*\)/i);
    expect(cta.style.color).toMatch(/#AFAFAF|rgb\(\s*175,\s*175,\s*175\s*\)/i);
    expect(screen.getByTestId("onboarding-level-beginner").textContent).toBe(
      `${onboardingLine(onboardingCopy.levels.beginner.name, "en")}${onboardingLine(onboardingCopy.levels.beginner.desc, "en")}`,
    );
    expect(screen.getByTestId("onboarding-level-some").textContent).toContain(onboardingLine(onboardingCopy.levels.some.name, "en"));
    expect(screen.getByTestId("onboarding-level-conversation").textContent).toContain(onboardingLine(onboardingCopy.levels.conversation.name, "en"));
    let taps = 0;
    const tap = async (el) => { taps += 1; await user.click(el); };
    await tap(screen.getByTestId("onboarding-level-conversation"));
    expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("level");
    expect(screen.getByTestId("onboarding-check")).toBeTruthy();
    expect(screen.getByTestId("onboarding-cta").disabled).toBe(false);
    expect(screen.getByTestId("onboarding-cta").style.background).toMatch(/#58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.getByTestId("onboarding-cta").style.color).toMatch(/#1F3A1A|rgb\(\s*31,\s*58,\s*26\s*\)/i);
    expect(screen.getByTestId("onboarding-cta").style.borderBottom).toMatch(/#46A302|rgb\(\s*70,\s*163,\s*2\s*\)/i);
    await tap(screen.getByTestId("onboarding-cta"));
    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("why"));
    expect(screen.getByTestId("onboarding-title").textContent).toBe(onboardingLine(onboardingCopy.whyTitle, "en"));
    expect(screen.queryByTestId("onboarding-promise")).toBeNull();
    for (const id of ["travel", "family", "live", "work", "me"]) {
      expect(screen.getByTestId(`onboarding-why-${id}`).textContent).toBe(onboardingLine(onboardingCopy.whys[id], "en"));
    }
    expect(screen.getByTestId("onboarding-cta").disabled).toBe(true);
    await tap(screen.getByTestId("onboarding-why-travel"));
    await tap(screen.getByTestId("onboarding-cta"));
    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("goal"));
    expect(screen.getByTestId("onboarding-title").textContent).toBe(onboardingLine(onboardingCopy.goalTitle, "en"));
    for (const count of [5, 10, 15, 20]) {
      expect(screen.getByTestId(`onboarding-goal-${count}`).textContent).toBe(`${count} min${onboardingLine(onboardingCopy.goals[count], "en")}`);
    }
    expect(screen.queryByTestId("onboarding-goal-note")).toBeNull();
    expect(onboardingText("en")).not.toMatch(/Profile|Perfil/);
    await tap(screen.getByTestId("onboarding-goal-15"));
    await tap(screen.getByTestId("onboarding-cta"));
    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("plan"));
    expect(screen.getByTestId("onboarding-title").textContent).toBe(onboardingLine(onboardingCopy.planTitle, "en"));
    expect(screen.getByTestId("onboarding-plan-body").textContent).toBe(onboardingPlanLine("en", 15));
    expect(screen.getByTestId("onboarding-plan-bird").getAttribute("src")).toMatch(/mascot\/cenzontle\.png/);
    expect(screen.queryByTestId("onboarding-plan-level")).toBeNull();
    expect(screen.getByTestId("onboarding").querySelectorAll("button")).toHaveLength(1);
    expect(screen.getByTestId("onboarding-start").textContent).toBe(onboardingLine(onboardingCopy.planStart, "en"));
    expect(screen.getByTestId("onboarding-start").style.color).toMatch(/#1F3A1A|rgb\(\s*31,\s*58,\s*26\s*\)/i);
    expect(screen.getByTestId("onboarding-start").style.top).toBe("780px");
    expect(screen.getByTestId("onboarding-start").disabled).toBe(false);
    await tap(screen.getByTestId("onboarding-start"));
    await waitFor(() => expect(document.querySelector("[data-first-session]")?.getAttribute("data-first-session")).toBe("1"));
    expect(taps).toBe(7);
    expect(document.querySelector("[data-count]").getAttribute("data-count")).toBe("5");
    expect(document.body.textContent).toMatch(/Es obvio que Marisol/);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.learnerLevel).toBe("conversation");
    expect(saved.learningWhy).toBe("travel");
    expect(saved.dailyGoalMinutes).toBe(15);
    expect(saved.dailyGoalLessons).toBeUndefined();
    expect(saved.onboardingDone).toBe(true);
    expect(saved.onboardingPending).toBe(false);
    expect(saved.welcomed).toBe(true);
  });

  it("a beginner fresh save opens the zero-start session", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding-level-beginner")).toBeTruthy());
    let taps = 0;
    const tap = async (el) => { taps += 1; await user.click(el); };
    await tap(screen.getByTestId("onboarding-level-beginner"));
    await tap(screen.getByTestId("onboarding-cta"));
    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("why"));
    await tap(screen.getByTestId("onboarding-why-family"));
    await tap(screen.getByTestId("onboarding-cta"));
    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("goal"));
    await tap(screen.getByTestId("onboarding-goal-5"));
    await tap(screen.getByTestId("onboarding-cta"));
    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("plan"));
    expect(screen.getByTestId("onboarding-plan-body").textContent).toBe("5 minutes a day: one short lesson, then a story in Lectura.");
    await tap(screen.getByTestId("onboarding-start"));
    await waitFor(() => expect(document.querySelector("[data-first-session]")?.getAttribute("data-beginner-first")).toBe("1"));
    expect(taps).toBe(7);
    expect(screen.queryByTestId("story-reader")).toBeNull();
    expect(document.body.textContent).toContain(`Which one means "good morning"?`);
    const cards = screen.getAllByTestId("choice-card").map((el) => el.textContent.replace(/^\d+/, ""));
    expect(cards).toEqual(["Buenas noches", "Buenos días", "Hasta luego", "Con permiso"]);
    expect(document.body.textContent).not.toMatch(/Es obvio que Marisol/);
    expect(document.body.textContent).not.toMatch(/story-0/);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.learnerLevel).toBe("beginner");
    expect(saved.learningWhy).toBe("family");
    expect(saved.dailyGoalMinutes).toBe(5);
    expect(saved.onboardingDone).toBe(true);
    expect(saved.firstSessionDone).not.toBe(true);
  });

  it("some Spanish opens on the onda bank item, not the beginner session", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding-level-some")).toBeTruthy());
    await choose(user, "onboarding-level-some");
    await waitFor(() => expect(screen.getByTestId("onboarding-why-work")).toBeTruthy());
    await choose(user, "onboarding-why-work");
    await waitFor(() => expect(screen.getByTestId("onboarding-goal-10")).toBeTruthy());
    await choose(user, "onboarding-goal-10");
    await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy());
    expect(screen.getByTestId("onboarding-plan-body").textContent).toBe(onboardingPlanLine("en", 10));
    await user.click(screen.getByTestId("onboarding-start"));
    await waitFor(() => expect(document.querySelector("[data-first-session]")?.getAttribute("data-beginner-first")).toBe("0"));
    expect(document.querySelector("[data-count]").getAttribute("data-count")).toBe("5");
    expect(document.body.textContent).toContain("—¡Hola, Memo! ¿Qué ___? Hacía mucho que no te veía.");
    expect(document.body.textContent).not.toMatch(/Es obvio que Marisol/);
    expect(document.body.textContent).not.toMatch(/good morning/);
  });

  it("EN and ES onboarding strings come from onboardingCopy.js", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding-title").textContent).toBe(onboardingLine(onboardingCopy.levelTitle, "en")));
    const promise = screen.getByTestId("onboarding-promise");
    expect(promise.textContent).toBe(onboardingLine(onboardingCopy.levelPromise, "en"));
    expect(screen.getByTestId("onboarding-title").nextElementSibling).toBe(promise);
    expect(promise.style.fontSize).toBe("16px");
    expect(promise.style.fontWeight).toBe("600");
    expect(promise.style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
    expect(promise.style.textWrap).toBe("balance");
    expect(promise.style.webkitLineClamp).toBe("");
    expect(promise.style.webkitBoxOrient).toBe("");
    expect(promise.style.overflow).toBe("");
    expect(onboardingText("en")).toContain(onboardingLine(onboardingCopy.levels.some.desc, "en"));
    expect(onboardingText("en")).not.toMatch(/stripe|paypal|revenuecat|minute|audio/i);
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("onboarding-title").textContent).toBe(onboardingLine(onboardingCopy.levelTitle, "es")));
    expect(screen.getByTestId("onboarding-promise").textContent).toBe(onboardingLine(onboardingCopy.levelPromise, "es"));
    expect(onboardingText("es")).toContain(onboardingLine(onboardingCopy.levels.beginner.name, "es"));
    expect(onboardingText("es")).toContain(onboardingLine(onboardingCopy.levels.beginner.desc, "es"));
    expect(onboardingText("es")).toContain(onboardingLine(onboardingCopy.levels.conversation.desc, "es"));
    await user.click(screen.getByTestId("onboarding-level-some"));
    await user.click(screen.getByTestId("onboarding-cta"));
    await waitFor(() => expect(screen.getByTestId("onboarding-why-family").textContent).toBe(onboardingLine(onboardingCopy.whys.family, "es")));
    expect(screen.queryByTestId("onboarding-promise")).toBeNull();
    expect(screen.getByTestId("onboarding-cta").textContent).toBe(onboardingLine(onboardingCopy.ctaContinue, "es"));
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("onboarding-why-family").textContent).toBe(onboardingLine(onboardingCopy.whys.family, "en")));
    await user.click(screen.getByTestId("onboarding-why-family"));
    await user.click(screen.getByTestId("onboarding-cta"));
    await waitFor(() => expect(screen.getByTestId("onboarding-goal-10").textContent).toBe(`10 min${onboardingLine(onboardingCopy.goals[10], "en")}`));
    expect(screen.queryByTestId("onboarding-goal-note")).toBeNull();
    expect(onboardingText("en")).not.toMatch(/Profile|Perfil/);
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("onboarding-goal-20").textContent).toBe(`20 min${onboardingLine(onboardingCopy.goals[20], "es")}`));
    expect(onboardingText("es")).not.toMatch(/Profile|Perfil/);
    await user.click(screen.getByTestId("onboarding-goal-10"));
    await user.click(screen.getByTestId("onboarding-cta"));
    await waitFor(() => expect(screen.getByTestId("onboarding-title").textContent).toBe(onboardingLine(onboardingCopy.planTitle, "es")));
    expect(screen.queryByTestId("onboarding-promise")).toBeNull();
    expect(screen.getByTestId("onboarding-plan-body").textContent).toBe(onboardingPlanLine("es", 10));
    expect(screen.getByTestId("onboarding-start").textContent).toBe(onboardingLine(onboardingCopy.planStart, "es"));
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("onboarding-start").textContent).toBe(onboardingLine(onboardingCopy.planStart, "en")));
    expect(screen.getByTestId("onboarding-plan-body").textContent).toBe(onboardingPlanLine("en", 10));
  });

  it("a selected level card shows the check and stays until the CTA", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding-level-beginner")).toBeTruthy());
    await user.click(screen.getByTestId("onboarding-cta"));
    expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("level");
    await user.click(screen.getByTestId("onboarding-level-beginner"));
    const card = screen.getByTestId("onboarding-level-beginner");
    expect(card.getAttribute("data-selected")).toBe("true");
    expect(screen.getByTestId("onboarding-check")).toBeTruthy();
    expect(card.style.background).toMatch(/#FFFFFF|rgb\(\s*255,\s*255,\s*255\s*\)/i);
    expect(card.style.border).toMatch(/3px solid (#2E7500|rgb\(\s*46,\s*117,\s*0\s*\))/i);
    expect(card.style.padding).toBe("11px 13px");
    expect(screen.getByTestId("onboarding-level-some").style.border).toMatch(/2px solid (#6F7757|rgb\(\s*111,\s*119,\s*87\s*\))/i);
    expect(screen.getByTestId("onboarding-level-some").style.padding).toBe("12px 14px");
    expect(screen.getByTestId("onboarding-level-some").style.background).toBe(card.style.background);
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("level");
    expect(screen.getByTestId("onboarding-cta").disabled).toBe(false);
  });

  it("existing saves with a marker, a resume, or a finished lesson skip onboarding", async () => {
    const expectHub = async (extra) => {
      cleanup();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        welcomed: true,
        xp: 10,
        hearts: 5,
        contentVersion: 2,
        uiLang: "en",
        done: {},
        ...extra,
      }));
      render(<App />);
      await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
      expect(screen.queryByTestId("onboarding")).toBeNull();
      expect(screen.queryByTestId("splash")).toBeNull();
    };
    await expectHub({ firstSessionDone: false });
    await expectHub({ firstSessionDone: true });
    await expectHub({ firstSessionArmed: true });
    await expectHub({ resume: { unitId: "_first", order: [{ u: "subj1", i: 3 }], qi: 1 } });
    await expectHub({ done: { subj1: 1 } });
    await expectHub({ stories: { "story-0": true }, firstSessionDone: true });
    await expectHub({ xp: 40, streak: 3, lastDay: "2026-01-02" });
    await expectHub({ onboardingDone: true, learnerLevel: "some", dailyGoalLessons: 2 });
  });

  it("an existing first-session save opens the lesson with no onboarding tap", async () => {
    cleanup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      welcomed: true,
      xp: 0,
      hearts: 5,
      contentVersion: 2,
      uiLang: "en",
      done: {},
      firstSessionDone: false,
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
    expect(screen.queryByTestId("onboarding")).toBeNull();
    await user.click(screen.getByTestId("hub-sendero"));
    await user.click(screen.getByRole("button", { name: /Start · \+XP/ }));
    await waitFor(() => expect(document.querySelector("[data-first-session]")?.getAttribute("data-first-session")).toBe("1"));
    expect(document.body.textContent).toMatch(/Es obvio que Marisol/);
  });

  it("a pending dark save stays on onboarding and keeps the stored level", async () => {
    cleanup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      onboardingPending: true,
      firstSessionDone: false,
      learnerLevel: "beginner",
      theme: "dark",
      uiLang: "es",
      contentVersion: 2,
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding").getAttribute("data-step")).toBe("why"));
    expect(screen.getByTestId("onboarding").getAttribute("data-theme")).toBe("dark");
    expect(screen.getByTestId("onboarding").style.background).toMatch(/#15171C|rgb\(\s*21,\s*23,\s*28\s*\)/i);
    expect(screen.getByTestId("onboarding").style.color).toMatch(/#F6EFE4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
    expect(screen.getByTestId("onboarding-title").textContent).toBe(onboardingLine(onboardingCopy.whyTitle, "es"));
    expect(screen.queryByTestId("onboarding-promise")).toBeNull();
    expect(screen.getByTestId("onboarding-cta").disabled).toBe(true);
    expect(screen.getByTestId("onboarding-cta").style.background).toMatch(/#2A2E36|rgb\(\s*42,\s*46,\s*54\s*\)/i);
    expect(screen.getByTestId("onboarding-cta").style.color).toMatch(/#6B7078|rgb\(\s*107,\s*112,\s*120\s*\)/i);
    expect(screen.queryByTestId("splash")).toBeNull();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("onboarding-why-live"));
    const picked = screen.getByTestId("onboarding-why-live");
    expect(picked.getAttribute("data-selected")).toBe("true");
    expect(screen.getByTestId("onboarding-check")).toBeTruthy();
    expect(picked.style.background).toMatch(/#1E2128|rgb\(\s*30,\s*33,\s*40\s*\)/i);
    expect(picked.style.border).toMatch(/3px solid (#58CC02|rgb\(\s*88,\s*204,\s*2\s*\))/i);
    expect(picked.style.padding).toBe("11px 13px");
    expect(screen.getByTestId("onboarding-why-travel").style.border).toMatch(/2px solid (#6F7757|rgb\(\s*111,\s*119,\s*87\s*\))/i);
    expect(screen.getByTestId("onboarding-why-travel").style.padding).toBe("12px 14px");
    expect(screen.getByTestId("onboarding-why-travel").style.background).toBe(picked.style.background);
  });

  it("a wrong beginner answer is rejected and the right ones finish on the beginner win, then a story start opens the paywall", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("onboarding-level-beginner")).toBeTruthy());
    await choose(user, "onboarding-level-beginner");
    await waitFor(() => expect(screen.getByTestId("onboarding-why-me")).toBeTruthy());
    await choose(user, "onboarding-why-me");
    await waitFor(() => expect(screen.getByTestId("onboarding-goal-5")).toBeTruthy());
    await choose(user, "onboarding-goal-5");
    await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy());
    await user.click(screen.getByTestId("onboarding-start"));
    await waitFor(() => expect(document.querySelector("[data-beginner-first]")?.getAttribute("data-beginner-first")).toBe("1"));
    const wrong = screen.getAllByTestId("choice-card").find((el) => el.textContent.includes("Buenas noches"));
    await user.click(wrong);
    await user.click(screen.getByTestId("lesson-check"));
    await waitFor(() => expect(screen.getByTestId("first-session-why").textContent).toBe(
      `"Buenos días" is what you say in the morning, until about midday. "Buenas noches" is for the night.`,
    ));
    await user.click(screen.getByRole("button", { name: /^Continue$/ }));
    const beats = [
      { type: "type", tile: "gusto", prompt: "Mucho ___." },
      { type: "order", tiles: ["un", "café,", "por", "favor"], prompt: `Build: "A coffee, please."` },
      { type: "mc", choice: "¿Cuánto cuesta?", prompt: `How do you ask "How much is it?"` },
      { type: "type", tile: "llamas", prompt: "¿Cómo te ___?" },
    ];
    for (const beat of beats) {
      await waitFor(() => expect(document.querySelector("[data-qtype]")?.getAttribute("data-qtype")).toBe(beat.type));
      expect(document.body.textContent).toContain(beat.prompt);
      if (beat.choice) {
        const cards = screen.getAllByTestId("choice-card").map((el) => el.textContent.replace(/^\d+/, ""));
        expect(cards).toEqual(["¿Dónde está?", "¿Cómo estás?", "¿Qué hora es?", "¿Cuánto cuesta?"]);
        await user.click(screen.getAllByTestId("choice-card").find((el) => el.textContent.includes(beat.choice)));
      } else if (beat.tile) {
        await user.click(screen.getAllByTestId("bank-tile").find((el) => el.textContent.trim() === beat.tile));
      } else {
        for (const word of beat.tiles) {
          const tile = screen.getAllByTestId("bank-tile").find((el) => el.textContent.trim().toLowerCase() === word);
          expect(tile, word).toBeTruthy();
          await user.click(tile);
        }
      }
      await user.click(screen.getByTestId("lesson-check"));
      await user.click(screen.getByRole("button", { name: /^Continue$/ }));
    }
    await waitFor(() => expect(screen.getByTestId("first-session-win-line").textContent).toBe(
      "First lesson done. You have your first words to say hello, order a coffee and ask the price. Come back tomorrow for the next one.",
    ));
    expect(document.body.textContent).not.toMatch(/[Ss]ubjuntiv/);
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("first-session-win-line").textContent).toBe(
      "Primera lección lista. Ya tienes tus primeras palabras para saludar, pedir un café y preguntar el precio. Mañana seguimos con la siguiente.",
    ));
    await user.click(screen.getByTestId("win-continue"));
    await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect((window.__andaleFunnelLog || []).some((e) => e.event === "paywall_seen")).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).firstSessionDone).toBe(true);
    await openStory0(user);
    await user.click(screen.getByTestId("brand-home"));
    await awaitSoftPaywallAfterFirstWin();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).firstSessionDone).toBe(true);
    // Full beginner path + Lectura start + wall. CI already spends ~10 minutes on this file.
  }, 40000);
});

describe("words audit strings", () => {
  const claimStory0 = async (user) => {
    await user.click(screen.getByTestId("nav-lectura"));
    await user.click(screen.getByTestId("story-shelf-story-0"));
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
    await user.click(screen.getByRole("button", { name: /^(Reclamar|Claim)/ }));
    await waitFor(() => expect(screen.getByTestId("lectura-cliffhanger-line")).toBeTruthy());
  };

  it("Lectura closing hook is EN or ES for story-0 and EN is not Spanish", async () => {
    cleanup();
    localStorage.removeItem(LIVE_KEY);
    seedProgress({ uiLang: "es", onboardingDone: true, paywallSeen: true, firstSessionDone: true });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
    await claimStory0(user);
    const esLine = screen.getByTestId("lectura-cliffhanger-line");
    const esCta = screen.getByTestId("lectura-bird-handoff-cta");
    expect(esLine.textContent).toBe(lecturaCliffhangers["story-0"].es);
    expect(esLine.textContent).not.toBe(lecturaCliffhangers["story-0"].en);
    expect(esCta.textContent).toBe("Continuar");
    expect(esLine.compareDocumentPosition(esCta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lectura-cliffhanger-line").textContent).toBe(lecturaCliffhangers["story-0"].en));
    const enLine = screen.getByTestId("lectura-cliffhanger-line");
    expect(enLine.textContent).not.toBe(lecturaCliffhangers["story-0"].es);
    expect(enLine.textContent).not.toMatch(/[¿¡]/);
    expect(screen.getByTestId("lectura-bird-handoff-cta").textContent).toBe("Continue");
    expect(enLine.compareDocumentPosition(screen.getByTestId("lectura-bird-handoff-cta")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }, 30000);

  it("story shelf and camino story use locked / cerrado; unit nodes stay blocked", async () => {
    cleanup();
    seedProgress({ uiLang: "es", onboardingDone: true });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("camino-story-story-1")).toBeTruthy());
    expect(screen.getByTestId("camino-story-story-1").getAttribute("aria-label")).toBe("Cuento: La casa azul (cerrado)");
    expect(screen.getByTestId("camino-story-story-0").getAttribute("aria-label")).toBe("Cuento: La noche en que vuelven");
    expect(screen.getByRole("button", { name: "Pretérito vs. imperfecto (bloqueado)" })).toBeTruthy();
    await user.click(screen.getByTestId("nav-lectura"));
    expect(screen.getByTestId("story-shelf-story-1").getAttribute("aria-label")).toBe("La casa azul (cerrado)");
    expect(screen.getByTestId("story-shelf-story-9").getAttribute("aria-label")).toBe("Las cerezas de don Adán (cerrado)");
    expect(screen.getByTestId("story-shelf-story-0").getAttribute("aria-label")).toBe("La noche en que vuelven");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("story-shelf-story-1").getAttribute("aria-label")).toBe("La casa azul (locked)"));
    expect(screen.getByTestId("story-shelf-story-2").getAttribute("aria-label")).toBe("Beyond the beach (locked)");
    expect(screen.getByTestId("story-shelf-story-0").getAttribute("aria-label")).toBe("La noche en que vuelven");
    await user.click(screen.getByTestId("nav-camino"));
    await waitFor(() => expect(screen.getByTestId("camino-story-story-1").getAttribute("aria-label")).toBe("Story: La casa azul (locked)"));
    expect(screen.getByTestId("camino-story-story-0").getAttribute("aria-label")).toBe("Story: La noche en que vuelven");
    expect(screen.getByRole("button", { name: "Pretérito vs. imperfecto (blocked)" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: / \(cerrado\)/ })).toBeNull();
    expect(screen.queryByRole("button", { name: / \(bloqueado\)/ })).toBeNull();
  });

  it("hub pin and flash labels follow uiLang", async () => {
    cleanup();
    seedProgress({ uiLang: "es", onboardingDone: true, paywallSeen: true });
    const user = userEvent.setup();
    render(<App />);
    await awaitHome();
    await openCaminoMore(user);
    expect(screen.getByTestId("hub-pins").textContent).toBe("Caza de pines");
    expect(screen.getByTestId("hub-flashcards").textContent).toBe("Tarjetas");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hub-pins").textContent).toBe("Pin hunt"));
    expect(screen.getByTestId("hub-flashcards").textContent).toBe("Flashcards");
  });

  it("adaptive review and shortcuts hint use the stamped ES lines", async () => {
    cleanup();
    seedProgress({
      uiLang: "es",
      onboardingDone: true,
      xp: 50,
      done: { subj1: 1 },
      weak: { Subjuntivo: 3 },
      srs: { "subj1|0": { ef: 2.5, reps: 0, interval: 1, due: Date.now() + 864e5 } },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("atajos")).toBeTruthy());
    expect(screen.getByTestId("atajos").textContent).toBe("Luna, Don Rafa, Valeria y Diego te acompañan. Atajos: 1–4 · Enter");
    await user.click(screen.getByTestId("nav-practica"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Repaso adaptativo" })).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Repaso adaptivo" })).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Adaptive review" })).toBeTruthy());
  });

  const openCrownSheet = async (user) => {
    await waitFor(() => expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Subjuntivo presente" }));
    await waitFor(() => expect(screen.getByTestId("path-sheet")).toBeTruthy());
    return screen.getByTestId("path-sheet").textContent;
  };

  it("path sheet crown noun is singular only at 1, in ES and EN", async () => {
    const cases = [
      { n: 0, es: "0 coronas", en: "0 crowns" },
      { n: 1, es: "1 corona", en: "1 crown" },
      { n: 2, es: "2 coronas", en: "2 crowns" },
    ];
    for (const row of cases) {
      cleanup();
      seedProgress({ uiLang: "es", onboardingDone: true, firstSessionDone: true, done: { subj1: row.n } });
      const user = userEvent.setup();
      render(<App />);
      await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
      const esText = await openCrownSheet(user);
      expect(esText).toContain(row.es);
      if (row.n === 1) expect(esText).not.toContain("1 coronas");
      await user.click(screen.getByTestId("lang-en"));
      await waitFor(() => expect(screen.getByTestId("path-sheet").textContent).toContain(row.en));
      if (row.n === 1) expect(screen.getByTestId("path-sheet").textContent).not.toContain("1 crowns");
    }
  }, 15000);

  it("profile streak day noun is singular only at 1, in ES and EN", async () => {
    const cases = [
      { n: 0, es: "días de racha", en: "streak days", esOne: "día de racha", enOne: "streak day" },
      { n: 1, es: "día de racha", en: "streak day", esMany: "días de racha", enMany: "streak days" },
      { n: 2, es: "días de racha", en: "streak days", esOne: "día de racha", enOne: "streak day" },
    ];
    for (const row of cases) {
      cleanup();
      seedProgress({ uiLang: "es", onboardingDone: true, streak: row.n, xp: 10 });
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByTestId("nav-perfil"));
      await waitFor(() => expect(screen.getByText("Tu perfil")).toBeTruthy());
      expect(screen.getByText(row.es)).toBeTruthy();
      if (row.n === 1) expect(screen.queryByText(row.esMany)).toBeNull();
      else expect(screen.queryByText(row.esOne)).toBeNull();
      await user.click(screen.getByTestId("lang-en"));
      await waitFor(() => expect(screen.getByText("Your profile")).toBeTruthy());
      expect(screen.getByText(row.en)).toBeTruthy();
      if (row.n === 1) expect(screen.queryByText(row.enMany)).toBeNull();
      else expect(screen.queryByText(row.enOne)).toBeNull();
    }
  });

  const flashLine = () => screen.getByTestId("flash-session-done").querySelector("p").textContent;

  it("flashcard count noun is singular only at 1, in ES and EN", async () => {
    const card = (word) => ({ word, en: "house", note: "", story: "Cuento", sentence: "Una casa.", due: 0 });
    const spy = vi.spyOn(flashDeck, "buildFlashDeck");
    try {
      cleanup();
      spy.mockReturnValue([]);
      seedProgress({ uiLang: "es", onboardingDone: true, paywallSeen: true, firstSessionDone: true });
      const user0 = userEvent.setup();
      render(<App />);
      await awaitHome();
      await openCaminoMore(user0);
      await user0.click(screen.getByTestId("hub-flashcards"));
      await waitFor(() => expect(screen.getByTestId("flash-session-done")).toBeTruthy());
      expect(flashLine()).toBe("Repasaste 0 tarjetas.");
      await user0.click(screen.getByTestId("lang-en"));
      await waitFor(() => expect(flashLine()).toBe("You reviewed 0 cards."));

      cleanup();
      spy.mockReturnValue([card("casa")]);
      seedProgress({ uiLang: "es", onboardingDone: true, paywallSeen: true, firstSessionDone: true });
      const user1 = userEvent.setup();
      render(<App />);
      await user1.click(screen.getByTestId("nav-practica"));
      await waitFor(() => expect(screen.getByTestId("flash-reveal")).toBeTruthy());
      await user1.click(screen.getByTestId("flash-reveal"));
      await user1.click(screen.getByTestId("flash-easy"));
      await waitFor(() => expect(flashLine()).toBe("Repasaste 1 tarjeta."));
      expect(flashLine()).not.toContain("tarjetas");
      await user1.click(screen.getByTestId("lang-en"));
      await waitFor(() => expect(flashLine()).toBe("You reviewed 1 card."));
      expect(flashLine()).not.toMatch(/\bcards\b/);

      cleanup();
      spy.mockReturnValue([card("casa"), card("mesa")]);
      seedProgress({ uiLang: "es", onboardingDone: true, paywallSeen: true, firstSessionDone: true });
      const user2 = userEvent.setup();
      render(<App />);
      await user2.click(screen.getByTestId("nav-practica"));
      for (let i = 0; i < 2; i++) {
        await waitFor(() => expect(screen.getByTestId("flash-reveal")).toBeTruthy());
        await user2.click(screen.getByTestId("flash-reveal"));
        await user2.click(screen.getByTestId("flash-easy"));
      }
      await waitFor(() => expect(flashLine()).toBe("Repasaste 2 tarjetas."));
      await user2.click(screen.getByTestId("lang-en"));
      await waitFor(() => expect(flashLine()).toBe("You reviewed 2 cards."));
    } finally {
      spy.mockRestore();
    }
  }, 20000);
});
