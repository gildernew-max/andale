import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { LOCKED_STORY_PAYWALL } from "./webPaywall.js";
import { installFlowHooks, seedProgress, boot, localToday } from "./flowsHarness.jsx";

installFlowHooks();

const ES_BODY = "Todas las historias, la Doctora de frases y el camino completo. Español mexicano de verdad, más allá de\u00A0lo\u00A0básico.";
const EN_BODY = "Every story, Phrase Doctor, and the full path. Real Mexican Spanish, past\u00A0the\u00A0basics.";
const ES_PRICE = "US$39.99\u00A0al\u00A0año";
const EN_PRICE = "$39.99\u00A0a\u00A0year";

const ready = {
  paywallSeen: true,
  onboardingDone: true,
  firstSessionDone: true,
  bajioUnlockSeen: true,
  streak: 1,
  lastDay: localToday(),
};

describe("locked Lectura tap opens the much-more paywall", () => {
  it("ships the flag on", () => {
    expect(LOCKED_STORY_PAYWALL).toBe(true);
  });

  it("a locked shelf card opens the wall, and continue free returns to the Lectura list", async () => {
    seedProgress({ uiLang: "es", ...ready });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    const shelf = screen.getByTestId("story-shelf-story-1");
    expect(shelf.disabled).toBe(false);
    expect(shelf.getAttribute("aria-disabled")).toBe("true");
    expect(shelf.getAttribute("data-locked")).toBe("true");
    expect(shelf.getAttribute("aria-label")).toBe("La casa azul (cerrado)");
    expect(shelf.style.cursor).toBe("pointer");
    fireEvent.click(shelf);
    const wall = await screen.findByTestId("soft-paywall");
    expect(screen.queryByTestId("story-reader")).toBeNull();
    const headline = screen.getByTestId("soft-paywall-headline");
    expect(headline.textContent).toBe("Hay mucho más por leer.");
    expect(headline.getAttribute("data-paywall-source")).toBe("locked-story");
    const body = screen.getByTestId("soft-paywall-body");
    expect(body.textContent).toBe(ES_BODY);
    expect(body.style.textWrap).toBe("");
    const price = screen.getByTestId("soft-paywall-annual-price");
    expect(price.textContent).toBe(ES_PRICE);
    expect(price.textContent.includes(" ")).toBe(false);
    expect(price.style.textAlign).toBe("center");
    expect(price.style.fontWeight).toBe("700");
    expect(price.style.fontSize).toBe("13.5px");
    expect(price.style.color).toMatch(/#6B6258|rgb\(\s*107,\s*98,\s*88\s*\)/i);
    expect(price.compareDocumentPosition(screen.getByTestId("soft-paywall-annual")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("soft-paywall-monthly").textContent).toBe("US$6.99\u00A0al\u00A0mes");
    expect(screen.getByTestId("soft-paywall-free-line").textContent).toBe("Gratis: los cuentos se abren uno a uno, en orden.");
    expect(wall.textContent).not.toMatch(/Un mes|One month/);
    await waitFor(() => {
      const seen = (window.__andaleFunnelLog || []).filter((event) => event.event === "paywall_seen");
      expect(seen.length).toBeGreaterThan(0);
      expect(seen.every((event) => event.source === "locked_story")).toBe(true);
    });
    expect((window.__andaleFunnelLog || []).some((event) => event.event === "paywall_tap")).toBe(false);

    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("story-shelf-story-1")).toBeTruthy();
    const taps = (window.__andaleFunnelLog || []).filter((event) => event.event === "paywall_tap");
    expect(taps).toHaveLength(1);
    expect(taps[0].choice).toBe("continue_free");
    expect(taps[0].source).toBeUndefined();

    await user.click(screen.getByTestId("nav-camino"));
    const node = screen.getByTestId("camino-story-story-1");
    expect(node.disabled).toBe(false);
    expect(node.getAttribute("aria-disabled")).toBe("true");
    expect(node.getAttribute("data-locked")).toBe("true");
    expect(node.getAttribute("aria-label")).toBe("Cuento: La casa azul (cerrado)");
    expect(node.style.cursor).toBe("pointer");
    fireEvent.click(node);
    await screen.findByTestId("soft-paywall");
    expect(screen.queryByTestId("story-reader")).toBeNull();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("Hay mucho más por leer.");
    fireEvent.click(screen.getByTestId("soft-paywall-annual"));
    await waitFor(() => expect((window.__andaleFunnelLog || []).some((event) => event.event === "tap_annual" && event.source === "locked_story")).toBe(true));
    fireEvent.click(screen.getByTestId("soft-paywall-monthly"));
    await waitFor(() => expect((window.__andaleFunnelLog || []).some((event) => event.event === "tap_monthly" && event.source === "locked_story")).toBe(true));
    expect((window.__andaleFunnelLog || []).some((event) => event.event === "paywall_tap" && event.choice === "monthly")).toBe(false);
    expect(screen.getByTestId("soft-paywall-annual").textContent).toBe("Empezar plan anual");
    expect(screen.getByTestId("soft-paywall-monthly").textContent).toBe("US$6.99\u00A0al\u00A0mes");
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("story-shelf-story-0")).toBeTruthy();

    await user.click(screen.getByTestId("story-shelf-story-0"));
    const reader = await screen.findByTestId("story-reader");
    expect(reader.getAttribute("data-story-id")).toBe("story-0");
  });

  it("continue free returns to the stories list and stays down until a new locked tap", async () => {
    seedProgress({ uiLang: "en", ...ready });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    fireEvent.click(screen.getByTestId("story-shelf-story-1"));
    await screen.findByTestId("soft-paywall");
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
    expect(screen.getByTestId("story-shelf-story-1")).toBeTruthy();
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("pageshow"));
    window.dispatchEvent(new Event("resize"));
    await user.click(screen.getByTestId("lang-es"));
    expect(screen.queryByTestId("soft-paywall")).toBeNull();
    expect(screen.getByTestId("story-shelf-story-1")).toBeTruthy();
    fireEvent.click(screen.getByTestId("story-shelf-story-1"));
    await screen.findByTestId("soft-paywall");
    expect(screen.getByTestId("soft-paywall-headline").getAttribute("data-paywall-source")).toBe("locked-story");
  });

  it("an English locked tap uses the much-more line and the dollar price", async () => {
    seedProgress({ uiLang: "en", theme: "dark", ...ready });
    const user = await boot();
    await user.click(screen.getByTestId("nav-lectura"));
    fireEvent.click(screen.getByTestId("story-shelf-story-1"));
    await screen.findByTestId("soft-paywall");
    expect(screen.queryByTestId("story-reader")).toBeNull();
    expect(screen.getByTestId("soft-paywall-headline").textContent).toBe("There's much\u00A0more to read.");
    expect(screen.getByTestId("soft-paywall-headline").getAttribute("data-paywall-source")).toBe("locked-story");
    expect(screen.getByTestId("soft-paywall-body").textContent).toBe(EN_BODY);
    const price = screen.getByTestId("soft-paywall-annual-price");
    expect(price.textContent).toBe(EN_PRICE);
    expect(price.textContent.includes(" ")).toBe(false);
    expect(price.style.color).toMatch(/#CDBBA6|rgb\(\s*205,\s*187,\s*166\s*\)/i);
    expect(price.style.textAlign).toBe("center");
  });
});
