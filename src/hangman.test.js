import {
  HANGMAN_ACCENTS,
  HANGMAN_BANK,
  HANGMAN_DEAD_LABELS,
  HANGMAN_GEM,
  HANGMAN_HOWTO,
  HANGMAN_HUB,
  HANGMAN_LITERAL_LABEL,
  HANGMAN_MAX,
  HANGMAN_PACK_ID,
  HANGMAN_QUIET,
  HANGMAN_TIMER,
  HANGMAN_TIMER_DEFAULT,
  HANGMAN_TITLE,
  HANGMAN_WHY_LABEL,
  HANGMAN_WIN,
  HANGMAN_WRONG,
  HANGMAN_XP,
  finishHangmanRun,
  guessHangmanLetter,
  hangmanHasDeadLabel,
  hangmanHowTo,
  hangmanKey,
  hangmanLetters,
  hangmanLiteral,
  hangmanLiteralLabel,
  hangmanMisses,
  hangmanQuiet,
  hangmanSlot,
  hangmanTimerLabel,
  hangmanTitle,
  hangmanWhy,
  hangmanWhyLabel,
  hangmanWinLine,
  hangmanWrongLine,
  hydrateHangman,
  isHangmanLost,
  isHangmanOver,
  isHangmanSolved,
  pickHangmanEntry,
  startHangmanRun,
} from "./hangman.js";
import { ABC_LETTERS } from "./letterBoard.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(HANGMAN_TITLE.es === "Ahorcado" && HANGMAN_TITLE.en === "Hangman", "title is ES Ahorcado / EN Hangman");
assert(hangmanTitle("es") === "Ahorcado", "ES title is Ahorcado");
assert(hangmanTitle("en") === "Hangman", "EN title is Hangman");
assert(hangmanTitle("es") !== "Ahorcado / Hangman" && hangmanTitle("en") !== "Ahorcado / Hangman", "no bilingual lockup title");
assert(HANGMAN_QUIET.es === "Palabras de México" && HANGMAN_QUIET.en === "Mexican words", "quiet line is stamped");
assert(hangmanQuiet("es") === "Palabras de México", "ES quiet");
assert(hangmanQuiet("en") === "Mexican words", "EN quiet");
assert(HANGMAN_HOWTO.es === "Adivina la palabra. Una letra a la vez.", "ES how-to stamp");
assert(HANGMAN_HOWTO.en === "Guess the word. One letter at a time.", "EN how-to stamp");
assert(hangmanHowTo("es") === HANGMAN_HOWTO.es && hangmanHowTo("en") === HANGMAN_HOWTO.en, "how-to helper");
assert(HANGMAN_WRONG.es === "Esa no." && HANGMAN_WRONG.en === "Not that one.", "wrong-letter stamp");
assert(hangmanWrongLine("es") === "Esa no." && hangmanWrongLine("en") === "Not that one.", "wrong helper");
assert(HANGMAN_WIN.es === "¡Eso!" && HANGMAN_WIN.en === "That's it.", "win stamp");
assert(hangmanWinLine("es") === "¡Eso!" && hangmanWinLine("en") === "That's it.", "win helper");
assert(HANGMAN_LITERAL_LABEL.es === "Literal" && HANGMAN_LITERAL_LABEL.en === "Literal", "Literal label both faces");
assert(hangmanLiteralLabel("es") === "Literal" && hangmanLiteralLabel("en") === "Literal", "Literal helper");
assert(HANGMAN_WHY_LABEL.es === "Por qué" && HANGMAN_WHY_LABEL.en === "Why", "Why label stamp");
assert(hangmanWhyLabel("es") === "Por qué" && hangmanWhyLabel("en") === "Why", "Why helper");
assert(HANGMAN_HUB === "games", "lives under Games");
assert(HANGMAN_PACK_ID === "mexicanismos-v1", "v1 bank id");
assert(HANGMAN_MAX === 6, "six misses");
assert(HANGMAN_XP === 4 && HANGMAN_GEM === 1, "clear reward matches a practice chip");
assert(HANGMAN_TIMER_DEFAULT === false, "timer off by default");
assert(HANGMAN_TIMER.es.on === "Con reloj" && HANGMAN_TIMER.es.off === "Sin reloj", "ES timer chrome parked");
assert(HANGMAN_TIMER.en.on === "Timer on" && HANGMAN_TIMER.en.off === "No timer", "EN timer chrome parked");
assert(hangmanTimerLabel("es", false) === "Sin reloj", "ES timer off");
assert(hangmanTimerLabel("en", false) === "No timer", "EN timer off");
assert(HANGMAN_ACCENTS.join("") === "ÁÉÍÓÚÜ", "accent row is ÁÉÍÓÚÜ");
assert(ABC_LETTERS.includes("Ñ"), "Spanish alphabet includes ñ");
assert(!ABC_LETTERS.includes("Ó"), "ó is bank spelling, not the 27-letter alphabet");

