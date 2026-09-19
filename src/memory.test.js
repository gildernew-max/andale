import {
  MEMORY_BANK,
  MEMORY_DEAD_LABELS,
  MEMORY_GEM,
  MEMORY_HOWTO,
  MEMORY_HUB,
  MEMORY_LITERAL_WHY,
  MEMORY_MISS_MS,
  MEMORY_PACK_ID,
  MEMORY_QUIET,
  MEMORY_REGIONS,
  MEMORY_ROUND_CAP,
  MEMORY_TITLE,
  MEMORY_WIN,
  MEMORY_XP,
  applyMemoryPair,
  applyMemoryTap,
  clearMemoryMiss,
  finishMemoryRun,
  hydrateMemory,
  isMemoryDone,
  memoryCardText,
  memoryHasDeadLabel,
  memoryHowTo,
  memoryIsOpen,
  memoryLiteralWhyLabel,
  memoryMeaning,
  memoryQuiet,
  memoryRegionChip,
  memoryShowTeach,
  memorySoundsWeirdOutside,
  memoryTitle,
  memoryWhy,
  memoryWinLine,
  startMemoryRun,
} from "./memory.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(MEMORY_TITLE.es === "Memoria" && MEMORY_TITLE.en === "Memory", "title is ES Memoria / EN Memory");
assert(memoryTitle("es") === "Memoria", "ES title is Memoria");
assert(memoryTitle("en") === "Memory", "EN title is Memory");
assert(memoryTitle("es") !== "Memoria / Memory" && memoryTitle("en") !== "Memoria / Memory", "no bilingual lockup title");
assert(MEMORY_QUIET.es === "Pares mexicanos" && MEMORY_QUIET.en === "Mexican pairs", "quiet line is stamped");
assert(memoryQuiet("es") === "Pares mexicanos", "ES quiet");
assert(memoryQuiet("en") === "Mexican pairs", "EN quiet");
assert(MEMORY_HOWTO.es === "Toca dos cartas o arrastra un par.", "ES how-to stamp");
assert(MEMORY_HOWTO.en === "Tap two cards or drag a pair.", "EN how-to stamp");
assert(memoryHowTo("es") === MEMORY_HOWTO.es && memoryHowTo("en") === MEMORY_HOWTO.en, "how-to helper");
assert(MEMORY_WIN.es === "¡Eso!" && MEMORY_WIN.en === "That's it.", "win stamp");
assert(memoryWinLine("es") === "¡Eso!" && memoryWinLine("en") === "That's it.", "win helper");
assert(MEMORY_LITERAL_WHY.es === "Literal · Por qué" && MEMORY_LITERAL_WHY.en === "Literal · Why", "Literal · Why stamp");
assert(memoryLiteralWhyLabel("es") === "Literal · Por qué", "ES Literal · Why");
assert(memoryLiteralWhyLabel("en") === "Literal · Why", "EN Literal · Why");
assert(MEMORY_HUB === "games", "lives under Games");
assert(MEMORY_PACK_ID === "mexicanismos-v1", "same lemmas as Hangman");
assert(MEMORY_ROUND_CAP === 6, "six pairs on the grid");
assert(MEMORY_XP === 4 && MEMORY_GEM === 1, "clear reward matches a practice chip");
assert(MEMORY_MISS_MS === 400, "miss flip-back is one beat");
assert(MEMORY_REGIONS.includes("MX strong") && MEMORY_REGIONS.includes("Wide LATAM"), "legend is MX/ES/AR/CO family");

