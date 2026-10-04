import { describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import {
  installFlowHooks,
  LIVE_KEY,
  seedProgress,
  localToday,
} from "./flowsHarness.jsx";

installFlowHooks();

const oneBeat = (prompt) => ({
  type: "mc",
  prompt,
  choices: ["sí"],
  answer: "sí",
  shuffledChoices: ["sí"],
  _u: "subj1",
  _i: 0,
});

const parkLesson = (prompt) => {
  localStorage.setItem(LIVE_KEY, JSON.stringify({
    screen: "lesson",
    tab: "camino",
    status: "idle",
    qi: 0,
    lessonStats: { right: 0, wrong: 0 },
    session: {
      title: "Subjuntivo presente",
      unitId: "subj1",
      host: "luna",
      review: false,
      questions: [oneBeat(prompt)],
    },
  }));
};

const finishBeat = async (user) => {
  await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
  const choices = document.querySelectorAll(".choice-card");
  expect(choices.length).toBeGreaterThan(0);
  await user.click(choices[0]);
  await user.click(screen.getByTestId("lesson-check"));
  await waitFor(() => expect(screen.getByRole("button", { name: /^Continue$/ })).toBeTruthy());
  await user.click(screen.getByRole("button", { name: /^Continue$/ }));
  await waitFor(() => expect(screen.getByTestId("win-earned-streak")).toBeTruthy());
};

describe("first streak pill scale", () => {
  it("puts the scale class on the streak tile for a 0 to 1 win and keeps it on a repeat render", async () => {
    cleanup();
    seedProgress({ streak: 0, lastDay: null, uiLang: "en", hearts: 5 });
    parkLesson("First win beat");
    const user = userEvent.setup();
    const view = render(<App />);
    await finishBeat(user);
    const pill = screen.getByTestId("win-earned-streak");
    expect(pill.textContent.replace(/\s+/g, " ").trim()).toBe("1-day streak");
    expect(pill.parentElement.classList.contains("pop")).toBe(true);
    expect(pill.parentElement.classList.contains("streak-pop")).toBe(true);
    expect(pill.querySelector(".flame")).toBeTruthy();
    expect(screen.getByTestId("win-earned-xp").parentElement.classList.contains("streak-pop")).toBe(false);
    expect(screen.getByTestId("win-earned-gems").parentElement.classList.contains("streak-pop")).toBe(false);
    expect(pill.parentElement.parentElement.classList.contains("streak-pop")).toBe(false);
    expect(document.querySelectorAll(".streak-pop")).toHaveLength(1);
    expect(document.querySelectorAll(".confetti-bit")).toHaveLength(0);

    view.rerender(<App />);
    const again = screen.getByTestId("win-earned-streak");
    expect(again.parentElement.classList.contains("streak-pop")).toBe(true);
    expect(document.querySelectorAll(".streak-pop")).toHaveLength(1);
    expect(again.textContent.replace(/\s+/g, " ").trim()).toBe("1-day streak");

    const css = [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
    const reduce = css.match(/@media \(prefers-reduced-motion: reduce\) \{[^}]+\}/);
    expect(reduce).toBeTruthy();
    expect(reduce[0]).toContain(".streak-pop");
    expect(css).toContain("@keyframes streakPop");
    expect(css).toContain("animation-duration:.15s, 400ms");
    expect(css).toContain("animation-delay:0ms, 200ms");
    expect(css).toContain("animation-iteration-count:1, 1");
    expect(css).toContain("animation-fill-mode:none, none");
    expect(css).toContain("transform-origin:center");
  });

  it("leaves the scale off when the streak was already at least 1", async () => {
    cleanup();
    seedProgress({ streak: 1, lastDay: localToday(), uiLang: "en", hearts: 5, paywallSeen: true });
    parkLesson("Same-day repeat");
    const user = userEvent.setup();
    render(<App />);
    await finishBeat(user);
    const repeat = screen.getByTestId("win-earned-streak");
    expect(repeat.textContent.replace(/\s+/g, " ").trim()).toBe("1-day streak");
    expect(repeat.parentElement.classList.contains("pop")).toBe(true);
    expect(repeat.parentElement.classList.contains("streak-pop")).toBe(false);
    expect(document.querySelectorAll(".streak-pop")).toHaveLength(0);
    cleanup();

    seedProgress({ streak: 2, lastDay: localToday(), uiLang: "en", hearts: 5, paywallSeen: true });
    parkLesson("Already two");
    render(<App />);
    await finishBeat(user);
    const later = screen.getByTestId("win-earned-streak");
    expect(later.textContent.replace(/\s+/g, " ").trim()).toBe("2-day streak");
    expect(later.parentElement.classList.contains("streak-pop")).toBe(false);
    expect(document.querySelectorAll(".streak-pop")).toHaveLength(0);
  });
});
