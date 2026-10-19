import assert from "node:assert/strict";
import { RESERVE_WORDS, RESERVE_PLAN, RESERVE_PRICE, RESERVE_STEP, RESERVE_DAY_KEY, reserveWords, reserveSaving, submitReserve, reserveStartStep } from "./reserveAnnual.js";
import { WAITLIST_STORE_KEY } from "./waitlist.js";
import { emitFunnelEvent, FUNNEL_EVENTS } from "./funnel.js";

assert.equal(RESERVE_PLAN, "annual");
assert.equal(RESERVE_PRICE, 39.99);
assert.equal(reserveSaving(), 43.89);
assert.ok(RESERVE_WORDS.es.saving.includes("43.89") && RESERVE_WORDS.en.saving.includes("43.89"));
assert.equal(RESERVE_WORDS.es.label, "PLAN ANUAL FUNDADOR");
assert.equal(RESERVE_WORDS.en.action, "Reserve my spot");
assert.equal(RESERVE_WORDS.es.action, "Reservar mi lugar");
assert.equal(RESERVE_WORDS.en.note, "Your email is saved only on this device to hold your spot. Nothing is charged today.");
assert.equal(RESERVE_WORDS.es.note, "Tu correo se guarda solo en este dispositivo para apartar tu lugar. Hoy no se cobra nada.");
assert.equal(RESERVE_WORDS.es.error, "Revisa el correo.");
assert.equal(RESERVE_WORDS.en.error, "Check the email.");
assert.equal(RESERVE_WORDS.es.doneTitle, "Listo. Tu lugar está apartado.");
assert.equal(RESERVE_WORDS.en.doneLine, "$39.99 a year. Nothing is charged today.");
for (const lang of ["es", "en"]) {
  const all = Object.values(RESERVE_WORDS[lang]).join(" ");
  assert.ok(!/TBD|GEORGE_LINE|te escrib|avis|we.ll (email|write)|notify/i.test(all), `${lang}: no placeholder and no contact promise`);
}
assert.equal(reserveWords("en"), RESERVE_WORDS.en);
assert.equal(reserveWords("es"), RESERVE_WORDS.es);

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const s1 = mem();
const day = new Date(2026, 9, 19, 12);
assert.equal(reserveStartStep(s1, day), RESERVE_STEP.closed);
assert.equal(submitReserve("nope", s1, day), RESERVE_STEP.invalid);
assert.equal(s1.getItem(WAITLIST_STORE_KEY), null);
assert.equal(submitReserve(" a@b.co ", s1, day), RESERVE_STEP.done);
assert.deepEqual(JSON.parse(s1.getItem(WAITLIST_STORE_KEY)), { email: "a@b.co" });
assert.ok(!String(s1.getItem(RESERVE_DAY_KEY)).includes("@"));
assert.equal(reserveStartStep(s1, day), RESERVE_STEP.done);
assert.equal(reserveStartStep(s1, new Date(2026, 9, 20, 12)), RESERVE_STEP.closed);

assert.equal(FUNNEL_EVENTS.reserveSubmit, "reserve_submit");
assert.equal(FUNNEL_EVENTS.reserveTap, undefined);
const bus = { dispatchEvent() {} };
const sub = emitFunnelEvent({ event: FUNNEL_EVENTS.reserveSubmit, plan: "annual", price: 39.99, email: "a@b.co" }, bus);
assert.deepEqual(Object.keys(sub).sort(), ["at", "event", "plan", "price"]);
const junk = emitFunnelEvent({ event: FUNNEL_EVENTS.reserveSubmit, plan: "monthly", price: 1 }, bus);
assert.deepEqual(Object.keys(junk).sort(), ["at", "event"]);
console.log("reserveAnnual: ok");
