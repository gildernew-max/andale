import { FUNNEL_EVENTS, FUNNEL_LOG } from "../funnel.js";
import {
  emitRecordingHappened,
  loadRecordingBlob,
  playNativeThenLearner,
  saveRecordingBlob,
  startRecording,
} from "./recorder.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

/** Minimal fake IndexedDB: enough of open/transaction/objectStore/put/get to
 *  exercise recorder.js's promisified wrapper, nothing more. */
function makeFakeIdb() {
  const dbs = new Map();
  return {
    open(name) {
      const req = {};
      queueMicrotask(() => {
        let db = dbs.get(name);
        const isNew = !db;
        if (!db) { db = { storeMap: new Map() }; dbs.set(name, db); }
        const handle = {
          objectStoreNames: { contains: (n) => db.storeMap.has(n) },
          createObjectStore(n) { db.storeMap.set(n, new Map()); },
          transaction(storeName) {
            const map = db.storeMap.get(storeName);
            const tx = {
              objectStore: () => ({
                put(value, key) {
                  queueMicrotask(() => { map.set(key, value); tx.oncomplete?.(); });
                },
                get(key) {
                  const r = {};
                  queueMicrotask(() => { r.result = map.get(key); r.onsuccess?.(); });
                  return r;
                },
              }),
            };
            return tx;
          },
        };
        req.result = handle;
        if (isNew) req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
  };
}

class FakeMediaRecorder {
  constructor(stream, opts) {
    this.stream = stream;
    this.opts = opts;
  }
  start() { /* no-op: fake capture starts immediately */ }
  stop() {
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(["learner-audio"], { type: "audio/webm" }) });
      this.onstop?.();
    });
  }
}

async function fakeGetUserMedia() {
  return { getTracks: () => [{ stop() { this.stopped = true; } }] };
}

// IndexedDB: save then load round-trips the same blob, on one fake "device".
{
  const idbFactory = makeFakeIdb();
  const blob = new Blob(["hola"], { type: "audio/webm" });
  await saveRecordingBlob("limones", blob, { idbFactory });
  const loaded = await loadRecordingBlob("limones", { idbFactory });
  assert(loaded === blob, "loadRecordingBlob returns exactly what saveRecordingBlob stored");
  const missing = await loadRecordingBlob("nope", { idbFactory });
  assert(missing === null, "an unknown chunk id loads as null, not undefined");
}

// MediaRecorder: startRecording -> stop() resolves to a Blob, and releases the mic track.
{
  let stopped = false;
  const handle = await startRecording({
    getUserMediaImpl: async () => ({ getTracks: () => [{ stop() { stopped = true; } }] }),
    MediaRecorderImpl: FakeMediaRecorder,
  });
  const blob = await handle.stop();
  assert(blob instanceof Blob, "startRecording resolves to a Blob once stopped");
  assert(stopped === true, "stopping the recorder releases the mic track");
}

// The recorder fails to start (constructor throws, e.g. an unsupported
// mimeType): the mic was already open via getUserMedia, and onstop never
// fires to release it, so startRecording must stop the track itself.
{
  class ThrowingMediaRecorder {
    constructor() { throw new Error("mimeType not supported"); }
  }
  let stopped = false;
  let threw = false;
  try {
    await startRecording({
      getUserMediaImpl: async () => ({ getTracks: () => [{ stop() { stopped = true; } }] }),
      MediaRecorderImpl: ThrowingMediaRecorder,
    });
  } catch {
    threw = true;
  }
  assert(threw, "startRecording rejects when the recorder constructor throws");
  assert(stopped === true, "the mic track is released even when the recorder never started");
}

// Missing getUserMedia/MediaRecorder rejects instead of silently doing nothing.
{
  let threw = false;
  try {
    await startRecording({ getUserMediaImpl: undefined, MediaRecorderImpl: undefined });
  } catch {
    threw = true;
  }
  assert(threw, "startRecording rejects when the mic APIs are unavailable");
}

// playNativeThenLearner: native plays once, then the learner blob plays once, in that order.
{
  const order = [];
  await playNativeThenLearner({
    nativeText: "Buenos días.",
    learnerBlob: new Blob(["learner"]),
    speechSynthesisImpl: { speak: (u) => { order.push("native-start"); setTimeout(() => u.onend?.(), 0); } },
    UtteranceImpl: function Utter(text) { this.text = text; },
    createObjectURLImpl: () => "blob:fake",
    revokeObjectURLImpl: () => {},
    AudioImpl: function Audio() {
      order.push("learner-start");
      this.play = () => { setTimeout(() => this.onended?.(), 0); return undefined; };
    },
  });
  assert(order.join(",") === "native-start,learner-start", "the native line plays before the learner's recording");
}

// A missing blob or missing speech API resolves instead of hanging.
{
  await playNativeThenLearner({ nativeText: "", learnerBlob: null, speechSynthesisImpl: null, UtteranceImpl: null });
}

// The recording-happened count event goes through the existing funnel helper
// as event + timestamp only — never audio, never what was said.
{
  const bus = { [FUNNEL_LOG]: [] };
  const payload = emitRecordingHappened(bus);
  assert(payload.event === FUNNEL_EVENTS.sceneRecording, "emits the scene1 recording event");
  assert(typeof payload.at === "string", "the payload carries a timestamp");
  assert(Object.keys(payload).sort().join(",") === "at,event", "the payload is event + timestamp only, no audio or text");
  assert(bus[FUNNEL_LOG].length === 1, "the event lands on the same funnel bus as every other funnel event");
}

console.log("scene1/recorder.test.js: ok");
