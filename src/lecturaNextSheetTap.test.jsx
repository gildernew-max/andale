/**
 * 360×640 light EN. With the flores gloss sheet open, the pinned NEXT row
 * is not fully under the checkpoint card: the card ends at x=322 and the
 * NEXT button runs to x=340, so the right edge is a live tap target.
 * jsdom has no layout and no elementFromPoint, so this test installs the
 * boxes measured at that viewport and hit-tests them.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";
import {
  LECTURA_GLOSS_DISMISS_MS,
  LECTURA_NEXT_HEIGHT,
  LECTURA_NEXT_HELD_OPACITY,
  lecturaNextButtonTop,
  lecturaNextPinHeightPx,
  lecturaNextRowTop,
} from "./lecturaAdvance.js";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";
const VIEW_W = 360;
const VIEW_H = 640;

/**
 * Laid-out NEXT at 360×640. Flex basis is the label, so the button starts
 * at x=152 and ends on the pin's 20px padding (x=340). The paragraph card
 * ends at x=322, which is the sliver the sheet does not cover.
 */
const NEXT_BOX = {
  left: 152,
  top: lecturaNextButtonTop(VIEW_H),
  width: 188,
  height: LECTURA_NEXT_HEIGHT,
};
const ADVANCE_BOX = {
  left: 0,
  top: lecturaNextRowTop(VIEW_H),
  width: VIEW_W,
  height: lecturaNextPinHeightPx(),
};
const CHECKPOINT_BOX = {
  left: 20 + 2 + 16,
  top: 521.1,
  width: VIEW_W - 2 * (20 + 2 + 16),
  height: 122,
};

const box = (spec) => ({
  x: spec.left,
  y: spec.top,
  top: spec.top,
  left: spec.left,
  width: spec.width,
  height: spec.height,
  right: spec.left + spec.width,
  bottom: spec.top + spec.height,
  toJSON() { return this; },
});

const contains = (rect, x, y) => x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;

const sheetBox = (el) => {
  const top = Number.parseFloat(el.style.top);
  if (el.style.position !== "fixed" || el.style.left !== "0px" || el.style.width !== "100%" || !Number.isFinite(top)) return null;
  return box({ left: 0, top, width: VIEW_W, height: VIEW_H - top });
};

const stackingZ = (el) => {
  const raw = el.style && el.style.zIndex;
  const n = Number(raw);
  return raw && raw !== "auto" && Number.isFinite(n) ? n : 0;
};

const isStackingContext = (el) => {
  if (!el || el === document.body || el === document.documentElement) return true;
  const pos = el.style && el.style.position;
  if (pos !== "fixed" && pos !== "sticky" && pos !== "absolute" && pos !== "relative") return false;
  const raw = el.style && el.style.zIndex;
  const n = Number(raw);
  if (pos === "fixed" || pos === "sticky") return true;
  return !!(raw && raw !== "auto" && Number.isFinite(n));
};

const stackingContexts = (el) => {
  const contexts = [];
  let node = el;
  while (node) {
    if (isStackingContext(node)) contexts.push(node);
    node = node.parentElement;
  }
  return contexts.reverse();
};

const paintsAbove = (a, b) => {
  if (a === b) return false;
  const ca = stackingContexts(a);
  const cb = stackingContexts(b);
  let i = 0;
  while (ca[i] && ca[i] === cb[i]) i += 1;
  const da = ca[i];
  const db = cb[i];
  if (!da) return false;
  if (!db) return true;
  const za = stackingZ(da);
  const zb = stackingZ(db);
  if (za !== zb) return za > zb;
  return (da.compareDocumentPosition(db) & Node.DOCUMENT_POSITION_FOLLOWING) === 0;
};

