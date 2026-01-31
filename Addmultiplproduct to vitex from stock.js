
function addOrdersToVitexFromSheetWithLogin() {
  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return Logger.log("❌ Sheet not found: " + SHEET_NAME);

  const data = sheet.getDataRange().getValues();
  const PHPSESSID = vitexLogin();
  if (!PHPSESSID) return;
  for (let i = 1; i < data.length; i++) {
    processVitexRow(i, data[i], sheet, PHPSESSID);
  }

  Logger.log("🏁 All rows processed for Vitex");
}

function vitexLogin() {
  const loginUrl = "https://vitex.ma/clients/login?action=login";
  const email = "arrobelbel1152@gmail.com"; // your Vitex email
  const password = "Az123456";                  // your Vitex password

  const loginPayload = {
    action: "login",
    login_customers_email: email,
    login_customers_password: password
  };

  const loginOptions = {
    method: "post",
    payload: loginPayload,
    followRedirects: false,
    muteHttpExceptions: true
  };

  try {
    const loginResponse = UrlFetchApp.fetch(loginUrl, loginOptions);
    const headers = loginResponse.getAllHeaders();
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

    if (!PHPSESSID) {
      Logger.log("❌ Login failed. Could not extract PHPSESSID.");
      return null;
    }

    Logger.log("✅ Logged in. PHPSESSID: " + PHPSESSID);
    return PHPSESSID;

  } catch (e) {
    Logger.log("❌ Login error: " + e.message);
    return null;
  }
}

function processVitexRow(i, row, sheet, PHPSESSID) {
  const receiver = row[4];    // E
  const phone = row[5];       // F
  const city = row[26];       // AL
  const address = row[8];     // I
  const price = row[13];      // N
  const note = row[15];       // P
  const status = row[16];     // Q
  const carrier = row[20];    // U
  const synced = row[25];     // Z

  // Skip if not Vitex or not confirmed or already synced
  if (carrier !== "Vitex" || status !== "Confirmé" || synced === "Synced") return;


  const productIdsStr = row[9]; // K
  const productQtysStr = row[14]; // O
  const products = {};

  if (productIdsStr && productQtysStr) {
    const ids = productIdsStr.toString().split(",").map(s => s.trim());
    const qtys = productQtysStr.toString().split(",").map(s => s.trim());

    if (ids.length !== qtys.length) {
      sheet.getRange(i + 1, 22).setValue("Failed");
      sheet.getRange(i + 1, 23).setValue("IDs and QTYs count mismatch");
      Logger.log(`❌ Row ${i + 1} FAILED: IDs and quantities mismatch`);
      return;
    }

    for (let j = 0; j < ids.length; j++) {
      if (ids[j] && qtys[j] && !isNaN(Number(qtys[j]))) {
        products[ids[j]] = Number(qtys[j]);
      }
    }
  }

  if (!receiver || !phone || !city || !address || Object.keys(products).length === 0 || isNaN(Number(price))) {
    sheet.getRange(i + 1, 22).setValue("Failed");               
    sheet.getRange(i + 1, 23).setValue("Missing or invalid data");
    Logger.log(`❌ Row ${i + 1} FAILED: Invalid required fields`);
    return;
  }

  const parcelUrl = "https://vitex.ma/clients/parcels?action=add-action-with-stock";
  const payload = {
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

  const options = {
    method: "post",
    payload: payload,
    contentType: "application/x-www-form-urlencoded; charset=UTF-8",
    headers: {
      "Cookie": "PHPSESSID=" + PHPSESSID,
      "X-Requested-With": "XMLHttpRequest"
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(parcelUrl, options);
    const body = response.getContentText();
    Logger.log(`📦 Row ${i + 1} Response: ${body}`);

    let json;
    try { json = JSON.parse(body); } 
    catch (err) { 
      sheet.getRange(i + 1, 22).setValue("Invalid JSON"); 
      sheet.getRange(i + 1, 23).setValue(body); 
      return; 
    }

    if (json.success) {
      sheet.getRange(i + 1, 23).setValue("Success");        // W
      sheet.getRange(i + 1, 24).setValue(json.parcel_code); // X
      sheet.getRange(i + 1, 26).setValue("Synced");         // Z
      Logger.log(`✔️ Row ${i + 1} synced successfully → ${json.parcel_code}`);
    } else {
      sheet.getRange(i + 1, 22).setValue("Failed");  
      sheet.getRange(i + 1, 23).setValue(json.message || JSON.stringify(json));
      Logger.log(`❌ Row ${i + 1} FAILED: ${body}`);
    }

  } catch (e) {
    sheet.getRange(i + 1, 22).setValue("Error");      
    sheet.getRange(i + 1, 23).setValue(e.message);    
    Logger.log(`❌ Row ${i + 1} ERROR: ${e.message}`);
  }
}

