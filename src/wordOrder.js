/** Word-order / dual-register phrase grading.
 *  Placement lock (No face): tip card AFTER a miss that is a listed alternate.
 *  Accept / soft-credit that miss. Not splash, not paywall, not a blocking modal.
 *  Tip copy is George + No face locked. Short card — not a lecture. */

export const WORD_ORDER_TIP_ES = "Orden distinto, mismo sentido. En formal, ambas valen.";
export const WORD_ORDER_TIP_EN = "Different order, same meaning. Formally, both work.";

const PUNCT = /[¿?¡!.,;:—–-]/g;

export function stripPhrase(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(PUNCT, " ")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function exactishPhrase(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(PUNCT, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordOrderTip(lang) {
  return lang === "en" ? WORD_ORDER_TIP_EN : WORD_ORDER_TIP_ES;
}

function pushUnique(out, value) {
  if (value == null) return;
  const s = String(value).trim();
  if (!s) return;
  if (out.some((x) => stripPhrase(x) === stripPhrase(s))) return;
  out.push(s);
}

/** Primary first: natural, then formal, then answers[], then answer. */
export function listedAnswers(item = {}) {
  const out = [];
  pushUnique(out, item.natural);
  pushUnique(out, item.formal);
  const extras = Array.isArray(item.answers) ? item.answers : item.answers ? [item.answers] : [];
  extras.forEach((a) => pushUnique(out, a));
  pushUnique(out, item.answer);
  return out;
}

function tokens(s) {
  return stripPhrase(s).split(" ").filter(Boolean);
}

/** Same bag of words, different order. Unlisted permutations are not invented here. */
export function isWordOrderVariant(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length < 2 || ta.length !== tb.length) return false;
  if (ta.join(" ") === tb.join(" ")) return false;
  const sa = [...ta].sort().join("\0");
  const sb = [...tb].sort().join("\0");
  return sa === sb;
}

function isDualRegister(item, match, primary) {
  if (!item?.natural || !item?.formal) return false;
  const hitFormal = stripPhrase(match) === stripPhrase(item.formal);
  const hitNatural = stripPhrase(match) === stripPhrase(item.natural);
  const primaryNatural = stripPhrase(primary) === stripPhrase(item.natural);
  const primaryFormal = stripPhrase(primary) === stripPhrase(item.formal);
  if (hitFormal && primaryNatural) return true;
  if (hitNatural && primaryFormal) return true;
  return false;
}

function matchListed(given, listed) {
  const exact = listed.find((a) => exactishPhrase(a) === exactishPhrase(given));
  if (exact) return { answer: exact, kind: "exact" };
  const loose = listed.find((a) => stripPhrase(a) === stripPhrase(given));
  if (loose) return { answer: loose, kind: "loose" };
  return null;
}

/**
 * Grade a typed/built guess against listed answers only.
 * equivalent + tip when the hit is a listed word-order variant or the other register.
 * wrong = hard fail (nothing listed matched).
 */
export function gradeListedPhrase(given, item = {}) {
  const listed = listedAnswers(item);
  if (!String(given || "").trim()) return { status: "empty", tip: false, listed };
  if (!listed.length) return { status: "wrong", tip: false, listed };
  const hit = matchListed(given, listed);
  if (!hit) return { status: "wrong", tip: false, listed };
  const primary = listed[0];
  const sameAsPrimary = stripPhrase(hit.answer) === stripPhrase(primary);
  const wordOrder = !sameAsPrimary && isWordOrderVariant(primary, hit.answer);
  const dual = isDualRegister(item, hit.answer, primary);
  const tip = wordOrder || dual;
  return {
    status: tip ? "equivalent" : "correct",
    almost: hit.kind === "loose",
    tip,
    match: hit.answer,
    listed,
  };
}
