import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dayKeyFromDate } from "./firstDoor.js";
import { FUNNEL_EVENTS, FUNNEL_STORE_KEY, emitFunnelEvent, rememberFunnelEvent } from "./funnel.js";
import {
  FUNNEL_COUNT_ROWS,
  FUNNEL_HASH,
  funnelDayCounts,
  funnelRowIds,
  isFunnelHash,
  localDayOfEvent,
  readStoredFunnelLog,
} from "./funnelCounts.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const here = dirname(fileURLToPath(import.meta.url));

assert(FUNNEL_STORE_KEY === "andale-funnel-log", "device log key is andale-funnel-log");
assert(FUNNEL_HASH === "#funnel", "hidden route is the #funnel hash");
assert(isFunnelHash("#funnel") && isFunnelHash("#/funnel"), "both hash spellings open the counts");
assert(!isFunnelHash("") && !isFunnelHash("#home"), "other hashes stay on the app");

const evening = new Date(2026, 9, 11, 23, 30, 0);
const morning = new Date(2026, 9, 12, 0, 5, 0);
assert(localDayOfEvent(evening.toISOString()) === dayKeyFromDate(evening), "an event at 11:30pm stays on the local day");
assert(localDayOfEvent(morning.toISOString()) === dayKeyFromDate(morning), "12:05am is the next local day");
assert(localDayOfEvent("not-a-date") === "", "a bad timestamp is skipped");

assert(funnelRowIds({ event: FUNNEL_EVENTS.lecturaStart }).join(",") === "lectura_start", "Lectura start row");
assert(funnelRowIds({ event: FUNNEL_EVENTS.lecturaChapterDone }).join(",") === "lectura_win", "chapter claim is the Lectura win row");
assert(funnelRowIds({ event: FUNNEL_EVENTS.paywallSeen, source: "win", day: 2 }).join(",") === "paywall_win", "win paywall row");
assert(funnelRowIds({ event: FUNNEL_EVENTS.paywallSeen, source: "timed", day: 3 }).join(",") === "paywall_timed", "timed paywall row");
assert(funnelRowIds({ event: FUNNEL_EVENTS.paywallSeen, source: "locked_story", day: 2 }).join(",") === "paywall_locked_story", "later locked story is only the source row");
assert(
  funnelRowIds({ event: FUNNEL_EVENTS.paywallSeen, source: "locked_story", day: 1 }).join(",") === "paywall_locked_story,paywall_locked_story_day1",
  "day 1 locked story is its own row and still counts in the source row",
);
assert(funnelRowIds({ event: FUNNEL_EVENTS.lockedStoryCapped, day: 1 }).join(",") === "locked_story_capped", "capped row");
assert(funnelRowIds({ event: FUNNEL_EVENTS.tapAnnual, source: "win" }).join(",") === "tap_annual", "annual row");
assert(funnelRowIds({ event: FUNNEL_EVENTS.tapMonthly, source: "locked_story" }).join(",") === "tap_monthly", "monthly row");
assert(funnelRowIds({ event: FUNNEL_EVENTS.open }).length === 0, "open is not a count row");
assert(funnelRowIds({ event: FUNNEL_EVENTS.paywallSeen, source: "boot" }).length === 0, "a dropped source is not a row");

const atLocal = (y, m, d, h) => new Date(y, m - 1, d, h, 0, 0).toISOString();
const today = dayKeyFromDate(new Date(2026, 9, 13, 12));
const yesterday = dayKeyFromDate(new Date(2026, 9, 12, 12));
const counts = funnelDayCounts([
  { event: "lectura_start", at: atLocal(2026, 10, 13, 15), storyId: "story-0" },
  { event: "lectura_start", at: atLocal(2026, 10, 13, 16), storyId: "story-0" },
  { event: "lectura_chapter_done", at: atLocal(2026, 10, 13, 16), storyId: "story-0" },
  { event: "paywall_seen", at: atLocal(2026, 10, 13, 16), source: "win", day: 2 },
  { event: "paywall_seen", at: atLocal(2026, 10, 13, 16), source: "locked_story", day: 1 },
  { event: "paywall_seen", at: atLocal(2026, 10, 13, 16), source: "timed", day: 4 },
  { event: "locked_story_capped", at: atLocal(2026, 10, 13, 16), day: 1 },
  { event: "tap_annual", at: atLocal(2026, 10, 13, 16), source: "locked_story" },
  { event: "tap_monthly", at: atLocal(2026, 10, 13, 16), source: "win" },
  { event: "lectura_start", at: atLocal(2026, 10, 12, 18), storyId: "story-1" },
  { event: "open", at: atLocal(2026, 10, 11, 18) },
  { event: "paywall_seen", at: "not-a-date", source: "win", day: 2 },
], today);
assert(counts[0].day === today && counts[0].today === true, "today is first");
assert(counts[0].counts.lectura_start === 2, "today counts both Lectura starts");
assert(counts[0].counts.lectura_win === 1, "today counts the win");
assert(counts[0].counts.paywall_win === 1, "today counts win paywall");
assert(counts[0].counts.paywall_locked_story === 1, "today counts locked story paywall");
assert(counts[0].counts.paywall_locked_story_day1 === 1, "today counts the day-1 locked story row");
assert(counts[0].counts.paywall_timed === 1, "today counts timed paywall");
assert(counts[0].counts.locked_story_capped === 1, "today counts the cap");
assert(counts[0].counts.tap_annual === 1 && counts[0].counts.tap_monthly === 1, "today counts both taps");
assert(counts[1].day === yesterday && counts[1].counts.lectura_start === 1, "yesterday keeps its Lectura start");
assert(counts.length === 2, "a day with only an open event is omitted");
assert(FUNNEL_COUNT_ROWS.every((row) => counts[0].counts[row.id] === 1 || (row.id === "lectura_start" && counts[0].counts[row.id] === 2)), "every requested row is present today");

