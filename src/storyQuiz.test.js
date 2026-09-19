import {
  STORY_QUIZ_CUE,
  STORY_QUIZ_CUE_LINE,
  gatedLiftStoryQuiz,
  isStoryChoiceCorrect,
  isStoryLecturaDone,
  liftStoryQuizItem,
  passageForStoryQuestion,
  pickCompletedStory,
  selectedStoryChoice,
  shuffleChoices,
  shuffleStoryChoiceOrder,
  storyQuestionChoices,
  storyQuizCue,
  storyQuizCueLine,
  storyQuizEyebrow,
  storyQuizPassage,
} from "./storyQuiz.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(STORY_QUIZ_CUE.es === "Según el cuento", "George ES eyebrow is Según el cuento");
assert(STORY_QUIZ_CUE.en === "From the story", "George EN eyebrow is From the story");
assert(STORY_QUIZ_CUE_LINE.es === "Responde según lo que acabas de leer.", "George ES cue line is locked");
assert(STORY_QUIZ_CUE_LINE.en === "Answer from what you just read.", "George EN cue line is locked");
assert(storyQuizEyebrow("es") === "Según el cuento", "eyebrow helper ES");
assert(storyQuizEyebrow("en") === "From the story", "eyebrow helper EN");
assert(storyQuizEyebrow() === "Según el cuento", "eyebrow helper default is ES");

