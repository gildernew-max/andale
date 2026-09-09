import React, { useEffect, useRef } from "react";
import {
  STORY0_BEAT_MS,
  STORY0_DROP_MS,
  STORY0_EASE_CHIP,
  STORY0_EASE_ENTER,
  STORY0_EASE_EXIT,
  STORY0_ENTER_MS,
  WIN_BOUNCE_MS,
  WIN_BOUNCE_SRC,
} from "./winBounce.js";

function prefersReducedMotion() {
  try {
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  } catch {
    return false;
  }
}

function markSrc() {
  return `${import.meta.env.BASE_URL}${WIN_BOUNCE_SRC}`;
}

function XpChip({ testId }) {
  return (
    <div data-testid={testId} className="cenzontle-chip">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.2 3h11.6L22 9 12 21.5 2 9z" fill="#1CB0F6" />
        <path d="M2 9h20L12 21.5z" fill="#1899D6" />
        <path d="M8.8 3 12 9l3.2-6z" fill="#84D8FF" />
        <path d="M2 9h20l-1.6-2.6H3.6z" fill="#49C0F8" opacity=".7" />
      </svg>
      XP
    </div>
  );
}

const CHIP_CSS = `
  .cenzontle-chip {
    display: flex; align-items: center; gap: 4px;
    background: #fff; border: 2px solid #1CB0F6; border-radius: 12px;
    padding: 4px 8px 4px 6px;
    font-weight: 900; font-size: 12px; color: #FFC800; font-family: inherit;
  }
`;

/** Landed courier + points on the first-win screen. Stays until CONTINUE. */
export function WinPerch() {
  return (
    <div data-testid="win-perch" aria-hidden="true" className="cenzontle-perch">
      <style>{`
        ${CHIP_CSS}
        .cenzontle-perch {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 200px; pointer-events: none;
        }
        .cenzontle-perch-bird {
          display: block; width: 168px; height: 168px; object-fit: contain;
        }
        .cenzontle-perch .cenzontle-chip { margin-top: -8px; }
      `}</style>
      <img
        data-testid="win-perch-bird"
        src={markSrc()}
        alt=""
        width={168}
        height={168}
        className="cenzontle-perch-bird"
      />
      <XpChip testId="win-perch-chip" />
    </div>
  );
}

/** One 720ms on-screen courier. Transform only. Lands in-viewport. Unmounts on complete. */
export function WinBounce({ onComplete }) {
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const reduce = prefersReducedMotion();

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onCompleteRef.current?.();
    };
    if (reduce) {
      finish();
      return undefined;
    }
    const t = setTimeout(finish, WIN_BOUNCE_MS);
    return () => clearTimeout(t);
  }, [reduce]);

  const src = markSrc();

  return (
    <div data-testid="win-bounce" aria-hidden="true" className="cenzontle-bounce">
      <style>{`
        ${CHIP_CSS}
        .cenzontle-bounce { position: fixed; inset: 0; pointer-events: none; z-index: 80; overflow: visible; }
        .cenzontle-bird {
          position: absolute; left: 50%; top: 22%; width: 168px; height: 168px;
          transform: translate(-50%, -50%) rotate(4deg);
          transform-origin: 50% 50%;
          animation: cenzontle-courier 720ms cubic-bezier(.22,.75,.25,1) both;
        }
        .cenzontle-bird-img {
          display: block; width: 168px; height: 168px; object-fit: contain;
        }
        .cenzontle-wing {
          position: absolute; left: 18%; top: 38%; width: 52px; height: 34px;
          transform-origin: 12% 35%;
          animation: cenzontle-wing 300ms ease-out both;
        }
        .cenzontle-chip-track {
          position: absolute; left: 50%; top: 22%;
          transform: translate(-50%, 78px);
          opacity: 1;
          animation: cenzontle-chip-fall 160ms cubic-bezier(.35,.05,.7,.45) 200ms both;
        }
        .cenzontle-chip-track .cenzontle-chip {
          animation: cenzontle-chip-hit 90ms cubic-bezier(.2,.8,.3,1) 340ms both;
        }
        .cenzontle-spark {
          position: absolute; left: 50%; top: 36%; width: 8px; height: 8px;
          border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, #FFC800 0%, #1CB0F6 55%, transparent 70%);
          transform: translate(-50%, -50%) scale(.4);
          opacity: 0;
          animation: cenzontle-spark 160ms ease-out 340ms both;
        }
        /* Transform-only. Every keyframe stays inside the viewport. Resting CSS is the land. */
        @keyframes cenzontle-courier {
          0% { transform: translate(28vw, -50%) rotate(-12deg); opacity: 1; }
          30.555% { transform: translate(-50%, -50%) rotate(4deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(4deg); opacity: 1; }
        }
        @keyframes cenzontle-wing {
          0% { transform: rotate(-20deg); }
          55% { transform: rotate(15deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes cenzontle-chip-fall {
          from { transform: translate(-50%, 8px); opacity: 1; }
          to { transform: translate(-50%, 78px); opacity: 1; }
        }
        @keyframes cenzontle-chip-hit {
          0% { transform: scale(.9); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes cenzontle-spark {
          0% { transform: translate(-50%, -50%) scale(.4); opacity: .9; }
          100% { transform: translate(-50%, -50%) scale(1.15); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cenzontle-bird, .cenzontle-wing, .cenzontle-chip-track, .cenzontle-chip-track .cenzontle-chip, .cenzontle-spark {
            animation: none !important;
          }
          .cenzontle-bird { transform: translate(-50%, -50%) rotate(4deg); opacity: 1; }
          .cenzontle-chip-track { transform: translate(-50%, 78px); opacity: 1; }
        }
      `}</style>
      <div className="cenzontle-bird" data-testid="win-bounce-bird-layer">
        <img
          data-testid="win-bounce-bird"
          src={src}
          alt=""
          width={168}
          height={168}
          className="cenzontle-bird-img"
        />
        <svg data-testid="win-bounce-wing" className="cenzontle-wing" viewBox="0 0 52 34" aria-hidden="true">
          <polygon points="6,8 46,2 50,16 38,28 8,22" fill="#1B2A4A" />
          <polygon points="10,12 42,8 44,16 16,20" fill="#F4EDE0" />
          <polygon points="12,18 40,16 34,26 14,24" fill="#C45C48" />
        </svg>
      </div>
      <div className="cenzontle-chip-track">
        <XpChip testId="win-bounce-chip" />
      </div>
      <span data-testid="win-bounce-spark" className="cenzontle-spark" />
    </div>
  );
}

