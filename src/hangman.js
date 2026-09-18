/** Hangman / Ahorcado — Games, next to Cubetas. Soft chrome parked.
 *  Brand CLEAR 2026-09-18 · Teaching CLEAR 2026-09-18
 *  One Cenzontle platform-wide — Hangman never adds a coach/mascot.
 *  Mexicanismos bank. After solve: Literal, then Why.
 */

/** George + No Face CLEAR: language-split title, not a bilingual lockup. */
export const HANGMAN_TITLE = { es: "Ahorcado", en: "Hangman" };
export const HANGMAN_QUIET = { es: "Palabras de México", en: "Mexican words" };
export const HANGMAN_HOWTO = {
  es: "Adivina la palabra. Una letra a la vez.",
  en: "Guess the word. One letter at a time.",
};
export const HANGMAN_WRONG = { es: "Esa no.", en: "Not that one." };
export const HANGMAN_WIN = { es: "¡Eso!", en: "That's it." };
export const HANGMAN_LITERAL_LABEL = { es: "Literal", en: "Literal" };
export const HANGMAN_WHY_LABEL = { es: "Por qué", en: "Why" };

/** Timer parked. Off by default if a clock is ever wired. */
export const HANGMAN_TIMER_DEFAULT = false;
export const HANGMAN_TIMER = {
  es: { on: "Con reloj", off: "Sin reloj" },
  en: { on: "Timer on", off: "No timer" },
};

export const HANGMAN_HUB = "games";
export const HANGMAN_PACK_ID = "mexicanismos-v1";
export const HANGMAN_MAX = 6;
export const HANGMAN_XP = 4;
export const HANGMAN_GEM = 1;

/** Accented vowels match bank spelling. Not Spanish-alphabet letters. */
export const HANGMAN_ACCENTS = ["Á", "É", "Í", "Ó", "Ú", "Ü"];

/** Dead chrome — never titles, never UI. */
export const HANGMAN_DEAD_LABELS = [
  "AHORCADO / HANGMAN",
  "Hanged!",
  "Got it!",
  "¡Lo adivinaste!",
  "leaderboard",
  "tabla de posiciones",
];

/**
 * Word bank v1 — wire exact Teaching CLEAR strings.
 * Hangman-safe: no spaces. Accents count as the letter shown.
 */
