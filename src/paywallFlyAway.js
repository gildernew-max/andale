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
/**
 * After the top is clear, drift to the right-edge pose while opacity is still 1.
 * The 100vw slingshot happens off-screen so it cannot pop the bird in one frame.
 */
export const FLY_AWAY_RIGHT_AT = 92;
/** On-screen arc, then one more soft step on the clear frame (8 → 32 → 40vw). */
export const FLY_AWAY_CLEAR_VW = 40;
/**
 * Live win perch, measured in Chrome on the done screen.
 * Sticky bar is 56px (10px pad, brand row, 2px border). Done pad-top 60.
 * Slot min-height 200 centers the 168px stage, so the bird top is 132px.
 * XP/gems (removed on firstDoctora) sit below the perch and do not move it.
 * firstHoy and story-0 share this slot.
 */
export const WIN_HEADER_PX = 56;
export const WIN_PAD_TOP = 60;
export const WIN_PAD_X = 20;
export const WIN_COLUMN_MAX = 480;
export const WIN_SLOT_MIN_H = 200;
export const WIN_FLY_BEATS = ["firstDoctora", "firstHoy", "story-0"];

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

/** Axis-aligned growth of a square rotated about its center, px. */
export function flyAwayRotateOverhang(size, deg) {
  const rad = (Math.abs(deg) * Math.PI) / 180;
  const half = size / 2;
  return half * (Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)) - 1);
}

/**
 * translateY that puts the rotated bird box fully above the viewport.
 * `top` is the bird's layout top (the measured stage top). At least -(top + height).
 */
export function flyAwayExitTranslateY(startTop, size, rotateDeg = 10) {
  const top = Number(startTop) || 0;
  const need = top + size + flyAwayRotateOverhang(size, rotateDeg);
  return -Math.ceil(need - 1e-9);
}

/** Perch origin for a first-win beat. Same slot for firstDoctora, firstHoy, and story-0. */
export function winFlyStart({ viewportWidth, viewportHeight, beat, size = WIN_FLY_SIZE } = {}) {
  const content = Math.min(WIN_COLUMN_MAX, Math.max(0, viewportWidth - WIN_PAD_X * 2));
  const border = content + WIN_PAD_X * 2;
  const doneLeft = Math.max(0, (viewportWidth - border) / 2);
  const x = doneLeft + WIN_PAD_X + content / 2;
  const y = WIN_HEADER_PX + WIN_PAD_TOP + (WIN_SLOT_MIN_H - size) / 2;
  return { x, y, size, beat, viewportWidth, viewportHeight };
}

export function flyAwayMotionFrames(size, startTop = 0) {
  const exit = flyAwayExitTranslate(size);
  const exitY = flyAwayExitTranslateY(startTop, size);
  return [
    { at: 0, xVw: 0, xPx: 0, y: 0, rotate: 4, opacity: 1, transform: "translate(-50%, 0) rotate(4deg)" },
    { at: 28, xVw: 8, xPx: 0, y: -28, rotate: -8, opacity: 1, transform: "translate(calc(-50% + 8vw), -28px) rotate(-8deg)" },
    { at: 52, xVw: 32, xPx: 0, y: -80, rotate: -14, opacity: 1, transform: "translate(calc(-50% + 32vw), -80px) rotate(-14deg)" },
    {
      at: FLY_AWAY_CLEAR_AT,
      xVw: FLY_AWAY_CLEAR_VW,
      xPx: 0,
      y: exitY,
      rotate: -10,
      opacity: 1,
      transform: `translate(calc(-50% + ${FLY_AWAY_CLEAR_VW}vw), ${exitY}px) rotate(-10deg)`,
    },
    {
      at: FLY_AWAY_RIGHT_AT,
      xVw: FLY_AWAY_EXIT_VW,
      xPx: size,
      y: exitY,
      rotate: -10,
      opacity: 1,
      transform: `translate(${exit}, ${exitY}px) rotate(-10deg)`,
    },
    {
      at: 100,
      xVw: FLY_AWAY_EXIT_VW,
      xPx: size,
      y: exitY,
      rotate: -10,
      opacity: 0,
      transform: `translate(${exit}, ${exitY}px) rotate(-10deg)`,
    },
  ];
}

