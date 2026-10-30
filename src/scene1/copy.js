/** Scene 1 copy constants — No face (brand/paywall) + George (compare/mic).
 *  /workspace/andale-redesign/noface-scene1-copy.md
 *  /workspace/andale-redesign/compare-spec-and-scene2.md
 *  ES/EN pairs only. Price and card chrome stay in webPaywall.js / reserveAnnual.js. */

export const SCENE1_COLD_OPEN = Object.freeze({
  es: "Habla español mexicano de verdad en San Miguel. Desde esta semana.",
  en: "Speak real Mexican Spanish in San Miguel. Starting this week.",
  buttonEs: "Tu primera escena",
  buttonEn: "Your first scene",
});

export const SCENE1_INTRO_LINE = Object.freeze({
  es: "Hoy: el mercado.",
  en: "Today: the market.",
});

export const SCENE1_COMPARE_PROMPT = Object.freeze({
  es: "Escucha las dos. ¿Suena igual?",
  en: "Listen to both. Same?",
  sameEs: "Suena igual",
  sameEn: "Sounds the same",
  retryEs: "Lo repito",
  retryEn: "Say it again",
});

export const SCENE1_MOVE_ON_LINE = Object.freeze({
  es: "Sigue. Mañana vuelve.",
  en: "Keep going. It comes back tomorrow.",
});

/** After two «Lo repito» taps on one chunk, the loop moves on. */
export const SCENE1_MAX_RETRIES = 2;

export const SCENE1_MIC_REASON = Object.freeze({
  es: "Ándale usa el micrófono para grabar tu voz. Tus grabaciones se quedan en este teléfono.",
  en: "Ándale uses the microphone to record your voice. Your recordings stay on this phone.",
});

/** George: shown when getUserMedia rejects (denied permission, no device, etc). */
export const SCENE1_MIC_ERROR = Object.freeze({
  es: "No pudimos usar el micrófono. Revisa el permiso en Ajustes.",
  en: "We couldn't use the microphone. Check the permission in Settings.",
});

/** Paywall A: right after the first spoken exchange. */
export const SCENE1_PAYWALL_A = Object.freeze({
  headlineEs: "Acabas de pedir en español.",
  headlineEn: "You just ordered in Spanish.",
  subheadEs: "Cada escena de San Miguel, sin esperar.",
  subheadEn: "Every San Miguel scene, no waiting.",
});

/** Paywall B: day-3 variant. Same card, price line, and quiet link as Paywall A. */
export const SCENE1_PAYWALL_B = Object.freeze({
  headlineEs: "Tres días hablando. Sigue.",
  headlineEn: "Three days speaking. Keep going.",
  subheadEs: "Escucha tu primer día y el de hoy. Ahí se nota.",
  subheadEn: "Hear day one next to today. That's how you know.",
});
