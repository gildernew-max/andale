import {
  JEOPARDY_ANSWER,
  JEOPARDY_CATEGORY_IDS,
  JEOPARDY_DEAD_LABELS,
  JEOPARDY_DOUBLE,
  JEOPARDY_HUB,
  JEOPARDY_HOWTO,
  JEOPARDY_PACK_ID,
  JEOPARDY_QUIET,
  JEOPARDY_RESET,
  JEOPARDY_TITLE,
  JEOPARDY_VALUES,
  JEOPARDY_WIN,
  chooseJeopardyChoice,
  closeJeopardyPrompt,
  finishJeopardyClear,
  hydrateJeopardy,
  isJeopardyComplete,
  jeopardyAnswerLabel,
  jeopardyAnswered,
  jeopardyAward,
  jeopardyCategoriesFrom,
  jeopardyChoiceMatch,
  jeopardyDoubleLabel,
  jeopardyHasDeadLabel,
  jeopardyHowTo,
  jeopardyQuiet,
  jeopardyResetLabel,
  jeopardyStrip,
  jeopardyTileCount,
  jeopardyTitle,
  jeopardyWinLine,
  openJeopardyTile,
  pickJeopardyDouble,
  startJeopardyRun,
} from "./jeopardy.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(JEOPARDY_TITLE.es === "Jeopardy" && JEOPARDY_TITLE.en === "Jeopardy", "title is the Jeopardy loan");
assert(jeopardyTitle("es") === "Jeopardy" && jeopardyTitle("en") === "Jeopardy", "title helper is the loan");
assert(jeopardyTitle("es") !== "JEOPARDY SOLO" && jeopardyTitle("en") !== "JEOPARDY SOLO", "no SOLO lockup title");
assert(JEOPARDY_QUIET.es === "Elige categoría, elige valor, responde.", "ES quiet is the restored Camino line");
assert(JEOPARDY_QUIET.en === "Pick a category, pick a value, answer.", "EN quiet is the restored Camino line");
assert(jeopardyQuiet("es") === JEOPARDY_QUIET.es && jeopardyQuiet("en") === JEOPARDY_QUIET.en, "quiet helper");
assert(JEOPARDY_HOWTO.es === JEOPARDY_QUIET.es && JEOPARDY_HOWTO.en === JEOPARDY_QUIET.en, "how-to reuses quiet");
assert(jeopardyHowTo("es") === JEOPARDY_HOWTO.es && jeopardyHowTo("en") === JEOPARDY_HOWTO.en, "how-to helper");
assert(JEOPARDY_WIN.es === "¡Tablero completado!" && JEOPARDY_WIN.en === "Board cleared!", "win is the restored board-clear line");
assert(jeopardyWinLine("es") === JEOPARDY_WIN.es && jeopardyWinLine("en") === JEOPARDY_WIN.en, "win helper");
assert(JEOPARDY_DOUBLE.es === "DOBLE O NADA" && JEOPARDY_DOUBLE.en === "DOBLE O NADA", "double is the restored loan");
assert(jeopardyDoubleLabel("es") === "DOBLE O NADA", "double helper");
assert(JEOPARDY_RESET.es === "Reiniciar" && JEOPARDY_RESET.en === "Reset board", "reset is the restored pair");
assert(jeopardyResetLabel("en") === "Reset board", "reset helper");
assert(JEOPARDY_ANSWER.es === "Respuesta" && JEOPARDY_ANSWER.en === "Answer", "answer label is the restored pair");
assert(jeopardyAnswerLabel("es") === "Respuesta", "answer helper");
assert(JEOPARDY_HUB === "games", "lives under Games");
assert(JEOPARDY_PACK_ID === "foci-v1", "restored SMART_FOCI pack");
assert(JEOPARDY_CATEGORY_IDS.join(",") === "subj,past,porpara,mex,pron,reg", "six restored category ids");
assert(JEOPARDY_VALUES.join(",") === "100,200,300", "three restored values");
assert(jeopardyTileCount() === 18, "6 × 3 board");
assert(!JEOPARDY_DEAD_LABELS.includes("Memoria") && !JEOPARDY_DEAD_LABELS.includes("Memory"), "Memory stays out of this pack");

