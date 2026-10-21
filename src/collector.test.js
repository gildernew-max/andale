import { dayKeyFromDate } from "./firstDoor.js";
import { COLLECTOR_DEVICE_KEY, COLLECTOR_ENDPOINT, COLLECTOR_EVENTS, collectorEndpoint, setCollectorEndpointOverride, shipFunnelEvent } from "./collector.js";
import { FUNNEL_EVENTS } from "./funnel.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const THREE = "date,device,event";
/** paywall_seen adds exactly trigger and day (Hand, Oct 21). */
const PAYWALL_FIVE = "date,day,device,event,trigger";
const endpoint = "https://script.google.com/macros/s/collector/exec";

// Switched off: no build endpoint.
assert(COLLECTOR_ENDPOINT === "", "collector stays off until a build endpoint is set");
assert(collectorEndpoint() === "", "shared helper is empty when both build endpoints are empty");
assert(collectorEndpoint({ VITE_COLLECTOR_ENDPOINT: "  ", VITE_FIRST_WIN_EMAIL_ENDPOINT: "  " }) === "", "blank endpoints stay off");
assert(collectorEndpoint({ VITE_COLLECTOR_ENDPOINT: " https://collector.example/exec " }) === "https://collector.example/exec", "VITE_COLLECTOR_ENDPOINT turns the helper on");
assert(collectorEndpoint({ VITE_FIRST_WIN_EMAIL_ENDPOINT: "https://email.example/exec" }) === "https://email.example/exec", "VITE_FIRST_WIN_EMAIL_ENDPOINT turns the helper on");
setCollectorEndpointOverride("https://override.example/exec");
assert(collectorEndpoint() === "https://override.example/exec", "a test endpoint overrides the empty build env");
setCollectorEndpointOverride(undefined);
assert(collectorEndpoint() === "", "clearing the test endpoint reads the empty build env again");

assert(COLLECTOR_EVENTS.slice().sort().join(",") === "paywall_seen,reserve_submit", "only two events are on the send list");

function memoryStorage() {
  const data = {};
  return {
    data,
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
  };
}

const noisy = {
  at: "2026-10-13T15:04:00.000Z",
  email: "ada@example.com",
  source: "locked_story",
  day: 2,
  plan: "annual",
  price: 39.99,
  storyId: "story-0",
  name: "Dave",
  lang: "en",
  ip: "203.0.113.8",
  userAgent: "Mozilla/5.0",
  deviceId: "should-not-replace",
  device_id: "should-not-replace",
  streak: 3,
  xp: 10,
};
const allEvents = Object.values(FUNNEL_EVENTS);

// Nothing sends with no endpoint, for any event.
let calls = 0;
for (const ep of [undefined, "", "   "]) {
  const store = memoryStorage();
  for (const name of allEvents) {
    const r = await shipFunnelEvent({ ...noisy, event: name }, {
      ...(ep === undefined ? {} : { endpoint: ep }),
      storage: store,
      random: () => "device-x",
      beaconImpl: () => { calls += 1; return true; },
      fetchImpl: async () => { calls += 1; return { ok: true }; },
    });
    assert(r.sent === false, `no endpoint (${JSON.stringify(ep)}) does not send ${name}`);
  }
  assert(store.data[COLLECTOR_DEVICE_KEY] == null, "no endpoint mints no device id");
}
setCollectorEndpointOverride("");
const forcedStore = memoryStorage();
for (const name of COLLECTOR_EVENTS) {
  const r = await shipFunnelEvent({ ...noisy, event: name }, {
    storage: forcedStore,
    beaconImpl: () => { calls += 1; return true; },
    fetchImpl: async () => { calls += 1; return { ok: true }; },
  });
  assert(r.sent === false, `a blank override does not send ${name}`);
}
setCollectorEndpointOverride(undefined);
assert(calls === 0, "no endpoint calls neither sendBeacon nor fetch");

// With an endpoint, only paywall_seen and reserve_submit leave the device.
const storage = memoryStorage();
const sent = [];
for (const name of allEvents.concat(["not_a_funnel_event", "email", ""])) {
  const r = await shipFunnelEvent({ ...noisy, event: name }, {
    endpoint,
    storage,
    random: () => "device-anonymous-1",
    beaconImpl: (url, body) => { sent.push({ url, body }); return true; },
    fetchImpl: async () => { throw new Error("fetch should not run"); },
  });
  const shouldSend = name === FUNNEL_EVENTS.paywallSeen || name === FUNNEL_EVENTS.reserveSubmit;
  assert(r.sent === shouldSend, `${name || "(blank)"} ${shouldSend ? "sends" : "stays on the device"}`);
}
assert(sent.length === 2, "exactly two rows left the device");
assert(sent.map((row) => JSON.parse(row.body).event).sort().join(",") === "paywall_seen,reserve_submit", "the two rows are paywall_seen and reserve_submit");
assert(storage.data[COLLECTOR_DEVICE_KEY] === "device-anonymous-1", "device id is stored under andale-device-id");

