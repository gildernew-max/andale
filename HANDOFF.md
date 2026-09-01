# HANDOFF

Running log between audits and execution. Newest entry first. Keep each entry short.

## 2026-09-01 (one language switch, splash duplicate gone)

**What changed**
- Splash no longer has the bottom Español / English dump. Header `ES | EN` is the only language control on splash (chrome sits above the overlay). Perfil persist control stays in Perfil.
- Splash copy follows `prog.uiLang`. `langDraft` removed. Flow test: splash has `lang-toggle`; visible Español/English buttons fail.

**Why**
- No face: one switch. Header chrome ticked; splash duplicate had to go.

## 2026-09-01 (ES|EN top right, same persist as Perfil)

**What changed**
- `ES | EN` letters top-right on every screen (home stat bar + lesson/story/game rows + done/failed/rival). Not flags, not a globe, not a settings dump. Active language is weight 900; the other is mute (`D.sub`). Visible labels stay `ES | EN`; `aria-label` is Español / English.
- Same source of truth as Perfil: `save({ uiLang })` → `prog.uiLang` → `andale-v3`. Header tap updates UI immediately; reload keeps the choice. Perfil control stays; both stay in sync. Header chrome otherwise untouched.
- Flow test: missing `lang-toggle` / `lang-es` / `lang-en` fails; toggle EN persists and remount stays EN; Perfil `perfil-lang-*` matches; control still there on other tabs and in a Subjuntivo lesson. Hoy lanterns, Emparejar, XP, coaches, schema, Apple, enroll untouched.

**Why**
- Dave + Hand lock, then No face + George brand lock: language lives top-right on every screen. One persist path.

## 2026-08-31 (Hoy en México lantern line)

**What changed**
- Hoy en México line is San Miguel / Noche de faroles, still matches. Path still Subjuntivo.
- Existing TODAY scene city/title/setup (+ titleEn/setupEn): San Miguel, Noche de faroles / Night of lanterns, La plaza se llena de faroles y nadie tiene prisa. / The plaza fills with lanterns and nobody is in a hurry.
- `sma-lanterns.png` stays on the card. No parroquia. No SMA-life curriculum. UNITS / first-path unit / Subjuntivo presente untouched.

**Why**
- PR 40 put the lantern still on the card while the line was still CDMX / Taquería sin miedo. Still and copy must match.

## 2026-08-31 (Hoy en México lantern still)

**What changed**
- This is the **Hoy en México lantern still**, not match-pairs and not a test lock.
- No face's SMA street PNG is `public/stills/sma-lanterns.png`, shown as the still on the existing Camino first-screen Hoy en México card. Served as `${import.meta.env.BASE_URL}stills/sma-lanterns.png` so Pages `/andale/` does not 404.
- CoachPortrait / mascot / coach PNGs, Subjuntivo, enroll, Camino nodes, unit titles, SMA-life curriculum, XP, speech, match-pairs, schema, Nunito, privacy, Apple wrap untouched.
- `pages.yml` smoke also GETs the still (one-line add next to luna + axolotl).

**Why**
- First-screen card did not feel like Mexico. Same card; Mexican still.

## 2026-08-31 (match-pairs rematch XP lock)

**What changed**
- This is the **rematch XP lock**, not a new game. `startMatchPairs` no longer clears the `match` award lock, so Otra ronda cannot pay another +4.
- Flow test: first round +4, rematch +0, total 4. Lesson / flashcards / gems / hearts / Camino / coaches / speech untouched.

**Why**
- Hand rejected the Emparejar tick on live 645c3cb: Otra ronda farmed +4 per rematch.

## 2026-08-31 (match-pairs in Práctica)

**What changed**
- This is **match-pairs in Práctica**, not another test-lock slice. Hand's live pass had no Emparejar: the engine already auto-builds a match item from unit `pairs` at the end of a Camino lesson, but Práctica had no start.
- Práctica now has `data-testid="match-pairs-start"` (Emparejar / Match pairs). One finite round from existing unit `pairs` (es/en, cap 6). Tiles match by pair id; last pair opens a done screen, then back to Práctica. No wrap, no resample.
- XP is one review item (4), award-locked. No lesson +5, no gems, no heart refund. `src/matchPairs.js` is the tiny helper tests import. UNITS / speech / coaches / Camino / schema / Nunito / privacy / SW / CI / Apple wrap untouched.

**Why**
- Dave: improve features/UX. Learner must be able to open Práctica, start match-pairs, and finish a round.

## 2026-08-31 (PR CI: npm test + build)

