# HANDOFF

Running log between audits and execution. Newest entry first. Keep each entry short.

## 2026-09-04 (day-2 return Hoy ≤60s — George + No face lock)

**What changed**
- Day-2 return Hoy gates ≤4 (`isShortHoy` / `trimHoyBeats`). Native scene only (setup · line · Q). Early win, ES `¡Eso!` · EN `That's it.`
- Live casero and tomorrow `Mostrador en caos` are already 3 beats. No cut list. No invented copy.
- `shouldParkHoyUnderMas` only if a scene grows past 4. Live titles do not park under Más.
- Door / paywall / teaser / handoff / first Hoy+Doctora / door diet / Más bury / enroll stay.

## 2026-09-04 (soft paywall cannot survive midnight)

**What changed**
- Soft paywall display follows `shouldShowSoftPaywall` only. Stale `softPaywall` session flag no longer ORs the modal open. Effect clears + disarms whenever the gate is false — not only when `paywallSeen`.
- Midnight / day-2: undismissed wall goes away; free/backdrop dismiss cannot arm Doctora handoff. Promised Hoy is the hero. `todayKey` follows the ticking `now` clock.
- Test: paywall open → day rolls → modal gone, no `post-dismiss-handoff`. Door / Doctora / handoff-on-same-day dismiss / teaser / enroll untouched.

**Why**
- Hand Claude HOLD: undismissed wall survived midnight and a dismiss stole the day-2 Hoy.

## 2026-09-04 (day-2 return door — promised Hoy hero + teaser plain text)

**What changed**
- Day-2+ return (`isDay2Return`: streak ≥ 1, lastDay ≠ today) opens the promised Hoy (yesterday’s `Vuelve mañana…` / `Come back tomorrow for '…'`) as the one hero CTA. Playable Hoy card in `first-door-hero`, not buried. Doctora stays `first-door-alt`.
- Hand lock: no cold pitch dump on that door. `showColdPitch` keeps `L.splashLine` on streak 0 only; streak ≥ 1 / day-2 return does not dump the first-visit short pitch as a second hero.
- Soft paywall stays once-only: `paywallSeen` never re-fires; day-2 before today’s win does not open the wall.
- George + No face LOCKED teaser as plain text only (not a CTA): ES `Vuelve mañana por «{title}».` / EN `Come back tomorrow for “{title}”.` Quiet `<p>` outside `first-door-hero` — no button, no fake tap, `pointerEvents: none`. Generic fallback unchanged. Hidden on day-2 while the promise is the hero.
- Tests: helper + flow lock streak≥1 return → Hoy hero, no home-pitch; paywallSeen → no paywall; teaser is non-interactive plain text. Door diet, first Hoy/Doctora ≤60s, honesty, post-dismiss handoff, Más, name, casero, splash, enroll untouched.

**Why**
- Hand stamp: return door is the promised Hoy title as the one CTA. Cold pitch as a second card kills the come-back.

## 2026-09-04 (first Doctora ≤60s to win — No face / Hand lock)

**What changed**
- First-session / streak-0 Doctora is a short path: cap 4 (`trimDoctoraBeats` / `pickFirstDoctoraBeats` in `doctoraWin.js`). George lock keep 4; later sessions keep all 6 (parked included).
- Early win checkpoint: first correct (empty Curarla or accepted guess) finishes (`shouldDoctoraEarlyWin`). Win heading reuses Hoy lock: ES `¡Eso!` · EN `That's it.` — not ¡Ganaste!/You won!. No pep.
- Then existing streak-1 + `Vuelve mañana…` + soft paywall / post-dismiss Doctora handoff (`post-dismiss-handoff`, not Hoy-as-hero). Later Doctora stays on the board after beat 1.

**Why**
- Same ≤60s first-attention rule as first Hoy. If they pick Doctora first, they must win before the wall.

**Beat lock (George + No face)** — first-session keep only these 4 (existing copy):
- café — `¿Me da un café, por favor?`
- ganas — `Tengo muchas ganas de verte.`
- sentido — `Eso tiene sentido.`
- esperando — `Te estoy esperando.`

**Park (later Doctora only):**
- decisión — `Necesito tomar una decisión.`
- postularse — `Voy a postularme al trabajo.`

## 2026-09-04 (post-dismiss handoff — Doctora second beat)

