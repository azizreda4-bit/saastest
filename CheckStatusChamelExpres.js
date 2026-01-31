function checkChamelOrderStatusFromSheet() {
  const url = "https://app.chamelexpress.com/api/client/get/last-status";
  const specialToken = "5eTiGri8lmAICwFMYEpkrzgoGQPs49Be1WDAdMo3IJb6RCHvNI89rgztaxTGamF1nEI03xPHdHsgWABSCygSwM7syVav0sI6m8Ngm9EwBno9pYG1F9mMJmULVYu4PUwKjBIZss3qFeaLFcXWyDRzC8"; 
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const trackingId = row[23]; // W 
    const colisT = row[20];     // U 
    const statusK = row[16];    // Q 

    if (colisT !== "Chamel Express" || !trackingId) {
      Logger.log(`⏩ Row ${i + 1} skipped (colisT=${colisT}, trackingId=${trackingId})`);
      continue;
    }

    const fullUrl = url + "?code_suivi=" + encodeURIComponent(trackingId);

    const options = {
      method: "get",
      headers: {
        "Special-Token": specialToken
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(fullUrl, options);
      const body = response.getContentText();

      Logger.log(`📦 Row ${i + 1} Response Code: ${response.getResponseCode()}`);
      Logger.log(`📦 Row ${i + 1} Response Body: ${body}`);

      if (response.getResponseCode() === 200) {
        const parsed = JSON.parse(body);

        if (parsed.type === "success" && parsed.data && parsed.data["Last Status"]) {
          const lastStatus = parsed.data["Last Status"].Status;
          const lastDate = parsed.data["Last Status"].Date;

          sheet.getRange(i + 1, 23).setValue(lastStatus); // AA 

          Logger.log(`✔️ Row ${i + 1} updated with status: ${lastStatus} (${lastDate})`);
        } else {
          sheet.getRange(i + 1, 23).setValue("Error");
          Logger.log(`⚠️ Row ${i + 1} Failed: ${parsed.message}`);
        }
      } else {
        sheet.getRange(i + 1, 23).setValue("Error");
      }

    } catch (e) {
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
      sheet.getRange(i + 1, 26).setValue("Error");
    }
  }

  Logger.log("🏁 Status check finished");
}
