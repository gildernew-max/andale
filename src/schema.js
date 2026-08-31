export const CONTENT_VERSION = 2;

export const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);

// After parse: keep a real progress object. Missing contentVersion is the
// live-user migrate (stamp 2). Present-but-unreadable versions wipe to defaults.
export const acceptProgress = (parsed) => {
  if (!isPlainObject(parsed)) return null;
  if (parsed.contentVersion == null) return { ...parsed, contentVersion: CONTENT_VERSION };
  if (parsed.contentVersion !== CONTENT_VERSION) return null;
  return parsed;
};

// LIVE restore: object required; lesson needs session.questions[].
export const acceptLive = (parsed) => {
  if (!isPlainObject(parsed)) return null;
  if (parsed.screen === "lesson" && !Array.isArray(parsed.session?.questions)) return null;
  return parsed;
};

/** Boot screen after LIVE restore. Rejected / missing / home → stay home. */
export const screenFromLive = (parsed) => {
  const live = acceptLive(parsed);
  if (!live || live.screen === "home") return "home";
  return live.screen;
};

/** Same guard as App render: never throw on shapeless session. */
export const currentQuestion = (session, qi = 0) => session?.questions?.[qi] ?? null;
