function checkRapidDeliveryStatusBatch() {
  const API_TOKEN = "1399236|NaEJHatDRZqswXsUQVVxqti5rgyO3j0Vrh7auTfK"; // Replace with your Rapid Delivery API token
  const SHEET_NAME = "📦Géstion des Commandes";
  const MAX_ROWS_PER_RUN = 50;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log(`❌ Sheet "${SHEET_NAME}" not found!`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const totalRows = data.length;

  // Remember last processed row
  let lastProcessed = parseInt(PropertiesService.getScriptProperties().getProperty("LAST_ROW_RAPID") || "1");
  let rowsProcessed = 0;

  for (let i = lastProcessed; i < totalRows; i++) {
    const row = data[i];
    const courier = row[20];    // Column U → adjust if needed
    const trackingID = row[23]; // Column X → adjust if needed

    if (courier !== "Rapid Delivery") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'RAPID', skipping.`);
      continue;
    }

    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID, skipping.`);
      continue;
    }

    const url = `https://www.rapiddelivery.ma/api/v1/parcels/${trackingID}`;
    const options = {
      method: "get",
      headers: {
        "Authorization": "Bearer " + API_TOKEN,
        "Accept": "application/json"
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      const raw = response.getContentText();
      Logger.log(`📦 Row ${i + 1}: Raw response = ` + raw);

      // Accept any 2xx status code
      if (!(statusCode >= 200 && statusCode < 300)) {
        Logger.log(`❌ Row ${i + 1}: HTTP Error ${statusCode} for ${trackingID}`);
        continue;
      }

      const dataArray = JSON.parse(raw);
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        Logger.log(`⚠️ Row ${i + 1}: No parcel data returned.`);
        continue;
      }

      const parcel = dataArray[0]; // Take the first item
      const status = parcel.state?.state_name || "Inconnu";
      const lastUpdate = parcel.state_date || "N/A";

      // ✅ Update sheet: status in Column X (tracking column)
      sheet.getRange(i + 1, 23).setValue(status); // Column X = 24

      Logger.log(`✅ Row ${i + 1}: Updated status = "${status}" (${lastUpdate})`);

      rowsProcessed++;
      PropertiesService.getScriptProperties().setProperty("LAST_ROW_RAPID", i + 1);

      Utilities.sleep(1000); // avoid API rate limit

      if (rowsProcessed >= MAX_ROWS_PER_RUN) {
        Logger.log(`⏸️ Stopping after ${MAX_ROWS_PER_RUN} rows. Continue next run.`);
        return;
      }

    } catch (error) {
      Logger.log(`⚠️ Row ${i + 1}: Error fetching status for ${trackingID}: ${error.message}`);
    }
  }

  // Reset the counter when all rows are processed
  PropertiesService.getScriptProperties().deleteProperty("LAST_ROW_RAPID");
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ Mise à jour terminée pour tous les colis RAPID.", "Rapid Delivery", 3);
}
