import {
  gatedLiftStoryQuiz,
  isStoryLecturaDone,
  liftStoryQuizItem,
  pickCompletedStory,
  storyQuizCue,
} from "./storyQuiz.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const cerezas = {
  id: "story-9",
  title: "Las cerezas de don Adán",
  questions: [
    { prompt: "¿Cuánto recibe don Adán por cada kilo de café que entrega a la cooperativa?", choices: ["Entre quince y veinte pesos", "Seis dólares"], answer: "Entre quince y veinte pesos" },
    { prompt: "¿Por qué se negó a vender toda su cosecha a una sola empresa japonesa?", choices: ["Porque no quería depender de una sola empresa", "Porque la empresa no pagaba bien"], answer: "Porque no quería depender de una sola empresa" },
  ],
};

const ofrenda = {
  id: "story-0",
  title: "La noche en que vuelven",
  questions: [
    { prompt: "¿Qué cree la abuela?", choices: ["Que la muerte visita"], answer: "Que la muerte visita" },
  ],
};

assert(!isStoryLecturaDone({}, "story-9"), "empty progress is not Lectura-done");
assert(!isStoryLecturaDone(null, "story-9"), "missing map is not Lectura-done");
assert(!isStoryLecturaDone({ "story-0": true }, "story-9"), "another story claimed is not this Lectura");
assert(!isStoryLecturaDone({ "story-9": false }, "story-9"), "false claim is not Lectura-done");
assert(!isStoryLecturaDone({ "story-9": true }, ""), "missing id is not Lectura-done");
assert(isStoryLecturaDone({ "story-9": true }, "story-9"), "claimed story is Lectura-done");

const fallback = { es: "Lectura rápida.", en: "Quick reading." };
const unread = gatedLiftStoryQuiz({}, cerezas, cerezas.questions[1], `Postal de ${cerezas.title}: ${cerezas.questions[1].prompt}`, fallback);
assert(unread == null, "unread cerezas does not lift into Hoy / práctica");

const unreadDaily = gatedLiftStoryQuiz({}, cerezas, cerezas.questions[0], `Del cuento «${cerezas.title}»: ${cerezas.questions[0].prompt}`, fallback);
assert(unreadDaily == null, "unread cerezas does not lift into rutina");

const unreadMission = gatedLiftStoryQuiz({ "story-0": true }, cerezas, cerezas.questions[0], `Lectura relámpago: ${cerezas.questions[0].prompt}`, fallback);
assert(unreadMission == null, "a different claimed story does not unlock cerezas");

const afterRead = gatedLiftStoryQuiz({ "story-9": true }, cerezas, cerezas.questions[1], `Postal de ${cerezas.title}: ${cerezas.questions[1].prompt}`, fallback);
assert(afterRead, "claimed Lectura lifts the comprehension Q");
assert(afterRead.storyId === "story-9", "lift keeps the story id");
assert(afterRead.skill === "Lectura", "lift Focus stays Lectura");
assert(afterRead.type === "mc", "lift is multiple choice");
assert(afterRead.prompt === `Postal de ${cerezas.title}: ${cerezas.questions[1].prompt}`, "lift keeps the caller prompt");
assert(afterRead.answer === "Porque no quería depender de una sola empresa", "lift keeps the story answer");
assert(afterRead.explain === "Lectura rápida.", "unstamped Why uses the caller fallback");
assert(afterRead.cue == null, "no invented from-the-story cue");
assert(storyQuizCue(afterRead, "es") === "", "cue helper is empty until George stamps");
assert(storyQuizCue(afterRead, "en") === "", "cue helper EN is empty until George stamps");

const stamped = liftStoryQuizItem(
  { ...cerezas.questions[1], explain: { es: "Why ES", en: "Why EN" }, cue: { es: "Del cuento", en: "From the story" } },
  "prompt",
  fallback,
);
assert(stamped.explain.es === "Why ES", "authored Why wins over fallback");
assert(stamped.explainEn === "Why EN", "authored Why EN is kept");
assert(stamped.cue.es === "Del cuento", "authored cue is passed through");
assert(storyQuizCue(stamped, "es") === "Del cuento", "cue helper reads a stamped ES string");
assert(storyQuizCue(stamped, "en") === "From the story", "cue helper reads a stamped EN string");
assert(storyQuizCue({}, "en") === "", "missing item has no cue");
assert(storyQuizCue({ cue: "" }, "es") === "", "empty cue string stays empty");

assert(pickCompletedStory([cerezas, ofrenda], {}) == null, "no completed story when Lectura is unread");
assert(pickCompletedStory([cerezas, ofrenda], { "story-9": true })?.id === "story-9", "only the claimed story is pickable");
assert(pickCompletedStory([cerezas, ofrenda], { "story-0": true, "story-9": true }, () => 0)?.id === "story-9", "rng 0 picks the first completed");
assert(pickCompletedStory([cerezas, ofrenda], { "story-0": true, "story-9": true }, () => 0.99)?.id === "story-0", "rng high picks the last completed");

const none = gatedLiftStoryQuiz({ "story-9": true }, { id: "story-9", questions: [] }, null, "x", fallback);
assert(none == null, "claimed story with no questions does not lift");

console.log("ok: story quiz Lectura gate");