/** Story-0 only. Cubetas v2 780ms grab-arc in the perch slot. Chip + words stay; bird exits. Then WinPerch. */
export function Story0Beat({ onComplete }) {
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const reduce = prefersReducedMotion();

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onCompleteRef.current?.();
    };
    if (reduce) {
      finish();
      return undefined;
    }
    const t = setTimeout(finish, STORY0_BEAT_MS);
    return () => clearTimeout(t);
  }, [reduce]);

  const src = markSrc();

  return (
    <div data-testid="story-0-beat" aria-hidden="true" className="story0-beat">
      <style>{`
        ${CHIP_CSS}
        .story0-beat {
          position: relative; z-index: 80; overflow: visible; pointer-events: none;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 200px;
        }
        .story0-bird {
          position: relative; width: 168px; height: 168px;
          transform: translate(160px, 8px) rotate(-10deg);
          transform-origin: 50% 50%;
          animation: story0Courier ${STORY0_BEAT_MS}ms ${STORY0_EASE_ENTER} both;
        }
        .story0-bird-img {
          display: block; width: 168px; height: 168px; object-fit: contain;
        }
        .story0-wing {
          position: absolute; left: 18%; top: 38%; width: 52px; height: 34px;
          transform-origin: 12% 35%;
          animation: story0Wing ${STORY0_ENTER_MS}ms ease-out both;
        }
        .story0-chip-track {
          margin-top: -8px;
          transform: translateY(-48px);
          opacity: 1;
          animation: story0ChipFall ${STORY0_DROP_MS}ms ${STORY0_EASE_CHIP} ${STORY0_ENTER_MS}ms both;
        }
        .story0-chip-track .cenzontle-chip {
          animation: story0ChipHit 90ms cubic-bezier(.2,.8,.3,1) ${STORY0_ENTER_MS + STORY0_DROP_MS}ms both;
        }
        @keyframes story0Courier {
          0% { transform: translate(160px, 8px) rotate(-10deg); opacity: 1; animation-timing-function: ${STORY0_EASE_ENTER}; }
          10.256% { transform: translate(72px, -28px) rotate(-2deg); opacity: 1; animation-timing-function: ${STORY0_EASE_ENTER}; }
          20.513% { transform: translate(0, 0) rotate(4deg); opacity: 1; animation-timing-function: linear; }
          38.462% { transform: translate(0, 0) rotate(4deg); opacity: 1; animation-timing-function: ease-out; }
          53.846% { transform: translate(0, 0) rotate(0deg); opacity: 1; animation-timing-function: ${STORY0_EASE_EXIT}; }
          76.923% { transform: translate(-118px, -158px) rotate(-16deg); opacity: 1; animation-timing-function: ${STORY0_EASE_EXIT}; }
          100% { transform: translate(-240px, -72px) rotate(-18deg); opacity: 0; }
        }
        @keyframes story0Wing {
          0% { transform: rotate(-20deg); }
          55% { transform: rotate(15deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes story0ChipFall {
          from { transform: translateY(-48px); opacity: 1; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes story0ChipHit {
          0% { transform: scale(.9); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .story0-bird, .story0-wing, .story0-chip-track, .story0-chip-track .cenzontle-chip {
            animation: none !important;
          }
          .story0-bird { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          .story0-chip-track { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="story0-bird" data-testid="story-0-beat-bird-layer">
        <img
          data-testid="story-0-beat-bird"
          src={src}
          alt=""
          width={168}
          height={168}
          className="story0-bird-img"
        />
        <svg data-testid="story-0-beat-wing" className="story0-wing" viewBox="0 0 52 34" aria-hidden="true">
          <polygon points="6,8 46,2 50,16 38,28 8,22" fill="#1B2A4A" />
          <polygon points="10,12 42,8 44,16 16,20" fill="#F4EDE0" />
          <polygon points="12,18 40,16 34,26 14,24" fill="#C45C48" />
        </svg>
      </div>
      <div className="story0-chip-track">
        <XpChip testId="story-0-beat-chip" />
      </div>
    </div>
  );
}
