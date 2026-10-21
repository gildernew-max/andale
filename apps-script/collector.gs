/**
 * Anonymous funnel collector for Ándale. Not deployed from this repo.
 *
 * doPost appends one row per event to the first tab of the bound spreadsheet.
 * Only paywall_seen and reserve_submit are kept; anything else is ignored.
 * Columns: received_at, event, date, device, trigger, day.
 * trigger and day are kept only on paywall_seen (trigger: win, lectura_win, locked_story, timed; day: day of use).
 * This script does not read IP addresses or request headers.
 *
 * Deploy steps for Dave:
 * 1. Open the Google Sheet that should hold the rows.
 * 2. Extensions > Apps Script. Paste this file. Save.
 * 3. Deploy as a Web app. Execute as: Me. Who has access: Anyone.
 * 4. Put that URL in the VITE_COLLECTOR_ENDPOINT repository variable
 *    or secret used by the Pages build. Leave it unset to send nothing.
 */
var ALLOWED_EVENTS = { paywall_seen: true, reserve_submit: true };
var ALLOWED_TRIGGERS = { win: true, lectura_win: true, locked_story: true, timed: true };
var HEADER = ["received_at", "event", "date", "device", "trigger", "day"];

function readEvent(e) {
  var eventName = "";
  var date = "";
  var device = "";
  var trigger = "";
  var day = "";
  var raw = "";
  if (e && e.postData && typeof e.postData.contents === "string") {
    raw = e.postData.contents;
  }
  if (raw.charAt(0) === "{") {
    try {
      var parsed = JSON.parse(raw);
      if (typeof parsed.event === "string" && ALLOWED_EVENTS[parsed.event] === true) eventName = parsed.event;
      if (typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) date = parsed.date;
      if (typeof parsed.device === "string") device = parsed.device.slice(0, 64);
      if (eventName === "paywall_seen") {
        if (typeof parsed.trigger === "string" && ALLOWED_TRIGGERS[parsed.trigger] === true) trigger = parsed.trigger;
        if (typeof parsed.day === "number" && parsed.day % 1 === 0 && parsed.day >= 1 && parsed.day <= 3650) day = parsed.day;
      }
    } catch (err) {
      eventName = "";
    }
  }
  return {
    event: eventName,
    date: date,
    device: device,
    trigger: trigger,
    day: day,
  };
}

function doPost(e) {
  var record = readEvent(e);
  if (!record.event) return ContentService.createTextOutput("ok");
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
  } else if (sheet.getRange(1, 5).getValue() !== "trigger") {
    // Sheets made before trigger/day: name the two new columns once.
    sheet.getRange(1, 5, 1, 2).setValues([["trigger", "day"]]);
  }
  sheet.appendRow([
    new Date().toISOString(),
    record.event,
    record.date,
    record.device,
    record.trigger,
    record.day,
  ]);
  return ContentService.createTextOutput("ok");
}