export const HANGMAN_BANK = [
  {
    word: "chamba",
    literal: {
      es: "Trabajo / chamba de todos los días",
      en: "Work / a job (everyday)",
    },
    why: {
      es: "En México *chamba* es la forma viva de decir trabajo.",
      en: "In Mexico, *chamba* is the normal word for work — *trabajo* is fine; *chamba* is how people actually say it.",
    },
  },
  {
    word: "neta",
    literal: {
      es: "La verdad / de verdad",
      en: "The truth / for real",
    },
    why: {
      es: "*¿Neta?* pregunta si va en serio.",
      en: "*Neta* = “seriously / for real.” *¿Neta?* checks if someone’s kidding.",
    },
  },
  {
    word: "órale",
    literal: {
      es: "Ándale / de acuerdo / wow",
      en: "Come on / alright / wow",
    },
    why: {
      es: "Sirve para animar, aceptar o sorprenderse, según el tono.",
      en: "Catch-all yes: agree, urge, or surprise — tone does the work.",
    },
  },
  {
    word: "carnal",
    literal: {
      es: "Cuate / hermano (amigo)",
      en: "Buddy / brother (friend)",
    },
    why: {
      es: "Amigo cercano; no siempre es familia.",
      en: "Close friend, not always blood. Warm street register.",
    },
  },
  {
    word: "morra",
    literal: {
      es: "Chava / joven (coloquial)",
      en: "Girl / young woman (casual)",
    },
    why: {
      es: "Así se dice en la calle; *morro* para él.",
      en: "Everyday for a young woman; pair *morro* for a guy.",
    },
  },
  {
    word: "chido",
    literal: {
      es: "Padre / bueno (coloquial)",
      en: "Cool / nice",
    },
    why: {
      es: "El “cool” mexicano de todos los días.",
      en: "Default “cool” in much of Mexico — beats *genial* in casual talk.",
    },
  },
  {
    word: "gacho",
    literal: {
      es: "Feo / malo / pesado",
      en: "Lame / mean / rough",
    },
    why: {
      es: "Algo injusto, desagradable o de mal plan.",
      en: "Bad vibe: unfair, ugly, or unkind depending on context.",
    },
  },
  {
    word: "chafa",
    literal: {
      es: "De mala calidad",
      en: "Cheap / low-quality",
    },
    why: {
      es: "Barato que se nota: se rompe o se ve falso.",
      en: "Stuff that looks fine until it breaks — knockoff energy.",
    },
  },
  {
    word: "bronca",
    literal: {
      es: "Problema / pelea / lío",
      en: "Trouble / a fight / a hassle",
    },
    why: {
      es: "Cuando el problema ya es serio o hay pelea.",
      en: "*Hay bronca* = there’s a problem. Bigger than a small *problema*.",
    },
  },
  {
    word: "onda",
    literal: {
      es: "Rollo / vibra / “qué tal”",
      en: "Vibe / deal / “what’s up”",
    },
    why: {
      es: "*¿Qué onda?* saluda; *buena onda* describe a alguien agradable.",
      en: "*¿Qué onda?* = what’s up. *Buena onda* = good people.",
    },
  },
  {
    word: "chela",
    literal: {
      es: "Cerveza (coloquial)",
      en: "Beer",
    },
    why: {
      es: "Así pides una cerveza entre cuates.",
      en: "The casual beer word — not *cerveza* at the table with friends.",
    },
  },
  {
    word: "antro",
    literal: {
      es: "Club / centro nocturno",
      en: "Club / nightlife spot",
    },
    why: {
      es: "El lugar de la noche; muy de ciudad.",
      en: "Where you go out dancing/drinking — Mexico City register especially.",
    },
  },
  {
    word: "elote",
    literal: {
      es: "Maíz en mazorca (calle)",
      en: "Corn on the cob (street)",
    },
    why: {
      es: "El de puesto: mayonesa, chile, queso.",
      en: "Street-food corn, not just farm corn — butter, mayo, chile, cheese.",
    },
  },
  {
    word: "esquites",
    literal: {
      es: "Maíz en vaso (calle)",
      en: "Corn in a cup (street)",
    },
    why: {
      es: "Como elote, pero en vaso — típico de feria o puesto.",
      en: "Same flavors as elote, served in a cup with a spoon.",
    },
  },
  {
    word: "tianguis",
    literal: {
      es: "Mercado al aire libre",
      en: "Open-air market",
    },
    why: {
      es: "El mercado del barrio; no es un súper.",
      en: "Neighborhood market day — bargaining, produce, clothes, noise.",
    },
  },
  {
    word: "combi",
    literal: {
      es: "Camioneta de ruta",
      en: "Shared van / minibus",
    },
    why: {
      es: "Transporte urbano de ruta fija.",
      en: "City transport: a van on a fixed route. Everyday mobility word.",
    },
  },
  {
    word: "cruda",
    literal: {
      es: "Resaca",
      en: "Hangover",
    },
    why: {
      es: "Lo que sigue a la peda.",
      en: "The morning after. *Ando crudo/a.*",
    },
  },
  {
    word: "chisme",
    literal: {
      es: "Cotilleo / rumor",
      en: "Gossip",
    },
    why: {
      es: "Plática de lo que pasó con fulano.",
      en: "The social sport — *¿Traes chisme?*",
    },
  },
  {
    word: "apapacho",
    literal: {
      es: "Abrazo / mimo / cuidado",
      en: "A warm hug / comfort",
    },
    why: {
      es: "Cariño que consuela — abrazo o gesto tierno.",
      en: "Soft care: hug, spoiling, emotional warmth. Very Mexican affection word.",
    },
  },
  {
    word: "fresa",
    literal: {
      es: "Presumido / de dinero (tipo)",
      en: "Preppy / posh (person)",
    },
    why: {
      es: "Estilo limpio y de zona nice; a veces se usa de burla.",
      en: "Social type: polished, mall, careful Spanish — can tease or sting.",
    },
  },
];

export function hangmanTitle(uiLang) {
  return uiLang === "en" ? HANGMAN_TITLE.en : HANGMAN_TITLE.es;
}

export function hangmanQuiet(uiLang) {
  return uiLang === "en" ? HANGMAN_QUIET.en : HANGMAN_QUIET.es;
}

export function hangmanHowTo(uiLang) {
  return uiLang === "en" ? HANGMAN_HOWTO.en : HANGMAN_HOWTO.es;
}

export function hangmanWrongLine(uiLang) {
  return uiLang === "en" ? HANGMAN_WRONG.en : HANGMAN_WRONG.es;
}

export function hangmanWinLine(uiLang) {
  return uiLang === "en" ? HANGMAN_WIN.en : HANGMAN_WIN.es;
}

export function hangmanLiteralLabel(uiLang) {
  return uiLang === "en" ? HANGMAN_LITERAL_LABEL.en : HANGMAN_LITERAL_LABEL.es;
}

export function hangmanWhyLabel(uiLang) {
  return uiLang === "en" ? HANGMAN_WHY_LABEL.en : HANGMAN_WHY_LABEL.es;
}

