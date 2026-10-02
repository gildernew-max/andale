/** Light-mode lesson win-card XP and gem numerals. 4.63:1 on cream #F6EFE4; higher on the white card. */
export const WIN_NUMERAL_LIGHT = "#85672C";

/**
 * Ink for the XP / gem count on a lesson win card, including the count-up.
 * Light: both amounts use WIN_NUMERAL_LIGHT.
 * Dark: XP stays palette gold, gems stay palette blue.
 */
export function winNumeralColor(theme, kind, palette) {
  if (theme === "dark") return kind === "gems" ? palette.blue : palette.gold;
  return WIN_NUMERAL_LIGHT;
}
