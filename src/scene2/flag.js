/** Scene 2 feature flag. `?scene2=1` turns it on, `?scene2=0` turns it off,
 *  both persist to localStorage. No query param reads the stored value.
 *  Flag off (the default, and byte-for-byte with no scene2 code at all)
 *  leaves App.jsx's existing screens untouched. Mirrors ../scene1/flag.js. */

export const SCENE2_FLAG_KEY = "andale-scene2-flag";
export const SCENE2_QUERY_PARAM = "scene2";

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
 * Reads the `?scene2=` query param first and persists it. Falls back to the
 * last persisted value. Returns a plain boolean, default false.
 */
export function readScene2Flag({ search, storage } = {}) {
  const store = readStorage(storage);
  const query = typeof search === "string" ? search : (typeof window !== "undefined" ? window.location.search : "");
  let params;
  try {
    params = new URLSearchParams(query || "");
  } catch {
    params = null;
  }
  const fromParam = params ? parseFlagParam(params.get(SCENE2_QUERY_PARAM)) : null;
  if (fromParam != null) {
    try { store?.setItem?.(SCENE2_FLAG_KEY, fromParam ? "1" : "0"); } catch { /* best effort */ }
    return fromParam;
  }
  try {
    return store?.getItem?.(SCENE2_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function isScene2Enabled(opts) {
  return readScene2Flag(opts) === true;
}
