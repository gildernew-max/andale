/**
 * Simulated learner flows (issue 5 #4). Not the content-schema lock
 * (src/content.test.js) and not the save/LIVE schema lock (src/schema.test.js).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { comeBackTomorrowLine, dayKeyFromDate, hoySceneForDay, hoyTitleForLang, nextDayKey } from "./firstDoor.js";

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

const localToday = () => dayKeyFromDate(new Date());

/** Same four Hoy titles, same day-hash as App TODAY_SCENES. Do not invent names. */
const HOY_TITLES = [
  { title: "Noche de faroles", titleEn: "Night of lanterns" },
  { title: "WhatsApp del casero", titleEn: "Landlord WhatsApp" },
  { title: "Mostrador en caos", titleEn: "Airport Counter Chaos" },
  { title: "Cena con la suegra", titleEn: "Dinner With the In-Laws" },
];

const expectedComeBack = (lang) => {
  const next = hoySceneForDay(HOY_TITLES, nextDayKey(localToday()));
  return comeBackTomorrowLine({ lang, nextTitle: hoyTitleForLang(next, lang) });
};

const openCaminoMore = async (user) => {
  const more = screen.getByTestId("camino-more");
  if (more.getAttribute("aria-expanded") !== "true") await user.click(more);
  await waitFor(() => expect(screen.getByTestId("camino-more-panel")).toBeTruthy());
};

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
    expect(screen.getByTestId("hero-cta").textContent).toMatch(/Jugar la escena|Play the scene|Arreglar una frase|Fix a phrase/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Continue|Subjuntivo/);

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
    expect(screen.getByRole("button", { name: "Pretérito vs. imperfecto (bloqueado)" })).toBeTruthy();
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
    await waitFor(() => expect(screen.getByText(/TODAY IN MEXICO/)).toBeTruthy());
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
    expect(screen.getByPlaceholderText("What do they call you?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start!" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("¿Cómo te dicen?")).toBeTruthy();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").uiLang).toBe("es");
    });
    expect(screen.getByRole("button", { name: "¡Empezar!" })).toBeTruthy();
  });

  it("splash locks exact line + one primary CTA, no equal Saltar, axolotl hero", async () => {
    localStorage.clear();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    expect(screen.getByTestId("splash-line").textContent).toBe("Real Mexican Spanish. Past the basics.");
    expect(screen.getByTestId("splash-start").textContent).toBe("Start!");
    expect(screen.queryByTestId("splash-skip")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
    expect(screen.getByTestId("splash-actions").querySelectorAll("button")).toHaveLength(1);
    expect(screen.getByTestId("splash-actions").textContent.trim()).toBe("Start!");
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Start! ?Skip/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/\bSkip\b/);
    expect(screen.getByTestId("splash-hero").getAttribute("src")).toMatch(/mascot\/axolotl\.png/);
    expect(screen.getByTestId("splash").querySelector("img[src*='sma-']")).toBeNull();
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Subjuntivo/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Orden distinto|Different order, same meaning/);
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
    expect(screen.queryByRole("button", { name: /Let's go!/ })).toBeNull();

    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("splash-line").textContent).toBe("Español mexicano real. Más allá de lo básico."));
    expect(screen.getByTestId("splash-start").textContent).toBe("¡Empezar!");
    expect(screen.queryByTestId("splash-skip")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
    expect(screen.getByTestId("splash-actions").querySelectorAll("button")).toHaveLength(1);
    expect(screen.getByTestId("splash-actions").textContent.trim()).toBe("¡Empezar!");
    expect(screen.getByTestId("splash").textContent).not.toMatch(/¡Empezar! ?Saltar/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Saltar/);
    expect(screen.getByTestId("splash-hero").getAttribute("src")).toMatch(/mascot\/axolotl\.png/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Subjuntivo/);
    expect(screen.getByTestId("splash").textContent).not.toMatch(/Orden distinto|Different order, same meaning/);
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
  });

  it("first boot with empty storage always shows splash Start after hydrate", async () => {
    localStorage.clear();
    mockBrowser();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("splash-start").textContent).toBe("Start!"));
    expect(screen.getByTestId("splash-line").textContent).toBe("Real Mexican Spanish. Past the basics.");
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
    expect(screen.getByTestId("splash-actions").querySelectorAll("button")).toHaveLength(1);
    // Async load + persist must not dismiss splash on a true first visit.
    await waitFor(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        expect(saved.welcomed).toBeFalsy();
        expect(saved.xp > 0).toBeFalsy();
        expect(saved.uiLang).toBe("en");
      }
      expect(screen.getByTestId("splash")).toBeTruthy();
      expect(screen.getByTestId("splash-start").textContent).toBe("Start!");
    });
    expect(screen.queryByTestId("nav-camino")).toBeTruthy();
    expect(screen.queryByTestId("home-pitch")).toBeTruthy();
    expect(screen.getByTestId("splash")).toBeTruthy();
  });

  it("leftover LIVE lesson does not skip first-visit splash", async () => {
    localStorage.clear();
    mockBrowser();
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
    expect(screen.getByTestId("splash-line").textContent).toBe("Real Mexican Spanish. Past the basics.");
    expect(screen.getByTestId("splash-start").textContent).toBe("Start!");
    expect(screen.queryByTestId("lesson-exit")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Saltar$|^Skip$/ })).toBeNull();
  });

  it("Camino home pitch is the splash short lock — long blob gone", async () => {
    const user = await boot();
    await waitFor(() => expect(screen.getByTestId("home-pitch")).toBeTruthy());
    expect(screen.getByTestId("home-pitch").textContent).toBe("Español mexicano real. Más allá de lo básico.");
    expect(document.body.textContent).not.toMatch(/para quien ya pasó lo básico/);
    expect(document.body.textContent).not.toMatch(/cuentos, misiones, tarjetas y cuatro coaches/);
    expect(document.body.textContent).not.toMatch(/for people past the basics/);
    expect(document.body.textContent).not.toMatch(/stories, challenges, flashcards, and four coaches/);

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("home-pitch").textContent).toBe("Real Mexican Spanish. Past the basics."));
    expect(document.body.textContent).not.toMatch(/para quien ya pasó lo básico/);
    expect(document.body.textContent).not.toMatch(/for people past the basics/);
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

  it("buries empty level theater, weakness map, and Atajos until earned", async () => {
    localStorage.clear();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lang-toggle")).toBeTruthy());
    await user.click(screen.getByTestId("splash-start"));
    await waitFor(() => expect(screen.getByTestId("nav-camino")).toBeTruthy());
    expect(screen.queryByTestId("atajos")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Atajos: 1–4/);
    expect(screen.queryByText("Principiante")).toBeNull();
    expect(screen.queryByText("Intermedio")).toBeNull();
    expect(screen.queryByText("Intermediate")).toBeNull();

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
    expect(screen.getByTestId("atajos").textContent).toMatch(/Atajos: 1–4/);
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
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    expect(screen.getByTestId("lang-en").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("lang-es").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("splash-line").textContent).toBe("Real Mexican Spanish. Past the basics.");
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

  it("Lectura narration chrome is NARRACIÓN / NARRATION, not LAB", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("narration-label")).toBeTruthy());
    expect(screen.getByTestId("narration-label").textContent).toBe("NARRACIÓN");
    expect(screen.getByTestId("narration-label").textContent).not.toMatch(/LAB/);
    expect(document.body.textContent).not.toMatch(/LAB DE NARRACIÓN|NARRATION LAB/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("narration-label").textContent).toBe("NARRATION"));
    expect(screen.getByTestId("narration-label").textContent).not.toMatch(/LAB/);
    expect(document.body.textContent).not.toMatch(/LAB DE NARRACIÓN|NARRATION LAB/);
  });

  it("first-door hero is Hoy or Phrase Doctor, not Subjuntivo Continuar", async () => {
    const user = await boot();
    const hero = screen.getByTestId("hero-cta");
    expect(hero.textContent).toMatch(/Jugar la escena/);
    expect(hero.textContent).not.toMatch(/Continuar|Continue|Subjuntivo|Phrase Doctor/);
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Subjuntivo presente" })).toBeTruthy();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    await openCaminoMore(user);
    expect(screen.getByTestId("path-entry").textContent).toMatch(/EMPIEZA|START/);
    expect(screen.getByTestId("hoy-card")).toBeTruthy();
    expect(screen.getByTestId("first-door-alt").textContent).toBe("Arreglar una frase");
    expect(screen.getByTestId("first-door-alt").textContent).not.toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("streak").textContent).toMatch(/0/);
    expect(screen.queryByTestId("come-back-tomorrow")).toBeNull();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("hero-cta").textContent).toMatch(/Play the scene/));
    expect(screen.getByTestId("first-door-alt").textContent).toBe("Fix a phrase");
  });

  it("cold open / streak 0 hides Meta, Rayo OFF, and the four-coach strip", async () => {
    cleanup();
    localStorage.clear();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash-start")).toBeTruthy());
    await user.click(screen.getByTestId("splash-start"));
    await waitFor(() => expect(screen.getByTestId("home-pitch")).toBeTruthy());
    expect(screen.getByTestId("hoy-card")).toBeTruthy();
    expect(screen.getByTestId("first-door-alt")).toBeTruthy();
    expect(screen.getByTestId("camino-more")).toBeTruthy();
    expect(screen.queryByTestId("door-meta")).toBeNull();
    expect(screen.queryByTestId("rayo-toggle")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    expect(screen.queryByRole("button", { name: /Rayo|Lightning/ })).toBeNull();
    expect(screen.queryByText(/Meta:|Goal:/)).toBeNull();
    expect(screen.queryByText("Coach del día")).toBeNull();
    expect(screen.queryByText("Daily coach")).toBeNull();
    expect(screen.getByTestId("streak").textContent).toMatch(/0/);

    cleanup();
    seedProgress({ streak: 0, lastDay: null });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("home-pitch")).toBeTruthy());
    expect(screen.getByTestId("hoy-card")).toBeTruthy();
    expect(screen.getByTestId("first-door-alt")).toBeTruthy();
    expect(screen.getByTestId("camino-more")).toBeTruthy();
    expect(screen.queryByTestId("door-meta")).toBeNull();
    expect(screen.queryByTestId("rayo-toggle")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
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
    expect(screen.getByText("Coach del día")).toBeTruthy();
    expect(screen.getByText("Mentor de cuentos")).toBeTruthy();
    expect(screen.getByText("Coach de precisión")).toBeTruthy();
    expect(screen.getByText("Rival")).toBeTruthy();
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("home-pitch")).toBeTruthy();
    expect(screen.getByTestId("hoy-card")).toBeTruthy();
    expect(screen.getByTestId("first-door-alt")).toBeTruthy();
    expect(screen.getByTestId("camino-more")).toBeTruthy();
  });

  it("Hoy + Doctora door buries EMPIEZA / Repasar / Rutina diaria under quiet Más / More", async () => {
    cleanup();
    seedProgress({
      srs: { "subj1|0": { ef: 2.5, reps: 1, interval: 1, due: Date.now() - 1000 } },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hero-cta")).toBeTruthy());
    expect(screen.getByTestId("hero-cta").textContent).toMatch(/Jugar la escena/);
    expect(screen.getByTestId("first-door-alt").textContent).toBe("Arreglar una frase");
    expect(screen.getByTestId("nav-camino").textContent).toBe("Camino");
    expect(screen.getByTestId("camino-more").textContent).toBe("Más");
    expect(screen.getByTestId("camino-more").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("camino-more-panel")).toBeNull();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    expect(screen.queryByTestId("camino-review")).toBeNull();
    expect(screen.queryByTestId("camino-daily-workout")).toBeNull();
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
    expect(screen.getByTestId("nav-camino").textContent).toBe("Camino");
    expect(screen.getByTestId("camino-more").textContent).toBe("Más");

    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("camino-more").textContent).toBe("More"));
    expect(screen.getByTestId("path-entry").textContent).toBe("START");
    expect(screen.getByTestId("camino-review").textContent).toMatch(/Review/);
    expect(screen.getByTestId("camino-daily-workout").textContent).toMatch(/Daily routine/);
    expect(screen.getByTestId("nav-camino").textContent).toBe("Learn");
    expect(screen.getByTestId("camino-more").textContent).not.toMatch(/Más opciones|See more|More options/);
  });

  it("Doctora hero still buries path CTAs under Más; life door stays first", async () => {
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
    await waitFor(() => expect(screen.getByTestId("hero-cta")).toBeTruthy());
    expect(screen.getByTestId("first-door-title").textContent).toBe("Doctora de frases");
    expect(screen.getByTestId("hero-cta").textContent).toMatch(/Arreglar una frase/);
    expect(screen.getByTestId("hoy-card")).toBeTruthy();
    expect(screen.getByTestId("camino-more").textContent).toBe("Más");
    expect(screen.queryByTestId("path-entry")).toBeNull();
    expect(screen.queryByTestId("camino-daily-workout")).toBeNull();
    await user.click(screen.getByTestId("camino-more"));
    await waitFor(() => expect(screen.getByTestId("path-entry").textContent).toBe("EMPIEZA"));
    expect(screen.getByTestId("camino-daily-workout").textContent).toMatch(/Rutina diaria/);
  });

  it("name field warm line is ¿Cómo te dicen? / What do they call you?", async () => {
    localStorage.clear();
    mockBrowser();
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("splash")).toBeTruthy());
    expect(screen.getByPlaceholderText("What do they call you?")).toBeTruthy();
    expect(screen.queryByPlaceholderText("What should we call you?")).toBeNull();
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByPlaceholderText("¿Cómo te dicen?")).toBeTruthy());
    expect(screen.queryByPlaceholderText("¿Cómo te llamamos?")).toBeNull();
  });

  it("landlord Hoy scene keeps title and uses locked casero copy", async () => {
    const user = await boot();
    const title = screen.getByTestId("hoy-title").textContent;
    if (title === "WhatsApp del casero") {
      expect(screen.getByTestId("hoy-card").textContent).toMatch(/El casero pide depósito y aval hoy\. Contéstale sin sonar de manual\./);
      expect(screen.getByTestId("hoy-card").textContent).not.toMatch(/Te piden depósito, aval y contrato hoy/);
      await user.click(screen.getByTestId("lang-en"));
      await waitFor(() => expect(screen.getByTestId("hoy-title").textContent).toBe("Landlord WhatsApp"));
      expect(screen.getByTestId("hoy-card").textContent).toMatch(/Landlord wants deposit and guarantor today\. Answer without sounding like a textbook\./);
    } else {
      const landlord = HOY_TITLES.find((s) => s.title === "WhatsApp del casero");
      expect(landlord.titleEn).toBe("Landlord WhatsApp");
    }
  });

  it("return door with streak ≥ 1: Hoy CTA if scene open, Doctora if Hoy done — never Subjuntivo Continuar", async () => {
    const today = localToday();
    cleanup();
    seedProgress({ streak: 1, lastDay: today, paywallSeen: true });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hero-cta")).toBeTruthy());
    expect(screen.getByTestId("hero-cta").textContent).toMatch(/Jugar la escena/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Continue|Subjuntivo|Phrase Doctor|Arreglar una frase/);
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    await openCaminoMore(userEvent.setup());
    expect(screen.getByTestId("path-entry").textContent).toMatch(/EMPIEZA|START/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/«.+»/);

    cleanup();
    seedProgress({
      streak: 1,
      lastDay: today,
      paywallSeen: true,
      missions: { [`scene-${today}`]: "taqueria" },
    });
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hero-cta")).toBeTruthy());
    expect(screen.getByTestId("first-door-tag").textContent).toBe("GANA EN 60 SEGUNDOS");
    expect(screen.getByTestId("first-door-title").textContent).toBe("Doctora de frases");
    expect(screen.getByTestId("hero-cta").textContent).toMatch(/Arreglar una frase/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Continue|Subjuntivo|Phrase Doctor|Jugar la escena/);
    expect(screen.queryByRole("button", { name: /^Continuar$/i })).toBeNull();
    expect(screen.queryByTestId("path-entry")).toBeNull();
    await openCaminoMore(userEvent.setup());
    expect(screen.getByTestId("path-entry").textContent).toMatch(/EMPIEZA|START/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
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
    expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es"));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Vuelve mañana por «.+»\.$/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).not.toBe("Vuelve mañana por la siguiente escena.");
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Ya empezó tu racha.");
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);
    expect(screen.getByTestId("first-door-tag").textContent).toBe("GANA EN 60 SEGUNDOS");
    expect(screen.getByTestId("first-door-title").textContent).toBe("Doctora de frases");
    expect(screen.getByTestId("door-meta").textContent).toMatch(/Meta:\s*\d+\/40/);
    expect(screen.getByTestId("rayo-toggle")).toBeTruthy();
    expect(screen.getByTestId("coach-strip")).toBeTruthy();
    expect(screen.getByTestId("hero-cta").textContent).toMatch(/Arreglar una frase/);
    expect(screen.getByTestId("first-door-hero").textContent).not.toMatch(/Phrase Doctor/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Subjuntivo|Phrase Doctor/);
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("en")));
    expect(screen.getByTestId("come-back-tomorrow").textContent).toMatch(/^Come back tomorrow for “.+”\.$/);
    expect(screen.getByTestId("come-back-tomorrow").textContent).not.toBe("Come back tomorrow for the next scene.");
    expect(screen.getByTestId("first-door-tag").textContent).toBe("WIN IN 60 SECONDS");
    expect(screen.getByTestId("first-door-title").textContent).toBe("Phrase Doctor");
    expect(screen.getByTestId("hero-cta").textContent).toMatch(/Fix a phrase/);
  });

  it("soft paywall does not render on splash or boot before a win", async () => {
    cleanup();
    localStorage.clear();
    render(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: /¡Empezar!|Start!/ })).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.queryByTestId("word-order-tip")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Ya empezó tu racha|Your streak just started/);
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
    await waitFor(() => {
      const prog = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(prog.streak).toBe(1);
      expect(prog.lastDay).toBe(today);
    });
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Ya empezó tu racha.");
    expect(screen.getByTestId("soft-paywall-body").textContent).toBe("Camino completo: escenas, Doctora de frases, cuentos. Mexicano real, más allá de lo básico.");
    expect(screen.getByTestId("soft-paywall-annual").textContent).toBe("$39.99 al año");
    expect(screen.getByTestId("soft-paywall-monthly").textContent).toBe("$6.99 al mes");
    expect(screen.getByTestId("soft-paywall-honesty").textContent).toBe("Práctica · sin cobro todavía");
    expect(screen.getByTestId("soft-paywall-dismiss").textContent).toBe("Seguir gratis por ahora");
    expect(screen.getByTestId("soft-paywall").textContent).not.toMatch(/Orden distinto, mismo sentido|Different order, same meaning/);
    expect(screen.getByTestId("soft-paywall").querySelector("[data-testid=\"word-order-tip\"]")).toBeNull();

    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).paywallSeen).toBe(true);

    await user.click(screen.getByTestId("nav-camino"));
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("es")));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("hero-cta")).toBeTruthy();
    expect(screen.getByTestId("hero-cta").textContent).toMatch(/Jugar la escena/);
    expect(screen.getByTestId("hero-cta").textContent).not.toMatch(/Continuar|Subjuntivo/);
    expect(screen.getByTestId("first-door-alt").textContent).toBe("Arreglar una frase");

    cleanup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow")).toBeTruthy());
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
  });

  it("soft paywall EN strings after first-win state; annual CTA is local-only", async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    cleanup();
    seedProgress({ uiLang: "en", streak: 1, lastDay: today });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("come-back-tomorrow").textContent).toBe(expectedComeBack("en")));
    await waitFor(() => expect(screen.getByTestId("soft-paywall")).toBeTruthy());
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Your streak just started.");
    expect(screen.getByTestId("soft-paywall-body").textContent).toBe("Full path: scenes, Phrase Doctor, stories. Real Mexican Spanish past the basics.");
    expect(screen.getByTestId("soft-paywall-annual").textContent).toBe("$39.99 / year");
    expect(screen.getByTestId("soft-paywall-monthly").textContent).toBe("$6.99 / month");
    expect(screen.getByTestId("soft-paywall-honesty").textContent).toBe("Practice · no charge yet");
    expect(screen.getByTestId("soft-paywall-dismiss").textContent).toBe("Continue free for now");

    await user.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.paywallSeen).toBe(true);
    expect(stored.paywallPlan).toBe("annual");
    expect(stored.unlockedPrem).toBe(true);
    expect(screen.getByTestId("come-back-tomorrow")).toBeTruthy();
    expect(screen.getByTestId("hero-cta")).toBeTruthy();
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
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Listen" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Listen" }).getAttribute("aria-label")).toBe("Listen");
    expect(screen.getByRole("button", { name: "Slower" }).getAttribute("aria-label")).toBe("Slower");
    expect(screen.queryByRole("button", { name: "Escuchar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Más lento" })).toBeNull();
  });

  it("story listen and nav aria follow uiLang", async () => {
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const openers = screen.getAllByRole("button", { name: /La noche en que vuelven/ });
    await user.click(openers[openers.length - 1]);
    await waitFor(() => expect(screen.getByTestId("story-tip")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Párrafo 1" }).getAttribute("aria-label")).toBe("Párrafo 1");
    expect(screen.getByRole("button", { name: "Preguntas" }).getAttribute("aria-label")).toBe("Preguntas");
    expect(screen.getByRole("button", { name: "Escuchar párrafo" }).getAttribute("aria-label")).toBe("Escuchar párrafo");
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
    expect(screen.getByRole("button", { name: "Listen to paragraph" }).getAttribute("aria-label")).toBe("Listen to paragraph");
    expect(screen.getByRole("button", { name: "Listen to word" }).getAttribute("aria-label")).toBe("Listen to word");
    expect(screen.queryByRole("button", { name: "Párrafo 1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Escuchar párrafo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Escuchar palabra" })).toBeNull();
  });
});