**What changed**
- Free dismiss (`Seguir gratis por ahora` / `Continue free for now`) no longer dumps to idle home. Same-session flag `postDismissHandoff` lands Camino on one Doctora CTA: existing `L.phraseDoctorTag` / `L.phraseDoctorCta` / `L.phraseDoctor` only. Opens Phrase Doctor (`openDoctor`).
- No new CTA lines. Stamps hold: `Arreglar una frase` / `Fix a phrase` + `GANA EN 60 SEGUNDOS` / `WIN IN 60 SECONDS`.
- Price-plan dismiss stays on normal home (no handoff). Flag is React-only — remount is idle return home. Door locks, paywall copy, splash, Más, name, casero, door diet, ¡Eso!, enroll untouched.

**Why**
- No face conversion-critical + CTA stamp hold: same-session second beat, reuse existing Doctora copy, no invented lines.

## 2026-09-04 (soft paywall after first streak-1 Hoy CONTINUE)

**What changed**
- Existing trigger kept: `shouldShowSoftPaywall` = come-back / streak-today && !paywallSeen && !splash && home.
- Hoy CONTINUE stamps come-back flags then goes home so the gate fires once after `¡Eso!` + `Vuelve mañana…`. Backdrop armed so that tap cannot stamp `paywallSeen` without a visible modal.
- Honesty + price copy unchanged. Cold Hoy flow: CONTINUE → `soft-paywall` once; dismiss stays gone.

**Why**
- Live `index-C448UG4u.js`: CONTINUE after first Hoy win landed on home without the existing paywall gate seeing come-back, or marked seen on the same tap.

## 2026-09-04 (first Hoy ≤60s to win — No face)

**Also**
- Luna host greeting on Camino is gated with the same `showDoorMeta` / streak ≥ 1 helper as Meta, Rayo, and the coach-strip. First screen is short pitch + Hoy + Doctora only.

**What changed**
- First-session / streak-0 Hoy is a short path: scene MC first, then listen, extras, cap 4 (`trimHoyBeats` / `hoyBeatCap` in `hoyWin.js`).
- Early win checkpoint: first correct beat finishes (`shouldHoyEarlyWin`). Win heading LOCKED: ES `¡Eso!` · EN `That's it.` — not ¡Ganaste!/You won!. No pep (no coach win quip, impeccable, perfect banner, milestone).
- Then existing streak-1 + `Vuelve mañana…` + soft paywall/wall. Later Hoys keep the shuffled 5-beat scene.
- Tests: helper cap + checkpoint + strings; first-win flow wins after beat 1 of 5; later Hoy stays in-scene after beat 1.

**Why**
- If they cannot win Hoy before the wall, they bounce. First attention window is ≤60s.

## 2026-09-04 (door diet until streak ≥ 1)

**What changed**
- Camino door hides Meta `0/40`, Rayo OFF, and the four-coach strip until streak ≥ 1 (`showDoorMetaChrome` in `firstDoor.js` — same first-win gate as teaser/paywall).
- First screen stays short pitch + Hoy + Doctora + quiet Más. Rayo is hidden chrome only, not deleted.
- After streak-1, Meta / Rayo / coaches return with existing `Vuelve mañana…` teaser.
- Tests: cold open / streak 0 hides Meta/Rayo/coaches; streak ≥ 1 shows them. Paywall, honesty, door hero, splash, word-order tip, Perfil Intermedio, cold EN, Más bury, name, casero, skill chips, enroll, JEOPARDY untouched.

**Why**
- Empty theater (0/40, Rayo OFF, unused coaches) kills enjoyment before the first win.

## 2026-09-04 (Más / More bury + name + casero)

**What changed**
- When Hoy / Doctora is the door, EMPIEZA / Repasar / Rutina diaria sit under one quiet control: ES `Más` / EN `More`. Not a second hero. Camino stays the tab name. No other bury labels.
- First screen is the life door only (Hoy card + Doctora alt, or Doctora hero + Hoy card). Path CTAs appear after Más.
- Name field: ES `¿Cómo te dicen?` / EN `What do they call you?` (`L.namePrompt`). Form-feel `¿Cómo te llamamos?` / `What should we call you?` gone.
- Landlord WhatsApp Hoy: title kept. Setup / line / answers / explain / question / choices / answer rewritten to the George lock (WhatsApp, not formal email).
- Tests: Más/More bury + expand; name strings; landlord copy. Door/paywall/honesty, splash line/CTA, word-order tip, Perfil Intermedio, cold EN default, skill chips, enroll, JEOPARDY, Rayo untouched.

