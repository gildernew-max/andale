/**
 * Anonymous funnel collector for Ándale. Not deployed from this repo.
 *
 * doPost appends one row per event to the first tab of the bound spreadsheet.
 * Columns: received_at, event, source, day, date, device_id.
 * This script does not read IP addresses or request headers.
 *
 * Deploy steps for Dave:
 * 1. Open the Google Sheet that should hold the rows.
 * 2. Extensions > Apps Script. Paste this file. Save.
 * 3. Deploy as a Web app. Execute as: Me. Who has access: Anyone.
 * 4. Put that URL in the VITE_COLLECTOR_ENDPOINT repository variable
 *    or secret used by the Pages build. Leave it unset to send nothing.
 */
function readEvent(e) {
  var eventName = "";
  var source = "";
  var day = "";
  var date = "";
  var deviceId = "";
  var raw = "";
  if (e && e.postData && typeof e.postData.contents === "string") {
    raw = e.postData.contents;
  }
  if (raw.charAt(0) === "{") {
    try {
      var parsed = JSON.parse(raw);
      if (typeof parsed.event === "string") eventName = parsed.event;
      if (typeof parsed.source === "string") source = parsed.source;
      if (typeof parsed.day === "number" && isFinite(parsed.day)) day = parsed.day;
      else if (typeof parsed.day === "string") day = parsed.day;
      if (typeof parsed.date === "string") date = parsed.date;
      if (typeof parsed.device_id === "string") deviceId = parsed.device_id;
    } catch (err) {
      eventName = "";
    }
  }
  return {
    event: eventName,
    source: source,
    day: day,
    date: date,
    device_id: deviceId,
  };
}

function doPost(e) {
  var record = readEvent(e);
  if (!record.event) return ContentService.createTextOutput("ok");
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["received_at", "event", "source", "day", "date", "device_id"]);
  }
  sheet.appendRow([
    new Date().toISOString(),
    record.event,
    record.source,
    record.day,
    record.date,
    record.device_id,
  ]);
  return ContentService.createTextOutput("ok");
}
