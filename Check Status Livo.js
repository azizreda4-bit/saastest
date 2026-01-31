const LIVO_API_URL0 = 'https://rest.livo.ma/orders';
const LIVO_TOKEN0 = 'APhjejxgvzqirbsrsxebzphfgxgbyyacplstrqdjose53300292186221683202989896322544359399583';

function checkLivoStatusBatch() {
  const SHEET_NAME = '📦Géstion des Commandes';
  const MAX_ROWS_PER_RUN = 50;
  const PROPERTY_KEY = 'LAST_ROW_LIVO';

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
    const orderId = row[16]; // Column Q (index 16)

    if (!orderId || orderId === '' || orderId.toLowerCase() === 'failed' || orderId.toLowerCase() === 'error') {
      Logger.log(`⏭️ Row ${i + 1}: No valid order ID, skipping.`);
      continue;
    }

    const url = `${LIVO_API_URL}/${orderId}`;
    const options = {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${LIVO_TOKEN}`
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
        if (json.success && json.data && json.data.data) {
          const status = json.data.data.status || 'Unknown';
          sheet.getRange(i + 1, 18).setValue(status); // Column R (index 18)
          Logger.log(`✅ Row ${i + 1}: Status updated to "${status}".`);
        } else {
          sheet.getRange(i + 1, 18).setValue('Invalid response');
          Logger.log(`❌ Row ${i + 1}: Unexpected API response structure.`);
        }
      } else {
        sheet.getRange(i + 1, 18).setValue(`Error: ${code}`);
        Logger.log(`❌ Row ${i + 1}: HTTP error code ${code}`);
      }
    } catch (e) {
      sheet.getRange(i + 1, 18).setValue('Error');
      Logger.log(`❌ Row ${i + 1}: Exception - ${e.message}`);
    }

    rowsProcessed++;
    PropertiesService.getScriptProperties().setProperty(PROPERTY_KEY, i + 1); // Save progress

    Utilities.sleep(1000); // Avoid rate limit

    if (rowsProcessed >= MAX_ROWS_PER_RUN) {
      Logger.log(`⏸️ Stopped after ${MAX_ROWS_PER_RUN} rows. Will resume next run.`);
      return;
    }
  }

  // Reset progress once done
  PropertiesService.getScriptProperties().deleteProperty(PROPERTY_KEY);
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ تم إكمال تحديث كل صفوف Livo.", "Livo Status", 5);
}
