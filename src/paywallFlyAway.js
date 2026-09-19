/** Cenzontle fly-away. Brand CLEAR 2026-09-19: wing beat + leave frame. Soft chrome parked. Shared by paywall + free story-win / CONTINUAR. */

export const PAYWALL_FLY_MS = 800;
export const PAYWALL_WING_MS = 200;
export const PAYWALL_REDUCE_FADE_MS = 220;
export const PAYWALL_FLY_SRC = "mascot/cenzontle.png";
export const PAYWALL_FLY_EASE = "ease-in-out";
export const PAYWALL_FLY_SIZE = 44;
export const WIN_FLY_SIZE = 168;

export function flyAwaySurface(surface) {
  if (surface === "win") {
    return {
      stageTestId: "win-fly-away",
      layerTestId: "win-fly-away-layer",
      birdTestId: "win-fly-away-bird",
      wingTestId: "win-fly-away-wing",
      size: WIN_FLY_SIZE,
    };
  }
  return {
    stageTestId: "soft-paywall-cenzontle-stage",
    layerTestId: "soft-paywall-cenzontle-layer",
    birdTestId: "soft-paywall-cenzontle",
    wingTestId: "soft-paywall-cenzontle-wing",
    size: PAYWALL_FLY_SIZE,
  };
}
