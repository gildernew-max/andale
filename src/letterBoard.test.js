import {
  ABC_LETTERS,
  ABC_ROWS,
  DEFAULT_LETTER_LAYOUT,
  QWERTY_ROWS,
  lettersForLayout,
  normalizeLetterLayout,
  rowsForLayout,
} from "./letterBoard.js";
import {
  SPANISH_KEYBOARD,
  boardTilePaint,
  contrastRatio,
  darkGamesButtonStyle,
  darkHangmanEndCardStyle,
  isWhiteOrCreamFill,
  spanishKeyboardKeyStyle,
} from "./spanishKeyboard.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(DEFAULT_LETTER_LAYOUT === "qwerty", "default letter layout is QWERTY");
assert(normalizeLetterLayout(undefined) === "qwerty", "missing layout is QWERTY");
assert(normalizeLetterLayout("nope") === "qwerty", "junk layout is QWERTY");
assert(normalizeLetterLayout("QWERTY") === "qwerty", "case-mismatch QWERTY falls back to default");
assert(normalizeLetterLayout("abc") === "abc", "abc stays abc");

const qwerty = lettersForLayout("qwerty");
const abc = lettersForLayout("abc");
assert(qwerty.join("") === "QWERTYUIOPASDFGHJKLÑZXCVBNM", "QWERTY order with Ñ after L");
assert(abc.join("") === "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ", "ABC is A–Z with Ñ after N");
assert(qwerty[qwerty.indexOf("L") + 1] === "Ñ", "Ñ sits after L on QWERTY");
assert(abc[abc.indexOf("N") + 1] === "Ñ", "Ñ sits after N on ABC");
assert(ABC_LETTERS.join("") === abc.join(""), "ABC_LETTERS matches ABC rows");

const qSet = new Set(qwerty);
const aSet = new Set(abc);
assert(qwerty.length === 27 && abc.length === 27, "both layouts have 26 + Ñ");
assert(qSet.size === 27 && aSet.size === 27, "no duplicate letters");
ABC_LETTERS.forEach((ch) => {
  assert(qSet.has(ch), `QWERTY includes ${ch}`);
  assert(aSet.has(ch), `ABC includes ${ch}`);
});

assert(rowsForLayout("qwerty") === QWERTY_ROWS, "qwerty rows");
assert(rowsForLayout("abc") === ABC_ROWS, "abc rows");
assert(QWERTY_ROWS[0].length === 10 && QWERTY_ROWS[1].length === 10 && QWERTY_ROWS[2].length === 7, "QWERTY 10-10-7");
assert(ABC_ROWS.every((row) => row.length === 9), "ABC is a 9-wide grid");

const LIGHT = {
  line: "#E5E5E5",
  green: "#58CC02",
  greenDark: "#46A302",
  red: "#FF4B4B",
  redDark: "#EA2B2B",
  okBg: "#D7FFB8",
  okText: "#58A700",
  badBg: "#FFDFE0",
  badText: "#EA2B2B",
  cream: "#F6EFE4",
  mark: "#5C7356",
  subtle: "#F7F7F7",
  sub: "#777777",
  card: "#FFFFFF",
  muted: "#777777",
};

const lightIdle = spanishKeyboardKeyStyle({ theme: "light", status: "idle", light: LIGHT });
assert(lightIdle.background === "#fff", "light idle key is white");
assert(lightIdle.color === "#58CC02", "light idle key is CHECK lime");
assert(lightIdle.fontWeight === 800 && lightIdle.fontSize === 14 && lightIdle.height === 38 && lightIdle.maxWidth === 38, "light key size unchanged");
assert(lightIdle.border === "2px solid #E5E5E5" && lightIdle.borderBottom === "4px solid #E5E5E5", "light idle lip unchanged");
const lightHit = spanishKeyboardKeyStyle({ theme: "light", status: "correct", light: LIGHT });
assert(lightHit.background === "#D7FFB8" && lightHit.color === "#58A700" && lightHit.fontWeight === 800, "light correct key unchanged");
assert(lightHit.border === "2px solid #58CC02" && lightHit.borderBottom === "4px solid #46A302", "light correct lip unchanged");
const lightMiss = spanishKeyboardKeyStyle({ theme: "light", status: "wrong", light: LIGHT });
assert(lightMiss.background === "#FFDFE0" && lightMiss.color === "#EA2B2B", "light miss key unchanged");
assert(lightMiss.border === "2px solid #FF4B4B" && lightMiss.borderBottom === "4px solid #EA2B2B", "light miss lip unchanged");

const lightCat = boardTilePaint({ theme: "light", role: "category", light: LIGHT });
assert(lightCat.background === "#F6EFE4" && lightCat.color === "#5C7356" && lightCat.border === "2px solid #C46B3A", "light category tile unchanged");
assert(lightCat.borderBottom == null, "light category has no extra lip");
const lightVal = boardTilePaint({ theme: "light", role: "value", used: false, light: LIGHT });
assert(lightVal.background === "#F6EFE4" && lightVal.color === "#C46B3A", "light value tile unchanged");
assert(lightVal.border === "2px solid #C46B3A" && lightVal.borderBottom === "5px solid #C46B3A", "light value lip unchanged");
const lightUsed = boardTilePaint({ theme: "light", role: "value", used: true, light: LIGHT });
assert(lightUsed.background === "#F7F7F7" && lightUsed.color === "#777777", "light used value unchanged");
assert(lightUsed.border === "2px solid #E5E5E5" && lightUsed.borderBottom === "5px solid #E5E5E5", "light used lip unchanged");

