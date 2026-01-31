function trackColiatyParcels1() {
  const publicKey = '48a8b8045a804e93643172fca9d0059a50c4c130e91b0dc194735aa89b53c2bf';
  const secretKey = '43fffd2b6657938221d23860a35878b5c0f96a0dd8c10d3723a6c64e10f77fdd';

  if (!publicKey || !secretKey) {
    throw new Error('❌ Missing COLIATY_API_PUBLIC or COLIATY_API_SECRET in script properties.');
  }

  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const BASE_URL = "https://customer-api-v1.coliaty.com/";

  Logger.log("🔍 Tracking parcels for " + (data.length - 1) + " rows...\n");

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const carrier = row[20]; // U
    const trackingCode = String(row[23]).trim(); // X

    if (!trackingCode || (carrier !== "Coliaty" && carrier !== "Coliaty Stock")) {
      continue;
    }

    Logger.log(`\n--- Checking parcel: ${trackingCode} (Row ${i + 1}) ---`);

    const url = BASE_URL + "parcel/status/" + encodeURIComponent(trackingCode);

    const options = {
      method: "GET",
      headers: {
        Authorization: "Bearer " + publicKey + ":" + secretKey
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const body = response.getContentText();
      const statusCode = response.getResponseCode();

      // 🔍 Log FULL response
      Logger.log(`Response Code: ${statusCode}`);
      Logger.log(`Full Response:\n${body}\n`);

      if (statusCode === 200) {
        const json = JSON.parse(body);
        if (json.success && json.data?.status) {
          const statusData = json.data.status;
          const parcelData = json.data.parcel || {};

          const statusLabel = statusData.label || statusData.code || "Unknown";
          const statusDate = statusData.date || "";
          const comment = statusData.comment || "";

          sheet.getRange(i + 1, 23).setValue(statusLabel); // AA


          Logger.log(`✅ ${trackingCode} → Status: ${statusLabel}`);
        } else {
          handleError(sheet, i, "Invalid response structure", body);
        }
      } else if (statusCode === 404) {
        handleError(sheet, i, "Parcel not found", body);
      } else {
        handleError(sheet, i, `HTTP ${statusCode}`, body);
      }

      Utilities.sleep(500); // Respect rate limits
    } catch (e) {
      Logger.log(`⚠️ Exception for ${trackingCode}: ${e.message}\n`);
      handleError(sheet, i, e.message, "");
    }
  }

  Logger.log("\n🏁 Parcel tracking completed.");
}

function handleError(sheet, rowIndex, message, rawResponse = "") {
  sheet.getRange(rowIndex + 1, 23).setValue((message || "Unknown error") + (rawResponse ? ` | Raw: ${rawResponse.substring(0, 200)}` : ""));
  Logger.log(`❌ Row ${rowIndex + 1}: ${message}`);
}