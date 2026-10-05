import { FUNNEL_EVENTS, emitFunnelEvent } from "./funnel.js";
import { shipFunnelEvent } from "./collector.js";
import {
  FIRST_SESSION_FUNNEL_KEY,
  claimDay2Return,
  claimFirstSessionComplete,
  claimFirstSessionExercise1,
  claimFirstSessionStart,
  isFirstExerciseCorrect,
  readFirstSessionFunnel,
  sessionOneEngaged,
  sessionOneFromProgress,
} from "./firstSessionFunnel.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

function memoryStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
  };
}

const store = memoryStorage();
const first = claimFirstSessionStart(store, "2026-10-05");
assert(first.fire === true, "the first start claim may emit");
assert(first.state.start === true && first.state.startDay === "2026-10-05", "start stamps the local day");
const again = claimFirstSessionStart(store, "2026-10-06");
assert(again.fire === false, "a second start claim does not emit");
assert(readFirstSessionFunnel(store).startDay === "2026-10-05", "a later start claim does not move the anchor day");

const exercise = claimFirstSessionExercise1(store);
assert(exercise.fire === true, "the first exercise-1 claim may emit");
assert(claimFirstSessionExercise1(store).fire === false, "exercise 1 does not emit twice");
assert(readFirstSessionFunnel(store).exercise1 === true, "exercise 1 stays stamped");

const done = claimFirstSessionComplete(store);
assert(done.fire === true, "the first complete claim may emit");
assert(claimFirstSessionComplete(store).fire === false, "complete does not emit twice");

const sameDay = claimDay2Return(store, { today: "2026-10-05", progressStarted: true, lastDay: "2026-10-04" });
assert(sameDay.fire === false, "the start day is not a day-2 return, even if lastDay is older");
const nextDay = claimDay2Return(store, { today: "2026-10-06", lastDay: "2026-10-06" });
assert(nextDay.fire === true, "the next local day fires day2 from the start-day anchor");
assert(claimDay2Return(store, { today: "2026-10-09" }).fire === false, "a later gap does not fire day2 again");

const startedOnly = memoryStorage();
claimFirstSessionStart(startedOnly, "2026-10-03");
const startedReturn = claimDay2Return(startedOnly, { today: "2026-10-05" });
assert(startedReturn.fire === true, "a start with no win still returns on a later day");
assert(readFirstSessionFunnel(startedOnly).complete === false, "day2 does not invent a complete stamp");

const completedOnly = memoryStorage();
claimFirstSessionComplete(completedOnly);
const completedReturn = claimDay2Return(completedOnly, { today: "2026-10-05", lastDay: "2026-10-04" });
assert(completedReturn.fire === true, "a complete stamp uses lastDay when start day was not recorded");

const armed = memoryStorage();
const armedReturn = claimDay2Return(armed, { today: "2026-10-05", progressStarted: true, lastDay: "2026-10-04" });
assert(armedReturn.fire === true, "firstSessionArmed plus a previous lastDay fires day2 without a funnel stamp");
assert(claimDay2Return(armed, { today: "2026-10-06", progressStarted: true, lastDay: "2026-10-04" }).fire === false, "armed day2 is still once");

const fresh = memoryStorage();
assert(claimDay2Return(fresh, { today: "2026-10-05" }).fire === false, "a stranger with no session one does not fire day2");
assert(claimDay2Return(fresh, { today: "2026-10-05", progressStarted: false, lastDay: "2026-10-04" }).fire === false, "lastDay without session one is not a return");
assert(claimDay2Return(fresh, { today: "2026-10-05", progressStarted: true, lastDay: "2026-10-05" }).fire === false, "armed on the same lastDay is not day2");
assert(claimDay2Return(fresh, { today: "2026-10-05", progressStarted: true }).fire === false, "armed with no anchor day does not fire");
assert(claimDay2Return(fresh, { today: "not-a-day", progressStarted: true, lastDay: "2026-10-04" }).fire === false, "a bad today does not fire");
assert(readFirstSessionFunnel(fresh).day2 === false, "a refused day2 claim writes nothing");

const exerciseOnly = memoryStorage();
claimFirstSessionExercise1(exerciseOnly);
assert(claimDay2Return(exerciseOnly, { today: "2026-10-06", lastDay: "2026-10-05" }).fire === false, "exercise 1 alone is not a session-one start");

