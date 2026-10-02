/** Guideline 3.1.2 paywall copy. Wording is locked — do not rewrite. */

export const TERMS_OF_USE_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
export const PRIVACY_POLICY_URL = "https://gildernew-max.github.io/andale/privacy.html";

/** Locked billed amounts. StoreKit `displayPrice` replaces these when it loads. */
export const LOCKED_DISPLAY_PRICE = Object.freeze({
  annual: "$39.99",
  monthly: "$6.99",
});

export const PLAN_PRICE_LINE = Object.freeze({
  en: Object.freeze({
    annual: "$39.99 / year",
    monthly: "$6.99 / month",
  }),
  es: Object.freeze({
    annual: "$39.99 al año",
    monthly: "$6.99 al mes",
  }),
});

/** George's trimmed 3.1.2 lines. Prices are filled from LOCKED_DISPLAY_PRICE / StoreKit, same amounts as the plan buttons. */
const FINE_PRINT = Object.freeze({
  en: Object.freeze({
    lead: (annual, monthly) => `Ándale Premium is an auto-renewing subscription: one year at ${annual} or one month at ${monthly}.`,
    renew: "Payment is charged to your Apple ID when you confirm. It renews automatically at the same price unless you cancel at least 24 hours before the period ends; the renewal is charged within those 24 hours. Manage or cancel in Settings > Apple ID > Subscriptions.",
  }),
  es: Object.freeze({
    lead: (annual, monthly) => `Ándale Premium es una suscripción con renovación automática: un año por ${annual} o un mes por ${monthly}.`,
    renew: "El pago se carga a tu ID de Apple al confirmar. Se renueva sola al mismo precio, a menos que la canceles al menos 24 horas antes de que termine el periodo; la renovación se cobra dentro de esas 24 horas. Administra o cancela en Ajustes > ID de Apple > Suscripciones.",
  }),
});

export const DISCLOSURE = Object.freeze({
  en: Object.freeze([
    FINE_PRINT.en.lead(LOCKED_DISPLAY_PRICE.annual, LOCKED_DISPLAY_PRICE.monthly),
    FINE_PRINT.en.renew,
  ]),
  es: Object.freeze([
    FINE_PRINT.es.lead(LOCKED_DISPLAY_PRICE.annual, LOCKED_DISPLAY_PRICE.monthly),
    FINE_PRINT.es.renew,
  ]),
});

export const DISCLOSURE_LINKS = Object.freeze({
  en: Object.freeze({
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    restore: "Restore Purchases",
  }),
  es: Object.freeze({
    terms: "Términos de uso",
    privacy: "Política de privacidad",
    restore: "Restaurar compras",
  }),
});

/** One line under the footer after a Restore tap. Wording is locked. */
export const RESTORE_STATUS = Object.freeze({
  en: Object.freeze({
    success: "Purchases restored.",
    empty: "No purchases to restore on this Apple ID.",
    failure: "Couldn't reach the App Store. Try again.",
    web: "Restore works in the iPhone app.",
  }),
  es: Object.freeze({
    success: "Compras restauradas.",
    empty: "No hay compras que restaurar en este ID de Apple.",
    failure: "No se pudo conectar con la App Store. Inténtalo de nuevo.",
    web: "Restaurar compras funciona en la app para iPhone.",
  }),
});

function uiCode(lang) {
  return lang === "en" ? "en" : "es";
}

/** success, nothing_to_restore, web (no store), or a store failure. */
export function restoreStatusKey(result) {
  if (result?.status === "success" && result?.charged) return "success";
  if (result?.reason === "nothing_to_restore") return "empty";
  if (result?.reason === "web_no_iap") return "web";
  return "failure";
}

export function restoreStatusLine(lang, key) {
  const face = RESTORE_STATUS[uiCode(lang)];
  return face[key] || face.failure;
}

function storePrice(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Billed amount for a plan. StoreKit displayPrice wins; otherwise the locked amount the buttons use. */
export function billedAmount(plan, displayPrice) {
  return storePrice(displayPrice) || LOCKED_DISPLAY_PRICE[plan] || "";
}

/** Button subline. Locked string unless StoreKit sent a different displayPrice. */
export function planPriceLine(plan, lang, displayPrice) {
  const code = uiCode(lang);
  const locked = PLAN_PRICE_LINE[code][plan];
  const price = billedAmount(plan, displayPrice);
  if (!price || price === LOCKED_DISPLAY_PRICE[plan]) return locked || "";
  if (plan === "annual") return code === "en" ? `${price} / year` : `${price} al año`;
  if (plan === "monthly") return code === "en" ? `${price} / month` : `${price} al mes`;
  return locked || "";
}

/** One language of the trimmed 3.1.2 fine print. Amounts come from billedAmount, same as the plan buttons. */
export function disclosureLines(lang, prices = {}) {
  const code = uiCode(lang);
  const face = FINE_PRINT[code];
  const annual = billedAmount("annual", prices.annual);
  const monthly = billedAmount("monthly", prices.monthly);
  return [face.lead(annual, monthly), face.renew];
}
