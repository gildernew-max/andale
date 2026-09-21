/** Quiet email notice under the soft paywall. George Words CLEAR 2026-09-21.
 *  Brand CLEAR 2026-09-21 — No face. One uiLang face. Soft chrome parked.
 *  Local store only. Never put the address on the funnel bus.
 */

export const WAITLIST_STORE_KEY = "andale-waitlist";

/** ASC privacy URL. Use this only if the strip shows a Privacy Policy link. */
export const WAITLIST_PRIVACY_URL = "https://gildernew-max.github.io/andale/privacy.html";

export const WAITLIST_PROMPT = {
  es: "Avísame cuando abramos la tienda",
  en: "Tell me when the store opens",
};
export const WAITLIST_PLACEHOLDER = {
  es: "Tu correo",
  en: "Your email",
};
export const WAITLIST_CTA = {
  es: "Avisarme",
  en: "Notify me",
};
export const WAITLIST_SUCCESS = {
  es: "Listo. Te escribo cuando esté listo.",
  en: "Got it. I\u2019ll write when it\u2019s ready.",
};
export const WAITLIST_ERROR = {
  es: "Revisa el correo",
  en: "Check the email",
};
export const WAITLIST_PRIVACY = {
  es: "Solo para el aviso de apertura. Sin spam.",
  en: "Launch notice only. No spam.",
};

function face(row, lang) {
  return lang === "en" ? row.en : row.es;
}

export function waitlistPrompt(lang) {
  return face(WAITLIST_PROMPT, lang);
}

export function waitlistPlaceholder(lang) {
  return face(WAITLIST_PLACEHOLDER, lang);
}

export function waitlistCta(lang) {
  return face(WAITLIST_CTA, lang);
}

export function waitlistSuccess(lang) {
  return face(WAITLIST_SUCCESS, lang);
}

export function waitlistError(lang) {
  return face(WAITLIST_ERROR, lang);
}

export function waitlistPrivacy(lang) {
  return face(WAITLIST_PRIVACY, lang);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isWaitlistEmail(value) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s || s.length > 254) return false;
  return EMAIL_RE.test(s);
}

function defaultStore() {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

/** Keep the address on this device for the launch notice. Return value has no email. */
export function saveWaitlistNotice(email, storage) {
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (!isWaitlistEmail(trimmed)) return { ok: false };
  const store = storage || defaultStore();
  if (!store || typeof store.setItem !== "function") return { ok: false };
  try {
    store.setItem(WAITLIST_STORE_KEY, JSON.stringify({ email: trimmed }));
  } catch {
    return { ok: false };
  }
  return { ok: true };
}
