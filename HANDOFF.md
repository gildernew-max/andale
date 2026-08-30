# HANDOFF

Running log between audits and execution. Newest entry first. Keep each entry short.

## 2026-08-30 (ET)

**What changed**
- Live console pass on https://gildernew-max.github.io/andale/.
- Story Cena con la suegra (Pátzcuaro) opened via Jugar la escena. Quiz Q1–Q4 passed. No React remount. Console only: favicon.ico 404.
- Word-bank chips reflow after every pick (stale DOM). That is the tester “element not attached to the DOM” death, not a crash.
- SALIR SIN GUARDAR opened a new browser tab at the same URL, home path, original tab stuck on the modal.
- Subjuntivo presente listen/type Q1: full typed sentence submitted as just “Es” (word-bank state overrode typed text). Heart lost. No console error.

**Why**
- Store still shut. Track issue 5.

## 2026-08-30

**What changed**
- v3 engine landed on `main` (PR #2, `src/App.jsx` ~494KB, `STORAGE_KEY andale-v3`).
- GitHub Pages is live: https://gildernew-max.github.io/andale/ (workflow `.github/workflows/pages.yml`; first two `main` deploys failed until the Actions source was enabled, then `bb74eb6` succeeded).
- Plan issue opened: https://github.com/gildernew-max/andale/issues/5
- This file added as the audit → execution bridge.

**Why**
- Web/Pages first. App Store is the destination; no wrap, no store binary, no Apple Developer enrollment this pass.
- Dave owns the gut-check (fun; would a learner quit at unit three). The team owns lint, build, and simulated flows.
- SMA-life (INM, notario, medical) is a possible later *section*, not a rebrand. Do not invent that content. Store listing/copy and SMA photos wait until after Dave's first test.

**Open questions**
- After Dave plays through Sección 1 (unit three = `porpara`), is it fun or homework?
- Story audio: commit the missing `public/audio/story-0-p*.m4a` files, or keep TTS fallback only?
- When (if ever) to enroll Apple Developer ($99) — not this pass.
- SMA-life later vs never. Do not write units until Dave asks.
- Repo license before any store listing.

**Note:** Issues #3 and #4 were accidental create-probes while opening the plan. #5 is the real issue. Close #3/#4 as not planned if they are still open.
