import { prevDayKey } from "./firstDoor.js";
import { FUNNEL_EVENTS, emitFunnelEvent } from "./funnel.js";
import { shipFunnelEvent } from "./collector.js";
import { isLecturaStoryOpen } from "./lecturaHandoff.js";
import {
  FIRST_STREAK_BUTTON,
  FIRST_STREAK_FALLBACK,
  FIRST_STREAK_HEADLINE,
  FIRST_STREAK_RETURN_KEY,
  dismissFirstStreakReturn,
  firstStreakLineColumn,
  firstStreakLinePx,
  firstStreakCopy,
  firstStreakDestination,
  firstStreakHitsTwo,
  firstStreakReturn,
  forgetFirstStreakReturnLive,
  presentFirstStreakReturn,
} from "./firstStreakReturn.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const TODAY = "2026-10-14";
const YESTERDAY = prevDayKey(TODAY);
assert(YESTERDAY === "2026-10-13", "yesterday fixture");

const STORIES = [
  { id: "story-0", title: "La noche en que vuelven" },
  { id: "story-1", title: "La casa azul" },
  { id: "story-2", title: "Más allá de la playa" },
];

function memoryStorage() {
  const data = {};
  return {
    data,
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
  };
}

function day2(extra = {}) {
  return {
    stories: STORIES,
    claimed: { "story-0": true },
    lecturaOpenId: "story-0",
    streak: 1,
    lastDay: YESTERDAY,
    today: TODAY,
    lang: "en",
    viewportWidth: 390,
    ...extra,
  };
}

// The streak gate is dark now (the flame no longer projects a 2 on day 2), so the story-picking
// and copy halves are exercised without it. firstStreakReturn itself must stay hidden: see the gate tests below.
function afterGate({ stories, claimed, lecturaOpenId, lecturaStarted = false, lang, viewportWidth }) {
  const column = firstStreakLineColumn(viewportWidth);
  const dest = firstStreakDestination({ stories, claimed, lecturaOpenId, lecturaStarted });
  if (dest.kind === "locked") return { show: false, reason: "locked", storyId: dest.story?.id || "" };
  if (dest.kind !== "halfway" && dest.kind !== "next") return { show: false, reason: "none" };
  const copy = firstStreakCopy({ lang, mode: dest.kind, title: dest.story.title, columnPx: column });
  return { show: true, reason: dest.kind, mode: dest.kind, storyId: dest.story.id, lang, column, ...copy };
}

forgetFirstStreakReturnLive();

assert(isLecturaStoryOpen(STORIES, { "story-0": true }, "story-1"), "claiming story-0 opens story-1 for free");
assert(!isLecturaStoryOpen(STORIES, { "story-0": true }, "story-2"), "story-2 stays locked while story-1 is unread");
assert(firstStreakLineColumn(360) === 304, "a 360px screen gives the line 304px");
assert(firstStreakLineColumn(390) === 334, "a 390px screen gives the line 334px");

// The gate: nothing earned reaches 2 before a win, so the card never shows on the return day.
assert(firstStreakHitsTwo({ streak: 1, lastDay: YESTERDAY, today: TODAY }) === false, "a stored 1 with yesterday is not a 2, nothing is projected");
for (const streak of [0, 1, 2, 3]) {
  for (const lastDay of [TODAY, YESTERDAY, "2026-10-12"]) {
    const decision = firstStreakReturn(day2({ streak, lastDay }));
    assert(decision.show === false && decision.reason === "streak", `streak ${streak} with lastDay ${lastDay} never shows the 2 days card`);
  }
}
const darkStore = memoryStorage();
forgetFirstStreakReturnLive();
assert(presentFirstStreakReturn(darkStore, firstStreakReturn(day2())).fire === false, "the dark card emits nothing");
assert(darkStore.data[FIRST_STREAK_RETURN_KEY] == null, "the dark card stamps nothing");

const claimed = afterGate(day2());
assert(claimed.show === true && claimed.mode === "next" && claimed.storyId === "story-1", "day 2 after a day-1 claim opens the next free story");
assert(claimed.headline === FIRST_STREAK_HEADLINE.en, "EN headline");
assert(claimed.line === "Your next story is ready: La casa azul.", "EN next line keeps the Spanish title");
assert(claimed.title === "La casa azul" && claimed.before === "Your next story is ready: " && claimed.after === ".", "EN next line splits around the title");
assert(claimed.button === FIRST_STREAK_BUTTON.next.en, "EN next button is Start reading");
assert(!/[!¡]/.test(claimed.headline + claimed.line + claimed.button), "EN next copy has no exclamation");

const claimedEs = afterGate(day2({ lang: "es" }));
assert(claimedEs.headline === FIRST_STREAK_HEADLINE.es, "ES headline");
assert(claimedEs.line === "Tu siguiente cuento está listo: La casa azul.", "ES next line");
assert(claimedEs.title === "La casa azul", "ES next title stays Spanish");
assert(claimedEs.button === FIRST_STREAK_BUTTON.next.es, "ES next button is Empieza a leer");
assert(!/[!¡]/.test(claimedEs.headline + claimedEs.line + claimedEs.button), "ES next copy has no exclamation");

const empty = afterGate(day2({ claimed: {}, lecturaOpenId: "", lecturaStarted: false }));
assert(empty.show === false && empty.reason === "none", "no claim and no open story does not show");

