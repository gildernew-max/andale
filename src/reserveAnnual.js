/** Founding annual card on the soft paywall (No face page, Mon 2026-10-19:
 *  /workspace/andale-art/paywall-founding-annual-page.md). Never charges, no provider,
 *  no price-taking. Payments and Apple are on hold.
 *
 *  Where the email goes: the PR 171 waitlist sink, saveWaitlistNotice → localStorage
 *  "andale-waitlist" on this device only (Hand's final ruling). Nothing leaves the device.
 *  The funnel bus gets reserve_submit with plan + price only, never the address.
 *
 *  ALL WORDS LIVE HERE. One edit swaps them. Brand lines are No face's; RESERVE_NOTE is George's.
 */
import { ANNUAL_PRICE_PLACEHOLDER } from "./webPaywall.js";
import { dayKeyFromDate } from "./firstDoor.js";
import { isWaitlistEmail, saveWaitlistNotice } from "./waitlist.js";

export const RESERVE_PLAN = "annual";
export const RESERVE_PRICE = Number(ANNUAL_PRICE_PLACEHOLDER);
/** Day key only (no email) so a later visit the same day opens straight to Reserved. */
export const RESERVE_DAY_KEY = "andale-reserve-day";

export const RESERVE_WORDS = Object.freeze({
  es: Object.freeze({
    label: "PLAN ANUAL FUNDADOR",
    action: "Reservar mi lugar",
    small: "Hoy no se cobra nada.",
    saving: "US$43.89 menos que 12\u00A0meses a US$6.99",
    placeholder: "tu@correo.com",
    note: "Tu correo se guarda solo en este dispositivo para apartar tu lugar. Hoy no se cobra nada.",
    submit: "Reservar",
    error: "Revisa el correo.",
    doneTitle: "Listo. Tu lugar está apartado.",
    doneLine: "US$39.99 al año. Hoy no se cobra nada.",
    keepReading: "Seguir leyendo",
  }),
  en: Object.freeze({
    label: "FOUNDING ANNUAL",
    action: "Reserve my spot",
    small: "Nothing is charged today.",
    saving: "$43.89 less than 12\u00A0months at $6.99",
    placeholder: "you@email.com",
    note: "Your email is saved only on this device to hold your spot. Nothing is charged today.",
    submit: "Reserve",
    error: "Check the email.",
    doneTitle: "Done. Your spot is saved.",
    doneLine: "$39.99 a year. Nothing is charged today.",
    keepReading: "Keep reading",
  }),
});

export function reserveWords(lang) {
  return lang === "en" ? RESERVE_WORDS.en : RESERVE_WORDS.es;
}

/** Saving line arithmetic: 12 × monthly − annual, to the cent. */
export function reserveSaving(annual = RESERVE_PRICE, monthly = 6.99) {
  return Math.round((12 * monthly - annual) * 100) / 100;
}

/** closed (A) → open (B) → invalid (C) → done (D). */
export const RESERVE_STEP = Object.freeze({ closed: "closed", open: "open", invalid: "invalid", done: "done" });

function defaultStore() {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}

/** Validate, then save to the on-device waitlist sink. Returns the next step; never the email. */
export function submitReserve(email, storage, now = new Date()) {
  if (!isWaitlistEmail(email)) return RESERVE_STEP.invalid;
  const store = storage || defaultStore();
  const saved = saveWaitlistNotice(email, store);
  if (!saved.ok) return RESERVE_STEP.invalid;
  try { store.setItem(RESERVE_DAY_KEY, dayKeyFromDate(now)); } catch { /* D still shows this visit */ }
  return RESERVE_STEP.done;
}

/** Opening step for the sheet: D if a reserve was saved today on this device, else A. */
export function reserveStartStep(storage, now = new Date()) {
  const store = storage || defaultStore();
  try {
    if (store && store.getItem(RESERVE_DAY_KEY) === dayKeyFromDate(now)) return RESERVE_STEP.done;
  } catch { /* A */ }
  return RESERVE_STEP.closed;
}
