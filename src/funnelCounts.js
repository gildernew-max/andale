/** Daily counts from the on-device funnel log. No network. */

import { dayKeyFromDate } from "./firstDoor.js";
import { FUNNEL_EVENTS, FUNNEL_STORE_KEY, PAYWALL_SEEN_SOURCE } from "./funnel.js";

export const FUNNEL_HASH = "#funnel";

export const FUNNEL_COUNT_ROWS = Object.freeze([
  { id: "lectura_start", label: "Lectura start" },
  { id: "lectura_win", label: "Lectura win" },
  { id: "paywall_win", label: "Paywall seen · win" },
  { id: "paywall_locked_story", label: "Paywall seen · locked story" },
  { id: "paywall_timed", label: "Paywall seen · timed" },
  { id: "paywall_locked_story_day1", label: "Paywall seen · locked story · day 1" },
  { id: "locked_story_capped", label: "Locked story capped" },
  { id: "tap_annual", label: "Tap annual" },
  { id: "tap_monthly", label: "Tap monthly" },
]);

const ROW_IDS = new Set(FUNNEL_COUNT_ROWS.map((row) => row.id));

export function isFunnelHash(hash) {
  return hash === FUNNEL_HASH || hash === "#/funnel";
}

export function localDayOfEvent(at) {
  if (typeof at !== "string" || !at.trim()) return "";
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  return dayKeyFromDate(date);
}

function emptyCounts() {
  const counts = {};
  for (const row of FUNNEL_COUNT_ROWS) counts[row.id] = 0;
  return counts;
}

/** One event can fill two rows: locked_story day 1 is also a locked_story seen. */
export function funnelRowIds(event) {
  if (!event || typeof event !== "object") return [];
  if (event.event === FUNNEL_EVENTS.lecturaStart) return ["lectura_start"];
  if (event.event === FUNNEL_EVENTS.lecturaChapterDone) return ["lectura_win"];
  if (event.event === FUNNEL_EVENTS.lockedStoryCapped) return ["locked_story_capped"];
  if (event.event === FUNNEL_EVENTS.tapAnnual) return ["tap_annual"];
  if (event.event === FUNNEL_EVENTS.tapMonthly) return ["tap_monthly"];
  if (event.event !== FUNNEL_EVENTS.paywallSeen) return [];
  if (event.source === PAYWALL_SEEN_SOURCE.win) return ["paywall_win"];
  if (event.source === PAYWALL_SEEN_SOURCE.timed) return ["paywall_timed"];
  if (event.source === PAYWALL_SEEN_SOURCE.lockedStory) {
    return event.day === 1
      ? ["paywall_locked_story", "paywall_locked_story_day1"]
      : ["paywall_locked_story"];
  }
  return [];
}

function hasAny(counts) {
  return FUNNEL_COUNT_ROWS.some((row) => counts[row.id] > 0);
}

/**
 * Today is always first, even at zero. Earlier local days follow, newest first,
 * and only when that day has one of these rows.
 */
export function funnelDayCounts(events, today) {
  const dayKey = typeof today === "string" && today ? today : dayKeyFromDate(new Date());
  const days = new Map();
  const ensure = (day) => {
    if (!days.has(day)) days.set(day, emptyCounts());
    return days.get(day);
  };
  ensure(dayKey);
  for (const event of Array.isArray(events) ? events : []) {
    const day = localDayOfEvent(event && event.at);
    if (!day) continue;
    const ids = funnelRowIds(event).filter((id) => ROW_IDS.has(id));
    if (!ids.length) continue;
    const bucket = ensure(day);
    for (const id of ids) bucket[id] += 1;
  }
  const past = [...days.keys()]
    .filter((day) => day !== dayKey && hasAny(days.get(day)))
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  return [
    { day: dayKey, today: true, counts: days.get(dayKey) },
    ...past.map((day) => ({ day, today: false, counts: days.get(day) })),
  ];
}

export function readStoredFunnelLog(storage) {
  try {
    if (!storage || typeof storage.getItem !== "function") return { events: [], readable: false };
    const raw = storage.getItem(FUNNEL_STORE_KEY);
    if (raw == null || raw === "") return { events: [], readable: true };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { events: [], readable: false };
    const events = parsed.filter((row) => row && typeof row === "object" && typeof row.event === "string" && typeof row.at === "string");
    return { events, readable: true };
  } catch {
    return { events: [], readable: false };
  }
}
