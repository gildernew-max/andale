import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { prevDayKey } from "./firstDoor.js";
import { forgetFirstStreakReturnLive } from "./firstStreakReturn.js";
import { installFlowHooks, seedProgress, boot, localToday, startHoyFromHub, STORAGE_KEY, LIVE_KEY } from "./flowsHarness.jsx";

installFlowHooks();

afterEach(() => {
  forgetFirstStreakReturnLive();
});

const day2 = (extra = {}) => {
  const today = localToday();
  seedProgress({
    uiLang: "en",
    theme: "light",
    onboardingDone: true,
    firstSessionDone: true,
    paywallSeen: true,
    bajioUnlockSeen: true,
    lecturaHandoffSeen: true,
    streak: 1,
    lastDay: prevDayKey(today),
    hearts: 5,
    ...extra,
  });
};

describe("day-2 first streak return card", () => {
  it("shows the next free story after a day-1 claim and opens it", async () => {
    day2({ stories: { "story-0": true }, lecturaOpenId: "story-0" });
    const user = await boot();
    const card = await screen.findByTestId("first-streak-return");
    expect(card.getAttribute("data-mode")).toBe("next");
    expect(screen.getByTestId("first-streak-headline").textContent).toBe("2 days in a row.");
    expect(screen.getByTestId("first-streak-line").textContent).toBe("Your next story is ready: La casa azul.");
    const title = screen.getByTestId("first-streak-title");
    expect(title.textContent).toBe("La casa azul");
    expect(title.style.whiteSpace).toBe("nowrap");
    expect(screen.getByTestId("first-streak-continue").textContent).toBe("Start reading");
    expect(screen.getByTestId("first-streak-bird").getAttribute("width")).toBe("96");
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBeNull();
    expect(screen.getByTestId("hub-hoy").style.border).toMatch(/#E5E5E5|rgb\(\s*229,\s*229,\s*229\s*\)/i);
    expect(screen.getByTestId("hub-hoy").style.border).not.toMatch(/58CC02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^2/);
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toContain("Streak: 2 days.");
    expect(screen.getByTestId("streak-home-note").textContent).toBe("Your 2-day streak ends tonight. Do one lesson to keep it.");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(1);
    expect(card.style.borderRadius).toBe(screen.getByTestId("hub-hoy").style.borderRadius);
    const tileBorder = screen.getByTestId("hub-stories").style.border;
    expect(card.style.borderTop).toBe(tileBorder);
    expect(card.style.borderRight).toBe(tileBorder);
    expect(card.style.borderBottom).toBe(tileBorder);
    expect(card.style.borderLeft).toBe(tileBorder);
    expect(card.style.borderRadius).toBe("18px");
    await waitFor(() => expect((window.__andaleFunnelLog || []).filter((event) => event.event === "first_streak_seen")).toHaveLength(1));
    expect(Object.keys((window.__andaleFunnelLog || []).find((event) => event.event === "first_streak_seen")).sort()).toEqual(["at", "event"]);

    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("first-streak-headline").textContent).toBe("2 días seguidos."));
    expect(screen.getByTestId("first-streak-line").textContent).toBe("Tu siguiente cuento está listo: La casa azul.");
    expect(screen.getByTestId("first-streak-title").textContent).toBe("La casa azul");
    expect(screen.getByTestId("first-streak-title").style.whiteSpace).toBe("nowrap");
    expect(screen.getByTestId("first-streak-continue").textContent).toBe("Empieza a leer");
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^2/);
    expect(screen.getByTestId("hub-hoy-quiet").textContent).toContain("Racha: 2 días.");
    expect(screen.getByTestId("streak-home-note").textContent).toBe("Tu racha de 2 días termina esta noche. Haz una lección para mantenerla.");
    expect((window.__andaleFunnelLog || []).filter((event) => event.event === "first_streak_seen")).toHaveLength(1);

    await user.click(screen.getByTestId("nav-perfil"));
    await user.click(screen.getByRole("button", { name: /Oscuro/ }));
    await user.click(screen.getByTestId("nav-camino"));
    const darkCard = await screen.findByTestId("first-streak-return");
    expect(darkCard.style.borderRadius).toBe("14px");
    expect(darkCard.style.borderTop).toBe("");
    expect(darkCard.style.borderRight).toBe("");
    expect(darkCard.style.borderBottom).toBe("");
    expect(darkCard.style.borderLeft).toBe("");
    expect(screen.getByTestId("hub-hoy").style.borderRadius).toBe("18px");

    await user.click(screen.getByTestId("first-streak-continue"));
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-1");
    expect(screen.queryByTestId("first-streak-return")).toBeNull();
    expect(JSON.parse(localStorage.getItem("andale-first-streak-return")).dismissed).toBe(true);

    cleanup();
    forgetFirstStreakReturnLive();
    localStorage.removeItem(LIVE_KEY);
    delete window.__andaleFunnelLog;
    await boot();
    expect(screen.queryByTestId("first-streak-return")).toBeNull();
    expect((window.__andaleFunnelLog || []).filter((event) => event.event === "first_streak_seen")).toHaveLength(0);
  });

  it("uses the halfway line when the open story is not claimed yet", async () => {
    day2({ lecturaOpenId: "story-0", lecturaStartedAt: 1 });
    const user = await boot();
    const card = await screen.findByTestId("first-streak-return");
    expect(card.getAttribute("data-mode")).toBe("halfway");
    expect(screen.getByTestId("first-streak-line").textContent).toBe("La noche en que vuelven is waiting where you left it.");
    expect(screen.getByTestId("first-streak-continue").textContent).toBe("Keep reading");
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("first-streak-line").textContent).toBe("La noche en que vuelven te espera donde lo dejaste."));
    expect(screen.getByTestId("first-streak-continue").textContent).toBe("Sigue leyendo");
    await user.click(screen.getByTestId("first-streak-continue"));
    expect((await screen.findByTestId("story-reader")).getAttribute("data-story-id")).toBe("story-0");
  });

  it("does not show or emit when the next story is locked", async () => {
    day2({ stories: { "story-1": true }, lecturaOpenId: "story-1" });
    await boot();
    expect(screen.queryByTestId("first-streak-return")).toBeNull();
    expect((window.__andaleFunnelLog || []).some((event) => event.event === "first_streak_seen")).toBe(false);
    expect(localStorage.getItem("andale-first-streak-return")).toBeNull();
    expect(screen.getByTestId("hub-hoy").getAttribute("data-hub-loud")).toBe("hoy");
  });

  it("dismisses for good when a lesson opens", async () => {
    day2({ stories: { "story-0": true }, lecturaOpenId: "story-0" });
    const user = await boot();
    await screen.findByTestId("first-streak-return");
    await startHoyFromHub(user);
    await waitFor(() => expect(screen.getByTestId("lesson-exit")).toBeTruthy());
    expect(JSON.parse(localStorage.getItem("andale-first-streak-return")).dismissed).toBe(true);
    cleanup();
    forgetFirstStreakReturnLive();
    localStorage.removeItem(LIVE_KEY);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    seedProgress({ ...saved, uiLang: "en" });
    await boot();
    expect(screen.queryByTestId("first-streak-return")).toBeNull();
  });
});
