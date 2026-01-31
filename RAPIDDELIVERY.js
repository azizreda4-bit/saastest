function addColisToRapidDeliveryFromSheet() {
  const API_TOKEN = "1392945|xldYPu5hQNBMs7fV6g42uXt0XugweSAVCkqciWQr"; // 🔐 Replace with your Rapid Delivery token
  const API_BASE_URL = "https://www.rapiddelivery.ma/api/v1";
  const SHEET_NAME = "📦Géstion des Commandes";

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipient = row[4];   // E
    const phone = row[5];       // F
    const address = row[8];     // I
    const product = row[9];     // J
    const price = row[13];      // N
    const quantity = row[14];   // O
    const note = row[15];       // P
    const statusK = row[16];    // Q
    const deliveryService = row[20]; // U (service name)
    const syncedZ = row[25];    // Z (Synced status)
    const cityId = row[35];

    // 🧠 Conditions to skip
    if (deliveryService !== "Rapid Delivery" || statusK !== "Confirmé" || syncedZ === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped (service=${deliveryService}, status=${statusK}, synced=${syncedZ})`);
      continue;
    }

    // 🧾 Parcel data for Rapid Delivery
    const payload = {
      article: product,
      price: Number(price) || 0,
      phone: String(phone).trim(),
      city: cityId,              // ⚠️ Change to valid city ID (use /cities endpoint)
      shop: 5782,           // ⚠️ Change to your real shop ID
      address: address || "",
      recipient: recipient || "",
      remark: note || ""
    };

    const options = {
      method: "post",
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(`${API_BASE_URL}/parcels`, options);
      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        Logger.log(`⚠️ JSON parse failed for row ${i + 1}: ${err}`);
        json = null;
      }

      if (json && json.data && json.data.key) {
        sheet.getRange(i + 1, 24).setValue(json.data.key);     // X → Tracking number
        sheet.getRange(i + 1, 23).setValue(json.message);      // W → API message
        sheet.getRange(i + 1, 26).setValue("Synced");          // Z → Mark as Synced
        Logger.log(`✔️ Row ${i + 1} Synced, Tracking: ${json.data.key}`);
      } else {
        sheet.getRange(i + 1, 22).setValue("Failed");          // V
        sheet.getRange(i + 1, 23).setValue(body);              // W
        Logger.log(`⚠️ Row ${i + 1} Failed: ${body}`);
      }

    } catch (e) {
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
      sheet.getRange(i + 1, 22).setValue("Error");             // V
      sheet.getRange(i + 1, 23).setValue(e.message);           // W
    }
  }

  Logger.log("🏁 All rows processed");
}
