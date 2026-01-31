function checkAmeexStatusBatch() {
  const SHEET_NAME = '📦Géstion des Commandes';
  const MAX_ROWS_PER_RUN = 50;
  const PROPERTY_KEY = 'LAST_ROW_AMEEX';

  const apiId = '12074'; // Replace with your API ID
  const apiKey = '77d3f8-675762-1237e0-86b779-20284F-1D4AaB'; // Replace with your API Key

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log(`❌ Sheet "${SHEET_NAME}" not found!`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const totalRows = data.length;

  let lastProcessed = parseInt(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEY) || '1');
  let rowsProcessed = 0;

  for (let i = lastProcessed; i < totalRows; i++) {
    const row = data[i];
    const provider = row[20]; // Column T
    const trackingCode = row[23]; // Column R

    if (provider !== "Ameex") {
      Logger.log(`⏭️ Row ${i + 1}: Not Ameex, skipping.`);
      continue;
    }

    if (!trackingCode) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking code, skipping.`);
      continue;
    }

    const url = `https://api.ameex.app/customer/Delivery/Parcels/Tracking?ParcelCode=${trackingCode}`;
    const options = {
      method: 'get',
      headers: {
        'C-Api-Id': apiId,
        'C-Api-Key': apiKey
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const code = response.getResponseCode();
      const text = response.getContentText();

      Logger.log(`📦 Row ${i + 1} Response Code: ${code}`);
      Logger.log(`📦 Row ${i + 1} Response Body: ${text}`);

      if (code === 200) {
        const json = JSON.parse(text);
        const trackingData = json?.api?.tracking;

        let status = 'No Tracking Data';
        if (trackingData && typeof trackingData === 'object') {
          const events = Object.values(trackingData);
          if (events.length > 0) {
            const latestEvent = events[events.length - 1];
            status = latestEvent?.statut_name || 'Unknown';
          }
        }

        sheet.getRange(i + 1, 23).setValue(status); // Column S
        Logger.log(`✅ Row ${i + 1}: Status = ${status}`);
      } else {
        sheet.getRange(i + 1, 23).setValue(`Error: ${code}`);
        Logger.log(`❌ Row ${i + 1}: Response code ${code}`);
      }
    } catch (e) {
      Logger.log(`❌ Row ${i + 1}: Exception - ${e.message}`);
      sheet.getRange(i + 1, 23).setValue('Error');
    }

    rowsProcessed++;
    PropertiesService.getScriptProperties().setProperty(PROPERTY_KEY, i + 1); // Save progress

    Utilities.sleep(1000); // Avoid rate limit issues

    if (rowsProcessed >= MAX_ROWS_PER_RUN) {
      Logger.log(`⏸️ Stopped after ${MAX_ROWS_PER_RUN} rows. Will resume next run.`);
      return;
    }
  }

  // All rows processed: reset the script property
  PropertiesService.getScriptProperties().deleteProperty(PROPERTY_KEY);
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ تم إكمال تحديث كل صفوف Ameex.", "Ameex Status", 5);
}