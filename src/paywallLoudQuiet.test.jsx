/** Paywall copy split (Hand, Oct 20): loud annual line and quiet free link live in named slots. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PAYWALL_ANNUAL_LINE_KEY, PAYWALL_FREE_LINK_KEY, PAYWALL_ANNUAL_LINE_SIZE, PAYWALL_FREE_LINK_SIZE, PAYWALL_FREE_LINK_INK, paywallAnnualLine, paywallFreeLink, annualPriceLine } from "./webPaywall.js";

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

describe("paywall loud/quiet slots", () => {
  it("stand-ins are today's strings, so no words change", () => {
    expect(PAYWALL_ANNUAL_LINE_KEY).toBe("paywallPrice");
    expect(PAYWALL_FREE_LINK_KEY).toBe("paywallDismiss");
    const es = { paywallPrice: "{price} al año", paywallDismiss: "Seguir gratis" };
    expect(paywallAnnualLine(es)).toBe(annualPriceLine(es.paywallPrice));
    expect(paywallFreeLink(es)).toBe("Seguir gratis");
    expect(paywallFreeLink({ paywallDismiss: "Continue free" })).toBe("Continue free");
  });

  it("a new string drops in by key: the slot reads whatever the key names", () => {
    expect(paywallFreeLink({ paywallDismiss: "X" })).toBe("X");
  });

  it("loud line is the largest type; quiet link is 14px and at least 4.5:1 on the card", () => {
    expect(PAYWALL_ANNUAL_LINE_SIZE).toBe(30);
    expect(PAYWALL_FREE_LINK_SIZE).toBe(14);
    expect(PAYWALL_FREE_LINK_INK).toEqual({ light: "#6B6258", dark: "#CDBBA6" });
    expect(ratio(PAYWALL_FREE_LINK_INK.light, "#F6EFE4")).toBeGreaterThanOrEqual(4.5);
    expect(ratio(PAYWALL_FREE_LINK_INK.dark, "#1E2128")).toBeGreaterThanOrEqual(4.5);
  });

  it("the card renders through the slots", () => {
    const app = readFileSync("src/App.jsx", "utf8");
    expect(app).toContain("const annualPriceText = paywallAnnualLine(L);");
    expect(app).toContain("const paywallFreeLinkText = paywallFreeLink(L);");
    expect(app).toMatch(/data-testid="soft-paywall-annual-price" data-paywall-slot="paywallAnnualLine"/);
    expect(app).toMatch(/data-testid="soft-paywall-dismiss" data-paywall-slot="paywallFreeLink"/);
    expect(app).not.toContain("{L.paywallDismiss}");
  });
});
