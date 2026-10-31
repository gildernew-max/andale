import React, { useEffect, useRef, useState } from "react";
import { dayKeyFromDate } from "../firstDoor.js";
import { FUNNEL_EVENTS, PAYWALL_SEEN_SOURCE, PAYWALL_TAP, emitFunnelEvent } from "../funnel.js";
import { learnerDayNumber } from "../paywallTrigger.js";
import { annualPriceLine, PAYWALL_ANNUAL_LINE_SIZE, PAYWALL_LIME } from "../webPaywall.js";
import { PAYWALL_HERO_ALT, PAYWALL_HERO_PATH } from "../paywallStill.js";
import { LOCKED_DISPLAY_PRICE } from "../paywallDisclosure.js";
import { reserveWords } from "../reserveAnnual.js";
import { SCENE1_CHUNKS, SCENE1_VARIANTS } from "./content.js";
import {
  SCENE1_COLD_OPEN,
  SCENE1_COMPARE_PROMPT,
  SCENE1_INTRO_LINE,
  SCENE1_MAX_RETRIES,
  SCENE1_MIC_ERROR,
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
  paywall: "paywall",
  twist: "twist",
  done: "done",
});

const PAYWALL_HERO_SRC = `${import.meta.env.BASE_URL}${PAYWALL_HERO_PATH}`;

export default function Scene1Shell({ uiLang = "es", theme = "light", search } = {}) {
  const en = uiLang === "en";
  // No face, dark mode ruling: quiet #6B6258 ink becomes cream #F6EFE4 at ~70%
  // opacity on #15171C (8:1+), not solid — #6B6258 itself fails 4.5:1 on dark.
  const subInk = theme === "dark" ? "rgba(246,239,228,0.7)" : "#6B6258";
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

  // One app_open per mount of this shell, i.e. once per app open behind the scene1 flag.
  useEffect(() => {
    emitFunnelEvent({ event: FUNNEL_EVENTS.appOpen });
  }, []);

  useEffect(() => {
    if (phase !== PHASE.done) return;
    emitFunnelEvent({ event: FUNNEL_EVENTS.scene1Complete });
  }, [phase]);

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
      setRecordError(en ? SCENE1_MIC_ERROR.en : SCENE1_MIC_ERROR.es);
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
      setPhase(PHASE.paywall);
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
  // The loud card line reuses Guideline 3.1.2's locked annual amount (paywallDisclosure.js)
  // instead of a second, hand-typed "$39.99" so the two never drift apart.
  const annualLine = annualPriceLine(en ? "{price} a year" : "{price} al año", LOCKED_DISPLAY_PRICE.annual);

  return (
    <div data-testid="scene1-shell" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Nunito','Avenir Next',system-ui,sans-serif", textAlign: "center" }}>
      <div style={{ maxWidth: 360, width: "100%" }}>
        {phase === PHASE.coldOpen && (
          <div data-testid="scene1-cold-open">
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
            <div style={{ fontWeight: 800, fontSize: 13, color: subInk, marginBottom: 8 }}>{chunkIndex + 1}/{SCENE1_CHUNKS.length}</div>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 16 }}>{en ? chunk.cueEn : chunk.cueEs}</div>
            {recordError && <div style={{ color: "#C45C48", marginBottom: 8 }}>{recordError}</div>}
            <div style={{ fontSize: 12, color: subInk, marginBottom: 12 }}>{en ? SCENE1_MIC_REASON.en : SCENE1_MIC_REASON.es}</div>
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
            <div style={{ fontSize: 15, color: subInk, marginBottom: 16 }}>{chunk.en}</div>
            <button data-testid="scene1-compare" onClick={playCompare} style={primaryBtnStyle}>
              {en ? "Listen to both" : "Escuchar las dos"}
            </button>
          </div>
        )}

        {phase === PHASE.comparing && chunk && (
          <div data-testid="scene1-comparing">
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>{en ? SCENE1_COMPARE_PROMPT.en : SCENE1_COMPARE_PROMPT.es}</div>
            <div style={{ fontSize: 13, color: subInk, marginBottom: 16 }}>{en ? chunk.tipEn : chunk.tipEs}</div>
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

        {phase === PHASE.paywall && (
          <div data-testid="scene1-paywall" data-paywall-variant={variantForPaywall}>
            <img
              data-testid="scene1-paywall-hero"
              src={PAYWALL_HERO_SRC}
              alt={en ? PAYWALL_HERO_ALT.en : PAYWALL_HERO_ALT.es}
              style={{ display: "block", margin: "0 auto 16px", height: 140, width: "auto", maxWidth: "100%", borderRadius: 16, objectFit: "cover" }}
            />
            <div data-testid="scene1-paywall-headline" style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>
              {en ? words.headlineEn : words.headlineEs}
            </div>
            <div style={{ fontSize: 15, color: subInk, marginBottom: 16 }}>
              {en ? words.subheadEn : words.subheadEs}
            </div>
            <button data-testid="scene1-paywall-annual" onClick={tapAnnual} style={{ ...primaryBtnStyle, background: PAYWALL_LIME }}>
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" }}>{rw.label}</div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{rw.action}</div>
            </button>
            <div data-testid="scene1-paywall-annual-price" style={{ fontWeight: 900, fontSize: PAYWALL_ANNUAL_LINE_SIZE, marginTop: 10 }}>{annualLine}</div>
            <div data-testid="scene1-paywall-monthly-price" style={{ fontSize: 13, color: subInk, marginTop: 4 }}>{rw.saving}</div>
            <button data-testid="scene1-paywall-dismiss" onClick={tapContinueFree} style={{ ...textBtnStyle, color: subInk, marginTop: 12 }}>
              {en ? "Continue free" : "Seguir gratis"}
            </button>
          </div>
        )}

        {phase === PHASE.twist && variant && (
          <div data-testid="scene1-twist">
            <div style={{ fontWeight: 800, fontSize: 13, color: subInk, marginBottom: 8 }}>{en ? "Your turn" : "Tu turno"}</div>
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

        {phase === PHASE.done && <div data-testid="scene1-done" />}
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
