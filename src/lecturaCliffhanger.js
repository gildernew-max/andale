/**
 * Cliffhanger end beat for every Lectura chapter.
 * Each value is that chapter's existing final line, held on screen
 * as the to-be-continued moment. Not new story text.
 * TODO(George): story-0 — replace with the cliffhanger.
 * TODO(George): story-1 — replace with the cliffhanger.
 * TODO(George): story-2 — replace with the cliffhanger.
 * TODO(George): story-3 — replace with the cliffhanger.
 * TODO(George): story-4 — replace with the cliffhanger.
 * TODO(George): story-5 — replace with the cliffhanger.
 * TODO(George): story-6 — replace with the cliffhanger.
 * TODO(George): story-7 — replace with the cliffhanger.
 * TODO(George): story-8 — replace with the cliffhanger.
 * TODO(George): story-9 — replace with the cliffhanger.
 */
export const lecturaCliffhangers = {
  "story-0": "Ojalá que, cuando me toque a mí, alguien diga mi nombre también.",
  "story-1": "Quizás ese sea el verdadero motivo para visitar la Casa Azul: no la tragedia, sino las ganas de vivir que cabían en un cuerpo roto.",
  "story-2": "Pero hágale caso a don Arturo: no se regrese sin ver lo que hay debajo.",
  "story-3": "Cuando salgo a la arena y el público grita mi nombre, pienso en él, sentado en primera fila sin máscara, aplaudiendo al niño que aprendió a leer entre antifaces.",
  "story-4": "«El peso extra es por la bendición», le dije, y se rio tanto que casi se le cae la cuchara.",
  "story-5": "Tenía razón.",
  "story-6": "Lo único cierto es que, durante cincuenta y un años, mi abuelo cuidó esa historia como otros cuidan un anillo de bodas.",
  "story-7": "Si alguien me preguntara qué es lo más mexicano de México —no las pirámides, no el mariachi, no el mole—, yo diría: tres hombres viejos jugando dominó en silencio en una cantina centenaria, con un tequila intacto sobre la mesa, esperando a un amigo que no va a llegar.",
  "story-8": "Yo les digo, igual que mi padre me decía: «Algún día lo entenderán. Por ahora, levanten la copa y respondan: ¡Viva México!»",
  "story-9": "«El café siempre encuentra su lugar. Los hombres también.»",
};

export function lecturaCliffhangerLine(storyId) {
  const line = lecturaCliffhangers[storyId];
  return typeof line === "string" ? line : "";
}
