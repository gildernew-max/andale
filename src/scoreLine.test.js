import { hitWord, missWord, scoreCountClause } from "./scoreLine.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

for (const lang of ["es", "en"]) {
  for (const n of [0, 1, 2]) {
    const hits = hitWord(n, lang);
    const misses = missWord(n, lang);
    if (lang === "es") {
      assert(hits === (n === 1 ? "acierto" : "aciertos"), `ES hits at ${n}`);
      assert(misses === (n === 1 ? "fallo" : "fallos"), `ES misses at ${n}`);
    } else {
      assert(hits === "correct", `EN correct stays correct at ${n}`);
      assert(misses === (n === 1 ? "miss" : "misses"), `EN misses at ${n}`);
    }
    const clause = scoreCountClause(n, n, lang);
    assert(clause === `${n} ${hits}, ${n} ${misses}`, `${lang} clause at ${n}`);
  }
}

assert(scoreCountClause(4, 1, "es") === "4 aciertos, 1 fallo", "ES example clause");
assert(scoreCountClause(4, 1, "en") === "4 correct, 1 miss", "EN example clause");
assert(hitWord(5, "en") === "correct", "5 correct");
assert(missWord(0, "en") === "misses", "0 misses");
assert(missWord(2, "es") === "fallos", "2 fallos");
assert(hitWord(0, "es") === "aciertos", "0 aciertos");

console.log("ok: score line plurals 0, 1, 2 in ES and EN");
