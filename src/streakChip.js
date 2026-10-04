/** Win-screen streak chip. George lock: wording and punctuation stay exact. */

/**
 * Chip copy for a win-screen streak. Returns "" when there is no chip (n < 1).
 * Only 1 is singular. The number is always a numeral.
 * EN stays the live "N-day streak" wording. ES is "Racha de 1 día" / "Racha de N días".
 */
export function streakChipLabel(n, lang) {
  const count = Number(n);
  if (!Number.isFinite(count) || count < 1) return "";
  if (count === 1) return lang === "en" ? "1-day streak" : "Racha de 1 día";
  return lang === "en" ? `${count}-day streak` : `Racha de ${count} días`;
}

/**
 * Win-pill scale. True only when this session's streak steps from 0 to 1.
 * Later days, a same-day repeat, and missing values stay false.
 */
export function shouldPopFirstStreak(input) {
  const before = input?.before;
  const after = input?.after;
  return before === 0 && after === 1;
}

/** Light-mode streak count and label. 5.36:1 on white, 4.69:1 on cream #F6EFE4. */
export const STREAK_LABEL_LIGHT = "#A35700";

/** Dark-mode streak count and label. 7.81:1 on the #1E2128 card. */
export const STREAK_LABEL_DARK = "#FE9F17";

/** Flame icon body. Same hex in light and dark; the label ink is separate. */
export const STREAK_FLAME = "#FE9F17";

export function streakLabelColor(theme) {
  return theme === "dark" ? STREAK_LABEL_DARK : STREAK_LABEL_LIGHT;
}
