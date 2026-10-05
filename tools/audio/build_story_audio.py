#!/usr/bin/env python3
"""Andale story audio build step (BUILD-TIME ONLY; nothing here ships in the app).

Engines (select with --engine):
  kokoro  Kokoro-82M ONNX, voice em_alex (kokoro-v1.0.onnx + voices-v1.0.bin) via kokoro-onnx. DEFAULT for this repo's bundle.
  piper   Piper es_MX-claude-high (es_MX-claude-high.onnx + .onnx.json). NOT shipped (no speaker-consent statement on its card);
          kept for reference. Only the piper engine uses fix_hiatus_glide().
Shared post-processing for both engines: peak-normalize to 1.0 -> -2 dB -> 200 ms silence each end -> ffmpeg AAC 48 kbps mono .m4a
  (piper normalizes per sentence like Piper itself does; kokoro normalizes per paragraph, since kokoro-onnx returns one array per call).

Piper pipeline per paragraph:
  text -> Piper phonemize (espeak-ng, voice es-419) -> fix_hiatus_glide() -> phoneme ids -> VITS
  -> per-sentence peak-normalize to 1.0 (what Piper's own synthesize() does) -> -2 dB
  -> 200 ms silence each end -> ffmpeg AAC 48 kbps mono .m4a

The ONLY change to Piper's default behaviour is fix_hiatus_glide(): it removes the palatal-glide mark
U+02B2 (ʲ) when it directly follows a primary-stressed i (the pair 'ˈi' + 'ʲ', i.e. the í of guía,
olía, había, decía, ...). Every other ʲ is left alone.

Usage:
  build_story_audio.py synth --engine kokoro --app-jsx PATH/App.jsx --story 0 --model DIR/kokoro-v1.0.onnx --voices DIR/voices-v1.0.bin [--speed 0.85] --out OUTDIR
  build_story_audio.py synth --engine piper  --app-jsx PATH/App.jsx --story 0 --model DIR/es_MX-claude-high.onnx --out OUTDIR [--no-fix]
  build_story_audio.py list-changes --app-jsx PATH/App.jsx --model DIR/es_MX-claude-high.onnx --out report.json   (piper phoneme step only)
"""
import argparse, json, os, re, subprocess, sys, wave

GLIDE = "\u02b2"      # ʲ
PRIMARY_STRESS = "\u02c8"  # ˈ
GAIN_DB = -2.0
PAD_S = 0.2


VOWELS = set("aeiou\u025b\u0254")   # a e i o u ɛ ɔ  (the vowel symbols espeak es-419 emits)


def fix_hiatus_glide(phonemes):
    """phonemes: list of single-symbol strings (one sentence, as Piper returns them).
    Drop ʲ only when it directly follows 'i' that directly follows the primary-stress mark ˈ
    AND is itself directly followed by a vowel symbol (a real hiatus: -ía, -ío, -íe, -íamos ...).
    Word-final stressed í (sí, aquí, mí, ahí, crecí, ...) has a space or punctuation after the ʲ, so it is left alone."""
    out = []
    n = len(phonemes)
    for k, p in enumerate(phonemes):
        if (p == GLIDE and len(out) >= 2 and out[-1] == "i" and out[-2] == PRIMARY_STRESS
                and k + 1 < n and phonemes[k + 1] in VOWELS):
            continue
        out.append(p)
    return out


def load_stories(app_jsx):
    src = open(app_jsx, encoding="utf8").read()
    seg = src[src.index("const STORIES = ["):]
    stories = []
    for m in re.finditer(r"paragraphs: \[\n(.*?)\n\s*\],\n", seg, re.S):
        items = re.findall(r'^\s*("(?:[^"\\]|\\.)*"),?\s*$', m.group(1), re.M)
        stories.append([json.loads(i) for i in items])
    return stories[:10]


def synth_paragraph(voice, text, fix=True):
    import numpy as np
    chunks = []
    for ph in voice.phonemize(text):
        if not ph:
            continue
        ph = fix_hiatus_glide(ph) if fix else list(ph)
        a = np.asarray(voice.phoneme_ids_to_audio(voice.phonemes_to_ids(ph)), dtype=np.float32)
        m = float(np.abs(a).max())
        a = a / m if m > 1e-8 else np.zeros_like(a)
        chunks.append(np.clip(a, -1.0, 1.0))
    return np.concatenate(chunks)


def finish_and_encode(x, sr, out_m4a, tmp_wav):
    import numpy as np, soundfile as sf
    x = x.astype(np.float32) * (10 ** (GAIN_DB / 20))
    pad = np.zeros(int(PAD_S * sr), dtype=np.float32)
    sf.write(tmp_wav, np.concatenate([pad, x, pad]), sr, subtype="FLOAT")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", tmp_wav, "-c:a", "aac", "-b:a", "48k", "-ac", "1", out_m4a], check=True)
    os.remove(tmp_wav)