const DARK_LIGHT = { card: "#1E2128", line: "#2A2E36", cream: "#F6EFE4", muted: "#A0A4AB", sub: "#A0A4AB" };
for (const status of ["idle", "correct", "wrong", "absent", "present"]) {
  const face = spanishKeyboardKeyStyle({ theme: "dark", status, light: DARK_LIGHT });
  assert(!isWhiteOrCreamFill(face.background), `dark ${status} key fill is not white or cream (${face.background})`);
  assert(contrastRatio(face.color, face.background) >= 4.5, `dark ${status} key text ${face.color} on ${face.background} is ${contrastRatio(face.color, face.background).toFixed(2)}`);
  assert(face.border === "2px solid #2A2E36" && face.borderBottom === "4px solid #2A2E36", `dark ${status} key lip`);
  assert(face.height === 38 && face.fontSize === 14 && face.maxWidth === 38, `dark ${status} key size unchanged`);
}
const darkCorrect = spanishKeyboardKeyStyle({ theme: "dark", status: "correct", light: DARK_LIGHT });
assert(darkCorrect.background === SPANISH_KEYBOARD.sageSmall && darkCorrect.color === "#F6EFE4" && darkCorrect.fontWeight === 900, "correct key is sage-small with bold cream");
assert(SPANISH_KEYBOARD.sage === "#6F7757" && SPANISH_KEYBOARD.sageSmall === "#677050", "sage tokens stay the ruling");
assert(contrastRatio("#F6EFE4", "#6F7757") < 4.5, "small cream on brand sage misses 4.5, so keys use sageSmall");
const darkWrong = spanishKeyboardKeyStyle({ theme: "dark", status: "wrong", light: DARK_LIGHT });
assert(darkWrong.background === "#2A2E36" && darkWrong.color === "#A0A4AB", "wrong key is #A0A4AB on #2A2E36");
assert(Math.abs(contrastRatio(darkWrong.color, darkWrong.background) - 5.44) < 0.02, "wrong key stays 5.44:1, not faded further");
assert(darkWrong.background !== darkCorrect.background, "correct and wrong keys differ");
const darkPresent = spanishKeyboardKeyStyle({ theme: "dark", status: "present", light: DARK_LIGHT });
assert(darkPresent.background === "#85672C" && darkPresent.color === "#F6EFE4", "present key is cream on ochre #85672C");
assert(Math.abs(contrastRatio(darkPresent.color, darkPresent.background) - 4.63) < 0.02, "present key is 4.63:1");
const darkIdle = spanishKeyboardKeyStyle({ theme: "dark", status: "idle", light: DARK_LIGHT });
assert(darkIdle.color === "#F6EFE4" && darkIdle.background === "#1E2128", "idle key is cream on the card");
assert(Math.abs(contrastRatio(darkIdle.color, darkIdle.background) - 14.11) < 0.02, "idle key is 14.11:1");
assert(Math.abs(contrastRatio(darkCorrect.color, darkCorrect.background) - 4.58) < 0.02, "correct key is 4.58:1");
assert(darkIdle.background !== darkWrong.background && darkIdle.color !== darkWrong.color, "idle and wrong keys differ");

const darkCat = boardTilePaint({ theme: "dark", role: "category", light: DARK_LIGHT });
const darkVal = boardTilePaint({ theme: "dark", role: "value", used: false, light: DARK_LIGHT });
const darkUsed = boardTilePaint({ theme: "dark", role: "value", used: true, light: DARK_LIGHT });
for (const [name, tile] of [["category", darkCat], ["value", darkVal], ["used", darkUsed]]) {
  assert(!isWhiteOrCreamFill(tile.background), `dark jeopardy ${name} fill is not white or cream`);
  assert(contrastRatio(tile.color, tile.background) >= 4.5, `dark jeopardy ${name} text under 4.5`);
  assert(tile.background === "#1E2128" && tile.border === "2px solid #2A2E36", `dark jeopardy ${name} is card + lip`);
}
assert(darkVal.borderBottom === "5px solid #2A2E36", "dark value keeps the 5px lip");
assert(darkCat.borderBottom == null, "dark category does not grow a lip");
assert(darkVal.color === "#F6EFE4" && darkUsed.color === "#F6EFE4", "board tiles use cream, the unused-key ink");
assert(darkUsed.background === "#1E2128" && darkCat.background === "#1E2128", "board tiles use the unused-key fill");

const gamesBtn = darkGamesButtonStyle();
assert(!isWhiteOrCreamFill(gamesBtn.background), "dark Games button is not white or cream");
assert(gamesBtn.background === "#1E2128" && gamesBtn.color === "#F6EFE4", "Games button is cream on the card");
assert(gamesBtn.border === "2px solid #2A2E36" && gamesBtn.borderBottom === "4px solid #2A2E36", "Games button lip");
assert(contrastRatio(gamesBtn.color, gamesBtn.background) >= 4.5, "Games button text under 4.5");

const endCard = darkHangmanEndCardStyle();
assert(endCard.background === "#1E2128", "dark Hangman end card fill is the card");
assert(endCard.border === "2px solid #677050", "dark Hangman end card border is sage");
assert(!isWhiteOrCreamFill(endCard.background), "dark Hangman end card is not white or cream");

console.log("ok: letter-board QWERTY / ABC layouts");
