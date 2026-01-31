function checkColinoStatusBatch() {
  const API_TOKEN_COLINO = '25a3c7-6ce5d7-1b22e7-b62a72-159927'; // 🔑 Replace with your Colino API token
  const SHEET_NAME = '📦Géstion des Commandes';
  const MAX_ROWS_PER_RUN = 50;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log(`❌ Sheet "${SHEET_NAME}" not found!`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const totalRows = data.length;

  let lastProcessed = parseInt(PropertiesService.getScriptProperties().getProperty('LAST_ROW_COLINO') || '1');
  let rowsProcessed = 0;

  for (let i = lastProcessed; i < totalRows; i++) {
    const row = data[i];
    const courier = row[20];   // adjust index: column U if it's courier name
    const trackingID = row[23]; // adjust index: column X if tracking number stored there

    if (courier !== "Colino Express") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'Colino Express', skipping.`);
      continue;
    }

    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID, skipping.`);
      continue;
    }

    const url = "https://clients.colinoexpress.com/api-parcels";
    const payload = {
      token: API_TOKEN_COLINO,
      action: "track",
      tracking: trackingID,
    };

    const options = {
      method: "post",
      payload: payload,
      muteHttpExceptions: true,
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();

      if (statusCode !== 200) {
        Logger.log(`❌ Row ${i + 1}: HTTP Error ${statusCode} for ${trackingID}`);
        continue;
      }

      const result = JSON.parse(response.getContentText());
      Logger.log(`📦 Row ${i + 1}: Response for ${trackingID} = ${JSON.stringify(result)}`);

      const status = extractColinoStatus(result);

      if (status) {
        sheet.getRange(i + 1, 23).setValue(status); // ✅ write to column Y (adjust if needed)
        Logger.log(`✅ Row ${i + 1}: Updated status to "${status}".`);
      } else {
        Logger.log(`❌ Row ${i + 1}: Unable to extract status.`);
      }

      rowsProcessed++;
      PropertiesService.getScriptProperties().setProperty('LAST_ROW_COLINO', i + 1);

      Utilities.sleep(1000); // avoid hitting rate limits

      if (rowsProcessed >= MAX_ROWS_PER_RUN) {
        Logger.log(`⏸️ Stopping after ${MAX_ROWS_PER_RUN} rows. Will continue in next run.`);
        return;
      }

    } catch (error) {
      Logger.log(`⚠️ Row ${i + 1}: Error fetching status for ${trackingID}: ${error.message}`);
    }
  }

  // If we reach here, all rows are processed
  PropertiesService.getScriptProperties().deleteProperty('LAST_ROW_COLINO');
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ تم إكمال تحديث كل الصفوف.", "ColinoExpress", 3);
}

/**
 * Extracts the latest status from Colino API response.
 */
function extractColinoStatus(apiResponse) {
  try {
    if (!apiResponse?.status || !Array.isArray(apiResponse.msg)) {
      return null;
    }

    // Get the latest status by time (last element usually is latest)
    const lastUpdate = apiResponse.msg[apiResponse.msg.length - 1];
    if (!lastUpdate) return null;

    return `${lastUpdate.status.trim()} (${lastUpdate.etat})`; 
    // Example: "Attente De Ramassage (Non Payé)"
  } catch (err) {
    Logger.log("❌ Error extracting status: " + err.message);
    return null;
  }
}
