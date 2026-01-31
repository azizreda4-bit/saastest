function addOrdersToExpressLivraisonFromSheet() {

  const TOKEN = 'EXPRESS_TOKEN';
  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const API_URL = "https://expresslivraison.ma/apiclient/addparcelsnew";

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const receiver   = row[4];   // E
    const phone      = row[5];   // F
    const city       = row[36];  // AK (City ID or City Name)
    const address    = row[8];   // I
    const product    = row[10];  // K
    const price      = row[13];  // N
    const note       = row[15];  // P
    const statusK    = row[16];  // Q
    const carrier    = row[20];  // U
    const synced     = row[25];  // Z

    // ⏩ Skip conditions
    if (carrier !== "Expresslivraison" || statusK !== "Confirmé" || synced === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped`);
      continue;
    }

    // ❌ Validate required fields
    if (!receiver || !phone || !city || !address || isNaN(Number(price))) {
      sheet.getRange(i + 1, 22).setValue("Failed");               // V
      sheet.getRange(i + 1, 23).setValue("Missing or invalid data"); // W
      Logger.log(`❌ Row ${i + 1} FAILED: Invalid required fields`);
      continue;
    }

    const parcelCode = "EXP_" + Date.now() + "_" + i;

    const payload = {
      parcel_code: parcelCode,
      parcel_receiver: receiver,
      parcel_phone: String(phone),
      parcel_city: city,               // ID or City Name
      parcel_price: Number(price),
      parcel_address: address,
      parcel_product_name: product || "",
      parcel_open: 1,
      parcel_note: note || ""
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: {
        Authorization: TOKEN
      },
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

      // ✅ SUCCESS
      if (json.success === true && json.parcel_code) {

        sheet.getRange(i + 1, 23).setValue(json.message || "Success"); // W
        sheet.getRange(i + 1, 24).setValue(json.parcel_code);         // X
        sheet.getRange(i + 1, 26).setValue("Synced");                 // Z

        Logger.log(`✔️ Row ${i + 1} synced successfully → ${json.parcel_code}`);

      } else {
        // ❌ FAILURE
        sheet.getRange(i + 1, 22).setValue("Failed");  // V
        sheet.getRange(i + 1, 23).setValue(json.message || body); // W
        Logger.log(`❌ Row ${i + 1} FAILED: ${body}`);
      }

    } catch (e) {
      sheet.getRange(i + 1, 22).setValue("Error");      // V
      sheet.getRange(i + 1, 23).setValue(e.message);    // W
      Logger.log(`❌ Row ${i + 1} ERROR: ${e.message}`);
    }
  }

  Logger.log("🏁 All rows processed for Expresslivraison");
}
