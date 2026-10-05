# Story audio build tool

Build-time only. Lives outside `public/` and `src/`; it is not imported by the app, not part of `npm run build`, and not shipped. Python, not linted by `npm run lint`.

Engines: `--engine kokoro` (used for the files in `public/audio/`) and `--engine piper` (not shipped; Piper es_MX-claude-high has no speaker-consent statement on its model card).

## Rebuild the Kokoro files

```
python3 -m venv .venv && . .venv/bin/activate
pip install kokoro-onnx==0.6.1 soundfile numpy        # needs ffmpeg on PATH; pulls in phonemizer + espeakng-loader (GPL, see NOTICE.md)
BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
curl -LO $BASE/kokoro-v1.0.onnx
curl -LO $BASE/voices-v1.0.bin
sha256sum kokoro-v1.0.onnx voices-v1.0.bin
#  7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5  kokoro-v1.0.onnx
#  bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d  voices-v1.0.bin
python tools/audio/build_story_audio.py synth --engine kokoro --app-jsx src/App.jsx --story 0 \
    --model kokoro-v1.0.onnx --voices voices-v1.0.bin --speed 0.77 --out /tmp/story0     # defaults: --voice em_alex --lang es-419 --speed 1.0
cp /tmp/story0/story-0-p*.m4a public/audio/
```

Pipeline: text -> kokoro-onnx (espeak-ng `es-419` phonemes, voice `em_alex`, speed 0.77 (`--speed`; default is 1.0), library default pauses and trimming) -> peak-normalize to 1.0 (whole paragraph) -> -2 dB -> 200 ms silence at each end -> ffmpeg AAC-LC 48 kbps mono at 24 kHz.

Kokoro-onnx is deterministic in the setup used here: two runs at 0.77 gave byte-identical `.m4a` (and the default speed 1.0 reproduces the older speed-1.0 files byte for byte). A different CPU, onnxruntime or ffmpeg version may still change the bytes; the committed files are the ones that were checked. If `sha256sum` of a downloaded file differs from the values above, stop and compare with NOTICE.md before building.

## Piper engine (reference only)

```
pip install piper-tts==1.8.0
python tools/audio/build_story_audio.py synth --engine piper --app-jsx src/App.jsx --story 0 --model es_MX-claude-high.onnx --out /tmp/story0-piper
python tools/audio/build_story_audio.py list-changes --app-jsx src/App.jsx --model es_MX-claude-high.onnx --out /tmp/changes.json
```

The Piper path drops the glide mark ʲ after a stressed í before a vowel (guía, había ...); `--no-fix` turns that off. Piper adds random noise, so each Piper run is a different take. `list-changes` is Piper-only.
