import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTOR_DEVICE_KEY, COLLECTOR_ENDPOINT, collectorEndpoint, setCollectorEndpointOverride, shipFunnelEvent } from "./collector.js";
import { FUNNEL_EVENTS, daysSinceLastVisit } from "./funnel.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(COLLECTOR_ENDPOINT === "", "collector stays off until a build endpoint is set");
assert(collectorEndpoint() === "", "shared helper is empty when both build endpoints are empty");
assert(collectorEndpoint({ VITE_COLLECTOR_ENDPOINT: "", VITE_FIRST_WIN_EMAIL_ENDPOINT: "" }) === "", "both empty strings stay off");
assert(collectorEndpoint({ VITE_COLLECTOR_ENDPOINT: "  ", VITE_FIRST_WIN_EMAIL_ENDPOINT: "  " }) === "", "blank endpoints stay off");
assert(collectorEndpoint({ VITE_COLLECTOR_ENDPOINT: " https://collector.example/exec " }) === "https://collector.example/exec", "VITE_COLLECTOR_ENDPOINT turns the helper on");
assert(collectorEndpoint({ VITE_FIRST_WIN_EMAIL_ENDPOINT: "https://email.example/exec" }) === "https://email.example/exec", "VITE_FIRST_WIN_EMAIL_ENDPOINT turns the helper on");
setCollectorEndpointOverride("https://override.example/exec");
assert(collectorEndpoint() === "https://override.example/exec", "a test endpoint overrides the empty build env");
setCollectorEndpointOverride(undefined);
assert(collectorEndpoint() === "", "clearing the test endpoint reads the empty build env again");

function memoryStorage() {
  const data = {};
  return {
    data,
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
  };
}

const required = [
  FUNNEL_EVENTS.firstWinSeen,
  FUNNEL_EVENTS.emailSubmitted,
  FUNNEL_EVENTS.emailSkipped,
  FUNNEL_EVENTS.lecturaStart,
  FUNNEL_EVENTS.lecturaChapterDone,
  FUNNEL_EVENTS.paywallSeen,
  FUNNEL_EVENTS.paywallTap,
];

let beacons = 0;
let fetches = 0;
const quiet = memoryStorage();
for (const name of required.concat(FUNNEL_EVENTS.open)) {
  const skipped = await shipFunnelEvent({
    event: name,
    at: "2026-09-28T18:00:00.000Z",
    email: "ada@example.com",
    daysSinceLast: 1,
    streak: 3,
    xp: 10,
  }, {
    endpoint: "",
    lang: "en",
    storage: quiet,
    beaconImpl: () => { beacons += 1; return true; },
    fetchImpl: async () => { fetches += 1; return { ok: true }; },
  });
  assert(skipped.sent === false, `empty endpoint does not send ${name}`);
}
assert(beacons === 0 && fetches === 0, "empty endpoint calls neither sendBeacon nor fetch");
assert(quiet.data[COLLECTOR_DEVICE_KEY] == null, "empty endpoint does not mint a device id");

const storage = memoryStorage();
const sent = [];
const endpoint = "https://script.google.com/macros/s/collector/exec";
for (const name of required) {
  const result = await shipFunnelEvent({
    event: name,
    at: "2026-09-28T18:05:00.000Z",
    email: "ada@example.com",
    storyId: "story-0",
    choice: "annual",
    daysSinceLast: 5,
    streak: 2,
    xp: 40,
  }, {
    endpoint,
    lang: name === FUNNEL_EVENTS.paywallSeen ? "en" : "es",
    storage,
    random: () => "device-anonymous-1",
    beaconImpl: (url, body) => {
      beacons += 1;
      sent.push({ url, body });
      return true;
    },
    fetchImpl: async () => { fetches += 1; return { ok: true }; },
  });
  assert(result.sent === true, `${name} is sent when the endpoint is set`);
}
assert(fetches === 0, "sendBeacon handles the event so fetch is not used");
assert(beacons === required.length, "each required event is beaconed once");
assert(storage.data[COLLECTOR_DEVICE_KEY] === "device-anonymous-1", "device id is stored");

for (const row of sent) {
  assert(row.url === endpoint, "events hit the collector URL");
  const body = JSON.parse(row.body);
  assert(body.type === "event", "event row type");
  assert(required.includes(body.name), "event name is on the bus");
  assert(body.deviceId === "device-anonymous-1", "event carries the anonymous device id");
  assert(body.ts === "2026-09-28T18:05:00.000Z", "event ts comes from the bus");
  assert(body.lang === "en" || body.lang === "es", "event lang is one face");
  assert(!("email" in body), "event row has no email field");
  assert(!/@/.test(row.body), "event body has no address");
  assert(Object.keys(body).sort().join(",") === "deviceId,lang,name,ts,type", "event row is type, name, lang, device id, ts");
}
assert(sent.some((row) => JSON.parse(row.body).name === "lectura_start"), "Lectura open is sent");
assert(sent.some((row) => JSON.parse(row.body).name === "lectura_chapter_done"), "Lectura chapter done is sent");
assert(sent.some((row) => JSON.parse(row.body).name === "paywall_tap"), "paywall tap is sent");
assert(sent.find((row) => JSON.parse(row.body).name === "paywall_seen") && JSON.parse(sent.find((row) => JSON.parse(row.body).name === "paywall_seen").body).lang === "en", "paywall_seen keeps the English face");
assert(sent.every((row) => !("daysSinceLast" in JSON.parse(row.body))), "daysSinceLast stays off events that are not open");

