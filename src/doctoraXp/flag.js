/** Phrase Doctor first-win XP/gems feature flag. `?doctora=1` turns it on,
 *  `?doctora=0` turns it off, both persist to localStorage. No query param
 *  reads the stored value. Flag off (the default, in every mode) leaves the
 *  first-Doctora win screen's streak-only behavior untouched. */

export const DOCTORAXP_FLAG_KEY = "andale-doctora";
export const DOCTORAXP_QUERY_PARAM = "doctora";

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
 * Reads the `?doctora=` query param first and persists it. Falls back to
 * the last persisted value. Returns a plain boolean, default false (off by
 * default in every mode; ?doctora=1 opts in).
 */
export function readDoctoraXpFlag({ search, storage } = {}) {
  const store = readStorage(storage);
  const query = typeof search === "string" ? search : (typeof window !== "undefined" ? window.location.search : "");
  let params;
  try {
    params = new URLSearchParams(query || "");
  } catch {
    params = null;
  }
  const fromParam = params ? parseFlagParam(params.get(DOCTORAXP_QUERY_PARAM)) : null;
  if (fromParam != null) {
    try { store?.setItem?.(DOCTORAXP_FLAG_KEY, fromParam ? "1" : "0"); } catch { /* best effort */ }
    return fromParam;
  }
  try {
    return store?.getItem?.(DOCTORAXP_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function isDoctoraXpEnabled(opts) {
  return readDoctoraXpFlag(opts) === true;
}
