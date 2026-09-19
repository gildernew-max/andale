import React from "react";
import {
  PAYWALL_FLY_EASE,
  PAYWALL_FLY_MS,
  PAYWALL_FLY_SRC,
  PAYWALL_REDUCE_FADE_MS,
  PAYWALL_WING_MS,
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

/** One Cenzontle: wing beat + soft arc up-and-out, leaves the frame. No perch. Soft chrome parked. */
export function PaywallFlyAway() {
  const reduce = prefersReducedMotion();
  const src = markSrc();

  return (
    <div
      data-testid="soft-paywall-cenzontle-stage"
      data-reduced-motion={reduce ? "1" : "0"}
      aria-hidden="true"
      className="paywall-fly-stage"
    >
      <style>{`
        .paywall-fly-stage {
          position: relative;
          height: 44px;
          margin: 0 auto;
          pointer-events: none;
          overflow: visible;
        }
        .paywall-fly-bird {
          position: absolute;
          left: 50%;
          top: 0;
          width: 44px;
          height: 44px;
          transform: translate(-50%, 0) rotate(4deg);
          transform-origin: 50% 50%;
          animation: paywallFlyAway ${PAYWALL_FLY_MS}ms ${PAYWALL_FLY_EASE} both;
        }
        .paywall-fly-bird-img {
          display: block;
          width: 44px;
          height: 44px;
          object-fit: contain;
        }
        .paywall-fly-wing {
          position: absolute;
          left: 16%;
          top: 36%;
          width: 16px;
          height: 11px;
          transform-origin: 12% 35%;
          animation: paywallWingBeat ${PAYWALL_WING_MS}ms ${PAYWALL_FLY_EASE} infinite;
        }
        .paywall-fly-bird--reduce {
          animation: paywallFlyFade ${PAYWALL_REDUCE_FADE_MS}ms ease-out both;
        }
        @keyframes paywallFlyAway {
          0% { transform: translate(-50%, 0) rotate(4deg); opacity: 1; }
          30% { transform: translate(calc(-50% + 40px), -36px) rotate(-8deg); opacity: 1; }
          62% { transform: translate(calc(-50% + 140px), -88px) rotate(-14deg); opacity: 1; }
          100% { transform: translate(calc(-50% + 260px), -40px) rotate(-10deg); opacity: 0; }
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
      <div
        className={reduce ? "paywall-fly-bird paywall-fly-bird--reduce" : "paywall-fly-bird"}
        data-testid="soft-paywall-cenzontle-layer"
      >
        <img
          data-testid="soft-paywall-cenzontle"
          src={src}
          alt=""
          width={44}
          height={44}
          className="paywall-fly-bird-img"
        />
        {!reduce && (
          <svg data-testid="soft-paywall-cenzontle-wing" className="paywall-fly-wing" viewBox="0 0 52 34" aria-hidden="true">
            <polygon points="6,8 46,2 50,16 38,28 8,22" fill="#1B2A4A" />
            <polygon points="10,12 42,8 44,16 16,20" fill="#F4EDE0" />
            <polygon points="12,18 40,16 34,26 14,24" fill="#C45C48" />
          </svg>
        )}
      </div>
    </div>
  );
}
