const SONICOD_API_KEY = "fskobfjwxfthyjdfiklg";
const SONICOD_GET_STATUS_URL = "https://api.sonicod.ma/get/statu";

function trackSonicodParcelsFromSheet() {

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const carrier    = row[20]; // U
    const tracking   = row[23]; // X
    const synced     = row[25]; // Z

    // ⏩ Skip non-eligible rows
    if (carrier !== "Sonicod" || synced !== "Synced" || !tracking) {
      continue;
    }

    const payload = { tracking: tracking };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: SONICOD_API_KEY
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(SONICOD_GET_STATUS_URL, options);
      const body = response.getContentText();

      Logger.log(`📍 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        sheet.getRange(i + 1, 23).setValue("Invalid JSON"); // W
        continue;
      }

      if (
        json.status !== "success" ||
        !Array.isArray(json.data) ||
        json.data.length === 0
      ) {
        sheet.getRange(i + 1, 23).setValue(json.message || "Tracking failed");
        continue;
      }

      // ✅ LAST status = current status
      const lastStatus = json.data[json.data.length - 1];

      const deliveryStatus = lastStatus.statut_name || "";
      const updatedAt      = lastStatus.created_at || "";
      const comment        = lastStatus.status_comment || "";

      // ✅ Write result to sheet (Column W = 23)
      sheet.getRange(i + 1, 23).setValue(deliveryStatus);

      Logger.log(
        `✔️ Row ${i + 1} updated → ${deliveryStatus} | ${updatedAt}`
      );

    } catch (e) {
      sheet.getRange(i + 1, 23).setValue(e.message);
      Logger.log(`❌ Row ${i + 1} ERROR: ${e.message}`);
    }
  }

  Logger.log("🏁 Tracking completed for Sonicod");
}
