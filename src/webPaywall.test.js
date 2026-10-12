import { ANNUAL_PRICE_PLACEHOLDER, LOCKED_STORY_PAYWALL, PAYWALL_ANNUAL_HOLD_GAP, annualPriceLine } from "./webPaywall.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const EN = "$39.99\u00A0a\u00A0year";
const ES = "US$39.99\u00A0al\u00A0año";

assert(LOCKED_STORY_PAYWALL === true, "locked Lectura taps open the paywall");
assert(ANNUAL_PRICE_PLACEHOLDER === "39.99", "the annual amount is one string constant");
assert(annualPriceLine("{price} a year") === EN, "the default amount fills the English line");
assert(annualPriceLine("{price} al año") === ES, "the default amount fills the Spanish line");
assert(annualPriceLine("{price} a year", null) == null, "null hides the English price line");
assert(annualPriceLine("{price} al año", null) == null, "null hides the Spanish price line");
assert(annualPriceLine("{price} a year", "") == null, "an empty string hides the English price line");
assert(annualPriceLine("{price} al año", "   ") == null, "blank space hides the Spanish price line");

assert(annualPriceLine("{price} a year", "$39.99") === EN, "a dollar amount is normalized on the English line");
assert(annualPriceLine("{price} al año", "$39.99") === ES, "Spanish prefixes US$");
assert(annualPriceLine("{price} al año", "US$39.99") === ES, "an existing US$ prefix is not doubled");
assert(!String(annualPriceLine("{price} a year", "$39.99")).includes("{price}"), "the placeholder token is replaced");
assert(annualPriceLine("{price} a year", "[ANNUAL PRICE]") === "[ANNUAL\u00A0PRICE]\u00A0a\u00A0year", "a non-amount token stays and the line still does not split");
assert(annualPriceLine("{price} a year", "8.5") === "$8.5\u00A0a\u00A0year", "English formatting is not hardcoded to 39.99");
assert(annualPriceLine("{price} al año", "8.5") === "US$8.5\u00A0al\u00A0año", "Spanish formatting is not hardcoded to 39.99");

const enLine = annualPriceLine("{price} a year");
const esLine = annualPriceLine("{price} al año");
assert(enLine.charCodeAt(enLine.indexOf("a") - 1) === 0x00A0, "English price keeps a non-breaking space before a");
assert(enLine.charCodeAt(enLine.indexOf("year") - 1) === 0x00A0, "English price keeps a non-breaking space before year");
assert(esLine.charCodeAt(esLine.indexOf("al") - 1) === 0x00A0, "Spanish price keeps a non-breaking space before al");
assert(esLine.charCodeAt(esLine.indexOf("año") - 1) === 0x00A0, "Spanish price keeps a non-breaking space before año");
assert(!enLine.includes(" "), "the English price line has no breaking space");
assert(!esLine.includes(" "), "the Spanish price line has no breaking space");

assert(PAYWALL_ANNUAL_HOLD_GAP === 8, "the post-tap line sits 8px under annual");

console.log("webPaywall.test.js ok");
