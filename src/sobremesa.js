/** George’s Intermedio / Sobremesa pack. Words-only Soft ETA.
 *  First face = name + quiet + sell + five. Tips expand only after the five.
 *  80/20 Subjuntivo en cinco stays its own Learn surface. Hub tile stays dead.
 */

export const SOBREMESA_NAME = "Sobremesa";

export const SOBREMESA_QUIET = {
  es: "Plática de verdad",
  en: "Real talk",
};

export const SOBREMESA_SELL = {
  es: "Los atajos que se te pegan — para que la plática deje de sentirse tarea.",
  en: "The shortcuts that stick — so real talk stops feeling like homework.",
};

export const SOBREMESA_TIPS_LABEL = {
  es: "Atajos",
  en: "Tips",
};

export const SOBREMESA_DEEPEN_LABEL = {
  es: "A fondo",
  en: "Deeper",
};

/** Five first-face rules. Exact product lock. */
export const SOBREMESA_FIVE = {
  es: [
    "Pretérito vs imperfecto — pasó → pretérito; estaba pasando → imperfecto. Llegué a las ocho; hacía frío.",
    "Por vs para — meta / destinatario / plazo / dirección → para; causa / ruta / duración / intercambio → por. Salgo para México por trabajo.",
    "Ser vs estar — identidad / definición → ser; estado / lugar ahora mismo → estar. Es tranquilo, pero hoy está cerrado.",
    "Gatillos del subjuntivo — querer / dudar / reaccionar / negar + que + otra persona → subjuntivo; hecho → indicativo. Quiero que vengas. / Sé que viene. Prueba suave: tal vez / quiero / no estoy seguro → subjuntivo.",
    "Deja de empacar el inglés — no armes el español palabra por palabra desde el inglés; ¿cómo lo diría un amigo mexicano? Trabajo aquí suele ganarle a Estoy trabajando aquí.",
  ],
  en: [
    "Preterite vs imperfect — happened → pretérito; was going on → imperfecto. Llegué a las ocho; hacía frío.",
    "Por vs para — goal/recipient/deadline/direction → para; cause/route/duration/exchange → por. Salgo para México por trabajo.",
    "Ser vs estar — identity/definition → ser; state/location right now → estar. Es tranquilo, pero hoy está cerrado. Avoid permanent/temporary framing.",
    "Subjunctive triggers — wanting/doubting/reacting/denying + que + other person → subjuntivo; fact → indicativo. Quiero que vengas. / Sé que viene. Soft test: maybe / I want / I’m not sure → subjuntivo.",
    "Stop packaging English — don’t build Spanish word-by-word from English; how would a Mexican friend say it? Trabajo aquí often beats Estoy trabajando aquí.",
  ],
};

