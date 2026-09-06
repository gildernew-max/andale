import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  CDMX_PIN,
  FIRST_GLOW_PIN,
  NORTE_PIN,
  OAXACA_PIN,
  YUCATAN_PIN,
  MEXICO_MAP_SRC,
  RECUERDOS_LOCKED_EN,
  RECUERDOS_LOCKED_ES,
  RECUERDOS_OPEN_EN,
  RECUERDOS_OPEN_ES,
  RECUERDOS_PINS,
  RECUERDOS_TITLE_EN,
  RECUERDOS_TITLE_ES,
  bajioUnlockFlashCopy,
  cdmxUnlockFlashCopy,
  cdmxUnlockFlashStreak,
  isBajioUnlockFlashDue,
  isBajioUnlockFlashLive,
  isCdmxUnlockFlashDue,
  isCdmxUnlockFlashLive,
  isDay2HoyEsoWin,
  isOaxacaUnlockFlashDue,
  isOaxacaUnlockFlashLive,
  isStreak3HoyEsoWin,
  isNorteUnlockFlashDue,
  isNorteUnlockFlashLive,
  isStreak4HoyEsoWin,
  isStreak5HoyEsoWin,
  isYucatanUnlockFlashDue,
  isYucatanUnlockFlashLive,
  isFirstStreakEsoWin,
  isRecuerdosPinOpen,
  markBajioUnlockFlashDue,
  markBajioUnlockFlashLive,
  markCdmxUnlockFlashDue,
  markCdmxUnlockFlashLive,
  markOaxacaUnlockFlashDue,
  markOaxacaUnlockFlashLive,
  markNorteUnlockFlashDue,
  markNorteUnlockFlashLive,
  markYucatanUnlockFlashDue,
  markYucatanUnlockFlashLive,
  recuerdosFogBackground,
  recuerdosHasProgressFraction,
  recuerdosLockedPins,
  recuerdosPinLabel,
  recuerdosPinState,
  recuerdosSurfaceHasCuts,
  recuerdosTitle,
  shouldShowBajioUnlockFlash,
  shouldShowCdmxUnlockFlash,
  shouldShowOaxacaUnlockFlash,
  shouldShowNorteUnlockFlash,
  shouldShowYucatanUnlockFlash,
  norteUnlockFlashCopy,
  norteUnlockFlashStreak,
  oaxacaUnlockFlashCopy,
  oaxacaUnlockFlashStreak,
  yucatanUnlockFlashCopy,
  yucatanUnlockFlashStreak,
  storyIdForRecuerdosPin,
} from "./recuerdos.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(RECUERDOS_TITLE_ES === "Recuerdos", "ES title is Recuerdos");
assert(RECUERDOS_TITLE_EN === "Souvenir trail", "EN title is Souvenir trail");
assert(recuerdosTitle("es") === "Recuerdos", "recuerdosTitle ES");
assert(recuerdosTitle("en") === "Souvenir trail", "recuerdosTitle EN");
assert(recuerdosTitle() === "Recuerdos", "recuerdosTitle default is ES");

assert(RECUERDOS_OPEN_ES === "Abierto", "unlocked ES is Abierto");
assert(RECUERDOS_OPEN_EN === "Open", "unlocked EN is Open");
assert(RECUERDOS_LOCKED_ES === "Cerrado", "locked ES is Cerrado");
assert(RECUERDOS_LOCKED_EN === "Locked", "locked EN is Locked");
assert(recuerdosPinState(true, "es") === "Abierto", "open ES");
assert(recuerdosPinState(true, "en") === "Open", "open EN");
assert(recuerdosPinState(false, "es") === "Cerrado", "locked ES");
assert(recuerdosPinState(false, "en") === "Locked", "locked EN");

