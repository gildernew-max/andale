/**
 * George fills these. null renders nothing — do not invent learner-facing copy here.
 * Beats are keyed by first-session index (0–4), not by the subj1 question index.
 */
export const firstSessionWords = {
  0: { why: { en: null, es: null } },
  1: { why: { en: null, es: null } },
  2: { why: { en: null, es: null } },
  3: { why: { en: null, es: null } },
  4: { why: { en: null, es: null } },
  win: { en: null, es: null },
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
