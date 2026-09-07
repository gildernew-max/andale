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

assert(bounceSrc.includes("WIN_BOUNCE_SRC"), "overlay reads the live mark path");
assert(bounceSrc.includes("data-testid=\"win-bounce\""), "overlay is testable");
assert(bounceSrc.includes("data-testid=\"win-bounce-bird\""), "bird layer is testable");
assert(bounceSrc.includes("data-testid=\"win-bounce-chip\""), "chip layer is testable");
assert(bounceSrc.includes("cenzontle-entry 220ms"), "bird entry is 0–220ms");
assert(bounceSrc.includes("cenzontle-exit 420ms"), "bird exit is 300–720ms (420ms)");
assert(bounceSrc.includes("cenzontle-chip-fall 160ms"), "chip fall is 200–360ms (160ms)");
assert(bounceSrc.includes("cenzontle-chip-hit 90ms"), "chip impact is a 90ms scale flash");
assert(bounceSrc.includes("cubic-bezier(.22,.75,.25,1)"), "bird entry ease");
assert(bounceSrc.includes("cubic-bezier(.45,0,.8,.45)"), "bird exit ease");
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
assert(bounceSrc.includes("setTimeout(finish, WIN_BOUNCE_MS)"), "unmounts when the 720ms timeline ends");

console.log("ok: Cenzontle first-win bounce — 720ms fly-in / points drop.");
