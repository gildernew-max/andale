import {
  IAP_PRODUCTS,
  PURCHASE_EVENT,
  WEB_NO_IAP_REASON,
  detectNativeIap,
  emitPurchaseEvent,
  planForProductId,
  productIdForPlan,
  progressAfterPurchaseSuccess,
  getProducts,
  requestPurchase,
  restorePurchases,
} from "./purchase.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(IAP_PRODUCTS.annual === "com.andale.app.premium.annual", "annual stub product id");
assert(IAP_PRODUCTS.monthly === "com.andale.app.premium.monthly", "monthly stub product id");
assert(!/\$39\.99|\$6\.99|\$/.test(JSON.stringify(IAP_PRODUCTS)), "Coin owns prices — no dollars in stubs");
assert(productIdForPlan("annual") === IAP_PRODUCTS.annual, "annual plan maps to stub id");
assert(productIdForPlan("monthly") === IAP_PRODUCTS.monthly, "monthly plan maps to stub id");
assert(productIdForPlan("lifetime") == null, "unknown plan has no product id");
assert(planForProductId(IAP_PRODUCTS.annual) === "annual", "annual id maps back");
assert(planForProductId(IAP_PRODUCTS.monthly) === "monthly", "monthly id maps back");
assert(planForProductId("com.other.sku") == null, "foreign id is not a plan");

assert(!detectNativeIap(), "default env is not native IAP");
assert(!detectNativeIap({ isNative: false, platform: "web" }), "web is not native IAP");
assert(!detectNativeIap({ isNative: true, platform: "android" }), "android is out of scope");
assert(detectNativeIap({ isNative: true, platform: "ios" }), "iOS wrap can charge");

const unlocked = progressAfterPurchaseSuccess({ xp: 12 }, { plan: "annual" });
assert(unlocked.unlockedPrem === true, "success writes unlockedPrem");
assert(unlocked.paywallSeen === true, "success dismisses the wall");
assert(unlocked.paywallPlan === "annual", "success stores the plan");
assert(unlocked.iapProductId === IAP_PRODUCTS.annual, "success stores the stub id");
assert(unlocked.xp === 12, "success does not wipe other progress");
const skipped = progressAfterPurchaseSuccess({ xp: 1 }, { productId: "nope" });
assert(skipped.unlockedPrem == null && skipped.xp === 1, "unknown product does not unlock");

const bus = {
  log: null,
  events: [],
  dispatchEvent(ev) { this.events.push(ev); return true; },
};
Object.defineProperty(bus, "__andalePurchaseLog", {
  get() { return this.log; },
  set(v) { this.log = v; },
  configurable: true,
});
const fired = emitPurchaseEvent({
  status: "failure",
  plan: "monthly",
  reason: WEB_NO_IAP_REASON,
}, bus);
assert(fired.status === "failure", "event status is failure");
assert(fired.charged === false, "web event is not a charge");
assert(fired.productId === IAP_PRODUCTS.monthly, "event carries the stub id");
assert(fired.reason === WEB_NO_IAP_REASON, "web reason is web_no_iap");
assert(bus.events[0].type === PURCHASE_EVENT, "dispatches andale-purchase");
assert(bus.log.length === 1 && bus.log[0].plan === "monthly", "app log stores the event");

const webAnnual = await requestPurchase("annual");
assert(webAnnual.status === "failure", "web annual is a failure event");
assert(webAnnual.charged === false, "web annual does not charge");
assert(webAnnual.reason === WEB_NO_IAP_REASON, "web annual reason is honest");
assert(webAnnual.productId === IAP_PRODUCTS.annual, "web annual names the stub");

const webMonthly = await requestPurchase("monthly");
assert(webMonthly.reason === WEB_NO_IAP_REASON && webMonthly.charged === false, "web monthly does not charge");

const unknown = await requestPurchase("lifetime");
assert(unknown.reason === "unknown_plan" && unknown.charged === false, "unknown plan fails closed");

const nativeOk = await requestPurchase("annual", {
  env: { isNative: true, platform: "ios" },
  nativePurchase: async ({ productId }) => ({ status: "success", productId }),
});
assert(nativeOk.status === "success" && nativeOk.charged === true, "StoreKit success event");
assert(nativeOk.productId === IAP_PRODUCTS.annual, "success event keeps the stub id");

const nativeCancel = await requestPurchase("monthly", {
  env: { isNative: true, platform: "ios" },
  nativePurchase: async () => ({ status: "cancelled" }),
});
assert(nativeCancel.status === "failure" && nativeCancel.charged === false, "cancel is not a charge");
assert(nativeCancel.reason === "user_cancelled", "cancel reason is user_cancelled");

const nativeFail = await requestPurchase("annual", {
  env: { isNative: true, platform: "ios" },
  nativePurchase: async () => ({ status: "failure", reason: "product_not_found" }),
});
assert(nativeFail.status === "failure" && nativeFail.reason === "product_not_found", "StoreKit miss is a failure");

const nativeThrow = await requestPurchase("annual", {
  env: { isNative: true, platform: "ios" },
  nativePurchase: async () => { throw new Error("sheet_failed"); },
});
assert(nativeThrow.reason === "sheet_failed" && nativeThrow.charged === false, "native throw is a failure");

const webRestore = await restorePurchases();
assert(webRestore.reason === WEB_NO_IAP_REASON && webRestore.charged === false, "web restore is a no-op");

const restoreOk = await restorePurchases({
  env: { isNative: true, platform: "ios" },
  nativeRestore: async () => ({ status: "success", productId: IAP_PRODUCTS.monthly }),
});
assert(restoreOk.status === "success" && restoreOk.plan === "monthly", "native restore can unlock monthly");
assert(restoreOk.reason === "restore", "restore success is tagged restore");

