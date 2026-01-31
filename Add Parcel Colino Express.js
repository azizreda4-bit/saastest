function addOrdersToColinoFromSheet() {
  const url = "https://clients.colinoexpress.com/api-parcels"; // ✅ API endpoint
  const API_TOKEN = "25a3c7-6ce5d7-1b22e7-b62a72-159927"; // 🔑 Replace with your token
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const orderNum = "";      // A (tracking if you have)
    const recipient = row[4]; // E
    const phone = row[5];     // F
    const city = row[7];      // G (must be valid city name, ex: "Agadir")
    const address = row[8];   // I
    const product = row[9];   // J
    const price = row[13];    // N
    const quantity = row[14]; // O
    const note = row[15];     // P
    const statusK = row[16];  // Q
    const colisT = row[20];   // U
    const syncedAE = row[25]; // Z or AG

    // ✅ Skip if not for Colino, not confirmed, or already synced
    if (colisT !== "Colino Express" || statusK !== "Confirmé" || syncedAE === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped (colisT=${colisT}, status=${statusK}, synced=${syncedAE})`);
      continue;
    }

    // ✅ API payload (FormData style)
    const payload = {
      token: API_TOKEN,
      action: "add",
      ville: city,
      phone: phone,
      qty: quantity,
      adresse: address,
      product: product,
      note: note,
      price: price,
      name: recipient,
      tracking: orderNum || ("AUTO-" + new Date().getTime()), // auto if blank
    };

    Logger.log(`📦 Row ${i + 1} Payload: ${JSON.stringify(payload)}`);

    const options = {
      method: "post",
      payload: payload,
      muteHttpExceptions: true,
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
        json = { status: false, msg: "Invalid JSON: " + body };
      }

      if (json.status === true) {
        sheet.getRange(i + 1, 23).setValue("Success"); // V
        sheet.getRange(i + 1, 24).setValue(json.sku || payload.tracking); // W
        sheet.getRange(i + 1, 26).setValue("Synced");  // Y
        Logger.log(`✔️ Row ${i + 1} marked as Synced`);
      } else {
        sheet.getRange(i + 1, 23).setValue("Failed");  // V
        sheet.getRange(i + 1, 24).setValue(json.msg);  // W
        Logger.log(`⚠️ Row ${i + 1} Failed: ${json.msg}`);
      }
    } catch (e) {
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
      sheet.getRange(i + 1, 23).setValue("Error");   // V
      sheet.getRange(i + 1, 24).setValue(e.message); // W
    }
  }

  Logger.log("🏁 Script finished");
}
