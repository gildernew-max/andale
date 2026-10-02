import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  BEGINNER_FIRST_SESSION,
  BEGINNER_WIN,
  acceptBeginnerAnswer,
  beginnerFace,
  beginnerFirstQuestions,
  beginnerWhyLine,
  beginnerWinLine,
} from "./beginnerFirstSession.js";
import { lessonListenText } from "./prepQuestion.js";
import { gradeListedPhrase } from "./wordOrder.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const dir = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(dir, name), "utf8");
const appSrc = read("App.jsx");
const gateSrc = read("onboarding.js");
const beginnerSrc = read("beginnerFirstSession.js");

const EX1_WHY_EN = `"Buenos días" is what you say in the morning, until about midday. "Buenas noches" is for the night.`;
const EX1_WHY_ES = "«Buenos días» se dice en la mañana, hasta casi el mediodía. «Buenas noches» es para la noche.";
const EX2_WHY_EN = `"Mucho gusto" is what you say when you meet someone.`;
const EX2_WHY_ES = "«Mucho gusto» se dice al conocer a alguien.";
const EX3_WHY_EN = `To order, say what you want, then "por favor."`;
const EX3_WHY_ES = "Para pedir, di lo que quieres y luego «por favor».";
const EX4_WHY_EN = `"¿Cuánto cuesta?" asks the price. "¿Dónde está?" asks where something is.`;
const EX4_WHY_ES = "«¿Cuánto cuesta?» pregunta el precio. «¿Dónde está?» pregunta dónde queda algo.";
const EX5_WHY_EN = `"¿Cómo te llamas?" asks someone's name. It literally means "what do you call yourself?"`;
const EX5_WHY_ES = "«¿Cómo te llamas?» pregunta el nombre de alguien. Se usa «llamas» con tú.";
const WIN_EN = "First lesson done. You have your first words to say hello, order a coffee and ask the price. Come back tomorrow for the next one.";
const WIN_ES = "Primera lección lista. Ya tienes tus primeras palabras para saludar, pedir un café y preguntar el precio. Mañana seguimos con la siguiente.";

const expected = [
  {
    type: "mc",
    prompt: { en: `Which one means "good morning"?`, es: `¿Cuál es "good morning" en español?` },
    choices: ["Buenas noches", "Buenos días", "Hasta luego", "Con permiso"],
    answer: "Buenos días",
    why: { en: EX1_WHY_EN, es: EX1_WHY_ES },
  },
  {
    type: "type",
    prompt: { en: "Mucho ___.", es: "Mucho ___." },
    note: { en: "(nice to meet you)", es: "(encantado de conocerte)" },
    answers: ["gusto"],
    why: { en: EX2_WHY_EN, es: EX2_WHY_ES },
  },
  {
    type: "order",
    prompt: { en: `Build: "A coffee, please."`, es: `Construye: "A coffee, please."` },
    words: ["Un", "café,", "por", "favor", "una", "de"],
    answer: "Un café, por favor",
    why: { en: EX3_WHY_EN, es: EX3_WHY_ES },
  },
  {
    type: "mc",
    prompt: { en: `How do you ask "How much is it?"`, es: `¿Cómo se pregunta "How much is it?"` },
    choices: ["¿Dónde está?", "¿Cómo estás?", "¿Qué hora es?", "¿Cuánto cuesta?"],
    answer: "¿Cuánto cuesta?",
    why: { en: EX4_WHY_EN, es: EX4_WHY_ES },
  },
  {
    type: "type",
    prompt: { en: "¿Cómo te ___?", es: "¿Cómo te ___?" },
    note: { en: "(What's your name?)", es: "(¿Cuál es tu nombre?)" },
    answers: ["llamas"],
    why: { en: EX5_WHY_EN, es: EX5_WHY_ES },
  },
];

assert(BEGINNER_FIRST_SESSION.length === 5, "beginner session is 5 exercises");
assert(BEGINNER_FIRST_SESSION.map((q) => q.type).join(",") === "mc,type,order,mc,type", "order is mc, type, order, mc, type");

for (let i = 0; i < expected.length; i++) {
  const q = BEGINNER_FIRST_SESSION[i];
  const want = expected[i];
  assert(q.type === want.type, `beat ${i} type`);
  assert(beginnerFace(q.prompt, "en") === want.prompt.en, `beat ${i} EN prompt`);
  assert(beginnerFace(q.prompt, "es") === want.prompt.es, `beat ${i} ES prompt`);
  assert(q.why.en === want.why.en && q.why.es === want.why.es, `beat ${i} why`);
  assert(beginnerWhyLine(i, "en") === want.why.en && beginnerWhyLine(i, "es") === want.why.es, `beat ${i} why helper`);
  if (want.note) {
    assert(beginnerFace(q.note, "en") === want.note.en && beginnerFace(q.note, "es") === want.note.es, `beat ${i} note`);
  }
  if (want.choices) {
    assert(JSON.stringify(q.choices) === JSON.stringify(want.choices), `beat ${i} choice order`);
    assert(q.fixedChoices === true, `beat ${i} choices stay in authored order`);
  }
  if (want.words) assert(JSON.stringify(q.words) === JSON.stringify(want.words), `beat ${i} word bank`);
  if (want.answers) assert(JSON.stringify(q.answers) === JSON.stringify(want.answers), `beat ${i} accepted answers`);
  if (want.answer) assert(q.answer === want.answer, `beat ${i} answer`);
  for (const text of [want.prompt.en, want.prompt.es, want.why.en, want.why.es, want.note?.en, want.note?.es, want.answer]) {
    if (!text) continue;
    assert(beginnerSrc.includes(text), `beat ${i} string lives in beginnerFirstSession.js`);
  }
}

