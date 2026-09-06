/** Safe/Risky multi-correct: `answers: [ids]` plus leftover `answer` string. */

export const SAFE_RISKY_CHOICE_KEYS = ["safe", "casual", "formal", "regional", "risky"];
export const SAFE_RISKY_ROUND_CAP = 5;

/** George stamp — live pack `answers` must match this exact list. */
export const SAFE_RISKY_ANSWERS = {
  "No manches.": ["casual", "regional"],
  "¿Mande?": ["regional", "safe"],
  "Está bien chido.": ["casual", "regional"],
  "Ahorita vengo.": ["regional", "casual"],
  "Quedo a sus órdenes.": ["formal"],
  "¿Qué?": ["risky"],
  "¿Me da un café, por favor?": ["safe"],
  "No obstante lo anterior...": ["formal"],
};

/** Test-only item with two rights. Not live pack. */
export const SAFE_RISKY_MULTI_FIXTURE = {
  phrase: "MULTI_CORRECT_FIXTURE",
  context: {
    es: "Fixture: toca las dos respuestas correctas.",
    en: "Fixture: tap both correct answers.",
  },
  answer: "safe",
  answers: ["safe", "casual"],
  literal: { es: "Fixture literal.", en: "Fixture literal." },
  note: { es: "Fixture why.", en: "Fixture why." },
};

let packOverride = null;

export function setSafeRiskyPackOverride(items) {
  packOverride = Array.isArray(items) && items.length ? items : null;
}

export function resolveSafeRiskyPack(fallback) {
  return packOverride || fallback;
}

function listKeys(raw) {
  return Array.isArray(raw) ? raw.filter((k) => typeof k === "string" && k.trim()) : [];
}

export function safeRiskyCorrectKeys(item) {
  if (!item) return [];
  const fromAnswers = listKeys(item.answers);
  if (fromAnswers.length) return [...new Set(fromAnswers)];
  const fromCorrect = listKeys(item.correct);
  if (fromCorrect.length) return [...new Set(fromCorrect)];
  if (typeof item.answer === "string" && item.answer.trim()) return [item.answer];
  return [];
}

export function isSafeRiskyCorrect(item, key) {
  return safeRiskyCorrectKeys(item).includes(key);
}

export function safeRiskyTappedCorrect(item, game) {
  if (!game) return [];
  if (Array.isArray(game.tapped)) return game.tapped.filter(Boolean);
  if (game.selected && isSafeRiskyCorrect(item, game.selected)) return [game.selected];
  return [];
}

export function safeRiskyTappedWrong(item, game) {
  if (!game) return [];
  if (Array.isArray(game.tappedWrong)) return game.tappedWrong.filter(Boolean);
  if (game.selected && !isSafeRiskyCorrect(item, game.selected)) return [game.selected];
  return [];
}

export function safeRiskyAllCorrectTapped(item, game) {
  const keys = safeRiskyCorrectKeys(item);
  if (!keys.length) return false;
  const tapped = Array.isArray(game) ? game : safeRiskyTappedCorrect(item, game);
  return keys.every((k) => tapped.includes(k));
}

/** CONTINUE / Literal-Why unlock when every correct chip is in.
 *  Single-correct miss still reveals immediately (existing wrong path). */
export function safeRiskyIsRevealed(item, game) {
  const keys = safeRiskyCorrectKeys(item);
  if (!keys.length) return false;
  if (safeRiskyAllCorrectTapped(item, game)) return true;
  const tappedWrong = safeRiskyTappedWrong(item, game);
  return keys.length === 1 && tappedWrong.length > 0;
}

export function safeRiskyHit(item, game) {
  return safeRiskyAllCorrectTapped(item, game) && safeRiskyTappedWrong(item, game).length === 0;
}

export function safeRiskyAnswerLabel(item, labels) {
  return safeRiskyCorrectKeys(item).map((k) => (labels && labels[k]) || k).join(" · ");
}

export function startSafeRiskyRun(fallbackItems) {
  const pack = resolveSafeRiskyPack(fallbackItems);
  const deal = [...(pack || [])];
  for (let i = deal.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deal[i], deal[j]] = [deal[j], deal[i]];
  }
  const take = Math.min(SAFE_RISKY_ROUND_CAP, deal.length);
  return {
    items: deal.slice(0, take),
    idx: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    selected: null,
    tapped: [],
    tappedWrong: [],
    done: false,
    awarded: false,
  };
}

export function advanceSafeRiskyItem(game) {
  if (!game) return game;
  return { ...game, idx: game.idx + 1, selected: null, tapped: [], tappedWrong: [] };
}

export function applySafeRiskyTap(game, key) {
  if (!game || game.done || game.awarded) return game;
  const item = game.items?.[game.idx];
  if (!item) return game;
  const keys = safeRiskyCorrectKeys(item);
  if (!keys.length) return game;

  const tapped = [...safeRiskyTappedCorrect(item, game)];
  const tappedWrong = [...safeRiskyTappedWrong(item, game)];
  if (tapped.includes(key) || tappedWrong.includes(key)) return game;
  if (safeRiskyIsRevealed(item, { tapped, tappedWrong })) return game;

  const ok = keys.includes(key);
  const nextTapped = ok ? [...tapped, key] : tapped;
  const nextWrong = ok ? tappedWrong : [...tappedWrong, key];
  const nextGame = {
    ...game,
    tapped: nextTapped,
    tappedWrong: nextWrong,
    selected: key,
    streak: ok ? (game.streak || 0) : 0,
  };

  if (safeRiskyIsRevealed(item, nextGame) && !safeRiskyIsRevealed(item, { tapped, tappedWrong })) {
    const hit = nextWrong.length === 0 && keys.every((k) => nextTapped.includes(k));
    const streak = hit ? (game.streak || 0) + 1 : 0;
    return {
      ...nextGame,
      score: (game.score || 0) + (hit ? 1 : 0),
      streak,
      bestStreak: Math.max(game.bestStreak || 0, streak),
    };
  }
  return nextGame;
}
