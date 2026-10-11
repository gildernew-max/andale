/** Onboarding screen copy. EN and Mexican Spanish.
 *  Level title, promise, and level cards are the live lines. The rest is
 *  the locked sheet (Hand 2026-10-11). Choice-screen CTA reuses the
 *  lesson Continue word; the sheet named the plan button only.
 */

export const onboardingCopy = {
  levelTitle: { en: "Where are you with Spanish?", es: "¿En qué punto estás con el español?" },
  /** George + No face. Level screen only, under the title. */
  levelPromise: {
    en: "Mexican Spanish past the basics — for people who already know some.",
    es: "Español mexicano más allá de lo básico — para quien ya sabe algo.",
  },
  levels: {
    beginner: {
      name: { en: "Starting from zero", es: "Empiezo de cero" },
      desc: { en: "Spanish is new to me.", es: "El español es nuevo para mí." },
    },
    some: {
      name: { en: "I know some", es: "Sé algo" },
      desc: { en: "I know some words and phrases.", es: "Conozco algunas palabras y frases." },
    },
    conversation: {
      name: { en: "I can hold a conversation", es: "Puedo conversar" },
      desc: { en: "I want to get the details right.", es: "Quiero afinar los detalles." },
    },
  },
  whyTitle: { en: "Why are you learning Spanish?", es: "¿Para qué aprendes español?" },
  whys: {
    travel: { en: "Travel in Mexico", es: "Viajar por México" },
    family: { en: "Talk with family or friends", es: "Hablar con familia o amigos" },
    live: { en: "Live or retire in Mexico", es: "Vivir o retirarme en México" },
    work: { en: "Work", es: "Trabajo" },
    me: { en: "Just for me", es: "Por gusto" },
  },
  goalTitle: { en: "How much time a day?", es: "¿Cuánto tiempo al día?" },
  /** Adjective only. The chip prefix is the shared "5 min" form. */
  goals: {
    5: { en: "Easy", es: "Tranquilo" },
    10: { en: "Steady", es: "Constante" },
    15: { en: "Serious", es: "En serio" },
    20: { en: "All in", es: "A fondo" },
  },
  planTitle: { en: "Your plan", es: "Tu plan" },
  /** {n} is the chosen minute budget. */
  planBody: {
    en: "{n} minutes a day: one short lesson, then a story in Lectura.",
    es: "{n} minutos al día: una lección corta y luego un cuento en Lectura.",
  },
  planStart: { en: "Start my first lesson", es: "Empezar mi primera lección" },
  /** Choice screens. Same word as the lesson Continue button. */
  ctaContinue: { en: "Continue", es: "Continuar" },
};

export function onboardingLine(slot, lang) {
  if (!slot || typeof slot !== "object") return "";
  const text = lang === "en" ? slot.en : slot.es;
  return typeof text === "string" ? text : "";
}

/** Plan sentence with the chosen minute count in place of {n}. */
export function onboardingPlanLine(lang, minutes) {
  return onboardingLine(onboardingCopy.planBody, lang).replaceAll("{n}", String(minutes ?? ""));
}
