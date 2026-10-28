/** Scene 1 recorder: MediaRecorder capture, blobs stored in IndexedDB on this
 *  device only — no network, ever. Also: play the native line then the
 *  learner's own recording, once each, and (if the existing funnel helper is
 *  present) count that a recording happened — never the audio, never what
 *  was said. */

import { FUNNEL_EVENTS, emitFunnelEvent } from "../funnel.js";

export const SCENE1_DB_NAME = "andale-scene1-recordings";
export const SCENE1_DB_VERSION = 1;
export const SCENE1_STORE_NAME = "recordings";

function defaultIdbFactory() {
  try {
    if (typeof indexedDB !== "undefined") return indexedDB;
    if (typeof window !== "undefined" && window.indexedDB) return window.indexedDB;
  } catch { /* unavailable */ }
  return null;
}

function openScene1Db(idbFactory) {
  return new Promise((resolve, reject) => {
    if (!idbFactory || typeof idbFactory.open !== "function") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = idbFactory.open(SCENE1_DB_NAME, SCENE1_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SCENE1_STORE_NAME)) db.createObjectStore(SCENE1_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("indexedDB open failed"));
  });
}

/** Writes one blob under `chunkId`, on-device only. */
export async function saveRecordingBlob(chunkId, blob, { idbFactory = defaultIdbFactory() } = {}) {
  const db = await openScene1Db(idbFactory);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(SCENE1_STORE_NAME, "readwrite");
      tx.objectStore(SCENE1_STORE_NAME).put(blob, chunkId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error("indexedDB write failed"));
    } catch (e) {
      reject(e);
    }
  });
}

/** Reads the blob stored under `chunkId`, or null if there isn't one. */
export async function loadRecordingBlob(chunkId, { idbFactory = defaultIdbFactory() } = {}) {
  const db = await openScene1Db(idbFactory);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(SCENE1_STORE_NAME, "readonly");
      const req = tx.objectStore(SCENE1_STORE_NAME).get(chunkId);
      req.onsuccess = () => resolve(req.result === undefined ? null : req.result);
      req.onerror = () => reject(req.error || new Error("indexedDB read failed"));
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Opens the mic and starts capturing. Returns `{ stop }`; `stop()` ends the
 * MediaRecorder and the mic track, and resolves to the captured Blob.
 * Caller decides whether/when to persist it (saveRecordingBlob).
 */
export async function startRecording({
  getUserMediaImpl,
  MediaRecorderImpl,
  mimeType = "audio/webm",
} = {}) {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const gum = getUserMediaImpl || (nav?.mediaDevices?.getUserMedia ? nav.mediaDevices.getUserMedia.bind(nav.mediaDevices) : null);
  if (typeof gum !== "function") throw new Error("getUserMedia unavailable");
  const Recorder = MediaRecorderImpl || (typeof MediaRecorder !== "undefined" ? MediaRecorder : null);
  if (typeof Recorder !== "function") throw new Error("MediaRecorder unavailable");

  const stream = await gum({ audio: true });
  const recorder = new Recorder(stream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e?.data?.size) chunks.push(e.data); };
  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = () => {
      try { stream.getTracks?.().forEach((t) => t.stop()); } catch { /* best effort */ }
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = (e) => reject(e?.error || new Error("recording failed"));
  });
  recorder.start();
  return { stop: () => { recorder.stop(); return stopped; } };
}

function speakOnce(text, { voice, speechSynthesisImpl, UtteranceImpl } = {}) {
  return new Promise((resolve) => {
    try {
      const ss = speechSynthesisImpl || (typeof window !== "undefined" ? window.speechSynthesis : null);
      const Utter = UtteranceImpl || (typeof window !== "undefined" ? window.SpeechSynthesisUtterance : null);
      const spoken = String(text || "").trim();
      if (!ss || typeof Utter !== "function" || !spoken) { resolve(); return; }
      const u = new Utter(spoken);
      u.lang = "es-MX";
      if (voice) { try { u.voice = voice; } catch { /* keep lang fallback */ } }
      u.onend = () => resolve();
      u.onerror = () => resolve();
      ss.speak(u);
    } catch {
      resolve();
    }
  });
}

function playBlobOnce(blob, { AudioImpl, createObjectURLImpl, revokeObjectURLImpl } = {}) {
  return new Promise((resolve) => {
    try {
      if (!blob) { resolve(); return; }
      const createUrl = createObjectURLImpl || (typeof URL !== "undefined" ? URL.createObjectURL.bind(URL) : null);
      const revokeUrl = revokeObjectURLImpl || (typeof URL !== "undefined" ? URL.revokeObjectURL.bind(URL) : null);
      const Player = AudioImpl || (typeof Audio !== "undefined" ? Audio : null);
      if (!createUrl || typeof Player !== "function") { resolve(); return; }
      const url = createUrl(blob);
      const audio = new Player(url);
      const finish = () => { try { revokeUrl?.(url); } catch { /* best effort */ } resolve(); };
      audio.onended = finish;
      audio.onerror = finish;
      const played = audio.play?.();
      if (played?.catch) played.catch(finish);
    } catch {
      resolve();
    }
  });
}

/**
 * Plays the native line, then the learner's own recording, once each, back
 * to back — per compare-spec-and-scene2.md. All audio playback hooks are
 * injectable so this is testable without a real speechSynthesis/Audio stack.
 */
export async function playNativeThenLearner({ nativeText, learnerBlob, voice, ...hooks } = {}) {
  await speakOnce(nativeText, { voice, ...hooks });
  await playBlobOnce(learnerBlob, hooks);
}

/**
 * Counts that a recording happened — never the audio, never the content.
 * Only fires through the existing funnel helper (funnel.js); a missing or
 * broken bus is a silent no-op, same as every other funnel event.
 */
export function emitRecordingHappened(bus) {
  try {
    return emitFunnelEvent({ event: FUNNEL_EVENTS.sceneRecording }, bus);
  } catch {
    return null;
  }
}
