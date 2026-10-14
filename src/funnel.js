/** Pages conversion funnel. Local bus only — no third-party SDK, no PII.
 *  first-win-seen / email-submitted / email-skipped are event + timestamp only.
 *  The address never rides this bus. Delivery lives in firstWinEmail.js.
 *  `open` may also carry daysSinceLast: whole local calendar days since
 *  stored lastDay, 0–365. Missing lastDay omits the field.
 *  first_session_start / first_session_exercise1_correct / first_session_complete
 *  / day2_return / first_streak_seen are event + timestamp only. Once-per-device
 *  gating lives in firstSessionFunnel.js and firstStreakReturn.js, not on this bus.
 *  lectura_start is event + timestamp + storyId. Once per story per local
 *  calendar day lives in lecturaStartDay.js, not on this bus.
 *  paywall_seen is event + timestamp, plus an allowlisted source
 *  (win / locked_story / timed) and a learner day number (1 = first local
 *  calendar day) when that number is a positive integer.
 *  tap_annual and tap_monthly are separate events and carry that same source.
 *  locked_story_capped is event + timestamp + that day number.
 *  Other events do not carry source or day.
 *  Each accepted event is also appended to localStorage key
 *  `andale-funnel-log` on this device. That log is not sent anywhere.
 *  The in-memory list `window.__andaleFunnelLog` is the same session only.
 */

import { dayKeyFromDate } from "./firstDoor.js";
import { PAYWALL_BIRD_TRIGGER, PAYWALL_SOURCE } from "./paywallHeadline.js";

export const FUNNEL_EVENT = "andale-funnel";
export const FUNNEL_LOG = "__andaleFunnelLog";
/** This device only. Same allowlisted payloads as the session log. */
export const FUNNEL_STORE_KEY = "andale-funnel-log";
const FUNNEL_STORE_CAP = 2000;

export const FUNNEL_EVENTS = Object.freeze({
  open: "open",
  cenzontleComplete: "cenzontle_complete",
  lecturaStart: "lectura_start",
  lecturaChapterDone: "lectura_chapter_done",
  paywallSeen: "paywall_seen",
  paywallTap: "paywall_tap",
  lockedStoryCapped: "locked_story_capped",
  tapAnnual: "tap_annual",
  tapMonthly: "tap_monthly",
  waitlistSubmit: "waitlist_submit",
  purchase: "purchase",
  firstWinSeen: "first-win-seen",
  emailSubmitted: "email-submitted",
  emailSkipped: "email-skipped",
  firstSessionStart: "first_session_start",
  firstSessionExercise1Correct: "first_session_exercise1_correct",
  firstSessionComplete: "first_session_complete",
  day2Return: "day2_return",
  firstStreakSeen: "first_streak_seen",
});

export const PAYWALL_TAP = Object.freeze({
  annual: "annual",
  monthly: "monthly",
  continueFree: "continue_free",
});

/** Allowlist for paywall_seen, tap_annual, and tap_monthly. win = post-win continue and the cliffhanger bird, locked_story = locked Lectura tap, timed = every other opener. */
export const PAYWALL_SEEN_SOURCE = Object.freeze({
  win: "win",
  lockedStory: "locked_story",
  timed: "timed",
});

/** Map a headline trigger onto the three paywall_seen sources. Unknown triggers are timed. */
export function paywallSeenSourceFor(trigger) {
  if (trigger === PAYWALL_SEEN_SOURCE.lockedStory || trigger === PAYWALL_SOURCE.lockedStory) {
    return PAYWALL_SEEN_SOURCE.lockedStory;
  }
  if (
    trigger === PAYWALL_BIRD_TRIGGER
    || trigger === PAYWALL_SOURCE.winContinue
    || trigger === PAYWALL_SEEN_SOURCE.win
  ) {
    return PAYWALL_SEEN_SOURCE.win;
  }
  return PAYWALL_SEEN_SOURCE.timed;
}

const EVENTS = new Set(Object.values(FUNNEL_EVENTS));
const TAPS = new Set(Object.values(PAYWALL_TAP));
const BEATS = new Set(["hoy", "doctora", "story0"]);
const PLANS = new Set(["annual", "monthly"]);
/** Same stub ids as purchase.js. Allowlist only — never a receipt or transaction id. */
const PRODUCT_IDS = new Set([
  "com.andale.app.premium.annual",
  "com.andale.app.premium.monthly",
]);
const STORY_ID = /^story-[a-z0-9-]{1,32}$/i;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_SINCE_LAST_CAP = 365;
const LEARNER_DAY_CAP = 3650;

function allowLearnerDay(value) {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > LEARNER_DAY_CAP) return null;
  return value;
}