const labelsEs = RECUERDOS_PINS.map((p) => recuerdosPinLabel(p, "es"));
const labelsEn = RECUERDOS_PINS.map((p) => recuerdosPinLabel(p, "en"));
assert(labelsEs.join(" · ") === "Bajío · CDMX · Oaxaca · Yucatán · Norte", "ES pin order and labels");
assert(labelsEn.join(" · ") === "Bajío · CDMX · Oaxaca · Yucatán · North", "EN pin order; Norte is North");
assert(RECUERDOS_PINS.length === 5, "exactly five pins");
assert(RECUERDOS_PINS[0].id === FIRST_GLOW_PIN && RECUERDOS_PINS[0].firstGlow, "Bajío is first glow");
assert(!/Ruta de recuerdos|Keep exploring|Unlocked|Closed|Blocked/i.test(
  `${RECUERDOS_TITLE_ES}${RECUERDOS_TITLE_EN}${labelsEs.join("")}${labelsEn.join("")}${RECUERDOS_OPEN_ES}${RECUERDOS_OPEN_EN}${RECUERDOS_LOCKED_ES}${RECUERDOS_LOCKED_EN}`
), "no invented soft synonyms on locked strings");

assert(isRecuerdosPinOpen(RECUERDOS_PINS[0], {}), "Bajío starts open");
assert(isRecuerdosPinOpen(RECUERDOS_PINS[0], { "story-0": true }), "Bajío stays open after claim");
for (const pin of RECUERDOS_PINS.slice(1)) {
  assert(!isRecuerdosPinOpen(pin, {}), `${pin.id} starts locked`);
}
assert(RECUERDOS_PINS.find((p) => p.id === "cdmx")?.id === CDMX_PIN, "CDMX pin id is cdmx");
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "cdmx"), { "story-1": true }), "CDMX opens on Coyoacán");
assert(RECUERDOS_PINS.find((p) => p.id === "oaxaca")?.id === OAXACA_PIN, "Oaxaca pin id is oaxaca");
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "cdmx"), {}, { cdmxUnlockSeen: true }), "day-2 Hoy unlock opens CDMX");
assert(!isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "oaxaca"), {}, { cdmxUnlockSeen: true }), "CDMX unlock does not open Oaxaca");
assert(!isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "yucatan"), {}, { cdmxUnlockSeen: true }), "CDMX unlock does not open Yucatán");
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "oaxaca"), {}, { oaxacaUnlockSeen: true }), "streak-3 Hoy unlock opens Oaxaca");
assert(!isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "cdmx"), {}, { oaxacaUnlockSeen: true }), "Oaxaca unlock does not open CDMX");
assert(!isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "yucatan"), {}, { oaxacaUnlockSeen: true }), "Oaxaca unlock does not open Yucatán");
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "oaxaca"), { "story-4": true }), "Oaxaca opens on story-4");
assert(RECUERDOS_PINS.find((p) => p.id === "yucatan")?.id === YUCATAN_PIN, "Yucatán pin id is yucatan");
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "yucatan"), {}, { yucatanUnlockSeen: true }), "streak-4 Hoy unlock opens Yucatán");
assert(!isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "oaxaca"), {}, { yucatanUnlockSeen: true }), "Yucatán unlock does not open Oaxaca");
assert(!isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "norte"), {}, { yucatanUnlockSeen: true }), "Yucatán unlock does not open Norte");
assert(RECUERDOS_PINS.find((p) => p.id === "norte")?.id === NORTE_PIN, "Norte pin id is norte");
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "norte"), {}, { norteUnlockSeen: true }), "streak-5 Hoy unlock opens Norte");
assert(!isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "yucatan"), {}, { norteUnlockSeen: true }), "Norte unlock does not open Yucatán");
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "yucatan"), { "story-2": true }), "Yucatán opens on Cancún");
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "norte"), { "story-5": true }), "Norte opens on Tijuana");
assert(!isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "cdmx"), { "story-0": true }), "Bajío claim does not open CDMX");

assert(storyIdForRecuerdosPin(RECUERDOS_PINS[0], {}) === "story-0", "Bajío opens Pátzcuaro");
assert(storyIdForRecuerdosPin(RECUERDOS_PINS.find((p) => p.id === "cdmx"), {}) === "story-1", "CDMX prefers first unclaimed");
assert(storyIdForRecuerdosPin(RECUERDOS_PINS.find((p) => p.id === "cdmx"), { "story-1": true }) === "story-3", "CDMX skips claimed");

