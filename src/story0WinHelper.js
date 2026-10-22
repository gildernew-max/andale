/** Story-0 end card → «¡Eso!» → CONTINUE → (day-1 card once) → La casa azul from Lectura. Shared by flow tests. */
import { screen, waitFor } from "@testing-library/react";
import { expect } from "vitest";

export async function passStory0Win(user, { openStory1 = true } = {}) {
  await waitFor(() => expect(screen.getByTestId("story-0-win")).toBeTruthy());
  expect(screen.queryByTestId("soft-paywall")).toBeNull();
  await user.click(screen.getByTestId("story-0-win-continue"));
  const wall = await screen.findByTestId("soft-paywall", {}, { timeout: 3000 }).catch(() => null);
  if (wall) {
    await user.click(screen.getByTestId("soft-paywall-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("soft-paywall")).toBeNull());
  }
  if (!openStory1) return wall;
  await waitFor(() => expect(screen.getByTestId("nav-lectura")).toBeTruthy());
  await user.click(screen.getByTestId("nav-lectura"));
  const tile = await screen.findByTestId("story-shelf-story-1", {}, { timeout: 3000 }).catch(() => null);
  if (tile) await user.click(tile);
  await waitFor(() => expect(screen.getByTestId("story-reader").getAttribute("data-story-id")).toBe("story-1"));
  return wall;
}
