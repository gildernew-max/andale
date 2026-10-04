/* global __ANDALE_BUILD__ */

/** Short sha, or the package version when sha is empty. No lookup, no network. */
export function andaleBuildFromSha(sha, version) {
  const raw = String(sha ?? "").trim();
  if (!raw) return String(version ?? "");
  return raw.slice(0, 7);
}

export const ANDALE_BUILD = typeof __ANDALE_BUILD__ === "string" ? __ANDALE_BUILD__ : "";