assert(MEXICO_MAP_SRC === "assets/dave-cleared-mexico-map.png", "Dave-cleared illustrated Mexico map is the Recuerdos base");
const mexicoMapFile = join(dirname(fileURLToPath(import.meta.url)), "..", "public", MEXICO_MAP_SRC);
assert(existsSync(mexicoMapFile), "illustrated Mexico PNG is in public/assets");
assert(readFileSync(mexicoMapFile).subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "Mexico map asset is a PNG");
assert(/radial-gradient/.test(recuerdosFogBackground()), "fog treatment is a radial mist");
assert(recuerdosFogBackground().includes("39%"), "fog clears at Bajío first");
const lockedCold = recuerdosLockedPins().map((p) => p.id);
assert(!lockedCold.includes("bajio"), "Bajío is not a fogged locked region");
assert(lockedCold.join(" · ") === "cdmx · oaxaca · yucatan · norte", "fog sits on CDMX Oaxaca Yucatán Norte");
assert(recuerdosLockedPins(RECUERDOS_PINS, { "story-2": true }).every((p) => p.id !== "yucatan"), "claimed Yucatán drops fog");

assert(!recuerdosSurfaceHasCuts("Bajío Abierto CDMX Cerrado"), "locked pin chrome is not a cut");
assert(recuerdosSurfaceHasCuts("¡Sigue explorando!"), "sigue-exploring pep is a cut");
assert(recuerdosSurfaceHasCuts("Sigue explorando México"), "sigue explorando pep is a cut");
assert(recuerdosSurfaceHasCuts("Backpack 12/25"), "backpack 12/25 is a cut");
assert(recuerdosSurfaceHasCuts("parroquia"), "parroquia is a cut");
assert(recuerdosHasProgressFraction("12/25"), "12/25 is a backpack fraction");
assert(recuerdosHasProgressFraction("0/10"), "0/10 is a backpack fraction");
assert(!recuerdosHasProgressFraction("Bajío Abierto"), "pin chrome is not a fraction");

const firstEso = { firstStreakEso: true, streak: 1 };
assert(shouldShowBajioUnlockFlash(firstEso), "first streak-1 Eso CONTINUE arms the Bajío glow beat");
assert(isFirstStreakEsoWin({ firstHoy: true }), "Hoy Eso is a first-streak Eso win");
assert(isFirstStreakEsoWin({ firstDoctora: true }), "first Doctora Eso is a first-streak Eso win");
assert(isFirstStreakEsoWin({ esoWin: true }), "esoWin stamp still counts if firstHoy dropped");
assert(isFirstStreakEsoWin({ todaySceneId: "landlord" }), "Landlord WhatsApp / Hoy scene is an Eso win");
assert(isFirstStreakEsoWin({ unitId: "_today:landlord" }), "Hoy unitId still counts if todaySceneId dropped");
assert(!isFirstStreakEsoWin({}), "empty session is not an Eso win");
assert(shouldShowBajioUnlockFlash({
  firstStreakEso: isFirstStreakEsoWin({ todaySceneId: "landlord" }),
  streak: 1,
}), "Landlord WhatsApp streak-1 CONTINUE arms the glow");
assert(!shouldShowBajioUnlockFlash({ ...firstEso, bajioUnlockSeen: true }), "seen flag never re-flashes");
assert(!shouldShowBajioUnlockFlash({ ...firstEso, paywallSeen: true }), "paywallSeen skips the flash");
assert(!shouldShowBajioUnlockFlash({ firstStreakEso: false, streak: 1 }), "later win without Eso flag does not flash");
assert(!shouldShowBajioUnlockFlash({ firstStreakEso: true, streak: 2 }), "day-2 / later streak Eso does not flash");
assert(!shouldShowBajioUnlockFlash({ firstStreakEso: true, streak: 0 }), "streak 0 is not the streak-1 Eso");
assert(!shouldShowBajioUnlockFlash({}), "empty args do not flash");
assert(bajioUnlockFlashCopy("es") === "Abierto", "flash ES copy is Abierto only");
assert(bajioUnlockFlashCopy("en") === "Open", "flash EN copy is Open only");
assert(bajioUnlockFlashCopy("es") === RECUERDOS_OPEN_ES, "flash ES reuses Recuerdos open stamp");
assert(bajioUnlockFlashCopy("en") === RECUERDOS_OPEN_EN, "flash EN reuses Recuerdos open stamp");
assert(!/Bajío|¡Sigue explorando!|Sigue explorando|12\/25|backpack|Unlocked|Cerrado|Locked/i.test(
  `${bajioUnlockFlashCopy("es")}${bajioUnlockFlashCopy("en")}`
), "flash copy is Abierto/Open only — no pep, no new lines");

