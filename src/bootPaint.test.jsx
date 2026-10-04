/**
 * Pre-bundle page paint. index.html reads andale-v3 before the module
 * script so a saved dark theme does not flash cream. The key holds the
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
  let escaped = null;
  try {
    vm.runInContext(script, dom.getInternalVMContext());
  } catch (e) {
    escaped = e;
  }
  const doc = dom.window.document;
  const injected = [...doc.querySelectorAll("style")].map((node) => node.textContent).join("\n");
  return {
    escaped,
    htmlBg: norm(doc.documentElement.style.background),
    bodyBg: doc.body ? norm(doc.body.style.background) : "",
    injected,
  };
};

describe("boot paint", () => {
  it("inline script exists in index.html before the module script", () => {
    expect(script).toContain('localStorage.getItem("andale-v3")');
    expect(script).not.toContain("andale-v3-live");
    expect(script).toContain(CREAM);
    expect(script).toContain(DARK);
    expect(indexHtml).toContain(`html,body{background:${CREAM}}`);
    expect(indexHtml).toContain("html,body,#root{margin:0;padding:0;width:100%;max-width:100%}");
    expect(indexHtml).toContain('<meta name="theme-color" content="#5C7356" />');
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
    for (const result of [minimal, progress]) {
      expect(result.escaped).toBeNull();
      expect(result.htmlBg).toBe(norm(DARK));
      expect(result.bodyBg).toBe(norm(DARK));
      expect(result.injected).toContain(`html,body{background:${DARK}}`);
    }
  });

  it("saved theme light paints cream", () => {
    const result = paint((window) => {
      window.localStorage.setItem("andale-v3", JSON.stringify({ theme: "light" }));
    });
    expect(result.escaped).toBeNull();
    expect(result.htmlBg).toBe(norm(CREAM));
    expect(result.bodyBg).toBe(norm(CREAM));
    expect(result.injected).toContain(`html,body{background:${CREAM}}`);
  });

  it("empty storage paints cream", () => {
    const empty = paint(() => {});
    const liveOnly = paint((window) => {
      window.localStorage.setItem("andale-v3-live", JSON.stringify({ theme: "dark", screen: "lesson" }));
    });
    for (const result of [empty, liveOnly]) {
      expect(result.escaped).toBeNull();
      expect(result.htmlBg).toBe(norm(CREAM));
      expect(result.bodyBg).toBe(norm(CREAM));
    }
  });

  it("corrupt JSON paints cream", () => {
    const result = paint((window) => {
      window.localStorage.setItem("andale-v3", "{theme:dark");
    });
    expect(result.escaped).toBeNull();
    expect(result.htmlBg).toBe(norm(CREAM));
    expect(result.bodyBg).toBe(norm(CREAM));
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
    expect(result.escaped).toBeNull();
    expect(result.htmlBg).toBe(norm(CREAM));
    expect(result.bodyBg).toBe(norm(CREAM));
  });
});
