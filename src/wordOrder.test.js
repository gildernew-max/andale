import {
  WORD_ORDER_TIP_EN,
  WORD_ORDER_TIP_ES,
  gradeListedPhrase,
  isIntrinsicOrderCapital,
  isWordOrderVariant,
  listedAnswers,
  orderTileLabel,
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
assert(alt.status !== "wrong", "equivalent accepts / soft-credits AFTER the miss, not a hard fail");
const formalRegister = {
  natural: "Le agradezco de antemano su atención.",
  formal: "De antemano le agradezco su atención.",
  answers: ["Le agradezco de antemano su atención.", "De antemano le agradezco su atención."],
};
const formalAlt = gradeListedPhrase("De antemano le agradezco su atención.", formalRegister);
assert(formalAlt.status === "equivalent" && formalAlt.tip === true, "formal/register listed order variant is soft-credit + tip");
assert(formalAlt.status !== "wrong", "formal/register listed variant is not a hard fail");

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

const agradezco = "Le agradezco de antemano su atención";
assert(orderTileLabel("Le", { answer: agradezco }) === "le", "bank hides the sentence-opening capital");
assert(orderTileLabel("agradezco", { answer: agradezco }) === "agradezco", "lowercase answer words stay lowercase in the bank");
assert(orderTileLabel("te", { answer: agradezco }) === "te", "distractor te stays as authored");
assert(orderTileLabel("tu", { answer: agradezco }) === "tu", "distractor tu stays as authored");
assert(orderTileLabel("Le", { answer: agradezco, placedIndex: 0 }) === "Le", "the word in the first answer slot is capitalized");
assert(orderTileLabel("le", { answer: agradezco, placedIndex: 0 }) === "Le", "a lowercase tile placed first still shows a capital");
assert(orderTileLabel("agradezco", { answer: agradezco, placedIndex: 0 }) === "Agradezco", "whichever word is first in the row gets the capital");
assert(orderTileLabel("Le", { answer: agradezco, placedIndex: 1 }) === "le", "the opening tile is lowercase once it is not first");
assert(orderTileLabel("tu", { answer: agradezco, placedIndex: 1 }) === "tu", "a distractor placed later stays tu");
assert(orderTileLabel("tu", { answer: agradezco, placedIndex: 0 }) === "Tu", "a distractor placed first is capitalized for display");

const libro = "El libro cuyo autor murió el año pasado";
assert(orderTileLabel("El", { answer: libro }) === "el", "sentence-initial El matches the later el in the bank");
assert(orderTileLabel("el", { answer: libro }) === "el", "the mid-sentence el stays el");
assert(!isIntrinsicOrderCapital("El", libro), "El is sentence case, not an always-capital form");
assert(!isIntrinsicOrderCapital("Le", agradezco), "Le is sentence case");

const mexico = "Fui a México ayer";
assert(isIntrinsicOrderCapital("México", mexico), "a place capital off the first slot stays intrinsic");
assert(orderTileLabel("México", { answer: mexico }) === "México", "México stays capitalized in the bank");
assert(orderTileLabel("México", { answer: mexico, placedIndex: 0 }) === "México", "México stays capitalized when placed first");
assert(orderTileLabel("México", { answer: mexico, placedIndex: 2 }) === "México", "México stays capitalized later in the row");
assert(orderTileLabel("Fui", { answer: mexico }) === "fui", "the opening word still lowercases in the bank");
assert(orderTileLabel("hoy", { answer: mexico }) === "hoy", "a lowercase distractor is unchanged");

const usted = "Dijo Ud. que sí";
assert(isIntrinsicOrderCapital("Ud.", usted), "Ud. is capitalized off the first slot");
assert(orderTileLabel("Ud.", { answer: usted }) === "Ud.", "Ud. stays capitalized in the bank");
assert(orderTileLabel("Ud.", { answer: usted, placedIndex: 2 }) === "Ud.", "Ud. stays capitalized in the row");
assert(orderTileLabel("vengo,", { answer: "Ahorita vengo, voy por un café", placedIndex: 0 }) === "Vengo,", "punctuation stays on a capitalized first tile");

const agradezcoQ = { type: "order", answer: agradezco };
assert(gradeListedPhrase("le agradezco de antemano su atención", agradezcoQ).status === "correct", "first-word case does not fail a correct order");
assert(gradeListedPhrase("Le agradezco de antemano su atención", agradezcoQ).status === "correct", "authored capital still passes");
assert(gradeListedPhrase("te agradezco de antemano su atención", agradezcoQ).status === "wrong", "a different first word is still wrong");

console.log("ok: word-order tip locked; listed equivalent accepts before hard fail; bank capital is display-only");