const legacy = sessionOneFromProgress({ firstSessionDone: true, streak: 4, lastDay: "2026-10-04" });
assert(legacy.started === false && legacy.lastDay === "2026-10-04", "migrated firstSessionDone is not a session-one start");
assert(sessionOneEngaged({ funnel: readFirstSessionFunnel(memoryStorage()), progressStarted: legacy.started }) === false, "a pre-release save is not engaged");
assert(sessionOneFromProgress({ firstSessionArmed: true, lastDay: "2026-10-04" }).started === true, "armed progress counts as started");
assert(sessionOneFromProgress(null).started === false, "missing progress is not started");

const junk = memoryStorage({
  [FIRST_SESSION_FUNNEL_KEY]: JSON.stringify({ start: true, startDay: "2026-10-01", email: "ada@example.com", exercise1: "yes" }),
});
assert(readFirstSessionFunnel(junk).exercise1 === false, "a non-boolean exercise stamp is ignored");
assert(readFirstSessionFunnel(junk).start === true, "a real start stamp survives junk beside it");
const rewritten = claimFirstSessionExercise1(junk);
assert(rewritten.fire === true, "a clean exercise claim can follow a junk record");
assert(!JSON.parse(junk.data[FIRST_SESSION_FUNNEL_KEY]).email, "the stored stamp drops an address");
assert(!/ada@example\.com/.test(junk.data[FIRST_SESSION_FUNNEL_KEY]), "the stored JSON has no address");

const broken = {
  getItem() { return null; },
  setItem() { throw new Error("quota"); },
};
assert(claimFirstSessionStart(broken, "2026-10-05").fire === false, "a failed write does not emit");
assert(claimFirstSessionStart(null, "2026-10-05").fire === false, "missing storage does not emit");
const corrupt = memoryStorage({ [FIRST_SESSION_FUNNEL_KEY]: "{not json" });
assert(claimFirstSessionComplete(corrupt).fire === true, "corrupt storage is treated as a first claim");

assert(isFirstExerciseCorrect({ firstSession: true, index: 0, result: "correct", requeued: false }) === true, "exercise 1 correct qualifies");
assert(isFirstExerciseCorrect({ firstSession: true, index: 0, result: "wrong" }) === false, "a miss does not qualify");
assert(isFirstExerciseCorrect({ firstSession: true, index: 0, result: "almost" }) === false, "a soft almost does not qualify");
assert(isFirstExerciseCorrect({ firstSession: true, index: 1, result: "correct" }) === false, "a later beat does not qualify");
assert(isFirstExerciseCorrect({ firstSession: false, index: 0, result: "correct" }) === false, "another lesson does not qualify");
assert(isFirstExerciseCorrect({ firstSession: true, index: 0, result: "correct", requeued: true }) === false, "a requeue does not qualify");

const bus = { log: null, events: [], dispatchEvent() { return true; } };
const seen = emitFunnelEvent({
  event: FUNNEL_EVENTS.day2Return,
  email: "ada@example.com",
  daysSinceLast: 2,
  streak: 1,
}, bus);
assert(seen.event === "day2_return", "day2_return is on the bus");
assert(Object.keys(seen).sort().join(",") === "at,event", "day2_return payload is event + at");
assert(seen.email == null && seen.daysSinceLast == null, "day2_return drops extras");

const posted = [];
const shipStore = memoryStorage();
for (const event of [
  FUNNEL_EVENTS.firstSessionStart,
  FUNNEL_EVENTS.firstSessionExercise1Correct,
  FUNNEL_EVENTS.firstSessionComplete,
  FUNNEL_EVENTS.day2Return,
]) {
  const result = await shipFunnelEvent({
    event,
    at: "2026-10-05T15:00:00.000Z",
    email: "ada@example.com",
    daysSinceLast: 1,
  }, {
    endpoint: "https://collector.example/exec",
    lang: "es",
    storage: shipStore,
    random: () => "device-session-1",
    beaconImpl: (_url, body) => {
      posted.push(JSON.parse(body));
      return true;
    },
    fetchImpl: async () => { throw new Error("fetch should not run"); },
  });
  assert(result.sent === true, `${event} ships on the collector path`);
}
assert(posted.map((row) => row.name).join(",") === "first_session_start,first_session_exercise1_correct,first_session_complete,day2_return", "collector keeps the four names");
for (const row of posted) {
  assert(Object.keys(row).sort().join(",") === "deviceId,lang,name,ts,type", `${row.name} row has no extra fields`);
  assert(!("email" in row) && !("daysSinceLast" in row), `${row.name} row has no address or day gap`);
}
assert(shipStore.data["andale-device-id"] === "device-session-1", "the four events share one device id");

console.log("firstSessionFunnel.test.js: ok");
