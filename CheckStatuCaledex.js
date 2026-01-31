function trackColisCaledexWithAuth() {

  var SHEET_NAME = '📦Géstion des Commandes';
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  var tk = "c1bf29fa76c6c6da1028e720ba511f89"; // your token
  var sk = "05767e1fac6643778cf531e19c98660c"; // your secret key

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {

    var carrier = data[i][20]; // Column U
    if (carrier !== "Caledex") {
      Logger.log("Row " + (i + 1) + " | Skipped (Carrier: " + carrier + ")");
      continue; // skip rows not using Caledex
    }

    var code = data[i][23]; // Column X
    if (!code) {
      sheet.getRange(i + 1, 23).setValue("Missing Code");
      continue;
    }

    var url = "https://caledex.ma/track.php?tk=" + encodeURIComponent(tk) +
              "&sk=" + encodeURIComponent(sk) +
              "&code=" + encodeURIComponent(code);

    try {
      var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      var body = response.getContentText();

      // ✅ Print full response to Execution Log
      Logger.log("Row " + (i + 1) + " | Response: " + body);

      var json = JSON.parse(body);

      if (json.status !== "200") {
        sheet.getRange(i + 1, 23).setValue("Error: " + (json.message || "Unknown"));
        continue;
      }

      var lastEvent = json[0];
      var state = lastEvent.state || "";
      var ts = lastEvent.eventdate || "";

      var dateText = "";
      if (ts) {
        var dt = new Date(Number(ts) * 1000);
        dateText = Utilities.formatDate(dt, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      }

      sheet.getRange(i + 1, 23).setValue(state);      // AB

    } catch (e) {
      Logger.log("Row " + (i + 1) + " | Fetch Error: " + e.message);
      sheet.getRange(i + 1, 23).setValue("Fetch Error");
      sheet.getRange(i + 1, 30).setValue(e.message);
    }
  }

  Logger.log("🏁 Caledex tracking completed");
}
