function addASAPColisFromSheet() {
  const TOKEN = "b115404403ef3f6fca2b32a6fe773f5c";
  const SECRET_KEY = "a9758aa5d3091fe7c0307b885247e79e";
  const SHEET_NAME = "📦Géstion des Commandes";

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log(`❌ Sheet "${SHEET_NAME}" not found!`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipient = row[4];    // E → Client name
    const phone = row[5];        // F → Phone
    const cityId = row[7];       // H → City ID
    const address = row[8];      // I → Address
    const product = row[9];      // J → Product name
    const price = row[13];       // N → Price / CRBT
    const quantity = row[14];    // O → Quantity
    const note = row[15];        // P → Note
    const statusK = row[16];     // Q → Status (Confirmé)
    const colisU = row[20];      // U → Courier company
    const syncedZ = row[25];     // Z → Synced status

    // Only add ASAP parcels that are Confirmed and not yet synced
    if (colisU !== "ASAP" || statusK !== "Confirmé" || syncedZ === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped (colis=${colisU}, status=${statusK}, synced=${syncedZ})`);
      continue;
    }

    // Prepare API parameters
    const params = {
      tk: TOKEN,
      sk: SECRET_KEY,
      fullname: recipient,
      phone: phone,
      city: cityId,
      address: address,
      price: price,
      product: product,
      qty: quantity,
      note: note || "",
      code2: "ORDER_" + new Date().getTime(), // unique order code
      change: "0",
      openpackage: "1"
    };

    const queryString = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    const url = `https://api.asapdelivery.ma/addcolis.php?${queryString}`;

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

      if (json && json.message?.toLowerCase().includes("success")) {
        const trackingCode = json.code || params.code2; // Use returned code or fallback to code2
        sheet.getRange(i + 1, 24).setValue(trackingCode); // X → Tracking code
        sheet.getRange(i + 1, 23).setValue(json.message); // W → API message
        sheet.getRange(i + 1, 26).setValue("Synced");     // Z → Mark synced
        Logger.log(`✔️ Row ${i + 1} marked as Synced, Tracking Code: ${trackingCode}`);
      } else {
        sheet.getRange(i + 1, 22).setValue("Failed"); // V → Status
        sheet.getRange(i + 1, 23).setValue(body);     // W → Error message
        Logger.log(`⚠️ Row ${i + 1} Failed: ${body}`);
      }

    } catch (e) {
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
      sheet.getRange(i + 1, 22).setValue("Error");   // V → Status
      sheet.getRange(i + 1, 23).setValue(e.message); // W → Error message
    }

    Utilities.sleep(1000); // avoid API rate limit
  }

  Logger.log("🏁 All rows processed");
}
