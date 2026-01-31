function addOrdersToVitaLogsFromSheet() {

  const API_TOKEN = "3692401e76c26cc2ad9d69e3ad46542a834d65139cbbdbee56073f03235ce21c";
  const API_URL = "https://vitalogs.ma/apiclient/addparcelsnew";

  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const store        = row[2];   // C
    const customerName = row[4];   // E
    const phone        = row[5];   // F
    const city         = row[7];   // H
    const address      = row[8];   // I
    const price        = row[13];  // N
    const note         = row[15];  // P
    const status       = row[16];  // Q
    const carrier      = row[20];  // U
    const synced       = row[25];  // Z

    const orderType    = row[26];  // AA → STANDARD / MARKETPLACE
    const pickupPhone  = row[27];  // AB
    const latitude     = row[28];  // AC
    const longitude    = row[29];  // AD
    const paymentMode  = row[30];  // AE

    if (carrier !== "VitaLogs" || status !== "Confirmé" || synced === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped`);
      continue;
    }

    const parcelCode = "VITA_" + row[0];

    // STANDARD
    let payload = {
      parcel_code: parcelCode,
      parcel_receiver: customerName,
      parcel_phone: String(phone),
      parcel_city: city,
      parcel_price: Number(price),
      parcel_address: address,
      parcel_open: 1,
      parcel_note: note || ""
    };

    //  MARKETPLACE
    if (orderType === "MARKETPLACE") {
      payload.parcel_pickup_point = store;
      payload.parcel_pickup_phone = pickupPhone;
      payload.parcel_latitude = Number(latitude);
      payload.parcel_longitude = Number(longitude);
      payload.parcel_payment_mode = paymentMode || "COD";
    }

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: API_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(API_URL, options);
      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        sheet.getRange(i + 1, 23).setValue(body);          // W
        continue;
      }

      if (json.success === true) {
        sheet.getRange(i + 1, 23).setValue("Parcel Added");
        sheet.getRange(i + 1, 24).setValue(parcelCode);   // X
        sheet.getRange(i + 1, 26).setValue("Synced");     // Z

        Logger.log(`✔️ Row ${i + 1} synced → ${parcelCode}`);
      } else {
        sheet.getRange(i + 1, 23).setValue(json.message || body);
      }

    } catch (e) {
      sheet.getRange(i + 1, 23).setValue(e.message);
      Logger.log(`❌ Row ${i + 1} ERROR: ${e.message}`);
    }
  }

  Logger.log("🏁 All rows processed for VitaLogs");
}
