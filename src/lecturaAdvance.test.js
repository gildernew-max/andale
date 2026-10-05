import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { lecturaAdvanceScrollY, lecturaStickyHeaderBottom } from "./lecturaAdvance.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const here = dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");

assert(lecturaAdvanceScrollY({ paragraphTop: 820, scrollY: 900, headerBottom: 72 }) === 1648, "paragraph top meets the header bottom");
assert(lecturaAdvanceScrollY({ paragraphTop: 72, scrollY: 200, headerBottom: 72 }) === 200, "already at the readable top stays put");
assert(lecturaAdvanceScrollY({ paragraphTop: -200, scrollY: 800, headerBottom: 64 }) === 536, "a paragraph above the fold comes back to the readable top");
assert(lecturaAdvanceScrollY({ paragraphTop: 10, scrollY: 0, headerBottom: 64 }) === 0, "does not scroll above the document");
assert(lecturaAdvanceScrollY({}) === 0, "missing measures stay at the top");
assert(lecturaAdvanceScrollY({ paragraphTop: Number.NaN, scrollY: 40 }) === 40, "a bad paragraph measure keeps the current scroll");

const chain = {
  style: { position: "" },
  parentElement: {
    style: { position: "sticky" },
    parentElement: null,
    getBoundingClientRect: () => ({ bottom: 78 }),
  },
  getBoundingClientRect: () => ({ bottom: 12 }),
};
assert(lecturaStickyHeaderBottom(chain) === 78, "sticky ancestor supplies the readable top");
assert(lecturaStickyHeaderBottom(null) === 0, "missing header does not invent an inset");

const paraAt = appSrc.indexOf('data-testid={pi === 0 ? "lectura-paragraph-first" : "lectura-paragraph"}');
const advanceAt = appSrc.indexOf('data-testid="lectura-advance"');
const narrationAt = appSrc.indexOf('data-testid="narration-card"');
const huntAt = appSrc.indexOf('data-testid="word-hunt-card"');
assert(paraAt > 0 && advanceAt > paraAt, "NEXT row follows the paragraph");
assert(narrationAt > advanceAt && huntAt > narrationAt, "NEXT sits above narration and word hunt");
assert(appSrc.includes("lecturaAdvanceScrollY"), "advance scrolls with the readable-top math");
assert(appSrc.includes("advanceLectura(paraIdx + 1)"), "NEXT uses the advance scroll");
assert(appSrc.includes("advanceLectura(paraIdx - 1)"), "Back uses the same advance scroll");
assert(/<Btn onClick=\{\(\) => advanceLectura\(paraIdx \+ 1\)\} style=\{\{ flex: 2 \}\}>/.test(appSrc), "NEXT keeps flex 2 and no extra style");
assert(/<Btn outline disabled=\{paraIdx === 0\} onClick=\{\(\) => advanceLectura\(paraIdx - 1\)\} style=\{\{ flex: 1 \}\}>/.test(appSrc), "Back keeps flex 1 and outline");
assert(/<nav aria-label=\{uiLang === "en" \? "Primary navigation" : "Navegación principal"\} style=\{\{ position: "fixed", bottom: 0,/.test(appSrc), "footer nav stays pinned to the bottom edge");

console.log("ok: lectura advance scroll + NEXT placement");
