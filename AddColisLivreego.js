function AddColisLivreego() {

  var SHEET_NAME = '📦Géstion des Commandes';
  var url = 'https://livreego.ma/apiclient/addparcelsnew';
  var token = 'adffe4677b700970c87cea434a9c9823f84f0f9db45dfc94c93e09bc795469b9';

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();

  Logger.log('🔎 Rows to check: ' + (data.length - 1));

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    var receiver = row[4];   // E
    var phone    = row[5];   // F
    var cityId   = row[7];   // H (ID ONLY)
    var address  = row[8];   // I
    var price    = row[13];  // N
    var note     = row[15];  // P
    var status   = row[16];  // Q
    var carrier  = row[20];  // U
    var synced   = row[25];  // Z

    // Same logic as Sonicod
    if (carrier !== 'Livreego' || status !== 'Confirmé' || synced === 'Synced') {
      continue;
    }

    // ⚠️ minimal validation (do NOT over-validate)
    if (!receiver || !phone || !cityId || !address || !price) {
      sheet.getRange(i + 1, 27).setValue('Missing required field'); // AA
      continue;
    }

    var payload = {
      parcel_code: 'TEST_' + new Date().getTime() + '_' + i,
      parcel_receiver: receiver,
      parcel_phone: String(phone),
      parcel_city: String(cityId),
      parcel_price: Number(price),
      parcel_address: address,
      parcel_open: 0,
      parcel_note: note || ''
    };

    var options = {
      method: 'post',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var httpCode = response.getResponseCode();
    var body = response.getContentText();

    Logger.log('📦 Row ' + (i + 1) + ' | HTTP ' + httpCode + ' | ' + body);

    if (httpCode === 200) {
      sheet.getRange(i + 1, 26).setValue('Synced');        // Z
      sheet.getRange(i + 1, 23).setValue('Colis ajouté');  // W
      sheet.getRange(i + 1, 24).setValue(payload.parcel_code); // AC
    } else {
      sheet.getRange(i + 1, 22).setValue('HTTP ' + httpCode);
      sheet.getRange(i + 1, 23).setValue(body);
    }
  }

  Logger.log('🏁 Livreego sheet sync completed');
}
