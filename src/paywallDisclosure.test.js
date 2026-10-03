import {
  DISCLOSURE,
  DISCLOSURE_LINKS,
  LOCKED_DISPLAY_PRICE,
  PLAN_PRICE_LINE,
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
  RESTORE_STATUS,
  disclosureLines,
  planPriceLine,
  restoreStatusKey,
  restoreStatusLine,
} from "./paywallDisclosure.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(TERMS_OF_USE_URL === "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/", "terms URL is Apple's standard EULA");
assert(PRIVACY_POLICY_URL === "https://gildernew-max.github.io/andale/privacy.html", "privacy URL is the ASC page");
assert(LOCKED_DISPLAY_PRICE.annual === "$39.99" && LOCKED_DISPLAY_PRICE.monthly === "$6.99", "locked billed amounts");

assert(PLAN_PRICE_LINE.en.annual === "$39.99 / year", "EN annual subline");
assert(PLAN_PRICE_LINE.en.monthly === "$6.99 / month", "EN monthly subline");
assert(PLAN_PRICE_LINE.es.annual === "$39.99 al año", "ES annual subline");
assert(PLAN_PRICE_LINE.es.monthly === "$6.99 al mes", "ES monthly subline");

const EN_LEAD = "Ándale Premium is an auto-renewing subscription: one year at $39.99 or one month at $6.99.";
const EN_RENEW = "Payment is charged to your Apple ID when you confirm. It renews automatically at the same price unless you cancel at least 24 hours before the period ends; the renewal is charged within those 24 hours. Manage or cancel in Settings > Apple ID > Subscriptions.";
const ES_LEAD = "Ándale Premium es una suscripción con renovación automática: un año por $39.99 o un mes por $6.99.";
const ES_RENEW = "El pago se carga a tu ID de Apple al confirmar. Se renueva sola al mismo precio, a menos que la canceles al menos 24 horas antes de que termine el periodo; la renovación se cobra dentro de esas 24 horas. Administra o cancela en Ajustes > ID de Apple > Suscripciones.";
assert(DISCLOSURE.en[0] === EN_LEAD, "EN fine print line 1");
assert(DISCLOSURE.en[1] === EN_RENEW, "EN fine print line 2");
assert(DISCLOSURE.en.length === 2, "EN fine print is two lines");
assert(DISCLOSURE.es[0] === ES_LEAD, "ES fine print line 1");
assert(DISCLOSURE.es[1] === ES_RENEW, "ES fine print line 2");
assert(DISCLOSURE.es.length === 2, "ES fine print is two lines");
assert(!DISCLOSURE.en.join(" ").includes("$3.33") && !DISCLOSURE.es.join(" ").includes("$3.33"), "the monthly breakdown is cut");

assert(DISCLOSURE_LINKS.en.terms === "Terms of Use" && DISCLOSURE_LINKS.en.privacy === "Privacy Policy" && DISCLOSURE_LINKS.en.restore === "Restore Purchases", "EN legal labels");
assert(DISCLOSURE_LINKS.es.terms === "Términos de uso" && DISCLOSURE_LINKS.es.privacy === "Política de privacidad" && DISCLOSURE_LINKS.es.restore === "Restaurar compras", "ES legal labels");

assert(disclosureLines("en").join("\n") === DISCLOSURE.en.join("\n"), "EN fallback is the locked text");
assert(disclosureLines("es").join("\n") === DISCLOSURE.es.join("\n"), "ES fallback is the locked text");
assert(disclosureLines("en", { annual: "$39.99", monthly: "$6.99" }).join("\n") === DISCLOSURE.en.join("\n"), "matching displayPrice keeps the locked text");
assert(planPriceLine("annual", "en", null) === "$39.99 / year", "null displayPrice uses the EN annual lock");
assert(planPriceLine("monthly", "es", "") === "$6.99 al mes", "blank displayPrice uses the ES monthly lock");
assert(planPriceLine("annual", "en", "$39.99") === "$39.99 / year", "same displayPrice keeps the locked subline");

