/**
 * A finished Sendero path unit — not first session, Hoy, Lectura, review, or a test.
 * The lesson-end card reuses the first-session perch look.
 */
export function isSenderoLesson(session) {
  if (!session || session.firstSession) return false;
  if (session.review || session.daily || session.rival || session.missionId) return false;
  if (session.firstHoy || session.firstDoctora || session.firstStory0 || session.lecturaWin) return false;
  if (session.todaySceneId || session.testOut != null) return false;
  const id = String(session.unitId || "");
  if (!id || id.startsWith("_")) return false;
  return true;
}
