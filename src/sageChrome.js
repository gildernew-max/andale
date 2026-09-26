/** Sage chrome for the Games hub, Memory matches, and the light keyboard accents.
 *  Bright CHECK lime (#58CC02 and its chip family) stays on primary buttons.
 *  These surfaces use the Cubetas sage family instead.
 */

export const SAGE = {
  /** Light Games card border. */
  cardBorder: "#B8C0A0",
  /** Light Games lip, focus ring, keyboard ink, Memory edge. */
  sage: "#6F7757",
  /** Dark Games lip and dark Memory match fill. Cream on this face is 4.58:1. */
  sageSmall: "#677050",
  /** Dark Games card border. */
  darkLine: "#2A2E36",
  /** Dark Games focus ring and dark bucket body. */
  sageLight: "#B8C0A0",
  /** Dark active letter-slot underline. Reads on the dark page. */
  slotDark: "#B8C0A0",
  tileLight: "#F6EFE4",
  tileDark: "#1E2128",
  terracotta: "#C46B3A",
  matchFill: "#EEF0E6",
  /** Big word on a light matched Memory card. 6.40:1 on matchFill. */
  matchWord: "#4F5A36",
  /** Translation line on a light matched Memory card. 5.22:1 on matchFill. */
  matchGloss: "#5E6650",
  /** Darker edge so the dark matched lip reads against the sage fill. */
  matchDarkEdge: "#4F5A36",
  cream: "#F6EFE4",
  /** White ink on sage fills. 4.72:1 on #6F7757. Cream is 4.13 and misses 4.5. */
  onSage: "#FFFFFF",
};

/** #58CC02 family: the bright token, its pressed edge, the chip ink, and the chip wash. */
export const BRIGHT_GREEN = /#(?:58cc02|46a302|58a700|d7ffb8)\b|rgb\(\s*88\s*,\s*204\s*,\s*2\s*\)|rgb\(\s*70\s*,\s*163\s*,\s*2\s*\)|rgb\(\s*88\s*,\s*167\s*,\s*0\s*\)|rgb\(\s*215\s*,\s*255\s*,\s*184\s*\)/i;

/** Pink and red key fills and letters. Wordle and Hangman keys must not use these. */
export const PINK_OR_RED = /#(?:ffdfe0|ff4b4b|ea2b2b|ff6b6b|ff8c8c|fff1f1)\b|rgb\(\s*255\s*,\s*223\s*,\s*224\s*\)|rgb\(\s*255\s*,\s*75\s*,\s*75\s*\)|rgb\(\s*234\s*,\s*43\s*,\s*43\s*\)|rgb\(\s*255\s*,\s*107\s*,\s*107\s*\)|rgb\(\s*255\s*,\s*140\s*,\s*140\s*\)|rgb\(\s*255\s*,\s*241\s*,\s*241\s*\)/i;

/** Games hub cards. Fill stays the caller's card color. Lip thickness stays 5px. */
export function gamesHubCardChrome(theme = "light") {
  if (theme === "dark") {
    return {
      border: `2px solid ${SAGE.darkLine}`,
      borderBottom: `5px solid ${SAGE.sageSmall}`,
    };
  }
  return {
    border: `2px solid ${SAGE.cardBorder}`,
    borderBottom: `5px solid ${SAGE.sage}`,
  };
}

export function gamesHubFocusColor(theme = "light") {
  return theme === "dark" ? SAGE.sageLight : SAGE.sage;
}

/** Bucket tile on the Games hub. Same box as the other four marks. */
export function bucketTileStyle(theme = "light") {
  return {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: theme === "dark" ? SAGE.tileDark : SAGE.tileLight,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: `2px solid ${SAGE.terracotta}`,
    borderBottom: `4px solid ${SAGE.terracotta}`,
  };
}

export function bucketBodyColor(theme = "light") {
  return theme === "dark" ? SAGE.sageLight : SAGE.sage;
}

/** Light matched cards are the sage wash. Dark matched cards stay sage-small with cream. */
export function memoryCardPaint({
  theme = "light",
  matched = false,
  wrong = false,
  faceUp = false,
  kind = "word",
  wrongBorder = "#FF4B4B",
  wrongLip = "#EA2B2B",
  wrongFill = "#FFF1F1",
  wrongInk = "#EA2B2B",
  ink = "#3C3C3C",
} = {}) {
  if (wrong) {
    return {
      border: `2px solid ${wrongBorder}`,
      borderBottom: `4px solid ${wrongLip}`,
      background: wrongFill,
      color: wrongInk,
    };
  }
  if (matched) {
    if (theme === "dark") {
      return {
        border: `2px solid ${SAGE.matchDarkEdge}`,
        borderBottom: `4px solid ${SAGE.matchDarkEdge}`,
        background: SAGE.sageSmall,
        color: SAGE.cream,
      };
    }
    return {
      border: `2px solid ${SAGE.sage}`,
      borderBottom: `4px solid ${SAGE.sage}`,
      background: SAGE.matchFill,
      color: kind === "meaning" ? SAGE.matchGloss : SAGE.matchWord,
    };
  }
  return {
    border: `2px solid ${SAGE.terracotta}`,
    borderBottom: `4px solid ${SAGE.terracotta}`,
    background: faceUp ? "#fff" : SAGE.tileLight,
    color: ink,
  };
}

/** Wordle Enter and backspace. Light fill is sage, label and icon are white. Shape stays the unused key. */
export function wordleActionKeyChrome(theme = "light", base = {}) {
  if (theme === "dark") return base;
  return {
    ...base,
    background: SAGE.sage,
    color: SAGE.onSage,
  };
}

/** Light Ahorcado end card. Dark keeps darkHangmanEndCardStyle. */
export function hangmanLightEndChrome() {
  return {
    background: SAGE.matchFill,
    border: `2px solid ${SAGE.sage}`,
    borderBottom: `4px solid ${SAGE.sage}`,
    title: SAGE.matchWord,
    quiet: SAGE.matchGloss,
  };
}

/** Letter-slot underline. Active light slot is sage. Empty light slots are the pale sage. Thickness stays with the caller. */
export function letterSlotUnderline(theme = "light", focused = false, ink = "#3C3C3C", empty = false) {
  if (focused) return theme === "dark" ? SAGE.slotDark : SAGE.sage;
  if (empty && theme !== "dark") return SAGE.sageLight;
  return ink;
}
