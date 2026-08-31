/** Normalize authored question field aliases. Same rules as App.jsx session build.
 *  tokens→words, source→base, answer→answers, {es,en} pairs.
 *  Shuffle / answerAid stay in App — they are not schema. */
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
