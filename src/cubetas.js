/** Bucket fly / Cubetas — Games · Match & play (hub v5) · feeds 80/20.
 *  Dave / Hand lock. Two mood buckets only. Soft chrome parked. Win motion ON.
 *  George stamps Literal / Why — hooks are one-liners until then.
 */

/** George + No Face CLEAR: language-split title, not a bilingual lockup. */
export const CUBETAS_TITLE = { es: "Cubetas", en: "Bucket fly" };
export const CUBETAS_HUB = "match-play";
export const CUBETAS_FEEDS = "eighty-twenty";
export const CUBETAS_PACK_ID = "ojala-que";

/** Win motion lock: 780ms grab → arc. Dave / Hand. Soft chrome parked. */
export const CUBETAS_WIN_MS = 780;
export const CUBETAS_ENTER_MS = 160;
export const CUBETAS_GRAB_MS = 300;
export const CUBETAS_SQUASH_MS = 140;
export const CUBETAS_LIFT_MS = 120;
export const CUBETAS_EXIT_MS = 360;
export const CUBETAS_SHAKE_MS = 250;
export const CUBETAS_BIRD_PX = 64;
export const CUBETAS_TILT_DEG = 12;
export const CUBETAS_SQUASH = [1, 0.92, 1.04];
export const CUBETAS_EASE_ENTER = "cubic-bezier(.22,.75,.25,1)";
export const CUBETAS_EASE_LIFT = "cubic-bezier(.2,.9,.3,1)";
export const CUBETAS_EASE_EXIT = "cubic-bezier(.45,0,.8,.45)";
export const CUBETAS_GLOW_CREAM = "#F6EFE4";
export const CUBETAS_GLOW_TERRACOTTA = "#C46B3A";
export const CUBETAS_GEM = 1;
export const CUBETAS_XP = 4;

/** Clay prop PNGs. Labels stay live UI under the handle — never baked into the file. */
export const CUBETAS_BUCKET_SRC = {
  subjunctive: "cubetas/bucket-subjunctive.png",
  indicative: "cubetas/bucket-indicative.png",
};

export const CUBETAS_BUCKETS = ["subjunctive", "indicative"];

export const CUBETAS_LABELS = {
  subjunctive: { es: "Subjuntivo", en: "Subjunctive" },
  indicative: { es: "Indicativo", en: "Indicative" },
};

/** Dead chrome — never buckets, never UI. */
export const CUBETAS_DEAD_LABELS = ["Trigger", "Use", "Disparador", "Uso"];

export const CUBETAS_NEXT = { es: "Siguiente", en: "Next chip" };

/** Ojalá que pack. Trigger phrases to sort — one chip on the field. Feeds 80/20. */
export const OJALA_QUE_PACK = [
  {
    id: "ojala-que",
    phrase: "Ojalá que",
    bucket: "subjunctive",
    literal: { es: "Ojalá que", en: "I hope that" },
    why: { es: "«Ojalá» siempre va con subjuntivo.", en: "«Ojalá» always takes the subjunctive." },
  },
  {
    id: "quiero-que",
    phrase: "Quiero que",
    bucket: "subjunctive",
    literal: { es: "Quiero que", en: "I want that" },
    why: { es: "Deseo + que → subjuntivo.", en: "Wish + que → subjunctive." },
  },
  {
    id: "creo-que",
    phrase: "Creo que",
    bucket: "indicative",
    literal: { es: "Creo que", en: "I think that" },
    why: { es: "Lo que crees que es verdad va en indicativo.", en: "What you believe is true takes the indicative." },
  },
  {
    id: "no-creo-que",
    phrase: "No creo que",
    bucket: "subjunctive",
    literal: { es: "No creo que", en: "I don’t think that" },
    why: { es: "Lo que dudas o niegas va en subjuntivo.", en: "What you doubt or deny takes the subjunctive." },
  },
  {
    id: "se-que",
    phrase: "Sé que",
    bucket: "indicative",
    literal: { es: "Sé que", en: "I know that" },
    why: { es: "Hecho conocido → indicativo.", en: "Known fact → indicative." },
  },
];

const shuffleRest = (arr, rng = Math.random) => {
  if (arr.length <= 1) return [...arr];
  const [head, ...rest] = arr;
  const a = [...rest];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return [head, ...a];
};

export function cubetasTitle(uiLang) {
  return uiLang === "en" ? CUBETAS_TITLE.en : CUBETAS_TITLE.es;
}

export function bucketLabel(id, uiLang) {
  const row = CUBETAS_LABELS[id];
  if (!row) return "";
  return uiLang === "en" ? row.en : row.es;
}

export function cubetasNextLabel(uiLang) {
  return uiLang === "en" ? CUBETAS_NEXT.en : CUBETAS_NEXT.es;
}

export function currentChip(run) {
  return run?.queue?.[0] || null;
}

export function scoredChip(run) {
  const scored = run?.scored || [];
  return scored[scored.length - 1] || null;
}

export function cubetasLiteral(chip, uiLang) {
  if (!chip?.literal) return "";
  return uiLang === "en" ? chip.literal.en : chip.literal.es;
}

export function cubetasWhy(chip, uiLang) {
  if (!chip?.why) return "";
  return uiLang === "en" ? chip.why.en : chip.why.es;
}

export function startCubetasRun(pack = OJALA_QUE_PACK, rng = Math.random) {
  const queue = shuffleRest(pack, rng);
  return {
    packId: CUBETAS_PACK_ID,
    hub: CUBETAS_HUB,
    feeds: CUBETAS_FEEDS,
    queue,
    scored: [],
    status: "idle",
    lastBucket: null,
    gems: 0,
    xp: 0,
    awarded: false,
  };
}

/** Drop the live chip on a mood bucket. Wrong stays on the field. Correct scores it. */
export function applyCubetasDrop(run, bucket) {
  if (!run || (run.status !== "idle" && run.status !== "wrong")) return run;
  if (!CUBETAS_BUCKETS.includes(bucket)) return run;
  const chip = currentChip(run);
  if (!chip) return run;
  if (bucket !== chip.bucket) {
    return { ...run, status: "wrong", lastBucket: bucket };
  }
  return {
    ...run,
    status: "squash",
    lastBucket: bucket,
    scored: [...(run.scored || []), chip],
    queue: run.queue.slice(1),
    gems: (run.gems || 0) + CUBETAS_GEM,
  };
}

export function clearCubetasWrong(run) {
  if (!run || run.status !== "wrong") return run;
  return { ...run, status: "idle", lastBucket: null };
}

export function advanceCubetasWin(run) {
  if (!run || run.status !== "squash") return run;
  return { ...run, status: "win" };
}

export function advanceCubetasReveal(run) {
  if (!run || run.status !== "win") return run;
  return { ...run, status: "reveal" };
}

export function nextCubetasChip(run) {
  if (!run || run.status !== "reveal") return run;
  if ((run.queue || []).length === 0) return { ...run, status: "clear", lastBucket: null };
  return { ...run, status: "idle", lastBucket: null };
}

export function finishCubetasClear(run) {
  if (!run || (run.status !== "clear" && run.status !== "reveal")) return run;
  if (run.status === "reveal" && (run.queue || []).length > 0) return run;
  return { ...run, status: "done", awarded: true, xp: CUBETAS_XP };
}

export function cubetasHasDeadLabel(text) {
  const s = String(text || "");
  return CUBETAS_DEAD_LABELS.some((dead) => new RegExp(`(?:^|\\W)${dead}(?:$|\\W)`, "i").test(s));
}
