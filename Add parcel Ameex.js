function addParcelToAmeex() {
  const apiEndpoint = 'https://api.ameex.app/customer/Delivery/Parcels/Action/Type/Add';
  const apiId = '12074';   // 🔁 Replace with your actual API ID
  const apiKey = '77d3f8-675762-1237e0-86b779-20284F-1D4AaB'; // 🔁 Replace with your actual API Key

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const data = sheet.getDataRange().getValues();
  const deliveryNoteRef = sheet.getRange("B1").getValue() || "";

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipientName = row[4];
    const phone = row[5];
    const address = row[8];
    const note = row[15];
    const cityId = String(row[26]).trim();
    const merchandise = row[9];
    const price = row[13];
    const quantity = row[14];

    const statusQ = row[16];      // Column K
    const syncedAE = row[25];      // Column AE
    const colisU = row[20];       // Column T

    if (colisU !== "Ameex") {
      Logger.log(`⏭️ Row ${i + 1}: U is "${colisU}", skipping.`);
      continue;
    }
    if (statusQ !== "Confirmé") {
      Logger.log(`⏭️ Row ${i + 1}: Q is "${statusQ}", skipping.`);
      continue;
    }
    if (syncedAE === "synced") {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue;
    }

    const formData = {
      'type': 'SIMPLE',
      'business': apiId,
      'replace': 'true',
      'open': 'YES',
      'try': 'YES',
      'fragile': '0',
      'receiver': recipientName,
      'phone': phone,
      'city': cityId,
      'address': address,
      'comment': note,
      'product': merchandise,
      'cod': price,
      'products[0][qty]': quantity
    };

    if (deliveryNoteRef) {
      formData['order_num'] = deliveryNoteRef;
    }

    const options = {
      'method': 'POST',
      'headers': {
        'C-Api-Id': apiId,
        'C-Api-Key': apiKey
      },
      'payload': formData,
      'muteHttpExceptions': true
    };

    try {
      const response = UrlFetchApp.fetch(apiEndpoint, options);
      const content = response.getContentText();
      const code = response.getResponseCode();

      Logger.log(`📦 Row ${i + 1} Response Code: ${code}`);
      Logger.log(`📦 Row ${i + 1} Response Body: ${content}`);

      const responseData = JSON.parse(content);
      const apiType = responseData?.api?.type;
      const trackingCode = responseData?.api?.data?.code || "";
      const apiMsg = responseData?.api?.msg || "";

      if (code === 200 && apiType === "success") {
        sheet.getRange(i + 1, 23).setValue('Success'); // Column S
        sheet.getRange(i + 1, 24).setValue(trackingCode); // Column R
        sheet.getRange(i + 1, 26).setValue("synced"); // Column AE
      } else {
        sheet.getRange(i + 1, 23).setValue('Failed'); // Column S
        sheet.getRange(i + 1, 24).setValue(apiMsg); // Column R
      }

    } catch (error) {
      Logger.log(`❌ Row ${i + 1} Error: ${error.message}`);
      sheet.getRange(i + 1, 23).setValue('Error'); // Column S
      sheet.getRange(i + 1, 24).setValue(error.message); // Column R
    }
  }
}
