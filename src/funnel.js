/** Pages conversion funnel. Local bus only — no third-party SDK, no PII. */

export const FUNNEL_EVENT = "andale-funnel";
export const FUNNEL_LOG = "__andaleFunnelLog";

export const FUNNEL_EVENTS = Object.freeze({
  open: "open",
  cenzontleComplete: "cenzontle_complete",
  lecturaHandoffSeen: "lectura_handoff_seen",
  lecturaHandoffTap: "lectura_handoff_tap",
  lecturaStart: "lectura_start",
  paywallSeen: "paywall_seen",
  paywallTap: "paywall_tap",
  waitlistSubmit: "waitlist_submit",
});

export const PAYWALL_TAP = Object.freeze({
  annual: "annual",
  monthly: "monthly",
  continueFree: "continue_free",
});

const EVENTS = new Set(Object.values(FUNNEL_EVENTS));
const TAPS = new Set(Object.values(PAYWALL_TAP));
const BEATS = new Set(["hoy", "doctora", "story0"]);
const STORY_ID = /^story-[a-z0-9-]{1,32}$/i;

function eventBus() {
  return typeof window !== "undefined" ? window : null;
}

function safeStoryId(id) {
  return typeof id === "string" && STORY_ID.test(id) ? id : null;
}

/**
 * Tiny allowlisted payload. Never copies caller extras.
 * storyId / beat / choice are content labels only.
 * waitlist_submit is event + timestamp only — never the email.
 */
export function emitFunnelEvent({ event, storyId, beat, choice } = {}, bus = eventBus()) {
  if (!EVENTS.has(event)) return null;
  const payload = { event, at: new Date().toISOString() };
  if (event === FUNNEL_EVENTS.lecturaStart || event === FUNNEL_EVENTS.lecturaHandoffTap) {
    const id = safeStoryId(storyId);
    if (id) payload.storyId = id;
  }
  if (event === FUNNEL_EVENTS.cenzontleComplete && BEATS.has(beat)) {
    payload.beat = beat;
  }
  if (event === FUNNEL_EVENTS.paywallTap && TAPS.has(choice)) {
    payload.choice = choice;
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

export function cenzontleBeatFromSession(session) {
  if (!session || typeof session !== "object") return null;
  if (session.firstHoy) return "hoy";
  if (session.firstDoctora) return "doctora";
  if (session.firstStory0) return "story0";
  return null;
}
