import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dayKeyFromDate } from "./firstDoor.js";
import { COLLECTOR_DEVICE_KEY, COLLECTOR_ENDPOINT, collectorEndpoint, setCollectorEndpointOverride, shipFunnelEvent } from "./collector.js";
import { FUNNEL_EVENTS } from "./funnel.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const here = dirname(fileURLToPath(import.meta.url));
const FIVE = "date,day,device_id,event,source";

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
    source: "win",
    day: 2,
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

const blankEndpoint = memoryStorage();
const blankResult = await shipFunnelEvent({
  event: FUNNEL_EVENTS.open,
  email: "ada@example.com",
}, {
  endpoint: "   ",
  storage: blankEndpoint,
  beaconImpl: () => { beacons += 1; return true; },
  fetchImpl: async () => { fetches += 1; return { ok: true }; },
});
assert(blankResult.sent === false && beacons === 0 && fetches === 0, "a blank endpoint string sends nothing");
assert(blankEndpoint.data[COLLECTOR_DEVICE_KEY] == null, "a blank endpoint does not mint a device id");

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
    lang: "en",
    name: "Dave",
    ip: "203.0.113.8",
    userAgent: "Mozilla/5.0",
    ts: "1999-01-01T00:00:00.000Z",
    type: "email",
    deviceId: "should-not-replace",
    streak: 2,
    xp: 40,
  }, {
    endpoint,
    lang: "en",
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
assert(storage.data[COLLECTOR_DEVICE_KEY] === "device-anonymous-1", "device id is stored under andale-device-id");

const expectedDate = dayKeyFromDate(new Date("2026-09-28T18:05:00.000Z"));
for (const row of sent) {
  assert(row.url === endpoint, "events hit the collector URL");
  const body = JSON.parse(row.body);
  assert(Object.keys(body).sort().join(",") === FIVE, "payload has exactly event, source, day, date, device_id");
  assert(Object.keys(body).length === 5, "payload has five keys");
  assert(required.includes(body.event), "event name is on the bus");
  assert(body.device_id === "device-anonymous-1", "event carries the anonymous device id");
  assert(body.date === expectedDate, "date is the local calendar day");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(body.date), "date is YYYY-MM-DD");
  assert(body.source === "" && body.day === "", "events without an allowlisted source or day send blanks");
  assert(!("email" in body) && !("lang" in body) && !("name" in body) && !("ts" in body) && !("type" in body), "stripped fields are absent");
  assert(!("deviceId" in body) && !("daysSinceLast" in body) && !("storyId" in body) && !("ip" in body), "old and extra fields are absent");
  assert(!/@/.test(row.body), "event body has no address");
  assert(!row.body.includes("203.0.113.8"), "event body has no IP");
  assert(!row.body.includes("Mozilla"), "event body has no user agent");
}
assert(sent.some((row) => JSON.parse(row.body).event === "lectura_start"), "Lectura open is sent");
assert(sent.some((row) => JSON.parse(row.body).event === "lectura_chapter_done"), "Lectura chapter done is sent");
assert(sent.some((row) => JSON.parse(row.body).event === "paywall_tap"), "paywall tap is sent");

const filled = [];
const resultFilled = await shipFunnelEvent({
  event: FUNNEL_EVENTS.paywallSeen,
  at: "2026-10-13T15:04:00.000Z",
  source: "locked_story",
  day: 2,
  email: "ada@example.com",
  price: "$39.99",
  storyId: "story-0",
  daysSinceLast: 4,
}, {
  endpoint,
  lang: "en",
  storage,
  random: () => "device-should-not-replace",
  beaconImpl: (_url, body) => {
    filled.push(JSON.parse(body));
    return true;
  },
  fetchImpl: async () => { throw new Error("fetch should not run"); },
});
assert(resultFilled.sent === true, "paywall_seen with source and day is sent");
assert(Object.keys(filled[0]).sort().join(",") === FIVE, "a filled row still has exactly five keys");
assert(filled[0].event === "paywall_seen" && filled[0].source === "locked_story" && filled[0].day === 2, "source and day are the allowlisted values");
assert(filled[0].date === dayKeyFromDate(new Date("2026-10-13T15:04:00.000Z")), "filled row date is local");
assert(filled[0].device_id === "device-anonymous-1", "device id is reused");
assert(!("email" in filled[0]) && !("price" in filled[0]) && !("daysSinceLast" in filled[0]), "extras stay off the filled row");

const junk = [];
await shipFunnelEvent({
  event: FUNNEL_EVENTS.paywallSeen,
  at: "2026-10-13T15:04:00.000Z",
  source: "boot",
  day: 0,
}, {
  endpoint,
  storage,
  random: () => "device-anonymous-1",
  beaconImpl: (_url, body) => {
    junk.push(JSON.parse(body));
    return true;
  },
  fetchImpl: async () => { throw new Error("fetch should not run"); },
});
assert(junk.length === 1 && Object.keys(junk[0]).sort().join(",") === FIVE, "junk still posts exactly five keys");
assert(junk[0].source === "" && junk[0].day === "", "an unknown source and a day outside 1–3650 are blank");

const unknown = await shipFunnelEvent({
  event: "not_a_funnel_event",
  email: "ada@example.com",
}, {
  endpoint,
  storage,
  beaconImpl: () => { beacons += 1; return true; },
  fetchImpl: async () => { fetches += 1; return { ok: true }; },
});
assert(unknown.sent === false, "an unknown event name is not sent");

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

