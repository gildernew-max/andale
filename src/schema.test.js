import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  CONTENT_VERSION,
  acceptProgress,
  acceptLive,
  isFirstVisit,
  screenFromLive,
  currentQuestion,
} from "./schema.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(CONTENT_VERSION === 2, "CONTENT_VERSION must stay 2 for this lock");

// Existing live save (no contentVersion): keep progress and stamp 2.
const legacy = { xp: 185, gems: 25, streak: 4, done: { subj1: 1 } };
const migrated = acceptProgress(legacy);
assert(migrated !== null, "legacy save must be kept");
assert(migrated.xp === 185 && migrated.gems === 25 && migrated.streak === 4, "legacy fields must survive");
assert(migrated.done.subj1 === 1, "legacy done map must survive");
assert(migrated.contentVersion === 2, "missing contentVersion must stamp 2");
assert(legacy.contentVersion == null, "acceptProgress must not mutate the raw save");

const already = { xp: 10, contentVersion: 2 };
assert(acceptProgress(already) === already, "version 2 object is kept as-is");

// Shapeless / corrupt progress: wipe (null), never throw.
for (const junk of [null, undefined, "", "nope", 42, true, [], [{ xp: 1 }]]) {
  let got;
  try { got = acceptProgress(junk); } catch (e) {
    throw new Error(`acceptProgress threw on ${String(junk)}: ${e.message}`);
  }
  assert(got === null, `shapeless progress ${JSON.stringify(junk)} must be rejected`);
}

assert(acceptProgress({ contentVersion: 1, xp: 99 }) === null, "unreadable version wipes");
assert(acceptProgress({ contentVersion: "2", xp: 99 }) === null, "string 2 is not version 2");

// Shapeless LIVE: stay home, no throw. Lesson without questions[] is garbage.
for (const junk of [null, undefined, "", 0, [], "lesson", { screen: "lesson" }, { screen: "lesson", session: {} }, { screen: "lesson", session: { questions: null } }]) {
  let got, screen;
  try {
    got = acceptLive(junk);
    screen = screenFromLive(junk);
  } catch (e) {
    throw new Error(`LIVE accept threw on ${JSON.stringify(junk)}: ${e.message}`);
  }
  assert(got === null, `shapeless LIVE ${JSON.stringify(junk)} must be ignored`);
  assert(screen === "home", `shapeless LIVE must boot home, got ${screen}`);
}

const homeLive = { screen: "home", tab: "camino" };
assert(acceptLive(homeLive) === homeLive, "home LIVE object is accepted");
assert(screenFromLive(homeLive) === "home", "home LIVE stays home");

const okLesson = { screen: "lesson", session: { questions: [{ type: "mc", prompt: "x" }] }, qi: 0 };
assert(acceptLive(okLesson) === okLesson, "lesson LIVE with questions[] is kept");
assert(screenFromLive(okLesson) === "lesson", "valid lesson LIVE may restore");
assert(isFirstVisit(undefined) === true, "missing progress is first visit");
assert(isFirstVisit({ welcomed: false, xp: 0 }) === true, "explicit unwelcomed zero-xp is first visit");
assert(isFirstVisit({ xp: 0 }) === true, "xp 0 without welcomed is first visit");
assert(isFirstVisit({ welcomed: true, xp: 0 }) === false, "welcomed skip is not first visit");
assert(isFirstVisit({ xp: 12 }) === false, "xp skips splash even without welcomed");
assert(screenFromLive(okLesson, { welcomed: false, xp: 0 }) === "home", "first visit LIVE must not steal splash");
assert(screenFromLive(okLesson, { welcomed: true, xp: 4 }) === "lesson", "returning LIVE still restores");

// Render guard: missing questions cannot white-screen (no throw, q is null).
let q;
try { q = currentQuestion(undefined, 0); } catch (e) {
  throw new Error(`currentQuestion threw on missing session: ${e.message}`);
}
assert(q === null, "missing session must render no question, not throw");
assert(currentQuestion({ questions: null }, 0) === null, "null questions must not throw");
assert(currentQuestion({ questions: [{ type: "mc" }] }, 0)?.type === "mc", "real question is readable");

// No service worker: do not register one; do not ship public/sw.js.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
assert(!existsSync(join(root, "public", "sw.js")), "do not add public/sw.js");
assert(!existsSync(join(root, "sw.js")), "do not add a root sw.js");

const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(js|jsx|html|ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
};

for (const file of walk(root)) {
  const text = readFileSync(file, "utf8");
  assert(!/navigator\.serviceWorker\.register/.test(text), `${file} must not register a service worker`);
}

console.log("ok: schema lock — legacy save stamps 2; shapeless LIVE/progress stay home; no service worker");
