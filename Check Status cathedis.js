function checkDeliveriesStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📦Géstion des Commandes" not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();

  let jsessionId;
  try {
    jsessionId = getCathedisSessionId(); // ✅ Get fresh session ID
    Logger.log('✅ Using session: ' + jsessionId);
  } catch (error) {
    Logger.log('❌ Failed to authenticate: ' + error.message);
    return;
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const provider = row[20]; // Column T
    const deliveryId = row[23]; // Column R

    if (!provider || provider.toLowerCase() !== "cathedis") continue;
    if (!deliveryId) continue;

    const url = `https://api.cathedis.delivery/ws/rest/com.tracker.delivery.db.Delivery/${deliveryId}/fetch`;

    const payload = {
      "fields": [
        "nomOrder", "importOrigin", "allowOpening", "city.name", "subject",
        "paymentType.code", "id", "caution", "sector.name", "declaredValue",
        "selected", "amount", "rangeWeight", "address", "deliveryType.code",
        "length", "weight", "version", "tags", "deliveryChangedId", "depth",
        "importId", "notificationPhoneNumbers", "phone", "recipient.name",
        "width", "comment", "fragile", "packageCount", "deliveryStatus.type",
        "status"
      ]
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      headers: {
        'Cookie': jsessionId,
        'Accept': 'application/json'
      }
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const code = response.getResponseCode();
      const text = response.getContentText();

      Logger.log(`📦 Row ${i + 1} Response Code: ${code}`);
      Logger.log(`📦 Row ${i + 1} Response Body: ${text}`);

      if (code === 200) {
        const result = JSON.parse(text);
        const deliveryStatus = result.data[0]?.deliveryStatus?.name || 'Unknown';
        sheet.getRange(i + 1, 23).setValue(deliveryStatus); // Column S
        Logger.log(`✅ Row ${i + 1}: Status = ${deliveryStatus}`);
      } else {
        sheet.getRange(i + 1, 23).setValue(`Error: ${code}`);
      }
    } catch (e) {
      Logger.log(`❌ Row ${i + 1}: Exception - ${e.message}`);
      sheet.getRange(i + 1, 23).setValue('Error');
    }
  }
}

function getCathedisSessionId() {
  const url = 'https://api.cathedis.delivery/login.jsp';

  const payload = {
    username: 'arrobel', // ✅ Replace with valid login
    password: '4j3EMw5d'
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const allHeaders = response.getAllHeaders();
  let setCookie = allHeaders['Set-Cookie'] || allHeaders['set-cookie'];

  if (Array.isArray(setCookie)) {
    setCookie = setCookie.join('; ');
  }

  if (typeof setCookie === 'string') {
    const match = setCookie.match(/JSESSIONID=([^;]+)/);
    if (match && match[0]) {
      return match[0]; // e.g., JSESSIONID=xxxxxx
    }
  }

  throw new Error('❌ Failed to retrieve JSESSIONID');
}
