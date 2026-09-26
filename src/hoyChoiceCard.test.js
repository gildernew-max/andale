import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  HOY_LISTEN_SAGE,
  HOY_LISTEN_SAGE_FILL,
  contrastRatio,
  hoyListenChoicePaint,
  hoyListenChoiceTone,
  isHoyListenChoiceStep,
} from "./hoyChoiceCard.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");
const darkBlock = appSrc.slice(appSrc.indexOf("const D_DARK = {"), appSrc.indexOf("const D_DARK = {") + 900);
const token = (key) => {
  const m = darkBlock.match(new RegExp(`${key}:\\s*"(#[0-9A-Fa-f]{3,8})"`));
  assert(m, `D_DARK.${key} missing`);
  return m[1];
};
const cream = (appSrc.match(/const HUB_CREAM = "(#[0-9A-Fa-f]{6})"/) || [])[1];
assert(cream, "HUB_CREAM missing");

const D = {
  card: token("card"),
  line: token("line"),
  sub: token("sub"),
  okBg: token("okBg"),
  okText: token("okText"),
  green: token("green"),
  badBg: token("badBg"),
  badText: token("badText"),
  red: token("red"),
};

const WHITE = new Set(["#fff", "#ffffff"]);
const paints = Object.fromEntries(["default", "selected", "correct", "wrong"].map((tone) => [tone, hoyListenChoicePaint(tone, D, cream)]));

assert(norm(D.card) === "#1e2128", "dark card token is #1E2128");
assert(norm(D.line) === "#2a2e36", "dark line token is #2A2E36");
assert(norm(cream) === "#f6efe4", "choice cream is HUB_CREAM #F6EFE4");
assert(norm(HOY_LISTEN_SAGE) === "#6f7757", "sage token is #6F7757");
assert(norm(HOY_LISTEN_SAGE_FILL) === "#677050", "sage fill steps to #677050");
assert(contrastRatio(cream, HOY_LISTEN_SAGE) < 4.5, "cream on #6F7757 is under 4.5, so the fill must not stay there");

for (const tone of ["default", "selected", "correct", "wrong"]) {
  const paint = paints[tone];
  const fill = norm(paint.fill);
  const textC = contrastRatio(paint.text, paint.fill);
  const badgeC = contrastRatio(paint.badge, paint.fill);
  assert(!WHITE.has(fill), `${tone} dark fill is white (${paint.fill})`);
  assert(fill !== norm(cream), `${tone} dark fill is cream (${paint.fill})`);
  assert(textC >= 4.5, `${tone} text ${paint.text} on ${paint.fill} is ${textC.toFixed(2)}:1`);
  assert(badgeC >= 4.5, `${tone} badge ${paint.badge} on ${paint.fill} is ${badgeC.toFixed(2)}:1`);
  console.log(`${tone}\tfill ${paint.fill}\ttext ${paint.text} ${textC.toFixed(2)}:1\tbadge ${paint.badge} ${badgeC.toFixed(2)}:1\tborder ${paint.border}`);
}

assert(norm(paints.default.fill) === "#1e2128" && norm(paints.default.text) === "#f6efe4" && norm(paints.default.border) === "#2a2e36", "default is card / cream / line");
assert(norm(paints.selected.fill) === "#677050" && norm(paints.selected.text) === "#f6efe4" && norm(paints.selected.border) === "#6f7757", "selected is darkened sage, cream, sage border");
assert(norm(paints.correct.fill) !== norm(paints.selected.fill), "correct fill differs from selected");
assert(norm(paints.wrong.fill) !== norm(paints.selected.fill) && norm(paints.wrong.fill) !== norm(paints.correct.fill), "wrong fill differs from selected and correct");
assert(norm(paints.default.fill) !== norm(paints.selected.fill), "default fill differs from selected");

const landlord = {
  type: "mc",
  _u: "_today",
  line: "Oye, ¿el depósito cuenta para el último mes?",
  choices: ["natural y firme", "de correo formal", "agresivo"],
};
assert(isHoyListenChoiceStep({ todaySceneId: "landlord", unitId: "_today:landlord" }, landlord), "landlord Hoy listening step");
assert(isHoyListenChoiceStep({ unitId: "_today:landlord" }, landlord), "Hoy unitId is enough");
assert(!isHoyListenChoiceStep({ unitId: "registro" }, { type: "mc", _u: "registro", choices: ["a"] }), "unit MC is not the Hoy listening step");
assert(!isHoyListenChoiceStep({ todaySceneId: "landlord", unitId: "_today:landlord" }, { type: "listen", _u: "_today", text: "Oye" }), "dictation is not these cards");
assert(!isHoyListenChoiceStep({ todaySceneId: "landlord" }, { type: "mc", _u: "registro", line: "x" }), "mixed-in unit question stays on the old cards");
assert(!isHoyListenChoiceStep(null, landlord), "missing session is not the step");

assert(hoyListenChoiceTone({ showState: false, isSel: false, isAns: false }) === "default", "idle tone");
assert(hoyListenChoiceTone({ showState: false, isSel: true, isAns: true }) === "selected", "tap before check is selected");
assert(hoyListenChoiceTone({ showState: true, isSel: true, isAns: true }) === "correct", "checked answer is correct");
assert(hoyListenChoiceTone({ showState: true, isSel: true, isAns: false }) === "wrong", "checked miss is wrong");

const mcAt = appSrc.indexOf('{q.type === "mc" && (');
assert(mcAt > 0, "lesson MC block exists");
const mc = appSrc.slice(mcAt, mcAt + 2200);
assert(mc.includes('let bg = "#fff", bd = D.line, col = D.ink;'), "light default fill stays #fff");
assert(mc.includes('bg = "#DDF4FF"; bd = D.blue; col = D.blueDark;'), "light selected fill stays #DDF4FF");
assert(mc.includes("theme === \"dark\" && isHoyListenChoiceStep(session, q)"), "dark paint is gated to the Hoy listening step");
assert(mc.includes("hoyListenChoicePaint"), "dark cards use the paint helper");
assert(mc.indexOf('"#fff"') < mc.indexOf("hoyListenChoicePaint"), "light literals stay ahead of the dark override");
const storyAt = appSrc.indexOf("story.questions.map");
assert(storyAt > 0 && appSrc.slice(storyAt, storyAt + 2500).includes('let bg = "#fff"'), "Lectura choices stay on their own fill");

function norm(hex) {
  const n = String(hex).trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(n)) return `#${n[1]}${n[1]}${n[2]}${n[2]}${n[3]}${n[3]}`;
  return n;
}

console.log("ok: Hoy listening choice cards — dark text ≥ 4.5:1, fill is not white or cream");
