/**
 * Zero-start first session for the beginner level only.
 * Same five-beat shape as the existing first session: mc, type, order, mc, type.
 * Multiple-choice stays in the authored order. The other levels keep subj1.
 */

import { gradeListedPhrase, stripPhrase } from "./wordOrder.js";

export const BEGINNER_SESSION_TITLE = Object.freeze({
  en: "First lesson",
  es: "Primera lección",
});

export const BEGINNER_WIN = Object.freeze({
  en: "First lesson done. You have your first words to say hello, order a coffee and ask the price. Come back tomorrow for the next one.",
  es: "Primera lección lista. Ya tienes tus primeras palabras para saludar, pedir un café y preguntar el precio. Mañana seguimos con la siguiente.",
});

export const BEGINNER_FIRST_SESSION = Object.freeze([
  Object.freeze({
    type: "mc",
    fixedChoices: true,
    prompt: Object.freeze({
      en: `Which one means "good morning"?`,
      es: `¿Cuál es "good morning" en español?`,
    }),
    choices: Object.freeze(["Buenas noches", "Buenos días", "Hasta luego", "Con permiso"]),
    answer: "Buenos días",
    why: Object.freeze({
      en: `"Buenos días" is what you say in the morning, until about midday. "Buenas noches" is for the night.`,
      es: "«Buenos días» se dice en la mañana, hasta casi el mediodía. «Buenas noches» es para la noche.",
    }),
  }),
  Object.freeze({
    type: "type",
    prompt: Object.freeze({ en: "Mucho ___.", es: "Mucho ___." }),
    note: Object.freeze({ en: "(nice to meet you)", es: "(encantado de conocerte)" }),
    answers: Object.freeze(["gusto"]),
    why: Object.freeze({
      en: `"Mucho gusto" is what you say when you meet someone.`,
      es: "«Mucho gusto» se dice al conocer a alguien.",
    }),
  }),
  Object.freeze({
    type: "order",
    prompt: Object.freeze({
      en: `Build: "A coffee, please."`,
      es: `Construye: "A coffee, please."`,
    }),
    words: Object.freeze(["Un", "café,", "por", "favor", "una", "de"]),
    answer: "Un café, por favor",
    why: Object.freeze({
      en: `To order, say what you want, then "por favor."`,
      es: "Para pedir, di lo que quieres y luego «por favor».",
    }),
  }),
  Object.freeze({
    type: "mc",
    fixedChoices: true,
    prompt: Object.freeze({
      en: `How do you ask "How much is it?"`,
      es: `¿Cómo se pregunta "How much is it?"`,
    }),
    choices: Object.freeze(["¿Dónde está?", "¿Cómo estás?", "¿Qué hora es?", "¿Cuánto cuesta?"]),
    answer: "¿Cuánto cuesta?",
    why: Object.freeze({
      en: `"¿Cuánto cuesta?" asks the price. "¿Dónde está?" asks where something is.`,
      es: "«¿Cuánto cuesta?» pregunta el precio. «¿Dónde está?» pregunta dónde queda algo.",
    }),
  }),
  Object.freeze({
    type: "type",
    prompt: Object.freeze({ en: "¿Cómo te ___?", es: "¿Cómo te ___?" }),
    note: Object.freeze({ en: "(What's your name?)", es: "(¿Cuál es tu nombre?)" }),
    answers: Object.freeze(["llamas"]),
    why: Object.freeze({
      en: `"¿Cómo te llamas?" asks someone's name. It literally means "what do you call yourself?"`,
      es: "«¿Cómo te llamas?» pregunta el nombre de alguien. Se usa «llamas» con tú.",
    }),
  }),
]);

function filled(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function beginnerFace(value, lang) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const text = lang === "en" ? value.en : value.es;
  return typeof text === "string" ? text : "";
}

export function beginnerWhyLine(beat, lang) {
  const slot = BEGINNER_FIRST_SESSION[beat]?.why;
  if (!slot) return null;
  return filled(lang === "en" ? slot.en : slot.es);
}

export function beginnerWinLine(lang) {
  return filled(lang === "en" ? BEGINNER_WIN.en : BEGINNER_WIN.es);
}

/** Fresh question objects for the existing first-session prep (shuffle, chips, XP). */
export function beginnerFirstQuestions() {
  return BEGINNER_FIRST_SESSION.map((q, i) => ({
    type: q.type,
    prompt: q.prompt,
    note: q.note,
    choices: q.choices ? [...q.choices] : undefined,
    words: q.words ? [...q.words] : undefined,
    answers: q.answers ? [...q.answers] : undefined,
    answer: q.answer,
    explain: q.why,
    fixedChoices: q.type === "mc",
    _u: "_beginner",
    _i: i,
  }));
}

/**
 * Same accept/reject the lesson uses.
 * Multiple choice is an exact choice string.
 * Type and order go through gradeListedPhrase (case and surrounding spaces).
 * Order also requires the authored token sequence, so another tile arrangement fails.
 */
export function acceptBeginnerAnswer(q, given) {
  if (!q || given == null) return false;
  if (q.type === "mc") return given === q.answer;
  if (q.type === "type") {
    const graded = gradeListedPhrase(given, q);
    return graded.status === "correct" || graded.status === "equivalent";
  }
  if (q.type === "order") {
    const graded = gradeListedPhrase(given, q);
    if (graded.status !== "correct" && graded.status !== "equivalent") return false;
    return stripPhrase(given) === stripPhrase(q.answer);
  }
  return false;
}
