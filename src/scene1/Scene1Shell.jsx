import React, { useEffect, useRef, useState } from "react";
import { dayKeyFromDate } from "../firstDoor.js";
import { FUNNEL_EVENTS, PAYWALL_SEEN_SOURCE, PAYWALL_TAP, emitFunnelEvent } from "../funnel.js";
import { learnerDayNumber } from "../paywallTrigger.js";
import { PAYWALL_LIME } from "../webPaywall.js";
import { reserveWords } from "../reserveAnnual.js";
import { SCENE1_CHUNKS, SCENE1_VARIANTS } from "./content.js";
import {
  SCENE1_COLD_OPEN,
  SCENE1_COMPARE_PROMPT,
  SCENE1_HANDOFF_LINE,
  SCENE1_INTRO_LINE,
  SCENE1_MAX_RETRIES,
  SCENE1_MIC_REASON,
  SCENE1_MOVE_ON_LINE,
  SCENE1_PAYWALL_A,
  SCENE1_PAYWALL_B,
} from "./copy.js";
import { scene1PaywallVariant } from "./paywallVariant.js";
import { emitRecordingHappened, loadRecordingBlob, playNativeThenLearner, saveRecordingBlob, startRecording } from "./recorder.js";
import { scene1ReviewIntervalDays } from "./scheduler.js";
import { today } from "./today.js";

const FIRST_SEEN_KEY = "andale-scene1-first-seen";

function stampFirstSeen(todayKey) {
  try {
    const existing = window.localStorage?.getItem(FIRST_SEEN_KEY);
    if (existing) return existing;
    window.localStorage?.setItem(FIRST_SEEN_KEY, todayKey);
    return todayKey;
  } catch {
    return todayKey;
  }
}

const PHASE = Object.freeze({
  coldOpen: "coldOpen",
  intro: "intro",
  cue: "cue",
  recording: "recording",
  model: "model",
  comparing: "comparing",
  retryLine: "retryLine",
  handoff: "handoff",
  paywall: "paywall",
  twist: "twist",
  done: "done",
});

const BIRD_SRC = `${import.meta.env.BASE_URL}mascot/cenzontle.png`;