assert(HANGMAN_BANK.length === 20, "v1 bank is 20 words");
const words = HANGMAN_BANK.map((row) => row.word);
assert(new Set(words).size === 20, "bank words are unique");
assert(words[0] === "chamba" && words[2] === "órale" && words[19] === "fresa", "bank order is the stamp");
HANGMAN_BANK.forEach((row) => {
  assert(row.word && !/\s/.test(row.word), `${row.word} is hangman-safe (no spaces)`);
  assert(row.literal?.es && row.literal?.en, `${row.word} has Literal EN+ES`);
  assert(row.why?.es && row.why?.en, `${row.word} has Why EN+ES`);
  assert(!/\n/.test(`${row.literal.es}${row.literal.en}${row.why.es}${row.why.en}`), `${row.word} Literal/Why are one-liners`);
  assert(!hangmanHasDeadLabel(`${row.word} ${row.literal.es} ${row.literal.en} ${row.why.es} ${row.why.en}`), `${row.word} has no dead chrome`);
});
assert(hangmanLiteral(HANGMAN_BANK[0], "en") === "Work / a job (everyday)", "chamba Literal EN");
assert(hangmanLiteral(HANGMAN_BANK[0], "es") === "Trabajo / chamba de todos los días", "chamba Literal ES");
assert(hangmanWhy(HANGMAN_BANK[0], "en") === "In Mexico, *chamba* is the normal word for work — *trabajo* is fine; *chamba* is how people actually say it.", "chamba Why EN");
assert(hangmanWhy(HANGMAN_BANK[0], "es") === "En México *chamba* es la forma viva de decir trabajo.", "chamba Why ES");
assert(hangmanLiteral(HANGMAN_BANK[2], "en") === "Come on / alright / wow", "órale Literal EN");
assert(hangmanWhy(HANGMAN_BANK[2], "es") === "Sirve para animar, aceptar o sorprenderse, según el tono.", "órale Why ES");
assert(HANGMAN_DEAD_LABELS.join(" ").includes("AHORCADO / HANGMAN"), "bilingual lockup is dead");
assert(hangmanHasDeadLabel("AHORCADO / HANGMAN"), "dead-label helper catches lockup");

assert(hangmanKey("ó") === "Ó" && hangmanKey("ñ") === "Ñ", "keys preserve accents and ñ");
assert(hangmanKey("o") === "O" && hangmanKey("ó") !== hangmanKey("o"), "ó is not o");
assert(hangmanLetters("órale").join("") === "ÓRALE", "órale slots keep ó");
assert(hangmanLetters("órale").includes("Ó") && !hangmanLetters("órale").includes("O"), "órale needs Ó");
assert(hangmanLetters("chamba").join("") === "CHAMBA", "plain word uppercases");

const run = startHangmanRun(HANGMAN_BANK, () => 0);
assert(run.status === "play", "fresh run is play");
assert(run.word === "chamba", "rng 0 deals chamba");
assert(run.hub === "games" && run.packId === HANGMAN_PACK_ID, "run stamps Games hub");
assert(run.timerOn === false, "run timer is off");
assert(run.letters.join("") === "CHAMBA", "slots are bank spelling");
assert(run.guessed.length === 0, "no guesses yet");
assert(pickHangmanEntry(HANGMAN_BANK, () => 0).word === "chamba", "pick helper uses rng");

const miss = guessHangmanLetter(run, "Z");
assert(miss.status === "play" && miss.lastHit === false, "wrong letter stays on the field");
assert(hangmanMisses(miss).join("") === "Z", "miss is recorded");
assert(!isHangmanOver(miss), "one miss is not over");

const dup = guessHangmanLetter(miss, "z");
assert(dup === miss, "duplicate guess is a no-op");

const hit = guessHangmanLetter(run, "c");
assert(hit.lastHit === true && hangmanSlot(hit, 0) === "C", "C reveals");
assert(hangmanSlot(hit, 1) === "", "H still hidden");

let walk = run;
for (const ch of "CHMB") walk = guessHangmanLetter(walk, ch);
assert(!isHangmanSolved(walk), "A still blank");
const solved = guessHangmanLetter(walk, "A");
assert(isHangmanSolved(solved) && solved.status === "win", "full word solves");
assert(solved.letters.every((ch, i) => hangmanSlot(solved, i) === ch), "all slots open");
assert(hangmanLiteral(solved, "en") === "Work / a job (everyday)", "solve exposes Literal");
assert(hangmanWhy(solved, "es") === "En México *chamba* es la forma viva de decir trabajo.", "solve exposes Why");
const awarded = finishHangmanRun(solved, true);
assert(awarded.awarded && awarded.xp === HANGMAN_XP && awarded.gems === HANGMAN_GEM, "win awards practice XP");
assert(finishHangmanRun(awarded, true) === awarded, "second finish is a no-op");

const orale = startHangmanRun([HANGMAN_BANK[2]], () => 0);
assert(orale.word === "órale", "can deal órale");
const oMiss = guessHangmanLetter(orale, "O");
assert(oMiss.lastHit === false && hangmanSlot(oMiss, 0) === "", "O does not fill ó");
const oHit = guessHangmanLetter(orale, "Ó");
assert(oHit.lastHit === true && hangmanSlot(oHit, 0) === "Ó", "Ó fills órale");

let lose = startHangmanRun(HANGMAN_BANK, () => 0);
for (const ch of "XYZJKW") lose = guessHangmanLetter(lose, ch);
assert(isHangmanLost(lose) && hangmanMisses(lose).length === HANGMAN_MAX, "six misses lose");
assert(guessHangmanLetter(lose, "C").status === "lose", "over run ignores further guesses");
const lostAward = finishHangmanRun(lose, false);
assert(lostAward.awarded && lostAward.xp === 0, "lose awards no XP");

const hydrated = hydrateHangman({ word: "órale", guessed: ["o", "ó"], done: false });
assert(hydrated.letters.join("") === "ÓRALE", "hydrate rebuilds accent slots");
assert(hydrated.guessed.join("") === "OÓ", "hydrate keys old guesses");
assert(hydrated.timerOn === false, "hydrate keeps timer off");
assert(hydrated.literal.en === "Come on / alright / wow", "hydrate restamps Literal");

const frozen = guessHangmanLetter(solved, "X");
assert(frozen.status === "win" && frozen.guessed.length === solved.guessed.length, "solved guess is a no-op");

console.log("ok: hangman — 20-word MX bank, accent-sensitive slots, Literal then Why, timer off");
