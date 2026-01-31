const TOKEN2 = '174960911|k1e6MqKkw3jp0wSGsSAHLISLhqDeN8IvZkpWyeJo';
function checkSenditStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📦Géstion des Commandes" not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) { // Skip header row
    const row = data[i];
    const statusT = row[20]; // Column T (index 19)
    const trackingID = row[23]; // Column 18 (index 17) - Tracking ID

    // ✅ Check if AB is "sendit"
    if (statusT !== "Sendit") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'sendit', skipping.`);
      continue;
    }

    // ✅ Check if tracking ID exists
    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No tracking ID found, skipping.`);
      continue;
    }

    // Call the Sendit API to check status
    const url = `https://app.sendit.ma/api/v1/deliveries/${trackingID}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN2}`,
        'Content-Type': 'application/json',
      },
      muteHttpExceptions: true,
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const result = JSON.parse(response.getContentText());
      Logger.log(`📦 Status response for ${trackingID}: ` + JSON.stringify(result));

      if (result.success && result.data.status) {
        const status = result.data.status;
        sheet.getRange(i + 1, 23).setValue(status); // Column 19 (index 18) - Status
        Logger.log(`✅ Row ${i + 1}: Updated status to "${status}".`);
      } else {
        Logger.log(`❌ Row ${i + 1}: Failed to fetch status.`);
      }
    } catch (error) {
      Logger.log(`⚠️ Error fetching status for ${trackingID}: ` + error.message);
    }
  }
}
