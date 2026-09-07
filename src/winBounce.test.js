import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { shouldPlayWinBounce, WIN_BOUNCE_MS, WIN_BOUNCE_SRC } from "./winBounce.js";

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

const here = dirname(fileURLToPath(import.meta.url));
const bounceSrc = readFileSync(join(here, "WinBounce.jsx"), "utf8");
const helperSrc = readFileSync(join(here, "winBounce.js"), "utf8");
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");

assert(bounceSrc.includes("WIN_BOUNCE_SRC"), "overlay reads the live mark path");
assert(bounceSrc.includes("data-testid=\"win-bounce\""), "overlay is testable");
assert(bounceSrc.includes("data-testid=\"win-bounce-bird\""), "bird layer is testable");
assert(bounceSrc.includes("data-testid=\"win-bounce-chip\""), "chip layer is testable");
assert(bounceSrc.includes("data-testid=\"win-perch\""), "landed perch is testable");
assert(bounceSrc.includes("data-testid=\"win-perch-bird\""), "perch bird is testable");
assert(bounceSrc.includes("data-testid=\"win-perch-chip\""), "perch chip is testable");
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
assert(!/cenzontle-bird\s*\{[^}]*animation:\s*[^;]+,/.test(bounceSrc), "bird uses one animation so left/top cannot be stolen");
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

console.log("ok: Cenzontle first-win bounce — on-screen fly-in / points drop / perch.");
