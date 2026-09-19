import { isAudioGatedStep, LISTEN_SKIP, LISTEN_SKIP_HINT, listenSkipHint, listenSkipLabel } from "./listenSkip.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(LISTEN_SKIP.es === "Saltar", "ES quiet skip is Saltar");
assert(LISTEN_SKIP.en === "Skip", "EN quiet skip is Skip");
assert(listenSkipLabel("es") === "Saltar", "ES label");
assert(listenSkipLabel("en") === "Skip", "EN label");
assert(listenSkipLabel() === "Saltar", "default is ES");
assert(!/SALTAR|SKIP/.test(`${LISTEN_SKIP.es}${LISTEN_SKIP.en}`), "quiet face is not the Camino SALTAR / SKIP");

assert(LISTEN_SKIP_HINT.es === "Si no puedes oír", "ES hint is Si no puedes oír");
assert(LISTEN_SKIP_HINT.en === "If you can’t hear", "EN hint is If you can’t hear");
assert(listenSkipHint("es") === "Si no puedes oír", "ES hint follows uiLang");
assert(listenSkipHint("en") === "If you can’t hear", "EN hint follows uiLang");
assert(listenSkipHint() === "Si no puedes oír", "hint default is ES");
assert(!/mute|muted|sorry|guilt|meeting/i.test(`${LISTEN_SKIP_HINT.es}${LISTEN_SKIP_HINT.en}`), "hint is not a guilt line");

assert(isAudioGatedStep({ type: "listen" }), "listen dictation is gated");
assert(!isAudioGatedStep({ type: "mc", text: "¿Con todo?" }), "Hoy connector MC is not a dead-end");
assert(!isAudioGatedStep({ type: "transform" }), "transform shows the base line");
assert(!isAudioGatedStep({ type: "type" }), "type shows the prompt");
assert(!isAudioGatedStep({ type: "order" }), "order shows tiles");
assert(!isAudioGatedStep({ type: "match" }), "match shows both sides");
assert(!isAudioGatedStep(null), "missing question is not gated");
assert(!isAudioGatedStep({}), "empty question is not gated");

console.log("ok: quiet Listen Skip — Saltar / Skip; dictation only.");
