import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { lecturaCliffhangers, lecturaCliffhangerLine } from "./lecturaCliffhanger.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const here = dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");
const copySrc = readFileSync(join(here, "lecturaCliffhanger.js"), "utf8");

const STORY_IDS = ["story-0", "story-1", "story-2", "story-3", "story-4", "story-5", "story-6", "story-7", "story-8", "story-9"];
const BANNED = /continuará|continúa|to be continued/i;

assert(Object.keys(lecturaCliffhangers).join(",") === STORY_IDS.join(","), "one cliffhanger slot per Lectura chapter");
assert(!copySrc.includes("TODO(George)"), "George slots are filled");

for (const id of STORY_IDS) {
  const line = lecturaCliffhangers[id];
  assert(typeof line === "string" && line.trim().length > 0, `${id} hook is a non-empty string`);
  assert(!BANNED.test(line), `${id} hook is not a continuation stub`);
  assert(lecturaCliffhangerLine(id) === line, `${id} line helper`);
}

assert(lecturaCliffhangerLine("story-missing") === "", "unknown chapter has no invented line");
assert(lecturaCliffhangerLine() === "", "missing id has no invented line");
assert(!BANNED.test(copySrc), "copy file has no continuation stub");

assert(appSrc.includes("from \"./lecturaCliffhanger.js\""), "App imports the cliffhanger map");
assert(appSrc.includes("lecturaCliffhangerLine(story.id)"), "beat holds the mapped hook");
assert(appSrc.includes("FUNNEL_EVENTS.lecturaChapterDone"), "chapter done uses the funnel bus");
assert(appSrc.includes('data-testid="lectura-cliffhanger"'), "cliffhanger beat is testable");
assert(appSrc.includes('data-testid="lectura-cliffhanger-line"'), "held line is testable");
assert(appSrc.includes('data-testid="lectura-bird-handoff"'), "bird handoff is testable");
assert(appSrc.includes('data-testid="lectura-bird-handoff-cta"'), "bird handoff CTA is testable");
assert(appSrc.includes("{L.continue}"), "handoff CTA reuses Continuar / Continue");

const beat = appSrc.slice(appSrc.indexOf('data-testid="lectura-cliffhanger"'), appSrc.indexOf('data-testid="lectura-cliffhanger"') + 2200);
assert(beat.includes("HUB_CREAM"), "light cliffhanger surface stays cream");
assert(beat.includes('"#1E2128"'), "dark cliffhanger surface is #1E2128");
assert(/lectura-cliffhanger-line"[\s\S]{0,280}color:\s*D\.ink/.test(beat), "hook uses story ink");
assert(!/lectura-cliffhanger-line"[\s\S]{0,280}color:\s*D\.sub/.test(beat), "hook is not soft secondary gray");
assert(beat.includes("MARK_INK"), "handoff CTA uses sage ink, not filled green");
assert(!/background:\s*D\.green/.test(beat), "handoff CTA is not filled green");
assert(!beat.includes("<Btn"), "handoff CTA is not the filled duo button");
assert(!/cenzontle|LogoMark|WinPerch|CenzontleFlyAway|PaywallFlyAway/.test(beat), "handoff strip adds no second bird");

console.log("ok: Lectura cliffhanger — George hooks, story ink, bird handoff.");
