function checkExpressCoursierStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📦Géstion des Commandes" not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const statusT = row[22]; // Column T (index 19)
    const trackingID = row[23]; // Column R (index 17)

    // ✅ Skip if not expresscoursier
    if (statusT !== "Express Coursier") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'Express Coursier', skipping.`);
      continue;
    }

    // ✅ Skip if no tracking ID
    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID found, skipping.`);
      continue;
    }

    const url = "https://expresscoursier.net/client/ajax.php?type=getColiStatus";
    const options = {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: `id=${encodeURIComponent(trackingID)}`,
      headers: {
        'Cookie': 'PHPSESSID=63f7227a5552ee90ddda0c2c707e4393' // Replace with your valid session
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const body = response.getContentText();
      Logger.log(`📦 Raw Response for ${trackingID}: ${body}`);

      const json = JSON.parse(body);
      if (json && json.name) {
        sheet.getRange(i + 1, 23).setValue(json.name); // Column S (index 18)
        Logger.log(`✅ Row ${i + 1}: Status updated to "${json.name}".`);
      } else {
        Logger.log(`❌ Row ${i + 1}: No 'name' field in response.`);
      }

    } catch (err) {
      Logger.log(`⚠️ Error for ${trackingID}: ${err.message}`);
    }
  }
}
