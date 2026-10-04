/**
 * The four-coach strip is repeat(4, 1fr) with a 10px gap inside learn-hub
 * (padding 16px). Each card's min-content is the 64px portrait plus 6px
 * padding and a 2px border on both sides (80px) because the card is
 * content-box and the portrait width is fixed. 4×80 + 3×10 = 350, and
 * 16 + 350 = 366, so at a 360px viewport documentElement.scrollWidth is 366.
 * At 390 the hub content box is 358, which holds 350, so nothing overflows.
 * Cards must be allowed to shrink (minWidth 0, border-box) and the portrait
 * must track the card (width 100%, maxWidth the 64px size).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const start = appSrc.indexOf('data-testid="coach-strip"');
const end = appSrc.indexOf('data-testid="atajos"', start);
assert(start > 0 && end > start, "coach strip sits above the atajos line");
const slice = appSrc.slice(start, end);

assert(/minWidth:\s*0/.test(slice), "coach cards set minWidth 0 so the 64px portrait cannot force a 366px page");
assert(/boxSizing:\s*"border-box"/.test(slice), "coach card padding and border stay inside the 1fr track");
assert(/size=\{64\}\s+fit/.test(slice), "strip portraits use the bounded fit frame");

const portrait = appSrc.slice(appSrc.indexOf("const CoachPortrait ="), appSrc.indexOf("const coachName"));
assert(/maxWidth:\s*size/.test(portrait), "fitted portrait maxWidth is the size constant, not a fixed 64px box");
assert(/width:\s*"100%"/.test(portrait), "fitted portrait width is the card content box");