const expectedDate = dayKeyFromDate(new Date(noisy.at));
for (const row of sent) {
  assert(row.url === endpoint, "rows hit the collector URL");
  const body = JSON.parse(row.body);
  const seen = body.event === FUNNEL_EVENTS.paywallSeen;
  assert(Object.keys(body).sort().join(",") === (seen ? PAYWALL_FIVE : THREE), seen ? "paywall_seen keys are exactly event, date, device, trigger, day" : "reserve_submit keys are exactly event, date, device");
  if (seen) assert(body.trigger === "locked_story" && body.day === 2, "paywall_seen carries the trigger kind and the day of use");
  assert(body.device === "device-anonymous-1", "device is the random id");
  assert(body.date === expectedDate && /^\d{4}-\d{2}-\d{2}$/.test(body.date), "date is the local YYYY-MM-DD day");
  assert(!row.body.includes("@") && !row.body.includes("ada"), "email is never sent");
  assert((seen || !row.body.includes("locked_story")) && !row.body.includes("39.99") && !row.body.includes("story-0"), "no price or story; the trigger only on paywall_seen");
  assert(!row.body.includes("Dave") && !row.body.includes("203.0.113.8") && !row.body.includes("Mozilla"), "no name, IP, or user agent");
  assert(!row.body.includes("should-not-replace"), "caller device fields are ignored");
}

// Fetch fallback carries the same three keys and no email.
let fetched = null;
const fallback = await shipFunnelEvent({ ...noisy, event: FUNNEL_EVENTS.reserveSubmit }, {
  endpoint,
  storage,
  beaconImpl: () => false,
  fetchImpl: async (url, init) => { fetched = { url, init }; return { ok: false, type: "opaque", status: 0 }; },
});
assert(fallback.sent === true, "a refused beacon falls back to fetch");
assert(fetched.init.method === "POST" && fetched.init.mode === "no-cors" && fetched.init.keepalive === true, "fallback is POST no-cors keepalive");
assert(fetched.init.headers["Content-Type"] === "text/plain", "fallback is text/plain");
assert(Object.keys(JSON.parse(fetched.init.body)).sort().join(",") === THREE, "fallback payload keys are exactly event, date, device");
assert(!fetched.init.body.includes("@"), "fallback never sends the email");

// trigger and day: only known kinds, only sane day numbers.
const shipSeen = async (extra) => {
  let body = null;
  await shipFunnelEvent({ at: noisy.at, event: FUNNEL_EVENTS.paywallSeen, ...extra }, { endpoint, storage, beaconImpl: (u, b) => { body = JSON.parse(b); return true; } });
  return body;
};
const lw = await shipSeen({ source: "lectura_win", day: 1 });
assert(lw.trigger === "lectura_win" && lw.day === 1, "a day-1 Lectura win ships trigger=lectura_win, day=1");
for (const kind of ["win", "timed", "locked_story"]) assert((await shipSeen({ source: kind, day: 3 })).trigger === kind, `${kind} ships as its own trigger`);
const junk = await shipSeen({ source: "ada@example.com", day: "x" });
assert(!("trigger" in junk) && !("day" in junk), "an unknown trigger or a bad day is dropped, not sent");
assert(!("day" in (await shipSeen({ source: "win", day: 0 }))), "day 0 is not a day of use");

// apps-script/collector.gs keeps trigger and day only on paywall_seen.
{
  const { readFileSync } = await import("node:fs");
  const gs = readFileSync(new URL("../apps-script/collector.gs", import.meta.url), "utf8");
  const readEvent = new Function(`${gs}; return readEvent;`)();
  const post = (o) => readEvent({ postData: { contents: JSON.stringify(o) } });
  const seenRow = post({ event: "paywall_seen", date: "2026-10-21", device: "d1", trigger: "lectura_win", day: 1, email: "ada@example.com" });
  assert(seenRow.trigger === "lectura_win" && seenRow.day === 1 && !("email" in seenRow), "collector.gs keeps trigger and day on paywall_seen, nothing else");
  assert(Object.keys(seenRow).sort().join(",") === "date,day,device,event,trigger", "collector.gs row fields");
  const reserveRow = post({ event: "reserve_submit", date: "2026-10-21", device: "d1", trigger: "win", day: 2 });
  assert(reserveRow.trigger === "" && reserveRow.day === "", "collector.gs ignores trigger and day on reserve_submit");
  const badRow = post({ event: "paywall_seen", date: "2026-10-21", device: "d1", trigger: "free text", day: 1.5 });
  assert(badRow.trigger === "" && badRow.day === "", "collector.gs drops an unknown trigger and a non-integer day");
  assert(gs.includes('["received_at", "event", "date", "device", "trigger", "day"]'), "collector.gs header names the two new columns");
}

console.log("collector.test.js: ok");
