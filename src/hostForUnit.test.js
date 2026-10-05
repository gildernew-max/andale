/**
 * Formal-unit correct praise must come from Valeria.
 * Skills already list `formal` under Valeria; hostForUnit was the miss.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");

const extractArrowFn = (name) => {
  const needle = `const ${name} = `;
  const start = src.indexOf(needle);
  if (start < 0) throw new Error(`App.jsx missing ${name}`);
  const arrow = src.indexOf("=>", start);
  let i = src.indexOf("{", arrow);
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
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  throw new Error(`App.jsx unclosed ${name}`);
};

const hostForUnit = Function(`"use strict"; return (uid) => ${extractArrowFn("hostForUnit")};`)();

assert(hostForUnit("formal") === "valeria", "hostForUnit(\"formal\") === \"valeria\"");
assert(hostForUnit("slang2") === "luna", "slang2 stays Luna");
assert(hostForUnit("mex") === "rafa", "mex stays Rafa");
assert(hostForUnit("registro") === "valeria", "registro stays Valeria");
assert(hostForUnit("conectores") === "valeria", "conectores stays Valeria");
assert(hostForUnit("pronombres") === "valeria", "pronombres stays Valeria");
assert(hostForUnit("siclauses") === "valeria", "siclauses stays Valeria");
