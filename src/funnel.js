/** Pages conversion funnel. Local bus only — no third-party SDK, no PII.
 *  first-win-seen / email-submitted / email-skipped are event + timestamp only.
 *  The address never rides this bus. Delivery lives in firstWinEmail.js.
 *  `open` may also carry daysSinceLast: whole local calendar days since
 *  stored lastDay, 0–365. Missing lastDay omits the field.
 *  first_session_start / first_session_exercise1_correct / first_session_complete
 *  / day2_return are event + timestamp only. Once-per-device gating lives in
 *  firstSessionFunnel.js, not on this bus.
 */

import { dayKeyFromDate } from "./firstDoor.js";

export const FUNNEL_EVENT = "andale-funnel";
export const FUNNEL_LOG = "__andaleFunnelLog";

export const FUNNEL_EVENTS = Object.freeze({
  open: "open",
  cenzontleComplete: "cenzontle_complete",
  lecturaStart: "lectura_start",
  lecturaChapterDone: "lectura_chapter_done",
  paywallSeen: "paywall_seen",
  paywallTap: "paywall_tap",
  waitlistSubmit: "waitlist_submit",
  purchase: "purchase",
  firstWinSeen: "first-win-seen",
  emailSubmitted: "email-submitted",
  emailSkipped: "email-skipped",
  firstSessionStart: "first_session_start",
  firstSessionExercise1Correct: "first_session_exercise1_correct",
  firstSessionComplete: "first_session_complete",
  day2Return: "day2_return",
});

export const PAYWALL_TAP = Object.freeze({
  annual: "annual",
  monthly: "monthly",
  continueFree: "continue_free",
});

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

function safeStoryId(id) {
  return typeof id === "string" && STORY_ID.test(id) ? id : null;
}

/**
 * Tiny allowlisted payload. Never copies caller extras.
 * Local bus only: window.__andaleFunnelLog + CustomEvent. No network.
 * storyId / beat / choice are content labels only.
 * waitlist_submit, first-win-seen, email-submitted, and email-skipped
 * are event + timestamp only — never the email.
 * first_session_start, first_session_exercise1_correct, first_session_complete,
 * and day2_return are event + timestamp only.
 * purchase is event + at + allowlisted plan / productId only.
 * open is event + at, plus daysSinceLast when it is an integer 0–365.
 */
export function emitFunnelEvent({ event, storyId, beat, choice, plan, productId, daysSinceLast } = {}, bus = eventBus()) {
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
  if (bus) {
    bus[FUNNEL_LOG] = Array.isArray(bus[FUNNEL_LOG]) ? bus[FUNNEL_LOG] : [];
    bus[FUNNEL_LOG].push(payload);
    if (typeof bus.dispatchEvent === "function" && typeof CustomEvent === "function") {
      bus.dispatchEvent(new CustomEvent(FUNNEL_EVENT, { detail: payload }));
    }
  }
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
