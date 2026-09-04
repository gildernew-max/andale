import {
  FIRST_GLOW_PIN,
  MEXICO_OUTLINE_PATH,
  RECUERDOS_LOCKED_EN,
  RECUERDOS_LOCKED_ES,
  RECUERDOS_OPEN_EN,
  RECUERDOS_OPEN_ES,
  RECUERDOS_PINS,
  RECUERDOS_TITLE_EN,
  RECUERDOS_TITLE_ES,
  isRecuerdosPinOpen,
  recuerdosFogBackground,
  recuerdosHasProgressFraction,
  recuerdosLockedPins,
  recuerdosPinLabel,
  recuerdosPinState,
  recuerdosSurfaceHasCuts,
  recuerdosTitle,
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
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "cdmx"), { "story-1": true }), "CDMX opens on Coyoacán");
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "oaxaca"), { "story-4": true }), "Oaxaca opens on story-4");
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "yucatan"), { "story-2": true }), "Yucatán opens on Cancún");
assert(isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "norte"), { "story-5": true }), "Norte opens on Tijuana");
assert(!isRecuerdosPinOpen(RECUERDOS_PINS.find((p) => p.id === "cdmx"), { "story-0": true }), "Bajío claim does not open CDMX");

assert(storyIdForRecuerdosPin(RECUERDOS_PINS[0], {}) === "story-0", "Bajío opens Pátzcuaro");
assert(storyIdForRecuerdosPin(RECUERDOS_PINS.find((p) => p.id === "cdmx"), {}) === "story-1", "CDMX prefers first unclaimed");
assert(storyIdForRecuerdosPin(RECUERDOS_PINS.find((p) => p.id === "cdmx"), { "story-1": true }) === "story-3", "CDMX skips claimed");

assert(typeof MEXICO_OUTLINE_PATH === "string" && MEXICO_OUTLINE_PATH.includes("M34"), "Mexico outline path is present");
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

console.log("recuerdos.test.js: ok");
