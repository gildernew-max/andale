import { useEffect, useState } from "react";
import {
  ONBOARDING_CTA_TOP,
  ONBOARDING_GOALS,
  ONBOARDING_LEVELS,
  ONBOARDING_MINUTE_CHIP,
  ONBOARDING_PAINT,
  ONBOARDING_WHYS,
} from "./onboarding.js";
import { onboardingCopy, onboardingLine, onboardingPlanLine } from "./onboardingCopy.js";

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

const cardStyle = (paint) => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  background: paint.card,
  color: paint.ink,
  border: `2px solid ${paint.accent}`,
  borderRadius: 16,
  padding: "12px 14px",
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
      style={cardStyle(paint)}
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
        position: "absolute",
        top: ONBOARDING_CTA_TOP,
        left: 20,
        right: 20,
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

  useEffect(() => {
    setSelectedId(null);
  }, [step]);

  const ready = step === "plan" || selectedId != null;
  const advance = () => {
    if (step === "plan") onStart();
    else if (step === "why") onWhy(selectedId);
    else if (step === "goal") onGoal(selectedId);
    else onLevel(selectedId);
  };

  return (
    <div
      data-testid="onboarding"
      data-step={step}
      data-theme={theme === "dark" ? "dark" : "light"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 45,
        background: paint.page,
        color: paint.ink,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: "76px 20px 24px",
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
            <ChoiceCard key={count} paint={paint} testId={`onboarding-goal-${count}`} selected={selectedId === count} onClick={() => setSelectedId(count)}>
              <span style={{ display: "block", fontWeight: 900, fontSize: 17, lineHeight: 1.2 }}>{count} {ONBOARDING_MINUTE_CHIP}</span>
              <span style={{ display: "block", fontWeight: 700, fontSize: 14, lineHeight: 1.3, marginTop: 3 }}>{onboardingLine(onboardingCopy.goals[count], lang)}</span>
            </ChoiceCard>
          ))}
          <p data-testid="onboarding-goal-note" style={{ ...levelPromiseStyle(theme), margin: "2px 0 0" }}>
            {onboardingLine(onboardingCopy.goalNote, lang)}
          </p>
        </div>
      ) : step === "why" ? (
        <div style={{ display: "grid", gap: 10 }}>
          {ONBOARDING_WHYS.map((id) => (
            <ChoiceCard key={id} paint={paint} testId={`onboarding-why-${id}`} selected={selectedId === id} onClick={() => setSelectedId(id)}>
              <span style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.25 }}>{onboardingLine(onboardingCopy.whys[id], lang)}</span>
            </ChoiceCard>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {ONBOARDING_LEVELS.map((id) => (
            <ChoiceCard key={id} paint={paint} testId={`onboarding-level-${id}`} selected={selectedId === id} onClick={() => setSelectedId(id)}>
              <span style={{ display: "block", fontWeight: 900, fontSize: 17, lineHeight: 1.2 }}>{onboardingLine(onboardingCopy.levels[id].name, lang)}</span>
              <span style={{ display: "block", fontWeight: 700, fontSize: 14, lineHeight: 1.3, marginTop: 3 }}>{onboardingLine(onboardingCopy.levels[id].desc, lang)}</span>
            </ChoiceCard>
          ))}
        </div>
      )}
      <OnboardingCta
        paint={paint}
        ready={ready}
        testId={step === "plan" ? "onboarding-start" : "onboarding-cta"}
        label={step === "plan" ? onboardingLine(onboardingCopy.planStart, lang) : onboardingLine(onboardingCopy.ctaContinue, lang)}
        onClick={advance}
      />
    </div>
  );
}
