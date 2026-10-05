import { useEffect, useRef, useState } from "react";
import {
  CONTINUE_LABEL,
  ONBOARDING_GOALS,
  ONBOARDING_LEVELS,
  ONBOARDING_PAINT,
  ONBOARDING_SELECT_MS,
  onboardingSelectionHeld,
} from "./onboarding.js";
import { onboardingCopy, onboardingLine } from "./onboardingCopy.js";

/** Splash promise-line look. Copy is the level promise, not splashPromiseLine. */
const levelPromiseStyle = (theme) => ({
  fontWeight: 600,
  fontSize: 16,
  color: theme === "dark" ? "#CDBBA6" : "#6B6258",
  margin: "0 0 12px",
  lineHeight: 1.35,
  maxWidth: "22em",
  textWrap: "balance",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
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

export default function Onboarding({ lang, theme = "light", step, level, goal, onLevel, onGoal, onStart }) {
  const paint = theme === "dark" ? ONBOARDING_PAINT.dark : ONBOARDING_PAINT.light;
  const levelStep = step !== "goal" && step !== "plan";
  const title = step === "goal"
    ? onboardingLine(onboardingCopy.goalTitle, lang)
    : step === "plan"
      ? onboardingLine(onboardingCopy.planTitle, lang)
      : onboardingLine(onboardingCopy.levelTitle, lang);
  const levelSlot = onboardingCopy.levels[level];
  const goalSlot = onboardingCopy.goals[goal];
  const [selectedId, setSelectedId] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    setSelectedId(null);
  }, [step]);

  const choose = (id, fn) => {
    setSelectedId(id);
    if (timer.current) clearTimeout(timer.current);
    if (onboardingSelectionHeld()) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      fn(id);
    }, ONBOARDING_SELECT_MS);
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
        <div style={{ display: "grid", gap: 10 }}>
          <div data-testid="onboarding-plan-level" style={{ background: paint.card, border: `2px solid ${paint.accent}`, borderRadius: 16, padding: "12px 14px", fontSize: 18, fontWeight: 900, lineHeight: 1.3 }}>
            {onboardingLine(onboardingCopy.planLevel, lang)}: {onboardingLine(levelSlot?.name, lang)}
          </div>
          <div data-testid="onboarding-plan-goal" style={{ background: paint.card, border: `2px solid ${paint.accent}`, borderRadius: 16, padding: "12px 14px", fontSize: 18, fontWeight: 900, lineHeight: 1.3 }}>
            {onboardingLine(onboardingCopy.planGoal, lang)}: {onboardingLine(goalSlot, lang)}
          </div>
          <button
            type="button"
            data-testid="onboarding-start"
            onClick={onStart}
            style={{
              marginTop: 6,
              width: "100%",
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              borderRadius: 14,
              padding: "13px 24px",
              cursor: "pointer",
              background: paint.button,
              color: CONTINUE_LABEL,
              border: "none",
              borderBottom: `4px solid ${paint.buttonLip}`,
            }}
          >
            {onboardingLine(onboardingCopy.planStart, lang)}
          </button>
        </div>
      ) : step === "goal" ? (
        <div style={{ display: "grid", gap: 10 }}>
          {ONBOARDING_GOALS.map((count) => (
            <ChoiceCard key={count} paint={paint} testId={`onboarding-goal-${count}`} selected={selectedId === `goal-${count}`} onClick={() => choose(`goal-${count}`, () => onGoal(count))}>
              <span style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.25 }}>{onboardingLine(onboardingCopy.goals[count], lang)}</span>
            </ChoiceCard>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {ONBOARDING_LEVELS.map((id) => (
            <ChoiceCard key={id} paint={paint} testId={`onboarding-level-${id}`} selected={selectedId === id} onClick={() => choose(id, () => onLevel(id))}>
              <span style={{ display: "block", fontWeight: 900, fontSize: 17, lineHeight: 1.2 }}>{onboardingLine(onboardingCopy.levels[id].name, lang)}</span>
              <span style={{ display: "block", fontWeight: 700, fontSize: 14, lineHeight: 1.3, marginTop: 3 }}>{onboardingLine(onboardingCopy.levels[id].desc, lang)}</span>
            </ChoiceCard>
          ))}
        </div>
      )}
    </div>
  );
}
