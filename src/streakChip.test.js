import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STREAK_FLAME, STREAK_LABEL_DARK, STREAK_LABEL_LIGHT, shouldPopFirstStreak, streakChipLabel, streakLabelColor } from "./streakChip.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(streakChipLabel(1, "en") === "1-day streak", "EN 1 is 1-day streak");
assert(streakChipLabel(2, "en") === "2-day streak", "EN 2 is 2-day streak");
assert(streakChipLabel(11, "en") === "11-day streak", "EN plural keeps the live N-day streak wording");
assert(streakChipLabel(1, "es") === "Racha de 1 día", "ES 1 is Racha de 1 día");
assert(streakChipLabel(2, "es") === "Racha de 2 días", "ES 2 is Racha de 2 días");
assert(streakChipLabel(11, "es") === "Racha de 11 días", "ES plural is días");
assert(streakChipLabel(0, "en") === "", "EN 0 returns nothing — no chip");
assert(streakChipLabel(0, "es") === "", "ES 0 returns nothing — no chip");

assert(shouldPopFirstStreak({ before: 0, after: 1 }) === true, "0 to 1 pops once");
assert(shouldPopFirstStreak({ before: 1, after: 2 }) === false, "1 to 2 does not pop");
assert(shouldPopFirstStreak({ before: 2, after: 3 }) === false, "2 to 3 does not pop");
assert(shouldPopFirstStreak({ before: 0, after: 0 }) === false, "0 to 0 does not pop");
assert(shouldPopFirstStreak() === false, "undefined does not pop");
assert(shouldPopFirstStreak(undefined) === false, "undefined argument does not pop");
assert(shouldPopFirstStreak({ before: undefined, after: 1 }) === false, "undefined before does not pop");
assert(shouldPopFirstStreak({ before: 0, after: undefined }) === false, "undefined after does not pop");
assert(shouldPopFirstStreak({ before: 1, after: 1 }) === false, "repeat of the same streak does not pop");
assert(shouldPopFirstStreak({ before: 0, after: 1 }) === true, "a second 0 to 1 call stays true — the helper does not latch");

assert(STREAK_LABEL_LIGHT === "#A35700", "light streak label is #A35700");
assert(STREAK_LABEL_DARK === "#FE9F17", "dark streak label stays #FE9F17");
assert(STREAK_FLAME === "#FE9F17", "flame icon is #FE9F17");
assert(streakLabelColor("light") === "#A35700", "light theme uses the brown label");
assert(streakLabelColor("dark") === "#FE9F17", "dark theme keeps the flame orange label");
assert(streakLabelColor(undefined) === "#A35700", "missing theme uses the light label");

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
assert((appSrc.match(/color: streakLabelColor\(theme\)/g) || []).length >= 3, "hub, session-close, and milestone streak text use the theme ink");
assert(appSrc.includes('ink: streakLabelColor(theme), testid: "win-earned-streak"'), "win streak card text uses the theme ink");
assert(appSrc.includes('c: "#FF9600", ink: streakLabelColor(theme), testid: "win-earned-streak"'), "win streak card border stays the chip hue");
assert((appSrc.match(/fill=\{STREAK_FLAME\}/g) || []).length >= 5, "daily-streak flames use the shared icon fill");
assert(/fill = "#FF9600"/.test(appSrc), "non-streak flames keep the previous default body");
assert(appSrc.includes('fill="#FFC800"'), "flame highlight stays");
assert(!appSrc.includes("Mañana sigue la siguiente"), "old subjunctive win line is not reintroduced");

assert(appSrc.includes("shouldPopFirstStreak({ before: session.streakBefore, after: prog.streak })"), "win screen asks shouldPopFirstStreak with the pre-session streak");
assert(appSrc.includes("streakBefore: s.streakBefore != null ? s.streakBefore : (Number(prog.streak) || 0)"), "a missing pre-session streak is recorded when the lesson finishes");
assert(appSrc.includes("@keyframes streakPop { 0%{transform:scale(1)} 50%{transform:scale(1.12)} 100%{transform:scale(1)} }"), "streak pill scales 1 to 1.12 to 1");
assert(appSrc.includes(".pop.streak-pop { transform-origin:center; animation-name:pop, streakPop; animation-duration:.15s, 400ms; animation-timing-function:ease, ease-out; animation-delay:0ms, 200ms; animation-iteration-count:1, 1; animation-fill-mode:none, none; }"), "scale is once, ease-out, 400ms, delayed until the tile fade ends");
const reduceMotion = appSrc.match(/@media \(prefers-reduced-motion: reduce\) \{[^}]+\}/);
assert(reduceMotion && reduceMotion[0].includes(".streak-pop"), "reduced motion turns the streak scale off");
assert(appSrc.includes('className="flame"'), "win flame keeps its wobble class");
assert(!appSrc.includes("streak-pop-confetti"), "first streak scale adds no confetti class");

console.log("ok: streak chip singular and plural");
