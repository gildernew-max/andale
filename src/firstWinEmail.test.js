import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WAITLIST_STORE_KEY } from "./waitlist.js";
import {
  FIRST_WIN_EMAIL_CTA,
  FIRST_WIN_EMAIL_DARK,
  COLLECTOR_ENDPOINT,
  FIRST_WIN_EMAIL_ERROR,
  FIRST_WIN_EMAIL_FILL,
  FIRST_WIN_EMAIL_FILL_INK,
  FIRST_WIN_EMAIL_INVITE,
  FIRST_WIN_EMAIL_PLACEHOLDER,
  FIRST_WIN_EMAIL_PRIVACY,
  FIRST_WIN_EMAIL_PRIVACY_HREF,
  FIRST_WIN_EMAIL_PRIVACY_INK,
  FIRST_WIN_EMAIL_PRIVACY_LINK,
  FIRST_WIN_EMAIL_SKIP,
  FIRST_WIN_EMAIL_SOURCE,
  FIRST_WIN_EMAIL_SUCCESS,
  deliverFirstWinEmail,
  firstWinEmailCta,
  firstWinEmailError,
  firstWinEmailInvite,
  firstWinEmailPlaceholder,
  firstWinEmailPrivacy,
  firstWinEmailPrivacyLink,
  firstWinEmailSkipLabel,
  firstWinEmailSuccess,
  shouldShowFirstWinEmail,
} from "./firstWinEmail.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

