import { describe, expect, it } from "vitest";
import { STORIES, lookupStoryWord } from "./App.jsx";
import { wordSheetCopy } from "./wordSheet.js";

function shown(storyId, raw, lang) {
  const story = STORIES.find((item) => item.id === storyId);
  return wordSheetCopy(lookupStoryWord(story, raw), lang);
}

describe("lectura tap-a-word sheet language", () => {
  it("shows Spanish when the app is in Spanish and the original English when it is in English", () => {
    expect(shown("story-0", "flores", "es")).toEqual({
      meaning: "plantas con pétalos de colores",
      note: "",
    });
    expect(shown("story-0", "flores", "en")).toEqual({
      meaning: "flowers",
      note: "",
    });

    expect(shown("story-0", "cempasúchil", "es")).toEqual({
      meaning: "flor naranja del Día de Muertos",
      note: "La flor de los muertos; se dice que su aroma guía a las almas a casa.",
    });
    expect(shown("story-0", "cempasúchil", "en")).toEqual({
      meaning: "Mexican marigold",
      note: "The flower of the dead — its scent is said to guide souls home.",
    });

    expect(shown("story-8", "grito", "es")).toEqual({
      meaning: "voz muy fuerte",
      note: "«El Grito» recrea el 16 de septiembre el llamado de Hidalgo a la rebelión de 1810; el presidente lo da el 15 a las 11 de la noche, y cada pueblo y cada casa también.",
    });
    expect(shown("story-8", "grito", "en")).toEqual({
      meaning: "shout / cry",
      note: "«El Grito»: the September 16 reenactment of Hidalgo's 1810 call to revolt. The president does it Sept 15 at 11pm; every town and home does it too.",
    });
  });

  it("gives every story entry a Spanish meaning", () => {
    let count = 0;
    for (const story of STORIES) {
      for (const [key, entry] of Object.entries(story.glossary)) {
        expect(typeof entry.es, `${story.id} ${key}`).toBe("string");
        expect(entry.es.length, `${story.id} ${key}`).toBeGreaterThan(0);
        expect(entry[0], `${story.id} ${key}`).toBeTruthy();
        count += 1;
      }
    }
    expect(count).toBe(1313);
  });

  it("falls back to the English meaning when Spanish is missing and shows no note", () => {
    expect(wordSheetCopy({ en: "death", note: "keep" }, "es")).toEqual({ meaning: "death", note: "" });
    expect(wordSheetCopy({ en: "death", note: "keep", es: "" }, "es")).toEqual({ meaning: "death", note: "" });
    expect(wordSheetCopy({ en: "death", note: "keep", es: "fin de la vida" }, "en")).toEqual({
      meaning: "death",
      note: "keep",
    });
  });

  it("finds proper-noun entries when the tapped word is capitalized", () => {
    expect(shown("story-5", "Revolución", "es")).toEqual({
      meaning: "nombre de una avenida famosa de Tijuana",
      note: "",
    });
    expect(shown("story-5", "Revolución.", "en").meaning).toBe("Revolution");
    expect(lookupStoryWord(STORIES.find((item) => item.id === "story-5"), "Revolución").source).toBe("revolución");
    for (const story of STORIES) {
      for (const [key, entry] of Object.entries(story.glossary)) {
        if (key === key.toLowerCase()) continue;
        const found = lookupStoryWord(story, key);
        expect(found.en, `${story.id} ${key}`).toBe(entry[0]);
        expect(found.es, `${story.id} ${key}`).toBe(entry.es);
      }
    }
  });
});
