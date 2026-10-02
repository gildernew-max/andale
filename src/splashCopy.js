/** First-open promise. Time claim is not cleared.
 *  null → "starts here" / "empieza aquí".
 *  A number interpolates the timed second sentence. Singular only when N is 1.
 */
export const FIRST_WIN_MINUTES = null;

const LEAD = {
  en: "Real Mexican Spanish.",
  es: "Español mexicano real.",
};

export function splashPromiseLine(lang, minutes = FIRST_WIN_MINUTES) {
  const es = lang !== "en";
  const lead = es ? LEAD.es : LEAD.en;
  const timed = typeof minutes === "number" && Number.isFinite(minutes);
  if (!timed) {
    return es ? `${lead} Tu primer logro empieza aquí.` : `${lead} Your first win starts here.`;
  }
  if (es) {
    const unit = minutes === 1 ? "minuto" : "minutos";
    return `${lead} Tu primer logro toma ${minutes} ${unit}.`;
  }
  const unit = minutes === 1 ? "minute" : "minutes";
  return `${lead} Your first win takes ${minutes} ${unit}.`;
}
