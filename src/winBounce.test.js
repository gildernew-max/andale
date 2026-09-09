import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  STORY0_BEAT_MS,
  STORY0_DROP_MS,
  STORY0_EASE_CHIP,
  STORY0_EASE_ENTER,
  STORY0_EASE_EXIT,
  STORY0_ENTER_MS,
  STORY0_EXIT_MS,
  STORY0_HOLD_MS,
  STORY0_ID,
  STORY0_WIN_EN,
  STORY0_WIN_ES,
  shouldArmStory0Beat,
  shouldPlayStory0Beat,
  shouldPlayWinBounce,
  story0WinCopy,
  WIN_BOUNCE_MS,
  WIN_BOUNCE_SRC,
} from "./winBounce.js";
import {
  CUBETAS_EASE_ENTER,
  CUBETAS_EASE_EXIT,
  CUBETAS_ENTER_MS,
  CUBETAS_EXIT_MS,
  CUBETAS_LIFT_MS,
  CUBETAS_SQUASH_MS,
  CUBETAS_WIN_MS,
} from "./cubetas.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(WIN_BOUNCE_MS === 720, "bounce timeline is 720ms");
assert(WIN_BOUNCE_SRC === "mascot/cenzontle.png", "bounce uses the live Cenzontle PNG");

assert(shouldPlayWinBounce({ firstHoy: true }), "first Hoy ¡Eso! plays the bounce");
assert(shouldPlayWinBounce({ firstDoctora: true }), "first Doctora ¡Eso! plays the bounce");
assert(shouldPlayWinBounce({ firstHoy: true, esoWin: true }), "Hoy + esoWin still plays once");
assert(!shouldPlayWinBounce({ esoWin: true }), "esoWin alone is the unlock stamp, not the bounce");
assert(!shouldPlayWinBounce({ firstHoy: false }), "later Hoy does not play the bounce");
assert(!shouldPlayWinBounce({}), "empty session does not play the bounce");
assert(!shouldPlayWinBounce(null), "missing session does not play the bounce");
assert(!shouldPlayWinBounce({ todaySceneId: "taqueria" }), "today scene alone is not the first-win gate");
assert(!shouldPlayWinBounce({ firstStory0: true, storyId: "story-0" }), "story-0 uses the 780ms beat, not the 720ms courier");

assert(STORY0_ID === "story-0", "beat is locked to Lectura story-0");
assert(STORY0_BEAT_MS === 780 && STORY0_BEAT_MS === CUBETAS_WIN_MS, "story-0 beat is the Cubetas v2 780ms lock");
assert(STORY0_ENTER_MS === 160 && STORY0_ENTER_MS === CUBETAS_ENTER_MS, "enter is 0–160ms");
assert(STORY0_DROP_MS === 140 && STORY0_DROP_MS === CUBETAS_SQUASH_MS, "chip drop is 160–300ms");
assert(STORY0_HOLD_MS === 120 && STORY0_HOLD_MS === CUBETAS_LIFT_MS, "hold is 300–420ms");
assert(STORY0_EXIT_MS === 360 && STORY0_EXIT_MS === CUBETAS_EXIT_MS, "exit is 420–780ms");
assert(STORY0_ENTER_MS + STORY0_DROP_MS + STORY0_HOLD_MS + STORY0_EXIT_MS === STORY0_BEAT_MS, "phases sum to 780ms");
assert(STORY0_EASE_ENTER === CUBETAS_EASE_ENTER && STORY0_EASE_ENTER === "cubic-bezier(.22,.75,.25,1)", "enter ease matches Cubetas v2");
assert(STORY0_EASE_CHIP === "cubic-bezier(.35,.05,.7,.45)", "chip fall ease");
assert(STORY0_EASE_EXIT === CUBETAS_EASE_EXIT && STORY0_EASE_EXIT === "cubic-bezier(.45,0,.8,.45)", "exit ease matches Cubetas v2");
assert(STORY0_WIN_ES === "¡Eso!" && STORY0_WIN_EN === "That's it.", "George words are locked");
assert(story0WinCopy("es") === "¡Eso!" && story0WinCopy("en") === "That's it.", "story-0 win copy follows uiLang");
assert(!/\n/.test(STORY0_WIN_ES + STORY0_WIN_EN), "no second caption line under the bird");

const story0Pages = [0, 1, 2, 3, 4, 5];
assert(shouldArmStory0Beat({ storyId: "story-0", pagesSeen: story0Pages, pageCount: 6 }), "first story-0 claim after all pages arms the beat");
assert(shouldArmStory0Beat({ storyId: "story-0", claimed: false, pagesSeen: story0Pages, pageCount: 6 }), "unclaimed story-0 after all pages arms the beat");
assert(!shouldArmStory0Beat({ storyId: "story-0", claimed: true, pagesSeen: story0Pages, pageCount: 6 }), "already-claimed story-0 does not replay");
assert(!shouldArmStory0Beat({ storyId: "story-0", pagesSeen: [0, 1, 2], pageCount: 6 }), "partial story-0 does not arm the beat");
assert(!shouldArmStory0Beat({ storyId: "story-0", pageCount: 6 }), "story-0 with no pages seen does not arm");
assert(!shouldArmStory0Beat({ storyId: "story-1", pagesSeen: story0Pages, pageCount: 6 }), "story-1 does not arm the beat");
assert(!shouldArmStory0Beat({ storyId: "story-2", pagesSeen: [0, 1, 2, 3, 4, 5], pageCount: 6 }), "later stories do not arm the beat");
assert(!shouldArmStory0Beat({}), "missing story id does not arm the beat");

