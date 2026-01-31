function checkOneSstaParcelStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📦Géstion des Commandes" not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) { // Skip header row
    const row = data[i];
    const service = row[20]; // Column AB (index 19) - Courier Name
    const parcelCode = row[23]; // Column 18 (index 17) - Parcel Code

    // ✅ Skip if not onessta
    if (service !== "Onessta") {
      Logger.log(`⏭️ Row ${i + 1}: Not 'Onessta', skipping.`);
      continue;
    }

    // ✅ Skip if no parcel code
    if (!parcelCode) {
      Logger.log(`⏭️ Row ${i + 1}: No parcel code found, skipping.`);
      continue;
    }

    // ✅ API call setup
    const url = 'https://api.onessta.com/api/v1/c/parcels/get_by_code';
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer YrvK97O8C3uNjzp03dzjygXVHZSuPbY3dcwZ2UpT38d7e617',
      'API-Key': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4MTI1LCJlbWFpbCI6InJheXRheTk5QG1haWwucnUifQ==.KW9v37/+Uh7iMeMGGhi+eAY8GdzCbONsoB0Rtbd2WVM=',
      'Client-ID': 'CB047154-E10A00DE-5E02459C-8A50F93D-EA0ADA89-488544B3'
    };
    const payload = { 'code': String(parcelCode) };

    const options = {
      method: 'post',
      headers: headers,
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const json = JSON.parse(response.getContentText());

      Logger.log(`📦 API Response for ${parcelCode}: ` + JSON.stringify(json));

      if (json.success && json.data && json.data.parcel) {
        const status = json.data.parcel.status || "No status";
        sheet.getRange(i + 1, 23).setValue(status); // Column 19 (index 18) - Status
        Logger.log(`✅ Row ${i + 1}: Updated status to "${status}".`);
      } else {
        Logger.log(`❌ Row ${i + 1}: ${json.message || "Unknown error"}`);
      }
    } catch (error) {
      Logger.log(`⚠️ Error fetching status for ${parcelCode}: ` + error.message);
    }
  }
}
