/** Day-2 return Hoy still wins on the first correct (≤4). Cold streak-0 Hoy plays a 5-beat mix first. Park under Más only if a scene grows past 4. */

import { isDay2Return } from "./firstDoor.js";

export const FIRST_HOY_BEAT_CAP = 4;
export const HOY_FULL_BEAT_CAP = 5;
/** Cold first Hoy (streak 0). Inside 4–6, three or more engine types. Not the day-2 cap. */
export const COLD_FIRST_HOY_COUNT = 5;
export const COLD_FIRST_HOY_MIN = 4;
export const COLD_FIRST_HOY_MAX = 6;
export const COLD_FIRST_HOY_MIN_TYPES = 3;
const COLD_FIRST_HOY_PICKS = ["type", "order", "transform"];
export const HOY_WIN_ES = "¡Eso!";
export const HOY_WIN_EN = "That's it.";

/** Short path is first session / streak 0 only. */
export function isFirstHoySession({ streak } = {}) {
  return (Number(streak) || 0) < 1;
}

/**
 * Short Hoy: first session, or day-2+ return (streak ≥ 1, lastDay ≠ today).
 * Explicit firstHoy false keeps the full path (only if a scene grows past 4).
 */
export function isShortHoy({ firstHoy, streak, lastDay, today } = {}) {
  if (firstHoy === true) return true;
  if (firstHoy === false) return false;
  return isFirstHoySession({ streak }) || isDay2Return({ streak, lastDay, today });
}

/**
 * Native scene beats: setup · line · Q, plus any later scene.beats / scene.extras.
 * Live casero / airport are 3. No invented cut list.
 */
export function hoySceneBeatCount(scene) {
  if (!scene || typeof scene !== "object") return 0;
  let n = 0;
  if (scene.setup || scene.setupEn) n += 1;
  if (scene.line) n += 1;
  if (scene.question || scene.questionEn) n += 1;
  if (Array.isArray(scene.beats)) n += scene.beats.length;
  if (Array.isArray(scene.extras)) n += scene.extras.length;
  return n;
}

/** Long park under Más only when the scene itself grows past 4. */
export function shouldParkHoyUnderMas(scene) {
  return hoySceneBeatCount(scene) > FIRST_HOY_BEAT_CAP;
}

/** First / day-2 return Hoy ≤4 beats. Later / grown scenes keep full depth. */
export function hoyBeatCap(opts = {}) {
  return isShortHoy(opts) ? FIRST_HOY_BEAT_CAP : HOY_FULL_BEAT_CAP;
}

export function trimHoyBeats(items, opts = {}) {
  const list = Array.isArray(items) ? items : [];
  return list.slice(0, hoyBeatCap(opts));
}

/**
 * Day-2 and any injected short Hoy still finish on the first correct.
 * Cold first Hoy (`coldRun`) plays the whole mix; ¡Eso! waits until that run ends.
 * One correct is still enough to earn the win — it is no longer the whole session.
 */
export function shouldHoyEarlyWin({ firstHoy, hits, coldRun } = {}) {
  if (coldRun) return false;
  return !!firstHoy && (Number(hits) || 0) >= 1;
}

function copyQuestion(q, unitId, index) {
  return {
    ...q,
    choices: Array.isArray(q.choices) ? q.choices.slice() : q.choices,
    words: Array.isArray(q.words) ? q.words.slice() : q.words,
    answers: Array.isArray(q.answers) ? q.answers.slice() : q.answers,
    _u: unitId,
    _i: index,
  };
}

/** Scene MC, then the scene line as listen. Same fields the lesson already grades. */
export function coldFirstHoySceneBeats(scene, lang = "es") {
  const prompt = lang === "en" ? scene?.questionEn : scene?.question;
  return [
    {
      type: "mc",
      prompt,
      text: scene?.line,
      line: scene?.line,
      choices: Array.isArray(scene?.choices) ? scene.choices.slice() : scene?.choices,
      answer: scene?.answer,
      explain: scene?.explain,
      explainEn: scene?.explainEn,
      _u: "_today",
      _i: -1,
      skill: "Vida real",
    },
    {
      type: "listen",
      text: scene?.line,
      answers: Array.isArray(scene?.answers) ? scene.answers.slice() : scene?.answers,
      explain: scene?.explain,
      explainEn: scene?.explainEn,
      _u: "_today",
      _i: -1,
      skill: "Escucha real",
    },
  ];
}

function unitsForScene(scene, units) {
  const byId = new Map((units || []).map((unit) => [unit?.id, unit]));
  return (scene?.units || []).map((id) => byId.get(id)).filter(Boolean);
}

function takeUnitQuestion(sceneUnits, items, used, { type = null, freshType = false } = {}) {
  for (const unit of sceneUnits) {
    const questions = Array.isArray(unit.questions) ? unit.questions : [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q || (type && q.type !== type)) continue;
      const key = `${unit.id}|${i}`;
      if (used.has(key)) continue;
      if (freshType && items.some((item) => item.type === q.type)) continue;
      used.add(key);
      items.push(copyQuestion(q, unit.id, i));
      return true;
    }
  }
  return false;
}

/**
 * Streak-0 Hoy. Scene MC (the fast first correct) + scene listen, then the
 * first type, order, and transform already authored on the scene's units.
 * If a unit is thin, fill to 4 from other authored questions. Never a 1-item run.
 */
export function buildColdFirstHoyQueue(scene, units, lang = "es") {
  const sceneUnits = unitsForScene(scene, units);
  const items = coldFirstHoySceneBeats(scene, lang);
  const used = new Set();
  for (const type of COLD_FIRST_HOY_PICKS) {
    if (items.length >= COLD_FIRST_HOY_MAX) break;
    takeUnitQuestion(sceneUnits, items, used, { type });
  }
  while (items.length < COLD_FIRST_HOY_MIN && items.length < COLD_FIRST_HOY_MAX) {
    if (takeUnitQuestion(sceneUnits, items, used, { freshType: true })) continue;
    if (takeUnitQuestion(sceneUnits, items, used)) continue;
    break;
  }
  return items.slice(0, COLD_FIRST_HOY_MAX);
}

export function coldFirstHoyTypes(items) {
  return [...new Set((items || []).map((q) => q?.type).filter(Boolean))];
}

export function isColdFirstHoyQueue(items) {
  const list = Array.isArray(items) ? items : [];
  return list.length >= COLD_FIRST_HOY_MIN
    && list.length <= COLD_FIRST_HOY_MAX
    && coldFirstHoyTypes(list).length >= COLD_FIRST_HOY_MIN_TYPES;
}

export function hoyWinCopy(lang) {
  return lang === "en" ? HOY_WIN_EN : HOY_WIN_ES;
}