**Why**
- George + No face: competing path CTAs were a second hero beside the life door. Name prompt was form-feel. Casero line still sounded like correo formal.

## 2026-09-04 (Perfil Intermedio + cold-open EN)

**What changed**
- Perfil floor level is `Intermedio` / `Intermediate`. Visible `Principiante` / beginner is gone. Theater still buried until earned (`hasLearnerProgress`). Prefer show Intermedio when a level is shown.
- Cold-open: empty first visit defaults `uiLang` EN (`DEFAULT_UI_LANG`). Header ES|EN still flips; persist unchanged. Returning saves without `uiLang` stay ES.
- Product content stays mexicano: skill chips (`Subjuntivo presente`, etc.) stay Spanish in both langs.
- Tests lock Intermedio/Intermediate strings and cold-open default EN. Splash copy/CTA/structure, first door, paywall/honesty, word-order tip, teaser, JEOPARDY, Rayo, enroll, Más bury, name, Landlord untouched.

**Why**
- No face: intermediate product cannot call them beginner. US store first visit opens EN; learner Spanish stays Spanish.

## 2026-09-04 (word-order tip placement lock)

**What changed**
- Placement lock: tip card AFTER a miss that is a listed alternate order. Accept / soft-credit that miss. Short card only.
- Copy stays exact: ES `Orden distinto, mismo sentido. En formal, ambas valen.` / EN `Different order, same meaning. Formally, both work.`
- Primary surface: Doctora de frases. Miss (typed formal / other listed order) stays visible; tip sits under it. Formal/register lessons use the same after-miss slot when variants are listed.
- Not on splash. Not on paywall. Not a blocking modal. Door / paywall / honesty stay. Enroll off.

**Why**
- No face placement lock. The tip belongs after the accepted miss, not as a lecture or overlay.

## 2026-09-04 (word-order tip — George + No face)

**What changed**
- Phrase Doctor / natural–formal phrases accept listed equivalents (word-order variants, or the other register) BEFORE a hard fail.
- Short tip card, locked: ES `Orden distinto, mismo sentido. En formal, ambas valen.` / EN `Different order, same meaning. Formally, both work.`
- Learner can type a guess on Doctora. Formal (or a listed alternate order) is accepted and shows the tip. Unlisted still hard-fails. Empty Curarla stays the 60-second win.
- Lesson type/transform/order uses the same `gradeListedPhrase` so a listed alternate order is not a miss.
- Tests lock tip strings + equivalent-before-fail. First door, soft paywall (honesty line stays), splash, Camino short pitch, tomorrow teaser, JEOPARDY SOLO, Rayo, enroll, PrivacyInfo untouched.

**Why**
- George + No face lock. Same meaning, different order (or dual-acceptable formal/natural) should not be a hard fail.

## 2026-09-04 (paywall honesty under price CTAs)

**What changed**
- Soft paywall honesty line under the price CTAs: ES `Práctica · sin cobro todavía` / EN `Practice · no charge yet`. Wired via `L.paywallHonesty` (`data-testid="soft-paywall-honesty"`).
- `$39.99` / `$6.99` and `Seguir gratis por ahora` / `Continue free for now` stay visible. No Stripe, no IAP, enroll off.
- `first-door-alt` (Doctora `Arreglar una frase`) stays on the home door after win/paywall. Splash gate + Saltar-gone + Camino short pitch from PR 64 untouched.

**Why**
- No face: price buttons were a false IAP hit without an honesty line. Practice, no charge yet.

## 2026-09-04 (splash residual Saltar + Camino home pitch)