export function flyAwayMotionCss(size, startTop = 0) {
  return flyAwayMotionFrames(size, startTop)
    .map((frame) => `${frame.at}% { transform: ${frame.transform}; opacity: ${frame.opacity}; }`)
    .join("\n          ");
}

/** ease-in-out between keyframes: cubic-bezier(0.42, 0, 0.58, 1). */
export function flyAwaySegmentEase(t) {
  const x1 = 0.42;
  const y1 = 0;
  const x2 = 0.58;
  const y2 = 1;
  const cx = (u) => 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3;
  const cy = (u) => 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3;
  const dx = (u) => 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u ** 2 * (1 - x2);
  let u = t;
  for (let i = 0; i < 12; i++) {
    const denom = dx(u) || 1e-6;
    u = Math.min(1, Math.max(0, u - (cx(u) - t) / denom));
  }
  return cy(u);
}

export function flyAwayBirdBox({ centerX, startTop, size, frame, viewportWidth }) {
  const xExtra = (frame.xVw / 100) * viewportWidth + (frame.xPx || 0);
  const oh = flyAwayRotateOverhang(size, frame.rotate || 0);
  const left = centerX - size / 2 + xExtra - oh;
  const top = startTop + frame.y - oh;
  return {
    left,
    right: left + size + oh * 2,
    top,
    bottom: top + size + oh * 2,
    opacity: frame.opacity,
  };
}

/** Whole box above the top edge, or whole box past the right edge. */
export function flyAwayClearsTopOrRight(box, viewportWidth) {
  return box.bottom <= 0 || box.left >= viewportWidth;
}

export function flyAwayIntersectsViewport(box, viewportWidth, viewportHeight) {
  const visW = Math.max(0, Math.min(box.right, viewportWidth) - Math.max(box.left, 0));
  const visH = Math.max(0, Math.min(box.bottom, viewportHeight) - Math.max(box.top, 0));
  return visW > 0.5 && visH > 0.5;
}

function poseAt(frames, progress) {
  let index = 0;
  for (let i = 0; i < frames.length - 1; i++) {
    if (progress <= frames[i + 1].at / 100 || i === frames.length - 2) {
      index = i;
      break;
    }
  }
  const a = frames[index];
  const b = frames[index + 1];
  const span = b.at - a.at || 1;
  const local = Math.min(1, Math.max(0, (progress - a.at / 100) / (span / 100)));
  const e = flyAwaySegmentEase(local);
  const mix = (from, to) => from + (to - from) * e;
  return {
    xVw: mix(a.xVw, b.xVw),
    xPx: mix(a.xPx || 0, b.xPx || 0),
    y: mix(a.y, b.y),
    rotate: mix(a.rotate, b.rotate),
    opacity: mix(a.opacity, b.opacity),
  };
}

/** 30fps samples of the eased arc. Opacity stays 1 until the box is off-screen. */
export function flyAwayFrameSamples({ centerX, startTop, size, viewportWidth, stepMs = 33, duration = PAYWALL_FLY_MS } = {}) {
  const frames = flyAwayMotionFrames(size, startTop);
  const samples = [];
  for (let ms = 0; ms <= duration; ms += stepMs) {
    const pose = poseAt(frames, ms / duration);
    const box = flyAwayBirdBox({ centerX, startTop, size, frame: pose, viewportWidth });
    samples.push({ ms, box, opacity: pose.opacity });
  }
  return samples;
}

/**
 * The last 30fps frame that still touches the viewport is a sliver, not most of the bird,
 * and an opaque sample is already fully outside before any fade.
 */
export function flyAwayLeavesGradually(args) {
  const { size, viewportWidth, viewportHeight } = args;
  const samples = flyAwayFrameSamples(args);
  let lastOn = null;
  let offWhileOpaque = false;
  for (const sample of samples) {
    const on = flyAwayIntersectsViewport(sample.box, viewportWidth, viewportHeight);
    if (sample.opacity < 0.999 && on) return false;
    if (on) lastOn = sample;
    else if (sample.opacity >= 0.999) offWhileOpaque = true;
  }
  if (!offWhileOpaque || !lastOn) return false;
  const visW = Math.max(0, Math.min(lastOn.box.right, viewportWidth) - Math.max(lastOn.box.left, 0));
  const visH = Math.max(0, Math.min(lastOn.box.bottom, viewportHeight) - Math.max(lastOn.box.top, 0));
  return visW <= size / 2 || visH <= size / 2;
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
