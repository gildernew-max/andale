import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  PAYWALL_FLY_EASE,
  PAYWALL_FLY_MS,
  PAYWALL_FLY_SIZE,
  PAYWALL_FLY_SRC,
  PAYWALL_REDUCE_FADE_MS,
  PAYWALL_WING_MS,
  WIN_FLY_SIZE,
  flyAwaySurface,
} from "./paywallFlyAway.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const here = dirname(fileURLToPath(import.meta.url));
const flySrc = readFileSync(join(here, "PaywallFlyAway.jsx"), "utf8");
const helperSrc = readFileSync(join(here, "paywallFlyAway.js"), "utf8");
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");
const paywallLayout = appSrc.slice(appSrc.indexOf('data-testid="soft-paywall"'), appSrc.indexOf("A2HS:"));

assert(PAYWALL_FLY_MS >= 600 && PAYWALL_FLY_MS <= 900, "fly-away total is 600–900ms entrance→exit");
assert(PAYWALL_WING_MS >= 180 && PAYWALL_WING_MS <= 220, "wing beat is 180–220ms per cycle");
assert(PAYWALL_REDUCE_FADE_MS > 0 && PAYWALL_REDUCE_FADE_MS < 400, "reduced-motion fade is a short static beat");
assert(PAYWALL_FLY_SRC === "mascot/cenzontle.png", "same one Cenzontle family asset");
assert(PAYWALL_FLY_EASE === "ease-in-out", "flight ease is in-out, not Cubetas grab");
assert(PAYWALL_FLY_MS !== 780, "fly-away is not the Cubetas 780ms grab/arc");
assert(PAYWALL_FLY_SIZE === 44, "paywall bird stays the 44px gate mark");
assert(WIN_FLY_SIZE === 168, "free win bird stays the 168px CONTINUAR mark");
assert(flyAwaySurface("paywall").birdTestId === "soft-paywall-cenzontle", "paywall keeps the gate test id");
assert(flyAwaySurface("win").birdTestId === "win-fly-away-bird", "free win has its own bird test id");
assert(flyAwaySurface("win").stageTestId === "win-fly-away", "free win stage is testable");
assert(helperSrc.includes("Soft chrome parked"), "helper documents soft chrome parked");
assert(helperSrc.includes("free story-win"), "helper documents the free CONTINUAR surface");

assert(flySrc.includes("PAYWALL_FLY_MS"), "overlay reads the 600–900ms lock");
assert(flySrc.includes("PAYWALL_WING_MS"), "overlay reads the wing-beat lock");
assert(flySrc.includes("PAYWALL_FLY_SRC"), "overlay reads the live mark path");
assert(flySrc.includes("data-testid={ids.birdTestId}"), "bird img reads the surface test id");
assert(flySrc.includes("data-testid={ids.wingTestId}"), "wing layer is testable");
assert(flySrc.includes("data-testid={ids.stageTestId}"), "stage is testable");
assert(helperSrc.includes("soft-paywall-cenzontle"), "paywall bird test id stays on the helper");
assert(helperSrc.includes("win-fly-away-bird"), "free win bird test id stays on the helper");
assert(flySrc.includes("@keyframes paywallFlyAway"), "motion path is an authored fly-away");
assert(flySrc.includes("translate(calc(-50% + 260px), -40px)"), "100% leaves the frame to the right");
assert(flySrc.includes("opacity: 0"), "exit is gone — not a perched mark");
assert(flySrc.includes("paywallWingBeat ${PAYWALL_WING_MS}ms ${PAYWALL_FLY_EASE} infinite"), "wing beat loops while in flight");
assert(flySrc.includes("rotate(-12deg)"), "wing amplitude starts small");
assert(flySrc.includes("rotate(10deg)"), "wing amplitude stays geometric, not thrash");
assert(flySrc.includes("@media (prefers-reduced-motion: reduce)"), "reduced motion skips flight");
assert(flySrc.includes("paywallFlyFade"), "reduced motion may fade the static frame");
assert(flySrc.includes("paywall-fly-bird--reduce"), "JS reduced-motion path skips the arc");
assert(flySrc.includes("{!reduce && ("), "reduced motion drops the wing beat");
assert(!/scaleX\s*\(\s*-1\s*\)/.test(flySrc), "fly-away must not CSS-mirror the right-facing Cenzontle");
assert(!/rotateY\s*\(\s*180/.test(flySrc), "fly-away must not rotateY the right-facing mark");
assert(!/780ms|cenzontle-courier|story0Courier|WinPerch|WinBounce|CUBETAS_/.test(flySrc), "paywall does not replay Cubetas / perch beats");
assert(!/confetti|coach-strip|coach jump/i.test(flySrc), "no confetti / coach crowd on the bird");
assert(!/flap-then-perch|paywall-fly-perch/i.test(flySrc + helperSrc), "flap-then-perch stay killed");

assert(appSrc.includes("from \"./PaywallFlyAway.jsx\""), "App imports paywall fly-away");
assert(appSrc.includes("CenzontleFlyAway"), "App imports the shared fly-away");
assert(/<PaywallFlyAway\s*\/>/.test(paywallLayout), "paywall mounts fly-away on the existing bird surface");
assert(!/<LogoMark size=\{44\} data-testid="soft-paywall-cenzontle"/.test(paywallLayout), "static LogoMark is off the gate");
assert((paywallLayout.match(/<PaywallFlyAway/g) || []).length === 1, "one fly-away only");
assert((paywallLayout.match(/<LogoMark/g) || []).length === 0, "no second perched mark on the modal");
assert(!/Enroll|enroll|\$99/.test(paywallLayout), "fly-away does not open Enroll / second $99");
const doneSlice = appSrc.slice(appSrc.indexOf("{/* ---------- DONE ---------- */}"), appSrc.indexOf("{/* ---------- FIRST-SESSION DOCTORA CLOSE"));
assert(doneSlice.includes("<CenzontleFlyAway"), "free win mounts the shared fly-away");
assert(doneSlice.includes('surface="win"'), "free win uses the win surface of the same motion");
assert(doneSlice.includes("onComplete={completeCenzontleBeat}"), "free win fly-away still emits cenzontle_complete");
assert(!doneSlice.includes("<Story0Beat"), "free win does not mount Cubetas flap-then-perch");
assert(!/winBounce && \(shouldPlayStory0Beat/.test(doneSlice), "free win is not the old beat-then-perch gate");
assert(doneSlice.includes("<WinPerch"), "later Lectura still has static WinPerch");
assert(!/setSoftPaywall\(true\)/.test(doneSlice), "done screen does not open enroll chrome");
assert(!/Enroll|enroll|\$99/.test(doneSlice), "free win fly-away does not open Enroll / second $99");
assert(flySrc.includes("export function CenzontleFlyAway"), "one shared fly-away component");
assert(flySrc.includes('surface = "paywall"'), "paywall is the default surface");
assert(flySrc.includes("<CenzontleFlyAway surface=\"paywall\" />") || flySrc.includes("<CenzontleFlyAway surface=\"paywall\"/>"), "PaywallFlyAway is the paywall mount of the shared motion");
assert(/<Btn data-testid="soft-paywall-annual"/.test(paywallLayout), "loud annual stays the filled Btn");
assert(/<button type="button" data-testid="soft-paywall-dismiss"/.test(paywallLayout), "quiet Continue free stays text");

console.log("ok: Cenzontle paywall fly-away — wing beat + leave frame; soft chrome parked.");
