/** Onboarding screen copy. EN and Mexican Spanish. */

export const onboardingCopy = {
  levelTitle: { en: "Where are you with Spanish?", es: "¿En qué punto estás con el español?" },
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
  goalTitle: { en: "How many lessons a day?", es: "¿Cuántas lecciones al día?" },
  goals: {
    1: { en: "1 lesson a day", es: "1 lección al día" },
    2: { en: "2 lessons a day", es: "2 lecciones al día" },
    3: { en: "3 lessons a day", es: "3 lecciones al día" },
  },
  planTitle: { en: "Your plan", es: "Tu plan" },
  planLevel: { en: "Your level", es: "Tu nivel" },
  planGoal: { en: "Your goal", es: "Tu meta" },
  planStart: { en: "Start my first lesson", es: "Empezar mi primera lección" },
};

export function onboardingLine(slot, lang) {
  if (!slot || typeof slot !== "object") return "";
  const text = lang === "en" ? slot.en : slot.es;
  return typeof text === "string" ? text : "";
}
