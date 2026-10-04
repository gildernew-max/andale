/** Display-only streak honesty. Does not write storage or change win math. */

const DAY_MS = 86400000;

function parseDayKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return utc;
}

/** Whole local calendar days from lastDay to today. Null when either key is missing or invalid. */
export function calendarGap(lastDay, today) {
  const from = parseDayKey(lastDay);
  const to = parseDayKey(today);
  if (from == null || to == null) return null;
  return Math.round((to - from) / DAY_MS);
}

/** George lock. n = 1 is the shorter singular sentence. */
export function streakAtRiskLine(count, lang) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 1) return "";
  if (lang === "en") {
    if (n === 1) return "Your 1-day streak ends tonight.";
    return `Your ${n}-day streak ends tonight. Do one lesson to keep it.`;
  }
  if (n === 1) return "Tu racha de 1 día termina hoy.";
  return `Tu racha de ${n} días termina hoy. Haz una lección para mantenerla.`;
}

export function streakGoneLine(lang) {
  return lang === "en"
    ? "Your streak is back to 0. Today starts a new one."
    : "Tu racha volvió a 0. Hoy empieza una nueva.";
}

function storedStreak(prog) {
  const n = Number(prog?.streak);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.floor(n);
}

/**
 * What the flame and the Learn note should show.
 * repairModal: the existing 2-day repair/freeze modal is on screen.
 * A same-day win, yesterday (at risk), a 2-day gap while that modal is up,
 * and a longer gap with the modal down are display states only.
 */
export function streakDisplay({ prog, today, repairModal = false, lang = "es" } = {}) {
  const streak = storedStreak(prog);
  const ui = lang === "en" ? "en" : "es";
  const gap = calendarGap(prog?.lastDay, today);

  if (repairModal) {
    return { displayStreak: streak, status: "modal", line: "" };
  }
  if (streak < 1 || gap == null) {
    return { displayStreak: streak, status: "none", line: "" };
  }
  if (gap <= 0) {
    return { displayStreak: streak, status: "same", line: "" };
  }
  if (gap === 1) {
    return { displayStreak: streak, status: "at-risk", line: streakAtRiskLine(streak, ui) };
  }
  return { displayStreak: 0, status: "gone", line: streakGoneLine(ui) };
}
