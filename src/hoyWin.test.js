import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  COLD_FIRST_HOY_COUNT,
  COLD_FIRST_HOY_MAX,
  COLD_FIRST_HOY_MIN,
  COLD_FIRST_HOY_MIN_TYPES,
  FIRST_HOY_BEAT_CAP,
  HOY_FULL_BEAT_CAP,
  HOY_WIN_EN,
  HOY_WIN_ES,
  buildColdFirstHoyQueue,
  coldFirstHoyTypes,
  hoyBeatCap,
  hoyWinCopy,
  isColdFirstHoyQueue,
  isFirstHoySession,
  isShortHoy,
  hoySceneBeatCount,
  shouldParkHoyUnderMas,
  shouldHoyEarlyWin,
  trimHoyBeats,
} from "./hoyWin.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(HOY_WIN_ES === "¡Eso!", "ES first-Hoy win is ¡Eso!");
assert(HOY_WIN_EN === "That's it.", "EN first-Hoy win is That's it.");
assert(hoyWinCopy("es") === "¡Eso!", "hoyWinCopy ES");
assert(hoyWinCopy("en") === "That's it.", "hoyWinCopy EN");
assert(hoyWinCopy() === "¡Eso!", "hoyWinCopy default is ES");
assert(!/¡Ganaste!|Ganaste|You won!/i.test(`${HOY_WIN_ES}${HOY_WIN_EN}`), "win copy is not ¡Ganaste!/You won!");

assert(isFirstHoySession({ streak: 0 }), "streak 0 is first Hoy session");
assert(isFirstHoySession({}), "empty progress is first Hoy session");
assert(isFirstHoySession({ streak: null }), "null streak is first Hoy session");
assert(!isFirstHoySession({ streak: 1 }), "streak 1 is not first Hoy");
assert(!isFirstHoySession({ streak: 4 }), "later streak keeps full Hoy");

assert(isShortHoy({ streak: 0 }), "streak 0 is a short Hoy");
assert(isShortHoy({ firstHoy: true, streak: 1 }), "firstHoy flag is a short Hoy");
assert(isShortHoy({ streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }), "day-2 return is a short Hoy");
assert(isShortHoy({ streak: 4, lastDay: "2026-09-03", today: "2026-09-05" }), "day-2 after a gap is still short");
assert(!isShortHoy({ streak: 1 }), "streak 1 without a prior lastDay is not short");
assert(!isShortHoy({ streak: 1, lastDay: "2026-09-05", today: "2026-09-05" }), "same-day after win is not short");
assert(!isShortHoy({ firstHoy: false, streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }), "explicit full / Más path is not short");

assert(FIRST_HOY_BEAT_CAP === 4, "first Hoy cap is 4");
assert(HOY_FULL_BEAT_CAP === 5, "later Hoy keeps 5 beats");
assert(hoyBeatCap({ firstHoy: true }) === 4, "firstHoy flag caps at 4");
assert(hoyBeatCap({ streak: 0 }) === 4, "streak 0 caps at 4");
assert(hoyBeatCap({ firstHoy: false, streak: 0 }) === 5, "explicit later path keeps 5");
assert(hoyBeatCap({ streak: 1 }) === 5, "streak 1 keeps full depth");
assert(hoyBeatCap({ firstHoy: false }) === 5, "returning Hoy keeps full depth");
assert(hoyBeatCap({ streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }) === 4, "day-2 return caps at 4");
assert(hoyBeatCap({ firstHoy: false, streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }) === 5, "grown scene / explicit full keeps 5");

const casero3 = {
  setup: "El casero pide depósito y aval hoy. Contéstale sin sonar de manual.",
  line: "Oye, ¿el depósito cuenta para el último mes?",
  question: "En WhatsApp con el casero, «Oye, ¿el depósito cuenta…?» suena:",
};
const airport3 = {
  setup: "Tu vuelo cambió de puerta dos veces.",
  line: "Mi vuelo fue cancelado; sin embargo, necesito llegar hoy mismo.",
  question: "«Sin embargo» introduce:",
};
assert(hoySceneBeatCount(casero3) === 3, "live casero is setup · line · Q");
assert(hoySceneBeatCount(airport3) === 3, "tomorrow Mostrador is 3 beats");
assert(!shouldParkHoyUnderMas(casero3), "casero ≤4 does not park under Más");
assert(!shouldParkHoyUnderMas(airport3), "Mostrador ≤4 does not park under Más");
assert(!shouldParkHoyUnderMas({ setup: "a", line: "b", question: "c" }), "3-beat scene stays on the hero");
assert(shouldParkHoyUnderMas({ setup: "a", line: "b", question: "c", extras: ["d", "e"] }), "Más park only after a scene grows past 4");
assert(!shouldParkHoyUnderMas(null), "missing scene does not park");

const six = [1, 2, 3, 4, 5, 6];
assert(trimHoyBeats(six, { firstHoy: true }).length === 4, "first session trims to 4");
assert(trimHoyBeats(six, { firstHoy: true }).join(",") === "1,2,3,4", "first session keeps the front beats");
assert(trimHoyBeats(six, { firstHoy: false }).length === 5, "later Hoy trims to 5");
assert(trimHoyBeats(six, { streak: 1 }).length === 5, "streak 1 trim is full depth");
assert(trimHoyBeats(six, { streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }).length === 4, "day-2 return trims to 4");
assert(trimHoyBeats(six, { firstHoy: false, streak: 1, lastDay: "2026-09-04", today: "2026-09-05" }).length === 5, "grown / explicit full trim is 5");
assert(trimHoyBeats([], { firstHoy: true }).length === 0, "empty queue stays empty");

