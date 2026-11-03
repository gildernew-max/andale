import React, { useState } from "react";
import { SCENE2_CHUNKS, SCENE2_TITLE } from "./copy.js";

const PHASE = Object.freeze({
  intro: "intro",
  cue: "cue",
});

export default function Scene2Shell({ uiLang = "es" } = {}) {
  const en = uiLang === "en";
  const [phase, setPhase] = useState(PHASE.intro);
  const chunk = SCENE2_CHUNKS[0];

  return (
    <div data-testid="scene2-shell" style={{ minHeight: "100dvh", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Nunito','Avenir Next',system-ui,sans-serif", textAlign: "center" }}>
      <div style={{ maxWidth: 360, width: "100%" }}>
        {phase === PHASE.intro && (
          <div data-testid="scene2-intro">
            <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 16 }}>{en ? SCENE2_TITLE.en : SCENE2_TITLE.es}</div>
            <button data-testid="scene2-start" onClick={() => setPhase(PHASE.cue)} style={primaryBtnStyle}>
              {en ? "Start" : "Empezar"}
            </button>
          </div>
        )}

        {phase === PHASE.cue && chunk && (
          <div data-testid="scene2-cue">
            <div style={{ fontWeight: 800, fontSize: 13, color: "#6B6258", marginBottom: 8 }}>1/{SCENE2_CHUNKS.length}</div>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 16 }}>{chunk.cueEn}</div>
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>{chunk.es}</div>
            <div style={{ fontSize: 15, color: "#6B6258" }}>{chunk.en}</div>
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