markBajioUnlockFlashLive(true);
assert(isBajioUnlockFlashLive(), "live flag stays up across a remount");
markBajioUnlockFlashLive(false);
assert(!isBajioUnlockFlashLive(), "live flag clears after the flash");
markBajioUnlockFlashDue(true);
assert(isBajioUnlockFlashDue(), "due flag survives a tab remount after Eso CONTINUE");
markBajioUnlockFlashDue(false);
assert(!isBajioUnlockFlashDue(), "due flag clears after the glow");

assert(isDay2HoyEsoWin({ day2Hoy: true }), "day2Hoy stamp is a day-2 Hoy Eso win");
assert(isDay2HoyEsoWin({ firstHoy: true }), "short Hoy Eso still counts on day-2");
assert(isDay2HoyEsoWin({ esoWin: true }), "esoWin stamp still counts if firstHoy dropped");
assert(isDay2HoyEsoWin({ todaySceneId: "airport" }), "day-2 Hoy scene id counts");
assert(isDay2HoyEsoWin({ unitId: "_today:airport" }), "Hoy unitId still counts if todaySceneId dropped");
assert(!isDay2HoyEsoWin({ firstDoctora: true, todaySceneId: "airport" }), "first Doctora stays on the Bajío path");
assert(!isDay2HoyEsoWin({}), "empty session is not a day-2 Hoy Eso");

const day2Hoy = { day2HoyEso: true, streak: 2 };
assert(shouldShowCdmxUnlockFlash(day2Hoy), "day-2 Hoy Eso CONTINUE arms the CDMX glow beat");
assert(cdmxUnlockFlashStreak({
  streak: 1,
  lastDay: "2026-09-04",
  today: "2026-09-05",
  yesterday: "2026-09-04",
}) === 2, "day-2 CONTINUE earns streak 2 before persist");
assert(cdmxUnlockFlashStreak({
  streak: 2,
  lastDay: "2026-09-05",
  today: "2026-09-05",
  yesterday: "2026-09-04",
}) === 2, "already-committed day-2 win stays streak 2");
assert(cdmxUnlockFlashStreak({
  streak: 1,
  lastDay: "2026-09-04",
  today: "2026-09-04",
  yesterday: "2026-09-03",
}) === 1, "same-day streak-1 stays Bajío, not CDMX");
assert(shouldShowCdmxUnlockFlash({
  day2HoyEso: isDay2HoyEsoWin({ todaySceneId: "airport" }),
  streak: 2,
}), "day-2 Hoy scene streak-2 CONTINUE arms CDMX");
assert(shouldShowCdmxUnlockFlash({
  day2HoyEso: isDay2HoyEsoWin({ todaySceneId: "airport" }),
  streak: cdmxUnlockFlashStreak({
    streak: 1,
    lastDay: "2026-09-04",
    today: "2026-09-05",
    yesterday: "2026-09-04",
  }),
}), "raw streak 1 on day-2 Hoy CONTINUE still arms CDMX");
assert(!shouldShowCdmxUnlockFlash({ ...day2Hoy, cdmxUnlockSeen: true }), "CDMX seen flag never re-flashes");
assert(!shouldShowCdmxUnlockFlash({ day2HoyEso: false, streak: 2 }), "later win without day-2 Hoy Eso does not flash CDMX");
assert(!shouldShowCdmxUnlockFlash({ day2HoyEso: true, streak: 1 }), "first streak-1 Eso stays Bajío, not CDMX");
assert(!shouldShowCdmxUnlockFlash({ day2HoyEso: true, streak: 3 }), "day-3 / later streak does not re-flash CDMX");
assert(!shouldShowCdmxUnlockFlash({}), "empty args do not flash CDMX");
assert(cdmxUnlockFlashCopy("es") === "Abierto", "CDMX flash ES copy is Abierto only");
assert(cdmxUnlockFlashCopy("en") === "Open", "CDMX flash EN copy is Open only");
assert(cdmxUnlockFlashCopy("es") === bajioUnlockFlashCopy("es"), "CDMX reuses Bajío Abierto stamp");
assert(cdmxUnlockFlashCopy("en") === bajioUnlockFlashCopy("en"), "CDMX reuses Bajío Open stamp");
assert(!/CDMX|Bajío|¡Sigue explorando!|Sigue explorando|12\/25|backpack|Unlocked|Cerrado|Locked/i.test(
  `${cdmxUnlockFlashCopy("es")}${cdmxUnlockFlashCopy("en")}`
), "CDMX flash copy is Abierto/Open only — no pep, no new lines");

