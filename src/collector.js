/** Optional collector. Empty URL sends nothing and mints no device id.
 *  Set VITE_COLLECTOR_ENDPOINT or VITE_FIRST_WIN_EMAIL_ENDPOINT at build
 *  time to the Apps Script web app. Both empty keeps the card and this
 *  collector off. The funnel script lives in apps-script/collector.gs.
 *  This repo does not deploy that script.
 *
 *  Only two events ever leave the device: paywall_seen and reserve_submit.
 *  Each goes out as exactly three fields: { event, date, device }.
 *  date is the device's local calendar day (YYYY-MM-DD).
 *  device is a random id made on this device.
 *  Every other event stays on the device. Every other field is dropped.
 *  The address is never sent.
 *  Email submits still go out as { type:'email', email, lang, source, ts }.
 */

import { dayKeyFromDate } from "./firstDoor.js";
import { FUNNEL_EVENTS } from "./funnel.js";

function readEndpoint(env, name) {
  const value = env && env[name];
  return typeof value === "string" ? value.trim() : "";
}

/** One gate for the card and the collector. A string override is for tests. */
let endpointOverride;

export function collectorEndpoint(env) {
  if (env === undefined && endpointOverride !== undefined) return endpointOverride;
  const source = env === undefined ? (import.meta.env || {}) : env;
  return readEndpoint(source, "VITE_COLLECTOR_ENDPOINT")
    || readEndpoint(source, "VITE_FIRST_WIN_EMAIL_ENDPOINT");
}

/** Tests pass a URL to turn the gate on, "" to force it off, or undefined to read the build env. */
export function setCollectorEndpointOverride(value) {
  endpointOverride = value === undefined
    ? undefined
    : (typeof value === "string" ? value.trim() : "");
}

/** Build-time web app URL snapshot. Empty unless an endpoint was set when this module loaded. */
export const COLLECTOR_ENDPOINT = collectorEndpoint();

export const COLLECTOR_DEVICE_KEY = "andale-device-id";

/** The only events that leave the device. */
export const COLLECTOR_EVENTS = Object.freeze([FUNNEL_EVENTS.paywallSeen, FUNNEL_EVENTS.reserveSubmit]);
const EVENT_NAMES = new Set(COLLECTOR_EVENTS);


/** Local calendar day of the event. Same clock as the streak day key. */
function localEventDate(now, fallback) {
  let raw = "";
  if (typeof now === "string" && now.trim()) raw = now.trim();
  else if (now instanceof Date) raw = now.toISOString();
  else if (typeof fallback === "string" && fallback.trim()) raw = fallback.trim();
  const date = raw ? new Date(raw) : new Date();
  const key = dayKeyFromDate(Number.isNaN(date.getTime()) ? new Date() : date);
  return key || dayKeyFromDate(new Date());
}

function browserStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    return null;
  }
  return null;
}

function defaultRandom() {
  try {
    const cryptoRef = globalThis.crypto;
    if (cryptoRef && typeof cryptoRef.randomUUID === "function") return cryptoRef.randomUUID();
  } catch {
    /* no id, send nothing */
  }
  return "";
}

/** Anonymous id from crypto.randomUUID, created on the first send and reused. */
export function collectorDeviceId(storage, random = defaultRandom) {
  const existing = storage && typeof storage.getItem === "function" ? storage.getItem(COLLECTOR_DEVICE_KEY) : "";
  if (typeof existing === "string" && existing.trim()) return existing.trim();
  let id = "";
  try {
    id = random();
  } catch {
    return "";
  }
  if (typeof id !== "string" || !id.trim()) return "";
  id = id.trim();
  if (storage && typeof storage.setItem === "function") {
    try { storage.setItem(COLLECTOR_DEVICE_KEY, id); } catch { /* keep the id for this send */ }
  }
  return id;
}

/**
 * text/plain body. sendBeacon when it accepts the call, otherwise fetch
 * keepalive, no-cors, text/plain. An empty endpoint does not call either.
 * Failures stay inside this function.
 */
export async function postCollector(record, {
  endpoint = collectorEndpoint(),
  fetchImpl = globalThis.fetch,
  beaconImpl,
} = {}) {
  const url = typeof endpoint === "string" ? endpoint.trim() : "";
  if (!url) return { ok: true, sent: false };
  const text = JSON.stringify(record);
  const beacon = beaconImpl !== undefined
    ? beaconImpl
    : (typeof navigator !== "undefined" && navigator.sendBeacon
      ? navigator.sendBeacon.bind(navigator)
      : null);
  if (typeof beacon === "function") {
    try {
      if (beacon(url, text) !== false) return { ok: true, sent: true };
    } catch {
      /* fetch below */
    }
  }
  if (typeof fetchImpl !== "function") return { ok: false, sent: false };
  try {
    await fetchImpl(url, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain" },
      body: text,
    });
    return { ok: true, sent: true };
  } catch {
    return { ok: false, sent: false };
  }
}

/** Forward one bus event. Empty endpoint sends nothing and does not mint a device id.
 *  Only paywall_seen and reserve_submit send. The body is only event, date, and device.
 */
export async function shipFunnelEvent(detail, {
  endpoint = collectorEndpoint(),
  now,
  storage,
  fetchImpl,
  beaconImpl,
  random,
} = {}) {
  try {
    const url = typeof endpoint === "string" ? endpoint.trim() : "";
    if (!url) return { ok: true, sent: false };
    const name = detail && detail.event;
    if (!EVENT_NAMES.has(name)) return { ok: true, sent: false };
    const store = storage === undefined ? browserStorage() : storage;
    const deviceId = collectorDeviceId(store, random);
    if (!deviceId) return { ok: true, sent: false };
    const record = {
      event: name,
      date: localEventDate(now, detail && detail.at),
      device: deviceId,
    };
    return postCollector(record, { endpoint: url, fetchImpl, beaconImpl });
  } catch {
    return { ok: false, sent: false };
  }
}
