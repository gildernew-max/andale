import { LISTEN_SKIP } from "./listenSkip.js";
import { WAITLIST_STORE_KEY } from "./waitlist.js";
import {
  FIRST_WIN_EMAIL_DARK,
  FIRST_WIN_EMAIL_ENDPOINT,
  deliverFirstWinEmail,
  firstWinEmailSkipLabel,
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
assert(contrast(FIRST_WIN_EMAIL_DARK.ink, FIRST_WIN_EMAIL_DARK.card) >= 4.5, "cream ink on the dark card is 4.5:1 or better");
assert(contrast(FIRST_WIN_EMAIL_DARK.sage, FIRST_WIN_EMAIL_DARK.card) < 4.5, "sage stays a border — it misses 4.5:1 on the card");

assert(firstWinEmailSkipLabel("es") === LISTEN_SKIP.es && firstWinEmailSkipLabel("en") === LISTEN_SKIP.en, "skip reuses Saltar / Skip");
assert(firstWinEmailSkipLabel("fr") === LISTEN_SKIP.es, "unknown uiLang stays ES");

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
