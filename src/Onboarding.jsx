import { ONBOARDING_GOALS, ONBOARDING_LEVELS, ONBOARDING_PAINT } from "./onboarding.js";
import { onboardingCopy, onboardingLine } from "./onboardingCopy.js";

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

export default function Onboarding({ lang, theme = "light", step, level, goal, onLevel, onGoal, onStart }) {
  const paint = theme === "dark" ? ONBOARDING_PAINT.dark : ONBOARDING_PAINT.light;
  const title = step === "goal"
    ? onboardingLine(onboardingCopy.goalTitle, lang)
    : step === "plan"
      ? onboardingLine(onboardingCopy.planTitle, lang)
      : onboardingLine(onboardingCopy.levelTitle, lang);
  const levelSlot = onboardingCopy.levels[level];
  const goalSlot = onboardingCopy.goals[goal];

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
      <h1 data-testid="onboarding-title" style={{ fontWeight: 900, fontSize: 26, lineHeight: 1.15, margin: "4px 0 14px" }}>{title}</h1>
      {step === "plan" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div data-testid="onboarding-plan-level" style={{ background: paint.card, border: `2px solid ${paint.accent}`, borderRadius: 16, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em", lineHeight: 1.2 }}>{onboardingLine(onboardingCopy.planLevel, lang)}</div>
            <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.25, marginTop: 2 }}>{onboardingLine(levelSlot?.name, lang)}</div>
          </div>
          <div data-testid="onboarding-plan-goal" style={{ background: paint.card, border: `2px solid ${paint.accent}`, borderRadius: 16, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em", lineHeight: 1.2 }}>{onboardingLine(onboardingCopy.planGoal, lang)}</div>
            <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.25, marginTop: 2 }}>{onboardingLine(goalSlot, lang)}</div>
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
              fontSize: 16,
              letterSpacing: "normal",
              textTransform: "none",
              borderRadius: 14,
              padding: "13px 16px",
              cursor: "pointer",
              background: paint.button,
              color: paint.buttonInk,
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
            <button key={count} type="button" data-testid={`onboarding-goal-${count}`} onClick={() => onGoal(count)} style={cardStyle(paint)}>
              <div style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.25 }}>{onboardingLine(onboardingCopy.goals[count], lang)}</div>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {ONBOARDING_LEVELS.map((id) => (
            <button key={id} type="button" data-testid={`onboarding-level-${id}`} onClick={() => onLevel(id)} style={cardStyle(paint)}>
              <div style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.2 }}>{onboardingLine(onboardingCopy.levels[id].name, lang)}</div>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3, marginTop: 3 }}>{onboardingLine(onboardingCopy.levels[id].desc, lang)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
