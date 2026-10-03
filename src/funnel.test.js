import {
  FUNNEL_EVENT,
  FUNNEL_EVENTS,
  FUNNEL_LOG,
  PAYWALL_TAP,
  cenzontleBeatFromSession,
  emitFunnelEvent,
} from "./funnel.js";
import { IAP_PRODUCTS } from "./purchase.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(FUNNEL_EVENT === "andale-funnel", "CustomEvent name is andale-funnel");
assert(FUNNEL_LOG === "__andaleFunnelLog", "Pages verification log is window.__andaleFunnelLog");
assert(FUNNEL_EVENTS.open === "open", "open is the first funnel event");
assert(FUNNEL_EVENTS.cenzontleComplete === "cenzontle_complete", "cenzontle_complete is the bird beat");
assert(FUNNEL_EVENTS.lecturaStart === "lectura_start", "lectura_start is the story start");
assert(FUNNEL_EVENTS.lecturaChapterDone === "lectura_chapter_done", "lectura_chapter_done is the chapter complete");
assert(FUNNEL_EVENTS.paywallSeen === "paywall_seen", "paywall_seen is the wall visible");
assert(FUNNEL_EVENTS.paywallTap === "paywall_tap", "paywall_tap is the wall CTA");
assert(FUNNEL_EVENTS.waitlistSubmit === "waitlist_submit", "waitlist_submit is the notice submit");
assert(FUNNEL_EVENTS.purchase === "purchase", "purchase is the StoreKit success step");
assert(
  Object.values(FUNNEL_EVENTS).slice().sort().join(",")
    === ["cenzontle_complete", "lectura_chapter_done", "lectura_start", "open", "paywall_seen", "paywall_tap", "purchase", "waitlist_submit"].join(","),
  "funnel allowlist is the conversion chain plus lectura_chapter_done, paywall_tap, and waitlist_submit",
);
assert(PAYWALL_TAP.annual === "annual", "annual tap label");
assert(PAYWALL_TAP.monthly === "monthly", "monthly tap label");
assert(PAYWALL_TAP.continueFree === "continue_free", "continue-free tap label");
assert(!/\$39\.99|\$6\.99|\$99/.test(JSON.stringify(FUNNEL_EVENTS) + JSON.stringify(PAYWALL_TAP)), "funnel names do not invent prices");

assert(cenzontleBeatFromSession({ firstHoy: true }) === "hoy", "firstHoy beat");
assert(cenzontleBeatFromSession({ firstDoctora: true }) === "doctora", "firstDoctora beat");
assert(cenzontleBeatFromSession({ firstStory0: true }) === "story0", "firstStory0 beat");
assert(cenzontleBeatFromSession({ lecturaWin: true, storyId: "story-1" }) == null, "later Lectura perch is not a beat");
assert(cenzontleBeatFromSession(null) == null, "missing session is not a beat");

assert(emitFunnelEvent({ event: "not_a_funnel_event" }) == null, "unknown event is dropped");

const bus = {
  log: null,
  events: [],
  dispatchEvent(ev) { this.events.push(ev); return true; },
};
Object.defineProperty(bus, FUNNEL_LOG, {
  get() { return this.log; },
  set(v) { this.log = v; },
  configurable: true,
});

const open = emitFunnelEvent({
  event: FUNNEL_EVENTS.open,
  name: "Dave",
  email: "dave@example.com",
  deviceId: "abc-123",
}, bus);
assert(open.event === "open", "open payload names the event");
assert(typeof open.at === "string" && open.at.includes("T"), "open carries an ISO timestamp");
assert(open.name == null && open.email == null && open.deviceId == null, "open drops PII extras");
assert(JSON.stringify(open) === JSON.stringify({ event: "open", at: open.at }), "open payload is event + at only");
assert(bus.events[0].type === FUNNEL_EVENT, "dispatches andale-funnel");
assert(bus.log.length === 1 && bus.log[0].event === "open", "app log stores open");

const bird = emitFunnelEvent({
  event: FUNNEL_EVENTS.cenzontleComplete,
  beat: "hoy",
  name: "secret",
}, bus);
assert(bird.event === "cenzontle_complete" && bird.beat === "hoy", "bird beat is hoy");
assert(bird.name == null, "bird event drops name");

const badBeat = emitFunnelEvent({
  event: FUNNEL_EVENTS.cenzontleComplete,
  beat: "Dave",
}, bus);
assert(badBeat.beat == null, "non-allowlisted beat is dropped");

const story = emitFunnelEvent({
  event: FUNNEL_EVENTS.lecturaStart,
  storyId: "story-0",
  title: "La noche en que vuelven",
}, bus);
assert(story.storyId === "story-0", "lectura_start keeps the content id");
assert(story.title == null, "lectura_start does not keep a title");

const badStory = emitFunnelEvent({
  event: FUNNEL_EVENTS.lecturaStart,
  storyId: "dave@example.com",
}, bus);
assert(badStory.storyId == null, "email-shaped storyId is dropped");

