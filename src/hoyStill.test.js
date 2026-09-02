import { copyMatchesLanterns, hoyStillFor, LANTERN_STILL, stillIsLanterns } from "./hoyStill.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const sanMiguel = {
  id: "taqueria",
  city: "San Miguel",
  title: "Noche de faroles",
  titleEn: "Night of lanterns",
  still: LANTERN_STILL,
};

assert(copyMatchesLanterns(sanMiguel), "San Miguel / faroles copy matches lanterns");
assert(hoyStillFor(sanMiguel) === LANTERN_STILL, "matching scene keeps lantern still");
assert(hoyStillFor({ ...sanMiguel, still: undefined }) === LANTERN_STILL, "matching copy prefers lantern asset when still omitted");

const lying = [
  { id: "landlord", city: "Roma Norte", title: "WhatsApp del casero", titleEn: "Landlord WhatsApp", still: LANTERN_STILL },
  { id: "airport", city: "Cancún", title: "Mostrador en caos", titleEn: "Airport Counter Chaos", still: LANTERN_STILL },
  { id: "family", city: "Pátzcuaro", title: "Cena con la suegra", titleEn: "Dinner With the In-Laws", still: LANTERN_STILL },
];
for (const scene of lying) {
  assert(!copyMatchesLanterns(scene), `${scene.id} copy is not lanterns`);
  assert(hoyStillFor(scene) === null, `${scene.id} must drop mismatched lantern still`);
}

assert(hoyStillFor(null) === null, "missing scene has no still");
assert(hoyStillFor({ city: "Roma Norte", title: "WhatsApp del casero" }) === null, "no still and no match → hide");
assert(stillIsLanterns(LANTERN_STILL), "lantern path detected");
assert(!stillIsLanterns("stills/cancun-counter.png"), "other still is not lanterns");
assert(hoyStillFor({ city: "Cancún", title: "Mostrador en caos", still: "stills/cancun-counter.png" }) === "stills/cancun-counter.png", "a matching future still can ship");

console.log("ok: Hoy still matches city/title or drops");
