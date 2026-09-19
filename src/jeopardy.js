/** Jeopardy — Games, next to Cubetas + Ahorcado. Soft chrome parked.
 *  Restore of the existing board loop (categories × values × MC).
 *  One Cenzontle platform-wide — Jeopardy never adds a coach/mascot.
 */

/** George + No Face pattern: one-language face. Jeopardy is a loan, like Hoy. */
export const JEOPARDY_TITLE = { es: "Jeopardy", en: "Jeopardy" };
export const JEOPARDY_QUIET = {
  es: "Elige categoría, elige valor, responde.",
  en: "Pick a category, pick a value, answer.",
};
export const JEOPARDY_HOWTO = {
  es: "Elige categoría, elige valor, responde.",
  en: "Pick a category, pick a value, answer.",
};
export const JEOPARDY_WIN = { es: "¡Tablero completado!", en: "Board cleared!" };
export const JEOPARDY_DOUBLE = { es: "DOBLE O NADA", en: "DOBLE O NADA" };
export const JEOPARDY_DOUBLE_LINE = {
  es: "Esta casilla vale",
  en: "This tile is worth",
};
export const JEOPARDY_RESET = { es: "Reiniciar", en: "Reset board" };
export const JEOPARDY_ANSWER = { es: "Respuesta", en: "Answer" };

export const JEOPARDY_HUB = "games";
export const JEOPARDY_PACK_ID = "foci-v1";
export const JEOPARDY_CATEGORY_IDS = ["subj", "past", "porpara", "mex", "pron", "reg"];
export const JEOPARDY_VALUES = [100, 200, 300];

/** Dead chrome — never titles, never UI. */
export const JEOPARDY_DEAD_LABELS = [
  "JEOPARDY SOLO",
  "Jeopardy / Reto Ándale",
  "Reto Ándale / Jeopardy",
  "AHORCADO / HANGMAN",
];

export function jeopardyTitle(uiLang) {
  return uiLang === "en" ? JEOPARDY_TITLE.en : JEOPARDY_TITLE.es;
}

export function jeopardyQuiet(uiLang) {
  return uiLang === "en" ? JEOPARDY_QUIET.en : JEOPARDY_QUIET.es;
}

export function jeopardyHowTo(uiLang) {
  return uiLang === "en" ? JEOPARDY_HOWTO.en : JEOPARDY_HOWTO.es;
}

export function jeopardyWinLine(uiLang) {
  return uiLang === "en" ? JEOPARDY_WIN.en : JEOPARDY_WIN.es;
}

export function jeopardyDoubleLabel(uiLang) {
  return uiLang === "en" ? JEOPARDY_DOUBLE.en : JEOPARDY_DOUBLE.es;
}

export function jeopardyDoubleLine(uiLang) {
  return uiLang === "en" ? JEOPARDY_DOUBLE_LINE.en : JEOPARDY_DOUBLE_LINE.es;
}

export function jeopardyResetLabel(uiLang) {
  return uiLang === "en" ? JEOPARDY_RESET.en : JEOPARDY_RESET.es;
}

export function jeopardyAnswerLabel(uiLang) {
  return uiLang === "en" ? JEOPARDY_ANSWER.en : JEOPARDY_ANSWER.es;
}

export function jeopardyHasDeadLabel(text) {
  const s = String(text || "");
  return JEOPARDY_DEAD_LABELS.some((dead) => s.includes(dead));
}

export function jeopardyCategoriesFrom(foci = []) {
  return foci.filter((f) => JEOPARDY_CATEGORY_IDS.includes(f.id)).slice(0, 6);
}

export function jeopardyTileCount(categories = JEOPARDY_CATEGORY_IDS, values = JEOPARDY_VALUES) {
  return (categories?.length || 0) * (values?.length || 0);
}

export function jeopardyAnswered(run) {
  return Object.keys(run?.used || {}).length;
}

export function jeopardyStrip(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[¿?¡!.,;:—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function jeopardyChoiceMatch(a, b) {
  return jeopardyStrip(a) === jeopardyStrip(b);
}

export function pickJeopardyDouble(categories, values = JEOPARDY_VALUES, { date, xp, streak, weekday } = {}) {
  if (!categories?.length || !values?.length) return "";
  const d = date instanceof Date ? date : new Date();
  const cat = categories[(d.getDate() + (xp || 0)) % categories.length];
  const val = values[((streak || 0) + (weekday ?? d.getDay())) % values.length];
  return `${cat.id}-${val}`;
}

export function startJeopardyRun({
  categories = [],
  values = JEOPARDY_VALUES,
  date,
  xp,
  streak,
  weekday,
} = {}) {
  return {
    packId: JEOPARDY_PACK_ID,
    hub: JEOPARDY_HUB,
    score: 0,
    correct: 0,
    wrong: 0,
    used: {},
    active: null,
    selected: null,
    status: "idle",
    complete: false,
    awarded: false,
    doubleKey: pickJeopardyDouble(categories, values, { date, xp, streak, weekday }),
    gems: 0,
    xp: 0,
  };
}

export function hydrateJeopardy(raw) {
  if (!raw || typeof raw !== "object") return null;
  const status = raw.status === "correct" || raw.status === "wrong" ? raw.status : "idle";
  return {
    packId: raw.packId || JEOPARDY_PACK_ID,
    hub: raw.hub || JEOPARDY_HUB,
    score: raw.score || 0,
    correct: raw.correct || 0,
    wrong: raw.wrong || 0,
    used: raw.used && typeof raw.used === "object" ? raw.used : {},
    active: raw.active || null,
    selected: raw.selected ?? null,
    status,
    complete: !!raw.complete,
    awarded: !!raw.awarded,
    doubleKey: raw.doubleKey || "",
    gems: raw.gems || 0,
    xp: raw.xp || 0,
  };
}

export function openJeopardyTile(run, question) {
  if (!run || run.active || !question?.key || run.used?.[question.key]) return run;
  const value = question.value;
  const double = question.key === run.doubleKey;
  const stake = double ? value * 2 : value;
  return {
    ...run,
    active: { ...question, double, stake },
    selected: null,
    status: "idle",
    used: { ...(run.used || {}), [question.key]: true },
  };
}

export function chooseJeopardyChoice(run, choice) {
  if (!run?.active || run.status !== "idle") return run;
  const correct = jeopardyChoiceMatch(choice, run.active.answer);
  const stake = run.active.stake || run.active.value;
  return {
    ...run,
    selected: choice,
    status: correct ? "correct" : "wrong",
    score: run.score + (correct ? stake : -Math.floor(stake / 2)),
    correct: (run.correct || 0) + (correct ? 1 : 0),
    wrong: (run.wrong || 0) + (correct ? 0 : 1),
  };
}

export function closeJeopardyPrompt(run, tileCount) {
  if (!run) return run;
  const complete = jeopardyAnswered(run) >= tileCount;
  return { ...run, active: null, selected: null, status: "idle", complete };
}

export function jeopardyAward(run) {
  const gems = Math.max(8, Math.round(Math.max(0, run?.score || 0) / 150) + (run?.wrong === 0 ? 10 : 0));
  const xp = Math.max(15, Math.round(Math.max(0, run?.score || 0) / 40) + (run?.correct || 0) * 2);
  return { gems, xp };
}

export function finishJeopardyClear(run) {
  if (!run || run.awarded) return run;
  const { gems, xp } = jeopardyAward(run);
  return { ...run, awarded: true, gems, xp, complete: true };
}

export function isJeopardyComplete(run, tileCount) {
  return !!run?.complete || jeopardyAnswered(run) >= tileCount;
}
