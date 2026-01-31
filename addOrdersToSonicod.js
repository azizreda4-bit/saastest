function addOrdersToSonicodFromSheet() {

  const API_KEY_SONICOD = 'fskobfjwxfthyjdfiklg'; 
  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const API_URL = "https://api.sonicod.ma/add/order";

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    
    const customerName = row[4];   // E
    const phone        = row[5];   // F
    const city         = row[7];   // H (City name or ID)
    const address      = row[8];   // I
    const products     = row[10];  // K → "2 x REF123 + 1 x REF456"
    const price        = row[13];  // N
    const note         = row[15];  // P
    const status       = row[16];  // Q
    const carrier      = row[20];  // U
    const synced       = row[25];  // Z
    const store        = row[2];  // C (Sonicod Store name)
    const isStock      = "0";  // STOCK → 1 or 0 STANDAR
    const isChange     = "0";  // IF IS CHANGE COLIS → 1 or 0 "0"

    
    if (carrier !== "Sonicod" || status !== "Confirmé" || synced === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped`);
      continue;
    }

    
    const tracking = "SNC_" + Date.now() + "_" + i;


    const payload = {
      name: customerName,
      phone: String(phone),
      price: Number(price),
      city: city,
      address: address,
      is_stock: String(isStock || "0"),
      is_change: String(isChange || "0"),
      store: store,
      products: String(isStock) === "1" ? (products || "") : "",
      tracking: tracking,
      note: note || ""
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: API_KEY_SONICOD
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

      if (json.status === "success") {

        sheet.getRange(i + 1, 23).setValue(json.message || "Order Added"); // W
        sheet.getRange(i + 1, 24).setValue(json.newtracking);                 // X
        sheet.getRange(i + 1, 26).setValue("Synced");                      // Z

        Logger.log(`✔️ Row ${i + 1} synced successfully → ${json.tracking}`);

      } else {
        
        sheet.getRange(i + 1, 22).setValue("Failed"); // V
        sheet.getRange(i + 1, 23).setValue(json.message || body); // W
        Logger.log(`❌ Row ${i + 1} FAILED: ${body}`);
      }

    } catch (e) {
      sheet.getRange(i + 1, 22).setValue("Error");   // V
      sheet.getRange(i + 1, 23).setValue(e.message); // W
      Logger.log(`❌ Row ${i + 1} ERROR: ${e.message}`);
    }
  }

  Logger.log("🏁 All rows processed for Sonicod");
}
