import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { prepQuestion } from "./prepQuestion.js";
import { hoyStillFor, LANTERN_STILL } from "./hoyStill.js";

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
  });
}

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

assert(UNITS[0]?.id === "subj1" && UNITS[0]?.title === "Subjuntivo presente", "first path unit stays Subjuntivo presente");
assert(SECTIONS[0]?.unitIds?.[0] === "subj1", "Camino first unit stays Subjuntivo");

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
assert(appSrc.includes("showLevelTheater"), "Principiante level theater is gated");
assert(appSrc.includes("showWeaknessMap"), "empty weakness map is gated");
assert(appSrc.includes("showAtajos"), "Atajos theater is gated");
assert(UI.es.comeBackTomorrow === "Vuelve mañana por la siguiente escena.", "UI.es.comeBackTomorrow");
assert(UI.en.comeBackTomorrow === "Come back tomorrow for the next scene.", "UI.en.comeBackTomorrow");
assert(UI.es.playScene === "Jugar la escena", "UI.es.playScene");
assert(UI.en.playScene === "Play the scene", "UI.en.playScene");
assert(UI.es.phraseDoctor === "Doctora de frases", "UI.es.phraseDoctor is not Phrase Doctor");
assert(UI.en.phraseDoctor === "Phrase Doctor", "UI.en.phraseDoctor");
assert(UI.es.phraseDoctorTag === "GANA EN 60 SEGUNDOS", "UI.es.phraseDoctorTag");
assert(UI.en.phraseDoctorTag === "WIN IN 60 SECONDS", "UI.en.phraseDoctorTag");
assert(UI.es.phraseDoctorCta === "Arreglar una frase", "UI.es.phraseDoctorCta");
assert(UI.en.phraseDoctorCta === "Fix a phrase", "UI.en.phraseDoctorCta");
assert(!/Phrase Doctor/.test(UI.es.phraseDoctor + UI.es.phraseDoctorTag + UI.es.phraseDoctorCta), "ES first-door PD copy is not Phrase Doctor");
assert(appSrc.includes("firstDoorHero"), "Camino hero is first-door Hoy or Phrase Doctor");
assert(appSrc.includes("hero-cta"), "first-door hero CTA is testable");
assert(appSrc.includes("come-back-tomorrow"), "home line after win is wired");
assert(appSrc.includes("path-entry"), "Subjuntivo path stays under Empieza");
assert(appSrc.includes("practica-fold"), "Práctica fold hosts Phrase Doctor / Safe-Risky / Emparejar");
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
assert(appSrc.includes("Empezar tanda de 5 — sin vidas"), "ES Smart Practice CTA is tanda");
assert(appSrc.includes("Elegido como tu siguiente tanda útil."), "ES Smart Practice reason is tanda");
assert(appSrc.includes("Start 5-item sprint — no hearts"), "EN Smart Practice CTA stays sprint");
assert(appSrc.includes("Chosen as your next useful sprint."), "EN Smart Practice reason stays sprint");
assert(!/Empezar sprint de 5/.test(appSrc), "ES CTA is not Empezar sprint");
assert(!/siguiente sprint útil/.test(appSrc), "ES reason is not siguiente sprint útil");

const qCount = UNITS.reduce((n, u) => n + u.questions.length, 0);
console.log(`ok: content schema — ${UNITS.length} units / ${qCount} questions after prepQuestion; ${SECTIONS.length} sections; FLAT ${FLAT.length}; ${STORIES.length} stories (story-0); ${MISSIONS.length} missions; ${TODAY_SCENES.length} today scenes`);