def synth_paragraph_kokoro(kokoro, text, voice, lang, speed=1.0):
    """kokoro-onnx with its defaults (speed 1.0 unless --speed is given, sentence_pause 0.25, clause_pause 0.1, trim=True), then peak-normalize to 1.0."""
    import numpy as np
    a, sr = kokoro.create(text, voice=voice, speed=speed, lang=lang)
    a = np.asarray(a, dtype=np.float32)
    m = float(np.abs(a).max())
    a = a / m if m > 1e-8 else a
    return np.clip(a, -1.0, 1.0), sr


def cmd_synth(a):
    paras = load_stories(a.app_jsx)[a.story]
    os.makedirs(a.out, exist_ok=True)
    if a.engine == "piper":
        from piper import PiperVoice
        v = PiperVoice.load(a.model)
        sr = v.config.sample_rate
        make = lambda t: (synth_paragraph(v, t, fix=not a.no_fix), sr)
    else:
        from kokoro_onnx import Kokoro
        if not a.voices:
            sys.exit("--voices voices-v1.0.bin is required for --engine kokoro")
        k = Kokoro(a.model, a.voices)
        make = lambda t: synth_paragraph_kokoro(k, t, a.voice, a.lang, a.speed)
    for i, t in enumerate(paras):
        x, sr = make(t)
        finish_and_encode(x, sr, os.path.join(a.out, f"story-{a.story}-p{i}.m4a"), os.path.join(a.out, f".tmp-p{i}.wav"))
        print("wrote", a.engine, i, round(len(x) / sr, 2), "s (raw)")


def cmd_list(a):
    from piper import PiperVoice
    v = PiperVoice.load(a.model)
    stories = load_stories(a.app_jsx)
    rows = {}
    other_diffs = []
    remaining = {}
    n_sent = n_glide_total = n_removed = 0
    for si, paras in enumerate(stories):
        for pi, text in enumerate(paras):
            # text words as they appear; phoneme words split on space (punctuation stays attached in both)
            for sent in v.phonemize(text):
                n_sent += 1
                d = list(sent); f = fix_hiatus_glide(d)
                ds, fs = "".join(d), "".join(f)
                n_glide_total += ds.count(GLIDE); n_removed += len(d) - len(f)
                # proof that nothing but ʲ-after-ˈi moved:
                if re.sub("(?<=" + PRIMARY_STRESS + "i)" + GLIDE + "(?=[" + "".join(sorted(VOWELS)) + "])", "", ds) != fs:
                    other_diffs.append({"story": si, "p": pi, "default": ds, "new": fs})
                dw, fw = ds.split(" "), fs.split(" ")
                assert len(dw) == len(fw)
                for k, (x, y) in enumerate(zip(dw, fw)):
                    if x != y:
                        # a changed word must differ only by deleted ʲ characters
                        if re.sub("(?<=" + PRIMARY_STRESS + "i)" + GLIDE + "(?=[" + "".join(sorted(VOWELS)) + "])", "", x) != y:
                            other_diffs.append({"story": si, "p": pi, "word_default": x, "word_new": y})
                        r = rows.setdefault((x, y), {"count": 0, "where": [], "prev": [], "next": []})
                        r["count"] += 1
                        if f"s{si}p{pi}" not in r["where"]:
                            r["where"].append(f"s{si}p{pi}")
                        r["prev"].append(dw[k - 1] if k else ""); r["next"].append(dw[k + 1] if k + 1 < len(dw) else "")
                for x in dw:
                    if GLIDE in "".join(fix_hiatus_glide(list(x))):
                        remaining[x] = remaining.get(x, 0) + 1
    json.dump({"sentences": n_sent, "glide_symbols_total": n_glide_total, "glide_removed": n_removed,
               "other_diffs": other_diffs,
               "changed_word_tokens": [{"default": k[0], "new": k[1], **v2} for k, v2 in sorted(rows.items())],
               "remaining_glide_tokens": remaining}, open(a.out, "w"), ensure_ascii=False, indent=1)
    print("sentences", n_sent, "glides", n_glide_total, "removed", n_removed, "other_diffs", len(other_diffs))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest="cmd", required=True)
    l = sp.add_parser("list-changes"); l.add_argument("--app-jsx", required=True); l.add_argument("--out", required=True)
    l.add_argument("--model", default="/workspace/andale-wrap/models/es_MX-claude-high.onnx")
    s = sp.add_parser("synth"); s.add_argument("--app-jsx", required=True); s.add_argument("--story", type=int, default=0)
    s.add_argument("--engine", choices=["piper", "kokoro"], default="kokoro")
    s.add_argument("--model", required=True, help="piper: es_MX-claude-high.onnx   kokoro: kokoro-v1.0.onnx")
    s.add_argument("--voices", help="kokoro only: voices-v1.0.bin")
    s.add_argument("--voice", default="em_alex", help="kokoro voice name")
    s.add_argument("--lang", default="es-419", help="kokoro espeak language (es-419 = Latin American Spanish, seseo)")
    s.add_argument("--speed", type=float, default=1.0, help="kokoro only: speaking speed (1.0 = default; 0.85 = slower)")
    s.add_argument("--out", required=True)
    s.add_argument("--no-fix", action="store_true", help="piper only: switch the hiatus-glide step off")
    a = ap.parse_args()
    {"list-changes": cmd_list, "synth": cmd_synth}[a.cmd](a)
