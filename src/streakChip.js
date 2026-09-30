/** Win-screen streak chip. George lock: wording and punctuation stay exact. */

/**
 * Chip copy for a win-screen streak. Returns "" when there is no chip (n < 1).
 * Only 1 is singular. The number is always a numeral.
 */
export function streakChipLabel(n, lang) {
  const count = Number(n);
  if (!Number.isFinite(count) || count < 1) return "";
  if (count === 1) return lang === "en" ? "1-day streak" : "Racha de 1 día";
  return lang === "en" ? `${count}-day streak` : `Racha de ${count} días`;
}
