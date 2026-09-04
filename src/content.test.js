import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { prepQuestion } from "./prepQuestion.js";
import { hoyStillFor, LANTERN_STILL } from "./hoyStill.js";
import { comeBackTomorrowLine, hoySceneForDay, nextDayKey } from "./firstDoor.js";
import { hoySceneBeatCount, shouldParkHoyUnderMas } from "./hoyWin.js";

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
assert(nextHoy?.title === "Mostrador en caos", "tomorrow Hoy on 2026-09-05 is Mostrador en caos");
assert(nextHoy?.titleEn === "Airport Counter Chaos", "EN tomorrow Hoy on 2026-09-05 is Airport Counter Chaos");
assert(comeBackTomorrowLine({ lang: "es", nextTitle: nextHoy.title }) === "Vuelve mañana por «Mostrador en caos».", "George ES teaser lock: Vuelve mañana por «{title}».");
assert(comeBackTomorrowLine({ lang: "en", nextTitle: nextHoy.titleEn }) === "Come back tomorrow for “Airport Counter Chaos”.", "George EN teaser lock: Come back tomorrow for “{title}”.");
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
assert(/<\/div>\s*\{showLine && \(\s*<p data-testid="come-back-tomorrow"/.test(appSrc), "titled teaser sits outside first-door-hero — not a CTA");
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
assert(appSrc.includes("data-testid=\"first-door-alt\""), "Doctora first-door-alt stays on home");
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
assert(!/¡Ganaste!|You won!/.test(`${UI.es.hoyWin}${UI.en.hoyWin}`), "first-Hoy win is not ¡Ganaste!/You won!");
assert(appSrc.includes("L.hoyWin"), "first-Hoy done heading uses L.hoyWin");
assert(appSrc.includes("hoy-win"), "first-Hoy win heading is testable");
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
const handoffChunk = appSrc.slice(appSrc.indexOf("post-dismiss-handoff"), appSrc.indexOf("data-testid=\"first-door-alt\""));
assert(handoffChunk.includes("{L.phraseDoctorTag}"), "handoff badge reuses L.phraseDoctorTag");
assert(handoffChunk.includes("{L.phraseDoctorCta}"), "handoff CTA reuses L.phraseDoctorCta");
assert(handoffChunk.includes("{L.phraseDoctor}"), "handoff title reuses L.phraseDoctor");
assert(!Object.keys(UI.es).concat(Object.keys(UI.en)).some((k) => /handoff|secondBeat|postDismiss/i.test(k)), "no new handoff UI keys");
assert(!/Arreglar una frase|Fix a phrase|GANA EN 60|WIN IN 60/.test(handoffChunk), "handoff has no new hardcoded CTA stamps");
assert(UI.es.safeRiskyReward === "5 rondas · extra por racha · gemas", "UI.es.safeRiskyReward");
assert(UI.en.safeRiskyReward === "5 rounds · streak extra · gems", "UI.en.safeRiskyReward");
assert(!/bonus/i.test(UI.es.safeRiskyReward), "ES Safe/Risky reward has no bonus");
assert(!/bonus/i.test(UI.en.safeRiskyReward), "EN Safe/Risky reward has no bonus");
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
assert(appSrc.includes("data-testid=\"luna-greeting\""), "Luna greeting is testable");
assert(/showDoorMeta && \([\s\S]{0,220}luna-greeting/.test(appSrc), "Luna greeting uses the same streak ≥ 1 gate as coach-strip");
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
assert(appSrc.includes("data-testid=\"home-pitch\""), "Camino home pitch is testable");
assert(/data-testid="home-pitch"[\s\S]{0,280}\{L\.splashLine\}/.test(appSrc), "home pitch uses L.splashLine");
assert(!/splashSkip|splash-skip|{L\.splashSkip}/.test(appSrc), "Saltar/Skip is gone from splash");
assert(!/para quien ya pasó lo básico/.test(appSrc), "long ES home blob is gone");
assert(!/for people past the basics/.test(appSrc), "long EN home blob is gone");
assert(!/cuentos, misiones, tarjetas y cuatro coaches/.test(appSrc), "ES home pitch is not the long coaches blob");
assert(!/stories, challenges, flashcards, and four coaches/.test(appSrc), "EN home pitch is not the long coaches blob");
assert(!/Let's go!/.test(appSrc), "Let's go! is gone from splash");
assert(!/bonus de racha|streak bonus/.test(appSrc), "bonus de racha / streak bonus are gone");
assert(appSrc.includes("{L.safeRiskyReward}"), "Safe/Risky hub reward uses L.safeRiskyReward");
assert(appSrc.includes("{L.narrationLabel}"), "Lectura narration chrome uses L.narrationLabel");
assert(appSrc.includes("firstDoorHero"), "Camino hero is first-door Hoy or Phrase Doctor");
assert(appSrc.includes("hero-cta"), "first-door hero CTA is testable");
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
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const viteSrc = readFileSync(join(repoRoot, "vite.config.js"), "utf8");
assert(viteSrc.includes("base: '/andale/'"), "Pages vite base stays /andale/");
assert(/Wrap\/WKWebView rebuilds with base '\/'/.test(viteSrc), "wrap-prep notes base /");
assert(appSrc.includes("window.__andaleSpeech"), "wrap-prep speech flag");
assert(appSrc.includes("window.__andaleStorage"), "wrap-prep storage flag");
assert(!existsSync(join(repoRoot, "PrivacyInfo.xcprivacy")), "no PrivacyInfo until Mon wrap");
assert(!existsSync(join(repoRoot, "ios", "App", "PrivacyInfo.xcprivacy")), "no ios PrivacyInfo until Mon wrap");

const qCount = UNITS.reduce((n, u) => n + u.questions.length, 0);
console.log(`ok: content schema — ${UNITS.length} units / ${qCount} questions after prepQuestion; ${SECTIONS.length} sections; FLAT ${FLAT.length}; ${STORIES.length} stories (story-0); ${MISSIONS.length} missions; ${TODAY_SCENES.length} today scenes`);
