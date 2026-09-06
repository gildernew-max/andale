import { CHOICE_CHIP_KEYS, choiceChipIndexForKey } from "./choiceChipKeys.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(CHOICE_CHIP_KEYS.join("") === "1234567890-=", "second-row keys are 1-9 0 then - =");
assert(choiceChipIndexForKey("1") === 0, "1 → first chip");
assert(choiceChipIndexForKey("9") === 8, "9 → ninth chip");
assert(choiceChipIndexForKey("0") === 9, "0 → tenth chip");
assert(choiceChipIndexForKey("-") === 10, "- → eleventh chip");
assert(choiceChipIndexForKey("=") === 11, "= → twelfth chip");
assert(choiceChipIndexForKey("!") == null, "shift-1 does not bind");
assert(choiceChipIndexForKey("Enter") == null, "Enter is not a chip key");
assert(choiceChipIndexForKey("a") == null, "letters do not bind");

console.log("ok: choice-chip second-row keys");
