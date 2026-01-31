function addColisFromSheet() {
  const apiEndpoint = 'https://my.coliix.com/casa/seller/api-parcels';
  const apiKey = '7623cd-daab85-667a5d-00c974-2fa382';  // Use your new API key here

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const data = sheet.getDataRange().getValues();  // Get all data from the sheet

  for (let i = 1; i < data.length; i++) {  // Start from row 1 to skip headers
    const row = data[i];

    const recipientName = row[4];
    const phone = row[5];
    const merchandise = row[9];
    const quantity = row[14];
    const city = row[7];
    const address = row[8];
    const note = row[15];
    const price = row[13];

    const statusK = row[16];   // Column K
    const syncedAE = row[25];   // Column AE
    const colisU = row[20];    // Column T

    // ✅ Apply conditions before sending
    if (colisU !== "Coliix") {
      Logger.log(`⏭️ Row ${i + 1}: U is "${colisU}", skipping.`);
      continue;
    }
    if (statusK !== "Confirmé") {
      Logger.log(`⏭️ Row ${i + 1}: K is "${statusAA}", skipping.`);
      continue;
    }
    if (syncedAE === "synced") {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue;
    }

    // Prepare the payload
    const formData = {
      'action': 'add',
      'token': apiKey,
      'name': recipientName,
      'phone': phone,
      'marchandise': merchandise,
      'marchandise_qty': quantity,
      'ville': city,
      'adresse': address,
      'note': note,
      'price': price
    };

    // Set up the options for the request
    const options = {
      'method': 'POST',
      'contentType': 'application/x-www-form-urlencoded',
      'payload': Object.keys(formData).map(function(key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(formData[key]);
      }).join('&')
    };

    try {
      // Make the request to the API
      const response = UrlFetchApp.fetch(apiEndpoint, options);
      const responseData = JSON.parse(response.getContentText());

      // Update the sheet with the response
      if (responseData.status === 200) {
        sheet.getRange(i + 1, 23).setValue('Success');  // Status (Column S)
        sheet.getRange(i + 1, 24).setValue(responseData.tracking);  // Tracking (Column R)
        sheet.getRange(i + 1, 26).setValue("synced");  // Mark as synced (Column AE)
      } else {
        sheet.getRange(i + 1, 23).setValue('Failed');
        sheet.getRange(i + 1, 14).setValue(responseData.msg);
      }
    } catch (error) {
      sheet.getRange(i + 1, 23).setValue('Error');
      sheet.getRange(i + 1, 24).setValue(error.message);
    }
  }
}
