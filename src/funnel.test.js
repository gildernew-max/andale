import {
  FUNNEL_EVENT,
  FUNNEL_EVENTS,
  FUNNEL_LOG,
  PAYWALL_TAP,
  cenzontleBeatFromSession,
  emitFunnelEvent,
} from "./funnel.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(FUNNEL_EVENT === "andale-funnel", "CustomEvent name is andale-funnel");
assert(FUNNEL_LOG === "__andaleFunnelLog", "Pages verification log is window.__andaleFunnelLog");
assert(FUNNEL_EVENTS.open === "open", "open is the first funnel event");
assert(FUNNEL_EVENTS.cenzontleComplete === "cenzontle_complete", "cenzontle_complete is the bird beat");
assert(FUNNEL_EVENTS.lecturaStart === "lectura_start", "lectura_start is the story start");
assert(FUNNEL_EVENTS.paywallSeen === "paywall_seen", "paywall_seen is the wall visible");
assert(FUNNEL_EVENTS.paywallTap === "paywall_tap", "paywall_tap is the wall CTA");
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

assert(!/\$/.test(JSON.stringify(bus.log)), "funnel log never carries a dollar sign");
assert(!/Dave|example\.com|abc-123/.test(JSON.stringify(bus.log)), "funnel log never carries the injected PII");

console.log("funnel.test.js: ok");
