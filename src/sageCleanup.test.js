import { contrastRatio, spanishKeyboardKeyStyle } from "./spanishKeyboard.js";
import {
  BRIGHT_GREEN,
  SAGE,
  bucketBodyColor,
  bucketTileStyle,
  gamesHubCardChrome,
  gamesHubFocusColor,
  letterSlotUnderline,
  memoryCardPaint,
  wordleActionKeyChrome,
} from "./sageChrome.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const lightKey = {
  line: "#E5E5E5",
  green: "#58CC02",
  greenDark: "#46A302",
  red: "#FF4B4B",
  redDark: "#EA2B2B",
  okBg: "#D7FFB8",
  okText: "#58A700",
  badBg: "#FFDFE0",
  badText: "#EA2B2B",
};

const paintBlob = (style) => Object.values(style || {}).join(" ");

const assertNoLime = (style, label) => {
  assert(!BRIGHT_GREEN.test(paintBlob(style)), `${label} still uses bright green: ${paintBlob(style)}`);
};

const lightCards = gamesHubCardChrome("light");
assert(lightCards.border === "2px solid #B8C0A0", "light Games card border is #B8C0A0");
assert(lightCards.borderBottom === "5px solid #6F7757", "light Games lip stays 5px sage");
assert(gamesHubFocusColor("light") === "#6F7757", "light Games focus ring is sage");
const darkCards = gamesHubCardChrome("dark");
assert(darkCards.border === "2px solid #2A2E36", "dark Games card border is #2A2E36");
assert(darkCards.borderBottom === "5px solid #677050", "dark Games lip is sage-small");
assert(gamesHubFocusColor("dark") === "#B8C0A0", "dark Games focus ring is #B8C0A0");
assertNoLime(lightCards, "light Games card");
assertNoLime(darkCards, "dark Games card");

const lightTile = bucketTileStyle("light");
const darkTile = bucketTileStyle("dark");
assert(lightTile.background === "#F6EFE4" && lightTile.border === "2px solid #C46B3A" && lightTile.borderBottom === "4px solid #C46B3A", "light bucket tile matches the other marks");
assert(lightTile.width === 44 && lightTile.height === 44 && lightTile.borderRadius === 14, "bucket tile size and radius stay");
assert(darkTile.background === "#1E2128", "dark bucket tile uses the card fill");
assert(bucketBodyColor("light") === "#6F7757" && bucketBodyColor("dark") === "#B8C0A0", "bucket body is sage, handle stays terracotta in the mark");
assertNoLime(lightTile, "light bucket tile");
assertNoLime(darkTile, "dark bucket tile");

const word = memoryCardPaint({ theme: "light", matched: true, faceUp: true, kind: "word" });
const gloss = memoryCardPaint({ theme: "light", matched: true, faceUp: true, kind: "meaning" });
assert(word.background === "#EEF0E6", "light matched fill is #EEF0E6");
assert(word.border === "2px solid #6F7757" && word.borderBottom === "4px solid #6F7757", "light matched border and lip are sage");
assert(word.color === "#4F5A36" && gloss.color === "#5E6650", "word and translation use the sage inks");
assert(Math.abs(contrastRatio(word.color, word.background) - 6.4) < 0.02, "big word is 6.4:1");
assert(Math.abs(contrastRatio(gloss.color, gloss.background) - 5.22) < 0.02, "translation line is 5.22:1");
assert(contrastRatio(word.color, word.background) >= 4.5 && contrastRatio(gloss.color, gloss.background) >= 4.5, "matched text stays at 4.5");
const darkMatch = memoryCardPaint({ theme: "dark", matched: true, faceUp: true, kind: "word" });
const darkGloss = memoryCardPaint({ theme: "dark", matched: true, faceUp: true, kind: "meaning" });
assert(darkMatch.background === "#677050" && darkMatch.color === "#F6EFE4", "dark matched cards stay sage-small with cream");
assert(darkGloss.color === "#F6EFE4", "dark translation stays cream");
assert(contrastRatio(darkMatch.color, darkMatch.background) >= 4.5, "dark matched text under 4.5");
const faceDown = memoryCardPaint({ theme: "light", matched: false, faceUp: false });
assert(faceDown.background === "#F6EFE4" && faceDown.border === "2px solid #C46B3A", "face-down cards stay cream and terracotta");
assertNoLime(word, "light matched word");
assertNoLime(gloss, "light matched translation");
assertNoLime(darkMatch, "dark matched card");

const idle = spanishKeyboardKeyStyle({ theme: "light", status: "idle", light: lightKey });
const hit = spanishKeyboardKeyStyle({ theme: "light", status: "correct", light: lightKey });
const enter = wordleActionKeyChrome("light", { ...idle, maxWidth: 112 });
assert(idle.color === SAGE.sage && idle.background === "#fff", "light key letters are sage on white");
assert(hit.background === SAGE.sage && hit.color === SAGE.onSage && hit.border === "2px solid #6F7757", "Ahorcado hits fill and border sage");
assert(enter.background === SAGE.sage && enter.color === SAGE.onSage && enter.borderBottom === "4px solid #6F7757", "Wordle Enter and backspace fill sage");
assert(enter.maxWidth === 112, "Enter key width stays");
assert(contrastRatio(idle.color, "#FFFFFF") >= 4.5, "sage letters on white under 4.5");
assert(contrastRatio(hit.color, hit.background) >= 4.5, "white on sage key under 4.5");
assert(contrastRatio(enter.color, enter.background) >= 4.5, "Enter label under 4.5");
assertNoLime(idle, "idle key");
assertNoLime(hit, "correct key");
assertNoLime(enter, "enter key");
const darkEnter = wordleActionKeyChrome("dark", { background: "#1E2128", color: "#F6EFE4", border: "2px solid #2A2E36" });
assert(darkEnter.background === "#1E2128" && darkEnter.color === "#F6EFE4", "dark Enter stays the unused key");

assert(letterSlotUnderline("light", true, "#3C3C3C") === "#6F7757", "light active slot underline is sage");
assert(letterSlotUnderline("dark", true, "#E8E8EA") === "#B8C0A0", "dark active slot underline is the light sage");
assert(letterSlotUnderline("light", false, "#3C3C3C") === "#3C3C3C", "idle slot underline stays the ink");
assert(!BRIGHT_GREEN.test(letterSlotUnderline("light", true)), "slot underline is not bright green");
assert(!BRIGHT_GREEN.test(letterSlotUnderline("dark", true)), "dark slot underline is not bright green");

console.log("ok: sage cleanup chrome");
