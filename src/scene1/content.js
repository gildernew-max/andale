/** Scene 1: En el mercado — George v1, Oct 27 (/workspace/andale-redesign/scene1-content.md).
 *  The five market chunks, their memory cues, and the compare listening tips.
 *  Content only: no UI, no state. */

export const SCENE1_ID = "mercado";

export const SCENE1_CHUNKS = Object.freeze([
  Object.freeze({
    id: "limones",
    es: "Buenos días. ¿Me da un kilo de limones?",
    en: "Good morning. Can I get a kilo of limes?",
    cueEs: "Saluda al vendedor y pide un kilo de limones.",
    cueEn: "Greet the vendor and ask for a kilo of limes.",
    tipEs: "Fíjate en «me da»: suave, no «quiero».",
    tipEn: "Listen for «me da»: soft, not «quiero».",
  }),
  Object.freeze({
    id: "medio-kilo",
    es: "Medio kilo, por favor.",
    en: "Half a kilo, please.",
    cueEs: "Pide medio kilo en vez de uno.",
    cueEn: "Ask for half a kilo instead.",
    tipEs: "Fíjate en «medio»: nunca «un medio» ni «una media».",
    tipEn: "Listen for «medio»: never «un medio» or «una media».",
  }),
  Object.freeze({
    id: "aguacates",
    es: "¿A cómo están los aguacates?",
    en: "How much are the avocados?",
    cueEs: "Pregunta a cómo están los aguacates hoy.",
    cueEn: "Ask how much the avocados are today.",
    tipEs: "Fíjate en «están», no «son».",
    tipEn: "Listen for «están», not «son».",
  }),
  Object.freeze({
    id: "nada-mas",
    es: "Nada más, gracias.",
    en: "That's all, thanks.",
    cueEs: "El vendedor pregunta si quieres algo más. No quieres.",
    cueEn: "The vendor asks if you want anything else. You don't.",
    tipEs: "Fíjate en «nada más»: no «no más».",
    tipEn: "Listen for «nada más»: not «no más».",
  }),
  Object.freeze({
    id: "cuanto-debo",
    es: "¿Cuánto le debo?",
    en: "How much do I owe you?",
    cueEs: "Pregunta cuánto debes.",
    cueEn: "Ask how much you owe.",
    tipEs: "Fíjate en «le»: suave y corto.",
    tipEn: "Listen for «le»: soft and short.",
  }),
]);

export function scene1ChunkById(id) {
  return SCENE1_CHUNKS.find((c) => c.id === id) || null;
}

/** "Your turn, off script" variants. The vendor line plays at street speed; the
 *  learner line is the expected answer, not graded — the loop just moves on. */
export const SCENE1_VARIANTS = Object.freeze([
  Object.freeze({
    id: "a",
    beats: Object.freeze([
      Object.freeze({ vendorEs: "Buenos días, ¿qué le doy?", vendorEn: "What can I get you?", chunkId: "limones" }),
      Object.freeze({ vendorEs: "¿Un kilo o medio?", vendorEn: "A kilo or half?", chunkId: "medio-kilo" }),
      Object.freeze({ vendorEs: "¿Algo más?", vendorEn: "Anything else?", chunkId: "nada-mas" }),
    ]),
  }),
  Object.freeze({
    id: "b",
    beats: Object.freeze([
      Object.freeze({ vendorEs: "Ya no me quedan limones. ¿Le doy limas?", vendorEn: "I'm out of limes. Do you want sweet limes?", chunkId: "aguacates" }),
      Object.freeze({ vendorEs: "A cincuenta el kilo.", vendorEn: "Fifty a kilo.", chunkId: "medio-kilo" }),
    ]),
  }),
  Object.freeze({
    id: "c",
    beats: Object.freeze([
      Object.freeze({ vendorEs: "¿Qué más le doy?", vendorEn: "What else?", chunkId: "nada-mas" }),
    ]),
  }),
]);
