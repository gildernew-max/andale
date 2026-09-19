/** Cenzontle fly-away. Brand CLEAR 2026-09-19 (exit-frame): fully off-screen before fade. Soft chrome enroll parked. Shared by paywall + free story-win / CONTINUAR. */

export const PAYWALL_FLY_MS = 900;
export const PAYWALL_WING_MS = 200;
export const PAYWALL_REDUCE_FADE_MS = 220;
export const PAYWALL_FLY_SRC = "mascot/cenzontle.png";
export const PAYWALL_FLY_EASE = "ease-in-out";
export const PAYWALL_FLY_SIZE = 44;
export const WIN_FLY_SIZE = 168;
/** Viewport-relative exit. 260px died ~290px inside a 1280 desktop (Varys FAIL). */
export const FLY_AWAY_EXIT_VW = 100;
/** First keyframe that is already fully off-screen. Fade may start only after this. */
export const FLY_AWAY_CLEAR_AT = 78;

export function flyAwaySurface(surface) {
  if (surface === "win") {
    return {
      stageTestId: "win-fly-away",
      clipTestId: "win-fly-away-clip",
      layerTestId: "win-fly-away-layer",
      birdTestId: "win-fly-away-bird",
      wingTestId: "win-fly-away-wing",
      size: WIN_FLY_SIZE,
    };
  }
  return {
    stageTestId: "soft-paywall-cenzontle-stage",
    clipTestId: "soft-paywall-cenzontle-clip",
    layerTestId: "soft-paywall-cenzontle-layer",
    birdTestId: "soft-paywall-cenzontle",
    wingTestId: "soft-paywall-cenzontle-wing",
    size: PAYWALL_FLY_SIZE,
  };
}

/** `left: 50%` then this translate: -50% (self-center) + 100vw + bird size so the left edge clears the viewport. */
export function flyAwayExitTranslate(size) {
  return `calc(-50% + ${FLY_AWAY_EXIT_VW}vw + ${size}px)`;
}

/**
 * Final left edge after the exit translate, viewport px.
 * Stage `left: 50%` puts the bird's left at parentCenterX; translate adds -size/2 + 100vw + size.
 */
export function flyAwayExitLeft({ parentCenterX, viewportWidth, size }) {
  return parentCenterX - size / 2 + (FLY_AWAY_EXIT_VW / 100) * viewportWidth + size;
}

/** True when the whole bird is past the right edge (left >= viewport). */
export function flyAwayClearsViewport(box) {
  return flyAwayExitLeft(box) >= box.viewportWidth;
}

export function flyAwayMotionFrames(size) {
  const exit = flyAwayExitTranslate(size);
  return [
    { at: 0, transform: "translate(-50%, 0) rotate(4deg)", opacity: 1 },
    { at: 28, transform: "translate(calc(-50% + 8vw), -28px) rotate(-8deg)", opacity: 1 },
    { at: 52, transform: "translate(calc(-50% + 32vw), -80px) rotate(-14deg)", opacity: 1 },
    { at: FLY_AWAY_CLEAR_AT, transform: `translate(${exit}, -40px) rotate(-10deg)`, opacity: 1 },
    { at: 100, transform: `translate(${exit}, -40px) rotate(-10deg)`, opacity: 0 },
  ];
}

export function flyAwayMotionCss(size) {
  return flyAwayMotionFrames(size)
    .map((frame) => `${frame.at}% { transform: ${frame.transform}; opacity: ${frame.opacity}; }`)
    .join("\n          ");
}

/** Opacity may drop only on frames whose transform is already the exit (off-screen). */
export function flyAwayFadesOnlyAfterExit(frames, size) {
  const exit = flyAwayExitTranslate(size);
  const faded = frames.filter((frame) => frame.opacity < 1);
  return faded.length > 0 && faded.every((frame) => frame.transform.includes(exit));
}

/** At least one opaque frame already sits on the exit transform — no mid-arc fade. */
export function flyAwayHoldsOpaqueThroughExit(frames, size) {
  const exit = flyAwayExitTranslate(size);
  return frames.some((frame) => frame.opacity === 1 && frame.transform.includes(exit));
}
