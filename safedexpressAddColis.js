const SAFED_SPECIAL_TOKEN = "SPECIAL TOKEN"; // ← PUT YOUR REAL SPECIAL TOKEN HERE
const SHEET_NAMES = "📦Géstion des Commandes";


function addOrdersToSafedFromSheet() {

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // ===== COLUMN MAPPING =====
    const orderId   = "SD" + Date.now();   // A  Tracking Number
    const recipient = row[4];   // E
    const phone     = row[5];   // F
    const city      = row[7];   // H (City name)
    const address   = row[8];   // I
    const product   = row[9];   // J
    const price     = row[13];  // N
    const note      = row[15];  // P
    const status    = row[16];  // Q
    const carrier   = row[20];  // U
    const synced    = row[25];  // Z

    // ===== FILTER =====
    if (carrier !== "SAFED" || status !== "Confirmé" || synced === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped`);
      continue;
    }

    // ===== BUILD SAFED PAYLOAD =====
    const payload = {
      code_suivi: String(orderId),
      destinataire: recipient,
      telephone: String(phone),
      adresse: address,
      prix: Number(price),
      ville: String(city).toUpperCase(),
      marchandise: product,
      qte: 1,
      peut_ouvrir: false,
      change: false,
      commentaire: note || ""   // ✅ COLUMN P SENT TO SAFED
    };

    const url = "https://clients.safedexpress.com/api/client/post/store-commande";
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: {
        "Special-Token": SAFED_SPECIAL_TOKEN
      },
      muteHttpExceptions: true
    };

    try {
      const res = UrlFetchApp.fetch(url, options);
      const body = res.getContentText();

      Logger.log(`📦 Row ${i + 1} API Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        sheet.getRange(i + 1, 22).setValue("Invalid JSON"); // V
        sheet.getRange(i + 1, 23).setValue(body);           // W
        continue;
      }

      if (json.type === "success") {
        // ✅ SUCCESS
        const safedTracking = json.data;
        sheet.getRange(i + 1, 23).setValue("Order created"); // W
        sheet.getRange(i + 1, 24).setValue(safedTracking);  // X (tracking)
        sheet.getRange(i + 1, 26).setValue("Synced");       // Z

        Logger.log(`✔️ SAFED created → ${safedTracking}`);

      } else {
        // ❌ FAILED
        sheet.getRange(i + 1, 22).setValue("Failed");      // V
        sheet.getRange(i + 1, 23).setValue(JSON.stringify(json)); // W

        Logger.log(`❌ SAFED FAILED → ${JSON.stringify(json)}`);
      }

    } catch (err) {
      sheet.getRange(i + 1, 22).setValue("Error");   // V
      sheet.getRange(i + 1, 23).setValue(err.message); // W

      Logger.log(`❌ Row ${i + 1} ERROR → ${err.message}`);
    }
  }

  Logger.log("🏁 SAFED processing completed");
}