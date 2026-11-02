import { SCENE1_PAYWALL_VARIANT_PARAM, scene1PaywallVariant, scene1PaywallVariantOverride } from "./paywallVariant.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

// Day 1 (same day) and day 2 are Paywall A.
assert(scene1PaywallVariant({ firstSeenKey: "2026-10-01", todayKey: "2026-10-01" }) === "A", "day 1 is Paywall A");
assert(scene1PaywallVariant({ firstSeenKey: "2026-10-01", todayKey: "2026-10-02" }) === "A", "day 2 is Paywall A");

// Day 3+ is Paywall B.
assert(scene1PaywallVariant({ firstSeenKey: "2026-10-01", todayKey: "2026-10-03" }) === "B", "day 3 is Paywall B");
assert(scene1PaywallVariant({ firstSeenKey: "2026-10-01", todayKey: "2026-10-10" }) === "B", "day 10 is still Paywall B");

// Missing/invalid keys fall back to day 1, Paywall A.
assert(scene1PaywallVariant({}) === "A", "missing keys default to Paywall A");

// The test switch overrides the day math in both directions.
assert(scene1PaywallVariant({ firstSeenKey: "2026-10-01", todayKey: "2026-10-10", search: "?paywallVariant=a" }) === "A", "?paywallVariant=a forces A even on day 10");
assert(scene1PaywallVariant({ firstSeenKey: "2026-10-01", todayKey: "2026-10-01", search: "?paywallVariant=b" }) === "B", "?paywallVariant=b forces B even on day 1");
assert(scene1PaywallVariant({ search: "?paywallVariant=B" }) === "B", "the override is case-insensitive");

// Garbage or unrelated params fall back to the day math.
assert(scene1PaywallVariantOverride("?paywallVariant=banana") === null, "a non a/b value is not a valid override");
assert(scene1PaywallVariantOverride("?scene1=1") === null, "unrelated params are not an override");
assert(SCENE1_PAYWALL_VARIANT_PARAM === "paywallVariant", "the query param name is stable for QA links");

console.log("scene1/paywallVariant.test.js: ok");
