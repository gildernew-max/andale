/** Optional email on the first Hoy Cenzontle win. Skip never blocks Lectura.
 *  Copy is the existing waitlist face. Skip reuses Saltar / Skip (listenSkip).
 *  The address never goes on the funnel bus.
 *
 *  FIRST_WIN_EMAIL_ENDPOINT is empty on purpose. Until someone pastes a free
 *  inbox URL, saveWaitlistNotice keeps the address in localStorage only.
 *  Nobody outside this browser can read it.
 *  Formspree (free, no card): create a form, paste https://formspree.io/f/xxxxxxxx
 *  here, redeploy Pages. Do not sign up from this repo.
 */

import { listenSkipLabel } from "./listenSkip.js";
import { isWaitlistEmail, saveWaitlistNotice } from "./waitlist.js";

/** Paste a free form endpoint. Empty = on-device store only. */
export const FIRST_WIN_EMAIL_ENDPOINT = "";

export const FIRST_WIN_EMAIL_SEEN = "firstWinEmailSeen";

/** Dark card spec. Sage is the border only — cream ink carries the labels. */
export const FIRST_WIN_EMAIL_DARK = Object.freeze({
  page: "#15171C",
  card: "#1E2128",
  ink: "#F6EFE4",
  sage: "#6F7757",
});

export function firstWinEmailSkipLabel(lang) {
  return listenSkipLabel(lang);
}

/** Once, on the first Hoy Cenzontle win, until the learner submits or leaves. */
export function shouldShowFirstWinEmail({ firstHoy = false, emailSeen = false } = {}) {
  if (emailSeen) return false;
  return !!firstHoy;
}

/**
 * Validate, keep a local copy, and POST { email } when an endpoint is set.
 * The return value never includes the address.
 */
export async function deliverFirstWinEmail(email, {
  endpoint = FIRST_WIN_EMAIL_ENDPOINT,
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
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: trimmed }),
    });
    if (!res || res.ok !== true) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
