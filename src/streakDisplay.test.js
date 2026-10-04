import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { calendarGap, streakDisplay } from "./streakDisplay.js";
import { contrastRatio } from "./spanishKeyboard.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const today = "2026-10-04";
const yesterday = "2026-10-03";
const gap2 = "2026-10-02";
const gap3 = "2026-09-30";

const view = (prog, extra = {}) => streakDisplay({ prog, today, repairModal: false, lang: "es", ...extra });

const same = view({ streak: 4, lastDay: today }, { lang: "en" });
assert(same.displayStreak === 4 && same.line === "" && same.status === "same", "same day keeps the number and shows no line");

const riskEs = view({ streak: 4, lastDay: yesterday });
assert(riskEs.displayStreak === 4 && riskEs.status === "at-risk", "yesterday keeps the stored number");
assert(riskEs.line === "Tu racha de 4 días termina hoy. Haz una lección para mantenerla.", "ES at-risk plural is George's sentence");

const riskEn = view({ streak: 4, lastDay: yesterday }, { lang: "en" });
assert(riskEn.displayStreak === 4 && riskEn.status === "at-risk", "EN yesterday stays at risk");
assert(riskEn.line === "Your 4-day streak ends tonight. Do one lesson to keep it.", "EN at-risk plural is George's sentence");

const oneEs = view({ streak: 1, lastDay: yesterday });
assert(oneEs.displayStreak === 1 && oneEs.line === "Tu racha de 1 día termina hoy.", "ES n=1 is the shorter singular sentence");
const oneEn = view({ streak: 1, lastDay: yesterday }, { lang: "en" });
assert(oneEn.displayStreak === 1 && oneEn.line === "Your 1-day streak ends tonight.", "EN n=1 is the shorter singular sentence");

const held = view({ streak: 5, lastDay: gap2 }, { repairModal: true, lang: "en" });
assert(held.displayStreak === 5 && held.line === "" && held.status === "modal", "2-day gap with the repair modal shows neither line and keeps the number");
const heldEs = view({ streak: 5, lastDay: gap2 }, { repairModal: true });
assert(heldEs.line === "" && heldEs.displayStreak === 5, "ES 2-day gap with the modal is also quiet");

const openGap = view({ streak: 5, lastDay: gap2 }, { lang: "en" });
assert(openGap.displayStreak === 0 && openGap.status === "gone", "2-day gap without the modal displays 0");
assert(openGap.line === "Your streak is back to 0. Today starts a new one.", "EN gone line is George's sentence");

const goneEs = view({ streak: 9, lastDay: gap3 });
assert(goneEs.displayStreak === 0 && goneEs.status === "gone", "3+ days displays 0");
assert(goneEs.line === "Tu racha volvió a 0. Hoy empieza una nueva.", "ES gone line is George's sentence");
const goneEn = view({ streak: 9, lastDay: gap3 }, { lang: "en" });
assert(goneEn.line === "Your streak is back to 0. Today starts a new one.", "EN 3+ days uses the gone line");
assert(view({ streak: 9, lastDay: gap3 }, { repairModal: true }).line === "", "a modal that is up suppresses the gone line");
assert(view({ streak: 9, lastDay: gap3 }, { repairModal: true }).displayStreak === 9, "a modal that is up does not paint 0");

const zero = view({ streak: 0, lastDay: yesterday }, { lang: "en" });
assert(zero.displayStreak === 0 && zero.line === "" && zero.status === "none", "streak 0 shows no at-risk line");
assert(view({ streak: 0, lastDay: gap3 }).line === "", "streak 0 shows no gone line");

const missing = view({ streak: 3, lastDay: null }, { lang: "en" });
assert(missing.displayStreak === 3 && missing.line === "" && missing.status === "none", "missing lastDay shows no at-risk line and does not zero the number");
assert(view({ streak: 3 }).line === "", "absent lastDay shows no line");

const frozen = { streak: 6, lastDay: gap3 };
view(frozen, { lang: "en" });
assert(frozen.streak === 6 && frozen.lastDay === gap3, "the helper does not mutate prog");

assert(calendarGap("2026-02-28", "2026-03-01") === 1, "yesterday crosses a month boundary");
assert(calendarGap("2026-02-28", "2026-03-02") === 2, "a 2-day gap crosses a month boundary");
assert(calendarGap("2024-02-28", "2024-03-01") === 2, "a leap day counts");
assert(view({ streak: 2, lastDay: "2026-03-01" }, { today: "2026-03-02" }).status === "at-risk", "month-boundary yesterday is at risk");

for (const line of [riskEs.line, riskEn.line, oneEs.line, oneEn.line, openGap.line, goneEs.line]) {
  assert(!line.includes("!"), "notes have no exclamation mark");
}

assert(contrastRatio("#6B6258", "#F6EFE4") >= 4.5, "light secondary ink clears 4.5:1 on cream");
assert(contrastRatio("#6B6258", "#FFFFFF") >= 4.5, "light secondary ink clears 4.5:1 on white");
assert(contrastRatio("#A0A4AB", "#15171C") >= 4.5, "dark secondary ink clears 4.5:1 on the page");
assert(contrastRatio("#A0A4AB", "#1E2128") >= 4.5, "dark secondary ink clears 4.5:1 on the card");

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
assert(appSrc.includes('import { streakDisplay } from "./streakDisplay.js";'), "App derives the streak through the helper");
assert(appSrc.includes("repairModal: !!streakRepair"), "the repair modal flag is passed through");
assert(appSrc.includes('data-testid="streak-home-note"'), "Learn home renders the note");
assert(/data-testid="streak-home-note"[\s\S]{0,500}color: D\.sub/.test(appSrc), "the note uses the neighbouring secondary ink");
assert(appSrc.includes("streakView.displayStreak"), "the flame reads the display number");
assert(!/setProg\(\(base\) => \{[\s\S]{0,900}streak:\s*0/.test(appSrc), "load does not zero the stored streak");

console.log("ok: streak display");
