/** Day-2 return card. Uses the existing streak earn rule and Lectura open
 *  rule. Does not write streak, lastDay, or the paywall day-2 trigger.
 *
 *  The stored streak is still 1 and lastDay is yesterday: cdmxUnlockFlashStreak
 *  already calls that a 2. That is the first time the streak hits 2.
 *  A later visit, a same-day visit, or a missed day stays off this card.
 *
 *  The button target is the story they left unfinished, or the next story
 *  after the one they finished. It has to be open under isLecturaStoryOpen
 *  (the same check openStory uses). A locked target shows nothing and
 *  does not emit first_streak_seen.
 */

import { prevDayKey } from "./firstDoor.js";
import { isLecturaStoryOpen } from "./lecturaHandoff.js";
import { cdmxUnlockFlashStreak } from "./recuerdos.js";
import { calendarGap } from "./streakDisplay.js";

export const FIRST_STREAK_RETURN_KEY = "andale-first-streak-return";

export const FIRST_STREAK_BIRD_PX = 96;
export const FIRST_STREAK_FADE_MS = 150;
export const FIRST_STREAK_HUB_MAX = 480;
export const FIRST_STREAK_PAGE_PAD = 16;
export const FIRST_STREAK_CARD_PAD = 12;
export const FIRST_STREAK_NARROW_PX = 360;

export const FIRST_STREAK_HEADLINE = Object.freeze({
  en: "2 days in a row.",
  es: "2 días seguidos.",
});

export const FIRST_STREAK_BUTTON = Object.freeze({
  halfway: Object.freeze({ en: "Keep reading", es: "Sigue leyendo" }),
  next: Object.freeze({ en: "Start reading", es: "Empieza a leer" }),
});

export const FIRST_STREAK_FALLBACK = Object.freeze({
  en: "Your story is waiting where you left it.",
  es: "Tu cuento te espera donde lo dejaste.",
});

/** Nunito 600 advances from public/fonts/nunito-600.woff2. Units per em 1000. */
const UPEM = 1000;
const LINE_PX = 16;
const UNKNOWN_ADVANCE = 560;
const ADVANCE_TABLE = "32:264,33:237,34:417,35:600,36:600,37:937,38:708,39:231,40:336,41:336,42:452,43:600,44:237,45:429,46:237,47:297,48:600,49:600,50:600,51:600,52:600,53:600,54:600,55:600,56:600,57:600,58:237,59:237,60:600,61:600,62:600,63:450,64:948,65:736,66:682,67:676,68:751,69:589,70:554,71:731,72:767,73:268,74:338,75:643,76:552,77:861,78:743,79:775,80:642,81:775,82:677,83:622,84:611,85:733,86:700,87:1107,88:660,89:606,90:596,91:333,92:297,93:333,94:600,95:500,96:366,97:537,98:591,99:467,100:591,101:537,102:347,103:594,104:576,105:243,106:246,107:516,108:306,109:866,110:576,111:565,112:591,113:591,114:373,115:484,116:365,117:569,118:520,119:846,120:534,121:520,122:468,123:370,124:275,125:370,126:600,161:237,171:465,187:465,191:450,193:736,201:589,205:268,209:743,211:775,218:733,220:733,225:537,233:537,237:243,241:576,243:565,250:569,252:569,8211:500,8212:1000,8217:237,8220:416,8221:416";

const ADVANCE = new Map(ADVANCE_TABLE.split(",").map((pair) => {
  const [code, adv] = pair.split(":");
  return [Number(code), Number(adv)];
}));

/** Survives a StrictMode remount in this document. A reload starts false. */
let live = false;

export function forgetFirstStreakReturnLive() {
  live = false;
}