**What changed**
- This is **PR CI** (issue 5 gap #1), not another flow test. `.github/workflows/ci.yml` runs on `pull_request` and push to `main`: Node 22, `npm ci`, `npm test` (flashDeck + schema + content + vitest/`flows.test.jsx`), `npm run build`.
- No Pages deploy and no live-URL smoke here. `pages.yml` stays main-only for smoke/deploy. No lint stack (`package.json` has no lint script). App.jsx / XP / speech / coaches / Camino / UNITS untouched.

**Why**
- Wed 9/2 remaining-flow lock. Tests already exist, but only `pages.yml` ran on main (`npm ci` + `npm run build`). A broken PR could merge without `npm test`.

## 2026-08-31 (simulated learner flows)

**What changed**
- This is **simulated learner flows** (issue 5 #4), not the content-schema lock (`src/content.test.js` / 18 units / 198 questions) and not the save/LIVE schema lock (`src/schema.test.js`).
- `src/flows.test.jsx` (jsdom + RTL, no Playwright): boot → Camino → start `subj1` → one MC → `andale-v3` JSON progress kept (no wipe); tab nav via `nav-*`; Práctica → Safe-or-Risky (`data-testid="safe-risky-start"`); Lectura → `story-0` word tap, no leftover “definición pendiente”; section test-out starts and fails closed after 3 misses (`failKind === "test"`).
- Featured Práctica Safe-or-Risky button now carries `data-testid="safe-risky-start"` (the juegos-hub copy was unreachable). `npm test` still runs flashDeck + schema + content, then vitest. XP / speech / coaches / Camino copy / match-pairs / flashcards / Nunito / privacy / SW / UNITS untouched.

**Why**
- Wed 9/2 remaining-flow lock. Tests fail if `nav-perfil` is missing or Safe-or-Risky does not start from Práctica.

## 2026-08-31 (UNITS/SECTIONS content-schema lock)

**What changed**
- This is the UNITS/SECTIONS **content-schema** lock (issue 5 gaps #2/#3), not the save/LIVE schema lock (`src/schema.test.js`).
- `prepQuestion` normalize rules (`tokens`→`words`, `source`→`base`, `answer`→`answers`, `{es,en}` pairs) live in `src/prepQuestion.js`. App still shuffles and builds answerAid on top. UNITS not rewritten.
- `src/content.test.js`: every UNITS question after `prepQuestion` has type; prompt/base/text; answer/answers; mc `choices`; order `words`. Every `SECTIONS[].unitIds` id exists in UNITS; every unit has pairs; FLAT has no undefined units. STORIES / MISSIONS / TODAY_SCENES have ids + required fields (`story-0` cannot vanish).
- `npm test` runs flashDeck + schema + content. Curriculum, XP, speech, coaches, Camino, match-pairs, flashcards, Nunito, privacy, SW untouched.

**Why**
- Wed 9/2 remaining-flow lock. A deleted unit id left in SECTIONS, or an mc with no choices after prep, must fail CI before a blank tile bank.

## 2026-08-31 (schema test lock)

**What changed**
- `acceptProgress` / `acceptLive` / `CONTENT_VERSION` moved to `src/schema.js` (same rules as ff7ad10). `src/schema.test.js` now locks: save without `contentVersion` is kept and stamped 2; shapeless or lesson-without-`questions` LIVE/progress stays home (no throw). `npm test` runs flashDeck + schema.
- Confirmed no service worker: no `navigator.serviceWorker.register`, no `public/sw.js`. Test fails if one is added. No SW added.
- Curriculum, match-pairs, XP, speech, coaches, Camino copy untouched.

**Why**
- Hand checklist still had Schema test OPEN after the corrupt-save ship. Behavior was in App.jsx with no `src/*.test.js` Hand can tick.

## 2026-08-31 (Camino shortcuts: four names)

**What changed**
- Camino footer `L.shortcuts` still listed Luna, Don Rafa, Valeria. Now all four: Luna, Don Rafa, Valeria, Diego. Same sentence; no new tagline. Locked job strings and strip layout untouched.
- XP, speech, Nunito, schema, privacy, flashcards, portraits untouched.

**Why**
- Hand ticked the four-card strip (PR 33) and flagged the leftover three-name helper line under it.

## 2026-08-31 (Diego on Camino strip)

**What changed**
- Camino path footer strip was `["luna", "rafa", "valeria"]` in a 3-column grid. Now includes `diego` in 4 columns so Rival sits with Coach del día, Mentor de cuentos, and Coach de precisión. Same `COACHES.role` lines. No new copy.
- XP, speech, Nunito, schema, privacy, flashcards, portraits/PNGs untouched.

**Why**
- Hand: first three jobs visible on the path; Diego Rival was in `COACHES` and Perfil only. Learner should see all four locked job lines on Camino without hunting Perfil.

## 2026-08-31 (Spanish coach job titles)

**What changed**
- Learner-facing `COACHES.role` for all four: Luna `Daily coach` → `Coach del día`, Rafa `Story mentor` → `Mentor de cuentos`, Valeria `Precision coach` → `Coach de precisión`, Diego `Dialogue rival` → `Rival`. Same jobs. No other copy invented.
- Portraits, PNGs, names, XP, speech/Paulina, Camino layout, Nunito, schema, privacy/support, flashcards untouched.

**Why**
- Locked copy (No face / George / Hand). Diego `Rival` locked by No face after the first three. Pulled forward while Apple case 20000152539159 waits.

## 2026-08-30 (Camino Spanish titles)

**What changed**
- Six later unit `title`s on Camino were English (`Future & conditional`, `Pluperfect & conditional perfect`, `Se: passive, impersonal, accidental`, `Object pronouns advanced`, `Relative pronouns`, `Reported speech`). Now Mexican Spanish, matching the existing grammar-guide names. IDs / XP / routing / layout / coaches untouched.
- Those units also lacked `desc` (tooltip / sheet showed blank or English `blurb`). Added Spanish `desc` + `blurb`. Already-Spanish titles kept.

**Why**
- Path nodes, hero subtitle, and the preview sheet are learner-facing. English product copy on Camino.

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
