import { buildFlashDeck, FLASH_SESSION_CAP, advanceFlashRun, flashSessionDone } from "./flashDeck.js";

const units = [
  { id: "subj1", title: "Subjuntivo", pairs: [["ojalá", "hopefully"], ["dudar", "to doubt"], ["esperar", "to hope"], ["aunque", "although"], ["quizás", "maybe"]] },
  { id: "pret", title: "Pretérito", pairs: [{ es: "anoche", en: "last night" }, { es: "ojalá", en: "hopefully" }, { es: "mientras", en: "while" }] },
];

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const twoSaved = {
  flashcards: {
    hola: { word: "hola", en: "hello", due: Date.now() - 1 },
    gracias: { word: "gracias", en: "thanks", due: Date.now() - 1 },
  },
};

const fromTwoSaved = buildFlashDeck(twoSaved, units);
const unique = new Set(fromTwoSaved.map((c) => c.word));
assert(fromTwoSaved.length > 2, `expected more than 2 cards when pairs exist, got ${fromTwoSaved.length}`);
assert(unique.size === fromTwoSaved.length, "deck resampled duplicate words");
assert(fromTwoSaved.length <= FLASH_SESSION_CAP, "deck exceeded cap");
assert(fromTwoSaved.some((c) => c.word === "dudar"), "unit pairs should top up a 2-card saved deck");

const empty = buildFlashDeck({}, units);
assert(empty.length > 2, `empty save should still use pairs, got ${empty.length}`);
assert(new Set(empty.map((c) => c.word)).size === empty.length, "pair-only deck has duplicates");

let run = { deck: empty, idx: 0, done: false, reviewed: 0, xpEarned: 0 };
assert(!flashSessionDone(run), "fresh run should not be done");
for (let i = 0; i < empty.length; i++) run = advanceFlashRun(run, 2);
assert(flashSessionDone(run), "run should end after the last card");
assert(run.done === true, "done flag missing");
assert(run.reviewed === empty.length, `reviewed ${run.reviewed}, expected ${empty.length}`);
const again = advanceFlashRun(run, 2);
assert(again.idx === run.idx, "done run must not wrap or increment");

console.log(`ok: ${fromTwoSaved.length} unique cards from 2 saved + pairs; session ends after ${empty.length}`);
