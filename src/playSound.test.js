import { playSound } from "./playSound.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const traceSound = (kind, { enabled = true, state = "running" } = {}) => {
  const events = [];
  let oscillators = 0;
  let constructed = 0;
  let resumeCalls = 0;
  const audioRef = { current: null };

  class FakeAudioContext {
    constructor() {
      constructed += 1;
      this.currentTime = 0;
      this.state = state;
      this.destination = { id: "dest" };
      this.sampleRate = 1000;
    }
    resume() { resumeCalls += 1; }
    createGain() {
      return {
        connect(node) { events.push(["gain.connect", node?.id || "node"]); },
        gain: {
          setValueAtTime(v, t) { events.push(["gain.set", v, t]); },
          linearRampToValueAtTime(v, t) { events.push(["gain.linear", v, t]); },
          exponentialRampToValueAtTime(v, t) { events.push(["gain.exp", v, t]); },
        },
      };
    }
    createOscillator() {
      oscillators += 1;
      const node = {
        connect() { events.push(["osc.connect"]); },
        start(t) { events.push(["osc.start", t, node.type]); },
        stop(t) { events.push(["osc.stop", t]); },
        frequency: {
          setValueAtTime(v, t) { events.push(["freq.set", v, t]); },
          exponentialRampToValueAtTime(v, t) { events.push(["freq.exp", v, t]); },
        },
        detune: { setValueAtTime(v, t) { events.push(["detune", v, t]); } },
        type: "sine",
      };
      return node;
    }
    createBuffer(channels, length, rate) {
      events.push(["buffer", channels, length, rate]);
      return { getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      return {
        connect() { events.push(["noise.connect"]); },
        start(t) { events.push(["noise.start", t]); },
        stop(t) { events.push(["noise.stop", t]); },
        buffer: null,
      };
    }
    createBiquadFilter() {
      const filt = {
        connect() { events.push(["filt.connect"]); },
        type: "lowpass",
        frequency: {
          set value(v) { events.push(["filt.freq", v]); },
          get value() { return 300; },
        },
      };
      return filt;
    }
  }

  const prev = globalThis.AudioContext;
  const prevWebkit = globalThis.webkitAudioContext;
  globalThis.AudioContext = FakeAudioContext;
  globalThis.webkitAudioContext = FakeAudioContext;
  try {
    playSound(kind, { enabled, audioRef });
  } finally {
    if (prev === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = prev;
    if (prevWebkit === undefined) delete globalThis.webkitAudioContext;
    else globalThis.webkitAudioContext = prevWebkit;
  }
  return { events, oscillators, constructed, resumeCalls };
};

const bad = traceSound("bad");
const wrong = traceSound("wrong");
const ok = traceSound("ok");

assert(bad.oscillators > 0, "bad starts oscillators");
assert(bad.oscillators === wrong.oscillators, "bad and wrong start the same number of oscillators");
assert(JSON.stringify(bad.events) === JSON.stringify(wrong.events), "bad follows the wrong synth path");
assert(ok.oscillators === 4, "a right answer still starts 4 oscillators");
assert(bad.oscillators !== ok.oscillators, "the miss tone is not the right-answer chord");
assert(bad.events.some((e) => e[0] === "freq.set" && e[1] === 260), "bad keeps the 260 Hz drop");
assert(bad.events.some((e) => e[0] === "freq.exp" && e[1] === 160), "bad keeps the slide to 160 Hz");
assert(bad.events.some((e) => e[0] === "gain.set" && e[1] === 0.22), "bad keeps the wrong-tone gain");
assert(bad.events.some((e) => e[0] === "freq.set" && e[1] === 80), "bad keeps the 80 Hz thump");
assert(bad.events.some((e) => e[0] === "gain.linear" && e[1] === 0.15), "bad keeps the thump volume");
assert(bad.events.some((e) => e[0] === "gain.set" && e[1] === 0.12), "bad keeps the thud volume");

const muted = traceSound("bad", { enabled: false });
assert(muted.oscillators === 0 && muted.constructed === 0, "a muted miss stays silent");
assert(traceSound("wrong", { enabled: false }).oscillators === 0, "a muted wrong stays silent");
assert(traceSound("ok", { enabled: false }).oscillators === 0, "a muted right answer stays silent");

const locked = traceSound("bad", { state: "suspended" });
assert(locked.resumeCalls === 1, "a suspended context is resumed");
assert(locked.oscillators === bad.oscillators, "resume still plays the wrong tone");
assert(traceSound("bad", { enabled: false, state: "suspended" }).resumeCalls === 0, "mute does not resume audio");

const unknown = traceSound("nope");
assert(unknown.oscillators === 0 && unknown.events.length === 0, "an unknown name stays silent");
