function addOrdersToChamelFromSheet() {
  const url = "https://app.chamelexpress.com/api/client/post/store-commande";
  const specialToken = "5eTiGri8lmAICwFMYEpkrzgoGQPs49Be1WDAdMo3IJb6RCHvNI89rgztaxTGamF1nEI03xPHdHsgWABSCygSwM7syVav0sI6m8Ngm9EwBno9pYG1F9mMJmULVYu4PUwKjBIZss3qFeaLFcXWyDRzC8"; 
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const orderNum = "";       // A
    const recipient = row[4];  // E
    const phone = row[5];      // F
    const city = row[7];       // H 
    const address = row[8];    // I
    const product = row[9];    // J
    const price = row[13];     // N
    const quantity = row[14];  // O
    const note = row[15];      // P
    const statusK = row[16];   // Q
    const colisT = row[20];    // U
    const syncedAE = row[25];  // Z 

    // Skip if not for Chamel Express, not confirmed, or already synced
    if (colisT !== "Chamel Express" || statusK !== "Confirmé" || syncedAE === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped (colisT=${colisT}, status=${statusK}, synced=${syncedAE})`);
      continue;
    }

    // 
    const codeSuivi = "CMD" + new Date().getTime();

    const payload = {
      code_suivi: codeSuivi,
      destinataire: recipient,
      telephone: phone,
      adresse: address,
      prix: price,
      ville: city,
      marchandise: product,
      qte: quantity,
      peut_ouvrir: true,
      change: false
    };

    Logger.log(`📦 Row ${i + 1} Payload: ${JSON.stringify(payload)}`);

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Special-Token": specialToken
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const body = response.getContentText();

      Logger.log(`✅ Row ${i + 1} Response Code: ${response.getResponseCode()}`);
      Logger.log(`✅ Row ${i + 1} Response Body: ${body}`);

      if (response.getResponseCode() === 200 && body.includes("success")) {
        const parsed = JSON.parse(body);
        const trackingId = parsed.data || "";

        sheet.getRange(i + 1, 23).setValue("Success");   // V
        sheet.getRange(i + 1, 24).setValue(trackingId);  // W
        sheet.getRange(i + 1, 26).setValue("Synced");    // Y/Z
        Logger.log(`✔️ Row ${i + 1} marked as Synced with ID ${trackingId}`);
      } else {
        sheet.getRange(i + 1, 22).setValue("Failed");  // V
        sheet.getRange(i + 1, 23).setValue(body);      // W
        Logger.log(`⚠️ Row ${i + 1} Failed`);
      }

    } catch (e) {
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
      sheet.getRange(i + 1, 22).setValue("Error");   // V
      sheet.getRange(i + 1, 23).setValue(e.message); // W
    }
  }

  Logger.log("🏁 Script finished");
}