const empty = funnelDayCounts([], today);
assert(empty.length === 1 && empty[0].day === today && empty[0].counts.lectura_start === 0, "today is shown at zero");

const mem = new Map();
const storage = {
  getItem(key) { return mem.has(key) ? mem.get(key) : null; },
  setItem(key, value) { mem.set(key, String(value)); },
};
const first = { event: "lectura_start", at: atLocal(2026, 10, 13, 15), storyId: "story-0" };
assert(rememberFunnelEvent(first, storage) === true, "a payload is stored");
assert(rememberFunnelEvent({ event: "tap_annual", at: atLocal(2026, 10, 13, 15), source: "win" }, storage) === true, "a second payload appends");
const stored = readStoredFunnelLog(storage);
assert(stored.readable && stored.events.length === 2 && stored.events[1].event === "tap_annual", "the log reads back in order");
assert(!JSON.stringify(stored.events).includes("@"), "the stored log has no address");

storage.setItem(FUNNEL_STORE_KEY, "{");
assert(rememberFunnelEvent(first, storage) === true, "a broken log is replaced by the new event");
assert(readStoredFunnelLog(storage).events.length === 1, "the replacement is one event");
storage.setItem(FUNNEL_STORE_KEY, "\"nope\"");
assert(readStoredFunnelLog(storage).readable === false, "a non-array log is unreadable");
assert(readStoredFunnelLog(null).readable === false, "a missing store is unreadable");

const previous = globalThis.localStorage;
const seen = [];
globalThis.localStorage = {
  getItem() { return seen.length ? JSON.stringify(seen) : null; },
  setItem(_key, value) { seen.splice(0, seen.length, ...JSON.parse(value)); },
};
const emitted = emitFunnelEvent({ event: FUNNEL_EVENTS.lecturaStart, storyId: "story-0", email: "dave@example.com" });
assert(seen.length === 1 && seen[0].event === "lectura_start" && seen[0].storyId === "story-0", "emit writes the allowlisted payload to the device log");
assert(seen[0].email == null && seen[0].at === emitted.at, "the device log keeps the same timestamp and drops the address");
emitFunnelEvent({ event: "not_a_funnel_event" });
assert(seen.length === 1, "an unknown event is not stored");
if (previous === undefined) delete globalThis.localStorage;
else globalThis.localStorage = previous;

const mainSrc = readFileSync(join(here, "main.jsx"), "utf8");
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");
const viewSrc = readFileSync(join(here, "FunnelCounts.jsx"), "utf8");
const funnelSrc = readFileSync(join(here, "funnel.js"), "utf8");
assert(mainSrc.includes("isFunnelHash") && mainSrc.includes("<FunnelCounts />"), "the hash route renders the count view");
assert(!appSrc.includes("FunnelCounts") && !appSrc.includes("#funnel"), "the app does not link the count view");
assert(!/fetch\(|sendBeacon|XMLHttpRequest|gtag|mixpanel|posthog/.test(viewSrc + funnelSrc), "the count view and the funnel stay on this device");
assert(viewSrc.includes("This browser only"), "the view says the log is this browser");
assert(viewSrc.includes(FUNNEL_STORE_KEY) || viewSrc.includes("FUNNEL_STORE_KEY"), "the view names the storage key");

console.log("ok: funnel day counts — device log, local day, and the hidden hash.");
