function checkVitaLogsParcelStatus55() {
  const API_TOKEN = "3692401e76c26cc2ad9d69e3ad46542a834d65139cbbdbee56073f03235ce21c";
  const TRACK_URL = "https://vitalogs.ma/apiclient/trackparcel";
  const STATUS_URL = "https://vitalogs.ma/apiclient/liststatus";

  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  // 1️⃣ Fetch all status names once
  const statusOptions = {};
  try {
    const statusResponse = UrlFetchApp.fetch(STATUS_URL, {
      method: "get",
      headers: { Authorization: API_TOKEN, "Content-Type": "application/json" },
      muteHttpExceptions: true
    });
    const statusJson = JSON.parse(statusResponse.getContentText());
    if (statusJson.success) {
      statusJson.statuses.forEach(s => statusOptions[s.code] = s.name);
    }
  } catch (err) {
    Logger.log("❌ Failed to fetch status list: " + err.message);
  }

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const parcelCode = row[23]; // Column X → parcel code
    const synced     = row[25]; // Column Z → Synced

    if (!parcelCode || synced !== "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped (no parcel code or not synced)`);
      continue;
    }

    const url = `${TRACK_URL}?parcel_code=${encodeURIComponent(parcelCode)}`;

    try {
      const response = UrlFetchApp.fetch(url, {
        method: "get",
        headers: { Authorization: API_TOKEN, "Content-Type": "application/json" },
        muteHttpExceptions: true
      });

      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        sheet.getRange(i + 1, 21).setValue("Invalid JSON"); // W
        continue;
      }

      if (json.success) {
        const deliveryCode = json.tracking?.current_status || "UNKNOWN";
        const paymentStatus = json.parcel?.payment_status || "UNKNOWN";

        // Map to readable status name
        const deliveryName = statusOptions[deliveryCode] || deliveryCode;

        // Optionally, store full history as JSON string
        const history = JSON.stringify(json.tracking?.history || []);

        // Write back to sheet
        sheet.getRange(i + 1, 23).setValue(deliveryName); // W → latest delivery status
        sheet.getRange(i + 1, 22).setValue(paymentStatus); // X → payment status

        Logger.log(`✔️ Row ${i + 1} updated → Delivery: ${deliveryName}, Payment: ${paymentStatus}`);
      } else {
        sheet.getRange(i + 1, 22).setValue(json.message || "Error"); // W
      }

    } catch (e) {
      sheet.getRange(i + 1, 22).setValue(e.message); // W
      Logger.log(`❌ Row ${i + 1} ERROR: ${e.message}`);
    }
  }

  Logger.log("🏁 All rows processed for parcel status");
}
