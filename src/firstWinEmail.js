/** Optional email on the first Hoy Cenzontle win. Skip never blocks Lectura.
 *  One uiLang face. Spanish is the fallback. The address never goes on the funnel bus.
 *
 *  The card and the collector stay off unless collectorEndpoint() is non-empty
 *  (VITE_COLLECTOR_ENDPOINT or VITE_FIRST_WIN_EMAIL_ENDPOINT at build time).
 *  With both empty, the card is not shown, nothing is written to
 *  `andale-waitlist`, and no request is sent.
 *
 *  To turn it on later: deploy docs/first-win-email-collector.gs by hand,
 *  set one of those URLs, and rebuild. This repo does not deploy it.
 */

import { postCollector, COLLECTOR_ENDPOINT, collectorEndpoint } from "./collector.js";
import { isWaitlistEmail, saveWaitlistNotice } from "./waitlist.js";

export { COLLECTOR_ENDPOINT, collectorEndpoint };

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
export const FIRST_WIN_EMAIL_PRIVACY_LINK = {
  es: "Privacidad",
  en: "Privacy",
};
/** Served page is public/privacy.html → /andale/privacy.html. */
export const FIRST_WIN_EMAIL_PRIVACY_HREF = "privacy.html#correo-y-datos";
/** Muted ink. Quieter than Ahora no. Light on cream, dark on the card. */
export const FIRST_WIN_EMAIL_PRIVACY_INK = Object.freeze({
  light: "#5E6650",
  dark: "#CDBBA6",
});
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

export function firstWinEmailPrivacyLink(lang) {
  return face(FIRST_WIN_EMAIL_PRIVACY_LINK, lang);
}

export function firstWinEmailSuccess(lang) {
  return face(FIRST_WIN_EMAIL_SUCCESS, lang);
}

export function firstWinEmailError(lang) {
  return face(FIRST_WIN_EMAIL_ERROR, lang);
}

/** Once, on the first Hoy Cenzontle win, until the learner submits or leaves.
 *  Hidden when the shared endpoint helper is empty. */
export function shouldShowFirstWinEmail({ firstHoy = false, emailSeen = false, endpoint } = {}) {
  const url = endpoint === undefined
    ? collectorEndpoint()
    : (typeof endpoint === "string" ? endpoint.trim() : "");
  if (!url) return false;
  if (emailSeen) return false;
  return !!firstHoy;
}

function postedAt(now) {
  if (typeof now === "string" && now.trim()) return now.trim();
  const date = now instanceof Date ? now : new Date();
  return date.toISOString();
}

/**
 * Validate, keep a local copy, and send { type:'email', email, lang, source, ts }
 * as text/plain. An empty endpoint does not store and does not send.
 * The return value never includes the address.
 */
export async function deliverFirstWinEmail(email, {
  endpoint = collectorEndpoint(),
  lang = "es",
  now,
  fetchImpl = globalThis.fetch,
  beaconImpl,
  storage,
} = {}) {
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (!isWaitlistEmail(trimmed)) return { ok: false };
  const url = typeof endpoint === "string" ? endpoint.trim() : "";
  if (!url) return { ok: true };
  const saved = saveWaitlistNotice(trimmed, storage);
  if (!saved.ok) return { ok: false };
  const sent = await postCollector({
    type: "email",
    email: trimmed,
    lang: lang === "en" ? "en" : "es",
    source: FIRST_WIN_EMAIL_SOURCE,
    ts: postedAt(now),
  }, { endpoint: url, fetchImpl, beaconImpl });
  if (!sent.ok) return { ok: false };
  return { ok: true };
}
