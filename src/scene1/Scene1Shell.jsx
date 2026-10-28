import React, { useEffect, useRef, useState } from "react";
import { dayKeyFromDate } from "../firstDoor.js";
import { PAYWALL_LIME } from "../webPaywall.js";
import { reserveWords } from "../reserveAnnual.js";
import { SCENE1_CHUNKS, SCENE1_VARIANTS } from "./content.js";
import {
  SCENE1_COMPARE_PROMPT,
  SCENE1_HANDOFF_LINE,
  SCENE1_INTRO_LINE,
  SCENE1_MAX_RETRIES,
  SCENE1_MIC_REASON,
  SCENE1_MOVE_ON_LINE,
  SCENE1_PAYWALL_A,
  SCENE1_PAYWALL_B,
} from "./copy.js";
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

/** Day 1 sees Paywall A; day 3+ sees the Paywall B return variant. */
function paywallVariantFor(firstSeenKey, todayKey) {
  if (!firstSeenKey || !todayKey) return "A";
  const first = new Date(firstSeenKey);
  const now = new Date(todayKey);
  if (Number.isNaN(first.getTime()) || Number.isNaN(now.getTime())) return "A";
  const days = Math.round((now.getTime() - first.getTime()) / 86400000);
  return days >= 3 ? "B" : "A";
}

const PHASE = Object.freeze({
  intro: "intro",
  cue: "cue",
  recording: "recording",
  model: "model",
  comparing: "comparing",
  retryLine: "retryLine",
  twist: "twist",
  paywall: "paywall",
});

export default function Scene1Shell({ uiLang = "es", search } = {}) {
  const en = uiLang === "en";
  const todayDate = today({ scene1Enabled: true, search });
  const todayKey = dayKeyFromDate(todayDate);
  const firstSeenKeyRef = useRef(null);
  if (firstSeenKeyRef.current == null) firstSeenKeyRef.current = stampFirstSeen(todayKey);

  const [phase, setPhase] = useState(PHASE.intro);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [retries, setRetries] = useState(0);
  const [recorderHandle, setRecorderHandle] = useState(null);
  const [learnerBlob, setLearnerBlob] = useState(null);
  const [recordError, setRecordError] = useState(null);

  const chunk = SCENE1_CHUNKS[chunkIndex] || null;
  const variant = SCENE1_VARIANTS[0];

  useEffect(() => () => {
    if (recorderHandle) { try { recorderHandle.stop(); } catch { /* unmounting */ } }
  }, [recorderHandle]);

  const beginRecording = async () => {
    setRecordError(null);
    setPhase(PHASE.recording);
    try {
      const handle = await startRecording();
      setRecorderHandle(handle);
    } catch {
      setRecordError(en ? "Microphone unavailable." : "Micrófono no disponible.");
      setPhase(PHASE.cue);
    }
  };

  const finishRecording = async () => {
    if (!recorderHandle) return;
    const blob = await recorderHandle.stop();
    setRecorderHandle(null);
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

  const advanceChunk = () => {
    setRetries(0);
    setLearnerBlob(null);
    const next = chunkIndex + 1;
    if (next >= SCENE1_CHUNKS.length) setPhase(PHASE.twist);
    else {
      setChunkIndex(next);
      setPhase(PHASE.cue);
    }
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

  const variantForPaywall = paywallVariantFor(firstSeenKeyRef.current, todayKey);
  const words = variantForPaywall === "B" ? SCENE1_PAYWALL_B : SCENE1_PAYWALL_A;
  const rw = reserveWords(uiLang);

  return (
    <div data-testid="scene1-shell" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Nunito','Avenir Next',system-ui,sans-serif", textAlign: "center" }}>
      <div style={{ maxWidth: 360, width: "100%" }}>
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
            <div style={{ fontWeight: 900, fontSize: 20, margin: "16px 0" }}>{en ? SCENE1_HANDOFF_LINE.en : SCENE1_HANDOFF_LINE.es}</div>
            <button data-testid="scene1-to-paywall" onClick={() => setPhase(PHASE.paywall)} style={primaryBtnStyle}>
              {en ? "Continue" : "Seguir"}
            </button>
          </div>
        )}

        {phase === PHASE.paywall && (
          <div data-testid="scene1-paywall">
            <div data-testid="scene1-paywall-headline" style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>
              {en ? words.headlineEn : words.headlineEs}
            </div>
            <div style={{ fontSize: 15, color: "#6B6258", marginBottom: 16 }}>
              {en ? words.subheadEn : words.subheadEs}
            </div>
            <button data-testid="scene1-paywall-annual" style={{ ...primaryBtnStyle, background: PAYWALL_LIME }}>
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" }}>{rw.label}</div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{rw.action}</div>
            </button>
            <div data-testid="scene1-paywall-price" style={{ fontSize: 13, color: "#6B6258", marginTop: 8 }}>{rw.saving}</div>
            <button data-testid="scene1-paywall-dismiss" style={{ ...textBtnStyle, marginTop: 12 }}>
              {en ? "Continue free" : "Seguir gratis"}
            </button>
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
