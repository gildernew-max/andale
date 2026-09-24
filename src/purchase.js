/** Day-one IAP. Coin owns App Store prices — stubs only, no dollar amounts here. */

import { FUNNEL_EVENTS, emitFunnelEvent } from "./funnel.js";

export const PURCHASE_EVENT = "andale-purchase";
export const WEB_NO_IAP_REASON = "web_no_iap";

/**
 * App Store Connect product IDs. Coin replaces these when membership attaches
 * (case 20000152539159 still gates IPA). Do not invent prices in the app.
 */
export const IAP_PRODUCTS = {
  annual: "com.andale.app.premium.annual",
  monthly: "com.andale.app.premium.monthly",
};

export function productIdForPlan(plan) {
  return IAP_PRODUCTS[plan] || null;
}

export function planForProductId(productId) {
  if (productId === IAP_PRODUCTS.annual) return "annual";
  if (productId === IAP_PRODUCTS.monthly) return "monthly";
  return null;
}

function defaultNativeEnv() {
  if (typeof window !== "undefined" && window.__andaleIapEnv) return window.__andaleIapEnv;
  const C = typeof window !== "undefined" ? window.Capacitor : null;
  if (C && typeof C.isNativePlatform === "function") {
    return { isNative: !!C.isNativePlatform(), platform: C.getPlatform?.() || "" };
  }
  return { isNative: false, platform: "web" };
}

/** StoreKit 2 path is iOS wrap only. Pages / web never charges. */
export function detectNativeIap(env) {
  const e = env || defaultNativeEnv();
  return !!(e.isNative && e.platform === "ios");
}

function eventBus() {
  return typeof window !== "undefined" ? window : null;
}

export function emitPurchaseEvent({ status, plan, productId, reason } = {}, bus = eventBus()) {
  const payload = {
    status: status === "success" ? "success" : "failure",
    charged: status === "success",
    plan: plan || planForProductId(productId) || null,
    productId: productId || productIdForPlan(plan) || null,
    reason: reason || null,
    at: new Date().toISOString(),
  };
  if (bus) {
    bus.__andalePurchaseLog = Array.isArray(bus.__andalePurchaseLog) ? bus.__andalePurchaseLog : [];
    bus.__andalePurchaseLog.push(payload);
    if (typeof bus.dispatchEvent === "function" && typeof CustomEvent === "function") {
      bus.dispatchEvent(new CustomEvent(PURCHASE_EVENT, { detail: payload }));
    }
  }
  return payload;
}

export function progressAfterPurchaseSuccess(prev, { plan, productId } = {}) {
  const resolvedPlan = plan || planForProductId(productId);
  if (!resolvedPlan) return prev;
  return {
    ...prev,
    paywallSeen: true,
    unlockedPrem: true,
    paywallPlan: resolvedPlan,
    iapProductId: productId || productIdForPlan(resolvedPlan),
  };
}

async function capacitorPurchase({ productId }) {
  const { registerPlugin } = await import("@capacitor/core");
  const AndaleIap = registerPlugin("AndaleIap");
  return AndaleIap.purchase({ productId });
}

async function capacitorRestore() {
  const { registerPlugin } = await import("@capacitor/core");
  const AndaleIap = registerPlugin("AndaleIap");
  return AndaleIap.restore();
}

function nativePurchaseFn(deps = {}) {
  if (typeof deps.nativePurchase === "function") return deps.nativePurchase;
  if (typeof window !== "undefined" && typeof window.__andaleNativePurchase === "function") {
    return window.__andaleNativePurchase;
  }
  return capacitorPurchase;
}

function nativeRestoreFn(deps = {}) {
  if (typeof deps.nativeRestore === "function") return deps.nativeRestore;
  if (typeof window !== "undefined" && typeof window.__andaleNativeRestore === "function") {
    return window.__andaleNativeRestore;
  }
  return capacitorRestore;
}

function normalizeNativeResult(result, { plan, productId }) {
  const status = result?.status;
  if (status === "success") {
    const resolvedPlan = plan || planForProductId(result.productId);
    const resolvedId = result.productId || productId;
    emitFunnelEvent({
      event: FUNNEL_EVENTS.purchase,
      plan: resolvedPlan,
      productId: resolvedId,
    });
    return emitPurchaseEvent({
      status: "success",
      plan: resolvedPlan,
      productId: resolvedId,
    });
  }
  const reason = result?.reason
    || (status === "cancelled" ? "user_cancelled" : "storekit_failure");
  return emitPurchaseEvent({
    status: "failure",
    plan,
    productId: result?.productId || productId,
    reason,
  });
}

/**
 * Annual / monthly CTA. Web: failure + web_no_iap, no unlock, no charge.
 * Native iOS: StoreKit 2 via AndaleIap. Success is the only unlock write.
 */
export async function requestPurchase(plan, deps = {}) {
  const productId = productIdForPlan(plan);
  if (!productId) {
    return emitPurchaseEvent({ status: "failure", plan, reason: "unknown_plan" });
  }
  if (!detectNativeIap(deps.env)) {
    return emitPurchaseEvent({
      status: "failure",
      plan,
      productId,
      reason: WEB_NO_IAP_REASON,
    });
  }
  try {
    const result = await nativePurchaseFn(deps)({ productId, plan });
    return normalizeNativeResult(result, { plan, productId });
  } catch (err) {
    return emitPurchaseEvent({
      status: "failure",
      plan,
      productId,
      reason: err?.message || "storekit_failure",
    });
  }
}

/** Quiet restore on native launch. Web is a no-op — does not fake a charge or emit.
 *  Restore stays on the purchase bus. The funnel purchase event is StoreKit purchase success only.
 */
export async function restorePurchases(deps = {}) {
  if (!detectNativeIap(deps.env)) {
    return { status: "failure", charged: false, reason: WEB_NO_IAP_REASON };
  }
  try {
    const result = await nativeRestoreFn(deps)();
    if (result?.status === "success") {
      return emitPurchaseEvent({
        status: "success",
        plan: planForProductId(result.productId),
        productId: result.productId,
        reason: "restore",
      });
    }
    return {
      status: "failure",
      charged: false,
      reason: result?.reason || "nothing_to_restore",
      productId: result?.productId || null,
    };
  } catch (err) {
    return { status: "failure", charged: false, reason: err?.message || "storekit_failure" };
  }
}