assert(shouldHoyEarlyWin({ firstHoy: true, hits: 1 }), "first correct is the early checkpoint");
assert(shouldHoyEarlyWin({ firstHoy: true, hits: 2 }), "later hits still count as the checkpoint");
assert(!shouldHoyEarlyWin({ firstHoy: true, hits: 0 }), "no hit yet — stay in the scene");
assert(!shouldHoyEarlyWin({ firstHoy: false, hits: 1 }), "later Hoy does not early-win");
assert(!shouldHoyEarlyWin({ hits: 1 }), "missing firstHoy flag does not early-win");
assert(!shouldHoyEarlyWin({ firstHoy: true }), "missing hits does not early-win");
assert(shouldHoyEarlyWin({ firstHoy: true, hits: 1 }), "day-2 return reuses the same firstHoy early-win lock");
assert(shouldHoyEarlyWin({ firstHoy: true, hits: 1, coldRun: false }), "explicit non-cold short Hoy still ends on the first correct");
assert(!shouldHoyEarlyWin({ firstHoy: false, hits: 1 }), "Más / full path does not early-win");
assert(!shouldHoyEarlyWin({ firstHoy: true, hits: 1, coldRun: true }), "cold first Hoy does not end on the first correct");
assert(!shouldHoyEarlyWin({ firstHoy: true, hits: 5, coldRun: true }), "cold first Hoy never early-wins, even after later hits");

assert(COLD_FIRST_HOY_COUNT === 5, "cold first Hoy is 5 beats");
assert(COLD_FIRST_HOY_MIN === 4 && COLD_FIRST_HOY_MAX === 6, "cold first Hoy stays inside 4–6");
assert(COLD_FIRST_HOY_MIN_TYPES === 3, "cold first Hoy needs at least 3 types");

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

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const D = {
  green: "#58CC02", greenDark: "#46A302",
  purple: "#CE82FF", purpleDark: "#A567CC",
  blue: "#1CB0F6", blueDark: "#1899D6",
  gold: "#FFC800", goldDark: "#E6A800",
};
const UNITS = Function("D", `"use strict"; return (${extractConst(appSrc, "UNITS")});`)(D);
const TODAY_SCENES = Function("D", `"use strict"; return (${extractConst(appSrc, "TODAY_SCENES")});`)(D);

for (const scene of TODAY_SCENES) {
  const queue = buildColdFirstHoyQueue(scene, UNITS, "es");
  const types = coldFirstHoyTypes(queue);
  assert(isColdFirstHoyQueue(queue), `${scene.id} cold Hoy is a 4–6 mix with ≥3 types (got ${queue.length} / ${types.join(",")})`);
  assert(queue.length === COLD_FIRST_HOY_COUNT, `${scene.id} cold Hoy is 5 beats, not ${queue.length}`);
  assert(queue.length !== 1, `${scene.id} cold Hoy cannot shrink to 1 item`);
  assert(types.join(",") === "mc,listen,type,order,transform", `${scene.id} mix is mc, listen, type, order, transform (got ${types.join(",")})`);
  assert(queue[0].type === "mc" && queue[0].answer === scene.answer, `${scene.id} opens on the scene MC so the first correct is still one tap`);
  assert(queue[1].type === "listen" && queue[1].text === scene.line, `${scene.id} second beat is the scene line`);
  assert(queue.slice(2).every((q) => q._i >= 0 && scene.units.includes(q._u)), `${scene.id} later beats are authored unit questions`);
  const en = buildColdFirstHoyQueue(scene, UNITS, "en");
  assert(en.length === queue.length && coldFirstHoyTypes(en).join(",") === types.join(","), `${scene.id} EN keeps the same length and types`);
  assert(en[0].prompt === scene.questionEn, `${scene.id} EN prompt is the scene question`);
}

const thinScene = {
  id: "thin",
  question: "¿Suena natural?",
  questionEn: "Does it sound natural?",
  line: "Oye, ¿puedes venir?",
  answers: ["Oye, ¿puedes venir?"],
  choices: ["natural", "formal"],
  answer: "natural",
  units: ["only"],
};
const thinUnits = [{
  id: "only",
  questions: [
    { type: "type", prompt: "Tengo mucha ___ .", answers: ["chamba"] },
    { type: "mc", prompt: "«Sale» significa:", choices: ["ok"], answer: "ok" },
  ],
}];
const thin = buildColdFirstHoyQueue(thinScene, thinUnits, "es");
assert(isColdFirstHoyQueue(thin), "a thin unit still fills to 4–6 with ≥3 types");
assert(thin.length >= COLD_FIRST_HOY_MIN && thin.length !== 1, "a thin unit cannot shrink to 1 item");
assert(coldFirstHoyTypes(thin).length >= COLD_FIRST_HOY_MIN_TYPES, "thin fill keeps at least 3 types");

assert(appSrc.includes("buildColdFirstHoyQueue"), "cold first Hoy builder is wired");
assert(appSrc.includes("coldFirstHoy: true"), "cold first Hoy is stamped on the session");
assert(appSrc.includes("coldRun: session.coldFirstHoy"), "early win skips the cold mix");

console.log("ok: cold first Hoy is 5 beats / mc+listen+type+order+transform; day-2 still checkpoints at 1.");
