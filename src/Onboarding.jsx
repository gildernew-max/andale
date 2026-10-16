import { useEffect, useRef, useState } from "react";
import {
  ONBOARDING_CTA_CONTENT_GAP,
  ONBOARDING_GOALS,
  ONBOARDING_LEVELS,
  ONBOARDING_MINUTE_CHIP,
  ONBOARDING_PAINT,
  ONBOARDING_WHYS,
  onboardingCtaBottomCss,
  onboardingCtaClearanceCss,
} from "./onboarding.js";
import { onboardingCopy, onboardingLine, onboardingPlanLine } from "./onboardingCopy.js";

/** A pick shows its check this long, then the screen advances on its own. */
export const ONBOARDING_PICK_DELAY_MS = 150;
/** After a screen appears, taps are ignored this long. A double tap on a card
 *  would otherwise land on the next screen's card (or on Start) and skip it. */
export const ONBOARDING_SETTLE_MS = 350;

/** Level-screen promise under the title. Same type as the splash line
 *  (16px / 600, #6B6258 light, #CDBBA6 dark). The two-line clamp is gone:
 *  below 360px the full EN/ES line may run to three lines.
 */
const levelPromiseStyle = (theme) => ({
  fontWeight: 600,
  fontSize: 16,
  color: theme === "dark" ? "#CDBBA6" : "#6B6258",
  margin: "0 0 12px",
  lineHeight: 1.35,
  maxWidth: "22em",
  textWrap: "balance",
});

/** Card hint lines (level and daily-goal descriptions). */
export const HINT_PX = 15;

const cardStyle = (paint, selected) => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  background: paint.card,
  color: paint.ink,
  border: selected ? `3px solid ${paint.selectedEdge}` : `2px solid ${paint.accent}`,
  borderRadius: 16,
  padding: selected ? "11px 13px" : "12px 14px",
  fontFamily: "inherit",
  cursor: "pointer",
});

function ChoiceCard({ paint, testId, selected, onClick, children }) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-selected={selected ? "true" : undefined}
      onClick={onClick}
      style={cardStyle(paint, selected)}
    >
      <span style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <span style={{ display: "block", minWidth: 0 }}>{children}</span>
        {selected ? (
          <span data-testid="onboarding-check" aria-hidden="true" style={{ fontWeight: 900, fontSize: 18, lineHeight: 1, color: paint.ink }}>✓</span>
        ) : null}
      </span>
    </button>
  );
}

function OnboardingCta({ paint, ready, testId, label, onClick }) {
  const face = ready
    ? { fill: paint.button, ink: paint.buttonInk, lip: paint.buttonLip }
    : { fill: paint.emptyFill, ink: paint.emptyInk, lip: paint.emptyLip };
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={!ready}
      onClick={() => { if (ready) onClick(); }}
      style={{
        position: "fixed",
        bottom: onboardingCtaBottomCss(),
        left: 20,
        right: 20,
        zIndex: 1,
        boxSizing: "border-box",
        fontFamily: "inherit",
        fontWeight: 800,
        fontSize: 15,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        borderRadius: 14,
        padding: "13px 24px",
        cursor: ready ? "pointer" : "default",
        background: face.fill,
        color: face.ink,
        border: "none",
        borderBottom: `4px solid ${face.lip}`,
        opacity: 1,
      }}
    >
      {label}
    </button>
  );
}

