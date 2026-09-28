import { WAITLIST_STORE_KEY } from "./waitlist.js";
import {
  FIRST_WIN_EMAIL_CTA,
  FIRST_WIN_EMAIL_DARK,
  FIRST_WIN_EMAIL_ENDPOINT,
  FIRST_WIN_EMAIL_ERROR,
  FIRST_WIN_EMAIL_FILL,
  FIRST_WIN_EMAIL_FILL_INK,
  FIRST_WIN_EMAIL_INVITE,
  FIRST_WIN_EMAIL_PLACEHOLDER,
  FIRST_WIN_EMAIL_PRIVACY,
  FIRST_WIN_EMAIL_SKIP,
  FIRST_WIN_EMAIL_SUCCESS,
  deliverFirstWinEmail,
  firstWinEmailCta,
  firstWinEmailError,
  firstWinEmailInvite,
  firstWinEmailPlaceholder,
  firstWinEmailPrivacy,
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

assert(FIRST_WIN_EMAIL_ENDPOINT === "", "endpoint stays empty until a free inbox URL is pasted");
assert(FIRST_WIN_EMAIL_DARK.page === "#15171C", "dark page");
assert(FIRST_WIN_EMAIL_DARK.card === "#1E2128", "dark card");
assert(FIRST_WIN_EMAIL_DARK.ink === "#F6EFE4", "dark cream ink");
assert(FIRST_WIN_EMAIL_DARK.sage === "#6F7757", "dark sage");
assert(FIRST_WIN_EMAIL_DARK.inputBorder === "#2A2E36", "dark input border");
assert(FIRST_WIN_EMAIL_DARK.focus === "#B8C0A0", "dark input focus ring");
assert(contrast(FIRST_WIN_EMAIL_DARK.ink, FIRST_WIN_EMAIL_DARK.card) >= 4.5, "cream ink on the dark card is 4.5:1 or better");
assert(contrast(FIRST_WIN_EMAIL_FILL_INK, FIRST_WIN_EMAIL_FILL) >= 4.5, "Avísame cream label on the sage fill is 4.5:1 or better");

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
  endpoint: "https://formspree.io/f/test",
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
assert(posted.url === "https://formspree.io/f/test", "POST hits the configured URL");
assert(posted.init.method === "POST", "POST method");
assert(JSON.parse(posted.init.body).email === "ada@example.com", "body is the trimmed address");

const down = await deliverFirstWinEmail("ada@example.com", {
  endpoint: "https://formspree.io/f/test",
  storage,
  fetchImpl: async () => { throw new Error("down"); },
});
assert(down.ok === false && down.email == null, "a failed POST is not ok and does not return the address");

const blank = await deliverFirstWinEmail("   ", { storage, fetchImpl: async () => ({ ok: true }) });
assert(blank.ok === false, "blank is not an email");
const missingDot = await deliverFirstWinEmail("dave@example", { storage });
assert(missingDot.ok === false, "missing dot is not an email");

console.log("ok: first-win email — validation, skip label, empty endpoint stays on device.");
