function checkTurboLivStatusBatch() {
  const TOKEN = "ead5533280724bdfb074a1dbda934df1"; // TurboLiv Token
  const SECRET_KEY = "bb753f2776f4114e55ab2283d71cf68d"; // TurboLiv Secret Key
  const SHEET_NAME = "📦Géstion des Commandes";
  const MAX_ROWS_PER_RUN = 50;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log(`❌ Sheet "${SHEET_NAME}" not found!`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const totalRows = data.length;

  // Last processed row
  let lastProcessed = parseInt(PropertiesService.getScriptProperties().getProperty("LAST_ROW_TURBOLIV") || "1");
  let rowsProcessed = 0;

  for (let i = lastProcessed; i < totalRows; i++) {
    const row = data[i];
    const courier = row[20];    // Column U → TurboLiv column
    const trackingID = row[23]; // Column X → TurboLiv code

    if (courier !== "TurboLiv") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'TurboLiv', skipping.`);
      continue;
    }

    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID, skipping.`);
      continue;
    }

    const url = `https://turboliv.ma/track.php?tk=${TOKEN}&sk=${SECRET_KEY}&code=${encodeURIComponent(trackingID)}`;
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
        // Get last event
        const events = Object.keys(result)
        .filter(k => k !== "status")
        .map(k => result[k])
        .filter(e => e.eventdate);

        // Sort by eventdate DESC (newest first)
        events.sort((a, b) => Number(b.eventdate) - Number(a.eventdate));

        if (events.length === 0) continue;

        const lastEvent = events[0]; // ✅ newest event

        const status = lastEvent.state || "Inconnu";
        const eventDate = lastEvent.eventdate
          ? new Date(parseInt(lastEvent.eventdate) * 1000).toLocaleString()
          : "N/A";

        // ✅ Update sheet: last status in Column W, last event date in Column Y
        sheet.getRange(i + 1, 23).setValue(status);     // Column W = 23
        sheet.getRange(i + 1, 25).setValue(eventDate);  // Column Y = 25

        Logger.log(`✅ Row ${i + 1}: Updated "${status}" (${eventDate}).`);
      } else {
        Logger.log(`⚠️ Row ${i + 1}: Invalid response for ${trackingID}`);
      }

      rowsProcessed++;
      PropertiesService.getScriptProperties().setProperty("LAST_ROW_TURBOLIV", i + 1);

      Utilities.sleep(1000); // avoid API rate limit

      if (rowsProcessed >= MAX_ROWS_PER_RUN) {
        Logger.log(`⏸️ Stopping after ${MAX_ROWS_PER_RUN} rows. Continue next run.`);
        return;
      }

    } catch (error) {
      Logger.log(`⚠️ Row ${i + 1}: Error fetching status for ${trackingID}: ${error.message}`);
    }
  }

  // Reset counter when all rows processed
  PropertiesService.getScriptProperties().deleteProperty("LAST_ROW_TURBOLIV");
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ Mise à jour terminée pour tous les colis TurboLiv.", "TurboLiv Tracking", 3);
}
