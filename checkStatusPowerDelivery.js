function trackPowerDeliveryParcelsFromSheet() {

  const TOKEN_PowerDeliverys = '8b7dd2d89d8fd3affa66a279caaa3832f59a193e0b1be727a7779dd41eae4617';
  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const carrier     = row[20]; // U
    const parcelCode  = row[23]; // X
    const synced      = row[25]; // Z

    // ⏩ Skip rows not eligible
    if (carrier !== "PowerDelivery" || synced !== "Synced" || !parcelCode) {
      continue;
    }

    const url = `https://elog.ma/apiclient/trackparcel?parcel_code=${encodeURIComponent(parcelCode)}`;

    const options = {
      method: "get",
      headers: {
        Authorization: TOKEN_PowerDeliverys,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const body = response.getContentText();
      Logger.log(`📍 Row ${i + 1} Tracking: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        sheet.getRange(i + 1, 23).setValue("Invalid JSON"); // W
        continue;
      }

      if (!json.success || !json.tracking) {
        sheet.getRange(i + 1, 23).setValue(json.message || "Tracking failed"); // W
        continue;
      }

      // ✅ Extract tracking info
      // ✅ Extract the last history description
  let deliveryStatus = "";
  if (json.tracking && Array.isArray(json.tracking.history) && json.tracking.history.length > 0) {
  const lastStep = json.tracking.history[json.tracking.history.length - 1];
  deliveryStatus = lastStep.description || "";
  }

    const deliveryStatusCode = json.tracking.current_status || ""; // still keep code
    const paymentStatus = json.parcel?.payment_status_text || "";
    const updatedAt = json.parcel?.updated_date || "";

// ✅ Write to sheet
    sheet.getRange(i + 1, 23).setValue(deliveryStatus);     

      Logger.log(`✔️ Row ${i + 1} updated → ${deliveryStatus}`);

    } catch (e) {
      sheet.getRange(i + 1, 23).setValue(e.message); // W
      Logger.log(`❌ Row ${i + 1} ERROR: ${e.message}`);
    }
  }

  Logger.log("🏁 Tracking completed for PowerDelivery");
}
