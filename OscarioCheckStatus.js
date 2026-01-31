function checkOscarioStatusBatch() {
  const TOKEN = "82dd94a2a78152f2260af8059bb73149";
  const SECRET_KEY = "bb753f2776f4114e55ab2283d71cf68d";
  const SHEET_NAME = "📦Géstion des Commandes";
  const MAX_ROWS_PER_RUN = 50;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log(`❌ Sheet "${SHEET_NAME}" not found!`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const totalRows = data.length;

  // Remember where the script stopped last time
  let lastProcessed = parseInt(PropertiesService.getScriptProperties().getProperty("LAST_ROW_OSCARIO") || "1");
  let rowsProcessed = 0;

  for (let i = lastProcessed; i < totalRows; i++) {
    const row = data[i];
    const courier = row[20]; // Column U (adjust if needed)
    const trackingID = row[23]; // Column X (adjust if needed)

    if (courier !== "Oscario") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'Oscario', skipping.`);
      continue;
    }

    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID, skipping.`);
      continue;
    }

    const url = `https://oscario.site/track.php?code=${trackingID}&tk=${TOKEN}&sk=${SECRET_KEY}`;
    const options = {
      method: "get",
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
      Logger.log(`📦 Row ${i + 1}: Response for ${trackingID} = ` + JSON.stringify(result));

      if (result.status === "succes" && result.data) {
        const info = result.data;
        const status = info.state || "Inconnu";
        const eventDate = info.eventDate
          ? new Date(info.eventDate * 1000).toLocaleString()
          : "N/A";

        // ✅ Update status 
        sheet.getRange(i + 1, 23).setValue(status); 

        Logger.log(`✅ Row ${i + 1}: Updated "${status}" (${eventDate}).`);
      } else {
        Logger.log(`⚠️ Row ${i + 1}: Invalid or empty response for ${trackingID}`);
      }

      rowsProcessed++;
      PropertiesService.getScriptProperties().setProperty("LAST_ROW_OSCARIO", i + 1);

      Utilities.sleep(1000); 

      if (rowsProcessed >= MAX_ROWS_PER_RUN) {
        Logger.log(`⏸️ Stopping after ${MAX_ROWS_PER_RUN} rows. Continue next run.`);
        return;
      }

    } catch (error) {
      Logger.log(`⚠️ Row ${i + 1}: Error fetching status for ${trackingID}: ${error.message}`);
    }
  }

  // Reset the counter when all rows are processed
  PropertiesService.getScriptProperties().deleteProperty("LAST_ROW_OSCARIO");
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ Mise à jour terminée pour tous les colis Oscario.", "Oscario", 3);
}
