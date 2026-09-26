import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
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
};

const WHITE = new Set(["#fff", "#ffffff"]);
const paints = Object.fromEntries(["default", "selected", "correct", "wrong"].map((tone) => [tone, hoyListenChoicePaint(tone, D, cream)]));

assert(norm(D.card) === "#1e2128", "dark card token is #1E2128");
assert(norm(D.line) === "#2a2e36", "dark line token is #2A2E36");
assert(norm(D.sub) === "#a0a4ab", "dark sub token is #A0A4AB");
assert(norm(cream) === "#f6efe4", "choice cream is HUB_CREAM #F6EFE4");

for (const tone of ["default", "selected", "correct", "wrong"]) {
  const paint = paints[tone];
  const fill = norm(paint.fill);
  const textC = contrastRatio(paint.text, paint.fill);
  const badgeC = contrastRatio(paint.badge, paint.fill);
  assert(!WHITE.has(fill), `${tone} dark fill is white (${paint.fill})`);
  assert(fill !== norm(cream), `${tone} dark fill is cream (${paint.fill})`);
  assert(textC >= 4.5, `${tone} text ${paint.text} on ${paint.fill} is ${textC.toFixed(2)}:1`);
  assert(badgeC >= 4.5, `${tone} badge ${paint.badge} on ${paint.fill} is ${badgeC.toFixed(2)}:1`);
  console.log(`${tone}\tfill ${paint.fill}\ttext ${paint.text} ${textC.toFixed(2)}:1\tbadge ${paint.badge} ${badgeC.toFixed(2)}:1\tborder ${paint.border}${paint.edge ? " " + paint.edge : ""}`);
}

assert(norm(paints.default.fill) === "#1e2128" && norm(paints.default.text) === "#f6efe4" && norm(paints.default.border) === "#2a2e36" && !paints.default.edge, "rest is #1E2128 / #2A2E36 / cream, existing edge width");
assert(norm(paints.selected.fill) === "#2d3030" && norm(paints.selected.border) === "#b8c0a0" && paints.selected.edge === "2px" && norm(paints.selected.text) === "#f6efe4", "selected is #2D3030, 2px #B8C0A0, cream");
assert(norm(paints.correct.fill) === "#677050" && norm(paints.correct.text) === "#f6efe4", "correct is #677050 with cream");
assert(norm(paints.wrong.fill) === "#2a2e36" && norm(paints.wrong.text) === "#a0a4ab", "wrong is #2A2E36 with #A0A4AB");
assert(contrastRatio(cream, "#677050").toFixed(2) === "4.58", "cream on correct fill is 4.58:1");
assert(contrastRatio("#A0A4AB", "#2A2E36").toFixed(2) === "5.44", "wrong text is 5.44:1");
assert(norm(paints.correct.fill) !== norm(paints.selected.fill), "correct fill differs from selected");
assert(norm(paints.wrong.fill) !== norm(paints.selected.fill) && norm(paints.wrong.fill) !== norm(paints.default.fill), "wrong fill differs from selected and rest");

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
assert(mc.includes("borderWidth: paint?.edge"), "selected 2px edge is applied only from the dark paint");
assert(mc.includes('boxShadow: hoyDark ? "none"'), "dark Hoy cards drop the light-blue selection ring");
assert(mc.indexOf('"#fff"') < mc.indexOf("hoyListenChoicePaint"), "light literals stay ahead of the dark override");
const storyAt = appSrc.indexOf("story.questions.map");
assert(storyAt > 0 && appSrc.slice(storyAt, storyAt + 2500).includes('let bg = "#fff"'), "Lectura choices stay on their own fill");

function norm(hex) {
  const n = String(hex).trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(n)) return `#${n[1]}${n[1]}${n[2]}${n[2]}${n[3]}${n[3]}`;
  return n;
}

console.log("ok: Hoy listening choice cards — dark text ≥ 4.5:1, fill is not white or cream");