assert(shouldPlayStory0Beat({ firstStory0: true, storyId: "story-0" }), "done screen plays story-0 beat");
assert(!shouldPlayStory0Beat({ firstStory0: true, storyId: "story-1" }), "firstStory0 on another id is not story-0");
assert(!shouldPlayStory0Beat({ firstStory0: true }), "missing storyId does not play");
assert(!shouldPlayStory0Beat({ storyId: "story-0" }), "story-0 id without firstStory0 does not play");
assert(!shouldPlayStory0Beat({ firstHoy: true }), "Hoy uses the 720ms courier, not the story-0 beat");
assert(!shouldPlayStory0Beat({ firstDoctora: true }), "Doctora uses the 720ms courier, not the story-0 beat");
assert(!shouldPlayStory0Beat({ esoWin: true, storyId: "story-0" }), "esoWin stamp is not the story-0 gate");
assert(!shouldPlayStory0Beat(null), "missing session does not play story-0 beat");
assert(!shouldPlayStory0Beat({}), "empty session does not play story-0 beat");

const here = dirname(fileURLToPath(import.meta.url));
const bounceSrc = readFileSync(join(here, "WinBounce.jsx"), "utf8");
const helperSrc = readFileSync(join(here, "winBounce.js"), "utf8");
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");

assert(bounceSrc.includes("WIN_BOUNCE_SRC"), "overlay reads the live mark path");
assert(bounceSrc.includes("data-testid=\"win-bounce\""), "overlay is testable");
assert(bounceSrc.includes("data-testid=\"win-bounce-bird\""), "bird layer is testable");
assert(bounceSrc.includes("\"win-bounce-chip\""), "chip layer is testable");
assert(bounceSrc.includes("data-testid=\"win-perch\""), "landed perch is testable");
assert(bounceSrc.includes("data-testid=\"win-perch-bird\""), "perch bird is testable");
assert(bounceSrc.includes("\"win-perch-chip\""), "perch chip is testable");
assert(bounceSrc.includes("cenzontle-courier 720ms"), "bird is one 720ms courier timeline");
assert(bounceSrc.includes("30.555%"), "bird entry lands at 220ms (30.555% of 720)");
assert(bounceSrc.includes("translate(28vw, -50%)"), "entry starts on-screen from the right");
assert(bounceSrc.includes("translate(-50%, -50%)"), "entry lands at the perched center");
assert(!bounceSrc.includes("top: -18%"), "entry must not start above the viewport");
assert(!bounceSrc.includes("top: -22%"), "exit must not leave the viewport");
assert(!bounceSrc.includes("left: 72%"), "flight is transform-only — no left/top waypoints");
assert(bounceSrc.includes("rotate(-12deg)"), "entry starts at -12°");
assert(bounceSrc.includes("rotate(4deg)"), "entry lands at +4°");
assert(!bounceSrc.includes("cenzontle-entry"), "entry is not a second animation on left/top");
assert(!bounceSrc.includes("cenzontle-exit"), "exit is not a second animation on left/top");
assert((bounceSrc.match(/animation: cenzontle-courier/g) || []).length === 1, "bird uses one courier animation so left/top cannot be stolen");
assert(/cenzontle-bounce[^}]*z-index:\s*80/.test(bounceSrc), "overlay sits above confetti (z-index 50)");
assert(bounceSrc.includes("cenzontle-chip-fall 160ms"), "chip fall is 200–360ms (160ms)");
assert(bounceSrc.includes("cenzontle-chip-hit 90ms"), "chip impact is a 90ms scale flash");
assert(bounceSrc.includes("cubic-bezier(.22,.75,.25,1)"), "bird entry ease");
assert(bounceSrc.includes("cubic-bezier(.35,.05,.7,.45)"), "chip fall ease");
assert(bounceSrc.includes("cubic-bezier(.2,.8,.3,1)"), "chip impact ease");
assert(bounceSrc.includes("rotate(-20deg)"), "one wing stroke starts raised");
assert(bounceSrc.includes("rotate(15deg)"), "one wing stroke lowers");
assert(bounceSrc.includes("cenzontle-wing 300ms"), "wing is one authored stroke");
assert(!/cenzontle-wing[^;]*infinite/.test(bounceSrc), "wing is not a flap loop");
assert(!/animation:[^;]*infinite/.test(bounceSrc), "bounce has no looping animations");
assert(!/scaleX\s*\(\s*-1\s*\)/.test(bounceSrc), "bounce must not CSS-mirror the right-facing Cenzontle");
assert(!/rotateY\s*\(\s*180/.test(bounceSrc), "bounce must not rotateY the right-facing mark");
assert(!/confetti|hover|idleBob|wink|head.?bob|squash/i.test(bounceSrc), "bounce stays courier — no theater");
assert(!/three-bounce|glow.?breath|flap loop/i.test(bounceSrc + helperSrc), "forbidden beats stay out");
assert(bounceSrc.includes("setTimeout(finish, WIN_BOUNCE_MS)"), "courier timeline still ends at 720ms");
assert(bounceSrc.includes("@media (prefers-reduced-motion: reduce)"), "reduced motion keeps the landed bird, not an empty overlay");
assert(appSrc.includes("from \"./WinBounce.jsx\""), "App imports the bounce overlay");
assert(appSrc.includes("<WinPerch"), "first-win screen keeps a perched bird after the courier unmounts");
assert(appSrc.includes("win-perch-slot"), "perch slot reserves the on-screen landing zone");
assert(appSrc.includes("shouldArmStory0Beat"), "claimStory arms the story-0 beat");
assert(appSrc.includes("shouldPlayStory0Beat(session)"), "done screen gates the 780ms overlay");
assert(appSrc.includes("<Story0Beat"), "story-0 mounts the Cubetas-family beat");
assert(appSrc.includes("session.firstStory0"), "quiet win includes first story-0");
assert(appSrc.includes("story-0-win"), "story-0 win heading is testable");
assert(appSrc.includes("story-0-win-continue"), "story-0 Continue is testable");
assert(appSrc.includes("if (!playStory0) setBurst"), "story-0 claim skips the burst so confetti stays muted");

const story0Src = bounceSrc;
assert(story0Src.includes("data-testid=\"story-0-beat\""), "story-0 overlay is testable");
assert(story0Src.includes("data-testid=\"story-0-beat-bird\""), "story-0 bird is testable");
assert(story0Src.includes("\"story-0-beat-chip\""), "story-0 chip is testable");
assert(story0Src.includes("STORY0_BEAT_MS"), "overlay reads the 780ms lock");
assert(story0Src.includes("story0Courier ${STORY0_BEAT_MS}ms ${STORY0_EASE_ENTER}"), "bird is one 780ms Cubetas-family timeline");
assert(story0Src.includes("STORY0_EASE_ENTER"), "enter easing is wired");
assert(story0Src.includes("STORY0_EASE_CHIP"), "chip-fall easing is wired");
assert(story0Src.includes("STORY0_EASE_EXIT"), "exit easing is wired");
assert(story0Src.includes("20.513%"), "enter lands at 160ms (20.513% of 780)");
assert(story0Src.includes("38.462%"), "drop/hold meets at 300ms");
assert(story0Src.includes("53.846%"), "hold settles at 420ms");
assert(story0Src.includes("76.923%"), "exit arc peaks at 600ms");
assert(story0Src.includes("translate(160px, 8px)"), "enter starts from off-right of the perch slot");
assert(story0Src.includes("translate(72px, -28px)"), "enter is a real arc, not a straight translate");
assert(story0Src.includes("translate(0, 0) rotate(4deg)"), "hold starts at +4° over the chip");
assert(story0Src.includes("translate(0, 0) rotate(0deg)"), "hold settles to 0°");
assert(story0Src.includes("translate(-118px, -158px)"), "exit is a real up-left arc, not a straight translate");
assert(story0Src.includes("translate(-240px, -72px)"), "exit finishes the Cubetas-family arc");
assert(story0Src.includes("story0ChipFall ${STORY0_DROP_MS}ms ${STORY0_EASE_CHIP} ${STORY0_ENTER_MS}ms"), "chip falls 160–300ms");
assert(story0Src.includes("scale(.9)"), "chip impact starts at 0.9");
assert(story0Src.includes("scale(1.08)"), "chip impact flashes to 1.08");
assert(/story0-beat[^}]*z-index:\s*80/.test(story0Src), "story-0 overlay sits at z≥80");
assert(story0Src.includes("story0Wing ${STORY0_ENTER_MS}ms"), "one wing stroke on enter");
assert(!/story0-wing[^;]*infinite/.test(story0Src), "story-0 wing is not a flap loop");
assert(!/scaleX\s*\(\s*-1\s*\)/.test(story0Src), "story-0 must not CSS-mirror the right-facing Cenzontle");
assert(!/¡Eso!|That's it\./.test(story0Src), "George words are not baked into the overlay PNG/CSS");
assert(!/confetti|hover|idleBob|wink|look-back|lookBack/i.test(story0Src.slice(story0Src.indexOf("Story0Beat"))), "story-0 beat stays courier — no theater");

console.log("ok: Cenzontle first-win bounce — on-screen fly-in / points drop / perch.");
console.log("ok: story-0 Cenzontle 780ms beat — Cubetas v2 family + WinPerch.");
