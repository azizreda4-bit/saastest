function checkLivcashStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📦Géstion des Commandes" not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const LIVCASH_TOKEN = '0b0b31-555fdf-8f5b67-9eebd9-5e4084'; // 🔁 Replace with your Livcash token
  const LIVCASH_URL = 'https://clients.livcash.ma/api-parcels';

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const provider = row[20];      // Column AB
    const trackingCode = row[23];  // Column Q

    if (provider !== "Livcash") {
      Logger.log(`⏭️ Row ${i + 1}: Not Livcash, skipping.`);
      continue;
    }

    if (!trackingCode) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking code, skipping.`);
      continue;
    }

    const payload = {
      token: LIVCASH_TOKEN,
      action: "track",
      tracking: trackingCode
    };

    const options = {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(LIVCASH_URL, options);
      const text = response.getContentText();
      const code = response.getResponseCode();

      Logger.log(`📦 Row ${i + 1} Response Code: ${code}`);
      Logger.log(`📦 Row ${i + 1} Response Body: ${text}`);

      if (code === 200) {
        const data = JSON.parse(text);
        const statusMsg = data?.msg?.[0]?.status || "Unknown"; // <-- fix here

        sheet.getRange(i + 1, 23).setValue(statusMsg); // Column R
        Logger.log(`✅ Row ${i + 1}: Status = ${statusMsg}`);
      } else {
        sheet.getRange(i + 1, 23).setValue(`Error: ${code}`);
        Logger.log(`❌ Row ${i + 1}: Response code ${code}`);
      }
    } catch (e) {
      Logger.log(`❌ Row ${i + 1}: Exception - ${e.message}`);
      sheet.getRange(i + 1, 23).setValue('Error');
    }
  }
}

