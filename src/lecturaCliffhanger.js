/**
 * Closing hook for every Lectura chapter.
 * Shown only on the cliffhanger beat — not part of the story text.
 */
export const lecturaCliffhangers = {
  "story-0": "Hay casas que no olvidan. ¿Conoces una que todavía espere a su dueña?",
  "story-1": "Ella pintó el mundo desde una cama. ¿Y si alguien viajara lejos solo para no moverse?",
  "story-2": "No crea que solo la tierra esconda algo. ¿Qué habrá debajo de una máscara?",
  "story-3": "Cada generación elige su camino. ¿O hay caminos que te eligen a ti?",
  "story-4": "Para Doña Lupe, yo era de la casa. ¿Y los que viven entre dos casas?",
  "story-5": "Llevo doce años buscando la verdad. ¿Y si una historia no se pudiera comprobar?",
  "story-6": "Hay cosas que se cuidan toda la vida. ¿Una historia, un anillo\u2026 o una mesa?",
  "story-7": "Ellos honran a su amigo en silencio. ¿Y si alguien lo hiciera gritando?",
  "story-8": "Levanten la copa. Y mañana, cuando tomen café, pregúntense quién lo cosechó.",
  "story-9": "Siempre hay otra montaña, más alta. ¿Hasta dónde quiere subir usted?",
};

export function lecturaCliffhangerLine(storyId) {
  const line = lecturaCliffhangers[storyId];
  return typeof line === "string" ? line : "";
}
