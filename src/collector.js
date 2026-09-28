/** Optional collector. Empty URL sends nothing.
 *  Set VITE_COLLECTOR_ENDPOINT at build time to the Apps Script web app.
 *  This repo does not deploy that script.
 *
 *  Events already on the in-browser funnel bus go out as
 *  { type:'event', name, lang, deviceId, ts }. The address is never on that row.
 *  Email submits go out as { type:'email', email, lang, source, ts }.
 */

import { FUNNEL_EVENTS } from "./funnel.js";

function endpointFromEnv() {
  const env = import.meta.env;
  const value = env && env.VITE_COLLECTOR_ENDPOINT;
  return typeof value === "string" ? value.trim() : "";
}

/** Build-time web app URL. Empty = local bus and localStorage only. */
export const COLLECTOR_ENDPOINT = endpointFromEnv();

export const COLLECTOR_DEVICE_KEY = "andale-device-id";

const EVENT_NAMES = new Set(Object.values(FUNNEL_EVENTS));

function postedAt(now, fallback) {
  if (typeof now === "string" && now.trim()) return now.trim();
  if (now instanceof Date) return now.toISOString();
  if (typeof fallback === "string" && fallback.trim()) return fallback.trim();
  return new Date().toISOString();
}

function faceLang(lang) {
  return lang === "en" ? "en" : "es";
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
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") return cryptoRef.randomUUID();
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Anonymous id, created on the first send and reused. Not derived from an address. */
export function collectorDeviceId(storage, random = defaultRandom) {
  const existing = storage && typeof storage.getItem === "function" ? storage.getItem(COLLECTOR_DEVICE_KEY) : "";
  if (typeof existing === "string" && existing.trim()) return existing.trim();
  const id = random();
  if (storage && typeof storage.setItem === "function") storage.setItem(COLLECTOR_DEVICE_KEY, id);
  return id;
}

/**
 * text/plain body. sendBeacon when it accepts the call, otherwise fetch no-cors.
 * An empty endpoint does not call either.
 */
export async function postCollector(record, {
  endpoint = COLLECTOR_ENDPOINT,
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
      headers: { "Content-Type": "text/plain" },
      body: text,
    });
    return { ok: true, sent: true };
  } catch {
    return { ok: false, sent: false };
  }
}

/** Forward one bus event. Empty endpoint sends nothing and does not mint a device id. */
export async function shipFunnelEvent(detail, {
  endpoint = COLLECTOR_ENDPOINT,
  lang = "es",
  now,
  storage,
  fetchImpl,
  beaconImpl,
  random,
} = {}) {
  const url = typeof endpoint === "string" ? endpoint.trim() : "";
  if (!url) return { ok: true, sent: false };
  const store = storage === undefined ? browserStorage() : storage;
  const name = detail && detail.event;
  if (!EVENT_NAMES.has(name)) return { ok: false, sent: false };
  const record = {
    type: "event",
    name,
    lang: faceLang(lang),
    deviceId: collectorDeviceId(store, random),
    ts: postedAt(now, detail && detail.at),
  };
  return postCollector(record, { endpoint: url, fetchImpl, beaconImpl });
}
