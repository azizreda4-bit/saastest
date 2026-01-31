function checkASAPStatusBatch() {
  const TOKEN = "b115404403ef3f6fca2b32a6fe773f5c";
  const SECRET_KEY = "a9758aa5d3091fe7c0307b885247e79e";
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
  let lastProcessed = parseInt(PropertiesService.getScriptProperties().getProperty("LAST_ROW_ASAP") || "1");
  let rowsProcessed = 0;

  for (let i = lastProcessed; i < totalRows; i++) {
    const row = data[i];
    const courier = row[20];    // Column U → adjust if needed
    const trackingID = row[23]; // Column X → adjust if needed

    if (courier !== "ASAP") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'ASAP', skipping.`);
      continue;
    }

    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID, skipping.`);
      continue;
    }

    const url = `https://api.asapdelivery.ma/track.php?tk=${TOKEN}&sk=${SECRET_KEY}&code=${trackingID}`;
    const options = { method: "get", muteHttpExceptions: true };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();

      if (statusCode !== 200) {
        Logger.log(`❌ Row ${i + 1}: HTTP Error ${statusCode} for ${trackingID}`);
        continue;
      }

      const result = JSON.parse(response.getContentText());
      Logger.log(`📦 Row ${i + 1}: Response for ${trackingID} = ` + JSON.stringify(result));

      if (result.status === "200") {
        // Get the last event
        const events = Object.values(result).filter(e => e.state);
        if (events.length === 0) continue;

        const lastEvent = events[events.length - 1];
        const status = lastEvent.state || "Inconnu";
        const eventDate = lastEvent.eventdate
          ? new Date(parseInt(lastEvent.eventdate) * 1000).toLocaleString()
          : "N/A";

        // ✅ Update sheet: status in Column X (tracking column)
        sheet.getRange(i + 1, 23).setValue(status); // Column X = 24

        Logger.log(`✅ Row ${i + 1}: Updated "${status}" (${eventDate}).`);
      } else {
        Logger.log(`⚠️ Row ${i + 1}: Invalid response for ${trackingID}`);
      }

      rowsProcessed++;
      PropertiesService.getScriptProperties().setProperty("LAST_ROW_ASAP", i + 1);

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
  PropertiesService.getScriptProperties().deleteProperty("LAST_ROW_ASAP");
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ Mise à jour terminée pour tous les colis ASAP.", "ASAP Delivery", 3);
}