const sameDay = firstStreakReturn(day2({ lastDay: TODAY }));
assert(sameDay.show === false && sameDay.reason === "streak", "a same-day visit does not show");

const missed = firstStreakReturn(day2({ lastDay: "2026-10-12" }));
assert(missed.show === false && missed.reason === "streak", "day 3 with day 2 missed does not show");

const laterStreak = firstStreakReturn(day2({ streak: 2 }));
assert(laterStreak.show === false, "a stored streak of 2 is not the first time it hits 2");

const halfway = afterGate(day2({
  claimed: {},
  lecturaOpenId: "story-0",
  viewportWidth: 800,
}));
assert(halfway.show === true && halfway.mode === "halfway" && halfway.storyId === "story-0", "a story left open is the halfway card");
assert(halfway.fallback === false, "a wide column keeps the title");
assert(halfway.line === "La noche en que vuelven is waiting where you left it.", "EN halfway line");
assert(halfway.title === "La noche en que vuelven", "halfway title stays Spanish");
assert(halfway.button === FIRST_STREAK_BUTTON.halfway.en, "EN halfway button is Keep reading");

const halfwayEs = afterGate(day2({
  claimed: {},
  lecturaOpenId: "story-0",
  lang: "es",
  viewportWidth: 800,
}));
assert(halfwayEs.line === "La noche en que vuelven te espera donde lo dejaste.", "ES halfway line");
assert(halfwayEs.button === FIRST_STREAK_BUTTON.halfway.es, "ES halfway button is Sigue leyendo");
assert(!/[!¡]/.test(halfway.line + halfway.button + halfwayEs.line + halfwayEs.button), "halfway copy has no exclamation");

const longTitle = afterGate(day2({
  claimed: {},
  lecturaOpenId: "story-0",
  viewportWidth: 360,
}));
assert(longTitle.show === true && longTitle.fallback === true, "a long title on a 360px screen uses the fallback");
assert(longTitle.line === FIRST_STREAK_FALLBACK.en && longTitle.title === "", "EN fallback drops the title");
assert(firstStreakLinePx("La noche en que vuelven is waiting where you left it.") > firstStreakLineColumn(360), "the titled EN line is wider than the 360px column");

const longTitleEs = afterGate(day2({
  claimed: {},
  lecturaOpenId: "story-0",
  lang: "es",
  viewportWidth: 360,
}));
assert(longTitleEs.fallback === true && longTitleEs.line === FIRST_STREAK_FALLBACK.es, "ES fallback line");

const locked = afterGate(day2({
  claimed: { "story-1": true },
  lecturaOpenId: "story-1",
}));
assert(locked.show === false && locked.reason === "locked" && locked.storyId === "story-2", "a locked next story does not show");
const lockedStore = memoryStorage();
const lockedPresent = presentFirstStreakReturn(lockedStore, locked);
assert(lockedPresent.fire === false && lockedPresent.visible === false, "a locked target does not emit");
assert(lockedStore.data[FIRST_STREAK_RETURN_KEY] == null, "a locked target does not stamp seen");

const onceStore = memoryStorage();
forgetFirstStreakReturnLive();
const first = presentFirstStreakReturn(onceStore, claimed);
assert(first.fire === true && first.visible === true, "the first show emits");
const again = presentFirstStreakReturn(onceStore, claimed);
assert(again.fire === false && again.visible === true, "the same visit does not emit again");
forgetFirstStreakReturnLive();
const reloaded = presentFirstStreakReturn(onceStore, claimed);
assert(reloaded.fire === false && reloaded.visible === false, "a later visit does not show the card again");

const dismissStore = memoryStorage();
forgetFirstStreakReturnLive();
assert(presentFirstStreakReturn(dismissStore, claimed).fire === true, "dismiss fixture shows once");
assert(dismissFirstStreakReturn(dismissStore) === true, "dismiss stamps the device");
forgetFirstStreakReturnLive();
const afterDismiss = presentFirstStreakReturn(dismissStore, claimed);
assert(afterDismiss.visible === false && afterDismiss.fire === false, "button or lesson dismiss hides the card for good");

const bus = { log: null, events: [], dispatchEvent() { return true; } };
const seen = emitFunnelEvent({
  event: FUNNEL_EVENTS.firstStreakSeen,
  email: "ada@example.com",
  storyId: "story-1",
  source: "win",
  day: 2,
}, bus);
assert(FUNNEL_EVENTS.firstStreakSeen === "first_streak_seen", "funnel name");
assert(seen.event === "first_streak_seen", "first_streak_seen is on the bus");
assert(Object.keys(seen).sort().join(",") === "at,event", "first_streak_seen payload is event + at");
assert(seen.email == null && seen.storyId == null && seen.source == null && seen.day == null, "first_streak_seen drops extras");

const posted = [];
const shipStore = memoryStorage();
const shipped = await shipFunnelEvent({
  event: FUNNEL_EVENTS.firstStreakSeen,
  at: "2026-10-14T15:00:00.000Z",
  email: "ada@example.com",
  storyId: "story-1",
}, {
  endpoint: "https://collector.example/exec",
  storage: shipStore,
  random: () => "device-streak-1",
  beaconImpl: (_url, body) => {
    posted.push(JSON.parse(body));
    return true;
  },
  fetchImpl: async () => { throw new Error("fetch should not run"); },
});
assert(shipped.sent === false, "first_streak_seen stays on the device");
assert(posted.length === 0, "no collector row for first_streak_seen");

console.log("firstStreakReturn.test.js ok");
