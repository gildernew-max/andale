import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlossedText } from "./GlossedText.jsx";

const D = {
  ink: "#3C3C3C",
  card: "#FFFFFF",
  line: "#E5E5E5",
  sub: "#777777",
  blue: "#1CB0F6",
};

afterEach(() => cleanup());

const glossByKey = (key) => screen.getAllByTestId("gloss-word").find((el) => el.getAttribute("data-gloss-key") === key);

describe("GlossedText", () => {
  it("renders a one-line EN gloss on hover and tap for mapped words only", async () => {
    const user = userEvent.setup();
    render(<GlossedText text="Vendió su cosecha completa." uiLang="en" D={D} />);
    const word = glossByKey("cosecha");
    expect(word).toBeTruthy();
    expect(word.textContent).toMatch(/cosecha/);
    expect(word.tabIndex).toBe(0);
    expect(screen.queryByTestId("gloss-tip")).toBeNull();
    expect(screen.getAllByTestId("gloss-word")).toHaveLength(1);

    await user.hover(word);
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("harvest"));

    await user.unhover(word);
    await waitFor(() => expect(screen.queryByTestId("gloss-tip")).toBeNull());

    await user.click(word);
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("harvest"));
  });

  it("follows uiLang for the ES paraphrase and ignores unmapped words", async () => {
    const user = userEvent.setup();
    render(<GlossedText text="Vendió su cosecha completa y la mesa." uiLang="es" D={D} />);
    expect(glossByKey("cosecha")).toBeTruthy();
    expect(screen.getAllByTestId("gloss-word")).toHaveLength(1);
    expect(document.body.textContent).toMatch(/mesa/);

    glossByKey("cosecha").focus();
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("la recolección de ese año"));

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByTestId("gloss-tip")).toBeNull());
  });

  it("keeps George phrase stamps as one target", async () => {
    const user = userEvent.setup();
    render(<GlossedText text="sobre el comercio justo, una etiqueta" uiLang="en" D={D} />);
    const phrase = glossByKey("comercio justo");
    expect(phrase).toBeTruthy();
    expect(phrase.textContent).toMatch(/comercio\s+justo/);
    expect(screen.getAllByTestId("gloss-word")).toHaveLength(1);
    await user.hover(phrase);
    await waitFor(() => expect(screen.getByTestId("gloss-tip").textContent).toBe("fair trade"));
  });
});
