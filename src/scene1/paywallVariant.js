/** Which paywall copy Scene 1 shows: A right after the first spoken exchange,
 *  B once the learner has been back for three local calendar days
 *  (noface-scene1-copy.md). `?paywallVariant=a` / `=b` is a manual test
 *  switch — it skips the day math entirely so Paywall B can be QAed without
 *  waiting three real days or faking `andale-scene1-first-seen`. */

import { learnerDayNumber } from "../paywallTrigger.js";

export const SCENE1_PAYWALL_VARIANT_PARAM = "paywallVariant";
export const SCENE1_PAYWALL_B_DAY = 3;

function parseVariantOverride(value) {
  const v = String(value || "").toLowerCase();
  if (v === "a") return "A";
  if (v === "b") return "B";
  return null;
}

/** Reads just the override, or null if absent/invalid. Falls back to
 *  `window.location.search` when `search` isn't a string, same as
 *  today.js's `?date=` override. */
export function scene1PaywallVariantOverride(search) {
  const query = typeof search === "string" ? search : (typeof window !== "undefined" ? window.location.search : "");
  let params;
  try {
    params = new URLSearchParams(query || "");
  } catch {
    return null;
  }
  return parseVariantOverride(params.get(SCENE1_PAYWALL_VARIANT_PARAM));
}

/**
 * `firstSeenKey` / `todayKey` are local YYYY-MM-DD day keys (dayKeyFromDate).
 * The override wins over the day math when present.
 */
export function scene1PaywallVariant({ firstSeenKey, todayKey, search } = {}) {
  const override = scene1PaywallVariantOverride(search);
  if (override) return override;
  const day = learnerDayNumber(firstSeenKey, todayKey);
  return day >= SCENE1_PAYWALL_B_DAY ? "B" : "A";
}
