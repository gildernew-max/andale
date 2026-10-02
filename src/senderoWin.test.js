import { isSenderoLesson } from "./senderoWin.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(isSenderoLesson({ unitId: "subj1", host: "luna" }), "path unit is a Sendero lesson");
assert(!isSenderoLesson({ unitId: "_first", firstSession: true }), "first session is its own card");
assert(!isSenderoLesson({ unitId: "_today:airport", todaySceneId: "airport" }), "Hoy is not Sendero");
assert(!isSenderoLesson({ unitId: "_review", review: true }), "review is not Sendero");
assert(!isSenderoLesson({ unitId: "_daily", daily: true }), "daily workout is not Sendero");
assert(!isSenderoLesson({ unitId: "_test", testOut: 0 }), "section test is not Sendero");
assert(!isSenderoLesson({ unitId: "story-1", lecturaWin: true }), "Lectura win is not Sendero");
assert(!isSenderoLesson(null), "missing session is not Sendero");

console.log("ok: Sendero lesson-end is the path unit card");
