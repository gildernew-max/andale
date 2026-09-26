import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { inflateSync } from "zlib";
import { andaleViteBase } from "../vite.config.js";
import { lessonListenText, prepQuestion } from "./prepQuestion.js";
import { hoyStillFor, LANTERN_STILL } from "./hoyStill.js";
import { comeBackTomorrowLine, hoySceneForDay, hoyStoryForScene, nextDayKey } from "./firstDoor.js";
import { hoySceneBeatCount, shouldParkHoyUnderMas } from "./hoyWin.js";
import { FOCUS_LABELS, PRACTICE_EXPLAIN, explainText, focusLabel, uiText } from "./practiceI18n.js";
import { STORY_QUIZ_CUE, STORY_QUIZ_CUE_LINE, passageForStoryQuestion, storyQuizCue, storyQuizCueLine, storyQuizEyebrow } from "./storyQuiz.js";
import { DEFAULT_LETTER_LAYOUT, lettersForLayout } from "./letterBoard.js";
import { SUBJ_FIVE, SUBJ_FIVE_LABEL, SUBJ_FIVE_SUB } from "./subjFive.js";
import { SOBREMESA_FIVE, SOBREMESA_NAME, SOBREMESA_QUIET, SOBREMESA_SELL, sobremesaName } from "./sobremesa.js";
import { SAFE_RISKY_ANSWERS, SAFE_RISKY_MULTI_FIXTURE, safeRiskyCorrectKeys } from "./safeRisky.js";
import { CUBETAS_BIRD_PX, CUBETAS_BUCKET_SRC, CUBETAS_DEAD_LABELS, CUBETAS_EASE_ENTER, CUBETAS_EASE_EXIT, CUBETAS_EASE_LIFT, CUBETAS_HINT, CUBETAS_TITLE, CUBETAS_WIN_MS, OJALA_QUE_PACK, cubetasHint } from "./cubetas.js";
import { HANGMAN_ACCENTS, HANGMAN_BANK, HANGMAN_HOWTO, HANGMAN_QUIET, HANGMAN_TIMER_DEFAULT, HANGMAN_TITLE, hangmanRegionChip, hangmanShowTeach, hangmanSlotKey, hangmanTitle } from "./hangman.js";
import { JEOPARDY_CAT_LABEL, JEOPARDY_CATEGORY_IDS, JEOPARDY_HOWTO, JEOPARDY_QUIET, JEOPARDY_TITLE, JEOPARDY_VALUES, jeopardyCatLabel, jeopardyTitle } from "./jeopardy.js";
import { MEMORY_BANK, MEMORY_HOWTO, MEMORY_QUIET, MEMORY_TITLE, memoryRegionChip, memoryTitle } from "./memory.js";
import { IAP_PRODUCTS, PURCHASE_EVENT, WEB_NO_IAP_REASON } from "./purchase.js";
import { FUNNEL_EVENT, FUNNEL_EVENTS, FUNNEL_LOG, PAYWALL_TAP } from "./funnel.js";
import { isAudioGatedStep, LISTEN_SKIP, LISTEN_SKIP_HINT, listenSkipHint, listenSkipLabel } from "./listenSkip.js";
import { WAITLIST_CTA, WAITLIST_ERROR, WAITLIST_PLACEHOLDER, WAITLIST_PRIVACY, WAITLIST_PRIVACY_URL, WAITLIST_PROMPT, WAITLIST_SUCCESS, waitlistCta, waitlistError, waitlistPlaceholder, waitlistPrivacy, waitlistPrompt, waitlistSuccess } from "./waitlist.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const mustFail = (fn, needle, msg) => {
  let threw = false;
  try { fn(); } catch (e) {
    threw = true;
    assert(String(e.message).includes(needle), `${msg}: expected ${JSON.stringify(needle)} in ${JSON.stringify(e.message)}`);
  }
  assert(threw, msg);
};

