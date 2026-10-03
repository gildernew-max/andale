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

const ES = {
  "story-0": "Hay casas que no olvidan. ¿Conoces una que todavía espere a su dueña?",
  "story-1": "Ella pintó el mundo desde una cama. ¿Y si alguien viajara lejos solo para no moverse?",
  "story-2": "No creas que solo la tierra esconda algo. ¿Qué habrá debajo de una máscara?",
  "story-3": "Cada generación elige su camino. ¿O hay caminos que te eligen a ti?",
  "story-4": "Para Doña Lupe, yo era de la casa. ¿Y los que viven entre dos casas?",
  "story-5": "Llevo doce años buscando la verdad. ¿Y si una historia no se pudiera comprobar?",
  "story-6": "Hay cosas que se cuidan toda la vida. ¿Una historia, un anillo\u2026 o una mesa?",
  "story-7": "Ellos honran a su amigo en silencio. ¿Y si alguien lo hiciera gritando?",
  "story-8": "Levanta la copa. Y mañana, cuando tomes café, pregúntate quién lo cosechó.",
  "story-9": "Siempre hay otra montaña, más alta. ¿Hasta dónde quieres subir?",
};

const EN = {
  "story-0": "Some houses don\u2019t forget. Do you know one that\u2019s still waiting for its owner?",
  "story-1": "She painted the world from a bed. What if someone traveled far just to avoid moving?",
  "story-2": "Don\u2019t assume only the earth hides something. What might be under a mask?",
  "story-3": "Every generation picks its own road. Or are there roads that pick you?",
  "story-4": "To Doña Lupe, I was part of the house. What about those between two homes?",
  "story-5": "I\u2019ve spent twelve years looking for the truth. What if a story could never be proven?",
  "story-6": "Some things you look after for a lifetime. A story, a ring\u2026 or a table?",
  "story-7": "They honor their friend in silence. What if someone did it out loud?",
  "story-8": "Raise your glass. And tomorrow, over coffee, ask who harvested it.",
  "story-9": "There\u2019s always another, higher mountain. How far do you want to climb?",
};

assert(Object.keys(lecturaCliffhangers).join(",") === STORY_IDS.join(","), "one cliffhanger slot per Lectura chapter");
assert(!copySrc.includes("TODO(George)"), "George slots are filled");

const esLines = new Set(Object.values(ES));

for (const id of STORY_IDS) {
  const entry = lecturaCliffhangers[id];
  assert(entry && typeof entry === "object", `${id} hook is {es, en}`);
  assert(entry.es === ES[id], `${id} ES line`);
  assert(entry.en === EN[id], `${id} EN line`);
  assert(entry.es.trim().length > 0 && entry.en.trim().length > 0, `${id} lines are non-empty`);
  assert(!BANNED.test(entry.es) && !BANNED.test(entry.en), `${id} hook is not a continuation stub`);
  assert(lecturaCliffhangerLine(id, "es") === ES[id], `${id} ES lookup`);
  assert(lecturaCliffhangerLine(id, "en") === EN[id], `${id} EN lookup`);
  assert(lecturaCliffhangerLine(id) === ES[id], `${id} missing uiLang falls back to ES`);
  assert(EN[id] !== ES[id], `${id} EN is not the Spanish line`);
  assert(!esLines.has(lecturaCliffhangerLine(id, "en")), `${id} EN never shows a Spanish line`);
  assert(!/[¿¡]/.test(EN[id]), `${id} EN has no Spanish punctuation`);
  assert(!ES[id].includes(EN[id]) && !EN[id].includes(ES[id]), `${id} languages do not contain each other`);
}

const savedEn = lecturaCliffhangers["story-4"].en;
lecturaCliffhangers["story-4"].en = "";
assert(lecturaCliffhangerLine("story-4", "en") === ES["story-4"], "blank EN falls back to ES");
lecturaCliffhangers["story-4"].en = "   ";
assert(lecturaCliffhangerLine("story-4", "en") === ES["story-4"], "whitespace EN falls back to ES");
delete lecturaCliffhangers["story-4"].en;
assert(lecturaCliffhangerLine("story-4", "en") === ES["story-4"], "missing EN falls back to ES");
lecturaCliffhangers["story-4"].en = savedEn;
assert(lecturaCliffhangerLine("story-4", "en") === EN["story-4"], "EN restored after fallback check");

assert(lecturaCliffhangerLine("story-missing", "en") === "", "unknown chapter has no invented line");
assert(lecturaCliffhangerLine("story-missing", "es") === "", "unknown chapter has no invented ES line");
assert(lecturaCliffhangerLine() === "", "missing id has no invented line");
assert(!BANNED.test(copySrc), "copy file has no continuation stub");

assert(appSrc.includes("from \"./lecturaCliffhanger.js\""), "App imports the cliffhanger map");
assert(appSrc.includes("lecturaCliffhangerLine(story.id, uiLang)"), "beat holds the mapped hook in the UI language");
assert(!/lecturaCliffhangerLine\(story\.id\)(?!,)/.test(appSrc), "lookup is not called without uiLang");
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
