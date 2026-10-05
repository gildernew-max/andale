import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { normalizePair } from "./matchPairs.js";
import { stripPhrase } from "./wordOrder.js";

/** ñ folds to n inside one flash deck (cardKey) or one match set (pairKey).
 *  Those two consts are not exported; bind the real bodies and require they
 *  match exported stripPhrase. buildFlashDeck / buildMatchRound drop dupes,
 *  so this scan reads the authored pairs before that drop. */

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const here = dirname(fileURLToPath(import.meta.url));

/** Read a top-level `const NAME = …` array/object from App.jsx without importing React. */
const extractConst = (src, name) => {
  const needle = `const ${name} =`;
  const start = src.indexOf(needle);
  if (start < 0) throw new Error(`App.jsx missing ${name}`);
  let i = start + needle.length;
  while (i < src.length && /\s/.test(src[i])) i++;
  const from = i;
  let depth = 0;
  let inStr = null;
  let escaped = false;
  for (; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (inStr) {
      if (escaped) { escaped = false; continue; }
      if (c === "\\") { escaped = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "/" && n === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && n === "*") { i = src.indexOf("*/", i + 2); if (i < 0) break; i += 1; continue; }
    if (c === "\"" || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  throw new Error(`App.jsx unclosed ${name}`);
};

/** Bind a one-line `const name = (s) => …;` from a module without editing it. */
const loadPrivateKey = (file, name) => {
  const src = readFileSync(join(here, file), "utf8");
  const needle = `const ${name} = `;
  const start = src.indexOf(needle);
  if (start < 0) throw new Error(`${file} missing ${name}`);
  const semi = src.indexOf(";", start);
  if (semi < 0) throw new Error(`${file} unclosed ${name}`);
  const fn = Function(`"use strict"; return (${src.slice(start + needle.length, semi).trim()});`)();
  assert(typeof fn === "function", `${name} did not evaluate to a function`);
  return fn;
};

const cardKey = loadPrivateKey("flashDeck.js", "cardKey");
const pairKey = loadPrivateKey("matchPairs.js", "pairKey");

assert(cardKey("año") === "ano" && cardKey("año") === stripPhrase("año"), "cardKey folds ñ the same way as stripPhrase");
assert(pairKey("año") === "ano" && pairKey("año") === stripPhrase("año"), "pairKey folds ñ the same way as stripPhrase");

const appSrc = readFileSync(join(here, "App.jsx"), "utf8");
const D = {
  green: "#58CC02", greenDark: "#46A302",
  purple: "#CE82FF", purpleDark: "#A567CC",
  blue: "#1CB0F6", blueDark: "#1899D6",
  gold: "#FFC800", goldDark: "#E6A800",
};
const UNITS = Function("D", `"use strict"; return (${extractConst(appSrc, "UNITS")});`)(D);

assert(Array.isArray(UNITS) && UNITS.length >= 18, `expected shipped units, got ${UNITS?.length}`);

const entriesOf = (pairs) => (pairs || []).map((pr) => {
  const n = normalizePair(pr);
  if (!n) return null;
  return { raw: n[0], en: n[1] };
}).filter(Boolean);

/** Different raw strings that share one normalized key. Same raw text is not a collision. */
const collisionsIn = (deck, entries, keyFn) => {
  const byKey = new Map();
  for (const entry of entries) {
    const key = keyFn(entry.raw);
    assert(key === stripPhrase(entry.raw), `${deck}: ${JSON.stringify(entry.raw)} key diverges from stripPhrase`);
    const group = byKey.get(key) || [];
    if (!group.some((e) => e.raw === entry.raw)) group.push(entry);
    byKey.set(key, group);
  }
  const hits = [];
  for (const group of byKey.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        hits.push({ deck, a: group[i].raw, b: group[j].raw });
      }
    }
  }
  return hits;
};

const hits = [];
const allFlash = [];
let flashDecks = 0;
let matchSets = 0;

for (const u of UNITS) {
  assert(u.id && Array.isArray(u.pairs) && u.pairs.length > 0, `unit ${u?.id || "?"} is not a shipped pair set`);
  const entries = entriesOf(u.pairs);
  assert(entries.length === u.pairs.length, `unit ${u.id} has a pair normalizePair dropped`);
  const flashName = `flash:${u.id}`;
  const matchName = `match:${u.id}`;
  flashDecks += 1;
  matchSets += 1;
  hits.push(...collisionsIn(flashName, entries, cardKey));
  hits.push(...collisionsIn(matchName, entries, pairKey));
  allFlash.push(...entries);
}

hits.push(...collisionsIn("flash:all", allFlash, cardKey));

const lines = hits.map((h) => `${h.deck}: ${JSON.stringify(h.a)} vs ${JSON.stringify(h.b)}`);
for (const line of lines) console.log(line);
assert(lines.length === 0, lines.join("\n") || "normalized key collision");

console.log(`ok: ${flashDecks} flash decks + flash:all, ${matchSets} match sets, zero normalized-key collisions`);
