/** Extracted from App.jsx (no behavior change): the speechSynthesis voice
 *  picker and the hardened speak() used by the lesson engine, word taps,
 *  and PROBAR VOZ. Pure window/speechSynthesis state, no App-component
 *  closures, so it lifts out unchanged. */

export const splitSentences = (text) => text
  .replace(/[«»]/g, "")
  .split(/(?<=[.!?])\s+/)
  .map((s) => s.trim())
  .filter(Boolean);

/* Brand lock (No face): Paulina is the default Mexican reading voice.
   Prefer es-MX Paulina system TTS when the device has her. Never mute when
   she exists. If Spanish voices appear, prefer es-MX. No recording. */
export const DEFAULT_VOICE_NAME = "Paulina";
export const voiceLang = (v) => (v.lang || "").toLowerCase().replace("_", "-");
export const isMexicanVoice = (v) => voiceLang(v) === "es-mx";
export const isNamedPaulina = (v) => /paulina/i.test(v.name || "");
/* Apple often lists the Mexican system voice as the language, not "Paulina". */
export const isAppleMexicanDefault = (v) => {
  if (!isMexicanVoice(v)) return false;
  const name = (v.name || "").toLowerCase();
  if (/google|microsoft|sabina|raul|jorge|juan|pablo|mónica|monica|rocko|reed/.test(name)) return false;
  return /spanish \(mexico\)|español \(méxico\)|español \(mexico\)|español de méxico|spanish mexico/.test(name);
};
export const isPaulinaVoice = (v) => isNamedPaulina(v) || isAppleMexicanDefault(v);
export const isSpanishVoice = (v) => {
  const lang = voiceLang(v);
  if (lang.startsWith("es") || lang.startsWith("spa")) return true;
  const name = (v.name || "").toLowerCase();
  return /paulina|español|espanol|\bspanish\b/.test(name);
};
/* Lectura narration: Mexican / Latin American system voices only.
   es-ES and a bare "es" stay hidden. voiceLang already folds case and _. */
export const LATAM_READING_LANGS = new Set(["es-mx", "es-us", "es-419"]);
export const isLatamReadingVoice = (v) => !!v && LATAM_READING_LANGS.has(voiceLang(v));

export const voiceScore = (v, preferredName) => {
  const name = (v.name || "").toLowerCase();
  const lang = voiceLang(v);
  const pref = (preferredName || DEFAULT_VOICE_NAME).toLowerCase();
  let score = 0;
  if (pref && (v.name === preferredName || name.includes(pref))) score += 100;
  if (isPaulinaVoice(v)) score += isMexicanVoice(v) ? 80 : 40;
  if (v.localService) score += 12;
  if (lang === "es-mx") score += 50;
  else if (lang.startsWith("es")) score += 25;
  if (/google/i.test(v.name || "")) score -= 8;
  if (/flo|shelley|sandy|grandma|eddy/.test(name)) score += 10;
  if (/rocko|reed|grandpa/.test(name)) score += 4;
  if (/mónica|monica/.test(name)) score += 3;
  return score;
};

export const listSpanishVoices = () =>
  ((typeof window !== "undefined" && window.speechSynthesis?.getVoices?.()) || [])
    .filter(isSpanishVoice);

export const pickPaulina = (voices) => {
  const found = (voices || []).filter(isPaulinaVoice);
  if (!found.length) return null;
  return [...found].sort((a, b) => {
    const named = (isNamedPaulina(b) ? 1 : 0) - (isNamedPaulina(a) ? 1 : 0);
    if (named) return named;
    const mx = (isMexicanVoice(b) ? 1 : 0) - (isMexicanVoice(a) ? 1 : 0);
    if (mx) return mx;
    return voiceScore(b, DEFAULT_VOICE_NAME) - voiceScore(a, DEFAULT_VOICE_NAME);
  })[0];
};

export const voicePickerLabel = (v) => {
  if (!v) return "";
  if (isPaulinaVoice(v)) return `Paulina · ${v.lang || "es-MX"}`;
  return `${v.name} · ${v.lang}`;
};

export const voicesForPicker = (voices) => {
  const list = voices || [];
  const paulina = pickPaulina(list);
  const rest = list.filter((v) => v !== paulina);
  return paulina ? [paulina, ...rest].slice(0, 12) : rest.slice(0, 10);
};

export const bestSpanishVoice = (preferredName) => {
  const voices = listSpanishVoices();
  if (!voices.length) return null;
  const paulina = pickPaulina(voices);
  // Paulina is the brand default whenever she is installed.
  if (paulina && (!preferredName || isPaulinaVoice({ name: preferredName, lang: "es-MX" }) || preferredName === DEFAULT_VOICE_NAME)) {
    return paulina;
  }
  if (preferredName) {
    const explicit = voices.find((v) => v.name === preferredName);
    if (explicit) return explicit;
  }
  if (paulina) return paulina;
  const mx = voices.filter(isMexicanVoice);
  const pool = mx.length ? mx : voices;
  return [...pool].sort((a, b) => voiceScore(b, DEFAULT_VOICE_NAME) - voiceScore(a, DEFAULT_VOICE_NAME))[0];
};

