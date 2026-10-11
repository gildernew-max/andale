/**
 * Lectura NEXT sits under the paragraph, and an advance puts that paragraph
 * at the top of the readable area (sticky header bottom). Button ink and the
 * pinned footer stay as they are.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { mockBrowser } from "./flowsHarness.jsx";

const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const rect = (top, height, width = 358) => ({
  x: 16, y: top, top, left: 16, right: 16 + width, bottom: top + height, width, height, toJSON() {},
});

const follows = (earlier, later) => (earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe("lectura next placement and advance scroll", () => {
  let realRect;
  let scrollY;

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = realRect;
    delete window.scrollY;
    delete window.pageYOffset;
    vi.restoreAllMocks();
    cleanup();
    localStorage.clear();
  });

  const bootStory = async () => {
    cleanup();
    localStorage.clear();
    mockBrowser({ voices: [{ lang: "es-MX", name: "Paulina" }] });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, headers: { get: () => "text/html" } })));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      welcomed: true, xp: 42, gems: 9, name: "Dave", contentVersion: 2, hearts: 5, uiLang: "es",
      onboardingDone: true, firstSessionDone: true, paywallSeen: true, done: {},
    }));
    localStorage.setItem(LIVE_KEY, JSON.stringify({
      screen: "story", tab: "lectura", storyId: "story-0", paraIdx: 0, ansSel: {},
    }));
    scrollY = 900;
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
    Object.defineProperty(window, "pageYOffset", { configurable: true, get: () => scrollY });
    realRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function lecturaRect() {
      if (this.style && this.style.position === "sticky") return rect(0, 72, 390);
      const id = this.getAttribute && this.getAttribute("data-testid");
      if (id === "lectura-paragraph" || id === "lectura-paragraph-first") return rect(820, 580);
      if (id === "lectura-questions") return rect(1100, 640);
      return realRect.call(this);
    };
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation((x, y) => {
      scrollY = typeof x === "object" ? Number(x.top) || 0 : Number(y) || 0;
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("lectura-advance")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("narration-card")).toBeTruthy());
    return { user, scrollTo };
  };

  it("puts NEXT under the paragraph and keeps the button and footer", async () => {
    const { user, scrollTo } = await bootStory();
    const para = screen.getByTestId("lectura-paragraph-first");
    const advance = screen.getByTestId("lectura-advance");
    const narration = screen.getByTestId("narration-card");
    const hunt = screen.getByTestId("word-hunt-card");
    expect(follows(para, advance)).toBe(true);
    expect(follows(advance, narration)).toBe(true);
    expect(follows(narration, hunt)).toBe(true);

    const next = screen.getByRole("button", { name: "Siguiente →" });
    expect(next.style.fontSize).toBe("15px");
    expect(next.style.fontWeight).toBe("800");
    expect(next.style.padding).toBe("13px 24px");
    expect(next.style.textTransform).toBe("uppercase");
    expect(next.style.letterSpacing).toBe("0.06em");
    expect(next.style.borderRadius).toBe("14px");
    expect(next.style.background).toMatch(/#58cc02|rgb\(\s*88,\s*204,\s*2\s*\)/i);
    expect(next.style.color).toMatch(/#fff(?:fff)?|white|rgb\(\s*255,\s*255,\s*255\s*\)/i);
    expect(next.style.borderBottom).toMatch(/4px solid/i);
    expect(advance.style.marginBottom).toBe("10px");
    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollY).toBe(900);

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    const nav = await screen.findByRole("navigation", { name: "Navegación principal" });
    expect(nav.style.position).toBe("fixed");
    expect(nav.style.bottom).toBe("0px");
  });

  it("scrolls the new paragraph to the sticky header after NEXT, Back, and the paragraph jump", async () => {
    const { user, scrollTo } = await bootStory();
    const first = screen.getByTestId("lectura-paragraph-first").textContent;
    await user.click(screen.getByRole("button", { name: "Siguiente →" }));
    await waitFor(() => expect(screen.getByTestId("lectura-paragraph").textContent).not.toBe(first));
    expect(scrollY).toBe(900 + 820 - 72);
    expect(scrollTo).toHaveBeenCalledWith(0, 1648);

    scrollTo.mockClear();
    await user.click(screen.getByRole("button", { name: "← Anterior" }));
    await waitFor(() => expect(screen.getByTestId("lectura-paragraph-first")).toBeTruthy());
    const afterBack = 1648 + 820 - 72;
    expect(scrollY).toBe(afterBack);

    scrollTo.mockClear();
    await user.click(screen.getByRole("button", { name: "Párrafo 1" }));
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, afterBack + 820 - 72));
    expect(scrollY).toBe(afterBack + 820 - 72);
  });

  it("scrolls the question block to the readable top from the questions advance", async () => {
    const { user } = await bootStory();
    await user.click(screen.getByRole("button", { name: "Preguntas" }));
    await waitFor(() => expect(screen.getByTestId("lectura-questions")).toBeTruthy());
    expect(screen.queryByTestId("lectura-advance")).toBeNull();
    expect(scrollY).toBe(900 + 1100 - 72);
  });
});
