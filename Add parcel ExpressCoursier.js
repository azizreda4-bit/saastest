function addColisToExpressCoursier() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  if (!sheet) {
    Logger.log("❌ Sheet '📦Géstion des Commandes' not found!");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const token = "hb7GXzcOihma42wvknueSiEWCHQwL4xZVKKAQwd8VrtG9brmXS2pUmi8jIrdQjnfh2mlTbflWgEpGBN1qQuvWW9sG"; // Replace with your actual token
  const apiUrl = `https://expresscoursier.net/v1.0/packages/${token}`;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const statusQ = row[16]; // Column K
    const syncedAE = row[25]; // Column AE
    const targetU = row[20]; // Column T

    if (targetU !== "Express Coursier") {
      Logger.log(`⏭️ Row ${i + 1}: U is "${targetU}", skipping.`);
      continue;
    }
    if (statusQ !== "Confirmé") {
      Logger.log(`⏭️ Row ${i + 1}: Q is "${statusQ}", skipping.`);
      continue;
    }
    if (syncedAE === "synced") {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue;
    }

    const payload = {
      receiver_name: row[4],       // A: receiver name
      phone: row[5],               // B: phone
      price: row[13],               // I: price (COD)
      city: row[7],                // E: city ID or name
      product: row[9],             // H: product
      internal_id: row[0],       // U: order num
      address: row[8],            // C: address
      note: row[15] || ""           // D: comment
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(apiUrl, options);
      const json = JSON.parse(response.getContentText());

      Logger.log('📦 Full API Response: ' + JSON.stringify(json, null, 2));

      if (json && json.package_id) {
        sheet.getRange(i + 1, 23).setValue(json.package_id); // Column R
        sheet.getRange(i + 1, 26).setValue("synced");       // Column AE
        Logger.log(`✅ Row ${i + 1}: Tracking number saved → ${json.package_id}`);
      } else {
        Logger.log(`❌ Row ${i + 1}: Failed to get tracking number.`);
      }

    } catch (err) {
      Logger.log(`⚠️ Row ${i + 1}: Error occurred - ${err.message}`);
    }
  }
}
