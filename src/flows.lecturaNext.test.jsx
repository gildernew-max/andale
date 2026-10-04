import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import {
  installFlowHooks,
  seedProgress,
  freshEligible,
  claimStories,
  boot,
  localToday,
} from "./flowsHarness.jsx";

installFlowHooks();

describe("off-path Lectura on Learn home", () => {
  it("a finished path story surfaces the next unread story, and a locked story stays closed", async () => {
    seedProgress({
      uiLang: "es",
      paywallSeen: true,
      firstSessionDone: true,
      bajioUnlockSeen: true,
      streak: 1,
      lastDay: localToday(),
      stories: claimStories("story-0", "story-1", "story-2"),
    });
    const user = await boot();
    const card = screen.getByTestId("lectura-next-story");
    expect(card.getAttribute("data-story-id")).toBe("story-3");
    expect(card.getAttribute("data-locked")).toBe("false");
    expect(card.getAttribute("aria-label")).toBe("El hijo del Rey Tigre");
    expect(card.disabled).toBe(false);
    const eyebrow = screen.getByTestId("lectura-next-eyebrow");
    const title = [...card.querySelectorAll("div")].find((el) => el.textContent === "El hijo del Rey Tigre");
    expect(eyebrow.textContent).toBe("Siguiente cuento");
    expect(eyebrow.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(eyebrow.style.color).toBe("rgb(107, 98, 88)");
    expect(eyebrow.style.fontSize).toBe("11.5px");
    expect(eyebrow.style.fontWeight).toBe("900");
    await user.click(screen.getByTestId("lang-en"));
    await waitFor(() => expect(screen.getByTestId("lectura-next-eyebrow").textContent).toBe("Next story"));
    expect(screen.getByTestId("lectura-next-eyebrow").textContent).not.toMatch(/Siguiente/);
    await user.click(screen.getByTestId("lang-es"));
    await waitFor(() => expect(screen.getByTestId("lectura-next-eyebrow").textContent).toBe("Siguiente cuento"));
    expect(screen.getByTestId("camino-story-story-0").getAttribute("data-locked")).toBe("false");
    expect(screen.getByTestId("camino-story-story-1").getAttribute("data-locked")).toBe("false");
    expect(screen.queryByTestId("camino-story-story-3")).toBeNull();

    await user.click(screen.getByTestId("nav-lectura"));
    const locked = screen.getByTestId("story-shelf-story-4");
    expect(locked.getAttribute("data-locked")).toBe("true");
    expect(locked.getAttribute("aria-label")).toBe("Doña Lupe y el mole (cerrado)");
    expect(locked.disabled).toBe(true);
    expect(screen.getByTestId("story-shelf-story-9").getAttribute("data-locked")).toBe("true");
    expect(screen.getByTestId("story-shelf-story-3").getAttribute("data-locked")).toBe("false");
    fireEvent.click(locked);
    fireEvent.click(screen.getByTestId("story-shelf-story-9"));
    expect(screen.queryByTestId("story-reader")).toBeNull();

    await user.click(screen.getByTestId("nav-camino"));
    await user.click(screen.getByTestId("lectura-next-story"));
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-3");
  });

  it("keeps story order: the card after story-3 is story-4, and story-5 stays locked", async () => {
    seedProgress({
      uiLang: "es",
      paywallSeen: true,
      firstSessionDone: true,
      bajioUnlockSeen: true,
      streak: 1,
      lastDay: localToday(),
      stories: claimStories("story-0", "story-1", "story-2", "story-3"),
    });
    const user = await boot();
    expect(screen.getByTestId("lectura-next-story").getAttribute("data-story-id")).toBe("story-4");
    expect(screen.getByTestId("lectura-next-story").getAttribute("aria-label")).toBe("Doña Lupe y el mole");
    await user.click(screen.getByTestId("nav-lectura"));
    expect(screen.getByTestId("story-shelf-story-5").getAttribute("data-locked")).toBe("true");
    fireEvent.click(screen.getByTestId("story-shelf-story-5"));
    expect(screen.queryByTestId("story-reader")).toBeNull();
  });

  it("a fresh first session does not grow a story card, and the path locks stay put", async () => {
    freshEligible({ uiLang: "es" });
    await boot();
    expect(screen.queryByTestId("lectura-next")).toBeNull();
    expect(screen.queryByTestId("lectura-next-story")).toBeNull();
    expect(screen.queryByTestId("lectura-next-eyebrow")).toBeNull();
    expect(screen.queryByText("Siguiente cuento")).toBeNull();
    expect(screen.queryByText("Next story")).toBeNull();
    expect(screen.getByTestId("camino-story-story-0").getAttribute("aria-label")).toBe("Cuento: La noche en que vuelven");
    expect(screen.getByTestId("camino-story-story-0").getAttribute("data-locked")).toBe("false");
    expect(screen.getByTestId("camino-story-story-1").getAttribute("aria-label")).toBe("Cuento: La casa azul (cerrado)");
    expect(screen.getByTestId("camino-story-story-1").getAttribute("data-locked")).toBe("true");
    expect(screen.getByTestId("camino-story-story-2").getAttribute("data-locked")).toBe("true");
    expect(screen.queryByTestId("camino-story-story-3")).toBeNull();
    await waitFor(() => expect(screen.getByTestId("hub-sendero")).toBeTruthy());
  });
});
