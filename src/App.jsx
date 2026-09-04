import React, { useState, useEffect, useRef } from "react";
import { buildFlashDeck, FLASH_SESSION_CAP, advanceFlashRun } from "./flashDeck.js";
import { applyMatchPick, buildMatchRound, MATCH_PRACTICE_XP, MATCH_ROUND_CAP, startMatchRun } from "./matchPairs.js";
import { CONTENT_VERSION, acceptProgress, acceptLive, isFirstVisit } from "./schema.js";
import { prepQuestion as normalizeQuestion } from "./prepQuestion.js";
import { hoyStillFor } from "./hoyStill.js";
import { hasLearnerProgress, hasUnlockedShortcuts, hasWeaknessData } from "./theaterGate.js";
import { FIRST_DOOR_HOY, comeBackTomorrowLine, dayKeyFromDate, firstDoorHero, hoySceneForDay, hoyTitleForLang, isDay2Return, nextDayKey, progressAfterWinContinue, screenAfterWinContinue, shouldShowSoftPaywall, showColdPitch, showComeBackTomorrow, showDoorMetaChrome, showPostDismissHandoff, streakAfterWin, todaySceneIdFromSession } from "./firstDoor.js";
import { isShortHoy, shouldHoyEarlyWin, shouldParkHoyUnderMas, trimHoyBeats } from "./hoyWin.js";
import { isFirstDoctoraSession, shouldDoctoraEarlyWin, trimDoctoraBeats } from "./doctoraWin.js";
import { gradeListedPhrase } from "./wordOrder.js";
import { a2hsDisplayEnv, shouldShowA2hsSheet } from "./a2hs.js";
import { BAJIO_UNLOCK_FLASH_MS, MEXICO_OUTLINE_PATH, RECUERDOS_PINS, bajioUnlockFlashCopy, isBajioUnlockFlashLive, isRecuerdosPinOpen, markBajioUnlockFlashLive, recuerdosFogBackground, recuerdosLockedPins, recuerdosPinLabel, recuerdosPinState, shouldShowBajioUnlockFlash, storyIdForRecuerdosPin } from "./recuerdos.js";

/* ============================================================
   ¡Ándale! v3 — a faithful Duolingo-style clone
   Spanish only · intermediate & advanced · Mexican Spanish
   Duolingo formula: serpentine node path, sequential unlock,
   mascot reactions, global hearts w/ regen, gems, match pairs,
   chunky 3D buttons, bottom tabs. Original mascot: an axolotl.
   ============================================================ */

/* ============================================================
   DESIGN TOKENS — light & dark palettes.
   The brand hues (green/blue/purple/red/gold) stay constant across
   themes; only neutrals, surfaces, and feedback backgrounds shift.
   Inside the App component, `const D = theme==="dark" ? D_DARK : D_LIGHT`
   is memoized — every existing D.* read works untouched.
   ============================================================ */
const D_LIGHT = {
  green: "#58CC02", greenDark: "#46A302",
  blue: "#1CB0F6", blueDark: "#1899D6",
  purple: "#CE82FF", purpleDark: "#A567CC",
  red: "#FF4B4B", redDark: "#EA2B2B",
  gold: "#FFC800", goldDark: "#E6A800",
  ink: "#3C3C3C", sub: "#777777",
  line: "#E5E5E5", lockGray: "#E5E5E5", lockIcon: "#AFAFAF",
  bg: "#FFFFFF", card: "#FFFFFF", subtle: "#F7F7F7",
  okBg: "#D7FFB8", okText: "#58A700",
  badBg: "#FFDFE0", badText: "#EA2B2B",
  goldBg: "#FFFBEF", greenBg: "#F3FBEA", redBg: "#FFF1F1", blueBg: "#DDF4FF", purpleBg: "#F3F0FF", orangeBg: "#FFE9D6",
  track: "#F0F0F0", trackWarm: "#F0E6C8", accent: "#E08600",
};

const D_DARK = {
  green: "#58CC02", greenDark: "#46A302",
  blue: "#1CB0F6", blueDark: "#1899D6",
  purple: "#CE82FF", purpleDark: "#A567CC",
  red: "#FF6B6B", redDark: "#EA2B2B",
  gold: "#FFD43B", goldDark: "#E6A800",
  ink: "#E8E8EA", sub: "#A0A4AB",
  line: "#2A2E36", lockGray: "#2A2E36", lockIcon: "#6B6F77",
  bg: "#15171C", card: "#1E2128", subtle: "#252830",
  okBg: "#1F3A1A", okText: "#9CE16A",
  badBg: "#3A1A1A", badText: "#FF8C8C",
  goldBg: "#332B1A", greenBg: "#1F3A1A", redBg: "#3A1A1A", blueBg: "#0F2A3A", purpleBg: "#2A1A3A", orangeBg: "#3A2A1A",
  track: "#2A2E36", trackWarm: "#3A2E1F", accent: "#FFB347",
};
// Legacy alias — anything OUTSIDE the App function that reads D still works (icons, etc.).
const D = D_LIGHT;

const DAILY_GOAL = 40;
const MAX_HEARTS = 5;
const HEART_REGEN_MS = 30 * 60 * 1000; // 1 heart / 30 min
const REFILL_COST = 350;
const STORAGE_KEY = "andale-v3";
const LIVE_KEY = "andale-v3-live";

const snapshotLive = (s) => {
  if (!s || s.screen === "home") return null;
  return {
    screen: s.screen,
    tab: s.tab,
    session: s.session,
    qi: s.qi,
    status: s.status,
    selected: s.selected,
    typed: s.typed,
    typedTileIds: s.typedTileIds,
    placed: s.placed,
    matchSel: s.matchSel,
    matched: s.matched,
    sessionXP: s.sessionXP,
    itemXpLock: s.itemXpLock || [],
    combo: s.combo,
    lessonStats: s.lessonStats,
    showWhy: s.showWhy,
    failKind: s.failKind,
    quip: s.quip,
    screenQuip: s.screenQuip,
    storyId: s.storyView?.id || null,
    paraIdx: s.paraIdx,
    storyMode: s.storyMode,
    ansSel: s.ansSel,
    wordReveal: s.wordReveal,
    dialogue: s.dialogue,
    rivalOutcome: s.rivalOutcome,
    activeDuelId: s.activeDuel?.id || null,
    safeGame: s.safeGame,
    jeopardy: s.jeopardy,
    snakeGame: s.snakeGame,
    matchGame: s.matchGame,
  };
};

const writeLive = (payload) => {
  try {
    const raw = payload ? JSON.stringify(payload) : "";
    if (typeof window !== "undefined") {
      if (raw) window.localStorage?.setItem(LIVE_KEY, raw);
      else window.localStorage?.removeItem(LIVE_KEY);
    }
    storage.set(LIVE_KEY, raw);
  } catch (e) {}
};

/* ============================================================
   CONTENT ARCHITECTURE (Léxico pattern: appendable chunks)
   To add content WITHOUT touching the engine or losing progress:
   1. Append a unit object to UNITS with a NEW unique `id`
      (saved progress & SRS items are keyed by unit id + question
      index — never reorder questions inside an existing unit;
      always append new questions at the end).
   2. Add the id to a section in SECTIONS, or push a new section
      { title, color, dark, unitIds } — path, unlocking, chests,
      exams and the SRS all derive automatically.
   Question types: mc | type | order | listen | transform | match
   (match is auto-generated from each unit's `pairs`).
   ============================================================ */

/* ---------------- CONTENT (88 exercises + match pairs) ---------------- */

const UNITS = [
  {
    id: "subj1", title: "Subjuntivo presente", desc: "Deseos, dudas y antecedentes inciertos",
    pairs: [["ojalá", "hopefully"], ["dudar", "to doubt"], ["esperar", "to hope"], ["aunque", "although"], ["quizás", "maybe"]],
    questions: [
      { type: "mc", prompt: "Espero que ___ a la fiesta el sábado.", note: "(venir, tú)", choices: ["vienes", "vengas", "vendrás", "venga"], answer: "vengas", explain: "«Esperar que» dispara el subjuntivo. Tú → vengas." },
      { type: "type", prompt: "Ojalá que no ___ mañana.", note: "(llover)", answers: ["llueva"], explain: "«Ojalá» siempre va con subjuntivo: llueva." },
      { type: "mc", prompt: "Busco un departamento que ___ cerca del centro.", note: "", choices: ["está", "esté", "estará", "estaba"], answer: "esté", explain: "Antecedente indefinido (no sé si existe) → subjuntivo." },
      { type: "mc", prompt: "Es obvio que Marisol ___ razón.", note: "¡Ojo!", choices: ["tenga", "tuviera", "tiene", "tendría"], answer: "tiene", explain: "Trampa: «es obvio que» expresa certeza → indicativo. Compara: «No es obvio que tenga razón»." },
      { type: "type", prompt: "Te llamo cuando ___ del trabajo.", note: "(salir, yo — acción futura)", answers: ["salga"], explain: "«Cuando» + acción futura → subjuntivo. Hábito sería indicativo: «cuando salgo»." },
      { type: "mc", prompt: "No creo que el metro ___ a esa hora.", note: "", choices: ["funciona", "funcione", "funcionará", "funcionaba"], answer: "funcione", explain: "Negar una creencia → subjuntivo." },
      { type: "type", prompt: "Quiero que mis hijos ___ español.", note: "(aprender)", answers: ["aprendan"], explain: "Verbo de voluntad + cambio de sujeto → subjuntivo." },
      { type: "mc", prompt: "Aunque ___ caro —no sé el precio—, lo voy a comprar.", note: "", choices: ["es", "sea", "será", "era"], answer: "sea", explain: "«Aunque» + información desconocida → subjuntivo. Si ya sabes que es caro: «aunque es caro»." },
      { type: "order", prompt: "Construye: “I doubt that it’s true.”", words: ["Dudo", "que", "sea", "verdad", "es", "será"], answer: "Dudo que sea verdad", explain: "«Dudar que» → subjuntivo: sea. «Es / será» son señuelos en indicativo." },
      { type: "transform", base: "Creo que viene.", instruction: "Agrega duda (empieza con «No creo…»)", prompt: "Transforma la oración", answers: ["No creo que venga"], explain: "Negar la creencia obliga al subjuntivo: viene → venga." },
      { type: "listen", text: "Es importante que llegues temprano a la reunión.", answers: ["Es importante que llegues temprano a la reunión"], explain: "Expresión impersonal de valoración + que → subjuntivo: llegues." },
    ],
  },
  {
    id: "pret", title: "Pretérito vs. imperfecto", desc: "El pasado que narra vs. el pasado que pinta",
    pairs: [["anoche", "last night"], ["de repente", "suddenly"], ["mientras", "while"], ["soler", "to usually do"], ["enterarse", "to find out"]],
    questions: [
      { type: "mc", prompt: "Cuando era niño, ___ a Querétaro cada verano.", note: "", choices: ["fui", "iba", "he ido", "fuera"], answer: "iba", explain: "Acción habitual en el pasado → imperfecto." },
      { type: "mc", prompt: "Ayer ___ a mi abuela en San Miguel.", note: "", choices: ["visitaba", "visité", "visitara", "visito"], answer: "visité", explain: "Evento puntual y terminado → pretérito." },
      { type: "type", prompt: "Yo cocinaba cuando, de repente, se ___ la luz.", note: "(ir)", answers: ["fue"], explain: "Fondo en imperfecto, interrupción en pretérito: se fue la luz." },
      { type: "mc", prompt: "«No quiso ayudarme» significa:", note: "", choices: ["No tenía ganas de ayudarme", "Se negó a ayudarme", "No sabía cómo ayudarme", "No podía ayudarme"], answer: "Se negó a ayudarme", explain: "«Querer» cambia de sentido: quería = deseaba; no quiso = se negó." },
      { type: "type", prompt: "De niña, Coco ___ dibujar mapas de ciudades imaginarias.", note: "(soler)", answers: ["solía", "solia"], explain: "«Soler» casi siempre vive en imperfecto: solía." },
      { type: "mc", prompt: "___ las diez de la noche cuando por fin llegamos.", note: "", choices: ["Fueron", "Eran", "Serían", "Han sido"], answer: "Eran", explain: "La hora en el pasado siempre va en imperfecto." },
      { type: "mc", prompt: "¿Cuál expresa “se enteró” (found out)?", note: "", choices: ["Sabía la respuesta", "Supo la respuesta"], answer: "Supo la respuesta", explain: "«Saber» en pretérito = enterarse; en imperfecto = tener el conocimiento." },
      { type: "type", prompt: "El sábado pasado ___ un concierto increíble en el Auditorio Nacional.", note: "(haber)", answers: ["hubo"], explain: "Evento que ocurrió y terminó → hubo. «Había» describiría el escenario." },
      { type: "order", prompt: "Construye: “While I was sleeping, the phone rang.”", words: ["Mientras", "dormía", "sonó", "el", "teléfono", "dormí", "sonaba"], answer: "Mientras dormía sonó el teléfono", explain: "Fondo (dormía, imperfecto) interrumpido por un evento (sonó, pretérito)." },
      { type: "transform", base: "Sabía la respuesta.", instruction: "Cámbialo a «me enteré» (un solo verbo)", prompt: "Transforma la oración", answers: ["Supe la respuesta"], explain: "Saber en pretérito = enterarse: supe." },
      { type: "listen", text: "Anoche fuimos al cine y vimos una película mexicana.", answers: ["Anoche fuimos al cine y vimos una película mexicana"], explain: "Cadena de eventos terminados → pretérito: fuimos, vimos." },
    ],
  },
  {
    id: "porpara", title: "Por vs. para", desc: "Causa, intercambio, destino y plazos",
    pairs: [["plazo", "deadline"], ["destino", "destination"], ["intercambio", "exchange"], ["propósito", "purpose"], ["a través de", "through"]],
    questions: [
      { type: "mc", prompt: "Gracias ___ tu ayuda con el contrato.", note: "", choices: ["para", "por"], answer: "por", explain: "Agradecimiento = causa → por." },
      { type: "type", prompt: "Salimos ___ Guanajuato al amanecer.", note: "(destino)", answers: ["para"], explain: "Destino, rumbo → para. «Por Guanajuato» sería atravesar la ciudad." },
      { type: "mc", prompt: "Cambié mi coche ___ una bici de grava.", note: "", choices: ["para", "por"], answer: "por", explain: "Intercambio → por. Una cosa por otra." },
      { type: "mc", prompt: "___ ser extranjero, habla un español impecable.", note: "", choices: ["Por", "Para"], answer: "Para", explain: "Contraste con lo esperado → para." },
      { type: "type", prompt: "Caminamos ___ el centro histórico toda la tarde.", note: "(movimiento dentro de un lugar)", answers: ["por"], explain: "Movimiento a través de / dentro de → por." },
      { type: "mc", prompt: "Necesito el contrato firmado ___ el viernes.", note: "", choices: ["por", "para"], answer: "para", explain: "Fecha límite → para." },
      { type: "mc", prompt: "Compré este regalo ___ ti — tú eres el destinatario.", note: "", choices: ["por", "para"], answer: "para", explain: "Destinatario → para. «Por ti» = en tu lugar o por tu causa." },
      { type: "type", prompt: "Pagué dos mil pesos ___ el vuelo a la CDMX.", note: "(precio)", answers: ["por"], explain: "Precio pagado → por." },
      { type: "order", prompt: "Construye: “I’ll be right back — I’m going to get a coffee.”", words: ["Ahorita", "vengo,", "voy", "por", "un", "café", "para"], answer: "Ahorita vengo, voy por un café", explain: "«Ir por algo» = ir a buscarlo. Siempre con por." },
      { type: "transform", base: "Necesito el contrato antes del viernes.", instruction: "Reescríbelo con para (plazo)", prompt: "Transforma la oración", answers: ["Necesito el contrato para el viernes"], explain: "Fecha límite → para el viernes." },
      { type: "listen", text: "Gracias por todo, nos vemos el viernes para la firma.", answers: ["Gracias por todo, nos vemos el viernes para la firma"], explain: "Por = causa (gracias por); para = propósito (para la firma)." },
    ],
  },
  {
    id: "mex", title: "Mexicanismos", desc: "El español de la calle, de la chamba y del antro",
    pairs: [["chamba", "work (slang)"], ["antro", "nightclub"], ["lana", "money (slang)"], ["padrísimo", "awesome"], ["al rato", "later"]],
    questions: [
      { type: "mc", prompt: "En México, «ahorita» puede significar:", note: "", choices: ["Solo «en este preciso instante»", "Nunca", "Ahora, en un rato, o en un futuro gloriosamente indefinido"], answer: "Ahora, en un rato, o en un futuro gloriosamente indefinido", explain: "«Ahorita» es elástico. El contexto manda." },
      { type: "mc", prompt: "«¡Qué padre tu casa en San Miguel!» significa:", note: "", choices: ["Qué grande", "Qué genial / qué bonita", "Qué cara", "Qué vieja"], answer: "Qué genial / qué bonita", explain: "«Padre» = genial. También «padrísimo»." },
      { type: "type", prompt: "Tengo mucha ___ esta semana; no salgo del despacho.", note: "(trabajo, coloquial)", answers: ["chamba"], explain: "«Chamba» = trabajo. El verbo: chambear." },
      { type: "mc", prompt: "«¿Mande?» se usa cuando:", note: "", choices: ["Das una orden", "No escuchaste o alguien te llama", "Pides la cuenta", "Te despides"], answer: "No escuchaste o alguien te llama", explain: "Es el «¿cómo?» cortés mexicano." },
      { type: "mc", prompt: "«Me da pena» en México normalmente significa:", note: "¡Ojo si vienes de otro dialecto!", choices: ["Me da tristeza", "Me da vergüenza", "Me da lástima por ti"], answer: "Me da vergüenza", explain: "En México, pena = vergüenza. «¡Qué pena con usted!»" },
      { type: "type", prompt: "No traigo ni un ___; pagas tú y te transfiero.", note: "(dinero, coloquial)", answers: ["quinto", "varo", "peso", "centavo"], explain: "«Ni un quinto / ni un varo». También: «no traigo lana»." },
      { type: "mc", prompt: "«Sale» al cerrar un plan («¿Nos vemos a las ocho, sale?») significa:", note: "", choices: ["Adiós", "De acuerdo / ok", "Salgo de casa", "Tal vez"], answer: "De acuerdo / ok", explain: "«Sale» o «sale y vale» = trato hecho." },
      { type: "mc", prompt: "Un «antro» es:", note: "", choices: ["Un restaurante elegante", "Una cueva", "Un club nocturno", "Un mercado"], answer: "Un club nocturno", explain: "«Ir al antro» = salir de fiesta." },
      { type: "mc", prompt: "«No manches» expresa:", note: "", choices: ["Sorpresa o incredulidad", "Una orden de limpieza", "Enojo formal", "Despedida"], answer: "Sorpresa o incredulidad", explain: "≈ ¡no puede ser! Versión suave de otra expresión menos publicable." },
      { type: "transform", base: "Tengo mucho trabajo.", instruction: "Dilo en mexicano coloquial", prompt: "Transforma la oración", answers: ["Tengo mucha chamba", "Tengo un chorro de chamba"], explain: "Trabajo → chamba. «Un chorro de» = muchísimo." },
      { type: "listen", text: "¿Qué onda? ¿Vamos por unos tacos al rato?", answers: ["Qué onda, vamos por unos tacos al rato", "¿Qué onda? ¿Vamos por unos tacos al rato?"], explain: "«¿Qué onda?» = ¿qué tal?; «al rato» = más tarde." },
    ],
  },
  {
    id: "siclauses", title: "Hipótesis y cortesía", desc: "Si tuviera, habría, quisiera: lo irreal y lo cortés",
    pairs: [["quisiera", "I would like"], ["tal vez", "perhaps"], ["lamento", "regret"], ["cortesía", "politeness"], ["mudarse", "to move (homes)"]],
    questions: [
      { type: "mc", prompt: "Si ___ más tiempo, viajaría a Oaxaca cada mes.", note: "", choices: ["tengo", "tuviera", "tendría", "tenga"], answer: "tuviera", explain: "Irreal presente: si + imperfecto de subjuntivo → condicional." },
      { type: "type", prompt: "Si fuera tú, no ___ esa casa sin inspección.", note: "(comprar)", answers: ["compraría", "compraria"], explain: "La consecuencia de lo irreal va en condicional: compraría." },
      { type: "mc", prompt: "Si hubiera sabido del tráfico, te ___ antes.", note: "", choices: ["avisaría", "habría avisado", "avisara", "aviso"], answer: "habría avisado", explain: "Pasado irreal: pluscuamperfecto de subjuntivo → condicional compuesto." },
      { type: "type", prompt: "Me pidió que le ___ el contrato antes del cierre.", note: "(mandar)", answers: ["mandara", "mandase"], explain: "Petición en pasado → imperfecto de subjuntivo: mandara." },
      { type: "mc", prompt: "«Quisiera hablar con el gerente.» Aquí «quisiera» expresa:", note: "", choices: ["Un deseo del pasado", "Cortesía", "Duda", "Condición"], answer: "Cortesía", explain: "Imperfecto de subjuntivo como suavizante: más cortés que «quiero»." },
      { type: "mc", prompt: "Ojalá ___ venir al concierto el año pasado.", note: "(ellos — lamento del pasado)", choices: ["pudieran", "hubieran podido", "podían", "pueden"], answer: "hubieran podido", explain: "Lamento sobre el pasado: ojalá + pluscuamperfecto de subjuntivo." },
      { type: "mc", prompt: "Gasta dinero como si ___ millonario.", note: "", choices: ["es", "sea", "fuera", "sería"], answer: "fuera", explain: "«Como si» exige imperfecto de subjuntivo, siempre." },
      { type: "type", prompt: "Si llueve mañana, nos ___ en casa.", note: "(quedar, nosotros — condición real)", answers: ["quedamos", "quedaremos"], explain: "Trampa: condición real/probable → indicativo." },
      { type: "order", prompt: "Construye: “If I were you, I would wait.”", words: ["Si", "yo", "fuera", "tú,", "esperaría", "sería", "era"], answer: "Si yo fuera tú, esperaría", explain: "Fuera (subjuntivo) + esperaría (condicional). «Sería / era» son señuelos." },
      { type: "transform", base: "Voy a ir.", instruction: "Hazlo condicional (una palabra)", prompt: "Transforma la oración", answers: ["Iría"], explain: "Futuro inmediato → condicional: iría." },
      { type: "listen", text: "Si pudiera, me mudaría a San Miguel mañana mismo.", answers: ["Si pudiera, me mudaría a San Miguel mañana mismo", "Si pudiera me mudaría a San Miguel mañana mismo"], explain: "Pudiera → mudaría: el dúo clásico de la hipótesis irreal." },
    ],
  },
  {
    id: "pronombres", title: "Pronombres y «se»", desc: "Se lo dije, se me olvidó, se vende",
    pairs: [["llaves", "keys"], ["prestar", "to lend"], ["mandar", "to send"], ["olvidar", "to forget"], ["marcar", "to call (Mex)"]],
    questions: [
      { type: "mc", prompt: "¿Cuál es la forma correcta para “I forgot my keys (accidentally)”?", note: "", choices: ["Se me olvidaron las llaves", "Me olvidaron las llaves", "Se olvidé las llaves", "Me se olvidaron las llaves"], answer: "Se me olvidaron las llaves", explain: "El «se accidental»: se + pronombre + verbo concordando con la cosa (llaves → olvidaron)." },
      { type: "type", prompt: "¿El contrato? Ya ___ lo mandé al cliente.", note: "(pronombre)", answers: ["se"], explain: "Le + lo es impronunciable: le → se. «Se lo mandé»." },
      { type: "mc", prompt: "—¿Viste a María? —Sí, ___ vi en el mercado.", note: "", choices: ["le", "la", "lo", "se"], answer: "la", explain: "Objeto directo femenino → la. «Le vi» es leísmo, no mexicano." },
      { type: "mc", prompt: "A mis papás ___ encanta Querétaro.", note: "", choices: ["los", "les", "le", "se"], answer: "les", explain: "«Encantar» funciona como gustar: objeto indirecto → les." },
      { type: "type", prompt: "Estas tortillas ___ hacen a mano.", note: "(impersonal)", answers: ["se"], explain: "Pasiva refleja: se + verbo en 3.ª persona." },
      { type: "order", prompt: "Construye: “I sent it to her.” (el correo)", words: ["Se", "lo", "mandé", "le", "la"], answer: "Se lo mandé", explain: "Indirecto antes que directo, y le → se ante lo." },
      { type: "mc", prompt: "«Se vende casa» es un ejemplo de:", note: "", choices: ["Se reflexivo", "Se accidental", "Pasiva refleja / impersonal", "Se recíproco"], answer: "Pasiva refleja / impersonal", explain: "Nadie específico vende: la casa «se vende»." },
      { type: "type", prompt: "No ___ digas nada a nadie todavía.", note: "(pronombre — a nadie)", answers: ["le"], explain: "«A nadie» = objeto indirecto → le." },
      { type: "mc", prompt: "El orden correcto de pronombres es:", note: "", choices: ["¿Me lo prestas?", "¿Lo me prestas?", "¿Prestas melo?", "¿Lo prestas me?"], answer: "¿Me lo prestas?", explain: "Regla de hierro: indirecto (me) antes que directo (lo)." },
      { type: "transform", base: "Mandé el contrato a María.", instruction: "Sustituye contrato y María con pronombres", prompt: "Transforma la oración", answers: ["Se lo mandé"], explain: "Le (a María) + lo (el contrato) → le se es imposible: Se lo mandé." },
      { type: "listen", text: "Se me hace tarde, luego te marco.", answers: ["Se me hace tarde, luego te marco", "Se me hace tarde luego te marco"], explain: "«Se me hace tarde» + «te marco» = te llamo (mexicanismo)." },
    ],
  },
  {
    id: "conectores", title: "Conectores", desc: "Sin embargo, sino, por lo tanto: armar un argumento",
    pairs: [["sin embargo", "however"], ["por lo tanto", "therefore"], ["debido a", "due to"], ["además", "moreover"], ["a pesar de", "despite"]],
    questions: [
      { type: "mc", prompt: "Quería ir al concierto; ___, no conseguí boletos.", note: "", choices: ["por lo tanto", "sin embargo", "además", "es decir"], answer: "sin embargo", explain: "Contraste con lo anterior → sin embargo." },
      { type: "type", prompt: "No fui a la oficina, ___ que trabajé desde casa.", note: "(contraste tras negación)", answers: ["sino"], explain: "Negación + corrección con verbo conjugado → sino que." },
      { type: "mc", prompt: "No es caro, ___ barato.", note: "", choices: ["pero", "sino", "aunque"], answer: "sino", explain: "Tras negación, para corregir → sino. «Pero» añade, no corrige." },
      { type: "mc", prompt: "El proyecto fracasó ___ la falta de presupuesto.", note: "", choices: ["debido a", "por lo tanto", "a pesar de", "con tal de"], answer: "debido a", explain: "Causa formal → debido a / a causa de." },
      { type: "type", prompt: "Estudia muchísimo; por lo ___, aprobará el examen.", note: "(consecuencia)", answers: ["tanto"], explain: "Consecuencia lógica → por lo tanto." },
      { type: "mc", prompt: "«A pesar de que» introduce:", note: "", choices: ["Una causa", "Una concesión", "Una condición", "Un propósito"], answer: "Una concesión", explain: "El obstáculo no impide el resultado." },
      { type: "order", prompt: "Construye: “Therefore, we decided to cancel the contract.”", words: ["Por", "lo", "tanto,", "decidimos", "cancelar", "el", "contrato", "embargo"], answer: "Por lo tanto, decidimos cancelar el contrato", explain: "Consecuencia → por lo tanto. «Embargo» era señuelo." },
      { type: "mc", prompt: "«En cuanto a los costos…» equivale a:", note: "", choices: ["Con respecto a los costos", "Tan pronto como los costos", "A causa de los costos", "En contra de los costos"], answer: "Con respecto a los costos", explain: "«En cuanto a» = en lo referente a. Ojo: «en cuanto + verbo» = tan pronto como." },
      { type: "mc", prompt: "«No obstante» equivale a:", note: "", choices: ["por eso", "sin embargo", "además", "o sea"], answer: "sin embargo", explain: "Registro formal del contraste. Frecuente en contratos y dictámenes." },
      { type: "transform", base: "Llueve. Salimos.", instruction: "Únelas con una concesión (aunque)", prompt: "Transforma la oración", answers: ["Aunque llueve, salimos", "Salimos aunque llueve"], explain: "Hecho conocido → aunque + indicativo: aunque llueve." },
      { type: "listen", text: "Aunque el precio subió, la demanda sigue fuerte.", answers: ["Aunque el precio subió, la demanda sigue fuerte", "Aunque el precio subió la demanda sigue fuerte"], explain: "Concesión con hecho conocido → aunque + indicativo (subió)." },
    ],
  },
  {
    id: "registro", title: "Registro y modismos", desc: "Del correo formal al refrán de la abuela",
    pairs: [["de antemano", "in advance"], ["atentamente", "sincerely"], ["vergüenza", "embarrassment"], ["refrán", "proverb"], ["burlarse", "to mock"]],
    questions: [
      { type: "mc", prompt: "En un correo formal, «¿Me mandas el archivo?» se convierte en:", note: "", choices: ["¡Mándame el archivo!", "¿Podría enviarme el archivo, por favor?", "Archivo, porfa", "¿Me lo avientas?"], answer: "¿Podría enviarme el archivo, por favor?", explain: "Condicional + infinitivo = el suavizante del registro profesional." },
      { type: "mc", prompt: "«Estar en las nubes» significa:", note: "", choices: ["Estar feliz", "Estar distraído", "Estar de viaje", "Estar enojado"], answer: "Estar distraído", explain: "Con la cabeza en otra parte." },
      { type: "type", prompt: "Más vale tarde que ___.", note: "(refrán)", answers: ["nunca"], explain: "El clásico: más vale tarde que nunca." },
      { type: "mc", prompt: "«Tomar el pelo» significa:", note: "", choices: ["Cortar el cabello", "Burlarse o engañar en broma", "Peinarse", "Criticar"], answer: "Burlarse o engañar en broma", explain: "«¿Me estás tomando el pelo?» = ¿me estás vacilando?" },
      { type: "mc", prompt: "¿Cuál es el saludo más formal en un correo mexicano?", note: "", choices: ["¡Hola, qué tal!", "Estimado licenciado Ramírez:", "Oye, Ramírez", "Buenas"], answer: "Estimado licenciado Ramírez:", explain: "Los títulos profesionales (licenciado, ingeniero) pesan mucho en el trato formal mexicano." },
      { type: "type", prompt: "No hay mal que por bien no ___.", note: "(refrán)", answers: ["venga"], explain: "Refrán con subjuntivo fosilizado." },
      { type: "mc", prompt: "«Échale ganas» significa:", note: "", choices: ["Ten cuidado", "Esfuérzate / dale con todo", "Descansa", "Ten paciencia"], answer: "Esfuérzate / dale con todo", explain: "El grito de ánimo mexicano por excelencia." },
      { type: "mc", prompt: "Usar «usted» con desconocidos mayores en México es:", note: "", choices: ["Anticuado y raro", "Una señal de respeto esperada", "Ofensivo", "Solo para la realeza"], answer: "Una señal de respeto esperada", explain: "Tutear de entrada puede sonar confianzudo." },
      { type: "order", prompt: "Construye el cierre formal: “I thank you in advance for your attention.”", words: ["Le", "agradezco", "de", "antemano", "su", "atención", "te", "tu"], answer: "Le agradezco de antemano su atención", explain: "Registro usted: le… su. «Te / tu» romperían el tratamiento." },
      { type: "transform", base: "Mándame el archivo.", instruction: "Hazlo formal: usted + condicional", prompt: "Transforma la oración", answers: ["¿Podría enviarme el archivo, por favor?", "¿Podría enviarme el archivo?", "¿Me podría enviar el archivo, por favor?", "¿Me podría enviar el archivo?", "¿Podría mandarme el archivo, por favor?", "¿Podría mandarme el archivo?"], explain: "El suavizante profesional: condicional + infinitivo, tratamiento de usted." },
      { type: "listen", text: "Quedo a sus órdenes para cualquier duda.", answers: ["Quedo a sus órdenes para cualquier duda"], explain: "Fórmula de cierre profesional mexicana ≈ I remain at your service." },
    ],
  },
  {
    id: "subj2",
    title: "Si yo fuera...",
    desc: "Contrafactuales, cortesía y comparaciones con «como si»",
    blurb: "Contrafactuales, cortesía y comparaciones con «como si».",
    questions: [
      { type: "mc", prompt: "Si yo ___ rico, viajaría por todo México.", choices: ["fuera", "soy", "era", "sería"], answer: "fuera", note: "Si + imperfect subjunctive + conditional → counterfactual present. «Si soy» would make it a real condition, not a hypothetical." },
      { type: "mc", prompt: "Habla como si lo ___ todo.", choices: ["sabe", "supiera", "sabría", "sabe"], answer: "supiera", note: "«Como si» (as if) is always followed by imperfect subjunctive, no exceptions." },
      { type: "type", prompt: "Translate: «If I had time, I would help you.»", answer: "Si tuviera tiempo, te ayudaría.", note: "Si + imperfect subj + conditional. The classic structure." },
      { type: "mc", prompt: "Me dijo que ___ a la junta a las nueve.", choices: ["llegara", "llegue", "llego", "llegaba"], answer: "llegara", note: "Reported subjunctive: «Llega a las nueve» → «Me dijo que llegara». Past trigger → imperfect subjunctive." },
      { type: "transform", prompt: "Soften this command into a request.", source: "¿Puedes traerme el menú?", answer: "¿Pudieras traerme el menú?", note: "Imperfect subjunctive of poder/querer/deber softens requests dramatically — the polite move in Mexican Spanish: «Quisiera un café», «Pudieras ayudarme»." },
      { type: "mc", prompt: "Ojalá ___ aquí mi abuela.", choices: ["está", "esté", "estuviera", "fuera"], answer: "estuviera", note: "Ojalá + imperfect subjunctive = wish about the unreal/improbable. «Ojalá esté» would mean «I hope she is» (still possible); «ojalá estuviera» = «I wish she were» (she's not)." },
      { type: "order", prompt: "Order: «If you knew the truth, you would understand everything.»", tokens: ["Si", "supieras", "la", "verdad,", "entenderías", "todo"], answer: "Si supieras la verdad, entenderías todo" },
      { type: "type", prompt: "Translate: «I wish my father lived closer.»", answer: "Ojalá mi padre viviera más cerca.", note: "Ojalá triggers subjunctive; «vivir» → «viviera». Past-tense feel because it's counterfactual." },
      { type: "mc", prompt: "Buscaba un departamento que ___ cerca del metro.", choices: ["está", "estuviera", "esté", "fue"], answer: "estuviera", note: "Antecedent that may not exist + past tense → imperfect subjunctive." },
      { type: "mc", prompt: "Quisiera que tú ___ con nosotros.", choices: ["vienes", "vengas", "vinieras", "vendrías"], answer: "vinieras", note: "Quisiera (already imperfect subj) + que → imperfect subj. Sequence of tenses." },
      { type: "type", prompt: "Translate: «He left without my noticing.»", answer: "Se fue sin que yo me diera cuenta.", note: "«Sin que» always takes subjunctive. Past context → imperfect subjunctive." },
    ],
    pairs: [
      { es: "fuera", en: "(I/he/she) were (subj.)" },
      { es: "tuviera", en: "(I/he/she) had (subj.)" },
      { es: "supiera", en: "(I/he/she) knew (subj.)" },
      { es: "como si", en: "as if" },
      { es: "ojalá", en: "I wish / hopefully" },
      { es: "quisiera", en: "I would like (polite)" },
    ],
  },
  {
    id: "futcond",
    title: "Futuro y condicional",
    desc: "Lo que será, lo que sería, y la probabilidad",
    blurb: "Lo que será, lo que sería, y la probabilidad.",
    questions: [
      { type: "mc", prompt: "Mañana ___ a Querétaro.", choices: ["voy", "iré", "iría", "vaya"], answer: "iré", note: "Plain future tense. «Voy a ir» is equally common in speech; «iré» is the one-word version." },
      { type: "mc", prompt: "Si tuviera más dinero, ___ esa casa en San Miguel.", choices: ["compraré", "compraría", "compré", "comprara"], answer: "compraría", note: "Si + imperfect subjunctive + conditional. The conditional is the «would» half." },
      { type: "mc", prompt: "—¿Qué hora es? —___ las cinco. (I guess)", choices: ["Son", "Serán", "Serían", "Fueran"], answer: "Serán", note: "Future of probability: «Serán las cinco» = «It's probably 5.» This use is everywhere in spoken Spanish." },
      { type: "type", prompt: "Translate: «He would call you if he had your number.»", answer: "Te llamaría si tuviera tu número.", note: "Conditional + si + imperfect subjunctive. The order is reversible." },
      { type: "mc", prompt: "Me preguntó si ___ a la fiesta.", choices: ["voy", "iría", "iré", "fuera"], answer: "iría", note: "Conditional as «future-in-the-past». Direct: «¿Vas a ir?» → Reported: «si iría»." },
      { type: "transform", prompt: "Rewrite as a probability guess in the past.", source: "Probablemente estaba en su casa.", answer: "Estaría en su casa.", note: "Conditional of probability for past: «Estaría» = «He was probably». Future-of-probability for present; conditional for past." },
      { type: "order", prompt: "Order: «I would have gone, but I didn't have time.»", tokens: ["Habría", "ido,", "pero", "no", "tuve", "tiempo"], answer: "Habría ido, pero no tuve tiempo" },
      { type: "type", prompt: "Translate: «What time do you think it is?» (express the doubt with future)", answer: "¿Qué hora será?", note: "«¿Qué hora será?» literally «what hour will it be» = «what time is it / I wonder». Idiomatic." },
      { type: "mc", prompt: "Dijo que ___ con nosotros.", choices: ["viene", "vendrá", "vendría", "vino"], answer: "vendría", note: "Reported speech: present «viene» becomes conditional «vendría» in the past." },
      { type: "mc", prompt: "Mañana ___ que entregar el contrato.", choices: ["tendrás", "tienes", "tenías", "tuvieras"], answer: "tendrás", note: "Future obligation. «Tendrás que» = «You'll have to»." },
      { type: "type", prompt: "Translate: «I wonder where my keys are.»", answer: "¿Dónde estarán mis llaves?", note: "Future of probability captures the «I wonder» nuance in one word." },
    ],
    pairs: [
      { es: "iré", en: "I will go" },
      { es: "iría", en: "I would go" },
      { es: "tendrás", en: "you will have" },
      { es: "tendría", en: "I would have (cond.)" },
      { es: "será", en: "it will be / probably is" },
      { es: "haría", en: "I would do" },
    ],
  },
  {
    id: "pluscamp",
    title: "Pluscuamperfecto y condicional perfecto",
    desc: "Había hecho / habría hecho: narrar y arrepentirse",
    blurb: "Había hecho / habría hecho: narrar y arrepentirse.",
    questions: [
      { type: "mc", prompt: "Cuando llegué, ya ___ la junta.", choices: ["empezó", "empezaba", "había empezado", "habría empezado"], answer: "había empezado", note: "Pluperfect: «había + participle» — an action completed before another past action. The meeting started first; arrival came after." },
      { type: "type", prompt: "Translate: «I had never seen anything like it.»", answer: "Nunca había visto algo así.", note: "Pluperfect for a past event before a past reference point." },
      { type: "mc", prompt: "Si hubiera sabido, te ___ avisado.", choices: ["habría", "habré", "había", "hubiera"], answer: "habría", note: "Si + pluperfect subjunctive + conditional perfect. The «I would have» half." },
      { type: "transform", prompt: "Express regret about a past decision.", source: "No estudié para el examen.", answer: "Debería haber estudiado para el examen.", note: "«Debería haber + participle» = «I should have...». Standard regret construction." },
      { type: "order", prompt: "Order: «If they had warned me, I wouldn't have come.»", tokens: ["Si", "me", "hubieran", "avisado,", "no", "habría", "venido"], answer: "Si me hubieran avisado, no habría venido" },
      { type: "mc", prompt: "Yo ya me ___ ido cuando llamaste.", choices: ["he", "había", "habría", "habré"], answer: "había", note: "Pluperfect for sequencing in the past." },
      { type: "type", prompt: "Translate: «They would have helped us if they had been here.»", answer: "Nos habrían ayudado si hubieran estado aquí.", note: "Conditional perfect + si + pluperfect subjunctive. The full counterfactual past structure." },
      { type: "mc", prompt: "El contrato ___ firmado para el viernes.", choices: ["habrá sido", "había sido", "fue", "habría sido"], answer: "habrá sido", note: "Future perfect for a deadline: «will have been signed by Friday»." },
      { type: "mc", prompt: "Si no me ___ ayudado, no lo habría logrado.", choices: ["habrías", "hubieras", "habías", "habrás"], answer: "hubieras", note: "The «if» clause of a past counterfactual takes pluperfect subjunctive («hubiera + participle»), not conditional perfect." },
      { type: "type", prompt: "Translate: «By the time she arrived, we had already eaten.»", answer: "Para cuando llegó, ya habíamos comido.", note: "«Para cuando» + past + ya + pluperfect — classic temporal sequencing." },
      { type: "transform", prompt: "Express that something was probably done by now.", source: "Probablemente ya terminó.", answer: "Ya habrá terminado.", note: "Future perfect of probability: «He's probably finished by now.»" },
    ],
    pairs: [
      { es: "había hecho", en: "I had done" },
      { es: "habría hecho", en: "I would have done" },
      { es: "hubiera hecho", en: "I had done (subj.)" },
      { es: "habrá hecho", en: "will have done / probably has" },
      { es: "debería haber", en: "should have" },
      { es: "para cuando", en: "by the time" },
    ],
  },
  {
    id: "sereflex",
    title: "Se: pasivo, impersonal, accidental",
    desc: "Tres usos de «se» que el nativo no piensa",
    blurb: "Tres usos de «se» que el nativo no piensa.",
    questions: [
      { type: "mc", prompt: "Aquí ___ español. (general statement)", choices: ["habla", "se habla", "se hablan", "hablan"], answer: "se habla", note: "Impersonal «se» + singular verb — «Spanish is spoken here». No specific subject." },
      { type: "mc", prompt: "___ varios idiomas en este pueblo.", choices: ["Se habla", "Se hablan", "Hablan", "Está hablado"], answer: "Se hablan", note: "Passive «se»: when the «object» is plural, the verb is plural. «Varios idiomas» plural → «se hablan»." },
      { type: "type", prompt: "Translate: «My phone fell. (accidentally)»", answer: "Se me cayó el teléfono.", note: "«Se me cayó» = «It fell on me / I dropped it (not my fault)». The accidental se shifts blame off the speaker." },
      { type: "mc", prompt: "___ olvidaron las llaves en el coche.", choices: ["Me", "Se me", "Yo", "A mí"], answer: "Se me", note: "Accidental se with «olvidar». «Se me olvidaron las llaves» = «I forgot the keys / they slipped my mind»." },
      { type: "transform", prompt: "Express «It broke on me» (not my fault).", source: "Yo rompí la taza.", answer: "Se me rompió la taza.", note: "The shift from «yo rompí» (I broke it, my fault) to «se me rompió» (it broke on me, accidental) is a key Mexican Spanish move." },
      { type: "mc", prompt: "En México ___ tarde a las fiestas.", choices: ["se llega", "se llegan", "llegamos", "te llegas"], answer: "se llega", note: "Impersonal se for generalizations about customs — «one arrives late»." },
      { type: "order", prompt: "Order: «The cars were sold quickly.»", tokens: ["Los", "coches", "se", "vendieron", "rápidamente"], answer: "Los coches se vendieron rápidamente" },
      { type: "type", prompt: "Translate: «How do you get to the museum?»", answer: "¿Cómo se llega al museo?", note: "Impersonal se for asking directions — much more natural than «¿Cómo llego al museo?»." },
      { type: "mc", prompt: "Aquí no ___ fumar.", choices: ["se permite", "se permiten", "permite", "es permitido"], answer: "se permite", note: "Impersonal se with infinitive complement — «smoking is not permitted»." },
      { type: "mc", prompt: "___ olvidó decirte algo importante. (a mí)", choices: ["Me", "Se me", "Yo", "A mí"], answer: "Se me", note: "Accidental se: «se me olvidó» = «I forgot». The forgetting happened TO me; it wasn't my doing." },
      { type: "type", prompt: "Translate: «English isn't spoken here.»", answer: "Aquí no se habla inglés.", note: "Passive/impersonal se — the standard way to express «is/isn't spoken»." },
    ],
    pairs: [
      { es: "se habla", en: "is spoken / one speaks" },
      { es: "se me olvidó", en: "I forgot (accidental)" },
      { es: "se me cayó", en: "I dropped (accidental)" },
      { es: "se vende", en: "for sale" },
      { es: "¿cómo se llega?", en: "how do you get there?" },
      { es: "se prohíbe", en: "is prohibited" },
    ],
  },
  {
    id: "pronombres2",
    title: "Pronombres avanzados",
    desc: "Subida de clíticos, doble objeto y mandatos",
    blurb: "Subida de clíticos, doble objeto y mandatos.",
    questions: [
      { type: "mc", prompt: "¿El libro? ___ a Juan.", choices: ["Lo doy", "Le doy", "Se lo doy", "Lo le doy"], answer: "Se lo doy", note: "Two pronouns: indirect «le» becomes «se» before direct «lo/la/los/las» (the «le-lo» rule). Mandatory." },
      { type: "mc", prompt: "Voy a ___.", choices: ["decirle algo", "le decir algo", "decir le algo", "lo decir"], answer: "decirle algo", note: "With infinitive, pronoun attaches to the end or climbs to the conjugated verb: «Voy a decirle» or «Le voy a decir». Both correct." },
      { type: "transform", prompt: "Use clitic climbing.", source: "Estoy comprándolos.", answer: "Los estoy comprando.", note: "With gerunds, the pronoun can attach to the gerund or climb to the conjugated verb. Both are equally correct." },
      { type: "mc", prompt: "Affirmative command: «Give it to me.»", choices: ["Me lo da", "Dámelo", "Me lo dé", "Da me lo"], answer: "Dámelo", note: "Affirmative commands ATTACH pronouns and add an accent. «Da» + «me» + «lo» → «Dámelo» (acute on the original stress)." },
      { type: "mc", prompt: "Negative command: «Don't give it to me.»", choices: ["No démelo", "No me lo des", "No me lo da", "No dámelo"], answer: "No me lo des", note: "Negative commands the pronouns go BEFORE the verb. Always." },
      { type: "type", prompt: "Translate using two pronouns: «I gave it to her.»", answer: "Se lo di.", note: "«Le di la carta» → «Se la di». «Le» becomes «se» before «la/lo»." },
      { type: "order", prompt: "Order: «I want to give them to you.»", tokens: ["Quiero", "dártelos"], answer: "Quiero dártelos" },
      { type: "transform", prompt: "Rewrite with clitic climbing.", source: "Tengo que dárselos a ellos.", answer: "Se los tengo que dar a ellos.", note: "Pronouns climb to before «tengo». «Se los» (because «les + los» → «se los»)." },
      { type: "mc", prompt: "Por favor, ___. (Tell me the truth — usted)", choices: ["dime la verdad", "dígame la verdad", "me diga la verdad", "me dice la verdad"], answer: "dígame la verdad", note: "Usted command: «diga» + «me» → «dígame» (attached + accent preserved)." },
      { type: "mc", prompt: "¿La carta? Ya ___ envié.", choices: ["la", "le", "se la", "lo"], answer: "la", note: "Direct object «la carta» → «la». No indirect object here, so no double-pronoun magic." },
      { type: "type", prompt: "Translate: «Don't tell it to him.»", answer: "No se lo digas.", note: "Negative tú command + double pronoun + «le→se» rule. The full machine in one short sentence." },
    ],
    pairs: [
      { es: "se lo doy", en: "I give it to him/her" },
      { es: "dámelo", en: "give it to me" },
      { es: "no me lo des", en: "don't give it to me" },
      { es: "se los digo", en: "I tell it to them" },
      { es: "voy a decírtelo", en: "I'm going to tell you" },
      { es: "te lo prometo", en: "I promise you" },
    ],
  },
  {
    id: "compsup",
    title: "Comparativos y superlativos",
    desc: "Más que, tan como, el más. Y los irregulares que importan",
    blurb: "Más que, tan como, el más. Y los irregulares que importan.",
    questions: [
      { type: "mc", prompt: "Este café es ___ que el otro.", choices: ["más bueno", "mejor", "más mejor", "el mejor"], answer: "mejor", note: "«Mejor» replaces «más bueno» in comparatives. Same for «peor», «mayor», «menor»." },
      { type: "mc", prompt: "Carlos es ___ alto ___ su hermano.", choices: ["más / que", "tan / como", "más / como", "tanto / como"], answer: "tan / como", note: "«Tan + adjective + como» = «as ___ as». «Tanto» is for nouns/verbs." },
      { type: "type", prompt: "Translate: «I have as many books as you.»", answer: "Tengo tantos libros como tú.", note: "«Tantos/tantas + noun + como» — quantity comparison agrees in gender and number." },
      { type: "mc", prompt: "Es la persona ___ inteligente del equipo.", choices: ["más", "la más", "muy", "mucho"], answer: "más", note: "«La persona más inteligente» — superlatives use «el/la/los/las + noun + más + adjective»." },
      { type: "mc", prompt: "Tengo ___ trabajo ___ creía.", choices: ["más / que", "más / de lo que", "más / como", "tan / como"], answer: "más / de lo que", note: "Comparison with a clause: «más de lo que + verb». «Más que creía» would be wrong here." },
      { type: "order", prompt: "Order: «He works more than I do.»", tokens: ["Trabaja", "más", "que", "yo"], answer: "Trabaja más que yo" },
      { type: "type", prompt: "Translate: «It cost more than 100 pesos.»", answer: "Costó más de cien pesos.", note: "Before a NUMBER, use «más de» / «menos de» — not «más que». Common trap." },
      { type: "mc", prompt: "Mi hijo es ___ que yo (older).", choices: ["más mayor", "mayor", "más viejo", "muy mayor"], answer: "mayor", note: "«Mayor» / «menor» for age comparisons. «Más viejo» works but sounds harsh — like calling someone «older» vs «elderly»." },
      { type: "transform", prompt: "Make it an absolute superlative.", source: "El mole está muy rico.", answer: "El mole está riquísimo.", note: "«-ísimo/a» = extreme version of an adjective. «Rico → riquísimo», «bueno → buenísimo», «fácil → facilísimo»." },
      { type: "mc", prompt: "Es ___ vino del mundo.", choices: ["el más bueno", "el mejor", "muy bueno", "el mucho mejor"], answer: "el mejor", note: "Superlative of irregular «mejor»: «el/la mejor», never «el más bueno»." },
      { type: "type", prompt: "Translate: «It's the worst movie I've ever seen.»", answer: "Es la peor película que he visto.", note: "Irregular superlative «peor». Subjunctive optional with «que he visto»; indicative is also natural." },
    ],
    pairs: [
      { es: "más que", en: "more than" },
      { es: "menos que", en: "less than" },
      { es: "tan como", en: "as as" },
      { es: "tanto como", en: "as much as" },
      { es: "mejor / peor", en: "better / worse" },
      { es: "el mejor", en: "the best" },
    ],
  },
  {
    id: "relativos",
    title: "Pronombres relativos",
    desc: "Que, quien, el cual, cuyo, lo que — y cuándo va cada uno",
    blurb: "Que, quien, el cual, cuyo, lo que — y cuándo va cada uno.",
    questions: [
      { type: "mc", prompt: "La mujer ___ vimos ayer es abogada.", choices: ["que", "quien", "la cual", "cual"], answer: "que", note: "«Que» is the workhorse — works for people and things, with or without a preposition, in defining clauses." },
      { type: "mc", prompt: "El abogado, ___ acaba de llegar, firmará el contrato.", choices: ["que", "quien", "cuyo", "lo que"], answer: "quien", note: "After a comma (non-defining clause) and for people, «quien» is preferred. «Que» also works but «quien» is more elegant." },
      { type: "mc", prompt: "Compré la casa, ___ jardín es enorme.", choices: ["que", "cuya", "cuyo", "la cual"], answer: "cuyo", note: "«Cuyo/a/os/as» = «whose». Agrees with the THING POSSESSED, not the owner. «Cuyo jardín» (m. sing.) because «jardín» is masculine." },
      { type: "type", prompt: "Translate: «What you said is true.»", answer: "Lo que dijiste es verdad.", note: "«Lo que» = «what» as a relative pronoun referring to an idea/concept (not a specific noun)." },
      { type: "mc", prompt: "El tema sobre ___ hablamos era complejo.", choices: ["que", "el que", "el cual", "lo que"], answer: "el que", note: "After a preposition + specific noun, use «el/la/los/las que» or «el/la cual». «El que hablamos» without preposition would be wrong." },
      { type: "order", prompt: "Order: «The book whose author died last year.»", tokens: ["El", "libro", "cuyo", "autor", "murió", "el", "año", "pasado"], answer: "El libro cuyo autor murió el año pasado" },
      { type: "transform", prompt: "Combine into one sentence with a relative pronoun.", source: "Hablé con un cliente. El cliente firmó hoy.", answer: "Hablé con el cliente que firmó hoy.", note: "Defining clause → «que». No comma." },
      { type: "mc", prompt: "Hay algo ___ no entiendo.", choices: ["que", "lo que", "cual", "quien"], answer: "que", note: "After «algo», «nada», «mucho», «poco» → «que»." },
      { type: "type", prompt: "Translate: «That's not what I meant.»", answer: "Eso no es lo que quise decir.", note: "«Lo que quise decir» = «what I meant». «Lo que» introduces the abstract clause." },
      { type: "mc", prompt: "Los testigos, ___ declaraciones fueron grabadas, firmarán mañana.", choices: ["que", "cuyas", "cuyos", "los cuales"], answer: "cuyas", note: "«Cuyas» — feminine plural — agrees with «declaraciones»." },
      { type: "mc", prompt: "Es exactamente ___ necesitábamos.", choices: ["que", "lo que", "cual", "el que"], answer: "lo que", note: "«Lo que» when referring to an unspecified concept/thing. «What we needed»." },
    ],
    pairs: [
      { es: "que", en: "that / which" },
      { es: "quien", en: "who (after comma/prep.)" },
      { es: "cuyo", en: "whose" },
      { es: "lo que", en: "what (the thing that)" },
      { es: "el cual", en: "which (formal)" },
      { es: "donde", en: "where (relative)" },
    ],
  },
  {
    id: "reported",
    title: "Estilo indirecto",
    desc: "Contar lo que dijo otro: los tiempos que nadie te enseñó",
    blurb: "Contar lo que dijo otro: los tiempos que nadie te enseñó.",
    questions: [
      { type: "mc", prompt: "Direct: «Vivo en Querétaro.» Reported: «Dijo que ___ en Querétaro.»", choices: ["vive", "vivía", "viviera", "viviría"], answer: "vivía", note: "Present in direct speech → imperfect in reported (when the introducing verb is past). «Dijo que vivía» = «He said he lived»." },
      { type: "mc", prompt: "Direct: «Voy a llamarte.» Reported: «Me dijo que ___ a llamarme.»", choices: ["va", "iba", "iría", "fuera"], answer: "iba", note: "«Voy» (present) → «iba» (imperfect) when reported in the past." },
      { type: "mc", prompt: "Direct: «Llegué temprano.» Reported: «Dijo que ___ temprano.»", choices: ["llegó", "había llegado", "llega", "llegaría"], answer: "había llegado", note: "Preterite in direct → pluperfect in reported. «Llegué» → «había llegado»." },
      { type: "type", prompt: "Report the question: «¿Tienes hambre?» (I asked him...)", answer: "Le pregunté si tenía hambre.", note: "Yes/no questions: «si». Tense shifts: «tienes» → «tenía»." },
      { type: "mc", prompt: "Direct: «Llámame mañana.» Reported: «Me pidió que ___ al día siguiente.»", choices: ["llamo", "llame", "llamara", "llamaría"], answer: "llamara", note: "Commands in reported speech → imperfect subjunctive after past trigger. «Llámame» → «que llamara»." },
      { type: "order", prompt: "Report: «I will help you tomorrow.»", tokens: ["Dijo", "que", "me", "ayudaría", "al", "día", "siguiente"], answer: "Dijo que me ayudaría al día siguiente" },
      { type: "transform", prompt: "Report this in the past.", source: "«Estoy cansado.»", answer: "Dijo que estaba cansado.", note: "Present → imperfect. The «I'm tired» becomes «he said he was tired»." },
      { type: "type", prompt: "Report: «¿Dónde vives?» (he asked me)", answer: "Me preguntó dónde vivía.", note: "Wh-questions keep their question word. «Vives» → «vivía»." },
      { type: "mc", prompt: "Direct: «Habremos terminado.» Reported: «Aseguró que ___ terminado.»", choices: ["habrán", "habrían", "habían", "hayan"], answer: "habrían", note: "Future perfect → conditional perfect when reported in past." },
      { type: "mc", prompt: "Note: time words shift too. «Mañana» in reported past becomes:", choices: ["mañana", "el día siguiente", "ayer", "antes"], answer: "el día siguiente", note: "«Mañana» → «el día siguiente». «Hoy» → «aquel día». «Ayer» → «el día anterior». Get these wrong and your reported speech sounds like a translation." },
      { type: "type", prompt: "Report: «Voy a renunciar.» (he told me)", answer: "Me dijo que iba a renunciar.", note: "«Voy a + infinitive» → «iba a + infinitive». Periphrastic future shifts to imperfect." },
    ],
    pairs: [
      { es: "dijo que", en: "he said that" },
      { es: "preguntó si", en: "he asked whether" },
      { es: "pidió que (+subj)", en: "he asked (someone) to" },
      { es: "el día siguiente", en: "the next day" },
      { es: "el día anterior", en: "the day before" },
      { es: "aquel día", en: "that day" },
    ],
  },
  {
    id: "slang2",
    title: "Caló mexicano II",
    desc: "Más allá de padre y chido: el caló que te marca como de aquí",
    blurb: "Más allá de padre y chido: el caló que te marca como de aquí.",
    questions: [
      { type: "mc", prompt: "«Te lo juro, ___.»", choices: ["padre", "neta", "chido", "bueno"], answer: "neta", note: "«Neta» = «for real / honestly». «¿Es neta?» = «Is that true?». Quintessential CDMX slang." },
      { type: "mc", prompt: "«Tengo que ir a ___ a las nueve.» (work)", choices: ["chambear", "trabajar duro", "currar", "laburar"], answer: "chambear", note: "«Chambear» = to work (informal Mex.). «La chamba» = the job. «Currar» is Spanish slang; «laburar» is Argentine." },
      { type: "mc", prompt: "Esa chava es muy ___ (preppy / posh).", choices: ["naca", "fresa", "padre", "buena"], answer: "fresa", note: "«Fresa» (literally «strawberry») = preppy, posh, often condescending. Opposite is «naco» (trashy)." },
      { type: "mc", prompt: "Mi tío es bien ___ (stingy).", choices: ["codo", "pobre", "loco", "ñoño"], answer: "codo", note: "«Codo» (literally «elbow») = stingy, tight-fisted. «Apretado» also works but «codo» is more colorful." },
      { type: "type", prompt: "Translate: «What did you say?» (using the Mexican word)", answer: "¿Mande?", note: "«Mande» = polite «What?». Used instead of «¿Qué?», which can sound rude. Distinctly Mexican; not used elsewhere." },
      { type: "mc", prompt: "Cuando se cayó frente a todos, fue un gran ___.", choices: ["oso", "perro", "gato", "burro"], answer: "oso", note: "«Hacer el oso» = to embarrass oneself in public. «¡Qué oso!» = «How embarrassing!». Animal metaphor used constantly." },
      { type: "transform", prompt: "Make it slangier: 'It's awesome.'", source: "Está muy bueno.", answer: "Está bien chido.", note: "«Chido» = cool, awesome. «Bien chido» intensifies. «Padre» and «padrísimo» work too." },
      { type: "mc", prompt: "«No hay bronca» means:", choices: ["No problem", "There's no fight", "Don't worry about it", "All of the above"], answer: "All of the above", note: "«No hay bronca» literally = «there's no fight», but functionally means «no problem». Heard a hundred times a day in CDMX." },
      { type: "mc", prompt: "Mi compa ___ todo el día. (texts)", choices: ["chambea", "mensajea", "manda mensajes", "platica"], answer: "manda mensajes", note: "Trick question — there's no slang verb for «to text». You can say «me escribió» or «me mandó mensaje». «Compa» = buddy (short for «compañero»)." },
      { type: "mc", prompt: "Ese taco está ___ rico.", choices: ["bien", "muy", "harto", "todas las anteriores"], answer: "todas las anteriores", note: "«Bien rico», «muy rico», and «harto rico» (mostly heard in Yucatán/southern Mexico) all work. «Bien» is the most Mexican-flavored intensifier." },
      { type: "type", prompt: "Translate the slang: «Hang out / chill»", answer: "echar el chal", note: "«Echar el chal» = to hang out, chat, chill. Pure Mexican; you won't hear this in Spain. Acceptable alternative: «echar relajo»." },
    ],
    pairs: [
      { es: "neta", en: "for real / truth" },
      { es: "chambear", en: "to work (slang)" },
      { es: "fresa", en: "preppy / posh" },
      { es: "codo", en: "stingy" },
      { es: "¿mande?", en: "what? / pardon? (Mex.)" },
      { es: "no hay bronca", en: "no problem" },
    ],
  },
  {
    id: "formal",
    title: "Registro formal y legal",
    desc: "El vocabulario de contratos, correos formales y el lenguaje de la ley",
    blurb: "El vocabulario de contratos, correos formales y el lenguaje de la ley.",
    questions: [
      { type: "mc", prompt: "___ presente, le confirmo nuestra junta del jueves.", choices: ["Por la", "Con la", "Mediante", "A la"], answer: "Por la", note: "«Por la presente» = «By means of this letter / Herein». Opening for formal correspondence." },
      { type: "mc", prompt: "El contrato deberá firmarse ___ del 31 de marzo.", choices: ["antes", "a más tardar", "al menos", "ya"], answer: "a más tardar", note: "«A más tardar» = «no later than». Standard contract phrasing. «Antes del» works but is less precise." },
      { type: "mc", prompt: "___ las condiciones acordadas, se procederá al pago.", choices: ["Bajo", "Conforme a", "Hacia", "Para"], answer: "Conforme a", note: "«Conforme a» = «In accordance with / pursuant to». «De conformidad con» is the heavier-weight version." },
      { type: "type", prompt: "Translate (formal): «Notwithstanding the foregoing, the parties agree...»", answer: "No obstante lo anterior, las partes acuerdan...", note: "«No obstante lo anterior» — formal connector. «Sin embargo» is the everyday version; «no obstante» reads heavier and more legal." },
      { type: "mc", prompt: "En lo ___, todas las comunicaciones se harán por escrito.", choices: ["sucesivo", "siguiente", "futuro", "posterior"], answer: "sucesivo", note: "«En lo sucesivo» = «hereinafter / from this point forward». Classic legal Spanish; nothing else means quite the same thing." },
      { type: "transform", prompt: "Convert to formal register.", source: "Te aviso que la junta cambió.", answer: "Le informo que la junta ha sido reprogramada.", note: "«Te aviso» → «Le informo». «Cambió» → «ha sido reprogramada» (passive voice + present perfect)." },
      { type: "mc", prompt: "Las partes ___ que han leído y aceptan los términos.", choices: ["dicen", "manifiestan", "hablan", "comentan"], answer: "manifiestan", note: "«Manifestar» = to formally state/declare. The standard verb for contract recitals." },
      { type: "type", prompt: "Translate: «Should the borrower fail to pay...»", answer: "En caso de que el prestatario incumpla...", note: "«En caso de que» + subjunctive = «in the event that / should». «Incumpla» from «incumplir» (to default)." },
      { type: "mc", prompt: "El presente contrato ___ por un período de cinco años.", choices: ["dura", "tendrá vigencia", "se queda", "está"], answer: "tendrá vigencia", note: "«Tener vigencia» = «to be in effect». A contract «tiene vigencia», doesn't «dura». Different register." },
      { type: "mc", prompt: "___ a los efectos de notificación, las partes señalan los siguientes domicilios.", choices: ["Por", "Para", "A los efectos", "Con"], answer: "Para", note: "«Para los efectos de» = «For the purposes of». Standard preamble to notice provisions." },
      { type: "type", prompt: "Translate the closing: «Yours sincerely,»", answer: "Atentamente,", note: "«Atentamente» — the universal Spanish business closing. «Cordialmente» also works, slightly warmer. «Saludos» is too casual for legal correspondence." },
    ],
    pairs: [
      { es: "por la presente", en: "herein / by this letter" },
      { es: "no obstante", en: "notwithstanding" },
      { es: "en lo sucesivo", en: "hereinafter" },
      { es: "conforme a", en: "pursuant to" },
      { es: "a más tardar", en: "no later than" },
      { es: "atentamente", en: "yours sincerely" },
    ],
  },
];

const SECTIONS = [
  { title: "Sección 1 · Intermedio", color: D.green, dark: D.greenDark, unitIds: ["subj1", "pret", "porpara", "sereflex", "compsup"] },
  { title: "Sección 2 · Avanzado", color: D.purple, dark: D.purpleDark, unitIds: ["mex", "siclauses", "pronombres", "subj2", "futcond", "pluscamp", "pronombres2"] },
  { title: "Sección 3 · Maestría", color: D.blue, dark: D.blueDark, unitIds: ["conectores", "registro", "relativos", "reported", "slang2", "formal"] },
];

const FLAT = SECTIONS.flatMap((s) => s.unitIds.map((id) => ({ unit: UNITS.find((u) => u.id === id), section: s })));

/* ---------------- HELPERS ---------------- */

const strip = (s) => s.toLowerCase().trim().replace(/[¿?¡!.,;:—–-]/g, " ").replace(/\s+/g, " ").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const exactish = (s) => s.toLowerCase().trim().replace(/[¿?¡!.,;:—–-]/g, " ").replace(/\s+/g, " ").trim();

/** Put `id` at `at`, or append. Used so an unplaced chip can be replaced in the same hole. */
const insertIdAt = (ids, id, at) => {
  if (ids.includes(id)) return ids;
  const next = ids.slice();
  const i = at == null || at < 0 || at > next.length ? next.length : at;
  next.splice(i, 0, id);
  return next;
};

const wordDiff = (correct, user) => {
  const cw = correct.split(/\s+/).filter(Boolean);
  const uw = user.split(/\s+/).filter(Boolean);
  const n = cw.length, m = uw.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = strip(cw[i]) === strip(uw[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const marks = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (strip(cw[i]) === strip(uw[j])) { marks.push({ w: cw[i], k: exactish(cw[i]) === exactish(uw[j]) ? "ok" : "accent" }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { marks.push({ w: cw[i], k: "miss" }); i++; }
    else j++;
  }
  while (i < n) { marks.push({ w: cw[i], k: "miss" }); i++; }
  return marks;
};

const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* Audio note: .m4a (AAC) plays in Chrome, Edge, Firefox, and Safari; the previous
   .aiff files were Safari-only. Convert the local prototypes with:
   for f in audio/story-0-p*.aiff; do ffmpeg -i "$f" -c:a aac -b:a 96k "${f%.aiff}.m4a"; done
   Missing/unsupported files still fall back to chunked TTS automatically. */
const STORY_AUDIO = {
  "story-0": [
    "audio/story-0-p0.m4a",
    "audio/story-0-p1.m4a",
    "audio/story-0-p2.m4a",
    "audio/story-0-p3.m4a",
    "audio/story-0-p4.m4a",
    "audio/story-0-p5.m4a",
  ],
};

const splitSentences = (text) => text
  .replace(/[«»]/g, "")
  .split(/(?<=[.!?])\s+/)
  .map((s) => s.trim())
  .filter(Boolean);

/* Brand lock (No face): Paulina is the default Mexican reading voice.
   Prefer es-MX Paulina system TTS when the device has her. Never mute when
   she exists. If Spanish voices appear, prefer es-MX. No recording. */
const DEFAULT_VOICE_NAME = "Paulina";
const voiceLang = (v) => (v.lang || "").toLowerCase().replace("_", "-");
const isMexicanVoice = (v) => voiceLang(v) === "es-mx";
const isNamedPaulina = (v) => /paulina/i.test(v.name || "");
/* Apple often lists the Mexican system voice as the language, not "Paulina". */
const isAppleMexicanDefault = (v) => {
  if (!isMexicanVoice(v)) return false;
  const name = (v.name || "").toLowerCase();
  if (/google|microsoft|sabina|raul|jorge|juan|pablo|mónica|monica|rocko|reed/.test(name)) return false;
  return /spanish \(mexico\)|español \(méxico\)|español \(mexico\)|español de méxico|spanish mexico/.test(name);
};
const isPaulinaVoice = (v) => isNamedPaulina(v) || isAppleMexicanDefault(v);
const isSpanishVoice = (v) => {
  const lang = voiceLang(v);
  if (lang.startsWith("es") || lang.startsWith("spa")) return true;
  const name = (v.name || "").toLowerCase();
  return /paulina|español|espanol|\bspanish\b/.test(name);
};

const voiceScore = (v, preferredName) => {
  const name = (v.name || "").toLowerCase();
  const lang = voiceLang(v);
  const pref = (preferredName || DEFAULT_VOICE_NAME).toLowerCase();
  let score = 0;
  if (pref && (v.name === preferredName || name.includes(pref))) score += 100;
  if (isPaulinaVoice(v)) score += isMexicanVoice(v) ? 80 : 40;
  if (v.localService) score += 12;
  if (lang === "es-mx") score += 50;
  else if (lang.startsWith("es")) score += 25;
  if (/google/i.test(v.name || "")) score -= 8;
  if (/flo|shelley|sandy|grandma|eddy/.test(name)) score += 10;
  if (/rocko|reed|grandpa/.test(name)) score += 4;
  if (/mónica|monica/.test(name)) score += 3;
  return score;
};

const listSpanishVoices = () =>
  ((typeof window !== "undefined" && window.speechSynthesis?.getVoices?.()) || [])
    .filter(isSpanishVoice);

const pickPaulina = (voices) => {
  const found = (voices || []).filter(isPaulinaVoice);
  if (!found.length) return null;
  return [...found].sort((a, b) => {
    const named = (isNamedPaulina(b) ? 1 : 0) - (isNamedPaulina(a) ? 1 : 0);
    if (named) return named;
    const mx = (isMexicanVoice(b) ? 1 : 0) - (isMexicanVoice(a) ? 1 : 0);
    if (mx) return mx;
    return voiceScore(b, DEFAULT_VOICE_NAME) - voiceScore(a, DEFAULT_VOICE_NAME);
  })[0];
};

const voicePickerLabel = (v) => {
  if (!v) return "";
  if (isPaulinaVoice(v)) return `Paulina · ${v.lang || "es-MX"}`;
  return `${v.name} · ${v.lang}`;
};

const voicesForPicker = (voices) => {
  const list = voices || [];
  const paulina = pickPaulina(list);
  const rest = list.filter((v) => v !== paulina);
  return paulina ? [paulina, ...rest].slice(0, 12) : rest.slice(0, 10);
};

const bestSpanishVoice = (preferredName) => {
  const voices = listSpanishVoices();
  if (!voices.length) return null;
  const paulina = pickPaulina(voices);
  // Paulina is the brand default whenever she is installed.
  if (paulina && (!preferredName || isPaulinaVoice({ name: preferredName, lang: "es-MX" }) || preferredName === DEFAULT_VOICE_NAME)) {
    return paulina;
  }
  if (preferredName) {
    const explicit = voices.find((v) => v.name === preferredName);
    if (explicit) return explicit;
  }
  if (paulina) return paulina;
  const mx = voices.filter(isMexicanVoice);
  const pool = mx.length ? mx : voices;
  return [...pool].sort((a, b) => voiceScore(b, DEFAULT_VOICE_NAME) - voiceScore(a, DEFAULT_VOICE_NAME))[0];
};

/* ---- speechSynthesis hardening (Chrome is hostile) ----
   1. speak() MUST run in the same tick as the tap. Chrome drops speak() after
      any await / voiceschanged / setTimeout as "not a user gesture" and
      speaking stays false. Do not wait for getVoices(). Empty list → lang es-MX.
   2. cancel() only if something is already queued. Idle cancel + delayed speak
      is what killed PROBAR VOZ on boxes without Paulina.
   3. Chrome GC-collects unreferenced utterances mid-speech and onend never fires:
      keep live refs in __utterAlive.
   4. The chunk chain must NOT depend on onend alone: a per-chunk watchdog advances it.
   5. Chrome silently pauses long synthesis (~15s): resume() loop while speaking.
   6. __speakToken invalidates zombie watchdogs from superseded speak() calls. */
const __utterAlive = [];
let __speakToken = 0;
let __resumeTimer = null;

const stopSpeak = () => {
  __speakToken++;
  __utterAlive.length = 0;
  try { window.speechSynthesis.cancel(); } catch (e) {}
};

const ensureResumeLoop = () => {
  if (__resumeTimer) return;
  __resumeTimer = setInterval(() => {
    try {
      const ss = window.speechSynthesis;
      if (!ss) return;
      if (ss.paused) ss.resume();
      if (!ss.speaking && !ss.pending) { clearInterval(__resumeTimer); __resumeTimer = null; }
    } catch (e) {}
  }, 2500);
};

function speak(text, rate = 0.92, opts = {}) {
  try {
    const ss = window.speechSynthesis;
    if (!ss) return;
    const chunks = opts.chunk ? splitSentences(text) : [text];
    // Uniform step list: shadow mode = each sentence twice (normal pace, then slower echo).
    const steps = [];
    chunks.forEach((c) => {
      steps.push({ text: c, rate, gap: opts.shadow ? 1200 : (opts.pauseMs ?? 180) });
      if (opts.shadow) steps.push({ text: c, rate: Math.max(0.62, rate - 0.08), gap: 900 });
    });
    // Same-tick speak: invalidate prior watchdogs, cancel only a live utterance.
    __speakToken++;
    __utterAlive.length = 0;
    try { if (ss.speaking || ss.pending) ss.cancel(); } catch (e) {}
    try { ss.getVoices(); } catch (e) {} // warm list; do not wait
    const token = __speakToken;
    let i = 0;
    const playNext = () => {
      if (token !== __speakToken || i >= steps.length) return;
      const step = steps[i++];
      const u = new SpeechSynthesisUtterance(step.text.replace(/_+/g, "..."));
      const voice = bestSpanishVoice(window.__andaleVoiceName); // re-resolve: voices can load late
      // Never mute for a missing Paulina / es-MX exact match. Any es-* is fine.
      // Empty voices at tap: still speak with lang es-MX and let the engine pick.
      u.rate = step.rate; u.pitch = 1;
      u.lang = "es-MX";
      if (voice) {
        try {
          u.voice = voice;
          u.lang = isPaulinaVoice(voice) || isMexicanVoice(voice) ? "es-MX" : (voice.lang || "es-MX");
        } catch (e) {
          u.lang = voice.lang || "es-MX";
        }
      }
      __utterAlive.push(u); // GC guard
      let advanced = false;
      const advance = () => {
        if (advanced || token !== __speakToken) return;
        advanced = true;
        const idx = __utterAlive.indexOf(u); if (idx > -1) __utterAlive.splice(idx, 1);
        setTimeout(playNext, step.gap);
      };
      u.onstart = () => { window.__andaleSpoke = true; };
      u.onend = advance;
      u.onerror = advance;
      // Watchdog: if onend never fires (Chrome), advance after a generous duration estimate.
      setTimeout(advance, Math.max(3000, (step.text.length * 95) / step.rate + 1200));
      // Inert-engine detection: if NOTHING has ever audibly started, the API may be
      // sandboxed-dead (common in restricted iframes). One bare-bones retry, then
      // surface it to the UI instead of failing silently.
      if (i === 1 && !window.__andaleSpoke) {
        setTimeout(() => {
          if (window.__andaleSpoke || token !== __speakToken) return;
          if (!window.__andaleRetried) {
            window.__andaleRetried = true;
            try {
              const bare = new SpeechSynthesisUtterance(step.text);
              const retryVoice = voice || bestSpanishVoice(window.__andaleVoiceName);
              bare.lang = "es-MX";
              if (retryVoice) bare.voice = retryVoice;
              bare.onstart = () => { window.__andaleSpoke = true; };
              ss.speak(bare);
            } catch (e) {}
            setTimeout(() => {
              if (!window.__andaleSpoke && !pickPaulina(listSpanishVoices())) {
                window.__andaleVoiceDead = true; try { window.dispatchEvent(new Event("andale-voice-dead")); } catch (e) {}
              }
            }, 2600);
          } else if (!window.__andaleSpoke && !pickPaulina(listSpanishVoices())) {
            window.__andaleVoiceDead = true; try { window.dispatchEvent(new Event("andale-voice-dead")); } catch (e) {}
          }
        }, 2200);
      }
      ss.speak(u);
      ensureResumeLoop();
    };
    playNext(); // same tick as the tap — do not defer
  } catch (e) {}
}

const todayStr = () => dayKeyFromDate(new Date());
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKeyFromDate(d);
};

const storage = {
  get: async (key) => {
    if (typeof window === "undefined") return null;
    try {
      if (window.storage?.get) return await window.storage.get(key);
      const value = window.localStorage?.getItem(key);
      return value ? { value } : null;
    } catch (e) { return null; }
  },
  set: async (key, value) => {
    if (typeof window === "undefined") return;
    try {
      if (window.storage?.set) await window.storage.set(key, value);
      else window.localStorage?.setItem(key, value);
    } catch (e) {}
  },
};

/* WRAP PREP — speech/storage flags only. Enroll off. No PrivacyInfo until Mon wrap.
   Pages stays vite base '/andale/'. Wrap/WKWebView rebuild uses base '/'.
   Wrap may set window.__andaleSpeech / window.__andaleStorage before boot. */
if (typeof window !== "undefined") {
  if (window.__andaleSpeech == null) window.__andaleSpeech = !!window.speechSynthesis;
  if (window.__andaleStorage == null) window.__andaleStorage = !!(window.storage?.get || window.localStorage);
}

const skillFor = (q) => {
  if (!q) return "Precisión";
  if (q.skill) return q.skill;
  if (q._u === "subj1" || /subjuntivo|ojalá|duda|antecedente/i.test(q.explain || "")) return "Subjuntivo";
  if (q._u === "pret") return "Pasado";
  if (q._u === "porpara") return "Por/para";
  if (q._u === "mex") return "Mexicanismos";
  if (q._u === "siclauses") return "Hipótesis";
  if (q._u === "pronombres") return "Pronombres";
  if (q._u === "conectores") return "Conectores";
  if (q._u === "registro") return "Registro";
  if (q.type === "listen") return "Escucha";
  if (q.type === "order") return "Orden";
  return "Precisión";
};

const diagnoseAnswer = (q, typed) => {
  if (!q || !typed?.trim()) return null;
  const target = q.type === "listen" ? q.text : q.answers?.[0] || q.answer;
  if (!target) return null;
  if (strip(target) === strip(typed) && exactish(target) !== exactish(typed)) return "Acentos y signos";
  if (q._u === "subj1" || /subjuntivo/i.test(q.explain || "")) return "Modo verbal";
  if (q._u === "pret") return "Tiempo narrativo";
  if (q._u === "pronombres") return "Pronombre / orden";
  if (q._u === "registro") return "Registro";
  if (q.type === "listen") return "Escucha fina";
  if (q.type === "transform") return "Reformulación";
  return "Precisión";
};

/* ---------------- SM-2 (ported from Léxico) ---------------- */
const DAY = 864e5;
const sm2 = (it, q) => {
  // q: 1 miss · 3 difícil · 4 bien · 5 fácil
  if (q < 3) return { ...it, reps: 0, interval: 0, due: Date.now(), ef: Math.max(1.3, it.ef - 0.2) };
  const reps = (it.reps || 0) + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.max(1, Math.round((it.interval || 1) * it.ef));
  const ef = Math.max(1.3, it.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return { ef, reps, interval, due: Date.now() + interval * DAY };
};
const GRADUATE_DAYS = 60; // interval beyond this = mastered, drop from rotation
const DEFAULT_UI_LANG = "en";
const LEVELS = [[0, "Intermedio"], [100, "Turista"], [250, "Estudiante"], [500, "Vecino"], [900, "Cuate"], [1400, "Chilango honorario"], [2000, "Charlador"], [2800, "Abogado bilingüe"], [3800, "Casi nativo"], [5000, "Políglota"]];
const levelOf = (xp) => { let i = 0; while (i < LEVELS.length - 1 && xp >= LEVELS[i + 1][0]) i++; return { idx: i, name: LEVELS[i][1], cur: LEVELS[i][0], next: LEVELS[i + 1] ? LEVELS[i + 1][0] : null }; };
const levelLabel = (name, lang) => (lang === "en" && name === "Intermedio" ? "Intermediate" : name);
const RAYO_SECS = { mc: 8, type: 15, transform: 25, order: 20, listen: 30, match: 60 };
const ACCENTS = ["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"];
const answerTokens = (text) => String(text || "").trim().split(/\s+/).filter(Boolean);
const CURATED_DISTRACTORS = {
  llueva: ["llueve", "llovió", "lloverá"],
  salga: ["salgo", "salí", "saldré"],
  aprendan: ["aprenden", "aprendieron", "aprenderán"],
  fue: ["iba", "va", "iría"],
  solia: ["suele", "solió", "soliera"],
  hubo: ["había", "hay", "habrá"],
  para: ["por", "a", "hacia"],
  por: ["para", "de", "a"],
  chamba: ["trabajo", "empleo", "jale"],
  compraria: ["compro", "compré", "comprara"],
  mandara: ["manda", "mandó", "mandaría"],
  mandase: ["manda", "mandó", "mandaría"],
  quedamos: ["quedemos", "quedábamos", "quedaríamos"],
  quedaremos: ["quedemos", "quedábamos", "quedaríamos"],
  se: ["le", "lo", "la", "les"],
  le: ["se", "lo", "la", "les"],
  sino: ["pero", "si no", "aunque"],
  tanto: ["menos", "demás", "mismo"],
  nunca: ["siempre", "jamás", "tarde"],
  venga: ["viene", "vino", "vendrá"],
  iria: ["voy", "fui", "fuera"],
  atentamente: ["Saludos,", "Cordialmente,", "Gracias,"],
  mande: ["¿Qué?", "Dime", "¿Cómo?"],
};

const relatedDistractorsFor = (answer, q, count = 3) => {
  const correct = [answer, ...(q?.answers || [])].filter(Boolean);
  const seen = new Set(correct.map(strip));
  const out = [];
  const add = (value) => {
    const v = String(value || "").trim();
    const key = strip(v);
    if (!v || !key || seen.has(key) || out.some((x) => strip(x) === key)) return;
    out.push(v);
  };

  (CURATED_DISTRACTORS[strip(answer)] || []).forEach(add);

  const unit = UNITS.find((u) => u.id === q?._u);
  unit?.questions?.forEach((item) => {
    if (item === q) return;
    (item.choices || []).forEach(add);
    const itemAnswers = Array.isArray(item.answers) ? item.answers : item.answers ? [item.answers] : item.answer ? [item.answer] : [];
    itemAnswers.forEach(add);
    if (item.type === "order") (item.words || item.tokens || []).forEach(add);
  });

  const noteVerb = String(q?.note || q?.instruction || q?.prompt || "").match(/\(([^,)]+)(?:,|\))/);
  if (noteVerb) {
    const verb = noteVerb[1].trim().toLowerCase();
    const verbSeeds = {
      llover: ["llueve", "llovió", "llovería"],
      salir: ["salgo", "salí", "saldré"],
      aprender: ["aprende", "aprendió", "aprendería"],
      ir: ["va", "iba", "fue"],
      soler: ["suele", "solió", "soliera"],
      haber: ["hay", "había", "habrá"],
      comprar: ["compro", "compré", "comprara"],
      mandar: ["manda", "mandó", "mandaría"],
      quedar: ["queda", "quedó", "quedaría"],
    };
    (verbSeeds[verb] || []).forEach(add);
  }

  return out.slice(0, count);
};

const answerAidFor = (q) => {
  if (!q || !(q.type === "type" || q.type === "listen" || q.type === "transform")) return null;
  const answers = [...new Set((q.answers || [q.answer || q.text]).filter(Boolean).map((a) => String(a).trim()).filter(Boolean))];
  if (!answers.length) return null;
  const shortAlternatives = q.type === "type" && answers.every((a) => answerTokens(a).length <= 3);
  if (shortAlternatives) {
    const distractors = answers.length >= 4 ? [] : relatedDistractorsFor(answers[0], q, 4 - answers.length);
    return { mode: "choices", tiles: shuffle([...answers, ...distractors].map((w, i) => ({ id: `choice-${i}`, w }))) };
  }
  const words = answerTokens(answers[0]);
  if (!words.length) return null;
  if (words.length === 1) {
    const distractors = relatedDistractorsFor(words[0], q, 3);
    return { mode: "choices", tiles: shuffle([words[0], ...distractors].map((w, i) => ({ id: `choice-${i}`, w }))) };
  }
  const distractors = relatedDistractorsFor(answers[0], q, Math.min(4, Math.max(2, Math.ceil(words.length / 3))))
    .flatMap(answerTokens)
    .filter((w) => !words.some((correct) => strip(correct) === strip(w)))
    .slice(0, 4);
  return { mode: "bank", tiles: shuffle([...words.map((w, i) => ({ w, id: `word-${i}` })), ...distractors.map((w, i) => ({ w, id: `distractor-${i}` }))]) };
};

/* ---------------- CHARACTER CAST: coach portraits ---------------- */

/* ============================================================
   COACH CHARACTER SYSTEM v3 — full-body Duolingo-style cast
   Design rules: flat color (no gradients on characters), no
   outlines, huge heads (~55%), signature silhouette + prop +
   pose per coach. Shared face rig drives moods.
   moods: happy | sad | party | focused
   viewBox 0 0 200 240, free-floating with ground shadow.
   ============================================================ */

const COACHES = {
  luna:    { name: "Luna",     role: "Coach del día",      color: "#58CC02", dark: "#46A302", skin: "#C98B63", skinSh: "#B07A52", hair: "#2A2730", hairSh: "#1C1A22", accent: "#FF4F8B" },
  rafa:    { name: "Don Rafa", role: "Mentor de cuentos",  color: "#1CB0F6", dark: "#1899D6", skin: "#B87448", skinSh: "#9C5E36", hair: "#EDE7DA", hairSh: "#CFC6B4", accent: "#1CB0F6" },
  valeria: { name: "Valeria",  role: "Coach de precisión", color: "#CE82FF", dark: "#A567CC", skin: "#D9A071", skinSh: "#C08555", hair: "#33222B", hairSh: "#241820", accent: "#CE82FF" },
  diego:   { name: "Diego",    role: "Rival",           color: "#FF9600", dark: "#D97F00", skin: "#A96A43", skinSh: "#8E5634", hair: "#1B1B1B", hairSh: "#0D0D0D", accent: "#FF4B4B" },
};

/* ---------- shared face rig ---------- */
const CxStar = ({ cx, cy, r, fill }) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
  }
  return <polygon points={pts.join(" ")} fill={fill} />;
};

const CxEyes = ({ mood, accent, lash }) => {
  if (mood === "focused")
    return (
      <g stroke="#231F20" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M64 98 Q76 90 88 98" />
        <path d="M112 98 Q124 90 136 98" />
      </g>
    );
  if (mood === "party")
    return (
      <g>
        <CxStar cx={76} cy={98} r={14} fill={accent} />
        <CxStar cx={124} cy={98} r={14} fill={accent} />
      </g>
    );
  const pupilY = mood === "sad" ? 100 : 99;
  return (
    <g>
      <ellipse cx="76" cy="98" rx="13.5" ry="15.5" fill="#fff" />
      <ellipse cx="124" cy="98" rx="13.5" ry="15.5" fill="#fff" />
      <circle cx="78" cy={pupilY} r="7" fill="#231F20" />
      <circle cx="122" cy={pupilY} r="7" fill="#231F20" />
      <circle cx="80.5" cy={pupilY - 3} r="2.6" fill="#fff" />
      <circle cx="124.5" cy={pupilY - 3} r="2.6" fill="#fff" />
      {lash && (
        <g stroke="#231F20" strokeWidth="2.4" strokeLinecap="round">
          <line x1="61" y1="92" x2="56" y2="88" />
          <line x1="62" y1="99" x2="56" y2="97" />
          <line x1="139" y1="92" x2="144" y2="88" />
          <line x1="138" y1="99" x2="144" y2="97" />
        </g>
      )}
    </g>
  );
};

const CxBrows = ({ mood, color, w = 7, raiseLeft = 0 }) => {
  // sad = inner-up worry; focused = low & flat; party = high
  const y = mood === "party" ? 70 : mood === "focused" ? 80 : 74;
  const tilt = mood === "sad" ? 1 : 0;
  return (
    <g stroke={color} strokeWidth={w} strokeLinecap="round" fill="none">
      <path d={tilt ? "M62 80 Q74 70 88 76" : `M62 ${y + 2 - raiseLeft} Q75 ${y - 4 - raiseLeft} 88 ${y - raiseLeft}`} />
      <path d={tilt ? "M112 76 Q126 70 138 80" : `M112 ${y} Q125 ${y - 4} 138 ${y + 2}`} />
    </g>
  );
};

const CxMouth = ({ mood, smirk }) => {
  if (mood === "sad")
    return <path d="M84 142 Q100 130 116 142" stroke="#5A3A2E" strokeWidth="6" strokeLinecap="round" fill="none" />;
  if (mood === "focused")
    return <path d="M85 138 H115" stroke="#5A3A2E" strokeWidth="6" strokeLinecap="round" fill="none" />;
  if (mood === "party")
    return (
      <g>
        <path d="M72 126 Q100 168 128 126 Q100 142 72 126 Z" fill="#4A2B23" />
        <ellipse cx="100" cy="146" rx="15" ry="7.5" fill="#E66A63" />
      </g>
    );
  if (smirk)
    return <path d="M82 132 Q102 150 122 130 Q118 128 122 130" stroke="#4A2B23" strokeWidth="6.5" strokeLinecap="round" fill="none" />;
  return (
    <g>
      <path d="M79 128 Q100 154 121 128 Q100 138 79 128 Z" fill="#4A2B23" />
      <ellipse cx="100" cy="139" rx="10" ry="5" fill="#E66A63" />
    </g>
  );
};

const CxBlush = ({ color = "#F58FB0", o = 0.55 }) => (
  <g fill={color} opacity={o}>
    <ellipse cx="58" cy="120" rx="10" ry="5.5" />
    <ellipse cx="142" cy="120" rx="10" ry="5.5" />
  </g>
);

const CxTears = () => (
  <g fill="#1CB0F6" opacity=".75">
    <ellipse cx="60" cy="116" rx="4" ry="6.5" />
    <ellipse cx="140" cy="116" rx="4" ry="6.5" />
  </g>
);

const CxSparkles = ({ accent }) => (
  <g>
    <CxStar cx={20} cy={48} r={9} fill="#FFC800" />
    <CxStar cx={182} cy={62} r={7} fill={accent} />
    <circle cx="28" cy="86" r="4" fill={accent} opacity=".8" />
    <circle cx="176" cy="30" r="3.5" fill="#FFC800" opacity=".8" />
  </g>
);

const CxBadge = ({ accent }) => (
  <g transform="translate(138 178)">
    <circle cx="20" cy="20" r="22" fill="#fff" />
    <circle cx="20" cy="20" r="17" fill={accent} />
    <path d="M11 21 l6.5 6.5 L31 13" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const CxGround = () => <ellipse cx="100" cy="230" rx="56" ry="9" fill="#000" opacity=".08" />;

/* ============================================================ */

const Luna = ({ mood }) => {
  const c = COACHES.luna;
  return (
    <g>
      <CxGround />

      {/* hoodie body */}
      <path d="M52 228 Q48 160 100 154 Q152 160 148 228 Z" fill={c.color} />
      <path d="M118 228 Q150 200 148 168 Q152 196 148 228 Z" fill={c.dark} opacity=".5" />
      {/* hood behind neck */}
      <path d="M58 168 Q100 188 142 168 Q132 152 100 150 Q68 152 58 168 Z" fill={c.dark} />
      {/* kangaroo pocket */}
      <path d="M76 200 Q100 210 124 200 L120 224 Q100 230 80 224 Z" fill={c.dark} opacity=".35" />
      {/* drawstrings */}
      <line x1="88" y1="170" x2="86" y2="190" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <line x1="112" y1="170" x2="114" y2="190" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="86" cy="192" r="3" fill="#fff" />
      <circle cx="114" cy="192" r="3" fill="#fff" />
      {/* arms down */}
      <rect x="40" y="166" width="22" height="50" rx="11" fill={c.color} />
      <circle cx="51" cy="218" r="10" fill={c.skin} />
      <rect x="138" y="166" width="22" height="50" rx="11" fill={c.color} />
      <circle cx="149" cy="218" r="10" fill={c.skin} />
      {/* head */}
      <ellipse cx="100" cy="96" rx="62" ry="58" fill={c.skin} />
      {/* fringe — side-swept */}
      <path d="M40 96 Q34 34 100 30 Q166 34 160 96 Q150 58 100 56 Q70 56 58 70 Q46 80 40 96 Z" fill={c.hair} />
      <path d="M44 78 Q34 104 44 126 Q52 102 52 78 Z" fill={c.hair} />
      {/* bun */}
      <circle cx="100" cy="22" r="24" fill={c.hair} />
      <path d="M84 14 Q100 2 116 14 Q104 8 84 14 Z" fill={c.hairSh} />
      {/* star pin — seated on the bun */}
      <CxStar cx={114} cy={20} r={10} fill="#FFC800" />
      {/* face */}
      <CxBrows mood={mood} color={c.hair} />
      <CxEyes mood={mood} accent={c.accent} lash />
      <CxBlush />
      <CxMouth mood={mood} />
      {mood === "sad" && <CxTears />}
      {mood === "party" && <CxSparkles accent={c.accent} />}
    </g>
  );
};

const Rafa = ({ mood }) => {
  const c = COACHES.rafa;
  const stachDrop = mood === "sad" ? 5 : 0;
  return (
    <g>
      <CxGround />
      {/* guayabera body */}
      <path d="M50 228 Q46 162 100 156 Q154 162 150 228 Z" fill="#F4F0E6" />
      <path d="M120 228 Q152 200 150 170 Q154 198 150 228 Z" fill="#DDD6C4" opacity=".7" />
      {/* pleats */}
      <g stroke="#DDD6C4" strokeWidth="3">
        <line x1="84" y1="166" x2="84" y2="224" />
        <line x1="92" y1="163" x2="92" y2="226" />
        <line x1="108" y1="163" x2="108" y2="226" />
        <line x1="116" y1="166" x2="116" y2="224" />
      </g>
      {/* collar */}
      <path d="M88 158 L100 172 L112 158 L106 154 L100 160 L94 154 Z" fill="#fff" />
      {/* buttons */}
      <circle cx="100" cy="182" r="2.5" fill="#C9C2B2" />
      <circle cx="100" cy="196" r="2.5" fill="#C9C2B2" />
      <circle cx="100" cy="210" r="2.5" fill="#C9C2B2" />
      {/* right arm down */}
      <rect x="138" y="168" width="22" height="50" rx="11" fill="#F4F0E6" />
      <circle cx="149" cy="220" r="10" fill={c.skin} />
      {/* left arm holding book */}
      <rect x="40" y="168" width="22" height="44" rx="11" fill="#F4F0E6" />
      <rect x="26" y="196" width="30" height="38" rx="4" fill="#1CB0F6" />
      <rect x="30" y="200" width="22" height="30" rx="2" fill="#5BC8FA" />
      <line x1="41" y1="200" x2="41" y2="230" stroke="#1899D6" strokeWidth="2.5" />
      <circle cx="55" cy="199" r="9" fill={c.skin} />
      {/* head */}
      <ellipse cx="100" cy="98" rx="60" ry="56" fill={c.skin} />
      {/* silver side tufts */}
      <path d="M42 86 Q34 104 44 118 Q52 100 50 84 Z" fill={c.hair} />
      <path d="M158 86 Q166 104 156 118 Q148 100 150 84 Z" fill={c.hair} />
      {/* sombrero — under-brim shade then brim then crown */}
      <ellipse cx="100" cy="52" rx="86" ry="18" fill="#C9A050" />
      <ellipse cx="100" cy="47" rx="86" ry="18" fill="#E8C170" />
      <path d="M58 48 Q58 6 100 6 Q142 6 142 48 Z" fill="#E8C170" />
      <path d="M122 46 Q124 14 100 8 Q136 10 138 46 Z" fill="#C9A050" opacity=".6" />
      <rect x="58" y="37" width="84" height="11" rx="5" fill="#C0392B" />
      {/* bushy brows */}
      <g stroke={c.hair} strokeWidth="9" strokeLinecap="round" fill="none">
        <path d={mood === "sad" ? "M60 82 Q74 72 88 78" : "M60 78 Q74 70 88 76"} />
        <path d={mood === "sad" ? "M112 78 Q126 72 140 82" : "M112 76 Q126 70 140 78"} />
      </g>
      <CxEyes mood={mood} accent={c.accent} />
      {/* nose */}
      <ellipse cx="100" cy="118" rx="9" ry="7" fill={c.skinSh} opacity=".55" />
      {/* grand moustache */}
      <g transform={`translate(0 ${stachDrop})`}>
        <path d="M56 132 Q76 114 100 126 Q124 114 144 132 Q126 152 100 138 Q74 152 56 132 Z" fill={c.hair} />
        <path d="M70 134 Q86 124 100 130" stroke={c.hairSh} strokeWidth="3" fill="none" opacity=".6" />
      </g>
      {/* mouth peeking below moustache */}
      <g transform="translate(0 14)">
        <CxMouth mood={mood === "party" ? "party" : mood === "sad" ? "sad" : "focused"} />
      </g>
      {mood === "sad" && <CxTears />}
      {mood === "party" && <CxSparkles accent={c.accent} />}
    </g>
  );
};

const Valeria = ({ mood }) => {
  const c = COACHES.valeria;
  return (
    <g>
      <CxGround />
      {/* blazer body */}
      <path d="M52 228 Q48 162 100 156 Q152 162 148 228 Z" fill="#6B2D8B" />
      <path d="M120 228 Q150 198 148 170 Q152 198 148 228 Z" fill="#56246F" opacity=".8" />
      {/* shirt V */}
      <path d="M84 158 L100 192 L116 158 Z" fill="#fff" />
      {/* lapels */}
      <path d="M84 158 L100 192 L88 196 L78 164 Z" fill="#56246F" />
      <path d="M116 158 L100 192 L112 196 L122 164 Z" fill="#56246F" />
      {/* pocket square */}
      <path d="M122 188 L134 188 L128 198 Z" fill={c.accent} />
      {/* right arm down */}
      <rect x="138" y="168" width="22" height="48" rx="11" fill="#6B2D8B" />
      <circle cx="149" cy="218" r="10" fill={c.skin} />
      {/* left arm with clipboard */}
      <rect x="40" y="168" width="22" height="42" rx="11" fill="#6B2D8B" />
      <rect x="22" y="190" width="34" height="44" rx="4" fill="#E8E4DC" />
      <rect x="30" y="186" width="18" height="9" rx="3" fill="#9C9488" />
      <g stroke="#B9B2A4" strokeWidth="2.5" strokeLinecap="round">
        <line x1="28" y1="204" x2="50" y2="204" />
        <line x1="28" y1="212" x2="50" y2="212" />
        <line x1="28" y1="220" x2="44" y2="220" />
      </g>
      <circle cx="51" cy="200" r="9" fill={c.skin} />
      {/* head */}
      <ellipse cx="100" cy="98" rx="60" ry="56" fill={c.skin} />
      {/* helmet bob */}
      <path d="M36 128 L36 76 Q38 28 100 26 Q162 28 164 76 L164 128 L146 128 Q150 64 100 56 Q50 64 54 128 Z" fill={c.hair} />
      {/* straight bangs */}
      <path d="M52 78 Q100 64 148 78 L144 62 Q100 50 56 62 Z" fill={c.hair} />
      {/* purple streak */}
      <path d="M152 64 Q160 92 156 124" stroke={c.accent} strokeWidth="6" fill="none" strokeLinecap="round" opacity=".9" />
      {/* brows: left raised always (precision skeptic) */}
      <CxBrows mood={mood} color={c.hair} raiseLeft={mood === "happy" ? 7 : 0} />
      <CxEyes mood={mood} accent={c.accent} lash />
      {/* big round glasses */}
      <g fill="none" stroke="#2A2A2A" strokeWidth="6">
        <circle cx="76" cy="98" r="22" />
        <circle cx="124" cy="98" r="22" />
        <path d="M98 96 Q100 92 102 96" />
        <line x1="54" y1="94" x2="42" y2="88" />
        <line x1="146" y1="94" x2="158" y2="88" />
      </g>
      <circle cx="76" cy="98" r="19" fill={c.accent} opacity=".12" />
      <circle cx="124" cy="98" r="19" fill={c.accent} opacity=".12" />
      {mood === "focused" && (
        <g stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8">
          <line x1="66" y1="88" x2="76" y2="98" />
          <line x1="114" y1="88" x2="124" y2="98" />
        </g>
      )}
      <CxBlush color="#E48BB0" o={0.4} />
      <CxMouth mood={mood} />
      {mood === "sad" && <CxTears />}
      {mood === "party" && <CxSparkles accent={c.accent} />}
    </g>
  );
};

const Diego = ({ mood }) => {
  const c = COACHES.diego;
  return (
    <g>
      <CxGround />

      {/* track jacket body */}
      <path d="M52 228 Q48 162 100 156 Q152 162 148 228 Z" fill={c.color} />
      <path d="M118 228 Q150 198 148 170 Q152 198 148 228 Z" fill={c.dark} opacity=".6" />
      {/* racing stripes */}
      <path d="M62 168 Q58 196 60 226" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M138 168 Q142 196 140 226" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* zipper */}
      <line x1="100" y1="160" x2="100" y2="226" stroke="#fff" strokeWidth="3" strokeDasharray="2 5" />
      <path d="M92 158 L100 168 L108 158 L104 154 L100 158 L96 154 Z" fill="#1B1B1B" />
      {/* arms down */}
      <rect x="40" y="168" width="22" height="48" rx="11" fill={c.color} />
      <circle cx="51" cy="218" r="10" fill={c.skin} />
      <rect x="138" y="168" width="22" height="48" rx="11" fill={c.color} />
      <circle cx="149" cy="218" r="10" fill={c.skin} />
      {/* head */}
      <ellipse cx="100" cy="98" rx="60" ry="56" fill={c.skin} />
      {/* hair base + spikes */}
      <path d="M42 92 Q44 44 100 40 Q156 44 158 92 Q140 64 100 66 Q60 64 42 92 Z" fill={c.hair} />
      <path d="M50 64 L58 16 L74 56 Z" fill={c.hair} />
      <path d="M72 54 L86 4 L100 52 Z" fill={c.hair} />
      <path d="M98 52 L116 2 L128 54 Z" fill={c.hair} />
      <path d="M126 56 L144 14 L152 64 Z" fill={c.hair} />
      {/* headband */}
      <path d="M40 86 Q100 70 160 86 L160 99 Q100 83 40 99 Z" fill={c.accent} />
      {/* headband knot tails */}
      <path d="M158 88 Q176 84 182 94 Q172 96 162 96 Z" fill={c.accent} />
      <path d="M160 96 Q178 100 180 110 Q168 106 160 102 Z" fill="#D93C3C" />
      {/* heavy confident brows */}
      <g stroke={c.hair} strokeWidth="8" strokeLinecap="round" fill="none">
        <path d={mood === "sad" ? "M60 84 Q74 74 88 80" : mood === "focused" ? "M60 86 Q74 82 88 86" : "M58 80 Q72 72 88 78"} />
        <path d={mood === "sad" ? "M112 80 Q126 74 140 84" : mood === "focused" ? "M112 86 Q126 82 140 86" : "M112 78 Q128 72 142 80"} />
      </g>
      <CxEyes mood={mood} accent={c.accent} />
      <CxBlush color="#E8794F" o={0.35} />
      <CxMouth mood={mood} smirk={mood === "happy"} />
      {mood === "sad" && (
        <ellipse cx="148" cy="74" rx="4.5" ry="7" fill="#1CB0F6" opacity=".8" />
      )}
      {mood === "party" && <CxSparkles accent="#FFC800" />}
    </g>
  );
};

const CoachPortrait = ({ id = "luna", mood = "happy", size = 92, badge }) => {
  const Char = { luna: Luna, rafa: Rafa, valeria: Valeria, diego: Diego }[id] || Luna;
  const c = COACHES[id] || COACHES.luna;
  const coachId = { luna: "luna", rafa: "rafa", valeria: "valeria", diego: "diego" }[id] || "luna";
  const usePng = mood !== "sad" && mood !== "party" && mood !== "focused";
  if (usePng) {
    return (
      <span style={{ display: "block", position: "relative", width: size, height: size, overflow: "visible", lineHeight: 0 }}>
        <img
          src={`${import.meta.env.BASE_URL}coaches/${coachId}-happy.png`}
          alt=""
          width={size}
          height={size}
          aria-hidden="true"
          style={{ display: "block", width: size, height: size, objectFit: "contain" }}
        />
        {badge && (
          <svg width={size} height={size} viewBox="0 0 200 240" aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
            <CxBadge accent={c.accent} />
          </svg>
        )}
      </span>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 200 240" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <Char mood={mood} />
      {badge && <CxBadge accent={c.accent} />}
    </svg>
  );
};

const coachName = (id) => COACHES[id]?.name || COACHES.luna.name;

/* ---------------- CONFETTI ---------------- */

const CONF_COLORS = ["#58CC02", "#1CB0F6", "#FFC800", "#FF4B4B", "#CE82FF", "#FF9600", "#E4007C"];

const Confetti = ({ count = 60 }) => {
  const bits = React.useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    dur: 2 + Math.random() * 1.8,
    size: 6 + Math.random() * 7,
    color: CONF_COLORS[i % CONF_COLORS.length],
    round: Math.random() > 0.5,
  })), [count]);
  return (
    <div aria-hidden="true">
      {bits.map((b, i) => (
        <span key={i} className="confetti-bit" style={{ left: `${b.left}%`, width: b.size, height: b.round ? b.size : b.size * 0.45, background: b.color, borderRadius: b.round ? "50%" : 2, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
      ))}
    </div>
  );
};

/* ---------------- XP TICKER (count-up) ---------------- */

const Ticker = ({ to, prefix = "+", duration = 900 }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf; const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span>{prefix}{n}</span>;
};

/* ---------------- PATH DECOR ---------------- */

/* ---------------- ICON SYSTEM (two-tone filled SVG, Duolingo-style) ---------------- */

const I = ({ size = 18, vb = 24, style, children }) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} style={{ verticalAlign: "-3px", ...style }} aria-hidden="true">{children}</svg>
);

const IcFlame = ({ size, style, className }) => (
  <span className={className} style={{ display: "inline-block" }}>
    <I size={size} style={style}>
      <path d="M12 2C13 6.5 7.6 8 7.6 12a4.4 4.4 0 0 0 8.8 0c0-1.3-.8-2.4-.8-2.4 2.3 1.3 3.9 3.5 3.9 6.2a7.5 7.5 0 1 1-15 0C4.5 9.6 10.2 8 12 2z" fill="#FF9600" />
      <path d="M12 22.5a4.4 4.4 0 0 1-4.4-4.4c0-2.6 2.5-3.7 4.4-6.2 1.9 2.5 4.4 3.6 4.4 6.2A4.4 4.4 0 0 1 12 22.5z" fill="#FFC800" />
    </I>
  </span>
);
const IcGem = ({ size, style }) => (
  <I size={size} style={style}>
    <path d="M6.2 3h11.6L22 9 12 21.5 2 9z" fill="#1CB0F6" />
    <path d="M2 9h20L12 21.5z" fill="#1899D6" />
    <path d="M8.8 3 12 9l3.2-6z" fill="#84D8FF" />
    <path d="M2 9h20l-1.6-2.6H3.6z" fill="#49C0F8" opacity=".7" />
  </I>
);
const IcHeart = ({ size, style, empty }) => (
  <I size={size} style={style}>
    <path d="M12 21S3.4 15.6 2 11a5.6 5.6 0 0 1 10-4.4A5.6 5.6 0 0 1 22 11c-1.4 4.6-10 10-10 10z" fill={empty ? "#E5E5E5" : "#FF4B4B"} />
    {!empty && <ellipse cx="8" cy="9" rx="2" ry="1.4" fill="#FF8080" transform="rotate(-25 8 9)" />}
  </I>
);
const IcCrown = ({ size, style }) => (
  <I size={size} style={style}>
    <path d="M2.8 8.2 7 12l5-7.2L17 12l4.2-3.8V17a2 2 0 0 1-2 2H4.8a2 2 0 0 1-2-2z" fill="#FFC800" />
    <path d="M2.8 15.5h18.4V17a2 2 0 0 1-2 2H4.8a2 2 0 0 1-2-2z" fill="#E6A800" />
    <circle cx="12" cy="13" r="1.5" fill="#FF4B4B" /><circle cx="7" cy="14" r="1.1" fill="#1CB0F6" /><circle cx="17" cy="14" r="1.1" fill="#58CC02" />
  </I>
);
const IcLock = ({ size, style }) => (
  <I size={size} style={style}>
    <path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="#AFAFAF" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <rect x="5" y="10" width="14" height="10" rx="2.5" fill="#AFAFAF" />
    <circle cx="12" cy="14.6" r="1.7" fill="#8C8C8C" />
  </I>
);
const IcBolt = ({ size, style }) => (
  <I size={size} style={style}>
    <path d="M13.5 2 4.5 14H10l-1.2 8L18 10h-5.5z" fill="#FFC800" />
    <path d="M13.5 2 4.5 14H10l8-4h-5.5z" fill="#FFDE59" />
  </I>
);
const IcHome = ({ size, color = "#AFAFAF", style }) => (
  <I size={size} style={style}>
    <path d="M3 10.8 12 3l9 7.8V20a1.6 1.6 0 0 1-1.6 1.6H14.2v-6h-4.4v6H4.6A1.6 1.6 0 0 1 3 20z" fill={color} />
  </I>
);
const IcBarbell = ({ size, color = "#AFAFAF", style }) => (
  <I size={size} style={style}>
    <rect x="1.6" y="9.2" width="3" height="5.6" rx="1.2" fill={color} /><rect x="19.4" y="9.2" width="3" height="5.6" rx="1.2" fill={color} />
    <rect x="4.8" y="7" width="3.2" height="10" rx="1.3" fill={color} /><rect x="16" y="7" width="3.2" height="10" rx="1.3" fill={color} />
    <rect x="8" y="10.7" width="8" height="2.6" rx="1.3" fill={color} />
  </I>
);
const IcGame = ({ size, color = "#AFAFAF", style }) => (
  <I size={size} style={style}>
    <path d="M6.2 9.2h11.6c2 0 3.6 1.6 3.6 3.6v3.6c0 1.8-1.4 3.2-3.2 3.2-.9 0-1.7-.4-2.3-1.1l-1-1.2H9.1l-1 1.2c-.6.7-1.4 1.1-2.3 1.1-1.8 0-3.2-1.4-3.2-3.2v-3.6c0-2 1.6-3.6 3.6-3.6z" fill={color} />
    <rect x="6.2" y="12.4" width="5" height="1.6" rx=".8" fill="#fff" opacity=".9" />
    <rect x="7.9" y="10.7" width="1.6" height="5" rx=".8" fill="#fff" opacity=".9" />
    <circle cx="16.4" cy="12.4" r="1.1" fill="#fff" opacity=".9" />
    <circle cx="18.8" cy="15" r="1.1" fill="#fff" opacity=".9" />
  </I>
);
const IcPerson = ({ size, color = "#AFAFAF", style }) => (
  <I size={size} style={style}>
    <circle cx="12" cy="7.6" r="4.4" fill={color} />
    <path d="M3.6 21c.5-4 4-6.4 8.4-6.4s7.9 2.4 8.4 6.4z" fill={color} />
  </I>
);
const IcSpeaker = ({ size, color = "#fff", style }) => (
  <I size={size} style={style}>
    <path d="M3.5 9.2v5.6h3.8L13 19.6V4.4L7.3 9.2z" fill={color} />
    <path d="M15.6 8.6a4.8 4.8 0 0 1 0 6.8M18.2 6a8.5 8.5 0 0 1 0 12" stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" />
  </I>
);
const IcTurtle = ({ size, style }) => (
  <I size={size} style={style}>
    <ellipse cx="10.6" cy="12.6" rx="7.2" ry="5.2" fill="#58CC02" />
    <path d="M10.6 8.6c2 0 3.6 1.7 3.6 4s-1.6 4-3.6 4-3.6-1.7-3.6-4 1.6-4 3.6-4z" fill="#46A302" />
    <circle cx="19.4" cy="11.6" r="2.7" fill="#7AC74F" /><circle cx="20.3" cy="10.9" r=".6" fill="#3C3C3C" />
    <rect x="5" y="16.6" width="2.6" height="2.6" rx="1.2" fill="#7AC74F" /><rect x="13" y="16.6" width="2.6" height="2.6" rx="1.2" fill="#7AC74F" />
  </I>
);
const IcBell = ({ size, off, style }) => (
  <I size={size} style={style}>
    <path d="M12 3a6 6 0 0 0-6 6v4.2L4 16.4h16l-2-3.2V9a6 6 0 0 0-6-6z" fill={off ? "#CFCFCF" : "#FFC800"} />
    <circle cx="12" cy="19.4" r="2.1" fill={off ? "#CFCFCF" : "#E6A800"} />
    {off && <rect x="2" y="11" width="26" height="2.4" rx="1.2" transform="rotate(-45 12 12)" fill="#FF4B4B" />}
  </I>
);
const IcMedal = ({ size, gray, style }) => (
  <I size={size} style={style}>
    <path d="M8.4 2h3.2l1.8 6-4.2 1.2z" fill={gray ? "#D8D8D8" : "#1CB0F6"} />
    <path d="M15.6 2h-3.2l-1.8 6 4.2 1.2z" fill={gray ? "#C8C8C8" : "#1899D6"} />
    <circle cx="12" cy="14.6" r="6.4" fill={gray ? "#E5E5E5" : "#FFC800"} />
    <circle cx="12" cy="14.6" r="4.4" fill={gray ? "#D8D8D8" : "#E6A800"} />
    <path d="m12 11.4 1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2-1.6-1.6 2.2-.3z" fill={gray ? "#BFBFBF" : "#FFDE59"} />
  </I>
);
const IcChest = ({ size = 56, claimed, locked, style }) => (
  <I size={size} vb={32} style={style}>
    {claimed ? (
      <>
        <ellipse cx="16" cy="24" rx="10" ry="3.4" fill="#E6A800" />
        <ellipse cx="16" cy="20.6" rx="10" ry="3.4" fill="#FFC800" />
        <ellipse cx="16" cy="17.2" rx="10" ry="3.4" fill="#FFDE59" />
        <ellipse cx="16" cy="16" rx="10" ry="3.4" fill="#FFF0B3" />
      </>
    ) : (
      <>
        <rect x="3.5" y="12" width="25" height="14" rx="2.5" fill={locked ? "#C9C9C9" : "#A06235"} />
        <path d="M3.5 13.5C3.5 8.8 9 5.8 16 5.8s12.5 3 12.5 7.7V15h-25z" fill={locked ? "#B5B5B5" : "#8A4E26"} />
        <rect x="13.4" y="5.8" width="5.2" height="20.2" fill={locked ? "#AFAFAF" : "#FFC800"} />
        <rect x="13.4" y="5.8" width="5.2" height="20.2" fill="#000" opacity=".07" />
        <rect x="14.4" y="14.6" width="3.2" height="4.6" rx="1.4" fill={locked ? "#8C8C8C" : "#E6A800"} />
        <rect x="3.5" y="14" width="25" height="1.6" fill="#000" opacity=".15" />
      </>
    )}
  </I>
);
const IcBook = ({ size = 30, color = "#fff", style }) => (
  <I size={size} style={style}>
    <path d="M12 5.4C9.6 3.9 6.4 3.4 3 3.8v15.4c3.4-.4 6.6.1 9 1.6 2.4-1.5 5.6-2 9-1.6V3.8c-3.4-.4-6.6.1-9 1.6z" fill={color} />
    <rect x="11" y="5" width="2" height="15.4" rx="1" fill={color === "#fff" ? "#00000022" : "#ffffff44"} />
  </I>
);
const IcCards = ({ size = 24, color = "#AFAFAF", style }) => (
  <I size={size} style={style}>
    <rect x="7" y="4" width="12" height="15" rx="2.5" fill={color} opacity=".45" transform="rotate(8 13 11.5)" />
    <rect x="4" y="6" width="13" height="15" rx="2.5" fill={color} />
    <path d="M7 10h7M7 14h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".9" />
  </I>
);
const FlagMX = ({ size = 22 }) => (
  <svg width={size * 1.5} height={size} viewBox="0 0 27 18" style={{ borderRadius: 4, display: "block", boxShadow: "0 0 0 1.5px #E5E5E5" }} aria-label="Español (México)">
    <rect width="9" height="18" fill="#006847" /><rect x="9" width="9" height="18" fill="#FFFFFF" /><rect x="18" width="9" height="18" fill="#CE1126" />
    <circle cx="13.5" cy="9" r="2.4" fill="#B08A4F" /><circle cx="13.5" cy="9" r="1.2" fill="#6B5530" />
  </svg>
);
const LogoMark = ({ size = 30, ...rest }) => (
  <img
    src={`${import.meta.env.BASE_URL}mascot/axolotl.png`}
    alt=""
    width={size}
    height={size}
    aria-hidden="true"
    style={{ display: "block", width: size, height: size, objectFit: "contain" }}
    {...rest}
  />
);

/* ---------------- SKILL GLYPHS (white, one per unit) ---------------- */

const GLYPHS = {
  subj1: ( /* magic wand — wishes & the unreal */
    <I size={38} vb={32}>
      <rect x="3" y="23.5" width="19" height="4" rx="2" transform="rotate(-45 12 24)" fill="#fff" />
      <path d="m23.5 3.5 1.5 3.4 3.4 1.5-3.4 1.5-1.5 3.4-1.5-3.4-3.4-1.5 3.4-1.5z" fill="#fff" />
      <circle cx="27.5" cy="14.5" r="1.6" fill="#fff" opacity=".8" /><circle cx="17.5" cy="4.5" r="1.3" fill="#fff" opacity=".8" />
    </I>
  ),
  pret: ( /* hourglass — two pasts */
    <I size={36} vb={32}>
      <rect x="7" y="3" width="18" height="3.4" rx="1.7" fill="#fff" /><rect x="7" y="25.6" width="18" height="3.4" rx="1.7" fill="#fff" />
      <path d="M9.5 6.4h13v2.4c0 3.4-3 5.2-5 7.2H14.5c-2-2-5-3.8-5-7.2zM9.5 25.6h13v-2.4c0-3.4-3-5.2-5-7.2H14.5c-2 2-5 3.8-5 7.2z" fill="#fff" />
    </I>
  ),
  porpara: ( /* opposing arrows — two prepositions */
    <I size={36} vb={32}>
      <path d="M4 10.5h16v-4l8 6.5-8 6.5v-4H4z" fill="#fff" />
      <path d="M28 24.5H12v4L4 22l8-6.5v4h16z" fill="#fff" opacity=".75" />
    </I>
  ),
  mex: ( /* chili pepper */
    <I size={38} vb={32}>
      <path d="M23.8 9c1.8 8.4-4.4 16.6-13.6 16.6-3.2 0-5.4-1.8-5.4-4.2 0-1.3 1.4-1.9 2.4-1.1 1.6 1.3 4.1 1.5 6.3.2 5.6-3.2 7.5-7.6 7.3-11.5z" fill="#fff" />
      <path d="M21.4 9.2c-.2-2.4 1.3-4.5 3.8-4.9" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <ellipse cx="11" cy="20" rx="3.8" ry="1.6" fill="#fff" opacity=".45" transform="rotate(-30 11 20)" />
    </I>
  ),
  siclauses: ( /* crystal ball — hypotheses */
    <I size={36} vb={32}>
      <circle cx="16" cy="13.5" r="9.5" fill="#fff" />
      <path d="M9 24h14l-1.8 4.4H10.8z" fill="#fff" />
      <circle cx="12.8" cy="10.4" r="2.6" fill="#fff" opacity=".5" stroke="#fff" />
      <path d="m25 3 1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z" fill="#fff" opacity=".85" />
    </I>
  ),
  pronombres: ( /* nested speech bubbles — pronouns replace */
    <I size={36} vb={32}>
      <path d="M7.5 5h13.5a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-7.5L9 22.4V18h-1.5a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z" fill="#fff" />
      <path d="M17 19.5h8.5a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-1v3l-3.4-3H17a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3z" fill="#fff" opacity=".72" />
    </I>
  ),
  conectores: ( /* chain links */
    <I size={36} vb={32}>
      <ellipse cx="11.5" cy="12.5" rx="7" ry="5" transform="rotate(-32 11.5 12.5)" stroke="#fff" strokeWidth="3.2" fill="none" />
      <ellipse cx="20.5" cy="19.5" rx="7" ry="5" transform="rotate(-32 20.5 19.5)" stroke="#fff" strokeWidth="3.2" fill="none" />
    </I>
  ),
  registro: ( /* top hat — formality */
    <I size={36} vb={32}>
      <ellipse cx="16" cy="24" rx="12.5" ry="3.6" fill="#fff" />
      <rect x="8.5" y="6" width="15" height="17" rx="2" fill="#fff" />
      <rect x="8.5" y="16.4" width="15" height="3.8" fill="#000" opacity=".22" />
    </I>
  ),
};

const INTERSTITIALS = ["¡PERFECTO!", "¡INCREÍBLE!", "¡IMPARABLE!", "¡QUÉ PADRE!"];

/* ---------------- CHARACTER VOICES ----------------
   Luna: warm daily coach. Don Rafa: story/culture mentor.
   Valeria: precision/formal Spanish. Diego: dialogue rival. */

const VOICES = {
  luna: {
    name: "Luna",
    correct: ["Eso suena natural.", "Perfecto: claro y mexicano.", "Ahí está la fluidez.", "Muy bien. Ya no estás traduciendo.", "Ese giro sí vive en la calle."],
    wrong: ["Cerca. Vamos a afinarlo.", "La idea está; falta precisión.", "Respira. Esta es justo la parte que se entrena.", "No está perdido, solo mal estacionado."],
    win: ["Buenísima sesión. Hoy hablaste más fino.", "Eso ya se siente como español real.", "La racha tiene estilo.", "Te estás volviendo peligroso en conversación."],
    sad: ["Pausa breve. La fluidez vuelve.", "Sin vidas, no sin progreso."],
  },
  rafa: {
    name: "Don Rafa",
    correct: ["Así se cuenta.", "Eso tiene sabor.", "Muy bien: ya oíste el contexto.", "Esa palabra ya es tuya.", "Buen oído, joven."],
    wrong: ["La historia te dio la pista.", "No corras; escucha la frase completa.", "Casi. El contexto manda.", "Lee otra vez la línea, ahí está."],
    win: ["Buen lector. Así crece el vocabulario.", "Ya tienes más mundo en el oído.", "Ese cuento dejó vocabulario.", "Te llevas una postal y varias palabras."],
    sad: ["Las historias esperan. Vuelve cuando quieras.", "Un descanso también cuenta."],
  },
  valeria: {
    name: "Valeria",
    correct: ["Correcto. Preciso y defendible.", "Bien. Eso sí lo firmaría.", "Claro, formal y sin ruido.", "Exacto. Esa es la versión profesional.", "Buen control del registro."],
    wrong: ["No. El matiz importa.", "Cuidado: suena menos formal de lo que crees.", "La estructura no sostiene la idea.", "Eso se entiende, pero no convence.", "Vuelve a mirar el modo verbal."],
    win: ["Aprobado. Ahora suena ejecutivo.", "Precisión notable.", "Buen trabajo. Se nota el control.", "Listo para una llamada difícil."],
    sad: ["No pasó. Se corrige con método.", "Sin precisión no hay trato. Practiquemos."],
  },
  diego: {
    name: "Diego",
    correct: ["No estuvo mal. Me sorprende.", "Bien jugado.", "Te salió rápido.", "Ok, esa respuesta sí pega."],
    wrong: ["Demasiado lento.", "Eso suena traducido.", "Yo no respondería así.", "Te faltó calle y timing."],
    win: ["Ganaste esta. No te acostumbres.", "Bien. Te debo una revancha.", "Acepto la derrota, con condiciones."],
    sad: ["Te gané la llamada.", "Otra ronda cuando quieras."],
  },
};

const GREETINGS = {
  es: [
    "Español mexicano real: cuentos, misiones y un empujón que pega.",
    "Luna ya tiene tu rutina de hoy.",
    "Don Rafa te guardó un cuento con palabras que valen.",
    "Valeria dice que la precisión es un gesto de cariño.",
    "Cinco minutos. Español de verdad. Nada de turista.",
  ],
  en: [
    "Build real Mexican Spanish through stories, challenges, and sharp feedback.",
    "Luna has your daily routine ready.",
    "Don Rafa saved you a story with words worth keeping.",
    "Valeria says precision is a kindness.",
    "Five minutes. Real Spanish. No tourist mode.",
  ],
};

const UNIT_INTROS = {
  subj1: "El subjuntivo no muerde. Bueno… casi nunca. ¡Échale!",
  pret: "Pretérito o imperfecto. Elige mal y lo sabré.",
  porpara: "Por aquí, para allá — ¡hoy se acaba la confusión, compa!",
  mex: "Don Rafa dice: si no suena vivo, todavía no es tuyo.",
  siclauses: "Si practicaras, hablarías como local. Ah, mira: vas a practicar.",
  pronombres: "Valeria revisa cada se, le y lo. Sin piedad, con cariño.",
  conectores: "Sin embargo, por lo tanto… hoy vamos a sonar elegantes.",
  registro: "Valeria entra a la sala. Endereza la frase.",
};

const pickQuip = (host, kind) => {
  const pool = VOICES[host]?.[kind] || VOICES.luna[kind];
  return pool[Math.floor(Math.random() * pool.length)];
};
const hostForUnit = (uid) => {
  if (uid === "mex") return "rafa";
  if (uid === "registro" || uid === "conectores" || uid === "pronombres") return "valeria";
  if (uid === "siclauses") return "valeria";
  return "luna";
};

/* ---------------- CUENTOS (Beelinguapp-style tap-to-define stories) ---------------- */

const COMMON_WORDS = {
  de: "of / from", que: "that / which", la: "the (f)", el: "the (m)", en: "in / on", y: "and", a: "to / at",
  los: "the (m pl)", las: "the (f pl)", se: "oneself / itself (pron.)", del: "of the", un: "a (m)", una: "a (f)",
  por: "for / by / through", con: "with", no: "no / not", su: "his / her / its / your (Ud.)", sus: "his / her / their (pl)",
  para: "for / to (purpose)", es: "is", al: "to the", lo: "it / the (neuter)", como: "like / as", más: "more",
  pero: "but", le: "to him / her / you (Ud.)", les: "to them", ya: "already / now", o: "or", este: "this (m)",
  esta: "this (f)", esto: "this (neuter)", ese: "that (m)", esa: "that (f)", eso: "that (neuter)", sí: "yes / indeed",
  porque: "because", entre: "between / among", cuando: "when", muy: "very", sin: "without", sobre: "on / about",
  también: "also", me: "me / myself", te: "you (obj.)", mi: "my", mis: "my (pl)", tu: "your", hasta: "until / even",
  hay: "there is / there are", donde: "where", desde: "since / from", todo: "all / everything", toda: "all (f)",
  todos: "all / everyone", nos: "us / ourselves", durante: "during", ni: "nor", yo: "I", él: "he", ella: "she",
  usted: "you (formal)", nosotros: "we", algo: "something", nada: "nothing", cada: "each / every", otro: "other (m)",
  otra: "other (f)", aquí: "here", ahí: "there", allí: "over there", ahora: "now", siempre: "always", nunca: "never",
  después: "after / later", antes: "before", mientras: "while", aunque: "although", era: "was (imperfect)",
  fue: "was / went (preterite)", son: "are", está: "is (estar)", están: "are (estar)", había: "there was / were",
  ser: "to be", estar: "to be (state/place)", tiene: "has", tenía: "had (imperfect)", uno: "one", dos: "two",
  tres: "three", años: "years", año: "year", día: "day", días: "days", noche: "night", casa: "house / home",
  vez: "time / occasion", solo: "only / alone", quien: "who", qué: "what", cómo: "how", así: "like this / thus",
  bien: "well", luego: "then / later", tan: "so / such", fin: "end", parte: "part", mismo: "same (m)", misma: "same (f)",
};

const EXTRA_STORY_WORDS = {
  muerto: ["dead / of the dead", "In «pan de muerto», muerto means “of the dead.”"],
  muertos: ["the dead / deceased people"],
  muerta: ["dead (f)"],
  muertas: ["dead (f pl)"],
  morir: ["to die"],
  vive: ["lives"],
  viven: ["they live"],
  vuelven: ["they return / come back"],
  vuelve: ["returns / comes back"],
  creía: ["I/he/she believed (imperfect)"],
  pensaba: ["I/he/she thought (imperfect)"],
  venía: ["came / was coming (imperfect)"],
  viene: ["comes"],
  venir: ["to come"],
  recibía: ["received / welcomed (imperfect)"],
  recibe: ["receives / welcomes"],
  familia: ["family"],
  comida: ["food / meal"],
  música: ["music"],
  octubre: ["October"],
  noviembre: ["November"],
  primero: ["first"],
};

const LOOKUP_ALIASES = {
  muerto: "muerte",
  muertos: "muerte",
  muerta: "muerte",
  muertas: "muerte",
  murió: "morir",
  mueren: "morir",
  vuelven: "regresaban",
};

const cleanStoryToken = (raw) => raw.toLowerCase().replace(/[^a-záéíóúüñ]/gi, "");
const lookupStoryWord = (story, raw) => {
  const clean = cleanStoryToken(raw);
  if (!clean) return null;
  const candidates = [
    clean,
    LOOKUP_ALIASES[clean],
    clean.endsWith("s") ? clean.slice(0, -1) : null,
    clean.endsWith("es") ? clean.slice(0, -2) : null,
  ].filter(Boolean);
  for (const key of candidates) {
    const g = story.glossary[key];
    if (g) return { en: g[0], note: g[1], source: key };
    if (COMMON_WORDS[key]) return { en: COMMON_WORDS[key], source: key };
    if (EXTRA_STORY_WORDS[key]) return { en: EXTRA_STORY_WORDS[key][0], note: EXTRA_STORY_WORDS[key][1], source: key };
  }
  return { en: null };
};

const STORIES = [
  {
    id: "story-0",
    section: 0,
    title: "La noche en que vuelven",
    subtitle: "Día de Muertos en Pátzcuaro",
    paragraphs: [
      "Cuando yo era niño, creía que la muerte era algo triste y oscuro. Mi abuela Refugio, que nació a la orilla del lago de Pátzcuaro, pensaba exactamente lo contrario. «La muerte no viene por nosotros», me decía mientras cortaba flores de cempasúchil en el patio. «Viene a visitarnos, una vez al año, y hay que recibirla como se recibe a la familia: con comida, con música y con la casa limpia.»",
      "A finales de octubre, todo el pueblo cambiaba. Los mercados se llenaban de calaveras de azúcar con nombres escritos en la frente, de pan de muerto espolvoreado con azúcar, y de montañas anaranjadas de cempasúchil. El aire olía a copal, esa resina que se quema desde tiempos prehispánicos. Mi abuela compraba todo con una lista que sabía de memoria, porque la ofrenda era un trabajo serio.",
      "El primero de noviembre armábamos el altar sobre una mesa con mantel morado. Poníamos las fotos de los difuntos: el bisabuelo Ramón con su sombrero de charro, la tía Consuelo, que murió demasiado joven. Para cada uno había algo especial. Para Ramón, un caballito de tequila y sus cigarros. Para Consuelo, dulce de calabaza, porque le encantaba. Las velas marcaban el camino, y un sendero de pétalos llegaba hasta la puerta. «Es para que no se pierdan», explicaba mi abuela. «La luz los guía, pero el olor los trae a casa.»",
      "La noche del dos de noviembre no dormíamos. Cruzábamos el lago en lancha hacia la isla de Janitzio, donde el panteón se convertía en un mar de velas. Las familias se sentaban junto a las tumbas a platicar, a comer tamales, a contar historias de los que ya no estaban. Nadie lloraba. Bueno, casi nadie. Se reía, se recordaba, se cantaba bajito.",
      "Una vez le pregunté a mi abuela si de verdad creía que los muertos regresaban. Se quedó callada un momento. «Mira», me dijo por fin, «mientras digamos sus nombres, no se mueren del todo. El olvido es la única muerte verdadera.»",
      "Mi abuela murió hace seis años. Ahora soy yo quien arma la ofrenda, con mis hijos. Pongo su foto junto a la de Ramón y la de Consuelo, con una taza de café de olla, porque le encantaba. Y cada noviembre, cuando enciendo las velas, espero que el olor del cempasúchil la traiga a casa. Ojalá que, cuando me toque a mí, alguien diga mi nombre también.",
    ],
    glossary: {
      muerte: ["death"], triste: ["sad"], oscuro: ["dark"], abuela: ["grandmother"], nació: ["was born (nacer)"],
      orilla: ["shore / edge"], lago: ["lake"], contrario: ["the opposite"], cortaba: ["was cutting (cortar)"],
      cempasúchil: ["Mexican marigold", "The flower of the dead — its scent is said to guide souls home."],
      patio: ["courtyard"], visitarnos: ["to visit us"], recibirla: ["to welcome her"], limpia: ["clean"],
      finales: ["the end (of a month)"], pueblo: ["town / village"], cambiaba: ["changed (imperfect)"],
      mercados: ["markets"], llenaban: ["filled up"], calaveras: ["skulls", "Sugar skulls often carry the name of a living friend — an affectionate joke."],
      azúcar: ["sugar"], nombres: ["names"], escritos: ["written"], frente: ["forehead"],
      pan: ["bread", "Pan de muerto: orange-scented bread with bone-shaped decorations."],
      espolvoreado: ["dusted / sprinkled"], montañas: ["mountains / heaps"], anaranjadas: ["orange-colored"],
      aire: ["air"], olía: ["smelled (oler)"], copal: ["copal", "Tree-resin incense burned since pre-Hispanic times."],
      resina: ["resin"], quema: ["burns (quemar)"], tiempos: ["times / eras"], prehispánicos: ["pre-Hispanic"],
      compraba: ["bought (imperfect)"], lista: ["list"], memoria: ["memory"], ofrenda: ["altar offering", "The home altar built for returning souls."],
      trabajo: ["work / task"], serio: ["serious"], armábamos: ["we assembled (armar)"], altar: ["altar"],
      mesa: ["table"], mantel: ["tablecloth"], morado: ["purple"], poníamos: ["we placed (poner)"],
      fotos: ["photos"], difuntos: ["the deceased"], bisabuelo: ["great-grandfather"], sombrero: ["hat"],
      charro: ["Mexican horseman", "The traditional outfit with embroidered jacket and wide-brim hat."],
      tía: ["aunt"], murió: ["died (morir)"], demasiado: ["too / too much"], joven: ["young"],
      caballito: ["tequila shot glass", "Literally 'little horse'."], cigarros: ["cigarettes"],
      dulce: ["sweet / candy"], calabaza: ["pumpkin", "Dulce de calabaza: pumpkin candied in piloncillo syrup."],
      encantaba: ["she loved it (le encantaba)"], velas: ["candles"], marcaban: ["marked"], camino: ["path / way"],
      sendero: ["trail"], pétalos: ["petals"], llegaba: ["reached"], puerta: ["door"],
      pierdan: ["get lost (subjunctive of perder)", "«Para que no se pierdan» — purpose clause → subjunctive."],
      explicaba: ["explained (imperfect)"], luz: ["light"], guía: ["guides (guiar)"], olor: ["smell / scent"],
      trae: ["brings (traer)"], dormíamos: ["we slept (imperfect)"], cruzábamos: ["we crossed"],
      lancha: ["small boat"], isla: ["island"], panteón: ["cemetery", "The everyday Mexican word — more common than «cementerio»."],
      convertía: ["turned into"], mar: ["sea"], familias: ["families"], sentaban: ["sat down"],
      tumbas: ["graves"], platicar: ["to chat", "Very Mexican — elsewhere you'd hear «charlar»."],
      tamales: ["tamales"], contar: ["to tell / to count"], historias: ["stories"], estaban: ["were (estar)"],
      nadie: ["nobody"], lloraba: ["cried (imperfect)"], casi: ["almost"], reía: ["laughed"],
      recordaba: ["remembered"], cantaba: ["sang"], bajito: ["softly / quietly"],
      pregunté: ["I asked (preterite)"], verdad: ["truth", "«De verdad» = really, truly."],
      regresaban: ["came back"], quedó: ["remained (quedarse)"], callada: ["silent / quiet"],
      digamos: ["we say (subjunctive)", "«Mientras digamos» — future-leaning mientras → subjunctive."],
      muerto: ["dead / of the dead", "In «pan de muerto», muerto means “of the dead.”"],
      muertos: ["the dead / deceased people"], mueren: ["die (morir)"], olvido: ["oblivion / forgetting"], única: ["only / sole"], verdadera: ["true / real"],
      arma: ["assembles (armar)"], hijos: ["children"], pongo: ["I put (poner)"], taza: ["cup"],
      olla: ["pot", "Café de olla: coffee simmered with cinnamon and piloncillo."],
      enciendo: ["I light (encender)"], espero: ["I hope (esperar)"],
      traiga: ["brings (subjunctive)", "«Espero que…» → subjunctive: traiga."],
      toque: ["my turn comes (subjunctive of tocar)", "«Cuando me toque» — future cuando → subjunctive."],
      diga: ["says (subjunctive)", "«Ojalá que… diga» — ojalá always takes subjunctive."],
      ojalá: ["hopefully / God willing", "From Arabic «in shā' Allāh»."],
    },
    questions: [
      { prompt: "Según la abuela, ¿qué trae a los muertos hasta la casa?", choices: ["El olor del cempasúchil", "La música de mariachi", "El pan de muerto", "Los cohetes"], answer: "El olor del cempasúchil" },
      { prompt: "¿Dónde pasaba la familia la noche del 2 de noviembre?", choices: ["En el panteón de la isla de Janitzio", "En la playa", "En un restaurante", "Dormidos en casa"], answer: "En el panteón de la isla de Janitzio" },
      { prompt: "Para la abuela, ¿cuál es «la única muerte verdadera»?", choices: ["El olvido", "La enfermedad", "La vejez", "La tristeza"], answer: "El olvido" },
    ],
  },
  {
    id: "story-1",
    section: 1,
    title: "La casa azul",
    subtitle: "Frida Kahlo en Coyoacán",
    paragraphs: [
      "En el barrio de Coyoacán, en la Ciudad de México, hay una casa pintada de un azul tan intenso que parece inventado. Es la Casa Azul, donde Frida Kahlo nació en 1907 y donde murió cuarenta y siete años después. Hoy es un museo, y la fila para entrar da la vuelta a la cuadra. Vale la pena esperar.",
      "Frida tenía dieciocho años cuando un accidente cambió su vida para siempre. El camión en el que viajaba chocó contra un tranvía. Un pasamanos de metal le atravesó el cuerpo. Los médicos no creían que fuera a sobrevivir. Pasó meses inmovilizada en una cama, con un corsé de yeso. Fue entonces cuando su madre mandó construir un caballete especial para que pudiera pintar acostada, y colocó un espejo en el techo de la cama. Frida se convirtió en su propio modelo. «Me pinto a mí misma», dijo años después, «porque soy a quien mejor conozco.»",
      "Caminar por la Casa Azul es entrar en su mundo. En la cocina, ollas de barro y los nombres «Frida» y «Diego» escritos en la pared con tacitas de cerámica. En su estudio, los pinceles siguen donde ella los dejó, frente a una ventana que da al jardín. Y en su recámara, sobre la cama, todavía está el espejo.",
      "Su relación con Diego Rivera, el muralista más famoso de México, fue tan intensa como su pintura: se casaron, se divorciaron y se volvieron a casar. Ella decía que había sufrido dos accidentes graves en su vida: el del tranvía y Diego. «Diego fue, por mucho, el peor.»",
      "Pero reducir a Frida al dolor sería un error. Era ingeniosa, mordaz, divertida. Llenaba la casa de monos araña, pericos y perros xoloitzcuintles, esos perros sin pelo que los antiguos mexicas consideraban sagrados. Coleccionaba arte popular, vestía trajes de tehuana y convirtió su propia imagen en una obra de arte.",
      "Días antes de morir, pintó sandías partidas, de un rojo vivísimo. En la última escribió tres palabras que todavía sorprenden a quien las lee, sabiendo todo lo que sufrió: «Viva la vida». Quizás ese sea el verdadero motivo para visitar la Casa Azul: no la tragedia, sino las ganas de vivir que cabían en un cuerpo roto.",
    ],
    glossary: {
      barrio: ["neighborhood"], pintada: ["painted"], azul: ["blue"], intenso: ["intense"], inventado: ["made up / invented"],
      museo: ["museum"], fila: ["line / queue"], vuelta: ["turn", "«Da la vuelta a la cuadra» = wraps around the block."],
      cuadra: ["city block (LatAm)"], vale: ["it's worth", "«Vale la pena» = it's worth it."], esperar: ["to wait"],
      accidente: ["accident"], cambió: ["changed (preterite)"], vida: ["life"],
      camión: ["bus", "¡Ojo! In Mexico camión usually means city bus, not truck."],
      viajaba: ["was traveling"], chocó: ["crashed (chocar)"], tranvía: ["streetcar / tram"],
      pasamanos: ["handrail"], metal: ["metal"], atravesó: ["went through / pierced"], cuerpo: ["body"],
      médicos: ["doctors"], creían: ["believed (imperfect)"],
      fuera: ["was going to (imperfect subjunctive)", "«No creían que fuera a sobrevivir» — doubt → subjunctive."],
      sobrevivir: ["to survive"], meses: ["months"], inmovilizada: ["immobilized"], cama: ["bed"],
      corsé: ["corset / brace"], yeso: ["plaster"], madre: ["mother"], mandó: ["ordered / had (something) done"],
      construir: ["to build"], caballete: ["easel"],
      pudiera: ["could (imperfect subjunctive)", "«Para que pudiera pintar» — purpose in the past → imperfect subjunctive."],
      pintar: ["to paint"], acostada: ["lying down"], colocó: ["placed"], espejo: ["mirror"], techo: ["ceiling"],
      convirtió: ["became / turned into (convertirse)"], propio: ["own"], modelo: ["model"],
      pinto: ["I paint (pintar)"], conozco: ["I know (conocer)"], mundo: ["world"], cocina: ["kitchen"],
      ollas: ["pots"], barro: ["clay"], pared: ["wall"], tacitas: ["tiny cups"], cerámica: ["ceramic"],
      estudio: ["studio"], pinceles: ["paintbrushes"], siguen: ["remain / continue (seguir)"], dejó: ["left (dejar)"],
      ventana: ["window"], jardín: ["garden"], recámara: ["bedroom", "The Mexican word — in Spain it's «dormitorio»."],
      todavía: ["still / yet"], relación: ["relationship"], muralista: ["muralist"], famoso: ["famous"],
      pintura: ["painting"], casaron: ["got married (casarse)"], divorciaron: ["got divorced"],
      volvieron: ["did again", "«Se volvieron a casar» = they remarried."],
      decía: ["used to say"], sufrido: ["suffered (participle)"], graves: ["serious / grave"], peor: ["worst"],
      reducir: ["to reduce"], dolor: ["pain"], sería: ["would be (conditional)"], error: ["mistake"],
      ingeniosa: ["witty / clever"], mordaz: ["sharp-tongued / biting"], divertida: ["fun / funny"],
      llenaba: ["filled (imperfect)"], monos: ["monkeys"], araña: ["spider", "Mono araña = spider monkey."],
      pericos: ["parakeets"], perros: ["dogs"],
      xoloitzcuintles: ["Mexican hairless dogs", "From Nahuatl; guides of souls to the underworld in Mexica belief."],
      pelo: ["hair / fur"], antiguos: ["ancient"], mexicas: ["the Aztecs", "The people often called Aztecs called themselves mexicas."],
      consideraban: ["considered"], sagrados: ["sacred"], coleccionaba: ["collected"], arte: ["art"],
      vestía: ["wore (imperfect)"], trajes: ["outfits / dresses"],
      tehuana: ["Tehuana dress", "Traditional dress of Tehuantepec women — Frida's signature look."],
      imagen: ["image"], obra: ["work (of art)"], morir: ["to die"], pintó: ["painted (preterite)"],
      sandías: ["watermelons"], partidas: ["cut open / split"], rojo: ["red"], vivísimo: ["extremely vivid"],
      escribió: ["wrote (preterite)"], palabras: ["words"], sorprenden: ["surprise (verb)"], lee: ["reads (leer)"],
      sabiendo: ["knowing"], sufrió: ["suffered (preterite)"], viva: ["long live", "«Viva la vida» = long live life."],
      quizás: ["perhaps"], sea: ["is (subjunctive)", "«Quizás ese sea» — quizás often takes subjunctive."],
      verdadero: ["true / real"], motivo: ["reason / motive"], tragedia: ["tragedy"],
      sino: ["but rather", "After a negation, to correct: no la tragedia, sino…"],
      ganas: ["desire / drive", "«Las ganas de vivir» = the will to live."],
      cabían: ["fit (imperfect of caber)"], roto: ["broken"],
    },
    questions: [
      { prompt: "¿Por qué pintaba Frida tantos autorretratos?", choices: ["Porque era a quien mejor conocía", "Porque Diego se lo exigía", "Porque odiaba los paisajes", "Porque no encontraba modelos"], answer: "Porque era a quien mejor conocía" },
      { prompt: "Según Frida, ¿cuáles fueron sus dos «accidentes»?", choices: ["El tranvía y Diego", "El tranvía y la pintura", "Diego y la fama", "El yeso y el espejo"], answer: "El tranvía y Diego" },
      { prompt: "¿Qué escribió Frida en su última pintura?", choices: ["«Viva la vida»", "«Casa Azul»", "«Adiós, Diego»", "«México lindo»"], answer: "«Viva la vida»" },
    ],
  },
  {
    id: "story-2",
    section: 2,
    title: "Más allá de la playa",
    subtitle: "De Cancún a los cenotes",
    paragraphs: [
      "Llegué a Cancún como llega todo el mundo: con bloqueador, sombrero y la firme intención de no moverme de la playa durante una semana. El plan era sencillo. Sin embargo, México tiene la costumbre de arruinar los planes sencillos de la mejor manera posible.",
      "El responsable fue un taxista llamado don Arturo. Mientras manejaba por la zona hotelera, me preguntó qué pensaba conocer. «La playa», contesté, orgulloso de mi plan. Me miró por el retrovisor con una mezcla de lástima y paciencia. «La playa está padre», admitió. «Pero usted está en tierra maya, joven. Debajo de esta carretera hay ríos secretos. ¿De veras se va a regresar sin verlos?»",
      "Así fue como, dos días después, me encontré bajando por una escalera de madera hacia un cenote cerca de Valladolid. Un cenote es un pozo natural de agua dulce, formado cuando el techo de una cueva de piedra caliza se derrumba. La península de Yucatán no tiene ríos en la superficie; toda su agua corre por debajo, en un sistema de cuevas inundadas que conecta miles de estos pozos. Para los mayas eran sagrados: puertas al inframundo, fuentes de vida. Por lo tanto, no se entraba a un cenote a la ligera.",
      "Nadar ahí es difícil de describir. El agua es tan transparente que los peces parecen flotar en el aire. Un rayo de sol entra por la abertura del techo y cae como un reflector sobre el azul. Arriba cuelgan raíces de árboles que bajan veinte metros buscando el agua. Entendí de inmediato por qué los mayas pensaban que era un lugar entre dos mundos.",
      "Al día siguiente visité Chichén Itzá. Debido a la multitud, llegué temprano. La pirámide de Kukulcán es, además de hermosa, un calendario de piedra: tiene 365 escalones, uno por cada día del año. En los equinoccios, la luz del sol crea sobre la escalera la sombra de una serpiente que baja lentamente. Miles de personas viajan cada año solo para ver ese truco de luz que unos astrónomos diseñaron hace más de mil años, sin telescopios y sin computadoras.",
      "Volví a Cancún para mi último día y, no obstante, la playa ya me parecía distinta. Seguía siendo hermosa, claro. Pero ahora sabía que era apenas la superficie, en el sentido más literal de la palabra. Debajo del paraíso turístico hay otro país: más antiguo, más callado y mucho más profundo. Si algún día va usted a Cancún, disfrute su playa. Se la ha ganado. Pero hágale caso a don Arturo: no se regrese sin ver lo que hay debajo.",
    ],
    glossary: {
      llegué: ["I arrived (preterite)"], bloqueador: ["sunscreen", "The Mexican word — in Spain it's «protector solar»."],
      firme: ["firm"], intención: ["intention"], moverme: ["to move (myself)"], playa: ["beach"],
      semana: ["week"], plan: ["plan"], sencillo: ["simple"],
      embargo: ["however", "«Sin embargo» = however. (Alone, embargo = seizure — your day job.)"],
      costumbre: ["habit / custom"], arruinar: ["to ruin"], planes: ["plans"], manera: ["way / manner"],
      posible: ["possible"], responsable: ["the one responsible"], taxista: ["taxi driver"], llamado: ["named / called"],
      manejaba: ["was driving", "Manejar = to drive in Latin America; Spain says «conducir»."],
      zona: ["zone / district"], hotelera: ["hotel (adj.)", "La zona hotelera: Cancún's beachfront strip."],
      pensaba: ["was planning / thinking"], conocer: ["to get to know / visit"], contesté: ["I answered"],
      orgulloso: ["proud"], miró: ["looked at (mirar)"], retrovisor: ["rearview mirror"], mezcla: ["mix / blend"],
      lástima: ["pity"], paciencia: ["patience"],
      padre: ["cool / great (Mex.)", "«Está padre» = it's great. Nothing to do with fathers."],
      admitió: ["admitted"], tierra: ["land / earth"], maya: ["Maya / Mayan"], debajo: ["underneath / below"],
      carretera: ["highway"], ríos: ["rivers"], secretos: ["secret (adj. pl)"],
      veras: ["really", "«¿De veras?» = really? / seriously?"],
      regresar: ["to return / go back"], verlos: ["to see them"], encontré: ["I found (myself)"],
      bajando: ["going down"], escalera: ["staircase / ladder"], madera: ["wood"],
      cenote: ["cenote", "Natural sinkhole; from Mayan «ts'onot». Yucatán has thousands."],
      pozo: ["well / pit"], natural: ["natural"], agua: ["water"], formado: ["formed"],
      cueva: ["cave"], piedra: ["stone / rock"], caliza: ["limestone"], derrumba: ["collapses (derrumbarse)"],
      península: ["peninsula"], superficie: ["surface"], corre: ["runs / flows (correr)"], sistema: ["system"],
      inundadas: ["flooded"], conecta: ["connects"], miles: ["thousands"], pozos: ["wells / pits"],
      mayas: ["the Maya"], sagrados: ["sacred"], puertas: ["doors / gates"],
      inframundo: ["the underworld", "Xibalbá in Maya cosmology — entered through water."],
      fuentes: ["sources / springs"],
      tanto: ["therefore", "«Por lo tanto» = therefore — your connectors unit in the wild."],
      entraba: ["one entered (imperfect)"], ligera: ["lightly", "«A la ligera» = casually, without due respect."],
      nadar: ["to swim"], difícil: ["difficult"], describir: ["to describe"], transparente: ["transparent / clear"],
      peces: ["fish (pl)"], parecen: ["seem (parecer)"], flotar: ["to float"], rayo: ["ray / beam"],
      sol: ["sun"], abertura: ["opening"], cae: ["falls (caer)"], reflector: ["spotlight"],
      arriba: ["above / up"], cuelgan: ["hang (colgar)"], raíces: ["roots"], árboles: ["trees"],
      bajan: ["descend"], metros: ["meters"], buscando: ["searching for"], entendí: ["I understood"],
      inmediato: ["immediately", "«De inmediato» = right away."], lugar: ["place"], mundos: ["worlds"],
      siguiente: ["next / following"], visité: ["I visited"],
      debido: ["due to", "«Debido a» = formal because of — another connector."],
      multitud: ["crowd"], temprano: ["early"], pirámide: ["pyramid"], hermosa: ["beautiful"],
      calendario: ["calendar"], escalones: ["steps / stairs"], equinoccios: ["equinoxes"],
      crea: ["creates (crear)"], sombra: ["shadow"], serpiente: ["serpent / snake", "Kukulcán: the feathered-serpent god."],
      lentamente: ["slowly"], personas: ["people"], viajan: ["travel"], truco: ["trick"],
      astrónomos: ["astronomers"], diseñaron: ["designed (preterite)"], mil: ["a thousand"],
      telescopios: ["telescopes"], computadoras: ["computers", "LatAm word; Spain says «ordenadores»."],
      volví: ["I returned (volver)"], último: ["last / final"],
      obstante: ["nevertheless", "«No obstante» = formal sin embargo. Contract Spanish."],
      parecía: ["seemed (imperfect)"], distinta: ["different"], seguía: ["kept being (seguir)"],
      sabía: ["I knew (imperfect)"], apenas: ["barely / just"], sentido: ["sense / meaning"],
      literal: ["literal"], palabra: ["word"], paraíso: ["paradise"], turístico: ["tourist (adj.)"],
      país: ["country"], antiguo: ["ancient / old"], callado: ["quiet / silent"], profundo: ["deep"],
      disfrute: ["enjoy (usted command)", "Formal imperative — registro unit in action."],
      ganado: ["earned", "«Se la ha ganado» = you've earned it."],
      hágale: ["do it (usted command)", "«Hágale caso» = listen to him / heed him."],
      caso: ["attention", "«Hacer caso a alguien» = to heed someone."],
      regrese: ["return (usted command, negative)", "«No se regrese» — negative formal command → subjunctive form."],
    },
    questions: [
      { prompt: "¿Qué es un cenote?", choices: ["Un pozo natural de agua dulce", "Un templo maya", "Una playa escondida", "Un mercado tradicional"], answer: "Un pozo natural de agua dulce" },
      { prompt: "¿Por qué la pirámide de Kukulcán es «un calendario de piedra»?", choices: ["Tiene 365 escalones, uno por día del año", "Está pintada con los meses", "Tiene un reloj de sol en la cima", "Cambia de color cada estación"], answer: "Tiene 365 escalones, uno por día del año" },
      { prompt: "¿Qué eran los cenotes para los mayas?", choices: ["Puertas sagradas al inframundo", "Albercas para nadar", "Trampas para enemigos", "Depósitos de comida"], answer: "Puertas sagradas al inframundo" },
    ],
  },
/* ============================================================
   STORIES 4–10 — Mexican cultural cuentos
   Each ~430 words, ~70 glossed words with cultural notes,
   3 comprehension questions, section assignment that recycles
   that section's grammar in the prose.
   ============================================================ */
{
  id: "story-3",
  section: 0,
  title: "El hijo del Rey Tigre",
  subtitle: "Una familia de lucha libre",
  paragraphs: [
    "Mi padre se ponía la máscara antes de salir de casa. No era una superstición, era una regla. «Cuando uno es luchador», me decía, «el hombre y el personaje no deben encontrarse en la misma calle. La gente paga para ver al Rey Tigre, no a Joaquín Méndez de Tlalnepantla.»",
    "Yo crecí entre máscaras. Las había de cuero, de licra, de terciopelo bordado con hilo de oro. Mi madre las cosía a mano en la mesa de la cocina, después de cenar, mientras la televisión transmitía las peleas de los viernes. Aprendí a leer los nombres antes que las palabras: Santo, Blue Demon, Mil Máscaras, Huracán Ramírez. Para otros niños eran personajes. Para mí eran tíos, padrinos, vecinos del barrio.",
    "Mi padre fue rudo durante veintidós años. En lucha libre, los rudos son los malos, los que hacen trampa, los que el público abuchea. Los técnicos son los buenos. «Sin rudos no hay función», explicaba siempre. «El bien necesita al mal para que la gente sepa por quién gritar.» Le encantaba ser odiado. Cuando el estadio entero le silbaba, sonreía debajo de la máscara como un niño con regalo nuevo.",
    "Una noche, en la Arena México, mi padre perdió la máscara. Fue una lucha de apuestas, máscara contra cabellera, y cuando el réferi contó tres, mi padre se la quitó. Tenía cuarenta y siete años. La multitud quedó en silencio. Vimos su cara por primera vez en televisión: cicatrices, ojos cansados, sudor. Después aplaudieron de pie durante cinco minutos. Mi madre lloraba. Yo también, aunque tenía once años y no quería que se notara.",
    "Mi padre se retiró esa misma noche. «El Rey Tigre murió hoy», anunció. «Joaquín Méndez puede por fin caminar a la tienda sin máscara.» Pero todavía guarda todas. Las tiene en una vitrina en la sala, ordenadas por año, cada una etiquetada con la pelea que la estrenó.",
    "Yo debuté el año pasado, a los veintidós. Mi nombre en el ring es Tigre Joven. Mi máscara es nueva, plateada con detalles azules, cosida por mi madre. Soy técnico, no rudo, porque mi padre dice que cada generación elige su propio camino. Cuando salgo a la arena y el público grita mi nombre, pienso en él, sentado en primera fila sin máscara, aplaudiendo al niño que aprendió a leer entre antifaces.",
  ],
  glossary: {
    padre: ["father"], máscara: ["mask", "In lucha libre the mask is sacred — losing it on purpose ends a career."],
    superstición: ["superstition"], regla: ["rule"], luchador: ["wrestler"], hombre: ["man"],
    personaje: ["character / persona"], encontrarse: ["to meet"], paga: ["pays (pagar)"], ver: ["to see"],
    crecí: ["I grew up (preterite)"], cuero: ["leather"], licra: ["lycra"], terciopelo: ["velvet"],
    bordado: ["embroidered"], hilo: ["thread"], oro: ["gold"], cosía: ["sewed (imperfect)"],
    mano: ["hand"], cocina: ["kitchen"], cenar: ["to eat dinner"], televisión: ["television"],
    transmitía: ["broadcast (imperfect)"], peleas: ["fights"], viernes: ["Friday"], aprendí: ["I learned"],
    leer: ["to read"], nombres: ["names"], palabras: ["words"],
    Santo: ["El Santo", "The most iconic luchador ever — he wore his mask in public for 40 years."],
    niños: ["children / boys"], tíos: ["uncles"], padrinos: ["godfathers"], vecinos: ["neighbors"],
    barrio: ["neighborhood"], fue: ["was (preterite)"],
    rudo: ["heel / villain wrestler", "Rudos cheat, mug, work the crowd's hate — half of every match."],
    veintidós: ["twenty-two"], años: ["years"], malos: ["the bad ones"], hacen: ["do (hacer)"],
    trampa: ["trickery / cheating"], público: ["audience"], abuchea: ["boos (abuchear)"],
    técnicos: ["faces / hero wrestlers", "The babyfaces — the good guys."],
    buenos: ["the good ones"], función: ["show / event"], explicaba: ["explained (imperfect)"],
    bien: ["good (n.)"], mal: ["evil"], sepa: ["knows (subjunctive)", "«Para que la gente sepa» — purpose → subjunctive."],
    gritar: ["to shout / cheer"], encantaba: ["he loved it (le encantaba)"], odiado: ["hated"],
    estadio: ["stadium"], silbaba: ["whistled / hissed"], sonreía: ["smiled"], debajo: ["underneath"],
    regalo: ["present"], nuevo: ["new"], noche: ["night"],
    Arena: ["arena", "Arena México in CDMX — the cathedral of lucha libre since 1956."],
    perdió: ["lost (preterite)"], apuestas: ["bets", "Mask-vs-mask or mask-vs-hair: career-defining stipulation matches."],
    cabellera: ["head of hair"], réferi: ["referee"], contó: ["counted (preterite)"], tres: ["three"],
    quitó: ["took off (quitarse)"], cuarenta: ["forty"], siete: ["seven"], multitud: ["crowd"],
    silencio: ["silence"], cara: ["face"], primera: ["first"], vez: ["time"],
    cicatrices: ["scars"], ojos: ["eyes"], cansados: ["tired"], sudor: ["sweat"],
    aplaudieron: ["applauded"], pie: ["foot", "«De pie» = standing."],
    cinco: ["five"], minutos: ["minutes"], madre: ["mother"], lloraba: ["was crying"],
    once: ["eleven"], notara: ["showed (imperfect subjunctive)", "«No quería que se notara» — past wish → imperfect subjunctive."],
    retiró: ["retired (retirarse)"], misma: ["same"], murió: ["died (morir)"], anunció: ["announced"],
    puede: ["can"], caminar: ["to walk"], tienda: ["store"], todavía: ["still"], guarda: ["keeps"],
    vitrina: ["display case"], sala: ["living room"], ordenadas: ["arranged"], etiquetada: ["labeled"],
    estrenó: ["debuted it (preterite of estrenar)"], debuté: ["I debuted"], pasado: ["last / past"],
    veintidós2: ["22"], ring: ["ring"], joven: ["young"], plateada: ["silvery"], detalles: ["details"],
    azules: ["blue (pl.)"], elige: ["chooses (elegir)"], propio: ["own"], camino: ["path"],
    salgo: ["I go out (salir)"], arena: ["arena"], grita: ["shouts (gritar)"], pienso: ["I think (pensar)"],
    sentado: ["seated"], fila: ["row"], aplaudiendo: ["applauding"], antifaces: ["masks / disguises"],
  },
  questions: [
    { prompt: "¿Por qué su padre nunca salía de casa sin la máscara?", choices: ["Para no mezclar al hombre con el personaje", "Por miedo al sol", "Para impresionar a los vecinos", "Porque era una superstición religiosa"], answer: "Para no mezclar al hombre con el personaje" },
    { prompt: "¿Qué papel desempeñaba su padre en el ring?", choices: ["Era rudo (villano)", "Era técnico (héroe)", "Era réferi", "Era promotor"], answer: "Era rudo (villano)" },
    { prompt: "¿Cómo perdió su padre la máscara?", choices: ["En una lucha de apuestas máscara contra cabellera", "Se la robaron tras el evento", "La perdió en un viaje", "La rompió en un accidente"], answer: "En una lucha de apuestas máscara contra cabellera" },
  ],
},
{
  id: "story-4",
  section: 1,
  title: "Doña Lupe y el mole",
  subtitle: "Un mercado de Oaxaca",
  paragraphs: [
    "Doña Lupe llega al mercado todos los días a las cinco de la mañana. Vende mole en el pasillo principal del Mercado 20 de Noviembre, en el centro de Oaxaca, en el mismo puesto donde su madre vendía antes que ella y su abuela antes que su madre. Tiene setenta y un años, dos rodillas operadas y una memoria que da miedo: recuerda el nombre de cada cliente que ha probado su mole desde 1978.",
    "El mole de Doña Lupe es negro, espeso, brillante. Lleva treinta y dos ingredientes, aunque ella jura que son treinta y tres y se niega a decir cuál es el secreto. Lo prepara los domingos: tuesta chiles de cuatro tipos en un comal de barro, asa almendras, cacahuates y ajonjolí, machaca clavo y canela en un molcajete que era de su bisabuela. Hierve todo durante seis horas. El chocolate va al final, no antes. «El chocolate manda», me explicó. «Si entra temprano, se quema. Si entra tarde, se nota. Hay que respetar al chocolate.»",
    "La mañana que la entrevisté, ella servía mole sobre pollo con la mano izquierda mientras cobraba con la derecha. Cien pesos el plato. Cobra menos a los estudiantes y a los viejitos. A los gringos, dice riéndose, cien y un peso de bendición. Nadie regatea con ella. Aquí no se regatea. Es una regla no escrita del mercado.",
    "Le pregunté si pensaba retirarse algún día. Me miró como si hubiera dicho una grosería. «¿Retirarme? ¿A hacer qué? Mira», dijo, señalando a una niña de unos doce años que ayudaba a llenar los platos. Es mi nieta. «Está aprendiendo. Cuando le tiemble el pulso, ella tomará la cuchara y yo seré la abuela que vigila desde la silla. Pero todavía no me tiembla nada.»",
    "Probé el mole. No tengo palabras. Imagina un sabor que es dulce, pero no es dulce; picante, pero no es picante; antiguo, como si lo hubieran cocinado los abuelos de los abuelos. Probé un bocado y entendí algo que ningún libro me había explicado: el mole no es una receta, es una memoria. Cada cucharada contiene seis horas de cocción y trescientos años de mujeres.",
    "Doña Lupe me cobró ochenta pesos. «Eres mexicano», dijo. «Cobro precio de la casa.» Le di cien. «El peso extra es por la bendición», le dije, y se rio tanto que casi se le cae la cuchara.",
  ],
  glossary: {
    doña: ["honorific for older woman", "Title of respect — paired with the first name."],
    Lupe: ["short for Guadalupe", "Patron-saint name; extremely common."],
    llega: ["arrives"], mercado: ["market"],
    pasillo: ["aisle / corridor"], principal: ["main"],
    Mercado: ["Market", "Mercado 20 de Noviembre — Oaxaca's most famous food market."],
    centro: ["center / downtown"],
    Oaxaca: ["Oaxaca", "Southern state and city — capital of Mexican food culture."],
    puesto: ["stall / stand"], vendía: ["used to sell"], abuela: ["grandmother"],
    setenta: ["seventy"], rodillas: ["knees"], operadas: ["operated on"], memoria: ["memory"],
    miedo: ["fear", "«Da miedo» = it's scary (in this case, frighteningly good)."],
    recuerda: ["remembers"], cliente: ["customer"], probado: ["tried (participle of probar)"],
    mole: ["mole sauce", "Oaxaca claims seven moles — negro, rojo, amarillo, verde, chichilo, manchamantel, coloradito."],
    negro: ["black"], espeso: ["thick"], brillante: ["shiny / glossy"],
    treinta: ["thirty"], ingredientes: ["ingredients"],
    jura: ["swears (jurar)"], niega: ["refuses (negarse)"], cuál: ["which"], secreto: ["secret"],
    prepara: ["prepares"], domingos: ["Sundays"], tuesta: ["toasts"], chiles: ["chiles"],
    cuatro: ["four"], tipos: ["types"],
    comal: ["comal", "Flat clay or iron griddle used since pre-Hispanic times."],
    barro: ["clay"], asa: ["roasts (asar)"], almendras: ["almonds"], cacahuates: ["peanuts"],
    ajonjolí: ["sesame"], machaca: ["grinds / crushes"], clavo: ["clove"], canela: ["cinnamon"],
    molcajete: ["mortar (volcanic stone)", "Three-legged basalt mortar — the original blender."],
    bisabuela: ["great-grandmother"], hierve: ["boils (hervir)"], seis: ["six"], horas: ["hours"],
    chocolate: ["chocolate", "Mexican drinking chocolate, often Tabasco or Oaxacan."],
    final: ["the end"], manda: ["rules / commands"], explicó: ["explained (preterite)"],
    entra: ["enters"], temprano: ["early"], quema: ["burns (quemarse)"], tarde: ["late"],
    nota: ["shows / is noticed"], respetar: ["to respect"], mañana: ["morning"],
    entrevisté: ["I interviewed"], servía: ["was serving"], pollo: ["chicken"],
    izquierda: ["left (hand)"], cobraba: ["was charging"], derecha: ["right (hand)"],
    cien: ["hundred"], pesos: ["pesos"], plato: ["plate / dish"], cobra: ["charges"],
    menos: ["less"], estudiantes: ["students"], viejitos: ["older folks (affectionate)"],
    gringos: ["foreigners (informal)", "Originally for Americans; now broadly for any English-speaking visitor."],
    riéndose: ["laughing"], peso: ["peso"], bendición: ["blessing"], regatea: ["haggles (regatear)"],
    regla: ["rule"], escrita: ["written"], pregunté: ["I asked"], pensaba: ["was thinking"],
    retirarse: ["to retire"], algún: ["some"], miró: ["looked at (preterite)"],
    hubiera: ["had (imperfect subjunctive)", "«Como si hubiera dicho» — «as if» always takes imperfect subjunctive."],
    grosería: ["rude thing / vulgarity"], señalando: ["pointing at"], doce: ["twelve"],
    ayudaba: ["was helping"], llenar: ["to fill"], platos: ["plates"], nieta: ["granddaughter"],
    aprendiendo: ["learning"], tiemble: ["trembles (subjunctive)", "«Cuando le tiemble» — future cuando → subjunctive."],
    pulso: ["pulse / steadiness of hand"], tomará: ["will take"], cuchara: ["spoon / ladle"],
    seré: ["I will be"], vigila: ["watches over"], silla: ["chair"], probé: ["I tasted"],
    palabras: ["words"], imagina: ["imagine"], sabor: ["taste / flavor"], dulce: ["sweet"],
    picante: ["spicy / hot"], antiguo: ["ancient"],
    hubieran: ["had (subjunctive)", "«Como si lo hubieran cocinado» — hypothetical past."],
    cocinado: ["cooked (participle)"], abuelos: ["grandparents"], bocado: ["bite / mouthful"],
    entendí: ["I understood"], libro: ["book"], explicado: ["explained (participle)"],
    receta: ["recipe"], cucharada: ["spoonful"], contiene: ["contains"], cocción: ["cooking"],
    trescientos: ["three hundred"], mujeres: ["women"], ochenta: ["eighty"],
    precio: ["price"], casa: ["house"], extra: ["extra"], rio: ["laughed"],
    casi: ["almost"], cae: ["falls"],
  },
  questions: [
    { prompt: "¿Qué hace especial al mole de Doña Lupe?", choices: ["Lleva más de treinta ingredientes y representa generaciones de tradición", "Es el único mole sin chile", "Se cocina en menos de una hora", "Está hecho con ingredientes europeos"], answer: "Lleva más de treinta ingredientes y representa generaciones de tradición" },
    { prompt: "¿Por qué Doña Lupe no quiere retirarse?", choices: ["Porque todavía no le tiembla el pulso", "Porque no tiene quien la sustituya", "Porque necesita el dinero", "Porque no sabe hacer otra cosa"], answer: "Porque todavía no le tiembla el pulso" },
    { prompt: "¿Qué descubrió el entrevistador al probar el mole?", choices: ["Que el mole no es una receta, es una memoria", "Que prefiere el mole rojo", "Que su madre lo hace igual", "Que el mole picaba demasiado"], answer: "Que el mole no es una receta, es una memoria" },
  ],
},
{
  id: "story-5",
  section: 1,
  title: "La frontera más larga del mundo",
  subtitle: "Una reportera en Tijuana",
  paragraphs: [
    "Llevo doce años cubriendo la frontera. Vivo en Tijuana, escribo para un periódico de Los Ángeles y cruzo el muro tres o cuatro veces por semana. Mi pasaporte está más sellado que el de cualquier diplomático. Mi español tiene acento de las dos costas. Me gano la vida explicando un país a otro y, francamente, los dos me parecen igual de extraños.",
    "Tijuana no es lo que dicen las películas. Sí, hay zonas peligrosas, pero también hay restaurantes con dos estrellas Michelin, un festival de ópera, librerías independientes en la avenida Revolución y una de las mejores escenas de arte urbano del continente. La gente de aquí se ríe cuando un turista pregunta si es seguro caminar. «Más seguro que San Diego en domingo», dicen.",
    "Lo que sí es cierto es que el muro está siempre presente. No solo el muro físico de metal oxidado que parte la playa en dos, sino el otro, el invisible: el que separa quién puede cruzar y quién no, quién pasa en dos minutos por la línea SENTRI y quién espera cuatro horas en la fila peatonal sin desayunar. La frontera es una máquina de filtrar personas según el papel que llevan en el bolsillo.",
    "El caso que más me ha marcado fue el de Anabel, una madre hondureña que llegó embarazada en 2022. Su bebé nació en San Ysidro, en una ambulancia detenida en el carril de inspección. La niña es ciudadana americana. Anabel fue deportada cuatro días después del parto. La bebé se quedó con una tía en Los Ángeles. Cuando entrevisté a Anabel, en una iglesia que da comida en Tijuana, llevaba dos años sin ver a su hija. Lo único que tenía era una fotografía gastada de la niña sosteniendo un osito de peluche.",
    "Me preguntan a menudo si la frontera me ha endurecido. Honestamente, no. Lo que me ha endurecido es ver cómo los políticos a ambos lados usan estas historias como utilería. Los activistas tampoco son inocentes; muchos viven de la indignación. La frontera real es más complicada que cualquier discurso: aquí hay trabajadores que cruzan a diario, familias mixtas, médicos binacionales, abuelitas que llevan medicinas en la bolsa.",
    "Aún así, vuelvo todos los días. Hace doce años pensaba que iba a quedarme dos. Tijuana se vuelve hogar sin que uno se dé cuenta. Una vez le pregunté a un colega veterano por qué se quedaba. Me dijo: «Porque aquí pasa todo. Si te gusta el periodismo, esto es Roma en el año 50.» Tenía razón.",
  ],
  glossary: {
    llevo: ["I've been (for X time)", "«Llevo doce años» = I've been doing X for 12 years."],
    doce: ["twelve"], cubriendo: ["covering (verb)"], frontera: ["border"],
    Tijuana: ["Tijuana", "Border city, Baja California — largest along the US-Mexico line."],
    periódico: ["newspaper"], Los: ["Los"], Ángeles: ["Angeles"], cruzo: ["I cross"],
    muro: ["wall"], tres: ["three"], cuatro: ["four"], veces: ["times"], semana: ["week"],
    pasaporte: ["passport"], sellado: ["stamped"], cualquier: ["any"], diplomático: ["diplomat"],
    español: ["Spanish (language)"], acento: ["accent"], costas: ["coasts"],
    gano: ["I earn (ganar)"], vida: ["life"], explicando: ["explaining"], país: ["country"],
    francamente: ["frankly"], extraños: ["strange / foreign"], dicen: ["they say"],
    películas: ["movies"], peligrosas: ["dangerous"], restaurantes: ["restaurants"],
    estrellas: ["stars"],
    Michelin: ["Michelin", "Tijuana earned its first Michelin stars in 2024 — a real cultural shift."],
    festival: ["festival"], ópera: ["opera"], librerías: ["bookstores"], independientes: ["independent"],
    avenida: ["avenue"], Revolución: ["Revolution"],
    arte: ["art"], urbano: ["urban"], continente: ["continent"], ríe: ["laughs"],
    turista: ["tourist"], seguro: ["safe"], caminar: ["to walk"], domingo: ["Sunday"],
    cierto: ["true"], presente: ["present"], físico: ["physical"],
    oxidado: ["rusted"], parte: ["splits (partir)"],
    playa: ["beach", "Friendship Park / Playas de Tijuana: the wall literally runs into the Pacific."],
    invisible: ["invisible"], separa: ["separates"], cruzar: ["to cross"], pasa: ["passes"],
    minutos: ["minutes"], línea: ["line / lane"],
    SENTRI: ["SENTRI", "Trusted-traveler program — turns a 4-hour wait into 5 minutes."],
    espera: ["waits"], fila: ["line / queue"], peatonal: ["pedestrian"], desayunar: ["to eat breakfast"],
    máquina: ["machine"], filtrar: ["to filter"], personas: ["people"], papel: ["paper / document"],
    llevan: ["they carry"], bolsillo: ["pocket"], caso: ["case"], marcado: ["marked"],
    madre: ["mother"], hondureña: ["Honduran"], llegó: ["arrived"], embarazada: ["pregnant"],
    bebé: ["baby"],
    San: ["San", "San Ysidro: the southernmost US town, where the busiest border crossing in the hemisphere sits."],
    ambulancia: ["ambulance"], detenida: ["stopped"], carril: ["lane"], inspección: ["inspection"],
    niña: ["girl"], ciudadana: ["citizen"], americana: ["American"], deportada: ["deported"],
    días: ["days"], parto: ["childbirth"], tía: ["aunt"], entrevisté: ["I interviewed"],
    iglesia: ["church"], comida: ["food"], hija: ["daughter"], fotografía: ["photograph"],
    gastada: ["worn-out"], sosteniendo: ["holding"], osito: ["little bear"],
    peluche: ["plush / stuffed", "Osito de peluche = teddy bear."],
    preguntan: ["they ask"], menudo: ["often", "«A menudo» = often."],
    endurecido: ["hardened (participle)"], honestamente: ["honestly"], políticos: ["politicians"],
    ambos: ["both"], lados: ["sides"], historias: ["stories"], utilería: ["props"],
    activistas: ["activists"], inocentes: ["innocent"], viven: ["live"], indignación: ["indignation"],
    complicada: ["complicated"], discurso: ["speech / rhetoric"], trabajadores: ["workers"],
    diario: ["daily"], familias: ["families"], mixtas: ["mixed"], médicos: ["doctors"],
    binacionales: ["binational"], abuelitas: ["grandmas"], llevan2: ["carry"],
    medicinas: ["medicines"], bolsa: ["bag", "Mexican Spanish for bag — in Spain «bolso» for purse."],
    vuelvo: ["I return / go back"], pensaba: ["thought / planned"], iba: ["was going to"],
    quedarme: ["to stay"], hogar: ["home"], cuenta: ["account", "«Sin darse cuenta» = without realizing."],
    colega: ["colleague"], veterano: ["veteran"], quedaba: ["was staying"],
    periodismo: ["journalism"], Roma: ["Rome", "«Roma en el año 50» — a rich, chaotic, history-making moment."],
    año: ["year"], razón: ["reason / right", "«Tener razón» = to be right."],
  },
  questions: [
    { prompt: "Según la reportera, ¿qué hace la frontera con las personas?", choices: ["Las filtra según el papel que llevan en el bolsillo", "Las une cuando viajan juntas", "Las identifica con tecnología biométrica", "Las educa sobre los dos países"], answer: "Las filtra según el papel que llevan en el bolsillo" },
    { prompt: "¿Por qué Anabel fue separada de su hija?", choices: ["Fue deportada cuatro días después del parto", "Se perdió en la frontera", "Entregó a la bebé voluntariamente", "Fue arrestada por la policía mexicana"], answer: "Fue deportada cuatro días después del parto" },
    { prompt: "¿Qué la mantiene viviendo en Tijuana después de doce años?", choices: ["Que aquí pasa todo, como Roma en el año 50", "El precio bajo del alquiler", "Su familia originaria de Tijuana", "El clima cálido todo el año"], answer: "Que aquí pasa todo, como Roma en el año 50" },
  ],
},
{
  id: "story-6",
  section: 1,
  title: "La sirena del Pacífico",
  subtitle: "Un pueblo de pescadores en Nayarit",
  paragraphs: [
    "En San Blas, Nayarit, los pescadores zarpan antes del amanecer. Mi abuelo Heriberto fue uno de ellos durante cincuenta años, y juraba —juraba con la mano sobre el pecho, frente a la imagen de la Virgen de Guadalupe— que una madrugada de marzo de 1971 había visto una sirena.",
    "«No era una historia para niños», me decía cuando yo tenía nueve años y volvía a preguntárselo. «Era de carne, como tú y yo. Cabello negro hasta la cintura, ojos verdes como agua de cenote. Estaba sentada sobre una roca cerca de la Piedra Blanca del Tigre. Cantaba.» Yo le preguntaba qué cantaba. «No lo sé», respondía. «No era español. No era nada. Era el sonido del mar si supiera hablar.»",
    "Mi padre, que es ingeniero y no cree en sirenas, siempre cambiaba de tema cuando mi abuelo empezaba con esa historia. Pero mi abuela, que sí le creía, agregaba un detalle cada vez que la oía contar. La primera vez fue cabello negro. La segunda, una cola de plata. La tercera, una voz que olía a sal y a tristeza. «No te burles», me advertía cuando yo me reía. «Tu abuelo nunca mentía sobre el mar. Sobre las cartas, sí. Sobre el mar, no.»",
    "Mi abuelo murió en 2009, a los ochenta y dos años. Heredé sus dos lanchas, su red de pescar camarón y una libreta con una sola entrada, fechada el 17 de marzo de 1971: «Hoy vi algo que no debí ver. No lo escribo aquí porque las letras no son suficientes. Que Dios me perdone si miento, y que Dios me proteja si digo la verdad.»",
    "El año pasado regresé a San Blas con mi hija de seis años. Salimos en lancha al amanecer, con un pescador amigo de la familia. Mi hija miraba el agua con la calma de los niños que todavía creen en todo. Le conté la historia del bisabuelo y la sirena. Cuando terminé, se quedó pensando un rato y dijo: «Papá, las sirenas no se ven dos veces. Por eso hay una historia y no diez.»",
    "No supe qué contestar. Algunos misterios mejoran cuando uno deja de explicarlos. Volvimos al muelle en silencio, escuchando solo el motor y el agua. Tal vez mi abuelo vio una foca. Tal vez vio a una mujer nadando antes del alba. Tal vez vio lo que dijo que vio. Lo único cierto es que, durante cincuenta y un años, mi abuelo cuidó esa historia como otros cuidan un anillo de bodas.",
  ],
  glossary: {
    San: ["San"], Blas: ["Blas"],
    Nayarit: ["Nayarit", "Pacific-coast state north of Puerto Vallarta — fishing villages, surf, mango orchards."],
    pescadores: ["fishermen"], zarpan: ["set sail (zarpar)"], amanecer: ["dawn"], abuelo: ["grandfather"],
    cincuenta: ["fifty"], juraba: ["swore (imperfect)"], mano: ["hand"], pecho: ["chest"],
    frente: ["facing"], imagen: ["image"],
    Virgen: ["Virgin", "La Virgen de Guadalupe — Mexico's patron saint; you swear by her here."],
    Guadalupe: ["Guadalupe"], madrugada: ["very early morning"], marzo: ["March"],
    sirena: ["mermaid"], niños: ["children"], nueve: ["nine"], preguntárselo: ["to ask him again"],
    carne: ["flesh"], cabello: ["hair"], negro: ["black"], cintura: ["waist"],
    verdes: ["green (pl.)"], agua: ["water"],
    cenote: ["cenote", "Sinkhole — known for impossibly clear water."],
    sentada: ["seated"], roca: ["rock"], Piedra: ["Stone"], Blanca: ["White"],
    Tigre: ["Tiger", "La Piedra Blanca del Tigre — a real landmark off San Blas."],
    Cantaba: ["was singing"], respondía: ["answered (imperfect)"], sonido: ["sound"], mar: ["sea"],
    supiera: ["knew (imperfect subjunctive)", "«Si supiera hablar» — counterfactual → imperfect subjunctive."],
    hablar: ["to speak"], padre: ["father"], ingeniero: ["engineer"], cree: ["believes"],
    cambiaba: ["was changing"], tema: ["topic"], empezaba: ["was starting"], abuela: ["grandmother"],
    creía: ["believed"], agregaba: ["added"], detalle: ["detail"], oía: ["heard / used to hear"],
    primera: ["first"], cola: ["tail"], plata: ["silver"], voz: ["voice"], olía: ["smelled"],
    sal: ["salt"], tristeza: ["sadness"], burles: ["mock (subjunctive)", "«No te burles» — negative tú command → subjunctive form."],
    advertía: ["warned"], reía: ["was laughing"], mentía: ["lied"], cartas: ["cards", "Card games — implying the grandfather cheated at cards."],
    murió: ["died"], ochenta: ["eighty"], heredé: ["I inherited"], lanchas: ["small boats"],
    red: ["net"], pescar: ["to fish"], camarón: ["shrimp"], libreta: ["small notebook"],
    sola: ["single / lone"], entrada: ["entry"], fechada: ["dated"], vi: ["I saw (preterite)"],
    debí: ["I should have (preterite)"], escribo: ["I write"], letras: ["letters"],
    suficientes: ["enough"],
    Dios: ["God", "«Que Dios me perdone» — a fixed religious oath; ojalá's cousin."],
    perdone: ["forgive (subjunctive)", "«Que Dios me perdone» — wish/blessing → subjunctive."],
    miento: ["I lie"], proteja: ["protects (subjunctive)"], digo: ["I say"], verdad: ["truth"],
    pasado: ["last / past"], regresé: ["I returned"], hija: ["daughter"], seis: ["six"],
    salimos: ["we went out (preterite)"], pescador: ["fisherman"], amigo: ["friend"],
    familia: ["family"], miraba: ["was looking at"], calma: ["calm"], creen: ["they believe"],
    bisabuelo: ["great-grandfather"], terminé: ["I finished"], pensando: ["thinking"],
    rato: ["a while"], papá: ["dad"], ven: ["are seen (verse)"], dos: ["two"], veces: ["times"],
    contestar: ["to answer"], misterios: ["mysteries"], mejoran: ["improve (mejorar)"],
    deja: ["leaves / stops (dejar)"], explicarlos: ["to explain them"], muelle: ["dock / pier"],
    silencio: ["silence"], escuchando: ["listening to"], motor: ["motor / engine"],
    tal: ["such"], vez: ["time", "«Tal vez» = perhaps."],
    foca: ["seal"], mujer: ["woman"], nadando: ["swimming"], alba: ["dawn"],
    único: ["only"], cierto: ["certain / true"], cuidó: ["cared for (cuidar)"],
    cuidan: ["care for"], anillo: ["ring"], bodas: ["weddings"],
  },
  questions: [
    { prompt: "¿Qué afirmaba haber visto el abuelo en marzo de 1971?", choices: ["Una sirena sentada sobre una roca", "Un barco fantasma", "Una ballena gigante", "Un naufragio con tesoro"], answer: "Una sirena sentada sobre una roca" },
    { prompt: "¿Qué encontró el nieto en la libreta del abuelo?", choices: ["Una sola entrada fechada el 17 de marzo de 1971", "Un diario completo de cincuenta años", "Un dibujo detallado de la sirena", "Un mapa al tesoro"], answer: "Una sola entrada fechada el 17 de marzo de 1971" },
    { prompt: "¿Qué dijo la hija del narrador sobre la historia?", choices: ["Las sirenas no se ven dos veces — por eso hay una historia y no diez", "Que era invento del bisabuelo", "Que ella también quería ver una", "Que las sirenas viven en el Caribe, no en Nayarit"], answer: "Las sirenas no se ven dos veces — por eso hay una historia y no diez" },
  ],
},
{
  id: "story-7",
  section: 2,
  title: "El último dominó",
  subtitle: "Una cantina en la Colonia Roma",
  paragraphs: [
    "La cantina La Covadonga lleva abierta desde 1947. Está en la avenida Puebla, en la Colonia Roma, y conserva todo lo que tenía cuando la fundaron unos asturianos que escapaban del franquismo: las mesas de madera maciza, los pisos de mosaico, el reloj de pared que adelanta tres minutos y, sobre todo, los dominós. Mil quinientos dominós, según el dueño actual. Suficientes para sustituir las fichas que los clientes, sin querer, se llevan en el bolsillo cuando salen.",
    "Don Ernesto tiene ochenta y cuatro años, llega todos los días a las cuatro de la tarde, se sienta en la misma mesa, pide el mismo tequila reposado y juega dominó con los mismos tres amigos desde 1973. «Aunque nos hubiéramos peleado a muerte», me explicó una vez, «aquí venimos. Esta mesa es más vieja que nuestros matrimonios.» En efecto, dos de los cuatro se han divorciado, uno se ha casado tres veces, y ninguno se ha perdido una partida.",
    "El dominó cubano se juega en parejas. Cada jugador recibe diez fichas. El silencio es parte del juego: solo se permite hablar entre rondas, y aun así, hay temas prohibidos por costumbre. No se habla de política con la primera copa, no se habla de los hijos casi nunca, no se habla del pasado a menos que el más viejo lo invoque. «Si habláramos de todo lo que sabemos los cuatro», me dijo Don Tito, el más joven —setenta y nueve años—, «se nos acabaría la amistad en una tarde.»",
    "Si yo no hubiera nacido en esta colonia, no entendería La Covadonga. Aquí los meseros tutean a los abogados, las botanas son gratis si pides bebida, y nadie se inmuta cuando entra un mariachi de paso a tocar dos canciones. La cantina nunca se moderniza porque sus clientes no lo permitirían. Hace cinco años, el dueño quiso poner pantallas para el fútbol. Don Ernesto dejó de venir tres semanas. Volvió cuando las pantallas se fueron.",
    "El año pasado murió Don Manuel, el cuarto miembro del grupo. Tenía ochenta y siete años y un cáncer que llevaba escondiendo dos. En su honor, los otros tres jugaron una partida sin pareja, repartiendo igualmente las diez fichas faltantes sobre el lugar vacío. Don Tito ganó. No celebraron. Don Ernesto sirvió cuatro tequilas, brindaron en silencio, y dejaron el cuarto sin tocar hasta que se evaporó solo.",
    "Si alguien me preguntara qué es lo más mexicano de México —no las pirámides, no el mariachi, no el mole—, yo diría: tres hombres viejos jugando dominó en silencio en una cantina centenaria, con un tequila intacto sobre la mesa, esperando a un amigo que no va a llegar.",
  ],
  glossary: {
    cantina: ["cantina", "Traditional working-man's bar — old, wood-paneled, no nonsense."],
    Covadonga: ["Covadonga", "Real cantina in Colonia Roma; an Asturian name."],
    abierta: ["open"], avenida: ["avenue"], Puebla: ["Puebla"],
    Colonia: ["Colonia", "CDMX neighborhood unit; Colonia Roma is the gentrified-cool one made famous by the film «Roma»."],
    Roma: ["Roma"], conserva: ["preserves"], fundaron: ["founded"],
    asturianos: ["Asturians", "Spanish region in the north — many fled to Mexico after the Civil War."],
    escapaban: ["were fleeing"],
    franquismo: ["Francoism", "Franco's dictatorship in Spain, 1939–1975."],
    mesas: ["tables"], madera: ["wood"], maciza: ["solid"], pisos: ["floors"],
    mosaico: ["tile mosaic"], reloj: ["clock"], pared: ["wall"], adelanta: ["runs fast"],
    sobre: ["above / on"], dominós: ["dominoes"], mil: ["thousand"], quinientos: ["five hundred"],
    dueño: ["owner"], actual: ["current"], suficientes: ["enough"], sustituir: ["to replace"],
    fichas: ["tiles / chips"], clientes: ["customers"], querer: ["to mean / want"],
    bolsillo: ["pocket"], salen: ["leave"], don: ["honorific for older man"],
    Ernesto: ["Ernesto"], ochenta: ["eighty"], cuatro: ["four"], tarde: ["afternoon"],
    sienta: ["sits down"], pide: ["asks for / orders"], tequila: ["tequila"],
    reposado: ["rested (tequila aged 2 mos–1 yr)"], juega: ["plays"], amigos: ["friends"],
    hubiéramos: ["had (imperfect subjunctive)", "«Aunque nos hubiéramos peleado» — hypothetical past with aunque."],
    peleado: ["fought (participle)"], muerte: ["death"], explicó: ["explained"],
    vieja: ["old"], matrimonios: ["marriages"], efecto: ["effect", "«En efecto» = indeed / in fact."],
    divorciado: ["divorced (participle)"], casado: ["married"], perdido: ["missed (participle)"],
    partida: ["game / round"], cubano: ["Cuban", "Cuban dominó: 10 tiles each, two-player teams — the standard in Mexico City cantinas."],
    juega2: ["is played"], parejas: ["pairs / teams"], jugador: ["player"], recibe: ["receives"],
    diez: ["ten"], silencio: ["silence"], parte: ["part"], permite: ["allows"],
    hablar: ["to speak"], rondas: ["rounds"], temas: ["topics"], prohibidos: ["prohibited"],
    costumbre: ["custom"], política: ["politics"], copa: ["drink / cup"], hijos: ["children"],
    pasado: ["past"], menos: ["unless", "«A menos que» = unless → subjunctive."],
    invoque: ["invokes (subjunctive)", "Triggered by «a menos que»."],
    habláramos: ["we spoke (imperfect subjunctive)", "«Si habláramos» — counterfactual."],
    sabemos: ["we know"], dijo: ["said"], Tito: ["Tito"], joven: ["young"], setenta: ["seventy"],
    nueve: ["nine"], acabaría: ["would end (conditional)"], amistad: ["friendship"],
    hubiera: ["had (imperfect subjunctive)"],
    nacido: ["born (participle)"], colonia: ["neighborhood"], entendería: ["would understand"],
    meseros: ["waiters"], tutean: ["address as «tú»", "Cantina egalitarianism — even lawyers get tutored here."],
    abogados: ["lawyers"], botanas: ["snacks", "Free snacks brought with each drink — a cantina ritual."],
    gratis: ["free"], pides: ["you order"], bebida: ["drink"], inmuta: ["flinches (inmutarse)"],
    entra: ["enters"], mariachi: ["mariachi"], paso: ["passing"], tocar: ["to play"],
    canciones: ["songs"], moderniza: ["modernizes"], permitirían: ["would allow"],
    años: ["years"], quiso: ["wanted (preterite)"], poner: ["to put"], pantallas: ["screens"],
    fútbol: ["football / soccer"], dejó: ["stopped (dejar de)"], semanas: ["weeks"],
    volvió: ["returned"], pantallas2: ["screens"], fueron: ["went"], murió: ["died"],
    Manuel: ["Manuel"], cuarto: ["fourth"], miembro: ["member"], grupo: ["group"],
    siete: ["seven"], cáncer: ["cancer"], escondiendo: ["hiding"], honor: ["honor"],
    pareja: ["partner"], repartiendo: ["dealing out"], igualmente: ["equally"],
    faltantes: ["missing"], lugar: ["place / seat"], vacío: ["empty"], ganó: ["won"],
    celebraron: ["celebrated"], sirvió: ["served"], brindaron: ["toasted"],
    tocar2: ["to touch"], evaporó: ["evaporated"], preguntara: ["asked (imperfect subjunctive)", "«Si alguien me preguntara» — counterfactual conditional."],
    pirámides: ["pyramids"], diría: ["would say"], hombres: ["men"], viejos: ["old (pl.)"],
    centenaria: ["century-old"], intacto: ["untouched"], esperando: ["waiting for"], llegar: ["to arrive"],
  },
  questions: [
    { prompt: "¿Cómo se juega el dominó cubano según el cuento?", choices: ["En parejas, con diez fichas por jugador y mucho silencio", "Solo entre dos personas", "Con veinte fichas por jugador", "Hablando todo el tiempo"], answer: "En parejas, con diez fichas por jugador y mucho silencio" },
    { prompt: "¿Qué pasó cuando el dueño quiso poner pantallas de fútbol?", choices: ["Don Ernesto dejó de venir y solo volvió cuando se las quitaron", "Atrajo a más clientes jóvenes", "Las pantallas se descompusieron rápidamente", "Los clientes votaron y aceptaron"], answer: "Don Ernesto dejó de venir y solo volvió cuando se las quitaron" },
    { prompt: "¿Cómo honraron a Don Manuel después de su muerte?", choices: ["Jugaron una partida sin pareja y dejaron su tequila intacto", "Cerraron la cantina por un día", "Pusieron una placa en su mesa", "Llevaron sus cenizas al lugar"], answer: "Jugaron una partida sin pareja y dejaron su tequila intacto" },
  ],
},
{
  id: "story-8",
  section: 2,
  title: "El grito de mi padre",
  subtitle: "Independencia en una colonia obrera",
  paragraphs: [
    "Cada 15 de septiembre, mi padre se transformaba. Era cajero de banco, hombre tranquilo, de los que doblan el periódico en cuartos antes de leerlo. Pero esa noche, alrededor de las once, se ponía la guayabera blanca, mojaba el peine en agua y se peinaba hacia atrás como si fuera 1962, y bajaba al patio de la unidad habitacional con una sola misión: dar el grito de Independencia más fuerte de toda la colonia Nezahualcóyotl.",
    "El grito —para los que no lo conozcan— es un ritual nocturno. A las once en punto, el presidente sale al balcón de Palacio Nacional y grita los nombres de los héroes de la Independencia: «¡Viva Hidalgo! ¡Viva Morelos! ¡Viva México!» Y la multitud responde a cada uno con un «¡Viva!» que es más rugido que respuesta. La transmisión llega por televisión a cada casa. Y en cada casa, alguien repite el grito en la sala. Pero en la colonia obrera donde yo crecí, el grito era comunitario. Bajábamos al patio, prendíamos los radios, descorchábamos botellas de tequila y esperábamos.",
    "Mi padre se había practicado el grito todo septiembre. En la regadera, en el coche, antes de dormir. Mi madre se burlaba: «Como si fueras a postularte para presidente.» Pero él tomaba el ritual en serio. «Si la patria se hubiera independizado sola», decía, «no tendríamos que gritar. Como nos costó sangre, gritamos.»",
    "Recuerdo el grito de 1987. Yo tenía diez años. Mi padre se subió a un cajón de cerveza vacío. Tenía la guayabera planchada, el bigote recortado y un tequila en la mano. Cuando llegó el momento de gritar «¡Viva México!», soltó un alarido que rompió la quietud de la colonia. Los perros aullaron en respuesta. Las señoras se persignaron. El señor Ramírez, del 4-B, dijo: «Don Beto, ese grito se oyó hasta Texcoco.» Mi padre se rio. Era el cumplido más grande de su vida.",
    "Lo que entendí después, mucho después —cuando mi padre ya había muerto y yo daba el grito en mi propia casa, frente a mis hijos—, es que el grito no era nacionalismo. Para mi padre, que ganaba lo justo, que pagaba la renta con esfuerzo, que veía cómo el país se hundía y volvía a flotar, gritar el 15 de septiembre era decir: «Yo todavía estoy aquí. Todavía creo en algo. La vida me costó, pero no me rindo.»",
    "Mis hijos se ríen cuando yo doy el grito. Dicen que exagero, que parezco loco, que los vecinos van a llamar a la policía. Yo les digo, igual que mi padre me decía: «Algún día lo entenderán. Por ahora, levanten la copa y respondan: ¡Viva México!»",
  ],
  glossary: {
    septiembre: ["September"], transformaba: ["transformed"], cajero: ["teller"], banco: ["bank"],
    hombre: ["man"], tranquilo: ["calm"], doblan: ["fold (doblar)"], periódico: ["newspaper"],
    cuartos: ["quarters"], leerlo: ["to read it"], once: ["eleven"], ponía: ["was putting on"],
    guayabera: ["guayabera shirt", "Embroidered linen dress shirt, classic for warm-weather formal."],
    mojaba: ["was wetting"], peine: ["comb"], agua: ["water"], peinaba: ["was combing"],
    atrás: ["backwards"], bajaba: ["was going down"], patio: ["courtyard"],
    unidad: ["unit"], habitacional: ["housing", "Unidad habitacional: working-class apartment block, post-1950s urban Mexico."],
    misión: ["mission"], grito: ["shout / cry",
    "«El Grito»: the September 16 reenactment of Hidalgo's 1810 call to revolt. The president does it Sept 15 at 11pm; every town and home does it too."],
    fuerte: ["loud / strong"], colonia: ["neighborhood"],
    Nezahualcóyotl: ["Nezahualcóyotl", "Massive working-class municipality on the eastern edge of CDMX."],
    conozcan: ["know (subjunctive)", "«Para los que no lo conozcan» — relative clause for unknown referent → subjunctive."],
    ritual: ["ritual"], nocturno: ["nocturnal"], presidente: ["president"], sale: ["comes out"],
    balcón: ["balcony"],
    Palacio: ["Palace", "Palacio Nacional — seat of executive government on the Zócalo in CDMX."],
    Nacional: ["National"], grita: ["shouts"], nombres: ["names"], héroes: ["heroes"],
    Independencia: ["Independence"],
    Hidalgo: ["Hidalgo", "Miguel Hidalgo — the priest who rang the bell of revolt in 1810."],
    Morelos: ["Morelos", "José María Morelos — the second great leader of the independence war."],
    Viva: ["Long live"], multitud: ["crowd"], responde: ["responds"], rugido: ["roar"],
    respuesta: ["answer"], transmisión: ["broadcast"], llega: ["arrives"], televisión: ["television"],
    casa: ["house"], alguien: ["someone"], repite: ["repeats"], sala: ["living room"],
    obrera: ["working-class (f.)"], crecí: ["I grew up"], comunitario: ["communal"],
    bajábamos: ["we went down"], prendíamos: ["we turned on"], radios: ["radios"],
    descorchábamos: ["we uncorked"], botellas: ["bottles"], tequila: ["tequila"],
    esperábamos: ["we waited"], practicado: ["practiced (participle)"], regadera: ["shower"],
    coche: ["car"], dormir: ["to sleep"], madre: ["mother"], burlaba: ["teased (burlarse)"],
    fueras: ["you were (imperfect subjunctive)", "«Como si fueras» — «as if» → imperfect subjunctive."],
    postularte: ["to run (for office)"], serio: ["serious"], patria: ["homeland"],
    hubiera: ["had (imperfect subjunctive)"],
    independizado: ["become independent (participle)"], sola: ["alone"], tendríamos: ["we would have"],
    gritar: ["to shout"], costó: ["it cost"], sangre: ["blood"], gritamos: ["we shout"],
    recuerdo: ["I remember"], diez: ["ten"], subió: ["got up onto"], cajón: ["crate"],
    cerveza: ["beer"], vacío: ["empty"], planchada: ["pressed / ironed"], bigote: ["moustache"],
    recortado: ["trimmed"], mano: ["hand"], momento: ["moment"], soltó: ["let out (soltar)"],
    alarido: ["howl / cry"], rompió: ["broke"], quietud: ["stillness"], perros: ["dogs"],
    aullaron: ["howled (aullar)"], señoras: ["ladies"], persignaron: ["crossed themselves"],
    señor: ["mister / sir"], Ramírez: ["Ramírez"],
    Beto: ["Beto", "Short for Alberto / Roberto / Norberto. Don Beto: classic informal honorific."],
    oyó: ["was heard"],
    Texcoco: ["Texcoco", "Another town in the metro area, far enough to be a joke."],
    cumplido: ["compliment"], grande: ["big"], vida: ["life"], entendí: ["I understood"],
    después: ["after"], muerto: ["died (participle)"], propia: ["own"], hijos: ["children"],
    nacionalismo: ["nationalism"], ganaba: ["earned"], justo: ["just enough"],
    pagaba: ["paid"], renta: ["rent"], esfuerzo: ["effort"], veía: ["saw / used to see"],
    hundía: ["was sinking"], volvía: ["was returning"], flotar: ["to float"], creo: ["I believe"],
    algo: ["something"], rindo: ["I give up (rendirse)"], ríen: ["laugh"], exagero: ["I exaggerate"],
    parezco: ["I seem (parecer)"], loco: ["crazy"], vecinos: ["neighbors"], llamar: ["to call"],
    policía: ["police"], día: ["day"], entenderán: ["they will understand"], copa: ["glass / cup"],
    respondan: ["respond (subjunctive command)", "Polite ustedes command — subjunctive form."],
    México: ["Mexico"],
  },
  questions: [
    { prompt: "¿Qué transformación sufría el padre cada 15 de septiembre?", choices: ["De cajero tranquilo pasaba a dar el grito más fuerte de la colonia", "Se convertía en mariachi por una noche", "Salía a marchar con los manifestantes", "Trabajaba doble turno en el banco"], answer: "De cajero tranquilo pasaba a dar el grito más fuerte de la colonia" },
    { prompt: "Según el padre, ¿por qué hay que gritar el 15 de septiembre?", choices: ["Porque la independencia costó sangre y no se ganó sola", "Porque es una orden del gobierno", "Porque los vecinos lo esperan", "Porque así se ahuyenta a los malos espíritus"], answer: "Porque la independencia costó sangre y no se ganó sola" },
    { prompt: "¿Qué entendió el narrador años después sobre el grito de su padre?", choices: ["Era una forma de decir «todavía estoy aquí, todavía creo en algo»", "Era principalmente una excusa para beber tequila", "Era una imitación de los políticos", "Era una broma familiar sin sentido profundo"], answer: "Era una forma de decir «todavía estoy aquí, todavía creo en algo»" },
  ],
},
{
  id: "story-9",
  section: 2,
  title: "Las cerezas de don Adán",
  subtitle: "Café de altura en Chiapas",
  paragraphs: [
    "Si usted alguna vez se ha tomado un café de Chiapas en una cafetería de Brooklyn —de esos que cuestan seis dólares y vienen con notas de cata escritas con letra cursiva—, es posible que las cerezas que dieron origen a ese café las haya recolectado don Adán Pérez Sántiz, en una ladera a 1,800 metros sobre el nivel del mar, en el municipio tzotzil de San Juan Cancuc.",
    "Don Adán tiene cincuenta y nueve años, mide un metro cincuenta y cinco y carga cinco kilos de cerezas de café en una canasta de mimbre colgada al pecho durante diez horas al día, seis días a la semana, dos meses al año. Cada cereza la recolecta a mano, una por una, eligiendo solo las que están perfectamente rojas. Las verdes maduran después. Las negras ya pasaron su punto. Una cereza demasiado madura o demasiado verde estropea todo el lote.",
    "Conocí a don Adán en 2019. Mi reportaje era sobre el comercio justo, una etiqueta que aparece en muchas bolsas de café gourmet. Le pregunté qué pensaba del comercio justo. Sonrió con la cortesía que tienen los hombres mayores cuando un periodista urbano les hace una pregunta condescendiente. «Mire, joven. Por cada kilo de café que entrego a la cooperativa, recibo entre quince y veinte pesos. Su café en Brooklyn cuesta seis dólares la taza, ¿no? Eso es como ciento veinte pesos. Una taza usa veinte gramos. Las matemáticas no me favorecen.»",
    "Aun así, don Adán seguía cosechando, y lo hacía con un orgullo que no admitía lástima. Su café era reconocido. Había ganado dos veces el concurso regional de la taza de excelencia. Una empresa japonesa le había ofrecido comprar su cosecha completa a precio premium, pero él se había negado: «Si vendo todo a una sola empresa, dependo de una sola empresa. Mis abuelos no sobrevivieron quinientos años para que yo regalara mi independencia por un precio mejor.»",
    "Cuando regresé en 2024, le entregué un libro: el reportaje publicado, con su foto en la portada. Lo hojeó despacio. No sabía leer en español más que con dificultad —su primera lengua es el tzotzil—, pero entendió las imágenes. Se detuvo en una foto donde aparecía sosteniendo una cereza perfectamente roja entre el pulgar y el índice. Sonrió. «Esa», dijo. «Esa era una cereza buena. Las buenas no se olvidan.»",
    "El cambio climático le preocupa más que los mercados. Las heladas llegan en fechas que antes no llegaban. La roya del café —un hongo— sube cada año a altitudes donde antes no podía. Don Adán cree que en veinte años Chiapas ya no producirá café como lo conocemos. «Pero alguien lo producirá en otra montaña, más alta», dice. «El café siempre encuentra su lugar. Los hombres también.»",
  ],
  glossary: {
    Chiapas: ["Chiapas", "Mexico's southernmost state — Maya highlands, coffee, conflict."],
    café: ["coffee"], cafetería: ["café"], Brooklyn: ["Brooklyn"], cuestan: ["cost"],
    dólares: ["dollars"], notas: ["notes"], cata: ["tasting"], escritas: ["written"],
    letra: ["letter / script"], cursiva: ["cursive"], posible: ["possible"], cerezas: ["cherries",
    "«Cerezas de café»: the coffee fruit. Inside each is the bean."],
    dieron: ["gave (preterite)"], origen: ["origin"], recolectado: ["harvested (participle)"],
    don: ["honorific for older man"], Adán: ["Adán"], Pérez: ["Pérez"],
    Sántiz: ["Sántiz", "Tzotzil-Maya surname pattern: Spanish first name + Maya patronymic."],
    ladera: ["mountainside"], metros: ["meters"], sobre: ["above"], nivel: ["level"], mar: ["sea"],
    municipio: ["municipality"],
    tzotzil: ["Tzotzil", "Maya indigenous people of highland Chiapas; ~400,000 speakers."],
    San: ["San"], Juan: ["Juan"],
    Cancuc: ["Cancuc", "Tzotzil municipality with a long history of resistance."],
    cincuenta: ["fifty"], nueve: ["nine"], mide: ["measures (height)"], cinco: ["five"],
    carga: ["carries"], kilos: ["kilos"], canasta: ["basket"], mimbre: ["wicker"],
    colgada: ["hanging"], pecho: ["chest"], diez: ["ten"], horas: ["hours"], semana: ["week"],
    meses: ["months"], año: ["year"], recolecta: ["harvests"], mano: ["hand"],
    eligiendo: ["choosing"], rojas: ["red (pl.)"], verdes: ["green (pl.)"], maduran: ["ripen"],
    después: ["later"], negras: ["black (pl.)"], pasaron: ["passed"], punto: ["point / peak"],
    demasiado: ["too / too much"], madura: ["ripe"], estropea: ["spoils"], lote: ["lot / batch"],
    conocí: ["I met (preterite)"], reportaje: ["news story"],
    comercio: ["trade", "«Comercio justo» = fair trade — the certification."],
    justo: ["just / fair"], etiqueta: ["label"], aparece: ["appears"], bolsas: ["bags"],
    gourmet: ["gourmet"], pensaba: ["thought"], sonrió: ["smiled (preterite)"], cortesía: ["politeness"],
    mayores: ["older (pl.)"], periodista: ["journalist"], urbano: ["urban"],
    condescendiente: ["condescending"], mire: ["look (Ud. command)", "Polite imperative."],
    joven: ["young / young man"], kilo: ["kilo"], entrego: ["I deliver"],
    cooperativa: ["cooperative", "Coffee co-ops are the legal/economic backbone of small-farmer coffee in Latin America."],
    recibo: ["I receive"], pesos: ["pesos"], taza: ["cup"], ciento: ["hundred"], veinte: ["twenty"],
    usa: ["uses"], gramos: ["grams"], matemáticas: ["mathematics"], favorecen: ["favor"],
    seguía: ["kept (seguir)"], cosechando: ["harvesting"], orgullo: ["pride"],
    admitía: ["admitted (imperfect)"], lástima: ["pity"], reconocido: ["recognized"],
    ganado: ["won (participle)"], veces: ["times"], concurso: ["competition"], regional: ["regional"],
    excelencia: ["excellence", "Cup of Excellence — international quality competition."],
    empresa: ["company"], japonesa: ["Japanese", "Japan pays huge premiums for top-tier specialty coffee."],
    ofrecido: ["offered (participle)"], comprar: ["to buy"], cosecha: ["harvest"], completa: ["complete"],
    precio: ["price"], premium: ["premium"], negado: ["refused (participle)"], vendo: ["I sell"],
    dependo: ["I depend"], abuelos: ["ancestors / grandparents"], sobrevivieron: ["survived"],
    quinientos: ["five hundred"],
    regalara: ["gave away (imperfect subjunctive)", "«Para que yo regalara» — purpose in the past → imperfect subjunctive."],
    independencia: ["independence"], mejor: ["better"], regresé: ["I returned"],
    entregué: ["I delivered (preterite)"], libro: ["book"], publicado: ["published (participle)"],
    foto: ["photo"], portada: ["cover"], hojeó: ["leafed through"], despacio: ["slowly"],
    sabía: ["knew"], leer: ["to read"], dificultad: ["difficulty"], lengua: ["tongue / language"],
    imágenes: ["images"], detuvo: ["stopped"], aparecía: ["appeared"], sosteniendo: ["holding"],
    pulgar: ["thumb"], índice: ["index finger"], olvidan: ["are forgotten (olvidarse)"],
    cambio: ["change"], climático: ["climatic"], preocupa: ["worries (preocupar)"],
    mercados: ["markets"], heladas: ["frosts"], llegan: ["arrive"], fechas: ["dates"],
    antes: ["before"], roya: ["coffee rust", "Hemileia vastatrix — the fungus devastating Latin American coffee."],
    hongo: ["fungus"], sube: ["climbs"], altitudes: ["altitudes"], cree: ["believes"],
    producirá: ["will produce"], conocemos: ["we know"], alguien: ["someone"],
    producirá2: ["will produce"], montaña: ["mountain"], alta: ["high"], encuentra: ["finds"],
    lugar: ["place"], hombres: ["men"],
  },
  questions: [
    { prompt: "¿Cuánto recibe don Adán por cada kilo de café que entrega a la cooperativa?", choices: ["Entre quince y veinte pesos", "Seis dólares", "Cien pesos", "Veinte gramos"], answer: "Entre quince y veinte pesos" },
    { prompt: "¿Por qué se negó a vender toda su cosecha a una sola empresa japonesa?", choices: ["Porque no quería depender de una sola empresa", "Porque la empresa no pagaba bien", "Porque la cooperativa no se lo permitía", "Porque la cosecha era demasiado pequeña"], answer: "Porque no quería depender de una sola empresa" },
    { prompt: "¿Qué le preocupa más a don Adán que los precios del mercado?", choices: ["El cambio climático y la roya del café", "La falta de obreros para la cosecha", "El precio de la canasta de mimbre", "Los periodistas urbanos"], answer: "El cambio climático y la roya del café" },
  ],
},
];

const STORY_EXTRAS = {
  "story-0": {
    collectible: { es: "Vela de ofrenda", en: "Ofrenda candle" },
    keyWords: ["muerte", "muerto", "cempasúchil", "ofrenda", "panteón", "platicar", "olvido", "ojalá"],
    en: [
      "When the narrator was a child, his grandmother taught him that death visits like family and should be welcomed with food, music, and a clean house.",
      "By late October the town changed: markets filled with sugar skulls, pan de muerto, marigolds, copal, and everything needed for a serious ofrenda.",
      "On November 1 they built the altar with photos, candles, paths of petals, and offerings for each dead relative.",
      "On November 2 they crossed to Janitzio, where families sat by graves telling stories, eating, laughing, and remembering.",
      "The grandmother says the dead return while their names are spoken; forgetting is the only true death.",
      "Now the narrator builds the ofrenda for his own grandmother and hopes someone will say his name one day too.",
    ],
    checkpoints: [
      { q: "What does the grandmother believe about death?", a: "It visits once a year", choices: ["It visits once a year", "It never returns", "It only brings sadness"] },
      { q: "Which item guides the dead by scent?", a: "Cempasúchil", choices: ["Cempasúchil", "Sugar skulls", "Tequila"] },
      { q: "What does the family build on November 1?", a: "An ofrenda", choices: ["An ofrenda", "A boat", "A market stall"] },
      { q: "What is the mood at the cemetery?", a: "Warm and communal", choices: ["Warm and communal", "Silent and empty", "Angry"] },
      { q: "What is the only true death?", a: "Forgetting", choices: ["Forgetting", "Old age", "The cemetery"] },
      { q: "What does the narrator hope for?", a: "To be remembered", choices: ["To be remembered", "To leave Mexico", "To sell the house"] },
    ],
  },
  "story-1": {
    collectible: { es: "Espejo de la Casa Azul", en: "Casa Azul mirror" },
    keyWords: ["coyoacán", "accidente", "caballete", "espejo", "recámara", "muralista", "tehuana", "xoloitzcuintles"],
    en: [
      "The Casa Azul in Coyoacán is Frida Kahlo's blue childhood home, now a museum worth waiting to enter.",
      "After a terrible accident, Frida painted from bed using a special easel and mirror, becoming her own model.",
      "Walking through the Casa Azul reveals her kitchen, studio, brushes, garden, and bedroom mirror.",
      "Her relationship with Diego Rivera was intense; she called him one of the two great accidents of her life.",
      "Frida was more than pain: witty, funny, political, surrounded by animals, folk art, and Tehuana dress.",
      "Near death she painted vivid watermelons with the words 'Viva la vida,' leaving a final statement of life.",
    ],
    checkpoints: [
      { q: "What is the Casa Azul today?", a: "A museum", choices: ["A museum", "A hotel", "A school"] },
      { q: "How did Frida paint while immobilized?", a: "With an easel and mirror", choices: ["With an easel and mirror", "On a bus", "In Diego's studio"] },
      { q: "Which room still has the mirror?", a: "Her bedroom", choices: ["Her bedroom", "The kitchen", "The patio"] },
      { q: "Who was Diego Rivera?", a: "A muralist", choices: ["A muralist", "A doctor", "A photographer"] },
      { q: "Which animals appear in the story?", a: "Spider monkeys and xolos", choices: ["Spider monkeys and xolos", "Horses and cats", "Parrots only"] },
      { q: "What final phrase does the story emphasize?", a: "Viva la vida", choices: ["Viva la vida", "Casa Azul", "Adiós"] },
    ],
  },
  "story-2": {
    collectible: { es: "Mapa de cenote", en: "Cenote map" },
    keyWords: ["bloqueador", "padre", "cenote", "inframundo", "transparente", "debido", "obstante", "hágale"],
    en: [
      "The narrator arrives in Cancún planning to stay on the beach, but Mexico ruins simple plans in the best way.",
      "A taxi driver challenges him to see the hidden rivers beneath Maya land instead of only the beach.",
      "At a cenote near Valladolid, he learns these sinkholes connect underground waters and were sacred to the Maya.",
      "Swimming there feels otherworldly: clear water, fish, sunbeams, and roots descending from above.",
      "At Chichén Itzá, Kukulcán's pyramid becomes a stone calendar and light trick designed by ancient astronomers.",
      "Back in Cancún, the beach feels different because he now understands the deeper country beneath it.",
    ],
    checkpoints: [
      { q: "What was the original plan?", a: "Stay on the beach", choices: ["Stay on the beach", "Visit ruins", "Take Spanish classes"] },
      { q: "Who changes the narrator's plan?", a: "Don Arturo", choices: ["Don Arturo", "A hotel manager", "A lifeguard"] },
      { q: "What is a cenote?", a: "A natural freshwater sinkhole", choices: ["A natural freshwater sinkhole", "A pyramid", "A beach club"] },
      { q: "Why does the cenote feel magical?", a: "Clear water and sunbeams", choices: ["Clear water and sunbeams", "Loud music", "Colored lights"] },
      { q: "Why is Kukulcán's pyramid a calendar?", a: "It has 365 steps", choices: ["It has 365 steps", "It has twelve rooms", "It shows the moon"] },
      { q: "What does the narrator learn?", a: "There is a deeper Mexico beneath the beach", choices: ["There is a deeper Mexico beneath the beach", "The beach is boring", "Cancún has no history"] },
    ],
  },
};

const STORY_META = {
  "story-0": { place: "Pátzcuaro", x: 50, y: 56, souvenir: { es: "Vela de ofrenda", en: "Ofrenda candle" } },
  "story-1": { place: "Coyoacán", x: 53, y: 49, souvenir: { es: "Espejo azul", en: "Blue mirror" } },
  "story-2": { place: "Cancún", x: 82, y: 57, souvenir: { es: "Mapa de cenote", en: "Cenote map" } },
  "story-3": { place: "Arena México", x: 52, y: 49, souvenir: { es: "Máscara plateada", en: "Silver mask" } },
  "story-4": { place: "Oaxaca", x: 60, y: 62, souvenir: { es: "Cuchara de mole", en: "Mole spoon" } },
  "story-5": { place: "Tijuana", x: 12, y: 18, souvenir: { es: "Pase fronterizo", en: "Border pass" } },
  "story-6": { place: "San Blas", x: 37, y: 42, souvenir: { es: "Concha del Pacífico", en: "Pacific shell" } },
  "story-7": { place: "Colonia Roma", x: 52, y: 49, souvenir: { es: "Ficha de dominó", en: "Domino tile" } },
  "story-8": { place: "Colonia obrera", x: 51, y: 50, souvenir: { es: "Campana del grito", en: "Grito bell" } },
  "story-9": { place: "Chiapas", x: 68, y: 72, souvenir: { es: "Cereza de café", en: "Coffee cherry" } },
};

const TODAY_SCENES = [
  {
    id: "taqueria",
    title: "Noche de faroles",
    titleEn: "Night of lanterns",
    city: "San Miguel",
    still: "stills/sma-lanterns.png",
    color: D.green,
    dark: D.greenDark,
    host: "luna",
    storyId: "story-7",
    units: ["mex", "pronombres", "porpara"],
    setup: "La plaza se llena de faroles y nadie tiene prisa.",
    setupEn: "The plaza fills with lanterns and nobody is in a hurry.",
    line: "¿Con todo, joven, o se lo preparo sin cebolla?",
    answers: ["¿Con todo, joven, o se lo preparo sin cebolla?", "Con todo, joven, o se lo preparo sin cebolla"],
    explain: "«Con todo» is the taco-counter shortcut. «Se lo preparo» packs indirect + direct pronouns into one natural service phrase.",
    question: "Si el taquero pregunta «¿con todo?», normalmente habla de:",
    questionEn: "If the taco cook asks «¿con todo?», they usually mean:",
    choices: ["cilantro, cebolla, salsa y guarnición", "la cuenta con propina", "una orden para llevar"],
    answer: "cilantro, cebolla, salsa y guarnición",
  },
  {
    id: "landlord",
    title: "WhatsApp del casero",
    titleEn: "Landlord WhatsApp",
    city: "Roma Norte",
    color: D.purple,
    dark: D.purpleDark,
    host: "valeria",
    storyId: "story-1",
    units: ["registro", "porpara", "pronombres2"],
    setup: "El casero pide depósito y aval hoy. Contéstale sin sonar de manual.",
    setupEn: "Landlord wants deposit and guarantor today. Answer without sounding like a textbook.",
    line: "Oye, ¿el depósito cuenta para el último mes?",
    answers: ["Oye, ¿el depósito cuenta para el último mes?", "Oye, ¿el depósito cuenta para el último mes de renta?"],
    explain: "WhatsApp casero: corto, claro, sin correo formal.",
    question: "En WhatsApp con el casero, «Oye, ¿el depósito cuenta…?» suena:",
    questionEn: "On WhatsApp with the landlord, «Oye, ¿el depósito cuenta…?» sounds:",
    choices: ["natural y firme", "de correo formal", "agresivo"],
    answer: "natural y firme",
  },
  {
    id: "airport",
    title: "Mostrador en caos",
    titleEn: "Airport Counter Chaos",
    city: "Cancún",
    color: D.blue,
    dark: D.blueDark,
    host: "diego",
    storyId: "story-2",
    units: ["pret", "conectores", "registro"],
    setup: "Tu vuelo cambió de puerta dos veces. Diego dice que respires, pero lo dice compitiendo.",
    setupEn: "Your gate changed twice. Diego says breathe, but somehow competitively.",
    line: "Mi vuelo fue cancelado; sin embargo, necesito llegar hoy mismo.",
    answers: ["Mi vuelo fue cancelado; sin embargo, necesito llegar hoy mismo", "Mi vuelo fue cancelado, sin embargo necesito llegar hoy mismo"],
    explain: "A clean connector turns complaint into a usable request.",
    question: "«Sin embargo» introduce:",
    questionEn: "«Sin embargo» introduces:",
    choices: ["contraste", "causa", "destino"],
    answer: "contraste",
  },
  {
    id: "family",
    title: "Cena con la suegra",
    titleEn: "Dinner With the In-Laws",
    city: "Pátzcuaro",
    color: D.gold,
    dark: D.goldDark,
    host: "rafa",
    storyId: "story-0",
    units: ["siclauses", "mex", "pret"],
    setup: "Alguien pregunta algo demasiado personal justo cuando llega el postre.",
    setupEn: "Someone asks something way too personal exactly when dessert arrives.",
    line: "Cuando llegue el momento, se lo vamos a contar con mucho gusto.",
    answers: ["Cuando llegue el momento, se lo vamos a contar con mucho gusto", "Cuando llegue el momento se lo vamos a contar con mucho gusto"],
    explain: "Future «cuando» takes subjunctive: llegue. «Se lo» keeps the answer diplomatic.",
    question: "En «Cuando llegue el momento…», usamos subjuntivo porque:",
    questionEn: "In «Cuando llegue el momento…», subjunctive appears because:",
    choices: ["habla de un momento futuro", "describe una rutina pasada", "es una orden"],
    answer: "habla de un momento futuro",
  },
];

const PHRASE_DOCTOR = [
  {
    awkward: "Estoy emocionado para verte.",
    natural: "Tengo muchas ganas de verte.",
    formal: "Me dará mucho gusto verlo/la.",
    text: "¡Qué ganas de verte!",
    diagnosis: "In Spanish, «emocionado para» sounds translated from English. «Tener ganas de» carries the warm anticipation.",
    skill: "Naturalidad",
  },
  {
    awkward: "¿Puedo obtener un café?",
    natural: "¿Me da un café, por favor?",
    formal: "¿Podría darme un café, por favor?",
    text: "¿Me das un café?",
    diagnosis: "«Obtener» is technically possible, but it sounds like paperwork. At a counter, use «me da / me das».",
    skill: "Vida diaria",
  },
  {
    awkward: "Necesito hacer una decisión.",
    natural: "Necesito tomar una decisión.",
    formal: "Debo tomar una decisión.",
    text: "Tengo que decidir.",
    diagnosis: "Spanish takes decisions instead of making them: «tomar una decisión».",
    skill: "Colocaciones",
  },
  {
    awkward: "Estoy esperando por ti.",
    natural: "Te estoy esperando.",
    formal: "Lo/la estoy esperando.",
    text: "Aquí te espero.",
    diagnosis: "For people, «esperar a alguien» becomes direct object pronouns: «te espero», not «espero por ti» in neutral Mexican Spanish.",
    skill: "Pronombres",
  },
  {
    awkward: "Eso hace sentido.",
    natural: "Eso tiene sentido.",
    formal: "Eso resulta lógico.",
    text: "Sí, tiene sentido.",
    diagnosis: "Classic translation trap: English makes sense; Spanish has sense.",
    skill: "Trampa de traducción",
  },
  {
    awkward: "Voy a aplicar para el trabajo.",
    natural: "Voy a postularme al trabajo.",
    formal: "Voy a presentar mi solicitud para el puesto.",
    text: "Voy a mandar mi solicitud.",
    diagnosis: "«Aplicar» is spreading, but «postularse» or «mandar solicitud» sounds cleaner and more professional.",
    skill: "Registro",
  },
];

const SAFE_RISKY_ITEMS = [
  {
    phrase: "No manches.",
    context: { es: "Tu amigo te cuenta que pagó $300 por dos cafés.", en: "Your friend says they paid $300 for two coffees." },
    answer: "casual",
    note: { es: "Muy natural con amigos en México; demasiado informal para jefes o personas mayores.", en: "Very natural with friends in Mexico; too informal for bosses or elders." },
  },
  {
    phrase: "Quedo a sus órdenes.",
    context: { es: "Cierras un correo con una clienta.", en: "You are closing an email to a client." },
    answer: "formal",
    note: { es: "Fórmula profesional mexicana: amable, servicial y segura.", en: "A professional Mexican closing: polite, helpful, and safe." },
  },
  {
    phrase: "¿Mande?",
    context: { es: "No escuchaste lo que dijo alguien en México.", en: "You did not hear what someone said in Mexico." },
    answer: "regional",
    note: { es: "Muy mexicano y cortés. En otros países puede sonar raro, pero en México es oro.", en: "Very Mexican and polite. It may sound odd elsewhere, but in Mexico it is gold." },
  },
  {
    phrase: "¿Qué?",
    context: { es: "No escuchaste a tu suegra en la cena.", en: "You did not hear your mother-in-law at dinner." },
    answer: "risky",
    note: { es: "Puede sonar brusco. Mejor: «¿Mande?» o «¿Cómo?» según la relación.", en: "It can sound blunt. Better: «¿Mande?» or «¿Cómo?» depending on the relationship." },
  },
  {
    phrase: "¿Me da un café, por favor?",
    context: { es: "Pides algo en una cafetería.", en: "You are ordering at a cafe." },
    answer: "safe",
    note: { es: "Natural, directo y cortés. Mucho mejor que «¿Puedo obtener un café?».", en: "Natural, direct, and polite. Much better than «¿Puedo obtener un café?»." },
  },
  {
    phrase: "Está bien chido.",
    context: { es: "Comentas el departamento nuevo de un amigo.", en: "You are commenting on a friend's new apartment." },
    answer: "casual",
    note: { es: "Suena mexicano y amistoso. Evítalo en documentos o juntas formales.", en: "It sounds Mexican and friendly. Avoid it in documents or formal meetings." },
  },
  {
    phrase: "No obstante lo anterior...",
    context: { es: "Redactas una cláusula de contrato.", en: "You are writing a contract clause." },
    answer: "formal",
    note: { es: "Registro legal/formal. En una charla normal pesa demasiado.", en: "Legal/formal register. In normal conversation it feels too heavy." },
  },
  {
    phrase: "Ahorita vengo.",
    context: { es: "Sales un momento por un café.", en: "You step out for a coffee." },
    answer: "regional",
    note: { es: "«Ahorita» es muy mexicano y depende del contexto: puede ser pronto... o no tanto.", en: "«Ahorita» is very Mexican and context-dependent: soon... or not quite." },
  },
];

const SNAKES_LADDERS_LINKS = {
  3: { to: 9, kind: "ladder" },
  6: { to: 13, kind: "ladder" },
  11: { to: 18, kind: "ladder" },
  16: { to: 22, kind: "ladder" },
  8: { to: 4, kind: "snake" },
  14: { to: 7, kind: "snake" },
  20: { to: 12, kind: "snake" },
  23: { to: 15, kind: "snake" },
};

const MISSIONS = [
  {
    id: "lease",
    storyId: "story-1", // Casa Azul — same city, CDMX
    title: "Rentar depa en CDMX",
    tag: "Vida real",
    tagEn: "Real life",
    color: D.green,
    dark: D.greenDark,
    host: "valeria",
    desc: "Negocia precio, fecha límite y tono formal sin sonar como libro de texto.",
    descEn: "Negotiate price, deadline, and formal tone without sounding like a textbook.",
    units: ["porpara", "pronombres", "registro"],
    intro: "Te contestó la administradora. Hay que sonar claro, amable y muy despierto.",
  },
  {
    id: "airport",
    storyId: "story-2", // Cancún — same trip
    title: "Resolver un caos de vuelo",
    tag: "Supervivencia",
    tagEn: "Survival",
    color: D.blue,
    dark: D.blueDark,
    host: "diego",
    desc: "Explica lo que pasó, pide opciones y entiende respuestas rápidas.",
    descEn: "Explain what happened, ask for options, and understand fast replies.",
    units: ["pret", "conectores", "registro"],
    intro: "Tu vuelo cambió de puerta tres veces. Respira. Ahora negocia.",
  },
  {
    id: "dinner",
    storyId: "story-0", // Día de Muertos — anecdotes at the table
    title: "Contar una anécdota en la cena",
    tag: "Fluidez",
    tagEn: "Fluency",
    color: D.purple,
    dark: D.purpleDark,
    host: "rafa",
    desc: "Conecta pasado, hipótesis y mexicanismos para sonar natural.",
    descEn: "Connect past narration, hypotheticals, and Mexicanisms to sound natural.",
    units: ["pret", "mex", "siclauses"],
    intro: "La mesa está animada. Si cuentas bien la historia, todos se quedan.",
  },
];

const DIALOGUE_DUEL = {
  id: "client-call",
  title: "Duelo: llamada con cliente",
  subtitle: "Tono, precisión y reflejos",
  color: "#FF9600",
  dark: "#D97F00",
  host: "diego",
  steps: [
    {
      npc: "Buenas tardes, ¿me puede explicar por qué todavía no recibo el contrato?",
      choices: [
        { text: "Claro, licenciado. Se lo mandé hace unos minutos; ¿me confirma si le llegó?", score: 3, note: "Formal, claro y con pronombres bien colocados." },
        { text: "Ya te lo mandé, revisa bien.", score: 1, note: "Se entiende, pero suena brusco y demasiado informal." },
        { text: "El contrato fue mandado por mí.", score: 1, note: "Correcto en teoría, poco natural en una llamada real." },
      ],
    },
    {
      npc: "No lo veo. Además, necesito firmarlo para mañana.",
      choices: [
        { text: "Se lo reenvío ahorita y le marco en cinco minutos para verificar.", score: 3, note: "Acción concreta + registro profesional." },
        { text: "Pues debería estar ahí.", score: 0, note: "Defensivo. Diego arqueó una ceja." },
        { text: "Ojalá que le llega pronto.", score: 1, note: "La intención sirve, pero después de ojalá va subjuntivo: llegue." },
      ],
    },
    {
      npc: "Perfecto. Si surge otro problema, ¿qué hacemos?",
      choices: [
        { text: "Si surge algo, lo resolvemos por teléfono de inmediato.", score: 3, note: "Condición real: si surge + indicativo." },
        { text: "Si surgiera algo, lo resolvemos ayer.", score: 0, note: "Mezcla de tiempos imposible." },
        { text: "Si surge algo, se me olvidó.", score: 1, note: "Gramatical, pero no responde al cliente." },
      ],
    },
  ],
};

const DUELS = [
  DIALOGUE_DUEL,
  {
    id: "duel-airport",
    title: "Duelo: vuelo cancelado",
    subtitle: "Mostrador de aerolínea en CDMX",
    color: "#1CB0F6",
    dark: "#1899D6",
    host: "valeria",
    steps: [
      {
        npc: "Lamento informarle que su vuelo fue cancelado. No tenemos asientos disponibles hasta pasado mañana.",
        choices: [
          { text: "Entiendo. ¿Pudiera revisar otras opciones, por favor? Tengo una junta importante.", score: 3, note: "Cortés, con softening subjuntivo, contexto claro." },
          { text: "¡Eso es inaceptable! Quiero hablar con un supervisor.", score: 1, note: "Comprensible, pero cierra puertas antes de probar el cauce normal." },
          { text: "No me importa, denme cualquier vuelo.", score: 0, note: "Grosero y, además, te van a poner en el peor asiento que tengan." },
        ],
      },
      {
        npc: "Hay un vuelo mañana a las cinco de la mañana con escala en Monterrey, ¿le sirve?",
        choices: [
          { text: "Si no hay otra opción directa, lo tomo. ¿Me podría confirmar el hotel para esta noche?", score: 3, note: "Acepta + reclama lo que la aerolínea debe por la cancelación." },
          { text: "Bueno, está bien.", score: 1, note: "Pierdes la pelea por el hotel y el voucher." },
          { text: "¿Y mi hotel? Es su obligación.", score: 2, note: "Tienes razón, pero el tono adversarial te va a costar tiempo." },
        ],
      },
      {
        npc: "Por la cancelación, le ofrezco mil pesos de vale o veinte mil puntos.",
        choices: [
          { text: "Prefiero los puntos, gracias. Suelen tener más valor en vuelos internacionales.", score: 3, note: "Decisión informada, agradecimiento incluido." },
          { text: "Mil pesos no es ni para el Uber.", score: 1, note: "Cierto, pero ahora pareces difícil de tratar." },
          { text: "Lo que sea, ya quiero irme.", score: 0, note: "Acabas de regalar mil pesos potenciales." },
        ],
      },
    ],
  },
  {
    id: "duel-cena",
    title: "Duelo: cena familiar",
    subtitle: "La suegra te interroga",
    color: "#CE82FF",
    dark: "#A567CC",
    host: "luna",
    steps: [
      {
        npc: "Y dime, ¿cuándo van a darnos un nieto?",
        choices: [
          { text: "Cuando llegue el momento, doña, será usted la primera en saberlo.", score: 3, note: "Diplomático, futuro subjuntivo, salida airosa." },
          { text: "Eso es asunto nuestro.", score: 1, note: "Honesto pero acabas de iniciar una guerra fría de doce meses." },
          { text: "No queremos hijos.", score: 1, note: "Directo, pero ahora va a preguntar TODOS los domingos." },
        ],
      },
      {
        npc: "¿Y ya pensaron en comprar casa? Rentar es tirar el dinero.",
        choices: [
          { text: "Lo hemos pensado, sí. Estamos esperando el momento adecuado del mercado.", score: 3, note: "Validas la opinión sin comprometerte. Maestría política." },
          { text: "Rentar no es tirar el dinero, es flexibilidad.", score: 2, note: "Tienes razón económicamente; ella va a oír «no me importa tu consejo»." },
          { text: "Cuando podamos pagarla, ya le avisaremos.", score: 1, note: "Pasivo-agresivo. Va a haber comentarios en el postre." },
        ],
      },
      {
        npc: "Yo digo que están perdiendo el tiempo en la universidad. ¿No deberían haber empezado un negocio?",
        choices: [
          { text: "Cada quien escoge su camino, doña. A nosotros nos está funcionando este.", score: 3, note: "Firme sin ser combativo. Marca límite con respeto." },
          { text: "Usted no entiende cómo funciona el mundo hoy.", score: 0, note: "Acabas de garantizarte un mes de silencio glacial." },
          { text: "Es lo que decidimos, doña.", score: 2, note: "Cierra el tema, pero suena impaciente." },
        ],
      },
    ],
  },
  {
    id: "duel-renta",
    title: "Duelo: rentar departamento",
    subtitle: "Negociación en la Roma Norte",
    color: "#58CC02",
    dark: "#46A302",
    host: "rafa",
    steps: [
      {
        npc: "El depa está en treinta mil mensuales. Y necesitamos tres meses de depósito.",
        choices: [
          { text: "El precio me parece alto para la zona. ¿Habría flexibilidad si firmo por dos años?", score: 3, note: "Negocia con dato + ofrece valor (compromiso largo). Movida de abogado." },
          { text: "¿No me puede bajar el precio?", score: 1, note: "Pregunta abierta sin palanca. La respuesta predecible: «no»." },
          { text: "Está perfecto, lo tomo.", score: 0, note: "Acabas de rentar al precio inicial. Ningún mexicano hace eso." },
        ],
      },
      {
        npc: "Mire, le puedo dejar en veintiocho si firma por dos años, pero los tres meses de depósito no se mueven.",
        choices: [
          { text: "Acepto los veintiocho. Sobre el depósito: ¿pudiéramos hablar de dos meses más uno como garantía?", score: 3, note: "Cierras el primer punto, abres otro frente con contrapropuesta concreta." },
          { text: "Ok, ¿cuándo firmamos?", score: 1, note: "Aceptaste un depósito gigante sin pelear. Tres meses de renta es mucho dinero parado." },
          { text: "Tres meses es ilegal, ¿no?", score: 2, note: "No lo es en la práctica, y ahora suenas confrontativo." },
        ],
      },
      {
        npc: "Está bien, dos meses más uno de fiador. ¿Tiene aval?",
        choices: [
          { text: "Sí, mi padre puede ser aval. Le mando su comprobante de ingresos hoy mismo.", score: 3, note: "Cierra rápido con compromiso de acción + tiempo." },
          { text: "¿Es obligatorio el aval?", score: 1, note: "En esta zona, sí. Acabas de marcar duda y se va a sentir." },
          { text: "Le ofrezco un mes más de depósito en lugar de aval.", score: 2, note: "Movida creativa, pero el dueño suele preferir aval — es papel humano." },
        ],
      },
    ],
  },
];


/* Per-unit grammar guides for the "?" button on the unit preview sheet.
   Each is a one-screen reference: pattern, examples, key trap. */
const GRAMMAR_GUIDES = {
  subj1: { title: "Presente de subjuntivo", pattern: "Triggered by: hopes, wishes, doubt, emotion, purpose, future cuando.", examples: [["Espero que vengas.", "I hope you come."], ["Para que sepa, te aviso.", "So that he knows."], ["Cuando llegues, llámame.", "When you arrive, call me."]], trap: "Use it after «ojalá», «que + ___», doubt verbs, and any «que» that points at a wish — not after a known fact." },
  pret: { title: "Pretérito vs. imperfecto", pattern: "Preterite = single completed event. Imperfect = ongoing past, background, repeated.", examples: [["Ayer comí tacos.", "Yesterday I ate tacos. (completed)"], ["De niño comía tacos cada domingo.", "As a kid I used to eat tacos."], ["Comía cuando llegaste.", "I was eating when you arrived."]], trap: "Time markers help: «ayer / una vez / de repente» = preterite; «siempre / mientras / de niño» = imperfect." },
  porpara: { title: "Por vs. para", pattern: "PARA = destination, purpose, deadline. POR = cause, exchange, duration, route.", examples: [["Voy para Querétaro.", "I'm going to Querétaro. (destination)"], ["Gracias por la cena.", "Thanks for the dinner. (cause/exchange)"], ["Lo hago por ti.", "I do it for your sake. (because of you)"]], trap: "«Trabajo por mi familia» (because of/for the sake of) vs. «trabajo para mi familia» (to provide for them)." },
  mex: { title: "Mexicanismos esenciales", pattern: "Mexico's signature words that distinguish it from other dialects.", examples: [["¡Órale!", "Wow / Let's go / OK"], ["¿Mande?", "What? (polite, very Mex.)"], ["Está padre.", "It's cool. (Mex. only)"]], trap: "«Coger» is innocent in Spain but vulgar in Mexico — say «agarrar» or «tomar» instead." },
  siclauses: { title: "Cláusulas con SI", pattern: "Three types: real, hypothetical present, hypothetical past.", examples: [["Si llueve, no vamos.", "If it rains, we won't go. (real)"], ["Si tuviera tiempo, iría.", "If I had time, I would go. (hypo present)"], ["Si hubiera sabido, te habría dicho.", "If I had known, I would have told you. (hypo past)"]], trap: "Never use future or conditional in the SI clause itself. «Si tendría» is always wrong." },
  pronombres: { title: "Pronombres de objeto", pattern: "Indirect (me/te/le/nos/les) before direct (lo/la/los/las). «Le + lo» → «se lo».", examples: [["Me lo dio.", "He gave it to me."], ["Se lo dije.", "I told it to him. (le→se)"], ["Dámelo.", "Give it to me. (attached, accent)"]], trap: "Affirmative commands ATTACH pronouns; negative commands put them BEFORE the verb." },
  conectores: { title: "Conectores avanzados", pattern: "Linking words that raise register from spoken to written/formal.", examples: [["Sin embargo, …", "However, …"], ["Por lo tanto, …", "Therefore, …"], ["No obstante, …", "Notwithstanding, …"]], trap: "«No obstante» and «sin embargo» mean the same but «no obstante» is heavier/legal register." },
  registro: { title: "Registros del español", pattern: "Choose tú/usted, slang/formal, contracted/full based on situation.", examples: [["¿Qué onda?", "What's up? (super casual)"], ["¿Cómo estás?", "How are you? (neutral)"], ["¿Cómo se encuentra usted?", "How are you doing? (formal)"]], trap: "When in doubt, default to «usted» — never insulting; «tú» can be." },
  subj2: { title: "Imperfecto de subjuntivo", pattern: "Triggered by: past subjunctive triggers, «si» counterfactuals, «como si», polite softening.", examples: [["Si yo fuera rico, …", "If I were rich, …"], ["Habla como si supiera.", "He speaks as if he knew."], ["Quisiera un café.", "I would like a coffee. (polite)"]], trap: "Always after «como si» and «ojalá» (for unreal wishes). «Quisiera» softens any request." },
  futcond: { title: "Futuro y condicional", pattern: "Future = will. Conditional = would. Both have probability uses.", examples: [["Mañana lo haré.", "I'll do it tomorrow."], ["Yo lo haría.", "I would do it."], ["¿Qué hora será?", "What time is it? (I wonder)"]], trap: "Use «más de» (not «más que») before numbers: «más de cien pesos»." },
  pluscamp: { title: "Pluscuamperfecto y condicional perfecto", pattern: "Pluperfect = had done. Conditional perfect = would have done.", examples: [["Ya había comido.", "I had already eaten."], ["Te habría llamado.", "I would have called you."], ["Si hubiera sabido…", "If I had known… (subj.)"]], trap: "The SI clause of past counterfactuals takes pluperfect SUBJUNCTIVE (hubiera), not conditional perfect." },
  sereflex: { title: "Se: pasivo, impersonal, accidental", pattern: "Three uses of «se»: passive (se vende), impersonal (se habla), accidental (se me cayó).", examples: [["Se habla español.", "Spanish is spoken."], ["Se venden coches.", "Cars are sold. (plural)"], ["Se me olvidó.", "I forgot. (accidental)"]], trap: "Accidental se shifts blame off the speaker — «se me rompió» (it broke on me) vs «yo lo rompí» (I broke it)." },
  pronombres2: { title: "Pronombres avanzados", pattern: "Clitic climbing, double objects, command attachment.", examples: [["Se lo voy a decir.", "I'm going to tell it to him."], ["Voy a decírselo.", "Same — climbing optional."], ["No me lo des.", "Don't give it to me."]], trap: "With «le + lo/la/los/las», «le» becomes «se». Always." },
  compsup: { title: "Comparativos y superlativos", pattern: "más/menos que, tan/tanto como, el/la más, irregulars (mejor, peor, mayor, menor).", examples: [["Más alto que.", "Taller than."], ["Tan listo como.", "As smart as."], ["El mejor del mundo.", "The best in the world."]], trap: "Before NUMBERS use «más de» / «menos de», not «más que»: «cuesta más de 100 pesos»." },
  relativos: { title: "Pronombres relativos", pattern: "que / quien / cuyo / lo que / el cual — each for a different relationship.", examples: [["La mujer que vimos.", "The woman we saw."], ["El abogado, quien firmó…", "The lawyer, who signed…"], ["El libro cuyo autor murió.", "The book whose author died."]], trap: "After a comma + person → «quien» preferred. «Cuyo» agrees with the thing possessed, not the owner." },
  reported: { title: "Estilo indirecto", pattern: "Tenses shift in reported speech: present→imperfect, preterite→pluperfect, future→conditional.", examples: [["«Vivo aquí.» → Dijo que vivía aquí.", "He said he lived here."], ["«Voy a ir.» → Dijo que iba a ir.", "He said he was going to go."], ["«Llámame.» → Me pidió que lo llamara.", "He asked me to call him."]], trap: "Time words shift too: «mañana» → «al día siguiente», «hoy» → «aquel día»." },
  slang2: { title: "Caló mexicano II", pattern: "Slang beyond «padre/chido» — the words that signal you're in, not translating.", examples: [["Es neta.", "It's true / for real."], ["Voy a chambear.", "I'm going to work."], ["¡Qué oso!", "How embarrassing!"]], trap: "«Mande» is uniquely Mexican — never use «¿qué?» alone to ask «what?»; it can sound rude." },
  formal: { title: "Registro formal/legal", pattern: "The vocabulary of contracts and formal correspondence.", examples: [["Por la presente, …", "Herein, …"], ["No obstante lo anterior, …", "Notwithstanding the foregoing, …"], ["A más tardar el 15.", "No later than the 15th."]], trap: "«Tener vigencia» (be in effect) — a contract «tiene vigencia», it doesn't «dura»." },
};

const UI = {
  es: {
    camino: "Camino", missions: "Misiones", reading: "Lectura", practice: "Práctica", games: "Juegos", cards: "Tarjetas", profile: "Perfil",
    goal: "Meta", rayo: "Rayo", on: "ON", off: "OFF", workoutDone: "Rutina hecha", workoutToday: "Rutina de hoy", dailyWorkout: "Rutina diaria",
    workoutDesc: "5 retos: escucha, trampa gramatical, mexicanismo, repaso y lectura.", play: "Jugar", repeat: "Repetir",
    sectionSkills: "habilidades + cofre", skip: "SALTAR", start: "EMPIEZA", claimed: "Reclamado", chest: "Cofre", openMe: "¡Ábreme!",
    storyPrefix: "Cuento", shortcuts: "Luna, Don Rafa, Valeria y Diego te acompañan. Atajos: 1–4.",
    missionsTitle: "Misiones", missionsDesc: "Situaciones reales con mezcla de gramática, oído y tono.", enter: "Entrar",
    dialogueDuel: "DUELO", best: "mejor marca", duel: "Duelo",
    library: "Biblioteca", storiesClaimed: "cuentos reclamados · lectura sin vidas", paragraphs: "párrafos · toca palabras · audio por párrafo",
    practiceTitle: "Práctica", dueToday: "para repasar hoy", tracked: "en seguimiento", practiceFree: "El repaso no cuesta vidas — y te regresa", reviewToday: "Repasar hoy",
    memory: "Memoria programada (SM-2): lo difícil vuelve pronto, lo dominado se aleja y se gradúa a los", noDue: "Nada vence hoy — la memoria está trabajando sola.",
    nextReview: "próximo repaso", earlyReview: "Adelantar repaso", noErrors: "Sin errores en seguimiento. Ve al camino por más retos.",
    weaknessMap: "Mapa de debilidades", weaknessDesc: "Ándale ajusta esto con tus errores y recuperaciones.", noPatterns: "Todavía no hay un mapa. Juega una misión o falla con estilo — entonces aparece.",
    adaptiveReview: "Repaso adaptivo", lives: "vidas", nextLife: "Próxima vida gratis en", refill: "Rellenar",
    flashTitle: "Tarjetas", saved: "guardadas", ready: "listas para practicar", emptyDeck: "Todavía no hay tarjetas",
    emptyDeckDesc: "Abre un cuento, toca una palabra que te frena, y guárdala con su frase.", goReading: "Ir a Lectura",
    dueReview: "REPASO VENCIDO", ahead: "ADELANTO", tapReveal: "Toca para revelar", again: "Otra vez", hard: "Difícil", good: "Bien", easy: "Fácil", reveal: "Revelar", today: "hoy",
    flashDone: "¡Terminaste las tarjetas!", flashDoneDesc: "Repasaste", flashCardsWord: "tarjetas", flashAgain: "Otra ronda", flashOf: "de",
    profileTitle: "Tu perfil", profileSub: "Español (México) · intermedio-avanzado", level: "Nivel", maxLevel: "Nivel máximo.", xpTo: "XP para",
    streakDays: "días de racha", totalXp: "XP total", crowns: "coronas", gems: "gemas", reviewsStat: "repasos hoy / en seguimiento", perfectLessons: "lecciones impecables",
    achievements: "Logros", firstStep: "Primer paso", firstStepDesc: "Completa una lección", century: "Centenario", centuryDesc: "Gana 100 XP",
    fire: "Fueguito", fireDesc: "Racha de 3 días", perfectWeek: "Semana perfecta", perfectWeekDesc: "Racha de 7 días", flawless: "Impecable", flawlessDesc: "Una lección sin errores", crowned: "Coronado",
    challenges: "retos", optionTypes: "opción, escritura, fichas, dictado y parejas", startLesson: "Empezar · +XP", practiceAgain: "Practicar de nuevo · +XP", close: "Cerrar",
    listening: "PRÁCTICA", test: "EXAMEN", errors: "errores", chooseCorrect: "Elige la opción correcta", buildSentence: "Construye la oración", completeSentence: "Completa la oración",
    transformIt: "Transfórmala", writeHeard: "Escribe lo que escuchas", matchPairs: "Une las parejas", typeOrder: "Toca las fichas en orden…",
    check: "Comprobar", continue: "Continuar", why: "¿Por qué?", correctAnswer: "Respuesta correcta", yourAnswer: "Tu respuesta", correct: "Correcta",
    focus: "Foco", time: "¡Tiempo!", spelling: "Ojo con la ortografía", matchInstruction: "Toca una pareja en cada columna.", enterCheck: "Enter para comprobar.",
    selfGrade: "¿QUÉ TAN BIEN LO SABÍAS?", storyTip: "Lee el párrafo. Toca una palabra solo si te frena.",
    wordOrderTip: "Orden distinto, mismo sentido. En formal, ambas valen.",
    comprehension: "Comprensión", easyQuestions: "Tres preguntas fáciles · hasta", xpClaimed: "XP ya reclamado", claim: "Reclamar", saveCard: "Guardar tarjeta", inDeck: "Ya guardada",
    completed: "¡Lección completada!", sectionPassed: "¡Sección superada!", levelUp: "¡Subiste de nivel! Ahora eres",
    hits: "aciertos", misses: "fallos", impeccable: "¡IMPECABLE!", unlockedSection: "Toda la sección quedó desbloqueada con corona.", review: "Repasar",
    testFailed: "Examen no superado", testFailedDesc: "Tres errores — el límite era dos. Tus fallos ya están en Práctica; repásalos y vuelve a intentarlo.",
    retryTest: "Reintentar examen", reviewErrors: "Repasar errores", outHearts: "¡Te quedaste sin vidas!", outHeartsDesc: "Practica tus errores para recuperar", practiceRecover: "Practicar y recuperar", toPath: "Al camino",
    comeBackTomorrow: "Vuelve mañana por la siguiente escena.",
    paywallHeadline: "Ya empezó tu racha.",
    paywallBody: "Camino completo: escenas, Doctora de frases, cuentos. Mexicano real, más allá de lo básico.",
    paywallAnnual: "$39.99 al año",
    paywallMonthly: "$6.99 al mes",
    paywallHonesty: "Práctica · sin cobro todavía",
    paywallDismiss: "Seguir gratis por ahora",
    a2hsTitle: "Agrega Ándale a tu pantalla de inicio",
    a2hsHow: "Toca Compartir, luego «Agregar a pantalla de inicio».",
    a2hsDismiss: "Ahora no",
    playScene: "Jugar la escena",
    phraseDoctor: "Doctora de frases",
    phraseDoctorTag: "GANA EN 60 SEGUNDOS",
    phraseDoctorCta: "Arreglar una frase",
    safeRiskyReward: "5 rondas · extra por racha · gemas",
    narrationLabel: "NARRACIÓN",
    splashLine: "Español mexicano real. Más allá de lo básico.",
    splashCta: "¡Empezar!",
    more: "Más",
    namePrompt: "¿Cómo te dicen?",
    hoyWin: "¡Eso!",
    sessionClose: "Listo",
    recuerdosTitle: "Recuerdos",
    recuerdosOpen: "Abierto",
    recuerdosLocked: "Cerrado",
  },
  en: {
    camino: "Learn", missions: "Challenges", reading: "Stories", practice: "Review", games: "Games", cards: "Cards", profile: "Profile",
    goal: "Goal", rayo: "Lightning", on: "ON", off: "OFF", workoutDone: "Routine done", workoutToday: "Today's routine", dailyWorkout: "Daily routine",
    workoutDesc: "5 challenges: listening, grammar trap, Mexicanism, review, and reading.", play: "Play", repeat: "Repeat",
    sectionSkills: "skills + chest", skip: "SKIP", start: "START", claimed: "Claimed", chest: "Chest", openMe: "Open me!",
    storyPrefix: "Story", shortcuts: "Luna, Don Rafa, Valeria, and Diego are with you. Shortcuts: 1–4 · Enter",
    missionsTitle: "Challenges", missionsDesc: "Real situations mixing grammar, listening, and tone.", enter: "Enter",
    dialogueDuel: "DIALOGUE DUEL", best: "best score", duel: "Duel",
    library: "Library", storiesClaimed: "stories claimed · reading costs no lives", paragraphs: "paragraphs · tap words · audio by paragraph",
    practiceTitle: "Review", dueToday: "due for review today", tracked: "tracked", practiceFree: "Review costs no lives — and gives back", reviewToday: "Review today",
    memory: "Scheduled memory (SM-2): hard items return soon, mastered items spread out and graduate after", noDue: "Nothing is due today — memory is working in the background.",
    nextReview: "next review", earlyReview: "Review early", noErrors: "No tracked errors. Go to Learn for more challenges.",
    weaknessMap: "Weakness map", weaknessDesc: "Ándale adjusts this from your misses and recoveries.", noPatterns: "No map yet. Play a mission or miss with style — then it shows up.",
    adaptiveReview: "Adaptive review", lives: "lives", nextLife: "Next free life in", refill: "Refill",
    flashTitle: "Flashcards", saved: "saved", ready: "ready to practice", emptyDeck: "No cards yet",
    emptyDeckDesc: "Open a story, tap a word that stops you, and save it with its line.", goReading: "Go to Stories",
    dueReview: "DUE REVIEW", ahead: "EARLY REVIEW", tapReveal: "Tap to reveal", again: "Again", hard: "Hard", good: "Good", easy: "Easy", reveal: "Reveal", today: "today",
    flashDone: "You finished the cards!", flashDoneDesc: "You reviewed", flashCardsWord: "cards", flashAgain: "Another round", flashOf: "of",
    profileTitle: "Your profile", profileSub: "Spanish (Mexico) · intermediate-advanced", level: "Level", maxLevel: "Max level.", xpTo: "XP to",
    streakDays: "streak days", totalXp: "total XP", crowns: "crowns", gems: "gems", reviewsStat: "reviews today / tracked", perfectLessons: "perfect lessons",
    achievements: "Achievements", firstStep: "First step", firstStepDesc: "Complete one lesson", century: "Century", centuryDesc: "Earn 100 XP",
    fire: "Little fire", fireDesc: "3-day streak", perfectWeek: "Perfect week", perfectWeekDesc: "7-day streak", flawless: "Flawless", flawlessDesc: "One lesson with no mistakes", crowned: "Crowned",
    challenges: "challenges", optionTypes: "multiple choice, typing, tiles, dictation, and matching", startLesson: "Start · +XP", practiceAgain: "Practice again · +XP", close: "Close",
    listening: "PRACTICE", test: "TEST", errors: "errors", chooseCorrect: "Choose the correct answer", buildSentence: "Build the sentence", completeSentence: "Complete the sentence",
    transformIt: "Transform it", writeHeard: "Write what you hear", matchPairs: "Match the pairs", typeOrder: "Tap the tiles in order…",
    check: "Check", continue: "Continue", why: "Why?", correctAnswer: "Correct answer", yourAnswer: "Your answer", correct: "Correct",
    focus: "Focus", time: "Time!", spelling: "Watch the spelling", matchInstruction: "Tap one pair from each column.", enterCheck: "Enter to check.",
    selfGrade: "HOW WELL DID YOU KNOW IT?", storyTip: "Read the paragraph. Tap a word only if it stops you.",
    wordOrderTip: "Different order, same meaning. Formally, both work.",
    comprehension: "Comprehension", easyQuestions: "Three easy questions · up to", xpClaimed: "XP already claimed", claim: "Claim", saveCard: "Save flashcard", inDeck: "In your deck",
    completed: "Lesson complete!", sectionPassed: "Section passed!", levelUp: "Level up! You are now",
    hits: "correct", misses: "misses", impeccable: "FLAWLESS!", unlockedSection: "The whole section was unlocked with crowns.", review: "Review",
    testFailed: "Test not passed", testFailedDesc: "Three mistakes — the limit was two. Your misses are in Review; revisit them and try again.",
    retryTest: "Retry test", reviewErrors: "Review mistakes", outHearts: "Out of lives!", outHeartsDesc: "Review your mistakes to recover", practiceRecover: "Review and recover", toPath: "Back to Learn",
    comeBackTomorrow: "Come back tomorrow for the next scene.",
    paywallHeadline: "Your streak just started.",
    paywallBody: "Full path: scenes, Phrase Doctor, stories. Real Mexican Spanish past the basics.",
    paywallAnnual: "$39.99 / year",
    paywallMonthly: "$6.99 / month",
    paywallHonesty: "Practice · no charge yet",
    paywallDismiss: "Continue free for now",
    a2hsTitle: "Add Ándale to your Home Screen",
    a2hsHow: "Tap Share, then Add to Home Screen.",
    a2hsDismiss: "Not now",
    playScene: "Play the scene",
    phraseDoctor: "Phrase Doctor",
    phraseDoctorTag: "WIN IN 60 SECONDS",
    phraseDoctorCta: "Fix a phrase",
    safeRiskyReward: "5 rounds · streak extra · gems",
    narrationLabel: "NARRATION",
    splashLine: "Real Mexican Spanish. Past the basics.",
    splashCta: "Start!",
    more: "More",
    namePrompt: "What do they call you?",
    hoyWin: "That's it.",
    sessionClose: "Done",
    recuerdosTitle: "Souvenir trail",
    recuerdosOpen: "Open",
    recuerdosLocked: "Locked",
  },
};

const getUnit = (id) => UNITS.find((u) => u.id === id);
const sampleQuestion = (unitId, predicate = () => true) => {
  const u = getUnit(unitId);
  const qs = u?.questions.map((q, i) => ({ ...q, _u: unitId, _i: i })).filter(predicate) || [];
  return qs.length ? qs[Math.floor(Math.random() * qs.length)] : null;
};

const SMART_FOCI = [
  { id: "subj", skill: "Subjuntivo", units: ["subj1", "subj2"], host: "luna", title: { es: "Subjuntivo vs. indicativo", en: "Subjunctive vs. indicative" }, desc: { es: "Deseo, duda, futuro y hechos conocidos.", en: "Wishes, doubt, future triggers, and known facts." } },
  { id: "past", skill: "Pasado", units: ["pret", "pluscamp", "reported"], host: "luna", title: { es: "Narrar en pasado", en: "Past-tense storytelling" }, desc: { es: "Pretérito, imperfecto y secuencias anteriores.", en: "Preterite, imperfect, and earlier-past sequencing." } },
  { id: "porpara", skill: "Por/para", units: ["porpara"], host: "luna", title: { es: "Por vs. para", en: "Por vs. para" }, desc: { es: "Causa, destino, intercambio y plazos.", en: "Cause, destination, exchange, and deadlines." } },
  { id: "mex", skill: "Mexicanismos", units: ["mex", "slang2"], host: "rafa", title: { es: "Mexicanismos útiles", en: "Useful Mexicanisms" }, desc: { es: "Frases que suenan de México, no de libro.", en: "Phrases that sound Mexican, not textbook-ish." } },
  { id: "hyp", skill: "Hipótesis", units: ["siclauses", "futcond", "pluscamp"], host: "valeria", title: { es: "Hipótesis y probabilidad", en: "Hypothesis and probability" }, desc: { es: "Si, condicional, futuro de probabilidad y cortesía.", en: "Si clauses, conditional, probability future, and softening." } },
  { id: "pron", skill: "Pronombres", units: ["pronombres", "pronombres2", "sereflex"], host: "valeria", title: { es: "Pronombres en movimiento", en: "Pronoun placement" }, desc: { es: "Se lo, clíticos, mandatos y accidental se.", en: "Se lo, clitics, commands, and accidental se." } },
  { id: "conn", skill: "Conectores", units: ["conectores", "formal"], host: "valeria", title: { es: "Conectores y registro formal", en: "Connectors and formal register" }, desc: { es: "Sin embargo, no obstante y frases de correo.", en: "Sin embargo, no obstante, and email polish." } },
  { id: "reg", skill: "Registro", units: ["registro", "formal", "mex"], host: "valeria", title: { es: "Registro y tono", en: "Register and tone" }, desc: { es: "Casual, profesional, legal y natural.", en: "Casual, professional, legal, and natural." } },
];
const SMART_FOCUS_BY_SKILL = Object.fromEntries(SMART_FOCI.map((f) => [f.skill, f]));
const SMART_DEFAULT_FOCUS = SMART_FOCI[0];

/* ============================================================
   EL RETO DE DIEGO — persistent rival arc.
   Diego stops being a quip skin and becomes a rival who REMEMBERS:
   a win/loss record (prog.rival), a respect ladder that climbs as
   you beat him and falls when you lose, taunts keyed on your real
   weakest skill (prog.weak via skillFor), and a duel that gets
   harder as you climb. Pure state + content — ships in the artifact.
   ============================================================ */
const RIVAL_RANKS = [
  { es: "Don Nadie",             en: "Nobody" },
  { es: "Aprendiz",              en: "Apprentice" },
  { es: "Contendiente",          en: "Contender" },
  { es: "Rival digno",           en: "Worthy rival" },
  { es: "Espina en el costado",  en: "Thorn in his side" },
  { es: "Dolor de cabeza",       en: "Headache" },
  { es: "Su igual",              en: "His equal" },
  { es: "La pesadilla de Diego", en: "Diego's nightmare" },
];
const rivalRankName = (rank, lang) =>
  (RIVAL_RANKS[Math.min(Math.max(rank, 0), RIVAL_RANKS.length - 1)] || RIVAL_RANKS[0])[lang === "en" ? "en" : "es"];

// Diego scales with your rank: more rounds, sharper Diego.
const rivalConfig = (rank) => ({
  rounds: rank < 3 ? 5 : rank < 6 ? 6 : 7,
  pDiego: Math.min(0.86, 0.5 + (rank || 0) * 0.05), // his per-round hit rate
});

// The exact error Diego mocks, keyed on skillFor() output.
const SKILL_JAB = {
  Subjuntivo:   { es: "«espero que vienes», otra vez",          en: "“espero que vienes,” again" },
  Pasado:       { es: "confundiendo «fui» con «iba»",            en: "mixing up “fui” and “iba”" },
  "Por/para":   { es: "«gracias para todo», clásico",           en: "“gracias para todo,” classic" },
  Mexicanismos: { es: "hablando como manual de turista",         en: "talking like a tourist phrasebook" },
  Hipótesis:    { es: "«si tendría tiempo», ¿en serio?",        en: "“si tendría tiempo,” seriously?" },
  Pronombres:   { es: "el «se lo» se te sigue atorando",         en: "“se lo” still trips you up" },
  Conectores:   { es: "sin un solo «sin embargo» bien puesto",   en: "without one “sin embargo” in the right place" },
  Registro:     { es: "tuteando a quien deberías ustedear",      en: "tú-ing someone you should usted" },
  Escucha:      { es: "adivinando lo que oyes",                  en: "guessing at what you hear" },
  Orden:        { es: "armando las frases al revés",             en: "building sentences backwards" },
  Precisión:    { es: "por un acento de más o de menos",         en: "off by a stray accent" },
};
const worstSkillOf = (weak) => {
  const e = Object.entries(weak || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return e[0]?.[0] || null;
};

// Intro taunt: keyed on the LAST duel result and your real weak spot.
const diegoTaunt = (rival, weakSkill, lang) => {
  const en = lang === "en";
  const jab = (SKILL_JAB[weakSkill] || SKILL_JAB.Subjuntivo)[en ? "en" : "es"];
  const skill = weakSkill ? weakSkill.toLowerCase() : (en ? "the subjunctive" : "el subjuntivo");
  const played = (rival?.wins || 0) + (rival?.losses || 0);
  if (!rival || played === 0) {
    return en
      ? `New challenger. They say your weak spot is ${skill} — what a coincidence, that's exactly where I'm aiming.`
      : `Nuevo retador. Dicen que tu punto débil es ${skill}… qué casualidad, justo ahí voy a pegar.`;
  }
  if (rival.lastResult === "win") {
    return en
      ? `So you won last time. Luck. It won't repeat — and I still catch you ${jab}.`
      : `Así que ganaste la última. Suerte. No se repite — y te sigo cachando: ${jab}.`;
  }
  return en
    ? `You again? Last time you beat yourself — ${jab}. Today for real, or same story?`
    : `¿Otra vez tú? La última te ganaste solito — ${jab}. ¿Hoy sí, o la misma historia?`;
};

// Reaction on the result screen, by outcome + rank movement.
const diegoReaction = (won, delta, lang) => {
  const en = lang === "en";
  if (won) return delta > 0
    ? (en ? "…that one stung. You moved up in my book." : "…esa dolió. Subiste en mi lista.")
    : (en ? "Fine, you took it. Top of the ladder — for now." : "Bueno, te la llevaste. Cima de la escalera… por ahora.");
  return delta < 0
    ? (en ? "Down you go. Come back when you're ready." : "Para abajo. Vuelve cuando estés listo.")
    : (en ? "As expected. Again whenever you like." : "Como esperaba. Cuando quieras, otra.");
};





const LangToggle = ({ uiLang, D, onPick, style }) => (
  <div data-testid="lang-toggle" role="group"
    aria-label={uiLang === "en" ? "Interface language" : "Idioma de la interfaz"}
    style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, ...style }}>
    <button type="button" data-testid="lang-es" aria-pressed={uiLang === "es"} aria-label="Español"
      onClick={() => onPick("es")}
      style={{
        border: "none", background: "none", fontFamily: "inherit", padding: "6px 1px", cursor: "pointer",
        fontWeight: uiLang === "es" ? 900 : 700, fontSize: 12, letterSpacing: ".04em", lineHeight: 1,
        color: uiLang === "es" ? D.ink : D.sub,
      }}>ES</button>
    <span aria-hidden="true" style={{ color: D.sub, fontWeight: 700, fontSize: 12, lineHeight: 1 }}>|</span>
    <button type="button" data-testid="lang-en" aria-pressed={uiLang === "en"} aria-label="English"
      onClick={() => onPick("en")}
      style={{
        border: "none", background: "none", fontFamily: "inherit", padding: "6px 1px", cursor: "pointer",
        fontWeight: uiLang === "en" ? 900 : 700, fontSize: 12, letterSpacing: ".04em", lineHeight: 1,
        color: uiLang === "en" ? D.ink : D.sub,
      }}>EN</button>
  </div>
);

const Btn = ({ color = D.green, dark = D.greenDark, children, outline, disabled, onClick, style, ...rest }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="duo-btn"
    style={{
      fontFamily: "inherit", fontWeight: 800, fontSize: 15, letterSpacing: ".06em", textTransform: "uppercase",
      borderRadius: 14, padding: "13px 24px", cursor: disabled ? "default" : "pointer",
      background: outline ? "#fff" : disabled ? D.lockGray : color,
      color: outline ? color : disabled ? D.lockIcon : "#fff",
      border: outline ? `2px solid ${D.line}` : "none",
      borderBottom: outline ? `4px solid ${D.line}` : `4px solid ${disabled ? "#CFCFCF" : dark}`,
      ...style,
    }}
    {...rest}>
    {children}
  </button>
);

/* ---------------- APP ---------------- */

export default function App() {
  /* Theme: persisted under prog.theme; memoized D shadows the file-level D
     for every component rendered inside App. Existing D.* call sites work. */

  const [tab, setTabRaw] = useState("camino");
  // Normalize legacy "juegos" tab (removed from primary nav, games live in "practica" now)
  const setTab = (t) => setTabRaw(t === "juegos" ? "practica" : t); // camino | misiones | lectura | practica | flashcards | perfil
  const [screen, setScreen] = useState("home"); // home | lesson | story | dialogue | done | failed | sessionClose
  const [session, setSession] = useState(null);
  const [qi, setQi] = useState(0);
  const [status, setStatus] = useState("idle");
  const [selected, setSelected] = useState(null);
  const [typed, setTyped] = useState("");
  const [typedTileIds, setTypedTileIds] = useState([]);
  const [placed, setPlaced] = useState([]);
  const [placeAt, setPlaceAt] = useState(null); // vacated index so the next chip fills the hole
  const [matchSel, setMatchSel] = useState(null); // {side, idx}
  const [matched, setMatched] = useState([]);
  const [matchWrong, setMatchWrong] = useState(null);
  const [sessionXP, setSessionXP] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lessonStats, setLessonStats] = useState({ right: 0, wrong: 0 });
  const [inter, setInter] = useState(null); // {text, key} combo interstitial
  const [sheet, setSheet] = useState(null); // {unit, section} node preview bottom sheet
  const [showWhy, setShowWhy] = useState(false); // expandable grammar note on misses
  const [failKind, setFailKind] = useState("hearts"); // hearts | test
  const [rayoLeft, setRayoLeft] = useState(null); // seconds remaining in Modo Rayo
  const [timedOut, setTimedOut] = useState(false); // rayo expiry pending
  const [wasTimeout, setWasTimeout] = useState(false); // feedback flag
  const [levelUp, setLevelUp] = useState(null); // level name reached this lesson
  const [quip, setQuip] = useState(""); // host reaction line for current answer
  const [screenQuip, setScreenQuip] = useState(""); // host line on done/failed screens
  const greetingPick = React.useMemo(() => Math.floor(Math.random() * GREETINGS.es.length), []);
  const [storyView, setStoryView] = useState(null); // active story object
  const [wordSel, setWordSel] = useState(null); // {display, def, note, pi, ti}
  const [wordReveal, setWordReveal] = useState(true);
  const [ansSel, setAnsSel] = useState({}); // story question selections
  const [storyMode, setStoryMode] = useState("story"); // story | bilingual | challenge
  const [audioMode, setAudioMode] = useState("normal"); // normal | slow | shadow
  const [voices, setVoices] = useState([]);
  const [voicesReady, setVoicesReady] = useState(false);
  const [streakRepair, setStreakRepair] = useState(null); // null | "freeze" | "repair"
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(iv); }, []);
  const [confirmExit, setConfirmExit] = useState(false);
  const [paraIdx, setParaIdx] = useState(0);
  const [voiceDead, setVoiceDead] = useState(false);
  useEffect(() => {
    const onDead = () => setVoiceDead(true);
    window.addEventListener("andale-voice-dead", onDead);
    if (window.__andaleVoiceDead) setVoiceDead(true);
    return () => window.removeEventListener("andale-voice-dead", onDead);
  }, []);
  const [heartsModal, setHeartsModal] = useState(false);
  const [softPaywall, setSoftPaywall] = useState(false);
  const [paywallArmed, setPaywallArmed] = useState(false);
  const [postDismissHandoff, setPostDismissHandoff] = useState(false);
  const [a2hsSheet, setA2hsSheet] = useState(false);
  const [bajioUnlockFlash, setBajioUnlockFlash] = useState(false);
  const [bajioFlashPending, setBajioFlashPending] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [caminoMore, setCaminoMore] = useState(false);
  const [activeDuel, setActiveDuel] = useState(DUELS[0]);
  const [guideUnit, setGuideUnit] = useState(null);
  const [dialogue, setDialogue] = useState({ idx: 0, score: 0, done: false, log: [] });
  const [rivalOutcome, setRivalOutcome] = useState(null); // result of the last Diego duel
  const [flashRun, setFlashRun] = useState(null); // { deck, idx, done, reviewed, xpEarned }
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [flashMode, setFlashMode] = useState("es-en");
  const [doctorIdx, setDoctorIdx] = useState(0);
  const [doctorReveal, setDoctorReveal] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [doctorGuess, setDoctorGuess] = useState("");
  const [doctorTip, setDoctorTip] = useState(false);
  const [doctorGrade, setDoctorGrade] = useState(null);
  const [doctorFailed, setDoctorFailed] = useState(false);
  const [firstDoctora, setFirstDoctora] = useState(false);
  const [doctorHits, setDoctorHits] = useState(0);
  const [showWordOrderTip, setShowWordOrderTip] = useState(false);
  const [wordOrderMiss, setWordOrderMiss] = useState("");
  const [safeGame, setSafeGame] = useState(null);
  const [jeopardy, setJeopardy] = useState(null);
  const [snakeGame, setSnakeGame] = useState(null);
  const [matchGame, setMatchGame] = useState(null);
  const [burst, setBurst] = useState(0); // mini confetti trigger
  const [prog, setProg] = useState({ welcomed: false, xp: 0, streak: 0, lastDay: null, xpToday: 0, done: {}, mistakes: [], srs: {}, flashcards: {}, weak: {}, missions: {}, rayo: false, stories: {}, uiLang: DEFAULT_UI_LANG, sound: true, gems: 0, hearts: MAX_HEARTS, heartT: Date.now(), perfects: 0, chests: {} });
  /* Theme — derived from persisted prog.theme. The local `D` shadows the
     file-level D constant, so all `D.green` reads inside App pick this up. */
  const theme = prog.theme || "light";
  const D = theme === "dark" ? D_DARK : D_LIGHT;
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.background = D.bg;
      document.body.style.color = D.ink;
      document.body.style.transition = "background 200ms ease, color 200ms ease";
    }
  }, [theme]);
  const inputRef = useRef(null);
  const audioCtx = useRef(null);
  const narrationRef = useRef(null);
  const liveReady = useRef(false);
  const liveRef = useRef(null);
  const awardLockRef = useRef(new Set());
  const sessionXPRef = useRef(0);
  const itemXpLockRef = useRef(new Set());

  const lockAward = (key) => {
    if (awardLockRef.current.has(key)) return false;
    awardLockRef.current.add(key);
    return true;
  };
  const itemAwardKey = (sess, idx, question) =>
    `${sess?.unitId || ""}|${idx}|${question?._u}|${question?._i}|${question?._requeued ? "r" : "n"}`;
  const addSessionXP = (delta) => {
    sessionXPRef.current += delta;
    setSessionXP(sessionXPRef.current);
  };

	/* load + heart regen */
	useEffect(() => {
	  (async () => {
	    let p = null;
	    try { const r = await storage.get(STORAGE_KEY); if (r && r.value) p = JSON.parse(r.value); } catch (e) {}
	    p = acceptProgress(p);
	    let loaded = null;
	    setProg((base) => {
	      let merged = { ...base, ...(p || {}), contentVersion: CONTENT_VERSION };
	      // First visit keeps DEFAULT_UI_LANG (EN). Returning saves without uiLang stay ES.
	      if (p && p.uiLang !== "en" && p.uiLang !== "es") merged = { ...merged, uiLang: "es" };
	      if (merged.mistakes?.length && !Object.keys(merged.srs || {}).length) {
	        const srs = {};
	        merged.mistakes.forEach((m) => { srs[`${m.u}|${m.i}`] = { ef: 2.5, reps: 0, interval: 0, due: Date.now() }; });
	        merged = { ...merged, srs, mistakes: [] };
	      }
	      if (merged.voiceName) window.__andaleVoiceName = merged.voiceName;
	      loaded = regen(merged);
	      return loaded;
	    });
	    try { window.speechSynthesis.getVoices(); } catch (e) {}
	    // Streak gap check: if last activity was 2 days ago, the streak is "salvageable"
	    const today = todayStr(); const y = yesterdayStr();
	    if (loaded?.lastDay && loaded.lastDay !== today && loaded.lastDay !== y && (loaded.streak || 0) >= 2 && !loaded.repairChecked) {
	      const dayBefore = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
	      if (loaded.lastDay === dayBefore) {
	        setStreakRepair((loaded.freezes || 0) > 0 ? "freeze" : "repair");
	      }
	    }
	  })();
    const loadVoices = () => {
      try {
        const all = window.speechSynthesis.getVoices() || [];
        if (all.length) setVoicesReady(true);
        const es = listSpanishVoices()
          .sort((a, b) => voiceScore(b, window.__andaleVoiceName || DEFAULT_VOICE_NAME) - voiceScore(a, window.__andaleVoiceName || DEFAULT_VOICE_NAME));
        setVoices(es);
        const paulina = pickPaulina(es);
        if (paulina) {
          if (!window.__andaleVoiceName) window.__andaleVoiceName = paulina.name;
          window.__andaleVoiceDead = false;
          setVoiceDead(false);
        }
      } catch (e) {}
    };
    loadVoices();
    try { window.speechSynthesis.addEventListener("voiceschanged", loadVoices); } catch (e) {}
    try { window.speechSynthesis.onvoiceschanged = loadVoices; } catch (e) {}
    const polls = [200, 500, 1000, 2000, 3500].map((ms) => setTimeout(loadVoices, ms));
    const readyTimer = setTimeout(() => setVoicesReady(true), 3600);
    const iv = setInterval(() => setProg((p) => {
      const next = regen(p);
      // Return the same ref when unchanged so React bails out — no re-render,
      // no persist. The [prog] effect handles the write when hearts/heartT move.
      return (next.hearts === p.hearts && next.heartT === p.heartT) ? p : next;
    }), 60000);
    return () => {
      clearInterval(iv);
      polls.forEach(clearTimeout);
      clearTimeout(readyTimer);
      try { window.speechSynthesis.removeEventListener("voiceschanged", loadVoices); } catch (e) {}
      try { if (window.speechSynthesis.onvoiceschanged === loadVoices) window.speechSynthesis.onvoiceschanged = null; } catch (e) {}
    };
  }, []);

  const regen = (p) => {
    let h = p.hearts ?? MAX_HEARTS, t = p.heartT ?? Date.now();
    if (h < MAX_HEARTS) {
      const gained = Math.floor((Date.now() - t) / HEART_REGEN_MS);
      if (gained > 0) { h = Math.min(MAX_HEARTS, h + gained); t = h === MAX_HEARTS ? Date.now() : t + gained * HEART_REGEN_MS; }
    }
    return { ...p, hearts: h, heartT: t };
  };

  // Race-safe persistence. Accepts a patch object (merged over the freshest
  // state) OR an updater fn (prev) => next. The previous version spread a stale
  // `prog` closure, so a concurrent heart-regen tick (which uses functional
  // setProg) could be silently rolled back. Patches/updaters run against `prev`,
  // so background writes are never clobbered. Writes are persisted by the effect
  // below, keyed on `prog`, so storage always matches the last committed state.
  const save = (patch) =>
    setProg((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));

  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; } // skip pre-hydration default state
    try { storage.set(STORAGE_KEY, JSON.stringify({ ...prog, contentVersion: CONTENT_VERSION })); } catch (e) {}
  }, [prog]);

  /* ---- Sound design: proper game audio, no more beeps ----
     Each event gets a carefully tuned multi-oscillator sound:
     ok    → bright ascending chord (C5-E5-G5, piano-like attack)
     wrong → low thud + descending tonal drop (clear "no" feel)
     win   → 5-note fanfare with harmonics (victory cascade)
     combo → shimmering sparkle (ascending arpeggiated thirds)
     chest → coin-collect jingle (classic pickup sound)
     The shapes, envelopes, and micro-timing are tuned so they feel
     satisfying at low volume and don't fatigue on repeat. */

  const playSound = (kind) => {
    if (!prog.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = audioCtx.current || (audioCtx.current = new Ctx());
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;

      const tone = (freq, start, dur, type = "sine", vol = 0.18, detune = 0) => {
        const g = ctx.createGain();
        const o = ctx.createOscillator();
        g.connect(ctx.destination);
        o.connect(g);
        o.type = type;
        o.frequency.setValueAtTime(freq, now + start);
        if (detune) o.detune.setValueAtTime(detune, now + start);
        // Piano-like envelope: sharp attack, short decay, fast release
        g.gain.setValueAtTime(0, now + start);
        g.gain.linearRampToValueAtTime(vol, now + start + 0.012);
        g.gain.exponentialRampToValueAtTime(vol * 0.55, now + start + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        o.start(now + start);
        o.stop(now + start + dur + 0.05);
      };

      const noise = (start, dur, vol = 0.08) => {
        const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = "lowpass"; filt.frequency.value = 300;
        const g = ctx.createGain();
        src.connect(filt); filt.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(vol, now + start);
        g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        src.start(now + start); src.stop(now + start + dur + 0.02);
      };

      if (kind === "ok") {
        // Bright piano chord: C5-E5-G5 with slight stagger
        tone(523.25, 0,    0.38, "triangle", 0.20);
        tone(659.25, 0.02, 0.35, "triangle", 0.16);
        tone(783.99, 0.04, 0.32, "triangle", 0.13);
        // Harmonic shimmer
        tone(1046.5, 0.03, 0.22, "sine",     0.06);

      } else if (kind === "wrong") {
        // Low thud
        noise(0, 0.14, 0.12);
        // Descending "doh" — two tones sliding down
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.setValueAtTime(260, now);
        o.frequency.exponentialRampToValueAtTime(160, now + 0.28);
        g.gain.setValueAtTime(0.22, now);
        g.gain.linearRampToValueAtTime(0.18, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        o.start(now); o.stop(now + 0.35);
        // Sub-bass thump
        tone(80, 0, 0.18, "sine", 0.15);

      } else if (kind === "win") {
        // 5-note victory fanfare: G4-C5-E5-G5-C6
        const melody = [392, 523.25, 659.25, 783.99, 1046.5];
        melody.forEach((f, i) => {
          tone(f,      i * 0.1,       0.5 - i * 0.04, "triangle", 0.22 - i * 0.02);
          tone(f * 2,  i * 0.1 + 0.01, 0.3,            "sine",     0.06);
        });
        // Final shimmer chord
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          tone(f, 0.52 + i * 0.02, 0.6, "sine", 0.12 - i * 0.02);
        });

      } else if (kind === "combo") {
        // Sparkle arpeggio — ascending thirds
        [659.25, 783.99, 987.77, 1174.66].forEach((f, i) => {
          tone(f, i * 0.07, 0.25, "sine", 0.14, i * 8);
        });

      } else if (kind === "chest") {
        // Classic coin collect: quick ascending blip pair
        tone(1046.5, 0,    0.1, "square", 0.14);
        tone(1318.5, 0.08, 0.18, "square", 0.14);
        tone(1567.98, 0.16, 0.22, "triangle", 0.12);
      }
    } catch (e) {}
  };

  // Alias so existing beep() calls keep working
  const beep = playSound;

  /* ---------- progression ---------- */
  /* ---------- progression ---------- */

  const unlockedCount = (() => {
    let n = 1;
    for (let i = 0; i < FLAT.length - 1; i++) { if ((prog.done?.[FLAT[i].unit.id] || 0) > 0) n = i + 2; else break; }
    return n;
  })();

  /* ---------- session building ---------- */

  const prepQuestion = (q) => {
    const p = normalizeQuestion(q);
    if (p.type === "mc") p.shuffledChoices = shuffle(p.choices);
    if (p.type === "order") p.shuffledWords = shuffle((p.words || []).map((w, i) => ({ w, id: i })));
    if (p.type === "match") { p.left = shuffle((p.pairs || []).map((pr, i) => ({ t: pr[0], id: i }))); p.right = shuffle((p.pairs || []).map((pr, i) => ({ t: pr[1], id: i }))); }
    p.answerAid = answerAidFor(p);
    return p;
  };

  const startUnit = (u, section) => {
    setSheet(null);
    if ((prog.hearts ?? 0) <= 0) { setHeartsModal(true); return; }
    const snap = prog.resume && prog.resume.unitId === u.id ? prog.resume : null;
    if (snap && Array.isArray(snap.order)) {
      // Resume a saved session: same question order, same position, same score.
      const qs = snap.order.map((o) => {
        const src = UNITS.find((x) => x.id === o.u);
        return o.i === -1 ? { type: "match", pairs: src.pairs, _u: o.u, _i: -1 } : { ...src.questions[o.i], _u: o.u, _i: o.i };
      }).map(prepQuestion);
      beginSession({ title: u.title, color: section.color, dark: section.dark, unitId: u.id, review: false, host: hostForUnit(u.id), questions: qs });
      setQi(Math.min(snap.qi || 0, qs.length - 1));
      sessionXPRef.current = snap.xp || 0;
      setSessionXP(sessionXPRef.current);
      setLessonStats({ right: snap.right || 0, wrong: snap.wrong || 0 });
      save({ resume: null });
      return;
    }
    const qs = u.questions.map((q, i) => ({ ...q, _u: u.id, _i: i }));
    const withMatch = [...shuffle(qs), { type: "match", pairs: u.pairs, _u: u.id, _i: -1 }];
    beginSession({ title: u.title, color: section.color, dark: section.dark, unitId: u.id, review: false, host: hostForUnit(u.id), questions: withMatch.map(prepQuestion) });
  };

  const startTestOut = (sec, si) => {
    setSheet(null);
    if ((prog.hearts ?? 0) <= 0) { setHeartsModal(true); return; }
    const pool = sec.unitIds.flatMap((uid) => {
      const u = UNITS.find((x) => x.id === uid);
      return u.questions.map((qq, i) => ({ ...qq, _u: uid, _i: i }));
    }).filter((qq) => qq.type !== "match");
    beginSession({ title: `${L.test}: ${sec.title}`, color: sec.color, dark: sec.dark, unitId: "_test", review: false, testOut: si, host: "valeria", questions: shuffle(pool).slice(0, 10).map(prepQuestion) });
  };

  const smartPracticeFocus = () => {
    const topWeak = Object.entries(prog.weak || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (topWeak && SMART_FOCUS_BY_SKILL[topWeak]) return { ...SMART_FOCUS_BY_SKILL[topWeak], reason: "weak" };
    const dueKeys = Object.entries(prog.srs || {}).filter(([, it]) => it.due <= Date.now()).map(([k]) => k);
    const dueUnits = dueKeys.map((k) => k.split("|")[0]);
    const dueFocus = SMART_FOCI.find((f) => f.units.some((uid) => dueUnits.includes(uid)));
    if (dueFocus) return { ...dueFocus, reason: "due" };
    const nextF = FLAT.find((f) => !((prog.done || {})[f.unit.id] > 0));
    const nextFocus = SMART_FOCI.find((f) => f.units.includes(nextF?.unit.id));
    if (nextFocus) return { ...nextFocus, reason: "next" };
    return { ...SMART_DEFAULT_FOCUS, reason: "default" };
  };

  const smartPracticeItems = (focus, count = 5) => {
    const now = Date.now();
    const entries = Object.entries(prog.srs || {});
    let pool = entries
      .filter(([k, it]) => it.due <= now || focus.units.includes(k.split("|")[0]))
      .sort((a, b) => {
        const au = focus.units.includes(a[0].split("|")[0]) ? 0 : 1;
        const bu = focus.units.includes(b[0].split("|")[0]) ? 0 : 1;
        return au - bu || a[1].due - b[1].due;
      });
    if (pool.length < count) pool = [...pool, ...entries.filter((e) => !pool.includes(e)).sort((a, b) => a[1].due - b[1].due)];
    const startedUnitIds = Object.keys(prog.done || {}).filter((id) => (prog.done[id] || 0) > 0);
    const startedUnits = startedUnitIds.length ? startedUnitIds : UNITS.slice(0, 3).map((u) => u.id);
    const items = [];
    const seen = new Set();
    const addItem = (uid, idx, qq, skill) => {
      if (!qq || seen.has(`${uid}|${idx}`) || qq.type === "match") return false;
      items.push(prepQuestion({ ...qq, _u: uid, _i: idx, skill: skill || focus.skill }));
      seen.add(`${uid}|${idx}`);
      return true;
    };
    pool.slice(0, count).forEach(([k]) => {
      const [uid, iStr] = k.split("|"); const i = parseInt(iStr, 10);
      const u = UNITS.find((x) => x.id === uid); const qq = u?.questions[i];
      addItem(uid, i, qq, "Repaso");
    });
    shuffle(focus.units).forEach((uid) => {
      const u = getUnit(uid);
      if (!u) return;
      const preferred = shuffle(u.questions.map((qq, i) => ({ qq, i })))
        .sort((a, b) => {
          const aw = ["type", "transform", "listen"].includes(a.qq.type) ? 0 : 1;
          const bw = ["type", "transform", "listen"].includes(b.qq.type) ? 0 : 1;
          return aw - bw;
        });
      preferred.forEach(({ qq, i }) => { if (items.length < count) addItem(uid, i, qq); });
    });
    let attempts = 0;
    while (items.length < count && attempts < 60) {
      attempts += 1;
      const uid = startedUnits[Math.floor(Math.random() * startedUnits.length)];
      const u = UNITS.find((x) => x.id === uid);
      if (!u) break;
      const idx = Math.floor(Math.random() * u.questions.length);
      addItem(uid, idx, u.questions[idx], skillFor({ ...u.questions[idx], _u: uid }));
    }
    return items;
  };

  /* Smart Practice: a focused 5-item sprint chosen from weaknesses, due SRS,
     recent progress, and high-value contrasts. It spends no hearts. */
  const startQuickPractice = () => {
    const focus = smartPracticeFocus();
    const items = smartPracticeItems(focus, 5);
    if (items.length < 3) return;
    beginSession({
      title: uiLang === "en" ? `Smart Practice: ${focus.title.en}` : `Práctica inteligente: ${focus.title.es}`,
      color: D.purple,
      dark: D.purpleDark,
      unitId: "_smart",
      review: true,
      host: focus.host,
      scenario: uiLang === "en"
        ? `Ándale noticed this is worth sharpening: ${focus.desc.en}`
        : `Ándale notó que vale la pena afilar esto: ${focus.desc.es}`,
      questions: shuffle(items).slice(0, 5),
    });
  };

  const startReview = (force = false) => {
    const now = Date.now();
    const entries = Object.entries(prog.srs || {});
    let pool = entries.filter(([, it]) => it.due <= now);
    if (!pool.length && force) pool = [...entries]; // nothing due: pull the soonest anyway
    const items = pool
      .sort((a, b) => a[1].due - b[1].due)
      .slice(0, 12)
      .map(([k]) => {
        const [uid, iStr] = k.split("|"); const i = parseInt(iStr, 10);
        const u = UNITS.find((x) => x.id === uid); const qq = u?.questions[i];
        return qq ? prepQuestion({ ...qq, _u: uid, _i: i }) : null;
      })
      .filter(Boolean);
    if (!items.length) return;
    beginSession({ title: uiLang === "en" ? "Scheduled review" : "Repaso programado", color: D.blue, dark: D.blueDark, unitId: "_review", review: true, host: "luna", questions: shuffle(items) });
  };

  const startMission = (mission) => {
    const picks = mission.units.flatMap((uid) => {
      const q1 = sampleQuestion(uid, (q) => q.type === "listen" || q.type === "transform" || q.type === "order");
      const q2 = sampleQuestion(uid, (q) => q.type === "mc" || q.type === "type");
      return [q1, q2].filter(Boolean);
    }).slice(0, 7);
    const story = STORIES.find((st) => st.id === mission.storyId) || STORIES[0];
    const storyCheck = story?.questions?.[0] ? {
      type: "mc",
      prompt: `Lectura relámpago: ${story.questions[0].prompt}`,
      choices: story.questions[0].choices,
      answer: story.questions[0].answer,
      explain: `Esta pista viene del cuento «${story.title}».`,
      _u: "_story",
      _i: -1,
      skill: "Lectura",
    } : null;
    beginSession({
      title: mission.title,
      color: mission.color,
      dark: mission.dark,
      unitId: `_mission:${mission.id}`,
      missionId: mission.id,
      scenario: mission.intro,
      review: false,
      host: mission.host,
      questions: shuffle([...picks, storyCheck].filter(Boolean)).map(prepQuestion),
    });
  };

  const startDailyWorkout = () => {
    const due = Object.entries(prog.srs || {}).sort((a, b) => a[1].due - b[1].due)[0];
    const reviewQ = due ? (() => {
      const [uid, iStr] = due[0].split("|");
      const i = parseInt(iStr, 10);
      const qq = getUnit(uid)?.questions[i];
      return qq ? { ...qq, _u: uid, _i: i, skill: "Repaso" } : null;
    })() : null;
    const story = STORIES[Math.floor(Math.random() * STORIES.length)];
    const storyQ = story.questions[Math.floor(Math.random() * story.questions.length)];
    const items = [
      sampleQuestion("subj1", (q) => q.type === "mc" && /Trampa|duda|subjuntivo|certeza/i.test(q.explain || "")),
      sampleQuestion("pret", (q) => q.type === "listen" || q.type === "order"),
      sampleQuestion("mex", (q) => q.type === "mc" || q.type === "type"),
      reviewQ || sampleQuestion("pronombres", (q) => q.type !== "match"),
      { type: "mc", prompt: `Del cuento «${story.title}»: ${storyQ.prompt}`, choices: storyQ.choices, answer: storyQ.answer, explain: "Lectura rápida: contexto, no traducción palabra por palabra.", _u: "_story", _i: -1, skill: "Lectura" },
    ].filter(Boolean);
    beginSession({ title: L.workoutToday, color: D.gold, dark: D.goldDark, unitId: "_daily", daily: true, review: false, host: "luna", questions: items.map(prepQuestion) });
  };

  const startTodayScene = (scene, { full } = {}) => {
    if ((prog.hearts ?? 0) <= 0) { setHeartsModal(true); return; }
    const day2Hoy = isDay2Return({
      streak: prog.streak,
      lastDay: prog.lastDay,
      today: todayStr(),
    });
    const firstHoy = !full && isShortHoy({
      streak: prog.streak,
      lastDay: prog.lastDay,
      today: todayStr(),
    });
    const picks = scene.units.flatMap((uid) => {
      const q1 = sampleQuestion(uid, (q) => q.type === "listen" || q.type === "transform" || q.type === "order");
      const q2 = sampleQuestion(uid, (q) => q.type === "mc" || q.type === "type");
      return [q1, q2].filter(Boolean);
    }).slice(0, 3);
    const story = STORIES.find((st) => st.id === scene.storyId) || STORIES[0];
    const storyQ = story.questions[Math.floor(Math.random() * story.questions.length)];
    const listenBeat = {
      type: "listen",
      text: scene.line,
      answers: scene.answers,
      explain: scene.explain,
      _u: "_today",
      _i: -1,
      skill: "Escucha real",
    };
    const sceneBeat = {
      type: "mc",
      prompt: uiLang === "en" ? scene.questionEn : scene.question,
      choices: scene.choices,
      answer: scene.answer,
      explain: scene.explain,
      _u: "_today",
      _i: -1,
      skill: "Vida real",
    };
    const storyBeat = {
      type: "mc",
      prompt: `Postal de ${story.title}: ${storyQ.prompt}`,
      choices: storyQ.choices,
      answer: storyQ.answer,
      explain: `Pista cultural desbloqueada desde «${story.title}».`,
      _u: "_story",
      _i: -1,
      skill: "Lectura",
    };
    // Day-2 return: native setup · line · Q only (already ≤4). First session keeps extras, cap 4.
    // Full / Más path only when a scene grows past 4.
    const shortQueue = day2Hoy ? [sceneBeat, listenBeat] : [sceneBeat, listenBeat, ...picks];
    const items = firstHoy
      ? trimHoyBeats(shortQueue, { firstHoy: true })
      : trimHoyBeats(shuffle([listenBeat, sceneBeat, ...picks, storyBeat]), { firstHoy: false });
    beginSession({
      title: uiLang === "en" ? scene.titleEn : scene.title,
      color: scene.color,
      dark: scene.dark,
      unitId: `_today:${scene.id}`,
      todaySceneId: scene.id,
      firstHoy,
      scenario: uiLang === "en" ? scene.setupEn : scene.setup,
      review: false,
      host: scene.host,
      questions: items.map(prepQuestion),
    });
  };

  const startDialogue = (duel = DUELS[0]) => {
    awardLockRef.current.delete("dialogue");
    setActiveDuel(duel);
    setDialogue({ idx: 0, score: 0, done: false, log: [] });
    setScreen("dialogue");
  };

  const startRivalIntro = () => setScreen("rivalIntro");

  const startRivalDuel = () => {
    const r = prog.rival || {};
    const { rounds, pDiego } = rivalConfig(r.rank || 0);
    const weakSkill = worstSkillOf(prog.weak);
    const focus = (weakSkill && SMART_FOCUS_BY_SKILL[weakSkill]) || smartPracticeFocus();
    let items = smartPracticeItems(focus, rounds);
    // Thin focus? top up from the runner-up weak skill so the duel is full length.
    if (items.length < rounds) {
      const second = Object.entries(prog.weak || {})
        .filter(([s]) => s !== weakSkill).sort((a, b) => b[1] - a[1])[0]?.[0];
      const f2 = second && SMART_FOCUS_BY_SKILL[second];
      if (f2) {
        const have = new Set(items.map((q) => `${q._u}|${q._i}`));
        smartPracticeItems(f2, rounds).forEach((q) => { if (!have.has(`${q._u}|${q._i}`)) items.push(q); });
      }
    }
    items = shuffle(items).slice(0, rounds);
    if (items.length < 3) return; // not enough started content to duel fairly
    // Diego's per-round hits are fixed at the start (no moving the goalposts mid-duel).
    const diego = items.map(() => Math.random() < pDiego);
    beginSession({
      title: uiLang === "en" ? "Diego's Challenge" : "El Reto de Diego",
      color: COACHES.diego.color, dark: COACHES.diego.dark,
      unitId: "_rival", review: false, rival: true, host: "diego",
      weakSkill, diego, questions: items,
    });
  };

  const startSafeRisky = () => {
    awardLockRef.current.delete("safe");
    setSafeGame({ items: shuffle(SAFE_RISKY_ITEMS).slice(0, 5), idx: 0, score: 0, streak: 0, bestStreak: 0, selected: null, done: false, awarded: false });
    setScreen("safeRisky");
  };

  const startMatchPairs = () => {
    const pairs = buildMatchRound(prog, UNITS, MATCH_ROUND_CAP);
    if (pairs.length < 2) return;
    // Keep the match award lock across Otra ronda / rematch. Clearing it
    // paid another +4 every replay (Hand, live 645c3cb).
    setMatchGame(startMatchRun(pairs));
    setScreen("matchPairs");
  };

  const onMatchPracticeTap = (side, id) => {
    setMatchGame((cur) => {
      if (!cur || cur.done) return cur;
      const next = applyMatchPick(cur, side, id);
      if (next.miss) {
        beep("bad");
        setTimeout(() => setMatchGame((g) => (g && g.miss ? { ...g, miss: false } : g)), 400);
        return next;
      }
      if (next.matched?.length > (cur.matched?.length || 0)) beep("ok");
      if (next.done && !cur.done) queueMicrotask(() => finishMatchPairs());
      return next;
    });
  };

  const finishMatchPairs = () => {
    if (!lockAward("match")) return;
    const xp = MATCH_PRACTICE_XP;
    const t = todayStr();
    const y = yesterdayStr();
    save((prev) => {
      const streak = prev.lastDay === t ? prev.streak || 0 : prev.lastDay === y ? (prev.streak || 0) + 1 : 1;
      return {
        ...prev,
        xp: (prev.xp || 0) + xp,
        xpToday: (prev.lastDay === t ? prev.xpToday || 0 : 0) + xp,
        streak,
        lastDay: t,
      };
    });
    setMatchGame((g) => (g ? { ...g, done: true, awarded: true, xp } : g));
    setBurst(Date.now());
    beep("win");
  };

  const chooseSafeRisky = (choice) => {
    if (!safeGame || safeGame.selected) return;
    const item = safeGame.items[safeGame.idx];
    const correct = choice === item.answer;
    if (correct) beep("ok"); else beep("bad");
    const streak = correct ? (safeGame.streak || 0) + 1 : 0;
    setSafeGame({ ...safeGame, selected: choice, score: safeGame.score + (correct ? 1 : 0), streak, bestStreak: Math.max(safeGame.bestStreak || 0, streak) });
  };

  const nextSafeRisky = () => {
    if (!safeGame || safeGame.done || safeGame.awarded) return;
    if (safeGame.idx + 1 >= safeGame.items.length) {
      if (!lockAward("safe")) return;
      const perfectBonus = safeGame.score === safeGame.items.length ? 6 : 0;
      const streakBonus = Math.max(0, (safeGame.bestStreak || 0) - 2);
      const gems = 4 + safeGame.score + perfectBonus;
      const xp = 8 + safeGame.score * 3 + streakBonus * 2 + perfectBonus;
      save((prev) => ({
        ...prev,
        xp: (prev.xp || 0) + xp,
        gems: (prev.gems || 0) + gems,
        missions: {
          ...(prev.missions || {}),
          safeRiskyBest: Math.max(prev.missions?.safeRiskyBest || 0, safeGame.score),
          safeRiskyStreak: Math.max(prev.missions?.safeRiskyStreak || 0, safeGame.bestStreak || 0),
          gameTrophies: {
            ...(prev.missions?.gameTrophies || {}),
            ...(safeGame.score === safeGame.items.length ? { safePerfect: true } : {}),
          },
        },
      }));
      setSafeGame({ ...safeGame, done: true, awarded: true, gems, xp });
      setBurst(Date.now());
      beep("win");
      return;
    }
    setSafeGame({ ...safeGame, idx: safeGame.idx + 1, selected: null });
  };

  const snakeChoicesFor = (qq) => {
    const answer = qq.type === "mc" ? qq.answer : qq.answers?.[0];
    let choices = qq.type === "mc" ? [...(qq.choices || [])] : (qq.answerAid?.tiles || []).map((t) => t.w);
    if (choices.length < 4) choices = [...choices, ...relatedDistractorsFor(answer, qq, 4 - choices.length)];
    choices = [...new Map(choices.filter(Boolean).map((c) => [strip(c), c])).values()];
    if (!choices.some((c) => strip(c) === strip(answer))) choices.unshift(answer);
    return shuffle(choices).slice(0, 4);
  };

  const buildSnakeQuestion = (questions, turn) => {
    const qq = questions[turn % questions.length];
    const answer = qq.type === "mc" ? qq.answer : qq.answers?.[0];
    return {
      prompt: qq.type === "type" ? `${qq.prompt}${qq.note ? ` ${qq.note}` : ""}` : qq.prompt,
      answer,
      choices: snakeChoicesFor(qq),
      explain: qq.explain || qq.note || "",
      skill: qq.skill || skillFor(qq),
    };
  };

  const startSnakes = () => {
    awardLockRef.current.delete("snake");
    const focus = smartPracticeFocus();
    const questions = smartPracticeItems(focus, 12).filter((qq) => {
      const answer = qq.type === "mc" ? qq.answer : qq.answers?.[0];
      return ["mc", "type", "transform"].includes(qq.type) && (qq.type === "mc" || (answer && answerTokens(answer).length <= 4));
    });
    if (questions.length < 4) return;
    setSnakeGame({
      focus,
      questions,
      tile: 1,
      turn: 0,
      roll: null,
      selected: null,
      status: "idle",
      pendingTile: null,
      finalTile: null,
      link: null,
      correct: 0,
      wrong: 0,
      ladders: 0,
      slides: 0,
      done: false,
      question: buildSnakeQuestion(questions, 0),
    });
    setScreen("snakes");
  };

  const chooseSnake = (choice) => {
    if (!snakeGame || snakeGame.status !== "idle" || snakeGame.done) return;
    const correct = strip(choice) === strip(snakeGame.question.answer);
    const roll = correct ? 2 + ((snakeGame.turn + snakeGame.correct) % 4) : 1;
    const pendingTile = Math.min(24, Math.max(1, snakeGame.tile + (correct ? roll : -roll)));
    const link = correct ? SNAKES_LADDERS_LINKS[pendingTile] : null;
    const finalTile = Math.min(24, Math.max(1, link ? link.to : pendingTile));
    if (correct) beep(link?.kind === "ladder" ? "combo" : "ok"); else beep("bad");
    setSnakeGame({
      ...snakeGame,
      selected: choice,
      status: correct ? "correct" : "wrong",
      roll,
      pendingTile,
      finalTile,
      link,
      correct: (snakeGame.correct || 0) + (correct ? 1 : 0),
      wrong: (snakeGame.wrong || 0) + (correct ? 0 : 1),
      ladders: (snakeGame.ladders || 0) + (link?.kind === "ladder" ? 1 : 0),
      slides: (snakeGame.slides || 0) + (link?.kind === "snake" ? 1 : 0),
    });
  };

  const nextSnake = () => {
    if (!snakeGame || snakeGame.status === "idle" || snakeGame.done || snakeGame.awarded) return;
    const done = snakeGame.finalTile >= 24;
    if (done) {
      if (!lockAward("snake")) return;
      const perfect = snakeGame.wrong === 0;
      const xp = 18 + (snakeGame.correct || 0) * 4 + (snakeGame.ladders || 0) * 3 + (perfect ? 10 : 0);
      const gems = 8 + (snakeGame.correct || 0) + (perfect ? 8 : 0);
      save((prev) => {
        const trophies = {
          ...(prev.missions?.gameTrophies || {}),
          snakeFirstWin: true,
          ...(perfect ? { snakePerfect: true } : {}),
        };
        return {
          ...prev,
          xp: (prev.xp || 0) + xp,
          gems: (prev.gems || 0) + gems,
          missions: {
            ...(prev.missions || {}),
            snakeBest: Math.max(prev.missions?.snakeBest || 0, snakeGame.correct || 0),
            gameTrophies: trophies,
          },
        };
      });
      const trophies = {
        ...(prog.missions?.gameTrophies || {}),
        snakeFirstWin: true,
        ...(perfect ? { snakePerfect: true } : {}),
      };
      setSnakeGame({ ...snakeGame, tile: 24, done: true, awarded: true, xp, gems, trophies, status: "done" });
      setBurst(Date.now());
      beep("win");
      return;
    }
    const turn = snakeGame.turn + 1;
    setSnakeGame({
      ...snakeGame,
      tile: snakeGame.finalTile,
      turn,
      roll: null,
      selected: null,
      status: "idle",
      pendingTile: null,
      finalTile: null,
      link: null,
      question: buildSnakeQuestion(snakeGame.questions, turn),
    });
  };

  const jeopardyCategories = SMART_FOCI.filter((f) => ["subj", "past", "porpara", "mex", "pron", "reg"].includes(f.id)).slice(0, 6);
  const jeopardyValues = [100, 200, 300];

  const buildJeopardyQuestion = (focus, value) => {
    const pool = focus.units.flatMap((uid) => {
      const u = getUnit(uid);
      return u ? u.questions.map((qq, i) => ({ ...qq, _u: uid, _i: i })).filter((qq) => {
        const ans = Array.isArray(qq.answers) ? qq.answers[0] : qq.answers || qq.answer || "";
        return qq.type === "mc" || (qq.type === "type" && answerTokens(ans).length <= 3);
      }) : [];
    });
    const picked = shuffle(pool)[Math.min(pool.length - 1, Math.floor(value / 100) - 1)] || pool[0];
    if (!picked) return null;
    const qj = prepQuestion(picked);
    const answer = qj.type === "mc" ? qj.answer : qj.answers?.[0];
    let choices = qj.type === "mc" ? [...(qj.choices || [])] : (qj.answerAid?.tiles || []).map((t) => t.w);
    if (choices.length < 4) choices = [...choices, ...relatedDistractorsFor(answer, qj, 4 - choices.length)];
    choices = shuffle([...new Map(choices.filter(Boolean).map((c) => [strip(c), c])).values()]).slice(0, 4);
    if (!choices.some((c) => strip(c) === strip(answer))) choices[0] = answer;
    return {
      key: `${focus.id}-${value}`,
      focus,
      value,
      prompt: qj.type === "type" ? `${qj.prompt}${qj.note ? ` ${qj.note}` : ""}` : qj.prompt,
      answer,
      choices: shuffle(choices),
      explain: qj.explain || qj.note || focus.desc.es,
      host: focus.host,
    };
  };

  const startJeopardy = () => {
    awardLockRef.current.delete("jeopardy");
    const doubleCat = jeopardyCategories[(new Date().getDate() + (prog.xp || 0)) % jeopardyCategories.length];
    const doubleValue = jeopardyValues[((prog.streak || 0) + new Date().getDay()) % jeopardyValues.length];
    setJeopardy({ score: 0, correct: 0, wrong: 0, used: {}, active: null, selected: null, status: "idle", complete: false, awarded: false, doubleKey: `${doubleCat.id}-${doubleValue}` });
    setScreen("jeopardy");
  };

  const openJeopardyTile = (focus, value) => {
    if (!jeopardy || jeopardy.used?.[`${focus.id}-${value}`]) return;
    const active = buildJeopardyQuestion(focus, value);
    if (!active) return;
    active.double = active.key === jeopardy.doubleKey;
    active.stake = active.double ? value * 2 : value;
    if (active.double) beep("combo");
    setJeopardy({ ...jeopardy, active, selected: null, status: "idle", used: { ...(jeopardy.used || {}), [active.key]: true } });
  };

  const chooseJeopardy = (choice) => {
    if (!jeopardy?.active || jeopardy.status !== "idle") return;
    const correct = strip(choice) === strip(jeopardy.active.answer);
    if (correct) beep("ok"); else beep("bad");
    const stake = jeopardy.active.stake || jeopardy.active.value;
    setJeopardy({
      ...jeopardy,
      selected: choice,
      status: correct ? "correct" : "wrong",
      score: jeopardy.score + (correct ? stake : -Math.floor(stake / 2)),
      correct: (jeopardy.correct || 0) + (correct ? 1 : 0),
      wrong: (jeopardy.wrong || 0) + (correct ? 0 : 1),
    });
  };

  const closeJeopardyPrompt = () => {
    if (!jeopardy) return;
    const complete = Object.keys(jeopardy.used || {}).length >= jeopardyCategories.length * jeopardyValues.length;
    let next = { ...jeopardy, active: null, selected: null, status: "idle", complete };
    if (complete && !jeopardy.awarded && lockAward("jeopardy")) {
      const gems = Math.max(8, Math.round(Math.max(0, jeopardy.score) / 150) + (jeopardy.wrong === 0 ? 10 : 0));
      const xp = Math.max(15, Math.round(Math.max(0, jeopardy.score) / 40) + (jeopardy.correct || 0) * 2);
      save((prev) => ({
        ...prev,
        xp: (prev.xp || 0) + xp,
        gems: (prev.gems || 0) + gems,
        missions: {
          ...(prev.missions || {}),
          jeopardyBest: Math.max(prev.missions?.jeopardyBest || 0, jeopardy.score),
          gameTrophies: { ...(prev.missions?.gameTrophies || {}), jeopardyClear: true },
        },
      }));
      next = { ...next, awarded: true, gems, xp };
      beep("win");
      setBurst(Date.now());
    }
    setJeopardy(next);
  };

  const beginSession = (s) => {
    awardLockRef.current.delete("lesson");
    itemXpLockRef.current = new Set();
    sessionXPRef.current = 0;
    setSession(s); setQi(0); setStatus("idle"); setSelected(null); setTyped(""); setTypedTileIds([]); setPlaced([]); setPlaceAt(null);
    setMatchSel(null); setMatched([]); setMatchWrong(null);
    setSessionXP(0); setCombo(0); setLessonStats({ right: 0, wrong: 0 });
    setShowWhy(false); setFailKind("hearts");
    setShowWordOrderTip(false);
    setWordOrderMiss("");
    setScreen("lesson");
  };

  const q = session?.questions?.[qi] ?? null;

  /* ---------- grading ---------- */

  const typedFromField = () => {
    const live = inputRef.current?.value;
    return live != null ? live : typed;
  };

  const check = () => {
    if (!q || status !== "idle") return;
    let r;
    let tip = false;
    let missText = "";
    if (q.type === "mc") { if (selected == null) return; r = q.shuffledChoices[selected] === q.answer ? "correct" : "wrong"; }
    else if (q.type === "order") {
      if (!placed.length) return;
      const built = placed.map((id) => q.shuffledWords.find((t) => t.id === id).w).join(" ");
      const g = gradeListedPhrase(built, q);
      tip = !!g.tip;
      if (tip) missText = built;
      r = g.status === "wrong" ? "wrong" : "correct";
    }
    else if (q.type === "match") { return; }
    else { /* type | listen | transform — listed equivalents accept / soft-credit before a hard fail */
      const given = typedFromField();
      if (given !== typed) setTyped(given);
      if (!given.trim()) return;
      const g = gradeListedPhrase(given, q);
      tip = !!g.tip;
      if (tip) missText = given;
      r = g.status === "wrong" ? "wrong" : g.almost ? "almost" : "correct";
    }
    setShowWordOrderTip(tip);
    setWordOrderMiss(missText);
    applyResult(r);
  };

  const applyResult = (r) => {
    if (!q || !session) return;
    const awardKey = itemAwardKey(session, qi, q);
    if (itemXpLockRef.current.has(awardKey)) return;
    itemXpLockRef.current.add(awardKey);
    setStatus(r);
    const thisKey = `${q._u}|${q._i}`;
    setQuip(pickQuip(session.host, r === "wrong" ? "wrong" : "correct"));
    if (r === "wrong") {
      beep("bad"); setCombo(0);
      if (!q._requeued) setLessonStats((s) => ({ ...s, wrong: s.wrong + 1 }));
      const sk = skillFor(q);
      save((prev) => {
        let p = { ...prev };
        if (!session.review && !session.rival) {
          const wasFull = p.hearts === MAX_HEARTS;
          p.hearts = Math.max(0, (p.hearts ?? MAX_HEARTS) - 1);
          if (wasFull) p.heartT = Date.now();
        }
        if (q._i >= 0) {
          const srs = { ...(p.srs || {}) };
          const it = srs[thisKey] || { ef: 2.5, reps: 0, interval: 0, due: Date.now() };
          srs[thisKey] = sm2(it, 1);
          p = { ...p, srs };
        }
        p = { ...p, weak: { ...(p.weak || {}), [sk]: (p.weak?.[sk] || 0) + 1 } };
        return p;
      });
    } else {
      beep("ok");
      const hard = q.type === "order" || q.type === "listen" || q.type === "transform";
      // Review cards are 4 XP (Bien). Do not use the lesson 10/12 rate — that
      // made a single Repasar item jump +12 and then stack gems on finish.
      let base = session.review
        ? (r === "almost" ? 3 : 4)
        : q._requeued ? 5 : r === "almost" ? 7 : hard ? 12 : 10;
      if (!session.review && prog.rayo && rayoLeft != null && rayoLeft > 0) base += 3;
      const newCombo = combo + 1;
      const bonus = !session.review && newCombo % 4 === 0 ? 5 : 0;
      if (bonus) {
        setInter({ text: INTERSTITIALS[(newCombo / 4 - 1) % INTERSTITIALS.length], key: Date.now() });
        setBurst(Date.now());
        setTimeout(() => setInter(null), 1100);
        beep("combo");
      }
      setCombo(newCombo);
      addSessionXP(base + bonus);
      if (!q._requeued) setLessonStats((s) => ({ ...s, right: s.right + 1 }));
      const sk = skillFor(q);
      if (!session.review) {
        save((prev) => {
          let p = prev;
          if ((prev.weak?.[sk] || 0) > 0) {
            p = { ...p, weak: { ...(p.weak || {}), [sk]: Math.max(0, (p.weak?.[sk] || 0) - 1) } };
          }
          // SRS: schedule a correct answer as "Bien" (q=4). Seed first-contact
          // items too — so learned material, not only past mistakes, enters
          // spaced repetition. Graduated items (interval >= GRADUATE_DAYS) drop
          // out of rotation. Returning `prev` unchanged is a no-op (React bails).
          if (q._i >= 0) {
            const srs = { ...(p.srs || {}) };
            const existing = srs[thisKey] || { ef: 2.5, reps: 0, interval: 0, due: Date.now() };
            const upd = sm2(existing, 4);
            if (upd.interval >= GRADUATE_DAYS) delete srs[thisKey]; else srs[thisKey] = upd;
            p = { ...p, srs };
          }
          return p;
        });
      }
    }
  };

  // 4-button self-grade in review mode (Léxico's Miss/Hard/Good/Easy, miss handled by wrong path)
  const gradeAndNext = (qual) => {
    const thisKey = `${q._u}|${q._i}`;
    if (q._i >= 0) {
      save((prev) => {
        const srs = { ...(prev.srs || {}) };
        const it = srs[thisKey] || { ef: 2.5, reps: 0, interval: 0, due: Date.now() };
        const upd = sm2(it, qual);
        if (upd.interval >= GRADUATE_DAYS) delete srs[thisKey]; else srs[thisKey] = upd;
        return { ...prev, srs };
      });
    }
    next();
  };

  const onMatchTap = (side, idx, id) => {
    if (matched.includes(id)) return;
    if (!matchSel) { setMatchSel({ side, idx, id }); return; }
    if (matchSel.side === side) { setMatchSel({ side, idx, id }); return; }
    if (matchSel.id === id) {
      const nm = [...matched, id];
      setMatched(nm); setMatchSel(null); beep("ok");
      if (nm.length === q.pairs.length) setTimeout(() => applyResult("correct"), 250);
    } else {
      setMatchWrong({ a: matchSel, b: { side, idx, id } }); setMatchSel(null); beep("bad");
      setTimeout(() => setMatchWrong(null), 400);
    }
  };

  const next = () => {
    if (status === "wrong" && session.testOut != null && lessonStats.wrong >= 3) { setFailKind("test"); setScreenQuip(pickQuip(session.host, "sad")); setScreen("failed"); return; }
    if (status === "wrong" && (prog.hearts ?? 0) <= 0 && !session.review && !session.rival) { setFailKind("hearts"); setScreenQuip(pickQuip(session.host, "sad")); setScreen("failed"); return; }
    if (status !== "wrong" && shouldHoyEarlyWin({ firstHoy: session.firstHoy, hits: lessonStats.right })) {
      finishLesson();
      return;
    }
    let queue = session.questions;
    if (status === "wrong" && session.testOut == null && !session.rival) {
      // mastery loop: the miss comes back near the end of the lesson
      queue = [...queue, prepQuestion({ ...q, _requeued: true })];
      setSession({ ...session, questions: queue });
    }
    if (qi + 1 >= queue.length) { finishLesson(); return; }
    setQi(qi + 1); setStatus("idle"); setSelected(null); setTyped(""); setTypedTileIds([]); setPlaced([]); setPlaceAt(null);
    setMatchSel(null); setMatched([]); setMatchWrong(null); setShowWhy(false);
    setWasTimeout(false); setRayoLeft(null);
    setShowWordOrderTip(false);
    setWordOrderMiss("");
  };

  const finishLesson = () => {
    if (session?.awarded || !lockAward("lesson")) return;
    beep("win");
    const t = todayStr();
    const xpNow = sessionXPRef.current;
    // Perfect is a flat +5 once on a real lesson — never on Repasar.
    // Review spends no hearts, so a clean one-card must stay +4, not 4+5.
    const perfectBonus = lessonStats.wrong === 0 && !session.review ? 5 : 0;
    const earned = xpNow + perfectBonus;

    // ---- El Reto de Diego: resolve the duel (your hits vs Diego's, ties to the champ) ----
    let rivalOut = null;
    if (session.rival) {
      const youHits = lessonStats.right;
      const diegoHits = (session.diego || []).filter(Boolean).length;
      const won = youHits > diegoHits;
      const prevR = prog.rival || { rank: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, lastResult: null, lastSkill: null };
      const newRank = Math.max(0, Math.min(RIVAL_RANKS.length - 1, (prevR.rank || 0) + (won ? 1 : -1)));
      const delta = newRank - (prevR.rank || 0);
      const streakR = won ? (prevR.streak || 0) + 1 : 0;
      rivalOut = {
        won, you: youHits, diego: diegoHits, delta,
        rankName: rivalRankName(newRank, uiLang),
        reaction: diegoReaction(won, delta, uiLang),
        record: `${(prevR.wins || 0) + (won ? 1 : 0)}\u2013${(prevR.losses || 0) + (won ? 0 : 1)}${streakR > 1 ? ` \u00b7 ${uiLang === "en" ? "streak" : "racha"} ${streakR}` : ""}`,
      };
      if (won) setBurst(Date.now());
    }
    // Flat 10/15 gems only for a real session. A 1-card Repasar must not jump +10.
    const hits = lessonStats.right;
    const gemCap = session.review ? 10 : 15;
    const gemsEarned = session.rival
      ? (rivalOut?.won ? 20 : 5)
      : (session.questions.length <= 2 ? hits : gemCap);
    setSession((s) => (s ? { ...s, awarded: true, earnedXP: earned, earnedGems: gemsEarned, perfectBonus } : s));
    const before = levelOf(prog.xp || 0).idx, after = levelOf((prog.xp || 0) + earned).idx;
    setLevelUp(after > before ? LEVELS[after][1] : null);
    setScreenQuip(session.firstHoy ? "" : pickQuip(session.host, "win"));
    save((prev) => {
      const streak = streakAfterWin(prev, t, yesterdayStr());
      let xpToday = prev.lastDay === t ? prev.xpToday || 0 : 0;
      let earnedFreeze = 0;
      if (prev.lastDay !== t) {
        if (streak > 0 && streak % 7 === 0) earnedFreeze = 1;
      }
      const freezes = Math.min(2, (prev.freezes || 0) + earnedFreeze);
      const done = { ...prev.done };
      let testOutSrs = null;
      if (session.testOut != null) {
        /* Test-out previously only set the unit done-flag — but the SRS system
           (srs[unitId|questionIndex] with ef/interval/due) was never seeded, so
           tested-out users had an EMPTY review queue. Fix: when a section is
           tested out cleanly, schedule every question in those units to be due
           in 3 days at default SM-2 params. The user enters the review system
           organically instead of hitting a content dead end. */
        if (lessonStats.wrong <= 2) {
          const srs = { ...(prev.srs || {}) };
          const seedDue = Date.now() + 3 * 864e5;
          SECTIONS[session.testOut].unitIds.forEach((id) => {
            done[id] = Math.max(2, done[id] || 0); // 2 = mastered via test-out
            const u = UNITS.find((x) => x.id === id);
            if (u) u.questions.forEach((_, qi) => {
              const key = `${id}|${qi}`;
              if (!srs[key]) srs[key] = { ef: 2.5, interval: 3, reps: 1, due: seedDue };
            });
          });
          testOutSrs = srs;
        }
      } else if (!session.review && !session.rival && !session.missionId && !session.daily) {
        done[session.unitId] = (done[session.unitId] || 0) + 1;
      }
      let rivalPatch = null;
      if (session.rival) {
        const youHits = lessonStats.right;
        const diegoHits = (session.diego || []).filter(Boolean).length;
        const won = youHits > diegoHits;
        const prevR = prev.rival || { rank: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, lastResult: null, lastSkill: null };
        const newRank = Math.max(0, Math.min(RIVAL_RANKS.length - 1, (prevR.rank || 0) + (won ? 1 : -1)));
        const streakR = won ? (prevR.streak || 0) + 1 : 0;
        rivalPatch = {
          rank: newRank,
          wins: (prevR.wins || 0) + (won ? 1 : 0),
          losses: (prevR.losses || 0) + (won ? 0 : 1),
          streak: streakR,
          bestStreak: Math.max(prevR.bestStreak || 0, streakR),
          lastResult: won ? "win" : "loss",
          lastSkill: session.weakSkill || prevR.lastSkill || null,
          seen: true,
        };
      }
      const missions = { ...(prev.missions || {}) };
      if (session.missionId) missions[session.missionId] = Math.max(missions[session.missionId] || 0, lessonStats.wrong === 0 ? 3 : lessonStats.wrong <= 2 ? 2 : 1);
      if (session.daily) missions[`daily-${t}`] = true;
      if (session.todaySceneId) missions[`scene-${t}`] = session.todaySceneId;
      const coachStats = { ...(prev.coachStats || {}) };
      const coachKey = session.daily ? "luna" : session.review ? "valeria" : session.host;
      coachStats[coachKey] = (coachStats[coachKey] || 0) + 1;
      const patch = {
        xp: (prev.xp || 0) + earned,
        streak, lastDay: t, xpToday: xpToday + earned, done, missions,
        gems: (prev.gems || 0) + gemsEarned,
        perfects: (prev.perfects || 0) + (lessonStats.wrong === 0 ? 1 : 0),
        resume: null, coachStats, freezes,
        earnedFreeze: earnedFreeze ? t : prev.earnedFreeze, quickTipSeen: true,
      };
      // Review lessons refund one heart against fresh state. Normal lessons leave
      // hearts alone — they were already decremented per-miss against fresh state,
      // so a concurrent regen tick is never clobbered.
      if (session.review) patch.hearts = Math.min(MAX_HEARTS, (prev.hearts ?? 0) + 1);
      if (testOutSrs) patch.srs = testOutSrs;
      if (rivalPatch) patch.rival = rivalPatch;
      return { ...prev, ...patch };
    });
    if (rivalOut) { setRivalOutcome(rivalOut); setScreen("rivalDone"); }
    else setScreen("done");
  };

  const refillHearts = () => {
    if ((prog.gems || 0) < REFILL_COST || prog.hearts === MAX_HEARTS) return;
    save({ gems: prog.gems - REFILL_COST, hearts: MAX_HEARTS, heartT: Date.now() });
  };

  const openStory = (story) => {
    setStoryView(story); setWordSel(null); setWordReveal(true); setAnsSel({}); setParaIdx(0); setScreen("story");
  };

  const claimStory = (story, correct) => {
    if (prog.stories?.[story.id]) return;
    beep("win"); setBurst(Date.now());
    const earned = 5 + correct * 10;
    const t = todayStr();
    save((prev) => {
      if (prev.stories?.[story.id]) return prev;
      let streak = prev.streak || 0;
      let xpToday = prev.lastDay === t ? prev.xpToday || 0 : 0;
      let earnedFreeze = 0;
      if (prev.lastDay !== t) {
        const y = yesterdayStr();
        streak = prev.lastDay === y ? streak + 1 : 1;
        if (streak > 0 && streak % 7 === 0) earnedFreeze = 1;
      }
      return {
        ...prev,
        xp: (prev.xp || 0) + earned,
        xpToday: xpToday + earned,
        streak,
        lastDay: t,
        freezes: Math.min(2, (prev.freezes || 0) + earnedFreeze),
        earnedFreeze: earnedFreeze ? t : prev.earnedFreeze,
        gems: (prev.gems || 0) + 10,
        stories: { ...(prev.stories || {}), [story.id]: true },
        coachStats: { ...(prev.coachStats || {}), rafa: ((prev.coachStats || {}).rafa || 0) + 1 },
        storyCollectibles: { ...(prev.storyCollectibles || {}), [story.id]: true },
      };
    });
  };

  const discoverStoryWord = (story, key) => {
    if (!story?.id || !key) return;
    const found = prog.storyFinds?.[story.id] || [];
    if (found.includes(key)) return;
    beep("ok"); setBurst(Date.now());
    save({ storyFinds: { ...(prog.storyFinds || {}), [story.id]: [...found, key] } });
  };

  const answerStoryCheckpoint = (story, idx, choice, answer) => {
    const ok = choice === answer;
    beep(ok ? "ok" : "bad");
    save({ storyChecks: { ...(prog.storyChecks || {}), [story.id]: { ...(prog.storyChecks?.[story.id] || {}), [idx]: choice } } });
  };

  const chooseVoice = (name) => {
    window.__andaleVoiceName = name;
    save({ voiceName: name });
  };

  const stopNarration = () => {
    try { stopSpeak(); } catch (e) {}
    try {
      if (narrationRef.current) {
        narrationRef.current.pause();
        narrationRef.current.currentTime = 0;
      }
    } catch (e) {}
  };

  const playStoryParagraph = (story, pi, text) => {
    stopNarration();
    const ttsFallback = () => {
      if (audioMode === "shadow") speak(text, 0.82, { chunk: true, shadow: true });
      else speak(text, audioMode === "slow" ? 0.68 : 0.88, { chunk: true, pauseMs: audioMode === "slow" ? 420 : 220 });
    };
    /* Flip to true once the /audio/*.m4a files exist (see ffmpeg note at STORY_AUDIO).
       Until then every paragraph goes straight to TTS — no probe, no delay. */
    const USE_CACHED_AUDIO = false;
    const audioUrl = USE_CACHED_AUDIO ? STORY_AUDIO[story.id]?.[pi] : null;
    if (audioMode === "normal" && audioUrl) {
      /* The cached-audio branch can fail FOUR ways: 404 (onerror), rejected play()
         (catch), wrong MIME, or — the killer — a sandboxed/stalled media fetch that
         never fires ANY callback. The watchdog covers the silent case; the `settled`
         flag guarantees exactly one fallback so error+catch can't double-speak. */
      let settled = false;
      const fallback = () => {
        if (settled) return;
        settled = true;
        try { narrationRef.current?.pause(); } catch (e) {}
        narrationRef.current = null;
        ttsFallback();
      };
      try {
        const a = new Audio(audioUrl);
        narrationRef.current = a;
        a.playbackRate = 1;
        const watchdog = setTimeout(fallback, 1200);
        a.addEventListener("playing", () => { settled = true; clearTimeout(watchdog); }, { once: true });
        a.onerror = () => { clearTimeout(watchdog); fallback(); };
        a.play().catch(() => { clearTimeout(watchdog); fallback(); });
        return;
      } catch (e) { fallback(); return; }
    }
    ttsFallback();
  };

  const claimChest = (id) => {
    if (prog.chests?.[id]) return;
    beep("chest"); setBurst(Date.now());
    save({ gems: (prog.gems || 0) + 25, chests: { ...(prog.chests || {}), [id]: true } });
  };

  const addFlashcard = (story, word, sentence) => {
    if (!word?.display || !word.en) return;
    const key = strip(word.display);
    const cards = { ...(prog.flashcards || {}) };
    const existing = cards[key] || {};
    cards[key] = {
      word: word.display,
      en: word.en,
      note: word.note || existing.note || "",
      story: story.title,
      sentence,
      added: existing.added || Date.now(),
      due: Date.now(),
      interval: existing.interval || 0,
      reps: existing.reps || 0,
      lapses: existing.lapses || 0,
    };
    beep("ok");
    setBurst(Date.now());
    save({ flashcards: cards });
  };

  const gradeFlashcard = (card, quality) => {
    const key = strip(card.word);
    const cards = { ...(prog.flashcards || {}) };
    const current = cards[key] || card;
    const nextInterval = quality === "again" ? 0 : quality === "hard" ? Math.max(1, current.interval || 1) : quality === "good" ? Math.max(2, (current.interval || 1) * 2) : Math.max(4, (current.interval || 1) * 3);
    cards[key] = {
      ...current,
      reps: (current.reps || 0) + 1,
      lapses: (current.lapses || 0) + (quality === "again" ? 1 : 0),
      interval: nextInterval,
      due: Date.now() + (quality === "again" ? 10 * 60 * 1000 : nextInterval * DAY),
    };
    beep(quality === "again" ? "bad" : "ok");
    const earned = quality === "again" ? 0 : 2;
    const t = todayStr();
    const y = yesterdayStr();
    save((prev) => {
      const streak = earned === 0 ? prev.streak : prev.lastDay === t ? prev.streak || 0 : prev.lastDay === y ? (prev.streak || 0) + 1 : 1;
      return {
        ...prev,
        flashcards: cards,
        xp: (prev.xp || 0) + earned,
        xpToday: (prev.lastDay === t ? prev.xpToday || 0 : 0) + earned,
        streak,
        lastDay: earned ? t : prev.lastDay,
      };
    });
    setFlashFlipped(false);
    setFlashMode((m) => (m === "es-en" ? "en-es" : "es-en"));
    setFlashRun((run) => advanceFlashRun(run, earned));
  };

  const startFlashRun = () => {
    const deck = buildFlashDeck(prog, UNITS, FLASH_SESSION_CAP);
    if (!deck.length) {
      setFlashRun({ deck: [], idx: 0, done: true, reviewed: 0, xpEarned: 0 });
      return;
    }
    setFlashFlipped(false);
    setFlashMode("es-en");
    setFlashRun({ deck, idx: 0, done: false, reviewed: 0, xpEarned: 0 });
  };

  useEffect(() => {
    if (flashRun != null) return;
    const deck = buildFlashDeck(prog, UNITS, FLASH_SESSION_CAP);
    if (!deck.length) return;
    setFlashRun({ deck, idx: 0, done: false, reviewed: 0, xpEarned: 0 });
  }, [flashRun, prog]);

  const chooseDialogue = (choice) => {
    if (!dialogue || dialogue.done) return;
    beep(choice.score >= 2 ? "ok" : "bad");
    const nextScore = dialogue.score + choice.score;
    const nextLog = [...dialogue.log, { npc: activeDuel.steps[dialogue.idx].npc, choice }];
    const done = dialogue.idx + 1 >= activeDuel.steps.length;
    setDialogue({ idx: done ? dialogue.idx : dialogue.idx + 1, score: nextScore, done, log: nextLog });
    if (done) {
      if (!lockAward("dialogue")) return;
      const stars = nextScore >= 8 ? 3 : nextScore >= 5 ? 2 : 1;
      const t = todayStr();
      const y = yesterdayStr();
      const xp = 20 + stars * 5;
      save((prev) => {
        const streak = prev.lastDay === t ? prev.streak || 0 : prev.lastDay === y ? (prev.streak || 0) + 1 : 1;
        return {
          ...prev,
          xp: (prev.xp || 0) + xp,
          xpToday: (prev.lastDay === t ? prev.xpToday || 0 : 0) + xp,
          streak,
          lastDay: t,
          gems: (prev.gems || 0) + 8,
          missions: { ...(prev.missions || {}), [activeDuel.id]: Math.max(prev.missions?.[activeDuel.id] || 0, stars) },
          coachStats: { ...(prev.coachStats || {}), diego: ((prev.coachStats || {}).diego || 0) + 1 },
          weak: stars < 3 ? { ...(prev.weak || {}), Registro: (prev.weak?.Registro || 0) + 1 } : prev.weak,
        };
      });
      setBurst(Date.now());
    }
  };

  const insertChar = (ch) => {
    setTypedTileIds([]);
    setPlaceAt(null);
    const el = inputRef.current;
    if (!el) { setTyped((t) => t + ch); return; }
    const s = el.selectionStart ?? typed.length, e = el.selectionEnd ?? typed.length;
    setTyped(typed.slice(0, s) + ch + typed.slice(e));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + 1, s + 1); });
  };

  const setTypedFromTiles = (ids) => {
    const tiles = q?.answerAid?.tiles || [];
    setTypedTileIds(ids);
    setTyped(ids.map((id) => tiles.find((t) => t.id === id)?.w).filter(Boolean).join(" "));
  };

  const removeAnswerTile = (id) => {
    if (status !== "idle") return;
    const idx = typedTileIds.indexOf(id);
    if (idx < 0) return;
    setPlaceAt(idx);
    setTypedFromTiles(typedTileIds.filter((x) => x !== id));
  };

  const chooseAnswerTile = (tile) => {
    if (!q?.answerAid || status !== "idle") return;
    if (q.answerAid.mode === "choices") {
      setPlaceAt(null);
      setTypedTileIds([tile.id]);
      setTyped(tile.w);
      return;
    }
    if (typedTileIds.includes(tile.id)) { removeAnswerTile(tile.id); return; }
    // A stray first chip ("Es") must not wipe a sentence already typed in the field.
    if (typedTileIds.length === 0 && /\s/.test((inputRef.current?.value ?? typed).trim())) return;
    setTypedFromTiles(insertIdAt(typedTileIds, tile.id, placeAt));
    setPlaceAt(null);
  };

  const placeOrderTile = (id) => {
    if (status !== "idle") return;
    setPlaced((p) => insertIdAt(p, id, placeAt));
    setPlaceAt(null);
  };

  const unplaceOrderTile = (id) => {
    if (status !== "idle") return;
    const idx = placed.indexOf(id);
    if (idx < 0) return;
    setPlaceAt(idx);
    setPlaced((p) => p.filter((x) => x !== id));
  };

  useEffect(() => {
    if (screen === "lesson" && (q?.type === "type" || q?.type === "listen" || q?.type === "transform") && !q?.answerAid && status === "idle") inputRef.current?.focus();
    if (screen === "lesson" && q?.type === "listen" && status === "idle") setTimeout(() => speak(q.text), 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, screen]);

  // Drop leftover overlays when the view swaps so the first tap hits the new screen.
  useEffect(() => {
    setConfirmExit(false);
    setWordSel(null);
    setSheet(null);
  }, [screen]);

  // Keep the in-flight lesson/story across a remount (DevTools dock / viewport
  // resize / reload). Progress already lives in andale-v3; this is the missing
  // screen/combo/session slice. A resize must flush, never reset.
  liveRef.current = {
    screen, tab, session, qi, status, selected, typed, typedTileIds, placed,
    matchSel, matched, sessionXP, itemXpLock: [...itemXpLockRef.current], combo, lessonStats, showWhy, failKind, quip,
    screenQuip, storyView, paraIdx, storyMode, ansSel, wordReveal, dialogue,
    rivalOutcome, activeDuel, safeGame, jeopardy, snakeGame, matchGame,
  };

  const applyLive = (live) => {
    if (!live || live.screen === "home") {
      if (live?.tab) setTab(live.tab);
      return;
    }
    if (live.screen === "lesson" && !Array.isArray(live.session?.questions)) return;
    if (live.tab) setTab(live.tab);
    if (live.session) {
      setSession(live.session);
      if (live.session.awarded) awardLockRef.current.add("lesson");
    }
    if (live.qi != null) setQi(live.qi);
    if (live.status) setStatus(live.status);
    if (live.selected != null) setSelected(live.selected);
    if (live.typed != null) setTyped(live.typed);
    if (live.typedTileIds) setTypedTileIds(live.typedTileIds);
    if (live.placed) setPlaced(live.placed);
    if (live.matchSel != null) setMatchSel(live.matchSel);
    if (live.matched) setMatched(live.matched);
    if (live.sessionXP != null) {
      sessionXPRef.current = live.sessionXP;
      setSessionXP(live.sessionXP);
    }
    if (Array.isArray(live.itemXpLock)) itemXpLockRef.current = new Set(live.itemXpLock);
    if (live.combo != null) setCombo(live.combo);
    if (live.lessonStats) setLessonStats(live.lessonStats);
    if (live.showWhy != null) setShowWhy(live.showWhy);
    if (live.failKind) setFailKind(live.failKind);
    if (live.quip != null) setQuip(live.quip);
    if (live.screenQuip != null) setScreenQuip(live.screenQuip);
    if (live.storyId) {
      const story = STORIES.find((st) => st.id === live.storyId);
      if (story) setStoryView(story);
      else if (live.screen === "story") return;
    }
    if (live.paraIdx != null) setParaIdx(live.paraIdx);
    if (live.storyMode) setStoryMode(live.storyMode);
    if (live.ansSel) setAnsSel(live.ansSel);
    if (live.wordReveal != null) setWordReveal(live.wordReveal);
    if (live.dialogue) {
      setDialogue(live.dialogue);
      if (live.dialogue.done) awardLockRef.current.add("dialogue");
    }
    if (live.rivalOutcome) setRivalOutcome(live.rivalOutcome);
    if (live.activeDuelId) {
      const duel = DUELS.find((d) => d.id === live.activeDuelId);
      if (duel) setActiveDuel(duel);
    }
    if (live.safeGame) {
      setSafeGame(live.safeGame);
      if (live.safeGame.awarded || live.safeGame.done) awardLockRef.current.add("safe");
    }
    if (live.jeopardy) {
      setJeopardy(live.jeopardy);
      if (live.jeopardy.awarded) awardLockRef.current.add("jeopardy");
    }
    if (live.snakeGame) {
      setSnakeGame(live.snakeGame);
      if (live.snakeGame.awarded || live.snakeGame.done) awardLockRef.current.add("snake");
    }
    if (live.matchGame) {
      setMatchGame(live.matchGame);
      if (live.matchGame.awarded || live.matchGame.done) awardLockRef.current.add("match");
    }
    setScreen(live.screen);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [liveRes, progRes] = await Promise.all([storage.get(LIVE_KEY), storage.get(STORAGE_KEY)]);
        let progress = null;
        try { progress = acceptProgress(JSON.parse(progRes?.value || "null")); } catch (e) {}
        // Leftover andale-v3-live (lesson/done) must not hide first-visit splash.
        if (!cancelled && !isFirstVisit(progress) && liveRes?.value) {
          let live = null;
          try { live = JSON.parse(liveRes.value); } catch (e) {}
          live = acceptLive(live);
          if (live?.session?.todaySceneId && live.session.firstHoy == null && isShortHoy({
            streak: progress?.streak,
            lastDay: progress?.lastDay,
            today: todayStr(),
          })) {
            live = { ...live, session: { ...live.session, firstHoy: true } };
          }
          if (live) applyLive(live);
        }
      } catch (e) {}
      if (!cancelled) liveReady.current = true;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!liveReady.current) return;
    writeLive(snapshotLive(liveRef.current));
  }, [screen, tab, session, qi, status, selected, typed, typedTileIds, placed, matchSel, matched, sessionXP, combo, lessonStats, storyView, paraIdx, storyMode, ansSel, dialogue, safeGame, jeopardy, snakeGame, matchGame]);

  useEffect(() => {
    const flush = () => {
      if (!liveReady.current) return;
      writeLive(snapshotLive(liveRef.current));
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("visibilitychange", flush);
    window.addEventListener("resize", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("visibilitychange", flush);
      window.removeEventListener("resize", flush);
    };
  }, []);

  // Modo Rayo countdown
  useEffect(() => {
    if (screen !== "lesson" || !prog.rayo || status !== "idle" || !q) { setRayoLeft(null); return; }
    const total = RAYO_SECS[q.type] || 15;
    setRayoLeft(total);
    const t0 = Date.now();
    const iv = setInterval(() => {
      const left = total - (Date.now() - t0) / 1000;
      if (left <= 0) { clearInterval(iv); setRayoLeft(0); setTimedOut(true); }
      else setRayoLeft(left);
    }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, screen, status, prog.rayo, session]);

  // rayo expiry → counts as a miss (fresh closure here, unlike inside setInterval)
  useEffect(() => {
    if (timedOut) {
      setTimedOut(false);
      if (status === "idle" && q && screen === "lesson") { setWasTimeout(true); applyResult("wrong"); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut]);

  useEffect(() => {
    if (screen !== "lesson") return;
	    const h = (e) => {
	      const inInput = e.target.tagName === "INPUT";
	      if (inInput) return;
	      if (e.key === "Enter") {
	        e.preventDefault();
	        if (status === "idle") check();
        else if (session?.review && (status === "correct" || status === "almost")) gradeAndNext(4);
        else next();
        return;
      }
	      if (!q) return;
      if (status === "idle" && q.type === "mc") { const n = parseInt(e.key, 10); if (n >= 1 && n <= q.shuffledChoices.length) setSelected(n - 1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, status, q, selected, typed, placed]);

  const pct = session ? Math.round((qi / session.questions.length) * 100) : 0;
  const srsEntries = Object.entries(prog.srs || {});
  const dueCount = srsEntries.filter(([, it]) => it.due <= Date.now()).length;
  const trackedCount = srsEntries.length;
  const nextDue = srsEntries.length ? Math.min(...srsEntries.map(([, it]) => it.due)) : null;
  const nextDueLabel = nextDue ? (nextDue <= Date.now() ? "ahora" : new Date(nextDue).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })) : null;
  const lvl = levelOf(prog.xp || 0);
  const totalCrowns = Object.values(prog.done || {}).reduce((a, b) => a + b, 0);
  const nextHeartMin = Math.max(0, Math.ceil((HEART_REGEN_MS - ((now - (prog.heartT || now)) % HEART_REGEN_MS)) / 60000));
  const weakSpots = Object.entries(prog.weak || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const smartFocus = smartPracticeFocus();
  const todayKey = dayKeyFromDate(new Date(now));
  const todayScene = hoySceneForDay(TODAY_SCENES, todayKey);
  const tomorrowScene = hoySceneForDay(TODAY_SCENES, nextDayKey(todayKey));
  const hoyStill = hoyStillFor(todayScene);
  const showLevelTheater = hasLearnerProgress(prog);
  const showWeaknessMap = hasWeaknessData(prog);
  const showAtajos = hasUnlockedShortcuts(prog);
  const showDoorMeta = showDoorMetaChrome({ streak: prog.streak });
  const showPitch = showColdPitch({ streak: prog.streak });
  const todaySceneDone = !!prog.missions?.[`scene-${todayKey}`];
  const dailyDone = !!prog.missions?.[`daily-${todayKey}`];
  const storyCount = STORIES.filter((st) => prog.stories?.[st.id]).length;
  const flashcards = Object.values(prog.flashcards || {}).sort((a, b) => (a.due || 0) - (b.due || 0));
  const dueFlashcards = flashcards.filter((c) => (c.due || 0) <= Date.now());
  const flashDeck = flashRun?.deck || [];
  const activeCard = flashRun && !flashRun.done && flashRun.idx < flashDeck.length ? flashDeck[flashRun.idx] : null;
  const uiLang = prog.uiLang === "en" ? "en" : "es";
  const L = UI[uiLang];
  const greetingPool = GREETINGS[uiLang] || GREETINGS.es;
  const greeting = greetingPool[greetingPick % greetingPool.length];
  const paulinaVoice = pickPaulina(voices);
  const renderVoiceSelect = () => voices.length > 0 && (
    <select value={prog.voiceName || ""} onChange={(e) => chooseVoice(e.target.value)}
      aria-label={uiLang === "en" ? "Reading voice" : "Voz de lectura"}
      style={{ minWidth: 150, flex: "1 1 150px", border: `2px solid ${D.line}`, borderRadius: 10, padding: "6px 8px", fontFamily: "inherit", fontWeight: 800, fontSize: 12, color: D.ink, background: D.card }}>
      <option value="">{paulinaVoice
        ? (uiLang === "en" ? "Paulina (default · Mexico)" : "Paulina (predeterminada · México)")
        : (uiLang === "en" ? "Best Mexican voice (es-MX)" : "Mejor voz mexicana (es-MX)")}</option>
      {voicesForPicker(voices).map((v) => <option key={`${v.name}-${v.lang}`} value={v.name}>{voicePickerLabel(v)}</option>)}
    </select>
  );
  const coachUnlocks = [
    {
      id: "luna-patterns",
      coach: "luna",
      title: uiLang === "en" ? "Luna's pattern board" : "Tablero de patrones de Luna",
      desc: uiLang === "en" ? "Earn 100 XP to unlock her grammar field notes." : "Gana 100 XP para desbloquear sus notas de campo.",
      ok: (prog.xp || 0) >= 100,
    },
    {
      id: "rafa-postcard",
      coach: "rafa",
      title: uiLang === "en" ? "Don Rafa's mercado postcard" : "Postal del mercado de Don Rafa",
      desc: uiLang === "en" ? "Finish any story to collect it." : "Termina cualquier cuento para coleccionarla.",
      ok: storyCount >= 1,
    },
    {
      id: "valeria-briefcase",
      coach: "valeria",
      title: uiLang === "en" ? "Valeria's executive briefcase" : "Portafolio ejecutivo de Valeria",
      desc: uiLang === "en" ? "Score 2+ stars in any Challenge." : "Saca 2+ estrellas en cualquier misión.",
      ok: Object.values(prog.missions || {}).some((v) => typeof v === "number" && v >= 2),
    },
    {
      id: "diego-headset",
      coach: "diego",
      title: uiLang === "en" ? "Diego's call-room headset" : "Diadema de llamadas de Diego",
      desc: uiLang === "en" ? "Win the Dialogue Duel with 2+ stars." : "Gana el Duelo de diálogo con 2+ estrellas.",
      ok: (prog.missions?.[DIALOGUE_DUEL.id] || 0) >= 2,
    },
  ];

  /* ---------------- RENDER ---------------- */

  const inLesson = screen !== "home";
  const splashOpen = isFirstVisit(prog);
  const paywallGate = shouldShowSoftPaywall({
    paywallSeen: !!prog.paywallSeen,
    todaySceneDone,
    streak: prog.streak,
    lastDay: prog.lastDay,
    today: todayKey,
    screen,
    splash: splashOpen,
  });
  // Gate only — a stale session flag must not keep the modal after midnight / day-2.
  // Bajío glow beat sits after ¡Eso! / That's it. and before the wall.
  const showSoftPaywall = paywallGate && !bajioUnlockFlash && !bajioFlashPending;
  useEffect(() => {
    if (showSoftPaywall) setSoftPaywall(true);
    else {
      setSoftPaywall(false);
      setPaywallArmed(false);
    }
  }, [showSoftPaywall]);
  useEffect(() => {
    if (!showSoftPaywall) {
      setPaywallArmed(false);
      return undefined;
    }
    const arm = setTimeout(() => setPaywallArmed(true), 400);
    return () => clearTimeout(arm);
  }, [showSoftPaywall]);
  useEffect(() => {
    if (isBajioUnlockFlashLive()) {
      setBajioUnlockFlash(true);
      return;
    }
  }, []);
  useEffect(() => {
    if (!bajioUnlockFlash) return undefined;
    const hide = setTimeout(() => {
      markBajioUnlockFlashLive(false);
      setBajioUnlockFlash(false);
    }, BAJIO_UNLOCK_FLASH_MS);
    return () => clearTimeout(hide);
  }, [bajioUnlockFlash]);
  const dismissSoftPaywall = (plan, { fromBackdrop } = {}) => {
    if (fromBackdrop && !paywallArmed) return;
    setSoftPaywall(false);
    setPaywallArmed(false);
    if (!plan) {
      setPostDismissHandoff(true);
      setTab("camino");
      const showA2hs = shouldShowA2hsSheet({
        a2hsSeen: !!prog.a2hsSeen,
        freeDismiss: true,
        ...a2hsDisplayEnv(),
      });
      if (showA2hs) setA2hsSheet(true);
      save({ paywallSeen: true, ...(showA2hs ? { a2hsSeen: true } : {}) });
      return;
    }
    save({ paywallSeen: true, unlockedPrem: true, paywallPlan: plan });
  };
  const dismissA2hs = () => {
    setA2hsSheet(false);
    save({ a2hsSeen: true });
  };
  const awardDoctoraStreak = () => {
    if (!lockAward("phrase-doctor")) return;
    const t = todayStr();
    const y = yesterdayStr();
    save((prev) => ({
      ...prev,
      streak: streakAfterWin(prev, t, y),
      lastDay: t,
      xpToday: prev.lastDay === t ? prev.xpToday || 0 : 0,
    }));
  };

  const finishDoctoraWin = () => {
    awardDoctoraStreak();
    setSession({
      firstDoctora: true,
      title: L.phraseDoctor,
      host: "valeria",
      questions: [{}],
      awarded: true,
      earnedXP: 0,
      earnedGems: 0,
    });
    setLessonStats({ right: Math.max(doctorHits, 1), wrong: 0 });
    setScreenQuip("");
    setDoctorOpen(false);
    setScreen("done");
  };

  const resetDoctorBoard = () => {
    setDoctorIdx(0);
    setDoctorHits(0);
    setDoctorReveal(false);
    setDoctorGuess("");
    setDoctorTip(false);
    setDoctorGrade(null);
    setDoctorFailed(false);
  };

  const openDoctor = () => {
    setPostDismissHandoff(false);
    if (!doctorOpen) {
      setFirstDoctora(isFirstDoctoraSession(prog));
      resetDoctorBoard();
    }
    setDoctorOpen(true);
    setTab("practica");
  };

  const continueFromWin = () => {
    const t = todayStr();
    const firstStreakEso = !!(session?.firstHoy || session?.firstDoctora);
    const next = screenAfterWinContinue({ firstDoctora: session?.firstDoctora });
    const willFlash = shouldShowBajioUnlockFlash({
      bajioUnlockSeen: !!prog.bajioUnlockSeen,
      firstStreakEso,
      streak: 1,
      paywallSeen: !!prog.paywallSeen,
    });
    save((prev) => ({
      ...progressAfterWinContinue(prev, {
        today: t,
        todaySceneId: todaySceneIdFromSession(session),
      }),
      ...(willFlash ? { bajioUnlockSeen: true } : {}),
    }));
    if (willFlash && next === "home") {
      markBajioUnlockFlashLive(true);
      setBajioUnlockFlash(true);
    } else if (willFlash) {
      setBajioFlashPending(true);
    }
    setScreen(next);
    if (next === "home") setTab("camino");
  };

  const dismissSessionClose = () => {
    setScreen("home");
    setTab("camino");
    if (bajioFlashPending) {
      setBajioFlashPending(false);
      markBajioUnlockFlashLive(true);
      setBajioUnlockFlash(true);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: D.bg, color: D.ink, fontFamily: "'Nunito','Avenir Next',system-ui,sans-serif", paddingBottom: inLesson ? 0 : "calc(70px + env(safe-area-inset-bottom, 0px))" }}>
      <style>{`
        @font-face { font-family: 'Nunito'; font-style: normal; font-weight: 600; font-display: swap; src: url('${import.meta.env.BASE_URL}fonts/nunito-600.woff2') format('woff2'); }
        @font-face { font-family: 'Nunito'; font-style: normal; font-weight: 700; font-display: swap; src: url('${import.meta.env.BASE_URL}fonts/nunito-700.woff2') format('woff2'); }
        @font-face { font-family: 'Nunito'; font-style: normal; font-weight: 800; font-display: swap; src: url('${import.meta.env.BASE_URL}fonts/nunito-800.woff2') format('woff2'); }
        @font-face { font-family: 'Nunito'; font-style: normal; font-weight: 900; font-display: swap; src: url('${import.meta.env.BASE_URL}fonts/nunito-900.woff2') format('woff2'); }
        * { -webkit-tap-highlight-color: transparent; }
        button, input, select, textarea { touch-action: manipulation; }
        .duo-btn:active:not(:disabled) { transform: translateY(2px); border-bottom-width: 2px !important; }
        .duo-btn { transition: transform .05s, filter .1s; }
        .duo-btn:hover:not(:disabled) { filter: brightness(1.05); }
        button:focus-visible, input:focus-visible { outline: 3px solid ${D.blue}; outline-offset: 2px; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .bounce { animation: bounce 1.1s ease-in-out infinite; }
        @keyframes pop { 0%{opacity:.35} 100%{opacity:1} }
        .pop { animation: pop .15s ease; }
        @keyframes wiggle { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
        .wiggle { animation: wiggle .25s ease; }
        @keyframes idleBob { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-5px) rotate(1deg)} }
        .idle { animation: idleBob 2.4s ease-in-out infinite; }
        @keyframes confettiFall { 0%{transform:translateY(-10vh) rotate(0deg);opacity:1} 100%{transform:translateY(105vh) rotate(720deg);opacity:.9} }
        .confetti-bit { position:fixed; top:0; border-radius:2px; pointer-events:none; z-index:50; animation: confettiFall linear forwards; }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }
        .shimmer { position:absolute; top:0; bottom:0; width:30%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent); animation:shimmer 1.6s ease-in-out infinite; }
        @keyframes pulseRing { 0%{box-shadow:0 0 0 0 rgba(88,204,2,.45)} 70%{box-shadow:0 0 0 16px rgba(88,204,2,0)} 100%{box-shadow:0 0 0 0 rgba(88,204,2,0)} }
        .pulse { animation: pulseRing 1.6s ease-out infinite; }
        @keyframes bajioGlow { 0%,100%{box-shadow:0 0 0 0 rgba(255,200,0,.55),0 0 14px rgba(88,204,2,.55)} 50%{box-shadow:0 0 0 10px rgba(255,200,0,0),0 0 22px rgba(88,204,2,.85)} }
        .bajio-glow { animation: bajioGlow 1.8s ease-in-out infinite; }
        @keyframes interPop { 0%{transform:scale(.4) rotate(-6deg);opacity:0} 30%{transform:scale(1.15) rotate(2deg);opacity:1} 70%{transform:scale(1) rotate(0);opacity:1} 100%{transform:scale(1.05);opacity:0} }
        .inter { animation: interPop 1.1s ease forwards; }
        @keyframes flame { 0%,100%{transform:scale(1) rotate(-3deg)} 50%{transform:scale(1.18) rotate(3deg)} }
        .flame { display:inline-block; animation: flame .9s ease-in-out infinite; }
        @keyframes chestWiggle { 0%,86%,100%{transform:rotate(0)} 90%{transform:rotate(-8deg)} 94%{transform:rotate(8deg)} }
        .chest-ready { animation: chestWiggle 2.2s ease-in-out infinite; }
        @keyframes blinkK { 0%,93%,100%{ transform: scaleY(1);} 96%{ transform: scaleY(.08);} }
        .blink { animation: blinkK 4.3s infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes swayK { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
        .sway { animation: swayK 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes spinK { to { transform: rotate(360deg); } }
        .spin { animation: spinK 1.4s linear infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes jumpK { 0%{transform:translateY(0)} 30%{transform:translateY(-11px)} 55%{transform:translateY(0)} 72%{transform:translateY(-4px)} 100%{transform:translateY(0)} }
        .jump { animation: jumpK .55s ease; }
        .nametag { display:inline-block; background:#fff; border:2px solid #E5E5E5; border-radius:8px; padding:1px 8px; font-size:10px; font-weight:900; color:#777; letter-spacing:.06em; text-transform:uppercase; transform:rotate(-3deg); box-shadow:0 2px 0 rgba(0,0,0,.06); }
        @media (prefers-reduced-motion: reduce) { .bounce,.pop,.wiggle,.idle,.shimmer,.pulse,.bajio-glow,.inter,.flame,.chest-ready,.confetti-bit,.blink,.sway,.spin,.jump { animation:none !important; } }
        .node-btn { transition: transform .08s; }
        .node-btn:hover:not(:disabled) { transform: scale(1.06); }
        .node-btn:active:not(:disabled) { transform: translateY(3px); }
        .choice-card { border:2px solid ${D.line}; border-bottom-width:4px; border-radius:14px; background:${D.card}; transition: background .1s; color:${D.ink}; }
        .choice-card:hover:not(:disabled) { background:${D.subtle}; }
        .tile { border:2px solid ${D.line}; border-bottom-width:4px; background:${D.card}; border-radius:12px; padding:9px 14px; font-size:16px; font-weight:700; cursor:pointer; font-family:inherit; color:${D.ink}; }
        .tile:disabled { opacity:.3; cursor:default; }
        .tile:active:not(:disabled) { transform: translateY(2px); border-bottom-width:2px; }
        .tile-bank { display:grid; grid-template-columns:repeat(auto-fill, minmax(4.6rem, max-content)); gap:8px; justify-content:center; align-items:start; }
        .tile-slot { display:flex; min-width:4.6rem; min-height:2.55rem; }
        .tile-slot .tile { flex:1; }
      `}</style>

      {/* ---------- TOP STAT BAR ---------- */}
      {!inLesson && (
        <div style={{ position: "sticky", top: 0, zIndex: splashOpen ? 70 : 10, background: D.card, borderBottom: `2px solid ${D.line}` }}>
          <div style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <LogoMark size={34} />
              <span style={{ fontWeight: 900, fontSize: 23, color: D.green, letterSpacing: "-0.02em" }}>ándale</span>
            </div>
	            <div style={{ display: "flex", gap: 14, fontWeight: 900, fontSize: 15, alignItems: "center" }}>
              <span data-testid="streak" style={{ color: "#FF9600", display: "inline-flex", alignItems: "center", gap: 3 }} title={L.streakDays}><IcFlame size={19} className={prog.streak > 0 ? "flame" : ""} /> {prog.streak || 0}{(prog.freezes || 0) > 0 && <span title={uiLang === "en" ? "Streak freezes available" : "Congelamientos disponibles"} style={{ fontSize: 12, marginLeft: 2, color: "#1CB0F6" }}>❄️{prog.freezes}</span>}</span>
              <span style={{ color: D.red, display: "inline-flex", alignItems: "center", gap: 3 }} title={prog.hearts < MAX_HEARTS ? `${L.nextLife} ${nextHeartMin} min` : `${L.lives} ${MAX_HEARTS}/${MAX_HEARTS}`}><IcHeart size={18} /> {prog.hearts ?? MAX_HEARTS}</span>
              {(voiceDead || (voicesReady && !voices.length) || !prog.sound) && (
                <button onClick={() => { if (voiceDead || (voicesReady && !voices.length)) { setTab("perfil"); } else { save({ sound: !prog.sound }); } }} aria-label={uiLang === "en" ? "Sound" : "Sonido"}
                  title={(voicesReady && !voices.length) ? (uiLang === "en" ? "No Spanish voices — tap to fix" : "Sin voces en español — toca para arreglar") : (uiLang === "en" ? "Sound off" : "Sonido apagado")}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 10px", margin: "-12px -10px", lineHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}>
                  <IcBell size={19} off={!prog.sound} />
                  <span style={{ position: "absolute", top: -2, right: -3, width: 8, height: 8, borderRadius: 99, border: `1.5px solid ${D.card}`, background: voiceDead || (voicesReady && !voices.length) ? D.red : "#BBB" }} />
                </button>
              )}
              <LangToggle uiLang={uiLang} D={D} onPick={(code) => save({ uiLang: code })} />
            </div>
          </div>
        </div>
      )}

      {/* voice-dead banner: silence should never be mysterious */}
      {voiceDead && !inLesson && (
        <button onClick={() => setTab("perfil")}
          style={{ display: "block", width: "100%", maxWidth: 480, margin: "8px auto 0", border: `2px solid ${D.red}`, borderBottom: `4px solid ${D.redDark}`, background: D.redBg, color: D.badText, borderRadius: 14, padding: "10px 14px", fontFamily: "inherit", fontWeight: 900, fontSize: 12.5, cursor: "pointer", textAlign: "left", lineHeight: 1.4 }}>
          🔇 {uiLang === "en"
            ? "Spanish audio is unavailable on this device. Tap to open audio settings."
            : "El audio en español no está disponible en este dispositivo. Toca para abrir los ajustes de audio."}
        </button>
      )}

      {/* ---------- CAMINO (path) ---------- */}
      {!inLesson && tab === "camino" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "10px 20px 40px" }}>
          {/* host greeting — same streak ≥ 1 gate as Meta / Rayo / coach-strip */}
          {showDoorMeta && (
          <div data-testid="luna-greeting" style={{ display: "flex", gap: 10, alignItems: "flex-end", margin: "10px 0 2px" }}>
	            <div className="idle" style={{ flexShrink: 0, lineHeight: 0 }}><CoachPortrait id="luna" mood="happy" size={58} badge={dailyDone} /></div>
            <div style={{ position: "relative", border: `2px solid ${D.line}`, borderRadius: 14, padding: "9px 14px", background: D.card, marginBottom: 10, fontWeight: 800, fontSize: 14, transform: "rotate(-.4deg)" }}>
              <div style={{ position: "absolute", left: -8, bottom: 12, width: 12, height: 12, background: D.card, borderLeft: `2px solid ${D.line}`, borderBottom: `2px solid ${D.line}`, transform: "rotate(45deg)" }} />
              {prog.name ? `¡Hola, ${prog.name}! ` : ""}{greeting}
            </div>
          </div>
          )}
          {showPitch && (
          <div data-testid="home-pitch" style={{ border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, borderRadius: 14, padding: "10px 13px", background: D.card, fontSize: 13, fontWeight: 800, color: D.sub, lineHeight: 1.35 }}>
            {L.splashLine}
          </div>
          )}
          {/* First door: Hoy scene or Phrase Doctor. Subjuntivo stays under Empieza. */}
          {(() => {
            const doorKind = firstDoorHero({ todayScene, todaySceneDone, postDismissHandoff });
            const showHandoff = showPostDismissHandoff({ armed: postDismissHandoff });
            const day2Return = isDay2Return({
              streak: prog.streak,
              lastDay: prog.lastDay,
              today: todayKey,
            });
            const parkLongHoy = shouldParkHoyUnderMas(todayScene) && (day2Return || todaySceneDone);
            const showLine = showComeBackTomorrow({
              todaySceneDone,
              streak: prog.streak,
              lastDay: prog.lastDay,
              today: todayKey,
            }) && !day2Return;
            const resumeU = prog.resume && UNITS.find((u) => u.id === prog.resume.unitId);
            const nextF = FLAT.find((f) => !((prog.done || {})[f.unit.id] > 0));
            const pathUnit = resumeU || nextF?.unit;
            const pathSection = resumeU
              ? (FLAT.find((x) => x.unit.id === resumeU.id)?.section || SECTIONS[0])
              : nextF?.section;
            const openPath = () => {
              if (!pathUnit) return;
              setSheet({ unit: pathUnit, section: pathSection || SECTIONS[0], crowns: prog.done?.[pathUnit.id] || 0 });
            };
            const reviewLabel = uiLang === "en" ? "Review" : "Repasar";
            const dailyLabel = dailyDone ? L.workoutDone : L.dailyWorkout;
            const sceneStory = todayScene ? STORIES.find((st) => st.id === todayScene.storyId) : null;
            const renderHoyCard = (asHero) => {
              if (!todayScene) return null;
              return (
                <div data-testid="hoy-card" style={{ margin: asHero ? "0 0 10px" : "2px 0 16px", border: `2px solid ${todayScene.color}`, borderBottom: `5px solid ${todayScene.dark}`, borderRadius: 18, background: D.card, overflow: "hidden" }}>
                  {hoyStill && (
                    <img
                      data-testid="hoy-still"
                      src={`${import.meta.env.BASE_URL}${hoyStill}`}
                      alt=""
                      width={1024}
                      height={1024}
                      aria-hidden="true"
                      style={{ display: "block", width: "100%", height: 148, objectFit: "cover", objectPosition: "center 38%" }}
                    />
                  )}
                  <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "13px 14px 11px", background: theme === "dark" ? D.subtle : "#FFFBEF" }}>
                    <div style={{ width: 58, height: 58, borderRadius: 17, background: todayScene.color, borderBottom: `5px solid ${todayScene.dark}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <CoachPortrait id={todayScene.host} mood={todaySceneDone ? "party" : "focused"} size={54} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: ".08em", color: todayScene.dark }}>{uiLang === "en" ? "TODAY IN MEXICO" : "HOY EN MÉXICO"}</span>
                        <span data-testid="hoy-city" style={{ fontSize: 10.5, fontWeight: 900, color: D.sub, background: D.card, border: `1.5px solid ${D.line}`, borderRadius: 99, padding: "1px 7px" }}>{todayScene.city}</span>
                      </div>
                      <div data-testid="hoy-title" style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.15, marginTop: 2 }}>{uiLang === "en" ? todayScene.titleEn : todayScene.title}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: D.sub, lineHeight: 1.35, marginTop: 3 }}>{uiLang === "en" ? todayScene.setupEn : todayScene.setup}</div>
                    </div>
                  </div>
                  <div style={{ padding: "11px 14px 13px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {todayScene.units.map((uid) => (
                        <span key={uid} style={{ fontSize: 10.5, fontWeight: 900, color: D.ink, background: D.subtle, border: `1.5px solid ${D.line}`, borderRadius: 99, padding: "2px 8px" }}>
                          {getUnit(uid)?.title}
                        </span>
                      ))}
                      {sceneStory && (
                        <span style={{ fontSize: 10.5, fontWeight: 900, color: todayScene.dark, background: theme === "dark" ? D.subtle : D.greenBg, border: `1.5px solid ${todayScene.color}`, borderRadius: 99, padding: "2px 8px" }}>
                          {sceneStory.title}
                        </span>
                      )}
                    </div>
                    <button data-testid={asHero ? "hero-cta" : undefined} onClick={() => !todaySceneDone && startTodayScene(todayScene)} disabled={todaySceneDone}
                      style={{ width: "100%", border: "none", borderBottom: `4px solid ${todaySceneDone ? D.line : todayScene.dark}`, background: todaySceneDone ? D.subtle : todayScene.color, color: todaySceneDone ? D.sub : "#fff", borderRadius: 13, padding: "11px 14px", fontFamily: "inherit", fontWeight: 900, fontSize: 14.5, cursor: todaySceneDone ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <IcBolt size={18} color={todaySceneDone ? D.sub : "#fff"} />
                      {todaySceneDone ? (uiLang === "en" ? "Scene cleared" : "Escena superada") : L.playScene}
                    </button>
                  </div>
                </div>
              );
            };
            return (
              <div style={{ margin: "14px 0 18px" }}>
                <div data-testid="first-door-hero">
                  {doorKind === FIRST_DOOR_HOY ? renderHoyCard(true) : (
                    <div data-testid={showHandoff ? "post-dismiss-handoff" : undefined} style={{ background: D.purple, borderRadius: 20, padding: "16px 18px 18px", color: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,.10)", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ flexShrink: 0 }}><CoachPortrait id="valeria" mood="happy" size={68} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div data-testid="first-door-tag" style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".08em", opacity: .85 }}>{L.phraseDoctorTag}</div>
                          <div data-testid="first-door-title" style={{ fontWeight: 900, fontSize: 19, lineHeight: 1.2, marginTop: 2 }}>{L.phraseDoctor}</div>
                        </div>
                      </div>
                      <button data-testid="hero-cta" onClick={openDoctor}
                        style={{ display: "block", width: "100%", marginTop: 14, background: "#fff", color: D.purpleDark, border: "none", borderBottom: "4px solid rgba(0,0,0,.15)", borderRadius: 14, padding: "13px 16px", fontFamily: "inherit", fontWeight: 900, fontSize: 16, cursor: "pointer", letterSpacing: ".01em" }}>
                        {L.phraseDoctorCta} →
                      </button>
                    </div>
                  )}
                </div>
                {showLine && (
                  <p data-testid="come-back-tomorrow" style={{ margin: "2px 0 10px", padding: 0, border: "none", background: "none", fontSize: 13.5, fontWeight: 800, color: D.sub, lineHeight: 1.35, cursor: "default", pointerEvents: "none" }}>
                    {comeBackTomorrowLine({
                      lang: uiLang,
                      nextTitle: hoyTitleForLang(tomorrowScene, uiLang),
                      fallback: L.comeBackTomorrow,
                    })}
                  </p>
                )}
                {doorKind === FIRST_DOOR_HOY && (
                  <button data-testid="first-door-alt" onClick={openDoctor}
                    style={{ display: "block", width: "100%", marginTop: 8, background: D.card, border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, color: D.ink, borderRadius: 14, padding: "10px 12px", fontFamily: "inherit", fontWeight: 900, fontSize: 13.5, cursor: "pointer" }}>
                    {L.phraseDoctorCta}
                  </button>
                )}
                {doorKind !== FIRST_DOOR_HOY && renderHoyCard(false)}
                <button data-testid="camino-more" type="button" aria-expanded={caminoMore}
                  onClick={() => setCaminoMore((open) => !open)}
                  style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: D.sub, fontFamily: "inherit", fontWeight: 800, fontSize: 13, cursor: "pointer", padding: "4px 8px", letterSpacing: ".01em" }}>
                  {L.more}
                </button>
                {caminoMore && (
                  <div data-testid="camino-more-panel" style={{ marginTop: 8 }}>
                    {parkLongHoy && todayScene && (
                      <button data-testid="camino-more-full-hoy" type="button" onClick={() => startTodayScene(todayScene, { full: true })}
                        style={{ display: "block", width: "100%", margin: "0 0 10px", background: D.card, border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, color: D.sub, borderRadius: 14, padding: "10px 12px", fontFamily: "inherit", fontWeight: 900, fontSize: 13.5, cursor: "pointer" }}>
                        {uiLang === "en" ? todayScene.titleEn : todayScene.title}
                      </button>
                    )}
                    {pathUnit && (
                      <button data-testid="path-entry" onClick={openPath}
                        style={{ display: "block", width: "100%", margin: "0 0 10px", background: D.card, border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, color: D.sub, borderRadius: 14, padding: "10px 12px", fontFamily: "inherit", fontWeight: 900, fontSize: 13.5, cursor: "pointer" }}>
                        {L.start}
                      </button>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: dueCount > 0 ? "1fr 1fr" : "1fr", gap: 8, marginTop: 0 }}>
                      {dueCount > 0 && (
                        <button data-testid="camino-review" onClick={() => startReview(false)}
                          style={{ background: D.card, border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, color: D.ink, borderRadius: 14, padding: "10px 12px", fontFamily: "inherit", fontWeight: 900, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <IcBarbell size={16} color={D.blue} /> {reviewLabel} ({dueCount})
                        </button>
                      )}
                      <button data-testid="camino-daily-workout" onClick={() => { if (!dailyDone) startDailyWorkout(); }} disabled={dailyDone}
                        style={{ background: D.card, border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, color: dailyDone ? D.sub : D.ink, borderRadius: 14, padding: "10px 12px", fontFamily: "inherit", fontWeight: 900, fontSize: 13.5, cursor: dailyDone ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: dailyDone ? .6 : 1 }}>
                        <IcBolt size={16} color={D.gold} /> {dailyLabel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {/* daily goal + Rayo: after first win only — empty 0/40 theater stays off the door */}
          {showDoorMeta && (
          <div data-testid="door-meta" style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 6px", fontSize: 13, fontWeight: 800, color: D.sub }}>
            <div style={{ flex: 1, height: 12, background: D.line, borderRadius: 99, overflow: "hidden", position: "relative" }}>
              <div style={{ width: `${Math.min(100, Math.round(((prog.xpToday || 0) / DAILY_GOAL) * 100))}%`, height: "100%", background: D.gold, transition: "width .3s", position: "relative", overflow: "hidden", borderRadius: 99 }}>
                <div className="shimmer" />
              </div>
            </div>
	            <span>{L.goal}: {prog.xpToday || 0}/{DAILY_GOAL} XP</span>
	            <button data-testid="rayo-toggle" aria-pressed={!!prog.rayo} onClick={() => save({ rayo: !prog.rayo })} title={uiLang === "en" ? "Lightning mode: answer against the clock. Correct in time: +3 XP. Time out counts as a mistake." : "Modo Rayo: responde contra reloj. Acierta a tiempo: +3 XP. Se acaba el tiempo: cuenta como error."}
	              style={{ display: "flex", alignItems: "center", gap: 5, border: `2px solid ${prog.rayo ? D.gold : D.line}`, borderBottom: `3px solid ${prog.rayo ? D.goldDark : D.line}`, background: prog.rayo ? "#FFF6DC" : "#fff", color: prog.rayo ? D.goldDark : D.sub, borderRadius: 99, padding: "4px 12px", fontWeight: 900, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
	              <IcBolt size={14} /> {L.rayo} {prog.rayo ? L.on : L.off}
            </button>
          </div>
          )}

          {(() => {
            let g = -1; // global node index
            return SECTIONS.map((sec, si) => {
              const bg = ["#F3FBEA", "#F8F0FF", "#EAF7FE"][si % 3];
              const sectionDone = sec.unitIds.every((id) => (prog.done?.[id] || 0) > 0);
              const chestId = `chest-${si}`;
              const chestClaimed = !!prog.chests?.[chestId];
              return (
                <div key={si}>
                  <div style={{ background: sec.color, color: "#fff", borderRadius: 16, padding: "14px 18px", margin: "26px 0 0", borderBottom: `4px solid ${sec.dark}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{sec.title}</div>
	                      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>{sec.unitIds.length} {L.sectionSkills}</div>
                    </div>
                    {!sectionDone && (
                      <button onClick={() => startTestOut(sec, si)} className="duo-btn"
	                        title={uiLang === "en" ? "Section test: 10 questions, max 2 mistakes. Pass to unlock the whole section." : "Examen de la sección: 10 preguntas, máximo 2 errores. Apruébalo y desbloqueas toda la sección."}
                        style={{ background: "rgba(255,255,255,.18)", border: "2px solid rgba(255,255,255,.6)", borderBottom: "4px solid rgba(255,255,255,.6)", color: "#fff", borderRadius: 12, padding: "8px 14px", fontWeight: 900, fontSize: 12, letterSpacing: ".06em", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
	                        {L.skip} ⤓
                      </button>
                    )}
                  </div>
                  <div style={{ position: "relative", background: bg, borderRadius: "0 0 22px 22px", padding: "20px 0 26px", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" }}>
                    <div aria-hidden="true" style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.9), rgba(255,255,255,0) 70%)", top: -60, right: -60, pointerEvents: "none" }} />
                    <div aria-hidden="true" style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.7), rgba(255,255,255,0) 70%)", bottom: -80, left: -80, pointerEvents: "none" }} />
                    {sec.unitIds.map((uid) => {
                      g += 1;
                      const u = UNITS.find((x) => x.id === uid);
                      const idx = g;
                      const crowns = prog.done?.[uid] || 0;
                      const unlocked = idx < unlockedCount;
                      const isCurrent = idx === unlockedCount - 1 && crowns === 0;
                      const off = [0, 70, 105, 70, 0, -70, -105, -70][idx % 8];
                      const nodeColor = crowns > 0 ? D.gold : unlocked ? sec.color : D.lockGray;
                      const nodeDark = crowns > 0 ? D.goldDark : unlocked ? sec.dark : "#CFCFCF";
                      return (
                        <div key={uid} style={{ position: "relative", margin: "14px 0", transform: `translateX(${off}px)`, zIndex: 1 }}>
                          {isCurrent && (
                            <div className="bounce" style={{ position: "absolute", top: -38, left: "50%", transform: "translateX(-50%)", background: D.card, border: `2px solid ${D.line}`, borderRadius: 10, padding: "4px 12px", fontWeight: 900, fontSize: 12, color: sec.color, whiteSpace: "nowrap", zIndex: 2, boxShadow: "0 2px 6px rgba(0,0,0,.08)" }}>
	                              {L.start}
                              <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 10, height: 10, background: D.card, borderRight: `2px solid ${D.line}`, borderBottom: `2px solid ${D.line}` }} />
                            </div>
                          )}
                          <button className={`node-btn ${isCurrent ? "pulse" : ""}`} disabled={!unlocked} onClick={() => setSheet({ unit: u, section: sec, crowns })}
                            aria-label={`${u.title}${unlocked ? "" : (uiLang === "en" ? " (blocked)" : " (bloqueado)")}`}
                            title={unlocked ? `${u.title}${u.desc || u.blurb ? ` — ${u.desc || u.blurb}` : ""}` : "Completa la habilidad anterior para desbloquear"}
                            style={{ width: 78, height: 78, borderRadius: "50%", border: "none", cursor: unlocked ? "pointer" : "default", background: nodeColor, borderBottom: `7px solid ${nodeDark}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: unlocked ? "0 4px 10px rgba(0,0,0,.12)" : "none" }}>
                            {unlocked ? GLYPHS[uid] : <IcLock size={30} />}
                          </button>
                          {crowns > 0 && (
                            <div style={{ position: "absolute", top: -12, right: -10, transform: "rotate(18deg)", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))", lineHeight: 0 }}><IcCrown size={28} /></div>
                          )}
                          {crowns > 1 && (
                            <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", background: D.card, border: `2px solid ${D.gold}`, borderRadius: 99, fontSize: 11, fontWeight: 900, color: D.goldDark, padding: "0 8px" }}>×{crowns}</div>
                          )}
                          <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: unlocked ? D.ink : D.lockIcon, marginTop: 10, width: 116, marginLeft: -19 }}>
                            {u.title}
                          </div>
                        </div>
                      );
                    })}
                    {/* treasure chest */}
                    <div style={{ position: "relative", margin: "10px 0 0", zIndex: 1, textAlign: "center" }}>
                      <button className={sectionDone && !chestClaimed ? "chest-ready node-btn" : "node-btn"}
                        disabled={!sectionDone || chestClaimed}
                        onClick={() => claimChest(chestId)}
	                        aria-label={chestClaimed ? L.claimed : sectionDone ? L.openMe : L.chest}
	                        title={chestClaimed ? L.claimed : sectionDone ? `${L.openMe} +25 ${L.gems}` : L.chest}
                        style={{ background: "none", border: "none", cursor: sectionDone && !chestClaimed ? "pointer" : "default", lineHeight: 0, padding: 4 }}>
                        <IcChest size={58} claimed={chestClaimed} locked={!sectionDone} />
                      </button>
                      <div style={{ fontSize: 11, fontWeight: 900, color: chestClaimed ? D.sub : sectionDone ? D.goldDark : D.lockIcon, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
	                        {chestClaimed ? L.claimed : sectionDone ? <>{L.openMe} <IcGem size={12} style={{ verticalAlign: "-1px" }} /> 25</> : L.chest}
                      </div>
                    </div>
                    {/* cuento (story) node */}
                    {(() => {
                      const story = STORIES.find((st) => st.section === si);
                      if (!story) return null;
                      const readDone = !!prog.stories?.[story.id];
                      return (
                        <div style={{ position: "relative", margin: "14px 0 4px", zIndex: 1, textAlign: "center" }}>
                          <button className="node-btn" onClick={() => openStory(story)}
	                            aria-label={`${L.storyPrefix}: ${story.title}`}
	                            title={`${story.title} — ${L.storyTip}`}
                            style={{ width: 72, height: 72, borderRadius: 20, border: "none", cursor: "pointer", background: sec.color, borderBottom: `7px solid ${sec.dark}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(0,0,0,.12)" }}>
                            <IcBook size={34} />
                          </button>
                          {readDone && (
                            <div style={{ position: "absolute", top: -10, right: "50%", marginRight: -46, transform: "rotate(15deg)", lineHeight: 0, filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))" }}><IcCrown size={24} /></div>
                          )}
                          <div style={{ fontSize: 11, fontWeight: 900, color: D.ink, marginTop: 6, maxWidth: 130, marginLeft: "auto", marginRight: "auto" }}>
	                            {L.storyPrefix}: {story.title}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            });
          })()}

	          {showDoorMeta && (
	          <div data-testid="coach-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 30 }}>
	            {["luna", "rafa", "valeria", "diego"].map((id) => (
	              <div key={id} className="pop" style={{ border: `2px solid ${COACHES[id].color}`, borderBottom: `4px solid ${COACHES[id].dark}`, borderRadius: 14, padding: "9px 6px", textAlign: "center", background: D.card }}>
	                <CoachPortrait id={id} mood="happy" size={64} />
	                <div style={{ fontWeight: 900, fontSize: 12 }}>{COACHES[id].name}</div>
	                <div style={{ fontWeight: 800, fontSize: 10.5, color: D.sub }}>{COACHES[id].role}</div>
	              </div>
	            ))}
	          </div>
	          )}
	          {showAtajos && <p data-testid="atajos" style={{ textAlign: "center", fontSize: 12, color: D.sub, fontWeight: 700 }}>{L.shortcuts}</p>}
        </div>
      )}

      {/* ---------- MISIONES ---------- */}
      {!inLesson && tab === "misiones" && (
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 20px 44px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
	            <CoachPortrait id="valeria" mood="happy" size={72} />
            <div>
	              <h2 style={{ fontWeight: 900, fontSize: 24, margin: 0 }}>{L.missionsTitle}</h2>
	              <div style={{ fontSize: 13, fontWeight: 800, color: D.sub }}>{L.missionsDesc}</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {MISSIONS.map((m) => {
              const stars = prog.missions?.[m.id] || 0;
              return (
                <div key={m.id} style={{ border: `2px solid ${m.color}`, borderBottom: `5px solid ${m.dark}`, borderRadius: 16, padding: 15, background: D.card }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
	                      <div style={{ fontSize: 11, fontWeight: 900, color: m.color, letterSpacing: ".06em" }}>{uiLang === "en" ? m.tagEn : m.tag}</div>
	                      <div style={{ fontWeight: 900, fontSize: 19 }}>{m.title}</div>
	                      <div style={{ fontSize: 13, fontWeight: 700, color: D.sub, marginTop: 3 }}>{uiLang === "en" ? m.descEn : m.desc}</div>
                    </div>
                    <div style={{ whiteSpace: "nowrap", color: D.goldDark, fontWeight: 900 }}>{stars ? "★".repeat(stars) : "☆ ☆ ☆"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
                    {m.units.map((uid) => <span key={uid} style={{ fontSize: 11, fontWeight: 900, color: D.ink, background: D.subtle, border: `2px solid ${D.line}`, borderRadius: 99, padding: "3px 9px" }}>{getUnit(uid)?.title}</span>)}
                  </div>
	                  <Btn color={m.color} dark={m.dark} onClick={() => startMission(m)} style={{ padding: "10px 14px", fontSize: 12 }}>{L.enter}</Btn>
                </div>
              );
            })}
            {(() => {
              const r = prog.rival || { rank: 0, wins: 0, losses: 0, streak: 0, seen: false };
              const played = (r.wins || 0) + (r.losses || 0);
              return (
                <div style={{ border: `2px solid ${COACHES.diego.color}`, borderBottom: `5px solid ${COACHES.diego.dark}`, borderRadius: 16, padding: 15, background: `linear-gradient(180deg, ${D.orangeBg}, ${D.card})`, marginBottom: 14, position: "relative" }}>
                  {!r.seen && (
                    <span style={{ position: "absolute", top: -8, right: 12, background: COACHES.diego.color, color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: ".06em", padding: "3px 8px", borderRadius: 8, boxShadow: `0 2px 0 ${COACHES.diego.dark}` }}>
                      {uiLang === "en" ? "NEW" : "NUEVO"}
                    </span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <CoachPortrait id="diego" mood="happy" size={64} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>{uiLang === "en" ? "Diego's Challenge" : "El Reto de Diego"}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: COACHES.diego.dark }}>
                        {rivalRankName(r.rank || 0, uiLang)}
                        {played > 0 ? ` · ${r.wins || 0}–${r.losses || 0}` : ` · ${uiLang === "en" ? "never dueled" : "sin duelo aún"}`}
                        {(r.streak || 0) > 1 ? ` · 🔥${r.streak}` : ""}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: D.sub, marginTop: 2 }}>
                        {uiLang === "en" ? "He targets your weakest skill. Beat his count." : "Ataca tu punto más débil. Supera su marcador."}
                      </div>
                    </div>
                    <Btn color={COACHES.diego.color} dark={COACHES.diego.dark} onClick={() => startRivalIntro()} style={{ padding: "10px 14px", fontSize: 12 }}>
                      {uiLang === "en" ? "Duel Diego" : "Retar"}
                    </Btn>
                  </div>
                </div>
              );
            })()}
            <div style={{ fontSize: 11, fontWeight: 900, color: D.goldDark, letterSpacing: ".06em", margin: "8px 0 6px" }}>{L.dialogueDuel}</div>
            {DUELS.map((duel) => (
              <div key={duel.id} style={{ border: `2px solid ${duel.color}`, borderBottom: `5px solid ${duel.dark}`, borderRadius: 16, padding: 15, background: D.card, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <CoachPortrait id={duel.host} mood="happy" size={60} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 17 }}>{duel.title}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: D.sub }}>{duel.subtitle} · {L.best}: {prog.missions?.[duel.id] || 0}/3</div>
                  </div>
                  <Btn color={duel.color} dark={duel.dark} onClick={() => startDialogue(duel)} style={{ padding: "10px 14px", fontSize: 12 }}>{L.duel}</Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- LECTURA ---------- */}
      {!inLesson && tab === "lectura" && (
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 20px 44px" }}>
	          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
		            <CoachPortrait id="rafa" mood="happy" size={74} />
	            <div>
		              <h2 style={{ fontWeight: 900, fontSize: 24, margin: 0 }}>{L.library}</h2>
		              <div style={{ fontSize: 13, fontWeight: 800, color: D.sub }}>{L.storiesClaimed}</div>
	            </div>
	          </div>
          <div data-testid="recuerdos-map" style={{ border: `2px solid ${D.line}`, borderBottom: `5px solid ${D.line}`, borderRadius: 18, background: D.card, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <LogoMark size={36} data-testid="recuerdos-axolotl" />
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".08em", color: D.blueDark }}>{uiLang === "en" ? "MEXICO" : "MÉXICO"}</div>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{L.recuerdosTitle}</div>
              </div>
            </div>
            <div style={{ position: "relative", height: 228, borderRadius: 16, overflow: "hidden", background: theme === "dark" ? D.subtle : "linear-gradient(180deg,#DDF4FF 0%,#E8F6D8 55%,#F3FBEA 100%)", border: `2px solid ${D.line}` }}>
              <svg data-testid="recuerdos-outline" viewBox="0 0 300 190" width="100%" height="100%" aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                <path d={MEXICO_OUTLINE_PATH} fill={theme === "dark" ? "#2A3A2C" : "#8FCB6A"} stroke={theme === "dark" ? "#3D5A40" : "#6BAA4A"} strokeWidth="1.6" />
              </svg>
              <div data-testid="recuerdos-fog" aria-hidden="true" style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: recuerdosFogBackground(RECUERDOS_PINS, prog.stories, theme),
              }} />
              {recuerdosLockedPins(RECUERDOS_PINS, prog.stories).map((pin) => (
                <div
                  key={`fog-${pin.id}`}
                  data-testid={`recuerdos-fog-${pin.id}`}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    width: 78,
                    height: 58,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "50%",
                    background: theme === "dark" ? "rgba(18,22,28,.5)" : "rgba(236,242,246,.78)",
                    filter: "blur(10px)",
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                />
              ))}
              {RECUERDOS_PINS.map((pin) => {
                const open = isRecuerdosPinOpen(pin, prog.stories);
                const label = recuerdosPinLabel(pin, uiLang);
                const state = recuerdosPinState(open, uiLang);
                const storyId = storyIdForRecuerdosPin(pin, prog.stories);
                const story = STORIES.find((s) => s.id === storyId);
                return (
                  <button
                    key={pin.id}
                    type="button"
                    data-testid={`recuerdos-pin-${pin.id}`}
                    data-open={open ? "true" : "false"}
                    disabled={!open || !story}
                    onClick={() => { if (open && story) openStory(story); }}
                    aria-label={`${label} · ${state}`}
                    style={{
                      position: "absolute", left: `${pin.x}%`, top: `${pin.y}%`,
                      transform: "translate(-50%, -50%)",
                      background: "none", border: "none", padding: 0, cursor: open ? "pointer" : "default",
                      display: "flex", flexDirection: "column", alignItems: "center", minWidth: 52, zIndex: pin.firstGlow ? 2 : 1,
                    }}
                  >
                    <span
                      data-testid={pin.firstGlow ? "recuerdos-bajio-glow" : undefined}
                      className={pin.firstGlow ? "bajio-glow" : undefined}
                      style={{
                        width: pin.firstGlow ? 18 : 14, height: pin.firstGlow ? 18 : 14,
                        borderRadius: "50% 50% 50% 8px", transform: "rotate(-45deg)",
                        background: open ? (pin.firstGlow ? D.gold : D.green) : D.lockGray,
                        border: `2px solid ${open ? "#fff" : D.lockIcon}`,
                        boxShadow: open ? "0 3px 8px rgba(0,0,0,.22)" : "none",
                      }}
                    />
                    <span style={{ marginTop: 6, textAlign: "center", lineHeight: 1.15 }}>
                      <span style={{ display: "block", fontSize: 11, fontWeight: 900, color: D.ink }}>{label}</span>
                      <span style={{ display: "block", fontSize: 10, fontWeight: 800, color: open ? D.greenDark : D.sub }}>{state}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
	          <div style={{ display: "grid", gap: 12 }}>
	            {STORIES.map((story) => {
	              const sec = SECTIONS[story.section];
	              const extra = STORY_EXTRAS[story.id] || {};
              const meta = STORY_META[story.id] || {};
              const souvenir = extra.collectible || meta.souvenir;
	              const claimed = !!prog.stories?.[story.id];
	              const found = (prog.storyFinds?.[story.id] || []).length;
	              const total = extra.keyWords?.length || 0;
	              return (
	                <button key={story.id} onClick={() => openStory(story)} className="choice-card"
	                  style={{ textAlign: "left", padding: 15, cursor: "pointer", fontFamily: "inherit", background: claimed ? "#F3FBEA" : "#fff", borderColor: claimed ? D.green : D.line, borderBottomColor: claimed ? D.green : D.line }}>
                  <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 15, background: sec.color, borderBottom: `5px solid ${sec.dark}`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <IcBook size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
	                      <div style={{ fontWeight: 900, fontSize: 18 }}>{story.title}</div>
	                      <div style={{ fontSize: 13, color: D.sub, fontWeight: 800 }}>{meta.place ? `${meta.place} · ` : ""}{story.subtitle}</div>
		                      <div style={{ fontSize: 12, color: sec.color, fontWeight: 900, marginTop: 4 }}>{story.paragraphs.length} {L.paragraphs} · {found}/{total} {uiLang === "en" ? "word hunt" : "cacería"}</div>
		                      {souvenir && <div style={{ fontSize: 11.5, color: claimed ? D.greenDark : D.sub, fontWeight: 900, marginTop: 4 }}>{claimed ? "✓ " : ""}{uiLang === "en" ? "Souvenir" : "Recuerdo"}: {souvenir[uiLang]}</div>}
	                    </div>
                    {claimed && <IcCrown size={26} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------- PRÁCTICA ---------- */}
      {!inLesson && tab === "practica" && (
	          <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 20px 40px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, textAlign: "left" }}>
            <CoachPortrait id="luna" mood={dueCount > 0 ? "sad" : "happy"} size={48} />
            <h2 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>{L.practiceTitle}</h2>
          </div>

          {/* Above the fold: Phrase Doctor, Safe-or-Risky, Emparejar. Other chrome stays below. */}
          <div data-testid="practica-fold">
          <button onClick={() => (doctorOpen ? setDoctorOpen(false) : openDoctor())} data-testid="phrase-doctor"
            style={{ display: "block", width: "100%", margin: "0 0 8px", border: `2px solid ${D.purple}`, borderBottom: `5px solid ${D.purpleDark}`, background: D.card, color: D.ink, borderRadius: 18, padding: "13px 16px", fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 44, height: 44, borderRadius: 14, background: D.purple, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22, flexShrink: 0, borderBottom: `4px solid ${D.purpleDark}` }}>✎</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 15.5, lineHeight: 1.2 }}>{uiLang === "en" ? "Phrase Doctor" : "Doctora de frases"}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: D.sub, marginTop: 2 }}>{uiLang === "en" ? "Valeria fixes translation-shaped Spanish." : "Valeria corrige español con forma de traducción."}</div>
              </div>
              <span style={{ fontSize: 18, color: D.sub, flexShrink: 0 }}>{doctorOpen ? "▾" : "→"}</span>
            </div>
          </button>
          {(() => {
            const doctorBeats = trimDoctoraBeats(PHRASE_DOCTOR, { firstDoctora });
            const item = doctorBeats[doctorIdx % Math.max(doctorBeats.length, 1)] || PHRASE_DOCTOR[0];
            const readyDoctoraWin = shouldDoctoraEarlyWin({ firstDoctora, hits: doctorHits });
            if (!doctorOpen) return null;
            return (
              <div data-testid="phrase-doctor-board" style={{ margin: "0 0 8px", border: `2px solid ${D.purple}`, borderBottom: `5px solid ${D.purpleDark}`, borderRadius: 18, background: D.card, textAlign: "left", overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 11, alignItems: "center", padding: "12px 14px", background: D.purpleBg }}>
                  <CoachPortrait id="valeria" mood={doctorReveal ? "party" : "focused"} size={58} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 900, color: D.purpleDark, letterSpacing: ".08em" }}>{uiLang === "en" ? "PHRASE DOCTOR" : "DOCTORA DE FRASES"}</div>
                    <div style={{ fontWeight: 900, fontSize: 17 }}>{uiLang === "en" ? "Make it sound human" : "Que suene humano"}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: D.sub, lineHeight: 1.3 }}>{uiLang === "en" ? "Valeria fixes translation-shaped Spanish." : "Valeria corrige español con forma de traducción."}</div>
                  </div>
                </div>
                <div style={{ padding: "13px 14px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: D.sub, letterSpacing: ".06em", marginBottom: 5 }}>{uiLang === "en" ? "STIFF VERSION" : "VERSIÓN RÍGIDA"}</div>
                  <div style={{ border: `2px solid ${D.line}`, borderRadius: 12, padding: "10px 12px", background: D.subtle, fontWeight: 900, fontSize: 16, color: D.ink }}>
                    {item.awkward}
                  </div>
                  {(!doctorReveal || doctorGrade === "equivalent") && (
                    <div data-testid={doctorGrade === "equivalent" ? "phrase-doctor-miss" : undefined}>
                      <input
                        data-testid="phrase-doctor-guess"
                        value={doctorGuess}
                        disabled={doctorReveal}
                        onChange={(e) => {
                          setDoctorGuess(e.target.value);
                          if (doctorGrade === "wrong") setDoctorGrade(null);
                        }}
                        placeholder={uiLang === "en" ? "Your version" : "Tu versión"}
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        aria-invalid={doctorGrade === "wrong"}
                        style={{
                          display: "block",
                          width: "100%",
                          boxSizing: "border-box",
                          marginTop: 10,
                          padding: "10px 12px",
                          fontSize: 16,
                          fontWeight: 800,
                          fontFamily: "inherit",
                          borderRadius: 12,
                          border: `2px solid ${doctorGrade === "wrong" ? D.red : doctorGrade === "equivalent" ? D.gold : D.line}`,
                          background: doctorGrade === "wrong" ? D.badBg : doctorGrade === "equivalent" ? D.goldBg : D.subtle,
                          color: D.ink,
                        }}
                      />
                    </div>
                  )}
                  {doctorGrade === "wrong" && !doctorReveal && (
                    <div data-testid="phrase-doctor-fail" style={{ marginTop: 6, fontSize: 12.5, fontWeight: 800, color: D.red }} />
                  )}
                  {doctorTip && doctorGrade === "equivalent" && (
                    <div data-testid="word-order-tip" className="pop" style={{ marginTop: 10, border: `1.5px solid ${D.gold}`, borderRadius: 11, padding: "8px 10px", background: D.goldBg, fontSize: 12.5, fontWeight: 800, lineHeight: 1.35, color: D.ink }}>
                      {L.wordOrderTip}
                    </div>
                  )}
                  {doctorReveal ? (
                    <div className="pop" style={{ marginTop: 12, display: "grid", gap: 8 }}>
                      {[
                        [uiLang === "en" ? "NATURAL" : "NATURAL", item.natural, D.green, D.greenBg],
                        [uiLang === "en" ? "FORMAL" : "FORMAL", item.formal, D.blue, D.blueBg],
                        [uiLang === "en" ? "TEXT" : "MENSAJE", item.text, "#FF9600", D.orangeBg],
                      ].map(([label, value, color, bg]) => (
                        <div key={label} style={{ border: `1.5px solid ${color}`, borderRadius: 11, padding: "8px 10px", background: bg }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color, letterSpacing: ".08em", marginBottom: 2 }}>{label}</div>
                          <div style={{ fontWeight: 900, fontSize: 15.5 }}>{value}</div>
                        </div>
                      ))}
                      <div style={{ border: `1.5px solid ${D.gold}`, borderRadius: 11, padding: "8px 10px", background: D.goldBg, fontSize: 12.5, fontWeight: 800, lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 900, color: D.goldDark }}>{item.skill}: </span>{item.diagnosis}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 800, color: D.sub }}>
                      {uiLang === "en" ? "Guess the more natural version before revealing." : "Adivina la versión más natural antes de revelar."}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button data-testid="phrase-doctor-fix" onClick={() => {
                      if (doctorReveal) {
                        if (readyDoctoraWin) { finishDoctoraWin(); return; }
                        setDoctorReveal(false);
                        return;
                      }
                      const g = gradeListedPhrase(doctorGuess, item);
                      if (doctorGuess.trim() && g.status === "wrong") {
                        setDoctorGrade("wrong");
                        setDoctorTip(false);
                        if (!doctorFailed) {
                          setDoctorFailed(true);
                          return;
                        }
                        setDoctorReveal(true);
                        return;
                      }
                      if (g.status === "equivalent") {
                        setDoctorGrade("equivalent");
                        setDoctorTip(true);
                      } else {
                        setDoctorGrade(g.status === "empty" ? null : "correct");
                        setDoctorTip(false);
                      }
                      if (!doctorFailed) {
                        const nextHits = doctorHits + 1;
                        setDoctorHits(nextHits);
                        if (!shouldDoctoraEarlyWin({ firstDoctora, hits: nextHits })) {
                          awardDoctoraStreak();
                        }
                      }
                      setDoctorReveal(true);
                    }}
                      style={{ flex: 1, border: "none", borderBottom: `4px solid ${doctorReveal ? D.line : D.purpleDark}`, background: doctorReveal ? D.subtle : D.purple, color: doctorReveal ? D.sub : "#fff", borderRadius: 12, padding: "10px 12px", fontFamily: "inherit", fontWeight: 900, cursor: "pointer" }}>
                      {doctorReveal
                        ? (readyDoctoraWin ? L.continue : (uiLang === "en" ? "Hide" : "Ocultar"))
                        : (uiLang === "en" ? "Fix it" : "Curarla")}
                    </button>
                    <button onClick={() => {
                      if (readyDoctoraWin) { finishDoctoraWin(); return; }
                      setDoctorIdx((i) => (i + 1) % Math.max(doctorBeats.length, 1));
                      setDoctorReveal(false);
                      setDoctorGuess("");
                      setDoctorTip(false);
                      setDoctorGrade(null);
                      setDoctorFailed(false);
                    }}
                      style={{ border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, background: D.card, color: D.ink, borderRadius: 12, padding: "10px 12px", fontFamily: "inherit", fontWeight: 900, cursor: "pointer" }}>
                      {uiLang === "en" ? "New" : "Otra"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
          <button onClick={startSafeRisky} data-testid="safe-risky-start"
            style={{ display: "block", width: "100%", margin: "0 0 8px", border: `2px solid ${D.red}`, borderBottom: `5px solid ${D.redDark}`, background: D.card, color: D.ink, borderRadius: 18, padding: "13px 16px", fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 44, height: 44, borderRadius: 14, background: D.red, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22, flexShrink: 0, borderBottom: `4px solid ${D.redDark}` }}>⚠️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 15.5, lineHeight: 1.2 }}>{uiLang === "en" ? "Safe or Risky?" : "¿Seguro o riesgoso?"}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: D.sub, marginTop: 2 }}>{uiLang === "en" ? "Sort phrases by register — the skill that matters most past B1." : "Clasifica frases por registro — la habilidad clave después de B1."}</div>
                <div data-testid="safe-risky-reward" style={{ fontSize: 11, fontWeight: 900, color: D.redDark, marginTop: 4 }}>{L.safeRiskyReward}</div>
              </div>
              <span style={{ fontSize: 18, color: D.sub, flexShrink: 0 }}>→</span>
            </div>
          </button>
          <button onClick={startMatchPairs} data-testid="match-pairs-start"
            style={{ display: "block", width: "100%", margin: "0 0 8px", border: `2px solid ${D.blue}`, borderBottom: `5px solid ${D.blueDark}`, background: D.card, color: D.ink, borderRadius: 18, padding: "13px 16px", fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 44, height: 44, borderRadius: 14, background: D.blue, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22, flexShrink: 0, borderBottom: `4px solid ${D.blueDark}` }}>🔗</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 15.5, lineHeight: 1.2 }}>{uiLang === "en" ? "Match pairs" : "Emparejar"}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: D.sub, marginTop: 2 }}>{uiLang === "en" ? "One finite round from the unit pairs — Spanish and English." : "Una ronda finita con las parejas de la unidad — español e inglés."}</div>
              </div>
              <span style={{ fontSize: 18, color: D.sub, flexShrink: 0 }}>→</span>
            </div>
          </button>
          </div>
          <details style={{ margin: "0 0 14px", textAlign: "left" }}>
            <summary style={{ fontSize: 12.5, fontWeight: 800, color: D.sub, cursor: "pointer", padding: "8px 4px", listStyle: "none" }}>
              {uiLang === "en" ? "More games" : "Más juegos"} ▾
            </summary>
            <div style={{ display: "grid", gap: 7, marginTop: 6 }}>
              <button onClick={startSnakes}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", background: D.card, border: `2px solid ${D.line}`, borderBottom: `3px solid ${D.line}`, color: D.ink, borderRadius: 12, padding: "9px 12px", fontFamily: "inherit", fontWeight: 800, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 18 }}>🐍</span>
                <span style={{ flex: 1 }}>{uiLang === "en" ? "Snakes & Ladders" : "Serpientes y Escaleras"}</span>
                <span style={{ fontSize: 14, color: D.sub }}>→</span>
              </button>
              <button onClick={startJeopardy}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", background: D.card, border: `2px solid ${D.line}`, borderBottom: `3px solid ${D.line}`, color: D.ink, borderRadius: 12, padding: "9px 12px", fontFamily: "inherit", fontWeight: 800, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 18 }}>🎯</span>
                <span style={{ flex: 1 }}>{uiLang === "en" ? "Reto Ándale" : "Reto Ándale"}</span>
                <span style={{ fontSize: 14, color: D.sub }}>→</span>
              </button>
            </div>
          </details>
          <div style={{ margin: "16px 0 16px", border: `2px solid ${D.purple}`, borderBottom: `5px solid ${D.purpleDark}`, borderRadius: 16, padding: 14, background: D.purpleBg, textAlign: "left" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: D.purple, borderBottom: `4px solid ${D.purpleDark}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IcBolt size={24} color="#fff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: D.purpleDark, letterSpacing: ".08em" }}>{uiLang === "en" ? "SMART PRACTICE" : "PRÁCTICA INTELIGENTE"}</div>
                <div style={{ fontWeight: 900, fontSize: 17, color: D.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{smartFocus.title[uiLang]}</div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: D.sub, lineHeight: 1.35, marginBottom: 12 }}>
              {smartFocus.desc[uiLang]}{" "}
              <span data-testid="smart-practice-reason" style={{ color: D.purpleDark }}>
                {smartFocus.reason === "weak"
                  ? (uiLang === "en" ? "Chosen from your misses." : "Elegido por tus errores.")
                  : smartFocus.reason === "due"
                    ? (uiLang === "en" ? "Chosen from due review." : "Elegido por tu repaso vencido.")
                    : (uiLang === "en" ? "Chosen as your next useful sprint." : "Tu siguiente ronda.")}
              </span>
            </div>
            <button data-testid="smart-practice-cta" onClick={startQuickPractice}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", background: D.purple, border: "none", borderBottom: `4px solid ${D.purpleDark}`, color: "#fff", borderRadius: 13, padding: "11px 14px", fontFamily: "inherit", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
              <IcBarbell size={18} color="#fff" />
              {uiLang === "en" ? "Start 5-item sprint — no hearts" : "Empezar ronda de 5 — sin vidas"}
            </button>
          </div>
          {dueCount > 0 ? (
            <>
              <p style={{ color: D.sub, fontWeight: 700, marginBottom: 20 }}>
	                <b style={{ color: D.red, fontSize: 18 }}>{dueCount}</b> {L.dueToday} <span style={{ opacity: .7 }}>({trackedCount} {L.tracked})</span>.
	                {L.practiceFree} <b style={{ color: D.green }}><IcHeart size={15} /> +1</b>.
              </p>
	              <Btn color={D.blue} dark={D.blueDark} onClick={() => startReview()}>{L.reviewToday} ({dueCount})</Btn>
              <p style={{ fontSize: 12, color: D.sub, fontWeight: 700, marginTop: 14 }}>
	                {L.memory} {GRADUATE_DAYS} {uiLang === "en" ? "days" : "días"}.
              </p>
            </>
          ) : trackedCount > 0 ? (
            <>
              <p style={{ color: D.sub, fontWeight: 700, marginBottom: 6 }}>
	                {L.noDue}
              </p>
              <p style={{ fontSize: 13, color: D.sub, fontWeight: 700, marginBottom: 18 }}>
	                {trackedCount} {L.tracked} · {L.nextReview}: <b>{nextDueLabel}</b>
              </p>
	              <Btn outline onClick={() => startReview(true)}>{L.earlyReview}</Btn>
            </>
          ) : (
	            <p style={{ color: D.sub, fontWeight: 700 }}>{L.noErrors}</p>
          )}

          {showWeaknessMap && (
          <div data-testid="weakness-map" style={{ marginTop: 28, border: `2px solid ${D.line}`, borderRadius: 16, padding: 16, textAlign: "left", background: D.card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
	                <div style={{ fontWeight: 900, fontSize: 16 }}>{L.weaknessMap}</div>
	                <div style={{ fontSize: 12.5, color: D.sub, fontWeight: 800 }}>{L.weaknessDesc}</div>
              </div>
              <IcBolt size={22} color={D.gold} />
            </div>
            {weakSpots.map(([name, n]) => (
              <div key={name} style={{ marginBottom: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 900, marginBottom: 4 }}>
                  <span>{name}</span><span style={{ color: D.red }}>{n}</span>
                </div>
                <div style={{ height: 9, borderRadius: 99, background: D.track, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, 18 + n * 18)}%`, height: "100%", background: n >= 3 ? D.red : D.gold }} />
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Btn color={D.gold} dark={D.goldDark} data-testid="weakness-workout" onClick={startDailyWorkout} style={{ padding: "9px 12px", fontSize: 11 }}>{L.dailyWorkout}</Btn>
	              {trackedCount > 0 && <Btn outline onClick={() => startReview(true)} style={{ padding: "9px 12px", fontSize: 11 }}>{L.adaptiveReview}</Btn>}
            </div>
          </div>
          )}

          {prog.hearts < MAX_HEARTS && (
            <div style={{ marginTop: 34, border: `2px solid ${D.line}`, borderRadius: 16, padding: 18 }}>
	              <div style={{ fontWeight: 900, fontSize: 16 }}><IcHeart size={17} /> {prog.hearts}/{MAX_HEARTS} {L.lives}</div>
	              <div style={{ fontSize: 13, color: D.sub, fontWeight: 700, margin: "4px 0 12px" }}>{L.nextLife} ~{nextHeartMin} min:</div>
              <Btn color={D.red} dark={D.redDark} disabled={(prog.gems || 0) < REFILL_COST} onClick={refillHearts}>
	                {L.refill} · <IcGem size={15} /> {REFILL_COST}
              </Btn>
            </div>
          )}
        </div>
      )}

      {/* ---------- JUEGOS ---------- */}
      {!inLesson && tab === "juegos" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "26px 20px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
            <div style={{ width: 58, height: 58, borderRadius: 18, background: D.gold, borderBottom: `5px solid ${D.goldDark}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IcGame size={34} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".08em", color: D.goldDark }}>{uiLang === "en" ? "GAME HUB" : "FERIA DE JUEGOS"}</div>
              <h2 style={{ fontWeight: 900, fontSize: 24, margin: "2px 0 3px" }}>{uiLang === "en" ? "Play your Spanish" : "Juega tu español"}</h2>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: D.sub, lineHeight: 1.3 }}>{uiLang === "en" ? "Fast rounds for judgment, memory, and high-stakes grammar." : "Rondas rápidas para juicio, memoria y gramática con presión."}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              [uiLang === "en" ? "Judgment" : "Juicio", `${prog.missions?.safeRiskyBest || 0}/5`, D.red],
              [uiLang === "en" ? "Jeopardy" : "Jeopardy", prog.missions?.jeopardyBest || 0, D.blue],
              [uiLang === "en" ? "Board" : "Tablero", `${prog.missions?.snakeBest || 0} ${uiLang === "en" ? "best" : "mejor"}`, D.green],
              [uiLang === "en" ? "Rewards" : "Premios", `XP + ${L.gems}`, D.goldDark],
            ].map(([label, value, color]) => (
              <div key={label} style={{ border: `2px solid ${D.line}`, borderRadius: 13, padding: "9px 7px", background: D.card, textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: D.sub, letterSpacing: ".05em" }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "-2px 0 14px" }}>
            {[
              ["snakeFirstWin", uiLang === "en" ? "First climb" : "Primera subida"],
              ["snakePerfect", uiLang === "en" ? "No slides" : "Sin resbalones"],
              ["safePerfect", uiLang === "en" ? "Radar" : "Radar"],
              ["jeopardyClear", uiLang === "en" ? "Board clear" : "Tablero limpio"],
            ].map(([key, label]) => {
              const earned = !!prog.missions?.gameTrophies?.[key];
              return (
                <span key={key} style={{ border: `1.5px solid ${earned ? D.gold : D.line}`, background: earned ? D.goldBg : D.subtle, color: earned ? D.goldDark : D.sub, borderRadius: 99, padding: "4px 8px", fontSize: 10.5, fontWeight: 900 }}>
                  {earned ? "★ " : "☆ "}{label}
                </span>
              );
            })}
          </div>

          <div style={{ display: "grid", gap: 12, textAlign: "left" }}>
            {[
              {
                title: uiLang === "en" ? "Serpientes y Escaleras" : "Serpientes y Escaleras",
                tag: uiLang === "en" ? "BOARD RUN" : "CARRERA DE TABLERO",
                desc: uiLang === "en" ? "Answer to roll, climb shortcuts, and dodge slide tiles." : "Responde para tirar, subir atajos y evitar resbalones.",
                color: D.green,
                dark: D.greenDark,
                icon: "↗",
                act: startSnakes,
                testid: "snakes-start",
                stat: `${prog.missions?.snakeBest || 0} ${uiLang === "en" ? "best" : "mejor"}`,
                reward: uiLang === "en" ? "24 tiles · trophies · jackpot finish" : "24 casillas · trofeos · premio final",
              },
              {
                title: uiLang === "en" ? "Safe or Risky?" : "¿Seguro o riesgoso?",
                tag: uiLang === "en" ? "REAL-WORLD JUDGMENT" : "JUICIO REAL",
                desc: uiLang === "en" ? "Classify phrases by social risk, register, and region." : "Clasifica frases por riesgo social, registro y región.",
                color: D.red,
                dark: D.redDark,
                icon: "!",
                act: startSafeRisky,
                testid: "safe-risky-start",
                stat: `${prog.missions?.safeRiskyBest || 0}/5 ${uiLang === "en" ? "best" : "mejor"}`,
                reward: L.safeRiskyReward,
              },
              {
                title: "Reto Ándale",
                tag: uiLang === "en" ? "JEOPARDY SOLO" : "JEOPARDY SOLO",
                desc: uiLang === "en" ? "Pick categories, answer for points, and avoid traps." : "Elige categorías, responde por puntos y esquiva trampas.",
                color: D.blue,
                dark: D.blueDark,
                icon: "?",
                act: startJeopardy,
                testid: "jeopardy-start",
                stat: `${prog.missions?.jeopardyBest || 0} ${uiLang === "en" ? "best" : "mejor"}`,
                reward: uiLang === "en" ? "18 tiles · points · XP payout" : "18 casillas · puntos · paga XP",
              },
            ].map((game) => (
              <button key={game.title} data-testid={game.testid} onClick={game.act}
                style={{ border: `2px solid ${game.color}`, borderBottom: `6px solid ${game.dark}`, borderRadius: 16, background: D.card, padding: 15, fontFamily: "inherit", color: D.ink, cursor: "pointer", textAlign: "left", boxShadow: "0 4px 0 rgba(0,0,0,.03)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 42, height: 42, borderRadius: 14, background: game.color, borderBottom: `4px solid ${game.dark}`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22, flexShrink: 0 }}>{game.icon}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 900, letterSpacing: ".07em", color: game.dark }}>{game.tag}</span>
                    <span style={{ display: "block", fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>{game.title}</span>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: D.sub, lineHeight: 1.25, marginTop: 3 }}>{game.desc}</span>
                    <span data-testid={game.testid === "safe-risky-start" ? "safe-risky-hub-reward" : undefined} style={{ display: "inline-flex", marginTop: 8, fontSize: 11, fontWeight: 900, color: game.dark, background: game.color === D.red ? D.redBg : game.color === D.green ? D.greenBg : D.blueBg, border: `1.5px solid ${game.color}`, borderRadius: 99, padding: "3px 8px" }}>{game.reward}</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: game.dark, background: game.color === D.red ? D.redBg : game.color === D.green ? D.greenBg : D.blueBg, border: `1.5px solid ${game.color}`, borderRadius: 99, padding: "4px 8px", whiteSpace: "nowrap" }}>{game.stat}</span>
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16, border: `2px solid ${D.line}`, borderRadius: 16, padding: 14, background: D.subtle, fontSize: 12.5, fontWeight: 800, color: D.sub, lineHeight: 1.4 }}>
            {uiLang === "en"
              ? "Weekly challenge idea: win any 3 game rounds to unlock a coach postcard."
              : "Idea de reto semanal: gana 3 rondas de juegos para desbloquear una postal de coach."}
          </div>
        </div>
      )}

      {/* ---------- PERFIL ---------- */}
      {!inLesson && tab === "perfil" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "26px 20px 40px" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
	            <CoachPortrait id="luna" mood="happy" size={72} />
            <div>
	              <div style={{ fontWeight: 900, fontSize: 22 }}>{L.profileTitle}</div>
	              <div style={{ fontSize: 13, color: D.sub, fontWeight: 700 }}>{L.profileSub}</div>
            </div>
          </div>
          {showLevelTheater && <div data-testid="level-theater" style={{ border: `2px solid ${D.gold}`, borderBottom: `4px solid ${D.goldDark}`, borderRadius: 16, padding: "14px 18px", marginBottom: 14, background: D.goldBg }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 900, fontSize: 18, color: D.goldDark }}>{levelLabel(lvl.name, uiLang)}</span>
	              <span style={{ fontSize: 12, fontWeight: 800, color: D.sub }}>{L.level} {lvl.idx + 1}/{LEVELS.length}</span>
            </div>
            {lvl.next != null ? (
              <>
                <div style={{ height: 10, background: D.trackWarm, borderRadius: 99, overflow: "hidden", margin: "8px 0 4px" }}>
                  <div style={{ width: `${Math.round(((prog.xp || 0) - lvl.cur) / (lvl.next - lvl.cur) * 100)}%`, height: "100%", background: D.gold }} />
                </div>
	                <div style={{ fontSize: 12, fontWeight: 800, color: D.sub }}>{lvl.next - (prog.xp || 0)} {L.xpTo} «{levelLabel(LEVELS[lvl.idx + 1][1], uiLang)}»</div>
              </>
            ) : (
	              <div style={{ fontSize: 12, fontWeight: 800, color: D.sub, marginTop: 4 }}>{L.maxLevel}</div>
            )}
          </div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
	              { icon: <IcFlame size={26} />, v: prog.streak || 0, l: L.streakDays },
	              { icon: <IcBolt size={26} />, v: prog.xp || 0, l: L.totalXp },
	              { icon: <IcCrown size={26} />, v: totalCrowns, l: L.crowns },
	              { icon: <IcGem size={24} />, v: prog.gems || 0, l: L.gems },
	              { icon: <IcBarbell size={24} color={D.blue} />, v: `${dueCount}/${trackedCount}`, l: L.reviewsStat },
	              { icon: <IcMedal size={24} />, v: prog.perfects || 0, l: L.perfectLessons },
            ].map((s, i) => (
              <div key={i} style={{ border: `2px solid ${D.line}`, borderRadius: 16, padding: "14px 16px", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ lineHeight: 0 }}>{s.icon}</span>
                <div><div style={{ fontWeight: 900, fontSize: 18 }}>{s.v}</div><div style={{ fontSize: 11, color: D.sub, fontWeight: 800 }}>{s.l}</div></div>
              </div>
            ))}
          </div>
          {/* ---------- context language ---------- */}
          <h3 style={{ fontWeight: 900, fontSize: 16, margin: "24px 0 10px" }}>{uiLang === "en" ? "Context language" : "Idioma de contexto"}</h3>
          <div style={{ border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, borderRadius: 16, padding: 12, marginBottom: 14, background: D.card }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: D.sub, lineHeight: 1.35, marginBottom: 10 }}>
              {uiLang === "en"
                ? "Choose the language for navigation, hints, and coach context. Spanish exercises stay in Spanish."
                : "Elige el idioma de navegación, pistas y contexto de los coaches. Los ejercicios de español se quedan en español."}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { id: "es", label: "Español", detail: uiLang === "en" ? "Spanish UI" : "Interfaz en español", mark: <FlagMX size={18} /> },
                { id: "en", label: "English", detail: uiLang === "en" ? "English UI" : "Interfaz en inglés", mark: <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".03em" }}>EN</span> },
              ].map((opt) => (
                <button
                  key={opt.id}
                  data-testid={`perfil-lang-${opt.id}`}
                  aria-label={uiLang === "en" ? (opt.id === "en" ? "English context language" : "Spanish context language") : (opt.id === "en" ? "Idioma de contexto: inglés" : "Idioma de contexto: español")}
                  aria-pressed={uiLang === opt.id}
                  onClick={() => save({ uiLang: opt.id })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    border: `2px solid ${uiLang === opt.id ? D.green : D.line}`,
                    borderBottom: `4px solid ${uiLang === opt.id ? D.greenDark : D.line}`,
                    background: uiLang === opt.id ? D.greenBg : D.card,
                    color: uiLang === opt.id ? D.greenDark : D.ink,
                    borderRadius: 14,
                    padding: "10px 11px",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    textAlign: "left",
                    minWidth: 0,
                  }}
                >
                  <span style={{ width: 28, height: 28, borderRadius: 99, display: "inline-flex", alignItems: "center", justifyContent: "center", background: uiLang === opt.id ? "#fff" : D.bg, border: `1.5px solid ${uiLang === opt.id ? D.green : D.line}`, flexShrink: 0 }}>{opt.mark}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{opt.label}</span>
                    <span style={{ display: "block", fontSize: 10.5, fontWeight: 800, color: D.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{opt.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          {/* ---------- appearance ---------- */}
          <h3 style={{ fontWeight: 900, fontSize: 16, margin: "8px 0 10px" }}>{uiLang === "en" ? "Appearance" : "Apariencia"}</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { id: "light", label: uiLang === "en" ? "Light" : "Claro", icon: "☀️" },
              { id: "dark",  label: uiLang === "en" ? "Dark"  : "Oscuro", icon: "🌙" },
            ].map((opt) => (
              <button key={opt.id} aria-pressed={theme === opt.id} onClick={() => save({ theme: opt.id })}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, border: `2px solid ${theme === opt.id ? D.green : D.line}`, borderBottom: `4px solid ${theme === opt.id ? D.greenDark : D.line}`, background: theme === opt.id ? D.greenBg : D.card, color: theme === opt.id ? D.green : D.sub, borderRadius: 14, padding: "11px 0", fontFamily: "inherit", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>{opt.icon}</span>{opt.label}
              </button>
            ))}
          </div>

          {/* ---------- audio diagnostic ---------- */}
          <h3 style={{ fontWeight: 900, fontSize: 16, margin: "24px 0 10px" }}>{uiLang === "en" ? "Audio check" : "Diagnóstico de audio"}</h3>
          <div style={{ border: `2px solid ${!voicesReady || voices.length ? D.line : D.red}`, borderBottom: `4px solid ${!voicesReady || voices.length ? D.line : D.redDark}`, borderRadius: 16, padding: "13px 16px", marginBottom: 14, background: !voicesReady || voices.length ? D.card : "#FFF1F1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 14 }}>
              <span style={{ width: 10, height: 10, borderRadius: 99, background: !prog.sound ? "#BBB" : !voicesReady ? D.gold : voices.length ? D.green : D.red, flexShrink: 0 }} />
              {!voicesReady
                ? (uiLang === "en" ? "Looking for Spanish voices…" : "Buscando voces en español…")
                : voices.length
                  ? (paulinaVoice
                    ? (uiLang === "en" ? "Paulina · Mexican Spanish (es-MX)" : "Paulina · español mexicano (es-MX)")
                    : (uiLang === "en" ? `${voices.length} Spanish ${voices.length === 1 ? "voice" : "voices"} available` : `${voices.length} ${voices.length === 1 ? "voz" : "voces"} en español`))
                  : (uiLang === "en" ? "No Spanish voices found" : "No se encontraron voces en español")}
            </div>
            {voices.length > 0 && (
              <div style={{ fontSize: 12, fontWeight: 800, color: D.sub, margin: "5px 0 9px" }}>
                {voicesForPicker(voices).slice(0, 3).map((v) => voicePickerLabel(v).replace(/ · .+$/, "")).join(" · ")}{voices.length > 3 ? ` · +${voices.length - 3}` : ""}
              </div>
            )}
            {voiceDead && !paulinaVoice && (
              <div style={{ fontSize: 12.5, fontWeight: 800, color: D.badText, margin: "6px 0 9px", lineHeight: 1.45, background: D.redBg, border: `1.5px solid ${D.red}`, borderRadius: 10, padding: "8px 10px" }}>
                {uiLang === "en"
                  ? "Audio isn't playing on this device. Try a different browser (Chrome, Edge, or Safari work best), or check that your system has a Spanish voice installed."
                  : "El audio no se está reproduciendo en este dispositivo. Intenta otro navegador (Chrome, Edge o Safari) o verifica que tu sistema tenga una voz en español instalada."}
              </div>
            )}
            {voicesReady && !voices.length && (
              <div style={{ fontSize: 12.5, fontWeight: 700, color: D.ink, margin: "6px 0 9px", lineHeight: 1.4 }}>
                {uiLang === "en"
                  ? "Your browser/OS has no Spanish voice installed. Windows: Settings → Time & Language → Speech → Add voices (Spanish-Mexico). Mac: System Settings → Accessibility → Spoken Content → System Voice → Manage. Chrome adds Google voices automatically when online."
                  : "Tu navegador/sistema no tiene voz en español. Windows: Configuración → Hora e idioma → Voz → Agregar voces (Español-México). Mac: Ajustes → Accesibilidad → Contenido hablado → Voz → Administrar. Chrome agrega voces de Google al estar en línea."}
              </div>
            )}
            {!prog.sound && (
              <div style={{ fontSize: 12, fontWeight: 800, color: D.sub, marginBottom: 8 }}>{uiLang === "en" ? "Effect sounds are muted (bell icon) — voices still play." : "Los efectos están silenciados (campana) — las voces sí suenan."}</div>
            )}
            {voices.length > 0 && <div style={{ marginBottom: 10 }}>{renderVoiceSelect()}</div>}
            <Btn color={D.blue} dark={D.blueDark} data-testid="probar-voz" onClick={() => speak(uiLang === "en" ? "¿Me escuchas bien? ¡Qué padre!" : "¿Me escuchas bien? ¡Qué padre!", 0.9)} style={{ padding: "9px 14px", fontSize: 13 }}>
              {uiLang === "en" ? "Test voice" : "Probar voz"} 🔊
            </Btn>
          </div>

          {/* ---------- coach sessions ---------- */}
          <h3 style={{ fontWeight: 900, fontSize: 16, margin: "24px 0 10px" }}>{uiLang === "en" ? "Your coaches" : "Tus coaches"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
            {[
              { id: "luna", n: prog.coachStats?.luna || 0, act: () => startDailyWorkout(), cta: L.dailyWorkout },
              { id: "valeria", n: prog.coachStats?.valeria || 0, act: () => startReview(true), cta: uiLang === "en" ? "Review" : "Repasar" },
              { id: "rafa", n: prog.coachStats?.rafa || 0, act: () => setTab("lectura"), cta: uiLang === "en" ? "Stories" : "Cuentos" },
              { id: "diego", n: prog.coachStats?.diego || 0, act: () => setTab("misiones"), cta: uiLang === "en" ? "Duel" : "Duelo" },
            ].map((cc) => (
              <button key={cc.id} onClick={cc.act} className="duo-btn"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, borderRadius: 16, padding: "12px 8px 10px", background: D.card, cursor: "pointer", fontFamily: "inherit" }}>
                <CoachPortrait id={cc.id} mood="happy" size={56} />
                <div style={{ fontWeight: 900, fontSize: 13 }}>{COACHES[cc.id].name}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: D.sub }}>{cc.n} {uiLang === "en" ? (cc.n === 1 ? "session" : "sessions") : (cc.n === 1 ? "sesión" : "sesiones")}</div>
                <div data-testid={`coach-cta-${cc.id}`} style={{ fontSize: 11.5, fontWeight: 900, color: D.greenDark, background: D.greenBg, border: `1.5px solid ${D.green}`, borderRadius: 99, padding: "2px 10px", marginTop: 2 }}>{cc.cta} →</div>
              </button>
            ))}
          </div>

          <h3 style={{ fontWeight: 900, fontSize: 16, margin: "24px 0 10px" }}>{uiLang === "en" ? "Coach postcards" : "Postales de coaches"}</h3>
          <div style={{ display: "grid", gap: 9 }}>
            {coachUnlocks.map((u) => (
              <div key={u.id} style={{ display: "flex", gap: 12, alignItems: "center", border: `2px solid ${u.ok ? COACHES[u.coach].color : D.line}`, borderBottom: `4px solid ${u.ok ? COACHES[u.coach].dark : D.line}`, borderRadius: 14, padding: "9px 12px", background: u.ok ? "#fff" : "#F7F7F7", opacity: u.ok ? 1 : 0.62 }}>
                <CoachPortrait id={u.coach} mood={u.ok ? "party" : "sad"} size={56} badge={u.ok} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{u.title}</div>
                  <div style={{ fontSize: 12, color: D.sub, fontWeight: 800 }}>{u.desc}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, color: u.ok ? D.green : D.sub }}>{u.ok ? (uiLang === "en" ? "UNLOCKED" : "LISTO") : (uiLang === "en" ? "LOCKED" : "BLOQ.")}</span>
              </div>
            ))}
          </div>
	          <h3 style={{ fontWeight: 900, fontSize: 16, margin: "24px 0 10px" }}>{L.achievements}</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {[
	              { t: L.firstStep, d: L.firstStepDesc, ok: totalCrowns >= 1 },
	              { t: L.century, d: L.centuryDesc, ok: (prog.xp || 0) >= 100 },
	              { t: L.fire, d: L.fireDesc, ok: (prog.streak || 0) >= 3 },
	              { t: L.perfectWeek, d: L.perfectWeekDesc, ok: (prog.streak || 0) >= 7 },
	              { t: L.flawless, d: L.flawlessDesc, ok: (prog.perfects || 0) >= 1 },
	              { t: L.crowned, d: `8 ${L.crowns}`, ok: totalCrowns >= 8 },
            ].map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", border: `2px solid ${D.line}`, borderRadius: 14, padding: "10px 14px", opacity: a.ok ? 1 : 0.45 }}>
                <span style={{ lineHeight: 0 }}><IcMedal size={28} gray={!a.ok} /></span>
                <div><div style={{ fontWeight: 900, fontSize: 14 }}>{a.t}</div><div style={{ fontSize: 12, color: D.sub, fontWeight: 700 }}>{a.d}</div></div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, display: "flex", gap: 20, justifyContent: "center" }}>
            <a href={`${import.meta.env.BASE_URL}privacy.html`} style={{ fontSize: 13, fontWeight: 800, color: D.sub, textDecoration: "underline" }}>Privacidad</a>
            <a href={`${import.meta.env.BASE_URL}support.html`} style={{ fontSize: 13, fontWeight: 800, color: D.sub, textDecoration: "underline" }}>Soporte</a>
          </div>
        </div>
      )}

      {/* ---------- FLASHCARDS ---------- */}
      {/* flashcards now live inside Práctica (5-tab layout) */}
      {!inLesson && tab === "practica" && (
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 20px 44px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
	            <CoachPortrait id="rafa" mood={dueFlashcards.length ? "happy" : "sad"} size={74} />
            <div>
	              <h2 style={{ fontWeight: 900, fontSize: 24, margin: 0 }}>{L.flashTitle}</h2>
	              <div style={{ fontSize: 13, fontWeight: 800, color: D.sub }}>{flashcards.length} {L.saved} · {dueFlashcards.length} {L.ready}</div>
            </div>
          </div>
          {!flashDeck.length && !flashRun?.done ? (
            <div data-testid="empty-tarjetas" style={{ border: `2px solid ${D.line}`, borderRadius: 16, padding: 18, textAlign: "center", background: D.card }}>
              <IcCards size={42} color={D.blue} />
	              <h3 style={{ fontWeight: 900, margin: "8px 0 4px" }}>{L.emptyDeck}</h3>
	              <p style={{ color: D.sub, fontWeight: 800, margin: "0 0 16px" }}>{L.emptyDeckDesc}</p>
	              <Btn color={D.blue} dark={D.blueDark} onClick={() => setTab("lectura")}>{L.goReading}</Btn>
            </div>
          ) : flashRun?.done ? (
            <div data-testid="flash-session-done" style={{ border: `2px solid ${D.gold}`, borderBottom: `6px solid ${D.goldDark}`, borderRadius: 18, padding: 22, background: D.card, textAlign: "center" }}>
              <CoachPortrait id="rafa" mood="party" size={88} />
              <h3 style={{ fontWeight: 900, fontSize: 22, margin: "10px 0 4px", color: D.goldDark }}>{L.flashDone}</h3>
              <p style={{ color: D.sub, fontWeight: 800, margin: "0 0 16px" }}>
                {L.flashDoneDesc} {flashRun.reviewed || 0} {L.flashCardsWord}.
              </p>
              <Btn color={D.green} dark={D.greenDark} data-testid="flash-again" onClick={startFlashRun}>{L.flashAgain}</Btn>
            </div>
          ) : activeCard ? (
            <>
              <div data-testid="flash-progress" style={{ fontSize: 12, fontWeight: 900, color: D.sub, marginBottom: 8 }}>
                {(flashRun.idx || 0) + 1} {L.flashOf} {flashDeck.length}
              </div>
              <div onClick={() => setFlashFlipped((f) => !f)} className="pop" data-testid="flash-card"
                style={{ minHeight: 230, border: `2px solid ${flashFlipped ? D.green : D.blue}`, borderBottom: `6px solid ${flashFlipped ? D.greenDark : D.blueDark}`, borderRadius: 18, padding: 22, background: D.card, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: flashFlipped ? D.greenDark : D.blueDark, letterSpacing: ".06em", marginBottom: 10 }}>
	                  {dueFlashcards.length ? L.dueReview : L.ahead} · {flashMode === "es-en" ? "ES → EN" : "EN → ES"}
                </div>
                {!flashFlipped ? (
                  <>
                    <div style={{ fontSize: 34, fontWeight: 900, color: D.ink }}>{flashMode === "es-en" ? activeCard.word : activeCard.en}</div>
	                    <div style={{ fontSize: 13, fontWeight: 800, color: D.sub, marginTop: 12 }}>{L.tapReveal}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 900, color: D.greenDark }}>{flashMode === "es-en" ? activeCard.en : activeCard.word}</div>
                    {activeCard.note && <div style={{ margin: "12px auto 0", maxWidth: 420, background: D.goldBg, border: `1.5px solid ${D.gold}`, borderRadius: 10, padding: "7px 10px", fontSize: 13, fontWeight: 800 }}>{activeCard.note}</div>}
                    {activeCard.sentence && <div style={{ marginTop: 12, fontSize: 13.5, lineHeight: 1.45, color: D.sub, fontWeight: 800 }}>«{activeCard.sentence}»</div>}
                  </>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
                {flashFlipped ? (
                  <>
	                    <Btn color={D.red} dark={D.redDark} data-testid="flash-again-grade" onClick={() => gradeFlashcard(activeCard, "again")} style={{ padding: "10px 12px", fontSize: 12 }}>{L.again}</Btn>
	                    <Btn color={"#FF9600"} dark={"#D97F00"} data-testid="flash-hard" onClick={() => gradeFlashcard(activeCard, "hard")} style={{ padding: "10px 12px", fontSize: 12 }}>{L.hard}</Btn>
	                    <Btn color={D.blue} dark={D.blueDark} data-testid="flash-good" onClick={() => gradeFlashcard(activeCard, "good")} style={{ padding: "10px 12px", fontSize: 12 }}>{L.good}</Btn>
	                    <Btn data-testid="flash-easy" onClick={() => gradeFlashcard(activeCard, "easy")} style={{ padding: "10px 12px", fontSize: 12 }}>{L.easy}</Btn>
                  </>
                ) : (
	                  <Btn color={D.blue} dark={D.blueDark} data-testid="flash-reveal" onClick={() => setFlashFlipped(true)}>{L.reveal}</Btn>
                )}
              </div>
              <div style={{ marginTop: 18, display: "grid", gap: 8 }} data-testid="flash-deck-list">
                {flashDeck.map((c, i) => (
                  <div key={`${strip(c.word)}-${i}`} style={{ border: `2px solid ${i === flashRun.idx ? D.blue : D.line}`, borderRadius: 12, padding: "8px 11px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", background: D.card, opacity: i < flashRun.idx ? 0.55 : 1 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 14 }}>{c.word} <span style={{ color: D.sub, fontWeight: 800 }}>— {c.en}</span></div>
                      <div style={{ fontSize: 11.5, color: D.sub, fontWeight: 800 }}>{c.story}</div>
                    </div>
	                    <div style={{ fontSize: 11, fontWeight: 900, color: i < flashRun.idx ? D.green : D.sub }}>{i < flashRun.idx ? "✓" : `${i + 1}`}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ border: `2px solid ${D.line}`, borderRadius: 16, padding: 18, textAlign: "center", background: D.card }}>
              <Btn color={D.blue} dark={D.blueDark} onClick={startFlashRun}>{L.flashAgain}</Btn>
            </div>
          )}
        </div>
      )}

      {/* ---------- NODE PREVIEW SHEET ---------- */}
      {sheet && (
        <div onClick={() => setSheet(null)} style={{ position: "fixed", inset: 0, background: "rgba(60,60,60,.5)", zIndex: 40, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} className="pop" style={{ background: D.card, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, padding: "10px 22px 28px", boxShadow: "0 -8px 30px rgba(0,0,0,.18)" }}>
            <div style={{ width: 44, height: 5, background: D.line, borderRadius: 99, margin: "6px auto 18px" }} />
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 6 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: sheet.section.color, borderBottom: `5px solid ${sheet.section.dark}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {GLYPHS[sheet.unit.id]}
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 20, lineHeight: 1.15 }}>{sheet.unit.title}</div>
                <div style={{ fontSize: 13, color: D.sub, fontWeight: 700, marginTop: 2 }}>{sheet.unit.desc || sheet.unit.blurb}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "10px 0 2px", background: D.subtle, borderRadius: 14, padding: "8px 12px" }}>
              <div style={{ flexShrink: 0, lineHeight: 0 }}><CoachPortrait id={hostForUnit(sheet.unit.id)} mood="happy" size={46} /></div>
              <div>
                <span className="nametag" style={{ marginRight: 6 }}>{VOICES[hostForUnit(sheet.unit.id)].name}</span>
                <span style={{ fontSize: 13.5, fontWeight: 800, fontStyle: "italic" }}>«{UNIT_INTROS[sheet.unit.id] || "¡Vamos!"}»</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, margin: "14px 0 18px", fontSize: 12.5, fontWeight: 800, color: D.sub, flexWrap: "wrap" }}>
	              <span>{sheet.unit.questions.length + 1} {L.challenges}</span>
              <span>·</span>
	              <span style={{ color: sheet.crowns > 0 ? D.goldDark : D.sub }}><IcCrown size={14} /> {sheet.crowns} {sheet.crowns === 1 && uiLang === "es" ? "corona" : L.crowns}</span>
              <span>·</span>
	              <span>{L.optionTypes}</span>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <Btn color={sheet.section.color} dark={sheet.section.dark} onClick={() => startUnit(sheet.unit, sheet.section)}>
	                {sheet.crowns > 0 ? L.practiceAgain : L.startLesson}
              </Btn>
              {GRAMMAR_GUIDES[sheet.unit.id] && (
                <Btn outline onClick={() => { const u = sheet.unit; setSheet(null); setGuideUnit(u); }} style={{ padding: "9px 14px", fontSize: 13 }}>
                  📖 {uiLang === "en" ? "Grammar guide" : "Guía de gramática"}
                </Btn>
              )}
	              <Btn outline onClick={() => setSheet(null)}>{L.close}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ---------- FIRST-RUN WELCOME ---------- */}
      {splashOpen && (
        <div data-testid="splash" style={{ position: "fixed", inset: 0, zIndex: 60, background: D.card, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
              <LogoMark size={130} data-testid="splash-hero" />
            </div>
            <div style={{ fontWeight: 900, fontSize: 30, color: D.green, letterSpacing: "-0.02em", marginBottom: 4 }}>¡ándale!</div>
            <div data-testid="splash-line" style={{ fontWeight: 800, fontSize: 14.5, color: D.sub, marginBottom: 22, lineHeight: 1.4 }}>
              {L.splashLine}
            </div>
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={20}
              placeholder={L.namePrompt}
              style={{ width: "100%", boxSizing: "border-box", border: `2px solid ${D.line}`, borderRadius: 14, padding: "13px 16px", fontFamily: "inherit", fontWeight: 800, fontSize: 15, marginBottom: 16, outline: "none", textAlign: "center" }} />
            <div data-testid="splash-actions" style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
              <Btn data-testid="splash-start" onClick={() => save({ name: nameDraft.trim(), welcomed: true })} style={{ display: "block", width: "100%", fontSize: 16, textTransform: "none", letterSpacing: "normal" }}>
                {L.splashCta}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ---------- EXIT-LESSON CONFIRM ---------- */}
      {confirmExit && screen === "lesson" && session && (
        <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setConfirmExit(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="exit-lesson-title" onClick={(e) => e.stopPropagation()} style={{ background: D.card, borderRadius: 20, padding: "22px 20px", maxWidth: 340, width: "100%", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><CoachPortrait id={session.host} mood="sad" size={84} /></div>
            <div id="exit-lesson-title" style={{ fontWeight: 900, fontSize: 19, marginBottom: 6 }}>{uiLang === "en" ? "Leave the lesson?" : "¿Salir de la lección?"}</div>
            <div style={{ fontWeight: 800, fontSize: 13, color: D.sub, marginBottom: 16 }}>
              {uiLang === "en" ? `You're ${qi}/${session.questions.length} in.` : `Vas ${qi}/${session.questions.length}.`}
            </div>
            <div style={{ display: "grid", gap: 9 }}>
              <Btn onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmExit(false); }}>{uiLang === "en" ? "Keep going" : "Seguir"}</Btn>
              {!session.review && !session.rival && !session.testOut && !session.missionId && !session.daily && session.unitId !== "_test" && (
                <Btn color={D.blue} dark={D.blueDark} onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  const order = session.questions.map((qq) => ({ u: qq._u, i: qq._i }));
                  save({ resume: { unitId: session.unitId, order, qi, xp: sessionXP, right: lessonStats.right, wrong: lessonStats.wrong } });
                  stopSpeak(); setConfirmExit(false); setScreen("home");
                }}>{uiLang === "en" ? "Save & quit" : "Guardar y salir"}</Btn>
              )}
              <Btn outline data-testid="quit-without-save" onClick={(e) => { e.preventDefault(); e.stopPropagation(); stopSpeak(); setConfirmExit(false); setScreen("home"); }}>{uiLang === "en" ? "Quit without saving" : "Salir sin guardar"}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ---------- NO-HEARTS MODAL ---------- */}
      {heartsModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setHeartsModal(false)}>
          <div className="pop" onClick={(e) => e.stopPropagation()} style={{ background: D.card, borderRadius: 20, padding: "22px 20px", maxWidth: 340, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 0, display: "flex", justifyContent: "center", gap: 4, marginBottom: 10 }}>
              {[...Array(MAX_HEARTS)].map((_, i) => <IcHeart key={i} size={26} off />)}
            </div>
            <div style={{ fontWeight: 900, fontSize: 19, marginBottom: 6 }}>{uiLang === "en" ? "Out of hearts" : "Sin corazones"}</div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: D.sub, marginBottom: 16, lineHeight: 1.45 }}>
              {uiLang === "en" ? `Next heart in ${nextHeartMin} min — or earn one right now with a review.` : `Próximo corazón en ${nextHeartMin} min — o gana uno ahora con un repaso.`}
            </div>
            <div style={{ display: "grid", gap: 9 }}>
              <Btn color={D.blue} dark={D.blueDark} onClick={() => { setHeartsModal(false); startReview(true); }}>
                {uiLang === "en" ? "Review" : "Repasar"} (+1 <IcHeart size={14} />)
              </Btn>
              <Btn color={D.red} dark={D.redDark} disabled={(prog.gems || 0) < REFILL_COST} onClick={() => { refillHearts(); setHeartsModal(false); }}>
                {uiLang === "en" ? "Refill" : "Recargar"} (<IcGem size={14} /> {REFILL_COST})
              </Btn>
              <Btn outline onClick={() => setHeartsModal(false)}>{uiLang === "en" ? "Close" : "Cerrar"}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Bajío unlock flash: once on first streak-1 ¡Eso! / That's it. Then paywall as today. */}
      {bajioUnlockFlash && (() => {
        const bajio = RECUERDOS_PINS.find((p) => p.id === "bajio") || RECUERDOS_PINS[0];
        const flashCopy = bajioUnlockFlashCopy(uiLang);
        return (
        <div data-testid="bajio-unlock-flash" aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 62, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="pop" style={{ background: D.card, borderRadius: 20, padding: 16, maxWidth: 320, width: "100%" }}>
            <div style={{ position: "relative", height: 168, borderRadius: 16, overflow: "hidden", background: theme === "dark" ? D.subtle : "linear-gradient(180deg,#DDF4FF 0%,#E8F6D8 55%,#F3FBEA 100%)", border: `2px solid ${D.line}` }}>
              <svg data-testid="bajio-unlock-flash-outline" viewBox="0 0 300 190" width="100%" height="100%" aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                <path d={MEXICO_OUTLINE_PATH} fill={theme === "dark" ? "#2A3A2C" : "#8FCB6A"} stroke={theme === "dark" ? "#3D5A40" : "#6BAA4A"} strokeWidth="1.6" />
              </svg>
              <div aria-hidden="true" style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: recuerdosFogBackground(RECUERDOS_PINS, {}, theme),
              }} />
              <div
                data-testid="bajio-unlock-flash-pin"
                style={{
                  position: "absolute", left: `${bajio.x}%`, top: `${bajio.y}%`,
                  transform: "translate(-50%, -50%)",
                  display: "flex", flexDirection: "column", alignItems: "center", minWidth: 52, zIndex: 2,
                }}
              >
                <span data-testid="bajio-unlock-flash-glow" className="bajio-glow" style={{
                  width: 18, height: 18,
                  borderRadius: "50% 50% 50% 8px", transform: "rotate(-45deg)",
                  background: D.gold, border: "2px solid #fff",
                  boxShadow: "0 3px 8px rgba(0,0,0,.22)",
                }} />
                <span style={{ marginTop: 6, textAlign: "center", lineHeight: 1.15 }}>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 900, color: D.ink }}>{flashCopy.label}</span>
                  <span style={{ display: "block", fontSize: 10, fontWeight: 800, color: D.greenDark }}>{flashCopy.state}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ---------- SOFT PAYWALL (after first win + vuelve; $0, no IAP) ---------- */}
      {showSoftPaywall && (
        <div data-testid="soft-paywall" style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => dismissSoftPaywall(undefined, { fromBackdrop: true })}>
          <div className="pop" onClick={(e) => e.stopPropagation()} style={{ background: D.card, borderRadius: 20, padding: "22px 20px", maxWidth: 340, width: "100%", textAlign: "center" }}>
            <div data-testid="soft-paywall-headline" style={{ fontWeight: 900, fontSize: 19, marginBottom: 6 }}>{L.paywallHeadline}</div>
            <div data-testid="soft-paywall-body" style={{ fontWeight: 800, fontSize: 13.5, color: D.sub, marginBottom: 16, lineHeight: 1.45 }}>{L.paywallBody}</div>
            <div style={{ display: "grid", gap: 9 }}>
              <Btn data-testid="soft-paywall-annual" onClick={() => dismissSoftPaywall("annual")}>{L.paywallAnnual}</Btn>
              <button type="button" data-testid="soft-paywall-monthly" onClick={() => dismissSoftPaywall("monthly")}
                style={{ display: "block", width: "100%", margin: 0, padding: "11px 0", background: "none", border: "none", color: D.sub, fontFamily: "inherit", fontWeight: 800, fontSize: 13, lineHeight: 1.35, cursor: "pointer" }}>
                {L.paywallMonthly}
              </button>
              <div data-testid="soft-paywall-honesty" style={{ fontWeight: 800, fontSize: 12.5, color: D.sub, lineHeight: 1.35 }}>
                {L.paywallHonesty}
              </div>
              <Btn outline data-testid="soft-paywall-dismiss" onClick={() => dismissSoftPaywall()}>{L.paywallDismiss}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* A2HS: once after free dismiss, on top of post-dismiss Doctora handoff. Not a second paywall. */}
      {a2hsSheet && (
        <div data-testid="a2hs-sheet" style={{ position: "fixed", inset: 0, zIndex: 61, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={dismissA2hs}>
          <div className="pop" onClick={(e) => e.stopPropagation()} style={{ background: D.card, borderRadius: 20, padding: "22px 20px", maxWidth: 340, width: "100%", textAlign: "center" }}>
            <div data-testid="a2hs-title" style={{ fontWeight: 900, fontSize: 19, marginBottom: 6 }}>{L.a2hsTitle}</div>
            <div data-testid="a2hs-how" style={{ fontWeight: 800, fontSize: 13.5, color: D.sub, marginBottom: 16, lineHeight: 1.45 }}>{L.a2hsHow}</div>
            <Btn outline data-testid="a2hs-dismiss" onClick={dismissA2hs}>{L.a2hsDismiss}</Btn>
          </div>
        </div>
      )}

      {/* ---------- STREAK REPAIR MODAL ---------- */}
      {streakRepair && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => { save({ repairChecked: true }); setStreakRepair(null); }}>
          <div className="pop" onClick={(e) => e.stopPropagation()} style={{ background: D.card, borderRadius: 20, padding: "22px 20px", maxWidth: 340, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 4 }}>{streakRepair === "freeze" ? "❄️" : "💔"}</div>
            <div style={{ fontWeight: 900, fontSize: 19, marginBottom: 6 }}>
              {streakRepair === "freeze"
                ? (uiLang === "en" ? "Your streak is frozen!" : "¡Tu racha está congelada!")
                : (uiLang === "en" ? "You missed a day" : "Saltaste un día")}
            </div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: D.sub, marginBottom: 16, lineHeight: 1.45 }}>
              {streakRepair === "freeze"
                ? (uiLang === "en"
                  ? `A freeze auto-protected your ${prog.streak}-day streak yesterday. ${prog.freezes - 1 || 0} ${(prog.freezes - 1) === 1 ? "freeze" : "freezes"} remaining.`
                  : `Un congelamiento protegió tu racha de ${prog.streak} días ayer. Te quedan ${prog.freezes - 1 || 0}.`)
                : (uiLang === "en"
                  ? `Your ${prog.streak}-day streak is in danger. Repair it with gems before today ends.`
                  : `Tu racha de ${prog.streak} días está en peligro. Repárala con gemas antes de que termine el día.`)}
            </div>
            <div style={{ display: "grid", gap: 9 }}>
              {streakRepair === "freeze" ? (
                <Btn color={D.blue} dark={D.blueDark} onClick={() => {
                  // Apply the freeze: keep streak intact, consume one freeze, mark yesterday as covered
                  const y = yesterdayStr();
                  save({ freezes: Math.max(0, (prog.freezes || 1) - 1), lastDay: y, repairChecked: true });
                  setStreakRepair(null);
                }}>{uiLang === "en" ? "Use freeze (auto)" : "Usar congelamiento"}</Btn>
              ) : (
                <Btn color={D.red} dark={D.redDark} disabled={(prog.gems || 0) < 200} onClick={() => {
                  const y = yesterdayStr();
                  save({ gems: (prog.gems || 0) - 200, lastDay: y, repairChecked: true });
                  setStreakRepair(null);
                }}>
                  {uiLang === "en" ? "Repair streak" : "Reparar racha"} (<IcGem size={14} /> 200)
                </Btn>
              )}
              <Btn outline onClick={() => { save({ repairChecked: true, streak: 0 }); setStreakRepair(null); }}>
                {uiLang === "en" ? "Let it go" : "Dejarla ir"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      
      {/* Grammar guide modal */}
      {guideUnit && GRAMMAR_GUIDES[guideUnit.id] && (() => {
        const g = GRAMMAR_GUIDES[guideUnit.id];
        const sec = SECTIONS.find((sec) => sec.unitIds.includes(guideUnit.id)) || SECTIONS[0];
        return (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setGuideUnit(null)}>
          <div className="pop" onClick={(e) => e.stopPropagation()} style={{ background: D.card, borderRadius: 20, padding: "20px 22px", maxWidth: 420, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: sec.color, letterSpacing: ".06em", marginBottom: 2 }}>{guideUnit.title.toUpperCase()}</div>
                <div style={{ fontWeight: 900, fontSize: 21, lineHeight: 1.1 }}>{g.title}</div>
              </div>
              <button onClick={() => setGuideUnit(null)} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: D.sub, padding: "10px 12px", margin: "-10px -12px", lineHeight: 1, minWidth: 44, minHeight: 44 }} aria-label={uiLang === "en" ? "Close" : "Cerrar"}>✕</button>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: D.ink, lineHeight: 1.45, margin: "10px 0 16px", background: D.subtle, borderRadius: 12, padding: "10px 13px" }}>
              {g.pattern}
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, color: D.sub, letterSpacing: ".05em", marginBottom: 6 }}>{uiLang === "en" ? "EXAMPLES" : "EJEMPLOS"}</div>
            <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              {g.examples.map(([es, en], i) => (
                <div key={i} style={{ border: `2px solid ${D.line}`, borderRadius: 10, padding: "8px 11px" }}>
                  <div style={{ fontWeight: 900, fontSize: 14.5, lineHeight: 1.3 }}>{es}</div>
                  <div style={{ fontSize: 12, color: D.sub, fontWeight: 700, marginTop: 2 }}>{en}</div>
                </div>
              ))}
            </div>
            <div style={{ background: D.goldBg, border: `1.5px solid ${D.gold}`, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, fontWeight: 800, color: D.ink, lineHeight: 1.4 }}>
              <span style={{ color: D.goldDark, fontWeight: 900 }}>⚠️ {uiLang === "en" ? "Common trap: " : "Trampa común: "}</span>{g.trap}
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
              <Btn color={sec.color} dark={sec.dark} onClick={() => { const u = guideUnit; setGuideUnit(null); startUnit(u, sec); }}>
                {uiLang === "en" ? "Practice this now" : "Practicar ahora"}
              </Btn>
              <Btn outline onClick={() => setGuideUnit(null)}>{uiLang === "en" ? "Close" : "Cerrar"}</Btn>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ---------- BOTTOM TABS ---------- */}
      {!inLesson && (
        <nav aria-label={uiLang === "en" ? "Primary navigation" : "Navegación principal"} style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: D.card, borderTop: `2px solid ${D.line}`, zIndex: 10, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", display: "flex" }}>
	            {[
		              { id: "camino", Icon: IcHome, l: L.camino },
		              { id: "misiones", Icon: IcBolt, l: L.missions },
		              { id: "lectura", Icon: IcBook, l: L.reading, badge: Object.keys(prog.storyChecks || {}).filter((storyId) => !prog.stories?.[storyId]).length },
		              { id: "practica", Icon: IcBarbell, l: L.practice, badge: dueCount + dueFlashcards.length },
		              { id: "perfil", Icon: IcPerson, l: L.profile },
	            ].map((t) => (
              <button key={t.id} data-testid={`nav-${t.id}`} aria-label={t.l} onClick={() => {
                setTab(t.id);
                if (t.id === "juegos" && !prog.missions?.openedGames) save({ missions: { ...(prog.missions || {}), openedGames: true } });
              }} aria-current={tab === t.id ? "page" : undefined}
                style={{ flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", padding: "10px 0 12px", position: "relative", borderTop: tab === t.id ? `3px solid ${D.green}` : "3px solid transparent", minHeight: 56 }}>
                <div style={{ lineHeight: 0, marginBottom: 2 }}><t.Icon size={22} color={tab === t.id ? D.green : D.lockIcon} /></div>
                <div style={{ fontSize: 9.5, fontWeight: 900, color: tab === t.id ? D.green : D.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.l}</div>
                {!!t.badge && <span style={{ position: "absolute", top: 4, right: t.badge === "NEW" ? 6 : "24%", background: t.badge === "NEW" ? D.gold : D.red, color: t.badge === "NEW" ? D.goldDark : "#fff", border: `1px solid ${t.badge === "NEW" ? D.goldDark : D.red}`, borderRadius: 99, fontSize: t.badge === "NEW" ? 8 : 10, fontWeight: 900, padding: t.badge === "NEW" ? "1px 4px" : "1px 6px" }}>{t.badge}</span>}
              </button>
            ))}
          </div>
        </nav>
      )}

      {(screen === "done" || screen === "failed" || screen === "rivalIntro" || screen === "rivalDone" || screen === "sessionClose") && (
        <div style={{ position: "fixed", top: 14, right: 18, zIndex: 20 }}>
          <LangToggle uiLang={uiLang} D={D} onPick={(code) => save({ uiLang: code })} />
        </div>
      )}

      {/* ---------- LESSON ---------- */}
      {screen === "lesson" && q && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 20px 190px", position: "relative" }}>
          {inter && (
            <div key={inter.key} className="inter" style={{ position: "fixed", top: "32%", left: 0, right: 0, textAlign: "center", zIndex: 60, pointerEvents: "none" }}>
              <span style={{ fontWeight: 900, fontSize: 42, color: "#FF9600", textShadow: "0 3px 0 rgba(0,0,0,.12), 0 0 24px rgba(255,200,0,.5)", letterSpacing: ".02em" }}>{inter.text}</span>
            </div>
          )}
          {burst > 0 && status !== "idle" && status !== "wrong" && inter && <Confetti key={burst} count={28} />}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
            <button type="button" data-testid="lesson-exit" onClick={() => setConfirmExit(true)} aria-label={uiLang === "en" ? "Exit lesson" : "Salir de la lección"} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: D.sub, padding: "10px 12px", margin: "-10px -12px", minWidth: 44, minHeight: 44 }}>✕</button>
            <div style={{ flex: 1, height: 16, background: D.line, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: D.green, borderRadius: 99, transition: "width .25s", position: "relative", overflow: "hidden" }}>
                <div className="shimmer" />
              </div>
            </div>
            {session.rival
              ? <span style={{ fontWeight: 900, fontSize: 13, color: COACHES.diego.dark, whiteSpace: "nowrap" }}>
                  {uiLang === "en" ? "You" : "Tú"} {lessonStats.right} · Diego {(session.diego || []).slice(0, lessonStats.right + lessonStats.wrong).filter(Boolean).length}
                </span>
              : session.review
	              ? <span style={{ fontSize: 12, fontWeight: 900, color: D.blue }}>{L.listening}</span>
              : <span style={{ fontWeight: 900, color: D.red, fontSize: 16 }}><IcHeart size={18} /> {prog.hearts}</span>}
            <LangToggle uiLang={uiLang} D={D} onPick={(code) => save({ uiLang: code })} />
          </div>

          {session.scenario && status === "idle" && (
            <div className="pop" style={{ margin: "-14px 0 18px", background: D.goldBg, border: `2px solid ${D.gold}`, borderRadius: 14, padding: "9px 12px", display: "flex", gap: 9, alignItems: "center", color: D.ink }}>
              <IcBolt size={17} />
              <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.35 }}>{session.scenario}</div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, minHeight: 20 }}>
            {q._requeued ? (
              <span className="pop" style={{ fontSize: 11.5, fontWeight: 900, color: D.accent, background: D.goldBg, border: `2px solid ${D.gold}`, borderRadius: 99, padding: "3px 11px", letterSpacing: ".05em" }}>
	                {L.reviewErrors}
              </span>
            ) : session.testOut != null ? (
              <span style={{ fontSize: 11.5, fontWeight: 900, color: session.color, letterSpacing: ".05em" }}>
	                {L.test} · {coachName(session.host)}: {lessonStats.wrong}/2 {L.errors}
              </span>
            ) : <span />}
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {combo >= 2 && <span className="pop" style={{ fontSize: 13, fontWeight: 900, color: "#FF9600" }}><IcFlame size={15} /> combo ×{combo}</span>}
              {prog.rayo && rayoLeft != null && status === "idle" && (() => {
                const total = RAYO_SECS[q.type] || 15;
                const frac = Math.max(0, rayoLeft / total);
                const r = 12, c = 2 * Math.PI * r;
                const danger = rayoLeft <= 3;
                return (
                  <svg width="30" height="30" viewBox="0 0 30 30" aria-label={`${Math.ceil(rayoLeft)} segundos`}>
                    <circle cx="15" cy="15" r={r} fill="none" stroke={D.line} strokeWidth="4" />
                    <circle cx="15" cy="15" r={r} fill="none" stroke={danger ? D.red : D.gold} strokeWidth="4"
                      strokeDasharray={`${frac * c} ${c}`} strokeLinecap="round" transform="rotate(-90 15 15)" />
                    <text x="15" y="19" textAnchor="middle" fontSize="11" fontWeight="900" fill={danger ? D.red : D.ink}>{Math.ceil(rayoLeft)}</text>
                  </svg>
                );
              })()}
            </span>
          </div>

          <div className={status === "wrong" ? "wiggle" : "pop"} key={`${qi}-${status === "wrong" ? "w" : "p"}`}>
            {/* prompt */}
            {q.type === "match" ? (
	              <h2 style={{ fontWeight: 900, fontSize: 22, margin: "0 0 18px" }}>{L.matchPairs}</h2>
            ) : q.type === "listen" ? (
              <div style={{ textAlign: "center", marginBottom: 18 }}>
	                <h2 style={{ fontWeight: 900, fontSize: 22, margin: "0 0 16px" }}>{L.writeHeard}</h2>
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button onClick={() => speak(q.text)} className="duo-btn" style={{ background: D.blue, borderBottom: `4px solid ${D.blueDark}`, border: "none", color: "#fff", borderRadius: 18, width: 70, height: 70, fontSize: 28, cursor: "pointer" }} aria-label={uiLang === "en" ? "Listen" : "Escuchar"}><IcSpeaker size={32} /></button>
                  <button onClick={() => speak(q.text, 0.6)} className="duo-btn" style={{ background: D.card, border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, borderRadius: 18, width: 70, height: 70, fontSize: 24, cursor: "pointer" }} aria-label={uiLang === "en" ? "Slower" : "Más lento"}><IcTurtle size={34} /></button>
                </div>
              </div>
            ) : q.type === "transform" ? (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 12px" }}>
                  <div className="idle" style={{ lineHeight: 0 }}><CoachPortrait id={session.host} mood="happy" size={52} /></div>
	                  <h2 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>{L.transformIt}</h2>
                </div>
                <div style={{ border: `2px solid ${D.line}`, borderRadius: 14, padding: "13px 16px", background: D.subtle, display: "flex", gap: 10, alignItems: "center" }}>
                  <button onClick={() => speak(q.base)} aria-label={uiLang === "en" ? "Listen" : "Escuchar"} style={{ border: "none", background: D.blueBg, borderRadius: 10, cursor: "pointer", padding: "5px 9px", flexShrink: 0, lineHeight: 0 }}><IcSpeaker size={18} color={"#1CB0F6"} /></button>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{q.base}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 0" }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: session.color }}>↓</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#fff", background: session.color, borderRadius: 99, padding: "4px 13px", borderBottom: `3px solid ${session.dark}` }}>{q.instruction}</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 18 }}>
                <h2 style={{ fontWeight: 900, fontSize: 22, margin: "0 0 14px" }}>
	                  {q.type === "order" ? L.buildSentence : q.type === "type" ? L.completeSentence : L.chooseCorrect}
                </h2>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                  <div style={{ flexShrink: 0, textAlign: "center" }}>
                    <div className="idle"><CoachPortrait id={session.host} mood="happy" size={86} /></div>
                    <span className="nametag">{coachName(session.host)}</span>
                  </div>
                  <div style={{ position: "relative", border: `2px solid ${D.line}`, borderRadius: 16, padding: "14px 16px", background: D.card, flex: 1, marginBottom: 14 }}>
                    <div style={{ position: "absolute", left: -9, bottom: 16, width: 14, height: 14, background: D.card, borderLeft: `2px solid ${D.line}`, borderBottom: `2px solid ${D.line}`, transform: "rotate(45deg)" }} />
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <button onClick={() => speak(q.type === "order" ? q.answer : q.prompt)} aria-label={uiLang === "en" ? "Listen" : "Escuchar"} style={{ border: "none", background: D.blueBg, borderRadius: 10, fontSize: 16, cursor: "pointer", padding: "5px 9px", flexShrink: 0, color: D.blue, lineHeight: 0 }}><IcSpeaker size={18} color={"#1CB0F6"} /></button>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4 }}>{q.prompt}</div>
                        {q.note ? <div style={{ fontSize: 13, color: D.sub, fontWeight: 700, marginTop: 3 }}>{q.note}</div> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* answer area */}
            {q.type === "mc" && (
              <div style={{ display: "grid", gap: 10 }}>
                {q.shuffledChoices.map((c, idx) => {
                  const isSel = selected === idx;
                  const showState = status !== "idle";
                  const isAns = c === q.answer;
                  let bg = "#fff", bd = D.line, col = D.ink;
                  if (showState && isAns) { bg = D.okBg; bd = D.green; col = D.okText; }
                  else if (showState && isSel && !isAns) { bg = D.badBg; bd = D.red; col = D.badText; }
                  else if (isSel) { bg = "#DDF4FF"; bd = D.blue; col = D.blueDark; }
                  return (
                    <button key={idx} className="choice-card" disabled={showState} onClick={() => setSelected(idx)}
                      style={{ textAlign: "left", padding: "13px 15px", fontSize: 16, fontWeight: 700, cursor: showState ? "default" : "pointer", display: "flex", gap: 12, alignItems: "center", background: bg, borderColor: bd, color: col, fontFamily: "inherit", borderBottomColor: bd }}>
                      <span style={{ fontSize: 12, fontWeight: 900, border: `2px solid ${bd}`, borderRadius: 8, padding: "1px 7px", color: bd === D.line ? D.sub : col }}>{idx + 1}</span>
                      {c}
                    </button>
                  );
                })}
              </div>
            )}

            {(q.type === "type" || q.type === "listen" || q.type === "transform") && (
              <div>
                <input ref={inputRef} value={typed} disabled={status !== "idle"}
                  onChange={(e) => { setTypedTileIds([]); setPlaceAt(null); setTyped(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); status === "idle" ? check() : next(); } }}
	                  placeholder={q.type === "listen" ? (uiLang === "en" ? "Write the full sentence…" : "Escribe la oración completa…") : q.type === "transform" ? (uiLang === "en" ? "Write the transformed sentence…" : "Escribe la oración transformada…") : (uiLang === "en" ? "Write the missing word…" : "Escribe la palabra que falta…")}
                  autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  style={{ width: "100%", boxSizing: "border-box", padding: "15px 16px", fontSize: 17, fontWeight: 700, fontFamily: "inherit", borderRadius: 14, border: `2px solid ${status === "idle" ? D.line : status === "wrong" ? D.red : D.green}`, background: status === "idle" ? "#F7F7F7" : status === "wrong" ? D.badBg : D.okBg }} />
                {q.answerAid && (
                  <div style={{ marginTop: 12, border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, borderRadius: 14, padding: 11, background: D.card }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 9 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: session.color, letterSpacing: ".06em" }}>
                        {q.answerAid.mode === "choices"
                          ? (uiLang === "en" ? "TAP AN ANSWER" : "TOCA UNA RESPUESTA")
                          : (uiLang === "en" ? "BUILD WITH WORDS" : "ARMA CON PALABRAS")}
                      </div>
                      {typedTileIds.length > 0 && status === "idle" && (
                        <button type="button" onClick={() => { setPlaceAt(null); setTypedFromTiles([]); }} style={{ border: "none", background: "none", color: D.sub, fontFamily: "inherit", fontWeight: 900, fontSize: 11, cursor: "pointer", padding: "4px 0" }}>
                          {uiLang === "en" ? "Clear" : "Borrar"}
                        </button>
                      )}
                    </div>
                    {q.answerAid.mode === "bank" && (
                      <div>
                        <div style={{ minHeight: 88, borderRadius: 12, background: D.subtle, border: `1.5px dashed ${D.line}`, padding: "8px 9px", display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", marginBottom: 6 }}>
                          {typedTileIds.length === 0 && <span style={{ fontSize: 12.5, fontWeight: 800, color: D.sub }}>{uiLang === "en" ? "Tap words below instead of typing." : "Toca palabras abajo en vez de escribir."}</span>}
                          {typedTileIds.map((id) => {
                            const tile = q.answerAid.tiles.find((t) => t.id === id);
                            return tile ? (
                              <button type="button" key={id} data-tile-id={id} data-testid="placed-tile" className="tile" disabled={status !== "idle"}
                                title={uiLang === "en" ? "Tap to return to the bank" : "Toca para devolver al banco"}
                                aria-label={`${tile.w}. ${uiLang === "en" ? "Tap to return to the bank" : "Toca para devolver al banco"}`}
                                onClick={() => removeAnswerTile(id)}
                                style={{ background: D.blueBg, borderColor: D.blue, borderBottomColor: D.blue, color: D.blueDark, padding: "7px 10px", fontSize: 14 }}>
                                {tile.w}
                                <span aria-hidden="true" style={{ marginLeft: 6, opacity: 0.5, fontWeight: 900 }}>×</span>
                              </button>
                            ) : null;
                          })}
                        </div>
                        {typedTileIds.length > 0 && status === "idle" && (
                          <div style={{ fontSize: 11.5, fontWeight: 800, color: D.sub, marginBottom: 8 }}>
                            {uiLang === "en" ? "Tap a placed word to move it." : "Toca una ficha colocada para moverla."}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="tile-bank">
                      {q.answerAid.tiles.map((tile) => {
                        const used = typedTileIds.includes(tile.id);
                        const hide = q.answerAid.mode === "bank" && used;
                        return (
                          <div key={tile.id} className="tile-slot" data-tile-slot={tile.id}
                            onClick={() => { if (hide) removeAnswerTile(tile.id); }}>
                            <button type="button" data-tile-id={hide ? undefined : tile.id} data-testid={hide ? undefined : "bank-tile"} className="tile"
                              disabled={status !== "idle"}
                              aria-pressed={used}
                              aria-hidden={hide}
                              tabIndex={hide ? -1 : 0}
                              onClick={(e) => { e.stopPropagation(); chooseAnswerTile(tile); }}
                              style={{
                                visibility: hide ? "hidden" : "visible",
                                pointerEvents: hide ? "none" : "auto",
                                background: used ? D.greenBg : "#fff",
                                borderColor: used ? D.green : D.line,
                                borderBottomColor: used ? D.green : D.line,
                                color: used ? D.greenDark : D.ink,
                                padding: "8px 11px",
                                fontSize: 14,
                              }}>
                              {tile.w}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {ACCENTS.map((ch) => (
                    <button key={ch} onClick={() => insertChar(ch)} disabled={status !== "idle"} className="tile" style={{ padding: "4px 11px", fontSize: 15 }}>
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {q.type === "order" && (
              <div>
                <div style={{ minHeight: 88, borderBottom: `2px solid ${D.line}`, borderTop: `2px solid ${D.line}`, padding: "10px 4px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 6 }}>
	                  {placed.length === 0 && <span style={{ color: D.sub, fontWeight: 700, fontSize: 14 }}>{L.typeOrder}</span>}
                  {placed.map((id) => {
                    const t = q.shuffledWords.find((x) => x.id === id);
                    return (
                      <button type="button" key={id} data-tile-id={id} data-testid="placed-tile" className="tile" disabled={status !== "idle"}
                        title={uiLang === "en" ? "Tap to return to the bank" : "Toca para devolver al banco"}
                        aria-label={`${t.w}. ${uiLang === "en" ? "Tap to return to the bank" : "Toca para devolver al banco"}`}
                        onClick={() => unplaceOrderTile(id)}
                        style={{ background: D.blueBg, borderColor: D.blue, borderBottomColor: D.blue, color: D.blueDark }}>
                        {t.w}
                        <span aria-hidden="true" style={{ marginLeft: 6, opacity: 0.5, fontWeight: 900 }}>×</span>
                      </button>
                    );
                  })}
                </div>
                {placed.length > 0 && status === "idle" && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: D.sub }}>
                      {uiLang === "en" ? "Tap a placed word to move it." : "Toca una ficha colocada para moverla."}
                    </div>
                    <button type="button" onClick={() => { setPlaced([]); setPlaceAt(null); }} style={{ border: "none", background: "none", color: D.sub, fontFamily: "inherit", fontWeight: 900, fontSize: 11, cursor: "pointer", padding: "4px 0" }}>
                      {uiLang === "en" ? "Clear" : "Borrar"}
                    </button>
                  </div>
                )}
                <div className="tile-bank">
                  {q.shuffledWords.map((t) => {
                    const used = placed.includes(t.id);
                    return (
                      <div key={t.id} className="tile-slot" data-tile-slot={t.id}
                        onClick={() => { if (used) unplaceOrderTile(t.id); }}>
                        <button type="button" data-tile-id={used ? undefined : t.id} data-testid={used ? undefined : "bank-tile"} className="tile"
                          disabled={status !== "idle"}
                          aria-hidden={used}
                          tabIndex={used ? -1 : 0}
                          onClick={(e) => { e.stopPropagation(); if (!used) placeOrderTile(t.id); }}
                          style={{ visibility: used ? "hidden" : "visible", pointerEvents: used ? "none" : "auto" }}>
                          {t.w}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {q.type === "match" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[0, 1].map((side) => (
                  <div key={side} style={{ display: "grid", gap: 10, alignContent: "start" }}>
                    {(side === 0 ? q.left : q.right).map((item, idx) => {
                      const isMatched = matched.includes(item.id);
                      const isSel = matchSel && matchSel.side === side && matchSel.idx === idx;
                      const isWrong = matchWrong && ((matchWrong.a.side === side && matchWrong.a.idx === idx) || (matchWrong.b.side === side && matchWrong.b.idx === idx));
                      return (
                        <button key={idx} className="choice-card" disabled={isMatched}
                          onClick={() => { if (side === 0) speak(item.t); onMatchTap(side, idx, item.id); }}
                          style={{ padding: "13px 10px", fontSize: 15, fontWeight: 800, fontFamily: "inherit", cursor: isMatched ? "default" : "pointer", background: isMatched ? D.okBg : isWrong ? D.badBg : isSel ? "#DDF4FF" : "#fff", borderColor: isMatched ? D.green : isWrong ? D.red : isSel ? D.blue : D.line, borderBottomColor: isMatched ? D.green : isWrong ? D.red : isSel ? D.blue : D.line, color: isMatched ? D.okText : isWrong ? D.badText : isSel ? D.blueDark : D.ink, opacity: isMatched ? 0.55 : 1 }}>
                          {item.t}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---------- ACTION BAR with mascot ---------- */}
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: status === "idle" ? D.card : status === "wrong" ? D.badBg : D.okBg, borderTop: `2px solid ${status === "idle" ? D.line : status === "wrong" ? D.red : D.green}`, zIndex: 10, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <div style={{ maxWidth: 600, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              {status !== "idle" && (
                <div className={status === "wrong" ? "" : "jump"} style={{ flexShrink: 0 }}>
                  <CoachPortrait id={session.host} mood={status === "wrong" ? "sad" : "party"} size={58} />
                </div>
              )}
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700, lineHeight: 1.45, color: status === "wrong" ? D.badText : status === "idle" ? D.sub : D.okText }}>
                {showWordOrderTip && status !== "idle" && status !== "wrong" && (
                  <div>
                    <div data-testid="word-order-miss" style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6, opacity: 0.85 }}>
                      {L.yourAnswer}: {wordOrderMiss}
                    </div>
                    <div data-testid="word-order-tip" className="pop" style={{ marginBottom: 8, border: `1.5px solid ${D.gold}`, borderRadius: 11, padding: "8px 10px", background: D.goldBg, fontSize: 12.5, fontWeight: 800, lineHeight: 1.35, color: D.ink }}>
                      {L.wordOrderTip}
                    </div>
                  </div>
                )}
                {status === "correct" && <span><b>{quip}</b> {q.explain}</span>}
	                {status === "almost" && <span><b>{quip}</b> {L.spelling}: <b>{q.answers?.[0]}</b>. {q.explain}</span>}
                {status === "wrong" && (() => {
	                  const correctText = q.type === "mc" ? q.answer : q.type === "order" ? q.answer : q.type === "listen" ? q.text : q.answers?.[0]; // type & transform → answers[0]
	                  const showDiff = (q.type === "type" || q.type === "listen" || q.type === "transform") && typed.trim();
	                  const marks = showDiff ? wordDiff(correctText, typed) : null;
	                  const hasAccent = marks?.some((m) => m.k === "accent");
	                  const errorKind = showDiff ? diagnoseAnswer(q, typed) : skillFor(q);
	                  return (
	                    <div>
		                      <div style={{ fontWeight: 900, marginBottom: 2 }}>{wasTimeout && <span><IcBolt size={14} /> {L.time} </span>}{quip}</div>
		                      {errorKind && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: D.card, border: `1.5px solid ${D.red}`, borderRadius: 99, padding: "1px 8px", fontSize: 11, fontWeight: 900, marginBottom: 5 }}>{L.focus}: {errorKind}</div>}
	                      {showDiff ? (
                        <div>
	                          <div style={{ fontSize: 12.5, opacity: 0.8 }}>{L.yourAnswer}: <span style={{ textDecoration: "line-through", textDecorationThickness: 2 }}>{typed}</span></div>
                          <div style={{ fontSize: 15.5, marginTop: 2 }}>
	                            <span style={{ opacity: 0.8, fontSize: 12.5 }}>{L.correct}: </span>
                            {marks.map((m, i) => (
                              <b key={i} style={{ color: m.k === "ok" ? D.okText : m.k === "accent" ? "#E08600" : D.badText, borderBottom: m.k === "ok" ? "none" : "2.5px solid currentColor", marginRight: 5 }}>{m.w}</b>
                            ))}
                          </div>
	                          {hasAccent && <div style={{ fontSize: 11.5, color: D.accent, marginTop: 2 }}>{uiLang === "en" ? "orange = only the accent is missing" : "naranja = solo falta el acento"}</div>}
                        </div>
                      ) : (
	                        <div><b>{L.correctAnswer}:</b> {correctText}</div>
                      )}
                      <button onClick={() => setShowWhy((w) => !w)}
                        style={{ background: "none", border: "none", padding: 0, marginTop: 5, cursor: "pointer", fontFamily: "inherit", fontWeight: 900, fontSize: 13, color: D.blue, textDecoration: "underline" }}>
	                        {L.why} {showWhy ? "▴" : "▾"}
                      </button>
                      {showWhy && <div className="pop" style={{ marginTop: 4, color: D.ink, background: D.card, border: `2px solid ${D.line}`, borderRadius: 10, padding: "8px 11px", fontSize: 13.5 }}>{q.explain}</div>}
                    </div>
                  );
                })()}
	                {status === "idle" && (q.type === "match" ? L.matchInstruction : L.enterCheck)}
              </div>
              {q.type !== "match" || status !== "idle" ? (
                status === "idle" ? (
	                  <Btn data-testid="lesson-check" onClick={check} style={{ flexShrink: 0 }}>{L.check}</Btn>
                ) : session.review && (status === "correct" || status === "almost") ? (
                  <div style={{ flexShrink: 0, textAlign: "center" }}>
	                    <div style={{ fontSize: 11, fontWeight: 900, color: D.okText, marginBottom: 5, letterSpacing: ".04em" }}>{L.selfGrade} · +{status === "almost" ? 3 : 4} XP</div>
                    <div style={{ display: "flex", gap: 7 }}>
	                      <Btn color={"#FF9600"} dark={"#D97F00"} onClick={() => gradeAndNext(3)} style={{ padding: "10px 13px", fontSize: 12 }}>{L.hard}</Btn>
	                      <Btn color={D.blue} dark={D.blueDark} onClick={() => gradeAndNext(4)} style={{ padding: "10px 13px", fontSize: 12 }}>{L.good}</Btn>
	                      <Btn onClick={() => gradeAndNext(5)} style={{ padding: "10px 13px", fontSize: 12 }}>{L.easy}</Btn>
                    </div>
                  </div>
                ) : (
	                  <Btn color={status === "wrong" ? D.red : D.green} dark={status === "wrong" ? D.redDark : D.greenDark} onClick={next} style={{ flexShrink: 0 }}>{L.continue}</Btn>
                )
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ---------- DIALOGUE DUEL ---------- */}
      {screen === "dialogue" && (() => {
        const step = activeDuel.steps[dialogue.idx];
        const maxScore = activeDuel.steps.length * 3;
        const stars = dialogue.score >= 8 ? 3 : dialogue.score >= 5 ? 2 : 1;
        return (
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 20px 130px" }}>
            {burst > 0 && dialogue.done && <Confetti key={burst} count={42} />}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <button onClick={() => { setScreen("home"); setTab("misiones"); }} aria-label={uiLang === "en" ? "Close" : "Cerrar"} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: D.sub, padding: "10px 12px", margin: "-10px -12px", minWidth: 44, minHeight: 44 }}>✕</button>
              <div style={{ flex: 1, height: 14, background: D.line, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${Math.round((dialogue.done ? 1 : dialogue.idx / activeDuel.steps.length) * 100)}%`, height: "100%", background: activeDuel.color }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 900, color: activeDuel.dark }}>{dialogue.score}/{maxScore}</span>
              <LangToggle uiLang={uiLang} D={D} onPick={(code) => save({ uiLang: code })} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 16 }}>
              <CoachPortrait id="diego" mood={dialogue.done ? "party" : "happy"} size={86} />
              <div style={{ border: `2px solid ${D.line}`, borderRadius: 16, padding: "13px 15px", flex: 1, position: "relative", background: D.card }}>
                <div style={{ position: "absolute", left: -9, bottom: 17, width: 14, height: 14, background: D.card, borderLeft: `2px solid ${D.line}`, borderBottom: `2px solid ${D.line}`, transform: "rotate(45deg)" }} />
                <div className="nametag" style={{ marginBottom: 6 }}>{uiLang === "en" ? "Client" : "Cliente"}</div>
                <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.45 }}>{dialogue.done ? (uiLang === "en" ? "Done. You survived the call." : "Listo. Sobreviviste a la llamada.") : step.npc}</div>
              </div>
            </div>
            {dialogue.done ? (
              <div className="pop" style={{ textAlign: "center", border: `2px solid ${D.gold}`, borderBottom: `5px solid ${D.goldDark}`, borderRadius: 16, padding: 18, background: D.goldBg }}>
                <div style={{ fontSize: 28, color: D.goldDark, fontWeight: 900 }}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</div>
                <h2 style={{ fontWeight: 900, margin: "4px 0" }}>{stars === 3 ? (uiLang === "en" ? "Client delighted" : "Cliente encantado") : stars === 2 ? (uiLang === "en" ? "Call handled" : "Llamada resuelta") : (uiLang === "en" ? "Solved it, barely" : "Resolviste, pero sudando")}</h2>
                <p style={{ color: D.sub, fontWeight: 800, margin: "0 0 16px" }}>+{20 + stars * 5} XP · <IcGem size={14} /> 8 · {uiLang === "en" ? "main focus: professional register" : "foco principal: registro profesional"}</p>
                <div style={{ display: "grid", gap: 8, textAlign: "left", marginBottom: 18 }}>
                  {dialogue.log.map((row, i) => (
                    <div key={i} style={{ background: D.card, border: `2px solid ${D.line}`, borderRadius: 12, padding: "8px 10px" }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: D.sub }}>{uiLang === "en" ? "Turn" : "Turno"} {i + 1}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 800 }}>{row.choice.text}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: row.choice.score >= 2 ? D.okText : D.badText, marginTop: 3 }}>{row.choice.note}</div>
                    </div>
                  ))}
                </div>
                <Btn color={activeDuel.color} dark={activeDuel.dark} onClick={() => startDialogue(activeDuel)}>{uiLang === "en" ? "Rematch" : "Revancha"}</Btn>
	                <Btn outline onClick={() => { setScreen("home"); setTab("misiones"); }} style={{ marginLeft: 10 }}>{L.missions}</Btn>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {step.choices.map((choice, i) => (
                  <button key={i} onClick={() => chooseDialogue(choice)} className="choice-card"
                    style={{ textAlign: "left", padding: "13px 15px", fontSize: 15.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", background: D.card }}>
                    <span style={{ display: "inline-block", fontSize: 12, fontWeight: 900, border: `2px solid ${activeDuel.color}`, color: activeDuel.dark, borderRadius: 8, padding: "1px 7px", marginRight: 9 }}>{i + 1}</span>
                    {choice.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ---------- SERPIENTES Y ESCALERAS ---------- */}
      {screen === "snakes" && snakeGame && (() => {
        const qg = snakeGame.question;
        const tiles = Array.from({ length: 24 }, (_, i) => 24 - i);
        const trophyCount = Object.values(prog.missions?.gameTrophies || {}).filter(Boolean).length;
        return (
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 14px 130px" }}>
            {burst > 0 && snakeGame.done && <Confetti key={burst} count={54} />}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <button onClick={() => { setScreen("home"); setTab("practica"); }} aria-label={uiLang === "en" ? "Close" : "Cerrar"} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: D.sub, padding: "10px 12px", margin: "-10px -12px", minWidth: 44, minHeight: 44 }}>✕</button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: D.greenDark, letterSpacing: ".08em" }}>{uiLang === "en" ? "BOARD RUN" : "CARRERA DE TABLERO"}</div>
                <div style={{ fontWeight: 900, fontSize: 21 }}>Serpientes y Escaleras</div>
              </div>
              <div style={{ border: `2px solid ${D.green}`, borderBottom: `4px solid ${D.greenDark}`, borderRadius: 12, padding: "7px 10px", background: D.greenBg, fontWeight: 900, color: D.greenDark }}>{snakeGame.tile}/24</div>
              <LangToggle uiLang={uiLang} D={D} onPick={(code) => save({ uiLang: code })} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
              {[
                [uiLang === "en" ? "Correct" : "Correctas", snakeGame.correct || 0],
                [uiLang === "en" ? "Slides" : "Resbalones", snakeGame.slides || 0],
                [uiLang === "en" ? "Ladders" : "Escaleras", snakeGame.ladders || 0],
                [uiLang === "en" ? "Trophies" : "Trofeos", trophyCount],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `2px solid ${D.line}`, borderRadius: 12, padding: "7px 5px", textAlign: "center", background: D.card }}>
                  <div style={{ fontSize: 9.5, fontWeight: 900, color: D.sub }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: D.greenDark }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 12 }}>
              {[
                [uiLang === "en" ? "Answer" : "Responde", uiLang === "en" ? "tap a choice" : "toca opción", D.blue],
                [uiLang === "en" ? "Climb" : "Sube", uiLang === "en" ? "↗ tiles jump ahead" : "↗ avanza más", D.green],
                [uiLang === "en" ? "Avoid" : "Evita", uiLang === "en" ? "↓ tiles slide back" : "↓ te baja", D.red],
              ].map(([label, desc, color]) => (
                <div key={label} style={{ border: `1.5px solid ${color}`, background: color === D.green ? D.greenBg : color === D.red ? D.redBg : D.blueBg, borderRadius: 12, padding: "7px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color }}>{label}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 850, color: D.ink, lineHeight: 1.15 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ border: `2px solid ${D.green}`, borderBottom: `5px solid ${D.greenDark}`, borderRadius: 16, padding: 9, background: D.greenBg, marginBottom: 13 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(42px, 1fr))", gap: 6 }}>
                {tiles.map((n) => {
                  const link = SNAKES_LADDERS_LINKS[n];
                  const isHere = snakeGame.tile === n || (!snakeGame.done && snakeGame.finalTile === n);
                  const isPending = snakeGame.pendingTile === n && snakeGame.finalTile !== n;
                  const bg = n === 24 ? D.goldBg : isHere ? D.card : isPending ? D.blueBg : D.subtle;
                  const bd = n === 24 ? D.gold : isHere ? D.green : isPending ? D.blue : D.line;
                  return (
                    <div key={n} data-testid={`snake-tile-${n}`} style={{ aspectRatio: "1 / 1", minHeight: 42, border: `2px solid ${bd}`, borderBottom: `4px solid ${bd}`, borderRadius: 10, background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", color: isHere ? D.greenDark : D.ink, fontWeight: 900 }}>
                      <span style={{ fontSize: 13 }}>{n}</span>
                      {link && <span style={{ fontSize: 10, color: link.kind === "ladder" ? D.greenDark : D.redDark }}>{link.kind === "ladder" ? `↗${link.to}` : `↓${link.to}`}</span>}
                      {isHere && <span style={{ position: "absolute", right: 4, top: 3, width: 13, height: 13, borderRadius: "50%", background: D.green, border: `2px solid ${D.greenDark}` }} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {snakeGame.done ? (
              <div className="pop" style={{ textAlign: "center", border: `2px solid ${D.gold}`, borderBottom: `5px solid ${D.goldDark}`, borderRadius: 16, padding: 16, background: D.goldBg }}>
                <CoachPortrait id="luna" mood="party" size={86} />
                <h2 style={{ margin: "8px 0 4px", fontWeight: 900 }}>{snakeGame.wrong === 0 ? (uiLang === "en" ? "Clean climb!" : "¡Subida limpia!") : (uiLang === "en" ? "You reached the plaza" : "Llegaste a la plaza")}</h2>
                <div style={{ fontSize: 13, fontWeight: 800, color: D.sub, marginBottom: 12 }}>XP +{snakeGame.xp || 0} · <IcGem size={14} /> +{snakeGame.gems || 0}</div>
                <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
                  <span style={{ border: `1.5px solid ${D.gold}`, borderRadius: 99, padding: "4px 9px", fontSize: 11, fontWeight: 900, color: D.goldDark, background: D.card }}>★ {uiLang === "en" ? "First climb" : "Primera subida"}</span>
                  {snakeGame.wrong === 0 && <span style={{ border: `1.5px solid ${D.gold}`, borderRadius: 99, padding: "4px 9px", fontSize: 11, fontWeight: 900, color: D.goldDark, background: D.card }}>★ {uiLang === "en" ? "No slides" : "Sin resbalones"}</span>}
                </div>
                <Btn color={D.green} dark={D.greenDark} onClick={startSnakes}>{uiLang === "en" ? "Play again" : "Jugar otra vez"}</Btn>
                <Btn outline onClick={() => { setScreen("home"); setTab("practica"); }} style={{ marginLeft: 10 }}>{L.games}</Btn>
              </div>
            ) : (
              <div className="pop" style={{ border: `2px solid ${D.line}`, borderBottom: `5px solid ${D.line}`, borderRadius: 16, padding: 15, background: D.card }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <CoachPortrait id={snakeGame.focus.host || "luna"} mood={snakeGame.status === "wrong" ? "sad" : "happy"} size={60} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 900, color: D.greenDark, letterSpacing: ".06em" }}>{snakeGame.focus.title[uiLang]} · {qg.skill}</div>
                    <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.25 }}>{qg.prompt}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {qg.choices.map((choice, i) => {
                    const revealed = snakeGame.status !== "idle";
                    const correct = strip(choice) === strip(qg.answer);
                    const chosen = strip(choice) === strip(snakeGame.selected || "");
                    return (
                      <button key={`${choice}-${i}`} data-testid={`snake-choice-${i}`} disabled={revealed} onClick={() => chooseSnake(choice)}
                        style={{ textAlign: "left", border: `2px solid ${revealed && correct ? D.green : revealed && chosen ? D.red : D.line}`, borderBottom: `4px solid ${revealed && correct ? D.greenDark : revealed && chosen ? D.redDark : D.line}`, background: revealed && correct ? D.greenBg : revealed && chosen ? D.redBg : D.card, color: revealed && correct ? D.greenDark : revealed && chosen ? D.redDark : D.ink, borderRadius: 13, padding: "11px 12px", fontFamily: "inherit", fontWeight: 850, fontSize: 14.5, cursor: revealed ? "default" : "pointer" }}>
                        <span style={{ display: "inline-block", fontSize: 12, fontWeight: 900, border: `2px solid ${D.green}`, color: D.greenDark, borderRadius: 8, padding: "1px 7px", marginRight: 9 }}>{i + 1}</span>
                        {choice}
                      </button>
                    );
                  })}
                </div>
                {snakeGame.status !== "idle" && (
                  <div className="pop" style={{ marginTop: 12, border: `2px solid ${snakeGame.status === "correct" ? D.green : D.red}`, borderRadius: 13, padding: "10px 12px", background: snakeGame.status === "correct" ? D.greenBg : D.redBg }}>
                    <div style={{ fontWeight: 900, color: snakeGame.status === "correct" ? D.greenDark : D.redDark }}>
                      {snakeGame.status === "correct"
                        ? `${uiLang === "en" ? "Roll" : "Tiro"} ${snakeGame.roll}: ${snakeGame.tile} → ${snakeGame.pendingTile}${snakeGame.link ? ` → ${snakeGame.finalTile}` : ""}`
                        : `${uiLang === "en" ? "Slide back" : "Retrocede"} ${snakeGame.roll}: ${snakeGame.tile} → ${snakeGame.finalTile}`}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: D.ink, lineHeight: 1.4, marginTop: 4 }}>
                      {snakeGame.link?.kind === "ladder" ? (uiLang === "en" ? "Shortcut unlocked." : "Atajo desbloqueado.") : snakeGame.link?.kind === "snake" ? (uiLang === "en" ? "A slide tile pulled you back." : "Una casilla de resbalón te bajó.") : qg.explain}
                    </div>
                    <Btn color={D.green} dark={D.greenDark} onClick={nextSnake} style={{ width: "100%", marginTop: 12 }}>{snakeGame.finalTile >= 24 ? (uiLang === "en" ? "Claim prize" : "Cobrar premio") : L.continue}</Btn>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ---------- SAFE OR RISKY ---------- */}
      {screen === "safeRisky" && safeGame && (() => {
        const item = safeGame.items[safeGame.idx];
        const labels = {
          safe: uiLang === "en" ? "Safe" : "Seguro",
          casual: uiLang === "en" ? "Casual" : "Casual",
          formal: uiLang === "en" ? "Formal" : "Formal",
          regional: uiLang === "en" ? "Regional" : "Regional",
          risky: uiLang === "en" ? "Risky" : "Riesgoso",
        };
        const order = ["safe", "casual", "formal", "regional", "risky"];
        const palette = { safe: D.green, casual: D.goldDark, formal: D.blue, regional: D.purpleDark, risky: D.red };
        return (
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 20px 130px" }}>
            {burst > 0 && safeGame.done && <Confetti key={burst} count={36} />}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <button onClick={() => { setScreen("home"); setTab("practica"); }} aria-label={uiLang === "en" ? "Close" : "Cerrar"} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: D.sub, padding: "10px 12px", margin: "-10px -12px", minWidth: 44, minHeight: 44 }}>✕</button>
              <div style={{ flex: 1, height: 14, background: D.line, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${safeGame.done ? 100 : Math.round((safeGame.idx / safeGame.items.length) * 100)}%`, height: "100%", background: D.red }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 900, color: D.red }}>{safeGame.score}/{safeGame.items.length}</span>
              <LangToggle uiLang={uiLang} D={D} onPick={(code) => save({ uiLang: code })} />
            </div>
            {safeGame.done ? (
              <div className="pop" style={{ textAlign: "center", border: `2px solid ${D.gold}`, borderBottom: `5px solid ${D.goldDark}`, borderRadius: 16, padding: 18, background: D.goldBg }}>
                <CoachPortrait id="valeria" mood="party" size={92} />
                <h2 style={{ fontWeight: 900, margin: "8px 0 4px" }}>{safeGame.score === safeGame.items.length ? (uiLang === "en" ? "Perfect social radar" : "Radar social perfecto") : (uiLang === "en" ? "Judgment sharpened" : "Juicio afilado")}</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "12px 0 16px" }}>
                  {[
                    [uiLang === "en" ? "Score" : "Puntos", `${safeGame.score}/${safeGame.items.length}`],
                    [uiLang === "en" ? "Best streak" : "Mejor racha", safeGame.bestStreak || 0],
                    ["XP", `+${safeGame.xp || 0}`],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: D.card, border: `1.5px solid ${D.gold}`, borderRadius: 12, padding: "7px 6px" }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: D.sub }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: D.goldDark }}>{value}</div>
                    </div>
                  ))}
                </div>
                <p style={{ color: D.sub, fontWeight: 800, margin: "0 0 16px" }}><IcGem size={14} /> +{safeGame.gems || 0}</p>
                <Btn color={D.red} dark={D.redDark} onClick={startSafeRisky}>{uiLang === "en" ? "Play again" : "Jugar otra vez"}</Btn>
                <Btn outline onClick={() => { setScreen("home"); setTab("practica"); }} style={{ marginLeft: 10 }}>{L.games}</Btn>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ border: `2px solid ${D.red}`, borderRadius: 99, padding: "4px 10px", color: D.redDark, background: D.redBg, fontSize: 11, fontWeight: 900 }}>{uiLang === "en" ? "Round" : "Ronda"} {safeGame.idx + 1}/{safeGame.items.length}</span>
                  <span style={{ border: `2px solid ${D.gold}`, borderRadius: 99, padding: "4px 10px", color: D.goldDark, background: D.goldBg, fontSize: 11, fontWeight: 900 }}><IcFlame size={13} /> {safeGame.streak || 0} {uiLang === "en" ? "streak" : "racha"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 16 }}>
                  <CoachPortrait id="valeria" mood={safeGame.selected && safeGame.selected !== item.answer ? "sad" : "happy"} size={86} />
                  <div style={{ border: `2px solid ${D.line}`, borderRadius: 16, padding: "13px 15px", flex: 1, position: "relative", background: D.card }}>
                    <div style={{ position: "absolute", left: -9, bottom: 17, width: 14, height: 14, background: D.card, borderLeft: `2px solid ${D.line}`, borderBottom: `2px solid ${D.line}`, transform: "rotate(45deg)" }} />
                    <div className="nametag" style={{ marginBottom: 6 }}>{uiLang === "en" ? "Would you say it?" : "¿Lo dirías?"}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.45 }}>{item.context[uiLang]}</div>
                  </div>
                </div>
                <div style={{ border: `2px solid ${D.line}`, borderBottom: `5px solid ${D.line}`, borderRadius: 18, padding: 18, background: D.card, textAlign: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 27, fontWeight: 900, lineHeight: 1.15 }}>{item.phrase}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                  {order.map((key) => {
                    const chosen = safeGame.selected === key;
                    const revealed = !!safeGame.selected;
                    const correct = item.answer === key;
                    const color = palette[key];
                    return (
                      <button key={key} data-testid={`safe-risky-choice-${key}`} disabled={revealed} onClick={() => chooseSafeRisky(key)}
                        style={{ border: `2px solid ${revealed && correct ? D.green : revealed && chosen ? D.red : color}`, borderBottom: `5px solid ${revealed && correct ? D.greenDark : revealed && chosen ? D.redDark : color}`, background: revealed && correct ? D.greenBg : revealed && chosen ? D.redBg : D.card, color: revealed && correct ? D.greenDark : revealed && chosen ? D.red : D.ink, borderRadius: 14, padding: "12px 10px", fontFamily: "inherit", fontWeight: 900, fontSize: 14, cursor: revealed ? "default" : "pointer" }}>
                        {labels[key]}
                      </button>
                    );
                  })}
                </div>
                {safeGame.selected && (
                  <div className="pop" style={{ marginTop: 14, border: `2px solid ${safeGame.selected === item.answer ? D.green : D.red}`, borderRadius: 14, padding: "11px 13px", background: safeGame.selected === item.answer ? D.greenBg : D.redBg, textAlign: "left" }}>
                    <div style={{ fontWeight: 900, color: safeGame.selected === item.answer ? D.greenDark : D.redDark, marginBottom: 4 }}>
                      {safeGame.selected === item.answer ? (safeGame.streak >= 3 ? (uiLang === "en" ? "Combo judgment." : "Juicio en combo.") : (uiLang === "en" ? "Good judgment." : "Buen juicio.")) : `${uiLang === "en" ? "Better answer" : "Mejor respuesta"}: ${labels[item.answer]}`}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.4, color: D.ink }}>{item.note[uiLang]}</div>
                    <Btn color={D.red} dark={D.redDark} onClick={nextSafeRisky} style={{ width: "100%", marginTop: 12 }}>{safeGame.idx + 1 >= safeGame.items.length ? (uiLang === "en" ? "Finish" : "Terminar") : L.continue}</Btn>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* ---------- MATCH PAIRS (Práctica) ---------- */}
      {screen === "matchPairs" && matchGame && (() => {
        const goPractica = () => { setScreen("home"); setTab("practica"); };
        const n = matchGame.pairs?.length || 0;
        const got = matchGame.matched?.length || 0;
        return (
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 20px 40px" }}>
            {burst > 0 && matchGame.done && <Confetti key={burst} count={36} />}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <button onClick={goPractica} aria-label={uiLang === "en" ? "Close" : "Cerrar"} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: D.sub, padding: "10px 12px", margin: "-10px -12px", minWidth: 44, minHeight: 44 }}>✕</button>
              <div style={{ flex: 1, height: 14, background: D.line, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${n ? Math.round((got / n) * 100) : 0}%`, height: "100%", background: D.blue }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 900, color: D.blue }}>{got}/{n}</span>
              <LangToggle uiLang={uiLang} D={D} onPick={(code) => save({ uiLang: code })} />
            </div>
            {matchGame.done ? (
              <div data-testid="match-pairs-done" className="pop" style={{ textAlign: "center", border: `2px solid ${D.gold}`, borderBottom: `5px solid ${D.goldDark}`, borderRadius: 16, padding: 18, background: D.goldBg }}>
                <h2 style={{ fontWeight: 900, margin: "8px 0 4px" }}>{uiLang === "en" ? "Round complete" : "¡Ronda terminada!"}</h2>
                <p style={{ color: D.sub, fontWeight: 800, margin: "0 0 16px" }}>
                  {uiLang === "en" ? `You matched ${n} pairs.` : `Emparejaste ${n} parejas.`}
                  {matchGame.xp ? ` · +${matchGame.xp} XP` : ""}
                </p>
                <Btn color={D.blue} dark={D.blueDark} data-testid="match-pairs-again" onClick={startMatchPairs}>{uiLang === "en" ? "Another round" : "Otra ronda"}</Btn>
                <Btn outline data-testid="match-pairs-back" onClick={goPractica} style={{ marginLeft: 10 }}>{L.practice}</Btn>
              </div>
            ) : (
              <>
                <h2 style={{ fontWeight: 900, fontSize: 22, margin: "0 0 8px" }}>{L.matchPairs}</h2>
                <p style={{ fontSize: 13, fontWeight: 800, color: D.sub, margin: "0 0 16px" }}>{L.matchInstruction}</p>
                <div data-testid="match-pairs-board" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[0, 1].map((side) => (
                    <div key={side} style={{ display: "grid", gap: 10, alignContent: "start" }}>
                      {(side === 0 ? matchGame.left : matchGame.right).map((item) => {
                        const isMatched = (matchGame.matched || []).includes(item.id);
                        const isSel = matchGame.sel && matchGame.sel.side === side && matchGame.sel.id === item.id;
                        const wrong = matchGame.lastWrong;
                        const isWrong = matchGame.miss && wrong && ((wrong.a.side === side && wrong.a.id === item.id) || (wrong.b.side === side && wrong.b.id === item.id));
                        return (
                          <button key={`${side}-${item.id}`} type="button" className="choice-card"
                            data-testid={side === 0 ? `match-tile-left-${item.id}` : `match-tile-right-${item.id}`}
                            disabled={isMatched || matchGame.done}
                            onClick={() => onMatchPracticeTap(side, item.id)}
                            style={{ padding: "13px 10px", fontSize: 15, fontWeight: 800, fontFamily: "inherit", cursor: isMatched ? "default" : "pointer", background: isMatched ? D.okBg : isWrong ? D.badBg : isSel ? "#DDF4FF" : "#fff", borderColor: isMatched ? D.green : isWrong ? D.red : isSel ? D.blue : D.line, borderBottomColor: isMatched ? D.green : isWrong ? D.red : isSel ? D.blue : D.line, color: isMatched ? D.okText : isWrong ? D.badText : isSel ? D.blueDark : D.ink, opacity: isMatched ? 0.55 : 1 }}>
                            {item.t}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* ---------- JEOPARDY SOLO ---------- */}
      {screen === "jeopardy" && jeopardy && (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "22px 14px 130px" }}>
          {burst > 0 && jeopardy.complete && <Confetti key={burst} count={48} />}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button onClick={() => { setScreen("home"); setTab("practica"); }} aria-label={uiLang === "en" ? "Close" : "Cerrar"} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: D.sub, padding: "10px 12px", margin: "-10px -12px", minWidth: 44, minHeight: 44 }}>✕</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: D.blueDark, letterSpacing: ".08em" }}>{uiLang === "en" ? "JEOPARDY SOLO" : "JEOPARDY SOLO"}</div>
              <div style={{ fontWeight: 900, fontSize: 22 }}>{uiLang === "en" ? "Reto Ándale" : "Reto Ándale"}</div>
            </div>
            <div style={{ border: `2px solid ${D.blue}`, borderBottom: `4px solid ${D.blueDark}`, borderRadius: 12, padding: "7px 11px", background: D.blueBg, fontWeight: 900, color: D.blueDark }}>{jeopardy.score}</div>
            <LangToggle uiLang={uiLang} D={D} onPick={(code) => save({ uiLang: code })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 13 }}>
            {[
              [uiLang === "en" ? "Answered" : "Respondidas", `${Object.keys(jeopardy.used || {}).length}/${jeopardyCategories.length * jeopardyValues.length}`],
              [uiLang === "en" ? "Correct" : "Correctas", jeopardy.correct || 0],
              [uiLang === "en" ? "Best" : "Mejor", prog.missions?.jeopardyBest || 0],
            ].map(([label, value]) => (
              <div key={label} style={{ border: `2px solid ${D.line}`, borderRadius: 12, padding: "7px 6px", textAlign: "center", background: D.card }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: D.sub }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: D.blueDark }}>{value}</div>
              </div>
            ))}
          </div>
          {jeopardy.active ? (
            <div className="pop" style={{ border: `2px solid ${D.blue}`, borderBottom: `5px solid ${D.blueDark}`, borderRadius: 18, padding: 16, background: D.card }}>
              {jeopardy.active.double && (
                <div className="pop" style={{ border: `2px solid ${D.gold}`, borderBottom: `5px solid ${D.goldDark}`, borderRadius: 14, background: D.goldBg, color: D.goldDark, padding: "9px 12px", marginBottom: 12, fontWeight: 900, textAlign: "center" }}>
                  {uiLang === "en" ? "DOBLE O NADA" : "DOBLE O NADA"} · {uiLang === "en" ? "This tile is worth" : "Esta casilla vale"} {jeopardy.active.stake}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <CoachPortrait id={jeopardy.active.host} mood={jeopardy.status === "wrong" ? "sad" : "happy"} size={66} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: D.blueDark, letterSpacing: ".08em" }}>{jeopardy.active.focus.title[uiLang]} · {jeopardy.active.double ? `${jeopardy.active.value} → ${jeopardy.active.stake}` : jeopardy.active.value}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.25 }}>{jeopardy.active.prompt}</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 9 }}>
                {jeopardy.active.choices.map((choice, i) => {
                  const revealed = jeopardy.status !== "idle";
                  const correct = strip(choice) === strip(jeopardy.active.answer);
                  const chosen = strip(choice) === strip(jeopardy.selected || "");
                  return (
                    <button key={`${choice}-${i}`} data-testid={`jeopardy-choice-${i}`} disabled={revealed} onClick={() => chooseJeopardy(choice)}
                      style={{ textAlign: "left", border: `2px solid ${revealed && correct ? D.green : revealed && chosen ? D.red : D.line}`, borderBottom: `4px solid ${revealed && correct ? D.greenDark : revealed && chosen ? D.redDark : D.line}`, background: revealed && correct ? D.greenBg : revealed && chosen ? D.redBg : D.card, color: revealed && correct ? D.greenDark : revealed && chosen ? D.redDark : D.ink, borderRadius: 13, padding: "12px 13px", fontFamily: "inherit", fontWeight: 850, fontSize: 15, cursor: revealed ? "default" : "pointer" }}>
                      <span style={{ display: "inline-block", fontSize: 12, fontWeight: 900, border: `2px solid ${D.blue}`, color: D.blueDark, borderRadius: 8, padding: "1px 7px", marginRight: 9 }}>{i + 1}</span>
                      {choice}
                    </button>
                  );
                })}
              </div>
              {jeopardy.status !== "idle" && (
                <div className="pop" style={{ marginTop: 13, border: `2px solid ${jeopardy.status === "correct" ? D.green : D.red}`, borderRadius: 13, padding: "10px 12px", background: jeopardy.status === "correct" ? D.greenBg : D.redBg }}>
                  <div style={{ fontWeight: 900, color: jeopardy.status === "correct" ? D.greenDark : D.redDark }}>
                    {jeopardy.status === "correct" ? `+${jeopardy.active.stake || jeopardy.active.value}` : `${jeopardy.active.double ? `-${Math.floor((jeopardy.active.stake || jeopardy.active.value) / 2)} · ` : ""}${uiLang === "en" ? "Answer" : "Respuesta"}: ${jeopardy.active.answer}`}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: D.ink, lineHeight: 1.4, marginTop: 4 }}>{jeopardy.active.explain}</div>
                  <Btn color={D.blue} dark={D.blueDark} onClick={closeJeopardyPrompt} style={{ width: "100%", marginTop: 12 }}>{L.continue}</Btn>
                </div>
              )}
            </div>
          ) : (
            <>
              {jeopardy.complete && (
                <div className="pop" style={{ textAlign: "center", border: `2px solid ${D.gold}`, borderBottom: `5px solid ${D.goldDark}`, borderRadius: 16, padding: 14, background: D.goldBg, marginBottom: 12, fontWeight: 900 }}>
                  <div style={{ fontSize: 20, color: D.goldDark }}>{uiLang === "en" ? "Board cleared!" : "¡Tablero completado!"} {jeopardy.score >= 0 ? "+" : ""}{jeopardy.score}</div>
                  <div style={{ marginTop: 6, color: D.sub, fontSize: 13 }}>XP +{jeopardy.xp || 0} · <IcGem size={14} /> +{jeopardy.gems || 0}</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${jeopardyCategories.length}, minmax(78px, 1fr))`, gap: 7, overflowX: "auto", paddingBottom: 4 }}>
                {jeopardyCategories.map((cat) => (
                  <div key={cat.id} style={{ display: "grid", gap: 7, minWidth: 78 }}>
                    <div style={{ minHeight: 54, border: `2px solid ${D.blue}`, borderRadius: 12, background: D.blueBg, color: D.blueDark, fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 6, lineHeight: 1.1 }}>
                      {cat.title[uiLang]}
                    </div>
                    {jeopardyValues.map((value) => {
                      const key = `${cat.id}-${value}`;
                      const used = !!jeopardy.used?.[key];
                      return (
                        <button key={key} data-testid={`jeopardy-tile-${key}`} disabled={used} onClick={() => openJeopardyTile(cat, value)}
                          style={{ height: 58, border: `2px solid ${used ? D.line : D.gold}`, borderBottom: `5px solid ${used ? D.line : D.goldDark}`, borderRadius: 12, background: used ? D.subtle : D.goldBg, color: used ? D.sub : D.goldDark, fontFamily: "inherit", fontWeight: 900, fontSize: 18, cursor: used ? "default" : "pointer" }}>
                          {used ? "✓" : value}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center" }}>
                <Btn color={D.blue} dark={D.blueDark} onClick={startJeopardy}>{uiLang === "en" ? "Reset board" : "Reiniciar"}</Btn>
                <Btn outline onClick={() => { setScreen("home"); setTab("practica"); }}>{L.games}</Btn>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------- STORY READER (tap-to-define) ---------- */}
      {screen === "story" && storyView && (() => {
        const story = storyView;
        const sec = SECTIONS[story.section];
        const extra = STORY_EXTRAS[story.id] || {};
        const keyWords = extra.keyWords || [];
        const foundWords = prog.storyFinds?.[story.id] || [];
        const checkpoints = extra.checkpoints || [];
        const checkState = prog.storyChecks?.[story.id] || {};
        const checkDone = Object.keys(checkState).length;
        const claimed = !!prog.stories?.[story.id];
        const answered = Object.keys(ansSel).length;
        const correct = story.questions.reduce((n, qq, i) => n + (qq.choices[ansSel[i]] === qq.answer ? 1 : 0), 0);
        return (
          <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 20px 150px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
	              <button type="button" onClick={() => { setWordSel(null); setScreen("home"); setTab("lectura"); }} aria-label={uiLang === "en" ? "Close" : "Cerrar"} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: D.sub, padding: "10px 12px", margin: "-10px -12px", minWidth: 44, minHeight: 44 }}>✕</button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>{story.title}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: sec.color }}>{story.subtitle}</div>
              </div>
              <LangToggle uiLang={uiLang} D={D} onPick={(code) => save({ uiLang: code })} />
            </div>
            <div data-testid="story-tip" style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 18px", background: D.subtle, borderRadius: 12, padding: "8px 12px", fontSize: 12.5, fontWeight: 800, color: D.sub }}>
	              <IcBook size={16} color={sec.color} /> {L.storyTip}
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                { id: "story", l: uiLang === "en" ? "Story" : "Cuento" },
                { id: "bilingual", l: uiLang === "en" ? "Bilingual" : "Bilingüe" },
                { id: "challenge", l: uiLang === "en" ? "Challenge" : "Reto" },
              ].map((m) => (
                <button key={m.id} onClick={() => { setStoryMode(m.id); setWordReveal(m.id !== "challenge"); }}
                  style={{ border: `2px solid ${storyMode === m.id ? sec.color : D.line}`, borderBottom: `4px solid ${storyMode === m.id ? sec.dark : D.line}`, background: storyMode === m.id ? "#fff" : "#F7F7F7", color: storyMode === m.id ? sec.dark : D.sub, borderRadius: 11, padding: "7px 11px", fontFamily: "inherit", fontWeight: 900, fontSize: 12, cursor: "pointer" }}>
                  {m.l}
                </button>
              ))}
            </div>
            <div style={{ border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, borderRadius: 14, padding: 10, background: D.card, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div data-testid="narration-label" style={{ fontSize: 11, fontWeight: 900, color: sec.dark, letterSpacing: ".06em" }}>{L.narrationLabel}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: D.sub }}>
                    {STORY_AUDIO[story.id] ? (uiLang === "en" ? "Story 1 uses cached paragraph audio in Normal mode." : "El cuento 1 usa audio cacheado en modo Normal.") : (uiLang === "en" ? "Sentence-chunked browser audio." : "Audio del navegador por frases.")}
                  </div>
                </div>
                <button onClick={stopNarration} style={{ border: `2px solid ${D.line}`, background: D.subtle, borderRadius: 9, padding: "5px 8px", fontFamily: "inherit", fontWeight: 900, fontSize: 11, cursor: "pointer", color: D.sub }}>
                  {uiLang === "en" ? "STOP" : "PARAR"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                {[
                  { id: "normal", l: uiLang === "en" ? "Normal" : "Normal" },
                  { id: "slow", l: uiLang === "en" ? "Slow" : "Lento" },
                  { id: "shadow", l: uiLang === "en" ? "Shadow" : "Sombra" },
                ].map((m) => (
                  <button key={m.id} onClick={() => setAudioMode(m.id)}
                    style={{ border: `2px solid ${audioMode === m.id ? D.blue : D.line}`, borderBottom: `4px solid ${audioMode === m.id ? D.blueDark : D.line}`, background: audioMode === m.id ? "#DDF4FF" : "#F7F7F7", color: audioMode === m.id ? D.blueDark : D.sub, borderRadius: 10, padding: "6px 10px", fontFamily: "inherit", fontWeight: 900, fontSize: 11.5, cursor: "pointer" }}>
                    {m.l}
                  </button>
                ))}
                {renderVoiceSelect()}
              </div>
            </div>
            <div className="pop" style={{ border: `2px solid ${sec.color}`, borderBottom: `5px solid ${sec.dark}`, borderRadius: 16, padding: 13, background: D.card, marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 9 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: sec.dark, letterSpacing: ".06em" }}>{uiLang === "en" ? "WORD HUNT" : "CACERÍA DE PALABRAS"}</div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>{foundWords.length}/{keyWords.length} {uiLang === "en" ? "key words found" : "palabras clave encontradas"}</div>
                </div>
                {extra.collectible && (
                  <div style={{ textAlign: "right", fontSize: 11.5, fontWeight: 900, color: claimed ? D.green : D.sub }}>
                    {claimed ? (uiLang === "en" ? "UNLOCKED" : "DESBLOQ.") : (uiLang === "en" ? "COLLECTIBLE" : "COLECCIONABLE")}<br />
                    <span style={{ color: D.ink }}>{extra.collectible[uiLang]}</span>
                  </div>
                )}
              </div>
              <div style={{ height: 9, borderRadius: 99, background: D.track, overflow: "hidden", marginBottom: 9 }}>
                <div style={{ height: "100%", width: `${keyWords.length ? Math.round((foundWords.length / keyWords.length) * 100) : 0}%`, background: sec.color }} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {keyWords.map((w) => (
                  <span key={w} style={{ border: `1.5px solid ${foundWords.includes(w) ? sec.color : D.line}`, background: foundWords.includes(w) ? "#F3FBEA" : "#F7F7F7", color: foundWords.includes(w) ? sec.dark : D.sub, borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 900 }}>
                    {foundWords.includes(w) ? "✓ " : ""}{w}
                  </span>
                ))}
              </div>
            </div>

            {/* chunk progress — segments per paragraph + final questions step */}
            <div style={{ display: "flex", gap: 5, alignItems: "center", margin: "2px 0 14px" }}>
              {story.paragraphs.map((_, i) => (
                <button key={i} onClick={() => { stopNarration(); setWordSel(null); setParaIdx(i); }} aria-label={uiLang === "en" ? `Paragraph ${i + 1}` : `Párrafo ${i + 1}`}
                  style={{ flex: 1, height: 9, borderRadius: 99, border: "none", cursor: "pointer", padding: 0, background: i < paraIdx ? sec.color : i === paraIdx ? sec.dark : "#E8E8E8", outline: i === paraIdx ? `2px solid ${sec.color}55` : "none" }} />
              ))}
              <button onClick={() => { stopNarration(); setWordSel(null); setParaIdx(story.paragraphs.length); }} aria-label={uiLang === "en" ? "Questions" : "Preguntas"}
                style={{ width: 26, height: 18, borderRadius: 9, border: "none", cursor: "pointer", padding: 0, fontSize: 10, fontWeight: 900, fontFamily: "inherit", background: paraIdx >= story.paragraphs.length ? sec.dark : "#E8E8E8", color: paraIdx >= story.paragraphs.length ? "#fff" : D.sub }}>?</button>
            </div>
            {paraIdx < story.paragraphs.length && (
              <div style={{ fontSize: 12, fontWeight: 900, color: D.sub, marginBottom: 8 }}>
                {uiLang === "en" ? "Paragraph" : "Párrafo"} {paraIdx + 1} / {story.paragraphs.length}
              </div>
            )}

            {paraIdx < story.paragraphs.length && [story.paragraphs[paraIdx]].map((para) => { const pi = paraIdx; return (
              <div key={pi} data-testid={pi === 0 ? "lectura-paragraph-first" : "lectura-paragraph"} className="pop" style={{ marginBottom: 18, border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, borderRadius: 16, padding: "16px 16px 14px", background: D.card }}>
                <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => playStoryParagraph(story, pi, para)} aria-label={uiLang === "en" ? "Listen to paragraph" : "Escuchar párrafo"}
                  style={{ border: "none", background: D.blueBg, borderRadius: 10, cursor: "pointer", padding: "4px 7px", flexShrink: 0, alignSelf: "flex-start", lineHeight: 0, marginTop: 3 }}>
                  <IcSpeaker size={15} color={"#1CB0F6"} />
                </button>
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.75, fontWeight: 600 }}>
                  {para.split(/(\s+)/).map((tok, ti) => {
                    if (/^\s+$/.test(tok) || !tok) return tok;
                    const def = lookupStoryWord(story, tok);
                    const clean = cleanStoryToken(tok);
                    const hitKey = keyWords.includes(def?.source) ? def.source : keyWords.includes(clean) ? clean : null;
                    const isSel = wordSel && wordSel.pi === pi && wordSel.ti === ti;
                    const known = !!def?.en;
                    return (
	                      <span key={ti} onClick={(e) => { if (hitKey) discoverStoryWord(story, hitKey); setWordReveal(storyMode !== "challenge"); setWordSel({ display: tok.replace(/[«»".,;:¡!¿?—()]/g, ""), clean, key: hitKey, ...def, sentence: para, pi, ti, x: e.clientX, y: e.clientY }); }}
                        style={{ cursor: "pointer", borderRadius: 4, padding: "0 1px", background: isSel ? "#FFE9A8" : "transparent", borderBottom: known ? `2px dotted ${sec.color}66` : "none" }}>
                        {tok}
                      </span>
                    );
                  })}
                </p>
                </div>
                {storyMode === "bilingual" && extra.en?.[pi] && (
                  <div className="pop" style={{ margin: "8px 0 0 48px", borderLeft: `4px solid ${sec.color}`, background: D.subtle, borderRadius: 10, padding: "8px 11px", color: D.sub, fontSize: 13, fontWeight: 800, lineHeight: 1.45 }}>
                    {extra.en[pi]}
                  </div>
                )}
                {checkpoints[pi] && (
                  <div style={{ margin: "10px 0 0 48px", border: `2px solid ${checkState[pi] ? (checkState[pi] === checkpoints[pi].a ? D.green : D.red) : D.line}`, borderRadius: 12, padding: "9px 11px", background: checkState[pi] ? (checkState[pi] === checkpoints[pi].a ? D.okBg : D.badBg) : "#fff" }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: checkState[pi] ? (checkState[pi] === checkpoints[pi].a ? D.okText : D.badText) : D.sub, marginBottom: 6 }}>
                      {uiLang === "en" ? "Checkpoint" : "Pausa rápida"} {pi + 1}: {checkpoints[pi].q}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {checkpoints[pi].choices.map((choice) => (
                        <button key={choice} disabled={!!checkState[pi]} onClick={() => answerStoryCheckpoint(story, pi, choice, checkpoints[pi].a)}
                          style={{ border: `1.5px solid ${checkState[pi] === choice ? (choice === checkpoints[pi].a ? D.green : D.red) : D.line}`, background: checkState[pi] === choice ? "#fff" : "#F7F7F7", borderRadius: 9, padding: "5px 8px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 900, cursor: checkState[pi] ? "default" : "pointer", color: checkState[pi] === choice && choice !== checkpoints[pi].a ? D.badText : D.ink }}>
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ); })}

            {/* chunk navigation */}
            {paraIdx < story.paragraphs.length && (
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <Btn outline disabled={paraIdx === 0} onClick={() => { stopNarration(); setWordSel(null); setParaIdx(paraIdx - 1); }} style={{ flex: 1 }}>
                  ← {uiLang === "en" ? "Back" : "Anterior"}
                </Btn>
                <Btn onClick={() => { stopNarration(); setWordSel(null); setParaIdx(paraIdx + 1); }} style={{ flex: 2 }}>
                  {paraIdx === story.paragraphs.length - 1 ? (uiLang === "en" ? "Questions →" : "Preguntas →") : (uiLang === "en" ? "Next →" : "Siguiente →")}
                </Btn>
              </div>
            )}

            {/* comprehension questions — final step */}
            {paraIdx >= story.paragraphs.length && (<>
            <Btn outline onClick={() => { setParaIdx(story.paragraphs.length - 1); }} style={{ marginBottom: 4, padding: "9px 14px", fontSize: 12.5 }}>
              ← {uiLang === "en" ? "Back to the story" : "Volver al cuento"}
            </Btn>
            <div style={{ borderTop: `2px solid ${D.line}`, marginTop: 12, paddingTop: 20 }}>
	              <h3 style={{ fontWeight: 900, fontSize: 19, margin: "0 0 4px" }}>{L.comprehension}</h3>
              <p style={{ fontSize: 13, fontWeight: 800, color: D.sub, margin: "0 0 16px" }}>
	                {L.easyQuestions} <IcBolt size={13} /> 35 XP · {checkDone}/{checkpoints.length} {uiLang === "en" ? "checkpoints" : "pausas"} {claimed && <span style={{ color: D.okText }}>— {uiLang === "en" ? "collectible unlocked" : "coleccionable desbloqueado"}</span>}
              </p>
              {story.questions.map((qq, i) => {
                const sel = ansSel[i];
                const done = sel != null;
                return (
                  <div key={i} style={{ marginBottom: 18 }}>
                    <div style={{ fontWeight: 800, fontSize: 15.5, marginBottom: 8 }}>{i + 1}. {qq.prompt}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {qq.choices.map((c, ci) => {
                        const isAns = c === qq.answer;
                        let bg = "#fff", bd = D.line, col = D.ink;
                        if (done && isAns) { bg = D.okBg; bd = D.green; col = D.okText; }
                        else if (done && sel === ci && !isAns) { bg = D.badBg; bd = D.red; col = D.badText; }
                        return (
                          <button key={ci} className="choice-card" disabled={done}
                            onClick={() => { setAnsSel({ ...ansSel, [i]: ci }); beep(isAns ? "ok" : "bad"); }}
                            style={{ textAlign: "left", padding: "11px 14px", fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", cursor: done ? "default" : "pointer", background: bg, borderColor: bd, borderBottomColor: bd, color: col }}>
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {answered === story.questions.length && (
                <div className="pop" style={{ textAlign: "center", marginTop: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 10 }}>
	                    {correct}/{story.questions.length} {uiLang === "en" ? "correct" : "correctas"} {correct === 3 ? "— ¡qué padre!" : ""}
                  </div>
                  {claimed ? (
	                    <Btn outline disabled>{L.xpClaimed}</Btn>
                  ) : (
	                    <Btn onClick={() => claimStory(story, correct)}>{L.claim} +{5 + correct * 10} XP · <IcGem size={14} /> 10</Btn>
                  )}
                </div>
              )}
            </div>
            </>)}

            {/* sticky definition card */}
            {wordSel && (() => {
              const vw = typeof window !== "undefined" ? window.innerWidth : 400;
              const vh = typeof window !== "undefined" ? window.innerHeight : 700;
              const cw = Math.min(320, vw - 16);
              const left = Math.min(Math.max((wordSel.x || vw / 2) - cw / 2, 8), vw - cw - 8);
              const below = (wordSel.y || 0) < vh * 0.45;
              const pos = below ? { top: (wordSel.y || 0) + 16 } : { bottom: vh - (wordSel.y || 0) + 14 };
              return (
              <>
              <div onClick={() => setWordSel(null)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
              <div className="pop" style={{ position: "fixed", left, width: cw, ...pos, zIndex: 30, background: D.card, border: `2px solid ${D.line}`, borderTop: `3px solid ${sec.color}`, borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,.16)", maxHeight: "46vh", overflowY: "auto" }}>
                <div style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <button onClick={() => speak(wordSel.display)} aria-label={uiLang === "en" ? "Listen to word" : "Escuchar palabra"}
                    style={{ border: "none", background: D.blueBg, borderRadius: 10, cursor: "pointer", padding: "7px 9px", flexShrink: 0, lineHeight: 0 }}>
                    <IcSpeaker size={18} color={"#1CB0F6"} />
                  </button>
	                  <div style={{ flex: 1 }}>
	                    <span style={{ fontWeight: 900, fontSize: 18 }}>{wordSel.display}</span>
	                    {wordSel.en && (storyMode !== "challenge" || wordReveal) ? (
	                      <span style={{ fontWeight: 700, fontSize: 15, color: D.sub }}> — {wordSel.en}</span>
                    ) : wordSel.en ? (
	                      <span style={{ fontWeight: 700, fontSize: 14, color: D.sub, fontStyle: "italic" }}> — {uiLang === "en" ? "guess from context first" : "adivina por contexto"}</span>
                    ) : null}
	                    {storyMode === "challenge" && wordSel.en && !wordReveal && (
	                      <button onClick={() => setWordReveal(true)} className="duo-btn"
	                        style={{ marginTop: 8, background: sec.color, border: "none", borderBottom: `4px solid ${sec.dark}`, color: "#fff", borderRadius: 11, padding: "7px 11px", fontFamily: "inherit", fontWeight: 900, fontSize: 12, cursor: "pointer" }}>
	                        {uiLang === "en" ? "Reveal meaning" : "Revelar significado"}
	                      </button>
	                    )}
	                    {wordSel.note && (storyMode !== "challenge" || wordReveal) && <div style={{ fontSize: 13, fontWeight: 700, color: D.ink, marginTop: 3, background: D.goldBg, border: `1.5px solid ${D.gold}`, borderRadius: 8, padding: "5px 9px" }}>{wordSel.note}</div>}
	                    {wordSel.key && <div style={{ marginTop: 7, display: "inline-flex", alignItems: "center", gap: 5, background: D.greenBg, border: `1.5px solid ${D.green}`, color: D.greenDark, borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 900 }}>{uiLang === "en" ? "KEY WORD FOUND" : "PALABRA CLAVE"} · {wordSel.key}</div>}
	                    {wordSel.source && wordSel.source !== wordSel.clean && (storyMode !== "challenge" || wordReveal) && (
	                      <div style={{ fontSize: 12, fontWeight: 800, color: D.sub, marginTop: 5 }}>{uiLang === "en" ? "Related form" : "Forma relacionada"}: <b>{wordSel.source}</b></div>
	                    )}
	                    {wordSel.en && (storyMode !== "challenge" || wordReveal) && (
	                      <div style={{ marginTop: 7, fontSize: 12.5, color: D.sub, fontWeight: 800, lineHeight: 1.35 }}>
	                        <b style={{ color: D.ink }}>{uiLang === "en" ? "Context" : "Contexto"}:</b> «{wordSel.sentence.length > 160 ? `${wordSel.sentence.slice(0, 160)}...` : wordSel.sentence}»
	                      </div>
	                    )}
	                    {wordSel.en && (storyMode !== "challenge" || wordReveal) && (
	                      <button onClick={() => addFlashcard(story, wordSel, wordSel.sentence)} className="duo-btn"
	                        style={{ marginTop: 8, background: prog.flashcards?.[strip(wordSel.display)] ? D.green : D.blue, border: "none", borderBottom: `4px solid ${prog.flashcards?.[strip(wordSel.display)] ? D.greenDark : D.blueDark}`, color: "#fff", borderRadius: 11, padding: "8px 12px", fontFamily: "inherit", fontWeight: 900, fontSize: 12, cursor: "pointer" }}>
		                        <IcCards size={14} color="#fff" /> {prog.flashcards?.[strip(wordSel.display)] ? L.inDeck : L.saveCard}
	                      </button>
	                    )}
	                  </div>
	                  <button onClick={() => setWordSel(null)} aria-label={L.close} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: D.sub, padding: "10px 12px", margin: "-10px -12px", lineHeight: 1, minWidth: 44, minHeight: 44 }}>✕</button>
                </div>
              </div>
              </>
              );
            })()}
          </div>
        );
      })()}

      {/* ---------- DONE ---------- */}
      {screen === "done" && session && (() => {
        const perfect = lessonStats.wrong === 0;
        const milestones = [3, 7, 14, 30, 50, 100, 365];
        const hitMilestone = milestones.includes(prog.streak);
        const quietWin = session.firstHoy || session.firstDoctora;
        const winTestId = session.firstHoy ? "hoy-win" : session.firstDoctora ? "doctora-win" : undefined;
        const continueTestId = session.firstHoy ? "hoy-win-continue" : session.firstDoctora ? "doctora-win-continue" : undefined;
        return (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 20px", textAlign: "center", position: "relative" }}>
          <Confetti count={perfect ? 160 : 70} />
          <div style={{ display: "flex", justifyContent: "center", gap: 0, alignItems: "flex-end" }}>
            {[session.host, "luna", "rafa"].filter((id, i, arr) => arr.indexOf(id) === i).slice(0, 3).map((id, i) => (
              <div key={id} className="jump" style={{ marginLeft: i ? -18 : 0, zIndex: 3 - i }}>
                <CoachPortrait id={id} mood="party" size={i ? 96 : 120} />
              </div>
            ))}
          </div>
          {screenQuip && !quietWin && <div style={{ fontWeight: 800, fontStyle: "italic", color: D.ink, margin: "2px 0 0", fontSize: 15 }}>
            <span className="nametag" style={{ marginRight: 6 }}>{coachName(session.host)}</span>«{screenQuip}»
          </div>}
          <h2 data-testid={winTestId} style={{ fontWeight: 900, fontSize: 26, margin: "12px 0 4px", color: D.gold }}>
	            {quietWin ? L.hoyWin : session.testOut != null ? L.sectionPassed : L.completed}
          </h2>
          {levelUp && (
            <div className="pop" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: D.goldBg, border: `2px solid ${D.gold}`, borderBottom: `4px solid ${D.goldDark}`, borderRadius: 14, padding: "8px 18px", margin: "4px 0 8px", fontWeight: 900, color: D.goldDark }}>
	              <IcBolt size={18} /> {L.levelUp} <span style={{ textTransform: "uppercase", letterSpacing: ".03em" }}>{levelLabel(levelUp, uiLang)}</span>
            </div>
          )}
          <p style={{ color: D.sub, fontWeight: 700 }}>
	            «{session.title}» · {lessonStats.right} {L.hits}, {lessonStats.wrong} {L.misses}{!quietWin && lessonStats.wrong === 0 ? ` · ${L.impeccable}` : ""}
	            {session.testOut != null && <span><br />{L.unlockedSection}</span>}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", margin: "24px 0", flexWrap: "wrap" }}>
            {[
              { v: <Ticker to={session.earnedXP != null ? session.earnedXP : sessionXP} />, l: "XP", c: D.gold },
	              { v: <Ticker to={session.earnedGems != null ? session.earnedGems : 0} duration={700} />, l: <span><IcGem size={13} /> {L.gems}</span>, c: D.blue },
	              { v: <span><IcFlame size={20} className="flame" /> {prog.streak}</span>, l: L.streakDays, c: "#FF9600" },
            ].map((s, i) => (
              <div key={i} className="pop" style={{ border: `2px solid ${s.c}`, borderRadius: 14, padding: "12px 20px", minWidth: 84, background: D.card }}>
                <div style={{ fontWeight: 900, fontSize: 22, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: D.sub }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
	            {dueCount > 0 && <Btn color={D.blue} dark={D.blueDark} onClick={() => startReview()}>{L.review} ({dueCount})</Btn>}
	            <Btn data-testid={continueTestId} onClick={continueFromWin}>{L.continue}</Btn>
          </div>

          {/* one-time Quick Practice discoverability tip */}
          {!prog.quickTipSeen && !quietWin && (
            <div className="pop" style={{ display: "flex", alignItems: "center", gap: 10, background: D.purpleBg, border: `2px solid ${D.purple}`, borderBottom: `4px solid ${D.purpleDark}`, borderRadius: 14, padding: "10px 14px", marginTop: 14, fontSize: 12.5, fontWeight: 800, color: D.ink, textAlign: "left", lineHeight: 1.4 }}>
              <IcBolt size={22} color={D.purple} />
              <span>{uiLang === "en"
                ? <>New: open <b>Review</b> for Smart Practice — a 5-item sprint chosen from your misses and due review.</>
                : <>Nuevo: abre <b>Práctica</b> para Práctica inteligente — 5 retos elegidos por tus errores y repasos.</>}
              </span>
            </div>
          )}

          {/* perfect-lesson banner */}
          {perfect && !quietWin && (session.perfectBonus || 0) > 0 && (
            <div className="pop" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: D.goldBg, border: `2px solid ${D.gold}`, borderBottom: `4px solid ${D.goldDark}`, borderRadius: 14, padding: "8px 18px", marginTop: 14, fontWeight: 900, color: D.goldDark, fontSize: 13 }}>
              ★ {uiLang === "en" ? "Perfect lesson — bonus +5 XP" : "Lección perfecta — +5 XP extra"}
            </div>
          )}

          {/* streak milestone badge */}
          {hitMilestone && !quietWin && (
            <div className="pop" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: D.orangeBg, border: `2px solid #FF9600`, borderBottom: `4px solid #D97F00`, borderRadius: 14, padding: "10px 20px", marginTop: 12, fontWeight: 900, color: "#A35E00", fontSize: 14 }}>
              <IcFlame size={22} className="flame" />
              {uiLang === "en" ? `${prog.streak}-day streak!` : `¡Racha de ${prog.streak} días!`}
              <span style={{ fontSize: 11, fontWeight: 800, color: "#B97500" }}>
                {prog.streak === 3 ? (uiLang === "en" ? "warming up" : "calentando") :
                 prog.streak === 7 ? (uiLang === "en" ? "one full week" : "una semana entera") :
                 prog.streak === 14 ? (uiLang === "en" ? "two-week veteran" : "veterano de dos semanas") :
                 prog.streak === 30 ? (uiLang === "en" ? "one month strong" : "un mes completo") :
                 prog.streak === 50 ? (uiLang === "en" ? "fifty days" : "cincuenta días") :
                 prog.streak === 100 ? (uiLang === "en" ? "century!" : "¡cien días!") :
                 prog.streak === 365 ? (uiLang === "en" ? "a full year" : "un año entero") : ""}
              </span>
            </div>
          )}
        </div>
      ); })()}

      {/* ---------- FIRST-SESSION DOCTORA CLOSE (come-back card only) ---------- */}
      {screen === "sessionClose" && (
        <div data-testid="session-close" style={{ maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
          <div style={{ background: D.card, border: `2px solid ${D.line}`, borderBottom: `4px solid ${D.line}`, borderRadius: 20, padding: "28px 22px 22px" }}>
            <span data-testid="streak" style={{ color: "#FF9600", display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 900, fontSize: 18 }} title={L.streakDays}><IcFlame size={22} className={prog.streak > 0 ? "flame" : ""} /> {prog.streak || 0}</span>
            <p data-testid="come-back-tomorrow" style={{ margin: "16px 0 22px", padding: 0, border: "none", background: "none", fontSize: 13.5, fontWeight: 800, color: D.sub, lineHeight: 1.35, cursor: "default", pointerEvents: "none" }}>
              {comeBackTomorrowLine({
                lang: uiLang,
                nextTitle: hoyTitleForLang(tomorrowScene, uiLang),
                fallback: L.comeBackTomorrow,
              })}
            </p>
            <Btn data-testid="session-close-dismiss" onClick={dismissSessionClose} style={{ textTransform: "none", letterSpacing: "normal" }}>{L.sessionClose}</Btn>
          </div>
        </div>
      )}

      {/* ---------- FAILED (out of hearts) ---------- */}
      {screen === "failed" && session && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "70px 20px", textAlign: "center" }}>
          <CoachPortrait id={session.host} mood="sad" size={120} />
          {screenQuip && <div style={{ fontWeight: 800, fontStyle: "italic", margin: "6px 0 0", fontSize: 15 }}>
            <span className="nametag" style={{ marginRight: 6 }}>{coachName(session.host)}</span>«{screenQuip}»
          </div>}
          {failKind === "test" ? (
            <>
	              <h2 style={{ fontWeight: 900, fontSize: 24, margin: "12px 0 4px", color: D.red }}>{L.testFailed}</h2>
              <p style={{ color: D.sub, fontWeight: 700 }}>
	                {L.testFailedDesc}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
                {session.testOut != null && (prog.hearts ?? 0) > 0 && (
                  <Btn color={SECTIONS[session.testOut].color} dark={SECTIONS[session.testOut].dark} onClick={() => startTestOut(SECTIONS[session.testOut], session.testOut)}>
	                    {L.retryTest}
                  </Btn>
                )}
	                {trackedCount > 0 && <Btn color={D.blue} dark={D.blueDark} onClick={() => startReview(true)}>{L.reviewErrors}</Btn>}
	                <Btn outline onClick={() => { setScreen("home"); setTab("camino"); }}>{L.toPath}</Btn>
              </div>
            </>
          ) : (
            <>
	              <h2 style={{ fontWeight: 900, fontSize: 24, margin: "12px 0 4px", color: D.red }}>{L.outHearts}</h2>
              <p style={{ color: D.sub, fontWeight: 700 }}>
	                {L.outHeartsDesc} <IcHeart size={15} /> +1, {uiLang === "en" ? "wait" : "espera"} ~{nextHeartMin} min.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
	                {trackedCount > 0 && <Btn color={D.blue} dark={D.blueDark} onClick={() => startReview(true)}>{L.practiceRecover} <IcHeart size={15} /></Btn>}
                <Btn color={D.red} dark={D.redDark} disabled={(prog.gems || 0) < REFILL_COST} onClick={() => { refillHearts(); setScreen("home"); setTab("camino"); }}>
	                  {L.refill} · <IcGem size={15} /> {REFILL_COST}
                </Btn>
	                <Btn outline onClick={() => { setScreen("home"); setTab("camino"); }}>{L.toPath}</Btn>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------- EL RETO DE DIEGO · intro ---------- */}
      {screen === "rivalIntro" && (() => {
        const r = prog.rival || { rank: 0, wins: 0, losses: 0, streak: 0 };
        const weakSkill = worstSkillOf(prog.weak);
        const taunt = diegoTaunt(r, weakSkill, uiLang);
        const { rounds } = rivalConfig(r.rank || 0);
        const played = (r.wins || 0) + (r.losses || 0);
        return (
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "44px 20px", textAlign: "center" }}>
            <CoachPortrait id="diego" mood="happy" size={128} />
            <div className="nametag" style={{ marginTop: 8, fontSize: 15 }}>Diego</div>
            <div style={{ fontSize: 11.5, fontWeight: 900, color: COACHES.diego.dark, letterSpacing: ".05em", textTransform: "uppercase", marginTop: 6 }}>
              {uiLang === "en" ? "Your rank" : "Tu rango"}: {rivalRankName(r.rank || 0, uiLang)}
            </div>
            {played > 0 && (
              <div style={{ fontSize: 13, fontWeight: 800, color: D.sub, marginTop: 2 }}>
                {uiLang === "en" ? "Record" : "Marca"} {r.wins || 0}–{r.losses || 0}
                {(r.streak || 0) > 1 ? ` · ${uiLang === "en" ? "streak" : "racha"} ${r.streak}` : ""}
              </div>
            )}
            <div className="pop" style={{ background: D.orangeBg, border: `2px solid ${COACHES.diego.color}`, borderBottom: `4px solid ${COACHES.diego.dark}`, borderRadius: 16, padding: "14px 16px", margin: "18px 0 14px", fontWeight: 800, fontStyle: "italic", fontSize: 15.5, lineHeight: 1.45, color: D.ink, textAlign: "left" }}>
              «{taunt}»
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: D.sub, marginBottom: 20 }}>
              {uiLang === "en"
                ? `${rounds} rounds · no hearts · he aims at your weak spots. Beat his count to win.`
                : `${rounds} rondas · sin corazones · ataca tus puntos débiles. Supéralo para ganar.`}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn color={COACHES.diego.color} dark={COACHES.diego.dark} onClick={() => startRivalDuel()}>
                {uiLang === "en" ? "Accept the challenge" : "Aceptar el reto"}
              </Btn>
              <Btn outline onClick={() => { setScreen("home"); setTab("misiones"); }}>
                {uiLang === "en" ? "Not now" : "Ahora no"}
              </Btn>
            </div>
          </div>
        );
      })()}

      {/* ---------- EL RETO DE DIEGO · result ---------- */}
      {screen === "rivalDone" && rivalOutcome && (() => {
        const o = rivalOutcome;
        return (
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "44px 20px", textAlign: "center" }}>
            {o.won && burst > 0 && <Confetti key={burst} count={60} />}
            <CoachPortrait id="diego" mood={o.won ? "sad" : "party"} size={120} />
            <h2 style={{ fontWeight: 900, fontSize: 25, margin: "10px 0 2px", color: o.won ? COACHES.diego.dark : D.red }}>
              {o.won ? (uiLang === "en" ? "You beat Diego" : "Le ganaste a Diego") : (uiLang === "en" ? "Diego takes it" : "Diego se la lleva")}
            </h2>
            <div style={{ fontWeight: 900, fontSize: 30, color: D.ink, margin: "6px 0 8px" }}>
              {uiLang === "en" ? "You" : "Tú"} {o.you} · {o.diego} Diego
            </div>
            <div className="pop" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: D.orangeBg, border: `2px solid ${COACHES.diego.color}`, borderBottom: `4px solid ${COACHES.diego.dark}`, borderRadius: 14, padding: "8px 16px", margin: "2px 0", fontWeight: 900, color: COACHES.diego.dark }}>
              <span style={{ fontSize: 15 }}>{o.delta > 0 ? "▲" : o.delta < 0 ? "▼" : "•"}</span> {o.rankName}
              {o.delta !== 0 && (
                <span style={{ fontSize: 11, fontWeight: 800, color: D.sub, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {o.delta > 0 ? (uiLang === "en" ? "rank up" : "subes") : (uiLang === "en" ? "rank down" : "bajas")}
                </span>
              )}
            </div>
            <p style={{ fontWeight: 800, fontStyle: "italic", fontSize: 15, color: D.ink, margin: "14px 0 6px", lineHeight: 1.45 }}>
              <span className="nametag" style={{ marginRight: 6 }}>Diego</span>«{o.reaction}»
            </p>
            <div style={{ fontSize: 13, fontWeight: 800, color: D.sub, marginBottom: 20 }}>
              {uiLang === "en" ? "Record" : "Marca"}: {o.record}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn color={COACHES.diego.color} dark={COACHES.diego.dark} onClick={() => startRivalDuel()}>
                {uiLang === "en" ? "Rematch" : "Revancha"}
              </Btn>
              <Btn outline onClick={() => { setScreen("home"); setTab("misiones"); }}>
                {uiLang === "en" ? "Done" : "Listo"}
              </Btn>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
