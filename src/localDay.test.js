/**
 * Run with TZ=America/New_York. 11:30pm Eastern is already the next UTC date.
 * lastDay, xpToday, and scene-YYYY-MM-DD must stay on the local calendar.
 */
import { readFileSync } from "node:fs";
import { dayKeyFromDate, progressAfterWinContinue, xpCountedToday } from "./firstDoor.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
assert(zone === "America/New_York", `TZ must be America/New_York, got ${zone}`);

const evening = new Date(2026, 9, 11, 23, 30, 0);
const morning = new Date(2026, 9, 12, 0, 5, 0);
assert(evening.getTimezoneOffset() === 240, "11:30pm on 2026-10-11 in New York is EDT");
assert(evening.toISOString().slice(0, 10) === "2026-10-12", "UTC has already rolled at 11:30pm Eastern");

const eveningKey = dayKeyFromDate(evening);
const morningKey = dayKeyFromDate(morning);
assert(eveningKey === "2026-10-11", "11:30pm local is still today");
assert(morningKey === "2026-10-12", "12:05am local is the next day");

const earned = progressAfterWinContinue(
  { streak: 0, lastDay: null, xpToday: 0, missions: {} },
  { today: eveningKey, todaySceneId: "taqueria" },
);
const xpToday = (earned.lastDay === eveningKey ? earned.xpToday || 0 : 0) + 62;
const saved = { ...earned, lastDay: eveningKey, xpToday, missions: { ...earned.missions, [`scene-${eveningKey}`]: "taqueria" } };
assert(saved.lastDay === "2026-10-11", "evening XP stamps lastDay on the local day");
assert(saved.missions["scene-2026-10-11"] === "taqueria", "the scene mission uses the local day");
assert(saved.missions["scene-2026-10-12"] == null, "the scene mission is not the UTC date");
assert(xpCountedToday({ xpToday: saved.xpToday, lastDay: saved.lastDay, today: eveningKey }) === 62, "XP earned at 11:30pm local still counts as today");
assert(xpCountedToday({ xpToday: saved.xpToday, lastDay: saved.lastDay, today: morningKey }) === 0, "12:05am local the next day is a new day at 0");

const appSrc = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
assert(!appSrc.includes("toISOString().slice(0, 10)"), "App day keys are not UTC slices");
assert(appSrc.includes("const todayStr = () => dayKeyFromDate(new Date())"), "todayStr is the local day key");
assert(appSrc.includes("missions[`scene-${t}`] = session.todaySceneId"), "a finished scene is stamped on todayStr");
assert(appSrc.includes("const todayKey = dayKeyFromDate(new Date(now))"), "the hub reads the scene on the local day");
assert(appSrc.includes("xpCountedToday({ xpToday: prog.xpToday, lastDay: prog.lastDay, today: todayKey })"), "counted XP uses the local today key");

console.log("ok: New York 11:30pm stays today; 12:05am is a new day");
