import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WIN_NUMERAL_LIGHT, winNumeralColor } from "./winNumeral.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const light = { gold: "#FFC800", blue: "#1CB0F6" };
const dark = { gold: "#FFD43B", blue: "#1CB0F6" };

assert(WIN_NUMERAL_LIGHT === "#85672C", "light numeral token is ochre #85672C");
assert(winNumeralColor("light", "xp", light) === "#85672C", "light XP numeral is ochre");
assert(winNumeralColor("light", "gems", light) === "#85672C", "light gem numeral is ochre");
assert(winNumeralColor(undefined, "xp", light) === "#85672C", "non-dark theme uses the light numeral");
assert(winNumeralColor("dark", "xp", dark) === "#FFD43B", "dark XP numeral stays #FFD43B");
assert(winNumeralColor("dark", "gems", dark) === "#1CB0F6", "dark gem numeral stays #1CB0F6");
assert(winNumeralColor("dark", "xp", dark) === dark.gold, "dark XP reads the palette gold");
assert(winNumeralColor("dark", "gems", dark) === dark.blue, "dark gems read the palette blue");

const dir = dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(join(dir, "App.jsx"), "utf8");
const numeralSrc = readFileSync(join(dir, "winNumeral.js"), "utf8");

assert((numeralSrc.match(/#85672C/g) || []).length === 1, "ochre numeral hex lives in one place");
assert(appSrc.includes('ink: winNumeralColor(theme, "xp", D)'), "XP count uses the shared numeral color");
assert(appSrc.includes('ink: winNumeralColor(theme, "gems", D)'), "gem count uses the shared numeral color");
assert(appSrc.includes("color: s.ink || s.c"), "numeral ink is the count-up color");
assert(/border: `2px solid \$\{s\.c\}`/.test(appSrc), "win-card border stays the chip hue");

const tickerFrom = appSrc.indexOf("const Ticker =");
const tickerTo = appSrc.indexOf("/* ---------------- PATH DECOR");
assert(tickerFrom > 0 && tickerTo > tickerFrom, "Ticker source is locatable");
const tickerSrc = appSrc.slice(tickerFrom, tickerTo);
assert(!/color\s*:/.test(tickerSrc), "count-up ticker sets no color of its own");
assert(!/style=/.test(tickerSrc), "count-up final state inherits the numeral ink");

console.log("ok: win numeral light ochre, dark unchanged");
