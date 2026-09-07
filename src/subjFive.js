/** George’s 80/20 Subjuntivo in five. Exact ChatGPT cut. Follow uiLang.
 *  Favorite-teacher voice is already in the copy — no pep chrome.
 */

export const SUBJ_FIVE_LABEL = "80/20";
export const SUBJ_FIVE_HUB = "80/20";

export const SUBJ_FIVE_SUB = {
  es: "Subjuntivo en cinco",
  en: "Subjunctive in five",
};

export const SUBJ_FIVE = {
  es: [
    "Usa el subjuntivo después de un deseo, emoción o duda + que: Quiero que vengas.",
    "Lo que crees que es verdad suele ir en indicativo; lo que dudas o niegas, en subjuntivo: Creo que viene / No creo que venga.",
    "Con cuando o hasta que, usa subjuntivo si todavía no ha pasado: Te llamo cuando llegue.",
    "Si hablas de un hecho o una realidad conocida, usa indicativo: Sé que está aquí.",
    "Prueba mental: ¿Es real/seguro, o deseado/incierto/todavía no? Real → indicativo; lo demás → subjuntivo.",
  ],
  en: [
    "Use the subjunctive after a wish, emotion, or doubt + que: Quiero que vengas.",
    "What you believe is true usually takes the indicative; what you doubt or deny takes the subjunctive: Creo que viene / No creo que venga.",
    "With cuando or hasta que, use the subjunctive when the event hasn’t happened yet: Te llamo cuando llegue.",
    "If you’re talking about a known fact or reality, use the indicative: Sé que está aquí.",
    "Soft test: Is this real/certain, or wished-for/uncertain/not yet? Real → indicative; the other side → subjunctive.",
  ],
};

export function subjFiveSub(uiLang) {
  return uiLang === "en" ? SUBJ_FIVE_SUB.en : SUBJ_FIVE_SUB.es;
}

export function subjFiveLines(uiLang) {
  return uiLang === "en" ? SUBJ_FIVE.en : SUBJ_FIVE.es;
}
