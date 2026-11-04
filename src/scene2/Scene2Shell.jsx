import React, { useState } from "react";
import { SCENE2_CHUNKS, SCENE2_TITLE } from "./copy.js";

const PHASE = Object.freeze({
  intro: "intro",
  cue: "cue",
  done: "done",
});

// House fills, matching Scene 1 / the app shell exactly (index.html, App.jsx's D_LIGHT.bg / D_DARK.bg).
const SCENE2_BG = Object.freeze({ light: "#F6EFE4", dark: "#15171C" });
const SCENE2_INK = Object.freeze({ light: "#1F3A1A", dark: "#F6EFE4" });
// Quiet text (counter, English gloss): Scene 1's subInk rule — cream at ~70%
// opacity on dark, not solid; #6B6258 on light.
const SCENE2_SUB_INK = Object.freeze({ light: "#6B6258", dark: "rgba(246,239,228,0.7)" });

export default function Scene2Shell({ uiLang = "es", theme = "light" } = {}) {
  const en = uiLang === "en";
  const dark = theme === "dark";
  const [phase, setPhase] = useState(PHASE.intro);
  const [chunkIndex, setChunkIndex] = useState(0);
  const chunk = SCENE2_CHUNKS[chunkIndex] || null;

  const ink = dark ? SCENE2_INK.dark : SCENE2_INK.light;
  const subInk = dark ? SCENE2_SUB_INK.dark : SCENE2_SUB_INK.light;
  const bg = dark ? SCENE2_BG.dark : SCENE2_BG.light;

  const advance = () => {
    const next = chunkIndex + 1;
    if (next >= SCENE2_CHUNKS.length) {
      setPhase(PHASE.done);
      return;
    }
    setChunkIndex(next);
    setPhase(PHASE.cue);
  };

  return (
    <div data-testid="scene2-shell" style={{ minHeight: "100dvh", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Nunito','Avenir Next',system-ui,sans-serif", textAlign: "center", background: bg, color: ink }}>
      <div style={{ maxWidth: 360, width: "100%" }}>
        {phase === PHASE.intro && (
          <div data-testid="scene2-intro">
            <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 16, color: ink }}>{en ? SCENE2_TITLE.en : SCENE2_TITLE.es}</div>
            <button data-testid="scene2-start" onClick={() => setPhase(PHASE.cue)} style={startBtnStyle}>
              {en ? "Start" : "Empezar"}
            </button>
          </div>
        )}

        {phase === PHASE.cue && chunk && (
          <div data-testid="scene2-cue">
            <div style={{ fontWeight: 800, fontSize: 13, color: subInk, marginBottom: 8 }}>{chunkIndex + 1}/{SCENE2_CHUNKS.length}</div>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 16, color: ink }}>{en ? chunk.cueEn : chunk.cueEs}</div>
            {en && <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8, color: ink }}>{chunk.es}</div>}
            <div style={{ fontSize: 15, color: subInk, marginBottom: 16 }}>{chunk.en}</div>
            <button data-testid="scene2-continue" onClick={advance} style={primaryBtnStyle}>
              {en ? "Continue" : "Seguir"}
            </button>
          </div>
        )}

        {phase === PHASE.done && <div data-testid="scene2-done" />}
      </div>
    </div>
  );
}

const startBtnStyle = {
  display: "block",
  width: "100%",
  minHeight: 48,
  padding: "10px 16px",
  background: "#58CC02",
  color: "#1F3A1A",
  border: "none",
  borderRadius: 16,
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

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
