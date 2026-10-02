/** Onboarding screen copy. EN and Mexican Spanish. Placeholder lines for the writer to replace. */

export const onboardingCopy = {
  levelTitle: { en: "Your Spanish", es: "Tu español" },
  levels: {
    beginner: {
      name: { en: "Beginner", es: "Principiante" },
      desc: { en: "Starting from zero", es: "Empiezo desde cero" },
    },
    some: {
      name: { en: "Some Spanish", es: "Algo de español" },
      desc: { en: "I know some already", es: "Ya sé un poco" },
    },
    conversation: {
      name: { en: "Can hold a conversation", es: "Puedo conversar" },
      desc: { en: "I can keep one going", es: "Sostengo una conversación" },
    },
  },
  goalTitle: { en: "Lessons a day", es: "Lecciones al día" },
  goals: {
    1: { en: "1 lesson a day", es: "1 lección al día" },
    2: { en: "2 lessons a day", es: "2 lecciones al día" },
    3: { en: "3 lessons a day", es: "3 lecciones al día" },
  },
  planTitle: { en: "Your plan", es: "Tu plan" },
  planLevel: { en: "Level", es: "Nivel" },
  planGoal: { en: "Each day", es: "Al día" },
  planStart: { en: "Start the first lesson", es: "Empezar la primera lección" },
};

export function onboardingLine(slot, lang) {
  if (!slot || typeof slot !== "object") return "";
  const text = lang === "en" ? slot.en : slot.es;
  return typeof text === "string" ? text : "";
}