function channel(hex) {
  const s = parseInt(hex, 16) / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function contrast(a, b) {
  const lum = (hex) => {
    const n = hex.replace("#", "");
    const r = channel(n.slice(0, 2));
    const g = channel(n.slice(2, 4));
    const bl = channel(n.slice(4, 6));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const hi = Math.max(lum(a), lum(b));
  const lo = Math.min(lum(a), lum(b));
  return (hi + 0.05) / (lo + 0.05);
}

assert(COLLECTOR_ENDPOINT === "", "endpoint stays empty until VITE_COLLECTOR_ENDPOINT is set");
assert(FIRST_WIN_EMAIL_SOURCE === "first-win", "collector source is first-win");
assert(FIRST_WIN_EMAIL_DARK.page === "#15171C", "dark page");
assert(FIRST_WIN_EMAIL_DARK.card === "#1E2128", "dark card");
assert(FIRST_WIN_EMAIL_DARK.ink === "#F6EFE4", "dark cream ink");
assert(FIRST_WIN_EMAIL_DARK.sage === "#6F7757", "dark sage");
assert(FIRST_WIN_EMAIL_DARK.inputBorder === "#2A2E36", "dark input border");
assert(FIRST_WIN_EMAIL_DARK.focus === "#B8C0A0", "dark input focus ring");
assert(contrast(FIRST_WIN_EMAIL_DARK.ink, FIRST_WIN_EMAIL_DARK.card) >= 4.5, "cream ink on the dark card is 4.5:1 or better");
assert(contrast(FIRST_WIN_EMAIL_FILL_INK, FIRST_WIN_EMAIL_FILL) >= 4.5, "Avísame cream label on the sage fill is 4.5:1 or better");
assert(FIRST_WIN_EMAIL_PRIVACY_INK.light === "#5E6650" && FIRST_WIN_EMAIL_PRIVACY_INK.dark === "#CDBBA6", "privacy link muted ink");
assert(contrast(FIRST_WIN_EMAIL_PRIVACY_INK.light, "#F6EFE4") >= 4.5, "muted ink on cream is 4.5:1 or better");
assert(contrast(FIRST_WIN_EMAIL_PRIVACY_INK.dark, FIRST_WIN_EMAIL_DARK.card) >= 4.5, "muted ink on the dark card is 4.5:1 or better");
assert(FIRST_WIN_EMAIL_PRIVACY_LINK.es === "Privacidad" && FIRST_WIN_EMAIL_PRIVACY_LINK.en === "Privacy", "privacy link words");
assert(firstWinEmailPrivacyLink("es") === "Privacidad" && firstWinEmailPrivacyLink("en") === "Privacy", "privacy link follows uiLang");
assert(firstWinEmailPrivacyLink("fr") === "Privacidad", "unknown uiLang privacy link stays ES");
assert(FIRST_WIN_EMAIL_PRIVACY_HREF === "privacy.html#correo-y-datos", "privacy link uses the served page and the correo-y-datos anchor");

assert(FIRST_WIN_EMAIL_INVITE.es === "Déjanos tu correo y te avisamos cuando haya historias nuevas.", "ES invite");
assert(FIRST_WIN_EMAIL_INVITE.en === "Leave your email and we'll tell you when new stories are out.", "EN invite");
assert(FIRST_WIN_EMAIL_PLACEHOLDER.es === "tu@correo.com" && FIRST_WIN_EMAIL_PLACEHOLDER.en === "you@email.com", "placeholders");
assert(FIRST_WIN_EMAIL_CTA.es === "Avísame" && FIRST_WIN_EMAIL_CTA.en === "Notify me", "filled button");
assert(FIRST_WIN_EMAIL_SKIP.es === "Ahora no" && FIRST_WIN_EMAIL_SKIP.en === "Not now", "quiet skip");
assert(FIRST_WIN_EMAIL_PRIVACY.es === "Solo te escribimos sobre Ándale. Nunca vendemos tu correo.", "ES privacy");
assert(FIRST_WIN_EMAIL_PRIVACY.en === "We only email you about Ándale. We never sell your email.", "EN privacy");
assert(FIRST_WIN_EMAIL_SUCCESS.es === "¡Listo! Te avisamos." && FIRST_WIN_EMAIL_SUCCESS.en === "Done. We'll let you know.", "success");
assert(FIRST_WIN_EMAIL_ERROR.es === "Revisa tu correo, parece incompleto." && FIRST_WIN_EMAIL_ERROR.en === "Check your email. It looks incomplete.", "bad address");

const faces = [
  FIRST_WIN_EMAIL_INVITE, FIRST_WIN_EMAIL_PLACEHOLDER, FIRST_WIN_EMAIL_CTA, FIRST_WIN_EMAIL_SKIP,
  FIRST_WIN_EMAIL_PRIVACY, FIRST_WIN_EMAIL_SUCCESS, FIRST_WIN_EMAIL_ERROR,
].flatMap((row) => [row.es, row.en]).join("\n");
assert(!/unsubscribe|darse de baja|opt out|opt-out/i.test(faces), "no unsubscribe promise");
assert(firstWinEmailInvite("es") === FIRST_WIN_EMAIL_INVITE.es && firstWinEmailInvite("en") === FIRST_WIN_EMAIL_INVITE.en, "invite follows uiLang");
assert(firstWinEmailInvite("fr") === FIRST_WIN_EMAIL_INVITE.es, "unknown uiLang stays ES");
assert(firstWinEmailPlaceholder("en") === FIRST_WIN_EMAIL_PLACEHOLDER.en, "placeholder follows uiLang");
assert(firstWinEmailCta("es") === FIRST_WIN_EMAIL_CTA.es && firstWinEmailCta("en") === FIRST_WIN_EMAIL_CTA.en, "button follows uiLang");
assert(firstWinEmailSkipLabel("es") === "Ahora no" && firstWinEmailSkipLabel("en") === "Not now", "skip follows uiLang");
assert(firstWinEmailSkipLabel() === "Ahora no", "missing uiLang stays ES");
assert(firstWinEmailPrivacy("en") === FIRST_WIN_EMAIL_PRIVACY.en && firstWinEmailSuccess("es") === FIRST_WIN_EMAIL_SUCCESS.es, "privacy and success follow uiLang");
assert(firstWinEmailError("en") === FIRST_WIN_EMAIL_ERROR.en, "error follows uiLang");
assert(!firstWinEmailInvite("en").includes(FIRST_WIN_EMAIL_INVITE.es), "EN face has no Spanish invite");
assert(!firstWinEmailInvite("es").includes("Leave your email"), "ES face has no English invite");

assert(shouldShowFirstWinEmail({ firstHoy: true, emailSeen: false }) === true, "first Hoy win shows the field");
assert(shouldShowFirstWinEmail({ firstHoy: true, emailSeen: true }) === false, "seen flag hides it");
assert(shouldShowFirstWinEmail({ firstHoy: false, emailSeen: false }) === false, "later wins do not ask");
assert(shouldShowFirstWinEmail() === false, "missing gate stays off");

const storage = {
  data: {},
  setItem(key, value) { this.data[key] = value; },
  getItem(key) { return this.data[key]; },
};

let fetches = 0;
const bad = await deliverFirstWinEmail("not-an-email", {
  endpoint: "https://formspree.io/f/test",
  storage,
  fetchImpl: async () => { fetches += 1; return { ok: true }; },
});
assert(bad.ok === false && bad.email == null, "invalid email is rejected");
assert(!/@/.test(JSON.stringify(bad)), "invalid result has no address");
assert(fetches === 0, "invalid email does not POST");
assert(storage.data[WAITLIST_STORE_KEY] == null, "invalid email is not stored");

const empty = await deliverFirstWinEmail("  dave@example.com ", {
  endpoint: "",
  storage,
  fetchImpl: async () => { fetches += 1; return { ok: true }; },
});
assert(empty.ok === true && empty.email == null, "empty endpoint still accepts a real address");
assert(!/@/.test(JSON.stringify(empty)), "accept result has no address");
assert(fetches === 0, "empty endpoint does not POST");
assert(JSON.parse(storage.getItem(WAITLIST_STORE_KEY)).email === "dave@example.com", "local store keeps the trimmed address");

let posted = null;
const sent = await deliverFirstWinEmail("ada@example.com", {
  endpoint: "https://script.google.com/macros/s/collector/exec",
  lang: "en",
  now: "2026-09-28T18:00:00.000Z",
  storage,
  fetchImpl: async (url, init) => {
    fetches += 1;
    posted = { url, init };
    return { ok: true };
  },
});
assert(sent.ok === true && sent.email == null, "configured endpoint accepts");
assert(!/@/.test(JSON.stringify(sent)), "POST result has no address");
assert(fetches === 1, "configured endpoint POSTs once");
assert(posted.url === "https://script.google.com/macros/s/collector/exec", "POST hits the configured URL");
assert(posted.init.method === "POST", "POST method");
assert(posted.init.mode === "no-cors", "POST uses no-cors");
assert(posted.init.headers["Content-Type"] === "text/plain", "POST is text/plain");
const emailBody = JSON.parse(posted.init.body);
assert(emailBody.type === "email", "email row is type email");
assert(emailBody.email === "ada@example.com", "body is the trimmed address");
assert(emailBody.lang === "en", "body carries the face");
assert(emailBody.source === "first-win", "body source is first-win");
assert(emailBody.ts === "2026-09-28T18:00:00.000Z", "body carries the timestamp");
assert(emailBody.deviceId == null, "email row is not a device event");

const sentEs = await deliverFirstWinEmail("ada@example.com", {
  endpoint: "https://script.google.com/macros/s/collector/exec",
  now: "2026-09-28T18:00:00.000Z",
  storage,
  fetchImpl: async (url, init) => {
    fetches += 1;
    posted = { url, init };
    return { ok: false, type: "opaque", status: 0 };
  },
});
assert(sentEs.ok === true, "an opaque no-cors response still counts as sent");
assert(JSON.parse(posted.init.body).lang === "es", "missing lang stays Spanish");
assert(JSON.parse(posted.init.body).type === "email", "opaque send is still an email row");

const down = await deliverFirstWinEmail("ada@example.com", {
  endpoint: "https://script.google.com/macros/s/collector/exec",
  lang: "en",
  storage,
  fetchImpl: async () => { throw new Error("down"); },
});
assert(down.ok === false && down.email == null, "a failed POST is not ok and does not return the address");
assert(JSON.parse(storage.getItem(WAITLIST_STORE_KEY)).email === "ada@example.com", "a failed POST keeps the local copy");

const collector = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "first-win-email-collector.gs"), "utf8");
assert(/function doPost\s*\(\s*e\s*\)/.test(collector), "collector exposes doPost(e)");
assert(collector.includes('sheetByName(ss, "emails")') && collector.includes('sheetByName(ss, "events")'), "collector names the emails and events tabs");
assert(collector.includes("insertSheet"), "collector creates a missing tab");
assert(collector.includes("Extensions > Apps Script"), "collector names the Apps Script menu");
assert(collector.includes("Deploy as web app"), "collector names the web app deploy");
assert(/Execute as: Me/.test(collector) && /Anyone/.test(collector), "collector says execute as me, access anyone");
assert(collector.includes("VITE_COLLECTOR_ENDPOINT"), "collector names the build-time URL");
assert(!/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+/.test(collector), "collector file has no live web app URL");

const blank = await deliverFirstWinEmail("   ", { storage, fetchImpl: async () => ({ ok: true }) });
assert(blank.ok === false, "blank is not an email");
const missingDot = await deliverFirstWinEmail("dave@example", { storage });
assert(missingDot.ok === false, "missing dot is not an email");

console.log("ok: first-win email — validation, skip label, empty endpoint stays on device.");
