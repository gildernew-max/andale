import { today } from "./today.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

function sameLocalDay(date, y, m, d) {
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// Flag off: the override is never read, even if present.
{
  const d = today({ scene1Enabled: false, search: "?date=2026-03-05" });
  assert(d instanceof Date, "today() always returns a Date");
  assert(!sameLocalDay(d, 2026, 3, 5), "date override is ignored when the flag is off");
}

// Flag on, valid date: the override wins.
{
  const d = today({ scene1Enabled: true, search: "?date=2026-03-05" });
  assert(sameLocalDay(d, 2026, 3, 5), "a valid ?date= is honored when the flag is on");
}

// Flag on, no date param: real clock.
{
  const d = today({ scene1Enabled: true, search: "" });
  const now = new Date();
  assert(sameLocalDay(d, now.getFullYear(), now.getMonth() + 1, now.getDate()), "no ?date= falls back to the real clock");
}

// Flag on, invalid dates: ignored, real clock used.
for (const bad of ["2026-02-30", "not-a-date", "2026-13-01", "26-03-05", "2026/03/05"]) {
  const d = today({ scene1Enabled: true, search: `?date=${bad}` });
  const now = new Date();
  assert(sameLocalDay(d, now.getFullYear(), now.getMonth() + 1, now.getDate()), `invalid date "${bad}" is ignored`);
}

console.log("scene1/today.test.js: ok");
