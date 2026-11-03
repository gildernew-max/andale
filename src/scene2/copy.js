/** Scene 2 copy — George, Oct 29.
 *  /workspace/andale-redesign/scene2-content.md
 *  Lines below are transcribed exactly from that file. ES/EN pairs only. */

export const SCENE2_ID = "taxi";

export const SCENE2_TITLE = Object.freeze({
  es: "Hoy: el taxi.",
  en: "Today: the taxi.",
});

export const SCENE2_CHUNKS = Object.freeze([
  Object.freeze({
    id: "hidalgo",
    cueEn: "Ask the driver to take you to Calle Hidalgo.",
    es: "¿Me lleva a la calle Hidalgo, por favor?",
    en: "Can you take me to Hidalgo Street, please?",
    trap: "«llevar», not «tomar».",
    tipEs: "Fíjate en \"me lleva\": tú vas, él te lleva.",
    tipEn: "Listen for «me lleva»: you go, he takes you.",
  }),
  Object.freeze({
    id: "cobra",
    cueEn: "Ask how much he'll charge.",
    es: "¿Cuánto me cobra?",
    en: "How much will you charge me?",
    trap: "«cobrar», not «cargar».",
    tipEs: "Fíjate en \"cobra\": la b suena suave.",
    tipEn: "Listen for «cobra»: the b is soft.",
  }),
  Object.freeze({
    id: "derecha",
    cueEn: "Tell him to turn right here.",
    es: "Aquí a la derecha.",
    en: "Right here.",
    trap: "«a la derecha», never «a la derecho».",
    tipEs: "Fíjate en \"la\": derecha es femenina.",
    tipEn: "Listen for «la»: derecha is feminine.",
  }),
  Object.freeze({
    id: "aqui-esta-bien",
    cueEn: "Tell him here is fine.",
    es: "Aquí está bien, gracias.",
    en: "Here is fine, thanks.",
    trap: "«está», not «es».",
    tipEs: "Fíjate en \"está\": un lugar, ahora.",
    tipEn: "Listen for «está»: a place, right now.",
  }),
  Object.freeze({
    id: "cambio-doscientos",
    cueEn: "Ask if he has change for 200.",
    es: "¿Tiene cambio de doscientos?",
    en: "Do you have change for two hundred?",
    trap: "«cambio de», not «cambio para».",
    tipEs: "Fíjate en \"doscientos\": una sola palabra.",
    tipEn: "Listen for «doscientos»: one word.",
  }),
]);

export const SCENE2_TWISTS = Object.freeze([
  Object.freeze({
    id: "a",
    lineEs: "Buenas tardes, ¿a dónde?",
    chunkId: "hidalgo",
  }),
  Object.freeze({
    id: "a-fare",
    lineEs: "Son sesenta. ¿Le parece?",
    answerEs: "Sí, está bien.",
    note: "«¿Le parece?» = \"OK with you?\"",
  }),
  Object.freeze({
    id: "b",
    lineEs: "¿Por dónde me voy, por Hidalgo o por Canal?",
    answerEs: "Por Hidalgo, y aquí a la derecha.",
    chunkId: "derecha",
  }),
  Object.freeze({
    id: "c",
    lineEs: "No traigo cambio, joven.",
    followUpEs: "Ah, ¿tiene de cien?",
    chunkId: "aqui-esta-bien",
  }),
]);

export const SCENE2_REVIEW_FROM_SCENE1 = Object.freeze({
  note: "«¿Me da…?» pattern returns in «¿Me lleva…?»; «¿Cuánto le debo?» at drop-off as alternative to 2.",
});

export const SCENE2_COMPARE_PROMPT = Object.freeze({
  es: "Escucha las dos. ¿Suena igual?",
  en: "Listen to both. Same?",
  sameEs: "Suena igual",
  retryEs: "Lo repito",
});
