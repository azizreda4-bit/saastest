function addParcelsToCathedis() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  if (!sheet) {
    Logger.log("❌ Sheet '📦Géstion des Commandes' not found!");
    return;
  }

  var data = sheet.getDataRange().getValues();
  var username = "arrobel";
  var password = "4j3EMw5d";

  for (var i = 1; i < data.length; i++) { // Skip header row
    var row = data[i];
    var statusK = row[16]; // Column K
    var syncedAE = row[25]; // Column AE
    var cathedisT = row[20]; // Column T

    if (cathedisT !== "Cathedis") {
      Logger.log(`⏭️ Row ${i + 1}: Not marked for Cathedis, skipping.`);
      continue;
    }
    if (statusK !== "Confirmé") {
      Logger.log(`⏭️ Row ${i + 1}: Status not 'Confirmé', skipping.`);
      continue;
    }
    if (syncedAE === "synced") {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue;
    }

    try {
      var jsessionId = authenticate(username, password);
      Logger.log(`🔑 Row ${i + 1}: Authentication successful`);

      // ✅ Prepare delivery data
      var deliveryData = {
        "recipient": String(row[4]).trim(),           // Column B
        "phone": formatPhone(row[5]),                 // Column C
        "city": String(row[7]).trim() || "Casablanca",// Column D
        "sector": String(row[8]).trim() || "Centre Ville", // Column J
        "address": String(row[8]).trim() || "Adresse non fournie", // Column C
        "amount": String(row[13] || "0.00"),           // Column H
        "nomOrder": String(row[0] || ""),            // Column Q
        "comment": String(row[15] || ""),              // Column N
        "subject": String(row[9] || ""),              // Column E
        "rangeWeight": getWeightRange(row[28]),        // Column U
        "paymentType": "ESPECES",
        "deliveryType": "Livraison CRBT",
        "packageCount": "1"
      };

      Logger.log(`📨 Row ${i + 1} - Sending delivery data:\n` + JSON.stringify(deliveryData, null, 2));

      var result = createDelivery(jsessionId, deliveryData);
      Logger.log(`📡 Cathedis API Response (${result.status}): ${JSON.stringify(result)}`);

      if (result.status === 0 && result.data[0].values && result.data[0].values.delivery) {
        var deliveryId = result.data[0].values.delivery.id;
        sheet.getRange(i + 1, 24).setValue(deliveryId); // Column R
        sheet.getRange(i + 1, 26).setValue("synced");   // Column AE
        Logger.log(`✅ Row ${i + 1}: Delivery ${deliveryId} created successfully`);
      } else {
        let errorMsg = (result.data && result.data[0].error && result.data[0].error.message) || "Unknown error";
        Logger.log(`❌ Row ${i + 1}: Delivery failed - ${errorMsg}`);
        sheet.getRange(i + 1, 26).setValue("error");
      }
    } catch (error) {
      Logger.log(`⚠️ Row ${i + 1}: Error - ${error.message}`);
      sheet.getRange(i + 1, 26).setValue("error");
    }
  }
}

// --- 🔧 Helper Functions ---

function formatPhone(phone) {
  phone = phone.toString().trim();
  if (phone.startsWith("0")) {
    return phone.replace(/^0/, "+212");
  }
  if (!phone.startsWith("+212")) {
    return "+212" + phone;
  }
  return phone;
}

function getWeightRange(weight) {
  weight = parseFloat(weight) || 0;
  if (weight <= 5) return "Entre 1.2 Kg et 5 Kg";
  if (weight <= 10) return "Entre 6Kg et 10Kg";
  if (weight <= 29) return "Entre 11Kg et 29Kg";
  return "Plus de 30Kg";
}

function authenticate(username, password) {
  var url = 'https://api.cathedis.delivery/login.jsp';
  var payload = {
    username: username,
    password: password
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    followRedirects: false
  };

  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();

  if (responseCode >= 200 && responseCode < 400) {
    var headers = response.getAllHeaders();
    var cookies = headers['Set-Cookie'];
    if (!cookies) throw new Error('No cookies in response');
    if (typeof cookies === 'string') cookies = [cookies];

    for (var i = 0; i < cookies.length; i++) {
      var match = cookies[i].match(/JSESSIONID=([^;]+)/);
      if (match) return 'JSESSIONID=' + match[1];
    }
    throw new Error('JSESSIONID not found');
  } else {
    throw new Error('HTTP Error: ' + responseCode);
  }
}

function createDelivery(jsessionId, deliveryData) {
  var url = 'https://api.cathedis.delivery/ws/action';
  var payload = {
    "action": "delivery.api.save",
    "data": {
      "context": {
        "delivery": deliveryData
      }
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Cookie': jsessionId
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}
