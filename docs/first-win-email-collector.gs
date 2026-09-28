/**
 * First-win email collector for Ándale. Not deployed from this repo.
 *
 * Deploy steps, by hand:
 * 1. Create a Google Sheet.
 * 2. Extensions > Apps Script. Paste this file. Save.
 * 3. Deploy as web app. Execute as: Me. Who has access: Anyone.
 * 4. Copy the web app URL into VITE_FIRST_WIN_EMAIL_ENDPOINT and rebuild.
 *    Leave that variable unset to keep addresses on the device.
 *
 * Each POST appends one row: timestamp, email, lang, source.
 */
function doPost(e) {
  var params = (e && e.parameter) || {};
  var email = params.email || "";
  var lang = params.lang || "";
  var source = params.source || "";
  var ts = params.ts || "";
  if (!email && e && e.postData && e.postData.contents) {
    var raw = String(e.postData.contents);
    var parsed = {};
    if (raw.charAt(0) === "{") {
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        parsed = {};
      }
    } else {
      raw.split("&").forEach(function (pair) {
        var bits = pair.split("=");
        var key = decodeURIComponent((bits[0] || "").replace(/\+/g, " "));
        var value = decodeURIComponent((bits.slice(1).join("=") || "").replace(/\+/g, " "));
        parsed[key] = value;
      });
    }
    email = parsed.email || "";
    lang = parsed.lang || "";
    source = parsed.source || "";
    ts = parsed.ts || "";
  }
  if (!ts) ts = new Date().toISOString();
  SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().appendRow([ts, email, lang, source]);
  return ContentService.createTextOutput("ok");
}
