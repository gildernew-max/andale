# HANDOFF

Running log between audits and execution. Newest entry first. Keep each entry short.

## 2026-08-30 (flashcards end)

**What changed**
- A flashcard run now snapshots a finite unique deck (due saved → other saved → unit pairs from SRS / mistakes / started units, cap 12). Index increments; no `%` wrap and no mid-run resample of two pairs.
- Last card opens a done screen (`¡Deck terminado!` / Deck complete) with count and Otra ronda. XP rates, speech, coaches, Camino, Nunito, schema/contentVersion untouched.

**Why**
- Hand: flashcards never ended and only two cards. `flashIdx % practiceCards.length` looped, and grading rebuilt the due list so the same two items came back.

## 2026-08-30 (self-host Nunito)

**What changed**
- Dropped the Google Fonts `@import`. `public/fonts/nunito-{600,700,800,900}.woff2` (SIL OFL) are `@font-face`d via `import.meta.env.BASE_URL` so Pages / WKWebView load `/andale/fonts/`.
- `fontFamily` stays `'Nunito','Avenir Next',system-ui,sans-serif`. Schema/save, XP, speech, coaches, Camino, favicon/meta, privacy.html / support.html / Perfil links, curriculum untouched.

**Why**
- WKWebView / TestFlight cannot reach fonts.googleapis.com. Same-origin Nunito.

## 2026-08-30 (privacy + support pages)

**What changed**
- Host George’s `public/privacy.html` and `public/support.html` as-is (August 30, 2026; no inbox).
- Perfil: Privacidad → `${import.meta.env.BASE_URL}privacy.html`, Soporte → `${import.meta.env.BASE_URL}support.html`. No mailto. No `/privacy.html` root href.
- XP / speech / coaches / Camino / schema / Nunito / favicon / smoke untouched.

**Why**
- Need live Pages URLs for wrap. Copy is George’s. No inbox yet.

## 2026-08-30 (schema slice: CONTENT_VERSION + no white-screen)

**What changed**
- `CONTENT_VERSION` (2) now governs `andale-v3`: written on every persist. After parse, only a plain object is accepted. Missing `contentVersion` stamps 2 and keeps progress (live users). Present-but-unreadable versions wipe to defaults instead of crashing.
- LIVE (`andale-v3-live`): require an object; `screen==="lesson"` needs `session.questions` as an array. Fail → ignore live, stay home, `liveReady=true`.
- Render: `session?.questions?.[qi] ?? null`. Optional ErrorBoundary in `main.jsx` so a throw cannot white-screen.
- Persist stringify is try/caught. Camino / Nunito / privacy pages / XP / speech / curriculum untouched.

**Why**
- Parseable-garbage LIVE (`screen: lesson` without `questions`) set the lesson screen and threw on `session.questions[qi]`. Dead const never migrated or rejected saves.

## 2026-08-30 (favicon + listing meta)

**What changed**
- `index.html`: locked title/description, theme-color `#58CC02`, og/twitter tags, apple-touch-icon. Icon hrefs use `%BASE_URL%` so Pages at `/andale/` does not 404 `/favicon.ico`.
- Favicon/ico/svg and `apple-touch-icon.png` derived from `public/mascot/axolotl.png`. App.jsx / coaches / Camino / curriculum untouched.

**Why**
- Absolute `/favicon.ico` is wrong under Vite `base: '/andale/'`. Tab still showed the generic green mountain SVG.

## 2026-08-30 (post-deploy live URL smoke)

**What changed**
- `.github/workflows/pages.yml` `smoke` job runs after `deploy`. It HTTP GETs https://gildernew-max.github.io/andale/ plus `/andale/coaches/luna-happy.png` and `/andale/mascot/axolotl.png`, retries ~60s for Pages lag, and fails the workflow on non-200 or Pages 404 HTML.
- App.jsx / XP / speech / coaches / curriculum untouched. Repo stays public.

**Why**
- `vite build` + artifact upload never fetched the public URL. A green deploy could still leave the live site as a 404.

## 2026-08-30 (Camino header axolotl)

**What changed**
- Camino sticky TOP STAT BAR now renders `<LogoMark size={34} />` (`${import.meta.env.BASE_URL}mascot/axolotl.png`) instead of the unused green mountain SVG next to "ándale".
- CoachPortrait, coach PNGs, XP, speech, path nodes, Thursday play, tap-miss, chips, SALIR, curriculum untouched.

