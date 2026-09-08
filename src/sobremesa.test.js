import {
  SOBREMESA_DEEPEN,
  SOBREMESA_DEEPEN_LABEL,
  SOBREMESA_FIVE,
  SOBREMESA_NAME,
  SOBREMESA_QUIET,
  SOBREMESA_SELL,
  SOBREMESA_TIPS,
  SOBREMESA_TIPS_LABEL,
  sobremesaDeepen,
  sobremesaDeepenLabel,
  sobremesaFive,
  sobremesaQuiet,
  sobremesaSell,
  sobremesaTipText,
  sobremesaTips,
  sobremesaTipsLabel,
} from "./sobremesa.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(SOBREMESA_NAME === "Sobremesa", "tab name is the Sobremesa loan in both langs");
assert(SOBREMESA_NAME !== "Club" && SOBREMESA_NAME !== "Intermedio" && SOBREMESA_NAME !== "80%", "not Club / Intermedio / 80%");
assert(SOBREMESA_QUIET.es === "Plática de verdad", "ES quiet");
assert(SOBREMESA_QUIET.en === "Real talk", "EN quiet");
assert(SOBREMESA_SELL.es === "Los atajos que se te pegan — para que la plática deje de sentirse tarea.", "ES sell");
assert(SOBREMESA_SELL.en === "The shortcuts that stick — so real talk stops feeling like homework.", "EN sell");
assert(sobremesaQuiet("es") === SOBREMESA_QUIET.es && sobremesaQuiet("en") === SOBREMESA_QUIET.en, "quiet follows uiLang");
assert(sobremesaQuiet("fr") === SOBREMESA_QUIET.es, "unknown uiLang stays ES");
assert(sobremesaSell("en") === SOBREMESA_SELL.en, "sell follows EN");
assert(SOBREMESA_TIPS_LABEL.es === "Atajos" && SOBREMESA_TIPS_LABEL.en === "Tips", "tips label");
assert(SOBREMESA_DEEPEN_LABEL.es === "A fondo" && SOBREMESA_DEEPEN_LABEL.en === "Deeper", "deepen label");
assert(sobremesaTipsLabel("en") === "Tips" && sobremesaDeepenLabel("es") === "A fondo", "labels follow uiLang");

const ES_FIVE = [
  "Pretérito vs imperfecto — pasó → pretérito; estaba pasando → imperfecto. Llegué a las ocho; hacía frío.",
  "Por vs para — meta / destinatario / plazo / dirección → para; causa / ruta / duración / intercambio → por. Salgo para México por trabajo.",
  "Ser vs estar — identidad / definición → ser; estado / lugar ahora mismo → estar. Es tranquilo, pero hoy está cerrado.",
  "Gatillos del subjuntivo — querer / dudar / reaccionar / negar + que + otra persona → subjuntivo; hecho → indicativo. Quiero que vengas. / Sé que viene. Prueba suave: tal vez / quiero / no estoy seguro → subjuntivo.",
  "Deja de empacar el inglés — no armes el español palabra por palabra desde el inglés; ¿cómo lo diría un amigo mexicano? Trabajo aquí suele ganarle a Estoy trabajando aquí.",
];
const EN_FIVE = [
  "Preterite vs imperfect — happened → pretérito; was going on → imperfecto. Llegué a las ocho; hacía frío.",
  "Por vs para — goal/recipient/deadline/direction → para; cause/route/duration/exchange → por. Salgo para México por trabajo.",
  "Ser vs estar — identity/definition → ser; state/location right now → estar. Es tranquilo, pero hoy está cerrado. Avoid permanent/temporary framing.",
  "Subjunctive triggers — wanting/doubting/reacting/denying + que + other person → subjuntivo; fact → indicativo. Quiero que vengas. / Sé que viene. Soft test: maybe / I want / I’m not sure → subjuntivo.",
  "Stop packaging English — don’t build Spanish word-by-word from English; how would a Mexican friend say it? Trabajo aquí often beats Estoy trabajando aquí.",
];

