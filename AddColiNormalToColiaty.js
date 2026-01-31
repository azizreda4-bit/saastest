function addOrdersToColiatyFromSheet() {
  // Retrieve Coliaty API keys from script properties
  const publicKey = '48a8b8045a804e93643172fca9d0059a50c4c130e91b0dc194735aa89b53c2bf';
  const secretKey = '43fffd2b6657938221d23860a35878b5c0f96a0dd8c10d3723a6c64e10f77fdd';

  if (!publicKey || !secretKey) {
    throw new Error('❌ Missing COLIATY_API_PUBLIC or COLIATY_API_SECRET in script properties.');
  }

  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const API_URL = "https://customer-api-v1.coliaty.com/parcel/normal";

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const customerName = row[4];   // E
    const phone        = row[5];   // F
    const city         = row[7];   // H
    const address      = row[8];   // I
    const products     = row[10];  // K (optional description)
    const price        = row[13];  // N
    const note         = row[15];  // P
    const status       = row[16];  // Q
    const carrier      = row[20];  // U
    const synced       = row[25];  // Z

    // Skip if not Coliaty, not confirmed, or already synced
    if (carrier !== "Coliaty" || status !== "Confirmé" || synced === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped`);
      continue;
    }

    // Optional: generate your own tracking code (Coliaty may override it)
    const packageCode = "CLT_" + Date.now() + "_" + i;

    const payload = {
      package_code: packageCode,
      package_reciever: String(customerName).trim(),
      package_phone: String(phone).replace(/\s+/g, ''), // Remove spaces
      package_price: Number(price),
      package_addresse: String(address).trim(),
      package_city: String(city).trim(),
      package_content: String(products || note || "Order from store").substring(0, 255),
      package_no_open: false,
      package_replacement: false,
      package_old_tracking: ""
    };

    const options = {
      method: "POST",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + publicKey + ":" + secretKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(API_URL, options);
      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        sheet.getRange(i + 1, 22).setValue("Invalid JSON"); // V
        sheet.getRange(i + 1, 23).setValue(body);           // W
        continue;
      }

      if (json.success === true) {
        const trackingCode = json.data?.package_code || packageCode;
        const parcelId = json.data?.package_id || "N/A";

        // Update success columns
        sheet.getRange(i + 1, 23).setValue("Parcel Created"); // W
        sheet.getRange(i + 1, 24).setValue(trackingCode);     // X
        sheet.getRange(i + 1, 26).setValue("Synced");         // Z

        Logger.log(`✔️ Row ${i + 1} synced → Tracking: ${trackingCode}`);
      } else {
        const errorMsg = json.message || json.error || "Unknown error";
        sheet.getRange(i + 1, 22).setValue("Failed"); // V
        sheet.getRange(i + 1, 23).setValue(errorMsg); // W
        Logger.log(`❌ Row ${i + 1} FAILED: ${errorMsg}`);
      }

    } catch (e) {
      sheet.getRange(i + 1, 22).setValue("Error");   // V
      sheet.getRange(i + 1, 23).setValue(e.message); // W
      Logger.log(`❌ Row ${i + 1} ERROR: ${e.message}`);
    }
  }

  Logger.log("🏁 All rows processed for Coliaty");
}