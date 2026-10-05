/** Once-per-device stamps for the first-session measurement events.
 *  The names live on the funnel bus. This module only decides whether
 *  a call site may emit, and remembers that decision in localStorage.
 *  No network, no address, no name.
 *
 *  Day-2 is a later local calendar day (same YYYY-MM-DD clock as the
 *  streak), for a learner who started or completed session one.
 *  The anchor is the day session one began when we recorded it, otherwise
 *  the stored progress lastDay. A pre-release save marked firstSessionDone
 *  by migration never entered session one, so that flag alone does not count.
 */

import { daysSinceLastVisit } from "./funnel.js";

export const FIRST_SESSION_FUNNEL_KEY = "andale-first-session-funnel";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function blank() {
  return { start: false, startDay: "", exercise1: false, complete: false, day2: false };
}

function dayKey(value) {
  return typeof value === "string" && DAY_KEY.test(value) ? value : "";
}

function safeGet(storage, key) {
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const value = storage.getItem(key);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function readFirstSessionFunnel(storage) {
  const raw = safeGet(storage, FIRST_SESSION_FUNNEL_KEY);
  if (!raw) return blank();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return blank();
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return blank();
  return {
    start: parsed.start === true,
    startDay: dayKey(parsed.startDay),
    exercise1: parsed.exercise1 === true,
    complete: parsed.complete === true,
    day2: parsed.day2 === true,
  };
}

function persistable(state) {
  const out = {};
  if (state.start) out.start = true;
  if (state.startDay) out.startDay = state.startDay;
  if (state.exercise1) out.exercise1 = true;
  if (state.complete) out.complete = true;
  if (state.day2) out.day2 = true;
  return out;
}

/** Returns the next state when this call may emit, or null when it must not. */
function claim(storage, mutate) {
  const state = readFirstSessionFunnel(storage);
  const next = mutate(state);
  if (!next) return { fire: false, state };
  if (!safeSet(storage, FIRST_SESSION_FUNNEL_KEY, JSON.stringify(persistable(next)))) {
    return { fire: false, state };
  }
  return { fire: true, state: next };
}

/** Session one actually began (onboarding start, path Empezar, or an unstamped resume). */
export function claimFirstSessionStart(storage, today) {
  const day = dayKey(today);
  return claim(storage, (state) => {
    if (state.start) return null;
    return { ...state, start: true, startDay: state.startDay || day };
  });
}

/** First exercise of session one was graded correct. Once, including a later reload. */
export function claimFirstSessionExercise1(storage) {
  return claim(storage, (state) => (state.exercise1 ? null : { ...state, exercise1: true }));
}

/** The first-session win screen is on. Once. */
export function claimFirstSessionComplete(storage) {
  return claim(storage, (state) => (state.complete ? null : { ...state, complete: true }));
}

/**
 * Progress signal that session one was entered.
 * firstSessionArmed is written when the session begins.
 * firstSessionDone alone is not enough: migration stamps it on pre-release saves.
 */
export function sessionOneFromProgress(progress) {
  if (!progress || typeof progress !== "object") return { started: false, lastDay: null };
  const lastDay = typeof progress.lastDay === "string" && progress.lastDay ? progress.lastDay : null;
  return { started: progress.firstSessionArmed === true, lastDay };
}

/** Started or completed session one. Exercise-1 alone is not a start stamp. */
export function sessionOneEngaged({ funnel, progressStarted = false } = {}) {
  return !!(funnel?.start || funnel?.complete || progressStarted);
}

/**
 * First open on a later local calendar day.
 * Same day is 0 and does not fire. A missing anchor does not fire.
 * Already stamped does not fire.
 */
export function claimDay2Return(storage, { today, progressStarted = false, lastDay = "" } = {}) {
  const day = dayKey(today);
  const prior = dayKey(lastDay);
  return claim(storage, (state) => {
    if (state.day2) return null;
    if (!sessionOneEngaged({ funnel: state, progressStarted })) return null;
    const anchor = state.startDay || prior;
    const days = daysSinceLastVisit(anchor, day);
    if (days == null || days < 1) return null;
    return { ...state, day2: true };
  });
}

/** Exercise 1 of session one, graded correct. A miss, a soft almost, or a later beat does not qualify. */
export function isFirstExerciseCorrect({ firstSession, index, result, requeued } = {}) {
  return firstSession === true && index === 0 && result === "correct" && !requeued;
}