const buttonAmount = (line) => line.split(" ")[0];
for (const lang of ["en", "es"]) {
  const lines = disclosureLines(lang);
  const annual = buttonAmount(planPriceLine("annual", lang));
  const monthly = buttonAmount(planPriceLine("monthly", lang));
  assert(lines[0].includes(annual) && lines[0].includes(monthly), `${lang} fine print prices equal the button prices`);
  assert(annual === LOCKED_DISPLAY_PRICE.annual && monthly === LOCKED_DISPLAY_PRICE.monthly, `${lang} locked button amount is the fine-print amount`);
}
assert(disclosureLines("en")[0] === EN_LEAD && disclosureLines("en")[1] === EN_RENEW, "EN rendered fine print matches George");
assert(disclosureLines("es")[0] === ES_LEAD && disclosureLines("es")[1] === ES_RENEW, "ES rendered fine print matches George");

const swapped = disclosureLines("en", { annual: "€39.99", monthly: "€6.99" });
assert(swapped[0] === "Ándale Premium is an auto-renewing subscription: one year at €39.99 or one month at €6.99.", "StoreKit amounts replace both fine-print prices");
assert(swapped[0].includes(buttonAmount(planPriceLine("annual", "en", "€39.99"))), "EN fine print annual equals the button amount");
assert(swapped[0].includes(buttonAmount(planPriceLine("monthly", "en", "€6.99"))), "EN fine print monthly equals the button amount");
assert(!swapped.join(" ").includes("$3.33"), "equivalent stays out");
assert(swapped[1] === DISCLOSURE.en[1], "renew line stays when the price changes");
assert(planPriceLine("annual", "en", "€39.99") === "€39.99 / year", "EN subline uses displayPrice");
assert(planPriceLine("monthly", "es", "€6.99") === "€6.99 al mes", "ES subline uses displayPrice");

const esSwapped = disclosureLines("es", { annual: "€39.99" });
assert(esSwapped[0] === "Ándale Premium es una suscripción con renovación automática: un año por €39.99 o un mes por $6.99.", "ES swaps the annual amount and keeps the locked monthly amount");
assert(esSwapped[0].includes(buttonAmount(planPriceLine("annual", "es", "€39.99"))), "ES fine print annual equals the button amount");
assert(esSwapped[0].includes(buttonAmount(planPriceLine("monthly", "es"))), "ES fine print monthly equals the locked button amount");
assert(disclosureLines("en").every((line) => !DISCLOSURE.es.some((es) => es === line)), "EN lines are not the ES lines");

assert(RESTORE_STATUS.en.success === "Purchases restored.", "EN restore success");
assert(RESTORE_STATUS.en.empty === "No purchases to restore on this Apple ID.", "EN restore empty");
assert(RESTORE_STATUS.en.failure === "Couldn't reach the App Store. Try again.", "EN restore failure");
assert(RESTORE_STATUS.en.web === "Restore works in the iPhone app.", "EN web restore");
assert(RESTORE_STATUS.es.success === "Compras restauradas.", "ES restore success");
assert(RESTORE_STATUS.es.empty === "No hay compras que restaurar en este ID de Apple.", "ES restore empty");
assert(RESTORE_STATUS.es.failure === "No se pudo conectar con la App Store. Inténtalo de nuevo.", "ES restore failure");
assert(RESTORE_STATUS.es.web === "Restaurar compras funciona en la app para iPhone.", "ES web restore");
assert(restoreStatusKey({ status: "success", charged: true }) === "success", "charged restore is success");
assert(restoreStatusKey({ status: "failure", charged: false, reason: "nothing_to_restore" }) === "empty", "nothing_to_restore is the empty line");
assert(restoreStatusKey({ status: "failure", charged: false, reason: "web_no_iap" }) === "web", "web restore is the iPhone-app line");
assert(restoreStatusLine("en", "web") !== RESTORE_STATUS.en.failure && restoreStatusLine("es", "web") !== RESTORE_STATUS.es.failure, "web restore is not the App Store failure line");
assert(restoreStatusKey({ status: "failure", charged: false, reason: "storekit_failure" }) === "failure", "store failure is the failure line");
assert(restoreStatusLine("en", "success") === RESTORE_STATUS.en.success && restoreStatusLine("es", "empty") === RESTORE_STATUS.es.empty, "restore line follows uiLang");
assert(restoreStatusLine("en", "failure") !== restoreStatusLine("es", "failure"), "restore failure is one language");

console.log("paywallDisclosure.test.js: ok");