**What changed**
- Splash keeps the locked line: ES `Español mexicano real. Más allá de lo básico.` / EN `Real Mexican Spanish. Past the basics.` Primary CTA stays `¡Empezar!` / `Start!`.
- Saltar / Skip is gone from splash. One primary CTA only — no equal-weight sibling, no `¡Empezar! Saltar` mash. Empty name + Empezar is the skip path.
- Camino home pitch under the greeting uses the same short lock (`L.splashLine`). Long blob `para quien ya pasó lo básico: cuentos, misiones…` / `for people past the basics: stories, challenges…` is gone.
- **Gate fix (live index-ClqecVqS.js quit risk):** splash used `!welcomed && !(xp>0) && screen==="home"`. Leftover `andale-v3-live` (lesson/done) set `screen` off home and hid splash on a first visit. Splash now follows `isFirstVisit(prog)` only (`!welcomed && !(xp>0)`). Default `welcomed: false`. LIVE restore is skipped on first visit. Returning users still restore LIVE.
- Tests: empty-storage first boot still has Empezar after hydrate; leftover LIVE cannot steal splash; single CTA; home pitch short lock; long blob gone.
- First door, soft paywall, tomorrow teaser titled line, JEOPARDY SOLO, Rayo, enroll, PrivacyInfo untouched.

**Why**
- Residual after the marketability pass: Saltar still sat equal beside Empezar. Home Camino still had the long pitch blob. Live first visit skipped splash when LIVE leftover moved `screen` off home.

## 2026-09-04 (tomorrow teaser + return door)

**What changed**
- After streak-1, Camino teaser names tomorrow’s Hoy when the same day-hash can resolve it: ES `Vuelve mañana por «{title}».` / EN `Come back tomorrow for “{title}”.` Example lock: 2026-09-05 → `Mostrador en caos` / `Airport Counter Chaos`.
- Generic `siguiente escena` / `next scene` stays as fallback when the title is unknown. HOLD generic strings untouched.
- Return door with streak ≥ 1 locked: open Hoy → `Jugar la escena` / Play the scene; Hoy done → Doctora `Arreglar una frase` / Fix a phrase. Never Subjuntivo Continuar as hero. Empieza stays demoted; empty Principiante theater stays buried.
- Soft paywall, splash, JEOPARDY SOLO, Rayo, enroll, PrivacyInfo, IAP untouched. Paywall still after first win once.

**Why**
- George stamp: the vuelve line should tease the next real Hoy title, not a generic scene. Return door hero was already the rule — lock it on streak ≥ 1.

## 2026-09-04 (splash marketability pass)

**What changed**
- Splash line locked: ES `Español mexicano real. Más allá de lo básico.` / EN `Real Mexican Spanish. Past the basics.`
- One primary CTA: `¡Empezar!` / `Start!` (`textTransform` none so the live label stays exact). Saltar / Skip stays a secondary text control in a column stack — no `¡Empezar!Saltar` mash.
- Splash hero is the axolotl `LogoMark`. No SMA photos. No Subjuntivo on the splash overlay.
- Wired via `L.splashLine` / `L.splashCta` / `L.splashSkip`. Tests lock exact strings + no mashed CTA.
- First door, soft paywall, tomorrow teaser, JEOPARDY SOLO, Rayo, enroll, PrivacyInfo untouched.

**Why**
- No face marketability pass. Splash was a coaches dump + Let's go! / Saltar mash.

## 2026-09-04 (soft paywall after first win)

**What changed**
- Single `useEffect` opens the paywall when `showComeBackTomorrow && !paywallSeen` and not splash (`!welcomed && !(xp > 0)`). Home-only so Hoy celebration is first; Phrase Doctor Curarla (streak bump, no done screen) also fires.
- Modal clones the heartsModal shell (`data-testid="soft-paywall"`, zIndex 60).
- Locked copy via `L.paywall*` next to `comeBackTomorrow`. ES: `Ya empezó tu racha.` / `Camino completo: escenas, Doctora de frases, cuentos. Mexicano real, más allá de lo básico.` / `$39.99 al año` / `$6.99 al mes` / `Seguir gratis por ahora`. EN: `Your streak just started.` / `Full path: scenes, Phrase Doctor, stories. Real Mexican Spanish past the basics.` / `$39.99 / year` / `$6.99 / month` / `Continue free for now`.
- `paywallSeen` on dismiss or CTA. CTA also sets `unlockedPrem` + `paywallPlan` locally — no Stripe, no IAP, no enroll, no free-play brick.
- First door, Empieza/Subjuntivo, JEOPARDY SOLO, Rayo ON/OFF, PrivacyInfo, vite base untouched.