assert(SOBREMESA_FIVE.es.length === 5 && SOBREMESA_FIVE.en.length === 5, "exactly five first-face rules");
ES_FIVE.forEach((line, i) => assert(SOBREMESA_FIVE.es[i] === line, `ES five ${i + 1} exact`));
EN_FIVE.forEach((line, i) => assert(SOBREMESA_FIVE.en[i] === line, `EN five ${i + 1} exact`));
assert(sobremesaFive("es").join("\n") === ES_FIVE.join("\n"), "sobremesaFive ES");
assert(sobremesaFive("en").join("\n") === EN_FIVE.join("\n"), "sobremesaFive EN");
assert(!SOBREMESA_FIVE.es.join(" ").includes("permanent") && !SOBREMESA_FIVE.es.join(" ").includes("temporary"), "ES ser/estar avoids permanent/temporary");
assert(SOBREMESA_FIVE.en[2].includes("Avoid permanent/temporary framing."), "EN ser/estar names the trap to avoid");

const MX_EN = [
  "Se accidental — Unintended mishap: Se me cayó el teléfono.",
  "Ustedes — Plural “you”; no vosotros in ordinary Mexico.",
  "Usted first — Safer with unfamiliar adults until they invite tú.",
  "Usted commands — Strangers / service: Pase, por favor.",
  "Pretérito past — Ya comí usually beats He comido.",
  "Ahorita — Now or soon; context sets the clock.",
  "-ito/-ita — Often softens tone, not just size.",
  "Órale / ándale — Reaction words; meaning rides on tone.",
];
assert(SOBREMESA_TIPS.es.length === 38 && SOBREMESA_TIPS.en.length === 38, "38 tips each lang");
assert(SOBREMESA_TIPS.en.filter((t) => t.mexico).length === 8, "eight Mexico-sensitive EN tips");
assert(SOBREMESA_TIPS.es.filter((t) => t.mexico).length === 8, "eight Mexico-sensitive ES tips");
MX_EN.forEach((line) => {
  const tip = SOBREMESA_TIPS.en.find((t) => t.line === line);
  assert(tip && tip.mexico, `MX tip locked: ${line}`);
});
assert(sobremesaTipText({ line: "Se accidental — Unintended mishap: Se me cayó el teléfono.", mexico: true }).endsWith("🇲🇽"), "MX mark on mexico tips");
assert(sobremesaTipText(SOBREMESA_TIPS.en[0]) === SOBREMESA_TIPS.en[0].line, "plain tips have no flag");
assert(sobremesaTips("en")[0].line.startsWith("Hay vs está"), "tips start Hay vs está — not first face");
assert(sobremesaTips("es")[0].line.startsWith("Hay vs está"), "ES tips start Hay vs está");

const deepEs = sobremesaDeepen("es");
const deepEn = sobremesaDeepen("en");
assert(deepEs.subjunctive.length === 3 && deepEn.subjunctive.length === 3, "subjunctive deepen is hook + triggers + cuando");
assert(deepEs.porpara.length === 4 && deepEn.porpara.length === 4, "por/para deepen is hook + lists + soft lock");
assert(deepEn.subjunctive[0].includes("Wanting, doubting, reacting"), "EN subjunctive hook");
assert(deepEn.subjunctive[2].includes("cuando") && deepEn.subjunctive[2].includes("hasta que"), "EN cuando/hasta que");
assert(deepEn.porpara[3] === "Soft lock: Salgo para México por trabajo.", "EN por/para soft lock");
assert(SOBREMESA_DEEPEN.es.porpara[3] === "Candado suave: Salgo para México por trabajo.", "ES por/para soft lock");
assert(!JSON.stringify(SOBREMESA_DEEPEN).includes("Club"), "deepen is not Club");

console.log("ok: Sobremesa Intermedio pack — George face / five / tips / deepen");
