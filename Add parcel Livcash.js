function addParcelToLivcash() {
  const apiEndpoint = 'https://clients.livcash.ma/api-parcels';
  const apiToken = '0b0b31-555fdf-8f5b67-9eebd9-5e4084'; // 🔁 Replace with your real Livcash token

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipientName = row[4];   // Column A
    const phone = row[5];           // Column B
    const address = row[8];         // Column C
    const note = row[15];            // Column D
    const city = String(row[7]).trim(); // Column AL (adjust if different)
    const price = row[13];           // Column I
    const quantity = row[14] || 1;  // Column M
    const trackingCode = row[23];   // Column Q (Tracking Number)

    const statusQ = row[16];       // Column AA
    const colisU = row[20];        // Column AB
    const syncedAJ = row[25];       // Column AJ

    // ✅ Conditions
    if (colisU !== "Livcash") {
      Logger.log(`⏭️ Row ${i + 1}: U is "${colisU}", skipping.`);
      continue;
    }
    if (statusQ !== "Confirmé") {
      Logger.log(`⏭️ Row ${i + 1}: Q is "${statusQ}", skipping.`);
      continue;
    }
    if (syncedAJ === "synced") {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue;
    }

    // 📦 Form data per API docs
    const formData = {
      'token': apiToken,
      'action': 'add',
      'ville': city,
      'phone': phone,
      'qty': quantity,
      'adresse': address,
      'note': note,
      'price': price,
      'name': recipientName,
      'tracking': trackingCode
    };

    const options = {
      method: 'POST',
      payload: formData,
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(apiEndpoint, options);
      const content = response.getContentText();
      const code = response.getResponseCode();

      Logger.log(`📦 Row ${i + 1} Response Code: ${code}`);
      Logger.log(`📦 Row ${i + 1} Response Body: ${content}`);

      const responseData = JSON.parse(content);
      const status = responseData?.status;
      const msg = responseData?.msg || "";
      const sku = responseData?.sku || "";

      if (code === 200 && status === true) {
        sheet.getRange(i + 1, 24).setValue(sku);      // Column Q (Tracking / SKU)
        sheet.getRange(i + 1, 23).setValue('Success'); // Column R
        sheet.getRange(i + 1, 26).setValue("synced"); // Column AJ
      } else {
        sheet.getRange(i + 1, 24).setValue(msg);      // Column Q (error msg)
        sheet.getRange(i + 1, 23).setValue('Failed'); // Column R
      }

    } catch (error) {
      Logger.log(`❌ Row ${i + 1} Error: ${error.message}`);
      sheet.getRange(i + 1, 24).setValue(error.message); // Column Q
      sheet.getRange(i + 1, 23).setValue('Error');       // Column R
    }
  }
}