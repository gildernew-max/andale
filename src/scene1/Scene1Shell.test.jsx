/** Scene 1 end to end: cold open, the five "say it from memory" chunks,
 *  Paywall A right after the first one, the free continuation through the
 *  rest of the chunks and the off-script twist, and the day-3 switch for
 *  Paywall B. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Scene1Shell from "./Scene1Shell.jsx";
import { SCENE1_CHUNKS } from "./content.js";

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

    // Handoff line, then Paywall A — not chunk 2 — right after the first exchange.
    expect(screen.getByTestId("scene1-handoff").textContent).toMatch(/Acabas de pedir en español\./);
    await user.click(screen.getByTestId("scene1-handoff-continue"));

    const paywall = screen.getByTestId("scene1-paywall");
    expect(paywall.getAttribute("data-paywall-variant")).toBe("A");
    expect(screen.getByTestId("scene1-paywall-headline").textContent).toBe("Acabas de pedir en español.");
    expect(screen.getByText("Cada escena de San Miguel, sin esperar.")).toBeTruthy();
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
        await user.click(screen.getByTestId("scene1-handoff-continue"));
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
    expect(screen.getByTestId("scene1-handoff")).toBeTruthy();
  }, 20000);

  it("the day-3 test switch forces Paywall B without touching the clock", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="es" search="?paywallVariant=b" />);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    await user.click(screen.getByTestId("scene1-start"));
    await sayChunk(user);
    await user.click(screen.getByTestId("scene1-same"));
    await user.click(screen.getByTestId("scene1-handoff-continue"));

    const paywall = screen.getByTestId("scene1-paywall");
    expect(paywall.getAttribute("data-paywall-variant")).toBe("B");
    expect(screen.getByTestId("scene1-paywall-headline").textContent).toBe("Tres días hablando. Sigue.");
    expect(screen.getByText("Escucha tu primer día y el de hoy. Ahí se nota.")).toBeTruthy();
  }, 20000);

  it("uiLang=en renders the English pairs for the same screens", async () => {
    const user = userEvent.setup();
    render(<Scene1Shell uiLang="en" search="" />);
    expect(screen.getByTestId("scene1-cold-open").textContent).toMatch(/Speak real Mexican Spanish in San Miguel/);
    await user.click(screen.getByTestId("scene1-cold-open-start"));
    expect(screen.getByTestId("scene1-intro").textContent).toMatch(/Today: the market\./);
  });
});
