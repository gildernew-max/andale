/** Paywall subhead A/B, test 1: concurrent 50/50, arm kept in localStorage, `ab` on
 *  paywall_seen, tap_annual and reserve_submit only. The email never rides along. */
import { describe, expect, it } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AB_SUBHEAD1_ON, AB_SUBHEAD1_KEY, SUBHEAD1_A, subhead1Arm, subhead1AbField } from "./abSubhead1.js";
import { emitFunnelEvent, FUNNEL_EVENTS } from "./funnel.js";
import { shipFunnelEvent } from "./collector.js";
import { RESERVE_WORDS } from "./reserveAnnual.js";
import { installFlowHooks, seedProgress, boot, localToday } from "./flowsHarness.jsx";

installFlowHooks();

const A_ES = "Todas las historias. Español mexicano de verdad, más allá de\u00A0lo\u00A0básico.";
const A_EN = "Every story. Real Mexican Spanish, past\u00A0the\u00A0basics.";
const B_ES = "Todas las historias, sin esperar. Español mexicano de verdad, más allá de\u00A0lo\u00A0básico.";
const B_EN = "Every story, no waiting. Real Mexican Spanish, past\u00A0the\u00A0basics.";
const EMAIL = "ana@correo.com";

const memStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

const ready = { paywallSeen: true, onboardingDone: true, firstSessionDone: true, bajioUnlockSeen: true, streak: 1, lastDay: localToday() };

async function openWall(uiLang, arm) {
  seedProgress({ uiLang, ...ready });
  if (arm) localStorage.setItem(AB_SUBHEAD1_KEY, arm);
  const user = await boot();
  await user.click(screen.getByTestId("nav-lectura"));
  fireEvent.click(screen.getByTestId("story-shelf-story-1"));
  await screen.findByTestId("soft-paywall");
  return user;
}

describe("subhead A/B arm", () => {
  it("ships on, A strings keep the nbsp", () => {
    expect(AB_SUBHEAD1_ON).toBe(true);
    expect(AB_SUBHEAD1_KEY).toBe("andale_ab_subhead1");
    expect(SUBHEAD1_A).toEqual({ es: A_ES, en: A_EN });
  });

  it("rolls 50/50 once and never re-rolls across reloads", () => {
    const low = memStore();
    expect(subhead1Arm({ storage: low, random: () => 0.49 })).toEqual({ render: "A", ab: "A" });
    for (let i = 0; i < 5; i++) expect(subhead1Arm({ storage: low, random: () => 0.99 })).toEqual({ render: "A", ab: "A" });
    const high = memStore();
    expect(subhead1Arm({ storage: high, random: () => 0.5 })).toEqual({ render: "B", ab: "B" });
    for (let i = 0; i < 5; i++) expect(subhead1Arm({ storage: high, random: () => 0 })).toEqual({ render: "B", ab: "B" });
    expect(high.getItem(AB_SUBHEAD1_KEY)).toBe("B");
  });

  it("no localStorage shows A and sends no arm", () => {
    expect(subhead1Arm({ storage: null })).toEqual({ render: "A", ab: null });
    const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
    expect(subhead1Arm({ storage: broken })).toEqual({ render: "A", ab: null });
    expect(subhead1AbField({ storage: null })).toBeUndefined();
  });

  it("kill switch off: everyone sees B and no arm is sent", () => {
    const store = memStore();
    store.setItem(AB_SUBHEAD1_KEY, "A");
    expect(subhead1Arm({ on: false, storage: store })).toEqual({ render: "B", ab: null });
    expect(subhead1AbField({ on: false, storage: store })).toBeUndefined();
  });

  it("ab rides only paywall_seen, tap_annual and reserve_submit", () => {
    const bus = { log: [] };
    const seen = emitFunnelEvent({ event: FUNNEL_EVENTS.paywallSeen, source: "win", ab: "A" }, bus);
    const tap = emitFunnelEvent({ event: FUNNEL_EVENTS.tapAnnual, source: "win", ab: "B" }, bus);
    const sub = emitFunnelEvent({ event: FUNNEL_EVENTS.reserveSubmit, ab: "A", email: EMAIL }, bus);
    const monthly = emitFunnelEvent({ event: FUNNEL_EVENTS.tapMonthly, source: "win", ab: "A" }, bus);
    const junk = emitFunnelEvent({ event: FUNNEL_EVENTS.paywallSeen, source: "win", ab: "C" }, bus);
    expect(seen.ab).toBe("A");
    expect(tap.ab).toBe("B");
    expect(sub.ab).toBe("A");
    expect(monthly && monthly.ab).toBeUndefined();
    expect(junk && junk.ab).toBeUndefined();
    expect(JSON.stringify([seen, tap, sub, monthly])).not.toContain(EMAIL);
  });

  it("the collector body is event, date, device, ab and never the email", async () => {
    const bodies = [];
    const fetchImpl = async (_url, init) => { bodies.push(JSON.parse(init.body)); };
    const store = memStore();
    await shipFunnelEvent({ event: "reserve_submit", at: Date.now(), ab: "B", email: EMAIL, plan: "annual" },
      { endpoint: "https://collector.test/x", storage: store, fetchImpl, beaconImpl: null, random: () => "dev-1" });
    await shipFunnelEvent({ event: "paywall_seen", at: Date.now() },
      { endpoint: "https://collector.test/x", storage: store, fetchImpl, beaconImpl: null, random: () => "dev-1" });
    expect(Object.keys(bodies[0]).sort()).toEqual(["ab", "date", "device", "event"]);
    expect(bodies[0].ab).toBe("B");
    expect(Object.keys(bodies[1]).sort()).toEqual(["date", "device", "event"]);
    expect(JSON.stringify(bodies)).not.toContain(EMAIL);
  });
});

