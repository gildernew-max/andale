/** Dark answer cards for the Hoy scene listening step (the register choices).
 *  Light mode never reads this. Brand hexes, dark only. */

const norm = (hex) => String(hex || "").trim().toLowerCase();

function lin(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(fg, bg) {
  const lum = (hex) => {
    const n = norm(hex).replace("#", "");
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const L1 = lum(fg);
  const L2 = lum(bg);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

/** Hoy scene comprehension: listen to the line, then the three register cards. */
export function isHoyListenChoiceStep(session, q) {
  if (!q || q.type !== "mc") return false;
  const unitId = session?.unitId;
  const hoy = !!session?.todaySceneId || (typeof unitId === "string" && unitId.startsWith("_today"));
  if (!hoy) return false;
  if (q._u !== "_today") return false;
  const line = q.line || q.text;
  return typeof line === "string" && line.trim().length > 0;
}

export function hoyListenChoiceTone({ showState, isSel, isAns }) {
  if (showState && isAns) return "correct";
  if (showState && isSel && !isAns) return "wrong";
  if (isSel) return "selected";
  return "default";
}

/** Dark paints. `cream` is HUB_CREAM. `edge` is set only when brand overrides the existing width. */
export function hoyListenChoicePaint(tone, _D, cream) {
  if (tone === "selected") {
    return { fill: "#2D3030", border: "#B8C0A0", edge: "2px", text: cream, badge: cream };
  }
  if (tone === "correct") {
    return { fill: "#677050", border: "#677050", text: cream, badge: cream };
  }
  if (tone === "wrong") {
    return { fill: "#2A2E36", border: "#2A2E36", text: "#A0A4AB", badge: "#A0A4AB" };
  }
  return { fill: "#1E2128", border: "#2A2E36", text: cream, badge: "#A0A4AB" };
}
