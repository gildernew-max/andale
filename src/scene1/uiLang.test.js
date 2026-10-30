import { describe, expect, it } from "vitest";
import { scene1DefaultUiLang } from "./uiLang.js";

function storageWith(value) {
  const map = new Map(value == null ? [] : [["andale-v3", JSON.stringify(value)]]);
  return { getItem: (k) => (map.has(k) ? map.get(k) : null) };
}

describe("scene1DefaultUiLang", () => {
  it("a saved uiLang wins over the phone's language", () => {
    expect(scene1DefaultUiLang({ storage: storageWith({ uiLang: "en" }), navigator: { language: "es-MX" } })).toBe("en");
    expect(scene1DefaultUiLang({ storage: storageWith({ uiLang: "es" }), navigator: { language: "en-US" } })).toBe("es");
  });

  it("no saved uiLang: any es* phone language is Spanish", () => {
    expect(scene1DefaultUiLang({ storage: storageWith(null), navigator: { language: "es-MX" } })).toBe("es");
    expect(scene1DefaultUiLang({ storage: storageWith(null), navigator: { language: "es" } })).toBe("es");
    expect(scene1DefaultUiLang({ storage: storageWith(null), navigator: { language: "es-419" } })).toBe("es");
  });

  it("no saved uiLang: a non-Spanish phone language is English", () => {
    expect(scene1DefaultUiLang({ storage: storageWith(null), navigator: { language: "en-US" } })).toBe("en");
    expect(scene1DefaultUiLang({ storage: storageWith(null), navigator: { language: "fr-FR" } })).toBe("en");
  });

  it("checks navigator.languages before the single navigator.language", () => {
    expect(scene1DefaultUiLang({ storage: storageWith(null), navigator: { languages: ["es-ES", "en-US"], language: "en-US" } })).toBe("es");
  });

  it("an invalid saved uiLang (e.g. not yet chosen) falls back to the phone", () => {
    expect(scene1DefaultUiLang({ storage: storageWith({ uiLang: "xx" }), navigator: { language: "es-MX" } })).toBe("es");
  });

  it("no navigator info at all defaults to English", () => {
    expect(scene1DefaultUiLang({ storage: storageWith(null), navigator: {} })).toBe("en");
  });
});
