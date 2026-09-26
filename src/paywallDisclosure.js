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

export const DISCLOSURE = Object.freeze({
  en: Object.freeze([
    "Ándale Premium is an auto-renewing subscription.",
    "One year: $39.99 per year (about $3.33 a month). One month: $6.99 per month.",
    "Payment is charged to your Apple ID when you confirm your purchase. Your subscription renews automatically unless you cancel at least 24 hours before the current period ends. Your account is charged for the renewal within the 24 hours before the period ends. You can manage or cancel anytime in Settings > Apple ID > Subscriptions.",
  ]),
  es: Object.freeze([
    "Ándale Premium es una suscripción con renovación automática.",
    "Un año: $39.99 al año (unos $3.33 al mes). Un mes: $6.99 al mes.",
    "El pago se carga a tu ID de Apple al confirmar la compra. La suscripción se renueva sola a menos que la canceles al menos 24 horas antes de que termine el periodo actual. El cargo de la renovación se hace dentro de las 24 horas previas al fin del periodo. Puedes administrarla o cancelarla cuando quieras en Ajustes > ID de Apple > Suscripciones.",
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

const ANNUAL_EQUIV = Object.freeze({
  en: " (about $3.33 a month)",
  es: " (unos $3.33 al mes)",
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

/** Button subline. Locked string unless StoreKit sent a different displayPrice. */
export function planPriceLine(plan, lang, displayPrice) {
  const code = uiCode(lang);
  const locked = PLAN_PRICE_LINE[code][plan];
  const price = storePrice(displayPrice);
  if (!price || price === LOCKED_DISPLAY_PRICE[plan]) return locked || "";
  if (plan === "annual") return code === "en" ? `${price} / year` : `${price} al año`;
  if (plan === "monthly") return code === "en" ? `${price} / month` : `${price} al mes`;
  return locked || "";
}

/**
 * One language of section (a). displayPrice replaces $39.99 / $6.99.
 * The $3.33 equivalent drops when the annual display price is not the locked amount.
 */
export function disclosureLines(lang, prices = {}) {
  const code = uiCode(lang);
  const annual = storePrice(prices.annual) || LOCKED_DISPLAY_PRICE.annual;
  const monthly = storePrice(prices.monthly) || LOCKED_DISPLAY_PRICE.monthly;
  return DISCLOSURE[code].map((line) => {
    let next = line;
    if (annual !== LOCKED_DISPLAY_PRICE.annual) {
      next = next.replace(ANNUAL_EQUIV[code], "").split(LOCKED_DISPLAY_PRICE.annual).join(annual);
    }
    if (monthly !== LOCKED_DISPLAY_PRICE.monthly) {
      next = next.split(LOCKED_DISPLAY_PRICE.monthly).join(monthly);
    }
    return next;
  });
}
