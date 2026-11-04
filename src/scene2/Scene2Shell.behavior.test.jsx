/** Brand-hold fixes on Scene 2: lime Start button, house ink/dark fill,
 *  cream-at-70%-on-dark quiet text, the es-MX cue rendering George's
 *  authored cueEs instead of an untranslated English instruction, and the
 *  step-forward wiring that makes chunks 2-5 reachable from the cue screen. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Scene2Shell from "./Scene2Shell.jsx";
import { SCENE2_CHUNKS, SCENE2_DONE } from "./copy.js";

async function finishScene(uiLang) {
  render(<Scene2Shell uiLang={uiLang} />);
  await userEvent.click(screen.getByTestId("scene2-start"));
  for (let i = 0; i < SCENE2_CHUNKS.length; i++) {
    await userEvent.click(screen.getByTestId("scene2-continue"));
  }
}

afterEach(() => {
  cleanup();
});

describe("Scene2Shell: brand hold", () => {
  it("Start/Empezar button is lime #58CC02 with dark-green #1F3A1A text", async () => {
    render(<Scene2Shell uiLang="es" />);
    const start = screen.getByTestId("scene2-start");
    expect(start.textContent).toBe("Empezar");
    expect(start.style.background).toBe("rgb(88, 204, 2)");
    expect(start.style.color).toBe("rgb(31, 58, 26)");
  });

  it("Seguir/Continue button is also lime #58CC02 with dark-green #1F3A1A text, same as Start", async () => {
    render(<Scene2Shell uiLang="es" />);
    await userEvent.click(screen.getByTestId("scene2-start"));
    const continueBtn = screen.getByTestId("scene2-continue");
    expect(continueBtn.textContent).toBe("Seguir");
    expect(continueBtn.style.background).toBe("rgb(88, 204, 2)");
    expect(continueBtn.style.color).toBe("rgb(31, 58, 26)");
  });

  it("light mode: body text is #1F3A1A", async () => {
    render(<Scene2Shell uiLang="es" theme="light" />);
    await userEvent.click(screen.getByTestId("scene2-start"));
    const cue = screen.getByTestId("scene2-cue");
    const headline = screen.getByText(SCENE2_CHUNKS[0].cueEs);
    expect(headline.style.color).toBe("rgb(31, 58, 26)");
    expect(cue.parentElement.parentElement.style.color).toBe("rgb(31, 58, 26)");
  });

  it("dark mode: background matches the house dark used by Scene 1 (#15171C), not an invented value", async () => {
    render(<Scene2Shell uiLang="es" theme="dark" />);
    const shell = screen.getByTestId("scene2-shell");
    expect(shell.style.background).toBe("rgb(21, 23, 28)"); // #15171C
  });

  it("dark mode: the 1/5 counter and the English gloss are cream #F6EFE4 at ~70% opacity", async () => {
    render(<Scene2Shell uiLang="es" theme="dark" />);
    await userEvent.click(screen.getByTestId("scene2-start"));
    const cue = screen.getByTestId("scene2-cue");
    const counter = cue.firstChild;
    expect(counter.textContent).toBe("1/5");
    expect(counter.style.color).toBe("rgba(246, 239, 228, 0.7)");
    const gloss = screen.getByText(SCENE2_CHUNKS[0].en);
    expect(gloss.style.color).toBe("rgba(246, 239, 228, 0.7)");
  });
});

describe("Scene2Shell: es-MX cue language", () => {
  it("renders the chunk's authored cueEs as the cue, not the English cueEn instruction", async () => {
    render(<Scene2Shell uiLang="es" />);
    await userEvent.click(screen.getByTestId("scene2-start"));
    const cue = screen.getByTestId("scene2-cue");
    expect(cue.textContent).toContain(SCENE2_CHUNKS[0].cueEs);
    expect(cue.textContent).not.toContain(SCENE2_CHUNKS[0].cueEn);
  });

  it("English UI still shows the authored cueEn instruction plus the Spanish target line", async () => {
    render(<Scene2Shell uiLang="en" />);
    await userEvent.click(screen.getByTestId("scene2-start"));
    const cue = screen.getByTestId("scene2-cue");
    expect(cue.textContent).toContain(SCENE2_CHUNKS[0].cueEn);
    expect(cue.textContent).toContain(SCENE2_CHUNKS[0].es);
  });
});

describe("Scene2Shell: step-forward reaches chunks 2-5", () => {
  it("tapping Continue/Seguir walks through every chunk, then finishes", async () => {
    render(<Scene2Shell uiLang="es" />);
    await userEvent.click(screen.getByTestId("scene2-start"));

    for (let i = 0; i < SCENE2_CHUNKS.length; i++) {
      const cue = screen.getByTestId("scene2-cue");
      expect(cue.textContent).toContain(SCENE2_CHUNKS[i].cueEs);
      expect(cue.textContent).toContain(`${i + 1}/${SCENE2_CHUNKS.length}`);
      await userEvent.click(screen.getByTestId("scene2-continue"));
    }

    expect(screen.getByTestId("scene2-done")).toBeTruthy();
  });
});

describe("Scene2Shell: done screen (George, exact strings)", () => {
  it("es: shows the bird above a bordered done box with George's one line and a lime Seguir button", async () => {
    await finishScene("es");
    const bird = screen.getByTestId("scene2-done-bird");
    expect(bird.tagName).toBe("IMG");
    const box = screen.getByTestId("scene2-done-box");
    expect(box.compareDocumentPosition(bird) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(screen.getByTestId("scene2-done-line").textContent).toBe(SCENE2_DONE.es);
    const continueBtn = screen.getByTestId("scene2-done-continue");
    expect(continueBtn.textContent).toBe("Seguir");
    expect(continueBtn.style.background).toBe("rgb(88, 204, 2)");
    expect(continueBtn.style.color).toBe("rgb(31, 58, 26)");
  });

  it("en: shows George's exact English line and a Continue button", async () => {
    await finishScene("en");
    expect(screen.getByTestId("scene2-done-line").textContent).toBe(SCENE2_DONE.en);
    expect(screen.getByTestId("scene2-done-continue").textContent).toBe("Continue");
  });
});
