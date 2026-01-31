function addASAPColisFromStock() {
  const SECRET_KEY = "a9758aa5d3091fe7c0307b885247e79e"; // nonce
  const SHEET_NAME = "📦Géstion des Commandes";

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return Logger.log(`❌ Sheet "${SHEET_NAME}" not found!`);

  const data = sheet.getDataRange().getValues();
  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipient = row[4];     // E → Client name
    const phone = row[5];         // F → Phone
    const city = row[7];          // H → City name
    const address = row[8];       // I → Address
    const productId = row[26];    // Example: column for Product ID
    const quantity = row[27];     // Column for Quantity
    const price = row[13];        // N → Price
    const note = row[15] || "";   // P → Note
    const code2 = "ORDER_" + new Date().getTime();

    // Skip if already synced
    const synced = row[25];       // Z → Synced status
    if (synced === "Synced") continue;

    const payload = {
      nonce: SECRET_KEY,
      phase: "shipping",
      state: 1,
      id: 0,
      client: row[3],       // D → Client ID
      worker: row[6] || 0,  // G → Worker ID, fallback 0
      fullname: recipient,
      phone: phone,
      code: "",
      code2: code2,
      city: city,
      address: address,
      fromstock: 1,
      product: "," + productId,   // comma before the ID
      qty: "," + quantity,
      price: price,
      note: note,
      change: 0,
      openpackage: 0,
      express: 0,
      action: "addramassage"
    };

    const options = {
      method: "post",
      payload: payload,
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch("https://app.asapdelivery.ma/inc/ramassage.php", options);
      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      // Mark as synced in the sheet
      sheet.getRange(i + 1, 26).setValue("Synced"); // Z → Synced
      sheet.getRange(i + 1, 24).setValue(code2);    // X → Tracking code

    } catch (e) {
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
      sheet.getRange(i + 1, 22).setValue("Error"); // V → Status
    }

    Utilities.sleep(1000); // avoid API rate limit
  }

  Logger.log("🏁 All rows processed");
}
