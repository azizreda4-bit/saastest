function checkOzonExpressStatusBatch() {
  const CUSTOMER_ID_OZON = '56885';
  const API_KEY_OZON = '006c32-2d7338-b8d03c-b59653-96455f';
  const SHEET_NAME = '📦Géstion des Commandes';
  const MAX_ROWS_PER_RUN = 50;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log(`❌ Sheet "${SHEET_NAME}" not found!`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const totalRows = data.length;

  let lastProcessed = parseInt(PropertiesService.getScriptProperties().getProperty('LAST_ROW') || '1');
  let rowsProcessed = 0;

  for (let i = lastProcessed; i < totalRows; i++) {
    const row = data[i];
    const statusK = row[20]; // Column K (index 10)
    const trackingID = row[23]; // Column Q (index 16)

    if (statusK !== "OzonExpress") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'OzonExpress', skipping.`);
      continue;
    }

    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID, skipping.`);
      continue;
    }

    const url = `https://api.ozonexpress.ma/customers/${CUSTOMER_ID_OZON}/${API_KEY_OZON}/tracking`;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      payload: `tracking-number=${trackingID}`,
      muteHttpExceptions: false
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();

      if (statusCode !== 200) {
        Logger.log(`❌ Row ${i + 1}: HTTP Error ${statusCode} for ${trackingID}`);
        continue;
      }

      const result = JSON.parse(response.getContentText());
      Logger.log(`📦 Row ${i + 1}: Response for ${trackingID} = ` + JSON.stringify(result));

      const status = extractStatus(result);

      if (status) {
        sheet.getRange(i + 1, 23).setValue(status); // Column R
        Logger.log(`✅ Row ${i + 1}: Updated status to "${status}".`);
      } else {
        Logger.log(`❌ Row ${i + 1}: Unable to extract status.`);
      }

      rowsProcessed++;
      PropertiesService.getScriptProperties().setProperty('LAST_ROW', i + 1);

      Utilities.sleep(1000); // Avoid rate limits

      if (rowsProcessed >= MAX_ROWS_PER_RUN) {
        Logger.log(`⏸️ Stopping after ${MAX_ROWS_PER_RUN} rows. Will continue in next run.`);
        return;
      }

    } catch (error) {
      Logger.log(`⚠️ Row ${i + 1}: Error fetching status for ${trackingID}: ${error.message}`);
    }
  }

  // If we reach here, all rows are processed
  PropertiesService.getScriptProperties().deleteProperty('LAST_ROW');
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ تم إكمال تحديث كل الصفوف.", "OzonExpress", 3);
}


/**
 * Helper function to extract and translate the status.
 */
function extractStatus(apiResponse) {
  try {
    const rawStatus = apiResponse?.TRACKING?.LAST_TRACKING?.STATUT;
    if (!rawStatus) return null;

    switch (rawStatus) {
      case "Livré": return "Livré";
      case "Annulé": return "Annulé";
      case "Injoignable": return "Injoignable";
      case "Retourné": return "Retourné";
      case "Reçu": return "Reçu";
      case "Ramassé": return "Ramassé";
      case "Attente De Ramassage": return "Attente De Ramassage";
      case "Mise en distribution": return "Mise en distribution";
      case "Reporté": return "Reporté";
      case "Mise En Distribution": return "Mise En Distribution";
      default:
        Logger.log(`ℹ️ Statut inconnu: ${rawStatus}`);
        return rawStatus;
    }
  } catch (err) {
    Logger.log("❌ Error extracting status: " + err.message);
    return null;
  }
}
