import {
  CUBETAS_BIRD_PX,
  CUBETAS_BUCKET_SRC,
  CUBETAS_BUCKETS,
  CUBETAS_DEAD_LABELS,
  CUBETAS_EASE_ENTER,
  CUBETAS_EASE_EXIT,
  CUBETAS_EASE_LIFT,
  CUBETAS_ENTER_MS,
  CUBETAS_EXIT_MS,
  CUBETAS_FEEDS,
  CUBETAS_GEM,
  CUBETAS_GLOW_CREAM,
  CUBETAS_GLOW_TERRACOTTA,
  CUBETAS_GRAB_MS,
  CUBETAS_HUB,
  CUBETAS_LABELS,
  CUBETAS_LIFT_MS,
  CUBETAS_NEXT,
  CUBETAS_PACK_ID,
  CUBETAS_SQUASH,
  CUBETAS_SQUASH_MS,
  CUBETAS_TILT_DEG,
  CUBETAS_TITLE,
  CUBETAS_WIN_MS,
  CUBETAS_XP,
  OJALA_QUE_PACK,
  advanceCubetasReveal,
  advanceCubetasWin,
  applyCubetasDrop,
  bucketLabel,
  clearCubetasWrong,
  cubetasHasDeadLabel,
  cubetasLiteral,
  cubetasNextLabel,
  cubetasTitle,
  cubetasWhy,
  currentChip,
  finishCubetasClear,
  nextCubetasChip,
  scoredChip,
  startCubetasRun,
} from "./cubetas.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(CUBETAS_TITLE.es === "Cubetas" && CUBETAS_TITLE.en === "Bucket fly", "title is ES Cubetas / EN Bucket fly");
assert(cubetasTitle("es") === "Cubetas", "ES title is Cubetas");
assert(cubetasTitle("en") === "Bucket fly", "EN title is Bucket fly");
assert(cubetasTitle("es") !== "Bucket fly · Cubetas" && cubetasTitle("en") !== "Bucket fly · Cubetas", "no bilingual lockup title");
assert(CUBETAS_HUB === "match-play", "lives under Match & play");
assert(CUBETAS_FEEDS === "eighty-twenty", "feeds 80/20");
assert(CUBETAS_PACK_ID === "ojala-que", "first pack is Ojalá que");
assert(CUBETAS_BUCKETS.length === 2, "exactly two buckets");
assert(CUBETAS_BUCKETS[0] === "subjunctive" && CUBETAS_BUCKETS[1] === "indicative", "mood buckets only");
assert(CUBETAS_LABELS.subjunctive.es === "Subjuntivo" && CUBETAS_LABELS.subjunctive.en === "Subjunctive", "Subjuntivo / Subjunctive");
assert(CUBETAS_LABELS.indicative.es === "Indicativo" && CUBETAS_LABELS.indicative.en === "Indicative", "Indicativo / Indicative");
assert(bucketLabel("subjunctive", "es") === "Subjuntivo", "ES subjunctive label");
assert(bucketLabel("indicative", "en") === "Indicative", "EN indicative label");
assert(CUBETAS_DEAD_LABELS.join(" ") === "Trigger Use Disparador Uso", "dead labels locked");
["Trigger", "Use", "Disparador", "Uso"].forEach((dead) => {
  assert(!Object.values(CUBETAS_LABELS).some((row) => cubetasHasDeadLabel(`${row.es} ${row.en}`)), `bucket labels must not be ${dead}`);
});

assert(CUBETAS_WIN_MS === 780, "win motion lock is 780ms");
assert(CUBETAS_ENTER_MS === 160, "bird enters 0–160ms");
assert(CUBETAS_GRAB_MS === 300, "handle lock by 300ms");
assert(CUBETAS_SQUASH_MS === 140, "squash window is 160–300ms");
assert(CUBETAS_LIFT_MS === 120, "lift window is 300–420ms");
assert(CUBETAS_EXIT_MS === 360, "exit window is 420–780ms");
assert(CUBETAS_ENTER_MS + CUBETAS_SQUASH_MS + CUBETAS_LIFT_MS + CUBETAS_EXIT_MS === CUBETAS_WIN_MS, "phases sum to 780ms");
assert(CUBETAS_ENTER_MS + CUBETAS_SQUASH_MS === CUBETAS_GRAB_MS, "grab lock is enter+squash");
assert(CUBETAS_BIRD_PX === 64, "Cenzontle grab target is 64px");
assert(CUBETAS_TILT_DEG === 12, "lift tilt is 12deg");
assert(CUBETAS_SQUASH[0] === 1 && CUBETAS_SQUASH[1] === 0.92 && CUBETAS_SQUASH[2] === 1.04, "squash 1.0→0.92→1.04");
assert(CUBETAS_EASE_ENTER === "cubic-bezier(.22,.75,.25,1)", "enter ease");
assert(CUBETAS_EASE_LIFT === "cubic-bezier(.2,.9,.3,1)", "lift ease");
assert(CUBETAS_EASE_EXIT === "cubic-bezier(.45,0,.8,.45)", "exit ease");
assert(CUBETAS_GLOW_CREAM === "#F6EFE4" && CUBETAS_GLOW_TERRACOTTA === "#C46B3A", "win glow is cream/terracotta");
assert(CUBETAS_BUCKET_SRC.subjunctive === "cubetas/bucket-subjunctive.png", "subjunctive clay prop path");
assert(CUBETAS_BUCKET_SRC.indicative === "cubetas/bucket-indicative.png", "indicative clay prop path");
assert(CUBETAS_GEM === 1, "gem tick is +1");
assert(CUBETAS_XP === 4, "clear XP matches a practice item");
assert(CUBETAS_NEXT.en === "Next chip", "teach beat CTA is Next chip");
assert(cubetasNextLabel("en") === "Next chip", "EN next");
assert(cubetasNextLabel("es") === "Siguiente", "ES next is quiet Siguiente");