describe("lectura gloss sheet blocks the pinned NEXT sliver", () => {
  let realRect;

  afterEach(() => {
    if (realRect) HTMLElement.prototype.getBoundingClientRect = realRect;
    delete document.elementFromPoint;
    vi.restoreAllMocks();
    cleanup();
    localStorage.clear();
  });

  const boot = async () => {
    cleanup();
    localStorage.clear();
    mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, headers: { get: () => "text/html" } })));
    Object.defineProperty(window, "innerWidth", { configurable: true, value: VIEW_W });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: VIEW_H });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "en",
      onboardingDone: true, firstSessionDone: true, paywallSeen: true, done: {}, theme: "light",
    }));
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "story", tab: "lectura", storyId: "story-0", paraIdx: 0, ansSel: {},
    }));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lectura-advance")).toBeTruthy());
    return user;
  };

  const installHitTest = () => {
    realRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function lecturaSheetRect() {
      const id = this.getAttribute && this.getAttribute("data-testid");
      if (id === "lectura-advance") return box(ADVANCE_BOX);
      if (id === "lectura-checkpoint") return box(CHECKPOINT_BOX);
      if (id === "word-sheet") {
        const reached = sheetBox(this);
        if (reached) return reached;
      }
      if (this.tagName === "BUTTON" && /Next/.test(this.textContent || "")) return box(NEXT_BOX);
      return realRect.call(this);
    };
    document.elementFromPoint = (x, y) => {
      const nodes = [...document.body.querySelectorAll("*")];
      let best = null;
      nodes.forEach((el) => {
        if (el.style.pointerEvents === "none" || el.style.visibility === "hidden") return;
        const rect = el.getBoundingClientRect();
        if (!(rect.width > 0) || !(rect.height > 0) || !contains(rect, x, y)) return;
        if (!best || paintsAbove(el, best)) best = el;
      });
      return best;
    };
  };

  const tap = (x, y) => {
    const hit = document.elementFromPoint(x, y);
    expect(hit, `${x},${y}`).toBeTruthy();
    const view = hit.ownerDocument.defaultView;
    act(() => {
      hit.dispatchEvent(new view.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      }));
    });
    return hit;
  };

  const stillParagraph1 = async () => {
    await waitFor(() => {
      expect(screen.getByTestId("lectura-paragraph-first")).toBeTruthy();
      expect(screen.getByText(/Paragraph 1 \/ 6/)).toBeTruthy();
      expect(screen.queryByText(/Paragraph 2 \/ 6/)).toBeNull();
      expect(JSON.parse(localStorage.getItem(LIVE_KEY)).paraIdx).toBe(0);
      expect(screen.getByTestId("word-sheet").style.visibility).toBe("visible");
    });
  };

  it("does not advance when a real tap lands on NEXT's center or its visible edge", async () => {
    const user = await boot();
    expect(window.innerWidth).toBe(360);
    expect(window.innerHeight).toBe(640);
    expect(screen.getByTestId("app-shell").getAttribute("data-theme")).toBe("light");

    const flores = [...document.querySelectorAll("span")].find((el) => el.textContent === "flores");
    expect(flores).toBeTruthy();
    await user.click(flores);
    const sheet = await screen.findByTestId("word-sheet");
    await waitFor(() => expect(sheet.style.visibility).toBe("visible"));

    expect(screen.queryByTestId("lectura-next-cover")).toBeNull();
    expect(sheet.style.position).toBe("fixed");
    expect(sheet.style.left).toBe("0px");
    expect(sheet.style.right).toBe("0px");
    expect(sheet.style.bottom).toBe("0px");
    expect(sheet.style.width).toBe("100%");
    expect(sheet.style.backgroundColor).toMatch(/#fff(?:fff)?|rgb\(\s*255,\s*255,\s*255\s*\)/i);
    expect(sheet.style.borderBottomStyle).toBe("none");
    expect(sheet.style.borderLeftStyle).toBe("none");
    expect(sheet.style.borderRightStyle).toBe("none");
    expect(Number.parseFloat(sheet.style.top)).toBeLessThan(lecturaNextRowTop(VIEW_H));
    expect(screen.getByTestId("lectura-advance").style.opacity).not.toBe(String(LECTURA_NEXT_HELD_OPACITY));
    expect(screen.getByTestId("lectura-advance").classList.contains("lectura-next-held")).toBe(true);
    expect(screen.getByRole("button", { name: "Next →" }).disabled).toBe(false);

    installHitTest();
    const next = screen.getByRole("button", { name: "Next →" });
    const rect = next.getBoundingClientRect();
    expect(rect.top).toBe(NEXT_BOX.top);
    expect(rect.right).toBe(NEXT_BOX.left + NEXT_BOX.width);
    expect(rect.bottom).toBe(VIEW_H - 16);

    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const rightSliver = { x: rect.right - 2, y: rect.top + rect.height / 2 };
    const topSliver = { x: rect.right - 2, y: rect.top + 1 };
    const rowSliver = { x: rect.right - 2, y: lecturaNextRowTop(VIEW_H) + 2 };

    expect(contains(box(CHECKPOINT_BOX), center.x, center.y)).toBe(true);
    expect(contains(box(CHECKPOINT_BOX), rightSliver.x, rightSliver.y)).toBe(false);
    expect(contains(rect, rightSliver.x, rightSliver.y)).toBe(true);
    expect(rowSliver.y).toBe(562);

    for (const point of [rightSliver, topSliver, rowSliver, center]) {
      const hit = tap(point.x, point.y);
      expect(hit).toBe(sheet);
      expect(hit).not.toBe(next);
      await stillParagraph1();
    }

    act(() => {
      next.dispatchEvent(new next.ownerDocument.defaultView.MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await stillParagraph1();
  });

  it("dims NEXT to 40% with no press when the sheet starts below the pin", async () => {
    const prevOffset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        if (this.getAttribute && this.getAttribute("data-testid") === "word-sheet-body") return 40;
        return prevOffset && typeof prevOffset.get === "function" ? prevOffset.get.call(this) : 0;
      },
    });
    try {
      const user = await boot();
      const flores = [...document.querySelectorAll("span")].find((el) => el.textContent === "flores");
      await user.click(flores);
      const sheet = await screen.findByTestId("word-sheet");
      await waitFor(() => expect(sheet.style.visibility).toBe("visible"));
      expect(sheet.style.width).not.toBe("100%");
      expect(sheet.style.bottom).not.toBe("0px");

      const row = screen.getByTestId("lectura-advance");
      expect(row.style.opacity).toBe(String(LECTURA_NEXT_HELD_OPACITY));
      expect(row.style.transition).toBe("none");
      expect(row.classList.contains("lectura-next-held")).toBe(true);
      expect(screen.getByRole("button", { name: "Next →" }).disabled).toBe(false);

      const next = screen.getByRole("button", { name: "Next →" });
      act(() => {
        next.dispatchEvent(new next.ownerDocument.defaultView.MouseEvent("click", { bubbles: true, cancelable: true }));
      });
      await stillParagraph1();

      await user.click(sheet.querySelector("button[aria-label='Close']"));
      await waitFor(() => expect(screen.queryByTestId("word-sheet")).toBeNull());
      const restored = screen.getByTestId("lectura-advance");
      expect(restored.style.opacity).toBe("");
      expect(restored.style.transition).toBe("");
      expect(restored.classList.contains("lectura-next-held")).toBe(false);
      expect(JSON.parse(localStorage.getItem(LIVE_KEY)).paraIdx).toBe(0);
    } finally {
      if (prevOffset) Object.defineProperty(HTMLElement.prototype, "offsetHeight", prevOffset);
    }
  });

  it("closes the gloss on the first NEXT tap and advances on the second", async () => {
    const user = await boot();
    const flores = [...document.querySelectorAll("span")].find((el) => el.textContent === "flores");
    expect(flores).toBeTruthy();
    await user.click(flores);
    const sheet = await screen.findByTestId("word-sheet");
    await waitFor(() => expect(sheet.style.visibility).toBe("visible"));
    expect(flores.style.backgroundColor).toMatch(/#ffe9a8|rgb\(\s*255,\s*233,\s*168\s*\)/i);

    installHitTest();
    const next = screen.getByRole("button", { name: "Next →" });
    const rect = next.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const hit = document.elementFromPoint(center.x, center.y);
    expect(hit).toBe(sheet);
    expect(hit).not.toBe(next);

    const view = hit.ownerDocument.defaultView;
    vi.useFakeTimers();
    let elapsed = 0;
    try {
      const started = performance.now();
      act(() => {
        hit.dispatchEvent(new view.PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          clientX: center.x,
          clientY: center.y,
          pointerId: 1,
          pointerType: "touch",
          button: 0,
        }));
        next.dispatchEvent(new view.MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          clientX: center.x,
          clientY: center.y,
        }));
      });
      elapsed = performance.now() - started;
      expect(screen.queryByTestId("word-sheet")).toBeNull();
      expect(elapsed).toBeLessThan(LECTURA_GLOSS_DISMISS_MS);
      act(() => { vi.runOnlyPendingTimers(); });
    } finally {
      vi.useRealTimers();
    }
    expect(flores.style.backgroundColor).toBe("transparent");
    expect(screen.getByText(/Paragraph 1 \/ 6/)).toBeTruthy();
    expect(screen.queryByText(/Paragraph 2 \/ 6/)).toBeNull();
    expect(JSON.parse(localStorage.getItem(LIVE_KEY)).paraIdx).toBe(0);

    await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 0); }); });
    await user.click(next);
    await waitFor(() => expect(screen.getByText(/Paragraph 2 \/ 6/)).toBeTruthy());
    expect(screen.queryByText(/Paragraph 1 \/ 6/)).toBeNull();
    expect(JSON.parse(localStorage.getItem(LIVE_KEY)).paraIdx).toBe(1);
  });
});
