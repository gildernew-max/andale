import React, { useEffect, useRef } from "react";
import {
  CROSSWORD_CREAM,
  CROSSWORD_INK,
  CROSSWORD_LINE,
  CROSSWORD_SAGE,
  CROSSWORD_SAGE_TINT,
  CROSSWORD_SQUARE,
  crosswordCursor,
  crosswordDirLabel,
  crosswordRevealLabel,
  crosswordTitle,
} from "./crossword.js";

/** Flat geometric grid — cream / terracotta / sage. No bird. */
export function CrosswordMark({ size = 44 }) {
  return (
    <svg data-testid="crossword-mark" width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <rect x="5" y="5" width="34" height="34" rx="4" fill="#F6EFE4" stroke="#C46B3A" strokeWidth="2" />
      <rect x="9" y="9" width="8" height="8" fill="#FFFFFF" stroke={CROSSWORD_LINE} />
      <rect x="17" y="9" width="8" height="8" fill={CROSSWORD_SAGE} />
      <rect x="25" y="9" width="8" height="8" fill="#FFFFFF" stroke={CROSSWORD_LINE} />
      <rect x="9" y="17" width="8" height="8" fill={CROSSWORD_SAGE} />
      <rect x="17" y="17" width="8" height="8" fill="#FFFFFF" stroke={CROSSWORD_LINE} />
      <rect x="25" y="17" width="8" height="8" fill="#C46B3A" />
      <rect x="9" y="25" width="8" height="8" fill="#FFFFFF" stroke={CROSSWORD_LINE} />
      <rect x="17" y="25" width="8" height="8" fill="#C46B3A" />
      <rect x="25" y="25" width="8" height="8" fill="#FFFFFF" stroke={CROSSWORD_LINE} />
    </svg>
  );
}

const cellLocked = (run, cell) => {
  if (!cell) return false;
  return (run.locked || []).includes(cell.acrossId) || (run.locked || []).includes(cell.downId);
};

export function CrosswordPlayfield({
  run,
  grid,
  uiLang,
  onType,
  onBackspace,
  onSelectCell,
  onSelectClue,
  onReveal,
  onClose,
  langControl,
}) {
  const inputRef = useRef(null);
  const cursor = crosswordCursor(grid, run);
  const focusInput = () => {
    const el = inputRef.current;
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  };

  useEffect(() => {
    focusInput();
  }, []);

  const onInput = (e) => {
    const text = e.currentTarget.value;
    e.currentTarget.value = "";
    for (const ch of text) onType(ch);
  };

  const dirs = ["across", "down"];

  return (
    <div data-testid="crossword-board" style={{ maxWidth: 480, margin: "0 auto", padding: "22px 16px 48px", width: "100%", boxSizing: "border-box", background: CROSSWORD_CREAM, color: CROSSWORD_INK, overflowX: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <button type="button" onClick={onClose} aria-label={uiLang === "en" ? "Close" : "Cerrar"} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: "#8A8175", padding: "10px 12px", margin: "-10px -12px", minWidth: 44, minHeight: 44 }}>✕</button>
        <div data-testid="crossword-title" style={{ flex: 1, fontWeight: 800, fontSize: 15, color: "#8A8175" }}>{crosswordTitle(uiLang)}</div>
        {langControl}
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: "100%" }}>
      <div
        data-testid="crossword-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
          width: "100%",
          maxWidth: "100%",
          containerType: "inline-size",
          background: CROSSWORD_CREAM,
        }}
      >
        {grid.cells.flatMap((row, r) => row.map((cell, c) => {
          if (!cell) {
            return <div key={`${r}-${c}`} aria-hidden="true" style={{ aspectRatio: "1", minWidth: 0 }} />;
          }
          const locked = cellLocked(run, cell);
          const inWord = cursor && (cell.acrossId === cursor.word.id || cell.downId === cursor.word.id);
          const active = cursor && cursor.row === r && cursor.col === c;
          const letter = run.fills?.[`${r},${c}`] || "";
          let background = CROSSWORD_SQUARE;
          if (locked) background = CROSSWORD_SAGE;
          else if (inWord) background = CROSSWORD_SAGE_TINT;
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              data-testid="crossword-cell"
              data-row={r}
              data-col={c}
              data-state={locked ? "locked" : active ? "active" : inWord ? "highlight" : letter ? "filled" : "empty"}
              data-letter={letter}
              aria-label={cell.number ? `${cell.number}` : undefined}
              onClick={() => { onSelectCell(r, c); focusInput(); }}
              style={{
                position: "relative",
                aspectRatio: "1",
                minWidth: 0,
                width: "100%",
                boxSizing: "border-box",
                margin: 0,
                padding: 0,
                border: `1px solid ${CROSSWORD_LINE}`,
                background,
                color: locked ? "#FFFFFF" : CROSSWORD_INK,
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: `calc(62cqw / ${grid.cols})`,
                lineHeight: 1,
                cursor: "pointer",
                boxShadow: active ? `inset 0 0 0 2px ${CROSSWORD_SAGE}` : "none",
              }}
            >
              {cell.number != null && (
                <span aria-hidden="true" style={{ position: "absolute", top: 1, left: 2, fontSize: `calc(22cqw / ${grid.cols})`, fontWeight: 800, lineHeight: 1, color: locked ? "#F6EFE4" : "#8A8175" }}>{cell.number}</span>
              )}
              {letter}
            </button>
          );
        }))}
      </div>
        <input
          ref={inputRef}
          data-testid="crossword-input"
          aria-label={uiLang === "en" ? "Type a letter" : "Escribe una letra"}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          defaultValue=""
          onInput={onInput}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              onBackspace();
            }
          }}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            opacity: 0,
            border: "none",
            padding: 0,
            margin: 0,
            fontSize: 16,
            caretColor: "transparent",
          }}
        />
      </div>

      <div data-testid="crossword-clues" style={{ marginTop: 8 }}>
        {dirs.map((dir) => (
          <div key={dir}>
            <div data-testid={dir === "across" ? "crossword-across" : "crossword-down"} style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".08em", color: CROSSWORD_SAGE, margin: "14px 0 4px" }}>
              {crosswordDirLabel(dir, uiLang)}
            </div>
            {grid.words.filter((word) => word.dir === dir).map((word) => {
              const on = run.wordId === word.id;
              const done = (run.locked || []).includes(word.id);
              return (
                <button
                  key={word.id}
                  type="button"
                  data-testid={`crossword-clue-${word.id}`}
                  data-active={on ? "yes" : "no"}
                  data-locked={done ? "yes" : "no"}
                  onClick={() => { onSelectClue(word.id); focusInput(); }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "none",
                    padding: "5px 0",
                    fontFamily: "inherit",
                    fontSize: 14.5,
                    fontWeight: on ? 800 : 700,
                    color: done ? CROSSWORD_SAGE : CROSSWORD_INK,
                    cursor: "pointer",
                    lineHeight: 1.35,
                  }}
                >
                  <span style={{ fontWeight: 900, marginRight: 6 }}>{word.number}</span>
                  {word.clue}
                </button>
              );
            })}
          </div>
        ))}
        <button
          type="button"
          data-testid="crossword-reveal"
          onClick={() => { onReveal(); focusInput(); }}
          style={{
            display: "block",
            marginTop: 12,
            border: "none",
            background: "none",
            padding: 0,
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 700,
            color: "#8A8175",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {crosswordRevealLabel(uiLang)}
        </button>
      </div>
    </div>
  );
}
