function addOrdersToTurboLivFromSheet() {
  const TOKEN = "ead5533280724bdfb074a1dbda934df1"; // TurboLiv Token
  const SECRET_KEY = "bb753f2776f4114e55ab2283d71cf68d"; // TurboLiv Secret Key
  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipient = row[4];    // Column E
    const phone = row[5];        // Column F
    const city = row[7];         // Column H
    const address = row[8];      // Column I
    const product = row[9];      // Column J
    const price = row[13];       // Column N
    const note = row[15];        // Column P
    const statusK = row[16];     // Column Q
    const colisT = row[20];      // Column U
    const syncedT = row[25];     // Column Z

    // Skip rows not matching TurboLiv criteria
    if (colisT !== "TurboLiv" || statusK !== "Confirmé" || syncedT === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped`);
      continue;
    }

    // Build add-colis parameters
    const params = {
      tk: TOKEN,
      sk: SECRET_KEY,
      fullname: recipient,
      phone: String(phone),
      city: city,
      address: address,
      price: Number(price),
      product: product,
      qty: 1,
      note: note || "",
      change: 0,
      openpackage: 1
    };

    const query = Object.keys(params)
      .map(k => `${k}=${encodeURIComponent(params[k])}`)
      .join("&");

    const url = `https://turboliv.ma/addcolis.php?${query}`;

    try {
      // 1️⃣ Add colis
      const addRes = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const addBody = addRes.getContentText();
      Logger.log(`📦 Row ${i + 1} Add Response: ${addBody}`);

      let addJson;
      try {
        addJson = JSON.parse(addBody);
      } catch (err) {
        sheet.getRange(i + 1, 22).setValue("Invalid JSON"); // Column V
        sheet.getRange(i + 1, 23).setValue(addBody);        // Column W
        continue;
      }

      if (addJson && addJson.code) {
        const codeColis = addJson.code;

        // 2️⃣ Track colis immediately
        const trackUrl =
          `https://turboliv.ma/track.php?tk=${TOKEN}&sk=${SECRET_KEY}&code=${encodeURIComponent(codeColis)}`;
        const trackRes = UrlFetchApp.fetch(trackUrl, { muteHttpExceptions: true });
        const trackBody = trackRes.getContentText();

        let trackJson;
        try {
          trackJson = JSON.parse(trackBody);
        } catch (err) {
          sheet.getRange(i + 1, 22).setValue("Added, track JSON error"); // Column V
          sheet.getRange(i + 1, 23).setValue(trackBody);                // Column W
          continue;
        }

        // Extract last status
        const events = Object.keys(trackJson)
          .filter(k => k !== "status")
          .map(k => trackJson[k]);
        const lastEvent = events[events.length - 1];

        // ✅ Update sheet with last status
        sheet.getRange(i + 1, 23).setValue(lastEvent.state); // Column W
        sheet.getRange(i + 1, 24).setValue(codeColis);      // Column X
        sheet.getRange(i + 1, 26).setValue("Synced");       // Column Z

        Logger.log(`✔️ Row ${i + 1} synced successfully: ${lastEvent.state} (Code ${codeColis})`);

      } else {
        // ❌ Failed to add colis
        sheet.getRange(i + 1, 22).setValue("Failed");  // Column V
        sheet.getRange(i + 1, 23).setValue(addBody);   // Column W
        Logger.log(`❌ Row ${i + 1} FAILED: ${addBody}`);
      }

    } catch (e) {
      sheet.getRange(i + 1, 22).setValue("Error");   // Column V
      sheet.getRange(i + 1, 23).setValue(e.message); // Column W
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
    }
  }

  Logger.log("🏁 All rows processed for TurboLiv");
}
