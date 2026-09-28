/** Optional email on the first Hoy Cenzontle win. Skip never blocks Lectura.
 *  One uiLang face. Spanish is the fallback. The address never goes on the funnel bus.
 *
 *  FIRST_WIN_EMAIL_ENDPOINT is empty unless VITE_FIRST_WIN_EMAIL_ENDPOINT is
 *  set at build time. Empty means a submitted address is written only to
 *  localStorage key `andale-waitlist` on this device. No service receives it.
 *  Nobody outside this browser can read it. Nothing is sold. No email is sent.
 *
 *  To turn the collector on later: deploy docs/first-win-email-collector.gs
 *  by hand, then set VITE_FIRST_WIN_EMAIL_ENDPOINT to that web app URL and
 *  rebuild. This repo does not deploy it.
 */

import { isWaitlistEmail, saveWaitlistNotice } from "./waitlist.js";

function endpointFromEnv() {
  const env = import.meta.env;
  const value = env && env.VITE_FIRST_WIN_EMAIL_ENDPOINT;
  return typeof value === "string" ? value.trim() : "";
}

/** Build-time web app URL. Empty = localStorage only. */
export const FIRST_WIN_EMAIL_ENDPOINT = endpointFromEnv();

export const FIRST_WIN_EMAIL_SOURCE = "first-win";

export const FIRST_WIN_EMAIL_SEEN = "firstWinEmailSeen";

/** Dark card spec. Sage is the card border. Cream ink carries the labels. */
export const FIRST_WIN_EMAIL_DARK = Object.freeze({
  page: "#15171C",
  card: "#1E2128",
  ink: "#F6EFE4",
  sage: "#6F7757",
  inputBorder: "#2A2E36",
  focus: "#B8C0A0",
});

/** Avísame fill. Adult sage, cream label. Not the green primary. */
export const FIRST_WIN_EMAIL_FILL = "#5C7356";
export const FIRST_WIN_EMAIL_FILL_INK = "#F6EFE4";

export const FIRST_WIN_EMAIL_INVITE = {
  es: "Déjanos tu correo y te avisamos cuando haya historias nuevas.",
  en: "Leave your email and we'll tell you when new stories are out.",
};
export const FIRST_WIN_EMAIL_PLACEHOLDER = {
  es: "tu@correo.com",
  en: "you@email.com",
};
export const FIRST_WIN_EMAIL_CTA = {
  es: "Avísame",
  en: "Notify me",
};
export const FIRST_WIN_EMAIL_SKIP = {
  es: "Ahora no",
  en: "Not now",
};
export const FIRST_WIN_EMAIL_PRIVACY = {
  es: "Solo te escribimos sobre Ándale. Nunca vendemos tu correo.",
  en: "We only email you about Ándale. We never sell your email.",
};
export const FIRST_WIN_EMAIL_SUCCESS = {
  es: "¡Listo! Te avisamos.",
  en: "Done. We'll let you know.",
};
export const FIRST_WIN_EMAIL_ERROR = {
  es: "Revisa tu correo, parece incompleto.",
  en: "Check your email. It looks incomplete.",
};

function face(row, lang) {
  return lang === "en" ? row.en : row.es;
}

export function firstWinEmailInvite(lang) {
  return face(FIRST_WIN_EMAIL_INVITE, lang);
}

export function firstWinEmailPlaceholder(lang) {
  return face(FIRST_WIN_EMAIL_PLACEHOLDER, lang);
}

export function firstWinEmailCta(lang) {
  return face(FIRST_WIN_EMAIL_CTA, lang);
}

export function firstWinEmailSkipLabel(lang) {
  return face(FIRST_WIN_EMAIL_SKIP, lang);
}

export function firstWinEmailPrivacy(lang) {
  return face(FIRST_WIN_EMAIL_PRIVACY, lang);
}

export function firstWinEmailSuccess(lang) {
  return face(FIRST_WIN_EMAIL_SUCCESS, lang);
}

export function firstWinEmailError(lang) {
  return face(FIRST_WIN_EMAIL_ERROR, lang);
}

/** Once, on the first Hoy Cenzontle win, until the learner submits or leaves. */
export function shouldShowFirstWinEmail({ firstHoy = false, emailSeen = false } = {}) {
  if (emailSeen) return false;
  return !!firstHoy;
}

function postedAt(now) {
  if (typeof now === "string" && now.trim()) return now.trim();
  const date = now instanceof Date ? now : new Date();
  return date.toISOString();
}

/**
 * Validate and keep a local copy. When an endpoint is set, also POST
 * email, lang, source, and ts as form fields (no CORS preflight).
 * An empty endpoint does not POST. The return value never includes the address.
 * no-cors hides the response, so a completed POST counts as sent.
 */
export async function deliverFirstWinEmail(email, {
  endpoint = FIRST_WIN_EMAIL_ENDPOINT,
  lang = "es",
  now,
  fetchImpl = globalThis.fetch,
  storage,
} = {}) {
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (!isWaitlistEmail(trimmed)) return { ok: false };
  const saved = saveWaitlistNotice(trimmed, storage);
  if (!saved.ok) return { ok: false };
  const url = typeof endpoint === "string" ? endpoint.trim() : "";
  if (!url) return { ok: true };
  if (typeof fetchImpl !== "function") return { ok: false };
  const body = new URLSearchParams({
    email: trimmed,
    lang: lang === "en" ? "en" : "es",
    source: FIRST_WIN_EMAIL_SOURCE,
    ts: postedAt(now),
  });
  try {
    await fetchImpl(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