assert(MEMORY_BANK.length === 20, "v1 bank is 20 pairs");
const words = MEMORY_BANK.map((row) => row.word);
assert(new Set(words).size === 20, "bank words are unique");
assert(words[0] === "chamba" && words[2] === "órale" && words[19] === "fresa", "bank order is the stamp");
MEMORY_BANK.forEach((row) => {
  assert(row.word && !/\s/.test(row.word), `${row.word} is one lemma`);
  assert(row.meaning?.es && row.meaning?.en, `${row.word} has meaning EN+ES`);
  assert(row.why?.es && row.why?.en, `${row.word} has Why EN+ES`);
  assert(row.region, `${row.word} has a region face`);
  assert(!/\n/.test(`${row.meaning.es}${row.meaning.en}${row.why.es}${row.why.en}`), `${row.word} faces are one-liners`);
  assert(!memoryHasDeadLabel(`${row.word} ${row.meaning.es} ${row.meaning.en} ${row.why.es} ${row.why.en}`), `${row.word} has no dead chrome`);
});
assert(memoryMeaning(MEMORY_BANK[0], "en") === "a job / work", "chamba meaning EN is the stamp");
assert(memoryMeaning(MEMORY_BANK[0], "es") === "trabajo / chamba", "chamba meaning ES is the stamp");
assert(memoryWhy(MEMORY_BANK[0], "en") === "Everyday MX for work", "chamba Why EN");
assert(memoryWhy(MEMORY_BANK[0], "es") === "Forma viva MX de trabajo", "chamba Why ES");
assert(memoryMeaning(MEMORY_BANK[2], "en") === "come on / alright", "órale meaning EN");
assert(memoryWhy(MEMORY_BANK[2], "es") === "Anima, acepta o sorprende", "órale Why ES");
assert(memoryRegionChip(MEMORY_BANK[0]) === "MX · odd in ES/AR", "chamba chip flags ES/AR");
assert(memorySoundsWeirdOutside(MEMORY_BANK[0]), "chamba is weird outside MX");
assert(memoryRegionChip(MEMORY_BANK.find((r) => r.word === "gacho")) === "MX", "local MX chip is just MX");
assert(memoryRegionChip(MEMORY_BANK.find((r) => r.word === "órale")) === "MX · odd in ES/AR/CO", "órale flags ES/AR/CO");
assert(memoryRegionChip(MEMORY_BANK.find((r) => r.word === "bronca")) === "", "Wide LATAM has no MX-strong chip");
assert(memoryRegionChip(MEMORY_BANK.find((r) => r.word === "chela")) === "", "MX / CO is not MX strong");
assert(memoryRegionChip(MEMORY_BANK.find((r) => r.word === "chisme")) === "", "chisme is wide LATAM");
assert(!memorySoundsWeirdOutside(MEMORY_BANK.find((r) => r.word === "chisme")), "chisme is not MX-strong-odd");
assert(MEMORY_DEAD_LABELS.join(" ").includes("MEMORIA / MEMORY"), "bilingual lockup is dead");
assert(memoryHasDeadLabel("MEMORIA / MEMORY"), "dead-label helper catches lockup");
assert(!memoryHasDeadLabel("Memoria"), "title is not dead");

const two = MEMORY_BANK.filter((row) => row.word === "chamba" || row.word === "bronca");
let run = startMemoryRun(two, () => 0, 2);
assert(run.status === "play", "fresh run is play");
assert(run.hub === "games" && run.packId === MEMORY_PACK_ID, "run stamps Games hub");
assert(run.pairs.length === 2 && run.cards.length === 4, "two pairs deal four cards");
assert(run.cards.every((card) => card.id && card.pairId && (card.kind === "word" || card.kind === "meaning")), "cards have id/pair/kind");
assert(!isMemoryDone(run), "fresh run is not done");
assert(!memoryShowTeach(run), "no teach beat yet");

const chambaWord = run.cards.find((card) => card.pairId === "chamba" && card.kind === "word");
const chambaMeaning = run.cards.find((card) => card.pairId === "chamba" && card.kind === "meaning");
const broncaWord = run.cards.find((card) => card.pairId === "bronca" && card.kind === "word");
assert(memoryCardText(chambaWord, "en", run) === "chamba", "word bubble is the lemma");
assert(memoryCardText(chambaMeaning, "en", run) === "a job / work", "meaning bubble follows uiLang EN");
assert(memoryCardText(chambaMeaning, "es", run) === "trabajo / chamba", "meaning bubble follows uiLang ES");

