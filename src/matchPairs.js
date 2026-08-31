export const MATCH_ROUND_CAP = 6;
/** One review/practice item (4 XP). Not the lesson 10/12 rate and no +5 perfect. */
export const MATCH_PRACTICE_XP = 4;

const pairKey = (s) => String(s || "").toLowerCase().trim().replace(/[¿?¡!.,;:—–-]/g, " ").replace(/\s+/g, " ").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function normalizePair(pr) {
  const es = Array.isArray(pr) ? pr[0] : pr?.es;
  const en = Array.isArray(pr) ? pr[1] : pr?.en;
  if (!es || !en) return null;
  return [String(es), String(en)];
}

const shuffle = (arr, rng = Math.random) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Snapshot a finite unique match round from unit `pairs`. No wrap, no resample. */
export function buildMatchRound(p, units = [], cap = MATCH_ROUND_CAP) {
  const started = Object.keys(p?.done || {}).filter((id) => (p.done[id] || 0) > 0);
  const dueSrsUnits = [...new Set(Object.entries(p?.srs || {}).filter(([, it]) => (it.due || 0) <= Date.now()).map(([k]) => k.split("|")[0]))];
  const mistakeUnits = [...new Set((p?.mistakes || []).map((m) => m.u || m.unitId).filter(Boolean))];
  const unitIds = [];
  const pushUid = (id) => { if (id && !unitIds.includes(id)) unitIds.push(id); };
  dueSrsUnits.forEach(pushUid);
  mistakeUnits.forEach(pushUid);
  started.forEach(pushUid);
  units.forEach((u) => pushUid(u.id));

  const takeFrom = (uid) => {
    const u = units.find((x) => x.id === uid);
    const seen = new Set();
    const pairs = [];
    (u?.pairs || []).forEach((pr) => {
      const n = normalizePair(pr);
      if (!n) return;
      const k = pairKey(n[0]);
      if (!k || seen.has(k)) return;
      seen.add(k);
      pairs.push(n);
    });
    return pairs;
  };

  for (const uid of unitIds) {
    const pairs = takeFrom(uid);
    if (pairs.length >= 2) return pairs.slice(0, Math.min(cap, pairs.length));
  }
  const seen = new Set();
  const mixed = [];
  unitIds.forEach((uid) => {
    takeFrom(uid).forEach((n) => {
      const k = pairKey(n[0]);
      if (!k || seen.has(k)) return;
      seen.add(k);
      mixed.push(n);
    });
  });
  return mixed.slice(0, Math.min(cap, mixed.length));
}

export function dealMatchTiles(pairs, rng = Math.random) {
  const left = shuffle((pairs || []).map((pr, i) => ({ t: pr[0], id: i })), rng);
  const right = shuffle((pairs || []).map((pr, i) => ({ t: pr[1], id: i })), rng);
  return { left, right };
}

export function startMatchRun(pairs, rng = Math.random) {
  const dealt = dealMatchTiles(pairs || [], rng);
  return {
    pairs: pairs || [],
    left: dealt.left,
    right: dealt.right,
    matched: [],
    sel: null,
    done: false,
    awarded: false,
    xp: 0,
  };
}

export function matchRoundDone(run) {
  if (!run || !Array.isArray(run.pairs)) return true;
  return !!run.done || (run.matched?.length || 0) >= run.pairs.length;
}

/** Tap one column. Same-id tiles match. Last pair ends the run — no wrap. */
export function applyMatchPick(run, side, id) {
  if (!run || run.done || !Array.isArray(run.pairs)) return run;
  if ((run.matched || []).includes(id)) return run;
  if (!run.sel) return { ...run, sel: { side, id }, miss: false, lastWrong: null };
  if (run.sel.side === side) return { ...run, sel: { side, id }, miss: false, lastWrong: null };
  if (run.sel.id === id) {
    const matched = [...(run.matched || []), id];
    const done = matched.length >= run.pairs.length;
    return { ...run, matched, sel: null, miss: false, lastWrong: null, done };
  }
  return { ...run, sel: null, miss: true, lastWrong: { a: run.sel, b: { side, id } } };
}
