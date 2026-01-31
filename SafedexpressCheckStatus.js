function checkSafedLastStatus() {

  const SAFED_SPECIAL_TOKEN = "SPECIAL TOKEN"; // 🔑 YOUR REAL TOKEN
  const SHEET_NAME = "📦Géstion des Commandes";
  const MAX_ROWS = 50;

  // Columns (1-based)
  const COURIER_COL = 21;   // U
  const TRACKING_COL = 24;  // X
  const STATUS_COL = 23;    // Y
  const DATE_COL = 28;      // Z

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  Logger.log(`🔎 Total rows to check: ${data.length}`);

  let processed = 0;

  for (let i = 0; i < data.length && processed < MAX_ROWS; i++) {

    const rowIndex = i + 2;
    const carrier = data[i][COURIER_COL - 1];
    const codeSuivi = data[i][TRACKING_COL - 1];

    if (carrier !== "SAFED" || !codeSuivi) continue;

    const url =
      "https://clients.safedexpress.com/api/client/get/last-status" +
      "?code_suivi=" + encodeURIComponent(codeSuivi);

    const options = {
      method: "get",
      headers: {
        "Special-Token": SAFED_SPECIAL_TOKEN,
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      followRedirects: false,
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      const raw = response.getContentText();

      Logger.log(`📦 Row ${rowIndex} RAW → ${raw.substring(0, 200)}`);

      // 🚫 HTML = AUTH FAILURE
      if (raw.startsWith("<!doctype") || raw.startsWith("<html")) {
        sheet.getRange(rowIndex, STATUS_COL).setValue("❌ TOKEN INVALID / NO API ACCESS");
        continue;
      }

      if (statusCode !== 200) {
        sheet.getRange(rowIndex, STATUS_COL).setValue(`❌ HTTP ${statusCode}`);
        continue;
      }

      const json = JSON.parse(raw);

      if (json.type !== "success") {
        sheet.getRange(rowIndex, STATUS_COL).setValue("❌ Code suivi invalide");
        continue;
      }

      const last = json.data["Last Status"];
      sheet.getRange(rowIndex, STATUS_COL).setValue(last.Status);
      sheet.getRange(rowIndex, DATE_COL).setValue(last.Date);

      Logger.log(`✅ Row ${rowIndex}: ${last.Status} (${last.Date})`);

      processed++;
      Utilities.sleep(700);

    } catch (e) {
      sheet.getRange(rowIndex, STATUS_COL).setValue("⚠️ ERROR");
      Logger.log(`⚠️ Row ${rowIndex}: ${e.message}`);
    }
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "✅ SAFED status updated",
    "Tracking",
    3
  );
}
