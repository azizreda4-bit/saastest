function ajouterColisCaledex1() {

  var SHEET_NAME = '📦Géstion des Commandes';
  var url = "https://caledex.ma/addcolis.php";

  // ✅ Caledex credentials
  var tk = "c1bf29fa76c6c6da1028e720ba511f89";
  var sk = "05767e1fac6643778cf531e19c98660c";

  // ✅ REQUIRED by Caledex
  var business_id = "41";
  var client_id = "111911";

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();

  Logger.log('🔎 Rows to check: ' + (data.length - 1));

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    var receiver = row[4];   // E
    var phone    = row[5];   // F
    var city     = row[6];   // G
    var address  = row[8];   // I
    var price    = row[13];  // N
    var note     = row[15];  // P
    var status   = row[16];  // Q
    var carrier  = row[20];  // U
    var synced   = row[25];  // Z

    // ✅ only Caledex + Confirmé + not synced
    if (carrier !== 'Caledex' || status !== 'Confirmé' || synced === 'Synced') {
      continue;
    }

    // ⚠️ minimal validation
    if (!receiver || !phone || !city || !address || !price) {
      sheet.getRange(i + 1, 27).setValue('Missing required field'); // AA
      continue;
    }

    var productNames = row[9];  // L
    var quantities   = row[14]; // O

    if (!productNames) productNames = "Produit";
    if (!quantities) quantities = "1";

    var payload = {
      tk: tk,
      sk: sk,
      fullname: receiver,
      phone: String(phone),
      city: String(city),
      address: String(address),
      price: Number(price),
      product: String(productNames),
      qty: String(quantities),
      note: note || "",
      change: 0,
      openpackage: 1,
      business_id: business_id,
      client: client_id
    };

    var options = {
      method: "post",
      payload: payload,
      muteHttpExceptions: true
    };

    try {
      var response = UrlFetchApp.fetch(url, options);
      var httpCode = response.getResponseCode();
      var body = response.getContentText();

      Logger.log("📦 Row " + (i + 1) + " | HTTP " + httpCode + " | " + body);

      // ✅ parse JSON body
      var json = JSON.parse(body);
      var returnedCode = json.code || "No Code";

      if (httpCode === 200 && json.message === "Package added succesfully") {
        sheet.getRange(i + 1, 26).setValue("Synced");       // Z
        sheet.getRange(i + 1, 23).setValue("Colis ajouté"); // W
        sheet.getRange(i + 1, 24).setValue(returnedCode);   // X: Caledex code
      } else {
        sheet.getRange(i + 1, 22).setValue("HTTP " + httpCode); // V
        sheet.getRange(i + 1, 23).setValue(json.message || "Error"); // W
        sheet.getRange(i + 1, 24).setValue(returnedCode);          // X
      }

    } catch (e) {
      Logger.log("Row " + (i + 1) + " | Fetch Error: " + e.message);
      sheet.getRange(i + 1, 23).setValue("Fetch Error"); // W
      sheet.getRange(i + 1, 24).setValue("");            // X
    }
  }

  Logger.log("🏁 Caledex sheet sync completed");
}
