import { streakChipLabel } from "./streakChip.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(streakChipLabel(1, "en") === "1-day streak", "EN 1 is 1-day streak");
assert(streakChipLabel(2, "en") === "2-day streak", "EN 2 is 2-day streak");
assert(streakChipLabel(1, "es") === "Racha de 1 día", "ES 1 is Racha de 1 día");
assert(streakChipLabel(2, "es") === "Racha de 2 días", "ES 2 is Racha de 2 días");
assert(streakChipLabel(0, "en") === "", "EN 0 returns nothing — no chip");
assert(streakChipLabel(0, "es") === "", "ES 0 returns nothing — no chip");

console.log("ok: streak chip singular and plural");
