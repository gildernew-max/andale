import { SUBJ_FIVE, SUBJ_FIVE_HUB, SUBJ_FIVE_LABEL, SUBJ_FIVE_SUB, subjFiveLines, subjFiveSub } from "./subjFive.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(SUBJ_FIVE_LABEL === "80/20", "label is the 80/20 loan in both langs");
assert(SUBJ_FIVE_HUB === "80/20", "hub tile title is the 80/20 loan");
assert(SUBJ_FIVE_SUB.es === "Subjuntivo en cinco", "ES second line");
assert(SUBJ_FIVE_SUB.en === "Subjunctive in five", "EN second line");
assert(subjFiveSub("es") === "Subjuntivo en cinco", "subjFiveSub follows ES");
assert(subjFiveSub("en") === "Subjunctive in five", "subjFiveSub follows EN");
assert(subjFiveSub("fr") === "Subjuntivo en cinco", "unknown uiLang stays ES");

const ES = [
  "Usa el subjuntivo después de un deseo, emoción o duda + que: Quiero que vengas.",
  "Lo que crees que es verdad suele ir en indicativo; lo que dudas o niegas, en subjuntivo: Creo que viene / No creo que venga.",
  "Con cuando o hasta que, usa subjuntivo si todavía no ha pasado: Te llamo cuando llegue.",
  "Si hablas de un hecho o una realidad conocida, usa indicativo: Sé que está aquí.",
  "Prueba mental: ¿Es real/seguro, o deseado/incierto/todavía no? Real → indicativo; lo demás → subjuntivo.",
];
const EN = [
  "Use the subjunctive after a wish, emotion, or doubt + que: Quiero que vengas.",
  "What you believe is true usually takes the indicative; what you doubt or deny takes the subjunctive: Creo que viene / No creo que venga.",
  "With cuando or hasta que, use the subjunctive when the event hasn’t happened yet: Te llamo cuando llegue.",
  "If you’re talking about a known fact or reality, use the indicative: Sé que está aquí.",
  "Soft test: Is this real/certain, or wished-for/uncertain/not yet? Real → indicative; the other side → subjunctive.",
];

assert(SUBJ_FIVE.es.length === 5 && SUBJ_FIVE.en.length === 5, "exactly five sentences each lang");
ES.forEach((line, i) => assert(SUBJ_FIVE.es[i] === line, `ES ${i + 1} exact`));
EN.forEach((line, i) => assert(SUBJ_FIVE.en[i] === line, `EN ${i + 1} exact`));
assert(subjFiveLines("es").join("\n") === ES.join("\n"), "subjFiveLines ES");
assert(subjFiveLines("en").join("\n") === EN.join("\n"), "subjFiveLines EN");
assert(subjFiveLines("es") !== subjFiveLines("en"), "ES and EN pools are distinct");

console.log("ok: 80/20 Subjuntivo in five — George exact");
