/** Add to Home Screen tip — iOS Safari only, once after first free paywall dismiss. */

export const IPHONE_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/** iPhone / iPad / iPod Safari. Skip Chrome/Firefox/Edge WebViews and Android. */
export function isIosSafari(ua) {
  const s = String(ua ?? "");
  if (!/iPhone|iPad|iPod/i.test(s)) return false;
  if (!/Safari/i.test(s) || !/Version\//i.test(s)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Firefox|Android/i.test(s)) return false;
  return true;
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
  return {
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
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
} = {}) {
  if (a2hsSeen) return false;
  if (!freeDismiss) return false;
  if (standalone) return false;
  if (!isIosSafari(userAgent)) return false;
  return true;
}
