import { ANNUAL_PRICE_PLACEHOLDER, LOCKED_STORY_PAYWALL, PAYWALL_ANNUAL_HOLD_GAP, PAYWALL_FREE_GAP, PAYWALL_FREE_LINE_GAP, PAYWALL_FREE_LINE_SIZE, PAYWALL_MONTHLY_GAP, annualPriceLine } from "./webPaywall.js";

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
assert(PAYWALL_MONTHLY_GAP === 12, "monthly sits 12px under annual");
assert(PAYWALL_FREE_GAP === 12, "Continue free sits 12px under monthly");
assert(PAYWALL_FREE_LINE_GAP === 8, "the free line sits 8px under Continue free");
assert(PAYWALL_FREE_LINE_SIZE === 11, "the free line is two steps down from 13.5");

console.log("webPaywall.test.js ok");

{
  const m = await import("./webPaywall.js");
  assert(m.PAYWALL_STILL_HEIGHT === 140 && m.PAYWALL_BIRD_SIZE === 48, "still is 140px with a 48px bird");
  assert(m.PAYWALL_LIME === "#58CC02" && m.PAYWALL_ANNUAL_HEIGHT === 96 && m.PAYWALL_MONTHLY_HEIGHT === 64, "annual card is lime 96px; monthly is 64px");
}
// Large-zoom paywall: the card scrolls only when it overflows, and the still hides only when the price can't sit above the fold.
{
  const m = await import("./webPaywall.js");
  const fs = await import("node:fs");
  const app = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  assert(m.paywallStillShouldHide({ priceBottom: 290, fold: 294 }) === false, "price above the fold: keep the still");
  assert(m.paywallStillShouldHide({ priceBottom: 294.4, fold: 294 }) === false, "sub-pixel: keep the still");
  assert(m.paywallStillShouldHide({ priceBottom: 400, fold: 294 }) === true, "price below the fold at large zoom: hide the still");
  assert(m.paywallStillShouldHide({}) === false && m.paywallStillShouldHide({ priceBottom: 400, fold: 0 }) === false, "no layout: keep the still");
  assert(!/data-testid="soft-paywall-card"[^\n]*overflowY/.test(app), "the card does not scroll by default; 100% layout is today's");
  assert(app.includes('if (card.scrollHeight - card.clientHeight > 1) card.style.overflowY = "auto";'), "scroll turns on only when the content is taller than the card");
  assert(app.includes('frame.style.display = "flex";'), "every fit starts with the still shown and centered");
  assert(app.includes('if (paywallStillShouldHide({ priceBottom, fold: card.clientHeight })) frame.style.display = "none";'), "the still hides only when the price can't fit");
}
