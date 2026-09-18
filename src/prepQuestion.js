/** Normalize authored question field aliases. Same rules as App.jsx session build.
 *  tokens→words, source→base, answer→answers, {es,en} pairs.
 *  Shuffle / answerAid stay in App — they are not schema. */

/** Spanish the Listen control should play. Hoy scene MC carries `text`/`line` (the line), not the Why prompt. */
export function lessonListenText(q) {
  if (!q || typeof q !== "object") return "";
  if (q.type === "listen") return String(q.text || "").trim();
  if (q.type === "transform") return String(q.base || q.text || "").trim();
  if (q.type === "order") return String(q.answer || q.text || "").trim();
  return String(q.text || q.line || q.prompt || "").trim();
}

export function prepQuestion(q) {
  const p = { ...q };
  if (p.answer && !p.answers && (p.type === "type" || p.type === "listen" || p.type === "transform")) p.answers = [p.answer];
  if (p.answers && !Array.isArray(p.answers)) p.answers = [p.answers];
  if (p.note && !p.explain) p.explain = p.note;
  if (p.type === "listen" && !p.text) p.text = p.answer || p.answers?.[0] || p.prompt;
  if (p.type === "transform") {
    if (!p.base && p.source) p.base = p.source;
    if (!p.instruction) p.instruction = p.prompt;
  }
  if (p.type === "order" && !p.words && p.tokens) p.words = p.tokens;
  if (p.type === "match" && p.pairs?.[0] && !Array.isArray(p.pairs[0])) p.pairs = p.pairs.map((pr) => [pr.es, pr.en]);
  return p;
}