/** One line each. mexico: true → 🇲🇽 Mexico-sensitive. Never first face. */
export const SOBREMESA_TIPS = {
  es: [
    { line: "Hay vs está — Hay presenta algo; estar ubica algo que ya nombraste.", mexico: false },
    { line: "Directo vs indirecto — La cosa afectada = lo/la. Quien recibe = le.", mexico: false },
    { line: "Se lo — Antes de lo/la/los/las, le/les se vuelven se (Se lo mandé).", mexico: false },
    { line: "Lugar del pronombre — Antes del conjugado; pégalo al infinitivo / gerundio / mandato.", mexico: false },
    { line: "Reflexivo — La acción vuelve al sujeto (Me levanto).", mexico: false },
    { line: "Se accidental — Percance no buscado: Se me cayó el teléfono.", mexico: true },
    { line: "A personal — Persona específica como objeto directo → a (Vi a María).", mexico: false },
    { line: "Tipo gustar — Lo que gusta manda el verbo (Me gustan estos tacos).", mexico: false },
    { line: "Saber vs conocer — Saber = datos / habilidades. Conocer = gente / lugares.", mexico: false },
    { line: "Pedir vs preguntar — Pedir = pedir algo. Preguntar = hacer una pregunta.", mexico: false },
    { line: "Traer vs llevar — Traer hacia acá. Llevar lejos de aquí.", mexico: false },
    { line: "Venir vs ir — Venir hacia quien habla. Ir a otro lado.", mexico: false },
    { line: "Quedar vs quedarse — Quedar ≈ lugar / permanecer. Quedarse = quedarse (stay).", mexico: false },
    { line: "Hace / desde / desde hace — Hace = hace cuánto. Desde = punto de inicio. Desde hace = duración hasta ahora.", mexico: false },
    { line: "Muy vs mucho — Muy + adjetivo / adverbio. Mucho + sustantivo o verbo.", mexico: false },
    { line: "Bien vs bueno — Bien = acciones. Bueno = cosas / gente.", mexico: false },
    { line: "Qué vs cuál — Qué = qué tipo. Cuál = cuál de esos.", mexico: false },
    { line: "Cómo es — Para «how is X / what is X like?» usa cómo es, no qué es.", mexico: false },
    { line: "Lo que vs que — «What / the thing that» → lo que.", mexico: false },
    { line: "Artículos — El español usa el/la más que el «the» del inglés en lo general.", mexico: false },
    { line: "Concordancia del adjetivo — Primero casa con el sustantivo.", mexico: false },
    { line: "Lugar del adjetivo — Por defecto: sustantivo primero, adjetivo después.", mexico: false },
    { line: "Progresivo — Estar + gerundio solo cuando está pasando *ahora*.", mexico: false },
    { line: "Pronombres de sujeto — Suéltalos salvo contraste o claridad.", mexico: false },
    { line: "Planes — Ir a + infinitivo suele sonar más natural que el futuro simple.", mexico: false },
    { line: "Condicional suave — Podría / quisiera / me gustaría ablanda un pedido.", mexico: false },
    { line: "Oraciones con si — Real → presente. Hipótesis → imperfecto de subjuntivo + condicional.", mexico: false },
    { line: "Antes de / para — Mismo sujeto: de/para + infinitivo. Otro sujeto: que + subjuntivo.", mexico: false },
    { line: "Aunque — Hecho conocido → indicativo. Hipótesis → subjuntivo.", mexico: false },
    { line: "Acabar de — Acaba de pasar. Volver a — hacerlo otra vez.", mexico: false },
    { line: "Ya / todavía — Ya = ya ocurrió / hay cambio. Todavía = sigue. Ya no = ya no. Todavía no = aún no.", mexico: false },
    { line: "Ustedes — «You» plural; no hay vosotros en el México de todos los días.", mexico: true },
    { line: "Usted primero — Más seguro con adultos que no conoces hasta que te inviten al tú.", mexico: true },
    { line: "Mandatos de usted — Extraños / servicio: Pase, por favor.", mexico: true },
    { line: "Pretérito — Ya comí suele ganarle a He comido.", mexico: true },
    { line: "Ahorita — Ahora o en un rato; el contexto pone el reloj.", mexico: true },
    { line: "-ito/-ita — A menudo suaviza el tono, no solo el tamaño.", mexico: true },
    { line: "Órale / ándale — Palabras de reacción; el tono carga el sentido.", mexico: true },
  ],
  en: [
    { line: "Hay vs está — Hay introduces something; estar locates something you already named.", mexico: false },
    { line: "Direct vs indirect — Thing affected = lo/la. Person receiving = le.", mexico: false },
    { line: "Se lo — Before lo/la/los/las, le/les become se (Se lo mandé).", mexico: false },
    { line: "Pronoun position — Before conjugated; attach to infinitive / gerund / command.", mexico: false },
    { line: "Reflexive — Action returns to the subject (Me levanto).", mexico: false },
    { line: "Se accidental — Unintended mishap: Se me cayó el teléfono.", mexico: true },
    { line: "Personal a — Specific person as direct object → a (Vi a María).", mexico: false },
    { line: "Gustar-type — The liked thing controls the verb (Me gustan estos tacos).", mexico: false },
    { line: "Saber vs conocer — Saber = facts/skills. Conocer = people/places.", mexico: false },
    { line: "Pedir vs preguntar — Pedir = ask for. Preguntar = ask a question.", mexico: false },
    { line: "Traer vs llevar — Traer toward here. Llevar away from here.", mexico: false },
    { line: "Venir vs ir — Venir toward the speaker. Ir somewhere else.", mexico: false },
    { line: "Quedar vs quedarse — Quedar ≈ location/remain. Quedarse = stay.", mexico: false },
    { line: "Hace / desde / desde hace — Ago / start point / duration so far.", mexico: false },
    { line: "Muy vs mucho — Muy + adj/adv. Mucho + noun or verb.", mexico: false },
    { line: "Bien vs bueno — Bien = actions. Bueno = things/people.", mexico: false },
    { line: "Qué vs cuál — Qué = what kind. Cuál = which one.", mexico: false },
    { line: "Cómo es — For “what is X like?” use cómo es, not qué es.", mexico: false },
    { line: "Lo que vs que — “What / the thing that” → lo que.", mexico: false },
    { line: "Articles — Spanish uses el/la more than English “the” for general talk.", mexico: false },
    { line: "Adjective agreement — Match the noun first.", mexico: false },
    { line: "Adjective position — Default: noun first, adjective second.", mexico: false },
    { line: "Progressive — Estar + gerund only when it’s happening *now*.", mexico: false },
    { line: "Subject pronouns — Drop them unless contrast or clarity needs them.", mexico: false },
    { line: "Future plans — Ir a + infinitive is usually more natural than plain future.", mexico: false },
    { line: "Conditional soft — Podría / quisiera / me gustaría softens requests.", mexico: false },
    { line: "Si clauses — Real → present. Hypothetical → imperfect subjunctive + conditional.", mexico: false },
    { line: "Antes de / para — Same subject: de/para + infinitive. Different subject: que + subjuntivo.", mexico: false },
    { line: "Aunque — Known fact → indicative. Hypothetical → subjunctive.", mexico: false },
    { line: "Acabar de — Just happened. Volver a — do it again.", mexico: false },
    { line: "Ya / todavía — Ya = already/change. Todavía = still. Ya no = no longer. Todavía no = not yet.", mexico: false },
    { line: "Ustedes — Plural “you”; no vosotros in ordinary Mexico.", mexico: true },
    { line: "Usted first — Safer with unfamiliar adults until they invite tú.", mexico: true },
    { line: "Usted commands — Strangers / service: Pase, por favor.", mexico: true },
    { line: "Pretérito past — Ya comí usually beats He comido.", mexico: true },
    { line: "Ahorita — Now or soon; context sets the clock.", mexico: true },
    { line: "-ito/-ita — Often softens tone, not just size.", mexico: true },
    { line: "Órale / ándale — Reaction words; meaning rides on tone.", mexico: true },
  ],
};

