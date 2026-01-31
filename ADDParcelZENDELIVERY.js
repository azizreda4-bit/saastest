function addOrdersToZenDeliveryFromSheet() {
  const TOKEN = "2567|3FOhkrAXgrcMf4y5PmNRkMxPdjjWEp7g2reSu1l905c7b4af"; // Your ZenDelivery Bearer token
  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipient = row[4];               // Column E
    const phone = row[5];                   // Column F
    const city = row[7];                    // Column H (must be numeric ID)
    const neighborhood = row[9];            // Column J
    const address = row[8];                 // Column I
    const product = `${row[10] || ""}`;    // Column K
    const price = row[13];                  // Column N
    const note = row[15];                   // Column P
    const statusK = row[16];                // Column Q
    const colisT = row[20];                 // Column U
    const syncedZ = row[25];                // Column Z

    // ❌ Skip rows not matching ZenDelivery criteria
    if (colisT !== "ZenDelivery" || statusK !== "Confirmé" || syncedZ === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped`);
      continue;
    }

    // ❌ Check numeric city ID
    if (isNaN(Number(city))) {
      sheet.getRange(i + 1, 22).setValue("Failed");   // Column V
      sheet.getRange(i + 1, 23).setValue("City ID must be numeric"); // Column W
      Logger.log(`❌ Row ${i + 1} FAILED: City ID not numeric → ${city}`);
      continue;
    }

    // Build payload
    const payload = {
      recipient_name: recipient,
      phone: String(phone),
      destination_city_id: Number(city),
      destination_neighborhood_id: Number(neighborhood),
      address: address,
      product_nature: product,
      price: Number(price),
      comment: note || "",
      fragile: 0,
      from_stock: 0,
      open_parcel: 1,
      try_product: 0,
      packaging_id: null,
      creation_reason: null,
      parent_id: null
    };

    const url = "https://api.zendelivery.ma/client/parcels";
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: {
        Authorization: "Bearer " + TOKEN,
        accept: "application/json"
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        sheet.getRange(i + 1, 22).setValue("Invalid JSON");
        sheet.getRange(i + 1, 23).setValue(body);
        continue;
      }

      if (json && Array.isArray(json) && json.length > 0 && json[0].ref) {
        // ✅ Success
        sheet.getRange(i + 1, 23).setValue("Parcel added successfully"); // Column W
        sheet.getRange(i + 1, 24).setValue(json[0].ref);                // Column X
        sheet.getRange(i + 1, 26).setValue("Synced");                   // Column Z
        Logger.log(`✔️ Row ${i + 1} synced successfully: Ref ${json[0].ref}`);
      } else {
        // ❌ Failed
        sheet.getRange(i + 1, 22).setValue("Failed");  // Column V
        sheet.getRange(i + 1, 23).setValue(body);      // Column W
        Logger.log(`❌ Row ${i + 1} FAILED: ${body}`);
      }

    } catch (e) {
      sheet.getRange(i + 1, 22).setValue("Error");   // Column V
      sheet.getRange(i + 1, 23).setValue(e.message); // Column W
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
    }
  }

  Logger.log("🏁 All rows processed for ZenDelivery");
}
