function addOrdersToTawsilexFromSheet() {
  const url = "https://tawsilex.com/api/client/post/colis/add-colis";
  const API_TOKEN = "2y10/lauhOdPyYK7sZsZ4pdvvucADBBCDFLPjYPUaz7d/pXbLIf1EfP3i"; // 🔑 Replace with your Tawsilex API token
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipient = row[4]; // E
    const phone = row[5];     // F
    const city = row[7];      // G
    const address = row[8];   // I
    const product = row[9];   // J
    const price = row[13];    // N
    const note = row[15];     // P
    const change = 0;         // default 0
    const openpackage = 0;    // default 0
    const from_stock = 0;     // default 0
    

    const colisT = row[20];   // U
    const statusK = row[16];  // Q
    const syncedAE = row[25]; // Z or AG

    // Skip if not Tawsilex, not confirmed, or already synced
    if (colisT !== "Tawsilex" || statusK !== "Confirmé" || syncedAE === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped (colisT=${colisT}, status=${statusK}, synced=${syncedAE})`);
      continue;
    }

    // API payload
    const payload = {
      fullname: recipient,
      phone: phone,
      city: city,
      address: address,
      price: price,
      product: product,
      note: note,
      change: change,
      openpackage: openpackage,
      from_stock: from_stock,
      
    };

    Logger.log(`📦 Row ${i + 1} Payload: ${JSON.stringify(payload)}`);

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Accept": "application/json",
        "api-Token": API_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const body = response.getContentText();
      Logger.log(`✅ Row ${i + 1} Response Code: ${response.getResponseCode()}`);
      Logger.log(`✅ Row ${i + 1} Response Body: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        json = { code: "error", message: "Invalid JSON: " + body };
      }

      if (json.code === "ok") {
        sheet.getRange(i + 1, 23).setValue("Success");              // V
        sheet.getRange(i + 1, 24).setValue(json.code_shippment);    // W
        sheet.getRange(i + 1, 26).setValue("Synced");               // Y
        Logger.log(`✔️ Row ${i + 1} marked as Synced`);
      } else {
        sheet.getRange(i + 1, 23).setValue("Failed");  // V
        sheet.getRange(i + 1, 24).setValue(json.message); // W
        Logger.log(`⚠️ Row ${i + 1} Failed: ${json.message}`);
      }
    } catch (e) {
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
      sheet.getRange(i + 1, 23).setValue("Error");   // V
      sheet.getRange(i + 1, 24).setValue(e.message); // W
    }
  }

  Logger.log("🏁 Script finished");
}
