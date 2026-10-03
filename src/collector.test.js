import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTOR_DEVICE_KEY, COLLECTOR_ENDPOINT, collectorEndpoint, setCollectorEndpointOverride, shipFunnelEvent } from "./collector.js";
import { FUNNEL_EVENTS } from "./funnel.js";

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
for (const name of required) {
  const skipped = await shipFunnelEvent({
    event: name,
    at: "2026-09-28T18:00:00.000Z",
    email: "ada@example.com",
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