function civilDayNumber(dayKey) {
  if (typeof dayKey !== "string" || !DAY_KEY.test(dayKey)) return null;
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const local = new Date(y, m - 1, d);
  if (dayKeyFromDate(local) !== dayKey) return null;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/**
 * Whole local calendar days from stored lastDay to today.
 * Same clock as the streak day key (local YYYY-MM-DD).
 * No lastDay → null (first visit, not 0). Same day → 0. Yesterday → 1.
 * Future lastDay clamps to 0. Gaps cap at 365.
 */
export function daysSinceLastVisit(lastDay, today = dayKeyFromDate(new Date())) {
  const from = civilDayNumber(lastDay);
  const to = civilDayNumber(today);
  if (from == null || to == null) return null;
  const days = to - from;
  if (days < 0) return 0;
  if (days > DAYS_SINCE_LAST_CAP) return DAYS_SINCE_LAST_CAP;
  return days;
}

/** Allowlist for the open event only. Drops anything that is not an integer 0–365. */
function allowDaysSinceLast(value) {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > DAYS_SINCE_LAST_CAP) return null;
  return value;
}

function eventBus() {
  return typeof window !== "undefined" ? window : null;
}

function defaultFunnelStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    return null;
  }
  return null;
}

/** Append one allowlisted payload. A full or blocked store leaves the session log alone. */
export function rememberFunnelEvent(payload, storage) {
  const store = storage === undefined ? defaultFunnelStorage() : storage;
  if (!payload || !store || typeof store.getItem !== "function" || typeof store.setItem !== "function") return false;
  try {
    let list = [];
    const raw = store.getItem(FUNNEL_STORE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = [];
      }
    }
    list.push(payload);
    if (list.length > FUNNEL_STORE_CAP) list = list.slice(list.length - FUNNEL_STORE_CAP);
    store.setItem(FUNNEL_STORE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

function safeStoryId(id) {
  return typeof id === "string" && STORY_ID.test(id) ? id : null;
}

/**
 * Tiny allowlisted payload. Never copies caller extras.
 * This device only: window.__andaleFunnelLog + CustomEvent, and localStorage
 * key andale-funnel-log. No network.
 * storyId / beat / choice are content labels only.
 * waitlist_submit, first-win-seen, email-submitted, and email-skipped
 * are event + timestamp only — never the email.
 * first_session_start, first_session_exercise1_correct, first_session_complete,
 * day2_return, and first_streak_seen are event + timestamp only.
 * purchase is event + at + allowlisted plan / productId only.
 * open is event + at, plus daysSinceLast when it is an integer 0–365.
 * paywall_seen, tap_annual, and tap_monthly are event + at, plus source when it
 * is win, locked_story, or timed. paywall_seen also keeps day when it is an
 * integer >= 1. locked_story_capped is event + at + that day.
 */
export function emitFunnelEvent({ event, storyId, beat, choice, plan, productId, daysSinceLast, source, day } = {}, bus = eventBus()) {
  if (!EVENTS.has(event)) return null;
  const payload = { event, at: new Date().toISOString() };
  if (event === FUNNEL_EVENTS.open) {
    const days = allowDaysSinceLast(daysSinceLast);
    if (days != null) payload.daysSinceLast = days;
  }
  if (event === FUNNEL_EVENTS.lecturaStart || event === FUNNEL_EVENTS.lecturaChapterDone) {
    const id = safeStoryId(storyId);
    if (id) payload.storyId = id;
  }
  if (event === FUNNEL_EVENTS.cenzontleComplete && BEATS.has(beat)) {
    payload.beat = beat;
  }
  if (event === FUNNEL_EVENTS.paywallTap && TAPS.has(choice)) {
    payload.choice = choice;
  }
  if (event === FUNNEL_EVENTS.purchase) {
    if (PLANS.has(plan)) payload.plan = plan;
    if (PRODUCT_IDS.has(productId)) payload.productId = productId;
  }
  if (
    (event === FUNNEL_EVENTS.paywallSeen || event === FUNNEL_EVENTS.tapAnnual || event === FUNNEL_EVENTS.tapMonthly)
    && Object.values(PAYWALL_SEEN_SOURCE).includes(source)
  ) {
    payload.source = source;
  }
  if (event === FUNNEL_EVENTS.paywallSeen || event === FUNNEL_EVENTS.lockedStoryCapped) {
    const learnerDay = allowLearnerDay(day);
    if (learnerDay != null) payload.day = learnerDay;
  }
  if (bus) {
    bus[FUNNEL_LOG] = Array.isArray(bus[FUNNEL_LOG]) ? bus[FUNNEL_LOG] : [];
    bus[FUNNEL_LOG].push(payload);
    if (typeof bus.dispatchEvent === "function" && typeof CustomEvent === "function") {
      bus.dispatchEvent(new CustomEvent(FUNNEL_EVENT, { detail: payload }));
    }
  }
  rememberFunnelEvent(payload);
  return payload;
}

/**
 * First-win bird. `hoy` is the first Hoy win that unlocks the Lectura handoff.
 * `doctora` and `story0` are the other first-win birds on the same fly-away.
 * Later Lectura perch is not a beat.
 */
export function cenzontleBeatFromSession(session) {
  if (!session || typeof session !== "object") return null;
  if (session.firstHoy) return "hoy";
  if (session.firstDoctora) return "doctora";
  if (session.firstStory0) return "story0";
  return null;
}
