function checkColiixStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📊Dashboard" not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const TOKEN_COLIIX = '7623cd-daab85-667a5d-00c974-2fa382'; // 🔐 Replace with your actual token

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const statusT = row[20]; // Column T
    const trackingID = row[23]; // Column R

    if (statusT !== "Coliix") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'Coliix', skipping.`);
      continue;
    }

    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID, skipping.`);
      continue;
    }

    const url = 'https://my.coliix.com/casa/seller/api-parcels';
    const payload = {
      action: 'track',
      token: TOKEN_COLIIX,
      tracking: trackingID
    };

    const options = {
      method: 'post',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      payload: Object.entries(payload).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&'),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const result = JSON.parse(response.getContentText());
      Logger.log(`📦 Tracking result for ${trackingID}: ` + JSON.stringify(result));

      if (result.status === true && Array.isArray(result.msg)) {
        const latestStatus = result.msg[result.msg.length - 1];
        const statusText = latestStatus.status.trim();
        sheet.getRange(i + 1, 23).setValue(statusText); // Column S (index 18)
        Logger.log(`✅ Row ${i + 1}: Updated status to "${statusText}"`);
      } else {
        Logger.log(`❌ Row ${i + 1}: Unexpected response format or error.`);
      }
    } catch (e) {
      Logger.log(`⚠️ Row ${i + 1}: Error tracking ${trackingID}: ` + e.message);
    }
  }
}