/** Optional deepen — same voice, never first face. Hook + lists + soft lock. */
export const SOBREMESA_DEEPEN = {
  es: {
    subjunctive: [
      "Querer, dudar, reaccionar o negar + que + otra persona abre subjuntivo.",
      "Gatillos: Quiero que… / No creo que… / Me alegra que… / Niego que…",
      "Con cuando o hasta que, si todavía no pasa → subjuntivo: Te llamo cuando llegue.",
    ],
    porpara: [
      "Para apunta; por explica.",
      "Para: meta, destinatario, plazo, dirección.",
      "Por: causa, ruta, duración, intercambio.",
      "Candado suave: Salgo para México por trabajo.",
    ],
  },
  en: {
    subjunctive: [
      "Wanting, doubting, reacting, or denying + que + another person opens subjunctive.",
      "Triggers: Quiero que… / No creo que… / Me alegra que… / Niego que…",
      "With cuando or hasta que, if it hasn’t happened yet → subjunctive: Te llamo cuando llegue.",
    ],
    porpara: [
      "Para aims; por explains.",
      "Para: goal, recipient, deadline, direction.",
      "Por: cause, route, duration, exchange.",
      "Soft lock: Salgo para México por trabajo.",
    ],
  },
};

const MX_MARK = "🇲🇽";

export function sobremesaQuiet(uiLang) {
  return uiLang === "en" ? SOBREMESA_QUIET.en : SOBREMESA_QUIET.es;
}

export function sobremesaSell(uiLang) {
  return uiLang === "en" ? SOBREMESA_SELL.en : SOBREMESA_SELL.es;
}

export function sobremesaFive(uiLang) {
  return uiLang === "en" ? SOBREMESA_FIVE.en : SOBREMESA_FIVE.es;
}

export function sobremesaTipsLabel(uiLang) {
  return uiLang === "en" ? SOBREMESA_TIPS_LABEL.en : SOBREMESA_TIPS_LABEL.es;
}

export function sobremesaDeepenLabel(uiLang) {
  return uiLang === "en" ? SOBREMESA_DEEPEN_LABEL.en : SOBREMESA_DEEPEN_LABEL.es;
}

export function sobremesaTips(uiLang) {
  return uiLang === "en" ? SOBREMESA_TIPS.en : SOBREMESA_TIPS.es;
}

export function sobremesaTipText(tip) {
  return tip.mexico ? `${tip.line} ${MX_MARK}` : tip.line;
}

export function sobremesaDeepen(uiLang) {
  return uiLang === "en" ? SOBREMESA_DEEPEN.en : SOBREMESA_DEEPEN.es;
}
