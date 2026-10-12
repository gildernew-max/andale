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
  LECTURA_NEXT_COVER_Z,
  LECTURA_NEXT_HEIGHT,
  lecturaNextButtonTop,
  lecturaNextCoverStyle,
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

const coverBox = (el) => {
  const painted = lecturaNextCoverStyle("#F6EFE4");
  const height = Number(String(el.style.height || painted.height).match(/([\d.]+)px/)?.[1]);
  const top = VIEW_H - height;
  return box({ left: 0, top, width: VIEW_W, height });
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
      if (id === "lectura-next-cover") return coverBox(this);
      if (this.tagName === "BUTTON" && /Next/.test(this.textContent || "")) return box(NEXT_BOX);
      return realRect.call(this);
    };
    document.elementFromPoint = (x, y) => {
      const nodes = [...document.body.querySelectorAll("*")];
      let best = null;
      let bestZ = -1;
      let bestIndex = -1;
      nodes.forEach((el, index) => {
        if (el.style.pointerEvents === "none" || el.style.visibility === "hidden") return;
        const rect = el.getBoundingClientRect();
        if (!(rect.width > 0) || !(rect.height > 0) || !contains(rect, x, y)) return;
        let node = el;
        let z = 0;
        while (node && node.nodeType === 1) {
          const raw = node.style && node.style.zIndex;
          const n = Number(raw);
          if (raw && raw !== "auto" && Number.isFinite(n)) { z = n; break; }
          node = node.parentElement;
        }
        if (z > bestZ || (z === bestZ && index >= bestIndex)) {
          best = el;
          bestZ = z;
          bestIndex = index;
        }
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

    const cover = screen.getByTestId("lectura-next-cover");
    const painted = lecturaNextCoverStyle("#F6EFE4");
    expect(cover.style.position).toBe("fixed");
    expect(cover.style.backgroundColor).toMatch(/#f6efe4|rgb\(\s*246,\s*239,\s*228\s*\)/i);
    expect(cover.style.backgroundImage).toBe("none");
    expect(cover.style.boxShadow).toBe("none");
    expect(cover.style.borderTopStyle || cover.style.borderStyle).not.toBe("solid");
    expect(cover.style.zIndex).toBe(String(LECTURA_NEXT_COVER_Z));
    expect(cover.style.height).toBe(painted.height);
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

    for (const point of [rightSliver, topSliver, rowSliver]) {
      const hit = tap(point.x, point.y);
      expect(hit).toBe(cover);
      expect(hit).not.toBe(next);
      await stillParagraph1();
    }

    const centerHit = tap(center.x, center.y);
    expect(centerHit).not.toBe(next);
    expect(centerHit.getAttribute("data-testid")).toBe("lectura-checkpoint");
    await stillParagraph1();

    act(() => {
      next.dispatchEvent(new next.ownerDocument.defaultView.MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await stillParagraph1();
  });
});
