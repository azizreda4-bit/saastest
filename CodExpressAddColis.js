function addOrdersToCodexpresseFromSheet() {
  const TOKEN = "d8764bef99083c0ddb78bc6157af1a9fc690d5693d3ce4d2b1bd6d1ae61ebbcb";
  const API_URL = "https://codexpresse.com/middleware/prd/api/v1/post/partenaireb2b/order/add.php";

  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipient = row[4];   // E
    const phone = row[5];       // F
    const cityId = row[7];      // H (Codexpresse city_id)
    const address = row[8];     // I
    const product = `${row[9] || ""}${row[10] ? " / " + row[10] : ""}`; // J + K
    const price = row[13];      // N → CRBT
    const quantity = row[14];   // O
    const note = row[15];       // P
    const statusK = row[16];    // Q
    const colisT = row[20];     // U (Delivery company)
    const syncedZ = row[25];    // Z (Synced status)

    if (colisT !== "Codexpresse" || statusK !== "Confirmé" || syncedZ === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped (colisT=${colisT}, status=${statusK}, synced=${syncedZ})`);
      continue;
    }

    const orderData = {
      order_id: "ORDER_" + new Date().getTime(),
      source_api: "autre",
      destinataire: recipient,
      telephone: phone,
      telephone2: null,
      adresse: address,
      ville_id: cityId,
      commentaire: `${product} | ${note}`,
      crbt: price,
      token: TOKEN
    };

    try {
      const response = UrlFetchApp.fetch(API_URL, {
        method: "POST",
        contentType: "application/json",
        payload: JSON.stringify(orderData),
        muteHttpExceptions: true
      });

      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        Logger.log(`⚠️ JSON parse failed for row ${i + 1}: ${err}`);
        json = null;
      }

      if (json && (json.message?.toLowerCase().includes("succès") || json.message?.toLowerCase().includes("success"))) {
        const orderId = json.order_id || ""; // ✅ Fix: read tracking number here
        sheet.getRange(i + 1, 24).setValue(orderId);  // X → Tracking number
        sheet.getRange(i + 1, 23).setValue(json.message); // W → API message
        sheet.getRange(i + 1, 26).setValue("Synced");     // Z → Mark synced
        Logger.log(`✔️ Row ${i + 1} marked as Synced, Code: ${orderId}`);
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