assert(OJALA_QUE_PACK[0].phrase === "Ojalá que", "pack opens on Ojalá que");
assert(OJALA_QUE_PACK[0].bucket === "subjunctive", "Ojalá que is subjunctive");
assert(OJALA_QUE_PACK.every((c) => CUBETAS_BUCKETS.includes(c.bucket)), "every chip maps to a mood bucket");
assert(OJALA_QUE_PACK.some((c) => c.bucket === "indicative"), "pack has indicative contrasts");
OJALA_QUE_PACK.forEach((c) => {
  assert(c.literal?.es && c.literal?.en, `${c.id} has George literal hooks`);
  assert(c.why?.es && c.why?.en, `${c.id} has George Why hooks`);
  assert(!/\n/.test(c.literal.es + c.literal.en + c.why.es + c.why.en), `${c.id} Literal/Why are one-liners`);
  assert(!cubetasHasDeadLabel(`${c.phrase} ${c.literal.es} ${c.literal.en} ${c.why.es} ${c.why.en}`), `${c.id} copy has no dead labels`);
});

const run = startCubetasRun(OJALA_QUE_PACK, () => 0);
assert(run.status === "idle", "fresh run is idle");
assert(currentChip(run).phrase === "Ojalá que", "idle shows one Ojalá que chip");
assert(run.queue.length === OJALA_QUE_PACK.length, "full pack queued");
assert(run.hub === "match-play" && run.feeds === "eighty-twenty", "run stamps hub + 80/20");

const miss = applyCubetasDrop(run, "indicative");
assert(miss.status === "wrong", "wrong drop shakes");
assert(currentChip(miss).phrase === "Ojalá que", "wrong returns the chip");
assert(miss.scored.length === 0, "wrong does not score");
assert(miss.gems === 0, "wrong has no gem tick");
const idleAgain = clearCubetasWrong(miss);
assert(idleAgain.status === "idle" && currentChip(idleAgain).phrase === "Ojalá que", "wrong clears back to idle");
const retry = applyCubetasDrop(miss, "subjunctive");
assert(retry.status === "squash", "wrong status still accepts a retry drop");

const hit = applyCubetasDrop(run, "subjunctive");
assert(hit.status === "squash", "correct drop squashes first");
assert(hit.status !== "idle", "scored chip is off the field until Next");
assert(scoredChip(hit).phrase === "Ojalá que", "scored chip is Ojalá que");
assert(hit.queue.every((c) => c.id !== "ojala-que"), "scored phrase left the queue");
assert(hit.gems === 1, "correct gem tick");
assert(advanceCubetasWin(hit).status === "win", "squash advances to win fly");
const reveal = advanceCubetasReveal(advanceCubetasWin(hit));
assert(reveal.status === "reveal", "win advances to teach beat");
assert(cubetasLiteral(scoredChip(reveal), "es") === "Ojalá que", "Literal hook ES");
assert(cubetasLiteral(scoredChip(reveal), "en") === "I hope that", "Literal hook EN");
assert(cubetasWhy(scoredChip(reveal), "es") === "«Ojalá» siempre va con subjuntivo.", "Why hook ES");
assert(cubetasWhy(scoredChip(reveal), "en") === "«Ojalá» always takes the subjunctive.", "Why hook EN");

let walk = hit;
walk = advanceCubetasWin(walk);
walk = advanceCubetasReveal(walk);
walk = nextCubetasChip(walk);
assert(walk.status === "idle", "Next chip deals the next phrase");
assert(currentChip(walk).phrase !== "Ojalá que", "next chip is not the scored one");

let clearWalk = startCubetasRun(OJALA_QUE_PACK, () => 0);
while (currentChip(clearWalk)) {
  clearWalk = applyCubetasDrop(clearWalk, currentChip(clearWalk).bucket);
  clearWalk = advanceCubetasWin(clearWalk);
  clearWalk = advanceCubetasReveal(clearWalk);
  clearWalk = nextCubetasChip(clearWalk);
}
assert(clearWalk.status === "clear", "empty queue after last Next is ¡Eso! clear");
const done = finishCubetasClear(clearWalk);
assert(done.status === "done" && done.xp === CUBETAS_XP && done.awarded, "clear awards practice XP");

const frozen = applyCubetasDrop(hit, "subjunctive");
assert(frozen.status === "squash" && frozen.scored.length === 1, "non-idle drop is a no-op");

console.log("ok: cubetas — Ojalá que pack, clay props, win 780ms grab-arc, Literal then Why");