run = applyMemoryTap(run, chambaWord.id);
assert(run.faceUp.includes(chambaWord.id), "first tap flips the card");
assert(memoryIsOpen(run, chambaWord), "tapped card reads open");
run = applyMemoryTap(run, chambaMeaning.id);
assert((run.matched || []).includes("chamba"), "tap match keeps the pair");
assert(run.faceUp.length === 0, "matched pair leaves the flip slot");
assert(run.lastMatch === "chamba", "teach beat is the matched lemma");
assert(memoryShowTeach(run), "Literal · Why is one beat after match");
assert(memoryIsOpen(run, chambaWord) && memoryIsOpen(run, chambaMeaning), "matched cards stay up");
assert(!run.miss, "hit is not a miss");

run = applyMemoryTap(run, broncaWord.id);
const missTap = applyMemoryTap(run, chambaWord.id);
assert(missTap === run, "already-matched card is a no-op");
const missFresh = applyMemoryTap(startMemoryRun(two, () => 0, 2), chambaWord.id);
const miss = applyMemoryTap(missFresh, broncaWord.id);
assert(miss.miss === true, "mismatched second tap is a miss");
assert(miss.lastWrong.length === 2, "miss remembers both cards");
const cleared = clearMemoryMiss(miss);
assert(cleared.miss === false && cleared.faceUp.length === 0, "flip-back clears the miss");
assert((cleared.matched || []).length === 0, "flip-back does not invent a match");

let dragRun = startMemoryRun(two, () => 0, 2);
const dragWord = dragRun.cards.find((card) => card.pairId === "bronca" && card.kind === "word");
const dragMeaning = dragRun.cards.find((card) => card.pairId === "bronca" && card.kind === "meaning");
const dragged = applyMemoryPair(dragRun, dragWord.id, dragMeaning.id);
assert((dragged.matched || []).includes("bronca"), "drag-to-pair matches either direction");
assert(dragged.lastMatch === "bronca", "drag match shows the Why beat");
const reverse = applyMemoryPair(startMemoryRun(two, () => 0, 2), dragMeaning.id, dragWord.id);
assert((reverse.matched || []).includes("bronca"), "meaning onto Mexicanismo also matches");
const dragMiss = applyMemoryPair(dragRun, dragWord.id, chambaWord.id);
assert(dragMiss.miss === true, "drag onto the wrong card flips back");
assert(applyMemoryPair(dragged, dragWord.id, dragMeaning.id) === dragged, "already-matched drag is a no-op");

let walk = startMemoryRun(two, () => 0, 2);
for (const pairId of ["chamba", "bronca"]) {
  const a = walk.cards.find((card) => card.pairId === pairId && card.kind === "word");
  const b = walk.cards.find((card) => card.pairId === pairId && card.kind === "meaning");
  walk = applyMemoryTap(walk, a.id);
  walk = applyMemoryTap(walk, b.id);
}
assert(walk.status === "done" && isMemoryDone(walk), "last pair ends the run");
const finished = finishMemoryRun(walk);
assert(finished.awarded && finished.xp === MEMORY_XP && finished.gems === MEMORY_GEM, "clear pays practice XP");
assert(finishMemoryRun(finished) === finished, "second award is a no-op");
const live = hydrateMemory({
  pairs: [{ word: "chamba" }, { word: "bronca" }],
  cards: walk.cards,
  matched: ["chamba"],
  lastMatch: "chamba",
});
assert(live.pairs[0].meaning.en === "a job / work", "hydrate reloads stamp faces");
assert(live.lastMatch === "chamba" && memoryShowTeach(live), "hydrate keeps the Why beat");
assert(hydrateMemory(null) === null, "empty live is null");

const full = startMemoryRun(MEMORY_BANK, () => 0);
assert(full.pairs.length === MEMORY_ROUND_CAP, "default deal is six pairs");
assert(full.cards.length === MEMORY_ROUND_CAP * 2, "six pairs deal twelve cards");

console.log("ok: memory — Memoria/Memory, 20 Mexicanismo pairs, tap + drag, no soft chrome");
