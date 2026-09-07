/** First-win-of-day Cenzontle bounce. Fly-in / points drop only. Soft chrome parked. */

export const WIN_BOUNCE_MS = 720;
export const WIN_BOUNCE_SRC = "mascot/cenzontle.png";

/**
 * Same first-win / ¡Eso! gate the done screen already uses (`quietWin`).
 * firstHoy is today's first Hoy (cold or day-2+ return). firstDoctora is first Phrase Doctor.
 * esoWin / todaySceneId are wider unlock stamps — do not use them here.
 */
export function shouldPlayWinBounce(session) {
  if (!session || typeof session !== "object") return false;
  return !!(session.firstHoy || session.firstDoctora);
}