let fetched = null;
const fallback = await shipFunnelEvent({
  event: FUNNEL_EVENTS.emailSkipped,
  at: "2026-09-28T18:07:00.000Z",
  email: "ada@example.com",
  source: "win",
  day: 9,
}, {
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
assert(fetched.init.method === "POST", "fallback is POST");
assert(fetched.init.mode === "no-cors", "fallback is no-cors");
assert(fetched.init.keepalive === true, "fallback uses keepalive");
assert(fetched.init.headers["Content-Type"] === "text/plain", "fallback is text/plain");
const fallbackBody = JSON.parse(fetched.init.body);
assert(Object.keys(fallbackBody).sort().join(",") === FIVE, "fallback payload has exactly five keys");
assert(fallbackBody.event === "email-skipped" && fallbackBody.source === "win" && fallbackBody.day === 9, "fallback keeps the five fields");
assert(!("email" in fallbackBody) && !/@/.test(fetched.init.body), "fallback event has no address");

const uuidStore = memoryStorage();
let uuidCalls = 0;
const cryptoRef = globalThis.crypto;
const originalRandomUUID = cryptoRef.randomUUID.bind(cryptoRef);
Object.defineProperty(cryptoRef, "randomUUID", {
  configurable: true,
  writable: true,
  value: () => {
    uuidCalls += 1;
    return "11111111-1111-4111-8111-111111111111";
  },
});
const minted = await shipFunnelEvent({
  event: FUNNEL_EVENTS.open,
  at: "2026-10-13T12:00:00.000Z",
  email: "ada@example.com",
}, {
  endpoint,
  storage: uuidStore,
  beaconImpl: () => true,
  fetchImpl: async () => { throw new Error("fetch should not run"); },
});
const reused = await shipFunnelEvent({
  event: FUNNEL_EVENTS.paywallTap,
  at: "2026-10-13T12:05:00.000Z",
}, {
  endpoint,
  storage: uuidStore,
  beaconImpl: () => true,
  fetchImpl: async () => { throw new Error("fetch should not run"); },
});
Object.defineProperty(cryptoRef, "randomUUID", {
  configurable: true,
  writable: true,
  value: originalRandomUUID,
});
assert(minted.sent === true && reused.sent === true, "a real device id can send");
assert(uuidCalls === 1, "crypto.randomUUID runs once");
assert(uuidStore.data[COLLECTOR_DEVICE_KEY] === "11111111-1111-4111-8111-111111111111", "the uuid is kept in andale-device-id");

const brokenId = memoryStorage();
let brokenBeacons = 0;
Object.defineProperty(cryptoRef, "randomUUID", {
  configurable: true,
  writable: true,
  value: () => { throw new Error("no random"); },
});
const broken = await shipFunnelEvent({
  event: FUNNEL_EVENTS.open,
  email: "ada@example.com",
}, {
  endpoint,
  storage: brokenId,
  beaconImpl: () => { brokenBeacons += 1; return true; },
  fetchImpl: async () => { brokenBeacons += 1; return { ok: true }; },
});
Object.defineProperty(cryptoRef, "randomUUID", {
  configurable: true,
  writable: true,
  value: originalRandomUUID,
});
assert(broken.sent === false && brokenBeacons === 0, "a failed randomUUID sends nothing");
assert(brokenId.data[COLLECTOR_DEVICE_KEY] == null, "a failed randomUUID stores nothing");

const emailScript = readFileSync(join(here, "..", "docs", "first-win-email-collector.gs"), "utf8");
assert(/function doPost\s*\(\s*e\s*\)/.test(emailScript), "email collector exposes doPost(e)");
assert(emailScript.includes('sheetByName(ss, "emails")') && emailScript.includes('sheetByName(ss, "events")'), "tabs are emails and events");
assert(emailScript.includes("insertSheet(name)"), "missing tabs are created");
assert(emailScript.includes('appendRow([record.ts, record.email, record.lang, record.source])'), "emails tab row is timestamp, email, lang, source");
assert(emailScript.includes('appendRow([record.ts, record.name, record.lang, record.deviceId])'), "events tab row is timestamp, name, lang, device id");
const eventWrite = emailScript.slice(emailScript.indexOf('record.type === "event"'));
assert(!eventWrite.includes("record.email"), "events tab write does not touch the address");

const script = readFileSync(join(here, "..", "apps-script", "collector.gs"), "utf8");
const readme = readFileSync(join(here, "..", "apps-script", "README.md"), "utf8");
assert(/function doPost\s*\(\s*e\s*\)/.test(script), "funnel collector exposes doPost(e)");
assert(script.includes('appendRow([') && script.includes("record.event") && script.includes("record.device_id"), "doPost appends the event row");
assert(script.includes("received_at") && script.includes('"event"') && script.includes('"source"') && script.includes('"day"') && script.includes('"date"') && script.includes('"device_id"'), "columns are received_at, event, source, day, date, device_id");
assert(!/Logger\.|console\.|getHeaders|e\.parameter|REMOTE_ADDR|userIp|remoteAddress/i.test(script), "the script does not log IP or headers");
assert(!script.includes("record.email") && !script.includes("parsed.email"), "the funnel script does not read an address");
assert(readme.includes("Extensions > Apps Script"), "readme names the Apps Script menu");
assert(readme.includes("Execute as: Me") && readme.includes("Anyone"), "readme says run as me, anyone can access");
assert(readme.includes("VITE_COLLECTOR_ENDPOINT"), "readme names the Pages variable");

console.log("ok: collector — empty endpoint sends nothing; a set endpoint posts exactly five fields.");