**Why**
- Coin + No face: $0-safe funnel practice after streak-1. Soft UI only.

## 2026-09-04 (a11y/lang: perfil context + listen/story-nav)

**What changed**
- Perfil `perfil-lang-*` aria follows `uiLang`: ES `Idioma de contexto: inglés` / `Idioma de contexto: español`, EN keeps `English context language` / `Spanish context language`.
- Lesson listen + slower and story listen/nav aria follow `uiLang`: Escuchar/Listen, Más lento/Slower, Escuchar párrafo/Listen to paragraph, Escuchar palabra/Listen to word, Preguntas/Questions, `Párrafo n`/`Paragraph n`.
- Tests lock both live strings. First door, Hoy, Phrase Doctor, streak, Empieza, Subjuntivo, theater gates, JEOPARDY SOLO, Rayo ON/OFF / `${n} segundos`, enroll, PrivacyInfo, paywall, mute/node (PR 57) untouched.

**Why**
- Soft polish leftover: Perfil aria was always English; lesson/story listen + story-nav aria were always ES.

## 2026-09-04 (George + No face: extra por racha + NARRACIÓN)

**What changed**
- Safe/Risky hub reward: ES `5 rondas · extra por racha · gemas` / EN `5 rounds · streak extra · gems`. No bonus.
- Lectura narration chrome: ES `NARRACIÓN` / EN `NARRATION`. LAB DE NARRACIÓN / NARRATION LAB dropped.
- Wired via `L.safeRiskyReward` and `L.narrationLabel`. Live Práctica Safe/Risky card shows the same reward line.
- Tests lock the exact ES/EN strings. First door, Hoy, Phrase Doctor, streak-1/vuelve, Empieza/Subjuntivo, JEOPARDY SOLO, Rayo ON/OFF, enroll, PrivacyInfo, paywall, mute/node aria (PR 57) untouched.

**Why**
- George + No face locked these two leftover chrome lines after the ES ronda polish.

## 2026-09-04 (a11y/lang: mute + locked unit-node)

**What changed**
- Header mute `aria-label` follows `uiLang`: ES `Sonido`, EN `Sound`. No longer hardcoded `Sound`.
- Locked Camino unit-node `aria-label` suffix follows `uiLang`: ES `(bloqueado)`, EN `(blocked)`. Parentheses pattern kept.
- Tests lock both live strings. First door, Hoy, Phrase Doctor, streak, Empieza, Subjuntivo, theater gates, JEOPARDY SOLO, Rayo ON/OFF, enroll, PrivacyInfo, paywall/ads untouched. Dead UI keys not pruned. `bonus de racha` and `LAB DE NARRACIÓN` left for George/No face.

**Why**
- Soft polish leftover: two chrome aria holes after ES sprint→ronda.

## 2026-09-04 (George ES sprint → ronda; wrap-prep notes)

**What changed**
- ES Práctica Smart Practice locked: `Tu siguiente ronda.` and `Empezar ronda de 5 — sin vidas`. Not tanda, not útil, not sprint. EN stays `sprint` (`Chosen as your next useful sprint.` / `Start 5-item sprint — no hearts`).
- JEOPARDY SOLO stays an intentional loan. Rayo ON/OFF stay.
- Wrap-prep only: vite comments that Pages keeps `base: '/andale/'` and wrap rebuilds with `base: '/'`. Speech/storage flags `window.__andaleSpeech` / `window.__andaleStorage`. No PrivacyInfo. Enroll off.
- Tests lock the exact ES strings. First door, streak-1, vuelve mañana, Hoy still, theater gates, Práctica fold, Subjuntivo/Empieza, tree untouched.

**Why**
- George + No face locked the ES lines. Soft leftover chrome + wrap-prep holes only. Soft ETA 9:30 ET.

## 2026-09-03 (George + No face first-door copy lock)

**What changed**
- First-door hero is Hoy `Jugar la escena` / `Play the scene` when a today scene exists. Phrase Doctor is the alternate fast win after the scene is cleared.
- Alt door copy locked: tag `GANA EN 60 SEGUNDOS` / `WIN IN 60 SECONDS`; title `Doctora de frases` / `Phrase Doctor` (ES is not Phrase Doctor); CTA `Arreglar una frase` / `Fix a phrase`.
- After first win, streak shows 1. Home line `L.comeBackTomorrow`: ES `Vuelve mañana por la siguiente escena.` / EN `Come back tomorrow for the next scene.`
- Subjuntivo Continuar is off the hero. Path stays under Empieza. Tree not deleted. Hoy still match, enroll, JEOPARDY SOLO, Rayo ON/OFF, Apple wrap untouched.

