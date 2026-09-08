import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { inflateSync } from "zlib";
import { andaleViteBase } from "../vite.config.js";
import { prepQuestion } from "./prepQuestion.js";
import { hoyStillFor, LANTERN_STILL } from "./hoyStill.js";
import { comeBackTomorrowLine, hoySceneForDay, hoyStoryForScene, nextDayKey } from "./firstDoor.js";
import { hoySceneBeatCount, shouldParkHoyUnderMas } from "./hoyWin.js";
import { FOCUS_LABELS, PRACTICE_EXPLAIN, explainText, focusLabel, uiText } from "./practiceI18n.js";
import { STORY_QUIZ_CUE, STORY_QUIZ_CUE_LINE, passageForStoryQuestion, storyQuizCue, storyQuizCueLine, storyQuizEyebrow } from "./storyQuiz.js";
import { DEFAULT_LETTER_LAYOUT, lettersForLayout } from "./letterBoard.js";
import { SUBJ_FIVE, SUBJ_FIVE_LABEL, SUBJ_FIVE_SUB } from "./subjFive.js";
import { SAFE_RISKY_ANSWERS, SAFE_RISKY_MULTI_FIXTURE, safeRiskyCorrectKeys } from "./safeRisky.js";

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
assert(appSrc.includes("${import.meta.env.BASE_URL}lectura/"), "Lectura stills use BASE_URL so Pages /andale/ loads them");
assert(!appSrc.includes("src={`/lectura/"), "Lectura stills must not use root-absolute /lectura/ (breaks Pages)");
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
assert(/learn-hub-tiles[\s\S]{0,2800}\{showLine && \(\s*<p data-testid="come-back-tomorrow"/.test(appSrc), "titled teaser sits outside the equal hub grid — not a CTA");
assert(appSrc.includes("hoySceneForDay"), "Hoy day pick is shared");
assert(appSrc.includes("nextDayKey(todayKey)"), "tomorrow Hoy uses the same day hash");
assert(UI.es.paywallHeadline === "Ya empezó tu racha.", "UI.es.paywallHeadline");
assert(UI.es.paywallBody === "Camino completo: escenas, Doctora de frases, cuentos. Mexicano real, más allá de lo básico.", "UI.es.paywallBody");
assert(UI.es.paywallAnnual === "$39.99 al año", "UI.es.paywallAnnual");
assert(UI.es.paywallMonthly === "$6.99 al mes", "UI.es.paywallMonthly");
assert(UI.es.paywallHonesty === "Práctica · sin cobro todavía", "UI.es.paywallHonesty");
assert(UI.es.paywallDismiss === "Seguir gratis por ahora", "UI.es.paywallDismiss");
assert(UI.en.paywallHeadline === "Your streak just started.", "UI.en.paywallHeadline");
assert(UI.en.paywallBody === "Full path: scenes, Phrase Doctor, stories. Real Mexican Spanish past the basics.", "UI.en.paywallBody");
assert(UI.en.paywallAnnual === "$39.99 / year", "UI.en.paywallAnnual");
assert(UI.en.paywallMonthly === "$6.99 / month", "UI.en.paywallMonthly");
assert(UI.en.paywallHonesty === "Practice · no charge yet", "UI.en.paywallHonesty");
assert(UI.en.paywallDismiss === "Continue free for now", "UI.en.paywallDismiss");
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
const paywallLayout = appSrc.slice(appSrc.indexOf('data-testid="soft-paywall"'), appSrc.indexOf("A2HS:"));
assert(/<Btn data-testid="soft-paywall-annual"/.test(paywallLayout), "annual is a filled Btn");
assert(!/<Btn outline data-testid="soft-paywall-annual"/.test(paywallLayout), "annual is not outline");
assert((paywallLayout.match(/<Btn(?! outline)/g) || []).length === 1, "annual is the sole filled Btn on the wall");
assert(!/<Btn[^>]*soft-paywall-monthly/.test(paywallLayout), "monthly is not a Btn");
assert(!/<Btn outline data-testid="soft-paywall-monthly"/.test(appSrc), "monthly is not an equal outline Btn");
assert(/<button type="button" data-testid="soft-paywall-monthly"/.test(paywallLayout), "monthly stays a quiet tap target");
assert(/soft-paywall-monthly[\s\S]{0,280}padding:\s*["']11px 0/.test(paywallLayout), "monthly quiet text has ~44px tap padding");
assert(!/soft-paywall-monthly[\s\S]{0,280}padding:\s*["']2px 0/.test(paywallLayout), "monthly is not the 2px tap target");
assert(/soft-paywall-monthly[\s\S]{0,280}background:\s*["']none/.test(paywallLayout), "monthly is quiet text");
assert(/soft-paywall-monthly[\s\S]{0,280}border:\s*["']none/.test(paywallLayout), "monthly has no button chrome");
assert(!/soft-paywall-monthly[\s\S]{0,280}borderBottom:\s*`4px/.test(paywallLayout), "monthly has no 4px press chrome");
assert(!/soft-paywall-monthly[\s\S]{0,280}duo-btn/.test(paywallLayout), "monthly is not a duo-btn");
assert(paywallLayout.indexOf("soft-paywall-annual") < paywallLayout.indexOf("soft-paywall-monthly"), "monthly sits under annual");
assert(paywallLayout.indexOf("soft-paywall-monthly") < paywallLayout.indexOf("soft-paywall-honesty"), "honesty stays under both plans");
assert(paywallLayout.indexOf("soft-paywall-honesty") < paywallLayout.indexOf("soft-paywall-dismiss"), "dismiss stays under honesty");
assert(/<Btn outline data-testid="soft-paywall-dismiss"/.test(paywallLayout), "Seguir gratis stays outline Btn");
assert(appSrc.includes("first-door-alt"), "Doctora first-door-alt stays on home");
assert(appSrc.includes("post-dismiss-handoff"), "post-dismiss Doctora handoff is testable");
assert(appSrc.includes("showPostDismissHandoff"), "post-dismiss handoff uses the same-session gate");
assert(appSrc.includes("setPostDismissHandoff"), "post-dismiss handoff is session state");
assert(appSrc.includes("shouldShowSoftPaywall"), "soft paywall uses first-win gate");
assert(appSrc.includes("continueFromWin"), "Hoy CONTINUE lands on home with come-back");
assert(appSrc.includes("soft-paywall"), "soft paywall is wired");
assert(appSrc.includes("paywallSeen"), "paywall seen flag is persisted");
assert(appSrc.includes("unlockedPrem") && appSrc.includes("paywallPlan"), "CTA marks local plan only");
assert(appSrc.includes("setSoftPaywall"), "soft paywall opens from a hook");
assert(!/else if \(prog\.paywallSeen\) setSoftPaywall\(false\)/.test(appSrc), "paywall clears when the gate is false, not only when seen");
assert(!/\|\| \(softPaywall && !prog\.paywallSeen/.test(appSrc), "stale softPaywall cannot keep the modal after the gate closes");
assert(!/stripe\.com|@stripe|RevenueCat|StoreKit|SKPayment/.test(appSrc), "soft paywall is $0 — no IAP");
assert(UI.es.hoyWin === "¡Eso!", "UI.es.hoyWin first-Hoy lock");
assert(UI.en.hoyWin === "That's it.", "UI.en.hoyWin first-Hoy lock");
assert(UI.es.sessionClose === "Listo", "George lock: session-close dismiss is Listo");
assert(UI.en.sessionClose === "Done", "George lock: session-close dismiss is Done");
assert(!/Cerrar|Continuar|Ya está|Vale|Listos|Cerrar sesión/.test(UI.es.sessionClose), "ES dismiss is not a soft synonym");
assert(!/Close|Continue|All set|That's all|Ready|Finish/.test(UI.en.sessionClose), "EN dismiss is not a soft synonym");
assert(appSrc.includes("screenAfterWinContinue"), "first-Doctora CONTINUE uses screenAfterWinContinue");
assert(appSrc.includes("data-testid=\"session-close\""), "come-back card is testable");
assert(appSrc.includes("data-testid=\"session-close-dismiss\""), "Listo/Done dismiss is testable");
assert(appSrc.includes("{L.sessionClose}"), "close dismiss uses L.sessionClose");
assert(/data-testid="session-close"[\s\S]{0,900}<p data-testid="come-back-tomorrow"/.test(appSrc), "close-card teaser is a <p>");
assert(/data-testid="session-close"[\s\S]{0,1100}pointerEvents:\s*["']none/.test(appSrc), "close-card teaser is not a tap target");
assert(!/Vuelve mañana por «\{title\}»|Come back tomorrow for “\{title\}”/.test(appSrc), "close card reuses comeBackTomorrowLine — no new teaser copy");
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
assert(/showSoftPaywall = paywallGate && !bajioUnlockFlash && !bajioFlashPending && !isBajioUnlockFlashDue\(\)/.test(appSrc), "paywall waits for the Bajío glow beat");
assert(!/showSoftPaywall = paywallGate && !bajioUnlockFlash && !bajioFlashPending && !isBajioUnlockFlashDue\(\) && !/.test(appSrc), "paywall gate does not wait on CDMX, Oaxaca, Yucatán, or Norte");
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
const doctoraWinSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "doctoraWin.js"), "utf8");
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
assert(appSrc.includes("data-testid=\"coach-strip\""), "four-coach strip is testable");
assert(appSrc.includes("data-testid=\"camino-more\""), "Más/More bury control is testable");
assert(appSrc.includes("{L.more}"), "Más/More uses L.more");
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
assert(appSrc.includes("<WinPerch"), "first-win screen keeps a perched Cenzontle after the courier");
assert(appSrc.includes("img.src = `${import.meta.env.BASE_URL}mascot/cenzontle.png`"), "first-win session preloads the live Cenzontle mark");
assert(appSrc.includes("if (shouldPlayWinBounce(session))"), "Hoy finish arms the bounce in the same turn as screen done");
assert(appSrc.includes("{!quietWin && <Confetti"), "first-win mutes confetti so the courier is visible");
assert(appSrc.includes("{!quietWin && ("), "first-win hides the party-coach row");
assert(appSrc.includes("data-testid={winTestId}"), "¡Eso! heading stays the existing win test id");
assert(appSrc.includes("className={quietWin ? \"eso-rise\" : undefined}"), "¡Eso! copy is opacity / 3px rise only");
assert(appSrc.includes('const MARK_INK = "#5C7356"'), "lockup wordmark uses adult sage, not Duo lime");
assert(appSrc.includes("color: MARK_INK"), "header/splash wordmark reads MARK_INK");
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
assert(appSrc.includes("firstDoorHero"), "Hoy selected stroke still uses first-door Hoy vs Phrase Doctor");
assert(appSrc.includes("const hoyLoud = doorKind === FIRST_DOOR_HOY && !todaySceneDone"), "Hoy is the only loud first-tap tile");
assert(appSrc.includes('data-hub-loud={tile.id === "hoy" && hoyLoud ? "hoy" : undefined}'), "loud stroke attribute is Hoy-only");
assert(appSrc.includes("tile.id === \"hoy\" && hoyLoud ? D.green : D.line"), "green border is Hoy-only; Sendero uses the quiet line stroke");
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
assert(appSrc.includes("title: L.hubDoctor"), "Phrase Doctor tile label follows uiLang");
assert(appSrc.includes("{L.hubPins}"), "Pin chase label follows uiLang under Más");
assert(appSrc.includes("{L.hubFlash}"), "Flashcards label follows uiLang under Más");
assert(appSrc.includes("title: L.hubSendero"), "Sendero tile label follows uiLang");
assert(!appSrc.includes("title: L.hubSobremesa"), "Sobremesa wrap stamp is not a hub tile title");
assert(UI.es.hubHoy === "Hoy" && UI.en.hubHoy === "Hoy", "Hoy label is Hoy");
assert(UI.es.hubHoyQuiet === "Plan de 10 minutos" && UI.en.hubHoyQuiet === "10-minute plan", "Hoy quiet is the 10-min plan");
assert(UI.es.hoyPlanEyebrow === "HOY · 10 MIN" && UI.en.hoyPlanEyebrow === "TODAY · 10 MIN", "Hoy plan eyebrow is George stamp");
assert(UI.es.hoyPlanSell === "Un plan corto para hoy. Diez minutos. Luego paras." && UI.en.hoyPlanSell === "A short plan for today. Ten minutes. Then you stop.", "Hoy plan sell is George stamp");
assert(UI.es.hoyPlanCta === "Empezar el plan" && UI.en.hoyPlanCta === "Start the plan", "Hoy plan CTA is George stamp");
assert(UI.es.playScene === "Jugar la escena" && UI.en.playScene === "Play the scene", "scene step stays playScene");
assert(UI.es.hubStories === "Stories" && UI.en.hubStories === "Stories", "Stories is the loan in both langs");
assert(UI.es.hubGames === "Games" && UI.en.hubGames === "Games", "Games is the loan in both langs");
assert(UI.es.hubDoctor === "Phrase Doctor" && UI.en.hubDoctor === "Phrase Doctor", "hub Phrase Doctor is the loan");
assert(UI.es.hubEighty === "80/20" && UI.en.hubEighty === "80/20", "80/20 is the loan");
assert(UI.es.hubPins === "Pin chase" && UI.en.hubPins === "Pin chase", "Pin chase is the loan");
assert(UI.es.hubFlash === "Flashcards" && UI.en.hubFlash === "Flashcards", "Flashcards is the loan");
assert(UI.es.hubSendero === "Sendero" && UI.en.hubSendero === "Sendero", "Sendero is the loan in both langs");
assert(UI.es.hubSenderoQuiet === "Camino que crece" && UI.en.hubSenderoQuiet === "A path that grows", "Sendero quiet is George stamp");
assert(UI.es.hubSobremesa === "Sobremesa" && UI.en.hubSobremesa === "Sobremesa", "Sobremesa name stays parked in wrap");
assert(appSrc.includes("WRAP PARK — Sobremesa"), "Sobremesa wrap park comment stays");
assert(appSrc.includes("data-testid=\"hoy-plan\""), "Hoy plan card is testable");
assert(appSrc.includes("data-testid=\"hoy-plan-eyebrow\""), "Hoy plan eyebrow is testable");
assert(appSrc.includes("data-testid=\"hoy-plan-sell\""), "Hoy plan sell is testable");
assert(appSrc.includes("data-testid=\"hoy-plan-step\""), "Hoy scene step is testable");
assert(appSrc.includes("data-testid=\"hoy-plan-start\""), "Hoy plan CTA is testable");
assert(appSrc.includes("{L.playScene}"), "plan step uses playScene — not the tile");
assert(appSrc.includes("act: openPath"), "Sendero opens the existing Camino path sheet");
assert(appSrc.includes('data-testid="path-sheet"'), "Camino path sheet is the existing unit preview");
assert(!/Cuentos|Match & play|Arregla|Prioriza|Unlock Mexico|Flip & keep/.test([UI.es.hubStories, UI.es.hubGames, UI.es.hubDoctor, UI.es.hubPins, UI.es.hubFlash].join("\n")), "hub tiles have no slash tails");
assert(UI.es.camino === "Camino" && UI.es.missions === "Misiones" && UI.es.reading === "Lectura" && UI.es.practice === "Práctica" && UI.es.profile === "Perfil", "George CLEAR: live ES Camino nav set");
assert(UI.en.camino === "Learn" && UI.en.missions === "Challenges" && UI.en.reading === "Stories" && UI.en.practice === "Review" && UI.en.profile === "Profile", "live EN Camino set — not Home/Library/Profile trio");
assert(UI.en.camino !== "Home" && UI.en.reading !== "Library", "nav is not the mock Home/Library English trio");
const navTabs = appSrc.slice(appSrc.indexOf("BOTTOM TABS"), appSrc.indexOf("BOTTOM TABS") + 900);
assert(/id: "camino"[\s\S]*id: "misiones"[\s\S]*id: "lectura"[\s\S]*id: "practica"[\s\S]*id: "perfil"/.test(navTabs), "bottom nav is the five live Camino tabs");
assert(!/id: "home"|id: "library"/.test(navTabs), "bottom nav has no Home/Library tab ids");
assert(!/data-testid="first-door-hero"/.test(appSrc), "v01c hub has no hero card");
assert(/gridTemplateColumns:\s*"1fr 1fr"/.test(appSrc.slice(appSrc.indexOf("learn-hub-tiles"), appSrc.indexOf("learn-hub-tiles") + 400)), "hub is a 2-column equal grid");
assert(/height:\s*168/.test(appSrc.slice(appSrc.indexOf("learn-hub-tiles"), appSrc.indexOf("learn-hub-tiles") + 700)), "hub tiles share one equal height");
assert(appSrc.includes("gatedLiftStoryQuiz"), "Hoy / misión / rutina story Qs are Lectura-gated");
assert(appSrc.includes("pickCompletedStory"), "rutina picks only claimed Lectura stories");
assert(appSrc.includes("storyQuizCue"), "practice prompt has a slot for a George story cue");
assert(appSrc.includes("storyQuizCueLine"), "optional second cue line is hooked, off by default");
assert(appSrc.includes("storyQuizPassage"), "practice shows the matching Lectura passage");
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
assert(/camino-more[\s\S]{0,900}path-entry/.test(appSrc), "EMPIEZA is buried under Más/More");
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
assert(appSrc.includes("Tu siguiente ronda."), "ES Smart Practice reason is George lock");
assert(appSrc.includes("Empezar ronda de 5 — sin vidas"), "ES Smart Practice CTA is George lock");
assert(appSrc.includes("Start 5-item sprint — no hearts"), "EN Smart Practice CTA stays sprint");
assert(appSrc.includes("Chosen as your next useful sprint."), "EN Smart Practice reason stays sprint");
assert(!/Empezar sprint de 5/.test(appSrc), "ES CTA is not Empezar sprint");
assert(!/siguiente sprint útil/.test(appSrc), "ES reason is not siguiente sprint útil");
assert(!/Empezar tanda|siguiente tanda|tanda útil/.test(appSrc), "ES chrome is not tanda");
assert(!/Elegido como tu siguiente/.test(appSrc), "ES reason is not Elegido como…");
assert(!/útil/.test("Tu siguiente ronda.Empezar ronda de 5 — sin vidas"), "locked ES lines have no útil");
assert(appSrc.includes("JEOPARDY SOLO"), "JEOPARDY SOLO stays an intentional loan");
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
assert(readFileSync(appleTouch).subarray(0, 8).equals(pngMagic), "apple-touch-icon.png is a real PNG");
for (const slot of ["p0", "p1", "p2"]) {
  const stillPng = join(repoRoot, "public", "lectura", "story-0", `${slot}.png`);
  assert(existsSync(stillPng), `story-0 ${slot} lives at public/lectura/story-0/${slot}.png`);
  assert(readFileSync(stillPng).subarray(0, 8).equals(pngMagic), `lectura/story-0/${slot}.png is a real PNG, not JPEG-named-.png`);
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
assert(!appSrc.includes("eighty-twenty-sub"), "80/20 hub tile has no second-line tail");
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
