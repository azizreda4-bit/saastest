function checkForceLogStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📦Géstion des Commandes" not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const apiKey = ""; // Replace with your real API key
  const apiUrl = "https://api.forcelog.ma/customer/Parcels/GetParcel";

  let updates = []; // To store batch updates for efficiency

  for (let i = 1; i < data.length; i++) { // Skip header row
    const row = data[i];
    const statusT = row[20]; // Column T (index 19)
    const trackingID = row[23]; // Column 18 (index 17) - Tracking ID

    // ✅ Check if AB is "forcelog"
    if (statusT !== "Forcelog") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'forcelog', skipping.`);
      continue;
    }

    // ✅ Check if tracking ID exists
    if (!trackingID || trackingID.trim() === "") {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID found, skipping.`);
      continue;
    }

    // ✅ Prepare the request
    const payload = JSON.stringify({ Code: trackingID.trim() });
    const options = {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true,
      payload: payload
    };

    try {
      Logger.log(`🔍 Fetching status for ${trackingID.trim()}: ${apiUrl}`);
      const response = UrlFetchApp.fetch(apiUrl, options);
      const result = JSON.parse(response.getContentText());

      Logger.log(`📦 Full API Response for ${trackingID.trim()}: ` + JSON.stringify(result, null, 2));

      // ✅ Check if request was successful
      if (result['GET-PARCEL'] && result['GET-PARCEL'].RESULT === 'SUCCESS') {
        const status = result['GET-PARCEL'].PARCEL.STATUS || "Unknown";
        updates.push([i + 1, status]); // Store for batch update
        Logger.log(`✅ Row ${i + 1}: Updated status to "${status}".`);
      } else {
        const errorMsg = result['GET-PARCEL'] ? result['GET-PARCEL'].MESSAGE : "Unknown error";
        Logger.log(`❌ Row ${i + 1}: Failed to fetch status - ${errorMsg}.`);
      }
    } catch (error) {
      Logger.log(`⚠️ Error fetching status for ${trackingID.trim()}: ${error.message}`);
    }
  }

  // ✅ Batch update statuses
  if (updates.length > 0) {
    const statusColumn = 23; // Column 19 (index 18)
    updates.forEach(([row, status]) => sheet.getRange(row, statusColumn).setValue(status));
    Logger.log(`✅ Batch update complete. ${updates.length} rows updated.`);
  } else {
    Logger.log(`ℹ️ No updates made.`);
  }
}