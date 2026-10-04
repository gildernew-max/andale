/**
 * Pre-bundle page paint. index.html reads andale-v3 before the module
 * script so a saved dark theme does not flash cream. With no saved
 * light or dark choice, a phone that prefers dark gets the dark page.
 * That derived choice is not written into the save. The key holds the
 * progress object itself ({ theme: "light" | "dark", ... }), not the
 * { value } wrapper storage.get returns, and not andale-v3-live.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { ONBOARDING_PAINT } from "./onboarding.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = readFileSync(join(repoRoot, "index.html"), "utf8");
const appSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.jsx"), "utf8");

const CREAM = ONBOARDING_PAINT.light.page;
const DARK = ONBOARDING_PAINT.dark.page;

const norm = (value) => {
  const s = String(value || "").trim().toLowerCase();
  const hex = s.match(/#([0-9a-f]{6})/);
  if (hex) return `#${hex[1]}`;
  const rgb = s.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (!rgb) return s;
  return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
};

const bootScript = (html) => {
  const moduleAt = html.search(/<script\s+type=["']module["']/);
  expect(moduleAt, "module script").toBeGreaterThan(0);
  const before = html.slice(0, moduleAt);
  const blocks = [...before.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  expect(blocks, "one inline script before the module script").toHaveLength(1);
  return blocks[0][1];
};

const script = bootScript(indexHtml);

const paint = (prepare) => {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "http://localhost/",
    runScripts: "outside-only",
  });
  prepare(dom.window);
  installThemeMetas(dom.window);
  let escaped = null;
  try {
    vm.runInContext(script, dom.getInternalVMContext());
  } catch (e) {
    escaped = e;
  }
  const doc = dom.window.document;
  const injected = [...doc.querySelectorAll("style")].map((node) => node.textContent).join("\n");
  const metas = [...doc.querySelectorAll('meta[name="theme-color"]')];
  return {
    escaped,
    htmlBg: norm(doc.documentElement.style.background),
    bodyBg: doc.body ? norm(doc.body.style.background) : "",
    injected,
    themeColors: metas.map((node) => node.getAttribute("content")),
    themeMedia: metas.map((node) => node.getAttribute("media")),
  };
};

const installThemeMetas = (window) => {
  const add = (content, media) => {
    const meta = window.document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", content);
    meta.setAttribute("media", media);
    window.document.head.appendChild(meta);
  };
  add(CREAM, "(prefers-color-scheme: light)");
  add(DARK, "(prefers-color-scheme: dark)");
};

const expectResolved = (result, color) => {
  expect(result.escaped).toBeNull();
  expect(result.htmlBg).toBe(norm(color));
  expect(result.bodyBg).toBe(norm(color));
  expect(result.injected).toContain(`html,body{background:${color}}`);
  expect(result.themeColors.length).toBeGreaterThan(0);
  for (const value of result.themeColors) expect(value).toBe(color);
  for (const media of result.themeMedia) expect(media).toBeNull();
};

describe("boot paint", () => {
  it("inline script exists in index.html before the module script", () => {
    expect(script).toContain('localStorage.getItem("andale-v3")');
    expect(script).not.toContain("andale-v3-live");
    expect(script).toContain("prefers-color-scheme: dark");
    expect(script).toContain(CREAM);
    expect(script).toContain(DARK);
    expect(indexHtml).toContain(`html,body{background:${CREAM}}`);
    expect(indexHtml).toContain(`@media (prefers-color-scheme: dark){html,body{background:${DARK}}}`);
    expect(indexHtml).toContain("html,body,#root{margin:0;padding:0;width:100%;max-width:100%}");
    expect(indexHtml).toContain(`<meta name="theme-color" content="${CREAM}" media="(prefers-color-scheme: light)" />`);
    expect(indexHtml).toContain(`<meta name="theme-color" content="${DARK}" media="(prefers-color-scheme: dark)" />`);
    expect(indexHtml).not.toContain('content="#5C7356"');
    const styleAt = indexHtml.indexOf("<style>");
    const scriptAt = indexHtml.indexOf("<script>");
    expect(styleAt).toBeGreaterThan(0);
    expect(styleAt).toBeLessThan(scriptAt);
  });

  it("colors match ONBOARDING_PAINT, HUB_CREAM, and D_DARK.bg", () => {
    const hub = appSrc.match(/const HUB_CREAM = "(#[0-9A-Fa-f]{6})"/);
    expect(hub, "HUB_CREAM").toBeTruthy();
    expect(hub[1]).toBe(CREAM);
    const lightBlock = appSrc.slice(appSrc.indexOf("const D_LIGHT = {"), appSrc.indexOf("const D_DARK = {"));
    expect(lightBlock).toMatch(/bg:\s*HUB_CREAM/);
    const darkBlock = appSrc.slice(appSrc.indexOf("const D_DARK = {"), appSrc.indexOf("const D_DARK = {") + 900);
    const darkBg = darkBlock.match(/bg:\s*"(#[0-9A-Fa-f]{6})"/);
    expect(darkBg, "D_DARK.bg").toBeTruthy();
    expect(darkBg[1]).toBe(DARK);
    expect(CREAM).toBe("#F6EFE4");
    expect(DARK).toBe("#15171C");
  });

  it("saved theme dark paints the dark page", () => {
    const minimal = paint((window) => {
      window.localStorage.setItem("andale-v3", JSON.stringify({ theme: "dark" }));
    });
    const progress = paint((window) => {
      window.localStorage.setItem("andale-v3", JSON.stringify({
        xp: 40,
        theme: "dark",
        contentVersion: 2,
        welcomed: true,
      }));
    });
    for (const result of [minimal, progress]) expectResolved(result, DARK);
  });

  it("saved theme light paints cream", () => {
    const result = paint((window) => {
      window.localStorage.setItem("andale-v3", JSON.stringify({ theme: "light" }));
    });
    expectResolved(result, CREAM);
  });

  const phone = (dark) => (query) => ({
    matches: dark === true && String(query).includes("prefers-color-scheme: dark"),
    media: query,
  });

  it("no saved theme on a dark phone paints the dark page", () => {
    const result = paint((window) => {
      window.matchMedia = phone(true);
    });
    expectResolved(result, DARK);
  });

  it("no saved theme on a light phone paints cream", () => {
    const result = paint((window) => {
      window.matchMedia = phone(false);
    });
    expectResolved(result, CREAM);
  });

  it("saved light on a dark phone paints cream", () => {
    const result = paint((window) => {
      window.localStorage.setItem("andale-v3", JSON.stringify({ theme: "light", streak: 4 }));
      window.matchMedia = phone(true);
    });
    expectResolved(result, CREAM);
  });

  it("saved dark on a light phone paints the dark page", () => {
    const result = paint((window) => {
      window.localStorage.setItem("andale-v3", JSON.stringify({ theme: "dark" }));
      window.matchMedia = phone(false);
    });
    expectResolved(result, DARK);
  });

  it("missing matchMedia with empty storage paints cream", () => {
    const result = paint((window) => {
      window.matchMedia = undefined;
    });
    expectResolved(result, CREAM);
  });

  it("empty storage paints cream", () => {
    const empty = paint(() => {});
    const liveOnly = paint((window) => {
      window.localStorage.setItem("andale-v3-live", JSON.stringify({ theme: "dark", screen: "lesson" }));
    });
    for (const result of [empty, liveOnly]) expectResolved(result, CREAM);
  });

  it("corrupt JSON paints cream", () => {
    const result = paint((window) => {
      window.localStorage.setItem("andale-v3", "{theme:dark");
    });
    expectResolved(result, CREAM);
  });

  it("localStorage throwing paints cream and does not throw", () => {
    const result = paint((window) => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new Error("storage unavailable");
        },
      });
    });
    expectResolved(result, CREAM);
  });
});
