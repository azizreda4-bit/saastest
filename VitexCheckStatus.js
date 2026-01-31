function checkVitexOrdersStatus() {

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔍 Checking Vitex order statuses...");

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const carrier  = row[20]; // U
    const synced   = row[25]; // Z
    const tracking = row[23]; // X

    // ===== FILTER =====
    if (carrier !== "Vitex" || synced !== "Synced" || !tracking) {
      continue;
    }

    const payload = {
      tracking_number: String(tracking)
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + VITEX_BEARER_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const res = UrlFetchApp.fetch(
        "https://vitex.ma/clients-api/parcelstatus",
        options
      );

      const body = res.getContentText();
      Logger.log(`📦 Row ${i + 1} → ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        sheet.getRange(i + 1, 23).setValue(body);           // W
        continue;
      }

      if (json.status !== "success") {
        sheet.getRange(i + 1, 23).setValue(JSON.stringify(json)); // W
        continue;
      }

      const d = json.data;

      // ===== WRITE STATUS =====
      sheet.getRange(i + 1, 23).setValue(
        `${d.statut_name} | ${d.updated_at || ""}`
      ); // W

      // OPTIONAL: update main order status column (Q)
      if (d.statut_code === "DELIVERED") {
        sheet.getRange(i + 1, 17).setValue("Livré"); // Q
      }

    } catch (err) {
      sheet.getRange(i + 1, 23).setValue(err.message); // W
    }
  }

  Logger.log("🏁 Vitex status check completed");
}
