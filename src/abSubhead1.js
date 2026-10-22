/** Paywall subhead A/B, test 1 (Steve/Hand, Oct 22): concurrent 50/50, client-side.
 *  One arm per browser, rolled on first need with Math.random() < 0.5 and kept in
 *  localStorage under AB_SUBHEAD1_KEY. Never re-rolled.
 *  No localStorage: the visitor sees A and no arm is sent.
 *  Kill switch off: everyone sees B and no arm is sent.
 *  The arm rides only paywall_seen, tap_annual and reserve_submit as `ab`.
 */
export const AB_SUBHEAD1_ON = true;
export const AB_SUBHEAD1_KEY = "andale_ab_subhead1";
export const AB_ARMS = Object.freeze(["A", "B"]);

/** Arm A is the live subhead before the test. Arm B lives in UI.paywallBody. */
export const SUBHEAD1_A = Object.freeze({
  es: "Todas las historias. Español mexicano de verdad, más allá de\u00A0lo\u00A0básico.",
  en: "Every story. Real Mexican Spanish, past\u00A0the\u00A0basics.",
});

let subhead1Roll = () => Math.random();
/** Test seam only: vitest setup pins the roll so older B-pinned tests stay deterministic. */
export function setSubhead1RollForTests(fn) {
  subhead1Roll = typeof fn === "function" ? fn : () => Math.random();
}

function defaultStorage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/** { render: "A" | "B", ab: "A" | "B" | null }. ab is null when nothing may be sent. */
export function subhead1Arm({ on = AB_SUBHEAD1_ON, storage, random = subhead1Roll } = {}) {
  if (!on) return { render: "B", ab: null };
  const store = storage === undefined ? defaultStorage() : storage;
  if (!store || typeof store.getItem !== "function" || typeof store.setItem !== "function") return { render: "A", ab: null };
  try {
    const saved = store.getItem(AB_SUBHEAD1_KEY);
    if (AB_ARMS.includes(saved)) return { render: saved, ab: saved };
    const arm = random() < 0.5 ? "A" : "B";
    store.setItem(AB_SUBHEAD1_KEY, arm);
    if (store.getItem(AB_SUBHEAD1_KEY) !== arm) return { render: "A", ab: null };
    return { render: arm, ab: arm };
  } catch {
    return { render: "A", ab: null };
  }
}

/** The arm field for an event payload, or undefined when none may be sent. */
export function subhead1AbField(opts) {
  const { ab } = subhead1Arm(opts);
  return ab || undefined;
}
