function addParcelsToMaberr() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  if (!sheet) {
    Logger.log("❌ Sheet '📦Géstion des Commandes' not found!");
    return;
  }

  var data = sheet.getDataRange().getValues();
  var apiUrl = "https://maberr.ma/clients/api-parcels";
  var apiKey = "168b37-b3499c-147372-bd79fb-671202"; // 👉 Ta clé API

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var statusQ = row[16];   // Column K (index 26)
    var syncedAD = row[26];  // Column AD (index 29)
    var companyU = row[20];  // Column AB (index 27)

    // Skip if it's not for Maberr
    if (companyU !== "Maberr") {
      Logger.log(`⏭️ Row ${i + 1}: Not for Maberr, skipping.`);
      continue;
    }
    if (statusQ !== "Confirmé") {
      Logger.log(`⏭️ Row ${i + 1}: Not confirmed, skipping.`);
      continue;
    }
    if (syncedAD === "synced") {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue;
    }

    // Validate required fields (A=code, B=name, C=phone, D=ville, J=adresse, H=price)
    if (!row[1] || !row[2] || !row[3] || !row[9] || !row[7]) {
      Logger.log(`❌ Row ${i + 1}: Missing required data, skipping.`);
      continue;
    }

    var payload = {
      action: "add",
      token: apiKey,
      name: row[4],             // Nom (B)
      phone: row[5],            // Téléphone (C)
      marchandise: row[9] || "",// Product nature (E)
      marchandise_qty: row[14] || 2, // Quantité (G)
      ville: row[7],            // Ville (D)
      adresse: row[8],          // Adresse (J)
      note: row[15] || "",      // Commentaire (M)
      price: row[13].toString()  // Montant (H)
    };

    var options = {
      method: "post",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      payload: payload,
      muteHttpExceptions: true
    };

    try {
      var response = UrlFetchApp.fetch(apiUrl, options);
      var result = JSON.parse(response.getContentText());
      Logger.log("📦 Full API Response: " + JSON.stringify(result, null, 2));

      if (result.status == 200) {
        var trackingNumber = result.tracking;

        // ✅ Update sheet
        sheet.getRange(i + 1, 24).setValue(trackingNumber); // Col R (index 17): Tracking
        sheet.getRange(i + 1, 23).setValue(result.msg);    // Col S (index 18): Status
        sheet.getRange(i + 1, 26).setValue("Synced");      // Col AJ (index 35): Synced

        Logger.log(`✅ Row ${i + 1}: Parcel added - ${trackingNumber}`);
      } else {
        Logger.log(`❌ Row ${i + 1}: Failed - ${result.msg}`);
      }
    } catch (err) {
      Logger.log(`⚠️ Row ${i + 1}: Error - ${err.message}`);
    }
  }
}