const chapterDone = emitFunnelEvent({
  event: FUNNEL_EVENTS.lecturaChapterDone,
  storyId: "story-0",
  title: "La noche en que vuelven",
  email: "dave@example.com",
}, bus);
assert(chapterDone.event === "lectura_chapter_done" && chapterDone.storyId === "story-0", "lectura_chapter_done keeps the content id");
assert(chapterDone.title == null && chapterDone.email == null, "lectura_chapter_done drops title and email");
assert(Object.keys(chapterDone).sort().join(",") === "at,event,storyId", "lectura_chapter_done payload is event + at + storyId");

const badChapter = emitFunnelEvent({
  event: FUNNEL_EVENTS.lecturaChapterDone,
  storyId: "dave@example.com",
}, bus);
assert(badChapter.storyId == null, "email-shaped chapter storyId is dropped");

const seen = emitFunnelEvent({ event: FUNNEL_EVENTS.paywallSeen, unlockedPrem: true }, bus);
assert(seen.event === "paywall_seen", "paywall_seen names the event");
assert(seen.unlockedPrem == null, "paywall_seen does not copy progress flags");

const tap = emitFunnelEvent({
  event: FUNNEL_EVENTS.paywallTap,
  choice: PAYWALL_TAP.continueFree,
  price: "$39.99",
}, bus);
assert(tap.choice === "continue_free", "continue-free tap is labeled");
assert(tap.price == null, "tap does not keep a price");

const annual = emitFunnelEvent({ event: FUNNEL_EVENTS.paywallTap, choice: "annual" }, bus);
assert(annual.choice === "annual", "annual tap is labeled");
const monthly = emitFunnelEvent({ event: FUNNEL_EVENTS.paywallTap, choice: "monthly" }, bus);
assert(monthly.choice === "monthly", "monthly tap is labeled");
const junkTap = emitFunnelEvent({ event: FUNNEL_EVENTS.paywallTap, choice: "lifetime" }, bus);
assert(junkTap.choice == null, "unknown tap choice is dropped");

const notice = emitFunnelEvent({
  event: FUNNEL_EVENTS.waitlistSubmit,
  email: "dave@example.com",
  choice: "annual",
  storyId: "story-0",
  beat: "hoy",
}, bus);
assert(notice.event === "waitlist_submit", "waitlist_submit names the event");
assert(typeof notice.at === "string" && notice.at.includes("T"), "waitlist_submit carries an ISO timestamp");
assert(notice.email == null && notice.choice == null && notice.storyId == null && notice.beat == null, "waitlist_submit drops email and other extras");
assert(JSON.stringify(notice) === JSON.stringify({ event: "waitlist_submit", at: notice.at }), "waitlist_submit payload is event + at only");
assert(bus.events.at(-1).detail.email == null, "CustomEvent detail has no email");
assert(!/example\.com|@/.test(JSON.stringify(notice)), "waitlist_submit JSON has no address");

const bought = emitFunnelEvent({
  event: FUNNEL_EVENTS.purchase,
  plan: "annual",
  productId: IAP_PRODUCTS.annual,
  receipt: "receipt-body",
  email: "dave@example.com",
  name: "Dave",
  deviceId: "abc-123",
  transactionId: "tx-9",
  price: "$39.99",
}, bus);
assert(bought.event === "purchase", "purchase names the event");
assert(bought.plan === "annual", "purchase keeps the annual plan label");
assert(bought.productId === IAP_PRODUCTS.annual, "purchase keeps the annual stub id");
assert(Object.keys(bought).sort().join(",") === "at,event,plan,productId", "purchase payload is event + at + plan + productId");
assert(bought.receipt == null && bought.email == null && bought.name == null && bought.deviceId == null && bought.transactionId == null && bought.price == null, "purchase drops receipt and PII");

const monthlyBuy = emitFunnelEvent({
  event: FUNNEL_EVENTS.purchase,
  plan: "monthly",
  productId: IAP_PRODUCTS.monthly,
}, bus);
assert(monthlyBuy.plan === "monthly" && monthlyBuy.productId === IAP_PRODUCTS.monthly, "monthly purchase labels");

const junkBuy = emitFunnelEvent({
  event: FUNNEL_EVENTS.purchase,
  plan: "lifetime",
  productId: "com.other.sku",
  receipt: "secret",
}, bus);
assert(junkBuy.event === "purchase" && junkBuy.plan == null && junkBuy.productId == null && junkBuy.receipt == null, "unknown plan and product id are dropped");

const openPlan = emitFunnelEvent({
  event: FUNNEL_EVENTS.open,
  plan: "annual",
  productId: IAP_PRODUCTS.annual,
}, bus);
assert(openPlan.plan == null && openPlan.productId == null, "plan labels stay on purchase only");

assert(!/\$/.test(JSON.stringify(bus.log)), "funnel log never carries a dollar sign");
assert(!/Dave|example\.com|abc-123/.test(JSON.stringify(bus.log)), "funnel log never carries the injected PII");

console.log("funnel.test.js: ok");
