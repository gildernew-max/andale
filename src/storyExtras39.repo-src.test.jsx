// Run from repo root: npx vitest run src/storyExtras39.repo-src.test.jsx
// Uses the app's own STORIES, lookupStoryWord, and segmentGlossText; hitKey mirrors App.jsx ~L12757.
import { describe, it, expect } from "vitest";
import { STORIES, STORY_EXTRAS, lookupStoryWord } from "./App.jsx";
import { segmentGlossText } from "./storyGloss.js";
const STORY_EXTRAS_3_9 = Object.fromEntries(["story-3", "story-4", "story-5", "story-6", "story-7", "story-8", "story-9"].map((id) => [id, STORY_EXTRAS[id]]));

const cleanStoryToken = (raw) => raw.toLowerCase().replace(/[^a-záéíóúüñ]/gi, "");

describe("story 3-9 hunts + checkpoints", () => {
  for (const [id, extra] of Object.entries(STORY_EXTRAS_3_9)) {
    const story = STORIES.find((s) => s.id === id);
    it(`${id}: every key word is reachable by a tap`, () => {
      expect(story).toBeTruthy();
      const hits = new Set();
      story.paragraphs.forEach((para) => {
        for (const seg of segmentGlossText(para)) {
          if (!seg.raw || /^\s+$/.test(seg.raw)) continue;
          const def = lookupStoryWord(story, seg.raw);
          const clean = cleanStoryToken(seg.raw);
          const hitKey = extra.keyWords.includes(def?.source) ? def.source : extra.keyWords.includes(clean) ? clean : null;
          if (hitKey) hits.add(hitKey);
        }
      });
      expect(extra.keyWords).toHaveLength(8);
      expect(extra.keyWords.filter((w) => !hits.has(w))).toEqual([]);
    });
    it(`${id}: one well-formed checkpoint per page`, () => {
      expect(extra.checkpoints).toHaveLength(story.paragraphs.length);
      expect(extra.en).toHaveLength(story.paragraphs.length);
      for (const cp of extra.checkpoints) {
        expect(cp.choices).toHaveLength(3);
        expect(cp.choices).toContain(cp.a);
        expect(new Set(cp.choices).size).toBe(3);
        expect(cp.choicesEs).toHaveLength(3);
        expect(cp.qEs.trim()).not.toBe("");
      }
    });
  }

  it("story-1 checkpoint 6 shows Spanish choices (same words)", () => {
    const cp = STORY_EXTRAS["story-1"].checkpoints[5];
    expect(cp.choicesEs).toEqual(["Viva la vida", "Casa Azul", "Adiós"]);
  });
});
