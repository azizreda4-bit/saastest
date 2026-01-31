function checkMaberrParcelStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📦Géstion des Commandes" not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const sessionId = "luo7td1ksn6lubb3dpmt48d52f"; // Your Maberr PHPSESSID

  // Fetch the parcel list page once
  const listUrl = "https://maberr.ma/clients/parcels-waiting-pick-up";
  const listOptions = {
    method: 'get',
    headers: {
      'Cookie': 'PHPSESSID=' + sessionId,
      'X-Requested-With': 'XMLHttpRequest'
    },
    muteHttpExceptions: true
  };
  
  const listResponse = UrlFetchApp.fetch(listUrl, listOptions);
  const listHtml = listResponse.getContentText();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const companyS = row[20];     // Column AB (index 27)
    const trackingID = row[23];   // Column Q (index 16) - Tracking ID

    if (companyS !== "Maberr" || !trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: Skipped`);
      continue;
    }

    // Regex to find the status by tracking number
    const regex = new RegExp(`<tr id="parcel-${trackingID}".*?<td class="parcel-status"><span[^>]*>([^<]+)<\\/span>`, 's');
    const match = listHtml.match(regex);
    const status = match ? match[1].trim() : "Status not found";

    // Update sheet Column R (index 18)
    sheet.getRange(i + 1, 23).setValue(status);
    Logger.log(`✅ Row ${i + 1}: Updated status for ${trackingID} to "${status}".`);
  }
}
