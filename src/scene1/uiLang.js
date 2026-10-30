/** Scene 1 mounts before onboarding (App.jsx's `isScene1Enabled()` check comes
 *  before any onboarding or uiLang picker), so the usual "first visit keeps
 *  English" default never saw a choice get made. A saved andale-v3 uiLang
 *  still wins; absent that, follow the phone's language instead of hardcoding
 *  English — any es* tag (es, es-MX, es-419, ...) is Spanish, everything else
 *  is English. */

const STORAGE_KEY = "andale-v3";

function savedUiLang(storage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return saved?.uiLang === "en" || saved?.uiLang === "es" ? saved.uiLang : null;
  } catch {
    return null;
  }
}

function languageTagsFrom(nav) {
  if (nav?.languages?.length) return nav.languages;
  return nav?.language ? [nav.language] : [];
}

export function scene1DefaultUiLang({ storage, navigator: navOverride } = {}) {
  const store = storage || (typeof localStorage === "undefined" ? null : localStorage);
  const saved = savedUiLang(store);
  if (saved) return saved;
  const nav = navOverride || (typeof navigator === "undefined" ? null : navigator);
  const tags = languageTagsFrom(nav);
  return tags.some((tag) => typeof tag === "string" && tag.toLowerCase().startsWith("es")) ? "es" : "en";
}
