/** Bucket fly / Cubetas — Games · Match & play (hub v5) · feeds 80/20.
 *  Dave / Hand lock. Two mood buckets only. Soft chrome parked. Win motion ON.
 *  George Why CLEAR 2026-09-19 — exact one-beat chip bank. Wrong sort auto-shows
 *  Why inline (no Why tap). `exception: true` prefixes Exception · / Excepción ·.
 *  Chips size to the full phrase. Soft chrome parked.
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
export const CUBETAS_EXCEPTION_LABEL = { es: "Excepción", en: "Exception" };

/** Open-board how-to. George CLEAR. First paint only. Soft chrome parked. */
export const CUBETAS_HINT = {
  es: "Arrastra o toca la frase en Subjuntivo o Indicativo.",
  en: "Drag or tap the phrase into Subjunctive or Indicative.",
};

/** George Why CLEAR 2026-09-19 — exact chip bank. Why is the one beat; exception:true prefixes. */
const CUBETAS_WHY_BANK = [
  ["ojala-que", "Ojalá que", "subjunctive", "Deseo", "Wish", false],
  ["quiero-que", "Quiero que", "subjunctive", "Deseo", "Wish", false],
  ["espero-que", "Espero que", "subjunctive", "Deseo", "Wish", false],
  ["me-alegra-que", "Me alegra que", "subjunctive", "Emoción", "Emotion", false],
  ["temo-que", "Temo que", "subjunctive", "Emoción", "Emotion", false],
  ["dudo-que", "Dudo que", "subjunctive", "Duda", "Doubt", false],
  ["no-creo-que", "No creo que", "subjunctive", "Duda", "Doubt", false],
  ["es-importante-que", "Es importante que", "subjunctive", "Influencia", "Influence", false],
  ["te-pido-que", "Te pido que", "subjunctive", "Influencia", "Influence", false],
  ["para-que", "Para que", "subjunctive", "Propósito", "Purpose", false],
  ["antes-de-que", "Antes de que", "subjunctive", "Aún no", "Not yet", false],
  ["hasta-que-not-yet", "Hasta que (not yet)", "subjunctive", "Aún no", "Not yet", false],
  ["cuando-future", "Cuando (future)", "subjunctive", "Aún no", "Not yet", false],
  ["se-que", "Sé que", "indicative", "Hecho", "Fact", false],
  ["es-verdad-que", "Es verdad que", "indicative", "Hecho", "Fact", false],
  ["creo-que", "Creo que", "indicative", "Creencia", "Belief", false],
  ["pienso-que", "Pienso que", "indicative", "Creencia", "Belief", false],
  ["me-parece-que", "Me parece que", "indicative", "Creencia", "Belief", false],
  ["cuando-habit", "Cuando (habit)", "indicative", "Hábito", "Habit", false],
  ["aunque-fact", "Aunque (fact)", "indicative", "hecho pese a", "fact despite", true],
  ["aunque-maybe", "Aunque (maybe)", "subjunctive", "tal vez no", "maybe not", true],
  ["despues-de-que-past", "Después de que (past done)", "indicative", "ya pasó", "already done", true],
];

export const OJALA_QUE_PACK = CUBETAS_WHY_BANK.map(([id, phrase, bucket, whyEs, whyEn, exception]) => ({
  id,
  phrase,
  bucket,
  literal: { es: phrase, en: phrase },
  why: { es: whyEs, en: whyEn },
  exception,
}));

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

export function cubetasHint(uiLang) {
  return uiLang === "en" ? CUBETAS_HINT.en : CUBETAS_HINT.es;
}

/** First paint of a run only. Missing/false hint never comes back mid-round. */
export function showCubetasHint(run) {
  return run?.hint === true && (run.status === "idle" || run.status === "wrong");
}

export function dismissCubetasHint(run) {
  if (!run || run.hint !== true) return run;
  return { ...run, hint: false };
}

export function currentChip(run) {
  return run?.queue?.[0] || null;
}

export function scoredChip(run) {
  const scored = run?.scored || [];
  return scored[scored.length - 1] || null;
}

export function cubetasLiteral(chip, uiLang) {
  if (!chip) return "";
  if (chip.literal) return uiLang === "en" ? chip.literal.en : chip.literal.es;
  return uiLang === "en" ? (chip.literalEn || "") : (chip.literalEs || "");
}

export function cubetasWhyBeat(chip, uiLang) {
  if (!chip) return "";
  if (chip.why) return uiLang === "en" ? (chip.why.en || "") : (chip.why.es || "");
  return uiLang === "en" ? (chip.whyEn || "") : (chip.whyEs || "");
}

export function cubetasExceptionLabel(uiLang) {
  return uiLang === "en" ? CUBETAS_EXCEPTION_LABEL.en : CUBETAS_EXCEPTION_LABEL.es;
}

export function cubetasIsException(chip) {
  if (!chip) return false;
  if (chip.exception === true) return true;
  if (chip.exception === false || chip.exception == null) return !!(chip.exceptionEs || chip.exceptionEn);
  if (typeof chip.exception === "object") return !!(chip.exception.es || chip.exception.en);
  return chip.exception === "true" || !!(chip.exceptionEs || chip.exceptionEn);
}

export function cubetasWhyPrefix(uiLang) {
  return `${cubetasExceptionLabel(uiLang)} · `;
}

export function cubetasWhy(chip, uiLang) {
  const beat = cubetasWhyBeat(chip, uiLang);
  if (!beat) return "";
  if (!cubetasIsException(chip)) return beat;
  const prefix = cubetasWhyPrefix(uiLang);
  if (beat.startsWith(prefix) || beat.startsWith("Exception · ") || beat.startsWith("Excepción · ")) return beat;
  return `${prefix}${beat}`;
}

export function cubetasException(chip, uiLang) {
  if (!chip) return "";
  const ex = chip.exception;
  if (ex && typeof ex === "object") {
    return uiLang === "en" ? (ex.en || "") : (ex.es || "");
  }
  if (typeof ex === "string" && ex && ex !== "true") return ex;
  return uiLang === "en" ? (chip.exceptionEn || "") : (chip.exceptionEs || "");
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
    hint: true,
  };
}

/** Drop the live chip on a mood bucket. Wrong stays on the field. Correct scores it. */
export function applyCubetasDrop(run, bucket) {
  if (!run || (run.status !== "idle" && run.status !== "wrong")) return run;
  if (!CUBETAS_BUCKETS.includes(bucket)) return run;
  const chip = currentChip(run);
  if (!chip) return run;
  const base = dismissCubetasHint(run);
  if (bucket !== chip.bucket) {
    return { ...base, status: "wrong", lastBucket: bucket };
  }
  return {
    ...base,
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
