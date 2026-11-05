/**
 * Anonymous funnel collector for Ándale. Not deployed from this repo.
 * Appends one row per allowed event to the first tab of the bound Sheet.
 * Columns: received_at, event, date, device. Reads no IP or headers.
 * Rows older than RETENTION_DAYS are deleted daily by purgeOld.
 */
var ALLOWED_EVENTS = { app_open: true, scene1_complete: true, paywall_seen: true, reserve_submit: true };
var RETENTION_DAYS = 90;

function readEvent(e) {
  var out = { event: "", date: "", device: "" };
  var raw = (e && e.postData && typeof e.postData.contents === "string") ? e.postData.contents : "";
  if (raw.length > 512 || raw.charAt(0) !== "{") return out;
  try {
    var p = JSON.parse(raw);
    if (typeof p.event === "string" && ALLOWED_EVENTS[p.event] === true) out.event = p.event;
    if (typeof p.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) out.date = p.date;
    if (typeof p.device === "string" && /^[A-Za-z0-9-]{1,64}$/.test(p.device)) out.device = p.device;
  } catch (err) { out.event = ""; }
  return out;
}

function doPost(e) {
  var r = readEvent(e);
  if (!r.event || !r.date || !r.device) return ContentService.createTextOutput("ok");
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(["received_at", "event", "date", "device"]);
    sheet.appendRow([new Date().toISOString(), r.event, r.date, r.device]);
  } finally { lock.releaseLock(); }
  return ContentService.createTextOutput("ok");
}

function doGet() { return ContentService.createTextOutput(""); }

function purgeOld() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var last = sheet.getLastRow();
  if (last < 2) return;
  var cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  var stamps = sheet.getRange(2, 1, last - 1, 1).getValues();
  // Rows are appended in time order, so count the old ones from the top.
  var n = 0;
  while (n < stamps.length && new Date(stamps[n][0]).getTime() < cutoff) n++;
  if (n > 0) sheet.deleteRows(2, n);
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "purgeOld") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("purgeOld").timeBased().everyDays(1).atHour(3).inTimezone("America/New_York").create();
}
