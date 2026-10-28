/** Scene 1 feature flag. `?scene1=1` turns it on, `?scene1=0` turns it off,
 *  both persist to localStorage. No query param reads the stored value.
 *  Flag off (the default, and byte-for-byte with no scene1 code at all)
 *  leaves App.jsx's existing Home screen untouched. */

export const SCENE1_FLAG_KEY = "andale-scene1-flag";
export const SCENE1_QUERY_PARAM = "scene1";

function readStorage(storage) {
  try {
    return storage || (typeof localStorage !== "undefined" ? localStorage : null);
  } catch {
    return null;
  }
}

/** "1"/"true" → on, "0"/"false" → off, anything else → not present. */
function parseFlagParam(value) {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}

/**
 * Reads the `?scene1=` query param first and persists it. Falls back to the
 * last persisted value. Returns a plain boolean, default false.
 */
export function readScene1Flag({ search, storage } = {}) {
  const store = readStorage(storage);
  const query = typeof search === "string" ? search : (typeof window !== "undefined" ? window.location.search : "");
  let params;
  try {
    params = new URLSearchParams(query || "");
  } catch {
    params = null;
  }
  const fromParam = params ? parseFlagParam(params.get(SCENE1_QUERY_PARAM)) : null;
  if (fromParam != null) {
    try { store?.setItem?.(SCENE1_FLAG_KEY, fromParam ? "1" : "0"); } catch { /* best effort */ }
    return fromParam;
  }
  try {
    return store?.getItem?.(SCENE1_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function isScene1Enabled(opts) {
  return readScene1Flag(opts) === true;
}
