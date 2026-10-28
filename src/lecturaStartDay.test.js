import { shipFunnelEvent } from "./collector.js";
import { FUNNEL_EVENTS, FUNNEL_LOG, FUNNEL_STORE_KEY, emitFunnelEvent } from "./funnel.js";
import { LECTURA_START_DAY_KEY, emitLecturaStartOnce } from "./lecturaStartDay.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

function memoryStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
  };
}

function logged(storage, name) {
  const raw = storage.getItem(FUNNEL_STORE_KEY);
  const list = raw ? JSON.parse(raw) : [];
  return list.filter((row) => row.event === name);
}

function shippedNamed(shipped, name) {
  return shipped.filter((row) => row.event === name);
}

async function withDevice(run) {
  const storage = memoryStorage();
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage;
  const shipped = [];
  const pending = [];
  const bus = {
    log: null,
    events: [],
    dispatchEvent(ev) {
      this.events.push(ev);
      pending.push(shipFunnelEvent(ev.detail, {
        endpoint: "https://collector.example/exec",
        storage,
        random: () => "device-lectura-1",
        beaconImpl: (_url, body) => {
          shipped.push(JSON.parse(body));
          return true;
        },
        fetchImpl: async () => { throw new Error("fetch should not run"); },
      }));
      return true;
    },
  };
  Object.defineProperty(bus, FUNNEL_LOG, {
    get() { return this.log; },
    set(value) { this.log = value; },
    configurable: true,
  });
  const open = (storyId, today) => emitLecturaStartOnce(storyId, { storage, today, bus });
  try {
    await run({ storage, bus, shipped, open });
    await Promise.all(pending);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
}

await withDevice(async ({ storage, bus, shipped, open }) => {
  assert(open("story-0", "2026-10-14")?.event === "lectura_start", "the first open of a story emits Lectura start");
  assert(open("story-0", "2026-10-14") == null, "a same-day reopen does not emit");
  assert(logged(storage, "lectura_start").length === 1, "a same-day reopen writes one Lectura start to the device log");
  assert(logged(storage, "lectura_start")[0].storyId === "story-0", "the stored start keeps the story id");
  assert(shippedNamed(shipped, "lectura_start").length === 0, "Lectura start stays on the device");
  assert(JSON.parse(storage.getItem(LECTURA_START_DAY_KEY))["story-0"] === "2026-10-14", "the day record keeps story-0 for today");

  emitFunnelEvent({ event: FUNNEL_EVENTS.lecturaChapterDone, storyId: "story-0" }, bus);
  emitFunnelEvent({ event: FUNNEL_EVENTS.lecturaChapterDone, storyId: "story-0" }, bus);
  emitFunnelEvent({ event: FUNNEL_EVENTS.paywallSeen, source: "win", day: 2 }, bus);
  emitFunnelEvent({ event: FUNNEL_EVENTS.paywallSeen, source: "locked_story", day: 1 }, bus);
  emitFunnelEvent({ event: FUNNEL_EVENTS.paywallTap, choice: "annual" }, bus);
  emitFunnelEvent({ event: FUNNEL_EVENTS.paywallTap, choice: "continue_free" }, bus);
  emitFunnelEvent({ event: FUNNEL_EVENTS.tapAnnual, source: "win" }, bus);
  emitFunnelEvent({ event: FUNNEL_EVENTS.tapMonthly, source: "timed" }, bus);
  assert(logged(storage, "lectura_start").length === 1, "other events do not add a Lectura start");
  assert(logged(storage, "lectura_chapter_done").length === 2, "Lectura win still logs every claim");
  assert(logged(storage, "paywall_seen").length === 2, "paywall seen still logs every open");
  assert(logged(storage, "paywall_tap").length === 2, "paywall taps still log every tap");
  assert(logged(storage, "tap_annual").length === 1 && logged(storage, "tap_monthly").length === 1, "annual and monthly taps still log");
  assert(shippedNamed(shipped, "lectura_chapter_done").length === 0, "Lectura win stays on the device");
  assert(shippedNamed(shipped, "paywall_seen").length === 2, "paywall seen still ships every open");
  assert(shippedNamed(shipped, "paywall_tap").length === 0, "paywall taps stay on the device");
  assert(shippedNamed(shipped, "tap_annual").length === 0 && shippedNamed(shipped, "tap_monthly").length === 0, "annual and monthly taps stay on the device");
});

await withDevice(async ({ storage, shipped, open }) => {
  open("story-0", "2026-10-14");
  open("story-1", "2026-10-14");
  assert(logged(storage, "lectura_start").length === 2, "a different story on the same day writes a second Lectura start");
  assert(logged(storage, "lectura_start").map((row) => row.storyId).join(",") === "story-0,story-1", "the two starts keep their own story ids");
  assert(shippedNamed(shipped, "lectura_start").length === 0, "a second Lectura start stays on the device");
  const record = JSON.parse(storage.getItem(LECTURA_START_DAY_KEY));
  assert(record["story-0"] === "2026-10-14" && record["story-1"] === "2026-10-14", "both stories are stored for today");
});

await withDevice(async ({ storage, shipped, open }) => {
  open("story-0", "2026-10-14");
  storage.setItem(LECTURA_START_DAY_KEY, JSON.stringify({
    "story-0": "2026-10-14",
    "story-9": "2026-10-01",
    email: "ada@example.com",
  }));
  assert(open("story-0", "2026-10-15")?.storyId === "story-0", "the same story on the next local day emits again");
  assert(logged(storage, "lectura_start").length === 2, "the next local day writes another Lectura start");
  assert(shippedNamed(shipped, "lectura_start").length === 0, "the next-day Lectura start stays on the device");
  const record = JSON.parse(storage.getItem(LECTURA_START_DAY_KEY));
  assert(record["story-0"] === "2026-10-15", "the day record moves story-0 to the new day");
  assert(record["story-9"] == null, "an older day is pruned");
  assert(!JSON.stringify(record).includes("2026-10-14"), "the previous day is not kept");
  assert(!JSON.stringify(record).includes("ada@example.com"), "the day record drops an address");
  assert(open("story-0", "2026-10-15") == null, "the new day still counts the story only once");
  assert(logged(storage, "lectura_start").length === 2 && shippedNamed(shipped, "lectura_start").length === 0, "a reopen on the new day does not log or ship again");
});

const blocked = memoryStorage();
const previous = globalThis.localStorage;
globalThis.localStorage = blocked;
const thrown = {
  getItem() { return null; },
  setItem() { throw new Error("quota"); },
};
assert(emitLecturaStartOnce("story-0", { storage: thrown, today: "2026-10-14", bus: { dispatchEvent() { throw new Error("should not ship"); } } }) == null, "a failed day-record write does not emit");
assert(logged(blocked, "lectura_start").length === 0, "a failed day-record write does not touch the device log");
if (previous === undefined) delete globalThis.localStorage;
else globalThis.localStorage = previous;

console.log("lecturaStartDay.test.js: ok");
