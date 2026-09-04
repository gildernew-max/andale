/**
 * Simulated learner flows (issue 5 #4). Not the content-schema lock
 * (src/content.test.js) and not the save/LIVE schema lock (src/schema.test.js).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const seedProgress = (extra = {}) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    welcomed: true,
    xp: 42,
    gems: 9,
    name: "Dave",
    contentVersion: 2,
    hearts: 5,
    done: {},
    ...extra,
  }));
};

const mockBrowser = () => {
  const voices = [];
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => voices,
      speak: () => {},
      cancel: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      onvoiceschanged: null,
    },
  });
  const toneNode = () => ({
    connect() {},
    start() {},
    stop() {},
    frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    detune: { setValueAtTime() {} },
    type: "sine",
  });
  const gainNode = () => ({
    connect() {},
    gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
  });
  window.AudioContext = class {
    constructor() {
      this.state = "running";
      this.currentTime = 0;
      this.destination = {};
      this.sampleRate = 44100;
    }
    createGain() { return gainNode(); }
    createOscillator() { return toneNode(); }
    createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
    createBufferSource() { return { connect() {}, start() {}, stop() {}, buffer: null }; }
    createBiquadFilter() { return { connect() {}, type: "lowpass", frequency: { value: 0 } }; }
    resume() {}
  };
  window.webkitAudioContext = window.AudioContext;
};

const boot = async () => {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
  return user;
};

const continueBtn = () => screen.getByRole("button", { name: /^Continuar$/i });

beforeEach(() => {
  localStorage.clear();
  mockBrowser();
  seedProgress();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("simulated learner flows", () => {
  it("boots Camino, starts subj1, answers one MC, persists andale-v3 without wipe", async () => {
    const user = await boot();
    await user.click(screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user.click(screen.getByRole("button", { name: /Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    await waitFor(() => expect(
      document.querySelector(".choice-card")
      || document.querySelector("input[placeholder]")
      || screen.queryAllByTestId("bank-tile").length,
    ).toBeTruthy());

    // Skip non-MC items (shuffle) until a multiple-choice prompt is up.
    for (let i = 0; i < 12 && !document.querySelector(".choice-card"); i++) {
      const input = document.querySelector("input[placeholder]");
      const tiles = screen.queryAllByTestId("bank-tile");
      if (input) {
        await user.type(input, "x");
        await user.click(screen.getByTestId("lesson-check"));
      } else if (tiles.length) {
        await user.click(tiles[0]);
        await user.click(screen.getByTestId("lesson-check"));
      } else {
        break;
      }
      await user.click(continueBtn());
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
    expect(screen.getByTestId("hero-cta")).toBeTruthy();
    expect(screen.getByTestId("hero-cta").textContent).toMatch(/Jugar la escena|Play the scene|Doctora de frases|Phrase Doctor/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Continue/);

    await user.click(screen.getByTestId("nav-misiones"));
    expect(screen.getByRole("heading", { name: /Misiones/ })).toBeTruthy();

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
    await waitFor(() => expect(screen.getAllByText(/cempasúchil/).length).toBeGreaterThan(0));
    const storyWord = [...document.querySelectorAll("span")].find((el) =>
      el.textContent === "cempasúchil" && el.style.cursor === "pointer");
    expect(storyWord).toBeTruthy();
    await user.click(storyWord);
    await waitFor(() => expect(screen.getByText(/Mexican marigold/i)).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/definición pendiente|definition coming soon/i);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("story-tip").textContent).toMatch(/Read the paragraph\. Tap a word only if it stops you\./));
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
    await waitFor(() => expect(screen.getByText(/¡Hola, Dave!/)).toBeTruthy());
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
    expect(screen.getByText(/TODAY IN MEXICO/)).toBeTruthy();

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
    await waitFor(() => expect(screen.getByText(/TODAY IN MEXICO/)).toBeTruthy());
    await user2.click(screen.getByRole("button", { name: "Subjuntivo presente" }));
    await user2.click(screen.getByRole("button", { name: /Start|Empezar/ }));
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(screen.getByTestId("lang-toggle")).toBeTruthy();
    expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
  });

  it("ES chrome locks Tarjetas and DUELO; Rayo stays ON/OFF", async () => {
    const user = await boot();
    await waitFor(() => expect(screen.getByText(/¡Hola, Dave!/)).toBeTruthy());
    const esGreetings = [
      "Español mexicano real: cuentos, misiones y un empujón que pega.",
      "Luna ya tiene tu rutina de hoy.",
      "Don Rafa te guardó un cuento con palabras que valen.",
      "Valeria dice que la precisión es un gesto de cariño.",
      "Cinco minutos. Español de verdad. Nada de turista.",
    ];
    const enGreetings = [
      "Build real Mexican Spanish through stories, challenges, and sharp feedback.",
      "Luna has your daily routine ready.",
      "Don Rafa saved you a story with words worth keeping.",
      "Valeria says precision is a kindness.",
      "Five minutes. Real Spanish. No tourist mode.",
    ];
    expect(esGreetings.some((g) => document.body.textContent.includes(g))).toBe(true);
    expect(enGreetings.some((g) => document.body.textContent.includes(g))).toBe(false);
    expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy();
    expect(screen.getByText("Coach del día")).toBeTruthy();
    expect(screen.getByText("Mentor de cuentos")).toBeTruthy();
    expect(screen.getByText("Coach de precisión")).toBeTruthy();
    expect(screen.getByText("Rival")).toBeTruthy();

    const rayo = screen.getByRole("button", { name: /Rayo/ });
    expect(rayo.textContent).toMatch(/OFF/);
    expect(rayo.textContent).not.toMatch(/SÍ|NO|ENCENDIDO|APAGADO/);
    expect(document.body.textContent).not.toMatch(/DIÁLOGO DUEL|Flashcards/);

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
    expect(enGreetings.some((g) => document.body.textContent.includes(g))).toBe(true);
    expect(esGreetings.some((g) => document.body.textContent.includes(g))).toBe(false);
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
    await waitFor(() => expect(screen.getByTestId("camino-daily-workout")).toBeTruthy());
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
    await waitFor(() => expect(screen.getByTestId("camino-daily-workout")).toBeTruthy());
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
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lang-toggle")).toBeTruthy());
    expect(screen.getByText("¡ándale!")).toBeTruthy();
    expect(screen.getByTestId("lang-es").textContent).toBe("ES");
    expect(screen.getByTestId("lang-en").textContent).toBe("EN");
    expect([...document.querySelectorAll("button")].filter((b) =>
      b.textContent === "Español" || b.textContent === "English")).toHaveLength(0);
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy());
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("What should we call you?")).toBeTruthy();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").uiLang).toBe("en");
    });
    expect(screen.getByRole("button", { name: /Let's go!/ })).toBeTruthy();
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
    await waitFor(() => expect(screen.getByRole("heading", { name: /Examen no superado|Test not passed/ })).toBeTruthy());
    expect(screen.getByText(/Tres errores|Three mistakes/)).toBeTruthy();
  });

  it("Hoy still matches city/title or the still is dropped", async () => {
    await boot();
    await waitFor(() => expect(screen.getByTestId("hoy-card")).toBeTruthy());
    const city = screen.getByTestId("hoy-city").textContent;
    const title = screen.getByTestId("hoy-title").textContent;
    const still = screen.queryByTestId("hoy-still");
    const lanternCopy = /san miguel/i.test(city) && /farol|lantern/i.test(title);
    if (lanternCopy) {
      expect(still).toBeTruthy();
      expect(still.getAttribute("src")).toMatch(/sma-lanterns/);
    } else {
      expect(still).toBeNull();
    }
    expect(`${city} ${title}`).not.toMatch(/parroquia/i);
  });

  it("buries Principiante, empty weakness map, and Atajos until earned", async () => {
    localStorage.clear();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lang-toggle")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Saltar|Skip/ }));
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.queryByTestId("atajos")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Atajos: 1–4/);
    expect(screen.queryByText("Principiante")).toBeNull();

    await user.click(screen.getByTestId("nav-perfil"));
    expect(screen.queryByTestId("level-theater")).toBeNull();
    expect(screen.queryByText("Principiante")).toBeNull();

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
    expect(screen.getByTestId("atajos").textContent).toMatch(/Atajos: 1–4/);
    await userEvent.setup().click(screen.getByTestId("nav-perfil"));
    expect(screen.getByTestId("level-theater").textContent).toMatch(/Principiante/);
    await userEvent.setup().click(screen.getByTestId("nav-practica"));
    expect(screen.getByTestId("weakness-map")).toBeTruthy();
    expect(screen.getByText("Mapa de debilidades")).toBeTruthy();
  });

  it("Práctica fold leads with Phrase Doctor, Safe-or-Risky, and Emparejar", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-practica"));
    const fold = screen.getByTestId("practica-fold");
    const ids = [...fold.querySelectorAll("[data-testid]")].map((el) => el.getAttribute("data-testid"));
    expect(ids.filter((id) => ["phrase-doctor", "safe-risky-start", "match-pairs-start"].includes(id)))
      .toEqual(["phrase-doctor", "safe-risky-start", "match-pairs-start"]);
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
  });

  it("first-door hero is Hoy or Phrase Doctor, not Subjuntivo Continuar", async () => {
    await boot();
    const hero = screen.getByTestId("hero-cta");
    expect(hero.textContent).toMatch(/Jugar la escena|Play the scene|Doctora de frases|Phrase Doctor/);
    expect(hero.textContent).not.toMatch(/Continuar|Continue|Subjuntivo/);
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy();
    expect(screen.getByTestId("path-entry").textContent).toMatch(/EMPIEZA|START/);
    expect(screen.getByTestId("hoy-card")).toBeTruthy();
    expect(screen.getByTestId("first-door-alt").textContent).toMatch(/Doctora de frases|Phrase Doctor/);
    expect(screen.getByTestId("streak").textContent).toMatch(/0/);
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
  });

  it("first win shows streak 1 and the vuelve mañana home line", async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    cleanup();
    seedProgress({ streak: 0, lastDay: null });
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
        questions: [{
          type: "mc",
          prompt: "Si el taquero pregunta «¿con todo?», normalmente habla de:",
          choices: ["cilantro, cebolla, salsa y guarnición"],
          answer: "cilantro, cebolla, salsa y guarnición",
          shuffledChoices: ["cilantro, cebolla, salsa y guarnición"],
          _u: "_today",
          _i: -1,
        }],
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
    await waitFor(() => {
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.streak).toBe(1);
      expect(prog.lastDay).toBe(today);
      expect(prog.missions[`scene-${today}`]).toBe("taqueria");
    });
    await user.click(screen.getByRole("button", { name: /^Continuar$/i }));
    await waitFor(() => expect(screen.getByTestId("hero-cta")).toBeTruthy());
    expect(screen.getByTestId("streak").textContent.trim()).toMatch(/^1/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe("vuelve mañana por la siguiente escena");
    expect(screen.getByTestId("hero-cta").textContent).toMatch(/Doctora de frases|Phrase Doctor/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Subjuntivo/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow").textContent).toBe("Come back tomorrow for the next scene"));
  });
});
