import { probeAudioFile, storyAudioPath, storyAudioUrl } from "./storyAudio.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

assert(storyAudioPath("story-0", 0) === "audio/story-0-p0.m4a", "story-0 p0 path");
assert(storyAudioPath("story-0", 5) === "audio/story-0-p5.m4a", "story-0 p5 path");
assert(storyAudioPath("story-0", 6) === null, "story-0 has no p6");
assert(storyAudioPath("story-1", 0) === null, "later stories have no cached file");
assert(storyAudioUrl("story-0", 0, "/andale/") === "/andale/audio/story-0-p0.m4a", "base url joins the file");
assert(storyAudioUrl("story-9", 0, "/") === null, "missing map entry has no url");

const ok = (status, type) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => (name === "content-type" ? type : null) },
});

const fetch404 = async () => ok(404, "text/html");
assert(await probeAudioFile("/audio/story-0-p0.m4a", fetch404) === false, "404 hides the player");

const fetchHtml200 = async () => ok(200, "text/html; charset=utf-8");
assert(await probeAudioFile("/audio/missing.m4a", fetchHtml200) === false, "html fallback is not audio");

const fetchAudio = async () => ok(200, "audio/mp4");
assert(await probeAudioFile("/audio/story-0-p0.m4a", fetchAudio) === true, "audio/mp4 shows the player");

let gets = 0;
const fetchHeadDenied = async (_url, opts) => {
  if (opts?.method === "GET") gets += 1;
  if (opts?.method === "HEAD") return ok(405, "");
  return ok(200, "audio/mp4");
};
assert(await probeAudioFile("/audio/story-0-p0.m4a", fetchHeadDenied) === true, "HEAD 405 falls through to GET");
assert(gets === 1, "GET runs once after HEAD is refused");

assert(await probeAudioFile("", fetchAudio) === false, "empty url is missing");
assert(await probeAudioFile("/audio/story-0-p0.m4a", null) === false, "no fetch means missing");

console.log("ok: story audio probe shows a file only when it loads");