/** Read a top-level `const NAME = …` array/object from App.jsx without importing React. */
const extractConst = (src, name) => {
  const needle = `const ${name} =`;
  const start = src.indexOf(needle);
  if (start < 0) throw new Error(`App.jsx missing ${name}`);
  let i = start + needle.length;
  while (i < src.length && /\s/.test(src[i])) i++;
  const from = i;
  let depth = 0;
  let inStr = null;
  let escaped = false;
  for (; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (inStr) {
      if (escaped) { escaped = false; continue; }
      if (c === "\\") { escaped = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "/" && n === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && n === "*") { i = src.indexOf("*/", i + 2); if (i < 0) break; i += 1; continue; }
    if (c === "\"" || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  throw new Error(`App.jsx unclosed ${name}`);
};

const loadCurriculum = () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
  const D = {
    green: "#58CC02", greenDark: "#46A302",
    purple: "#CE82FF", purpleDark: "#A567CC",
    blue: "#1CB0F6", blueDark: "#1899D6",
    gold: "#FFC800", goldDark: "#E6A800",
  };
  const evalConst = (name) => Function("D", `"use strict"; return (${extractConst(src, name)});`)(D);
  const UNITS = evalConst("UNITS");
  const SECTIONS = evalConst("SECTIONS");
  const STORIES = evalConst("STORIES");
  const MISSIONS = evalConst("MISSIONS");
  const TODAY_SCENES = evalConst("TODAY_SCENES");
  const FLAT = SECTIONS.flatMap((s) => s.unitIds.map((id) => ({ unit: UNITS.find((u) => u.id === id), section: s })));
  return { UNITS, SECTIONS, STORIES, MISSIONS, TODAY_SCENES, FLAT };
};

const hasStem = (q) => typeof (q.prompt || q.base || q.text) === "string" && String(q.prompt || q.base || q.text).trim().length > 0;
const hasAnswer = (q) => {
  if (q.answer != null && String(q.answer).trim()) return true;
  if (Array.isArray(q.answers) && q.answers.some((a) => a != null && String(a).trim())) return true;
  return false;
};

const pairReady = (pr) => {
  if (Array.isArray(pr)) return pr[0] != null && String(pr[0]).trim() && pr[1] != null && String(pr[1]).trim();
  return pr && typeof pr === "object" && String(pr.es || "").trim() && String(pr.en || "").trim();
};

/** Throws if a prepped question is missing required fields (blank tile bank / no stem). */
const assertPreppedQuestion = (q, loc) => {
  assert(q && typeof q.type === "string" && q.type.trim(), `${loc}: type`);
  if (q.type === "match") {
    assert(Array.isArray(q.pairs) && q.pairs.length && q.pairs.every(pairReady), `${loc}: match pairs`);
    return;
  }
  assert(hasStem(q), `${loc}: prompt or base`);
  assert(hasAnswer(q), `${loc}: answer or answers`);
  if (q.type === "mc") {
    assert(Array.isArray(q.choices) && q.choices.length > 0 && q.choices.every((c) => c != null && String(c).trim()), `${loc}: mc choices`);
  }
  if (q.type === "order") {
    assert(Array.isArray(q.words) && q.words.length > 0 && q.words.every((w) => w != null && String(w).trim()), `${loc}: order words`);
  }
};

const assertSectionIntegrity = (units, sections) => {
  const ids = new Set(units.map((u) => u.id));
  for (const sec of sections) {
    assert(Array.isArray(sec.unitIds) && sec.unitIds.length, `section ${sec.title || "?"} has unitIds`);
    for (const id of sec.unitIds) {
      assert(ids.has(id), `SECTIONS references missing unit ${id}`);
    }
  }
  const flat = sections.flatMap((s) => s.unitIds.map((id) => units.find((u) => u.id === id)));
  for (let i = 0; i < flat.length; i++) {
    assert(flat[i] != null, `FLAT has undefined unit at ${i}`);
  }
};

/* ---------- normalize rules (test through prepQuestion, do not rewrite UNITS) ---------- */
const fromTokens = prepQuestion({ type: "order", prompt: "Ordena", tokens: ["Si", "fuera"], answer: "Si fuera" });
assert(Array.isArray(fromTokens.words) && fromTokens.words[0] === "Si" && fromTokens.words[1] === "fuera", "tokens→words");
assert(fromTokens.tokens[0] === "Si", "prepQuestion must not strip tokens; only fill words");

const fromSource = prepQuestion({ type: "transform", prompt: "Cambia", source: "Creo que viene.", answer: "No creo que venga." });
assert(fromSource.base === "Creo que viene.", "source→base");
assert(Array.isArray(fromSource.answers) && fromSource.answers[0] === "No creo que venga.", "answer→answers on transform");

const fromSingular = prepQuestion({ type: "type", prompt: "Escribe", answer: "llueva" });
assert(Array.isArray(fromSingular.answers) && fromSingular.answers[0] === "llueva", "answer→answers on type");

const fromPairs = prepQuestion({ type: "match", pairs: [{ es: "ojalá", en: "hopefully" }, { es: "dudar", en: "to doubt" }] });
assert(Array.isArray(fromPairs.pairs[0]) && fromPairs.pairs[0][0] === "ojalá" && fromPairs.pairs[0][1] === "hopefully", "{es,en} pairs");

mustFail(
  () => assertPreppedQuestion(prepQuestion({ type: "mc", prompt: "x", answer: "a" }), "fixture"),
  "mc choices",
  "mc with no choices after prepQuestion must fail",
);
mustFail(
  () => assertPreppedQuestion(prepQuestion({ type: "mc", prompt: "x", answer: "a", choices: [] }), "fixture"),
  "mc choices",
  "mc with empty choices after prepQuestion must fail",
);
mustFail(
  () => assertPreppedQuestion(prepQuestion({ type: "order", prompt: "x", answer: "hola" }), "fixture"),
  "order words",
  "order with neither words nor tokens must fail",
);
mustFail(
  () => assertSectionIntegrity([{ id: "subj1", pairs: [["a", "b"]] }], [{ title: "S1", unitIds: ["subj1", "ghost"] }]),
  "missing unit ghost",
  "SECTIONS id missing from UNITS must fail",
);

/* ---------- live curriculum from App.jsx ---------- */
const { UNITS, SECTIONS, STORIES, MISSIONS, TODAY_SCENES, FLAT } = loadCurriculum();

assert(Array.isArray(UNITS) && UNITS.length >= 18, `expected ≥18 units, got ${UNITS.length}`);
assert(Array.isArray(SECTIONS) && SECTIONS.length === 3, `expected 3 sections, got ${SECTIONS.length}`);
assertSectionIntegrity(UNITS, SECTIONS);

const unitIds = new Set();
for (const u of UNITS) {
  assert(u.id && typeof u.id === "string", "unit missing id");
  assert(!unitIds.has(u.id), `duplicate unit id ${u.id}`);
  unitIds.add(u.id);
  assert(Array.isArray(u.pairs) && u.pairs.length > 0 && u.pairs.every(pairReady), `unit ${u.id} missing pairs`);
  assert(Array.isArray(u.questions) && u.questions.length > 0, `unit ${u.id} missing questions`);

  const matchQ = prepQuestion({ type: "match", pairs: u.pairs });
  assertPreppedQuestion(matchQ, `${u.id} generated match`);

  u.questions.forEach((raw, i) => {
    const q = prepQuestion(raw);
    assertPreppedQuestion(q, `${u.id} Q${i} (${raw.type || "?"})`);
  });
}

assert(FLAT.length === SECTIONS.reduce((n, s) => n + s.unitIds.length, 0), "FLAT length must match section unitIds");
assert(FLAT.every((row) => row.unit != null && row.section != null), "FLAT has no undefined units");

/* ---------- STORIES / MISSIONS / TODAY_SCENES (cheap; story-0 cannot silent-fail Lectura) ---------- */
assert(Array.isArray(STORIES) && STORIES.length >= 10, `expected ≥10 stories, got ${STORIES.length}`);
assert(STORIES.some((s) => s.id === "story-0"), "story-0 must exist");
const storyIds = new Set();
for (const s of STORIES) {
  assert(s.id && typeof s.id === "string", "story missing id");
  assert(!storyIds.has(s.id), `duplicate story id ${s.id}`);
  storyIds.add(s.id);
  assert(s.title && String(s.title).trim(), `${s.id}: title`);
  assert(Array.isArray(s.paragraphs) && s.paragraphs.length > 0 && s.paragraphs.every((p) => String(p || "").trim()), `${s.id}: paragraphs`);
  assert(s.glossary && typeof s.glossary === "object" && Object.keys(s.glossary).length > 0, `${s.id}: glossary`);
  assert(Array.isArray(s.questions) && s.questions.length > 0, `${s.id}: questions`);
  s.questions.forEach((qq, i) => {
    assert(qq.prompt && String(qq.prompt).trim(), `${s.id} Q${i}: prompt`);
    assert(Array.isArray(qq.choices) && qq.choices.length > 0, `${s.id} Q${i}: choices`);
    assert(qq.answer != null && String(qq.answer).trim(), `${s.id} Q${i}: answer`);
    assert(qq.choices.includes(qq.answer), `${s.id} Q${i}: answer must be one of the choices (by value, not index)`);
  });
}

const story0 = STORIES.find((s) => s.id === "story-0");
assert(story0.paragraphs[0] === "Cuando yo era niña, creía que la muerte era algo triste y oscuro. Mi abuela Refugio, que nació a la orilla del lago de Pátzcuaro, pensaba exactamente lo contrario. «La muerte no viene por nosotros», me decía mientras cortaba flores de cempasúchil en el patio. «Viene a visitarnos, una vez al año, y hay que recibirla como se recibe a la familia: con comida, con música y con la casa limpia.»", "story-0 ES ¶1 is George niña stamp");
assert(story0.paragraphs[1] === "A finales de octubre, todo el pueblo cambiaba. Los mercados se llenaban de calaveras de azúcar con nombres escritos en la frente, de pan de muerto espolvoreado con azúcar, y de montañas anaranjadas de cempasúchil. El aire olía a copal, esa resina que se quema desde tiempos prehispánicos. Mi abuela compraba todo con una lista que sabía de memoria, porque la ofrenda era un trabajo serio.", "story-0 ¶2 ES unchanged");
assert(story0.paragraphs[2] === "El primero de noviembre armábamos el altar sobre una mesa con mantel morado. Poníamos las fotos de los difuntos: el bisabuelo Ramón con su sombrero de charro, la tía Consuelo, que murió demasiado joven. Para cada uno había algo especial. Para Ramón, un caballito de tequila y sus cigarros. Para Consuelo, dulce de calabaza, porque le encantaba. Las velas marcaban el camino, y un sendero de pétalos llegaba hasta la puerta. «Es para que no se pierdan», explicaba mi abuela. «La luz los guía, pero el olor los trae a casa.»", "story-0 ¶3 ES unchanged");
assert(story0.paragraphs[3] === "La noche del dos de noviembre no dormíamos. Cruzábamos el lago en lancha hacia la isla de Janitzio, donde el panteón se convertía en un mar de velas. Las familias se sentaban junto a las tumbas a platicar, a comer tamales, a contar historias de los que ya no estaban. Nadie lloraba. Bueno, casi nadie. Se reía, se recordaba, se cantaba bajito.", "story-0 ¶4 ES unchanged");
assert(story0.paragraphs[4] === "Una vez le pregunté a mi abuela si de verdad creía que los muertos regresaban. Se quedó callada un momento. «Mira», me dijo por fin, «mientras digamos sus nombres, no se mueren del todo. El olvido es la única muerte verdadera.»", "story-0 ¶5 ES unchanged");
assert(story0.paragraphs[5] === "Mi abuela murió hace seis años. Ahora soy yo quien arma la ofrenda, con mis hijos. Pongo su foto junto a la de Ramón y la de Consuelo, con una taza de café de olla, porque le encantaba. Y cada noviembre, cuando enciendo las velas, espero que el olor del cempasúchil la traiga a casa. Ojalá que, cuando me toque a mí, alguien diga mi nombre también.", "story-0 ¶6 ES unchanged");
assert(!/Cuando yo era niño,/.test(story0.paragraphs.join("\n")), "story-0 ES is not niño under girl stills");
assert(story0.questions[0].prompt === "Según la abuela, ¿qué trae a los muertos hasta la casa?" && story0.questions[0].answer === "El olor del cempasúchil", "story-0 quiz 1 unchanged");
assert(story0.questions[1].prompt === "¿Dónde pasaba la familia la noche del 2 de noviembre?" && story0.questions[1].answer === "En el panteón de la isla de Janitzio", "story-0 quiz 2 unchanged");
assert(story0.questions[2].prompt === "Para la abuela, ¿cuál es «la única muerte verdadera»?" && story0.questions[2].answer === "El olvido", "story-0 quiz 3 unchanged");
const story0Src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const STORY_EXTRAS = Function("D", `"use strict"; return (${extractConst(story0Src, "STORY_EXTRAS")});`)({
  green: "#58CC02", greenDark: "#46A302", purple: "#CE82FF", purpleDark: "#A567CC",
  blue: "#1CB0F6", blueDark: "#1899D6", gold: "#FFC800", goldDark: "#E6A800",
});
const story0Extra = STORY_EXTRAS["story-0"];
assert(story0Extra.en[0] === "When the narrator was a child, her grandmother taught her that death visits like family and should be welcomed with food, music, and a clean house.", "story-0 EN extras ¶1 is her/her");
assert(story0Extra.en[5] === "Now the narrator builds the ofrenda for her own grandmother and hopes someone will say her name one day too.", "story-0 EN extras ¶6 is her/her");
assert(story0Extra.en[1] === "By late October the town changed: markets filled with sugar skulls, pan de muerto, marigolds, copal, and everything needed for a serious ofrenda.", "story-0 EN extras ¶2 unchanged");
assert(!story0Extra.en.some((line) => /his grandmother taught him|for his own grandmother|say his name/.test(line)), "story-0 EN extras have no niño leftover");

assert(Array.isArray(MISSIONS) && MISSIONS.length > 0, "MISSIONS missing");
const missionIds = new Set();
for (const m of MISSIONS) {
  assert(m.id && typeof m.id === "string", "mission missing id");
  assert(!missionIds.has(m.id), `duplicate mission id ${m.id}`);
  missionIds.add(m.id);
  assert(m.title && String(m.title).trim(), `${m.id}: title`);
  assert(m.desc && String(m.desc).trim(), `${m.id}: desc`);
  assert(m.intro && String(m.intro).trim(), `${m.id}: intro`);
  assert(Array.isArray(m.units) && m.units.length > 0 && m.units.every((id) => unitIds.has(id)), `${m.id}: units`);
  assert(m.storyId && storyIds.has(m.storyId), `${m.id}: storyId ${m.storyId}`);
}

const story2 = STORIES.find((s) => s.id === "story-2");
assert(story2.title === "Más allá de la playa", "story-2 ES title lock");
assert(story2.subtitle === "De Cancún a los cenotes", "story-2 ES subtitle lock");
assert(story2.titleEn === "Beyond the beach", "story-2 EN title lock");
assert(story2.subtitleEn === "From Cancún to the cenotes", "story-2 EN subtitle lock");
assert(story2.paragraphs[0] === "Sofía y Mateo llegaron a Cancún como llega mucha gente: con bloqueador, sombrero y la firme intención de no moverse de la playa durante una semana. El plan era sencillo. Sin embargo, México tiene la costumbre de arruinar los planes sencillos de la mejor manera posible.", "story-2 p0 is George couple POV");
assert(story2.paragraphs[1] === "El responsable fue un taxista llamado don Arturo. Mientras manejaba por la zona hotelera, les preguntó qué pensaban conocer. «La playa», contestó Mateo, orgulloso del plan. Sofía asintió. Don Arturo los miró por el retrovisor con una mezcla de lástima y paciencia. «La playa está padre», admitió. «Pero ustedes están en tierra maya. Debajo de esta carretera hay ríos secretos. ¿De veras se van a regresar sin verlos?»", "story-2 p1 is couple + don Arturo");
assert(story2.paragraphs[2] === "Así fue como, dos días después, Sofía y Mateo se encontraron bajando por una escalera de madera hacia un cenote cerca de Valladolid. Un cenote es un pozo natural de agua dulce, formado cuando el techo de una cueva de piedra caliza se derrumba. La península de Yucatán no tiene ríos en la superficie; toda su agua corre por debajo. Para los mayas eran sagrados: puertas al inframundo, fuentes de vida. Por lo tanto, no se entraba a un cenote a la ligera.", "story-2 p2 is couple at the cenote stairs");
assert(story2.paragraphs[3] === "Nadar ahí es difícil de describir. El agua es tan transparente que los peces parecen flotar en el aire. Un rayo de sol entra por la abertura del techo y cae como un reflector sobre el azul. Arriba cuelgan raíces que bajan buscando el agua. Sofía miró a Mateo y los dos entendieron por qué los mayas pensaban que era un lugar entre dos mundos.", "story-2 p3 is couple swim");
assert(story2.paragraphs[4] === "Al día siguiente visitaron Chichén Itzá. Debido a la multitud, llegaron temprano. La pirámide de Kukulcán es, además de hermosa, un calendario de piedra: tiene 365 escalones, uno por cada día del año. En los equinoccios, la luz del sol crea sobre la escalera la sombra de una serpiente que baja lentamente. Miles de personas viajan cada año solo para ver ese truco de luz.", "story-2 p4 is couple at Kukulcán");
assert(story2.paragraphs[5] === "Volvieron a Cancún para el último día y, no obstante, la playa ya les parecía distinta. Seguía siendo hermosa, claro. Pero ahora sabían que era apenas la superficie. Debajo del paraíso turístico hay otro país: más antiguo, más callado y mucho más profundo. Si algún día va usted a Cancún, disfrute su playa. Se la ha ganado. Pero hágale caso a don Arturo: no se regrese sin ver lo que hay debajo.", "story-2 p5 is couple last beach day");
const story2Hay = story2.paragraphs.join("\n");
assert(/Sofía y Mateo/.test(story2Hay), "story-2 copy names Sofía y Mateo");
assert(!/Llegué a Cancún|no moverme|contesté, orgulloso|orgulloso de mi plan|Me miró por el retrovisor|usted está en tierra maya, joven|me encontré bajando|Entendí de inmediato|visité Chichén|Volví a Cancún para mi último/.test(story2Hay), "story-2 has no solo-yo narrator");
assert((story2.paragraphs[1].match(/don Arturo/gi) || []).length >= 1, "don Arturo is on p1");
assert(!/don Arturo/.test(story2.paragraphs.slice(2, 5).join("\n")), "don Arturo is not a p2–p4 character");
assert(story2.glossary.llegaron && !story2.glossary.llegué, "story-2 glossary is couple pretérito, not yo");
assert(story2.glossary.encontraron && !story2.glossary.encontré, "story-2 glossary drops me encontré");
assert(story2.glossary.entendieron && !story2.glossary.entendí, "story-2 glossary drops entendí");
assert(story2.glossary.visitaron && !story2.glossary.visité, "story-2 glossary drops visité");
assert(story2.glossary.volvieron && !story2.glossary.volví, "story-2 glossary drops volví");
assert(story2.glossary.sabían && !story2.glossary.sabía, "story-2 glossary drops sabía");
const story2Extra = STORY_EXTRAS["story-2"];
assert(story2Extra.en[0] === "Sofía and Mateo land in Cancún planning a beach week — Mexico ruins simple plans kindly.", "story-2 EN p0 is couple");
assert(story2Extra.en[1] === "Taxi driver don Arturo pushes them past the hotel zone toward secret rivers under Maya land.", "story-2 EN p1 is Arturo + couple");
assert(story2Extra.en[5] === "Back on the beach, the surface looks different because they know what runs underneath.", "story-2 EN p5 is couple");
assert(!story2Extra.en.some((line) => /narrator|\bhe learns\b|\bhe now understands\b/.test(line)), "story-2 EN beats are not solo-narrator");
assert(story2Extra.checkpoints[1].q === "Who changes Sofía and Mateo's plan?", "checkpoint 2 is couple, not narrator");
assert(story2Extra.checkpoints[1].a === "Don Arturo", "checkpoint 2 answer stays Don Arturo");
assert(story2Extra.checkpoints[5].q === "What do Sofía and Mateo learn?", "checkpoint 6 is couple");
assert(story2Extra.checkpoints[0].choices[0] !== story2Extra.checkpoints[0].a, "story-2 checkpoint choices are shuffled on the wire");
assert(!story2Extra.checkpoints.some((cp) => /narrator/i.test(cp.q)), "no narrator checkpoint on story-2");

const story5 = STORIES.find((s) => s.id === "story-5");
assert(story5.title === "La frontera más larga del mundo", "story-5 ES title lock");
assert(story5.subtitle === "Una reportera en Tijuana", "story-5 ES subtitle lock");
assert(story5.paragraphs[0] === "Llevo doce años cubriendo la frontera. Vivo en Tijuana, escribo para un periódico de Los Ángeles y cruzo el muro tres o cuatro veces por semana. Mi pasaporte está más sellado que el de cualquier diplomático. Mi español tiene acento de las dos costas. Me gano la vida explicando un país a otro y, francamente, los dos me parecen igual de extraños.", "story-5 ¶1 ES unchanged");
assert(story5.paragraphs[1] === "Tijuana no es lo que dicen las películas. Sí, hay zonas peligrosas, pero también hay restaurantes con dos estrellas Michelin, un festival de ópera, librerías independientes en la avenida Revolución y una de las mejores escenas de arte urbano del continente. La gente de aquí se ríe cuando un turista pregunta si es seguro caminar. «Más seguro que San Diego en domingo», dicen.", "story-5 ¶2 ES unchanged");
assert(story5.paragraphs[2] === "Lo que sí es cierto es que el muro está siempre presente. No solo el muro físico de metal oxidado que parte la playa en dos, sino el otro, el invisible: el que separa quién puede cruzar y quién no, quién pasa en dos minutos por la línea SENTRI y quién espera cuatro horas en la fila peatonal sin desayunar. La frontera es una máquina de filtrar personas según el papel que llevan en el bolsillo.", "story-5 ¶3 ES unchanged");
assert(story5.paragraphs[3] === "El caso que más me ha marcado fue el de Anabel, una madre hondureña que llegó embarazada en 2022. Su bebé nació en San Ysidro, en una ambulancia detenida en el carril de inspección. La niña es ciudadana americana. Anabel fue deportada cuatro días después del parto. La bebé se quedó con una tía en Los Ángeles. Cuando entrevisté a Anabel, en una iglesia que da comida en Tijuana, llevaba dos años sin ver a su hija. Lo único que tenía era una fotografía gastada de la niña sosteniendo un osito de peluche.", "story-5 ¶4 ES unchanged");
assert(story5.paragraphs[4] === "Me preguntan a menudo si la frontera me ha endurecido. Honestamente, no. Lo que me ha endurecido es ver cómo los políticos a ambos lados usan estas historias como utilería. Los activistas tampoco son inocentes; muchos viven de la indignación. La frontera real es más complicada que cualquier discurso: aquí hay trabajadores que cruzan a diario, familias mixtas, médicos binacionales, abuelitas que llevan medicinas en la bolsa.", "story-5 ¶5 ES unchanged");
assert(story5.paragraphs[5] === "Aún así, vuelvo todos los días. Hace doce años pensaba que iba a quedarme dos. Tijuana se vuelve hogar sin que uno se dé cuenta. Una vez le pregunté a un colega veterano por qué se quedaba. Me dijo: «Porque aquí pasa todo. Si te gusta el periodismo, esto es Roma en el año 50.» Tenía razón.", "story-5 ¶6 ES unchanged");
assert(story5.questions[0].prompt === "Según la reportera, ¿qué hace la frontera con las personas?" && story5.questions[0].answer === "Las filtra según el papel que llevan en el bolsillo", "story-5 quiz 1 unchanged");
assert(story5.questions[1].prompt === "¿Por qué Anabel fue separada de su hija?" && story5.questions[1].answer === "Fue deportada cuatro días después del parto", "story-5 quiz 2 unchanged");
assert(story5.questions[2].prompt === "¿Qué la mantiene viviendo en Tijuana después de doce años?" && story5.questions[2].answer === "Que aquí pasa todo, como Roma en el año 50", "story-5 quiz 3 unchanged");

const story3 = STORIES.find((s) => s.id === "story-3");
assert(story3.title === "El hijo del Rey Tigre", "story-3 ES title lock");
assert(story3.subtitle === "Una familia de lucha libre", "story-3 ES subtitle lock");
assert(story3.paragraphs[0] === "Mi padre se ponía la máscara antes de salir de casa. No era una superstición, era una regla. «Cuando uno es luchador», me decía, «el hombre y el personaje no deben encontrarse en la misma calle. La gente paga para ver al Rey Tigre, no a Joaquín Méndez de Tlalnepantla.»", "story-3 ¶1 ES unchanged");
assert(story3.paragraphs[1] === "Yo crecí entre máscaras. Las había de cuero, de licra, de terciopelo bordado con hilo de oro. Mi madre las cosía a mano en la mesa de la cocina, después de cenar, mientras la televisión transmitía las peleas de los viernes. Aprendí a leer los nombres antes que las palabras: Santo, Blue Demon, Mil Máscaras, Huracán Ramírez. Para otros niños eran personajes. Para mí eran tíos, padrinos, vecinos del barrio.", "story-3 ¶2 ES unchanged");
assert(story3.paragraphs[2] === "Mi padre fue rudo durante veintidós años. En lucha libre, los rudos son los malos, los que hacen trampa, los que el público abuchea. Los técnicos son los buenos. «Sin rudos no hay función», explicaba siempre. «El bien necesita al mal para que la gente sepa por quién gritar.» Le encantaba ser odiado. Cuando el estadio entero le silbaba, sonreía debajo de la máscara como un niño con regalo nuevo.", "story-3 ¶3 ES unchanged");
assert(story3.paragraphs[3] === "Una noche, en la Arena México, mi padre perdió la máscara. Fue una lucha de apuestas, máscara contra cabellera, y cuando el réferi contó tres, mi padre se la quitó. Tenía cuarenta y siete años. La multitud quedó en silencio. Vimos su cara por primera vez en televisión: cicatrices, ojos cansados, sudor. Después aplaudieron de pie durante cinco minutos. Mi madre lloraba. Yo también, aunque tenía once años y no quería que se notara.", "story-3 ¶4 ES unchanged");
assert(story3.paragraphs[4] === "Mi padre se retiró esa misma noche. «El Rey Tigre murió hoy», anunció. «Joaquín Méndez puede por fin caminar a la tienda sin máscara.» Pero todavía guarda todas. Las tiene en una vitrina en la sala, ordenadas por año, cada una etiquetada con la pelea que la estrenó.", "story-3 ¶5 ES unchanged");
assert(story3.paragraphs[5] === "Yo debuté el año pasado, a los veintidós. Mi nombre en el ring es Tigre Joven. Mi máscara es nueva, plateada con detalles azules, cosida por mi madre. Soy técnico, no rudo, porque mi padre dice que cada generación elige su propio camino. Cuando salgo a la arena y el público grita mi nombre, pienso en él, sentado en primera fila sin máscara, aplaudiendo al niño que aprendió a leer entre antifaces.", "story-3 ¶6 ES unchanged");
assert(story3.questions[0].prompt === "¿Por qué su padre nunca salía de casa sin la máscara?" && story3.questions[0].answer === "Para no mezclar al hombre con el personaje", "story-3 quiz 1 unchanged");
assert(story3.questions[1].prompt === "¿Qué papel desempeñaba su padre en el ring?" && story3.questions[1].answer === "Era rudo (villano)", "story-3 quiz 2 unchanged");
assert(story3.questions[2].prompt === "¿Cómo perdió su padre la máscara?" && story3.questions[2].answer === "En una lucha de apuestas máscara contra cabellera", "story-3 quiz 3 unchanged");

const story4 = STORIES.find((s) => s.id === "story-4");
assert(story4.title === "Doña Lupe y el mole", "story-4 ES title lock");
assert(story4.subtitle === "Un mercado de Oaxaca", "story-4 ES subtitle lock");
assert(story4.paragraphs[0] === "Doña Lupe llega al mercado todos los días a las cinco de la mañana. Vende mole en el pasillo principal del Mercado 20 de Noviembre, en el centro de Oaxaca, en el mismo puesto donde su madre vendía antes que ella y su abuela antes que su madre. Tiene setenta y un años, dos rodillas operadas y una memoria que da miedo: recuerda el nombre de cada cliente que ha probado su mole desde 1978.", "story-4 ¶1 ES unchanged");
assert(story4.paragraphs[1] === "El mole de Doña Lupe es negro, espeso, brillante. Lleva treinta y dos ingredientes, aunque ella jura que son treinta y tres y se niega a decir cuál es el secreto. Lo prepara los domingos: tuesta chiles de cuatro tipos en un comal de barro, asa almendras, cacahuates y ajonjolí, machaca clavo y canela en un molcajete que era de su bisabuela. Hierve todo durante seis horas. El chocolate va al final, no antes. «El chocolate manda», me explicó. «Si entra temprano, se quema. Si entra tarde, se nota. Hay que respetar al chocolate.»", "story-4 ¶2 ES unchanged");
assert(story4.paragraphs[2] === "La mañana que la entrevisté, servía mole sobre pollo con la mano derecha mientras cobraba con la izquierda. Cien pesos el plato. Cobra menos a los estudiantes y a los viejitos. A los gringos, dice riéndose, cien y un peso de bendición. Nadie regatea con ella. Aquí no se regatea. Es una regla no escrita del mercado.", "story-4 ¶3 is George rewrite CLEAR (right=plate, left=cash)");
assert(story4.paragraphs[3] === "Le pregunté si pensaba retirarse algún día. Me miró como si hubiera dicho una grosería y abrió las manos sobre el puesto. «¿Retirarme? ¿A hacer qué? Mi nieta está aprendiendo. Cuando me tiemble el pulso, ella tomará la cuchara y yo seré la abuela que vigila desde la silla. Pero todavía no me tiembla nada.»", "story-4 ¶4 is George rewrite CLEAR (nieta in words only)");
assert(story4.paragraphs[4] === "Probé el mole. No tengo palabras. Imagina un sabor que es dulce, pero no es dulce; picante, pero no es picante; antiguo, como si lo hubieran cocinado los abuelos de los abuelos. Probé un bocado y entendí algo que ningún libro me había explicado: el mole no es una receta, es una memoria. Cada cucharada contiene seis horas de cocción y trescientos años de mujeres.", "story-4 ¶5 ES unchanged");
assert(story4.paragraphs[5] === "Al final me pasó un sobre sencillo. «Eres mexicano», dijo. «Precio de la casa.» Adentro iban ochenta pesos de cuenta. Le di cien. «El peso extra es por la bendición», le dije, y se rio tanto que casi se le cae la cuchara.", "story-4 ¶6 is George rewrite CLEAR (calm envelope)");
const story4Hay = story4.paragraphs.join("\n");
assert(!/mano izquierda mientras cobraba con la derecha/.test(story4Hay), "story-4 ¶3 does not keep the old swapped hands");
assert(!/señalando a una niña/.test(story4Hay), "story-4 ¶4 does not put the nieta on the still");
assert(!/Doña Lupe me cobró ochenta pesos|Cobro precio de la casa/.test(story4Hay), "story-4 ¶6 is envelope, not peso-count theater");
assert(story4.questions[0].prompt === "¿Qué hace especial al mole de Doña Lupe?" && story4.questions[0].answer === "Lleva más de treinta ingredientes y representa generaciones de tradición", "story-4 quiz 1 unchanged");
assert(story4.questions[1].prompt === "¿Por qué Doña Lupe no quiere retirarse?" && story4.questions[1].answer === "Porque todavía no le tiembla el pulso", "story-4 quiz 2 unchanged");
assert(story4.questions[2].prompt === "¿Qué descubrió el entrevistador al probar el mole?" && story4.questions[2].answer === "Que el mole no es una receta, es una memoria", "story-4 quiz 3 unchanged");

const story7 = STORIES.find((s) => s.id === "story-7");
assert(story7.title === "El último dominó", "story-7 ES title lock");
assert(story7.subtitle === "Una cantina en la Colonia Roma", "story-7 ES subtitle lock");
assert(story7.paragraphs[0] === "La cantina La Covadonga lleva abierta desde 1947. Está en la avenida Puebla, en la Colonia Roma, y conserva todo lo que tenía cuando la fundaron unos asturianos que escapaban del franquismo: las mesas de madera maciza, los pisos de mosaico, el reloj de pared que adelanta tres minutos y, sobre todo, los dominós. Mil quinientos dominós, según el dueño actual. Suficientes para sustituir las fichas que los clientes, sin querer, se llevan en el bolsillo cuando salen.", "story-7 ¶1 ES unchanged");
assert(story7.paragraphs[1] === "Don Ernesto tiene ochenta y cuatro años, llega todos los días a las cuatro de la tarde, se sienta en la misma mesa, pide el mismo tequila reposado y juega dominó con los mismos tres amigos desde 1973. «Aunque nos hubiéramos peleado a muerte», me explicó una vez, «aquí venimos. Esta mesa es más vieja que nuestros matrimonios.» En efecto, dos de los cuatro se han divorciado, uno se ha casado tres veces, y ninguno se ha perdido una partida.", "story-7 ¶2 ES unchanged");
assert(story7.paragraphs[2] === "El dominó cubano se juega en parejas. Cada jugador recibe diez fichas. El silencio es parte del juego: solo se permite hablar entre rondas, y aun así, hay temas prohibidos por costumbre. No se habla de política con la primera copa, no se habla de los hijos casi nunca, no se habla del pasado a menos que el más viejo lo invoque. «Si habláramos de todo lo que sabemos los cuatro», me dijo Don Pepe, el más joven —setenta y nueve años—, «se nos acabaría la amistad en una tarde.»", "story-7 ¶3 is George Tito→Pepe");
assert(story7.paragraphs[3] === "Si yo no hubiera nacido en esta colonia, no entendería La Covadonga. Aquí los meseros tutean a los abogados, las botanas son gratis si pides bebida, y nadie se inmuta cuando entra un mariachi de paso a tocar dos canciones. La cantina nunca se moderniza porque sus clientes no lo permitirían. Hace cinco años, el dueño quiso poner pantallas para el fútbol. Don Ernesto dejó de venir tres semanas. Volvió cuando las pantallas se fueron.", "story-7 ¶4 ES unchanged");
assert(story7.paragraphs[4] === "El año pasado murió Don Manuel, el cuarto miembro del grupo. Tenía ochenta y siete años y un cáncer que llevaba escondiendo dos. En su honor, los otros tres jugaron una partida sin pareja, repartiendo igualmente las diez fichas faltantes sobre el lugar vacío. Don Pepe ganó. No celebraron. Don Ernesto sirvió cuatro tequilas, brindaron en silencio, y dejaron el cuarto sin tocar hasta que se evaporó solo.", "story-7 ¶5 is George Tito→Pepe");
assert(story7.paragraphs[5] === "Si alguien me preguntara qué es lo más mexicano de México —no las pirámides, no el mariachi, no el mole—, yo diría: tres hombres viejos jugando dominó en silencio en una cantina centenaria, con un tequila intacto sobre la mesa, esperando a un amigo que no va a llegar.", "story-7 ¶6 ES unchanged");
const story7Hay = [...story7.paragraphs, JSON.stringify(story7.glossary), JSON.stringify(story7.questions)].join("\n");
assert(/Don Pepe, el más joven/.test(story7.paragraphs[2]), "story-7 ¶3 names Don Pepe");
assert(/Don Pepe ganó/.test(story7.paragraphs[4]), "story-7 ¶5 names Don Pepe");
assert(story7.glossary.Pepe && story7.glossary.Pepe[0] === "Pepe", "story-7 glossary is Pepe");
assert(!story7.glossary.Tito, "story-7 glossary drops Tito");
assert(!/\bTito\b/.test(story7Hay), "story-7 has no Tito leftover");
assert(story7.questions[0].prompt === "¿Cómo se juega el dominó cubano según el cuento?" && story7.questions[0].answer === "En parejas, con diez fichas por jugador y mucho silencio", "story-7 quiz 1 unchanged");
assert(story7.questions[1].prompt === "¿Qué pasó cuando el dueño quiso poner pantallas de fútbol?" && story7.questions[1].answer === "Don Ernesto dejó de venir y solo volvió cuando se las quitaron", "story-7 quiz 2 unchanged");
assert(story7.questions[2].prompt === "¿Cómo honraron a Don Manuel después de su muerte?" && story7.questions[2].answer === "Jugaron una partida sin pareja y dejaron su tequila intacto", "story-7 quiz 3 unchanged");

const story8 = STORIES.find((s) => s.id === "story-8");
assert(story8.title === "El grito de mi padre", "story-8 ES title lock");
assert(story8.subtitle === "Independencia en una colonia obrera", "story-8 ES subtitle lock");
assert(story8.paragraphs[0] === "Cada 15 de septiembre, mi padre se transformaba. Era cajero de banco, hombre tranquilo, de los que doblan el periódico en cuartos antes de leerlo. Pero esa noche, alrededor de las once, se ponía la guayabera blanca, mojaba el peine en agua y se peinaba hacia atrás como si fuera 1962, y bajaba al patio de la unidad habitacional con una sola misión: dar el grito de Independencia más fuerte de toda la colonia Nezahualcóyotl.", "story-8 ¶1 ES unchanged");
assert(story8.paragraphs[1] === "El grito —para los que no lo conozcan— es un ritual nocturno. A las once en punto, el presidente sale al balcón de Palacio Nacional y grita los nombres de los héroes de la Independencia: «¡Viva Hidalgo! ¡Viva Morelos! ¡Viva México!» Y la multitud responde a cada uno con un «¡Viva!» que es más rugido que respuesta. La transmisión llega por televisión a cada casa. Y en cada casa, alguien repite el grito en la sala. Pero en la colonia obrera donde yo crecí, el grito era comunitario. Bajábamos al patio, prendíamos los radios, descorchábamos botellas de tequila y esperábamos.", "story-8 ¶2 ES unchanged");
assert(story8.paragraphs[2] === "Mi padre se había practicado el grito todo septiembre. En la regadera, en el coche, antes de dormir. Mi madre se burlaba: «Como si fueras a postularte para presidente.» Pero él tomaba el ritual en serio. «Si la patria se hubiera independizado sola», decía, «no tendríamos que gritar. Como nos costó sangre, gritamos.»", "story-8 ¶3 ES unchanged");
assert(story8.paragraphs[3] === "Recuerdo el grito de 1987. Yo tenía diez años. Mi padre me llevó al balcón con un cajón de botellas a un lado. Tenía la camisa blanca planchada, el bigote recortado y el brazo en alto. Cuando llegó el momento de gritar «¡Viva México!», soltó un alarido que rompió la quietud de la colonia. Los perros aullaron en respuesta. Las señoras se persignaron. El señor Ramírez, del 4-B, dijo: «Don Beto, ese grito se oyó hasta Texcoco.» Mi padre se rio. Era el cumplido más grande de su vida.", "story-8 ¶4 is George balcony + crate beside");
assert(story8.paragraphs[4] === "Lo que entendí después, mucho después —cuando mi padre ya había muerto y yo daba el grito en mi propia casa, frente a mis hijos—, es que el grito no era nacionalismo. Para mi padre, que ganaba lo justo, que pagaba la renta con esfuerzo, que veía cómo el país se hundía y volvía a flotar, gritar el 15 de septiembre era decir: «Yo todavía estoy aquí. Todavía creo en algo. La vida me costó, pero no me rindo.»", "story-8 ¶5 ES unchanged");
assert(story8.paragraphs[5] === "Mis hijos se ríen cuando yo doy el grito. Dicen que exagero, que parezco loco, que los vecinos van a llamar a la policía. Yo les digo, igual que mi padre me decía: «Algún día lo entenderán. Por ahora, levanten la copa y respondan: ¡Viva México!»", "story-8 ¶6 ES unchanged");
const story8Hay = story8.paragraphs.join("\n");
assert(/cajón de botellas a un lado/.test(story8.paragraphs[3]), "story-8 ¶4 crate sits beside");
assert(/camisa blanca planchada/.test(story8.paragraphs[3]) && /brazo en alto/.test(story8.paragraphs[3]), "story-8 ¶4 white shirt and arm up");
assert(!/se subió a un cajón/.test(story8Hay), "story-8 ¶4 does not climb onto the crate");
assert(!/cajón de cerveza vacío/.test(story8Hay), "story-8 ¶4 is not an empty beer crate");
assert(!/guayabera planchada/.test(story8Hay), "story-8 ¶4 is camisa blanca, not guayabera planchada");
assert(!/tequila en la mano/.test(story8Hay), "story-8 ¶4 has no tequila in hand");
assert(story8.questions[0].prompt === "¿Qué transformación sufría el padre cada 15 de septiembre?" && story8.questions[0].answer === "De cajero tranquilo pasaba a dar el grito más fuerte de la colonia", "story-8 quiz 1 unchanged");
assert(story8.questions[1].prompt === "Según el padre, ¿por qué hay que gritar el 15 de septiembre?" && story8.questions[1].answer === "Porque la independencia costó sangre y no se ganó sola", "story-8 quiz 2 unchanged");
assert(story8.questions[2].prompt === "¿Qué entendió el narrador años después sobre el grito de su padre?" && story8.questions[2].answer === "Era una forma de decir «todavía estoy aquí, todavía creo en algo»", "story-8 quiz 3 unchanged");

const story6 = STORIES.find((s) => s.id === "story-6");
assert(story6.title === "La sirena del Pacífico", "story-6 ES title lock");
assert(story6.subtitle === "Un pueblo de pescadores en Nayarit", "story-6 ES subtitle lock");
assert(story6.paragraphs[0] === "En San Blas, Nayarit, los pescadores zarpan antes del amanecer. Mi abuelo Heriberto fue uno de ellos durante cincuenta años, y juraba —juraba con la mano sobre el pecho, frente a la imagen de la Virgen de Guadalupe— que una madrugada de marzo de 1971 había visto una sirena.", "story-6 ¶1 ES unchanged");
assert(story6.paragraphs[1] === "«No era una historia para niños», me decía cuando yo tenía nueve años y volvía a preguntárselo. «Era de carne, como tú y yo. Cabello negro hasta la cintura, ojos verdes como agua de cenote. Estaba sentada sobre una roca cerca de la Piedra Blanca del Tigre. Cantaba.» Yo le preguntaba qué cantaba. «No lo sé», respondía. «No era español. No era nada. Era el sonido del mar si supiera hablar.»", "story-6 ¶2 ES unchanged");
assert(story6.paragraphs[2] === "Mi padre, que es ingeniero y no cree en sirenas, siempre cambiaba de tema cuando mi abuelo empezaba con esa historia. Pero mi abuela, que sí le creía, agregaba un detalle cada vez que la oía contar. La primera vez fue cabello negro. La segunda, una cola de plata. La tercera, una voz que olía a sal y a tristeza. «No te burles», me advertía cuando yo me reía. «Tu abuelo nunca mentía sobre el mar. Sobre las cartas, sí. Sobre el mar, no.»", "story-6 ¶3 ES unchanged");
assert(story6.paragraphs[3] === "Mi abuelo murió en 2009, a los ochenta y dos años. Heredé sus dos lanchas, su red de pescar camarón y una libreta con una sola entrada, fechada el 17 de marzo de 1971: «Hoy vi algo que no debí ver. No lo escribo aquí porque las letras no son suficientes. Que Dios me perdone si miento, y que Dios me proteja si digo la verdad.»", "story-6 ¶4 ES unchanged");
assert(story6.paragraphs[4] === "El año pasado regresé a San Blas con mi hija de seis años. Salimos en lancha al amanecer, con un pescador amigo de la familia. Mi hija miraba el agua con la calma de los niños que todavía creen en todo. Le conté la historia del bisabuelo y la sirena. Cuando terminé, se quedó pensando un rato y dijo: «Mamá, las sirenas no se ven dos veces. Por eso hay una historia y no diez.»", "story-6 ¶5 is George Mamá");
assert(story6.paragraphs[5] === "No supe qué contestar. Algunos misterios mejoran cuando uno deja de explicarlos. Volvimos al muelle en silencio, escuchando solo el motor y el agua. Tal vez mi abuelo vio una foca. Tal vez vio a una mujer nadando antes del alba. Tal vez vio lo que dijo que vio. Lo único cierto es que, durante cincuenta y un años, mi abuelo cuidó esa historia como otros cuidan un anillo de bodas.", "story-6 ¶6 ES unchanged");
const story6Hay = [...story6.paragraphs, JSON.stringify(story6.glossary), JSON.stringify(story6.questions)].join("\n");
assert(/«Mamá, las sirenas/.test(story6.paragraphs[4]), "story-6 ¶5 hija line is Mamá");
assert(!/«Papá, las sirenas/.test(story6.paragraphs[4]), "story-6 ¶5 hija line is not Papá");
assert(story6.glossary.mamá && story6.glossary.mamá[0] === "mom", "story-6 glossary is mamá");
assert(!story6.glossary.papá, "story-6 glossary drops papá");
assert(!/[Pp]apá/.test(story6Hay), "story-6 has no Papá leftover");
assert(!/\b[Dd]ad\b|\bfather narrator\b/.test(story6Hay), "story-6 quiz/EN has no dad narrator");
assert(story6.questions[0].prompt === "¿Qué afirmaba haber visto el abuelo en marzo de 1971?" && story6.questions[0].answer === "Una sirena sentada sobre una roca", "story-6 quiz 1 unchanged");
assert(story6.questions[1].prompt === "¿Qué encontró el nieto en la libreta del abuelo?" && story6.questions[1].answer === "Una sola entrada fechada el 17 de marzo de 1971", "story-6 quiz 2 unchanged");
assert(story6.questions[2].prompt === "¿Qué dijo la hija del narrador sobre la historia?" && story6.questions[2].answer === "Las sirenas no se ven dos veces — por eso hay una historia y no diez", "story-6 quiz 3 unchanged");

const story9 = STORIES.find((s) => s.id === "story-9");
assert(story9.title === "Las cerezas de don Adán", "story-9 ES title lock");
assert(story9.subtitle === "Café de altura en Chiapas", "story-9 ES subtitle lock");
assert(story9.paragraphs[0] === "Si usted alguna vez se ha tomado un café de Chiapas en una cafetería de Brooklyn —de esos que cuestan seis dólares y vienen con notas de cata escritas con letra cursiva—, es posible que las cerezas que dieron origen a ese café las haya recolectado don Adán Pérez Sántiz, en una ladera a 1,800 metros sobre el nivel del mar, en el municipio tzotzil de San Juan Cancuc.", "story-9 ¶1 ES unchanged");
assert(story9.paragraphs[1] === "Don Adán tiene setenta años, mide un metro cincuenta y cinco y carga cinco kilos de cerezas de café en una canasta de mimbre colgada al pecho durante diez horas al día, seis días a la semana, dos meses al año. Cada cereza la recolecta a mano, una por una, eligiendo solo las que están perfectamente rojas. Las verdes maduran después. Las negras ya pasaron su punto. Una cereza demasiado madura o demasiado verde estropea todo el lote.", "story-9 ¶2 is George setenta");
assert(story9.paragraphs[2] === "Conocí a don Adán en 2019. Mi reportaje era sobre el comercio justo, una etiqueta que aparece en muchas bolsas de café gourmet. Le pregunté qué pensaba del comercio justo. Sonrió con la cortesía que tienen los hombres mayores cuando un periodista urbano les hace una pregunta condescendiente. «Mire, joven. Por cada kilo de café que entrego a la cooperativa, recibo entre quince y veinte pesos. Su café en Brooklyn cuesta seis dólares la taza, ¿no? Eso es como ciento veinte pesos. Una taza usa veinte gramos. Las matemáticas no me favorecen.»", "story-9 ¶3 ES unchanged");
assert(story9.paragraphs[3] === "Aun así, don Adán seguía cosechando, y lo hacía con un orgullo que no admitía lástima. Su café era reconocido. Había ganado dos veces el concurso regional de la taza de excelencia. Una empresa japonesa le había ofrecido comprar su cosecha completa a precio premium, pero él se había negado: «Si vendo todo a una sola empresa, dependo de una sola empresa. Mis abuelos no sobrevivieron quinientos años para que yo regalara mi independencia por un precio mejor.»", "story-9 ¶4 ES unchanged");
assert(story9.paragraphs[4] === "Cuando regresé en 2024, le entregué un libro: el reportaje publicado, con su foto en la portada. Lo hojeó despacio. No sabía leer en español más que con dificultad —su primera lengua es el tzotzil—, pero entendió las imágenes. Se detuvo en una foto donde aparecía sosteniendo una cereza perfectamente roja entre el pulgar y el índice. Sonrió. «Esa», dijo. «Esa era una cereza buena. Las buenas no se olvidan.»", "story-9 ¶5 ES unchanged");
assert(story9.paragraphs[5] === "El cambio climático le preocupa más que los mercados. Las heladas llegan en fechas que antes no llegaban. La roya del café —un hongo— sube cada año a altitudes donde antes no podía. Don Adán cree que en veinte años Chiapas ya no producirá café como lo conocemos. «Pero alguien lo producirá en otra montaña, más alta», dice. «El café siempre encuentra su lugar. Los hombres también.»", "story-9 ¶6 ES unchanged");
const story9Hay = [...story9.paragraphs, JSON.stringify(story9.glossary), JSON.stringify(story9.questions)].join("\n");
assert(/Don Adán tiene setenta años/.test(story9.paragraphs[1]), "story-9 ¶2 opens setenta");
assert(/metro cincuenta y cinco/.test(story9.paragraphs[1]), "story-9 ¶2 keeps height cincuenta y cinco");
assert(!/cincuenta y nueve/.test(story9Hay), "story-9 has no cincuenta y nueve leftover");
assert(!/fifty-nine|fifty nine|59 years/.test(story9Hay), "story-9 has no fifty-nine leftover");
assert(story9.glossary.setenta && story9.glossary.setenta[0] === "seventy", "story-9 glossary stamps setenta");
assert(story9.questions[0].prompt === "¿Cuánto recibe don Adán por cada kilo de café que entrega a la cooperativa?" && story9.questions[0].answer === "Entre quince y veinte pesos", "story-9 quiz 1 unchanged");
assert(story9.questions[1].prompt === "¿Por qué se negó a vender toda su cosecha a una sola empresa japonesa?" && story9.questions[1].answer === "Porque no quería depender de una sola empresa", "story-9 quiz 2 unchanged");
assert(story9.questions[2].prompt === "¿Qué le preocupa más a don Adán que los precios del mercado?" && story9.questions[2].answer === "El cambio climático y la roya del café", "story-9 quiz 3 unchanged");

assert(UNITS[0]?.id === "subj1" && UNITS[0]?.title === "Subjuntivo presente", "first path unit stays Subjuntivo presente");
assert(SECTIONS[0]?.unitIds?.[0] === "subj1", "Camino first unit stays Subjuntivo");
assert(SECTIONS[0]?.title === "Intermedio" && SECTIONS[0]?.titleEn === "Intermediate", "first section is Intermedio, not Sección 1 jargon");
assert(!SECTIONS.some((s) => /Sección/.test(`${s.title}${s.titleEn || ""}`)), "section titles drop Sección N ·");

assert(Array.isArray(TODAY_SCENES) && TODAY_SCENES.length > 0, "TODAY_SCENES missing");
const hoy = TODAY_SCENES[0];
assert(hoy.city === "San Miguel", "Hoy card city must be San Miguel");
assert(hoy.title === "Noche de faroles", "Hoy card title must be Noche de faroles");
assert(hoy.titleEn === "Night of lanterns", "Hoy card titleEn must be Night of lanterns");
assert(hoy.setup === "La plaza se llena de faroles y nadie tiene prisa.", "Hoy card setup lock");
assert(hoy.setupEn === "The plaza fills with lanterns and nobody is in a hurry.", "Hoy card setupEn lock");
const hoyCopy = [hoy.title, hoy.titleEn, hoy.city, hoy.setup, hoy.setupEn, hoy.line, hoy.question, hoy.questionEn].join("\n");
assert(!/parroquia/i.test(hoyCopy), "Hoy card must not mention parroquia");
const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
assert(appSrc.includes("stills/sma-lanterns.png"), "Hoy card still stays sma-lanterns.png");
assert(appSrc.includes("hoyStillFor"), "Hoy still is gated so a mismatched city cannot keep lanterns");
assert(appSrc.includes("${import.meta.env.BASE_URL}lectura/"), "Lectura stills use BASE_URL so Pages /andale/ loads them");
assert(!appSrc.includes("src={`/lectura/"), "Lectura stills must not use root-absolute /lectura/ (breaks Pages)");
const story5Src = appSrc.slice(appSrc.indexOf('id: "story-5"'), appSrc.indexOf('id: "story-6"'));
assert(/Llevo doce años cubriendo la frontera/.test(story5Src), "App.jsx story-5 live copy is current Tijuana");
assert(/Anabel, una madre hondureña/.test(story5Src), "App.jsx story-5 live copy keeps Anabel");
assert(/Roma en el año 50/.test(story5Src), "App.jsx story-5 live copy keeps Roma");
const story3Src = appSrc.slice(appSrc.indexOf('id: "story-3"'), appSrc.indexOf('id: "story-4"'));
assert(/El hijo del Rey Tigre/.test(story3Src), "App.jsx story-3 live title is El hijo del Rey Tigre");
assert(/Joaquín Méndez de Tlalnepantla/.test(story3Src), "App.jsx story-3 live copy keeps Joaquín Méndez");
assert(/Mi madre las cosía a mano/.test(story3Src), "App.jsx story-3 live copy keeps mother sewing");
assert(/perdió la máscara/.test(story3Src) && /Vimos su cara por primera vez/.test(story3Src), "App.jsx story-3 live copy keeps mask-loss");
assert(/Tigre Joven/.test(story3Src) && /plateada con detalles azules/.test(story3Src), "App.jsx story-3 live copy keeps Tigre Joven debut");
const story7Src = appSrc.slice(appSrc.indexOf('id: "story-7"'), appSrc.indexOf('id: "story-8"'));
assert(/Don Pepe, el más joven/.test(story7Src) && /Don Pepe ganó/.test(story7Src), "App.jsx story-7 live copy is Pepe");
assert(!/\bTito\b/.test(story7Src), "App.jsx story-7 live copy has no Tito");
const story8Src = appSrc.slice(appSrc.indexOf('id: "story-8"'), appSrc.indexOf('id: "story-9"'));
assert(/cajón de botellas a un lado/.test(story8Src), "App.jsx story-8 ¶4 is balcony + crate beside");
assert(/camisa blanca planchada/.test(story8Src) && /brazo en alto/.test(story8Src), "App.jsx story-8 ¶4 is white shirt and arm up");
assert(!/se subió a un cajón/.test(story8Src), "App.jsx story-8 live copy does not climb onto the crate");
assert(!/cajón de cerveza vacío/.test(story8Src), "App.jsx story-8 live copy drops the empty beer crate");
const story6Src = appSrc.slice(appSrc.indexOf('id: "story-6"'), appSrc.indexOf('id: "story-7"'));
assert(/«Mamá, las sirenas/.test(story6Src), "App.jsx story-6 live copy is Mamá");
assert(!/«Papá, las sirenas/.test(story6Src), "App.jsx story-6 live copy has no Papá on the hija line");
assert(!/\bpapá:/.test(story6Src), "App.jsx story-6 glossary is not papá");
const story9Src = appSrc.slice(appSrc.indexOf('id: "story-9"'), appSrc.indexOf("const STORY_EXTRAS"));
assert(/Don Adán tiene setenta años/.test(story9Src), "App.jsx story-9 live copy is setenta");
assert(!/cincuenta y nueve/.test(story9Src), "App.jsx story-9 live copy has no cincuenta y nueve");
assert(!/fifty-nine|fifty nine|59 years/.test(story9Src), "App.jsx story-9 live copy has no fifty-nine");
assert(hoyStillFor(hoy) === LANTERN_STILL, "San Miguel / Noche de faroles keeps the lantern still");
const sceneIds = new Set();
for (const sc of TODAY_SCENES) {
  assert(sc.id && typeof sc.id === "string", "scene missing id");
  assert(!sceneIds.has(sc.id), `duplicate scene id ${sc.id}`);
  sceneIds.add(sc.id);
  assert(sc.title && String(sc.title).trim(), `${sc.id}: title`);
  assert(sc.line && String(sc.line).trim(), `${sc.id}: line`);
  assert(sc.question && String(sc.question).trim(), `${sc.id}: question`);
  assert(Array.isArray(sc.answers) && sc.answers.some((a) => String(a || "").trim()), `${sc.id}: answers`);
  assert(Array.isArray(sc.choices) && sc.choices.length > 0, `${sc.id}: choices`);
  assert(sc.answer != null && String(sc.answer).trim(), `${sc.id}: answer`);
  if (sc.storyId) assert(storyIds.has(sc.storyId), `${sc.id}: storyId ${sc.storyId}`);
  if (Array.isArray(sc.units)) assert(sc.units.every((id) => unitIds.has(id)), `${sc.id}: units`);
  const wired = hoyStillFor(sc);
  if (wired) {
    const hay = `${sc.city || ""} ${sc.title || ""} ${sc.titleEn || ""}`;
    assert(/san miguel/i.test(hay) && /farol|lantern/i.test(hay), `${sc.id}: still must match city/title (got ${wired} for ${hay})`);
  } else {
    assert(hoyStillFor({ ...sc, still: LANTERN_STILL }) === null, `${sc.id}: lantern still must not attach to a non-lantern city`);
  }
}

const GREETINGS = Function(`"use strict"; return (${extractConst(appSrc, "GREETINGS")});`)();
assert(Array.isArray(GREETINGS.es) && GREETINGS.es.length === 5, "GREETINGS.es lock");
assert(GREETINGS.es[0] === "Español mexicano real: cuentos, misiones y un empujón que pega.", "GREETINGS.es[0]");
assert(GREETINGS.es[1] === "Luna ya tiene tu rutina de hoy.", "GREETINGS.es[1]");
assert(GREETINGS.es[2] === "Don Rafa te guardó un cuento con palabras que valen.", "GREETINGS.es[2]");
assert(GREETINGS.es[3] === "Valeria dice que la precisión es un gesto de cariño.", "GREETINGS.es[3]");
assert(GREETINGS.es[4] === "Cinco minutos. Español de verdad. Nada de turista.", "GREETINGS.es[4]");
assert(GREETINGS.en[0] === "Build real Mexican Spanish through stories, challenges, and sharp feedback.", "EN greetings stay English");
assert(GREETINGS.en[1] === "Luna has your daily routine ready.", "EN greetings stay English");
assert(GREETINGS.en[2] === "Don Rafa saved you a story with words worth keeping.", "EN greetings stay English");
assert(GREETINGS.en[3] === "Valeria says precision is a kindness.", "EN greetings stay English");
assert(GREETINGS.en[4] === "Five minutes. Real Spanish. No tourist mode.", "EN greetings stay English");

const UI = Function(`"use strict"; return (${extractConst(appSrc, "UI")});`)();
assert(UI.es.cards === "Tarjetas", "UI.es.cards");
assert(UI.es.dialogueDuel === "DUELO", "UI.es.dialogueDuel");
assert(UI.es.duel === "Duelo", "UI.es.duel");
assert(UI.es.flashTitle === "Tarjetas", "UI.es.flashTitle");
assert(UI.es.saveCard === "Guardar tarjeta", "UI.es.saveCard");
assert(UI.es.emptyDeck === "Todavía no hay tarjetas", "UI.es.emptyDeck");
assert(UI.es.emptyDeckDesc === "Abre un cuento, toca una palabra que te frena, y guárdala con su frase.", "UI.es.emptyDeckDesc");
assert(UI.es.goReading === "Ir a Lectura", "UI.es.goReading");
assert(UI.es.goReading === `Ir a ${UI.es.reading}`, "ES empty-deck go matches Lectura tab");
assert(UI.en.emptyDeck === "No cards yet", "UI.en.emptyDeck");
assert(UI.en.emptyDeckDesc === "Open a story, tap a word that stops you, and save it with its line.", "UI.en.emptyDeckDesc");
assert(UI.en.goReading === `Go to ${UI.en.reading}`, "EN empty-deck go matches tab chrome");
assert(UI.en.goReading !== "Go to Reading" || UI.en.reading === "Reading", "EN go is not Reading unless the tab says Reading");
assert(UI.es.storyTip === "Lee el párrafo. Toca una palabra solo si te frena.", "UI.es.storyTip");
assert(UI.en.storyTip === "Read the paragraph. Tap a word only if it stops you.", "UI.en.storyTip");
assert(UI.es.wordOrderTip === "Orden distinto, mismo sentido. En formal, ambas valen.", "UI.es.wordOrderTip");
assert(UI.en.wordOrderTip === "Different order, same meaning. Formally, both work.", "UI.en.wordOrderTip");
assert(appSrc.includes("{L.wordOrderTip}"), "word-order tip uses L.wordOrderTip");
assert(appSrc.includes("data-testid=\"word-order-tip\""), "word-order tip is testable");
assert(appSrc.includes("data-testid=\"phrase-doctor-guess\""), "Phrase Doctor guess is testable");
assert(appSrc.includes("phrase-doctor-miss"), "accepted alternate miss stays visible");
assert(appSrc.includes("data-testid=\"word-order-miss\""), "lesson miss stays visible before the tip");
const doctorChunk = appSrc.slice(appSrc.indexOf("phrase-doctor-board"), appSrc.indexOf("phrase-doctor-fix"));
assert(doctorChunk.includes("phrase-doctor-miss"), "Doctora miss is on the board");
assert(doctorChunk.indexOf("phrase-doctor-miss") < doctorChunk.indexOf("word-order-tip"), "Doctora tip card is AFTER the accepted miss");
assert(/word-order-miss[\s\S]{0,400}word-order-tip/.test(appSrc), "lesson tip card is AFTER the accepted miss");
assert(appSrc.includes("gradeListedPhrase"), "listed equivalents grade before hard fail");
const splashChunk = appSrc.slice(appSrc.indexOf('data-testid="splash"'), appSrc.indexOf('data-testid="splash"') + 1800);
assert(!/wordOrderTip|word-order-tip/.test(splashChunk), "word-order tip is not on splash");
const paywallChunk = appSrc.slice(appSrc.indexOf('data-testid="soft-paywall"'), appSrc.indexOf('data-testid="soft-paywall"') + 1800);
assert(!/wordOrderTip|word-order-tip/.test(paywallChunk), "word-order tip is not on paywall");
assert(!/data-testid="word-order-tip"[\s\S]{0,180}position:\s*["']?fixed/.test(appSrc), "word-order tip is not a blocking modal");
assert(UI.es.noPatterns === "Todavía no hay un mapa. Juega una misión o falla con estilo — entonces aparece.", "UI.es.noPatterns");
assert(UI.en.noPatterns === "No map yet. Play a mission or miss with style — then it shows up.", "UI.en.noPatterns");
assert(UI.es.inDeck === "Ya guardada", "UI.es.inDeck");
assert(UI.es.flashDone === "¡Terminaste las tarjetas!", "UI.es.flashDone");
assert(UI.en.flashDone === "You finished the cards!", "UI.en.flashDone");
assert(!/Deck|listas/i.test(UI.es.flashDone), "ES done-deck is not Deck / listas");
assert(!/Deck/i.test(UI.en.flashDone), "EN done-deck is not Deck");
assert(UI.es.dailyWorkout === "Rutina diaria", "UI.es.dailyWorkout");
assert(UI.en.dailyWorkout === "Daily routine", "UI.en.dailyWorkout");
assert(UI.es.workoutDone === "Rutina hecha", "UI.es.workoutDone");
assert(UI.en.workoutDone === "Routine done", "UI.en.workoutDone");
assert(UI.es.workoutToday === "Rutina de hoy", "UI.es.workoutToday");
assert(UI.en.workoutToday === "Today's routine", "UI.en.workoutToday");
assert(appSrc.includes("showLevelTheater"), "level theater is gated");
assert(/\[\[0, "Intermedio"\]/.test(appSrc), "floor level is Intermedio");
assert(!/\[\[0, "Principiante"\]/.test(appSrc), "floor level is not Principiante");
assert(appSrc.includes("const DEFAULT_UI_LANG = \"en\""), "cold-open default uiLang is EN");
assert(appSrc.includes('lang === "en" && name === "Intermedio" ? "Intermediate"'), "EN floor level is Intermediate");
const LEVELS = Function(`"use strict"; return (${extractConst(appSrc, "LEVELS")});`)();
assert(LEVELS[0][0] === 0 && LEVELS[0][1] === "Intermedio", "LEVELS floor name is Intermedio");
assert(!LEVELS.some(([, name]) => name === "Principiante"), "LEVELS has no Principiante");
assert(appSrc.includes("showWeaknessMap"), "empty weakness map is gated");
assert(appSrc.includes("showAtajos"), "Atajos theater is gated");
assert(UI.es.comeBackTomorrow === "Vuelve mañana por la siguiente escena.", "UI.es.comeBackTomorrow generic fallback");
assert(UI.en.comeBackTomorrow === "Come back tomorrow for the next scene.", "UI.en.comeBackTomorrow generic fallback");
const nextHoy = hoySceneForDay(TODAY_SCENES, nextDayKey("2026-09-04"));
assert(nextHoy?.title === "WhatsApp del vecino", "tomorrow Hoy on 2026-09-05 is WhatsApp del vecino (day-hash 9 scenes)");
assert(nextHoy?.titleEn === "Neighbor WhatsApp", "EN tomorrow Hoy on 2026-09-05 is Neighbor WhatsApp (day-hash 9 scenes)");
assert(comeBackTomorrowLine({ lang: "es", nextTitle: nextHoy.title }) === "Vuelve mañana por «WhatsApp del vecino».", "George ES teaser lock: Vuelve mañana por «{title}».");
assert(comeBackTomorrowLine({ lang: "en", nextTitle: nextHoy.titleEn }) === "Come back tomorrow for “Neighbor WhatsApp”.", "George EN teaser lock: Come back tomorrow for “{title}”.");
assert(comeBackTomorrowLine({ lang: "es" }) === UI.es.comeBackTomorrow, "ES teaser falls back when title unknown");
assert(comeBackTomorrowLine({ lang: "en", nextTitle: "" }) === UI.en.comeBackTomorrow, "EN teaser falls back when title unknown");
assert(appSrc.includes("comeBackTomorrowLine"), "Camino teaser uses comeBackTomorrowLine");
assert(appSrc.includes("showLearnComeBackTeaser"), "Learn teaser hides while Hoy is still the next beat");
assert(appSrc.includes("isDay2Return"), "day-2 return gate is wired");
assert(appSrc.includes("showColdPitch"), "cold pitch is gated off the return door");
const teaserOpen = appSrc.match(/<p data-testid="come-back-tomorrow"[^>]*>/);
assert(teaserOpen, "George lock: teaser is a <p>, not a CTA");
assert(teaserOpen[0].startsWith("<p "), "teaser opens as a paragraph");
assert(!/<button[^>]*come-back-tomorrow/.test(appSrc), "teaser is not a <button>");
assert(!/come-back-tomorrow[^>]*\brole=["']button/.test(appSrc), "teaser has no role=button");
assert(!/come-back-tomorrow[^>]*\bonClick/.test(appSrc), "teaser has no onClick");
assert(!/come-back-tomorrow[^>]*cursor:\s*["']?pointer/.test(appSrc), "teaser has no pointer cursor");
assert(/come-back-tomorrow[^>]*pointerEvents:\s*["']none/.test(appSrc), "teaser is not a tap target");
assert(!/come-back-tomorrow[^>]*borderBottom:\s*`4px/.test(appSrc), "teaser has no pressable 4px chrome");
assert(!/come-back-tomorrow[^>]*border:\s*`2px solid/.test(appSrc), "teaser has no card border");
assert(/learn-hub-tiles[\s\S]{0,4200}\{showLine && \(\s*<p data-testid="come-back-tomorrow"/.test(appSrc), "titled teaser sits outside the equal hub grid — not a CTA");
assert(appSrc.includes("hoySceneForDay"), "Hoy day pick is shared");
assert(appSrc.includes("nextDayKey(todayKey)"), "tomorrow Hoy uses the same day hash");
assert(UI.es.paywallHeadline === "Sigue con tu racha", "UI.es.paywallHeadline George lock");
assert(UI.es.paywallBody === "Escenas, Cubetas y la doctora — sin techo.", "UI.es.paywallBody George lock");
assert(UI.es.paywallAnnual === "Un año", "UI.es.paywallAnnual George lock — no price in the label");
assert(UI.es.paywallMonthly === "Un mes", "UI.es.paywallMonthly George lock");
assert(UI.es.paywallHonesty === "Práctica · sin cobro todavía", "UI.es.paywallHonesty existing Coin display");
assert(UI.es.paywallDismiss === "Seguir gratis", "UI.es.paywallDismiss George lock");
assert(UI.en.paywallHeadline === "Keep your streak", "UI.en.paywallHeadline George lock");
assert(UI.en.paywallBody === "Stories, Cubetas, and Phrase Doctor — no ceiling.", "UI.en.paywallBody George lock");
assert(UI.en.paywallAnnual === "One year", "UI.en.paywallAnnual George lock — no price in the label");
assert(UI.en.paywallMonthly === "One month", "UI.en.paywallMonthly George lock");
assert(UI.en.paywallHonesty === "Practice · no charge yet", "UI.en.paywallHonesty existing Coin display");
assert(UI.en.paywallDismiss === "Continue free", "UI.en.paywallDismiss George lock");
assert(!/\$39\.99|\$6\.99/.test(UI.es.paywallAnnual + UI.es.paywallMonthly + UI.en.paywallAnnual + UI.en.paywallMonthly), "CTA labels do not bake Coin prices");
assert(UI.es.perfectLesson === "Lección perfecta — +5 XP", "UI.es.perfectLesson chrome bank");
assert(UI.en.perfectLesson === "Perfect lesson — +5 XP", "UI.en.perfectLesson chrome bank");
assert(!/bonus/i.test(UI.es.perfectLesson + UI.en.perfectLesson), "Perfect lesson kills bonus / bonus +5 XP");
assert(!/\+5 XP extra/.test(UI.es.perfectLesson), "ES Perfect lesson is not +5 XP extra");
const SMART_FOCI = Function(`"use strict"; return (${extractConst(appSrc, "SMART_FOCI")});`)();
const mexFocus = SMART_FOCI.find((f) => f.id === "mex");
assert(mexFocus.title.es === "Mexicanismos", "Mexicanismos unit title ES chrome bank");
assert(mexFocus.title.en === "Mexicanisms", "Mexicanismos unit title EN chrome bank");
assert(mexFocus.desc.es === "Frases que suenan de México, no de libro.", "Mexicanismos desc ES stays");
assert(mexFocus.desc.en === "Phrases that sound Mexican, not textbook-ish.", "Mexicanismos desc EN stays");
assert(!/Mexicanismos útiles|Useful Mexicanisms/.test(appSrc), "útiles / Useful Mexicanisms chrome is gone");
assert(UI.es.a2hsTitle === "Agrega Ándale a tu pantalla de inicio", "UI.es.a2hsTitle George lock");
assert(UI.es.a2hsHow === "Toca Compartir, luego «Agregar a pantalla de inicio».", "UI.es.a2hsHow George lock");
assert(UI.es.a2hsDismiss === "Ahora no", "UI.es.a2hsDismiss George lock");
assert(UI.en.a2hsTitle === "Add Ándale to your Home Screen", "UI.en.a2hsTitle George lock");
assert(UI.en.a2hsHow === "Tap Share, then Add to Home Screen.", "UI.en.a2hsHow George lock");
assert(UI.en.a2hsDismiss === "Not now", "UI.en.a2hsDismiss George lock");
assert(appSrc.includes("{L.a2hsTitle}"), "A2HS title uses L.a2hsTitle");
assert(appSrc.includes("{L.a2hsHow}"), "A2HS how uses L.a2hsHow");
assert(appSrc.includes("{L.a2hsDismiss}"), "A2HS dismiss uses L.a2hsDismiss");
assert(appSrc.includes("data-testid=\"a2hs-sheet\""), "A2HS sheet is testable");
assert(appSrc.includes("shouldShowA2hsSheet"), "A2HS uses the iOS Safari gate");
assert(appSrc.includes("a2hsDisplayEnv"), "A2HS reads navigator via a2hsDisplayEnv");
assert(appSrc.includes("a2hsSeen"), "A2HS seen flag is persisted");
const a2hsSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "a2hs.js"), "utf8");
assert(a2hsSrc.includes("maxTouchPoints"), "iPad desktop-mode uses maxTouchPoints");
assert(a2hsSrc.includes("MacIntel"), "iPad desktop-mode uses MacIntel platform");
assert(a2hsSrc.includes("isIpadDesktopSafari"), "iPad desktop-mode helper is wired");
assert(/maxTouchPoints/.test(a2hsSrc) && /Macintosh/.test(a2hsSrc), "desktop-mode iPad is Macintosh UA + touch");
assert(appSrc.includes("setA2hsSheet"), "A2HS sheet is session state");
const a2hsChunk = appSrc.slice(appSrc.indexOf('data-testid="a2hs-sheet"'), appSrc.indexOf('data-testid="a2hs-sheet"') + 1600);
assert(a2hsChunk.includes("{L.a2hsTitle}"), "A2HS sheet title is L.a2hsTitle");
assert(a2hsChunk.includes("{L.a2hsHow}"), "A2HS sheet how is L.a2hsHow");
assert(a2hsChunk.includes("{L.a2hsDismiss}"), "A2HS sheet dismiss is L.a2hsDismiss");
assert(!/\$39\.99|\$6\.99|paywallAnnual|paywallMonthly/.test(a2hsChunk), "A2HS is not a second paywall");
assert(!/setPostDismissHandoff\(false\)/.test(a2hsChunk), "A2HS dismiss does not wipe Doctora handoff");
assert(appSrc.includes("setPostDismissHandoff(true)"), "free dismiss still arms Doctora handoff");
assert(appSrc.includes("{L.paywallHonesty}"), "paywall honesty uses L.paywallHonesty");
assert(appSrc.includes("data-testid=\"soft-paywall-honesty\""), "paywall honesty is testable");
assert(appSrc.includes("{L.perfectLesson}"), "Perfect lesson chrome uses L.perfectLesson");
assert(appSrc.includes("data-testid=\"perfect-lesson\""), "Perfect lesson chrome is testable");
assert(!/Perfect lesson — bonus/.test(appSrc), "EN Perfect lesson bonus chrome is gone");
assert(!/Lección perfecta — \+5 XP extra/.test(appSrc), "ES Perfect lesson extra chrome is gone");
const paywallLayout = appSrc.slice(appSrc.indexOf('data-testid="soft-paywall"'), appSrc.indexOf("A2HS:"));
assert(/<Btn data-testid="soft-paywall-annual"/.test(paywallLayout), "annual is a filled Btn");
assert(!/<Btn outline data-testid="soft-paywall-annual"/.test(paywallLayout), "annual is not outline");
assert((paywallLayout.match(/<Btn(?! outline)/g) || []).length === 1, "annual is the sole filled Btn on the wall");
assert(/<Btn outline color=\{MARK_INK\} data-testid="soft-paywall-monthly"/.test(paywallLayout), "monthly is the secondary outline Btn");
assert(!/<Btn outline data-testid="soft-paywall-dismiss"/.test(paywallLayout), "continue free is not an outline Btn");
assert(/<button type="button" data-testid="soft-paywall-dismiss"/.test(paywallLayout), "continue free stays a quiet tap target");
assert(/soft-paywall-dismiss[\s\S]{0,280}padding:\s*["']11px 0/.test(paywallLayout), "continue free quiet text has ~44px tap padding");
assert(!/soft-paywall-dismiss[\s\S]{0,280}padding:\s*["']2px 0/.test(paywallLayout), "continue free is not the 2px tap target");
assert(/soft-paywall-dismiss[\s\S]{0,280}background:\s*["']none/.test(paywallLayout), "continue free is quiet text");
assert(/soft-paywall-dismiss[\s\S]{0,280}border:\s*["']none/.test(paywallLayout), "continue free has no button chrome");
assert(!/soft-paywall-dismiss[\s\S]{0,280}borderBottom:\s*`4px/.test(paywallLayout), "continue free has no 4px press chrome");
assert(!/soft-paywall-dismiss[\s\S]{0,280}duo-btn/.test(paywallLayout), "continue free is not a duo-btn");
assert(paywallLayout.indexOf("soft-paywall-cenzontle") < paywallLayout.indexOf("soft-paywall-headline"), "one static Cenzontle sits above the title");
assert(paywallLayout.indexOf("soft-paywall-headline") < paywallLayout.indexOf("soft-paywall-body"), "title sits above the benefit");
assert(paywallLayout.indexOf("soft-paywall-annual") < paywallLayout.indexOf("soft-paywall-monthly"), "monthly sits under annual");
assert(paywallLayout.indexOf("soft-paywall-monthly") < paywallLayout.indexOf("soft-paywall-honesty"), "honesty stays under both plans");
assert(paywallLayout.indexOf("soft-paywall-honesty") < paywallLayout.indexOf("soft-paywall-dismiss"), "dismiss stays under honesty");
assert(/<LogoMark size=\{44\} data-testid="soft-paywall-cenzontle"/.test(paywallLayout), "static Cenzontle is the gate mark");
assert(!/<PaywallFlyAway/.test(paywallLayout), "paywall does not mount the fly-away");
assert(!/paywall-fly|soft-paywall-cenzontle-wing|@keyframes/.test(paywallLayout), "paywall bird does not animate");
assert((paywallLayout.match(/<LogoMark/g) || []).length === 1, "paywall has one static Cenzontle");
assert(appSrc.includes("from \"./PaywallFlyAway.jsx\""), "free win still imports the fly-away");
assert(!/WinPerch|WinBounce|Story0Beat|win-bounce|story-0-beat|780ms|cenzontle-courier|story0Courier/.test(paywallLayout), "paywall does not replay the 780ms beat");
assert(!/scaleX\s*\(\s*-1\s*\)/.test(paywallLayout), "paywall Cenzontle stays right-facing");
assert(!/Confetti|coach-strip|coach jump/.test(paywallLayout), "no confetti / coach crowd inside the modal");
assert(/data-testid="soft-paywall-card"/.test(paywallLayout), "paywall card is testable");
assert(/background:\s*HUB_CREAM/.test(paywallLayout), "paywall card uses Learn home HUB_CREAM");
assert(!/theme === "dark" \? D\.card : HUB_CREAM/.test(paywallLayout), "paywall card does not fall back to D.card white");
assert(!/soft-paywall-card[\s\S]{0,220}D\.card/.test(paywallLayout), "paywall card does not read D.card");
assert(!/soft-paywall-card[\s\S]{0,220}(#fff|#FFFFFF)/.test(paywallLayout), "paywall card kills pure white");
assert(/soft-paywall-monthly[\s\S]{0,160}background:\s*HUB_CREAM/.test(paywallLayout), "monthly outline sits on cream, not #fff");
assert(appSrc.includes('const HUB_CREAM = "#F6EFE4"'), "Learn home surface cream is #F6EFE4");
assert(/learn-hub[\s\S]{0,220}HUB_CREAM/.test(appSrc), "Learn home uses HUB_CREAM");
assert(/MARK_INK/.test(paywallLayout), "paywall accents stay sage");
assert(!/learn-hub-tiles[\s\S]{0,80}soft-paywall/.test(appSrc), "paywall chrome does not creep onto hub tiles");
assert(appSrc.includes("first-door-alt"), "Doctora first-door-alt stays on home");
assert(appSrc.includes("post-dismiss-handoff"), "post-dismiss Doctora handoff is testable");
assert(appSrc.includes("showPostDismissHandoff"), "post-dismiss handoff uses the same-session gate");
assert(appSrc.includes("setPostDismissHandoff"), "post-dismiss handoff is session state");
assert(appSrc.includes("shouldShowSoftPaywall"), "soft paywall uses first-win gate");
assert(appSrc.includes("continueFromWin"), "Hoy CONTINUE lands on home with come-back");
assert(appSrc.includes("soft-paywall"), "soft paywall is wired");
assert(appSrc.includes("paywallSeen"), "paywall seen flag is persisted");
assert(appSrc.includes("unlockedPrem"), "App still reads unlockedPrem after a real purchase");
const purchaseSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "purchase.js"), "utf8");
assert(purchaseSrc.includes("paywallPlan") && purchaseSrc.includes("unlockedPrem"), "success write lives in purchase.js");
assert(purchaseSrc.includes("emitFunnelEvent"), "purchase success uses the local funnel bus");
assert(purchaseSrc.split("FUNNEL_EVENTS.purchase").length - 1 === 1, "funnel purchase has one call site");
const purchaseSuccess = purchaseSrc.slice(purchaseSrc.indexOf('if (status === "success")'), purchaseSrc.indexOf("const reason = result?.reason"));
assert(purchaseSuccess.includes("FUNNEL_EVENTS.purchase"), "StoreKit success emits funnel purchase");
assert(!purchaseSrc.slice(purchaseSrc.indexOf("const reason = result?.reason")).includes("FUNNEL_EVENTS.purchase"), "failure and restore do not emit funnel purchase");
assert(appSrc.includes("requestPurchase"), "annual/monthly CTAs go through requestPurchase");
assert(appSrc.includes("buySoftPaywall"), "paywall CTAs call buySoftPaywall");
assert(appSrc.includes("progressAfterPurchaseSuccess"), "success is the only unlock write");
assert(!/dismissSoftPaywall\("annual"\)/.test(appSrc), "annual is not a local fake dismiss");
assert(!/dismissSoftPaywall\("monthly"\)/.test(appSrc), "monthly is not a local fake dismiss");
assert(appSrc.includes("setSoftPaywall"), "soft paywall opens from a hook");
assert(!/else if \(prog\.paywallSeen\) setSoftPaywall\(false\)/.test(appSrc), "paywall clears when the gate is false, not only when seen");
assert(!/\|\| \(softPaywall && !prog\.paywallSeen/.test(appSrc), "stale softPaywall cannot keep the modal after the gate closes");
assert(!/stripe\.com|@stripe|RevenueCat/.test(appSrc), "no Stripe/RevenueCat on the wall");
assert(!/Enroll|enroll/.test(paywallLayout), "paywall has no Enroll CTA");
assert(IAP_PRODUCTS.annual === "com.andale.app.premium.annual", "annual stub id is documented for Coin");
assert(IAP_PRODUCTS.monthly === "com.andale.app.premium.monthly", "monthly stub id is documented for Coin");
assert(!/\$39\.99|\$6\.99/.test(JSON.stringify(IAP_PRODUCTS)), "product stubs do not invent Coin prices");
assert(PURCHASE_EVENT === "andale-purchase", "purchase event name is stable");
assert(WEB_NO_IAP_REASON === "web_no_iap", "web no-charge reason is stable");
assert(appSrc.includes("from \"./purchase.js\""), "App imports the purchase module");
assert(FUNNEL_EVENT === "andale-funnel", "funnel CustomEvent name is stable");
assert(FUNNEL_LOG === "__andaleFunnelLog", "Pages reads window.__andaleFunnelLog");
assert(FUNNEL_EVENTS.open === "open", "funnel open name");
assert(FUNNEL_EVENTS.cenzontleComplete === "cenzontle_complete", "funnel bird-complete name");
assert(FUNNEL_EVENTS.lecturaStart === "lectura_start", "funnel lectura name");
assert(FUNNEL_EVENTS.paywallSeen === "paywall_seen", "funnel paywall-seen name");
assert(FUNNEL_EVENTS.paywallTap === "paywall_tap", "funnel paywall-tap name");
assert(FUNNEL_EVENTS.waitlistSubmit === "waitlist_submit", "funnel waitlist-submit name");
assert(FUNNEL_EVENTS.purchase === "purchase", "funnel purchase name");
assert(PAYWALL_TAP.continueFree === "continue_free", "continue-free tap is continue_free");
assert(appSrc.includes("from \"./funnel.js\""), "App imports the funnel module");
assert(appSrc.includes("emitFunnelEvent({ event: FUNNEL_EVENTS.open })"), "open fires on App mount");
assert(appSrc.includes("completeCenzontleBeat"), "bird beat finish is a named handler");
assert(appSrc.includes("onComplete={completeCenzontleBeat}"), "fly-away / WinBounce finish emit cenzontle_complete");
assert(appSrc.includes("FUNNEL_EVENTS.cenzontleComplete"), "cenzontle_complete is wired");
assert(appSrc.includes("FUNNEL_EVENTS.lecturaStart"), "lectura_start is wired");
assert(appSrc.includes("openStory") && appSrc.includes("FUNNEL_EVENTS.lecturaStart"), "lectura_start fires from openStory");
assert(appSrc.includes("FUNNEL_EVENTS.paywallSeen"), "paywall_seen is wired");
assert(/if \(showSoftPaywall\) \{\s*setSoftPaywall\(true\);\s*emitFunnelEvent\(\{ event: FUNNEL_EVENTS\.paywallSeen \}\);/.test(appSrc), "paywall_seen fires when the wall becomes visible");
assert(appSrc.includes("FUNNEL_EVENTS.paywallTap"), "paywall_tap is wired");
assert(appSrc.includes("emitFunnelEvent({ event: FUNNEL_EVENTS.paywallTap, choice: plan })"), "annual/monthly taps emit paywall_tap");
assert(appSrc.includes("PAYWALL_TAP.continueFree"), "continue-free tap is labeled continue_free");
assert(/if \(!fromBackdrop\) \{\s*emitFunnelEvent\(\{ event: FUNNEL_EVENTS\.paywallTap, choice: PAYWALL_TAP\.continueFree \}\);/.test(appSrc), "continue-free tap emits only from the quiet CTA, not the backdrop");
assert(WAITLIST_PROMPT.es === "Avísame cuando abramos la tienda" && WAITLIST_PROMPT.en === "Tell me when the store opens", "waitlist prompt George lock");
assert(WAITLIST_PLACEHOLDER.es === "Tu correo" && WAITLIST_PLACEHOLDER.en === "Your email", "waitlist placeholder George lock");
assert(WAITLIST_CTA.es === "Avisarme" && WAITLIST_CTA.en === "Notify me", "waitlist CTA George lock");
assert(WAITLIST_SUCCESS.es === "Listo. Te escribo cuando esté listo." && WAITLIST_SUCCESS.en === "Got it. I’ll write when it’s ready.", "waitlist success George lock");
assert(WAITLIST_ERROR.es === "Revisa el correo" && WAITLIST_ERROR.en === "Check the email", "waitlist error George lock");
assert(WAITLIST_PRIVACY.es === "Solo para el aviso de apertura. Sin spam." && WAITLIST_PRIVACY.en === "Launch notice only. No spam.", "waitlist privacy George lock");
assert(waitlistPrompt("en") === WAITLIST_PROMPT.en && waitlistPrompt("es") === WAITLIST_PROMPT.es, "waitlist prompt follows uiLang");
assert(waitlistPlaceholder("en") === WAITLIST_PLACEHOLDER.en && waitlistCta("es") === WAITLIST_CTA.es, "waitlist field and CTA follow uiLang");
assert(waitlistSuccess("en") === WAITLIST_SUCCESS.en && waitlistError("es") === WAITLIST_ERROR.es && waitlistPrivacy("en") === WAITLIST_PRIVACY.en, "waitlist notes follow uiLang");
assert(WAITLIST_PRIVACY_URL === "https://gildernew-max.github.io/andale/privacy.html", "waitlist privacy URL is the ASC page if linked");
assert(!appSrc.includes("<WaitlistStrip"), "waitlist strip is off the app");
assert(!appSrc.includes("from \"./WaitlistStrip.jsx\""), "waitlist strip component is not mounted");
assert(!appSrc.includes("shouldShowFreePathWaitlist"), "hub no longer gates the waitlist strip");
assert(!/Tell me when the store opens|Avísame cuando abramos la tienda|I’ll write when it’s ready|Te escribo cuando esté listo/.test(appSrc), "waitlist promise is off the app");
assert(/<a data-testid="soft-paywall-restore"/.test(paywallLayout), "restore is a text link");
assert(!/<button[^>]*data-testid="soft-paywall-restore"/.test(paywallLayout), "restore is not a button");
const funnelSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "funnel.js"), "utf8");
assert(funnelSrc.includes(FUNNEL_LOG), "funnel module names the Pages log");
assert(!/\bgtag\b|\bmixpanel\b|\bamplitude\b|\bplausible\b|\bposthog\b|analytics\.js|googletagmanager|cdn\.segment\.com/i.test(appSrc + funnelSrc), "no third-party analytics SDK");
assert(!/fetch\(|sendBeacon|XMLHttpRequest/.test(funnelSrc + purchaseSrc), "funnel and purchase stay on device");
assert(!/nameDraft|prog\.name|deviceId|device_id|user_id/.test(funnelSrc), "funnel module never reads PII fields");
assert(!/\$39\.99|\$6\.99|\$99/.test(funnelSrc), "funnel module does not invent prices");
assert(!/Enroll|enroll/.test(funnelSrc), "funnel module does not touch Enroll");
const iapSwift = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "ios", "App", "App", "AndaleIapPlugin.swift"), "utf8");
assert(iapSwift.includes("Product.products"), "native plugin uses StoreKit 2 Product");
assert(iapSwift.includes("product.purchase()"), "native plugin purchases via StoreKit 2");
assert(iapSwift.includes("jsName = \"AndaleIap\""), "native plugin jsName matches registerPlugin");
assert(!/\$39\.99|\$6\.99/.test(iapSwift), "Swift does not invent Coin prices");
assert(UI.es.hoyWin === "¡Eso!", "UI.es.hoyWin first-Hoy lock");
assert(UI.en.hoyWin === "That's it.", "UI.en.hoyWin first-Hoy lock");
assert(UI.es.sessionClose === "Listo", "George lock: session-close dismiss is Listo");
assert(UI.en.sessionClose === "Done", "George lock: session-close dismiss is Done");
assert(!/Cerrar|Continuar|Ya está|Vale|Listos|Cerrar sesión/.test(UI.es.sessionClose), "ES dismiss is not a soft synonym");
assert(!/Close|Continue|All set|That's all|Ready|Finish/.test(UI.en.sessionClose), "EN dismiss is not a soft synonym");
assert(appSrc.includes("screenAfterWinContinue"), "first-Doctora CONTINUE uses screenAfterWinContinue");
assert(appSrc.includes("data-testid=\"session-close\""), "Doctora close card is testable");
assert(appSrc.includes("data-testid=\"session-close-dismiss\""), "Listo/Done dismiss is testable");
assert(appSrc.includes("{L.sessionClose}"), "close dismiss uses L.sessionClose");
assert(/data-testid="session-close"[\s\S]{0,900}<p data-testid="session-close-next"/.test(appSrc), "close-card next beat is a <p>");
assert(/data-testid="session-close"[\s\S]{0,1100}\{L\.playScene\}/.test(appSrc), "close-card next beat reuses L.playScene — no invented chrome");
assert(/data-testid="session-close"[\s\S]{0,1100}pointerEvents:\s*["']none/.test(appSrc), "close-card next beat is not a tap target");
assert(!/data-testid="session-close"[\s\S]{0,900}come-back-tomorrow/.test(appSrc), "close card is not a come-back-tomorrow lock");
assert(!/Vuelve mañana por «\{title\}»|Come back tomorrow for “\{title\}”/.test(appSrc), "App does not invent teaser template copy");
assert(appSrc.includes("lessonListenText"), "Listen playback uses lessonListenText");
assert(appSrc.includes("data-testid=\"lesson-listen\""), "Listen control is testable");
assert(appSrc.includes("data-selected"), "MC selected state is marked");
assert(appSrc.includes(".choice-card[data-selected=\"true\"]"), "selected choice CSS beats hover washout");
assert(lessonListenText({ type: "mc", text: "¿Con todo, joven, o se lo preparo sin cebolla?", prompt: "Why?" }) === "¿Con todo, joven, o se lo preparo sin cebolla?", "Hoy connector Listen plays the scene line");
assert(lessonListenText({ type: "mc", prompt: "Why?" }) === "Why?", "MC without a line still has a Listen source");
assert(lessonListenText({ type: "listen", text: "Se me hace tarde." }) === "Se me hace tarde.", "listen-type plays q.text");
assert(lessonListenText({}) === "", "empty question is not a silent undefined speak");
assert(LISTEN_SKIP.es === "Saltar" && LISTEN_SKIP.en === "Skip", "Listen Skip is quiet Saltar / Skip");
assert(listenSkipLabel("es") === "Saltar" && listenSkipLabel("en") === "Skip", "Listen Skip follows uiLang");
assert(LISTEN_SKIP_HINT.es === "Si no puedes oír" && LISTEN_SKIP_HINT.en === "If you can’t hear", "Listen Skip hint is George stamp");
assert(listenSkipHint("es") === LISTEN_SKIP_HINT.es && listenSkipHint("en") === LISTEN_SKIP_HINT.en, "Listen Skip hint follows uiLang");
assert(isAudioGatedStep({ type: "listen" }), "Hoy / unit dictation is the gated audio beat");
assert(!isAudioGatedStep({ type: "mc", text: "¿Con todo?" }), "Hoy connector MC is not gated on hearing");
assert(appSrc.includes("from \"./listenSkip.js\""), "Listen Skip helper is wired");
assert(appSrc.includes("listenSkipLabel(uiLang)"), "Listen Skip label follows uiLang");
assert(appSrc.includes("listenSkipHint(uiLang)"), "Listen Skip hint follows uiLang");
assert(appSrc.includes("data-testid=\"lesson-listen-skip\""), "Listen Skip is testable");
assert(appSrc.includes("data-testid=\"lesson-listen-skip-hint\""), "Listen Skip hint is testable");
assert(appSrc.includes("skipAudioGate"), "Listen Skip calls skipAudioGate");
assert(appSrc.includes("isAudioGatedStep(q)"), "Skip only fires on a gated audio beat");
const listenSkipSrc = appSrc.slice(appSrc.indexOf("data-testid=\"lesson-listen-skip\""), appSrc.indexOf("data-testid=\"lesson-listen-skip\"") + 520);
assert(/background:\s*HUB_CREAM/.test(listenSkipSrc), "Listen Skip sits on HUB_CREAM like timer-off");
assert(listenSkipSrc.includes("border: \"none\""), "Listen Skip has no new border chrome");
assert(listenSkipSrc.includes("fontSize: 11"), "Listen Skip matches timer-off / soft secondary weight");
assert(!/duo-btn/.test(listenSkipSrc), "Listen Skip is not a primary duo-btn");
assert(!listenSkipSrc.includes("D.blue"), "Listen Skip is not louder than the blue Listen primary");
assert(!listenSkipSrc.includes("D.green"), "Listen Skip is not louder than CHECK");
assert((appSrc.match(/data-testid="lesson-listen-skip"/g) || []).length === 1, "one Listen Skip — dictation only");
assert(!appSrc.includes('data-testid="splash-skip"'), "splash still has no Skip");
assert(!/soft-paywall[\s\S]{0,200}lesson-listen-skip/.test(appSrc), "paywall bird / Continue free stay parked");
assert(CUBETAS_HINT.es === "Arrastra o toca la frase en Subjuntivo o Indicativo.", "Cubetas ES George how-to lock");
assert(CUBETAS_HINT.en === "Drag or tap the phrase into Subjunctive or Indicative.", "Cubetas EN George how-to lock");
assert(cubetasHint("en") === CUBETAS_HINT.en && cubetasHint("es") === CUBETAS_HINT.es, "Cubetas hint follows uiLang");
assert(appSrc.includes("data-testid=\"cubetas-hint\""), "Cubetas open hint is testable");
assert(appSrc.includes("cubetasHint(uiLang)"), "Cubetas hint follows uiLang");
assert(appSrc.includes("showCubetasHint(run)"), "Cubetas how-to is first-paint only");
assert(appSrc.includes("dismissCubetasHint"), "first drag/tap dismisses the how-to");
assert(!/Arrastra la ficha o toca una cubeta/.test(CUBETAS_HINT.es), "parked draft ES how-to is gone");
assert(!/Drag the chip or tap a bucket/.test(CUBETAS_HINT.en), "parked draft EN how-to is gone");
assert(!/¡Ganaste!|You won!/.test(`${UI.es.hoyWin}${UI.en.hoyWin}`), "first-Hoy win is not ¡Ganaste!/You won!");
assert(appSrc.includes("L.hoyWin"), "first-Hoy done heading uses L.hoyWin");
assert(appSrc.includes("hoy-win"), "first-Hoy win heading is testable");
assert(appSrc.includes("MEXICO_MAP_SRC") && appSrc.includes("RecuerdosMexicoMap"), "Recuerdos uses the Dave-cleared illustrated Mexico map");
assert(!appSrc.includes("MEXICO_OUTLINE_PATH"), "PR 81 SVG silhouette is not the Recuerdos map");
assert(appSrc.includes("RECUERDOS_PIN_SHADOW"), "Recuerdos pins use the darker-land ring");
assert(appSrc.includes("background: open ? D.green : D.lockGray"), "open Recuerdos pins use CHECK lime");
assert(!appSrc.includes("pin.firstGlow ? D.gold : D.green"), "Bajío open pin is not gold");
assert(appSrc.includes("RECUERDOS_PIN_LABEL"), "Recuerdos pin labels use cream");
assert(appSrc.includes("RECUERDOS_FOG_BLOB_LIGHT"), "locked-region fog blobs use the deeper mist");
assert(appSrc.includes('filter: theme === "dark" ? "brightness(.88) saturate(.9)" : "none"'), "dark theme eases brightness now that the PNG land is darker");
assert(appSrc.includes("shouldShowBajioUnlockFlash"), "Bajío unlock flash uses the once-only gate");
assert(appSrc.includes("isBajioUnlockFlashLive") && appSrc.includes("markBajioUnlockFlashLive"), "flash live flag survives remount");
assert(appSrc.includes("isBajioUnlockFlashDue") && appSrc.includes("markBajioUnlockFlashDue"), "flash due flag survives CONTINUE remount");
assert(appSrc.includes("isFirstStreakEsoWin"), "CONTINUE uses the Eso win stamp, not only firstHoy");
assert(/function isFirstStreakEsoWin[\s\S]{0,280}todaySceneId/.test(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "recuerdos.js"), "utf8")), "Hoy scene id (Landlord WhatsApp included) is an Eso win");
assert(appSrc.includes("bajioUnlockSeen"), "Bajío unlock flash seen flag is persisted");
assert(/showSoftPaywall = \(paywallGate \|\| restoreHold\) && !bajioUnlockFlash && !bajioFlashPending && !isBajioUnlockFlashDue\(\)/.test(appSrc), "paywall waits for the Bajío glow beat");
assert(/if \(screen !== "home" \|\| bajioUnlockFlash\) return;\s*if \(!lecturaStartedRef\.current\) return;\s*if \(!bajioFlashPending && !isBajioUnlockFlashDue\(\)\) return;\s*setBajioFlashPending\(false\);\s*markBajioUnlockFlashDue\(true\);\s*setBajioUnlockFlash\(true\);/.test(appSrc), "home return starts a deferred Bajío glow only after lectura_start");
assert(/const bajioHomeNow = willFlash && next === "home" && lecturaStartedRef\.current/.test(appSrc), "Hoy CONTINUE does not start the Bajío glow before lectura_start");
assert(!/showSoftPaywall = \(paywallGate \|\| restoreHold\) && !bajioUnlockFlash && !bajioFlashPending && !isBajioUnlockFlashDue\(\) && !/.test(appSrc), "paywall gate does not wait on CDMX, Oaxaca, Yucatán, or Norte");
assert(appSrc.includes("shouldShowCdmxUnlockFlash"), "CDMX unlock flash uses the once-only day-2 gate");
assert(appSrc.includes("isCdmxUnlockFlashDue") && appSrc.includes("markCdmxUnlockFlashDue"), "CDMX due flag survives CONTINUE remount");
assert(appSrc.includes("isDay2HoyEsoWin"), "CONTINUE uses the day-2 Hoy Eso stamp, not only firstHoy");
assert(/function isDay2HoyEsoWin[\s\S]{0,280}todaySceneId/.test(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "recuerdos.js"), "utf8")), "Hoy scene id counts as a day-2 Hoy Eso win");
assert(appSrc.includes("cdmxUnlockFlashStreak"), "CONTINUE uses earned streak so raw streak 1 cannot skip CDMX");
assert(/function cdmxUnlockFlashStreak[\s\S]{0,280}yesterday/.test(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "recuerdos.js"), "utf8")), "earned CDMX streak counts yesterday → 2");
const continueWinChunk = appSrc.slice(appSrc.indexOf("const continueFromWin"), appSrc.indexOf("const dismissSessionClose"));
assert(!/willCdmxFlash \? \{ cdmxUnlockSeen: true \}/.test(continueWinChunk), "CONTINUE does not flip map Open before the glow");
assert(continueWinChunk.includes("cdmxUnlockFlashStreak"), "day-2 CONTINUE passes earned streak into the CDMX gate");
assert(continueWinChunk.includes("setCdmxUnlockFlash(true)"), "CONTINUE forces the CDMX glow overlay");
assert(continueWinChunk.includes("setScreen(next)"), "CONTINUE still lands after arming the glow");
assert(!/if \(willCdmxFlash\) \{\s*markCdmxUnlockFlashDue\(true\);[\s\S]*?return;/.test(continueWinChunk), "CONTINUE cannot return past the glow onto idle");
assert(appSrc.includes("shouldShowOaxacaUnlockFlash"), "Oaxaca unlock flash uses the once-only streak-3 gate");
assert(appSrc.includes("isOaxacaUnlockFlashDue") && appSrc.includes("markOaxacaUnlockFlashDue"), "Oaxaca due flag survives CONTINUE remount");
assert(appSrc.includes("isStreak3HoyEsoWin"), "CONTINUE uses the streak-3 Hoy Eso stamp, not only firstHoy");
assert(/function isStreak3HoyEsoWin[\s\S]{0,120}isDay2HoyEsoWin/.test(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "recuerdos.js"), "utf8")), "streak-3 Hoy reuses the day-2 Hoy Eso scene stamps");
assert(appSrc.includes("oaxacaUnlockFlashStreak"), "CONTINUE uses earned streak so raw streak 2 cannot skip Oaxaca");
assert(/function oaxacaUnlockFlashStreak[\s\S]{0,80}cdmxUnlockFlashStreak/.test(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "recuerdos.js"), "utf8")), "earned Oaxaca streak reuses yesterday → n+1");
assert(!/willOaxacaFlash \? \{ oaxacaUnlockSeen: true \}/.test(continueWinChunk), "CONTINUE does not flip Oaxaca Open before the glow");
assert(continueWinChunk.includes("oaxacaUnlockFlashStreak"), "streak-3 CONTINUE passes earned streak into the Oaxaca gate");
assert(continueWinChunk.includes("setOaxacaUnlockFlash(true)"), "CONTINUE forces the Oaxaca glow overlay");
assert(!/if \(willOaxacaFlash\) \{\s*markOaxacaUnlockFlashDue\(true\);[\s\S]*?return;/.test(continueWinChunk), "CONTINUE cannot return past the Oaxaca glow onto idle");
assert(appSrc.includes("shouldShowYucatanUnlockFlash"), "Yucatán unlock flash uses the once-only streak-4 gate");
assert(appSrc.includes("isYucatanUnlockFlashDue") && appSrc.includes("markYucatanUnlockFlashDue"), "Yucatán due flag survives CONTINUE remount");
assert(appSrc.includes("isStreak4HoyEsoWin"), "CONTINUE uses the streak-4 Hoy Eso stamp, not only firstHoy");
assert(/function isStreak4HoyEsoWin[\s\S]{0,120}isDay2HoyEsoWin/.test(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "recuerdos.js"), "utf8")), "streak-4 Hoy reuses the day-2 Hoy Eso scene stamps");
assert(appSrc.includes("yucatanUnlockFlashStreak"), "CONTINUE uses earned streak so raw streak 3 cannot skip Yucatán");
assert(/function yucatanUnlockFlashStreak[\s\S]{0,80}cdmxUnlockFlashStreak/.test(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "recuerdos.js"), "utf8")), "earned Yucatán streak reuses yesterday → n+1");
assert(!/willYucatanFlash \? \{ yucatanUnlockSeen: true \}/.test(continueWinChunk), "CONTINUE does not flip Yucatán Open before the glow");
assert(continueWinChunk.includes("yucatanUnlockFlashStreak"), "streak-4 CONTINUE passes earned streak into the Yucatán gate");
assert(continueWinChunk.includes("setYucatanUnlockFlash(true)"), "CONTINUE forces the Yucatán glow overlay");
assert(!/if \(willYucatanFlash\) \{\s*markYucatanUnlockFlashDue\(true\);[\s\S]*?return;/.test(continueWinChunk), "CONTINUE cannot return past the Yucatán glow onto idle");
assert(appSrc.includes("shouldShowNorteUnlockFlash"), "Norte unlock flash uses the once-only streak-5 gate");
assert(appSrc.includes("isNorteUnlockFlashDue") && appSrc.includes("markNorteUnlockFlashDue"), "Norte due flag survives CONTINUE remount");
assert(appSrc.includes("isStreak5HoyEsoWin"), "CONTINUE uses the streak-5 Hoy Eso stamp, not only firstHoy");
assert(/function isStreak5HoyEsoWin[\s\S]{0,120}isDay2HoyEsoWin/.test(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "recuerdos.js"), "utf8")), "streak-5 Hoy reuses the day-2 Hoy Eso scene stamps");
assert(appSrc.includes("norteUnlockFlashStreak"), "CONTINUE uses earned streak so raw streak 4 cannot skip Norte");
assert(/function norteUnlockFlashStreak[\s\S]{0,80}cdmxUnlockFlashStreak/.test(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "recuerdos.js"), "utf8")), "earned Norte streak reuses yesterday → n+1");
assert(!/willNorteFlash \? \{ norteUnlockSeen: true \}/.test(continueWinChunk), "CONTINUE does not flip Norte Open before the glow");
assert(continueWinChunk.includes("norteUnlockFlashStreak"), "streak-5 CONTINUE passes earned streak into the Norte gate");
assert(continueWinChunk.includes("setNorteUnlockFlash(true)"), "CONTINUE forces the Norte glow overlay");
assert(!/if \(willNorteFlash\) \{\s*markNorteUnlockFlashDue\(true\);[\s\S]*?return;/.test(continueWinChunk), "CONTINUE cannot return past the Norte glow onto idle");
assert(appSrc.includes("cdmxUnlockSeen"), "CDMX unlock flash seen flag is persisted");
assert(appSrc.includes("oaxacaUnlockSeen"), "Oaxaca unlock flash seen flag is persisted");
assert(appSrc.includes("yucatanUnlockSeen"), "Yucatán unlock flash seen flag is persisted");
assert(appSrc.includes("norteUnlockSeen"), "Norte unlock flash seen flag is persisted");
assert(appSrc.includes("data-testid=\"cdmx-unlock-flash\""), "CDMX unlock flash is testable");
assert(appSrc.includes("cdmxUnlockFlashCopy"), "CDMX flash copy reuses Recuerdos Abierto/Open stamp");
assert(appSrc.includes("data-testid=\"bajio-unlock-flash\""), "Bajío unlock flash is testable");
assert(appSrc.includes("bajioUnlockFlashCopy"), "flash copy reuses Recuerdos Abierto/Open stamp");
const flashChunk = appSrc.slice(appSrc.indexOf('data-testid="bajio-unlock-flash"'), appSrc.indexOf("CDMX unlock flash"));
const cdmxFlashChunk = appSrc.slice(appSrc.indexOf('data-testid="cdmx-unlock-flash"'), appSrc.indexOf("Oaxaca unlock flash"));
const oaxacaFlashChunk = appSrc.slice(appSrc.indexOf('data-testid="oaxaca-unlock-flash"'), appSrc.indexOf("Yucatán unlock flash"));
const yucatanFlashChunk = appSrc.slice(appSrc.indexOf('data-testid="yucatan-unlock-flash"'), appSrc.indexOf("Norte unlock flash"));
const norteFlashChunk = appSrc.slice(appSrc.indexOf('data-testid="norte-unlock-flash"'), appSrc.indexOf("SOFT PAYWALL"));
assert(flashChunk.includes("bajio-unlock-flash-pin"), "flash shows the Bajío pin");
assert(flashChunk.includes("{flashCopy}"), "flash copy is bajioUnlockFlashCopy only");
assert(!/flashCopy\.label/.test(flashChunk), "flash has no Bajío label line");
const flashCopyLine = flashChunk.match(/data-testid="bajio-unlock-flash-copy"[\s\S]{0,120}/)?.[0] ?? "";
assert(flashCopyLine.includes("{flashCopy}"), "copy node is Open/Abierto only");
assert(!/Bajío/.test(flashCopyLine), "visible flash copy has no Bajío text");
assert(!/¡Sigue explorando!|Sigue explorando|12\/25|backpack/i.test(flashChunk), "flash has no pep or backpack fraction");
assert(!/setSoftPaywall\(true\)/.test(flashChunk), "flash does not open the paywall");
assert(!Object.keys(UI.es).concat(Object.keys(UI.en)).some((k) => /bajioUnlock|unlockFlash|sigueExplor/i.test(k)), "no new Bajío-flash marketing UI keys");
assert(cdmxFlashChunk.includes("cdmx-unlock-flash-pin"), "CDMX flash shows the CDMX pin");
assert(cdmxFlashChunk.includes("{flashCopy}"), "CDMX flash copy is cdmxUnlockFlashCopy only");
assert(!/flashCopy\.label/.test(cdmxFlashChunk), "CDMX flash has no region label line");
const cdmxFlashCopyLine = cdmxFlashChunk.match(/data-testid="cdmx-unlock-flash-copy"[\s\S]{0,120}/)?.[0] ?? "";
assert(cdmxFlashCopyLine.includes("{flashCopy}"), "CDMX copy node is Open/Abierto only");
assert(!/CDMX|Bajío/.test(cdmxFlashCopyLine), "visible CDMX flash copy has no region text");
assert(!/¡Sigue explorando!|Sigue explorando|12\/25|backpack/i.test(cdmxFlashChunk), "CDMX flash has no pep or backpack fraction");
assert(!/setSoftPaywall\(true\)/.test(cdmxFlashChunk), "CDMX flash does not open the paywall");
assert(!/setScreen\("home"\)/.test(cdmxFlashChunk), "CDMX overlay itself is not the idle land");
assert(appSrc.includes("cdmxFlashNextRef"), "CDMX CONTINUE holds close/idle until the glow ends");
assert(!Object.keys(UI.es).concat(Object.keys(UI.en)).some((k) => /cdmxUnlock|sigueExplor/i.test(k)), "no new CDMX-flash marketing UI keys");
assert(appSrc.includes("data-testid=\"oaxaca-unlock-flash\""), "Oaxaca unlock flash is testable");
assert(appSrc.includes("oaxacaUnlockFlashCopy"), "Oaxaca flash copy reuses Recuerdos Abierto/Open stamp");
assert(oaxacaFlashChunk.includes("oaxaca-unlock-flash-pin"), "Oaxaca flash shows the Oaxaca pin");
assert(oaxacaFlashChunk.includes("{flashCopy}"), "Oaxaca flash copy is oaxacaUnlockFlashCopy only");
assert(!/flashCopy\.label/.test(oaxacaFlashChunk), "Oaxaca flash has no region label line");
const oaxacaFlashCopyLine = oaxacaFlashChunk.match(/data-testid="oaxaca-unlock-flash-copy"[\s\S]{0,120}/)?.[0] ?? "";
assert(oaxacaFlashCopyLine.includes("{flashCopy}"), "Oaxaca copy node is Open/Abierto only");
assert(!/Oaxaca|CDMX|Bajío/.test(oaxacaFlashCopyLine), "visible Oaxaca flash copy has no region text");
assert(!/¡Sigue explorando!|Sigue explorando|12\/25|backpack/i.test(oaxacaFlashChunk), "Oaxaca flash has no pep or backpack fraction");
assert(!/setSoftPaywall\(true\)/.test(oaxacaFlashChunk), "Oaxaca flash does not open the paywall");
assert(!/setScreen\("home"\)/.test(oaxacaFlashChunk), "Oaxaca overlay itself is not the idle land");
assert(appSrc.includes("oaxacaFlashNextRef"), "Oaxaca CONTINUE holds close/idle until the glow ends");
assert(!Object.keys(UI.es).concat(Object.keys(UI.en)).some((k) => /oaxacaUnlock|sigueExplor/i.test(k)), "no new Oaxaca-flash marketing UI keys");
assert(appSrc.includes("data-testid=\"yucatan-unlock-flash\""), "Yucatán unlock flash is testable");
assert(appSrc.includes("yucatanUnlockFlashCopy"), "Yucatán flash copy reuses Recuerdos Abierto/Open stamp");
assert(yucatanFlashChunk.includes("yucatan-unlock-flash-pin"), "Yucatán flash shows the Yucatán pin");
assert(yucatanFlashChunk.includes("{flashCopy}"), "Yucatán flash copy is yucatanUnlockFlashCopy only");
assert(!/flashCopy\.label/.test(yucatanFlashChunk), "Yucatán flash has no region label line");
const yucatanFlashCopyLine = yucatanFlashChunk.match(/data-testid="yucatan-unlock-flash-copy"[\s\S]{0,120}/)?.[0] ?? "";
assert(yucatanFlashCopyLine.includes("{flashCopy}"), "Yucatán copy node is Open/Abierto only");
assert(!/Yucatán|Yucatan|Oaxaca|CDMX|Bajío/.test(yucatanFlashCopyLine), "visible Yucatán flash copy has no region text");
assert(!/¡Sigue explorando!|Sigue explorando|12\/25|backpack/i.test(yucatanFlashChunk), "Yucatán flash has no pep or backpack fraction");
assert(!/setSoftPaywall\(true\)/.test(yucatanFlashChunk), "Yucatán flash does not open the paywall");
assert(!/setScreen\("home"\)/.test(yucatanFlashChunk), "Yucatán overlay itself is not the idle land");
assert(appSrc.includes("yucatanFlashNextRef"), "Yucatán CONTINUE holds close/idle until the glow ends");
assert(!Object.keys(UI.es).concat(Object.keys(UI.en)).some((k) => /yucatanUnlock|sigueExplor/i.test(k)), "no new Yucatán-flash marketing UI keys");
assert(appSrc.includes("data-testid=\"norte-unlock-flash\""), "Norte unlock flash is testable");
assert(appSrc.includes("norteUnlockFlashCopy"), "Norte flash copy reuses Recuerdos Abierto/Open stamp");
assert(norteFlashChunk.includes("norte-unlock-flash-pin"), "Norte flash shows the Norte pin");
assert(norteFlashChunk.includes("{flashCopy}"), "Norte flash copy is norteUnlockFlashCopy only");
assert(!/flashCopy\.label/.test(norteFlashChunk), "Norte flash has no region label line");
const norteFlashCopyLine = norteFlashChunk.match(/data-testid="norte-unlock-flash-copy"[\s\S]{0,120}/)?.[0] ?? "";
assert(norteFlashCopyLine.includes("{flashCopy}"), "Norte copy node is Open/Abierto only");
assert(!/Norte|North|Yucatán|Yucatan|Oaxaca|CDMX|Bajío/.test(norteFlashCopyLine), "visible Norte flash copy has no region text");
assert(!/¡Sigue explorando!|Sigue explorando|12\/25|backpack/i.test(norteFlashChunk), "Norte flash has no pep or backpack fraction");
assert(!/setSoftPaywall\(true\)/.test(norteFlashChunk), "Norte flash does not open the paywall");
assert(!/setScreen\("home"\)/.test(norteFlashChunk), "Norte overlay itself is not the idle land");
assert(appSrc.includes("norteFlashNextRef"), "Norte CONTINUE holds close/idle until the glow ends");
assert(!Object.keys(UI.es).concat(Object.keys(UI.en)).some((k) => /norteUnlock|sigueExplor/i.test(k)), "no new Norte-flash marketing UI keys");
assert(appSrc.includes("shouldHoyEarlyWin"), "first-Hoy early checkpoint is wired");
assert(appSrc.includes("trimHoyBeats"), "first-Hoy beat cap is wired");
assert(appSrc.includes("isShortHoy"), "short Hoy path covers first session and day-2 return");
assert(appSrc.includes("shouldParkHoyUnderMas"), "Más park is gated on scene length");
assert(appSrc.includes("camino-more-full-hoy"), "grown Hoy can park under Más");
const hoyWinSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "hoyWin.js"), "utf8");
assert(hoyWinSrc.includes("isFirstHoySession"), "streak 0 first-Hoy gate stays");
assert(hoyWinSrc.includes("isDay2Return"), "day-2 return reuses the door gate");
assert(hoyWinSrc.includes("isShortHoy"), "short Hoy helper covers day-2 return");
assert(hoyWinSrc.includes("shouldParkHoyUnderMas"), "Más park helper lives with the ≤4 gate");
assert(appSrc.includes("shouldDoctoraEarlyWin"), "first-Doctora early checkpoint is wired");
assert(appSrc.includes("trimDoctoraBeats"), "first-Doctora beat cap is wired");
assert(appSrc.includes("isFirstDoctoraSession"), "short Doctora path is gated to streak 0");
assert(appSrc.includes("doctora-win"), "first-Doctora win heading is testable");
assert(!appSrc.includes("doctoraWinReward"), "doctoraWinReward is not wired");
assert(appSrc.includes("from \"./lessonAward.js\""), "Hoy / lesson share lessonAward.js");
assert(appSrc.includes("win-earned-xp"), "done-screen XP chip is testable");
assert(appSrc.includes("win-earned-gems"), "done-screen gem chip is testable");
assert(/!session\.firstDoctora \|\| s\.testid === "win-earned-streak"/.test(appSrc), "Doctora win keeps the streak chip and drops XP and gems");
assert(/levelUp && !session\.firstDoctora/.test(appSrc), "Doctora win does not show a level-up");
const finishDoctoraChunk = appSrc.slice(appSrc.indexOf("const finishDoctoraWin"), appSrc.indexOf("const resetDoctorBoard"));
assert(!finishDoctoraChunk.includes("doctoraWinReward"), "finishDoctoraWin does not award via doctoraWinReward");
assert(!finishDoctoraChunk.includes("setLevelUp"), "Doctora win does not level up");
assert(/earnedXP:\s*0/.test(finishDoctoraChunk), "Doctora win stamps earnedXP 0");
assert(/earnedGems:\s*0/.test(finishDoctoraChunk), "Doctora win stamps earnedGems 0");
const awardDoctoraChunk = appSrc.slice(appSrc.indexOf("const awardDoctoraStreak"), appSrc.indexOf("const finishDoctoraWin"));
assert(awardDoctoraChunk.includes("streak: streakAfterWin"), "Doctora win still keeps the streak");
assert(!/\bxp:\s*\(prev\.xp/.test(awardDoctoraChunk), "Doctora streak award does not add XP");
assert(!/\bgems:\s*\(prev\.gems/.test(awardDoctoraChunk), "Doctora streak award does not add gems");
const doctoraWinSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "doctoraWin.js"), "utf8");
assert(!doctoraWinSrc.includes("doctoraWinReward"), "doctoraWinReward is deleted");
assert(!doctoraWinSrc.includes("lessonAward"), "Doctora does not import lessonAward");
assert(!doctoraWinSrc.includes("lessonFinishReward"), "Doctora does not reuse lessonFinishReward");
assert(doctoraWinSrc.includes("¿Me da un café, por favor?"), "first-Doctora keep stamps café");
assert(doctoraWinSrc.includes("Tengo muchas ganas de verte."), "first-Doctora keep stamps ganas");
assert(doctoraWinSrc.includes("Eso tiene sentido."), "first-Doctora keep stamps sentido");
assert(doctoraWinSrc.includes("Te estoy esperando."), "first-Doctora keep stamps esperando");
assert(doctoraWinSrc.includes("Necesito tomar una decisión."), "decisión is parked, not deleted");
assert(doctoraWinSrc.includes("Voy a postularme al trabajo."), "postularse is parked, not deleted");
assert(UI.es.playScene === "Jugar la escena", "UI.es.playScene");
assert(UI.en.playScene === "Play the scene", "UI.en.playScene");
assert(UI.es.phraseDoctor === "Doctora de frases", "UI.es.phraseDoctor is not Phrase Doctor");
assert(UI.en.phraseDoctor === "Phrase Doctor", "UI.en.phraseDoctor");
assert(UI.es.phraseDoctorTag === "GANA EN 60 SEGUNDOS", "UI.es.phraseDoctorTag");
assert(UI.en.phraseDoctorTag === "WIN IN 60 SECONDS", "UI.en.phraseDoctorTag");
assert(UI.es.phraseDoctorCta === "Arreglar una frase", "UI.es.phraseDoctorCta");
assert(UI.en.phraseDoctorCta === "Fix a phrase", "UI.en.phraseDoctorCta");
assert(!/Phrase Doctor/.test(UI.es.phraseDoctor + UI.es.phraseDoctorTag + UI.es.phraseDoctorCta), "ES first-door PD copy is not Phrase Doctor");
const handoffChunk = appSrc.slice(appSrc.indexOf("post-dismiss-handoff"), appSrc.indexOf("post-dismiss-handoff") + 900);
assert(handoffChunk.includes("{L.phraseDoctorTag}"), "handoff badge reuses L.phraseDoctorTag");
assert(handoffChunk.includes("{L.phraseDoctor}"), "handoff title reuses L.phraseDoctor");
assert(!Object.keys(UI.es).concat(Object.keys(UI.en)).some((k) => /handoff|secondBeat|postDismiss/i.test(k)), "no new handoff UI keys");
assert(!/Arreglar una frase|Fix a phrase|GANA EN 60|WIN IN 60/.test(handoffChunk), "handoff has no new hardcoded CTA stamps");
assert(UI.es.safeRiskyReward === "5 rondas · extra por racha · gemas", "UI.es.safeRiskyReward");
assert(UI.en.safeRiskyReward === "5 rounds · streak extra · gems", "UI.en.safeRiskyReward");
assert(!/bonus/i.test(UI.es.safeRiskyReward), "ES Safe/Risky reward has no bonus");
assert(!/bonus/i.test(UI.en.safeRiskyReward), "EN Safe/Risky reward has no bonus");
assert(UI.es.literalLabel === "Traducción", "UI.es.literalLabel");
assert(UI.en.literalLabel === "Literal", "UI.en.literalLabel");
assert(UI.es.whyLabel === "Por qué", "UI.es.whyLabel");
assert(UI.en.whyLabel === "Why", "UI.en.whyLabel");
assert(UI.es.why === "¿Por qué?", "existing L.why stays ¿Por qué?");
assert(UI.en.why === "Why?", "existing L.why stays Why?");
const SAFE_RISKY_ITEMS = Function(`"use strict"; return (${extractConst(appSrc, "SAFE_RISKY_ITEMS")});`)();
const SAFE_RISKY_LITERALS = {
  "No manches.": { es: "Vaya / no me digas.", en: "No way. / Come on." },
  "Quedo a sus órdenes.": { es: "Quedo bajo sus órdenes.", en: "I remain under your orders." },
  "¿Mande?": { es: "¿Cómo? / ¿perdón?", en: "Pardon?" },
  "¿Qué?": { es: "¿Qué?", en: "What?" },
  "¿Me da un café, por favor?": { es: "¿Me da un café, por favor?", en: "Can I have a coffee, please?" },
  "Está bien chido.": { es: "Está muy padre.", en: "It’s really cool." },
  "No obstante lo anterior...": { es: "A pesar de lo anterior...", en: "Notwithstanding the foregoing..." },
  "Ahorita vengo.": { es: "Vuelvo en un momento.", en: "I’ll be right back." },
};
const SAFE_RISKY_WHYS = {
  "No manches.": { es: "Suena a amigos en México. Con jefes o personas mayores, pásate a algo más suave.", en: "Sounds like friends in Mexico. With bosses or elders, switch to something softer." },
  "Quedo a sus órdenes.": { es: "En tono suave: estoy a su disposición. Cierre profesional mexicano — amable, claro, seguro en correo con clientas.", en: "Soft English: I’m at your service. Mexican professional close — warm, clear, safe for a client email." },
  "¿Mande?": { es: "De mandar / «mande usted»: el «¿perdón?» cortés de México. Con la suegra, gana a un «¿Qué?» seco.", en: "From mandar / «mande usted»: Mexico’s polite “Pardon?” With your mother-in-law, it beats a blunt «¿Qué?»" },
  "¿Qué?": { es: "Puede sonar brusco. Mejor «¿Mande?» o «¿Cómo?» según a quién le hablas.", en: "It can land blunt. Prefer «¿Mande?» or «¿Cómo?» depending on who you’re talking to." },
  "¿Me da un café, por favor?": { es: "Natural en el mostrador: directo y cortés. Mejor que «¿Puedo obtener un café?»", en: "Natural at the counter: direct and polite. Better than “Can I obtain a coffee?”" },
  "Está bien chido.": { es: "Suena mexicano y de amigos. En documentos o juntas formales, cámbialo.", en: "Sounds Mexican and friendly. In documents or formal meetings, swap it out." },
  "No obstante lo anterior...": { es: "Registro de contrato. En una charla normal pesa demasiado; guárdalo para el papel.", en: "Contract register. In normal chat it feels heavy — save it for the page." },
  "Ahorita vengo.": { es: "Muy mexicano. «Ahorita» puede ser pronto… o un poco más. El tono lo decide el contexto.", en: "Very Mexican. «Ahorita» can mean soon… or a bit later. Context sets the clock." },
};
assert(SAFE_RISKY_ITEMS.length === 8, "Safe/Risky pack is eight items");
assert(!SAFE_RISKY_ITEMS.some((it) => it.phrase === SAFE_RISKY_MULTI_FIXTURE.phrase), "multi-correct fixture is not live pack");
assert(SAFE_RISKY_MULTI_FIXTURE.answers.length >= 2, "multi-correct fixture has 2+ rights");
assert(Object.keys(SAFE_RISKY_ANSWERS).length === 8, "George answers stamp is eight phrases");
for (const [phrase, literal] of Object.entries(SAFE_RISKY_LITERALS)) {
  const item = SAFE_RISKY_ITEMS.find((it) => it.phrase === phrase);
  assert(item, `Safe/Risky has ${phrase}`);
  assert(item.literal?.es === literal.es, `${phrase} ES literal`);
  assert(item.literal?.en === literal.en, `${phrase} EN literal`);
  assert(item.note?.es === SAFE_RISKY_WHYS[phrase].es, `${phrase} ES Why`);
  assert(item.note?.en === SAFE_RISKY_WHYS[phrase].en, `${phrase} EN Why`);
  const stamped = SAFE_RISKY_ANSWERS[phrase];
  assert(Array.isArray(stamped) && stamped.length >= 1, `${phrase} is in George answers stamp`);
  assert(JSON.stringify(item.answers) === JSON.stringify(stamped), `${phrase} answers is George stamp`);
  const keys = safeRiskyCorrectKeys(item);
  assert(JSON.stringify(keys) === JSON.stringify(stamped), `${phrase} correct keys follow answers[]`);
  assert(item.answer && keys.includes(item.answer), `${phrase} answer is in answers[]`);
  assert(!item.correct, `${phrase} uses answers[] not correct[]`);
}
assert(SAFE_RISKY_ITEMS.filter((it) => safeRiskyCorrectKeys(it).length > 1).length === 4, "four live items are multi-correct");
assert(appSrc.includes("applySafeRiskyTap"), "Safe/Risky taps use shared engine");
assert(appSrc.includes("safeRiskyIsRevealed"), "Safe/Risky CONTINUE uses shared reveal gate");
const quedo = SAFE_RISKY_ITEMS.find((it) => it.phrase === "Quedo a sus órdenes.");
assert(quedo.literal.es === "Quedo bajo sus órdenes.", "quedo ES literal is hard gloss");
assert(quedo.literal.en === "I remain under your orders.", "quedo EN literal is hard gloss");
assert(quedo.note.es === "En tono suave: estoy a su disposición. Cierre profesional mexicano — amable, claro, seguro en correo con clientas.", "quedo ES Why is George stamp");
assert(quedo.note.en === "Soft English: I’m at your service. Mexican professional close — warm, clear, safe for a client email.", "quedo EN Why is George stamp");
assert(!/at your service/i.test(quedo.literal.en), "quedo EN literal is not soft I’m at your service");
assert(!/disposición/i.test(quedo.literal.es), "quedo ES literal is not soft disposición");
assert(/I’m at your service/.test(quedo.note.en), "soft EN lives in Why");
assert(/estoy a su disposición/.test(quedo.note.es), "soft ES lives in Why");
assert(!/A Mexican professional close: warm, clear, safe/.test(quedo.note.en), "old EN Why superseded");
assert(!/Encaja en correo con clientas/.test(quedo.note.es), "old ES Why superseded");
assert(!/I’m at your service/.test(`${quedo.literal.es}${quedo.literal.en}`), "curly soft EN literal gone");
assert(!/I'm at your service/.test(`${quedo.literal.es}${quedo.literal.en}`), "straight soft EN literal gone");
assert(!SAFE_RISKY_ITEMS.some((it) => /at your service/i.test(`${it.literal?.es}${it.literal?.en}`)), "Safe/Risky pack has no at-your-service literal");
assert(!SAFE_RISKY_ITEMS.some((it) => /disposición/i.test(`${it.literal?.es}${it.literal?.en}`)), "Safe/Risky pack has no disposición literal");
const chido = SAFE_RISKY_ITEMS.find((it) => it.phrase === "Está bien chido.");
assert(chido.literal.es === "Está muy padre.", "chido ES literal is Está muy padre.");
assert(!/cool/i.test(chido.literal.es), "chido ES literal has no English cool");
assert(!/Está muy cool \/ padre/.test(appSrc), "bounced chido ES literal is gone");
const mande = SAFE_RISKY_ITEMS.find((it) => it.phrase === "¿Mande?");
assert(mande.literal.es === "¿Cómo? / ¿perdón?", "Mande ES literal stays");
assert(mande.literal.en === "Pardon?", "Mande EN literal stays");
assert(!/\*/.test(`${mande.note.es}${mande.note.en}`), "Mande Why has no asterisks");
assert(!/\*mandar\*/.test(appSrc), "no *mandar* markdown in App");
assert(appSrc.includes("{L.literalLabel}"), "Safe/Risky Literal chrome uses L.literalLabel");
assert(appSrc.includes("{L.whyLabel}"), "Safe/Risky Why chrome uses L.whyLabel");
assert(appSrc.includes("{item.literal[uiLang]}"), "Safe/Risky Literal follows uiLang");
assert(appSrc.includes("{item.note[uiLang]}"), "Safe/Risky Why uses note");
const revealAt = appSrc.indexOf("data-testid=\"safe-risky-literal\"");
const whyAt = appSrc.indexOf("data-testid=\"safe-risky-why\"");
const continueAt = appSrc.indexOf("data-testid=\"safe-risky-continue\"");
assert(revealAt > 0 && whyAt > revealAt && continueAt > whyAt, "reveal order is Literal then Why above CONTINUE");
const selectedBlock = appSrc.slice(appSrc.lastIndexOf("{revealed &&", continueAt), continueAt);
assert(selectedBlock.includes("Better answer") && selectedBlock.includes("Mejor respuesta"), "wrong-answer chrome stays in the same reveal");
assert(selectedBlock.includes("data-testid=\"safe-risky-literal\""), "wrong/better-answer path includes Literal");
assert(selectedBlock.includes("safeRiskyAnswerLabel"), "Better answer lists every correct key");
assert(UI.es.narrationLabel === "NARRACIÓN", "UI.es.narrationLabel");
assert(UI.en.narrationLabel === "NARRATION", "UI.en.narrationLabel");
assert(!/LAB/.test(UI.es.narrationLabel + UI.en.narrationLabel), "narration chrome is not a LAB");
assert(!/LAB DE NARRACIÓN|NARRATION LAB/.test(appSrc), "LAB DE NARRACIÓN / NARRATION LAB are gone");
assert(UI.es.splashLine === "Español mexicano real. Más allá de lo básico.", "UI.es.splashLine");
assert(UI.en.splashLine === "Real Mexican Spanish. Past the basics.", "UI.en.splashLine");
assert(UI.es.splashCta === "¡Empezar!", "UI.es.splashCta");
assert(UI.en.splashCta === "Start!", "UI.en.splashCta");
assert(UI.es.more === "Más", "UI.es.more bury label");
assert(UI.en.more === "More", "UI.en.more bury label");
assert(UI.es.namePrompt === "¿Cómo te dicen?", "UI.es.namePrompt");
assert(UI.en.namePrompt === "What do they call you?", "UI.en.namePrompt");
assert(!/Más opciones|See more|More options|Camino extra/.test(`${UI.es.more}${UI.en.more}`), "do not invent other bury labels");
const landlord = TODAY_SCENES.find((sc) => sc.id === "landlord");
assert(landlord, "landlord Hoy scene exists");
assert(landlord.title === "WhatsApp del casero", "landlord title stays");
assert(landlord.titleEn === "Landlord WhatsApp", "landlord titleEn stays");
assert(landlord.setup === "El casero pide depósito y aval hoy. Contéstale sin sonar de manual.", "landlord ES setup");
assert(landlord.setupEn === "Landlord wants deposit and guarantor today. Answer without sounding like a textbook.", "landlord EN setup");
assert(landlord.line === "Oye, ¿el depósito cuenta para el último mes?", "landlord line");
assert(landlord.answers[0] === "Oye, ¿el depósito cuenta para el último mes?", "landlord answer short");
assert(landlord.answers[1] === "Oye, ¿el depósito cuenta para el último mes de renta?", "landlord answer long");
assert(landlord.explain === "WhatsApp casero: corto, claro, sin correo formal.", "landlord explain");
assert(landlord.question === "En WhatsApp con el casero, «Oye, ¿el depósito cuenta…?» suena:", "landlord ES question");
assert(landlord.questionEn === "On WhatsApp with the landlord, «Oye, ¿el depósito cuenta…?» sounds:", "landlord EN question");
assert(landlord.choices[0] === "natural y firme" && landlord.choices[1] === "de correo formal" && landlord.choices[2] === "agresivo", "landlord choices");
assert(landlord.answer === "natural y firme", "landlord answer");
assert(hoySceneBeatCount(landlord) === 3, "live casero is already setup · line · Q");
assert(!shouldParkHoyUnderMas(landlord), "live casero does not park under Más");
const airport = TODAY_SCENES.find((sc) => sc.id === "airport");
assert(airport && hoySceneBeatCount(airport) === 3, "Mostrador en caos is already 3 beats");
assert(!shouldParkHoyUnderMas(airport), "Mostrador does not park under Más");
for (const sc of TODAY_SCENES) {
  assert(hoySceneBeatCount(sc) <= 4, `${sc.id} live Hoy is ≤4 — no cut list`);
  assert(!shouldParkHoyUnderMas(sc), `${sc.id} does not park under Más`);
}
assert(appSrc.includes("showDoorMetaChrome"), "door Meta/Rayo/coaches gated on streak ≥ 1");
assert(!appSrc.includes("data-testid=\"luna-greeting\""), "Luna greeting is parked off the v01c hub face");
assert(appSrc.includes("data-testid=\"door-meta\""), "Meta chrome is testable");
assert(appSrc.includes("data-testid=\"rayo-toggle\""), "Rayo toggle is testable");
assert(UI.es.timerOn === "Con reloj", "George ES timer-on");
assert(UI.en.timerOn === "Timer on", "George EN timer-on");
assert(UI.es.timerOff === "Sin reloj", "George ES timer-off");
assert(UI.en.timerOff === "No timer", "George EN timer-off");
assert(UI.es.timerOffChip === "Piensa. El reloj está apagado.", "George ES timer-off chip");
assert(UI.en.timerOffChip === "Take your time. Timer’s off.", "George EN timer-off chip");
assert(appSrc.includes("data-testid=\"run-timer-toggle\""), "run timer toggle is testable");
assert(appSrc.includes("data-testid=\"run-timer-off-chip\""), "timer-off chip is testable");
assert(appSrc.includes("data-testid=\"rayo-clock\""), "Rayo clock is testable");
assert(appSrc.includes("session.runTimerOff ? L.timerOff : L.timerOn"), "timer toggle uses George L.timerOn / L.timerOff");
assert(appSrc.includes("{L.timerOffChip}"), "timer-off chip uses L.timerOffChip");
assert(/run-timer-toggle[\s\S]{0,500}HUB_CREAM/.test(appSrc), "timer toggle sits on HUB_CREAM");
assert(/run-timer-off-chip[\s\S]{0,280}HUB_CREAM/.test(appSrc), "timer-off chip sits on HUB_CREAM");
assert(!/run-timer-toggle[\s\S]{0,520}borderBottom:/.test(appSrc), "timer toggle is flat — no Duo bottom lip");
assert(!/const danger = rayoLeft <= 3/.test(appSrc), "no low-time panic flag on the clock");
assert(!/stroke=\{danger \? D\.red : D\.gold\}/.test(appSrc), "clock ring stays gold — no red panic");
assert(appSrc.includes("session?.runTimerOff"), "countdown honors per-run timer-off");
assert(appSrc.includes("runTimerOff: !prev.runTimerOff"), "timer-off is learner choice on that run");
assert(appSrc.includes("data-testid=\"coach-strip\""), "four-coach strip is testable");
assert(appSrc.includes("data-testid=\"camino-more\""), "Intermedio bury control is testable");
assert(UI.es.more === "Más" && UI.en.more === "More", "L.more stays parked — not a hub header");
assert(appSrc.includes("{L.namePrompt}"), "name field uses L.namePrompt");
assert(!/What should we call you\?|¿Cómo te llamamos\?/.test(appSrc), "form-feel name prompt is gone");
assert(!Object.hasOwn(UI.es, "splashSkip"), "ES splash has no skip key");
assert(!Object.hasOwn(UI.en, "splashSkip"), "EN splash has no skip key");
assert(!/Let's go!/.test(UI.en.splashCta), "EN splash CTA is Start!, not Let's go!");
assert(!/Subjuntivo/.test(UI.es.splashLine + UI.en.splashLine + UI.es.splashCta + UI.en.splashCta), "splash copy has no Subjuntivo");
assert(appSrc.includes("{L.splashLine}"), "splash line uses L.splashLine");
assert(appSrc.includes("{L.splashCta}"), "splash CTA uses L.splashCta");
assert(appSrc.includes("data-testid=\"splash-start\""), "splash primary CTA is testable");
assert(appSrc.includes("data-testid=\"splash-hero\""), "splash hero mark is testable");
assert(appSrc.includes('src={`${import.meta.env.BASE_URL}mascot/cenzontle.png`}'), "LogoMark points at mascot/cenzontle.png");
const logoMarkSrc = appSrc.slice(appSrc.indexOf("const LogoMark ="), appSrc.indexOf("const MARK_INK"));
assert(logoMarkSrc.includes("mascot/cenzontle.png"), "LogoMark slice includes the Cenzontle src");
assert(!/scaleX\s*\(\s*-1\s*\)/.test(logoMarkSrc), "LogoMark must not CSS-mirror the right-facing Cenzontle");
assert(!/rotateY\s*\(\s*180/.test(logoMarkSrc), "LogoMark must not rotateY the right-facing mark");
assert(appSrc.includes("PNG faces RIGHT"), "LogoMark documents right-facing lock");
assert(appSrc.includes("do not scaleX(-1)"), "LogoMark documents no CSS flip for win-motion");
assert(appSrc.includes("from \"./winBounce.js\""), "App imports the first-win bounce gate");
assert(appSrc.includes("from \"./WinBounce.jsx\""), "App imports the Cenzontle bounce overlay");
assert(appSrc.includes("shouldPlayWinBounce(session)"), "bounce triggers on the live first-win / ¡Eso! flags");
assert(appSrc.includes("<WinBounce"), "done screen mounts the bounce overlay");
assert(appSrc.includes("<WinPerch"), "later Lectura win keeps static WinPerch");
assert(appSrc.includes("img.src = `${import.meta.env.BASE_URL}mascot/cenzontle.png`"), "first-win session preloads the live Cenzontle mark");
assert(appSrc.includes("if (shouldPlayWinBounce(session) || shouldPlayHoyBeat(session) || shouldPlayDoctoraBeat(session))"), "Hoy / Doctora finish still arm the first-win bird in the same turn as screen done");
assert(appSrc.includes("shouldPlayHoyBeat(session)"), "firstHoy plays the shared fly-away");
assert(appSrc.includes("shouldPlayDoctoraBeat(session)"), "firstDoctora plays the shared fly-away");
assert(appSrc.includes("shouldArmStory0Beat"), "story-0 first claim arms the free-win bird");
assert(appSrc.includes("shouldPlayStory0Beat(session)"), "done screen plays the story-0 bird from the session flag");
assert(appSrc.includes("<CenzontleFlyAway"), "done screen mounts the shared fly-away");
assert(appSrc.includes('surface="win"'), "free win bird uses the win surface of the #161 motion");
assert(!appSrc.includes("<Story0Beat"), "done screen does not mount Cubetas flap-then-perch");
assert(appSrc.includes("shouldPlayStory0Beat(session) || shouldPlayHoyBeat(session)"), "firstHoy reuses the story-0 fly-away helper");
assert(appSrc.includes("shouldPlayHoyBeat(session) || shouldPlayDoctoraBeat(session)"), "firstDoctora reuses the story-0 fly-away helper");
assert(appSrc.includes("shouldPlayStory0Beat(session) || shouldPlayHoyBeat(session) || shouldPlayDoctoraBeat(session)"), "story-0 / firstHoy / firstDoctora share the fly-away helper");
assert(!/winBounce && \(shouldPlayStory0Beat\(session\) \|\| shouldPlayHoyBeat\(session\) \|\| shouldPlayDoctoraBeat\(session\)\)/.test(appSrc), "free win is not the old beat-then-perch gate");
assert(appSrc.includes("@keyframes story0Courier"), "Cubetas 780ms keyframes stay on the Cubetas style sheet");
assert(appSrc.includes("translate(-118px,-158px)"), "Cubetas exit stays the Cubetas up-left arc");
assert(appSrc.includes("session.firstStory0"), "quiet win includes first story-0 Lectura");
assert(appSrc.includes("session.lecturaWin"), "quiet win includes later Lectura static WinPerch");
assert(appSrc.includes("shouldArmLecturaWin"), "later Lectura claim arms static WinPerch");
assert(appSrc.includes("shouldPlayLecturaWin(session)"), "later Lectura preloads Cenzontle for the perch");
assert(appSrc.includes("story-0-win"), "story-0 ¡Eso! heading is testable");
assert(appSrc.includes("lectura-win"), "later Lectura ¡Eso! heading is testable");
assert(appSrc.includes("{!quietWin && <Confetti"), "first-win mutes confetti so the courier is visible");
assert(appSrc.includes("{!quietWin && ("), "first-win hides the party-coach row");
assert(appSrc.includes("data-testid={winTestId}"), "¡Eso! heading stays the existing win test id");
assert(appSrc.includes("className={quietWin ? \"eso-rise\" : undefined}"), "¡Eso! copy is opacity / 3px rise only");
assert(appSrc.includes('const MARK_INK = "#5C7356"'), "lockup wordmark uses adult sage, not Duo lime");
assert(appSrc.includes("color: MARK_INK"), "header/splash wordmark reads MARK_INK");
assert(appSrc.includes('const HUB_CREAM = "#F6EFE4"'), "Learn cream token is #F6EFE4");
const dLight = appSrc.slice(appSrc.indexOf("const D_LIGHT"), appSrc.indexOf("const D_DARK"));
assert(/bg:\s*HUB_CREAM/.test(dLight), "light page token is the Learn cream");
assert(!/bg:\s*"#FFFFFF"/.test(dLight), "light page token is not pure white");
assert(!/bg:\s*"#fff"/.test(dLight), "light page token is not shorthand white");
assert(appSrc.includes('data-testid="app-shell"'), "app shell is testable");
assert(/data-testid="app-shell"[\s\S]{0,180}background:\s*D\.bg/.test(appSrc), "app shell fill is the page token");
assert(appSrc.includes("document.body.style.background = D.bg"), "body fill is the page token");
assert(/data-testid="learn-hub"[\s\S]{0,220}HUB_CREAM/.test(appSrc), "Learn hub fill is HUB_CREAM");
assert(!/minHeight:\s*"100vh"[\s\S]{0,80}background:\s*"#fff/.test(appSrc), "no hardcoded white 100vh page fill");
assert(appSrc.includes('data-testid="brand-home"'), "header lockup is the Learn home tap");
assert((appSrc.match(/data-testid="brand-home"/g) || []).length === 1, "one brand-home control — wordmark and mark share the tap");
const goLearnHomeSrc = appSrc.slice(appSrc.indexOf("const goLearnHome"), appSrc.indexOf("const dismissSessionClose"));
assert(goLearnHomeSrc.includes('setScreen("home")'), "brand tap sets screen home");
assert(goLearnHomeSrc.includes('setTab("camino")'), "brand tap sets the Learn home tab");
assert(!goLearnHomeSrc.includes('setTab("perfil")'), "brand tap does not open Perfil");
assert(!goLearnHomeSrc.includes('setTab("lectura")'), "brand tap does not open Lectura");
assert(!/splashOpen|setSplash|welcomed/.test(goLearnHomeSrc), "brand tap does not open splash");
const brandHomeSrc = appSrc.slice(appSrc.indexOf('data-testid="brand-home"'), appSrc.indexOf('data-testid="brand-home"') + 900);
assert(brandHomeSrc.includes("<LogoMark"), "brand tap includes the Cenzontle mark");
assert(brandHomeSrc.includes("ándale"), "brand tap includes the wordmark");
assert(brandHomeSrc.includes("MARK_INK"), "wordmark stays sage");
assert(!/border:\s*`2px|borderBottom:\s*`4px|duo-btn/.test(brandHomeSrc), "brand tap has no extra header chrome");
assert(!appSrc.includes('data-testid="brand-home-alt"'), "no second header bird");
assert(appSrc.includes("zIndex: splashOpen ? 70 : 50"), "header sits above the path sheet and under the soft-paywall");
assert(appSrc.includes("data-testid=\"learn-hub\""), "Learn home is the equal-tile hub");
assert(appSrc.includes("const HUB_FACES"), "v01c tiles use stamp PNG faces");
assert(appSrc.includes("const HubTileArt"), "hub tiles share HubTileArt");
assert(appSrc.includes("hub/hoy.png"), "Hoy face is public/hub/hoy.png");
assert(appSrc.includes("hub/stories.png"), "Stories face is public/hub/stories.png");
assert(appSrc.includes("hub/games.png"), "Games face is public/hub/games.png");
assert(appSrc.includes("hub/phrase-doctor.png"), "Phrase Doctor face is public/hub/phrase-doctor.png");
assert(appSrc.includes("hub/eighty.png"), "80/20 face is public/hub/eighty.png");
assert(appSrc.includes("hub/pin-chase.png"), "Pin chase face is public/hub/pin-chase.png");
assert(appSrc.includes("hub/flashcards.png"), "Flashcards face is public/hub/flashcards.png");
assert(appSrc.includes("hub/sendero.png"), "Sendero face is public/hub/sendero.png");
assert(!/hub\/sobremesa\.png/.test(appSrc.slice(appSrc.indexOf("const HUB_FACES"), appSrc.indexOf("const RecuerdosMexicoMap"))), "Sobremesa is not a live hub face");
assert(!/scaleX\s*\(\s*-1\s*\)/.test(appSrc.slice(appSrc.indexOf("const HUB_FACES"), appSrc.indexOf("const RecuerdosMexicoMap"))), "hub stamp faces must not CSS-mirror");
assert(!appSrc.includes("const HubHoyArt"), "geometric Hoy placeholder is gone");
assert(!appSrc.includes("HubArtFrame"), "geometric hub frame overlay is gone");
assert(!/HOME HUB|EXPLORA|MÁS ACTIVIDADES/.test(appSrc), "v01c hub has no section chrome");
assert(!/data-testid="home-pitch"/.test(appSrc), "home pitch is parked off the v01c hub face");
assert(!/splashSkip|splash-skip|{L\.splashSkip}/.test(appSrc), "Saltar/Skip is gone from splash");
assert(!/para quien ya pasó lo básico/.test(appSrc), "long ES home blob is gone");
assert(!/for people past the basics/.test(appSrc), "long EN home blob is gone");
assert(!/cuentos, misiones, tarjetas y cuatro coaches/.test(appSrc), "ES home pitch is not the long coaches blob");
assert(!/stories, challenges, flashcards, and four coaches/.test(appSrc), "EN home pitch is not the long coaches blob");
assert(!/Let's go!/.test(appSrc), "Let's go! is gone from splash");
assert(!/bonus de racha|streak bonus/.test(appSrc), "bonus de racha / streak bonus are gone");
assert(appSrc.includes("{L.safeRiskyReward}"), "Safe/Risky hub reward uses L.safeRiskyReward");
assert(appSrc.includes("{L.narrationLabel}"), "Lectura narration chrome uses L.narrationLabel");
assert(appSrc.includes('from "./storyGloss.js"'), "Lectura gloss map is imported");
assert(appSrc.includes("<GlossedText"), "story Qs use GlossedText");
assert(appSrc.includes("<GlossWord"), "Lectura paragraphs use GlossWord for stamped lemmas");
assert(appSrc.includes("hoyHubLoud"), "Hoy hub chrome stays loud after first win — not first-door hero");
assert(appSrc.includes("const hoyLoud = hoyHubLoud({ todayScene })"), "Hoy is the only loud hub tile");
assert(appSrc.includes("const hoyDone = hoyHubDone({ todaySceneDone })"), "done Hoy keeps today’s-home check");
assert(appSrc.includes('data-hub-loud={tile.id === "hoy" && hoyLoud ? "hoy" : undefined}'), "loud stroke attribute is Hoy-only");
assert(appSrc.includes("tile.id === \"hoy\" && hoyLoud ? D.green : D.line"), "green border is Hoy-only; Sendero uses the quiet line stroke");
assert(appSrc.includes('data-testid="hub-hoy-done"'), "done Hoy check is testable");
assert(appSrc.includes('data-testid="lesson-scene-chip"'), "mid-lesson scene line is a quiet chip");
assert(!/lesson-scene-chip[\s\S]{0,280}D\.gold/.test(appSrc), "scene chip has no yellow hero border");
assert(!/lesson-scene-chip[\s\S]{0,200}IcBolt/.test(appSrc), "scene chip is not a bolt callout");
assert(appSrc.includes('data-testid="hub-section-banner"'), "below-fold section chrome is testable");
assert(/hub-section-banner[\s\S]{0,220}HUB_CREAM/.test(appSrc), "section banner is cream, not a green hero bar");
assert(!/data-testid="hub-section-banner"[\s\S]{0,180}background: sec\.color/.test(appSrc), "section banner does not fill with section green");
assert(appSrc.includes("{sobremesaName(uiLang)}"), "below-fold Intermedio title follows uiLang");
assert(appSrc.includes("{sobremesaQuiet(uiLang)}"), "Intermedio quiet follows uiLang");
assert(appSrc.includes("{sobremesaSell(uiLang)}"), "Intermedio sell follows uiLang");
assert(appSrc.includes('data-testid="intermedio-lane"'), "Intermedio / Sección lane is testable");
assert(appSrc.includes('data-testid="hub-section-sell"'), "Intermedio sell is testable");
assert(!/data-testid="camino-more"[\s\S]{0,400}\{L\.more\}/.test(appSrc), "camino-more is not a bare More/Más header");
assert(!/id: "sendero"[\s\S]{0,220}selected/.test(appSrc), "Sendero has no selected/loud tile flag");
assert(appSrc.includes('testid: "hub-hoy"'), "Hoy is an equal hub tile");
assert(appSrc.includes('testid: "hub-stories"'), "Stories is an equal hub tile");
assert(appSrc.includes('testid: "hub-games"'), "Games is an equal hub tile");
assert(appSrc.includes('testid: "hub-phrase-doctor"'), "Phrase Doctor is an equal hub tile");
assert(appSrc.includes('testid: "hub-sendero"'), "Sendero is an equal hub tile");
assert(!/const hubTiles = \[[^\]]*testid: "hub-pins"/.test(appSrc), "Pin chase is not a Learn hub 6-grid tile");
assert(!/const hubTiles = \[[^\]]*testid: "hub-flashcards"/.test(appSrc), "Flashcards is not a Learn hub 6-grid tile");
const hubTilesSrc = appSrc.slice(appSrc.indexOf("const hubTiles = ["), appSrc.indexOf("];", appSrc.indexOf("const hubTiles = [")) + 2);
assert(/hub-hoy[\s\S]*hub-stories[\s\S]*hub-games[\s\S]*hub-phrase-doctor[\s\S]*eighty-twenty-cta[\s\S]*hub-sendero/.test(hubTilesSrc), "Learn hub 6-grid is Hoy · Stories · Games · Phrase Doctor · 80/20 · Sendero");
assert(!hubTilesSrc.includes("hub-sobremesa"), "Sobremesa is not in the hub tile list");
assert((hubTilesSrc.match(/\{ id: "/g) || []).length === 6, "Learn hub is a 6-tile grid");
assert(!appSrc.includes('testid: "hub-sobremesa"'), "Sobremesa is not a hub tile");
assert(appSrc.includes("title: L.hubHoy"), "Hoy tile label follows uiLang");
assert(appSrc.includes("title: L.hubStories"), "Stories tile label follows uiLang");
assert(appSrc.includes("title: L.hubGames"), "Games tile label follows uiLang");
assert(hubTilesSrc.includes("act: () => openGamesHub()"), "Learn hub Games tile opens Games hub");
assert(!hubTilesSrc.includes("startCubetas"), "Learn hub Games tile does not start Cubetas");
assert(!hubTilesSrc.includes("startAhorcado"), "Learn hub Games tile does not open Hangman");
assert(!hubTilesSrc.includes("hub-hangman"), "Hangman is not a seventh Learn hub card");
assert(!hubTilesSrc.includes("hub-memory"), "Memory is not a seventh Learn hub card");
assert(appSrc.includes("title: L.hubDoctor"), "Phrase Doctor tile label follows uiLang");
assert(appSrc.includes("{L.hubPins}"), "Pin chase label follows uiLang under Intermedio");
assert(appSrc.includes("{L.hubFlash}"), "Flashcards label follows uiLang under Intermedio");
assert(appSrc.includes("title: L.hubSendero"), "Sendero tile label follows uiLang");
assert(!appSrc.includes("title: L.hubSobremesa"), "Sobremesa wrap stamp is not a hub tile title");
assert(UI.es.hubHoy === "Hoy" && UI.en.hubHoy === "Hoy", "Hoy label is Hoy");
assert(UI.es.hubHoyQuiet === "Plan de 10 minutos" && UI.en.hubHoyQuiet === "10-minute plan", "Hoy quiet is the 10-min plan");
assert(UI.es.hoyPlanEyebrow === "HOY · 10 MIN" && UI.en.hoyPlanEyebrow === "TODAY · 10 MIN", "Hoy plan eyebrow is George stamp");
assert(UI.es.hoyPlanSell === "Un plan corto para hoy. Diez minutos. Luego paras." && UI.en.hoyPlanSell === "A short plan for today. Ten minutes. Then you stop.", "Hoy plan sell is George stamp");
assert(UI.es.hoyPlanCta === "Empezar el plan" && UI.en.hoyPlanCta === "Start the plan", "Hoy plan CTA is George stamp");
assert(UI.es.playScene === "Jugar la escena" && UI.en.playScene === "Play the scene", "scene step stays playScene");
assert(UI.es.hubStories === "Cuentos" && UI.en.hubStories === "Stories", "Stories title follows uiLang");
assert(UI.es.hubGames === "Juegos" && UI.en.hubGames === "Games", "Games title follows uiLang");
assert(UI.es.hubDoctor === "Doctora de frases" && UI.en.hubDoctor === "Phrase Doctor", "Phrase Doctor title follows uiLang");
assert(UI.es.hubDoctor === UI.es.phraseDoctor && UI.en.hubDoctor === UI.en.phraseDoctor, "hub Phrase Doctor matches the door title");
assert(UI.es.hubEighty === "80/20" && UI.en.hubEighty === "80/20", "80/20 is the loan");
assert(UI.es.hubEightyQuiet === "Reglas del subjuntivo" && UI.en.hubEightyQuiet === "Subjunctive rules", "80/20 quiet is rules, not a finance meme");
assert(UI.es.hubEightyQuiet !== SUBJ_FIVE_SUB.es && UI.en.hubEightyQuiet !== SUBJ_FIVE_SUB.en, "hub quiet is the required line; five-sheet keeps the alt");
assert(UI.es.hubSection === "Intermedio" && UI.en.hubSection === "Intermediate", "below-fold header is Intermedio");
assert(UI.es.hubSectionQuiet === "Charla real" && UI.en.hubSectionQuiet === "Real talk", "Intermedio quiet is George stamp");
assert(UI.es.hubSectionSell === SOBREMESA_SELL.es && UI.en.hubSectionSell === SOBREMESA_SELL.en, "Intermedio sell is George stamp");
assert(UI.es.hubPins === "Pin chase" && UI.en.hubPins === "Pin chase", "Pin chase is the loan");
assert(UI.es.hubFlash === "Flashcards" && UI.en.hubFlash === "Flashcards", "Flashcards is the loan");
assert(UI.es.hubSendero === "Sendero" && UI.en.hubSendero === "Sendero", "Sendero is the loan in both langs");
assert(UI.es.hubSenderoQuiet === "Tu camino" && UI.en.hubSenderoQuiet === "Your path", "Sendero quiet is the path");
assert(UI.es.hubSobremesa === "Intermedio" && UI.en.hubSobremesa === "Intermediate", "wrap face is Intermedio, not Sobremesa");
assert(UI.es.hubSobremesa === SOBREMESA_NAME.es && UI.en.hubSobremesa === SOBREMESA_NAME.en, "wrap name matches the Intermedio pack");
assert(UI.es.hubSobremesaQuiet === "Charla real" && UI.en.hubSobremesaQuiet === "Real talk", "wrap quiet is George stamp");
assert(UI.es.hubSobremesaSell === "Las reglas que se te pegan — para que el subjuntivo deje de sentirse tarea.", "ES Intermedio sell is George stamp");
assert(UI.en.hubSobremesaSell === "The rules that stick — so the subjunctive stops feeling like homework.", "EN Intermedio sell is George stamp");
assert(UI.es.hubSobremesaQuiet === SOBREMESA_QUIET.es && UI.en.hubSobremesaQuiet === SOBREMESA_QUIET.en, "wrap quiet matches pack");
assert(UI.es.hubSobremesaSell === SOBREMESA_SELL.es && UI.en.hubSobremesaSell === SOBREMESA_SELL.en, "wrap sell matches pack");
assert(UI.es.hubSection === sobremesaName("es") && UI.en.hubSection === sobremesaName("en"), "section lane title matches pack");
assert(appSrc.includes("WRAP PARK — Intermedio face"), "Intermedio wrap park comment stays");
assert(appSrc.includes("Sobremesa hub tile stays dead"), "Sobremesa hub tile stays dead");
assert(appSrc.includes('from "./sobremesa.js"'), "Intermedio words live in the content module");
assert(appSrc.includes('data-testid="sobremesa-cta"'), "Intermedio entry is testable");
assert(appSrc.includes("data-testid=\"sobremesa-sheet\""), "Intermedio sheet is testable");
assert(appSrc.includes("data-testid=\"sobremesa-face\""), "Intermedio first face is testable");
assert(appSrc.includes("data-testid=\"sobremesa-five\""), "Intermedio five is testable");
assert(appSrc.includes("data-testid=\"sobremesa-tips\""), "Intermedio tips expansion is testable");
assert(appSrc.includes("data-testid=\"sobremesa-perch\""), "quiet Cenzontle perch is testable");
assert(appSrc.includes("sobremesaFiveCard"), "five render as cream cards");
assert(/data-testid="sobremesa-line"[\s\S]{0,220}HUB_CREAM/.test(appSrc), "five cards sit on cream");
assert(/data-testid="sobremesa-sheet"[\s\S]{0,700}HUB_CREAM/.test(appSrc), "Intermedio sheet is cream");
assert(!/data-testid="sobremesa-perch"[\s\S]{0,80}cenzontle-bounce/.test(appSrc), "perch is not a win bounce");
assert(appSrc.includes("{sobremesaTipsOpen &&"), "tips list mounts only after expand");
assert(appSrc.includes("{sobremesaDeepenOpen &&"), "deepen mounts only after expand");
const sobremesaFiveAt = appSrc.indexOf('data-testid="sobremesa-five"');
const sobremesaTipsAt = appSrc.indexOf('data-testid="sobremesa-tips"');
const sobremesaDeepenAt = appSrc.indexOf('data-testid="sobremesa-deepen"');
assert(sobremesaFiveAt > 0 && sobremesaTipsAt > sobremesaFiveAt, "tips expansion sits after the five");
assert(sobremesaDeepenAt > sobremesaTipsAt, "deepen sits after tips — never first face");
assert(appSrc.includes("{sobremesaFive(uiLang).map"), "Intermedio five follows uiLang");
assert(appSrc.includes("{sobremesaTips(uiLang).map"), "Intermedio tips follow uiLang");
assert(!/data-testid="sobremesa-cta"[\s\S]{0,400}Club/.test(appSrc), "Intermedio entry is not Club");
assert(!/data-testid="sobremesa-cta"[\s\S]{0,400}80%/.test(appSrc), "entry label is not 80%");
assert(appSrc.includes("{sobremesaName(uiLang)}"), "Intermedio CTA uses the pack name");
assert(appSrc.includes("{sobremesaQuiet(uiLang)}"), "Intermedio CTA uses the pack quiet");
assert(SOBREMESA_FIVE.es.length === 5 && SOBREMESA_FIVE.en.length === 5, "pack five stays five");
assert(SOBREMESA_FIVE.en[0] === "Pretérito vs imperfecto — What happened? → pretérito. What was going on? → imperfecto. Llegué a las ocho; hacía frío.", "EN five 1 is George paste");
assert(SOBREMESA_FIVE.en[4].startsWith("Stop packaging English"), "EN five 5 is George paste");
const intermedioLaneAt = appSrc.indexOf('data-testid="intermedio-lane"');
const hubTilesCloseAt = appSrc.indexOf("</div>", appSrc.indexOf('data-testid="learn-hub-tiles"'));
assert(intermedioLaneAt > hubTilesCloseAt, "Intermedio lane sits below the 6-grid");
assert(!/const hubTiles = \[[^\]]*intermedio-lane/.test(appSrc), "Intermedio is not a seventh Learn tile");
assert(appSrc.includes("data-testid=\"hoy-plan\""), "Hoy plan card is testable");
assert(appSrc.includes("data-testid=\"hoy-plan-eyebrow\""), "Hoy plan eyebrow is testable");
assert(appSrc.includes("data-testid=\"hoy-plan-sell\""), "Hoy plan sell is testable");
assert(appSrc.includes("data-testid=\"hoy-plan-step\""), "Hoy scene step is testable");
assert(appSrc.includes("data-testid=\"hoy-plan-start\""), "Hoy plan CTA is testable");
assert(appSrc.includes("{L.playScene}"), "plan step uses playScene — not the tile");
assert(appSrc.includes("act: openPath"), "Sendero opens the existing Camino path sheet");
assert(appSrc.includes('data-testid="path-sheet"'), "Camino path sheet is the existing unit preview");
assert(!/Match & play|Arregla|Prioriza|Unlock Mexico|Flip & keep/.test([UI.es.hubStories, UI.es.hubGames, UI.es.hubDoctor, UI.es.hubPins, UI.es.hubFlash].join("\n")), "hub tiles have no slash tails");
assert(!/Stories|Games|Phrase Doctor/.test([UI.es.hubStories, UI.es.hubGames, UI.es.hubDoctor].join("\n")), "ES hub face is not English-loan salad");
assert(!/Cuentos|Juegos|Doctora de frases/.test([UI.en.hubStories, UI.en.hubGames, UI.en.hubDoctor].join("\n")), "EN hub face is not Spanish-title salad");
assert(UI.es.camino === "Camino" && UI.es.missions === "Misiones" && UI.es.reading === "Lectura" && UI.es.practice === "Práctica" && UI.es.profile === "Perfil", "George CLEAR: live ES Camino nav set");
assert(UI.en.camino === "Learn" && UI.en.missions === "Challenges" && UI.en.reading === "Stories" && UI.en.practice === "Review" && UI.en.profile === "Profile", "live EN Camino set — not Home/Library/Profile trio");
assert(UI.en.camino !== "Home" && UI.en.reading !== "Library", "nav is not the mock Home/Library English trio");
const navTabs = appSrc.slice(appSrc.indexOf("BOTTOM TABS"), appSrc.indexOf("BOTTOM TABS") + 900);
assert(/id: "camino"[\s\S]*id: "misiones"[\s\S]*id: "lectura"[\s\S]*id: "practica"[\s\S]*id: "perfil"/.test(navTabs), "bottom nav is the five live Camino tabs");
assert(!/id: "home"|id: "library"/.test(navTabs), "bottom nav has no Home/Library tab ids");
assert(!/data-testid="first-door-hero"/.test(appSrc), "v01c hub has no hero card");
assert(/gridTemplateColumns:\s*"1fr 1fr"/.test(appSrc.slice(appSrc.indexOf("learn-hub-tiles"), appSrc.indexOf("learn-hub-tiles") + 400)), "hub is a 2-column equal grid");
assert(/height:\s*168/.test(appSrc.slice(appSrc.indexOf("learn-hub-tiles"), appSrc.indexOf("learn-hub-tiles") + 1200)), "hub tiles share one equal height");
assert(appSrc.includes("gatedLiftStoryQuiz"), "Hoy / misión / rutina story Qs are Lectura-gated");
assert(appSrc.includes("pickCompletedStory"), "rutina picks only claimed Lectura stories");
assert(appSrc.includes("storyQuizCue"), "practice prompt has a slot for a George story cue");
assert(appSrc.includes("storyQuizCueLine"), "optional second cue line is hooked, off by default");
assert(appSrc.includes("storyQuizPassage"), "practice shows the matching Lectura passage");
assert(appSrc.includes("shuffleStoryChoiceOrder"), "Lectura shuffles choice order when a story opens");
assert(appSrc.includes("storyQuestionChoices"), "Lectura renders the session shuffle, not authored order");
assert(appSrc.includes("isStoryChoiceCorrect"), "Lectura scores comprehension by choice value");
assert(!appSrc.includes("qq.choices[ansSel[i]] === qq.answer"), "Lectura must not score by authored index 0");
assert(appSrc.includes("passageForStoryQuestion"), "Lectura Qs resolve a same-screen passage");
assert(appSrc.includes("data-testid=\"story-quiz-cue\""), "story cue eyebrow is testable");
assert(appSrc.includes("data-testid=\"story-quiz-cue-line\""), "optional cue line slot is testable");
assert(appSrc.includes("data-testid=\"story-quiz-passage\""), "on-screen passage is testable");
assert(STORY_QUIZ_CUE.es === "Según el cuento", "George ES eyebrow");
assert(STORY_QUIZ_CUE.en === "From the story", "George EN eyebrow");
assert(STORY_QUIZ_CUE_LINE.es === "Responde según lo que acabas de leer.", "George ES cue line");
assert(STORY_QUIZ_CUE_LINE.en === "Answer from what you just read.", "George EN cue line");
assert(storyQuizEyebrow("es") === "Según el cuento", "eyebrow helper ES");
assert(storyQuizEyebrow("en") === "From the story", "eyebrow helper EN");
assert(storyQuizCue({ _u: "_story" }, "en") === "", "eyebrow stays off without a passage");
assert(storyQuizCueLine({}, "en") === "", "second line stays off by default");
const cerezasStory = STORIES.find((s) => s.id === "story-9");
const cerezasRefused = cerezasStory.questions.find((qq) => /¿Por qué se negó/.test(qq.prompt));
assert(/dependo de una sola empresa|empresa japonesa/.test(passageForStoryQuestion(cerezasStory, cerezasRefused)), "cerezas refused Q shows the harvest paragraph");
for (const s of STORIES) {
  for (const qq of s.questions) {
    assert(!!passageForStoryQuestion(s, qq), `${s.id} comprehension Q has a same-screen passage`);
  }
}
assert(appSrc.includes("come-back-tomorrow"), "home line after win is wired");
assert(appSrc.includes("path-entry"), "Subjuntivo path stays under Empieza");
assert(/camino-more[\s\S]{0,900}path-entry/.test(appSrc), "EMPIEZA is buried under Intermedio");
assert(appSrc.includes("practica-fold"), "Práctica fold hosts Phrase Doctor / Safe-Risky / Match & play");
assert(appSrc.includes("data-testid=\"match-play\""), "Match & play hub group is testable");
assert(appSrc.includes("data-testid=\"games-hub\""), "Games hub is testable");
assert(appSrc.includes("data-testid=\"hangman-start\""), "Hangman lives under Games next to Cubetas");
assert(appSrc.includes("data-testid=\"jeopardy-start\""), "Jeopardy lives under Games next to Cubetas + Hangman");
assert(appSrc.includes("data-testid=\"jeopardy-board\""), "Jeopardy playfield is testable");
assert(appSrc.includes("data-testid=\"jeopardy-howto\""), "Jeopardy open how-to is testable");
assert(appSrc.includes("jeopardyTitle(uiLang)"), "Jeopardy title follows uiLang");
assert(appSrc.includes("jeopardyQuiet(uiLang)"), "Jeopardy quiet follows uiLang");
assert(appSrc.includes("jeopardyHowTo(uiLang)"), "Jeopardy how-to follows uiLang");
assert(appSrc.includes("startJeopardy(\"games\")"), "Games hub starts Jeopardy with games return");
assert(!appSrc.includes("JEOPARDY SOLO"), "no JEOPARDY SOLO lockup");
assert(!appSrc.includes("Reto Ándale / Jeopardy"), "no bilingual Jeopardy lockup");
assert(appSrc.includes("<JeopardyMark"), "flat geometric board mark is wired");
assert(appSrc.includes("data-testid=\"memory-start\""), "Memory lives under Games next to Cubetas + Hangman + Jeopardy");
assert(appSrc.includes("data-testid=\"memory-board\""), "Memory playfield is testable");
assert(appSrc.includes("data-testid=\"memory-howto\""), "Memory open how-to is testable");
assert(appSrc.includes("memoryTitle(uiLang)"), "Memory title follows uiLang");
assert(appSrc.includes("memoryQuiet(uiLang)"), "Memory quiet follows uiLang");
assert(appSrc.includes("memoryHowTo(uiLang)"), "Memory how-to follows uiLang");
assert(appSrc.includes("startMemory(\"games\")"), "Games hub starts Memory with games return");
assert(!appSrc.includes("MEMORIA / MEMORY"), "no bilingual Memory lockup");
assert(appSrc.includes("<MemoryMark"), "flat geometric two-tile mark is wired");
assert(appSrc.includes("data-testid=\"memory-card\""), "Memory cards are testable");
assert(appSrc.includes("onPointerDown"), "Memory drag uses pointer events");
assert(appSrc.includes("onMemoryPair"), "Memory drag-to-pair is wired");
assert(appSrc.includes("onMemoryTap"), "Memory tap match is wired");
assert(appSrc.includes("className={`word-chip"), "Memory cards use the full-word bubble");
assert(appSrc.includes("repeat(3, minmax(0, 1fr))"), "Memory grid is a 3-column board");
assert(appSrc.includes("MEMORY_CARD_MIN = 140"), "Memory card min-height is the 140px size lock");
assert(appSrc.includes("MEMORY_CARD_TYPE = 26"), "Memory face type is the 26px hero lock");
assert(appSrc.includes("MEMORY_CARD_MARK"), "Memory face-down mark scales with the card");
assert(appSrc.includes("MEMORY_CARD_FACE"), "Memory cards beat word-chip max-content");
assert(appSrc.includes("MEMORY_BOARD_PAD = 4"), "Memory board side pad is the 4px width lock");
assert(appSrc.includes(".word-chip.memory-card"), "Memory CSS specificity beats word-chip shrink");
assert(appSrc.includes("className=\"memory-board\""), "Memory board wrapper is width-locked");
assert(!appSrc.includes("MEMORY_CARD_MIN = 96"), "167's 96px min is gone");
assert(!appSrc.includes("MEMORY_CARD_TYPE = 20"), "167's 20px type is gone");
assert(!appSrc.includes("MemoryMark size={22}"), "Memory face-down is not a micro icon");
assert(!appSrc.includes("MemoryMark size={36}"), "Memory face-down is not the 167 mark nudge");
assert(appSrc.includes("data-testid=\"memory-literal-why\""), "Memory Literal · Why chip is testable");
assert(appSrc.includes("data-testid=\"memory-region\""), "Memory region chip is testable");
assert(!appSrc.includes("memory-pairs-start"), "no leftover Memory pairs tile id");
assert(appSrc.includes("data-testid=\"hangman-board\""), "Hangman playfield is testable");
assert(appSrc.includes("data-testid=\"hangman-howto\""), "Hangman open how-to is testable");
assert(appSrc.includes("data-testid=\"hangman-literal\""), "Hangman Literal hook is testable");
assert(appSrc.includes("data-testid=\"hangman-why\""), "Hangman Why hook is testable");
assert(appSrc.includes("data-testid=\"hangman-region\""), "Hangman region chip is testable");
assert(appSrc.includes("hangmanRegionChip"), "Hangman wires MX/ES/AR/CO chips");
assert(appSrc.includes("data-testid=\"hangman-slot-key\""), "Hangman blanks show stable numbers");
assert(appSrc.includes("hangmanSlotIndexForKey"), "Hangman number keys jump focus");
assert(appSrc.includes("hangmanIsLetterKey"), "Hangman accepts hardware letter keys");
assert(appSrc.includes("hangmanShowTeach(ahorcado)"), "Hangman auto-shows Literal/Why on wrong");
assert(appSrc.includes("data-testid=\"accent-row\""), "Hangman accent row is testable");
assert(appSrc.includes("extraRow={HANGMAN_ACCENTS}"), "Hangman wires ÁÉÍÓÚÜ");
assert(appSrc.includes("hangmanTitle(uiLang)"), "Hangman title follows uiLang");
assert(appSrc.includes("hangmanQuiet(uiLang)"), "Hangman quiet follows uiLang");
assert(appSrc.includes("hangmanHowTo(uiLang)"), "Hangman how-to follows uiLang");
assert(appSrc.includes("hangmanLiteralLabel(uiLang)"), "Hangman Literal chrome is stamped Literal");
assert(appSrc.includes("hangmanWhyLabel(uiLang)"), "Hangman Why chrome is stamped");
assert(!appSrc.includes("AHORCADO / HANGMAN"), "no bilingual Hangman lockup in App");
assert(!appSrc.includes("💀"), "no gore skull on Hangman");
assert(!appSrc.includes("gallowParts"), "cartoon hangman body is gone");
assert(appSrc.includes("<HangmanMark"), "flat geometric gallows mark is wired");
assert(HANGMAN_TITLE.es === "Ahorcado" && HANGMAN_TITLE.en === "Hangman", "Hangman title is ES Ahorcado / EN Hangman");
assert(hangmanTitle("es") === "Ahorcado" && hangmanTitle("en") === "Hangman", "title helper follows uiLang");
assert(HANGMAN_QUIET.es === "Palabras de México" && HANGMAN_QUIET.en === "Mexican words", "quiet line is stamped");
assert(HANGMAN_HOWTO.es === "Adivina la palabra. Una letra a la vez.", "ES how-to stamp");
assert(HANGMAN_HOWTO.en === "Guess the word. One letter at a time.", "EN how-to stamp");
assert(HANGMAN_BANK.length === 20, "Hangman bank is the 20-word stamp");
assert(HANGMAN_BANK.some((row) => row.word === "órale"), "bank includes órale");
assert(hangmanRegionChip(HANGMAN_BANK.find((r) => r.word === "órale")) === "MX · raro en ES/AR/CO", "órale region chip flags ES/AR/CO");
assert(HANGMAN_BANK.every((row) => row.home?.length && row.weird?.en), "every Hangman word has country notes");
assert(HANGMAN_ACCENTS.join("") === "ÁÉÍÓÚÜ", "accent keys are ÁÉÍÓÚÜ");
assert(HANGMAN_TIMER_DEFAULT === false, "Hangman timer is off by default");
assert(hangmanSlotKey(0) === "1" && hangmanSlotKey(1) === "2", "Hangman blank numbers are stable");
assert(hangmanShowTeach({ lastHit: false, status: "play" }), "wrong letter is a teach beat");
assert(appSrc.includes('data-timer={ahorcado.timerOn ? "on" : "off"}'), "Hangman exposes timer-off");
const hangmanSlice = appSrc.slice(appSrc.indexOf("screen === \"ahorcado\""), appSrc.indexOf("{/* ---------- JEOPARDY"));
const jeopardySlice = appSrc.slice(appSrc.indexOf("screen === \"jeopardy\""), appSrc.indexOf("{/* ---------- MEMORY"));
const memorySlice = appSrc.slice(appSrc.indexOf("const MemoryMark"), appSrc.indexOf("Dave-cleared illustrated Mexico"));
assert(!/cenzontle|penguin|CoachPortrait/.test(jeopardySlice), "Jeopardy adds no second mascot");
assert(JEOPARDY_TITLE.es === "Jeopardy" && JEOPARDY_TITLE.en === "Jeopardy", "Jeopardy title is the loan");
assert(jeopardyTitle("es") === "Jeopardy" && jeopardyTitle("en") === "Jeopardy", "title helper is the loan");
assert(JEOPARDY_QUIET.es === "Elige categoría, elige valor, responde.", "ES quiet is the restored line");
assert(JEOPARDY_QUIET.en === "Pick a category, pick a value, answer.", "EN quiet is the restored line");
assert(JEOPARDY_HOWTO.es === JEOPARDY_QUIET.es && JEOPARDY_HOWTO.en === JEOPARDY_QUIET.en, "how-to reuses quiet");
assert(JEOPARDY_CATEGORY_IDS.length === 6 && JEOPARDY_VALUES.length === 3, "restored 6×3 board");
assert(appSrc.includes("jeopardyCatLabel(cat.id, uiLang)"), "Jeopardy board headers use the short face");
assert(appSrc.includes('minmax(min-content, 1fr)'), "Jeopardy columns grow to the full header word");
assert(!/jeopardy-grid[\s\S]{0,180}minmax\(78px/.test(appSrc), "Jeopardy grid no longer forces a 78px overflow clip");
assert(!/jeopardy-grid[\s\S]{0,80}minmax\(0, 1fr\)/.test(appSrc), "Jeopardy columns are not minmax(0) shrink-to-clip");
assert(jeopardySlice.includes('overflow: "visible"'), "Jeopardy headers are not overflow-clipped");
assert(!/jeopardy-cat-\$\{cat\.id\}[\s\S]{0,400}textOverflow:\s*"ellipsis"/.test(appSrc), "Jeopardy headers have no ellipsis");
assert(JEOPARDY_CAT_LABEL.reg.en === "Register" && JEOPARDY_CAT_LABEL.reg.es === "Registro", "6th header is Register / Registro");
assert(jeopardyCatLabel("reg", "en") === "Register", "EN 6th header is the full word Register");
assert(jeopardyCatLabel("reg", "es") === "Registro", "ES 6th header is the full word Registro");
assert(!Object.values(JEOPARDY_CAT_LABEL).some((row) => /Register and tone|Registro y tono/.test(`${row.es} ${row.en}`)), "board face is not the wrap-cut Register and tone lockup");
assert(!/cenzontle|penguin|CoachPortrait/.test(memorySlice), "Memory adds no second mascot");
assert(!/Confetti|soft chrome|cenzontle\.png/.test(memorySlice), "Memory playfield parks soft chrome");
assert(memorySlice.includes("word-chip"), "Memory word chips size to the full word");
assert(memorySlice.includes("WORD_CHIP_STYLE") || memorySlice.includes("WORD_CHIP_PHRASE_STYLE"), "Memory cards use the shared full-word bubble");
assert(!memorySlice.includes('textOverflow: "ellipsis"'), "Memory cards have no ellipsis");
assert(!memorySlice.includes("minWidth: showFace ? 0"), "Memory face-up cards do not shrink below the word");
assert(memorySlice.includes("MEMORY_CARD_MIN"), "Memory cards use the Brand CLEAR min-height");
assert(memorySlice.includes("MEMORY_CARD_TYPE"), "Memory face type is locked large");
assert(memorySlice.includes("MEMORY_CARD_FACE"), "Memory face style fills the 3×4 cell");
assert(memorySlice.includes("MEMORY_BOARD_PAD"), "Memory board drops the 480 centered column");
assert(memorySlice.includes('maxWidth: "none"'), "Memory board is not a max-width column");
assert(!/memory-board[\s\S]{0,180}maxWidth:\s*480/.test(memorySlice), "Memory board is not the 480 center strip");
assert(memorySlice.includes('gridTemplateColumns: "repeat(3, minmax(0, 1fr))"'), "Memory playfield is a 3-wide grid");
assert(!/data-testid="memory-card"[\s\S]{0,900}minHeight: 44/.test(memorySlice), "Memory cards are not 44px strips");
assert(!/data-testid="memory-card"[\s\S]{0,1200}minHeight: 96/.test(memorySlice), "Memory cards are not the 96px nudge");
assert(!/data-testid="memory-card"[\s\S]{0,900}fontSize: 15/.test(memorySlice), "Memory face type is not the old 15px chip");
assert(!/data-testid="memory-card"[\s\S]{0,1200}fontSize: 20[,}]/.test(memorySlice), "Memory face type is not the 20px nudge");
assert(memorySlice.includes("memory-literal-why"), "Literal · Why stays under the grid");
assert(/\.word-chip \{[^}]*min-width:\s*min-content/.test(appSrc), "word-chip min-width is the word, not 0");
assert(!/\.word-chip \{[^}]*min-width:\s*0;/.test(appSrc), "word-chip CSS does not shrink below content");
assert(/\.word-chip \{[^}]*text-overflow:\s*unset/.test(appSrc), "word-chip CSS has no ellipsis");
assert(appSrc.includes("WORD_CHIP_STYLE"), "shared full-word chip style is stamped");
assert(appSrc.includes("WORD_CHIP_PHRASE_STYLE"), "phrase chips wrap only when the parent cannot hold the word");
assert(MEMORY_TITLE.es === "Memoria" && MEMORY_TITLE.en === "Memory", "Memory title is ES Memoria / EN Memory");
assert(memoryTitle("es") === "Memoria" && memoryTitle("en") === "Memory", "Memory title helper follows uiLang");
assert(MEMORY_QUIET.es === "Pares mexicanos" && MEMORY_QUIET.en === "Mexican pairs", "Memory quiet is stamped");
assert(MEMORY_HOWTO.es === "Toca dos cartas o arrastra un par.", "ES Memory how-to stamp");
assert(MEMORY_HOWTO.en === "Tap two cards or drag a pair.", "EN Memory how-to stamp");
assert(MEMORY_BANK.length === 20, "Memory bank is the 20-pair stamp");
assert(MEMORY_BANK.some((row) => row.word === "órale"), "Memory bank includes órale");
assert(memoryRegionChip(MEMORY_BANK.find((r) => r.word === "chamba")) === "MX · odd in ES/AR", "chamba Memory chip flags ES/AR");
assert(memoryRegionChip(MEMORY_BANK.find((r) => r.word === "bronca")) === "", "Wide LATAM has no MX-strong chip");
assert(!/cenzontle|penguin|CoachPortrait/.test(hangmanSlice), "Hangman adds no second mascot");
assert(!/why-toggle|showWhy/.test(hangmanSlice), "Hangman Why is not behind a tap");
assert(hangmanSlice.includes("word-chip"), "Hangman word chips size to the full word");
assert(appSrc.includes("data-testid=\"cubetas-start\""), "Cubetas lives under Games / Match & play");
assert(appSrc.includes("data-testid=\"cubetas-board\""), "Cubetas playfield is testable");
assert(appSrc.includes("data-testid=\"cubetas-chip\""), "Cubetas chip is a draggable pill");
assert(appSrc.includes("data-testid=\"cubetas-hint\""), "Cubetas open shows a drag/tap line");
assert(appSrc.includes("cubetas-bucket-${id}"), "mood buckets are testable");
assert(appSrc.includes("cubetas-bucket-label-${id}"), "bucket titles are live labels under the pots");
const cubetasLabelChunk = appSrc.slice(appSrc.indexOf("cubetas-bucket-label-${id}"), appSrc.indexOf("cubetas-bucket-label-${id}") + 900);
assert(cubetasLabelChunk.includes('whiteSpace: "normal"'), "bucket titles wrap instead of clipping Indicate");
assert(cubetasLabelChunk.includes('overflow: "visible"'), "bucket titles are not overflow-clipped");
assert(!cubetasLabelChunk.includes('textOverflow: "ellipsis"'), "bucket titles have no ellipsis");
assert(appSrc.includes("CUBETAS_BUCKETS.map"), "only the two mood buckets are mapped");
assert(!appSrc.includes("cubetas-bucket-trigger"), "no Trigger bucket");
assert(!appSrc.includes("cubetas-bucket-use"), "no Use bucket");
assert(appSrc.includes("data-testid=\"cubetas-cenzontle\""), "one Cenzontle rig on Cubetas");
assert(appSrc.includes("data-testid=\"cubetas-literal\""), "Cubetas Literal hook is testable");
assert(appSrc.includes("data-testid=\"cubetas-why\""), "Cubetas Why hook is testable");
assert(appSrc.includes("data-testid=\"cubetas-wrong-teach\""), "Cubetas wrong auto-shows Why");
assert(appSrc.includes("data-testid=\"cubetas-exception\""), "Cubetas exception chips surface Exception");
assert(appSrc.includes("cubetasExceptionLabel"), "Cubetas Exception chrome is stamped");
assert(appSrc.includes("className={`word-chip"), "Cubetas chip uses the full-word bubble");
assert(appSrc.includes("{L.literalLabel}"), "Cubetas Literal chrome uses L.literalLabel");
assert(appSrc.includes("{L.whyLabel}"), "Cubetas Why chrome uses L.whyLabel");
assert(appSrc.includes("cubetas-bird-win"), "Cubetas win motion class is wired");
assert(appSrc.includes("cubetasBirdEnter ${CUBETAS_ENTER_MS}ms ${CUBETAS_EASE_ENTER}"), "Cubetas enter is 160ms cubic-bezier(.22,.75,.25,1)");
assert(appSrc.includes("cubetasBucketFly ${CUBETAS_WIN_MS}ms"), "Cubetas bucket fly is the 780ms lock");
assert(appSrc.includes("CUBETAS_EASE_LIFT"), "Cubetas lift uses cubic-bezier(.2,.9,.3,1)");
assert(appSrc.includes("CUBETAS_EASE_EXIT"), "Cubetas exit uses cubic-bezier(.45,0,.8,.45)");
assert(appSrc.includes("translate(-118px,-158px)"), "Cubetas exit is a real up-left arc, not a straight translate");
assert(appSrc.includes("cubetas-handle-${id}"), "handle grab target is testable");
assert(appSrc.includes("cubetas-bucket-art-${id}"), "clay prop imgs are testable");
assert(appSrc.includes("CUBETAS_BUCKET_SRC"), "mood buckets load clay prop PNGs");
assert(appSrc.includes("cubetas-bucket-win-glow"), "winning bucket gets cream/terracotta glow");
assert(appSrc.includes("CUBETAS_GLOW_CREAM") && appSrc.includes("CUBETAS_GLOW_TERRACOTTA"), "win glow is cream/terracotta, not blue UI");
assert(!appSrc.includes("700ms ease-out"), "stiff 700ms ease-out fly is gone");
assert(CUBETAS_WIN_MS === 780, "Cubetas win lock is 780ms");
assert(CUBETAS_BIRD_PX === 64, "Cenzontle grab is 64px on the handle");
assert(CUBETAS_EASE_ENTER === "cubic-bezier(.22,.75,.25,1)", "enter ease locked");
assert(CUBETAS_EASE_LIFT === "cubic-bezier(.2,.9,.3,1)", "lift ease locked");
assert(CUBETAS_EASE_EXIT === "cubic-bezier(.45,0,.8,.45)", "exit ease locked");
assert(CUBETAS_TITLE.es === "Cubetas" && CUBETAS_TITLE.en === "Bucket fly", "title is ES Cubetas / EN Bucket fly");
assert(appSrc.includes("cubetasTitle(uiLang)"), "Cubetas title follows uiLang");
assert(!appSrc.includes("Bucket fly · Cubetas"), "no bilingual lockup title in App");
assert(OJALA_QUE_PACK[0].phrase === "Ojalá que", "Ojalá que pack leads");
assert(OJALA_QUE_PACK.length === 22, "Cubetas Why bank v1 is 22 chips");
assert(OJALA_QUE_PACK.filter((c) => c.exception === true).length === 3, "three exception chips");
assert(OJALA_QUE_PACK.find((c) => c.id === "ojala-que").why.en === "Wish", "Ojalá Why EN is Wish");
assert(OJALA_QUE_PACK.find((c) => c.id === "aunque-fact").exception === true, "aunque fact is exception:true");
assert(appSrc.includes("mascot/cenzontle.png"), "Cubetas reuses the logo Cenzontle");
assert(CUBETAS_BUCKET_SRC.subjunctive === "cubetas/bucket-subjunctive.png", "subjunctive prop path");
assert(CUBETAS_BUCKET_SRC.indicative === "cubetas/bucket-indicative.png", "indicative prop path");
const cubetasSlice = appSrc.slice(appSrc.indexOf("const CubetasPlayfield"), appSrc.indexOf("const MARK_INK"));
assert(!/scaleX\s*\(\s*-1\s*\)/.test(cubetasSlice), "Cubetas must not CSS-mirror Cenzontle");
assert(!cubetasSlice.includes("viewBox=\"0 0 80 18\""), "SVG card-handle is gone");
assert(!/background:\s*active \? D\.greenBg : D\.card/.test(cubetasSlice), "white-card buckets are gone");
assert((cubetasSlice.match(/data-testid="cubetas-cenzontle"/g) || []).length === 2, "one Cenzontle img per state — win on handle, else offstage/eso");
assert(!/idle flap|cubetas-bird-idle/i.test(cubetasSlice), "no idle flap");
CUBETAS_DEAD_LABELS.forEach((dead) => {
  assert(!new RegExp(`cubetas-bucket-${dead.toLowerCase()}`).test(appSrc), `no ${dead} bucket`);
});
assert(appSrc.includes("{L.dailyWorkout}"), "Práctica weakness / Perfil Luna CTAs use L.dailyWorkout");
assert(appSrc.includes("L.dailyWorkout"), "Camino hero secondary uses L.dailyWorkout");
assert(appSrc.includes("L.workoutDone"), "Camino hero done-state uses L.workoutDone");
assert(appSrc.includes("title: L.workoutToday"), "Daily session title uses L.workoutToday");
assert(!/"Daily workout"/.test(appSrc), "Camino hero is not hardcoded Daily workout");
assert(!/"Workout done"/.test(appSrc), "Camino hero is not hardcoded Workout done");
assert(!/"Today's workout"/.test(appSrc), "Session title is not hardcoded Today's workout");
assert(!/"Workout complete"/.test(appSrc), "workoutDone is not Workout complete");
assert(!/>Workout</.test(appSrc), "Práctica weakness CTA is not hardcoded Workout");
assert(!/Workout diario/.test(appSrc), "Perfil Luna CTA is not hardcoded Workout diario");
assert(!/Workout/.test([UI.es.workoutDone, UI.es.workoutToday, UI.es.dailyWorkout, UI.en.workoutDone, UI.en.workoutToday, UI.en.dailyWorkout].join("\n")), "Routine family has no Workout leftover");
assert(UI.es.shortcuts === "Luna, Don Rafa, Valeria y Diego te acompañan. Atajos: 1–4.", "UI.es.shortcuts");
assert(UI.es.on === "ON" && UI.es.off === "OFF", "Rayo stays ON/OFF, not SÍ/NO");
assert(UI.es.on !== "SÍ" && UI.es.off !== "NO", "Rayo on/off is not SÍ/NO");
assert(!/Flashcards|DIÁLOGO DUEL|Deck terminado/.test([UI.es.cards, UI.es.flashTitle, UI.es.dialogueDuel, UI.es.duel, UI.es.saveCard, UI.es.emptyDeck, UI.es.flashDone].join("\n")), "ES chrome leftover English");
assert(appSrc.includes("Tu siguiente ronda."), "ES Smart Practice reason is George lock");
assert(appSrc.includes("Empezar ronda de 5 — sin vidas"), "ES Smart Practice CTA is George lock");
assert(appSrc.includes("Start 5-item sprint — no hearts"), "EN Smart Practice CTA stays sprint");
assert(appSrc.includes("Chosen as your next useful sprint."), "EN Smart Practice reason stays sprint");
assert(!/Empezar sprint de 5/.test(appSrc), "ES CTA is not Empezar sprint");
assert(!/siguiente sprint útil/.test(appSrc), "ES reason is not siguiente sprint útil");
assert(!/Empezar tanda|siguiente tanda|tanda útil/.test(appSrc), "ES chrome is not tanda");
assert(!/Elegido como tu siguiente/.test(appSrc), "ES reason is not Elegido como…");
assert(!/útil/.test("Tu siguiente ronda.Empezar ronda de 5 — sin vidas"), "locked ES lines have no útil");
assert(!appSrc.includes("JEOPARDY SOLO"), "JEOPARDY SOLO lockup is gone");
assert(appSrc.includes('uiLang === "en" ? "Sound" : "Sonido"'), "mute aria-label follows uiLang");
assert(!/aria-label="Sound"/.test(appSrc), "mute aria-label is not hardcoded Sound");
assert(appSrc.includes('" (blocked)"') && appSrc.includes('" (bloqueado)"'), "locked unit-node suffix follows uiLang");
assert(!/unlocked \? "" : " \(bloqueado\)"/.test(appSrc), "locked unit-node suffix is not hardcoded bloqueado");
assert(appSrc.includes("Idioma de contexto: inglés") && appSrc.includes("Idioma de contexto: español"), "perfil lang aria follows uiLang");
assert(appSrc.includes("English context language") && appSrc.includes("Spanish context language"), "EN perfil lang aria kept");
assert(!/aria-label=\{opt\.id === "en" \? "English context language" : "Spanish context language"\}/.test(appSrc), "perfil lang aria is not hardcoded English");
assert(appSrc.includes('uiLang === "en" ? "Listen" : "Escuchar"'), "listen aria-label follows uiLang");
assert(!/aria-label="Escuchar"/.test(appSrc), "listen aria-label is not hardcoded Escuchar");
assert(appSrc.includes('uiLang === "en" ? "Slower" : "Más lento"'), "slower aria-label follows uiLang");
assert(!/aria-label="Más lento"/.test(appSrc), "slower aria-label is not hardcoded Más lento");
assert(appSrc.includes('uiLang === "en" ? "Listen to paragraph" : "Escuchar párrafo"'), "story paragraph listen aria follows uiLang");
assert(!/aria-label="Escuchar párrafo"/.test(appSrc), "story paragraph listen aria is not hardcoded Escuchar párrafo");
assert(appSrc.includes('uiLang === "en" ? "Listen to word" : "Escuchar palabra"'), "story word listen aria follows uiLang");
assert(!/aria-label="Escuchar palabra"/.test(appSrc), "story word listen aria is not hardcoded Escuchar palabra");
assert(appSrc.includes('aria-label={uiLang === "en" ? "Questions" : "Preguntas"}'), "story questions nav aria follows uiLang");
assert(!/aria-label="Preguntas"/.test(appSrc), "story questions nav aria is not hardcoded Preguntas");
assert(appSrc.includes("`Paragraph ${i + 1}`") && appSrc.includes("`Párrafo ${i + 1}`"), "story paragraph nav aria follows uiLang");
assert(!/aria-label=\{`Párrafo \$\{i \+ 1\}`\}/.test(appSrc), "story paragraph nav aria is not hardcoded Párrafo");

const explainByEs = new Map(PRACTICE_EXPLAIN.map((row) => [row.es, row]));
for (const u of UNITS) {
  u.questions.forEach((q, i) => {
    if (typeof q.explain !== "string") return;
    const row = explainByEs.get(q.explain);
    assert(row && row.en && row.en !== q.explain, `${u.id} Q${i} Why needs temporary EN`);
    assert(explainText(q, "es") === q.explain, `${u.id} Q${i} ES Why stays authored`);
    assert(explainText(q, "en") === row.en, `${u.id} Q${i} EN Why follows map`);
  });
}
for (const sc of TODAY_SCENES) {
  if (sc.explainEn) {
    assert(explainText(sc, "es") === sc.explain, `${sc.id} prefers authored ES explain`);
    assert(explainText(sc, "en") === sc.explainEn, `${sc.id} prefers existing explainEn`);
  } else if (typeof sc.explain === "string" && explainByEs.has(sc.explain)) {
    assert(explainText(sc, "en") === explainByEs.get(sc.explain).en, `${sc.id} Spanish-only explain has EN map`);
  }
}
assert(focusLabel("Modo verbal", "es") === "Modo verbal", "Focus Modo verbal stays ES");
assert(focusLabel("Modo verbal", "en") === "Verb mood", "Focus Modo verbal follows uiLang");
assert(FOCUS_LABELS.Subjuntivo.en === "Subjunctive", "Focus Subjuntivo EN");
assert(FOCUS_LABELS.Lectura.es === "Lectura", "Focus Lectura stays ES");
assert(FOCUS_LABELS.Lectura.en === "Reading", "Focus Lectura follows uiLang");
assert(focusLabel("Lectura", "es") === "Lectura", "Focus Lectura display ES");
assert(focusLabel("Lectura", "en") === "Reading", "Focus Lectura display EN");
const cerezas = STORIES.find((s) => s.id === "story-9");
assert(cerezas && cerezas.title === "Las cerezas de don Adán", "story-9 is Las cerezas de don Adán");
const cerezasWhyQ = cerezas.questions.find((qq) => /¿Por qué se negó/.test(qq.prompt));
assert(cerezasWhyQ, "cerezas reading quiz has the refused item");
assert(cerezasWhyQ.skill === "Lectura", "cerezas refused Focus key stays Lectura");
assert(cerezasWhyQ.explain?.es === "El texto dice que la oferta japonesa era premium — «no pagaba bien» no es lo que pasó. Se negó para no depender de un solo comprador. La independencia ganó al mejor cheque.", "cerezas refused ES Why is George trim stamp");
assert(cerezasWhyQ.explain?.en === "The text says the Japanese offer was premium — so “didn’t pay well” isn’t what happened. He refused so he wouldn’t depend on one buyer. Independence beat the better check.", "cerezas refused EN Why is George trim stamp");
assert(explainText(cerezasWhyQ, "es") === cerezasWhyQ.explain.es, "cerezas refused Why follows uiLang ES");
assert(explainText(cerezasWhyQ, "en") === cerezasWhyQ.explain.en, "cerezas refused Why follows uiLang EN");
assert(focusLabel(cerezasWhyQ.skill, "es") === "Lectura", "cerezas refused Focus ES");
assert(focusLabel(cerezasWhyQ.skill, "en") === "Reading", "cerezas refused Focus EN");
assert(cerezas.questions.filter((qq) => qq.explain).length === 1, "only the refused cerezas item is Why-stamped");
assert(!/La oferta era premium\. Se negó por independencia/.test(appSrc), "first short cerezas Why is gone");
assert(!/The offer was premium\. He refused for independence/.test(appSrc), "first short cerezas EN Why is gone");
assert(!/Aun así don Adán dijo que no/.test(appSrc), "expanded cerezas ES Why is gone");
assert(!/Don Adán still said no/.test(appSrc), "expanded cerezas EN Why is gone");
const banco = TODAY_SCENES.find((sc) => sc.id === "tramites-cita");
assert(banco, "tramites-cita Hoy exists");
assert(banco.title === "Cita en el banco", "banco ES title");
assert(banco.titleEn === "Bank appointment", "banco EN title");
assert(!banco.storyId, "Bank appointment is not tagged with a Lectura story");
assert(hoyStoryForScene(banco, STORIES) === null, "Bank appointment Hoy has no story chip");
assert(banco.units?.join(",") === "mex,registro,pronombres", "Bank appointment unit chips stay Mexicanismos / Registro / Pronombres");
assert(appSrc.includes("hoyStoryForScene"), "Hoy story chip uses the shared story gate");
assert(appSrc.includes("const story = hoyStoryForScene(scene, STORIES)"), "Hoy postal lift does not fall back to STORIES[0]");
assert(!/id: "tramites-cita"[\s\S]{0,240}storyId: "story-9"/.test(appSrc), "tramites-cita is not tagged story-9 / cerezas");
const calle = TODAY_SCENES.find((sc) => sc.id === "calle-direccion");
assert(calle, "calle-direccion Hoy exists");
assert(calle.explain === "En la calle va corto: «Disculpe» + destino + «por aquí». Un «¿me podría indicar la dirección?» suena a formulario, no a alguien que camina.", "calle ES Why is George stamp");
assert(calle.explainEn === "On the street you keep it short: «Disculpe» + where + «por aquí». A long “could you please indicate the address” sounds like a form, not a passerby.", "calle EN Why is George stamp");
assert(explainText(calle, "es") === calle.explain, "calle Why follows uiLang ES");
assert(explainText(calle, "en") === calle.explainEn, "calle Why follows uiLang EN");
assert(!/Calle: «disculpe» \+ destino/.test(appSrc), "short calle ES Why is gone");
assert(!/Street: «disculpe» \+ where/.test(appSrc), "short calle EN Why is gone");
assert(appSrc.includes("liftStoryQuizItem"), "story quiz lift prefers authored Why/Focus");
assert(appSrc.includes("data-testid=\"story-quiz-why\""), "Lectura quiz Why is testable");
assert(appSrc.includes("data-testid=\"story-quiz-focus\""), "Lectura quiz Focus is testable");
assert(uiText({ es: "La idea está; falta precisión.", en: "The idea’s there; it needs precision." }, "en") === "The idea’s there; it needs precision.", "George stamp feedback EN");
const cuando = PRACTICE_EXPLAIN.find((row) => row.es.startsWith("«Cuando» + acción futura"));
assert(cuando && cuando.en === "«Cuando» + future action → subjunctive. Habit would be indicative: «cuando salgo».", "George stamp Why EN");
assert(appSrc.includes("{uiText(quip, uiLang)}"), "practice quip follows uiLang");
assert(appSrc.includes("{explainText(q, uiLang)}"), "practice Why follows uiLang");
assert(appSrc.includes("{focusLabel(errorKind, uiLang)}"), "practice Focus follows uiLang");
assert(appSrc.includes("data-testid=\"practice-quip\"") && appSrc.includes("data-testid=\"practice-focus\"") && appSrc.includes("data-testid=\"practice-why\""), "practice feedback is testable");
const VOICES = Function(`"use strict"; return (${extractConst(appSrc, "VOICES")});`)();
for (const [host, voice] of Object.entries(VOICES)) {
  for (const kind of ["correct", "wrong", "win", "sad"]) {
    assert(Array.isArray(voice[kind]) && voice[kind].length, `${host}.${kind} pool`);
    voice[kind].forEach((line, i) => {
      assert(line && typeof line.es === "string" && line.es.trim(), `${host}.${kind}[${i}] es`);
      assert(typeof line.en === "string" && line.en.trim() && line.en !== line.es, `${host}.${kind}[${i}] temporary EN`);
    });
  }
}
assert(VOICES.luna.wrong.some((line) => line.es === "La idea está; falta precisión." && line.en === "The idea’s there; it needs precision."), "George stamp Luna miss EN");
assert(appSrc.includes("choiceChipIndexForKey"), "blank chips use second-row key map");
assert(appSrc.includes("insertChoiceChipFromKey"), "blank chips bind keys on the practice input");
assert(appSrc.includes("e.target !== inputRef.current"), "chip keys do not steal other inputs");
assert(appSrc.includes('q?.answerAid?.mode !== "choices"'), "chip keys only bind TAP AN ANSWER / choices");
assert(appSrc.includes("choiceChipKeyForIndex"), "quiet chip digits use the same key map");
assert(appSrc.includes("data-testid=\"choice-chip-key\""), "quiet chip digits are testable");
assert(appSrc.includes("color: used ? D.greenDark : D.green"), "BUILD WITH WORDS unused chip label is CHECK lime (D.green)");
assert(!appSrc.includes("color: used ? D.greenDark : D.ink"), "BUILD WITH WORDS unused chip label is not theme ink");
assert(appSrc.includes('green: "#58CC02"'), "CHECK / chip lime stays the stamped D.green token");
assert(/color: used \? D\.greenDark : D\.green,\s*fontWeight: 800,/.test(appSrc), "BUILD WITH WORDS unused chip label is No Face stamp weight 800+");
assert(!/press 1|Press 1|pulsa 1|Pulsa 1/.test(appSrc), "no press-1 banner chrome");
assert(DEFAULT_LETTER_LAYOUT === "qwerty", "letter boards default to QWERTY");
assert(lettersForLayout("qwerty").join("") === "QWERTYUIOPASDFGHJKLÑZXCVBNM", "QWERTY has Ñ after L");
assert(lettersForLayout("abc").join("") === "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ", "ABC is the A–Z grid");
assert(appSrc.includes("<LetterBoard"), "letter-pick surfaces share LetterBoard");
assert(appSrc.includes("data-testid=\"letter-board\""), "letter board is testable");
assert(appSrc.includes("data-testid=\"letter-layout-toggle\""), "ABC / QWERTY toggle is testable");
assert(appSrc.includes(">ABC</button>") && appSrc.includes(">QWERTY</button>"), "quiet toggle stamps are ABC / QWERTY");
assert(appSrc.includes("save({ letterLayout:"), "letter layout persists on the progress store");
assert(appSrc.includes("normalizeLetterLayout(prog.letterLayout)"), "Hangman reads persisted letter layout");
assert(!appSrc.includes('const ALPHA = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ"'), "no hardcoded A–Z wrap on Hangman");
assert(!/switch to ABC|cambia a ABC|keyboard layout|elige el teclado|press QWERTY/i.test(appSrc), "no instructional letter-layout banner");
assert(appSrc.includes("color: wasPicked ? (hit ? D.okText : D.badText) : D.green"), "unused letter chips use CHECK lime");
assert(appSrc.includes('background: wasPicked ? (hit ? D.okBg : D.badBg) : "#fff"'), "unused letter chips stay on a white chip");
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const mascotPng = join(repoRoot, "public", "mascot", "cenzontle.png");
const appleTouch = join(repoRoot, "public", "apple-touch-icon.png");
const faviconSvg = readFileSync(join(repoRoot, "public", "favicon.svg"), "utf8");
const indexHtml = readFileSync(join(repoRoot, "index.html"), "utf8");
assert(existsSync(mascotPng), "Cenzontle mark lives at public/mascot/cenzontle.png");
assert(!existsSync(join(repoRoot, "public", "mascot", "axolotl.png")), "axolotl.png is gone from public/mascot");
assert(readFileSync(mascotPng).subarray(0, 8).equals(pngMagic), "mascot/cenzontle.png is a real PNG, not JPEG-named-.png");
const cubetasProps = [
  ["subjunctive", CUBETAS_BUCKET_SRC.subjunctive, 576231, "4d67d62487e6869b448115513c8108de"],
  ["indicative", CUBETAS_BUCKET_SRC.indicative, 607358, "08286dafc4518ca36d56e5ef2d386c12"],
];
for (const [mood, rel, bytes, md5] of cubetasProps) {
  const propPng = join(repoRoot, "public", rel);
  assert(existsSync(propPng), `${mood} clay prop lives at public/${rel}`);
  const buf = readFileSync(propPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `public/${rel} is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `public/${rel} is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `${mood} clay prop stays the wired PNG`);
}
assert(readFileSync(appleTouch).subarray(0, 8).equals(pngMagic), "apple-touch-icon.png is a real PNG");
const clearedStory0 = [
  ["p0", 1466181, "1abec4c724889e8df09e7ca122f3c345"],
  ["p1", 1891656, "e77f0a7198f7d64d50d21a367b33c69b"],
  ["p2", 1176493, "79110ac7359474f5891616e64583b325"],
  ["p3", 1614527, "8dcea3dfe9ca6365199be4011ce58af9"],
  ["p4", 1704760, "3698f167dd2c222c47fbbd15f185d0a5"],
  ["p5", 1751708, "77747581da74c1eb398612ed132e3b67"],
];
for (const [slot, bytes, md5] of clearedStory0) {
  const stillPng = join(repoRoot, "public", "lectura", "story-0", `${slot}.png`);
  assert(existsSync(stillPng), `story-0 ${slot} lives at public/lectura/story-0/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/story-0/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/story-0/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `story-0 ${slot} stays the Brand CLEAR live PNG`);
  assert(buf.readUInt32BE(16) === 1152 && buf.readUInt32BE(20) === 864, `story-0 ${slot} is 1152×864`);
}
const clearedStory1 = [
  ["p0", 1930745, "957ba1b9b27b4a237bec149cd95bc211"],
  ["p1", 1585762, "ee69c689b8142795662795baceb8b6e4"],
  ["p2", 1806821, "2e2b7bb4e8d8e52b399c94f44dcebfb1"],
  ["p3", 1797879, "c60baed4ecd2b245445671dfc7413287"],
  ["p4", 1990177, "191eaa958d0d401d7f4f915352507d54"],
  ["p5", 1791466, "3ad8d110dc213be2248ba1c42e581981"],
];
for (const [slot, bytes, md5] of clearedStory1) {
  const stillPng = join(repoRoot, "public", "lectura", "story-1", `${slot}.png`);
  assert(existsSync(stillPng), `story-1 ${slot} lives at public/lectura/story-1/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/story-1/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/story-1/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `story-1 ${slot} stays the Brand CLEAR live PNG`);
}
const waveAStills = [
];
for (const [storyId, slot, bytes, md5] of waveAStills) {
  const stillPng = join(repoRoot, "public", "lectura", storyId, `${slot}.png`);
  assert(existsSync(stillPng), `${storyId} ${slot} lives at public/lectura/${storyId}/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/${storyId}/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/${storyId}/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `${storyId} ${slot} is the exact Wave A still`);
}
const clearedStory2 = [
  ["p0", 1434535, "5f7512464bc268c65660081bf7157590"],
  ["p1", 1362269, "742dc6aab427ae61dba6c50f0e5ec178"],
  ["p2", 1747777, "d50a1017f8ac7c04b4f59fee3d5c97a7"],
  ["p3", 1799535, "1f73f409f9716e88d372f9bf708a6c21"],
  ["p4", 1609729, "c319a20da1396867775349b61109fc1f"],
  ["p5", 1610017, "258788dd314fdd9313f8322fdf1f5d35"],
];
for (const [slot, bytes, md5] of clearedStory2) {
  const stillPng = join(repoRoot, "public", "lectura", "story-2", `${slot}.png`);
  assert(existsSync(stillPng), `story-2 ${slot} lives at public/lectura/story-2/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/story-2/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/story-2/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `story-2 ${slot} stays the CLEARed live PNG`);
  assert(buf.readUInt32BE(16) === 1152 && buf.readUInt32BE(20) === 864, `story-2 ${slot} is 1152×864`);
}
const waveBStills = [
];
for (const [storyId, slot, bytes, md5] of waveBStills) {
  const stillPng = join(repoRoot, "public", "lectura", storyId, `${slot}.png`);
  assert(existsSync(stillPng), `${storyId} ${slot} lives at public/lectura/${storyId}/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/${storyId}/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/${storyId}/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `${storyId} ${slot} is the exact Wave B still`);
}
const clearedStory8 = [
  ["p0", 1507670, "b0427461a632c3cd8189a9e18c9c5e10"],
  ["p1", 1397780, "ca315af20cba72c7fa1850995abb0a1d"],
  ["p2", 1203018, "91148d75835b8e31b4995af4a4f8ac16"],
  ["p3", 1259195, "d0f67783fae380ed0b27da7a92d2bec3"],
  ["p4", 1274529, "226e878e3743957d48a75a6a79e7933c"],
  ["p5", 1480648, "85b8f8bc1661633c35225b25e70f0278"],
];
for (const [slot, bytes, md5] of clearedStory8) {
  const stillPng = join(repoRoot, "public", "lectura", "story-8", `${slot}.png`);
  assert(existsSync(stillPng), `story-8 ${slot} lives at public/lectura/story-8/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/story-8/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/story-8/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `story-8 ${slot} stays the Brand CLEAR live PNG`);
  assert(buf.readUInt32BE(16) === 1152 && buf.readUInt32BE(20) === 864, `story-8 ${slot} is 1152×864`);
}
assert(existsSync(join(repoRoot, "public", "lectura", "story-8", "CAST.md")), "story-8 CAST.md locks father mustache");
assert(existsSync(join(repoRoot, "public", "lectura", "story-8", "MANIFEST.md")), "story-8 MANIFEST.md is installed");
const story8Cast = readFileSync(join(repoRoot, "public", "lectura", "story-8", "CAST.md"), "utf8");
assert(/mustache locked/.test(story8Cast) && /never clean-shaven/.test(story8Cast), "story-8 CAST locks father mustache p0–p3");
assert(/white guayabera/.test(story8Cast) && /balcony/.test(story8Cast), "story-8 CAST locks guayabera prep and balcony");
const clearedStory3 = [
  ["p0", 1392583, "f768b2f3a1eb0d076bbaf80a862de608"],
  ["p1", 1506923, "aed3849d4f96bfcd6fe22b8e9632c509"],
  ["p2", 1465245, "862919bc69b0689194df9effee182103"],
  ["p3", 1266356, "7d8bb5baff522f830b9c1fbaedf316c0"],
  ["p4", 1286468, "42b9044abff9783608382469fa65a299"],
  ["p5", 1221775, "8fdb1e686d1f432631c87c43244a7274"],
];
for (const [slot, bytes, md5] of clearedStory3) {
  const stillPng = join(repoRoot, "public", "lectura", "story-3", `${slot}.png`);
  assert(existsSync(stillPng), `story-3 ${slot} lives at public/lectura/story-3/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/story-3/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/story-3/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `story-3 ${slot} stays the Brand CLEAR live PNG`);
  assert(buf.readUInt32BE(16) === 1152 && buf.readUInt32BE(20) === 864, `story-3 ${slot} is 1152×864`);
}
assert(existsSync(join(repoRoot, "public", "lectura", "story-3", "CAST.md")), "story-3 CAST.md locks short-hair Rey Tigre");
assert(existsSync(join(repoRoot, "public", "lectura", "story-3", "MANIFEST.md")), "story-3 MANIFEST.md is installed");
const story3Cast = readFileSync(join(repoRoot, "public", "lectura", "story-3", "CAST.md"), "utf8");
assert(/Short dark hair/.test(story3Cast) && /Orange tiger mask/.test(story3Cast), "story-3 CAST locks short-hair Rey Tigre + orange mask");
assert(/Tigre Joven/.test(story3Cast) && /blue\/white/.test(story3Cast), "story-3 CAST locks Tigre Joven blue/white debut");
assert(/never long wavy/.test(story3Cast), "story-3 CAST forbids long-wavy unmasked rewrite");
const clearedStory4 = [
  ["p0", 1513007, "ed2db208d1845b596de6d75a6669ed84"],
  ["p1", 1887010, "5e9783f608e764641f1608d8a1cc5c46"],
  ["p2", 1648558, "e6a9faadb2712b93e1debb89921db6af"],
  ["p3", 1656532, "463fce6b27f4709dc791d89fe7968f4d"],
  ["p4", 1615033, "67e32279ea0606b444d50344eb98d82c"],
  ["p5", 1763618, "d339439887227da164ada8147e4bbc4d"],
];
for (const [slot, bytes, md5] of clearedStory4) {
  const stillPng = join(repoRoot, "public", "lectura", "story-4", `${slot}.png`);
  assert(existsSync(stillPng), `story-4 ${slot} lives at public/lectura/story-4/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/story-4/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/story-4/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `story-4 ${slot} stays the Brand CLEAR live PNG`);
  assert(buf.readUInt32BE(16) === 1152 && buf.readUInt32BE(20) === 864, `story-4 ${slot} is 1152×864`);
}
const clearedStory5 = [
  ["p0", 1562251, "d95c8a4d9a03623130ef214808e4c8e9"],
  ["p1", 1791119, "6ed36b5a13c015108f01ba0355287e5e"],
  ["p2", 1441174, "cd1beeea07467b539eb56d34e0d86b94"],
  ["p3", 1585155, "6942312fa7ad54ca41c9949ff4acbf68"],
  ["p4", 1242305, "d86a8345f3640673eedaeb89e4d77b38"],
  ["p5", 1633556, "e51b6602cf76a8ff2fdf32a134e64840"],
];
for (const [slot, bytes, md5] of clearedStory5) {
  const stillPng = join(repoRoot, "public", "lectura", "story-5", `${slot}.png`);
  assert(existsSync(stillPng), `story-5 ${slot} lives at public/lectura/story-5/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/story-5/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/story-5/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `story-5 ${slot} stays the Brand CLEAR live PNG`);
  assert(buf.readUInt32BE(16) === 1152 && buf.readUInt32BE(20) === 864, `story-5 ${slot} is 1152×864`);
}
assert(existsSync(join(repoRoot, "public", "lectura", "story-5", "CAST.md")), "story-5 CAST.md locks reporter + Anabel");
assert(existsSync(join(repoRoot, "public", "lectura", "story-5", "MANIFEST.md")), "story-5 MANIFEST.md is installed");
const story5Cast = readFileSync(join(repoRoot, "public", "lectura", "story-5", "CAST.md"), "utf8");
assert(/low bun/.test(story5Cast) && /White shirt/.test(story5Cast) && /sage pants/.test(story5Cast), "story-5 CAST locks reporter low bun + white shirt/sage pants");
assert(/Anabel/.test(story5Cast) && /not the reporter/.test(story5Cast), "story-5 CAST locks Anabel separate on p3");
const clearedStory6 = [
  ["p0", 1414618, "9a040957584b318cfd50bcdb9e02cb21"],
  ["p1", 1556200, "271766e8fb31c698cc4e7ee830b86f29"],
  ["p2", 1644237, "e132216d49a798e88b3fd8ed6c675b04"],
  ["p3", 1815917, "9932d084f732b8c6be21e66028292032"],
  ["p4", 1651860, "e4adc49c91e3165662e1828f44ad44a9"],
  ["p5", 1582584, "ba7e1b9e4f843ed45ef2ad84fc9ca597"],
];
for (const [slot, bytes, md5] of clearedStory6) {
  const stillPng = join(repoRoot, "public", "lectura", "story-6", `${slot}.png`);
  assert(existsSync(stillPng), `story-6 ${slot} lives at public/lectura/story-6/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/story-6/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/story-6/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `story-6 ${slot} stays the Brand CLEAR live PNG`);
  assert(buf.readUInt32BE(16) === 1152 && buf.readUInt32BE(20) === 864, `story-6 ${slot} is 1152×864`);
}
assert(existsSync(join(repoRoot, "public", "lectura", "story-6", "CAST.md")), "story-6 CAST.md locks mother + daughter");
assert(existsSync(join(repoRoot, "public", "lectura", "story-6", "MANIFEST.md")), "story-6 MANIFEST.md is installed");
const story6Cast = readFileSync(join(repoRoot, "public", "lectura", "story-6", "CAST.md"), "utf8");
assert(/low bun/.test(story6Cast) && /Cream top/.test(story6Cast) && /terracotta/.test(story6Cast), "story-6 CAST locks mother low bun + cream/terracotta");
assert(/Olive overalls/.test(story6Cast) && /Always a girl/.test(story6Cast) && /never boy swap/.test(story6Cast), "story-6 CAST locks daughter girl on p4+p5");
const clearedStory7 = [
  ["p0", 1635601, "5cd1642ec08262f446b264689aec130d"],
  ["p1", 1577512, "6473d86931d297de468e1876db0404a8"],
  ["p2", 1648419, "ab2ebe400c151314aec1dd3acd2df728"],
  ["p3", 1518429, "7678d621bf2295ceffb82300d62e1d1a"],
  ["p4", 1533198, "eeb27ce8fb6bbf417a779692c9d1feac"],
  ["p5", 1568306, "d63df7e9b82667d5da6c241f6dd8a272"],
];
for (const [slot, bytes, md5] of clearedStory7) {
  const stillPng = join(repoRoot, "public", "lectura", "story-7", `${slot}.png`);
  assert(existsSync(stillPng), `story-7 ${slot} lives at public/lectura/story-7/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/story-7/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/story-7/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `story-7 ${slot} stays the Brand CLEAR live PNG`);
  assert(buf.readUInt32BE(16) === 1152 && buf.readUInt32BE(20) === 864, `story-7 ${slot} is 1152×864`);
}
assert(existsSync(join(repoRoot, "public", "lectura", "story-7", "CAST.md")), "story-7 CAST.md locks Ernesto/Pepe/Lalo/Manuel");
assert(existsSync(join(repoRoot, "public", "lectura", "story-7", "MANIFEST.md")), "story-7 MANIFEST.md is installed");
const story7Cast = readFileSync(join(repoRoot, "public", "lectura", "story-7", "CAST.md"), "utf8");
assert(/Don Pepe/.test(story7Cast) && /Don Ernesto/.test(story7Cast) && /Don Lalo/.test(story7Cast) && /Don Manuel/.test(story7Cast), "story-7 CAST names Ernesto/Pepe/Lalo/Manuel");
const clearedStory9 = [
  ["p0", 1801272, "d9ca8fdbe8a56b7a4a8b1720c93966ea"],
  ["p1", 1703516, "ffbe9eecde45c8b7f7860d24e1cc8945"],
  ["p2", 1708733, "af2c353a53dfb0761adeb45941ea8746"],
  ["p3", 1617514, "44d3d16f2f88941309abee3ddab997bb"],
  ["p4", 1480868, "462ed13a7102f41e66cb0c04335baa7a"],
  ["p5", 1411118, "b84ae84a861f2d319ecf0dd45a3aa6dd"],
];
for (const [slot, bytes, md5] of clearedStory9) {
  const stillPng = join(repoRoot, "public", "lectura", "story-9", `${slot}.png`);
  assert(existsSync(stillPng), `story-9 ${slot} lives at public/lectura/story-9/${slot}.png`);
  const buf = readFileSync(stillPng);
  assert(buf.subarray(0, 8).equals(pngMagic), `lectura/story-9/${slot}.png is a real PNG, not JPEG-named-.png`);
  assert(buf.length === bytes, `lectura/story-9/${slot}.png is ${bytes} bytes`);
  assert(createHash("md5").update(buf).digest("hex") === md5, `story-9 ${slot} stays the Brand CLEAR live PNG`);
  assert(buf.readUInt32BE(16) === 1152 && buf.readUInt32BE(20) === 864, `story-9 ${slot} is 1152×864`);
}
assert(existsSync(join(repoRoot, "public", "lectura", "story-9", "CAST.md")), "story-9 CAST.md locks don Adán");
assert(existsSync(join(repoRoot, "public", "lectura", "story-9", "MANIFEST.md")), "story-9 MANIFEST.md is installed");
const story9Cast = readFileSync(join(repoRoot, "public", "lectura", "story-9", "CAST.md"), "utf8");
assert(/don Adán/.test(story9Cast) && /White hair/.test(story9Cast) && /Straw hat/.test(story9Cast) && /red sash/.test(story9Cast), "story-9 CAST locks white hair/mustache, straw hat, white shirt, red sash");
assert(appSrc.includes("lectura/${story.id}/p${pi}.png"), "Lectura still src is public/lectura/{storyId}/pN.png");
for (const s of STORIES) {
  s.paragraphs.forEach((_, i) => {
    const stillPng = join(repoRoot, "public", "lectura", s.id, `p${i}.png`);
    assert(existsSync(stillPng), `${s.id} ¶${i + 1} still is public/lectura/${s.id}/p${i}.png`);
    const buf = readFileSync(stillPng);
    assert(buf.subarray(0, 8).equals(pngMagic), `${s.id} p${i} is a real PNG`);
  });
}
for (const id of ["luna", "rafa", "valeria", "diego"]) {
  const coachPng = join(repoRoot, "public", "coaches", `${id}-happy.png`);
  assert(existsSync(coachPng), `${id} lives at public/coaches/${id}-happy.png`);
  const coachBuf = readFileSync(coachPng);
  assert(coachBuf.subarray(0, 8).equals(pngMagic), `coaches/${id}-happy.png is a real PNG, not JPEG-named-.png`);
}
for (const id of ["luna", "rafa", "valeria", "diego"]) {
  const coachPng = join(repoRoot, "public", "coaches", `${id}-happy.png`);
  const coachBuf = readFileSync(coachPng);
  assert(coachBuf.readUInt32BE(16) === 1024 && coachBuf.readUInt32BE(20) === 1024, `${id} flat drop is a 1024 square PNG`);
}
assert(appSrc.includes("coaches/${coachId}-happy.png"), "CoachPortrait happy stills stay on public/coaches/{id}-happy.png");
for (const face of ["hoy", "stories", "games", "phrase-doctor", "eighty", "pin-chase", "flashcards", "sendero", "sobremesa"]) {
  const hubPng = join(repoRoot, "public", "hub", `${face}.png`);
  assert(existsSync(hubPng), `${face} lives at public/hub/${face}.png`);
  const hubBuf = readFileSync(hubPng);
  assert(hubBuf.subarray(0, 8).equals(pngMagic), `hub/${face}.png is a real PNG, not JPEG-named-.png`);
  assert(hubBuf.readUInt32BE(16) === 1024 && hubBuf.readUInt32BE(20) === 1024, `hub/${face}.png is a 1024 square PNG`);
}
const senderoFace = readFileSync(join(repoRoot, "public", "hub", "sendero.png"));
assert(createHash("md5").update(senderoFace).digest("hex") === "afee6ac8eec81ea2241527f1b3164d34", "Sendero face is the exact attached hub-faces-v2 PNG");
assert(faviconSvg.includes("data:image/png;base64,"), "favicon.svg embeds a PNG, not a JPEG");
assert(!faviconSvg.includes("data:image/jpeg"), "favicon.svg does not embed JPEG bytes");
const pngHeadFacesRight = (buf, label) => {
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  let pos = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const ctype = buf.toString("latin1", pos + 4, pos + 8);
    const cdata = buf.subarray(pos + 8, pos + 8 + length);
    pos += 12 + length;
    if (ctype === "IHDR") {
      width = cdata.readUInt32BE(0);
      height = cdata.readUInt32BE(4);
      assert(cdata[8] === 8 && cdata[9] === 6 && cdata[12] === 0, `${label}: 8-bit RGBA non-interlaced PNG`);
    } else if (ctype === "IDAT") idat.push(cdata);
    else if (ctype === "IEND") break;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const rows = [];
  let i = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filt = raw[i];
    const scan = Buffer.from(raw.subarray(i + 1, i + 1 + stride));
    i += 1 + stride;
    if (filt === 1) {
      for (let x = 0; x < stride; x++) scan[x] = (scan[x] + (x >= bpp ? scan[x - bpp] : 0)) & 255;
    } else if (filt === 2) {
      for (let x = 0; x < stride; x++) scan[x] = (scan[x] + prev[x]) & 255;
    } else if (filt === 3) {
      for (let x = 0; x < stride; x++) scan[x] = (scan[x] + ((((x >= bpp ? scan[x - bpp] : 0) + prev[x]) >> 1))) & 255;
    } else if (filt === 4) {
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? scan[x - bpp] : 0;
        const b = prev[x];
        const c = x >= bpp ? prev[x - bpp] : 0;
        scan[x] = (scan[x] + paeth(a, b, c)) & 255;
      }
    } else {
      assert(filt === 0, `${label}: unknown PNG filter ${filt}`);
    }
    rows.push(scan);
    prev = scan;
  }
  let minx = width;
  let maxx = -1;
  let miny = height;
  let maxy = -1;
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      if (row[x * 4 + 3] > 16) {
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
    }
  }
  const cut = miny + Math.floor((maxy - miny + 1) * 0.28);
  let sx = 0;
  let n = 0;
  for (let y = miny; y <= cut; y++) {
    const row = rows[y];
    for (let x = minx; x <= maxx; x++) {
      if (row[x * 4 + 3] > 16) {
        sx += x;
        n++;
      }
    }
  }
  assert(n > 0, `${label}: found opaque head pixels`);
  const cx = sx / n;
  const mid = (minx + maxx) / 2;
  assert(cx > mid, `${label}: Cenzontle head must face RIGHT (head_cx=${cx.toFixed(1)} mid=${mid.toFixed(1)})`);
};
pngHeadFacesRight(readFileSync(mascotPng), "mascot/cenzontle.png");
pngHeadFacesRight(readFileSync(appleTouch), "apple-touch-icon.png");
const faviconPng = Buffer.from(faviconSvg.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)[1], "base64");
pngHeadFacesRight(faviconPng, "favicon.svg embed");
const faviconIco = readFileSync(join(repoRoot, "public", "favicon.ico"));
assert(faviconIco.readUInt16LE(2) === 1 && faviconIco.readUInt16LE(4) === 3, "favicon.ico is a 3-image ICO");
for (let i = 0, off = 6; i < 3; i++, off += 16) {
  const size = faviconIco.readUInt32LE(off + 8);
  const offset = faviconIco.readUInt32LE(off + 12);
  const blob = faviconIco.subarray(offset, offset + size);
  assert(blob.subarray(0, 8).equals(pngMagic), `favicon.ico#${i} is PNG-in-ICO`);
  pngHeadFacesRight(blob, `favicon.ico#${i}`);
}

assert(indexHtml.includes('content="#5C7356"'), "theme-color drops Duo lime for lockup sage");
assert(indexHtml.includes("mascot/cenzontle.png"), "og/twitter image uses the Cenzontle path");
assert(!indexHtml.includes("mascot/axolotl.png"), "og/twitter no longer point at axolotl.png");
assert(!appSrc.includes("mascot/axolotl.png"), "LogoMark no longer points at axolotl.png");
const pagesYml = readFileSync(join(repoRoot, ".github", "workflows", "pages.yml"), "utf8");
assert(pagesYml.includes("mascot/cenzontle.png"), "Pages smoke GETs Cenzontle PNG");
assert(!pagesYml.includes("mascot/axolotl.png"), "Pages smoke no longer GETs axolotl.png");
const viteSrc = readFileSync(join(repoRoot, "vite.config.js"), "utf8");
assert(viteSrc.includes("'/andale/'"), "Pages vite base stays /andale/");
assert(/Wrap\/WKWebView rebuilds with base '\/'/.test(viteSrc), "wrap-prep notes base /");
assert(viteSrc.includes("ANDALE_WRAP"), "wrap build flips base via ANDALE_WRAP");
assert(appSrc.includes("window.__andaleSpeech"), "wrap-prep speech flag");
assert(appSrc.includes("window.__andaleStorage"), "wrap-prep storage flag");

assert(andaleViteBase({}) === "/andale/", "default / Pages vite base is /andale/");
assert(andaleViteBase({ ANDALE_WRAP: "1" }) === "/", "wrap vite base is /");

for (const page of ["privacy", "support", "disclaimer"]) {
  const htmlPath = join(repoRoot, "public", `${page}.html`);
  const mdPath = join(repoRoot, `${page}.md`);
  assert(existsSync(htmlPath), `public/${page}.html is the Pages static file`);
  assert(existsSync(mdPath), `${page}.md markdown mirror stays with George copy`);
  const html = readFileSync(htmlPath, "utf8");
  const md = readFileSync(mdPath, "utf8");
  assert(html.includes("gildernew@gmail.com"), `${page}.html contact is gildernew@gmail.com`);
  assert(md.includes("gildernew@gmail.com"), `${page}.md contact is gildernew@gmail.com`);
  assert(!html.includes("We are not publishing an inbox yet"), `${page}.html is not the August inbox-later copy`);
  assert(html.includes("September 18, 2026"), `${page}.html date is George 2026-09-18`);
}
assert(pagesYml.includes("privacy.html"), "Pages smoke GETs privacy.html");
assert(pagesYml.includes("support.html"), "Pages smoke GETs support.html");
assert(pagesYml.includes("disclaimer.html"), "Pages smoke GETs disclaimer.html");

const privacyPath = join(repoRoot, "PrivacyInfo.xcprivacy");
assert(existsSync(privacyPath), "PrivacyInfo.xcprivacy for Tue wrap");
const privacySrc = readFileSync(privacyPath, "utf8");
assert(privacySrc.includes("NSPrivacyTracking"), "privacy manifest declares tracking");
assert(/<key>NSPrivacyTracking<\/key>\s*<false\s*\/>/.test(privacySrc), "no tracking");
assert(privacySrc.includes("NSPrivacyCollectedDataTypes"), "privacy manifest declares collected types");
assert(privacySrc.includes("NSPrivacyAccessedAPICategoryUserDefaults"), "UserDefaults required-reason API");
assert(privacySrc.includes("CA92.1"), "UserDefaults reason CA92.1");
assert(!existsSync(join(repoRoot, "ios", "App", "PrivacyInfo.xcprivacy")), "no partial ios tree — copy PrivacyInfo after cap add ios");

const capCfg = JSON.parse(readFileSync(join(repoRoot, "capacitor.config.json"), "utf8"));
assert(capCfg.webDir === "dist", "Capacitor webDir is dist");
assert(!capCfg.server?.url, "no remote server.url — bundled webDir loads at /");
assert(!JSON.stringify(capCfg).includes("/andale/"), "Capacitor config is not Pages /andale/");
assert(capCfg.server?.hostname === "localhost", "Capacitor hostname is localhost (origin /)");
assert(capCfg.server?.iosScheme === "https", "Capacitor iosScheme is https so wrap origin is /");

assert(SUBJ_FIVE_LABEL === "80/20", "80/20 label is the loan in both langs");
assert(SUBJ_FIVE_SUB.es === "Subjuntivo en cinco", "ES 80/20 second line");
assert(SUBJ_FIVE_SUB.en === "Subjunctive in five", "EN 80/20 second line");
assert(SUBJ_FIVE.es.length === 5 && SUBJ_FIVE.en.length === 5, "George five sentences each lang");
assert(SUBJ_FIVE.es[0] === "Usa el subjuntivo después de un deseo, emoción o duda + que: Quiero que vengas.", "George ES 1");
assert(SUBJ_FIVE.en[0] === "Use the subjunctive after a wish, emotion, or doubt + que: Quiero que vengas.", "George EN 1");
assert(SUBJ_FIVE.es[4] === "Prueba mental: ¿Es real/seguro, o deseado/incierto/todavía no? Real → indicativo; lo demás → subjuntivo.", "George ES 5");
assert(SUBJ_FIVE.en[4] === "Soft test: Is this real/certain, or wished-for/uncertain/not yet? Real → indicative; the other side → subjunctive.", "George EN 5");
assert(appSrc.includes('testid: "eighty-twenty-cta"'), "80/20 CTA is testable");
assert(appSrc.includes('"eighty-twenty-label"'), "80/20 label is testable");
assert(!appSrc.includes("eighty-twenty-sub"), "80/20 hub tile has no bilingual sub tail");
assert(appSrc.includes("quiet: L.hubEightyQuiet"), "80/20 quiet follows uiLang");
assert(appSrc.includes("hub-eighty-quiet"), "80/20 quiet is testable");
assert(appSrc.includes("data-testid=\"eighty-twenty-sheet\""), "80/20 sheet is testable");
assert(appSrc.includes("title: L.hubEighty"), "80/20 tile label is the loan");
assert(appSrc.includes("{subjFiveLines(uiLang).map"), "sheet lines follow uiLang");
const eightyCtaAt = appSrc.indexOf('testid: "eighty-twenty-cta"');
const hubTilesAt = appSrc.indexOf("learn-hub-tiles");
const pathCardsAt = appSrc.indexOf("let g = -1; // global node index");
assert(eightyCtaAt > 0 && hubTilesAt > 0, "80/20 is an equal hub tile");
assert(pathCardsAt > eightyCtaAt && pathCardsAt > hubTilesAt, "80/20 hub tile sits before path cards");
const eightySheet = appSrc.slice(appSrc.indexOf("eighty-twenty-sheet"), appSrc.indexOf("Grammar guide modal"));
assert(!/CoachPortrait/.test(eightySheet), "80/20 sheet has no face");
assert(!/pep|You've got this|Practice this now|Practicar ahora|Deck|flashRun|tapReveal/.test(eightySheet), "80/20 sheet has no pep header or deck");
assert(!/eighty-twenty-title|eighty-twenty-header/.test(appSrc), "80/20 sheet has no pep header chrome");

const qCount = UNITS.reduce((n, u) => n + u.questions.length, 0);
console.log(`ok: content schema — ${UNITS.length} units / ${qCount} questions after prepQuestion; ${SECTIONS.length} sections; FLAT ${FLAT.length}; ${STORIES.length} stories (story-0); ${MISSIONS.length} missions; ${TODAY_SCENES.length} today scenes`);