/* ---- speechSynthesis hardening (Chrome is hostile) ----
   1. speak() MUST run in the same tick as the tap. Chrome drops speak() after
      any await / voiceschanged / setTimeout as "not a user gesture" and
      speaking stays false. Do not wait for getVoices(). Empty list → lang es-MX.
   2. cancel() only if something is already queued. Idle cancel + delayed speak
      is what killed PROBAR VOZ on boxes without Paulina.
   3. Chrome GC-collects unreferenced utterances mid-speech and onend never fires:
      keep live refs in __utterAlive.
   4. The chunk chain must NOT depend on onend alone: a per-chunk watchdog advances it.
   5. Chrome silently pauses long synthesis (~15s): resume() loop while speaking.
   6. __speakToken invalidates zombie watchdogs from superseded speak() calls. */
const __utterAlive = [];
let __speakToken = 0;
let __resumeTimer = null;

export const stopSpeak = () => {
  __speakToken++;
  __utterAlive.length = 0;
  try { window.speechSynthesis.cancel(); } catch (e) {}
};

export const ensureResumeLoop = () => {
  if (__resumeTimer) return;
  __resumeTimer = setInterval(() => {
    try {
      const ss = window.speechSynthesis;
      if (!ss) return;
      if (ss.paused) ss.resume();
      if (!ss.speaking && !ss.pending) { clearInterval(__resumeTimer); __resumeTimer = null; }
    } catch (e) {}
  }, 2500);
};

export function speak(text, rate = 0.92, opts = {}) {
  try {
    const spoken = String(text || "").trim();
    if (!spoken) return;
    const ss = window.speechSynthesis;
    const Utter = window.SpeechSynthesisUtterance;
    if (!ss || typeof Utter !== "function") return;
    const chunks = opts.chunk ? splitSentences(spoken) : [spoken];
    // Uniform step list: shadow mode = each sentence twice (normal pace, then slower echo).
    const steps = [];
    chunks.forEach((c) => {
      steps.push({ text: c, rate, gap: opts.shadow ? 1200 : (opts.pauseMs ?? 180) });
      if (opts.shadow) steps.push({ text: c, rate: Math.max(0.62, rate - 0.08), gap: 900 });
    });
    // Same-tick speak: invalidate prior watchdogs, cancel only a live utterance.
    __speakToken++;
    __utterAlive.length = 0;
    try { if (ss.speaking || ss.pending) ss.cancel(); } catch (e) {}
    try { ss.getVoices(); } catch (e) {} // warm list; do not wait
    const token = __speakToken;
    let i = 0;
    const playNext = () => {
      if (token !== __speakToken || i >= steps.length) return;
      const step = steps[i++];
      const u = new Utter(step.text.replace(/_+/g, "..."));
      const voice = bestSpanishVoice(window.__andaleVoiceName); // re-resolve: voices can load late
      // Never mute for a missing Paulina / es-MX exact match. Any es-* is fine.
      // Empty voices at tap: still speak with lang es-MX and let the engine pick.
      u.rate = step.rate; u.pitch = 1;
      u.lang = "es-MX";
      if (voice) {
        try {
          u.voice = voice;
          u.lang = isPaulinaVoice(voice) || isMexicanVoice(voice) ? "es-MX" : (voice.lang || "es-MX");
        } catch (e) {
          u.lang = voice.lang || "es-MX";
        }
      }
      __utterAlive.push(u); // GC guard
      let advanced = false;
      const advance = () => {
        if (advanced || token !== __speakToken) return;
        advanced = true;
        const idx = __utterAlive.indexOf(u); if (idx > -1) __utterAlive.splice(idx, 1);
        setTimeout(playNext, step.gap);
      };
      u.onstart = () => { window.__andaleSpoke = true; };
      u.onend = advance;
      u.onerror = advance;
      // Watchdog: if onend never fires (Chrome), advance after a generous duration estimate.
      setTimeout(advance, Math.max(3000, (step.text.length * 95) / step.rate + 1200));
      // Inert-engine detection: if NOTHING has ever audibly started, the API may be
      // sandboxed-dead (common in restricted iframes). One bare-bones retry, then
      // surface it to the UI instead of failing silently.
      if (i === 1 && !window.__andaleSpoke) {
        setTimeout(() => {
          if (window.__andaleSpoke || token !== __speakToken) return;
          if (!window.__andaleRetried) {
            window.__andaleRetried = true;
            try {
              const bare = new Utter(step.text);
              const retryVoice = voice || bestSpanishVoice(window.__andaleVoiceName);
              bare.lang = "es-MX";
              if (retryVoice) bare.voice = retryVoice;
              bare.onstart = () => { window.__andaleSpoke = true; };
              ss.speak(bare);
            } catch (e) {}
            setTimeout(() => {
              if (!window.__andaleSpoke && !pickPaulina(listSpanishVoices())) {
                window.__andaleVoiceDead = true; try { window.dispatchEvent(new Event("andale-voice-dead")); } catch (e) {}
              }
            }, 2600);
          } else if (!window.__andaleSpoke && !pickPaulina(listSpanishVoices())) {
            window.__andaleVoiceDead = true; try { window.dispatchEvent(new Event("andale-voice-dead")); } catch (e) {}
          }
        }, 2200);
      }
      ss.speak(u);
      try { ss.resume(); } catch (e) {}
      ensureResumeLoop();
    };
    playNext(); // same tick as the tap — do not defer
  } catch (e) {}
}
