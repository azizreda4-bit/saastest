function addOrdersToIrsaliyatFromSheet() {
  const TOKEN = "38eb6c24807b860aec816a6d0e0427f3800e8ea49665910ecce5d6dcfc75246e";
  const STORE_ID = 12529;
  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  const data = sheet.getDataRange().getValues();
  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipient = row[4];
    const phone = row[5];
    const city = row[7]; // MUST BE NUMERIC ID
    const address = row[8];
    const product = `${row[9] || ""}${row[10] ? " / " + row[10] : ""}`;
    const price = row[13];
    const quantity = row[14];
    const note = row[15];
    const statusK = row[16];
    const colisT = row[20];
    const syncedZ = row[25];

    if (colisT !== "Irsaliyat" || statusK !== "Confirmé" || syncedZ === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped`);
      continue;
    }

    // ❌ CHECK numeric city ID
    if (isNaN(Number(city))) {
      sheet.getRange(i + 1, 22).setValue("Failed");
      sheet.getRange(i + 1, 23).setValue("City ID must be numeric");
      Logger.log(`❌ Row ${i + 1} FAILED: City ID not numeric → ${city}`);
      continue;
    }

    const internal_id =
      "IRS-" +
      Utilities.formatDate(new Date(), "GMT+1", "ddMMyyyy") +
      "-" +
      Math.floor(Math.random() * 900000 + 100000);

    const packages = [{
      receiver_name: recipient,
      address: address,
      city: String(city),
      phone: String(phone),
      price: String(price),
      note: note || "",
      product: `${product} (Qty: ${quantity || 1})`,
      internal_id: internal_id
    }];

    const payload = {
      store_id: STORE_ID,
      packages: packages
    };

    const url = `https://irsaliyat.ma/v1.0/batch/${TOKEN}`;
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
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

      // 🔥 REAL SUCCESS CHECK
      const successPackages = json?.data?.successful_packages?.length || 0;

      if (successPackages > 0) {
        const pkg = json.data.successful_packages[0];
        sheet.getRange(i + 1, 23).setValue("Package added successfully"); // W
        sheet.getRange(i + 1, 24).setValue(pkg?.data?.package_id || "");  // X
        sheet.getRange(i + 1, 26).setValue("Synced");                     // Z
        Logger.log(`✔️ Row ${i + 1} synced successfully`);

      } else {
        
        sheet.getRange(i + 1, 23).setValue(json?.data?.failed_packages?.[0]?.errors?.city_id || body);
        Logger.log(`❌ Row ${i + 1} FAILED: ${body}`);
      }

    } catch (e) {
      sheet.getRange(i + 1, 22).setValue("Error");
      sheet.getRange(i + 1, 23).setValue(e.message);
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
    }
  }

  Logger.log("🏁 All rows processed for Irsaliyat");
}
