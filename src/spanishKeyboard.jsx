import React from "react";
import { spanishKeyboardKeyStyle } from "./spanishKeyboard.js";

/** Shared key. Ahorcado's LetterBoard and Wordle both render through this. */
export function SpanishKeyboardKey({
  letter,
  theme = "light",
  status = "idle",
  disabled = false,
  onPick,
  testId = "letter-chip",
  light,
}) {
  const blocked = disabled || (status !== "idle" && status !== "unused");
  return (
    <button
      type="button"
      data-testid={testId}
      data-letter={letter}
      data-state={status}
      disabled={blocked}
      onClick={() => onPick?.(letter)}
      aria-label={letter}
      style={spanishKeyboardKeyStyle({ theme, status, disabled: blocked, light })}
    >
      {letter}
    </button>
  );
}
