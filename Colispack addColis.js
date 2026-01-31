function addOrdersToColisPackFromSheet() {
  const TOKEN = "1a7db4763ecaa9c899b013d4fc93d378";         
  const SECRET_KEY = "178573a18b833beda259c427888162f0";   

  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipient = row[4];   // E
    const phone = row[5];       // F
    const city = row[7];        // H
    const address = row[8];     // I
    const product = `${row[9] || ""}${row[10] ? " / " + row[10] : ""}`; // J + K
    const price = row[13];      // N
    const quantity = row[14];   // O
    const note = row[15];       // P
    const statusK = row[16];    // Q
    const colisT = row[20];     // U
    const syncedZ = row[25];    // Z

    if (colisT !== "ColisPack" || statusK !== "Confirmé" || syncedZ === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped (colisT=${colisT}, status=${statusK}, synced=${syncedZ})`);
      continue;
    }

    const params = {
      tk: TOKEN,
      sk: SECRET_KEY,
      code: "",
      fullname: recipient,
      phone: phone,
      city: city,
      address: address,
      price: price,
      product: product,
      qty: quantity,
      note: note,
      change: 0,
      openpackage: 1
    };

    const queryString = Object.entries(params)
      .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
      .join("&");

    const url = `https://colispack.com/addcolis.php?${queryString}`;

    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        Logger.log(`⚠️ JSON parse failed for row ${i + 1}: ${err}`);
        json = null;
      }

      if (json && json.message && /succes+fully/i.test(json.message)) {
        sheet.getRange(i + 1, 24).setValue(json.code || "");   // X → Colis code
        sheet.getRange(i + 1, 23).setValue(json.message);      // W → API message
        sheet.getRange(i + 1, 26).setValue("Synced");          // Z → Mark synced
        Logger.log(`✔️ Row ${i + 1} marked as Synced, Code: ${json.code}`);
      } else {
        sheet.getRange(i + 1, 22).setValue("Failed"); // V
        sheet.getRange(i + 1, 23).setValue(body);     // W → Error message
        Logger.log(`⚠️ Row ${i + 1} Failed: ${body}`);
      }

    } catch (e) {
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
      sheet.getRange(i + 1, 22).setValue("Error");   // V
      sheet.getRange(i + 1, 23).setValue(e.message); // W
    }
  }

  Logger.log("🏁 All rows processed");
}