**Why**
- Hand: header still showed the mountain. LogoMark was defined on main (PR #23) but never mounted.

## 2026-08-30 (PNG coaches + mascot)

**What changed**
- Happy / default `CoachPortrait` is an `<img>` from `public/coaches/{id}-happy.png` via `import.meta.env.BASE_URL`. Sad / party / focused stay the inline SVG. Badge overlay still draws on top.
- `LogoMark` uses `public/mascot/axolotl.png` the same way. XP / speech / path / Thursday play / tap-miss / chips / SALIR / curriculum untouched.

**Why**
- Drive stills are already on this branch. Wire them; keep SVG for non-happy moods.

## 2026-08-30 (review perfect bonus lock)

**Lock**
- Finish lesson: `perfectBonus` is `wrong === 0 && !session.review`. One-card Repasar stays +4 XP. No extra +5.
- Path, Thursday play, `speak()`, per-item XP lock, splash, tap-miss, chips, SALIR, listen-type untouched.

**Why**
- Hand Claude audit: clean review was 4+5=9, zero hearts, farmable. Restore the review gate dropped in the XP lock PR.

## 2026-08-30 (PROBAR VOZ must speak on tap)

**Repro** (Hand, live, 3:06 ET): Perfil → PROBAR VOZ. Tap did not start `speechSynthesis`. `speaking` stayed false. Box has no Paulina. Fail even with Google Spanish voices.

**Cause**
- `speak()` no longer bailed on a null Paulina / es-MX pick (that part of the hypothesis is gone).
- It still called `cancel()` then waited `voiceschanged` + 80ms. Chrome treats that as not a user gesture, so `speak()` never starts.

**Fix**
- Same-tick `speechSynthesis.speak()`. No async `getVoices()` wait. Cancel only if already speaking.
- Paulina if present; else any `es-*` (es-MX preferred). Empty list: still speak with `lang es-MX`.
- Naming Paulina can wait for the iPhone. No recording. Path / splash / tap-miss / chips / SALIR / listen-type / XP untouched.

## 2026-08-30 (XP lock — one item, once)

**Repro** (Hand, live): one Repasar card showed +4 XP, then the same card jumped to +12 with no extra tap. Total 185→197. Gems 25→35. Expected ~9 with the perfect bonus.

**Lock**
- Each item can add session XP once (`itemAwardKey`). Double check / remount cannot restack the card.
- Finish commits `sessionXP + 5` once. Perfect is a flat +5, not a second copy of item XP.
- Review cards are 4 XP (almost 3). Done screen ticks the real total (4+5=9 on a clean one-card).
- Gems: 1 per hit when the session has ≤2 items. No flat +10 on a 4-point card. Longer reviews/lessons keep 10/15.

**Why**
- applyResult had no per-item lock; finish always paid review gems=10 and used the lesson 10/12 rate. Path / splash / audio untouched.

## 2026-08-30 (Paulina named, do not mute)

**What changed**
- Speak no longer returns silent when the pick is not an exact es-MX match. Paulina if present; else prefer es-MX; else any Spanish; else still request `es-MX`.
- Picker and Perfil name **Paulina** when the device has her (including Apple’s “Spanish (Mexico)” listing). Empty-voice copy waits until voices have loaded.
- Voice list polls + `onvoiceschanged`. No recording. Splash and path untouched.

**Why**
- Live: silent audio, Perfil “No se encontraron voces en español”, picker was Google TTS, Paulina never named. Brand lock: do not mute if she exists.

## 2026-08-30 (ET, after PR 13)

**Hand** (https://gildernew-max.github.io/andale/)
- Chip-move retest after PR #13: clean.
- Tap a placed chip to unplace; the next chip fills the hole.
- No more full live passes from Hand this seat.

**Why**
- Retest after chip-move (PR #13) merged and Pages deployed. Wrap starts Mon Sep 8 (Kalesi). TestFlight on Dave’s phone Sep 13 — not Store live. Store still shut. No new curriculum.

## 2026-08-30 (Paulina never muted)

**What changed**
- If any system Paulina voice exists, she is the reading voice — ahead of every other TTS, including a saved dropdown pick.
- First speak waits for `voiceschanged` so Chrome’s empty first list cannot mute her.

**Why**
- Brand lock: do not mute when Paulina is available. No recording. Finish list untouched.

## 2026-08-30 (reposition placed chips)

**What changed**
- Word-bank / order: tap a placed chip to return it to the bank. The next bank tap fills that hole, so one wrong word can move without Borrar on the whole row.
- Bank grid stays stable (`visibility: hidden` + `.tile-slot`). Hidden holes are still tappable to unplace. `data-tile-id` follows the live chip.
- Order also has a small Borrar. Paulina default from the voice PR is untouched (`DEFAULT_VOICE_NAME`).

**Why**
- Dave: after a chip is placed he must be able to reposition it. Hypothesis was locked chips / only Borrar — tap-to-unplace existed but bank chips were `disabled` + `pointer-events: none`, so the hole could not return a word and a mid-row fix appended at the end.

## 2026-08-30 (TTS retry stays Mexican)

**What changed**
- Chrome’s dead-engine retry now uses the same Paulina / es-MX voice. It no longer speaks a bare utterance that could fall back to es-ES.

**Why**
- Brand lock: mute or Mexican system TTS only. No recording. Finish list untouched.

## 2026-08-30 (Paulina default voice)

**What changed**
- Auto TTS now prefers system **Paulina** (especially es-MX), then any es-MX voice. No new files, no mascot voice, no recording.
- If the device has neither Paulina nor es-MX, readings stay quiet instead of falling back to Spain (es-ES). The existing voice dropdown still lets a learner pick any listed voice.

**Why**
- Dave’s gut check: the app works; he does not like the reading voice. Brand lock from No face. Finish-list items already shipped in #9/#10/#12.

## 2026-08-30 (Hand leftovers: glossary placeholder, XP, favicon)

**What changed**
- Story tap card no longer shows leftover “definición pendiente” / “definition coming soon”. Words without a gloss show the word only — no invented definition.
- Lesson/game/story XP commits once: award lock + `save(prev => prev.xp + earned)` so double Continuar / Enter cannot double-count. Same guard on story claim and minigames.
- `public/favicon.ico` + `favicon.svg` (Camino mountain mark) and `<link rel="icon">` so Pages stops 404ing `/andale/favicon.ico`.

**Why**
- Finish remaining Hand items from issue 5. Items 1/4/5/7 already shipped in #9/#10. Engine kept. No new curriculum.

## 2026-08-30 (ET, after PR 9)

**Hand** (https://gildernew-max.github.io/andale/)
- First tap after screen change: pass.
- Wrong word tap: pass.
- SALIR SIN GUARDAR (same tab): pass.
- Listen/type eaten sentence: pass.
- Paulina is not on Hand’s computer; default there is “Mejor voz española.” Device TTS list, not a miss of the four fixes. Brand still wants Paulina when the device has her.

**Why**
- Retest after tap-miss (PR #9) merged and Pages deployed. Store still shut pending Varys format review and two-week dates. No new curriculum.

## 2026-08-30 (live session across resize)

**What changed**
- Opening DevTools (viewport resize) remounted the app: in-memory `screen`/`combo`/`session` reset to Camino + combo 0. There is no wipe-on-resize listener; the remount dropped React state.
- Live view now flushes to `andale-v3-live` on resize / pagehide / visibility, and restores on boot. A resize must save, never reset.

**Why**
- Same first-tap / screen-change miss class. Engine kept. No new curriculum.

## 2026-08-30 (first-tap miss)

**What changed**
- First tap after a view swap could miss: `.pop` scaled the hit box on the same frame as the click. Animation is opacity-only now. Leftover word/sheet/exit overlays clear on `screen` change.
- Word-bank / order chips keep their grid slots (`visibility: hidden` + `data-tile-id`) so picks do not detach sibling handles.
- `SALIR SIN GUARDAR` is `type="button"` (all `Btn`s), `preventDefault`, `data-testid="quit-without-save"` — must close the lesson in-place, not open a tab.
- Listen/type: grade the live input; a stray first chip cannot overwrite a typed sentence (the “Es” submit).

**Why**
- Finish item from the 2026-08-30 live pass. Engine kept. No new curriculum.

## 2026-08-30 (ET)

**Console** (https://gildernew-max.github.io/andale/)
- Story Cena con la suegra (Pátzcuaro) via Jugar la escena. Quiz Q1–Q4 passed. No remount. Console only: favicon.ico 404.
- Word-bank chips reflow after every pick (stale DOM). Tester “element not attached to the DOM” death, not a crash.
- SALIR SIN GUARDAR opened a new tab at the same URL, home path; original tab stuck on the modal.
- Subjuntivo presente listen/type Q1: full typed sentence submitted as just “Es” (word-bank overrode typed text). Heart lost. No console error.

**Hand**
- Story and quiz finished clean.
- Flashcards work but never end, and only two cards. No match-pairs.
- First tap after a screen change can miss. That is the finish item (fixed in the entry above).

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
