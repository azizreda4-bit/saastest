function addOrdersToVitexFromSheet() {
  // ==========================
  // 1️⃣ CONFIGURATION & LOGIN
  // ==========================
  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log("❌ Sheet not found: " + SHEET_NAME);
    return;
  }
  const data = sheet.getDataRange().getValues();

  const loginEmail = "Samir.choujaa1997@gmail.com";
  const loginPassword = "12345678";
  const loginUrl = "https://vitex.ma/clients/login?action=login";

  const loginPayload = {
    action: "login",
    login_customers_email: loginEmail,
    login_customers_password: loginPassword
  };

  // CRITICAL: Set followRedirects to false to capture the Set-Cookie header
  const loginOptions = {
    method: "post",
    payload: loginPayload,
    followRedirects: false, 
    muteHttpExceptions: true
  };

  const loginResponse = UrlFetchApp.fetch(loginUrl, loginOptions);
  const headers = loginResponse.getAllHeaders();
  
  // Debug: Log all headers to see what's available
  // Logger.log("Headers: " + JSON.stringify(headers));

  let setCookie = headers['Set-Cookie'] || headers['set-cookie'];
  
  let PHPSESSID = "";
  if (setCookie) {
    if (!Array.isArray(setCookie)) setCookie = [setCookie];
    for (let cookie of setCookie) {
      const match = cookie.match(/PHPSESSID=([^;]+)/);
      if (match) {
        PHPSESSID = match[1];
        break;
      }
    }
  }

  // Fallback: If not in the first response, try a second request with redirects enabled
  // Sometimes GAS handles the first cookie internally.
  if (!PHPSESSID) {
    Logger.log("⚠️ PHPSESSID not found in first response, trying with redirects...");
    const loginResponse2 = UrlFetchApp.fetch(loginUrl, {
      method: "post",
      payload: loginPayload,
      followRedirects: true,
      muteHttpExceptions: true
    });
    const headers2 = loginResponse2.getAllHeaders();
    setCookie = headers2['Set-Cookie'] || headers2['set-cookie'];
    if (setCookie) {
      if (!Array.isArray(setCookie)) setCookie = [setCookie];
      for (let cookie of setCookie) {
        const match = cookie.match(/PHPSESSID=([^;]+)/);
        if (match) {
          PHPSESSID = match[1];
          break;
        }
      }
    }
  }

  if (!PHPSESSID) {
    Logger.log("❌ Login failed: Could not extract PHPSESSID. Please check credentials or site status.");
    return;
  }
  Logger.log("✅ Logged in to Vitex. PHPSESSID: " + PHPSESSID);

  // ==========================
  // 2️⃣ PROCESS ROWS
  // ==========================
  const parcelUrl = "https://vitex.ma/clients/parcels?action=add-action-with-stock";
  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const receiver   = row[4];   // E
    const phone      = row[5];   // F
    const city       = row[26];  // AL (City ID for Vitex)
    const address    = row[8];   // I
    const product    = row[9];  // K
    const price      = row[13];  // N
    const note       = row[15];  // P
    const statusK    = row[16];  // Q
    const carrier    = row[20];  // U
    const synced     = row[25];  // Z

    // ⏩ Skip conditions
    if (carrier !== "Vitex" || statusK !== "Confirmé" || synced === "Synced") {
      continue;
    }

    // ❌ Validate required fields
    if (!receiver || !phone || !city || !address || isNaN(Number(price))) {
      sheet.getRange(i + 1, 22).setValue("Failed");               // V
      sheet.getRange(i + 1, 23).setValue("Missing or invalid data"); // W
      Logger.log(`❌ Row ${i + 1} FAILED: Invalid required fields`);
      continue;
    }

    const products = [
      { variant_id: "7931", qty: 1 } 
    ];

    const parcelPayload = {
      parcel_receiver: receiver,
      parcel_phone: String(phone),
      parcel_city: String(city), 
      parcel_address: address,
      parcel_price: String(price),
      hub_id: "2", 
      parcel_stock_check: "1",
      parcel_note: note || "",
      products: JSON.stringify(products)
    };

    const parcelOptions = {
      method: "post",
      payload: parcelPayload,
      headers: {
        "Cookie": "PHPSESSID=" + PHPSESSID,
        "X-Requested-With": "XMLHttpRequest"
      },
      followRedirects: true,
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(parcelUrl, parcelOptions);
      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        sheet.getRange(i + 1, 22).setValue("Invalid JSON"); // V
        sheet.getRange(i + 1, 23).setValue(body);           // W
        continue;
      }

      // ✅ SUCCESS
      if (json.success === true) {
        sheet.getRange(i + 1, 23).setValue("Success");      // W
        sheet.getRange(i + 1, 24).setValue(json.parcel_code); // X
        sheet.getRange(i + 1, 26).setValue("Synced");        // Z
        Logger.log(`✔️ Row ${i + 1} synced successfully → ${json.parcel_code}`);
      } else {
        // ❌ FAILURE
        sheet.getRange(i + 1, 22).setValue("Failed");  // V
        sheet.getRange(i + 1, 23).setValue(json.message || JSON.stringify(json)); // W
        Logger.log(`❌ Row ${i + 1} FAILED: ${body}`);
      }

    } catch (e) {
      sheet.getRange(i + 1, 22).setValue("Error");      // V
      sheet.getRange(i + 1, 23).setValue(e.message);    // W
      Logger.log(`❌ Row ${i + 1} ERROR: ${e.message}`);
    }
  }

  Logger.log("🏁 All rows processed for Vitex");
}