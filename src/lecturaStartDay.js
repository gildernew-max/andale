/** Lectura start, once per story per local calendar day per device.
 *  localStorage key andale-lectura-start-day is a small map of story id
 *  to that day's YYYY-MM-DD. A write drops days before today.
 *  When the story is already stored for today, nothing is emitted, so the
 *  funnel log and the collector ship both stay quiet.
 *  lectura_chapter_done, paywall events, and taps do not come through here.
 */

import { dayKeyFromDate } from "./firstDoor.js";
import { FUNNEL_EVENTS, emitFunnelEvent } from "./funnel.js";

export const LECTURA_START_DAY_KEY = "andale-lectura-start-day";

const STORY_ID = /^story-[a-z0-9-]{1,32}$/i;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function browserStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    return null;
  }
  return null;
}

function isDay(value) {
  if (typeof value !== "string" || !DAY_KEY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return false;
  return dayKeyFromDate(new Date(y, m - 1, d)) === value;
}

function storyId(value) {
  return typeof value === "string" && STORY_ID.test(value) ? value : "";
}

function safeGet(storage, key) {
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const value = storage.getItem(key);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Valid story-id → local-day pairs. Junk keys and impossible days are dropped. */
function readRecord(storage) {
  const raw = safeGet(storage, LECTURA_START_DAY_KEY);
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out = {};
  for (const [id, day] of Object.entries(parsed)) {
    if (!storyId(id) || !isDay(day)) continue;
    out[id] = day;
  }
  return out;
}

/**
 * Remember this story for today. fire is false when it was already stored
 * for that local day, the id or day is unusable, or the write did not land.
 * Days before today are removed on a successful write.
 */
export function claimLecturaStart(storage, id, today) {
  const story = storyId(id);
  const day = isDay(today) ? today : "";
  if (!story || !day) return { fire: false };
  const current = readRecord(storage);
  const already = current[story] === day;
  const next = {};
  let placed = false;
  for (const [storedId, storedDay] of Object.entries(current)) {
    if (storedDay < day) continue;
    if (storedId === story) {
      next[story] = day;
      placed = true;
      continue;
    }
    next[storedId] = storedDay;
  }
  if (!placed) next[story] = day;
  const serialized = JSON.stringify(next);
  if (already && safeGet(storage, LECTURA_START_DAY_KEY) === serialized) return { fire: false };
  if (!safeSet(storage, LECTURA_START_DAY_KEY, serialized)) return { fire: false };
  return { fire: !already };
}

/** Emit lectura_start only for the first open of this story on this local day. */
export function emitLecturaStartOnce(id, { storage, today, bus } = {}) {
  const store = storage === undefined ? browserStorage() : storage;
  const day = today === undefined ? dayKeyFromDate(new Date()) : today;
  if (!claimLecturaStart(store, id, day).fire) return null;
  const payload = { event: FUNNEL_EVENTS.lecturaStart, storyId: id };
  return bus === undefined ? emitFunnelEvent(payload) : emitFunnelEvent(payload, bus);
}