function uiLang(lang) {
  return lang === "en" ? "en" : "es";
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

export function readFirstStreakReturn(storage) {
  const raw = safeGet(storage, FIRST_STREAK_RETURN_KEY);
  if (!raw) return { seen: false, dismissed: false };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { seen: false, dismissed: false };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { seen: false, dismissed: false };
  return { seen: parsed.seen === true, dismissed: parsed.dismissed === true };
}

function writeState(storage, state) {
  const out = {};
  if (state.seen) out.seen = true;
  if (state.dismissed) out.dismissed = true;
  return safeSet(storage, FIRST_STREAK_RETURN_KEY, JSON.stringify(out));
}

/**
 * Width of the line under the headline. The line is its own row, so the
 * 96px bird does not eat it. At 360 that column is 304px.
 */
export function firstStreakLineColumn(viewportWidth) {
  const viewport = Number(viewportWidth);
  const view = Number.isFinite(viewport) && viewport > 0 ? viewport : FIRST_STREAK_NARROW_PX;
  const hub = Math.min(FIRST_STREAK_HUB_MAX, view);
  return hub - FIRST_STREAK_PAGE_PAD * 2 - FIRST_STREAK_CARD_PAD * 2;
}

/** 16px Nunito 600 width. Italic on this face is a skew, so advances stay. */
export function firstStreakLinePx(text) {
  let units = 0;
  const value = String(text || "");
  for (const ch of value) {
    const adv = ADVANCE.get(ch.codePointAt(0));
    units += adv == null ? UNKNOWN_ADVANCE : adv;
  }
  return (units * LINE_PX) / UPEM;
}

export function firstStreakLineWraps(text, columnPx) {
  const column = Number(columnPx);
  if (!Number.isFinite(column) || column <= 0) return true;
  return firstStreakLinePx(text) > column;
}

function storyTitle(story) {
  const title = story && typeof story.title === "string" ? story.title.trim() : "";
  return title;
}

function waitingLine(lang, title) {
  if (lang === "en") return { before: "", title, after: " is waiting where you left it." };
  return { before: "", title, after: " te espera donde lo dejaste." };
}

function nextLine(lang, title) {
  if (lang === "en") return { before: "Your next story is ready: ", title, after: "." };
  return { before: "Tu siguiente cuento está listo: ", title, after: "." };
}

/**
 * Word set (a) falls back when the titled line would wrap.
 * Word set (b) keeps the title. There is no second fallback sentence.
 */
export function firstStreakCopy({ lang, mode, title, columnPx } = {}) {
  const face = uiLang(lang);
  const name = typeof title === "string" ? title.trim() : "";
  const headline = FIRST_STREAK_HEADLINE[face];
  const button = FIRST_STREAK_BUTTON[mode === "next" ? "next" : "halfway"][face];
  if (mode === "halfway" && (!name || firstStreakLineWraps(`${waitingLine(face, name).before}${name}${waitingLine(face, name).after}`, columnPx))) {
    const line = FIRST_STREAK_FALLBACK[face];
    return { headline, button, before: line, title: "", after: "", line, fallback: true };
  }
  const parts = mode === "next" ? nextLine(face, name) : waitingLine(face, name);
  const line = `${parts.before}${parts.title}${parts.after}`;
  return { headline, button, before: parts.before, title: parts.title, after: parts.after, line, fallback: false };
}

/**
 * Stored streak 1 and last activity yesterday. Same earn step as the
 * CDMX glow: yesterday rolls n to n + 1. Here that roll is 1 → 2.
 */
export function firstStreakHitsTwo({ streak, lastDay, today } = {}) {
  const yesterday = prevDayKey(today);
  if (!yesterday) return false;
  const stored = Math.floor(Number(streak) || 0);
  const earned = cdmxUnlockFlashStreak({ streak, lastDay, today, yesterday });
  return stored === 1 && earned === 2 && calendarGap(lastDay, today) === 1;
}

function storyList(stories) {
  return Array.isArray(stories) ? stories : [];
}

function claimedMap(claimed) {
  return claimed && typeof claimed === "object" && !Array.isArray(claimed) ? claimed : {};
}

function storyById(stories, id) {
  if (!id) return null;
  return storyList(stories).find((story) => story && story.id === id) || null;
}

/**
 * Halfway: the story they opened and have not claimed, when that story is open.
 * Finished: the next story after the one they last finished, when that next
 * story is open. Anything else is locked or nothing.
 */
export function firstStreakDestination({ stories, claimed, lecturaOpenId, lecturaStarted = false } = {}) {
  const list = storyList(stories);
  const done = claimedMap(claimed);
  const opened = storyById(list, typeof lecturaOpenId === "string" ? lecturaOpenId : "");

  if (opened && !done[opened.id]) {
    if (!isLecturaStoryOpen(list, done, opened.id)) return { kind: "locked", story: opened };
    return { kind: "halfway", story: opened };
  }

  let finished = opened && done[opened.id] ? opened : null;
  if (!finished) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i] && list[i].id && done[list[i].id]) {
        finished = list[i];
        break;
      }
    }
  }
  if (finished) {
    const idx = list.findIndex((story) => story && story.id === finished.id);
    const next = idx >= 0 ? list[idx + 1] : null;
    if (!next || !next.id) return { kind: "none", story: null };
    if (!isLecturaStoryOpen(list, done, next.id)) return { kind: "locked", story: next };
    return { kind: "next", story: next };
  }

  if (lecturaStarted) {
    const frontier = list.find((story) => story && story.id && !done[story.id]) || null;
    if (frontier && isLecturaStoryOpen(list, done, frontier.id)) return { kind: "halfway", story: frontier };
  }
  return { kind: "none", story: null };
}

export function firstStreakReturn({
  stories,
  claimed,
  lecturaOpenId,
  lecturaStarted = false,
  streak,
  lastDay,
  today,
  lang,
  viewportWidth,
} = {}) {
  const face = uiLang(lang);
  const column = firstStreakLineColumn(viewportWidth);
  if (!firstStreakHitsTwo({ streak, lastDay, today })) {
    return { show: false, reason: "streak", lang: face };
  }
  const dest = firstStreakDestination({ stories, claimed, lecturaOpenId, lecturaStarted });
  if (dest.kind === "locked") return { show: false, reason: "locked", lang: face, storyId: dest.story?.id || "" };
  if (dest.kind !== "halfway" && dest.kind !== "next") return { show: false, reason: "none", lang: face };
  const title = storyTitle(dest.story);
  if (dest.kind === "next" && !title) return { show: false, reason: "none", lang: face };
  const copy = firstStreakCopy({ lang: face, mode: dest.kind, title, columnPx: column });
  return {
    show: true,
    reason: dest.kind,
    mode: dest.kind,
    storyId: dest.story.id,
    lang: face,
    column,
    ...copy,
  };
}

/** Show the card and emit once. A later call in this document stays visible without a second emit. */
export function presentFirstStreakReturn(storage, decision) {
  if (!decision || decision.show !== true) return { fire: false, visible: false };
  const state = readFirstStreakReturn(storage);
  if (state.dismissed) {
    live = false;
    return { fire: false, visible: false };
  }
  if (live) return { fire: false, visible: true };
  if (state.seen) return { fire: false, visible: false };
  if (!writeState(storage, { seen: true, dismissed: false })) return { fire: false, visible: false };
  live = true;
  return { fire: true, visible: true };
}

/** Button tap or opening a lesson. The card does not come back. */
export function dismissFirstStreakReturn(storage) {
  live = false;
  return writeState(storage, { seen: true, dismissed: true });
}
