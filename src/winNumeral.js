/** Light-mode lesson win-card XP numeral. 4.63:1 on cream #F6EFE4; higher on the white card. */
export const WIN_NUMERAL_LIGHT = "#85672C";

/** Light-mode lesson win-card gem numeral. */
export const WIN_NUMERAL_LIGHT_GEM = "#0F6FA6";

/**
 * Ink for the XP / gem count on a lesson win card, including the count-up.
 * Light: XP uses WIN_NUMERAL_LIGHT, gems use WIN_NUMERAL_LIGHT_GEM.
 * Dark: XP stays palette gold, gems stay palette blue.
 */
export function winNumeralColor(theme, kind, palette) {
  if (theme === "dark") return kind === "gems" ? palette.blue : palette.gold;
  return kind === "gems" ? WIN_NUMERAL_LIGHT_GEM : WIN_NUMERAL_LIGHT;
}
