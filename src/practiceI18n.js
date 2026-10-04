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
  { es: "«Me da gusto que» (emoción) dispara el subjuntivo. Tú → sientas.", en: "«Me da gusto que» (emotion) triggers the subjunctive. Tú → sientas." },
  { es: "«Para que» (finalidad) siempre pide subjuntivo: vayas.", en: "«Para que» (purpose) always takes the subjunctive: vayas." },
  { es: "«Antes de que» siempre pide subjuntivo: salgas. «Sales / saldrás» son señuelos en indicativo.", en: "«Antes de que» always takes the subjunctive: salgas. «Sales / saldrás» are indicative decoys." },
  { es: "«Es posible que» plantea una posibilidad sin afirmarla → subjuntivo: pueda; las otras opciones la dan por hecha.", en: "«Es posible que» raises a possibility without stating it → subjunctive: pueda; the other choices treat it as fact." },
  { es: "Aquí «decir que» es una petición, no una noticia → subjuntivo: llame; como noticia sería «Dice que me llama».", en: "Here «decir que» is a request, not news → subjunctive: llame; as news it would be «Dice que me llama»." },
  { es: "«En caso de que» habla de algo que quizá no pase → subjuntivo: haga; las otras opciones lo tratan como un hecho.", en: "«En caso de que» talks about something that may not happen → subjunctive: haga; the other choices treat it as a fact." },
  { es: "Trampa: «estoy seguro de que» expresa certeza → indicativo: está. Con «no estoy seguro de que» sí iría subjuntivo: esté.", en: "Trap: «estoy seguro de que» expresses certainty → indicative: está. With «no estoy seguro de que» it would be subjunctive: esté." },
  { es: "«Recomendar que» (consejo) pide subjuntivo; probar cambia la vocal: pruebes.", en: "«Recomendar que» (advice) takes the subjunctive; probar changes its vowel: pruebes." },
  { es: "Un antecedente negativo («no hay nadie que») no existe, así que va en subjuntivo: sepa.", en: "A negative antecedent («no hay nadie que») doesn’t exist, so it takes the subjunctive: sepa." },
  { es: "«Hasta que» + acción futura pide subjuntivo: regrese. «Regreso / regresaré» son señuelos en indicativo.", en: "«Hasta que» + a future action takes the subjunctive: regrese. «Regreso / regresaré» are indicative decoys." },
  { es: "«Sin que» siempre pide subjuntivo y cambia de sujeto: ve → vea.", en: "«Sin que» always takes the subjunctive and switches subject: ve → vea." },
  { es: "«Querer que» en pasado pide imperfecto de subjuntivo: estudiara; el presente (estudie) no concuerda con «quería».", en: "«Querer que» in the past takes the imperfect subjunctive: estudiara; the present (estudie) doesn’t agree with «quería»." },
  { es: "«Como si» pide imperfecto de subjuntivo: conociera; las otras opciones presentan la comparación como un hecho.", en: "«Como si» takes the imperfect subjunctive: conociera; the other choices present the comparison as a fact." },
  { es: "Antecedente negativo («no había nadie que») en pasado → imperfecto de subjuntivo: supiera.", en: "Negative antecedent («no había nadie que») in the past → imperfect subjunctive: supiera." },
  { es: "«Antes de que» siempre pide subjuntivo; con «se fue» (pasado) va en imperfecto: pudiera.", en: "«Antes de que» always takes the subjunctive; with «se fue» (past) it goes in the imperfect: pudiera." },
  { es: "Trampa: «saber que» expresa certeza → indicativo: estaba. El subjuntivo (estuviera) aparece al negar: «No creía que estuviera».", en: "Trap: «saber que» expresses certainty → indicative: estaba. The subjunctive (estuviera) appears when you negate: «No creía que estuviera»." },
  { es: "Si + imperfecto de subjuntivo para lo irreal: manejara; llegaríamos es la consecuencia.", en: "Si + imperfect subjunctive for the unreal: manejara; llegaríamos is the result." },
  { es: "«Era importante que» (pasado) pide imperfecto de subjuntivo: dijeras, que sale de «dijeron».", en: "«Era importante que» (past) takes the imperfect subjunctive: dijeras, which comes from «dijeron»." },
  { es: "«¿Te molestó que…?» habla del pasado y pide imperfecto de subjuntivo: abriera.", en: "«¿Te molestó que…?» is about the past and takes the imperfect subjunctive: abriera." },
  { es: "Viviera (subjuntivo) + iría (condicional). «Vivía / iré» son señuelos.", en: "Viviera (subjunctive) + iría (conditional). «Vivía / iré» are decoys." },
  { es: "«Para que» en pasado pide imperfecto de subjuntivo: descansaras. «Descansas / descansarás» son señuelos en indicativo.", en: "«Para que» in the past takes the imperfect subjunctive: descansaras. «Descansas / descansarás» are indicative decoys." },
  { es: "Si el verbo principal pasa a imperfecto, el subjuntivo también: vengas → vinieras.", en: "If the main verb moves to the imperfect, the subjunctive does too: vengas → vinieras." },
  { es: "«Como si» sobre algo que ya pasó exige pluscuamperfecto de subjuntivo: hubiera pasado; ha, había y habría no van tras «como si».", en: "«Como si» about something that already happened requires the pluperfect subjunctive: hubiera pasado; ha, había and habría don’t follow «como si»." },
  { es: "«Yo que tú» da un consejo hipotético → condicional: hablaría; presente, pasado y futuro serían un hecho, no un consejo.", en: "«Yo que tú» gives hypothetical advice → conditional: hablaría; present, past and future would state a fact, not advice." },
  { es: "Pasado irreal: la cláusula con «si» lleva pluscuamperfecto de subjuntivo: hubieras estudiado. «Habrías» queda para la consecuencia.", en: "Past unreal: the «si» clause takes the pluperfect subjunctive: hubieras estudiado. «Habrías» is saved for the result." },
  { es: "Trampa: condición real o probable → «si» + presente de indicativo: depositan; «si» no lleva presente de subjuntivo, futuro ni condicional.", en: "Trap: a real or likely condition → «si» + present indicative: depositan; «si» doesn’t take the present subjunctive, the future or the conditional." },
  { es: "«Si no fuera por…» es una fórmula irreal (imperfecto de subjuntivo) y va con condicional: tendría.", en: "«Si no fuera por…» is an unreal formula (imperfect subjunctive) and goes with the conditional: tendría." },
  { es: "La consecuencia en condicional (haríamos) pide imperfecto de subjuntivo en la cláusula con «si»: vinieran.", en: "A conditional result (haríamos) calls for the imperfect subjunctive in the «si» clause: vinieran." },
  { es: "Tras «si» + imperfecto de subjuntivo, la consecuencia va en condicional: viajaría.", en: "After «si» + imperfect subjunctive, the result takes the conditional: viajaría." },
  { es: "Pasado irreal → condicional compuesto: habríamos + cenado; en el habla también se oye «hubiéramos».", en: "Past unreal → conditional perfect: habríamos + cenado; «hubiéramos» is also heard in speech." },
  { es: "Saliéramos (subjuntivo) + llegaríamos (condicional). «Saldríamos / llegaremos» son señuelos: «si» no lleva condicional ni futuro.", en: "Saliéramos (subjunctive) + llegaríamos (conditional). «Saldríamos / llegaremos» are decoys: «si» doesn’t take the conditional or the future." },
  { es: "«Quisiera» + infinitivo es la forma cortés de pedir. «Quise / querré» son señuelos: pasado y futuro.", en: "«Quisiera» + infinitive is the polite way to ask. «Quise / querré» are decoys: past and future." },
  { es: "Lo irreal cambia los dos verbos: llueve → lloviera, vamos → iríamos.", en: "The unreal version changes both verbs: llueve → lloviera, vamos → iríamos." },
  { es: "La edad en el pasado es una descripción → imperfecto: tenía. «Tuve» no se usa con la edad; el evento sería «cumplí veinte años».", en: "Age in the past is a description → imperfect: tenía. «Tuve» isn't used for age; the event would be «cumplí veinte años»." },
  { es: "«Mientras» presenta una acción en curso, de fondo: preparaba, igual que ponía. «Preparó» sonaría a acción terminada y choca con «ponía».", en: "«Mientras» frames an action in progress, as background: preparaba, matching ponía. «Preparó» would sound completed and clashes with ponía." },
  { es: "«Conocer» en pretérito = conocerse por primera vez: conocieron; el imperfecto (conocían) diría que ya se conocían.", en: "«Conocer» in the preterite = to meet for the first time: conocieron; the imperfect (conocían) would say they already knew each other." },
  { es: "«Poder» en pretérito = lograrlo: pude; «podía» solo expresa capacidad, no que lo lograste.", en: "«Poder» in the preterite = to manage to: pude; «podía» only expresses ability, not success." },
  { es: "Trampa: «de niña» suena a imperfecto, pero «una vez» marca un solo evento → pretérito: llevó. Con «todos los veranos» sí iría «llevaba».", en: "Trap: «de niña» sounds imperfect, but «una vez» marks a single event → preterite: llevó. With «todos los veranos» it would be «llevaba»." },
  { es: "«Ya» marca un estado que existía antes de ver → imperfecto: estaba.", en: "«Ya» marks a state already in place when the seeing happened → imperfect: estaba." },
  { es: "Evento terminado con «ayer» → pretérito; venir cambia la raíz: vinieron.", en: "A finished event with «ayer» → preterite; venir changes its stem: vinieron." },
  { es: "Hábito del pasado («antes», «todos los domingos») → imperfecto; ver es irregular: veía.", en: "A past habit («antes», «todos los domingos») → imperfect; ver is irregular: veía." },
  { es: "«Anoche» + un evento puntual → pretérito: me dormí. «Dormía / duermo» son señuelos: imperfecto y presente.", en: "«Anoche» + a one-time event → preterite: me dormí. «Dormía / duermo» are decoys: imperfect and present." },
  { es: "Un gusto de la infancia es un estado habitual → imperfecto: gustaba. «Gustaban» no concuerda con «el futbol»; «gusta» es presente.", en: "A childhood liking is a habitual state → imperfect: gustaba. «Gustaban» doesn't agree with «el futbol»; «gusta» is present tense." },
  { es: "Un hábito que ya no existe va en imperfecto: jugamos → jugábamos.", en: "A habit that no longer exists takes the imperfect: jugamos → jugábamos." },
  { es: "Causa o motivo: el tráfico explica el retraso → por. «Para» marcaría una meta o propósito, no una razón.", en: "Cause or reason: the traffic explains the delay → por. «Para» would signal a goal or purpose, not a reason." },
  { es: "Para + persona presenta su punto de vista («en opinión de»): para mi abuela. «Por» no introduce opiniones.", en: "Para + a person gives their point of view («in their opinion»): para mi abuela. «Por» doesn't introduce opinions." },
  { es: "Destinatario → para: el pan va dirigido a tu mamá. «Por» significaría «a causa de» o «en lugar de» ella.", en: "Recipient → para: the bread is meant for your mom. «Por» would mean «because of» or «on behalf of» her." },
  { es: "Movimiento a través de un lugar → por: cruzamos por el pueblito. «Para» marcaría el rumbo o destino, como la playa.", en: "Movement through a place → por: cruzamos por el pueblito. «Para» would mark the direction or destination, like the beach." },
  { es: "Trampa: «por» tienta como causa (un día horrible), pero «no estar para» algo = no tener ánimo para eso: no estoy para bromas. «Estar por» + infinitivo es otra cosa: «está por llegar» = va a llegar pronto.", en: "Trap: «por» tempts as a cause (a horrible day), but «no estar para» something = not being in the mood for it: no estoy para bromas. «Estar por» + infinitive is something else: «está por llegar» = it's about to arrive." },
  { es: "Duración (cuánto tiempo duró algo) → por: por diez años. Una fecha límite llevaría «para»: «para mañana».", en: "Duration (how long something lasted) → por: por diez años. A deadline would take «para»: «para mañana»." },
  { es: "Fecha límite (cuándo debe estar listo) → para: para mañana. Una duración llevaría «por»: «por dos horas».", en: "A deadline (when it has to be ready) → para: para mañana. A duration would take «por»: «por dos horas»." },
  { es: "Medio o canal de comunicación → por: por teléfono, por WhatsApp, por correo.", en: "A means or channel of communication → por: por teléfono, por WhatsApp, por correo." },
  { es: "Intercambio de una cosa por dinero → por: vendí mi celular por mil pesos. «Para / vendo» son señuelos: la preposición equivocada y el presente.", en: "Exchanging something for money → por: vendí mi celular por mil pesos. «Para / vendo» are decoys: the wrong preposition and the present tense." },
  { es: "Rumbo o destino → para: se va para Puebla. «Por Puebla» sería pasar por esa zona, no el destino. «Fue» es pasado y choca con «mañana».", en: "Heading toward a destination → para: se va para Puebla. «Por Puebla» would mean passing through or around it, not the destination. «Fue» is past tense and clashes with «mañana»." },
  { es: "Para + infinitivo expresa la finalidad (el «para qué»): hago ejercicio para bajar de peso.", en: "Para + infinitive expresses purpose (the «what for»): hago ejercicio para bajar de peso." },
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
