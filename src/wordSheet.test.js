import { watchWordSheetPlacement, wordSheetClose, wordSheetFrame, wordSheetPlacementReason, wordSheetReveal } from "./wordSheet.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const open = wordSheetFrame({ viewportHeight: 844, viewportWidth: 390, checkpointTop: 700 });
assert(open.bottom === 844 - (700 - 10), "sheet bottom stops one gap above the buttons");
assert(700 > 844 - open.bottom, "checkpoint top stays below the sheet edge");
assert(open.maxHeight <= 700 - 10, "sheet cannot grow into the buttons");
assert(open.backdropBottom === open.bottom, "dismiss layer stops at the same line");
assert(open.left >= 8 && open.left + open.width <= 390 - 8, "sheet stays inside the phone");

const low = wordSheetFrame({ viewportHeight: 844, viewportWidth: 390, checkpointTop: 1200 });
assert(low.bottom === 8, "offscreen checkpoint leaves the sheet on the bottom margin");

const tight = wordSheetFrame({ viewportHeight: 844, viewportWidth: 390, checkpointTop: 80 });
assert(tight.maxHeight <= 80 - 10, "a high checkpoint still leaves the buttons clear");
assert(844 - tight.bottom <= 80 - 10, "sheet edge stays above a high checkpoint");

const none = wordSheetFrame({ viewportHeight: 844, viewportWidth: 390, checkpointTop: null });
assert(none.backdropBottom === 0, "no checkpoint uses a full-screen dismiss layer");
assert(none.bottom === 8, "no checkpoint pins the sheet to the bottom margin");

/** After spacer and scroll, where the word, sheet, and buttons land. */
function placed(input) {
  const plan = wordSheetReveal(input);
  const wordTop = input.wordTop - plan.scrollDelta;
  const wordBottom = input.wordBottom - plan.scrollDelta;
  const checkpointTop = input.checkpointTop + (plan.spacer - (input.currentSpacer || 0)) - plan.scrollDelta;
  const checkpointBottom = input.checkpointBottom + (plan.spacer - (input.currentSpacer || 0)) - plan.scrollDelta;
  const sheetBottom = input.viewportHeight - plan.frame.bottom;
  const sheetTop = sheetBottom - plan.frame.maxHeight;
  return { plan, wordTop, wordBottom, checkpointTop, checkpointBottom, sheetTop, sheetBottom };
}

const phone = { viewportHeight: 844, viewportWidth: 390, topInset: 56, contentHeight: 188.375 };
const buttons = { checkpointTop: 869.625, checkpointBottom: 931.625 };

const firstLine = placed({
  ...phone,
  ...buttons,
  wordTop: 486,
  wordBottom: 511.375,
});
assert(firstLine.plan.spacer === 0, "first line already clears the definition");
assert(firstLine.sheetTop >= firstLine.wordBottom, "390x844 first line: sheet top is below the tapped word");
assert(firstLine.checkpointTop >= firstLine.sheetBottom, "390x844 first line: sheet stops above the checkpoint buttons");
assert(firstLine.wordTop >= 56, "390x844 first line: tapped word is below the header");
assert(firstLine.checkpointBottom <= 844 - 8 + 1, "390x844 first line: checkpoint buttons stay on screen");
assert(firstLine.plan.frame.maxHeight === 188.375, "definition is not clipped to uncover the word");

const lastLine = placed({
  ...phone,
  ...buttons,
  wordTop: 784,
  wordBottom: 808.875,
});
assert(lastLine.plan.spacer > 0, "last line asks the checkpoint to move down");
assert(lastLine.sheetTop >= lastLine.wordBottom, "390x844 last line: sheet top is below the tapped word");
assert(lastLine.checkpointTop >= lastLine.sheetBottom, "390x844 last line: sheet stops above the checkpoint buttons");
assert(lastLine.wordTop >= 56, "390x844 last line: tapped word is below the header");
assert(lastLine.checkpointBottom <= 844 - 8 + 1, "390x844 last line: checkpoint buttons stay on screen");
assert(lastLine.plan.frame.maxHeight === 188.375, "last line keeps the full definition");

const tall = placed({
  ...phone,
  ...buttons,
  contentHeight: 307.375,
  wordTop: 665,
  wordBottom: 690,
});
assert(tall.plan.frame.maxHeight === 307.375, "a key-word note is not clipped to uncover the word");
assert(tall.sheetTop >= tall.wordBottom, "390x844 tall definition: sheet top is below the tapped word");
assert(tall.checkpointTop >= tall.sheetBottom, "390x844 tall definition: sheet stops above the checkpoint buttons");
assert(tall.checkpointBottom <= 844 - 8 + 1, "390x844 tall definition: checkpoint buttons stay on screen");

