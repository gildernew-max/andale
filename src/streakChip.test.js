import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STREAK_FLAME, STREAK_LABEL_DARK, STREAK_LABEL_LIGHT, streakChipLabel, streakLabelColor } from "./streakChip.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(streakChipLabel(1, "en") === "1-day streak", "EN 1 is 1-day streak");
assert(streakChipLabel(2, "en") === "2-day streak", "EN 2 is 2-day streak");
assert(streakChipLabel(11, "en") === "11-day streak", "EN plural keeps the live N-day streak wording");
assert(streakChipLabel(1, "es") === "Racha de 1 día", "ES 1 is Racha de 1 día");
assert(streakChipLabel(2, "es") === "Racha de 2 días", "ES 2 is Racha de 2 días");
assert(streakChipLabel(11, "es") === "Racha de 11 días", "ES plural is días");
assert(streakChipLabel(0, "en") === "", "EN 0 returns nothing — no chip");
assert(streakChipLabel(0, "es") === "", "ES 0 returns nothing — no chip");

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

console.log("ok: streak chip singular and plural");
