function addParcelsToForceLog() { 
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes"); // Update with your sheet name
  if (!sheet) {
    Logger.log("❌ Sheet '📦Géstion des Commandes' not found!");
    return;
  }

  var data = sheet.getDataRange().getValues(); // Fetch all rows
  var apiKey = "2753a252277dd824534213e16cf1b927"; // Replace with your real API key 
  var apiUrlAdd = "https://api.forcelog.ma/customer/Parcels/AddParcel";
  var apiUrlGet = "https://api.forcelog.ma/customer/Parcels/GetParcel";

  for (var i = 1; i < data.length; i++) { // Skip header row
    var row = data[i];
    var statusQ = row[16]; // Column K (index 10)
    var syncedAE = row[25]; // Column AE (index 30)
    var forcelogU = row[20]; // Column T (index 19)

    // ✅ Condition checks
    if (forcelogU !== "Forcelog") {
      Logger.log(`⏭️ Row ${i + 1}: U is "${forcelogU}", skipping.`);
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

    var payload = {
       "ORDER_NUM": row[0], 
      "RECEIVER": row[4], 
      "PHONE": row[5], 
      "CITY": row[7], 
      "ADDRESS": row[8], 
      "COMMENT": row[15] || "", 
      "PRODUCT_NATURE": row[9] || "", 
      "COD": row[13] || 0, 
      "CAN_OPEN": "1",
      
    };

    var optionsAdd = {
      "method": "post",
      "headers": {
        "X-API-Key": apiKey,
        "Content-Type": "application/json"
      },
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };

    try {
      var responseAdd = UrlFetchApp.fetch(apiUrlAdd, optionsAdd);
      var resultAdd = JSON.parse(responseAdd.getContentText());

      // Log the full response for debugging
      Logger.log('📦 Full API Response (Add Parcel): ' + JSON.stringify(resultAdd, null, 2));

      if (resultAdd["ADD-PARCEL"] && resultAdd["ADD-PARCEL"]["RESULT"] === "SUCCESS") {
        var trackingNumber = resultAdd["ADD-PARCEL"]["NEW-PARCEL"]["TRACKING_NUMBER"];
        sheet.getRange(i + 1, 24).setValue(trackingNumber); // Store tracking number
        sheet.getRange(i + 1, 26).setValue("synced"); // ✅ Mark as synced

        // Fetch parcel status
        var payloadGet = JSON.stringify({ Code: trackingNumber });
        var optionsGet = {
          "method": "post",
          "headers": {
            "X-API-Key": apiKey,
            "Content-Type": "application/json"
          },
          "muteHttpExceptions": true,
          "payload": payloadGet
        };

        var responseGet = UrlFetchApp.fetch(apiUrlGet, optionsGet);
        var resultGet = JSON.parse(responseGet.getContentText());

        Logger.log('📦 Full API Response (Get Parcel): ' + JSON.stringify(resultGet, null, 2));

        if (resultGet['GET-PARCEL'] && resultGet['GET-PARCEL']['RESULT'] === 'SUCCESS') {
          var status = resultGet['GET-PARCEL']['PARCEL']['STATUS'];
          sheet.getRange(i + 1, 23).setValue(status); // Set status in column S
          Logger.log(`✅ Row ${i + 1}: Parcel status updated to "${status}".`);
        } else {
          Logger.log(`❌ Row ${i + 1}: Error fetching parcel status - ${resultGet['GET-PARCEL']["MESSAGE"]}`);
        }
      } else {
        Logger.log(`❌ Row ${i + 1}: Error adding parcel - ${resultAdd["ADD-PARCEL"]["MESSAGE"]}`);
      }
    } catch (error) {
      Logger.log(`⚠️ Row ${i + 1}: Error adding parcel - ${error.message}`);
    }
  }
}
