import {
  DOCTORA_FULL_BEAT_CAP,
  DOCTORA_WIN_EN,
  DOCTORA_WIN_ES,
  FIRST_DOCTORA_BEAT_CAP,
  FIRST_DOCTORA_KEEP_NATURALS,
  FIRST_DOCTORA_PARK_NATURALS,
  doctoraBeatCap,
  doctoraWinCopy,
  isFirstDoctoraSession,
  pickFirstDoctoraBeats,
  shouldDoctoraEarlyWin,
  trimDoctoraBeats,
} from "./doctoraWin.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(DOCTORA_WIN_ES === "¡Eso!", "ES first-Doctora win is ¡Eso!");
assert(DOCTORA_WIN_EN === "That's it.", "EN first-Doctora win is That's it.");
assert(doctoraWinCopy("es") === "¡Eso!", "doctoraWinCopy ES");
assert(doctoraWinCopy("en") === "That's it.", "doctoraWinCopy EN");
assert(doctoraWinCopy() === "¡Eso!", "doctoraWinCopy default is ES");
assert(!/¡Ganaste!|Ganaste|You won!/i.test(`${DOCTORA_WIN_ES}${DOCTORA_WIN_EN}`), "win copy is not ¡Ganaste!/You won!");

assert(isFirstDoctoraSession({ streak: 0 }), "streak 0 is first Doctora session");
assert(isFirstDoctoraSession({}), "empty progress is first Doctora session");
assert(isFirstDoctoraSession({ streak: null }), "null streak is first Doctora session");
assert(!isFirstDoctoraSession({ streak: 1 }), "streak 1 is not first Doctora");
assert(!isFirstDoctoraSession({ streak: 4 }), "later streak keeps full Doctora");

assert(FIRST_DOCTORA_BEAT_CAP === 4, "first Doctora cap is 4");
assert(DOCTORA_FULL_BEAT_CAP === 6, "later Doctora keeps 6 beats");
assert(doctoraBeatCap({ firstDoctora: true }) === 4, "firstDoctora flag caps at 4");
assert(doctoraBeatCap({ streak: 0 }) === 4, "streak 0 caps at 4");
assert(doctoraBeatCap({ firstDoctora: false, streak: 0 }) === 6, "explicit later path keeps 6");
assert(doctoraBeatCap({ streak: 1 }) === 6, "streak 1 keeps full depth");
assert(doctoraBeatCap({ firstDoctora: false }) === 6, "returning Doctora keeps full depth");

assert(FIRST_DOCTORA_KEEP_NATURALS.join("|") === [
  "¿Me da un café, por favor?",
  "Tengo muchas ganas de verte.",
  "Eso tiene sentido.",
  "Te estoy esperando.",
].join("|"), "keep stamp is café, ganas, sentido, esperando");
assert(FIRST_DOCTORA_PARK_NATURALS.join("|") === [
  "Necesito tomar una decisión.",
  "Voy a postularme al trabajo.",
].join("|"), "park stamp is decisión, postularse");
assert(FIRST_DOCTORA_KEEP_NATURALS.length === 4, "keep list is exactly 4");

const deck = [
  { natural: "Tengo muchas ganas de verte." },
  { natural: "¿Me da un café, por favor?" },
  { natural: "Necesito tomar una decisión." },
  { natural: "Te estoy esperando." },
  { natural: "Eso tiene sentido." },
  { natural: "Voy a postularme al trabajo." },
];
const first = trimDoctoraBeats(deck, { firstDoctora: true });
assert(first.length === 4, "first session trims to 4");
assert(first.map((x) => x.natural).join("|") === FIRST_DOCTORA_KEEP_NATURALS.join("|"), "first session is café → ganas → sentido → esperando");
assert(!first.some((x) => FIRST_DOCTORA_PARK_NATURALS.includes(x.natural)), "parked beats are not in first session");
assert(pickFirstDoctoraBeats(deck).map((x) => x.natural).join("|") === FIRST_DOCTORA_KEEP_NATURALS.join("|"), "pickFirstDoctoraBeats is the keep stamp");
assert(trimDoctoraBeats(deck, { firstDoctora: false }).length === 6, "later Doctora keeps all 6");
assert(trimDoctoraBeats(deck, { firstDoctora: false }).some((x) => x.natural === "Necesito tomar una decisión."), "later keeps decisión");
assert(trimDoctoraBeats(deck, { firstDoctora: false }).some((x) => x.natural === "Voy a postularme al trabajo."), "later keeps postularse");
assert(trimDoctoraBeats(deck, { streak: 1 }).length === 6, "streak 1 trim is full depth");
assert(trimDoctoraBeats([], { firstDoctora: true }).length === 0, "empty queue stays empty");

const six = [1, 2, 3, 4, 5, 6];
assert(trimDoctoraBeats(six, { firstDoctora: true }).length === 4, "generic first list still caps at 4");

assert(shouldDoctoraEarlyWin({ firstDoctora: true, hits: 1 }), "first correct is the early checkpoint");
assert(shouldDoctoraEarlyWin({ firstDoctora: true, hits: 2 }), "later hits still count as the checkpoint");
assert(!shouldDoctoraEarlyWin({ firstDoctora: true, hits: 0 }), "no hit yet — stay in the scene");
assert(!shouldDoctoraEarlyWin({ firstDoctora: false, hits: 1 }), "later Doctora does not early-win");
assert(!shouldDoctoraEarlyWin({ hits: 1 }), "missing firstDoctora flag does not early-win");
assert(!shouldDoctoraEarlyWin({ firstDoctora: true }), "missing hits does not early-win");

console.log("ok: first Doctora ≤4 beats + early checkpoint + ¡Eso!/That's it.");