export default function Onboarding({ lang, theme = "light", step, goal, onLevel, onWhy, onGoal, onStart }) {
  const paint = theme === "dark" ? ONBOARDING_PAINT.dark : ONBOARDING_PAINT.light;
  const levelStep = step !== "why" && step !== "goal" && step !== "plan";
  const title = step === "why"
    ? onboardingLine(onboardingCopy.whyTitle, lang)
    : step === "goal"
      ? onboardingLine(onboardingCopy.goalTitle, lang)
      : step === "plan"
        ? onboardingLine(onboardingCopy.planTitle, lang)
        : onboardingLine(onboardingCopy.levelTitle, lang);
  const [selectedId, setSelectedId] = useState(null);
  // Both hold a screen id, so a value from the previous screen can never open the next one.
  const [settledStep, setSettledStep] = useState(null);
  const settledRef = useRef(null);
  const pickedRef = useRef(null);
  const pickTimerRef = useRef(null);
  const settled = settledStep === step;

  // One screen, one pick: reset on each screen, and ignore taps until it settles.
  useEffect(() => {
    setSelectedId(null);
    const t = setTimeout(() => { settledRef.current = step; setSettledStep(step); }, ONBOARDING_SETTLE_MS);
    return () => {
      clearTimeout(t);
      clearTimeout(pickTimerRef.current);
    };
  }, [step]);

  const choose = (id) => {
    if (settledRef.current !== step || pickedRef.current === step) return;
    pickedRef.current = step;
    setSelectedId(id);
    pickTimerRef.current = setTimeout(() => {
      if (step === "why") onWhy(id);
      else if (step === "goal") onGoal(id);
      else onLevel(id);
    }, ONBOARDING_PICK_DELAY_MS);
  };
  const start = () => {
    if (settledRef.current !== step) return;
    onStart();
  };

  return (
    <div
      data-testid="onboarding"
      data-step={step}
      data-input-ready={settled ? "true" : "false"}
      data-theme={theme === "dark" ? "dark" : "light"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 45,
        background: paint.page,
        color: paint.ink,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        paddingBottom: step === "plan" ? onboardingCtaClearanceCss() : onboardingCtaBottomCss(),
      }}
    >
      <div
        data-testid="onboarding-scroll"
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          boxSizing: "border-box",
          padding: `76px 20px ${step === "plan" ? ONBOARDING_CTA_CONTENT_GAP : 0}px`,
        }}
      >
        <h1 data-testid="onboarding-title" style={{ fontWeight: 900, fontSize: 26, lineHeight: 1.15, margin: levelStep ? "4px 0 6px" : "4px 0 14px" }}>{title}</h1>
        {levelStep ? (
          <p data-testid="onboarding-promise" style={levelPromiseStyle(theme)}>
            {onboardingLine(onboardingCopy.levelPromise, lang)}
          </p>
        ) : null}
        {step === "plan" ? (
          <div>
            <img
              data-testid="onboarding-plan-bird"
              src={`${import.meta.env.BASE_URL}mascot/cenzontle.png`}
              alt=""
              width={120}
              height={120}
              aria-hidden="true"
              style={{ display: "block", width: 120, height: 120, objectFit: "contain", margin: "8px auto 0" }}
            />
            <p data-testid="onboarding-plan-body" style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.35, margin: "16px 0 0" }}>
              {onboardingPlanLine(lang, goal)}
            </p>
          </div>
        ) : step === "goal" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {ONBOARDING_GOALS.map((count) => (
              <ChoiceCard key={count} paint={paint} testId={`onboarding-goal-${count}`} selected={selectedId === count} onClick={() => choose(count)}>
                <span style={{ display: "block", fontWeight: 900, fontSize: 17, lineHeight: 1.2 }}>{count} {ONBOARDING_MINUTE_CHIP}</span>
                <span style={{ display: "block", fontWeight: 700, fontSize: HINT_PX, lineHeight: 1.3, marginTop: 3 }}>{onboardingLine(onboardingCopy.goals[count], lang)}</span>
              </ChoiceCard>
            ))}
          </div>
        ) : step === "why" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {ONBOARDING_WHYS.map((id) => (
              <ChoiceCard key={id} paint={paint} testId={`onboarding-why-${id}`} selected={selectedId === id} onClick={() => choose(id)}>
                <span style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.25 }}>{onboardingLine(onboardingCopy.whys[id], lang)}</span>
              </ChoiceCard>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {ONBOARDING_LEVELS.map((id) => (
              <ChoiceCard key={id} paint={paint} testId={`onboarding-level-${id}`} selected={selectedId === id} onClick={() => choose(id)}>
                <span style={{ display: "block", fontWeight: 900, fontSize: 17, lineHeight: 1.2 }}>{onboardingLine(onboardingCopy.levels[id].name, lang)}</span>
                <span style={{ display: "block", fontWeight: 700, fontSize: HINT_PX, lineHeight: 1.3, marginTop: 3 }}>{onboardingLine(onboardingCopy.levels[id].desc, lang)}</span>
              </ChoiceCard>
            ))}
          </div>
        )}
      </div>
      {step === "plan" ? (
        <OnboardingCta
          paint={paint}
          ready
          testId="onboarding-start"
          label={onboardingLine(onboardingCopy.planStart, lang)}
          onClick={start}
        />
      ) : null}
    </div>
  );
}
