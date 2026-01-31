function checkTawsilexStatusBatch1() {
  const API_TOKEN = "2y10/lauhOdPyYK7sZsZ4pdvvucADBBCDFLPjYPUaz7d/pXbLIf1EfP3i"; // Replace with your Tawsilex API token
  const SHEET_NAME = '📦Géstion des Commandes';
  const MAX_ROWS_PER_RUN = 50;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log(`❌ Sheet "${SHEET_NAME}" not found!`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const totalRows = data.length;

  let lastProcessed = parseInt(PropertiesService.getScriptProperties().getProperty('LAST_ROW_TAWSILEX') || '1');
  let rowsProcessed = 0;

  for (let i = lastProcessed; i < totalRows; i++) {
    const row = data[i];
    const courier = row[20]; // column U (adjust index if needed)
    const trackingID = row[23]; // column X (adjust index if needed)

    if (courier !== "Tawsilex") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'Tawsilex', skipping.`);
      continue;
    }

    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID, skipping.`);
      continue;
    }

    const url = `https://tawsilex.com/api/client/coli/track/${trackingID}`;
    const options = {
      method: "get",
      headers: { "Accept": "application/json", "api-Token": API_TOKEN },
      muteHttpExceptions: true
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

      if (result?.data && result.data.length > 0) {
        const latest = result.data[result.data.length - 1];
        const status = latest.Etat;
        const eventDate = new Date(latest.Date_Evenement * 1000);

        // ✅ Update status (Column X) and event date (Column Y)
        sheet.getRange(i + 1, 23).setValue(status);  
          

        Logger.log(`✅ Row ${i + 1}: Updated to "${status}" (${eventDate}).`);
      } else {
        Logger.log(`❌ Row ${i + 1}: No status found for ${trackingID}`);
      }

      rowsProcessed++;
      PropertiesService.getScriptProperties().setProperty('LAST_ROW_TAWSILEX', i + 1);

      Utilities.sleep(1000);

      if (rowsProcessed >= MAX_ROWS_PER_RUN) {
        Logger.log(`⏸️ Stopping after ${MAX_ROWS_PER_RUN} rows. Will continue in next run.`);
        return;
      }

    } catch (error) {
      Logger.log(`⚠️ Row ${i + 1}: Error fetching status for ${trackingID}: ${error.message}`);
    }
  }

  PropertiesService.getScriptProperties().deleteProperty('LAST_ROW_TAWSILEX');
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ تم إكمال تحديث كل الصفوف.", "Tawsilex", 3);
}