**Why**
- George + No face copy lock on the Fri first-door PR. Soft ETA first slice 10:30pm ET.

## 2026-09-02 (George + No face copy lock)

**What changed**
- `storyTip` is paragraph-first: ES `Lee el párrafo. Toca una palabra solo si te frena.` / EN `Read the paragraph. Tap a word only if it stops you.`
- Empty tarjetas: ES `Todavía no hay tarjetas` + `Abre un cuento, toca una palabra que te frena, y guárdala con su frase.` + `Ir a Lectura`. EN `No cards yet` + `Open a story, tap a word that stops you, and save it with its line.` + `Go to Stories` — EN go matches the tab (`Stories`), not Reading.
- `noPatterns` (empty weakness copy only): ES `Todavía no hay un mapa. Juega una misión o falla con estilo — entonces aparece.` / EN `No map yet. Play a mission or miss with style — then it shows up.` Empty map stays buried until earned.
- Tonight slice stays: Hoy still match; bury Principiante / empty weakness / Atajos; Phrase Doctor + Safe-Risky + Emparejar above the fold. Tree / Subjuntivo first door / streak-1 / enroll untouched.

**Why**
- George + No face copy lock after PR 53. Lectura is paragraph-first; a tap is only if a word stops you. EN go follows tab chrome.

## 2026-09-02 (Dave/Hand tonight: Hoy still + bury theater + Práctica fold)

**What changed**
- Hoy still matches city/title or the still is dropped. San Miguel / Noche de faroles keeps `sma-lanterns.png`. Roma Norte / Cancún / Pátzcuaro no longer wear lanterns. `hoyStillFor` is the gate.
- Bury until earned: Principiante level theater (`level-theater`) until progress; empty weakness map until `prog.weak` has counts; Atajos line until first unit crown. New sessions do not see empty theater.
- Práctica above the fold: Phrase Doctor, ¿Seguro o riesgoso?, Emparejar lead (`practica-fold`). Chrome shrunk. JEOPARDY SOLO and Rayo ON/OFF stay loans.
- George hooks left: `lectura-paragraph-first`, `empty-tarjetas`. Copy untouched if his Lectura / tarjetas lines are not in yet.
- Camino tree / Subjuntivo first door, streak-1, enroll, Apple wrap untouched.

**Why**
- Soft ETA first slice by 10pm ET Wed Sep 2. Face-brand: a Hoy still that lies is worse than no still. Empty Principiante / weakness / Atajos theater is for later, not session one.

## 2026-09-01 (No Workout leftovers; Routine family)

**What changed**
- No Workout leftovers; EN Routine done / Today's routine; ES Rutina hecha / Rutina de hoy.
- Camino hero done-state uses `L.workoutDone` (`Routine done` / `Rutina hecha`). Session title `L.workoutToday` is `Today's routine` / `Rutina de hoy`. Same family as `L.dailyWorkout` (`Daily routine` / `Rutina diaria`).
- EN greeting Luna line is `daily routine` (not daily workout). JEOPARDY SOLO stays a loan. Rayo ON/OFF stays. Camino tree / Subjuntivo / enroll untouched.

**Why**
- George + No face brand lock. Daily-workout chrome is a routine, not a workout. Live hole: done-state still said Workout done / workoutDone was Workout complete; session title was Today's workout.

## 2026-09-01 (Camino hero secondary = L.dailyWorkout)

**What changed**
- Camino hero secondary uses `L.dailyWorkout`.
- Incomplete-state label is no longer hardcoded `Daily workout` / `Rutina diaria`. EN is `Daily routine`, ES is `Rutina diaria`.
- Done-state stays `Workout done` / `Rutina hecha`. `L.workoutToday` stays session title. Camino tree, Subjuntivo, Rayo ON/OFF, enroll, JEOPARDY SOLO untouched.

**Why**
- Live hole on 6ce80cd / index-BIXCKe3B.js: Práctica + Perfil already used L.dailyWorkout; Camino hero secondary still hardcoded EN Daily workout.

