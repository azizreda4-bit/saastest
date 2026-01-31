

const VITEX_BEARER_TOKEN = "fd09a1-94849b-9325fe-19cb78-4137c1";
const SHEET_NAME = "📦Géstion des Commandes";

function addOrdersToVitexFromSheet() {

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // ===== COLUMN MAPPING =====
    const orderId   = "VX" + Date.now(); // Local reference ID
    const recipient = row[4];   // E
    const phone     = row[5];   // F
    const city      = row[26];  // AA (City CODE or ID)
    const address   = row[8];   // I
    const product   = row[9];   // J
    const price     = row[13];  // N
    const note      = row[15];  // P
    const status    = row[16];  // Q
    const carrier   = row[20];  // U
    const synced    = row[25];  // Z

    // ===== FILTER =====
    if (carrier !== "Vitex" || status !== "Confirmé" || synced === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped`);
      continue;
    }

    if (!city) {
      sheet.getRange(i + 1, 22).setValue("City missing"); // V
      Logger.log(`❌ Row ${i + 1} city missing`);
      continue;
    }

    // ===== BUILD VITEX PAYLOAD =====
    const payload = {
      parcels: [{
        id: orderId,
        parcel_receiver: recipient,
        parcel_phone: String(phone),
        parcel_price: String(price),
        parcel_city: String(city),
        parcel_address: address,
        parcel_note: note || "",
        marchandise: product
      }]
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + VITEX_BEARER_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const res = UrlFetchApp.fetch(
        "https://vitex.ma/clients-api/add-parcels",
        options
      );

      const body = res.getContentText();
      Logger.log(`📦 Row ${i + 1} API Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        sheet.getRange(i + 1, 23).setValue(body);           // W
        continue;
      }

      const successMap = json?.data?.success || {};
      const failedMap  = json?.data?.failed  || {};

      // ===== REAL SUCCESS =====
      if (successMap[orderId]) {

        const tracking = successMap[orderId];

        sheet.getRange(i + 1, 23).setValue("Order created"); // W
        sheet.getRange(i + 1, 24).setValue(tracking);        // X
        sheet.getRange(i + 1, 26).setValue("Synced");        // Z

        Logger.log(`✔️ VITEX created → ${tracking}`);

      // ===== REAL FAILURE =====
      } else if (failedMap[orderId]) {

        sheet.getRange(i + 1, 23).setValue(
          failedMap[orderId].join(" | ")
        ); // W

        Logger.log(`❌ VITEX FAILED → ${failedMap[orderId].join(" | ")}`);

      // ===== UNKNOWN RESPONSE =====
      } else {

        sheet.getRange(i + 1, 23).setValue(JSON.stringify(json)); // W

        Logger.log(`⚠️ VITEX UNKNOWN RESPONSE → ${JSON.stringify(json)}`);
      }

    } catch (err) {

      sheet.getRange(i + 1, 23).setValue(err.message); // W

      Logger.log(`❌ Row ${i + 1} ERROR → ${err.message}`);
    }
  }

  Logger.log("🏁 VITEX processing completed");
}

