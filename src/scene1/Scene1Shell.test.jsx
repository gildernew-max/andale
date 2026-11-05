/** Scene 1 end to end: cold open, the five "say it from memory" chunks,
 *  Paywall A right after the first one, the free continuation through the
 *  rest of the chunks and the off-script twist, and the day-3 switch for
 *  Paywall B. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Scene1Shell from "./Scene1Shell.jsx";
import { SCENE1_CHUNKS } from "./content.js";
import { PAYWALL_HERO_ALT, PAYWALL_HERO_PATH } from "../paywallStill.js";
import { LOCKED_DISPLAY_PRICE } from "../paywallDisclosure.js";
import { contrastRatio } from "../hoyChoiceCard.js";

function fakeIdbFactory() {
  const stores = new Map();
  return {
    open(name) {
      const req = {};
      queueMicrotask(() => {
        let db = stores.get(name);
        const isNew = !db;
        if (!db) { db = new Map(); stores.set(name, db); }
        const handle = {
          objectStoreNames: { contains: () => true },
          createObjectStore() {},
          transaction() {
            const tx = {
              objectStore: () => ({
                put(value, key) { queueMicrotask(() => { db.set(key, value); tx.oncomplete?.(); }); },
                get(key) { const r = {}; queueMicrotask(() => { r.result = db.get(key); r.onsuccess?.(); }); return r; },
              }),
            };
            return tx;
          },
        };
        req.result = handle;
        if (isNew) req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
  };
}

function mockBrowser() {
  window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { speak: (u) => queueMicrotask(() => u.onend?.()) },
  });
  window.Audio = class {
    constructor(url) { this.url = url; }
    play() { queueMicrotask(() => this.onended?.()); return Promise.resolve(); }
  };
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: () => "blob:fake" });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  Object.defineProperty(window.navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
  });
  class FakeMediaRecorder {
    constructor(stream, opts) { this.stream = stream; this.opts = opts; }
    start() {}
    stop() {
      queueMicrotask(() => {
        this.ondataavailable?.({ data: new Blob(["learner-audio"], { type: "audio/webm" }) });
        this.onstop?.();
      });
    }
  }
  window.MediaRecorder = FakeMediaRecorder;
  Object.defineProperty(window, "indexedDB", { configurable: true, value: fakeIdbFactory() });
}

const seenEvents = (eventName) =>
  JSON.parse(localStorage.getItem("andale-funnel-log") || "[]").filter((e) => e.event === eventName);

/** style.background may come back as rgb(...) in jsdom even though we set a hex literal. */
function toHex(value) {
  const s = String(value || "").trim().toLowerCase();
  const hex = s.match(/#([0-9a-f]{3,8})/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
    return `#${h.slice(0, 6)}`;
  }
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!rgb) return "";
  return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
}

beforeEach(() => {
  localStorage.clear();
  mockBrowser();
});

afterEach(() => cleanup());

async function sayChunk(user) {
  await user.click(await screen.findByTestId("scene1-record"));
  await user.click(await screen.findByTestId("scene1-stop"));
  await user.click(await screen.findByTestId("scene1-compare"));
  await waitFor(() => expect(screen.getByTestId("scene1-comparing")).toBeTruthy());
}

