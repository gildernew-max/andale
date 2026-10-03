/**
 * Closing hook for every Lectura chapter.
 * Shown only on the cliffhanger beat — not part of the story text.
 * Each chapter has an ES line and an EN line. Missing EN falls back to ES.
 */
export const lecturaCliffhangers = {
  "story-0": {
    es: "Hay casas que no olvidan. ¿Conoces una que todavía espere a su dueña?",
    en: "Some houses don\u2019t forget. Do you know one that\u2019s still waiting for its owner?",
  },
  "story-1": {
    es: "Ella pintó el mundo desde una cama. ¿Y si alguien viajara lejos solo para no moverse?",
    en: "She painted the world from a bed. What if someone traveled far just to avoid moving?",
  },
  "story-2": {
    es: "No creas que solo la tierra esconda algo. ¿Qué habrá debajo de una máscara?",
    en: "Don\u2019t assume only the earth hides something. What might be under a mask?",
  },
  "story-3": {
    es: "Cada generación elige su camino. ¿O hay caminos que te eligen a ti?",
    en: "Every generation picks its own road. Or are there roads that pick you?",
  },
  "story-4": {
    es: "Para Doña Lupe, yo era de la casa. ¿Y los que viven entre dos casas?",
    en: "To Doña Lupe, I was part of the household. What about people who live between two homes?",
  },
  "story-5": {
    es: "Llevo doce años buscando la verdad. ¿Y si una historia no se pudiera comprobar?",
    en: "I\u2019ve spent twelve years looking for the truth. What if a story could never be proven?",
  },
  "story-6": {
    es: "Hay cosas que se cuidan toda la vida. ¿Una historia, un anillo\u2026 o una mesa?",
    en: "Some things you look after for a lifetime. A story, a ring\u2026 or a table?",
  },
  "story-7": {
    es: "Ellos honran a su amigo en silencio. ¿Y si alguien lo hiciera gritando?",
    en: "They honor their friend in silence. What if someone did it out loud?",
  },
  "story-8": {
    es: "Levanta la copa. Y mañana, cuando tomes café, pregúntate quién lo cosechó.",
    en: "Raise your glass. And tomorrow, over coffee, ask who harvested it.",
  },
  "story-9": {
    es: "Siempre hay otra montaña, más alta. ¿Hasta dónde quieres subir?",
    en: "There\u2019s always another, higher mountain. How far do you want to climb?",
  },
};

export function lecturaCliffhangerLine(storyId, uiLang) {
  const entry = lecturaCliffhangers[storyId];
  if (!entry || typeof entry !== "object") return "";
  if (uiLang === "en" && typeof entry.en === "string" && entry.en.trim()) return entry.en;
  return typeof entry.es === "string" ? entry.es : "";
}