const foci = [
  { id: "hyp" },
  { id: "subj" },
  { id: "past" },
  { id: "porpara" },
  { id: "mex" },
  { id: "pron" },
  { id: "reg" },
  { id: "conn" },
];
const cats = jeopardyCategoriesFrom(foci);
assert(cats.map((c) => c.id).join(",") === "subj,past,porpara,mex,pron,reg", "filters SMART_FOCI in stamp order");
assert(jeopardyTileCount(cats, JEOPARDY_VALUES) === 18, "filtered foci still make 18 tiles");

const date = new Date("2026-09-19T12:00:00Z");
assert(pickJeopardyDouble(cats, JEOPARDY_VALUES, { date, xp: 0, streak: 0, weekday: 6 }) === "subj-100", "double key is deterministic");

const run = startJeopardyRun({ categories: cats, values: JEOPARDY_VALUES, date, xp: 0, streak: 0, weekday: 6 });
assert(run.hub === "games" && run.packId === JEOPARDY_PACK_ID, "run stamps Games hub");
assert(run.score === 0 && run.status === "idle" && !run.complete, "fresh board");
assert(run.doubleKey === "subj-100", "double tile is stamped");
assert(jeopardyAnswered(run) === 0, "nothing used yet");

const q100 = { key: "subj-100", value: 100, answer: "quiera", choices: ["quiere", "quiera", "quería"] };
const opened = openJeopardyTile(run, q100);
assert(opened.active.double === true && opened.active.stake === 200, "double doubles the stake");
assert(opened.used["subj-100"] === true, "opening consumes the tile");
assert(openJeopardyTile(opened, q100) === opened, "used tile is a no-op");

const hit = chooseJeopardyChoice(opened, "Quiera");
assert(hit.status === "correct" && hit.score === 200 && hit.correct === 1, "strip-match scores the stake");
assert(chooseJeopardyChoice(hit, "quiere") === hit, "already answered is a no-op");

const missQ = { key: "mex-200", value: 200, answer: "chamba", choices: ["trabajo", "chamba"] };
const missOpen = openJeopardyTile(run, missQ);
assert(missOpen.active.double === false && missOpen.active.stake === 200, "ordinary tile keeps value");
const miss = chooseJeopardyChoice(missOpen, "trabajo");
assert(miss.status === "wrong" && miss.score === -100 && miss.wrong === 1, "miss subtracts half");

const settled = closeJeopardyPrompt(hit, 18);
assert(settled.active === null && settled.status === "idle" && settled.complete === false, "one tile is not a clear");
assert(jeopardyAnswered(settled) === 1, "used count survives close");

let walk = startJeopardyRun({ categories: cats, values: JEOPARDY_VALUES, date, xp: 1, streak: 0, weekday: 0 });
for (const cat of cats) {
  for (const value of JEOPARDY_VALUES) {
    walk = openJeopardyTile(walk, { key: `${cat.id}-${value}`, value, answer: "sí", choices: ["sí", "no"] });
    walk = chooseJeopardyChoice(walk, "sí");
    walk = closeJeopardyPrompt(walk, 18);
  }
}
assert(walk.complete && isJeopardyComplete(walk, 18), "18 tiles complete the board");
assert(walk.correct === 18 && walk.wrong === 0, "perfect walk");
const cleared = finishJeopardyClear(walk);
assert(cleared.awarded && cleared.xp >= 15 && cleared.gems >= 8, "clear pays the restored award floor");
assert(finishJeopardyClear(cleared) === cleared, "second award is a no-op");
const award = jeopardyAward({ score: 0, correct: 0, wrong: 1 });
assert(award.xp === 15 && award.gems === 8, "floor holds on a poor board");

const live = hydrateJeopardy({ score: 40, used: { "mex-100": true }, awarded: true });
assert(live.hub === "games" && live.score === 40 && live.awarded, "hydrate keeps a live snapshot");
assert(hydrateJeopardy(null) === null, "empty live is null");

assert(jeopardyStrip("¿Quiera!") === "quiera", "strip drops marks and case");
assert(jeopardyChoiceMatch("Quiera.", "quiera"), "choice match ignores punctuation");
assert(jeopardyHasDeadLabel("JEOPARDY SOLO"), "dead-label helper catches SOLO lockup");
assert(jeopardyHasDeadLabel("Reto Ándale / Jeopardy"), "dead-label helper catches slash lockup");
assert(!jeopardyHasDeadLabel("Jeopardy"), "loan title is not dead");

console.log("ok: jeopardy — restored 6×3 board, loan title, quiet EN/ES, no SOLO lockup");
