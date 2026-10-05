# Story audio notice

The `story-0-p0.m4a` ... `story-0-p5.m4a` files in this folder are **synthetic speech** generated at build time from the paragraph text of story-0 ("La noche en que vuelven"). They are not a human narrator.

**Accent fallback: these files are in a fallback voice, not a Mexican-Spanish voice.** Kokoro has no es-MX voice; its card lists three Spanish voices (`ef_dora`, `em_alex`, `em_santa`) with no region or accent label, and `em_alex` is not claimed to be Mexican (details in the section below). The `em_alex` voice also has **no license, source or speaker-consent statement of its own** in the model repo or card.

**Nobody has listened to these files.** The only checks so far are a speech recognizer and phoneme/level measurements.

**Speaking speed 0.77.** These files were made with Kokoro's `speed` parameter at **0.77**, ordered by Hand as an interpolated target of about 150 words per minute. Everything else is identical to the speed-1.0, 0.85 and 0.75 takes of the same voice: same model, voice, language code, text, post-processing. What changed: speech pace. The six files total 166.3 s (speed 0.75: 169.7 s; 0.85: 136.8 s; 1.0: 123.9 s) and 1,052,597 bytes (0.75: 1,073,285; 0.85: 861,149; 1.0: 780,735). Measured pace, story-0 text (398 words) over file duration minus the 2.4 s of added padding: about **146 words per minute** at 0.77 (143 at 0.75, 178 at 0.85, 197 at 1.0), so the interpolated 150 was not hit exactly. Peak is about the same (0.82). Recognizer results match the 0.75 take and are slightly worse than 0.85 (see the commit message). Whether 0.77 sounds better, more natural, or distorts anything is **unknown: nobody has listened**.

## Accent fallback (read this first)

**These files are in an accent fallback voice, not a Mexican-Spanish voice.** Kokoro has no es-MX voice. Its model card lists Spanish with three voices (`ef_dora`, `em_alex`, `em_santa`) and gives **no region or accent label** for any of them: the voice list only says "Spanish", "Traits" 🚺/🚹 and a short hash. This project picked `em_alex` (male). Nothing in the model repo says `em_alex` is Mexican (or Castilian, or any other accent); that has not been verified, and nobody has listened to it. The text is phonemized with espeak-ng's `es-419` (Latin American Spanish, seseo) so that the pronunciation rules are Latin American, but the **voice timbre and prosody come from whatever speakers the em_alex style vector was trained on**, which the card does not describe. The card also warns (VOICES.md): "Support for non-English languages may be absent or thin due to weak G2P and/or lack of training data."

## Voice and model (exact names)

| | |
|---|---|
| Engine / model | **Kokoro-82M v1.0** (82 million parameters), ONNX export |
| Weights file used | `kokoro-v1.0.onnx` (325,532,387 bytes), sha256 `7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5` |
| Voices file used | `voices-v1.0.bin` (28,214,398 bytes; a numpy `.npz` of 54 style vectors), sha256 `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d` |
| Voice used | **`em_alex`**: array `em_alex`, shape (510, 1, 256), float32, inside `voices-v1.0.bin` |
| Where the two files came from | GitHub release `model-files-v1.0` of `thewh1teagle/kokoro-onnx` (published 2025-01-28): https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 . Direct links: https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx and https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin . The release notes say: "kokoro-v1.0.onnx (310MB): optimized f32 version from taylorchu/kokoro-onnx (releases/tag/v0.2.0)". |
| Upstream original model | Hugging Face `hexgrad/Kokoro-82M`, **pinned revision `f3ff3571791e39611d31c381e3a41a3af07b4987`** (the `main` commit when this was checked, last modified 2025-04-10): https://huggingface.co/hexgrad/Kokoro-82M/tree/f3ff3571791e39611d31c381e3a41a3af07b4987 . The card lists model v1.0 (2025 Jan 27) with file `kokoro-v1_0.pth`, SHA256 `496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4`. |
| Upstream voice file | `voices/em_alex.pt` at that same revision (523,420 bytes), sha256 `5eac53f767c3f31a081918ba531969aea850bed18fe56419b804d642c6973431` (git blob oid `c65475a0a9be83b6ffa0524cc79ac853e7371f9b`). The card's VOICES.md lists `em_alex` with the short hash `5eac53f7`, which is the start of this sha256. The float32 data in it is **identical** (checked element by element) to the `em_alex` array inside the `voices-v1.0.bin` used here. |
| Run with | `kokoro-onnx` 0.6.1, voice `em_alex`, `lang="es-419"`, **speed 0.77** (`--speed 0.77`), kokoro-onnx defaults for pauses (sentence 0.25 s, clause 0.1 s) and silence trimming |