assert(BEGINNER_WIN.en === WIN_EN && BEGINNER_WIN.es === WIN_ES, "beginner win lines");
assert(beginnerWinLine("en") === WIN_EN && beginnerWinLine("es") === WIN_ES, "win helper");
assert(!EX2_WHY_EN.includes("much pleasure") && !EX2_WHY_ES.includes("mucho placer"), "the pleasure sentence is gone");
assert(!EX1_WHY_ES.includes("por la mañana"), "exercise 1 Spanish why says en la mañana");
assert(!WIN_EN.includes("ask a price") && !WIN_ES.includes("un precio") && !WIN_ES.includes("Mañana sigue la siguiente"), "old win wording is gone");

const ex4 = BEGINNER_FIRST_SESSION[3];
assert(!ex4.choices.includes("¿Cómo te llamas?"), "exercise 4 does not give away exercise 5");
assert(ex4.choices.includes("¿Cómo estás?"), "exercise 4 asks cómo estás");
const ex3 = BEGINNER_FIRST_SESSION[2];
assert(!ex3.words.includes("quiero") && ex3.words.includes("de"), "quiero is out and de is in the bank");
assert(["Un", "café,", "por", "favor"].join(" ") === ex3.answer, "the authored tiles join to the answer");

const questions = beginnerFirstQuestions();
assert(questions.map((q) => q.type).join(",") === "mc,type,order,mc,type", "prepped list keeps the order");
assert(questions.every((q, i) => q._u === "_beginner" && q._i === i), "beginner beats are not subj1 indexes");
assert(questions[0].fixedChoices === true && questions[3].fixedChoices === true, "both multiple-choice beats are fixed");
assert(appSrc.includes("p.fixedChoices ? p.choices.slice() : shuffle(p.choices)"), "fixed multiple choice is not shuffled");

assert(acceptBeginnerAnswer(questions[0], "Buenos días") === true, "morning choice is accepted");
assert(acceptBeginnerAnswer(questions[0], "Buenas noches") === false, "night choice is rejected");
assert(acceptBeginnerAnswer(questions[0], "buenos días") === false, "multiple choice stays exact");
assert(acceptBeginnerAnswer(questions[1], "gusto") === true, "gusto is accepted");
assert(acceptBeginnerAnswer(questions[1], "Gusto") === true, "gusto ignores case");
assert(acceptBeginnerAnswer(questions[1], "  gusto  ") === true, "gusto ignores surrounding spaces");
assert(acceptBeginnerAnswer(questions[1], "hola") === false, "hola is rejected");
assert(gradeListedPhrase("  GUSTO  ", questions[1]).status === "correct", "the lesson grader accepts gusto");
assert(gradeListedPhrase("hola", questions[1]).status === "wrong", "the lesson grader rejects hola");
assert(acceptBeginnerAnswer(questions[2], "Un café, por favor") === true, "the coffee order is accepted");
assert(acceptBeginnerAnswer(questions[2], "  un café, por favor  ") === true, "the coffee order ignores case and surrounding spaces");
assert(acceptBeginnerAnswer(questions[2], "Un por café, favor") === false, "a different arrangement is rejected");
assert(acceptBeginnerAnswer(questions[2], "Una de café, por favor") === false, "distractor tiles are rejected");
assert(acceptBeginnerAnswer(questions[2], "Un café, de favor") === false, "de in place of por is rejected");
assert(acceptBeginnerAnswer(questions[2], "Un café, por favor una") === false, "an extra tile is rejected");
assert(gradeListedPhrase("Un por favor café,", questions[2]).status === "wrong", "the lesson grader rejects another arrangement");
assert(acceptBeginnerAnswer(questions[3], "¿Cuánto cuesta?") === true, "the price question is accepted");
assert(acceptBeginnerAnswer(questions[3], "¿Cómo estás?") === false, "cómo estás is rejected");
assert(acceptBeginnerAnswer(questions[3], "¿Cómo te llamas?") === false, "the name question is not an exercise 4 answer");
assert(acceptBeginnerAnswer(questions[4], "llamas") === true, "llamas is accepted");
assert(acceptBeginnerAnswer(questions[4], "  LLAMAS ") === true, "llamas ignores case and surrounding spaces");
assert(acceptBeginnerAnswer(questions[4], "llama") === false, "llama is rejected");
assert(gradeListedPhrase("llama", questions[4]).status === "wrong", "the lesson grader rejects llama");

assert(!lessonListenText(questions[0]).includes("object Object"), "a bilingual prompt is speakable");
assert(/subjuntiv|vengas|llueva|ojalá|tuviera/i.test(beginnerSrc) === false, "no subjunctive in the beginner session");
assert(/stripe|paypal|revenuecat/i.test(beginnerSrc) === false, "no payment provider in the beginner session");
assert(!beginnerSrc.includes("story-0"), "the beginner session is not story-0");
assert(!gateSrc.includes("story-0"), "onboarding no longer routes to story-0");
assert(appSrc.includes("beginnerFirst: !!beginner"), "the win line can tell a beginner session from the old one");
assert(appSrc.includes("firstSessionWhyLine(qi, uiLang)"), "the old why line still serves the other levels");
assert(appSrc.includes("firstSessionWinLine(uiLang)"), "the old win line still serves the other levels");
assert(appSrc.includes("learnerLevel === \"beginner\""), "a stored beginner level keeps this session on the next open");

console.log("beginnerFirstSession.test.js: ok");
