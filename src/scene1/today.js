/** `?date=YYYY-MM-DD` override, effective only when the Scene 1 flag is on.
 *  An invalid date (bad format, or a format that doesn't round-trip, e.g.
 *  2026-02-30) is ignored and today() falls back to the real clock. */

const DATE_PARAM = "date";
const DATE_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateParam(value) {
  const match = DATE_SHAPE.exec(String(value || ""));
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  const roundTrips = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  return roundTrips ? date : null;
}

/**
 * Returns a real-clock `new Date()` unless `scene1Enabled` is true and the
 * `?date=` query param parses to a valid calendar date, in which case that
 * date (at local midnight) is returned instead.
 */
export function today({ scene1Enabled, search } = {}) {
  if (!scene1Enabled) return new Date();
  const query = typeof search === "string" ? search : (typeof window !== "undefined" ? window.location.search : "");
  let params;
  try {
    params = new URLSearchParams(query || "");
  } catch {
    return new Date();
  }
  const parsed = parseDateParam(params.get(DATE_PARAM));
  return parsed || new Date();
}