const cerezas = {
  id: "story-9",
  title: "Las cerezas de don Adán",
  paragraphs: [
    "Si usted alguna vez se ha tomado un café de Chiapas en una cafetería de Brooklyn, es posible que las cerezas las haya recolectado don Adán Pérez Sántiz.",
    "Don Adán carga cinco kilos de cerezas de café en una canasta de mimbre.",
    "Por cada kilo de café que entrego a la cooperativa, recibo entre quince y veinte pesos. Su café en Brooklyn cuesta seis dólares la taza.",
    "Una empresa japonesa le había ofrecido comprar su cosecha completa a precio premium, pero él se había negado: «Si vendo todo a una sola empresa, dependo de una sola empresa.»",
    "Cuando regresé en 2024, le entregué un libro. Su primera lengua es el tzotzil.",
    "El cambio climático le preocupa más que los mercados. La roya del café —un hongo— sube cada año.",
  ],
  questions: [
    { prompt: "¿Cuánto recibe don Adán por cada kilo de café que entrega a la cooperativa?", choices: ["Entre quince y veinte pesos", "Seis dólares"], answer: "Entre quince y veinte pesos" },
    { prompt: "¿Por qué se negó a vender toda su cosecha a una sola empresa japonesa?", choices: ["Porque no quería depender de una sola empresa", "Porque la empresa no pagaba bien"], answer: "Porque no quería depender de una sola empresa" },
    { prompt: "¿Qué le preocupa más a don Adán que los precios del mercado?", choices: ["El cambio climático y la roya del café", "Los periodistas urbanos"], answer: "El cambio climático y la roya del café" },
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

const kilos = passageForStoryQuestion(cerezas, cerezas.questions[0]);
assert(/quince y veinte pesos/.test(kilos), "kilo Q picks the cooperativa paragraph");
const refused = passageForStoryQuestion(cerezas, cerezas.questions[1]);
assert(/dependo de una sola empresa/.test(refused), "refused Q picks the Japanese-buyer paragraph");
const climate = passageForStoryQuestion(cerezas, cerezas.questions[2]);
assert(/cambio climático/.test(climate) && /roya/.test(climate), "climate Q picks the roya paragraph");
assert(passageForStoryQuestion(cerezas, { passage: "Authored excerpt." }) === "Authored excerpt.", "authored passage wins");
assert(passageForStoryQuestion(cerezas, { passageIndex: 5 }) === cerezas.paragraphs[5], "authored passageIndex wins");
assert(passageForStoryQuestion(ofrenda, ofrenda.questions[0]) === "", "no paragraphs means no passage");

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
assert(/dependo de una sola empresa/.test(afterRead.passage), "lift carries the matching passage");
assert(storyQuizPassage(afterRead) === afterRead.passage, "passage helper reads the lift");
assert(afterRead.cue.es === "Según el cuento", "default lift cue is George ES eyebrow");
assert(afterRead.cueLine == null, "second line is not set by default");
assert(storyQuizCue(afterRead, "es") === "Según el cuento", "eyebrow shows because the passage is visible");
assert(storyQuizCue(afterRead, "en") === "From the story", "eyebrow EN shows with the passage");
assert(storyQuizCueLine(afterRead, "es") === "", "second line stays off by default ES");
assert(storyQuizCueLine(afterRead, "en") === "", "second line stays off by default EN");
assert(storyQuizCue({ type: "mc", prompt: "x" }, "en") === "", "non-story items have no cue");
assert(storyQuizCue({ _u: "_story", cue: STORY_QUIZ_CUE }, "en") === "", "eyebrow stays off without a passage");

const stamped = liftStoryQuizItem(
  { ...cerezas.questions[1], explain: { es: "Why ES", en: "Why EN" }, cue: { es: "Del cuento", en: "From the story" } },
  "prompt",
  fallback,
  cerezas,
);
assert(stamped.explain.es === "Why ES", "authored Why wins over fallback");
assert(stamped.explainEn === "Why EN", "authored Why EN is kept");
assert(stamped.cue.es === "Del cuento", "authored cue is passed through");
assert(storyQuizCue(stamped, "es") === "Del cuento", "cue helper reads a stamped ES string when passage is on");
assert(storyQuizCue(stamped, "en") === "From the story", "cue helper reads a stamped EN string when passage is on");
assert(storyQuizCue({}, "en") === "", "missing item has no cue");
assert(storyQuizCue({ cue: "" }, "es") === "", "empty cue string stays empty");

const withLine = liftStoryQuizItem({ ...cerezas.questions[0], cueLine: true }, "prompt", fallback, cerezas);
assert(storyQuizCueLine(withLine, "es") === "Responde según lo que acabas de leer.", "cueLine true uses George ES line");
assert(storyQuizCueLine(withLine, "en") === "Answer from what you just read.", "cueLine true uses George EN line");
assert(storyQuizCue(withLine, "es") === "Según el cuento", "eyebrow still shows when the line hook is on");

const noStory = liftStoryQuizItem(cerezas.questions[1], "prompt", fallback);
assert(!storyQuizPassage(noStory), "lift without story paragraphs has no passage");
assert(storyQuizCue(noStory, "es") === "", "no eyebrow when the passage is missing");

assert(pickCompletedStory([cerezas, ofrenda], {}) == null, "no completed story when Lectura is unread");
assert(pickCompletedStory([cerezas, ofrenda], { "story-9": true })?.id === "story-9", "only the claimed story is pickable");
assert(pickCompletedStory([cerezas, ofrenda], { "story-0": true, "story-9": true }, () => 0)?.id === "story-9", "rng 0 picks the first completed");
assert(pickCompletedStory([cerezas, ofrenda], { "story-0": true, "story-9": true }, () => 0.99)?.id === "story-0", "rng high picks the last completed");

const none = gatedLiftStoryQuiz({ "story-9": true }, { id: "story-9", questions: [] }, null, "x", fallback);
assert(none == null, "claimed story with no questions does not lift");

const authored = ["right", "wrong-a", "wrong-b", "wrong-c"];
assert(JSON.stringify(shuffleChoices(authored, () => 0)) !== JSON.stringify(authored), "rng 0 is not identity on 4 choices");
assert(shuffleChoices(authored, () => 0)[0] !== "right", "rng 0 does not leave the authored answer first");
const shuffled = shuffleChoices(authored, () => 0);
assert(shuffled.slice().sort().join("|") === authored.slice().sort().join("|"), "shuffle keeps every option");
assert(authored[0] === "right" && authored !== shuffled, "authored list is not mutated");
assert(shuffleChoices(["only"], () => 0.99).join() === "only", "single choice stays put");
assert(shuffleChoices([], () => 0.5).length === 0, "empty choices stay empty");

const q = { choices: authored, answer: "right" };
assert(storyQuestionChoices(q)[0] === "right", "without a session shuffle, authored order is the fallback");
assert(storyQuestionChoices(q, shuffled)[0] !== "right", "session shuffle is what the reader shows");
assert(storyQuestionChoices({ shuffledChoices: shuffled, choices: authored })[0] !== "right", "attached shuffledChoices wins over authored");
assert(isStoryChoiceCorrect(q, "right", shuffled), "value pick is correct regardless of display index");
assert(!isStoryChoiceCorrect(q, "wrong-a", shuffled), "wrong value is wrong regardless of display index");
assert(isStoryChoiceCorrect(q, shuffled.indexOf("right"), shuffled), "legacy display-index pick is scored against the shown list");
assert(!isStoryChoiceCorrect(q, 0, shuffled), "index 0 is not automatically correct after shuffle");
assert(selectedStoryChoice(q, "wrong-b", shuffled) === "wrong-b", "value selection is passed through");
assert(selectedStoryChoice(q, shuffled.indexOf("wrong-c"), shuffled) === "wrong-c", "legacy index resolves against the shown list");

const order = shuffleStoryChoiceOrder(cerezas, [{ choices: ["It visits once a year", "It never returns"] }], () => 0);
assert(order.storyId === "story-9", "session order keeps the story id");
assert(order.questions.length === 3 && order.checkpoints.length === 1, "session order covers Qs and checkpoints");
assert(order.questions.every((list, i) => list[0] !== cerezas.questions[i].answer), "no comprehension Q keeps the authored answer first under rng 0");
assert(order.questions.every((list, i) => list.includes(cerezas.questions[i].answer)), "every shuffled Q still has the answer");
assert(order.checkpoints[0][0] !== "It visits once a year", "checkpoint choices shuffle too");

console.log("ok: story quiz Lectura gate + on-screen passage + choice shuffle");
