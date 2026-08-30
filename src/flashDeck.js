export const FLASH_SESSION_CAP = 12;

const cardKey = (s) => String(s || "").toLowerCase().trim().replace(/[¿?¡!.,;:—–-]/g, " ").replace(/\s+/g, " ").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Snapshot a finite unique flashcard deck. No wrap, no resample. */
export function buildFlashDeck(p, units = [], cap = FLASH_SESSION_CAP) {
  const now = Date.now();
  const saved = Object.values(p?.flashcards || {});
  const dueSaved = saved.filter((c) => (c.due || 0) <= now).sort((a, b) => (a.due || 0) - (b.due || 0));
  const laterSaved = saved.filter((c) => (c.due || 0) > now).sort((a, b) => (a.due || 0) - (b.due || 0));
  const started = Object.keys(p?.done || {}).filter((id) => (p.done[id] || 0) > 0);
  const dueSrsUnits = [...new Set(Object.entries(p?.srs || {}).filter(([, it]) => (it.due || 0) <= now).map(([k]) => k.split("|")[0]))];
  const mistakeUnits = [...new Set((p?.mistakes || []).map((m) => m.u || m.unitId).filter(Boolean))];
  const unitIds = [];
  const pushUid = (id) => { if (id && !unitIds.includes(id)) unitIds.push(id); };
  dueSrsUnits.forEach(pushUid);
  mistakeUnits.forEach(pushUid);
  started.forEach(pushUid);
  units.forEach((u) => pushUid(u.id));
  const pairCards = [];
  unitIds.forEach((uid) => {
    const u = units.find((x) => x.id === uid);
    (u?.pairs || []).forEach((pr) => {
      const es = Array.isArray(pr) ? pr[0] : pr?.es;
      const en = Array.isArray(pr) ? pr[1] : pr?.en;
      if (!es || !en) return;
      pairCards.push({ word: es, en, note: "", story: u.title, sentence: "", added: now, due: now, interval: 0, reps: 0 });
    });
  });
  const seen = new Set();
  const deck = [];
  const pushCard = (c) => {
    const k = cardKey(c.word);
    if (!k || seen.has(k)) return;
    seen.add(k);
    deck.push(c);
  };
  dueSaved.forEach(pushCard);
  laterSaved.forEach(pushCard);
  pairCards.forEach(pushCard);
  return deck.slice(0, Math.min(cap, deck.length));
}

export function flashSessionDone(run) {
  if (!run || !Array.isArray(run.deck)) return true;
  return !!run.done || (run.idx || 0) >= run.deck.length;
}

export function advanceFlashRun(run, earned = 0) {
  if (!run || run.done) return run;
  const next = (run.idx || 0) + 1;
  const xpEarned = (run.xpEarned || 0) + earned;
  const reviewed = (run.reviewed || 0) + 1;
  if (next >= (run.deck || []).length) return { ...run, idx: next, done: true, reviewed, xpEarned };
  return { ...run, idx: next, done: false, reviewed, xpEarned };
}
