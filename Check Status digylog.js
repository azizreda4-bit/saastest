function checkDigylogStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📦Géstion des Commandesd" not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const token = 'M2U2OGUxYjY3YjJmYTYzYWE4MjAzZDJhZmZmNmY1Y2E4MWYzODE5NDA5NTdlZmQzYTgyNzRmODllYWNmNjQ0MQ'; // 🔐 Replace with your actual Bearer token

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const statusT = row[20]; // Column T
    const trackingID = row[23]; // Column R

    if (statusT !== "Digylog") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'Digylog', skipping.`);
      continue;
    }

    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID, skipping.`);
      continue;
    }

    const url = 'https://api.digylog.com/api/v2/seller/historics?trakings=' + encodeURIComponent(trackingID);

    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Referer': 'https://apiseller.digylog.com',
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const result = JSON.parse(response.getContentText());
      Logger.log(`📦 Tracking result for ${trackingID}: ` + JSON.stringify(result));

      const history = result[trackingID];
      if (Array.isArray(history) && history.length > 0) {
        const latestStatus = history[history.length - 1];
        const statusText = latestStatus.newvalue || 'Unknown';
        sheet.getRange(i + 1, 23).setValue(statusText); // Column S (index 18)
        Logger.log(`✅ Row ${i + 1}: Updated status to "${statusText}"`);
      } else {
        Logger.log(`❌ Row ${i + 1}: No status found for ${trackingID}`);
      }

    } catch (e) {
      Logger.log(`⚠️ Row ${i + 1}: Error fetching status for ${trackingID}: ` + e.message);
    }
  }
}