describe("Scene1Shell", () => {
  it("plays cold open, the first chunk, then Paywall A right after it", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="es" search="" />);

    expect(seenEvents("app_open")).toHaveLength(1);
    expect(Object.keys(seenEvents("app_open")[0]).sort()).toEqual(["at", "event"]);

    expect(screen.getByTestId("scene1-cold-open").textContent).toMatch(/Habla español mexicano de verdad/);
    await user.click(screen.getByTestId("scene1-cold-open-start"));

    expect(screen.getByTestId("scene1-intro").textContent).toMatch(/Hoy: el mercado\./);
    await user.click(screen.getByTestId("scene1-start"));

    expect(screen.getByTestId("scene1-cue").textContent).toMatch(/Saluda al vendedor/);
    await sayChunk(user);
    expect(screen.getByTestId("scene1-comparing").textContent).toMatch(/me da/);
    await user.click(screen.getByTestId("scene1-same"));

    // Paywall A opens directly on the same headline — no handoff screen in between.
    const paywall = screen.getByTestId("scene1-paywall");
    expect(paywall.getAttribute("data-paywall-variant")).toBe("A");
    expect(screen.getByTestId("scene1-paywall-headline").textContent).toBe("Acabas de pedir en español.");
    expect(screen.getByText("Cada escena de San Miguel, sin esperar.")).toBeTruthy();
    expect(screen.getByTestId("scene1-paywall-annual-price").textContent).toBe("US$39.99 al año");
    expect(screen.getByTestId("scene1-paywall-monthly-price").textContent).toBe("Son US$3.33 al mes.");
    expect(seenEvents("paywall_seen")).toHaveLength(1);
    expect(seenEvents("paywall_seen")[0].source).toBe("timed");

    // Dismissing continues into chunk 2, free.
    await user.click(screen.getByTestId("scene1-paywall-dismiss"));
    expect(seenEvents("paywall_tap").map((e) => e.choice)).toContain("continue_free");
    expect(screen.getByTestId("scene1-cue").textContent).toMatch(/Pide medio kilo/);
  }, 20000);

  it("walks chunks 2-5 free, then the twist, then a quiet done screen", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="es" search="" />);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    await user.click(screen.getByTestId("scene1-start"));

    for (let i = 0; i < SCENE1_CHUNKS.length; i += 1) {
      await sayChunk(user);
      await user.click(screen.getByTestId("scene1-same"));
      if (i === 0) {
        await user.click(screen.getByTestId("scene1-paywall-dismiss"));
      }
    }

    expect(screen.getByTestId("scene1-twist").textContent).toMatch(/Buenos días, ¿qué le doy\?/);
    expect(seenEvents("scene1_complete")).toHaveLength(0);
    await user.click(screen.getByTestId("scene1-finish"));
    expect(screen.getByTestId("scene1-done")).toBeTruthy();
    expect(screen.queryByText(/Acabas de pedir en español/)).toBeNull();
    expect(seenEvents("scene1_complete")).toHaveLength(1);
    expect(Object.keys(seenEvents("scene1_complete")[0]).sort()).toEqual(["at", "event"]);
  }, 20000);

  it("moves on after two retries with no score and no penalty", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="es" search="" />);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    await user.click(screen.getByTestId("scene1-start"));

    await sayChunk(user);
    await user.click(screen.getByTestId("scene1-retry"));
    await sayChunk(user);
    await user.click(screen.getByTestId("scene1-retry"));
    await sayChunk(user);
    await user.click(screen.getByTestId("scene1-retry"));

    expect(screen.getByTestId("scene1-retry-line").textContent).toMatch(/Sigue\. Mañana vuelve\./);
    await user.click(screen.getByTestId("scene1-continue-after-retry"));
    // Still the paywall interception after chunk 1, same as the clean path.
    expect(screen.getByTestId("scene1-paywall")).toBeTruthy();
  }, 20000);

  it("shows the PR 368 hero bird above the headline on Paywall A and B, and nowhere else", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="es" search="" />);

    await user.click(screen.getByTestId("scene1-cold-open-start"));
    expect(screen.queryByTestId("scene1-paywall-hero")).toBeNull();
    await user.click(screen.getByTestId("scene1-start"));
    expect(screen.queryByTestId("scene1-paywall-hero")).toBeNull();

    await sayChunk(user);
    await user.click(screen.getByTestId("scene1-same"));

    // Paywall A: the hero bird sits above the headline in the same band PR 368 built.
    const paywallA = screen.getByTestId("scene1-paywall");
    expect(paywallA.getAttribute("data-paywall-variant")).toBe("A");
    const heroA = screen.getByTestId("scene1-paywall-hero");
    expect(heroA.tagName).toBe("IMG");
    expect(heroA.src).toContain(PAYWALL_HERO_PATH);
    expect(heroA.alt).toBe(PAYWALL_HERO_ALT.es);
    expect(
      heroA.compareDocumentPosition(screen.getByTestId("scene1-paywall-headline")) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    await user.click(screen.getByTestId("scene1-paywall-dismiss"));
    expect(screen.queryByTestId("scene1-paywall-hero")).toBeNull();
  }, 20000);

  it("shows the PR 368 hero bird above the headline on Paywall B too", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="es" search="?paywallVariant=b" />);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    await user.click(screen.getByTestId("scene1-start"));
    await sayChunk(user);
    await user.click(screen.getByTestId("scene1-same"));

    const paywallB = screen.getByTestId("scene1-paywall");
    expect(paywallB.getAttribute("data-paywall-variant")).toBe("B");
    const heroB = screen.getByTestId("scene1-paywall-hero");
    expect(heroB.tagName).toBe("IMG");
    expect(heroB.src).toContain(PAYWALL_HERO_PATH);
    expect(heroB.alt).toBe(PAYWALL_HERO_ALT.es);
    expect(
      heroB.compareDocumentPosition(screen.getByTestId("scene1-paywall-headline")) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  }, 20000);

  it("the day-3 test switch forces Paywall B without touching the clock", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="es" search="?paywallVariant=b" />);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    await user.click(screen.getByTestId("scene1-start"));
    await sayChunk(user);
    await user.click(screen.getByTestId("scene1-same"));

    const paywall = screen.getByTestId("scene1-paywall");
    expect(paywall.getAttribute("data-paywall-variant")).toBe("B");
    expect(screen.getByTestId("scene1-paywall-headline").textContent).toBe("Tres días hablando. Sigue.");
    expect(screen.getByText("Cada día suenas más natural. Sigue con todas las historias.")).toBeTruthy();
  }, 20000);

  it("uiLang=en renders the English pairs for the same screens", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="en" search="" />);
    expect(screen.getByTestId("scene1-cold-open").textContent).toMatch(/Speak real Mexican Spanish in San Miguel/);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    expect(screen.getByTestId("scene1-intro").textContent).toMatch(/Today: the market\./);
  });

  it("uiLang=en switches cues, tips, and buttons, but the native Spanish line stays Spanish", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="en" search="" />);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    await user.click(screen.getByTestId("scene1-start"));

    // Cue and button switch to English.
    expect(screen.getByTestId("scene1-cue").textContent).toMatch(/Greet the vendor and ask for a kilo of limes\./);
    expect(screen.getByTestId("scene1-record").textContent).toBe("Record");

    await user.click(await screen.findByTestId("scene1-record"));
    await user.click(await screen.findByTestId("scene1-stop"));
    // The model line keeps the native Spanish next to its English gloss.
    expect(screen.getByTestId("scene1-model").textContent).toMatch(/Buenos días\. ¿Me da un kilo de limones\?/);
    expect(screen.getByTestId("scene1-model").textContent).toMatch(/Buenos días\. ¿Me da un kilo de limones/);
  }, 20000);

  it("fits 360x640 with no 40px overflow: minHeight is the dynamic viewport unit, padding stays inside the box, and no screen sets a fixed 680 height", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="es" search="" />);
    const shell = screen.getByTestId("scene1-shell");
    expect(shell.style.minHeight).toBe("100dvh");
    // border-box keeps the 20px padding inside the 100dvh box; content-box would add
    // 40px on top of the viewport, which is exactly the overflow Varys caught.
    expect(shell.style.boxSizing).toBe("border-box");
    expect(shell.style.height).not.toBe("680px");
    expect(shell.style.minHeight).not.toBe("640px");

    // Same shell element persists across every phase, so one assertion covers all screens.
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    expect(screen.getByTestId("scene1-shell").style.boxSizing).toBe("border-box");
    await user.click(screen.getByTestId("scene1-start"));
    await sayChunk(user);
    await user.click(screen.getByTestId("scene1-same"));
    const paywallShell = screen.getByTestId("scene1-shell");
    expect(paywallShell.style.boxSizing).toBe("border-box");
    expect(paywallShell.style.height).not.toBe("680px");
  }, 20000);

  it("the paywall's green annual button is dark enough for white text to clear 4.5:1, in both themes", async () => {
    for (const theme of ["light", "dark"]) {
      const user = userEvent.setup();
      render(<Scene1Shell uiLang="es" theme={theme} search="" />);
      await user.click(screen.getByTestId("scene1-cold-open-start"));
      await user.click(screen.getByTestId("scene1-start"));
      await sayChunk(user);
      await user.click(screen.getByTestId("scene1-same"));

      const annualButton = screen.getByTestId("scene1-paywall-annual");
      const bg = toHex(annualButton.style.background);
      expect(bg).toBe("#58cc02"); // No face: lime is the brand
      expect(toHex(annualButton.style.color)).toBe("#1f3a1a"); // ink on lime, label inherits
      expect(contrastRatio("#1f3a1a", bg)).toBeGreaterThanOrEqual(4.5);
      cleanup();
    }
  }, 20000);

  it("tapping Reservar mi lugar shows the reserved screen (bird + done box) and a lime Seguir button that reaches chunk 2, in Spanish", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="es" search="" />);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    await user.click(screen.getByTestId("scene1-start"));
    await sayChunk(user);
    await user.click(screen.getByTestId("scene1-same"));

    await user.click(screen.getByTestId("scene1-paywall-annual"));
    // The existing log still fires.
    expect(seenEvents("paywall_tap").map((e) => e.choice)).toContain("annual");
    expect(seenEvents("tap_annual")).toHaveLength(1);
    // Same collector allowlist as the main paywall's reserve_submit, but no plan/price/email.
    expect(seenEvents("reserve_submit")).toHaveLength(1);
    expect(Object.keys(seenEvents("reserve_submit")[0]).sort()).toEqual(["at", "event"]);

    expect(screen.queryByTestId("scene1-paywall-annual")).toBeNull();
    // The bird (PR 368's hero) stays above the done box; the headline/subhead drop out.
    expect(screen.getByTestId("scene1-paywall-hero")).toBeTruthy();
    expect(screen.queryByTestId("scene1-paywall-headline")).toBeNull();
    const box = screen.getByTestId("scene1-paywall-reserved");
    expect(box.getAttribute("role")).toBe("status");
    expect(screen.getByTestId("scene1-paywall-reserved-title").textContent).toBe("Listo. Tu lugar está apartado.");
    // No email box or email text on this screen.
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/correo/i)).toBeNull();

    const continueBtn = screen.getByTestId("scene1-paywall-continue");
    expect(continueBtn.textContent).toBe("Seguir");
    expect(toHex(continueBtn.style.background)).toBe("#58cc02");
    expect(toHex(continueBtn.style.color)).toBe("#1f3a1a");

    await user.click(continueBtn);
    expect(screen.getByTestId("scene1-cue").textContent).toMatch(/Pide medio kilo/);
  }, 20000);

  it("tapping Reserve my spot shows the reserved screen (bird + done box) and a lime Continue button that reaches chunk 2, in English", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="en" search="" />);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    await user.click(screen.getByTestId("scene1-start"));
    await sayChunk(user);
    await user.click(screen.getByTestId("scene1-same"));

    await user.click(screen.getByTestId("scene1-paywall-annual"));
    expect(seenEvents("paywall_tap").map((e) => e.choice)).toContain("annual");
    expect(seenEvents("tap_annual")).toHaveLength(1);
    expect(seenEvents("reserve_submit")).toHaveLength(1);
    expect(Object.keys(seenEvents("reserve_submit")[0]).sort()).toEqual(["at", "event"]);

    expect(screen.queryByTestId("scene1-paywall-annual")).toBeNull();
    expect(screen.getByTestId("scene1-paywall-hero")).toBeTruthy();
    expect(screen.queryByTestId("scene1-paywall-headline")).toBeNull();
    const box = screen.getByTestId("scene1-paywall-reserved");
    expect(box.getAttribute("role")).toBe("status");
    expect(screen.getByTestId("scene1-paywall-reserved-title").textContent).toBe("Done. Your spot is reserved.");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/email/i)).toBeNull();

    const continueBtn = screen.getByTestId("scene1-paywall-continue");
    expect(continueBtn.textContent).toBe("Continue");
    expect(toHex(continueBtn.style.background)).toBe("#58cc02");
    expect(toHex(continueBtn.style.color)).toBe("#1f3a1a");

    await user.click(continueBtn);
    expect(screen.getByTestId("scene1-cue").textContent).toMatch(/Ask for half a kilo instead\./);
  }, 20000);

  it("mic denied: Seguir sin micrófono skips recording and still reaches the paywall, in Spanish", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="es" search="" />);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    await user.click(screen.getByTestId("scene1-start"));

    Object.defineProperty(window.navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new Error("denied")) },
    });

    await user.click(screen.getByTestId("scene1-record"));
    await waitFor(() => expect(screen.getByText("No pudimos usar el micrófono. Revisa el permiso en Ajustes.")).toBeTruthy());

    const skipBtn = screen.getByTestId("scene1-skip-mic");
    expect(skipBtn.textContent).toBe("Seguir sin micrófono");
    expect(toHex(skipBtn.style.background)).toBe("#58cc02");
    expect(toHex(skipBtn.style.color)).toBe("#1f3a1a");

    await user.click(skipBtn);
    expect(screen.getByTestId("scene1-paywall")).toBeTruthy();
    expect(screen.queryByTestId("scene1-recording")).toBeNull();
  }, 20000);

  it("mic denied: Continue without the mic skips recording and still reaches the paywall, in English", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="en" search="" />);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    await user.click(screen.getByTestId("scene1-start"));

    Object.defineProperty(window.navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new Error("denied")) },
    });

    await user.click(screen.getByTestId("scene1-record"));
    await waitFor(() => expect(screen.getByText("We couldn't use the microphone. Check the permission in Settings.")).toBeTruthy());

    const skipBtn = screen.getByTestId("scene1-skip-mic");
    expect(skipBtn.textContent).toBe("Continue without the mic");
    expect(toHex(skipBtn.style.background)).toBe("#58cc02");
    expect(toHex(skipBtn.style.color)).toBe("#1f3a1a");

    await user.click(skipBtn);
    expect(screen.getByTestId("scene1-paywall")).toBeTruthy();
    expect(screen.queryByTestId("scene1-recording")).toBeNull();
  }, 20000);

  it("dark mode: quiet text is cream at reduced opacity, not the light-mode ink that fails contrast on #15171C", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="es" theme="dark" search="" />);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    await user.click(screen.getByTestId("scene1-start"));
    await sayChunk(user);
    await user.click(screen.getByTestId("scene1-same"));

    const monthlyPrice = screen.getByTestId("scene1-paywall-monthly-price");
    expect(monthlyPrice.style.color).toBe("rgba(246, 239, 228, 0.7)");
    expect(monthlyPrice.style.color).not.toBe("#6B6258");
  }, 20000);
});
