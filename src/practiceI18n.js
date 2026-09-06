/** Practice / reveal copy that must follow ES|EN (`uiLang`).
 *  Temporary EN matches meaning until George stamps. Do not invent features. */

export function uiText(value, lang, fallback = "") {
  if (value == null || value === "") return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const picked = lang === "en" ? (value.en ?? value.es) : (value.es ?? value.en);
    if (picked != null && picked !== "") return picked;
  }
  return fallback;
}

export function explainHaystack(q) {
  if (!q) return "";
  const parts = [];
  const push = (v) => {
    if (typeof v === "string") parts.push(v);
    else if (v && typeof v === "object") parts.push(v.es || "", v.en || "");
  };
  push(q.explain);
  if (typeof q.explainEn === "string") parts.push(q.explainEn);
  push(q.note);
  return parts.join(" ");
}

/** Focus / skill chip labels. Keys stay Spanish for prog.weak / SMART_FOCUS. */
export const FOCUS_LABELS = {
  Precisión: { es: "Precisión", en: "Precision" },
  Subjuntivo: { es: "Subjuntivo", en: "Subjunctive" },
  Pasado: { es: "Pasado", en: "Past" },
  "Por/para": { es: "Por/para", en: "Por/para" },
  Mexicanismos: { es: "Mexicanismos", en: "Mexicanisms" },
  Hipótesis: { es: "Hipótesis", en: "Hypothesis" },
  Pronombres: { es: "Pronombres", en: "Pronouns" },
  Conectores: { es: "Conectores", en: "Connectors" },
  Registro: { es: "Registro", en: "Register" },
  Escucha: { es: "Escucha", en: "Listening" },
  Orden: { es: "Orden", en: "Word order" },
  "Acentos y signos": { es: "Acentos y signos", en: "Accents and marks" },
  "Modo verbal": { es: "Modo verbal", en: "Verb mood" },
  "Tiempo narrativo": { es: "Tiempo narrativo", en: "Narrative tense" },
  "Pronombre / orden": { es: "Pronombre / orden", en: "Pronoun / order" },
  "Escucha fina": { es: "Escucha fina", en: "Fine listening" },
  Reformulación: { es: "Reformulación", en: "Rewording" },
  "Escucha real": { es: "Escucha real", en: "Real listening" },
  "Vida real": { es: "Vida real", en: "Real life" },
  Lectura: { es: "Lectura", en: "Reading" },
  Repaso: { es: "Repaso", en: "Review" },
};

export function focusLabel(kind, lang) {
  if (!kind) return "";
  const row = FOCUS_LABELS[kind];
  if (row) return uiText(row, lang);
  return kind;
}

export function culturalHintExplain(title, lang) {
  return lang === "en"
    ? `Cultural clue unlocked from “${title}”.`
    : `Pista cultural desbloqueada desde «${title}».`;
}

export function storyClueExplain(title, lang) {
  return lang === "en"
    ? `This clue comes from the story “${title}”.`
    : `Esta pista viene del cuento «${title}».`;
}

