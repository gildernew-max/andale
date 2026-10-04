/**
 * Saved light or dark always wins. Anything else is not a choice:
 * the phone's prefers-color-scheme decides, and light is the fallback.
 * Callers must not persist the result. An unsaved learner keeps
 * following the phone until they pick a theme in the app.
 */
export function resolveTheme(saved, matchMedia) {
  if (saved === "light" || saved === "dark") return saved;
  const query = arguments.length > 1
    ? matchMedia
    : (typeof window !== "undefined" ? window.matchMedia : undefined);
  if (typeof query !== "function") return "light";
  try {
    const media = query("(prefers-color-scheme: dark)");
    return media && media.matches === true ? "dark" : "light";
  } catch {
    return "light";
  }
}
