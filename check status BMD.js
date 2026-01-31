function checkBMDColisStatus() {
  const API_TOKEN = "2y10nOm96fo5g7yB1fQPgu1gour1GxeHs3x1gcVYN38G7yq4S2sL/Jgzm";  
  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const trackingCode = row[23]; // Column X → Colis code
    const syncedZ = row[25];      // Column Z

    if (!trackingCode || syncedZ !== "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped (trackingCode=${trackingCode}, synced=${syncedZ})`);
      continue;
    }

    const url = `https://bmdelivery.ma/api/client/colis/track/${trackingCode}`;
    const options = {
      method: "get",
      headers: {
        Accept: "application/json",
        "api-Token": API_TOKEN
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        Logger.log(`⚠️ JSON parse failed for row ${i + 1}: ${err}`);
        json = null;
      }

      if (json && json.data && json.data.length > 0) {
        const latestStatus = json.data[json.data.length - 1].status;
        sheet.getRange(i + 1, 23).setValue(latestStatus); // AA → Status column
        Logger.log(`✔️ Row ${i + 1} status updated: ${latestStatus}`);
      } else {
        sheet.getRange(i + 1, 23).setValue("No data"); // AA
        Logger.log(`⚠️ Row ${i + 1} has no status data`);
      }

    } catch (e) {
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
      sheet.getRange(i + 1, 23).setValue("Error"); // AA
    }
  }

  Logger.log("🏁 All rows processed for status");
}
