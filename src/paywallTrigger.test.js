import { prevDayKey } from "./firstDoor.js";
import {
  FIRST_ACTIVITY_KEY,
  LOCKED_CAP_FADE_MS,
  LOCKED_CAP_GAP_PX,
  LOCKED_CAP_INK,
  LOCKED_CAP_SIZE,
  LOCKED_STORY_CAP_LINE,
  PAYWALL_SHOWN_KEY,
  isLocalDayKey,
  isPaywallMidFlow,
  learnerDayNumber,
  paywallOpenDecision,
  paywallShownOnDay,
  resolveFirstActivityDay,
  resolvePaywallShownDay,
} from "./paywallTrigger.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(FIRST_ACTIVITY_KEY === "andale-first-activity", "day-1 anchor key");
assert(PAYWALL_SHOWN_KEY === "andale-paywall-shown", "last-shown key");
assert(LOCKED_STORY_CAP_LINE.en === "Read the stories before this one to open it.", "EN cap line is exact");
assert(LOCKED_STORY_CAP_LINE.es === "Lee los cuentos anteriores para abrir este.", "ES cap line is exact");
assert(LOCKED_CAP_GAP_PX === 8, "cap line sits 8px under the card");
assert(LOCKED_CAP_SIZE === 12, "cap line is body type one size down from 13.5");
assert(LOCKED_CAP_FADE_MS === 150, "cap line fades in over 150ms");
assert(LOCKED_CAP_INK.light === "#6B6258" && LOCKED_CAP_INK.dark === "#CDBBA6", "cap line ink");

assert(isLocalDayKey("2026-10-12"), "ISO local date is a day key");
assert(!isLocalDayKey("2026-02-31"), "impossible date is not a day key");
assert(!isLocalDayKey("10/12/2026"), "slashes are not a day key");
assert(learnerDayNumber("2026-10-12", "2026-10-12") === 1, "same local date is day 1");
assert(learnerDayNumber("2026-10-11", "2026-10-12") === 2, "the next local date is day 2");
assert(learnerDayNumber("2026-10-10", "2026-10-12") === 3, "two local dates later is day 3");
assert(learnerDayNumber("2026-10-13", "2026-10-12") === 1, "a future anchor stays day 1");
assert(learnerDayNumber("2026-09-30", "2026-10-01") === 2, "day number crosses the month");

const today = "2026-10-12";
const yesterday = prevDayKey(today);
assert(yesterday === "2026-10-11", "yesterday fixture");

assert(paywallOpenDecision({ source: "win", dayNumber: 1, today }) === "skip", "no win paywall on day 1");
assert(paywallOpenDecision({ source: "timed", dayNumber: 1, today }) === "skip", "no timed paywall on day 1");
assert(paywallOpenDecision({ source: "locked_story", dayNumber: 1, today }) === "open", "day 1 locked tap still opens");

assert(paywallOpenDecision({ source: "win", dayNumber: 2, today }) === "open", "day 2 win opens");
assert(paywallOpenDecision({ source: "timed", dayNumber: 2, today }) === "open", "day 2 timed opens when the cap is free");
assert(paywallOpenDecision({ source: "locked_story", dayNumber: 2, today }) === "open", "day 2 locked tap opens when the cap is free");

assert(paywallOpenDecision({ source: "win", dayNumber: 2, today, unlockedPrem: true }) === "skip", "subscribed learners skip the win wall");
assert(paywallOpenDecision({ source: "timed", dayNumber: 2, today, unlockedPrem: true }) === "skip", "subscribed learners skip the timed wall");
assert(paywallOpenDecision({ source: "win", dayNumber: 2, today, paywallHold: true }) === "skip", "hearts hold still blocks the win wall");
assert(paywallOpenDecision({ source: "locked_story", dayNumber: 1, today, unlockedPrem: true }) === "open", "story locking does not start treating premium as open");

const used = { shownDay: today, today };
assert(paywallShownOnDay(today, today), "shown today means the cap is used");
assert(!paywallShownOnDay(yesterday, today), "yesterday's show does not use today's cap");
assert(paywallOpenDecision({ source: "win", dayNumber: 2, ...used }) === "skip", "win respects a locked_story show today");
assert(paywallOpenDecision({ source: "timed", dayNumber: 2, ...used }) === "skip", "timed respects a win show today");
assert(paywallOpenDecision({ source: "locked_story", dayNumber: 1, ...used }) === "capped", "locked tap after the cap is the quiet line, not another card");
assert(paywallOpenDecision({ source: "locked_story", dayNumber: 2, ...used }) === "capped", "the cap is the same on day 2");

const rolled = { shownDay: yesterday, today };
assert(paywallOpenDecision({ source: "win", dayNumber: 2, ...rolled }) === "open", "day rollover lets the win path show again");
assert(paywallOpenDecision({ source: "timed", dayNumber: 2, ...rolled }) === "open", "day rollover lets the timed path show again");
assert(paywallOpenDecision({ source: "locked_story", dayNumber: 2, ...rolled }) === "open", "day rollover lets a locked tap open again");

assert(isPaywallMidFlow("lesson"), "a lesson is mid-flow");
assert(isPaywallMidFlow("story"), "story reading is mid-flow");
assert(isPaywallMidFlow("failed"), "a quiz fail is mid-flow");
assert(!isPaywallMidFlow("home"), "home is after the win tap");
assert(!isPaywallMidFlow("sessionClose"), "the come-back card is after the win tap");
assert(!isPaywallMidFlow("done"), "the win screen itself is not the lesson");

assert(resolveFirstActivityDay({ keyValue: yesterday, progressValue: today, today }) === yesterday, "the plain first-activity key wins over progress");
assert(resolveFirstActivityDay({ keyValue: "", progressValue: yesterday, today }) === yesterday, "a missing key can use the progress mirror");
assert(resolveFirstActivityDay({ keyValue: "", progressValue: "", today }) === today, "a first visit stamps today");
assert(resolvePaywallShownDay({ keyValue: yesterday }) === yesterday, "the plain shown key is the cap");
assert(resolvePaywallShownDay({ keyValue: "" }) === "", "deleting the shown key clears the cap");

console.log("paywallTrigger.test.js ok");