setCollectorEndpointOverride("https://override.example/open");
const openStore = memoryStorage();
const openPosts = [];
for (const [lastDay, today, days, label] of [
  ["2026-10-04", "2026-10-04", 0, "same day"],
  ["2026-10-03", "2026-10-04", 1, "yesterday"],
  ["2026-09-29", "2026-10-04", 5, "five days ago"],
]) {
  const result = await shipFunnelEvent({
    event: FUNNEL_EVENTS.open,
    at: "2026-10-04T16:00:00.000Z",
    daysSinceLast: daysSinceLastVisit(lastDay, today),
    email: "ada@example.com",
    streak: 4,
    xp: 40,
    storyId: "story-0",
    userAgent: "Mozilla/5.0",
  }, {
    lang: "es",
    storage: openStore,
    random: () => "device-open-1",
    beaconImpl: (_url, body) => {
      openPosts.push(JSON.parse(body));
      return true;
    },
    fetchImpl: async () => { throw new Error("fetch should not run"); },
  });
  assert(result.sent === true, `${label} open is sent on the test override endpoint`);
  assert(daysSinceLastVisit(lastDay, today) === days, `${label} computes to ${days}`);
}
assert(openPosts.map((row) => row.daysSinceLast).join(",") === "0,1,5", "open carries same day, yesterday, and five days");
for (const row of openPosts) {
  assert(Object.keys(row).sort().join(",") === "daysSinceLast,deviceId,lang,name,ts,type", "open posted keys are exactly type, name, lang, deviceId, ts, daysSinceLast");
  assert(row.type === "event" && row.name === "open" && row.lang === "es" && row.deviceId === "device-open-1" && row.ts === "2026-10-04T16:00:00.000Z", "open posted values");
  assert(!("email" in row) && !("streak" in row) && !("xp" in row) && !("storyId" in row) && !("userAgent" in row), "open row has no other fields");
}
let firstVisit = null;
const firstResult = await shipFunnelEvent({
  event: FUNNEL_EVENTS.open,
  at: "2026-10-04T16:01:00.000Z",
  daysSinceLast: daysSinceLastVisit(null, "2026-10-04"),
  email: "ada@example.com",
}, {
  lang: "en",
  storage: openStore,
  beaconImpl: (_url, body) => {
    firstVisit = JSON.parse(body);
    return true;
  },
  fetchImpl: async () => { throw new Error("fetch should not run"); },
});
assert(firstResult.sent === true, "first visit open still sends when the override endpoint is set");
assert(!("daysSinceLast" in firstVisit), "first visit omits daysSinceLast");
assert(Object.keys(firstVisit).sort().join(",") === "deviceId,lang,name,ts,type", "first visit open keeps the base keys only");
assert(openStore.data[COLLECTOR_DEVICE_KEY] === "device-open-1", "open reuses one device id once the endpoint is on");
setCollectorEndpointOverride("");
const forcedOff = memoryStorage();
let forcedBeacons = 0;
const forced = await shipFunnelEvent({
  event: FUNNEL_EVENTS.open,
  daysSinceLast: 1,
  email: "ada@example.com",
}, {
  storage: forcedOff,
  beaconImpl: () => { forcedBeacons += 1; return true; },
  fetchImpl: async () => { forcedBeacons += 1; return { ok: true }; },
});
assert(forced.sent === false && forcedBeacons === 0, "a blank override sends nothing");
assert(forcedOff.data[COLLECTOR_DEVICE_KEY] == null, "a blank override does not mint andale-device-id");
setCollectorEndpointOverride(undefined);
assert(collectorEndpoint() === "", "clearing the override leaves the build endpoint empty");

const again = await shipFunnelEvent({ event: FUNNEL_EVENTS.paywallTap, at: "2026-09-28T18:06:00.000Z" }, {
  endpoint,
  storage,
  random: () => "device-should-not-replace",
  beaconImpl: () => true,
  fetchImpl: async () => { throw new Error("fetch should not run"); },
});
assert(again.sent === true, "a later event still sends");
assert(storage.data[COLLECTOR_DEVICE_KEY] === "device-anonymous-1", "device id is reused");

let fetched = null;
const fallback = await shipFunnelEvent({ event: FUNNEL_EVENTS.emailSkipped, at: "2026-09-28T18:07:00.000Z", email: "ada@example.com" }, {
  endpoint,
  lang: "en",
  storage,
  beaconImpl: () => false,
  fetchImpl: async (url, init) => {
    fetches += 1;
    fetched = { url, init };
    return { ok: false, type: "opaque", status: 0 };
  },
});
assert(fallback.sent === true, "a refused beacon falls back to fetch");
assert(fetched.init.mode === "no-cors", "fallback is no-cors");
assert(fetched.init.headers["Content-Type"] === "text/plain", "fallback is text/plain");
const fallbackBody = JSON.parse(fetched.init.body);
assert(fallbackBody.type === "event" && fallbackBody.name === "email-skipped", "fallback is the event");
assert(!("email" in fallbackBody) && !/@/.test(fetched.init.body), "fallback event has no address");

const collector = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "first-win-email-collector.gs"), "utf8");
assert(/function doPost\s*\(\s*e\s*\)/.test(collector), "collector exposes doPost(e)");
assert(collector.includes('sheetByName(ss, "emails")') && collector.includes('sheetByName(ss, "events")'), "tabs are emails and events");
assert(collector.includes("insertSheet(name)"), "missing tabs are created");
assert(collector.includes('appendRow([record.ts, record.email, record.lang, record.source])'), "emails tab row is timestamp, email, lang, source");
assert(collector.includes('appendRow([record.ts, record.name, record.lang, record.deviceId])'), "events tab row is timestamp, name, lang, device id");
const eventWrite = collector.slice(collector.indexOf('record.type === "event"'));
assert(!eventWrite.includes("record.email"), "events tab write does not touch the address");

console.log("ok: collector — empty endpoint sends nothing; a set endpoint ships events without the address.");
