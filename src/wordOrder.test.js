import {
  WORD_ORDER_TIP_EN,
  WORD_ORDER_TIP_ES,
  gradeListedPhrase,
  isWordOrderVariant,
  listedAnswers,
  wordOrderTip,
} from "./wordOrder.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(WORD_ORDER_TIP_ES === "Orden distinto, mismo sentido. En formal, ambas valen.", "ES tip locked");
assert(WORD_ORDER_TIP_EN === "Different order, same meaning. Formally, both work.", "EN tip locked");
assert(wordOrderTip("es") === WORD_ORDER_TIP_ES, "wordOrderTip es");
assert(wordOrderTip("en") === WORD_ORDER_TIP_EN, "wordOrderTip en");
assert(wordOrderTip() === WORD_ORDER_TIP_ES, "wordOrderTip defaults ES");

const wordOrderItem = {
  answers: ["Aunque llueve, salimos", "Salimos aunque llueve"],
};
assert(listedAnswers(wordOrderItem)[0] === "Aunque llueve, salimos", "primary is first listed");
assert(isWordOrderVariant("Aunque llueve, salimos", "Salimos aunque llueve"), "listed orders are variants");

const primary = gradeListedPhrase("Aunque llueve, salimos", wordOrderItem);
assert(primary.status === "correct" && primary.tip === false, "primary listed order is correct, no tip");

const alt = gradeListedPhrase("Salimos aunque llueve", wordOrderItem);
assert(alt.status === "equivalent", "listed alternate order is equivalent, not wrong");
assert(alt.tip === true, "listed alternate order shows the tip");
assert(alt.status !== "wrong", "equivalent accepts BEFORE a hard fail");

const punct = gradeListedPhrase("salimos aunque llueve.", wordOrderItem);
assert(punct.status === "equivalent" && punct.tip === true, "punctuation still matches listed alternate");

const miss = gradeListedPhrase("Aunque llovía, salimos", wordOrderItem);
assert(miss.status === "wrong" && miss.tip === false, "unlisted guess is a hard fail");

const empty = gradeListedPhrase("   ", wordOrderItem);
assert(empty.status === "empty" && empty.tip === false, "blank is not a hard fail");

const unlistedOrder = gradeListedPhrase("Llueve aunque salimos", wordOrderItem);
assert(unlistedOrder.status === "wrong", "unlisted permutation is a hard fail");

const doctor = {
  natural: "¿Me da un café, por favor?",
  formal: "¿Podría darme un café, por favor?",
};
const nat = gradeListedPhrase("¿Me da un café, por favor?", doctor);
assert(nat.status === "correct" && nat.tip === false, "Phrase Doctor natural is primary");
const form = gradeListedPhrase("¿Podría darme un café, por favor?", doctor);
assert(form.status === "equivalent" && form.tip === true, "listed formal accepts before hard fail");
assert(form.status !== "wrong", "dual-acceptable formal is not a hard fail");
const doctorMiss = gradeListedPhrase("¿Puedo obtener un café?", doctor);
assert(doctorMiss.status === "wrong" && doctorMiss.tip === false, "awkward source still hard-fails");

const synonym = {
  answers: ["¿Podría enviarme el archivo, por favor?", "¿Podría enviarme el archivo?"],
};
const syn = gradeListedPhrase("¿Podría enviarme el archivo?", synonym);
assert(syn.status === "correct" && syn.tip === false, "listed shorter synonym stays correct without the order tip");

const orderQ = { type: "order", answer: "Mientras dormía sonó el teléfono" };
assert(gradeListedPhrase("Mientras dormía sonó el teléfono", orderQ).status === "correct", "order primary still hits");
assert(gradeListedPhrase("Sonó el teléfono mientras dormía", orderQ).status === "wrong", "unlisted order alternate still fails");

const listedOrder = {
  type: "order",
  answer: "Aunque llueve, salimos",
  answers: ["Aunque llueve, salimos", "Salimos aunque llueve"],
};
const builtAlt = gradeListedPhrase("Salimos aunque llueve", listedOrder);
assert(builtAlt.status === "equivalent" && builtAlt.tip === true, "order tiles accept a listed alternate before hard fail");

const loose = gradeListedPhrase("Aunque llueve, salímos", wordOrderItem);
assert(loose.status === "correct" && loose.almost === true && loose.tip === false, "accent-only on primary is almost, not a fail");

console.log("ok: word-order tip locked; listed equivalent accepts before hard fail");
