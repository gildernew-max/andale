/**
 * George fills these. null renders nothing — do not invent learner-facing copy here.
 * Beats are keyed by first-session index (0–4), not by the subj1 question index.
 */
export const firstSessionWords = {
  0: { why: { en: `"Es obvio que" states a fact, so the verb stays plain: tiene.`, es: `«Es obvio que» afirma un hecho, así que el verbo va normal: tiene.` } },
  1: { why: { en: `Ojalá is a wish, so the verb changes form: llueva, not llueve.`, es: `«Ojalá» expresa un deseo, así que el verbo cambia: llueva, no llueve.` } },
  2: { why: { en: `"Dudo que" means you aren't sure, so the verb changes form: sea.`, es: `«Dudo que» expresa duda, así que el verbo cambia: sea.` } },
  3: { why: { en: `"Espero que" is a hope, so the verb changes form, and with tú it ends in -as: vengas.`, es: `«Espero que» expresa esperanza, así que el verbo cambia; con tú termina en -as: vengas.` } },
  4: { why: { en: `"Cuando" about something that hasn't happened yet changes the verb: salga, not salgo.`, es: `Con «cuando» y algo que aún no pasa, el verbo cambia: salga, no salgo.` } },
  win: { en: `First session done. You know where to listen now: the word before the verb. Come back tomorrow for the next one.`, es: `Primera sesión lista. Ya sabes dónde escuchar: la palabra antes del verbo. Mañana sigue la siguiente.` },
};

function filled(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function firstSessionWhyLine(beat, lang) {
  const slot = firstSessionWords[beat]?.why;
  if (!slot) return null;
  return filled(lang === "en" ? slot.en : slot.es);
}

export function firstSessionWinLine(lang) {
  const slot = firstSessionWords.win;
  if (!slot) return null;
  return filled(lang === "en" ? slot.en : slot.es);
}
