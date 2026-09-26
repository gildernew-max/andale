import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  FLY_AWAY_CLEAR_AT,
  FLY_AWAY_EXIT_VW,
  PAYWALL_FLY_EASE,
  PAYWALL_FLY_MS,
  PAYWALL_FLY_SIZE,
  PAYWALL_FLY_SRC,
  PAYWALL_REDUCE_FADE_MS,
  PAYWALL_WING_MS,
  WIN_FLY_SIZE,
  flyAwayClearsViewport,
  flyAwayExitLeft,
  flyAwayExitTranslate,
  flyAwayFadesOnlyAfterExit,
  flyAwayHoldsOpaqueThroughExit,
  flyAwayMotionCss,
  flyAwayMotionFrames,
  flyAwaySurface,
} from "./paywallFlyAway.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const here = dirname(fileURLToPath(import.meta.url));
const flySrc = readFileSync(join(here, "PaywallFlyAway.jsx"), "utf8");
const helperSrc = readFileSync(join(here, "paywallFlyAway.js"), "utf8");
const appSrc = readFileSync(join(here, "App.jsx"), "utf8");
const paywallLayout = appSrc.slice(appSrc.indexOf('data-testid="soft-paywall"'), appSrc.indexOf("A2HS:"));

assert(PAYWALL_FLY_MS >= 700 && PAYWALL_FLY_MS <= 1100, "fly-away total is 700–1100ms to clear the frame");
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
assert(helperSrc.includes("Soft chrome enroll parked"), "helper documents soft chrome enroll parked");
assert(helperSrc.includes("fully off-screen before fade"), "helper locks Brand CLEAR exit-frame");
assert(helperSrc.includes("free story-win"), "helper documents the free CONTINUAR surface");
assert(flyAwaySurface("win").clipTestId === "win-fly-away-clip", "free win clip is testable");
assert(flyAwaySurface("paywall").clipTestId === "soft-paywall-cenzontle-clip", "paywall clip is testable");

assert(flySrc.includes("PAYWALL_FLY_MS"), "overlay reads the 700–1100ms lock");
assert(flySrc.includes("PAYWALL_WING_MS"), "overlay reads the wing-beat lock");
assert(flySrc.includes("PAYWALL_FLY_SRC"), "overlay reads the live mark path");
assert(flySrc.includes("data-testid={ids.birdTestId}"), "bird img reads the surface test id");
assert(flySrc.includes("data-testid={ids.wingTestId}"), "wing layer is testable");
assert(flySrc.includes("data-testid={ids.stageTestId}"), "stage is testable");
assert(helperSrc.includes("soft-paywall-cenzontle"), "paywall bird test id stays on the helper");
assert(helperSrc.includes("win-fly-away-bird"), "free win bird test id stays on the helper");
assert(flySrc.includes("@keyframes paywallFlyAway"), "motion path is an authored fly-away");
assert(flySrc.includes("flyAwayMotionCss(size)"), "keyframes come from the shared exit-after-clear helper");
assert(flySrc.includes("paywall-fly-clip"), "flight sits in a viewport clip so 100vw cannot open page scroll");
assert(flySrc.includes("position: fixed"), "clip is viewport-sized");
assert(flySrc.includes("overflow: hidden"), "clip hides the transformed box past the edge");
assert(flySrc.includes("setGone(true)"), "bird unmounts once off-screen — no leftover fill-mode box");
assert(!/overflow:\s*visible/.test(flySrc), "flight no longer uses overflow visible on the exit path");
assert(FLY_AWAY_EXIT_VW === 100, "exit travel is 100vw, not a 260px on-screen die");
assert(FLY_AWAY_CLEAR_AT >= 70 && FLY_AWAY_CLEAR_AT < 100, "clear keyframe is before the fade tail");
assert(flyAwayExitTranslate(WIN_FLY_SIZE) === `calc(-50% + ${FLY_AWAY_EXIT_VW}vw + ${WIN_FLY_SIZE}px)`, "win exit includes bird width past 100vw");
assert(flyAwayExitTranslate(PAYWALL_FLY_SIZE) === `calc(-50% + ${FLY_AWAY_EXIT_VW}vw + ${PAYWALL_FLY_SIZE}px)`, "paywall exit includes bird width past 100vw");
assert(flySrc.includes("opacity: 0"), "reduced-motion fade still exists — flight path fades only after exit");

// Varys FAIL: 260px from a 640 center leaves a 168px bird at right=984 on 1280 (~296px inside).
const varysLeft = 640 - WIN_FLY_SIZE / 2 + 260;
assert(varysLeft + WIN_FLY_SIZE < 1280, "document the live 260px miss: bird still on-screen");
assert(1280 - (varysLeft + WIN_FLY_SIZE) >= 280, "document ~290px inside the right edge");

const viewports = [
  { parentCenterX: 195, viewportWidth: 390, size: WIN_FLY_SIZE },
  { parentCenterX: 384, viewportWidth: 768, size: WIN_FLY_SIZE },
  { parentCenterX: 640, viewportWidth: 1280, size: WIN_FLY_SIZE },
  { parentCenterX: 640, viewportWidth: 1280, size: PAYWALL_FLY_SIZE },
  { parentCenterX: 960, viewportWidth: 1920, size: WIN_FLY_SIZE },
];
for (const box of viewports) {
  assert(flyAwayClearsViewport(box), `exit left ${flyAwayExitLeft(box)} must clear ${box.viewportWidth} (size ${box.size})`);
}

const winFrames = flyAwayMotionFrames(WIN_FLY_SIZE);
const payFrames = flyAwayMotionFrames(PAYWALL_FLY_SIZE);
assert(flyAwayHoldsOpaqueThroughExit(winFrames, WIN_FLY_SIZE), "win path stays opaque through the off-screen frame");
assert(flyAwayFadesOnlyAfterExit(winFrames, WIN_FLY_SIZE), "win path does not fade while on-screen");
assert(flyAwayHoldsOpaqueThroughExit(payFrames, PAYWALL_FLY_SIZE), "paywall path stays opaque through the off-screen frame");
assert(flyAwayFadesOnlyAfterExit(payFrames, PAYWALL_FLY_SIZE), "paywall path does not fade while on-screen");
assert(winFrames.some((f) => f.at === FLY_AWAY_CLEAR_AT && f.opacity === 1), "clear keyframe is still opaque");
assert(winFrames.find((f) => f.at === 100).opacity === 0, "100% may fade only after the bird is already off");
assert(winFrames.find((f) => f.at === 100).transform.includes(flyAwayExitTranslate(WIN_FLY_SIZE)), "100% transform is already the exit");
assert(!flyAwayMotionCss(WIN_FLY_SIZE).includes("260px"), "shared motion dropped the 260px on-screen die");
assert(!flySrc.includes("260px"), "overlay dropped the 260px on-screen die");
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
assert(!/<PaywallFlyAway/.test(paywallLayout), "paywall does not fly the bird");
assert(/<LogoMark size=\{44\} data-testid="soft-paywall-cenzontle"/.test(paywallLayout), "static Cenzontle is back on the gate");
assert((paywallLayout.match(/<PaywallFlyAway/g) || []).length === 0, "no fly-away on the wall");
assert((paywallLayout.match(/<LogoMark/g) || []).length === 1, "one static bird on the modal");
assert(!/animation|paywall-fly|soft-paywall-cenzontle-wing/.test(paywallLayout), "no animation on the wall");
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

console.log("ok: Cenzontle fly-away — viewport-clear exit before fade; soft chrome parked.");
