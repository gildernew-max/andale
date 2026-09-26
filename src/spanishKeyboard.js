/** Shared Spanish on-screen keyboard.
 *  Wordle and Ahorcado both paint keys through `spanishKeyboardKeyStyle`
 *  and render them with `SpanishKeyboardKey` (spanishKeyboard.jsx).
 *  Light mode is the current chip: white face, CHECK lime, green/red hits.
 *  Dark mode is the games ruling: card #1E2128, lip #2A2E36, cream #F6EFE4.
 *  Correct keys are Cubetas sage. 14px cream on #6F7757 is 4.13:1, so the
 *  key face uses #677050 (4.58:1) whenever the letter is small text.
 */

export const SPANISH_KEYBOARD = {
  page: "#15171C",
  card: "#1E2128",
  line: "#2A2E36",
  cream: "#F6EFE4",
  muted: "#A0A4AB",
  /** Brand sage. Large bold cream clears 3:1; small text does not clear 4.5:1. */
  sage: "#6F7757",
  /** Correct-key face when the letter is small (keyboard keys are 14px). */
  sageSmall: "#677050",
  /** Wordle wrong-spot. Same gold-dark ochre as the app token, dark ink so letters clear 4.5:1. */
  ochre: "#E6A800",
  ochreInk: "#1E2128",
};

const KEY_BOX = {
  flex: "1 1 0",
  maxWidth: 38,
  minWidth: 0,
  height: 38,
  borderRadius: 10,
  fontSize: 14,
  fontFamily: "inherit",
};

const lin = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function relativeLuminance(hex) {
  const raw = String(hex || "").trim().replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n) || full.length < 6) return 0;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(fg, bg) {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** White, cream, and the light subtle chip. Dark tiles and keys must not use these fills. */
export function isWhiteOrCreamFill(hex) {
  const raw = String(hex || "").trim().toLowerCase();
  if (!raw || raw === "transparent") return false;
  if (raw === "white" || raw === "#fff" || raw === "#ffffff") return true;
  const lum = relativeLuminance(raw.startsWith("#") ? raw : `#${raw}`);
  return lum >= 0.8;
}

const pickedStatus = (status) => status === "correct" || status === "wrong" || status === "absent" || status === "used" || status === "present";

/** One key face. `light` carries the live D tokens so light mode stays on today's chip. */
export function spanishKeyboardKeyStyle({
  theme = "light",
  status = "idle",
  disabled = false,
  light = {},
} = {}) {
  const wasPicked = pickedStatus(status);
  const hit = status === "correct";
  const cursor = wasPicked || disabled ? "default" : "pointer";
  if (theme !== "dark") {
    const { line, green, greenDark, red, redDark, okBg, okText, badBg, badText } = light;
    return {
      ...KEY_BOX,
      border: `2px solid ${wasPicked ? (hit ? green : red) : line}`,
      borderBottom: `4px solid ${wasPicked ? (hit ? greenDark : redDark) : line}`,
      background: wasPicked ? (hit ? okBg : badBg) : "#fff",
      color: wasPicked ? (hit ? okText : badText) : green,
      fontWeight: 800,
      cursor,
    };
  }
  const card = light.card || SPANISH_KEYBOARD.card;
  const line = light.line || SPANISH_KEYBOARD.line;
  const cream = light.cream || SPANISH_KEYBOARD.cream;
  const muted = light.muted || SPANISH_KEYBOARD.muted;
  let background = card;
  let color = cream;
  let fontWeight = 800;
  if (status === "correct") {
    background = SPANISH_KEYBOARD.sageSmall;
    color = cream;
    fontWeight = 900;
  } else if (status === "wrong" || status === "absent" || status === "used") {
    background = card;
    color = muted;
  } else if (status === "present") {
    background = light.ochre || SPANISH_KEYBOARD.ochre;
    color = light.ochreInk || SPANISH_KEYBOARD.ochreInk;
  }
  return {
    ...KEY_BOX,
    border: `2px solid ${line}`,
    borderBottom: `4px solid ${line}`,
    background,
    color,
    fontWeight,
    cursor,
  };
}

/** Outline Games button in dark mode. Light mode keeps the Btn outline chip. */
export function darkGamesButtonStyle({
  card = SPANISH_KEYBOARD.card,
  line = SPANISH_KEYBOARD.line,
  cream = SPANISH_KEYBOARD.cream,
} = {}) {
  return {
    background: card,
    color: cream,
    border: `2px solid ${line}`,
    borderBottom: `4px solid ${line}`,
  };
}

/** Jeopardy category and value tiles. Light returns today's terracotta/cream chip. */
export function boardTilePaint({
  theme = "light",
  role = "value",
  used = false,
  light = {},
} = {}) {
  const terracotta = "#C46B3A";
  const cream = light.cream ?? SPANISH_KEYBOARD.cream;
  if (theme !== "dark") {
    if (role === "category") {
      return { border: `2px solid ${terracotta}`, background: cream, color: light.mark };
    }
    const edge = used ? light.line : terracotta;
    return {
      border: `2px solid ${edge}`,
      borderBottom: `5px solid ${edge}`,
      background: used ? light.subtle : cream,
      color: used ? light.sub : terracotta,
    };
  }
  const edge = light.line || SPANISH_KEYBOARD.line;
  const paint = {
    border: `2px solid ${edge}`,
    background: light.card || SPANISH_KEYBOARD.card,
    color: used ? (light.muted || light.sub || SPANISH_KEYBOARD.muted) : cream,
  };
  if (role === "value") paint.borderBottom = `5px solid ${edge}`;
  return paint;
}
