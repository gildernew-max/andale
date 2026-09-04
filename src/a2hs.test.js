import {
  IPHONE_SAFARI_UA,
  isIosSafari,
  isStandaloneDisplay,
  shouldShowA2hsSheet,
} from "./a2hs.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const CHROME_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.5993.69 Mobile/15E148 Safari/604.1";
const FIREFOX_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/118.0 Mobile/15E148 Safari/604.1";
const EDGE_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/118.0.2088.68 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.90 Mobile Safari/537.36";
const DESKTOP_SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const JSDOM_UA = "Mozilla/5.0 (linux) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/26.0.0";
const IPAD_SAFARI = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const WKWEBVIEW = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

assert(isIosSafari(IPHONE_SAFARI_UA), "iPhone Safari UA is eligible");
assert(isIosSafari(IPAD_SAFARI), "iPad Safari UA is eligible");
assert(!isIosSafari(CHROME_IOS), "Chrome on iOS is not Safari");
assert(!isIosSafari(FIREFOX_IOS), "Firefox on iOS is not Safari");
assert(!isIosSafari(EDGE_IOS), "Edge on iOS is not Safari");
assert(!isIosSafari(ANDROID_CHROME), "Android Chrome is not iOS Safari");
assert(!isIosSafari(DESKTOP_SAFARI), "desktop Safari is not iPhone Safari");
assert(!isIosSafari(JSDOM_UA), "jsdom is not iOS Safari");
assert(!isIosSafari(WKWEBVIEW), "WKWebView without Safari/Version is skipped");
assert(!isIosSafari(""), "empty UA is not iOS Safari");
assert(!isIosSafari(), "missing UA is not iOS Safari");

assert(!isStandaloneDisplay({ matchMedia: () => ({ matches: false }), navigator: { standalone: false } }), "browser tab is not standalone");
assert(isStandaloneDisplay({ matchMedia: (q) => ({ matches: String(q).includes("standalone") }), navigator: {} }), "display-mode standalone is installed");
assert(isStandaloneDisplay({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } }), "iOS navigator.standalone is installed");
assert(!isStandaloneDisplay({ navigator: {} }), "missing matchMedia without standalone is not installed");

const eligible = { a2hsSeen: false, freeDismiss: true, standalone: false, userAgent: IPHONE_SAFARI_UA };
assert(shouldShowA2hsSheet(eligible), "first free dismiss on iOS Safari shows A2HS");
assert(!shouldShowA2hsSheet({ ...eligible, a2hsSeen: true }), "seen flag never shows again");
assert(!shouldShowA2hsSheet({ ...eligible, freeDismiss: false }), "price-plan dismiss does not show A2HS");
assert(!shouldShowA2hsSheet({ ...eligible, standalone: true }), "standalone / already installed skips");
assert(!shouldShowA2hsSheet({ ...eligible, userAgent: JSDOM_UA }), "non-iOS Safari skips");
assert(!shouldShowA2hsSheet({ ...eligible, userAgent: CHROME_IOS }), "iOS Chrome skips");
assert(!shouldShowA2hsSheet({ ...eligible, userAgent: ANDROID_CHROME }), "Android skips");
assert(!shouldShowA2hsSheet({}), "empty args skip");
assert(!shouldShowA2hsSheet({ freeDismiss: true, userAgent: IPHONE_SAFARI_UA, a2hsSeen: true, standalone: false }), "shown once never again");

console.log("ok: A2HS once after free dismiss; iOS Safari only; skip standalone / seen / non-eligible");
