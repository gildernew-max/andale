/** Second-row keys → TAP AN ANSWER / blank-choice chips, in order.
 *  Invisible keyboard map (Dave / Hand). No chrome. */
export const CHOICE_CHIP_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];

export function choiceChipIndexForKey(key) {
  const i = CHOICE_CHIP_KEYS.indexOf(key);
  return i < 0 ? null : i;
}

export function choiceChipKeyForIndex(i) {
  return CHOICE_CHIP_KEYS[i] ?? null;
}
