/** First-open promise. Time claim is not cleared.
 *  null → "starts here" / "empieza aquí".
 *  A number interpolates the timed second sentence. Singular only when N is 1.
 */
export const FIRST_WIN_MINUTES = null;

const LEAD = {
  en: "Real Mexican Spanish.",
  es: "Español mexicano real.",
};

function secondSentence(es, minutes) {
  const timed = typeof minutes === "number" && Number.isFinite(minutes);
  if (!timed) return es ? "Tu primer logro empieza aquí." : "Your first win starts here.";
  if (es) {
    const unit = minutes === 1 ? "minuto" : "minutos";
    return `Tu primer logro toma ${minutes} ${unit}.`;
  }
  const unit = minutes === 1 ? "minute" : "minutes";
  return `Your first win takes ${minutes} ${unit}.`;
}

/** Two sentences. The screen paints each as its own block; the joined line keeps one space. */
export function splashPromiseSentences(lang, minutes = FIRST_WIN_MINUTES) {
  const es = lang !== "en";
  return [es ? LEAD.es : LEAD.en, secondSentence(es, minutes)];
}

export function splashPromiseLine(lang, minutes = FIRST_WIN_MINUTES) {
  const [lead, second] = splashPromiseSentences(lang, minutes);
  return `${lead} ${second}`;
}
