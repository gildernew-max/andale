/** Add to Home Screen tip — iOS Safari only, once after first free paywall dismiss. */

export const IPHONE_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/** iPadOS 13+ desktop mode reports this Macintosh Safari UA (no iPad token). */
export const MAC_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

function isSafariEngine(ua) {
  const s = String(ua ?? "");
  if (!/Safari/i.test(s) || !/Version\//i.test(s)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Firefox|Android/i.test(s)) return false;
  return true;
}

/** iPadOS desktop mode: Macintosh-like UA/platform PLUS touch. Real Mac Safari has no touch. */
export function isIpadDesktopSafari({ userAgent, platform, maxTouchPoints } = {}) {
  if (!isSafariEngine(userAgent)) return false;
  const macLike = /Macintosh/i.test(String(userAgent ?? "")) || platform === "MacIntel";
  return macLike && (Number(maxTouchPoints) || 0) > 1;
}

/** iPhone / iPad / iPod Safari, or iPadOS Safari in desktop mode. Skip Chrome/Firefox/Edge/Android. */
export function isIosSafari(ua, env = {}) {
  const s = String(ua ?? env.userAgent ?? "");
  if (!isSafariEngine(s)) return false;
  if (/iPhone|iPad|iPod/i.test(s)) return true;
  return isIpadDesktopSafari({
    userAgent: s,
    platform: env.platform,
    maxTouchPoints: env.maxTouchPoints,
  });
}

/** Already on the home screen: standalone display-mode or iOS navigator.standalone. */
export function isStandaloneDisplay({ matchMedia, navigator: nav } = {}) {
  const media = matchMedia
    ?? (typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? (q) => window.matchMedia(q)
      : null);
  if (typeof media === "function") {
    try {
      if (media("(display-mode: standalone)")?.matches) return true;
    } catch { /* ignore */ }
  }
  const n = nav ?? (typeof navigator !== "undefined" ? navigator : null);
  return !!(n && n.standalone === true);
}

export function a2hsDisplayEnv() {
  const nav = typeof navigator !== "undefined" ? navigator : {};
  return {
    userAgent: nav.userAgent || "",
    platform: nav.platform || "",
    maxTouchPoints: Number(nav.maxTouchPoints) || 0,
    standalone: isStandaloneDisplay(),
  };
}

/**
 * Once after first free dismiss (`Seguir gratis` / `Continue free for now`).
 * Skip seen / standalone / non-iOS Safari. Not a second paywall.
 */
export function shouldShowA2hsSheet({
  a2hsSeen,
  freeDismiss,
  standalone,
  userAgent,
  platform,
  maxTouchPoints,
} = {}) {
  if (a2hsSeen) return false;
  if (!freeDismiss) return false;
  if (standalone) return false;
  if (!isIosSafari(userAgent, { platform, maxTouchPoints })) return false;
  return true;
}
