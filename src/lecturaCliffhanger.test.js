import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { lecturaCliffhangers, lecturaCliffhangerLine } from "./lecturaCliffhanger.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const here = dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");
const copySrc = readFileSync(join(here, "lecturaCliffhanger.js"), "utf8");

const STORY_IDS = ["story-0", "story-1", "story-2", "story-3", "story-4", "story-5", "story-6", "story-7", "story-8", "story-9"];

assert(Object.keys(lecturaCliffhangers).join(",") === STORY_IDS.join(","), "one cliffhanger slot per Lectura chapter");

const storiesStart = appSrc.indexOf("const STORIES = [");
const storiesEnd = appSrc.indexOf("const STORY_EXTRAS");
const storiesBlock = appSrc.slice(storiesStart, storiesEnd);
const idAt = [...storiesBlock.matchAll(/id: "(story-\d+)"/g)];

for (let i = 0; i < STORY_IDS.length; i++) {
  const id = STORY_IDS[i];
  const slice = storiesBlock.slice(idAt[i].index, idAt[i + 1]?.index || storiesBlock.length);
  const paras = slice.match(/paragraphs: \[([\s\S]*?)\],\s*glossary:/);
  assert(paras, `${id} has paragraphs`);
  const texts = [...paras[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
  const last = texts[texts.length - 1];
  const line = lecturaCliffhangers[id];
  assert(typeof line === "string" && line.length > 0, `${id} cliffhanger is a line`);
  assert(last.endsWith(line), `${id} cliffhanger reuses the chapter final line`);
  assert(lecturaCliffhangerLine(id) === line, `${id} line helper`);
  assert(copySrc.includes(`TODO(George): ${id}`), `${id} is a George slot`);
}

assert(lecturaCliffhangerLine("story-missing") === "", "unknown chapter has no invented line");
assert(lecturaCliffhangerLine() === "", "missing id has no invented line");
assert(!/TODO\(George\)[\s\S]*\b(Continúa|To be continued|Continuará)\b/.test(copySrc), "no new cliffhanger chrome sentence");

assert(appSrc.includes("from \"./lecturaCliffhanger.js\""), "App imports the cliffhanger map");
assert(appSrc.includes("lecturaCliffhangerLine(story.id)"), "beat holds the mapped final line");
assert(appSrc.includes("FUNNEL_EVENTS.lecturaChapterDone"), "chapter done uses the funnel bus");
assert(appSrc.includes('data-testid="lectura-cliffhanger"'), "cliffhanger beat is testable");
assert(appSrc.includes('data-testid="lectura-cliffhanger-line"'), "held line is testable");
assert(appSrc.includes('data-testid="lectura-bird-handoff"'), "bird handoff is testable");
assert(appSrc.includes('data-testid="lectura-bird-handoff-cta"'), "bird handoff CTA is testable");
assert(appSrc.includes("{L.continue}"), "handoff CTA reuses Continuar / Continue");

const beat = appSrc.slice(appSrc.indexOf('data-testid="lectura-cliffhanger"'), appSrc.indexOf('data-testid="lectura-cliffhanger"') + 1800);
assert(beat.includes("HUB_CREAM"), "cliffhanger surface is cream");
assert(beat.includes("D.sub"), "held line is soft secondary type");
assert(beat.includes("MARK_INK"), "handoff CTA uses sage ink, not filled green");
assert(!/background:\s*D\.green/.test(beat), "handoff CTA is not filled green");
assert(!beat.includes("<Btn"), "handoff CTA is not the filled duo button");
assert(!/cenzontle|LogoMark|WinPerch|CenzontleFlyAway|PaywallFlyAway/.test(beat), "handoff strip adds no second bird");

console.log("ok: Lectura cliffhanger — existing final lines, bird handoff, George slots.");
