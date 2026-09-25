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

assert(DISCLOSURE.en[0] === "Ándale Premium is an auto-renewing subscription.", "EN disclosure title line");
assert(DISCLOSURE.en[1] === "One year: $39.99 per year (about $3.33 a month). One month: $6.99 per month.", "EN disclosure price line");
assert(DISCLOSURE.en[2] === "Payment is charged to your Apple ID when you confirm your purchase. Your subscription renews automatically unless you cancel at least 24 hours before the current period ends. Your account is charged for the renewal within the 24 hours before the period ends. You can manage or cancel anytime in Settings > Apple ID > Subscriptions.", "EN disclosure renew line");
assert(DISCLOSURE.es[0] === "Ándale Premium es una suscripción con renovación automática.", "ES disclosure title line");
assert(DISCLOSURE.es[1] === "Un año: $39.99 al año (unos $3.33 al mes). Un mes: $6.99 al mes.", "ES disclosure price line");
assert(DISCLOSURE.es[2] === "El pago se carga a tu ID de Apple al confirmar la compra. La suscripción se renueva sola a menos que la canceles al menos 24 horas antes de que termine el periodo actual. El cargo de la renovación se hace dentro de las 24 horas previas al fin del periodo. Puedes administrarla o cancelarla cuando quieras en Ajustes > ID de Apple > Suscripciones.", "ES disclosure renew line");

assert(DISCLOSURE_LINKS.en.terms === "Terms of Use" && DISCLOSURE_LINKS.en.privacy === "Privacy Policy" && DISCLOSURE_LINKS.en.restore === "Restore Purchases", "EN legal labels");
assert(DISCLOSURE_LINKS.es.terms === "Términos de uso" && DISCLOSURE_LINKS.es.privacy === "Política de privacidad" && DISCLOSURE_LINKS.es.restore === "Restaurar compras", "ES legal labels");

assert(disclosureLines("en").join("\n") === DISCLOSURE.en.join("\n"), "EN fallback is the locked text");
assert(disclosureLines("es").join("\n") === DISCLOSURE.es.join("\n"), "ES fallback is the locked text");
assert(disclosureLines("en", { annual: "$39.99", monthly: "$6.99" }).join("\n") === DISCLOSURE.en.join("\n"), "matching displayPrice keeps the locked text");
assert(planPriceLine("annual", "en", null) === "$39.99 / year", "null displayPrice uses the EN annual lock");
assert(planPriceLine("monthly", "es", "") === "$6.99 al mes", "blank displayPrice uses the ES monthly lock");
assert(planPriceLine("annual", "en", "$39.99") === "$39.99 / year", "same displayPrice keeps the locked subline");

const swapped = disclosureLines("en", { annual: "€39.99", monthly: "€6.99" });
assert(swapped[0] === DISCLOSURE.en[0], "title line stays when the price changes");
assert(swapped[1] === "One year: €39.99 per year. One month: €6.99 per month.", "annual displayPrice replaces the billed amount and drops the equivalent");
assert(!swapped[1].includes("$3.33"), "equivalent stays out when the annual price changed");
assert(swapped[2] === DISCLOSURE.en[2], "renew line stays when the price changes");
assert(planPriceLine("annual", "en", "€39.99") === "€39.99 / year", "EN subline uses displayPrice");
assert(planPriceLine("monthly", "es", "€6.99") === "€6.99 al mes", "ES subline uses displayPrice");

const esSwapped = disclosureLines("es", { annual: "€39.99" });
assert(esSwapped[1] === "Un año: €39.99 al año. Un mes: $6.99 al mes.", "ES drops the equivalent and keeps the locked monthly amount");
assert(disclosureLines("en").every((line) => !DISCLOSURE.es.some((es) => es === line)), "EN lines are not the ES lines");

assert(RESTORE_STATUS.en.success === "Purchases restored.", "EN restore success");
assert(RESTORE_STATUS.en.empty === "No purchases to restore on this Apple ID.", "EN restore empty");
assert(RESTORE_STATUS.en.failure === "Couldn't reach the App Store. Try again.", "EN restore failure");
assert(RESTORE_STATUS.es.success === "Compras restauradas.", "ES restore success");
assert(RESTORE_STATUS.es.empty === "No hay compras que restaurar en este ID de Apple.", "ES restore empty");
assert(RESTORE_STATUS.es.failure === "No se pudo conectar con la App Store. Inténtalo de nuevo.", "ES restore failure");
assert(restoreStatusKey({ status: "success", charged: true }) === "success", "charged restore is success");
assert(restoreStatusKey({ status: "failure", charged: false, reason: "nothing_to_restore" }) === "empty", "nothing_to_restore is the empty line");
assert(restoreStatusKey({ status: "failure", charged: false, reason: "web_no_iap" }) === "failure", "web restore is the failure line");
assert(restoreStatusKey({ status: "failure", charged: false, reason: "storekit_failure" }) === "failure", "store failure is the failure line");
assert(restoreStatusLine("en", "success") === RESTORE_STATUS.en.success && restoreStatusLine("es", "empty") === RESTORE_STATUS.es.empty, "restore line follows uiLang");
assert(restoreStatusLine("en", "failure") !== restoreStatusLine("es", "failure"), "restore failure is one language");

console.log("paywallDisclosure.test.js: ok");