describe("subhead A/B on the paywall", () => {
  for (const [arm, lang, text] of [["A", "es", A_ES], ["A", "en", A_EN], ["B", "es", B_ES], ["B", "en", B_EN]]) {
    it(`arm ${arm} renders the ${lang.toUpperCase()} subhead`, async () => {
      await openWall(lang, arm);
      const body = screen.getByTestId("soft-paywall-body");
      expect(body.textContent).toBe(text);
      expect(body.getAttribute("data-ab")).toBe(arm);
    });
  }

  it("the arm stays the same after a reload and rides paywall_seen and the reserve events, never the email", async () => {
    const user = await openWall("es", "A");
    await waitFor(() => expect((window.__andaleFunnelLog || []).some((e) => e.event === "paywall_seen" && e.ab === "A")).toBe(true));
    fireEvent.click(screen.getByTestId("soft-paywall-annual"));
    await user.type(screen.getByTestId("soft-paywall-reserve-email"), EMAIL);
    await user.click(screen.getByTestId("soft-paywall-reserve-submit"));
    await screen.findByText(RESERVE_WORDS.es.doneTitle);
    const log = window.__andaleFunnelLog || [];
    expect(log.find((e) => e.event === "tap_annual").ab).toBe("A");
    expect(log.find((e) => e.event === "reserve_submit").ab).toBe("A");
    expect(log.filter((e) => e.ab !== undefined).every((e) => ["paywall_seen", "tap_annual", "reserve_submit"].includes(e.event))).toBe(true);
    expect(JSON.stringify(log)).not.toContain(EMAIL);
    expect(localStorage.getItem("andale-funnel-log") || "").not.toContain(EMAIL);
    cleanup();
    expect(localStorage.getItem(AB_SUBHEAD1_KEY)).toBe("A");
    expect(subhead1Arm()).toEqual({ render: "A", ab: "A" });
  });

  it("a fresh visitor gets an arm stored on first paywall", async () => {
    await openWall("en");
    const stored = localStorage.getItem(AB_SUBHEAD1_KEY);
    expect(["A", "B"]).toContain(stored);
    expect(screen.getByTestId("soft-paywall-body").getAttribute("data-ab")).toBe(stored);
  });
});