**What is NOT verified:** the ONNX `kokoro-v1.0.onnx` is a *third-party conversion* (taylorchu, then thewh1teagle's release) of the upstream `kokoro-v1_0.pth`. I did not and could not compare it numerically to the upstream weights, so "same weights as hexgrad's v1.0" is what the release notes imply, not something checked here. The GitHub release assets showed no digest; the sha256 values above are what I computed from the files used.

## License statements (quoted from the sources; read the "unclear" list)

**1. Upstream Kokoro-82M weights (Hugging Face model card, `hexgrad/Kokoro-82M` at `f3ff3571…`).** Card front matter: `license: apache-2.0`. Card text:

- "With Apache-licensed weights, Kokoro can be deployed anywhere from production environments to personal projects."
- "This is an Apache-licensed model, and Kokoro has been deployed in numerous projects and commercial APIs. We welcome the deployment of the model in real use cases."

There is **no separate LICENSE file** in that Hugging Face repo; the license is stated in the card metadata and text only. Full Apache License 2.0 text: `LICENSE-Apache-2.0.txt` (from https://www.apache.org/licenses/LICENSE-2.0.txt).

**2. The ONNX conversion actually used.** The `thewh1teagle/kokoro-onnx` repository (the wrapper code and the release that hosts `kokoro-v1.0.onnx` and `voices-v1.0.bin`) is **MIT** (Copyright 2025 thewh1teagle); `taylorchu/kokoro-onnx` (the source of the ONNX file) is **MIT** (Copyright 2025 taylorchu). **Neither release states a license for the converted weights themselves.** Treating them as Apache-2.0 like the upstream weights is an assumption made here, not a statement from either converter.

**3. The `em_alex` voice.** **Unclear.** The model card and VOICES.md give no license, author, source or recording-consent statement for `em_alex` (or for the two other Spanish voices). The only related statements are general to the whole model, and none names a Spanish voice:

- "Kokoro was trained exclusively on **permissive/non-copyrighted audio data** and IPA phoneme labels. Examples of permissive/non-copyrighted audio include: Public domain audio; Audio licensed under Apache, MIT, etc; Synthetic audio generated by closed TTS models from large providers" with the footnote "No synthetic audio from open TTS models or 'custom voice clones'". Total: "A few hundred hours of audio".
- Its attribution table lists CC BY audio only for Koniwa (Japanese) and SIWIS (French); there is no Spanish entry.
- The card does not say which of those categories the Spanish voices fall in, how long the Spanish training was, or whether a real person's voice (with consent) or synthetic audio is behind `em_alex`. The Spanish rows in VOICES.md have no grade or training-duration columns at all, unlike some other languages.

So: the em_alex style vector is covered by the model repo's blanket Apache-2.0 statement, and the card claims the training data was permissive; but **the voice's own provenance and speaker consent are not stated anywhere I could find**. This is the same kind of gap that made the Piper claude-high voice not ship, only milder in form (here there is a blanket "permissive data" statement, there there was nothing). Hand and George ruled on 2026-10-04 that the blanket statement is enough, as an accepted risk. Not legal advice.

## Not shipped on purpose

The Piper `es_MX-claude-high` voice (a Mexican-Spanish voice) was **deliberately not used**: its model card has no speaker-consent statement. A Piper build bundle is kept off-repo as the preferred voice if its provenance is ever confirmed.

## How the audio was made (build time only; nothing below ships in the app)

- Script: `tools/audio/build_story_audio.py synth --engine kokoro --speed 0.77` (the same script also has `--engine piper`, which is unused for these files). Rebuild steps: `tools/audio/README.md`.
- Kokoro run with `kokoro-onnx` on CPU. **Synthesis was deterministic in this setup**: two full runs of the six paragraphs at speed 0.77 produced byte-identical `.m4a` files (the speed-1.0, 0.85 and 0.75 runs were byte-identical to their repeat runs too, and the script's default speed still reproduces the speed-1.0 files byte for byte). (Same machine, same package versions; not tested on other CPUs or other onnxruntime versions.)
- Post-processing (identical steps to the Piper takes so the files are comparable): peak-normalize to 1.0 (here per paragraph; Piper does it per sentence), then -2 dB, 200 ms silence at both ends, AAC-LC 48 kbps mono via ffmpeg at the engine's native rate (Kokoro: 24,000 Hz; Piper was 22,050 Hz).
- Tool licenses (build tools only, none shipped with the app):
  - `kokoro-onnx` 0.6.1: MIT.
  - `phonemizer` 3.4.0 (a dependency of kokoro-onnx): GPL-3.0-or-later.
  - `espeakng-loader` 0.2.4 bundling **espeak-ng 1.52.0**: GPL-3.0-or-later (the loader package itself declares no license field).
  - `onnxruntime` 1.30.0: MIT. `soundfile` 0.14.0: BSD-3-Clause. `numpy` 2.5.3: BSD-3-Clause. `ffmpeg` 7.1.5 (Debian build).
  - **Whether GPL terms (phonemizer, espeak-ng) reach the audio output is unsettled. This is not legal advice and has not been resolved here.** The tools run at build time and are not distributed with the app.

## Status

Checked with speech recognizers (faster-whisper large-v3-turbo and medium) and by level measurements. **Nobody has listened to these files; the recognizer cannot tell whether they sound like a Mexican speaker, a natural speaker, or an acceptable one.**
