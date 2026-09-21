import {
  WAITLIST_CTA,
  WAITLIST_ERROR,
  WAITLIST_PLACEHOLDER,
  WAITLIST_PRIVACY,
  WAITLIST_PRIVACY_URL,
  WAITLIST_PROMPT,
  WAITLIST_STORE_KEY,
  WAITLIST_SUCCESS,
  isWaitlistEmail,
  saveWaitlistNotice,
  waitlistCta,
  waitlistError,
  waitlistPlaceholder,
  waitlistPrivacy,
  waitlistPrompt,
  waitlistSuccess,
} from "./waitlist.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(WAITLIST_PROMPT.es === "Avísame cuando abramos la tienda", "ES prompt George lock");
assert(WAITLIST_PROMPT.en === "Tell me when the store opens", "EN prompt George lock");
assert(WAITLIST_PLACEHOLDER.es === "Tu correo", "ES placeholder George lock");
assert(WAITLIST_PLACEHOLDER.en === "Your email", "EN placeholder George lock");
assert(WAITLIST_CTA.es === "Avisarme", "ES CTA George lock");
assert(WAITLIST_CTA.en === "Notify me", "EN CTA George lock");
assert(WAITLIST_SUCCESS.es === "Listo. Te escribo cuando esté listo.", "ES success George lock");
assert(WAITLIST_SUCCESS.en === "Got it. I’ll write when it’s ready.", "EN success George lock");
assert(!WAITLIST_SUCCESS.en.includes("'"), "EN success uses the curly apostrophe");
assert(WAITLIST_ERROR.es === "Revisa el correo", "ES error George lock");
assert(WAITLIST_ERROR.en === "Check the email", "EN error George lock");
assert(WAITLIST_PRIVACY.es === "Solo para el aviso de apertura. Sin spam.", "ES privacy George lock");
assert(WAITLIST_PRIVACY.en === "Launch notice only. No spam.", "EN privacy George lock");
assert(WAITLIST_PRIVACY_URL === "https://gildernew-max.github.io/andale/privacy.html", "privacy link is the ASC URL if shown");

assert(waitlistPrompt("es") === WAITLIST_PROMPT.es && waitlistPrompt("en") === WAITLIST_PROMPT.en, "prompt follows uiLang");
assert(waitlistPlaceholder("es") === WAITLIST_PLACEHOLDER.es && waitlistPlaceholder("en") === WAITLIST_PLACEHOLDER.en, "placeholder follows uiLang");
assert(waitlistCta("es") === WAITLIST_CTA.es && waitlistCta("en") === WAITLIST_CTA.en, "CTA follows uiLang");
assert(waitlistSuccess("es") === WAITLIST_SUCCESS.es && waitlistSuccess("en") === WAITLIST_SUCCESS.en, "success follows uiLang");
assert(waitlistError("es") === WAITLIST_ERROR.es && waitlistError("en") === WAITLIST_ERROR.en, "error follows uiLang");
assert(waitlistPrivacy("es") === WAITLIST_PRIVACY.es && waitlistPrivacy("en") === WAITLIST_PRIVACY.en, "privacy follows uiLang");
assert(waitlistPrompt("fr") === WAITLIST_PROMPT.es, "unknown uiLang stays ES");
assert(waitlistCta() === WAITLIST_CTA.es, "missing uiLang stays ES");

const faces = [
  WAITLIST_PROMPT, WAITLIST_PLACEHOLDER, WAITLIST_CTA, WAITLIST_SUCCESS, WAITLIST_ERROR, WAITLIST_PRIVACY,
].flatMap((row) => [row.es, row.en]).join("\n");
assert(!/\$|XP|racha|streak/.test(faces), "waitlist copy has no price, streak, or XP");
assert(!/Enroll|Perfect lesson|Mexicanismos/.test(faces), "waitlist copy does not open soft chrome");

assert(!isWaitlistEmail(""), "empty is not an email");
assert(!isWaitlistEmail("   "), "blank is not an email");
assert(!isWaitlistEmail("not-an-email"), "missing @ is not an email");
assert(!isWaitlistEmail("dave@"), "missing domain is not an email");
assert(!isWaitlistEmail("dave@example"), "missing dot is not an email");
assert(!isWaitlistEmail("dave @example.com"), "space is not an email");
assert(isWaitlistEmail("  dave@example.com  "), "trim then accept");
assert(!isWaitlistEmail(null), "null is not an email");

const storage = {
  data: {},
  setItem(key, value) { this.data[key] = value; },
  getItem(key) { return this.data[key]; },
};
const bad = saveWaitlistNotice("nope", storage);
assert(bad.ok === false && bad.email == null, "bad email is not stored and not returned");
assert(storage.data[WAITLIST_STORE_KEY] == null, "bad email does not touch the store");

const saved = saveWaitlistNotice("  dave@example.com ", storage);
assert(saved.ok === true && saved.email == null, "save result is ok only — no email on the return");
assert(!/@/.test(JSON.stringify(saved)), "save return has no address");
const stored = JSON.parse(storage.getItem(WAITLIST_STORE_KEY));
assert(stored.email === "dave@example.com", "local store keeps the trimmed address for the notice");

console.log("ok: waitlist words — one uiLang face; local notice store; no email on the return.");
