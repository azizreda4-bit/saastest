function checkColisStatus() {

  const SHEET_NAME = '📦Géstion des Commandes';
  const API_TOKEN = 'adffe4677b700970c87cea434a9c9823f84f0f9db45dfc94c93e09bc795469b9';
  const API_URL = 'https://livreego.ma/apiclient/trackparcel?parcel_code=';

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log('🔎 Checking status for ' + (data.length - 1) + ' parcels');

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const carrier = row[20];   // U
    if (carrier !== 'Livreego') {
      Logger.log(`⏩ Row ${i + 1} skipped (carrier is not Livreego)`);
      continue;
    }

    const parcelCode = row[23]; 
    if (!parcelCode) {
      Logger.log(`⏩ Row ${i + 1} skipped (no parcel code)`);
      continue;
    }

    const url = API_URL + parcelCode;

    const options = {
      method: 'get',
      headers: {
        'Authorization': API_TOKEN,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const code = response.getResponseCode();
      const body = response.getContentText();

      Logger.log(`📦 Row ${i + 1} | HTTP ${code} | ${body}`);

      if (code !== 200 || !body) {
        sheet.getRange(i + 1, 23).setValue('Error');       // W
        continue;
      }

      let json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        sheet.getRange(i + 1, 23).setValue(body);           // X
        continue;
      }

      if (json.success && json.tracking) {
        const latestStatus = json.tracking.history.length > 0
          ? json.tracking.history[json.tracking.history.length - 1].description
          : json.tracking.current_status;

        sheet.getRange(i + 1, 23).setValue(latestStatus);          // W
      } else {
        sheet.getRange(i + 1, 23).setValue(json.message || 'No tracking info');
      }

    } catch (err) {
      sheet.getRange(i + 1, 23).setValue(err.message);   // X
    }
  }

  Logger.log('🏁 Livreego status check completed');
}