markCdmxUnlockFlashLive(true);
assert(isCdmxUnlockFlashLive(), "CDMX live flag stays up across a remount");
markCdmxUnlockFlashLive(false);
assert(!isCdmxUnlockFlashLive(), "CDMX live flag clears after the flash");
markCdmxUnlockFlashDue(true);
assert(isCdmxUnlockFlashDue(), "CDMX due flag survives a tab remount after Eso CONTINUE");
markCdmxUnlockFlashDue(false);
assert(!isCdmxUnlockFlashDue(), "CDMX due flag clears after the glow");

assert(isStreak3HoyEsoWin({ day2Hoy: true }), "day2Hoy stamp still counts as streak-3 Hoy Eso");
assert(isStreak3HoyEsoWin({ firstHoy: true }), "short Hoy Eso still counts on streak-3");
assert(isStreak3HoyEsoWin({ esoWin: true }), "esoWin stamp still counts if firstHoy dropped");
assert(isStreak3HoyEsoWin({ todaySceneId: "family" }), "streak-3 Hoy scene id counts");
assert(isStreak3HoyEsoWin({ unitId: "_today:family" }), "Hoy unitId still counts if todaySceneId dropped");
assert(!isStreak3HoyEsoWin({ firstDoctora: true, todaySceneId: "family" }), "first Doctora stays on the Bajío path");
assert(!isStreak3HoyEsoWin({}), "empty session is not a streak-3 Hoy Eso");

const streak3Hoy = { streak3HoyEso: true, streak: 3 };
assert(shouldShowOaxacaUnlockFlash(streak3Hoy), "streak-3 Hoy Eso CONTINUE arms the Oaxaca glow beat");
assert(oaxacaUnlockFlashStreak({
  streak: 2,
  lastDay: "2026-09-05",
  today: "2026-09-06",
  yesterday: "2026-09-05",
}) === 3, "streak-3 CONTINUE earns streak 3 before persist");
assert(oaxacaUnlockFlashStreak({
  streak: 3,
  lastDay: "2026-09-06",
  today: "2026-09-06",
  yesterday: "2026-09-05",
}) === 3, "already-committed streak-3 win stays streak 3");
assert(oaxacaUnlockFlashStreak({
  streak: 2,
  lastDay: "2026-09-05",
  today: "2026-09-05",
  yesterday: "2026-09-04",
}) === 2, "same-day streak-2 stays CDMX, not Oaxaca");
assert(shouldShowOaxacaUnlockFlash({
  streak3HoyEso: isStreak3HoyEsoWin({ todaySceneId: "family" }),
  streak: 3,
}), "streak-3 Hoy scene CONTINUE arms Oaxaca");
assert(shouldShowOaxacaUnlockFlash({
  streak3HoyEso: isStreak3HoyEsoWin({ todaySceneId: "family" }),
  streak: oaxacaUnlockFlashStreak({
    streak: 2,
    lastDay: "2026-09-05",
    today: "2026-09-06",
    yesterday: "2026-09-05",
  }),
}), "raw streak 2 on streak-3 Hoy CONTINUE still arms Oaxaca");
assert(!shouldShowOaxacaUnlockFlash({ ...streak3Hoy, oaxacaUnlockSeen: true }), "Oaxaca seen flag never re-flashes");
assert(!shouldShowOaxacaUnlockFlash({ streak3HoyEso: false, streak: 3 }), "later win without streak-3 Hoy Eso does not flash Oaxaca");
assert(!shouldShowOaxacaUnlockFlash({ streak3HoyEso: true, streak: 1 }), "first streak-1 Eso stays Bajío, not Oaxaca");
assert(!shouldShowOaxacaUnlockFlash({ streak3HoyEso: true, streak: 2 }), "day-2 streak Eso stays CDMX, not Oaxaca");
assert(!shouldShowOaxacaUnlockFlash({ streak3HoyEso: true, streak: 4 }), "day-4 / later streak does not re-flash Oaxaca");
assert(!shouldShowOaxacaUnlockFlash({}), "empty args do not flash Oaxaca");
assert(oaxacaUnlockFlashCopy("es") === "Abierto", "Oaxaca flash ES copy is Abierto only");
assert(oaxacaUnlockFlashCopy("en") === "Open", "Oaxaca flash EN copy is Open only");
assert(oaxacaUnlockFlashCopy("es") === bajioUnlockFlashCopy("es"), "Oaxaca reuses Bajío Abierto stamp");
assert(oaxacaUnlockFlashCopy("en") === bajioUnlockFlashCopy("en"), "Oaxaca reuses Bajío Open stamp");
assert(!/Oaxaca|CDMX|Bajío|¡Sigue explorando!|Sigue explorando|12\/25|backpack|Unlocked|Cerrado|Locked/i.test(
  `${oaxacaUnlockFlashCopy("es")}${oaxacaUnlockFlashCopy("en")}`
), "Oaxaca flash copy is Abierto/Open only — no pep, no new lines");

