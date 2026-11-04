// The Apps Script collector must accept exactly the four events the app sends,
// store only event/date/device, and delete rows after 90 days.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gs = readFileSync(join(root, "apps-script", "collector.gs"), "utf8");
const assert = (c, m) => { if (!c) throw new Error(m); };
for (const ev of ["app_open", "scene1_complete", "paywall_seen", "reserve_submit"]) {
  assert(new RegExp(`${ev}: true`).test(gs), `collector.gs accepts ${ev}`);
}
const allowed = gs.match(/ALLOWED_EVENTS = \{([^}]*)\}/)[1].split(",").length;
assert(allowed === 4, "collector.gs allows exactly four events");
assert(/RETENTION_DAYS = 90;/.test(gs), "rows kept 90 days");
assert(/appendRow\(\[new Date\(\)\.toISOString\(\), r\.event, r\.date, r\.device\]\)/.test(gs), "stores only event, date, device plus arrival time");
assert(!/getHeaders|remoteAddress|userAgent/i.test(gs), "reads no IP or headers");
console.log("collectorGs.test.js: ok");