export function hangmanTimerLabel(uiLang, on) {
  const row = uiLang === "en" ? HANGMAN_TIMER.en : HANGMAN_TIMER.es;
  return on ? row.on : row.off;
}

export function hangmanKey(ch) {
  return String(ch || "").normalize("NFC").toLocaleUpperCase("es");
}

export function hangmanLetters(word) {
  return [...String(word || "").normalize("NFC")].map(hangmanKey).filter(Boolean);
}

export function hangmanLiteral(entry, uiLang) {
  if (!entry?.literal) return "";
  return uiLang === "en" ? entry.literal.en : entry.literal.es;
}

export function hangmanWhy(entry, uiLang) {
  if (!entry?.why) return "";
  return uiLang === "en" ? entry.why.en : entry.why.es;
}

export function hangmanMisses(run) {
  const letters = run?.letters || [];
  return (run?.guessed || []).filter((g) => !letters.includes(g));
}

export function hangmanSlot(run, index) {
  const ch = run?.letters?.[index];
  if (!ch) return "";
  return (run.guessed || []).includes(ch) ? ch : "";
}

export function isHangmanSolved(run) {
  return run?.status === "win";
}

export function isHangmanLost(run) {
  return run?.status === "lose";
}

export function isHangmanOver(run) {
  return isHangmanSolved(run) || isHangmanLost(run);
}

export function pickHangmanEntry(bank = HANGMAN_BANK, rng = Math.random) {
  if (!bank.length) return null;
  const i = Math.min(bank.length - 1, Math.floor(rng() * bank.length));
  return bank[i];
}

export function startHangmanRun(bank = HANGMAN_BANK, rng = Math.random) {
  const entry = pickHangmanEntry(bank, rng) || HANGMAN_BANK[0];
  return {
    packId: HANGMAN_PACK_ID,
    hub: HANGMAN_HUB,
    word: entry.word,
    letters: hangmanLetters(entry.word),
    literal: entry.literal,
    why: entry.why,
    guessed: [],
    status: "play",
    lastHit: null,
    timerOn: HANGMAN_TIMER_DEFAULT,
    gems: 0,
    xp: 0,
    awarded: false,
  };
}

export function hydrateHangman(raw) {
  if (!raw?.word) return null;
  const entry = HANGMAN_BANK.find((row) => row.word === raw.word) || {
    word: raw.word,
    literal: raw.literal || { es: "", en: raw.hint || "" },
    why: raw.why || { es: "", en: "" },
  };
  const letters = Array.isArray(raw.letters) && raw.letters.length
    ? raw.letters.map(hangmanKey)
    : hangmanLetters(entry.word);
  const guessed = (raw.guessed || []).map(hangmanKey);
  let status = raw.status;
  if (status !== "play" && status !== "win" && status !== "lose") {
    if (raw.done) status = raw.won ? "win" : "lose";
    else status = "play";
  }
  return {
    packId: raw.packId || HANGMAN_PACK_ID,
    hub: raw.hub || HANGMAN_HUB,
    word: entry.word,
    letters,
    literal: entry.literal,
    why: entry.why,
    guessed,
    status,
    lastHit: raw.lastHit ?? null,
    timerOn: HANGMAN_TIMER_DEFAULT,
    gems: raw.gems || 0,
    xp: raw.xp || 0,
    awarded: !!raw.awarded,
  };
}

export function guessHangmanLetter(run, letter) {
  if (!run || run.status !== "play") return run;
  const key = hangmanKey(letter);
  if (!key || (run.guessed || []).includes(key)) return run;
  const guessed = [...(run.guessed || []), key];
  const hit = (run.letters || []).includes(key);
  const allRevealed = (run.letters || []).every((ch) => guessed.includes(ch));
  const misses = guessed.filter((g) => !(run.letters || []).includes(g));
  const dead = misses.length >= HANGMAN_MAX;
  if (allRevealed) {
    return { ...run, guessed, lastHit: true, status: "win" };
  }
  if (dead) {
    return { ...run, guessed, lastHit: false, status: "lose" };
  }
  return { ...run, guessed, lastHit: hit, status: "play" };
}

export function finishHangmanRun(run, won) {
  if (!run || run.awarded) return run;
  if (won) {
    return { ...run, status: "win", awarded: true, xp: HANGMAN_XP, gems: HANGMAN_GEM };
  }
  return { ...run, status: run.status === "lose" ? "lose" : "win", awarded: true, xp: 0, gems: 0 };
}

export function hangmanHasDeadLabel(text) {
  const s = String(text || "");
  return HANGMAN_DEAD_LABELS.some((dead) => s.includes(dead));
}