markOaxacaUnlockFlashLive(true);
assert(isOaxacaUnlockFlashLive(), "Oaxaca live flag stays up across a remount");
markOaxacaUnlockFlashLive(false);
assert(!isOaxacaUnlockFlashLive(), "Oaxaca live flag clears after the flash");
markOaxacaUnlockFlashDue(true);
assert(isOaxacaUnlockFlashDue(), "Oaxaca due flag survives a tab remount after Eso CONTINUE");
markOaxacaUnlockFlashDue(false);
assert(!isOaxacaUnlockFlashDue(), "Oaxaca due flag clears after the glow");

assert(isStreak4HoyEsoWin({ day2Hoy: true }), "day2Hoy stamp still counts as streak-4 Hoy Eso");
assert(isStreak4HoyEsoWin({ firstHoy: true }), "short Hoy Eso still counts on streak-4");
assert(isStreak4HoyEsoWin({ esoWin: true }), "esoWin stamp still counts if firstHoy dropped");
assert(isStreak4HoyEsoWin({ todaySceneId: "taqueria" }), "streak-4 Hoy scene id counts");
assert(isStreak4HoyEsoWin({ unitId: "_today:taqueria" }), "Hoy unitId still counts if todaySceneId dropped");
assert(!isStreak4HoyEsoWin({ firstDoctora: true, todaySceneId: "taqueria" }), "first Doctora stays on the Bajío path");
assert(!isStreak4HoyEsoWin({}), "empty session is not a streak-4 Hoy Eso");

