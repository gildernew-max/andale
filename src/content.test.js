import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { prepQuestion } from "./prepQuestion.js";

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

assert(Array.isArray(TODAY_SCENES) && TODAY_SCENES.length > 0, "TODAY_SCENES missing");
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
}

const qCount = UNITS.reduce((n, u) => n + u.questions.length, 0);
console.log(`ok: content schema — ${UNITS.length} units / ${qCount} questions after prepQuestion; ${SECTIONS.length} sections; FLAT ${FLAT.length}; ${STORIES.length} stories (story-0); ${MISSIONS.length} missions; ${TODAY_SCENES.length} today scenes`);
