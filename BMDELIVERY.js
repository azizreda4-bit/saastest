function addColisToBMDFromSheet() {
  const API_TOKEN = "2y10nOm96fo5g7yB1fQPgu1gour1GxeHs3x1gcVYN38G7yq4S2sL/Jgzm";  

  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipient = row[4];   // E
    const phone = row[5];       // F
    const city = row[6];        // G
    const address = row[8];     // I
    const product = row[9];     // J
    const price = row[13];      // N
    const quantity = row[14];   // O
    const note = row[15];       // P
    const statusK = row[16];    // Q
    const colisT = row[20];     // U
    const syncedZ = row[25];    // Z

    if (colisT !== "BMD" || statusK !== "Confirmé" || syncedZ === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped (colisT=${colisT}, status=${statusK}, synced=${syncedZ})`);
      continue;
    }

    const payload = {
      fullname: recipient,
      phone: phone,
      city: city,
      address: address,
      price: price,
      product: product,
      qty: quantity,
      note: note || "",
      change_client: 0,
      openpackage: 0
    };

    const options = {
      method: "post",
      headers: {
        Accept: "application/json",
        "api-Token": API_TOKEN
      },
      contentType: "application/x-www-form-urlencoded",
      payload: payload,
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch("https://bmdelivery.ma/api/client/post/colis/add-colis", options);
      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        Logger.log(`⚠️ JSON parse failed for row ${i + 1}: ${err}`);
        json = null;
      }

      if (json && json.code === "ok") {
        sheet.getRange(i + 1, 24).setValue(json.code_shippment || ""); // X → Colis code
        sheet.getRange(i + 1, 23).setValue(json.message);             // W → API message
        sheet.getRange(i + 1, 26).setValue("Synced");                 // Z → Mark synced
        Logger.log(`✔️ Row ${i + 1} marked as Synced, Code: ${json.code_shippment}`);
      } else {
        sheet.getRange(i + 1, 22).setValue("Failed");  // V
        sheet.getRange(i + 1, 23).setValue(body);      // W → Error message
        Logger.log(`⚠️ Row ${i + 1} Failed: ${body}`);
      }

    } catch (e) {
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
      sheet.getRange(i + 1, 22).setValue("Error");     // V
      sheet.getRange(i + 1, 23).setValue(e.message);   // W
    }
  }

  Logger.log("🏁 All rows processed");
}