const streak4Hoy = { streak4HoyEso: true, streak: 4 };
assert(shouldShowYucatanUnlockFlash(streak4Hoy), "streak-4 Hoy Eso CONTINUE arms the Yucatán glow beat");
assert(yucatanUnlockFlashStreak({
  streak: 3,
  lastDay: "2026-09-06",
  today: "2026-09-07",
  yesterday: "2026-09-06",
}) === 4, "streak-4 CONTINUE earns streak 4 before persist");
assert(yucatanUnlockFlashStreak({
  streak: 4,
  lastDay: "2026-09-07",
  today: "2026-09-07",
  yesterday: "2026-09-06",
}) === 4, "already-committed streak-4 win stays streak 4");
assert(yucatanUnlockFlashStreak({
  streak: 3,
  lastDay: "2026-09-06",
  today: "2026-09-06",
  yesterday: "2026-09-05",
}) === 3, "same-day streak-3 stays Oaxaca, not Yucatán");
assert(shouldShowYucatanUnlockFlash({
  streak4HoyEso: isStreak4HoyEsoWin({ todaySceneId: "taqueria" }),
  streak: 4,
}), "streak-4 Hoy scene CONTINUE arms Yucatán");
assert(shouldShowYucatanUnlockFlash({
  streak4HoyEso: isStreak4HoyEsoWin({ todaySceneId: "taqueria" }),
  streak: yucatanUnlockFlashStreak({
    streak: 3,
    lastDay: "2026-09-06",
    today: "2026-09-07",
    yesterday: "2026-09-06",
  }),
}), "raw streak 3 on streak-4 Hoy CONTINUE still arms Yucatán");
assert(!shouldShowYucatanUnlockFlash({ ...streak4Hoy, yucatanUnlockSeen: true }), "Yucatán seen flag never re-flashes");
assert(!shouldShowYucatanUnlockFlash({ streak4HoyEso: false, streak: 4 }), "later win without streak-4 Hoy Eso does not flash Yucatán");
assert(!shouldShowYucatanUnlockFlash({ streak4HoyEso: true, streak: 1 }), "first streak-1 Eso stays Bajío, not Yucatán");
assert(!shouldShowYucatanUnlockFlash({ streak4HoyEso: true, streak: 2 }), "day-2 streak Eso stays CDMX, not Yucatán");
assert(!shouldShowYucatanUnlockFlash({ streak4HoyEso: true, streak: 3 }), "streak-3 Eso stays Oaxaca, not Yucatán");
assert(!shouldShowYucatanUnlockFlash({ streak4HoyEso: true, streak: 5 }), "day-5 / later streak does not re-flash Yucatán");
assert(!shouldShowYucatanUnlockFlash({}), "empty args do not flash Yucatán");
assert(yucatanUnlockFlashCopy("es") === "Abierto", "Yucatán flash ES copy is Abierto only");
assert(yucatanUnlockFlashCopy("en") === "Open", "Yucatán flash EN copy is Open only");
assert(yucatanUnlockFlashCopy("es") === bajioUnlockFlashCopy("es"), "Yucatán reuses Bajío Abierto stamp");
assert(yucatanUnlockFlashCopy("en") === bajioUnlockFlashCopy("en"), "Yucatán reuses Bajío Open stamp");
assert(!/Yucatán|Yucatan|Oaxaca|CDMX|Bajío|¡Sigue explorando!|Sigue explorando|12\/25|backpack|Unlocked|Cerrado|Locked/i.test(
  `${yucatanUnlockFlashCopy("es")}${yucatanUnlockFlashCopy("en")}`
), "Yucatán flash copy is Abierto/Open only — no pep, no new lines");

markYucatanUnlockFlashLive(true);
assert(isYucatanUnlockFlashLive(), "Yucatán live flag stays up across a remount");
markYucatanUnlockFlashLive(false);
assert(!isYucatanUnlockFlashLive(), "Yucatán live flag clears after the flash");
markYucatanUnlockFlashDue(true);
assert(isYucatanUnlockFlashDue(), "Yucatán due flag survives a tab remount after Eso CONTINUE");
markYucatanUnlockFlashDue(false);
assert(!isYucatanUnlockFlashDue(), "Yucatán due flag clears after the glow");

assert(isStreak5HoyEsoWin({ day2Hoy: true }), "day2Hoy stamp still counts as streak-5 Hoy Eso");
assert(isStreak5HoyEsoWin({ firstHoy: true }), "short Hoy Eso still counts on streak-5");
assert(isStreak5HoyEsoWin({ esoWin: true }), "esoWin stamp still counts if firstHoy dropped");
assert(isStreak5HoyEsoWin({ todaySceneId: "taqueria" }), "streak-5 Hoy scene id counts");
assert(isStreak5HoyEsoWin({ unitId: "_today:taqueria" }), "Hoy unitId still counts if todaySceneId dropped");
assert(!isStreak5HoyEsoWin({ firstDoctora: true, todaySceneId: "taqueria" }), "first Doctora stays on the Bajío path");
assert(!isStreak5HoyEsoWin({}), "empty session is not a streak-5 Hoy Eso");

