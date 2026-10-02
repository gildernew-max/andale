import { FIRST_WIN_MINUTES, splashPromiseLine } from "./splashCopy.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(FIRST_WIN_MINUTES === null, "time claim ships null — starts-here line, not minutes");

assert(splashPromiseLine("en") === "Real Mexican Spanish. Your first win starts here.", "null EN is the starts-here line");
assert(splashPromiseLine("es") === "Español mexicano real. Tu primer logro empieza aquí.", "null ES is the empieza-aquí line");
assert(splashPromiseLine("en", null) === "Real Mexican Spanish. Your first win starts here.", "explicit null EN");
assert(splashPromiseLine("es", null) === "Español mexicano real. Tu primer logro empieza aquí.", "explicit null ES");
assert(!splashPromiseLine("en").includes("minute"), "null EN has no time claim");
assert(!splashPromiseLine("es").includes("minuto"), "null ES has no time claim");

assert(splashPromiseLine("en", 5) === "Real Mexican Spanish. Your first win takes 5 minutes.", "EN 5 is plural minutes");
assert(splashPromiseLine("es", 5) === "Español mexicano real. Tu primer logro toma 5 minutos.", "ES 5 is plural minutos");
assert(splashPromiseLine("en", 1) === "Real Mexican Spanish. Your first win takes 1 minute.", "EN 1 is singular minute");
assert(splashPromiseLine("es", 1) === "Español mexicano real. Tu primer logro toma 1 minuto.", "ES 1 is singular minuto");
assert(splashPromiseLine("en", 0) === "Real Mexican Spanish. Your first win takes 0 minutes.", "EN 0 stays plural");
assert(splashPromiseLine("es", 2) === "Español mexicano real. Tu primer logro toma 2 minutos.", "ES 2 stays plural");

console.log("ok: splash promise — null starts here; a number interpolates the timed line.");
