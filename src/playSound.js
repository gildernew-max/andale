/* ---- Sound design: proper game audio, no more beeps ----
   Each event gets a carefully tuned multi-oscillator sound:
   ok    → bright ascending chord (C5-E5-G5, piano-like attack)
   wrong → low thud + descending tonal drop (clear "no" feel)
   win   → 5-note fanfare with harmonics (victory cascade)
   combo → shimmering sparkle (ascending arpeggiated thirds)
   chest → coin-collect jingle (classic pickup sound)
   The shapes, envelopes, and micro-timing are tuned so they feel
   satisfying at low volume and don't fatigue on repeat.

   Misses call this with "bad". That name has no synth of its own;
   it plays the existing wrong tone. */

export function playSound(kind, { enabled = true, audioRef } = {}) {
  if (!enabled) return;
  const slot = audioRef || { current: null };
  try {
    const scope = typeof window !== "undefined" ? window : globalThis;
    const Ctx = scope.AudioContext || scope.webkitAudioContext;
    if (!Ctx) return;
    const ctx = slot.current || (slot.current = new Ctx());
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    const tone = (freq, start, dur, type = "sine", vol = 0.18, detune = 0) => {
      const g = ctx.createGain();
      const o = ctx.createOscillator();
      g.connect(ctx.destination);
      o.connect(g);
      o.type = type;
      o.frequency.setValueAtTime(freq, now + start);
      if (detune) o.detune.setValueAtTime(detune, now + start);
      // Piano-like envelope: sharp attack, short decay, fast release
      g.gain.setValueAtTime(0, now + start);
      g.gain.linearRampToValueAtTime(vol, now + start + 0.012);
      g.gain.exponentialRampToValueAtTime(vol * 0.55, now + start + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.start(now + start);
      o.stop(now + start + dur + 0.05);
    };

    const noise = (start, dur, vol = 0.08) => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass"; filt.frequency.value = 300;
      const g = ctx.createGain();
      src.connect(filt); filt.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(vol, now + start);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      src.start(now + start); src.stop(now + start + dur + 0.02);
    };

    // "bad" is the miss name used at call sites. Same branch as "wrong".
    if (kind === "bad") kind = "wrong";

    if (kind === "ok") {
      // Bright piano chord: C5-E5-G5 with slight stagger
      tone(523.25, 0,    0.38, "triangle", 0.20);
      tone(659.25, 0.02, 0.35, "triangle", 0.16);
      tone(783.99, 0.04, 0.32, "triangle", 0.13);
      // Harmonic shimmer
      tone(1046.5, 0.03, 0.22, "sine",     0.06);

    } else if (kind === "wrong") {
      // Low thud
      noise(0, 0.14, 0.12);
      // Descending "doh" — two tones sliding down
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(260, now);
      o.frequency.exponentialRampToValueAtTime(160, now + 0.28);
      g.gain.setValueAtTime(0.22, now);
      g.gain.linearRampToValueAtTime(0.18, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      o.start(now); o.stop(now + 0.35);
      // Sub-bass thump
      tone(80, 0, 0.18, "sine", 0.15);

    } else if (kind === "win") {
      // 5-note victory fanfare: G4-C5-E5-G5-C6
      const melody = [392, 523.25, 659.25, 783.99, 1046.5];
      melody.forEach((f, i) => {
        tone(f,      i * 0.1,       0.5 - i * 0.04, "triangle", 0.22 - i * 0.02);
        tone(f * 2,  i * 0.1 + 0.01, 0.3,            "sine",     0.06);
      });
      // Final shimmer chord
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(f, 0.52 + i * 0.02, 0.6, "sine", 0.12 - i * 0.02);
      });

    } else if (kind === "combo") {
      // Sparkle arpeggio — ascending thirds
      [659.25, 783.99, 987.77, 1174.66].forEach((f, i) => {
        tone(f, i * 0.07, 0.25, "sine", 0.14, i * 8);
      });

    } else if (kind === "chest") {
      // Classic coin collect: quick ascending blip pair
      tone(1046.5, 0,    0.1, "square", 0.14);
      tone(1318.5, 0.08, 0.18, "square", 0.14);
      tone(1567.98, 0.16, 0.22, "triangle", 0.12);
    }
  } catch (e) {}
}