const again = placed({
  ...phone,
  wordTop: lastLine.wordTop,
  wordBottom: lastLine.wordBottom,
  checkpointTop: lastLine.checkpointTop,
  checkpointBottom: lastLine.checkpointBottom,
  currentSpacer: lastLine.plan.spacer,
});
assert(Math.abs(again.plan.spacer - lastLine.plan.spacer) < 0.01, "spacer stays put once the word is clear");
assert(Math.abs(again.plan.scrollDelta) < 0.01, "no further scroll once the word is clear");
assert(again.sheetTop >= again.wordBottom, "settled sheet stays below the tapped word");

const nudged = wordSheetReveal({
  ...phone,
  wordTop: firstLine.wordTop - 120,
  wordBottom: firstLine.wordBottom - 120,
  checkpointTop: firstLine.checkpointTop - 120,
  checkpointBottom: firstLine.checkpointBottom - 120,
  currentSpacer: firstLine.plan.spacer,
});
assert(Math.abs(nudged.scrollDelta) > 1, "a 120px scroll would still ask the opener to snap back");

const listeners = {};
const scrollByCalls = [];
const placementReasons = [];
class FakeResize {
  constructor(cb) { this.cb = cb; FakeResize.current = this; }
  observe(el) { this.el = el; }
  disconnect() { this.disconnected = true; }
}
const target = {
  addEventListener(type, fn) {
    if (type === "scroll") throw new Error("a scroll event must not re-place the sheet");
    (listeners[type] ||= []).push(fn);
  },
  removeEventListener(type, fn) {
    listeners[type] = (listeners[type] || []).filter((item) => item !== fn);
  },
  scrollBy(_x, y) { scrollByCalls.push(y); },
};
let contentHeight = 188.375;
const stop = watchWordSheetPlacement(target, {
  place(reason) {
    placementReasons.push(reason);
    target.scrollBy(0, reason === "content" ? 40 : 8);
  },
  content: { id: "definition" },
  readContentHeight: () => contentHeight,
  ResizeObserver: FakeResize,
});
for (const fn of listeners.scroll || []) fn();
assert(placementReasons.length === 0, "a scroll event after open does not re-place");
assert(scrollByCalls.length === 0, "a scroll event after open does not call scrollBy");
listeners.resize[0]();
assert(placementReasons.at(-1) === "resize", "a viewport resize re-places");
assert(scrollByCalls.at(-1) === 8, "a viewport resize may scroll to the new fit");
FakeResize.current.cb();
assert(placementReasons.length === 1, "an unchanged definition height does not re-place");
contentHeight = 307.375;
FakeResize.current.cb();
assert(placementReasons.at(-1) === "content", "a definition height change re-places");
assert(scrollByCalls.at(-1) === 40, "a definition height change may scroll to the new fit");
listeners.orientationchange[0]();
assert(placementReasons.at(-1) === "resize", "orientation change re-places");
stop();
assert(FakeResize.current.disconnected, "content watcher stops on close");
assert((listeners.resize || []).length === 0, "resize watcher stops on close");
assert(nudged.frame.maxHeight === 188.375, "ignoring the scroll still keeps the full definition");

for (const kind of ["open", "content", "resize"]) {
  assert(wordSheetPlacementReason(kind) === kind, `${kind} places the sheet`);
}
assert(wordSheetPlacementReason("orientationchange") === "resize", "rotation places the sheet");
for (const kind of ["scroll", "close", "spacer"]) {
  assert(wordSheetPlacementReason(kind) == null, `${kind} does not place the sheet`);
}

const closedLast = wordSheetClose({ scrollY: 241, spacer: lastLine.plan.spacer });
assert(closedLast.spacer === 0, "close resets a last-line spacer to 0");
assert(closedLast.scrollY === 241, "close does not jump the page off a last-line word");
const closedFirst = wordSheetClose({ scrollY: 96, spacer: firstLine.plan.spacer });
assert(closedFirst.spacer === 0, "close resets a first-line spacer to 0");
assert(closedFirst.scrollY === 96, "close does not jump the page off a first-line word");

console.log("ok: word sheet stops above checkpoint buttons and below the tapped word");