## 2026-09-01 (EN dailyWorkout = Daily routine)

**What changed**
- EN dailyWorkout = Daily routine.
- `UI.en.dailyWorkout` is `Daily routine` (not `Daily workout`). ES stays `Rutina diaria`.
- Práctica Mapa de debilidades CTA and Perfil Luna CTA still use `L.dailyWorkout`. `L.workoutToday` stays session title (`Rutina de hoy` / `Today's workout`).
- Test: UI.en.dailyWorkout locked to Daily routine; live CTAs show Daily routine / Rutina diaria. Camino tree, Subjuntivo, Rayo ON/OFF, enroll, JEOPARDY SOLO untouched.

**Why**
- No face brand lock. Daily-workout CTAs are a routine, not a workout.

## 2026-09-01 (Workout hardcodes → Rutina diaria)

**What changed**
- Workout hardcodes → Rutina diaria / Daily workout via L.
- Práctica → Mapa de debilidades CTA and Perfil Luna coach CTA use `L.dailyWorkout` (`Rutina diaria` / `Daily workout`). Same copy Camino already shows live. Not `Workout` / `Workout diario`.
- `L.workoutToday` stays session title (`Rutina de hoy` / `Today's workout`). Camino tree / Subjuntivo / Rayo ON/OFF / enroll / JEOPARDY SOLO / flashDone untouched.

**Why**
- Live hole hunt on c5e2230: leftover English chrome on those two CTAs.

## 2026-09-01 (optional ESLint on PR CI)

**What changed**
- Optional lint (issue 5 remainder). `eslint` + `eslint-plugin-react-hooks` + `globals`; `eslint.config.js` flat config. `package.json` script `lint`.
- CI: after `npm ci`, `npm run lint` then `npm test` then `npm run build`. ubuntu-latest only.
- Errors: `react-hooks/rules-of-hooks`, `no-undef`. `exhaustive-deps` is warn. No style/recommended/compiler-hook presets — App.jsx not rewritten.
- XP, speech, coaches, Camino tree, Subjuntivo, Hoy, Emparejar, ES|EN, chrome copy untouched.

**Why**
- Hand/Little Man: Wed lock is optional lint, not more learner flows. ES/EN chrome leftover Deck already locked live.

## 2026-09-01 (EN done-deck line)

**What changed**
- EN flashcard-done heading is `You finished the cards!` — not Deck.
- Leftover `Deck complete!` removed from UI.en. ES stays `¡Terminaste las tarjetas!`.
- Test: UI.en.flashDone locked; live done screen heading is the EN line; ES heading stays ¡Terminaste las tarjetas!. Camino tree, Subjuntivo, Rayo ON/OFF, enroll untouched.

**Why**
- George lock. Mirrors ES `¡Terminaste las tarjetas!`. Deck is leftover chrome on an EN done screen.

## 2026-09-01 (ES done-deck line)

**What changed**
- ES flashcard-done heading is `¡Terminaste las tarjetas!` — not Deck, not listas, not George’s `¡Tarjetas listas!`.
- Leftover `¡Deck terminado!` removed from UI.es. EN stays `Deck complete!`.
- Test: UI.es.flashDone locked; live done screen heading is the ES line; EN heading stays Deck complete. Camino tree, Subjuntivo, Rayo ON/OFF, enroll untouched.

**Why**
- No face + Little Man brand lock. Deck is English chrome on an ES done screen.

## 2026-09-01 (leftover English chrome locked)

**What changed**
- leftover English chrome locked; Rayo stays ON/OFF; tree untouched.
- GREETINGS.es: five Mexican Spanish lines. GREETINGS.en unchanged for `uiLang === "en"`.
- UI.es leftovers: Tarjetas, DUELO, Duelo, Guardar tarjeta, No hay tarjetas, Ya guardada, shortcuts `Atajos: 1–4.` Rayo `on`/`off` stay ON/OFF — not SÍ/NO.
- Test: ES chrome has Tarjetas and DUELO, not Flashcards / DIÁLOGO DUEL; on/off is not SÍ/NO. Coach jobs, UNITS, Hoy lanterns, Emparejar XP, ES|EN header, schema, enroll untouched.

**Why**
- George leftover-English chrome lock. A boost is not a yes.

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
