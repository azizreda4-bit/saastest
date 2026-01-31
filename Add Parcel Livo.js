const LIVO_API_URL = 'https://rest.livo.ma/orders';
const LIVO_TOKEN = 'APhjejxgvzqirbsrsxebzphfgxgbyyacplstrqdjose53300292186221683202989896322544359399583';

function addOrderToLivo() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('Sheet "📦Géstion des Commandes" not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const maxNameLength = 14;

  for (let i = 1; i < data.length; i++) { // skip header row
    const row = data[i];

    const statusU = String(row[20] || ''); // Column S (index 18)
    const statusQ = String(row[16] || ''); // Column K (index 10)
    const syncedAE = String(row[25] || ''); // Column AE (index 30)

    if (statusU !== 'Livo') {
      Logger.log(`⏭️ Row ${i + 1}: U is "${statusU}", skipping.`);
      continue;
    }
    if (statusQ !== 'Confirmé') {
      Logger.log(`⏭️ Row ${i + 1}: Q is "${statusQ}", skipping.`);
      continue;
    }
    if (syncedAE === 'Synced') {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue;
    }

    // Build order payload
    const orderData = {
      products: [{
        product_id: String(row[9] || ''),
       quantity: parseInt(row[10], 16) || 1
      }],
      cost: parseFloat(row[13]) || 0,
      target: {
        name: String(row[4] || '').substring(0, maxNameLength),
        phone: String(row[5] || ''),
        city: String(row[6] || ''),
        address: String(row[8] || '')
      },
      status: 'pending',              // ← ensures awaiting transfer status
      comment: String(row[15] || ''),  // ← optional, fill index if needed
      forceProducts: true
    };

    Logger.log(`📦 Sending order for Row ${i + 1}: ${JSON.stringify(orderData)}`);

    try {
      const options = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LIVO_TOKEN}`,
          'Content-Type': 'application/json',
        },
        payload: JSON.stringify(orderData),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(LIVO_API_URL, options);
      const responseText = response.getContentText();
      const responseCode = response.getResponseCode();
      Logger.log(`Response Code: ${responseCode} - Body: ${responseText}`);

      if (responseCode === 200 || responseCode === 201) {
  const json = JSON.parse(responseText);
  if (json.success) {
    const orderId = json.data.data._id || '';
    const status = json.data.data.status || '';

    sheet.getRange(i + 1, 24).setValue(orderId);  // Column R for Order ID
    sheet.getRange(i + 1, 23).setValue(status);   // Column S for status
    sheet.getRange(i + 1, 30).setValue('Synced'); // Column AE for synced flag
    Logger.log(`✅ Row ${i + 1}: Order created successfully.`);
  } else {
    const errorMsg = json.data?.en_message || json.message || 'Unknown error';
    sheet.getRange(i + 1, 23).setValue('Failed');
    sheet.getRange(i + 1, 21).setValue(errorMsg);
    Logger.log(`❌ Row ${i + 1}: API returned failure - ${errorMsg}`);
  }
}
 else {
        sheet.getRange(i + 1, 23).setValue('Failed');
        sheet.getRange(i + 1, 21).setValue(`HTTP Error ${responseCode}`);
        Logger.log(`❌ Row ${i + 1}: HTTP error code ${responseCode}`);
      }
    } catch (error) {
      sheet.getRange(i + 1, 23).setValue('Error');
      sheet.getRange(i + 1, 21).setValue(error.message);
      Logger.log(`❌ Row ${i + 1} Exception: ${error.message}`);
    }
  }
}