const restoreEmpty = await restorePurchases({
  env: { isNative: true, platform: "ios" },
  nativeRestore: async () => ({ status: "failure", reason: "nothing_to_restore" }),
});
assert(restoreEmpty.status === "failure" && restoreEmpty.charged === false, "empty restore does not unlock");

function installFunnelWindow() {
  const bus = {
    events: [],
    dispatchEvent(ev) { this.events.push(ev); return true; },
  };
  globalThis.window = bus;
  return bus;
}

const funnelWindow = installFunnelWindow();
const funnelPurchase = () => (funnelWindow.__andaleFunnelLog || []).filter((e) => e.event === "purchase");

const webAgain = await requestPurchase("annual");
assert(webAgain.reason === WEB_NO_IAP_REASON && funnelPurchase().length === 0, "web failure does not emit funnel purchase");

const cancelAgain = await requestPurchase("monthly", {
  env: { isNative: true, platform: "ios" },
  nativePurchase: async () => ({ status: "cancelled", receipt: "receipt-body", email: "dave@example.com" }),
});
assert(cancelAgain.reason === "user_cancelled" && funnelPurchase().length === 0, "cancel does not emit funnel purchase");

const failAgain = await requestPurchase("annual", {
  env: { isNative: true, platform: "ios" },
  nativePurchase: async () => { throw new Error("sheet_failed"); },
});
assert(failAgain.reason === "sheet_failed" && funnelPurchase().length === 0, "native throw does not emit funnel purchase");

const restoreAgain = await restorePurchases({
  env: { isNative: true, platform: "ios" },
  nativeRestore: async () => ({ status: "success", productId: IAP_PRODUCTS.monthly, receipt: "receipt-body" }),
});
assert(restoreAgain.status === "success" && restoreAgain.reason === "restore", "restore still succeeds on the purchase bus");
assert(funnelPurchase().length === 0, "restore does not emit funnel purchase");

const successAgain = await requestPurchase("annual", {
  env: { isNative: true, platform: "ios" },
  nativePurchase: async ({ productId }) => ({
    status: "success",
    productId,
    receipt: "receipt-body",
    email: "dave@example.com",
    deviceId: "abc-123",
    transactionId: "tx-9",
  }),
});
assert(successAgain.status === "success" && successAgain.charged === true, "success still charges");
assert(funnelPurchase().length === 1, "funnel purchase emits once on StoreKit success");
const funnelHit = funnelPurchase()[0];
assert(funnelHit.plan === "annual" && funnelHit.productId === IAP_PRODUCTS.annual, "success funnel labels are annual");
assert(funnelHit.receipt == null && funnelHit.email == null && funnelHit.deviceId == null && funnelHit.transactionId == null, "success funnel drops receipt and PII");
assert(!/receipt-body|example\.com|abc-123|tx-9/.test(JSON.stringify(funnelWindow.__andaleFunnelLog)), "funnel log has no receipt or PII");
assert(funnelWindow.events.some((ev) => ev.type === "andale-funnel" && ev.detail?.event === "purchase"), "success dispatches andale-funnel");

const monthlySuccess = await requestPurchase("monthly", {
  env: { isNative: true, platform: "ios" },
  nativePurchase: async ({ productId }) => ({ status: "success", productId }),
});
assert(monthlySuccess.plan === "monthly" && funnelPurchase().at(-1).plan === "monthly", "monthly success emits funnel purchase");
assert(funnelPurchase().at(-1).productId === IAP_PRODUCTS.monthly, "monthly success keeps the stub id");

const webPrices = await getProducts();
assert(webPrices.annual == null && webPrices.monthly == null, "web getProducts has no displayPrice");

const beforeProducts = funnelPurchase().length;
let seenIds = null;
const nativePrices = await getProducts({
  env: { isNative: true, platform: "ios" },
  nativeGetProducts: async ({ productIds }) => {
    seenIds = productIds;
    return {
      products: [
        { id: productIds[0], displayPrice: "CA$54.99" },
        { id: productIds[1], displayPrice: " CA$9.99 " },
      ],
    };
  },
});
assert(seenIds[0] === IAP_PRODUCTS.annual && seenIds[1] === IAP_PRODUCTS.monthly, "getProducts asks for the stub ids");
assert(nativePrices.annual === "CA$54.99" && nativePrices.monthly === "CA$9.99", "getProducts returns trimmed displayPrice");
assert(funnelPurchase().length === beforeProducts, "getProducts does not emit funnel purchase");

const missingMonthly = await getProducts({
  env: { isNative: true, platform: "ios" },
  nativeGetProducts: async () => ({
    products: [{ id: IAP_PRODUCTS.annual, displayPrice: "$39.99" }],
  }),
});
assert(missingMonthly.annual === "$39.99" && missingMonthly.monthly == null, "a missing product leaves that price null");

const failedLookup = await getProducts({
  env: { isNative: true, platform: "ios" },
  nativeGetProducts: async () => ({ status: "failure", reason: "store_down", products: [] }),
});
assert(failedLookup.annual == null && failedLookup.monthly == null, "getProducts failure falls back to null");

const thrownLookup = await getProducts({
  env: { isNative: true, platform: "ios" },
  nativeGetProducts: async () => { throw new Error("sheet_failed"); },
});
assert(thrownLookup.annual == null && thrownLookup.monthly == null, "getProducts throw falls back to null");
assert(funnelPurchase().length === beforeProducts, "getProducts errors do not emit funnel purchase");

console.log("purchase.test.js: ok");
