import { ANNUAL_PRICE_PLACEHOLDER, PAYWALL_ANNUAL_HOLD_GAP, annualPriceLine } from "./webPaywall.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(ANNUAL_PRICE_PLACEHOLDER == null, "the price placeholder starts empty");
assert(annualPriceLine("{price} a year") == null, "the default placeholder renders no price line");
assert(annualPriceLine("{price} a year", null) == null, "null hides the English price line");
assert(annualPriceLine("{price} al año", null) == null, "null hides the Spanish price line");
assert(annualPriceLine("{price} a year", "") == null, "an empty string hides the English price line");
assert(annualPriceLine("{price} al año", "   ") == null, "blank space hides the Spanish price line");

assert(annualPriceLine("{price} a year", "$39.99") === "$39.99 a year", "a set price fills the English line");
assert(annualPriceLine("{price} al año", "$39.99") === "$39.99 al año", "a set price fills the Spanish line");
assert(!String(annualPriceLine("{price} a year", "$39.99")).includes("{price}"), "the placeholder token is replaced");
assert(annualPriceLine("{price} a year", "[ANNUAL PRICE]") === "[ANNUAL PRICE] a year", "a set token still uses the locked template");

assert(PAYWALL_ANNUAL_HOLD_GAP === 8, "the post-tap line sits 8px under annual");

console.log("webPaywall.test.js ok");