export default function Scene1Shell({ uiLang = "es", search } = {}) {
  const en = uiLang === "en";
  const todayDate = today({ scene1Enabled: true, search });
  const todayKey = dayKeyFromDate(todayDate);
  const firstSeenKeyRef = useRef(null);
  if (firstSeenKeyRef.current == null) firstSeenKeyRef.current = stampFirstSeen(todayKey);

  const [phase, setPhase] = useState(PHASE.coldOpen);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [retries, setRetries] = useState(0);
  const [learnerBlob, setLearnerBlob] = useState(null);
  const [recordError, setRecordError] = useState(null);
  // The in-flight startRecording() promise, not the resolved handle: a fast
  // tap of Stop can land before the mic promise settles and React re-renders
  // with the handle in state, so finishRecording awaits this directly
  // instead of racing a state update.
  const recorderPromiseRef = useRef(null);

  const chunk = SCENE1_CHUNKS[chunkIndex] || null;
  const variant = SCENE1_VARIANTS[0];

  useEffect(() => () => {
    recorderPromiseRef.current?.then((handle) => { try { handle.stop(); } catch { /* unmounting */ } }).catch(() => {});
  }, []);

  // Dave's condition (proposal.md): the paywall is instrumented. One
  // paywall_seen per time the learner lands on it, same allowlisted shape
  // the rest of the app uses.
  useEffect(() => {
    if (phase !== PHASE.paywall) return;
    emitFunnelEvent({
      event: FUNNEL_EVENTS.paywallSeen,
      source: PAYWALL_SEEN_SOURCE.timed,
      day: learnerDayNumber(firstSeenKeyRef.current, todayKey),
    });
    // firstSeenKeyRef is a ref (not reactive) and todayKey is stable for the
    // life of this mount; re-firing only when phase re-enters paywall.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const beginRecording = () => {
    setRecordError(null);
    setPhase(PHASE.recording);
    const pending = startRecording();
    recorderPromiseRef.current = pending;
    pending.catch(() => {
      if (recorderPromiseRef.current === pending) recorderPromiseRef.current = null;
      setRecordError(en ? "Microphone unavailable." : "Micrófono no disponible.");
      setPhase(PHASE.cue);
    });
  };

  const finishRecording = async () => {
    const pending = recorderPromiseRef.current;
    if (!pending) return;
    let handle;
    try {
      handle = await pending;
    } catch {
      return;
    }
    recorderPromiseRef.current = null;
    const blob = await handle.stop();
    setLearnerBlob(blob);
    if (chunk) {
      try { await saveRecordingBlob(chunk.id, blob); } catch { /* on-device best effort */ }
    }
    emitRecordingHappened();
    setPhase(PHASE.model);
  };

  const playCompare = async () => {
    setPhase(PHASE.comparing);
    let blob = learnerBlob;
    if (!blob && chunk) {
      try { blob = await loadRecordingBlob(chunk.id); } catch { blob = null; }
    }
    await playNativeThenLearner({ nativeText: chunk?.es, learnerBlob: blob });
  };

  // Chunk 0 ("Buenos días. ¿Me da un kilo de limones?") is the first spoken
  // exchange. Paywall A/B interrupts the loop right after it, per
  // proposal.md's funnel step; chunks 1-4 and the twist stay free once
  // dismissed.
  const advanceChunk = () => {
    setRetries(0);
    setLearnerBlob(null);
    const wasFirstChunk = chunkIndex === 0;
    const next = chunkIndex + 1;
    if (wasFirstChunk) {
      setChunkIndex(next);
      setPhase(PHASE.handoff);
      return;
    }
    if (next >= SCENE1_CHUNKS.length) {
      setPhase(PHASE.twist);
      return;
    }
    setChunkIndex(next);
    setPhase(PHASE.cue);
  };

  const tapSameSound = () => advanceChunk();

  const tapRetry = () => {
    const nextRetries = retries + 1;
    if (nextRetries > SCENE1_MAX_RETRIES) {
      // Moving on anyway: a repeated chunk reviews sooner (pure scheduler, no clock read beyond today()).
      scene1ReviewIntervalDays(nextRetries);
      setPhase(PHASE.retryLine);
      return;
    }
    setRetries(nextRetries);
    setLearnerBlob(null);
    setPhase(PHASE.cue);
  };

  const tapContinueFree = () => {
    emitFunnelEvent({ event: FUNNEL_EVENTS.paywallTap, choice: PAYWALL_TAP.continueFree });
    setPhase(PHASE.cue);
  };

  // No real payment wiring; nothing takes money. The tap is still counted,
  // same as the main paywall elsewhere in the app.
  const tapAnnual = () => {
    emitFunnelEvent({ event: FUNNEL_EVENTS.paywallTap, choice: PAYWALL_TAP.annual });
    emitFunnelEvent({ event: FUNNEL_EVENTS.tapAnnual, source: PAYWALL_SEEN_SOURCE.timed });
  };

  const variantForPaywall = scene1PaywallVariant({ firstSeenKey: firstSeenKeyRef.current, todayKey, search });
  const words = variantForPaywall === "B" ? SCENE1_PAYWALL_B : SCENE1_PAYWALL_A;
  const rw = reserveWords(uiLang);

  return (
    <div data-testid="scene1-shell" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Nunito','Avenir Next',system-ui,sans-serif", textAlign: "center" }}>
      <div style={{ maxWidth: 360, width: "100%" }}>
        {phase === PHASE.coldOpen && (
          <div data-testid="scene1-cold-open">
            <img src={BIRD_SRC} alt="" width={96} height={96} aria-hidden="true" style={{ display: "block", margin: "0 auto 20px", width: 96, height: 96, objectFit: "contain" }} />
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 24 }}>{en ? SCENE1_COLD_OPEN.en : SCENE1_COLD_OPEN.es}</div>
            <button data-testid="scene1-cold-open-start" onClick={() => setPhase(PHASE.intro)} style={primaryBtnStyle}>
              {en ? SCENE1_COLD_OPEN.buttonEn : SCENE1_COLD_OPEN.buttonEs}
            </button>
          </div>
        )}

        {phase === PHASE.intro && (
          <div data-testid="scene1-intro">
            <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 16 }}>{en ? SCENE1_INTRO_LINE.en : SCENE1_INTRO_LINE.es}</div>
            <button data-testid="scene1-start" onClick={() => setPhase(PHASE.cue)} style={primaryBtnStyle}>
              {en ? "Start" : "Empezar"}
            </button>
          </div>
        )}

        {phase === PHASE.cue && chunk && (
          <div data-testid="scene1-cue">
            <div style={{ fontWeight: 800, fontSize: 13, color: "#6B6258", marginBottom: 8 }}>{chunkIndex + 1}/{SCENE1_CHUNKS.length}</div>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 16 }}>{en ? chunk.cueEn : chunk.cueEs}</div>
            {recordError && <div style={{ color: "#C45C48", marginBottom: 8 }}>{recordError}</div>}
            <div style={{ fontSize: 12, color: "#6B6258", marginBottom: 12 }}>{en ? SCENE1_MIC_REASON.en : SCENE1_MIC_REASON.es}</div>
            <button data-testid="scene1-record" onClick={beginRecording} style={primaryBtnStyle}>
              {en ? "Record" : "Grabar"}
            </button>
          </div>
        )}

        {phase === PHASE.recording && chunk && (
          <div data-testid="scene1-recording">
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 16 }}>{en ? "Recording…" : "Grabando…"}</div>
            <button data-testid="scene1-stop" onClick={finishRecording} style={primaryBtnStyle}>
              {en ? "Stop" : "Detener"}
            </button>
          </div>
        )}

        {phase === PHASE.model && chunk && (
          <div data-testid="scene1-model">
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>{chunk.es}</div>
            <div style={{ fontSize: 15, color: "#6B6258", marginBottom: 16 }}>{chunk.en}</div>
            <button data-testid="scene1-compare" onClick={playCompare} style={primaryBtnStyle}>
              {en ? "Listen to both" : "Escuchar las dos"}
            </button>
          </div>
        )}

        {phase === PHASE.comparing && chunk && (
          <div data-testid="scene1-comparing">
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>{en ? SCENE1_COMPARE_PROMPT.en : SCENE1_COMPARE_PROMPT.es}</div>
            <div style={{ fontSize: 13, color: "#6B6258", marginBottom: 16 }}>{en ? chunk.tipEn : chunk.tipEs}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button data-testid="scene1-same" onClick={tapSameSound} style={primaryBtnStyle}>
                {en ? SCENE1_COMPARE_PROMPT.sameEn : SCENE1_COMPARE_PROMPT.sameEs}
              </button>
              <button data-testid="scene1-retry" onClick={tapRetry} style={outlineBtnStyle}>
                {en ? SCENE1_COMPARE_PROMPT.retryEn : SCENE1_COMPARE_PROMPT.retryEs}
              </button>
            </div>
          </div>
        )}

        {phase === PHASE.retryLine && (
          <div data-testid="scene1-retry-line">
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 16 }}>{en ? SCENE1_MOVE_ON_LINE.en : SCENE1_MOVE_ON_LINE.es}</div>
            <button data-testid="scene1-continue-after-retry" onClick={advanceChunk} style={primaryBtnStyle}>
              {en ? "Continue" : "Seguir"}
            </button>
          </div>
        )}

        {phase === PHASE.handoff && (
          <div data-testid="scene1-handoff">
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 20 }}>{en ? SCENE1_HANDOFF_LINE.en : SCENE1_HANDOFF_LINE.es}</div>
            <button data-testid="scene1-handoff-continue" onClick={() => setPhase(PHASE.paywall)} style={primaryBtnStyle}>
              {en ? "Continue" : "Seguir"}
            </button>
          </div>
        )}

        {phase === PHASE.paywall && (
          <div data-testid="scene1-paywall" data-paywall-variant={variantForPaywall}>
            <div data-testid="scene1-paywall-headline" style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>
              {en ? words.headlineEn : words.headlineEs}
            </div>
            <div style={{ fontSize: 15, color: "#6B6258", marginBottom: 16 }}>
              {en ? words.subheadEn : words.subheadEs}
            </div>
            <button data-testid="scene1-paywall-annual" onClick={tapAnnual} style={{ ...primaryBtnStyle, background: PAYWALL_LIME }}>
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" }}>{rw.label}</div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{rw.action}</div>
            </button>
            <div data-testid="scene1-paywall-price" style={{ fontSize: 13, color: "#6B6258", marginTop: 8 }}>{rw.saving}</div>
            <button data-testid="scene1-paywall-dismiss" onClick={tapContinueFree} style={{ ...textBtnStyle, marginTop: 12 }}>
              {en ? "Continue free" : "Seguir gratis"}
            </button>
          </div>
        )}

        {phase === PHASE.twist && variant && (
          <div data-testid="scene1-twist">
            <div style={{ fontWeight: 800, fontSize: 13, color: "#6B6258", marginBottom: 8 }}>{en ? "Your turn" : "Tu turno"}</div>
            {variant.beats.map((beat, i) => {
              const beatChunk = SCENE1_CHUNKS.find((c) => c.id === beat.chunkId);
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>{en ? beat.vendorEn : beat.vendorEs}</div>
                  <div style={{ fontWeight: 900 }}>{beatChunk ? beatChunk.es : ""}</div>
                </div>
              );
            })}
            <button data-testid="scene1-finish" onClick={() => setPhase(PHASE.done)} style={{ ...primaryBtnStyle, marginTop: 16 }}>
              {en ? "Continue" : "Seguir"}
            </button>
          </div>
        )}

        {phase === PHASE.done && (
          <div data-testid="scene1-done">
            <img src={BIRD_SRC} alt="" width={120} height={120} aria-hidden="true" style={{ display: "block", margin: "0 auto", width: 120, height: 120, objectFit: "contain" }} />
          </div>
        )}
      </div>
    </div>
  );
}

const primaryBtnStyle = {
  display: "block",
  width: "100%",
  minHeight: 48,
  padding: "10px 16px",
  background: "#1CB0F6",
  color: "#fff",
  border: "none",
  borderRadius: 16,
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

const outlineBtnStyle = {
  ...primaryBtnStyle,
  background: "none",
  color: "#1CB0F6",
  border: "2px solid #1CB0F6",
};

const textBtnStyle = {
  display: "block",
  width: "100%",
  padding: "11px 0",
  minHeight: 44,
  background: "none",
  border: "none",
  color: "#6B6258",
  fontFamily: "inherit",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