/** ES-only Why / explain lines → {es,en}. Later-unit English notes stay as authored. */
export const PRACTICE_EXPLAIN = [
  { es: "«Esperar que» dispara el subjuntivo. Tú → vengas.", en: "«Esperar que» triggers the subjunctive. Tú → vengas." },
  { es: "«Ojalá» siempre va con subjuntivo: llueva.", en: "«Ojalá» always takes the subjunctive: llueva." },
  { es: "Antecedente indefinido (no sé si existe) → subjuntivo.", en: "Indefinite antecedent (you don’t know if it exists) → subjunctive." },
  { es: "Trampa: «es obvio que» expresa certeza → indicativo. Compara: «No es obvio que tenga razón».", en: "Trap: «es obvio que» states certainty → indicative. Compare: «No es obvio que tenga razón»." },
  { es: "«Cuando» + acción futura → subjuntivo. Hábito sería indicativo: «cuando salgo».", en: "«Cuando» + future action → subjunctive. Habit would be indicative: «cuando salgo»." },
  { es: "Negar una creencia → subjuntivo.", en: "Negating a belief → subjunctive." },
  { es: "Verbo de voluntad + cambio de sujeto → subjuntivo.", en: "Verb of will + change of subject → subjunctive." },
  { es: "«Aunque» + información desconocida → subjuntivo. Si ya sabes que es caro: «aunque es caro».", en: "«Aunque» + unknown information → subjunctive. If you already know it’s expensive: «aunque es caro»." },
  { es: "«Dudar que» → subjuntivo: sea. «Es / será» son señuelos en indicativo.", en: "«Dudar que» → subjunctive: sea. «Es / será» are indicative decoys." },
  { es: "Negar la creencia obliga al subjuntivo: viene → venga.", en: "Negating the belief forces the subjunctive: viene → venga." },
  { es: "Expresión impersonal de valoración + que → subjuntivo: llegues.", en: "Impersonal value judgment + que → subjunctive: llegues." },
  { es: "Acción habitual en el pasado → imperfecto.", en: "Habitual action in the past → imperfect." },
  { es: "Evento puntual y terminado → pretérito.", en: "A one-time finished event → preterite." },
  { es: "Fondo en imperfecto, interrupción en pretérito: se fue la luz.", en: "Background in imperfect, interruption in preterite: se fue la luz." },
  { es: "«Querer» cambia de sentido: quería = deseaba; no quiso = se negó.", en: "«Querer» changes meaning: quería = wanted to; no quiso = refused." },
  { es: "«Soler» casi siempre vive en imperfecto: solía.", en: "«Soler» almost always lives in the imperfect: solía." },
  { es: "La hora en el pasado siempre va en imperfecto.", en: "Clock time in the past always takes the imperfect." },
  { es: "«Saber» en pretérito = enterarse; en imperfecto = tener el conocimiento.", en: "«Saber» in the preterite = found out; in the imperfect = already knew." },
  { es: "Evento que ocurrió y terminó → hubo. «Había» describiría el escenario.", en: "An event that happened and ended → hubo. «Había» would describe the scene." },
  { es: "Fondo (dormía, imperfecto) interrumpido por un evento (sonó, pretérito).", en: "Background (dormía, imperfect) interrupted by an event (sonó, preterite)." },
  { es: "Saber en pretérito = enterarse: supe.", en: "Saber in the preterite = found out: supe." },
  { es: "Cadena de eventos terminados → pretérito: fuimos, vimos.", en: "A chain of finished events → preterite: fuimos, vimos." },
  { es: "Agradecimiento = causa → por.", en: "Thanks = cause → por." },
  { es: "Destino, rumbo → para. «Por Guanajuato» sería atravesar la ciudad.", en: "Destination, heading → para. «Por Guanajuato» would mean through the city." },
  { es: "Intercambio → por. Una cosa por otra.", en: "Exchange → por. One thing for another." },
  { es: "Contraste con lo esperado → para.", en: "Contrast with what’s expected → para." },
  { es: "Movimiento a través de / dentro de → por.", en: "Movement through / inside a place → por." },
  { es: "Fecha límite → para.", en: "Deadline → para." },
  { es: "Destinatario → para. «Por ti» = en tu lugar o por tu causa.", en: "Recipient → para. «Por ti» = in your place or because of you." },
  { es: "Precio pagado → por.", en: "Price paid → por." },
  { es: "«Ir por algo» = ir a buscarlo. Siempre con por.", en: "«Ir por algo» = go get it. Always with por." },
  { es: "Fecha límite → para el viernes.", en: "Deadline → para el viernes." },
  { es: "Por = causa (gracias por); para = propósito (para la firma).", en: "Por = cause (gracias por); para = purpose (para la firma)." },
  { es: "«Ahorita» es elástico. El contexto manda.", en: "«Ahorita» is stretchy. Context decides." },
  { es: "«Padre» = genial. También «padrísimo».", en: "«Padre» = awesome. Also «padrísimo»." },
  { es: "«Chamba» = trabajo. El verbo: chambear.", en: "«Chamba» = work. The verb: chambear." },
  { es: "Es el «¿cómo?» cortés mexicano.", en: "It’s Mexico’s polite «¿cómo?»." },
  { es: "En México, pena = vergüenza. «¡Qué pena con usted!»", en: "In Mexico, pena = embarrassment. «¡Qué pena con usted!»" },
  { es: "«Ni un quinto / ni un varo». También: «no traigo lana».", en: "«Ni un quinto / ni un varo». Also: «no traigo lana»." },
  { es: "«Sale» o «sale y vale» = trato hecho.", en: "«Sale» or «sale y vale» = deal." },
  { es: "«Ir al antro» = salir de fiesta.", en: "«Ir al antro» = go out partying." },
  { es: "≈ ¡no puede ser! Versión suave de otra expresión menos publicable.", en: "≈ no way! A softer take on a less printable phrase." },
  { es: "Trabajo → chamba. «Un chorro de» = muchísimo.", en: "Trabajo → chamba. «Un chorro de» = a ton of." },
  { es: "«¿Qué onda?» = ¿qué tal?; «al rato» = más tarde.", en: "«¿Qué onda?» = what’s up?; «al rato» = later." },
  { es: "Irreal presente: si + imperfecto de subjuntivo → condicional.", en: "Present unreal: si + imperfect subjunctive → conditional." },
  { es: "La consecuencia de lo irreal va en condicional: compraría.", en: "The unreal consequence takes the conditional: compraría." },
  { es: "Pasado irreal: pluscuamperfecto de subjuntivo → condicional compuesto.", en: "Past unreal: pluperfect subjunctive → compound conditional." },
  { es: "Petición en pasado → imperfecto de subjuntivo: mandara.", en: "A past request → imperfect subjunctive: mandara." },
  { es: "Imperfecto de subjuntivo como suavizante: más cortés que «quiero».", en: "Imperfect subjunctive as a softener: more polite than «quiero»." },
  { es: "Lamento sobre el pasado: ojalá + pluscuamperfecto de subjuntivo.", en: "Regret about the past: ojalá + pluperfect subjunctive." },
  { es: "«Como si» exige imperfecto de subjuntivo, siempre.", en: "«Como si» always takes the imperfect subjunctive." },
  { es: "Trampa: condición real/probable → indicativo.", en: "Trap: a real/likely condition → indicative." },
  { es: "Fuera (subjuntivo) + esperaría (condicional). «Sería / era» son señuelos.", en: "Fuera (subjunctive) + esperaría (conditional). «Sería / era» are decoys." },
  { es: "Futuro inmediato → condicional: iría.", en: "Immediate future → conditional: iría." },
  { es: "Pudiera → mudaría: el dúo clásico de la hipótesis irreal.", en: "Pudiera → mudaría: the classic unreal-hypothesis pair." },
  { es: "El «se accidental»: se + pronombre + verbo concordando con la cosa (llaves → olvidaron).", en: "Accidental «se»: se + pronoun + verb agreeing with the thing (llaves → olvidaron)." },
  { es: "Le + lo es impronunciable: le → se. «Se lo mandé».", en: "Le + lo is unpronounceable: le → se. «Se lo mandé»." },
  { es: "Objeto directo femenino → la. «Le vi» es leísmo, no mexicano.", en: "Feminine direct object → la. «Le vi» is leísmo, not Mexican." },
  { es: "«Encantar» funciona como gustar: objeto indirecto → les.", en: "«Encantar» works like gustar: indirect object → les." },
  { es: "Pasiva refleja: se + verbo en 3.ª persona.", en: "Reflexive passive: se + 3rd-person verb." },
  { es: "Indirecto antes que directo, y le → se ante lo.", en: "Indirect before direct, and le → se before lo." },
  { es: "Nadie específico vende: la casa «se vende».", en: "No specific seller: the house «se vende»." },
  { es: "«A nadie» = objeto indirecto → le.", en: "«A nadie» = indirect object → le." },
  { es: "Regla de hierro: indirecto (me) antes que directo (lo).", en: "Iron rule: indirect (me) before direct (lo)." },
  { es: "Le (a María) + lo (el contrato) → le se es imposible: Se lo mandé.", en: "Le (a María) + lo (the contract) → le se is impossible: Se lo mandé." },
  { es: "«Se me hace tarde» + «te marco» = te llamo (mexicanismo).", en: "«Se me hace tarde» + «te marco» = I’ll call you (Mexican)." },
  { es: "Contraste con lo anterior → sin embargo.", en: "Contrast with what came before → sin embargo." },
  { es: "Negación + corrección con verbo conjugado → sino que.", en: "Negation + correction with a conjugated verb → sino que." },
  { es: "Tras negación, para corregir → sino. «Pero» añade, no corrige.", en: "After a negation, to correct → sino. «Pero» adds; it doesn’t correct." },
  { es: "Causa formal → debido a / a causa de.", en: "Formal cause → debido a / a causa de." },
  { es: "Consecuencia lógica → por lo tanto.", en: "Logical consequence → por lo tanto." },
  { es: "El obstáculo no impide el resultado.", en: "The obstacle doesn’t stop the result." },
  { es: "Consecuencia → por lo tanto. «Embargo» era señuelo.", en: "Consequence → por lo tanto. «Embargo» was a decoy." },
  { es: "«En cuanto a» = en lo referente a. Ojo: «en cuanto + verbo» = tan pronto como.", en: "«En cuanto a» = regarding. Watch: «en cuanto + verb» = as soon as." },
  { es: "Registro formal del contraste. Frecuente en contratos y dictámenes.", en: "Formal contrast. Common in contracts and rulings." },
  { es: "Hecho conocido → aunque + indicativo: aunque llueve.", en: "A known fact → aunque + indicative: aunque llueve." },
  { es: "Concesión con hecho conocido → aunque + indicativo (subió).", en: "Concession with a known fact → aunque + indicative (subió)." },
  { es: "Condicional + infinitivo = el suavizante del registro profesional.", en: "Conditional + infinitive = the professional-register softener." },
  { es: "Con la cabeza en otra parte.", en: "With your head somewhere else." },
  { es: "El clásico: más vale tarde que nunca.", en: "The classic: better late than never." },
  { es: "«¿Me estás tomando el pelo?» = ¿me estás vacilando?", en: "«¿Me estás tomando el pelo?» = are you kidding me?" },
  { es: "Los títulos profesionales (licenciado, ingeniero) pesan mucho en el trato formal mexicano.", en: "Professional titles (licenciado, ingeniero) carry weight in formal Mexican address." },
  { es: "Refrán con subjuntivo fosilizado.", en: "A proverb with a fossilized subjunctive." },
  { es: "El grito de ánimo mexicano por excelencia.", en: "The Mexican pep-talk line, by default." },
  { es: "Tutear de entrada puede sonar confianzudo.", en: "Jumping straight to tú can sound too familiar." },
  { es: "Registro usted: le… su. «Te / tu» romperían el tratamiento.", en: "Usted register: le… su. «Te / tu» would break the form." },
  { es: "El suavizante profesional: condicional + infinitivo, tratamiento de usted.", en: "The professional softener: conditional + infinitive, usted address." },
  { es: "Fórmula de cierre profesional mexicana ≈ I remain at your service.", en: "Mexican professional close ≈ I remain at your service." },
  { es: "Lectura rápida: contexto, no traducción palabra por palabra.", en: "Quick reading: context, not word-for-word translation." },
  { es: "Farmacia de barrio: corto, claro, «sin receta» antes de que te manden al doctor.", en: "Neighborhood pharmacy: short, clear, «sin receta» before they send you to a doctor." },
  { es: "WhatsApp casero: corto, claro, sin correo formal.", en: "Landlord WhatsApp: short, clear, no formal email." },
];

const EXPLAIN_BY_ES = new Map(PRACTICE_EXPLAIN.map((row) => [row.es, row]));

export function explainText(q, lang) {
  if (!q) return "";
  if (q.explain && typeof q.explain === "object") return uiText(q.explain, lang);
  if (lang === "en") {
    if (typeof q.explainEn === "string" && q.explainEn) return q.explainEn;
    if (typeof q.explain === "string" && EXPLAIN_BY_ES.get(q.explain)?.en) return EXPLAIN_BY_ES.get(q.explain).en;
    if (typeof q.note === "string" && EXPLAIN_BY_ES.get(q.note)?.en) return EXPLAIN_BY_ES.get(q.note).en;
    if (typeof q.explain === "string" && q.explain) return q.explain;
    if (typeof q.note === "string") return q.note;
    return "";
  }
  if (typeof q.explain === "string" && q.explain) return q.explain;
  if (q.explain && typeof q.explain === "object") return uiText(q.explain, "es");
  if (typeof q.note === "string") return q.note;
  return "";
}
