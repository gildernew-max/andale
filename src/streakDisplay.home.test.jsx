/**
 * Learn home streak note. Display only — andale-v3 streak stays stored.
 */
import { describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { prevDayKey } from "./firstDoor.js";
import { contrastRatio } from "./spanishKeyboard.js";
import {
  STORAGE_KEY,
  installFlowHooks,
  localToday,
  seedProgress,
} from "./flowsHarness.jsx";

installFlowHooks();

const shift = (days) => {
  const [y, m, d] = localToday().split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const homeSeed = (extra) => {
  cleanup();
  seedProgress({
    welcomed: true,
    onboardingDone: true,
    firstSessionDone: true,
    paywallSeen: true,
    bajioUnlockSeen: true,
    xp: 40,
    hearts: 5,
    ...extra,
  });
};

const openHome = async () => {
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("learn-hub")).toBeTruthy());
  await waitFor(() => expect(screen.queryByTestId("splash-start")).toBeNull());
};

const note = () => screen.getByTestId("streak-home-note");

describe("Learn home streak note", () => {
  it("shows the at-risk line in ES and EN and leaves the stored streak", async () => {
    const yesterday = prevDayKey(localToday());
    homeSeed({ uiLang: "es", theme: "light", streak: 4, lastDay: yesterday });
    await openHome();

    expect(note().textContent).toBe("Tu racha de 4 días termina hoy. Haz una lección para mantenerla.");
    expect(note().getAttribute("data-streak-status")).toBe("at-risk");
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^4/);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(4);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).lastDay).toBe(yesterday);
    expect(note().style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
    expect(note().style.whiteSpace).not.toBe("nowrap");
    expect(note().style.maxWidth).toBe("100%");
    expect(contrastRatio("#6B6258", "#F6EFE4")).toBeGreaterThanOrEqual(4.5);
    const hub = screen.getByTestId("learn-hub");
    expect(hub.contains(note())).toBe(true);
    expect(screen.getByTestId("hub-hoy").compareDocumentPosition(note()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("door-meta").compareDocumentPosition(note()) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();

    const user = userEvent.setup();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(note().textContent).toBe("Your 4-day streak ends tonight. Do one lesson to keep it."));
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^4/);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(4);
  });

  it("uses the singular at-risk sentence at n=1 in ES and EN", async () => {
    homeSeed({ uiLang: "es", streak: 1, lastDay: prevDayKey(localToday()) });
    await openHome();
    expect(note().textContent).toBe("Tu racha de 1 día termina hoy. Haz una lección para mantenerla.");
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^1/);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(note().textContent).toBe("Your 1-day streak ends tonight. Do one lesson to keep it."));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(1);
  });

  it("shows the gone line and a 0 flame when the gap is 3 days and the modal is down", async () => {
    homeSeed({ uiLang: "es", theme: "dark", streak: 6, lastDay: shift(-3) });
    await openHome();
    expect(note().textContent).toBe("Tu racha volvió a 0. Hoy empieza una nueva.");
    expect(note().getAttribute("data-streak-status")).toBe("gone");
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^0/);
    expect(note().style.color).toMatch(/#A0A4AB|rgb\(\s*160,\s*164,\s*171\s*\)/i);
    expect(contrastRatio("#A0A4AB", "#15171C")).toBeGreaterThanOrEqual(4.5);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(6);

    const user = userEvent.setup();
    await user.click(screen.getByTestId("nav-perfil"));
    await waitFor(() => expect(screen.getByTestId("perfil-streak").textContent).toMatch(/0/));
    expect(screen.getByTestId("perfil-streak").textContent).toMatch(/días de racha/);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(6);

    await user.click(screen.getByTestId("lang-en"));
    await user.click(screen.getByTestId("nav-camino"));
    await waitFor(() => expect(note().textContent).toBe("Your streak is back to 0. Today starts a new one."));
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^0/);
  });

  it("keeps the number and hides both lines while the 2-day repair modal is up", async () => {
    const gap2 = shift(-2);
    homeSeed({ uiLang: "en", streak: 5, lastDay: gap2, repairChecked: false });
    await openHome();
    await waitFor(() => expect(screen.getByText("You missed a day")).toBeTruthy());
    expect(screen.getByText("Your 5-day streak is in danger. Repair it with gems before today ends.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Repair streak ( 200)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Let it go" })).toBeTruthy();
    expect(screen.queryByTestId("streak-home-note")).toBeNull();
    expect(screen.getByTestId("streak").textContent.replace(/\s+/g, " ").trim()).toMatch(/^5/);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).streak).toBe(5);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).lastDay).toBe(gap2);
  });

  it("freeze modal uses George's button and the k=0, k=1, and k=2 bodies", async () => {
    const gap2 = shift(-2);
    const cases = [
      { freezes: 1, en: "You have a freeze for your 5-day streak. Use it to keep going. 0 left after this.", es: "Tienes un congelamiento para tu racha de 5 días. Úsalo para seguir. No te quedarán más." },
      { freezes: 2, en: "You have a freeze for your 5-day streak. Use it to keep going. 1 left after this.", es: "Tienes un congelamiento para tu racha de 5 días. Úsalo para seguir. Te quedará 1." },
      { freezes: 3, en: "You have a freeze for your 5-day streak. Use it to keep going. 2 left after this.", es: "Tienes un congelamiento para tu racha de 5 días. Úsalo para seguir. Te quedarán 2." },
    ];
    for (const row of cases) {
      homeSeed({ uiLang: "en", streak: 5, lastDay: gap2, repairChecked: false, freezes: row.freezes });
      await openHome();
      await waitFor(() => expect(screen.getByText("Your streak is frozen!")).toBeTruthy());
      expect(screen.getByText(row.en)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Use freeze" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /auto/i })).toBeNull();
      const user = userEvent.setup();
      await user.click(screen.getByTestId("lang-es"));
      await waitFor(() => expect(screen.getByText("¡Tu racha está congelada!")).toBeTruthy());
      expect(screen.getByText(row.es)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Usar congelamiento" })).toBeTruthy();
    }
  });
});
