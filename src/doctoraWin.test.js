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
assert(DOCTORA_FULL_BEAT_CAP === 11, "later Doctora keeps 11 beats");
assert(doctoraBeatCap({ firstDoctora: true }) === 4, "firstDoctora flag caps at 4");
assert(doctoraBeatCap({ streak: 0 }) === 4, "streak 0 caps at 4");
assert(doctoraBeatCap({ firstDoctora: false, streak: 0 }) === 11, "explicit later path keeps 11");
assert(doctoraBeatCap({ streak: 1 }) === 11, "streak 1 keeps full depth");
assert(doctoraBeatCap({ streak: 4 }) === 11, "later streak keeps full depth");
assert(doctoraBeatCap({ firstDoctora: false }) === 11, "returning Doctora keeps full depth");

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
  { natural: "¿Me da algo para la garganta, por favor?" },
  { natural: "¿Me puedes mandar un plomero? Se tapó el lavabo." },
  { natural: "El domingo no puedo ir a tu comida. ¿Nos vemos otro día?" },
  { natural: "Disculpe, ¿dónde está el mercado?" },
  { natural: "Quiero abrir una cuenta. ¿Puedo agendar una cita?" },
];
const laterOnly = [
  "¿Me da algo para la garganta, por favor?",
  "¿Me puedes mandar un plomero? Se tapó el lavabo.",
  "El domingo no puedo ir a tu comida. ¿Nos vemos otro día?",
  "Disculpe, ¿dónde está el mercado?",
  "Quiero abrir una cuenta. ¿Puedo agendar una cita?",
];
const first = trimDoctoraBeats(deck, { firstDoctora: true });
assert(first.length === 4, "first session trims to 4");
assert(first.map((x) => x.natural).join("|") === FIRST_DOCTORA_KEEP_NATURALS.join("|"), "first session is café → ganas → sentido → esperando");
assert(!first.some((x) => FIRST_DOCTORA_PARK_NATURALS.includes(x.natural)), "parked beats are not in first session");
assert(!first.some((x) => laterOnly.includes(x.natural)), "items 7 to 11 stay off the first session");
assert(pickFirstDoctoraBeats(deck).map((x) => x.natural).join("|") === FIRST_DOCTORA_KEEP_NATURALS.join("|"), "pickFirstDoctoraBeats is the keep stamp");
assert(trimDoctoraBeats(deck, { streak: 0 }).map((x) => x.natural).join("|") === FIRST_DOCTORA_KEEP_NATURALS.join("|"), "streak 0 still serves the same four");
assert(!trimDoctoraBeats(deck, { streak: 0 }).some((x) => laterOnly.includes(x.natural)), "streak 0 excludes items 7 to 11");
const later = trimDoctoraBeats(deck, { firstDoctora: false });
assert(later.length === 11, "later Doctora keeps all 11");
assert(later.map((x) => x.natural).join("|") === deck.map((x) => x.natural).join("|"), "later session serves all 11 in list order");
assert(later[6].natural === "¿Me da algo para la garganta, por favor?", "later serves item 7");
assert(later[7].natural === "¿Me puedes mandar un plomero? Se tapó el lavabo.", "later serves item 8");
assert(later[8].natural === "El domingo no puedo ir a tu comida. ¿Nos vemos otro día?", "later serves item 9");
assert(later[9].natural === "Disculpe, ¿dónde está el mercado?", "later serves item 10");
assert(later[10].natural === "Quiero abrir una cuenta. ¿Puedo agendar una cita?", "later serves item 11");
assert(later.some((x) => x.natural === "Necesito tomar una decisión."), "later keeps decisión");
assert(later.some((x) => x.natural === "Voy a postularme al trabajo."), "later keeps postularse");
assert(trimDoctoraBeats(deck, { streak: 1 }).map((x) => x.natural).join("|") === deck.map((x) => x.natural).join("|"), "streak 1 serves all 11 in list order");
const twelve = deck.concat([{ natural: "twelfth-beat" }]);
assert(trimDoctoraBeats(twelve, { firstDoctora: false }).length === 11, "later Doctora does not serve a twelfth beat");
assert(!trimDoctoraBeats(twelve, { firstDoctora: false }).some((x) => x.natural === "twelfth-beat"), "a twelfth beat stays off the later path");
assert(trimDoctoraBeats(twelve, { streak: 1 }).length === 11, "streak 1 does not serve a twelfth beat");
assert(trimDoctoraBeats(twelve, { firstDoctora: true }).map((x) => x.natural).join("|") === FIRST_DOCTORA_KEEP_NATURALS.join("|"), "first session stays the same four when the deck is longer");
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
