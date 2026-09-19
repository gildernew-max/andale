import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PAYWALL_FLY_EASE,
  PAYWALL_FLY_MS,
  PAYWALL_FLY_SRC,
  PAYWALL_REDUCE_FADE_MS,
  PAYWALL_WING_MS,
  flyAwayMotionCss,
  flyAwaySurface,
} from "./paywallFlyAway.js";

function prefersReducedMotion() {
  try {
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  } catch {
    return false;
  }
}

function markSrc() {
  return `${import.meta.env.BASE_URL}${PAYWALL_FLY_SRC}`;
}

/**
 * One Cenzontle: wing beat + soft arc, fully off-screen before fade. No perch.
 * Same motion on paywall and free story-win / CONTINUAR. Soft chrome enroll parked.
 */
export function CenzontleFlyAway({ surface = "paywall", onComplete } = {}) {
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const stageRef = useRef(null);
  const reduce = prefersReducedMotion();
  const src = markSrc();
  const ids = flyAwaySurface(surface);
  const size = ids.size;
  const wingW = Math.round((size * 16) / 44);
  const wingH = Math.round((size * 11) / 44);
  const [origin, setOrigin] = useState(null);
  const [gone, setGone] = useState(false);

  useLayoutEffect(() => {
    if (reduce) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top });
  }, [reduce, size]);

  useEffect(() => {
    const finish = (unmount) => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (unmount) setGone(true);
      onCompleteRef.current?.();
    };
    if (reduce) {
      finish(false);
      return undefined;
    }
    const t = setTimeout(() => finish(true), PAYWALL_FLY_MS);
    return () => clearTimeout(t);
  }, [reduce]);

  const bird = (className, style) => (
    <div className={className} data-testid={ids.layerTestId} style={style}>
      <img
        data-testid={ids.birdTestId}
        src={src}
        alt=""
        width={size}
        height={size}
        className="paywall-fly-bird-img"
      />
      {!reduce && (
        <svg data-testid={ids.wingTestId} className="paywall-fly-wing" viewBox="0 0 52 34" aria-hidden="true">
          <polygon points="6,8 46,2 50,16 38,28 8,22" fill="#1B2A4A" />
          <polygon points="10,12 42,8 44,16 16,20" fill="#F4EDE0" />
          <polygon points="12,18 40,16 34,26 14,24" fill="#C45C48" />
        </svg>
      )}
    </div>
  );

  return (
    <div
      ref={stageRef}
      data-testid={ids.stageTestId}
      data-surface={surface}
      data-reduced-motion={reduce ? "1" : "0"}
      aria-hidden="true"
      className="paywall-fly-stage"
    >
      <style>{`
        .paywall-fly-stage {
          position: relative;
          height: ${size}px;
          margin: 0 auto;
          pointer-events: none;
        }
        .paywall-fly-clip {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 80;
        }
        .paywall-fly-bird {
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          transform: translate(-50%, 0) rotate(4deg);
          transform-origin: 50% 50%;
          animation: paywallFlyAway ${PAYWALL_FLY_MS}ms ${PAYWALL_FLY_EASE} both;
        }
        .paywall-fly-bird-img {
          display: block;
          width: ${size}px;
          height: ${size}px;
          object-fit: contain;
        }
        .paywall-fly-wing {
          position: absolute;
          left: 16%;
          top: 36%;
          width: ${wingW}px;
          height: ${wingH}px;
          transform-origin: 12% 35%;
          animation: paywallWingBeat ${PAYWALL_WING_MS}ms ${PAYWALL_FLY_EASE} infinite;
        }
        .paywall-fly-bird--reduce {
          left: 50%;
          top: 0;
          animation: paywallFlyFade ${PAYWALL_REDUCE_FADE_MS}ms ease-out both;
        }
        @keyframes paywallFlyAway {
          ${flyAwayMotionCss(size)}
        }
        @keyframes paywallWingBeat {
          0% { transform: rotate(-12deg); }
          50% { transform: rotate(10deg); }
          100% { transform: rotate(-12deg); }
        }
        @keyframes paywallFlyFade {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .paywall-fly-bird {
            animation: paywallFlyFade ${PAYWALL_REDUCE_FADE_MS}ms ease-out both;
          }
          .paywall-fly-wing {
            animation: none !important;
            display: none;
          }
        }
      `}</style>
      {!gone && reduce && bird("paywall-fly-bird paywall-fly-bird--reduce")}
      {!gone && !reduce && origin && (
        <div data-testid={ids.clipTestId} className="paywall-fly-clip">
          {bird("paywall-fly-bird", { left: origin.x, top: origin.y })}
        </div>
      )}
    </div>
  );
}

/** Soft-paywall mount of the shared fly-away. Soft chrome enroll parked. */
export function PaywallFlyAway() {
  return <CenzontleFlyAway surface="paywall" />;
}
