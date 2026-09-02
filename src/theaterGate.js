/** Any earned activity — not a brand-new empty session. */
export function hasLearnerProgress(prog) {
  if (!prog || typeof prog !== "object") return false;
  if ((Number(prog.xp) || 0) > 0) return true;
  if ((Number(prog.streak) || 0) > 0) return true;
  if (Object.values(prog.done || {}).some((n) => Number(n) > 0)) return true;
  if (Object.values(prog.stories || {}).some(Boolean)) return true;
  if (Object.keys(prog.srs || {}).length > 0) return true;
  if (Object.keys(prog.flashcards || {}).length > 0) return true;
  if (Object.values(prog.missions || {}).some((v) => v === true || (typeof v === "number" && v > 0))) return true;
  return false;
}

export function hasWeaknessData(prog) {
  return Object.entries(prog?.weak || {}).some(([, n]) => Number(n) > 0);
}

/** Lesson keys 1–4. Unlock after the first real unit crown. */
export function hasUnlockedShortcuts(prog) {
  return Object.values(prog?.done || {}).some((n) => Number(n) > 0);
}