const streak5Hoy = { streak5HoyEso: true, streak: 5 };
assert(shouldShowNorteUnlockFlash(streak5Hoy), "streak-5 Hoy Eso CONTINUE arms the Norte glow beat");
assert(norteUnlockFlashStreak({
  streak: 4,
  lastDay: "2026-09-07",
  today: "2026-09-08",
  yesterday: "2026-09-07",
}) === 5, "streak-5 CONTINUE earns streak 5 before persist");
assert(norteUnlockFlashStreak({
  streak: 5,
  lastDay: "2026-09-08",
  today: "2026-09-08",
  yesterday: "2026-09-07",
}) === 5, "already-committed streak-5 win stays streak 5");
assert(norteUnlockFlashStreak({
  streak: 4,
  lastDay: "2026-09-07",
  today: "2026-09-07",
  yesterday: "2026-09-06",
}) === 4, "same-day streak-4 stays Yucatán, not Norte");
assert(shouldShowNorteUnlockFlash({
  streak5HoyEso: isStreak5HoyEsoWin({ todaySceneId: "taqueria" }),
  streak: 5,
}), "streak-5 Hoy scene CONTINUE arms Norte");
assert(shouldShowNorteUnlockFlash({
  streak5HoyEso: isStreak5HoyEsoWin({ todaySceneId: "taqueria" }),
  streak: norteUnlockFlashStreak({
    streak: 4,
    lastDay: "2026-09-07",
    today: "2026-09-08",
    yesterday: "2026-09-07",
  }),
}), "raw streak 4 on streak-5 Hoy CONTINUE still arms Norte");
assert(!shouldShowNorteUnlockFlash({ ...streak5Hoy, norteUnlockSeen: true }), "Norte seen flag never re-flashes");
assert(!shouldShowNorteUnlockFlash({ streak5HoyEso: false, streak: 5 }), "later win without streak-5 Hoy Eso does not flash Norte");
assert(!shouldShowNorteUnlockFlash({ streak5HoyEso: true, streak: 1 }), "first streak-1 Eso stays Bajío, not Norte");
assert(!shouldShowNorteUnlockFlash({ streak5HoyEso: true, streak: 2 }), "day-2 streak Eso stays CDMX, not Norte");
assert(!shouldShowNorteUnlockFlash({ streak5HoyEso: true, streak: 3 }), "streak-3 Eso stays Oaxaca, not Norte");
assert(!shouldShowNorteUnlockFlash({ streak5HoyEso: true, streak: 4 }), "streak-4 Eso stays Yucatán, not Norte");
assert(!shouldShowNorteUnlockFlash({ streak5HoyEso: true, streak: 6 }), "day-6 / later streak does not re-flash Norte");
assert(!shouldShowNorteUnlockFlash({}), "empty args do not flash Norte");
assert(norteUnlockFlashCopy("es") === "Abierto", "Norte flash ES copy is Abierto only");
assert(norteUnlockFlashCopy("en") === "Open", "Norte flash EN copy is Open only");
assert(norteUnlockFlashCopy("es") === bajioUnlockFlashCopy("es"), "Norte reuses Bajío Abierto stamp");
assert(norteUnlockFlashCopy("en") === bajioUnlockFlashCopy("en"), "Norte reuses Bajío Open stamp");
assert(!/Norte|North|Yucatán|Yucatan|Oaxaca|CDMX|Bajío|¡Sigue explorando!|Sigue explorando|12\/25|backpack|Unlocked|Cerrado|Locked/i.test(
  `${norteUnlockFlashCopy("es")}${norteUnlockFlashCopy("en")}`
), "Norte flash copy is Abierto/Open only — no pep, no new lines");

markNorteUnlockFlashLive(true);
assert(isNorteUnlockFlashLive(), "Norte live flag stays up across a remount");
markNorteUnlockFlashLive(false);
assert(!isNorteUnlockFlashLive(), "Norte live flag clears after the flash");
markNorteUnlockFlashDue(true);
assert(isNorteUnlockFlashDue(), "Norte due flag survives a tab remount after Eso CONTINUE");
markNorteUnlockFlashDue(false);
assert(!isNorteUnlockFlashDue(), "Norte due flag clears after the glow");

console.log("recuerdos.test.js: ok");
