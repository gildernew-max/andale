/**
 * Collector for Ándale. Not deployed from this repo.
 * Emails go to the `emails` tab. Funnel events go to the `events` tab.
 * Event rows never include an email address.
 *
 * Deploy steps, by hand:
 * 1. Create a Google Sheet.
 * 2. Extensions > Apps Script. Paste this file. Save.
 * 3. Deploy as web app. Execute as: Me. Who has access: Anyone.
 * 4. Copy the web app URL into VITE_COLLECTOR_ENDPOINT and rebuild.
 *    Leave that variable unset to keep addresses on the device and send nothing.
 *
 * emails row: timestamp, email, lang, source.
 * events row: timestamp, name, lang, deviceId.
 */
function sheetByName(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function readRecord(e) {
  var params = (e && e.parameter) || {};
  var record = {
    type: params.type || "",
    email: params.email || "",
    lang: params.lang || "",
    source: params.source || "",
    name: params.name || "",
    deviceId: params.deviceId || "",
    ts: params.ts || "",
  };
  if (e && e.postData && e.postData.contents) {
    var raw = String(e.postData.contents).replace(/^\uFEFF/, "");
    if (raw.charAt(0) === "{") {
      try {
        var parsed = JSON.parse(raw);
        record.type = parsed.type || record.type;
        record.email = parsed.email || record.email;
        record.lang = parsed.lang || record.lang;
        record.source = parsed.source || record.source;
        record.name = parsed.name || record.name;
        record.deviceId = parsed.deviceId || record.deviceId;
        record.ts = parsed.ts || record.ts;
      } catch (err) {
        record.type = record.type;
      }
    }
  }
  if (!record.ts) record.ts = new Date().toISOString();
  return record;
}

function doPost(e) {
  var record = readRecord(e);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (record.type === "email") {
    sheetByName(ss, "emails").appendRow([record.ts, record.email, record.lang, record.source]);
  } else if (record.type === "event") {
    sheetByName(ss, "events").appendRow([record.ts, record.name, record.lang, record.deviceId]);
  }
  return ContentService.createTextOutput("ok");
}
