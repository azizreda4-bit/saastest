function addParcelsToOnessta() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  if (!sheet) {
    Logger.log("❌ Sheet '📦Géstion des Commandes' not found!");
    return;
  }

  var data = sheet.getDataRange().getValues();
  var apiUrl = "https://api.onessta.com/api/v1/c/parcels/add";
  var token = "Bearer YrvK97O8C3uNjzp03dzjygXVHZSuPbY3dcwZ2UpT38d7e617"; // Replace with actual bearer token
  var apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4MTI1LCJlbWFpbCI6InJheXRheTk5QG1haWwucnUifQ==.KW9v37/+Uh7iMeMGGhi+eAY8GdzCbONsoB0Rtbd2WVM="; // Replace with actual API Key
  var clientId = "CB047154-E10A00DE-5E02459C-8A50F93D-EA0ADA89-488544B3"; // Replace with actual Client ID

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var statusK = row[16]; // Column K (index 10)
    var syncedAE = row[25]; // Column AE (index 30)
    var companyT = row[20]; // Column T (index 19)

    // Skip if it's not for Onessta or not confirmed
    if (companyT !== "Onessta") {
      Logger.log(`⏭️ Row ${i + 1}: Not for Onessta, skipping.`);
      continue;
    }
    if (statusK !== "Confirmé") {
      Logger.log(`⏭️ Row ${i + 1}: Not confirmed, skipping.`);
      continue;
    }
    if (syncedAE === "synced") {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue;
    }

    // Validate required fields before sending the request
    if (!row[0] || !row[1] || !row[2] || !row[4]) {
      Logger.log(`❌ Row ${i + 1}: Missing required data, skipping.`);
      continue;
    }

    var payload = {
      code: row[0].toString(),             // ORDER NUM (A)
      receiver: row[4],                     // Nom (B)
      phone: row[5],                        // Téléphone (C)
      price: row[13].toString(),             // Montant (H)
      city: {
        id: row[26],                        // City ID from Column AF (index 32)
        name: row[7]                         // Ville (D)
      },
      pickup_city: {
        id: row[26] || row[40],             // Pickup city from Column AO (index 41) or fallback to delivery city
        name: row[42] || row[7]             // Pickup city name or fallback to delivery city
      },
      address: row[8],                      // Adresse (J)
      note: row[15],                         // Commentaire (N)
      product_nature: row[9] || "",         // Product nature (E)
      can_open: row[23] === "Yes" ? 1 : 0,  // Column K (index 21) for 'Yes/No'
      replace: 0
    };

    var options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": token,
        "Accept": "application/json",
        "API-Key": apiKey,
        "Client-ID": clientId
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      var response = UrlFetchApp.fetch(apiUrl, options);
      var result = JSON.parse(response.getContentText());
      Logger.log("📦 Full API Response: " + JSON.stringify(result, null, 2));

      if (result.success && result.code === 200) {
        var trackingNumber = result.data.parcel.code;
        var status = result.data.parcel.status;

        // Update sheet with tracking number and status
        sheet.getRange(i + 1, 24).setValue(trackingNumber); // Col R (index 17): Parcel Code
        sheet.getRange(i + 1, 23).setValue(status);         // Col S (index 18): Status
        sheet.getRange(i + 1, 26).setValue("synced");      // Col AE (index 30): Synced

        Logger.log(`✅ Row ${i + 1}: Parcel added - ${trackingNumber}`);
      } else {
        Logger.log(`❌ Row ${i + 1}: Failed - ${result.message}`);
      }
    } catch (err) {
      Logger.log(`⚠️ Row ${i + 1}: Error - ${err.message}`);
    }
  }
}
