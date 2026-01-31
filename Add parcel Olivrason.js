const API_KEY = 'api-U2FsdGVkX18meuFvD5kqlCOiF8mH3AiVM4FZYpzzRXbJo9ipExG+fZx80qZOc30qqzZpgKxqf3mptmzkxcGYrA==';
const SECRET_KEY = 'U2FsdGVkX1934hSo2T0xh2o1rKpHUiHhSqMbSp+Q8g01YiBl1lF0H2JWklB9P0gYngv3O0y9DcjvhXYvYhJ00i679uNHhLjHGYygo8ZcOhd3Q1bnRVHGl56587meOT5B4dqCZ9rbzXKunIgVKx1wbYibyqnA7gMaiMHNuz3N4QQzwp2uLUindMxWHHRwQgMsKTds5pgRR6ZjYa+8icBxpQ==';

function getToken() {
  const url = 'https://partners.olivraison.com/auth/login';
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify({
      apiKey: API_KEY,
      secretKey: SECRET_KEY,
    }),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  Logger.log("Full Response: " + response.getContentText());

  try {
    const result = JSON.parse(response.getContentText());
    Logger.log("Token Response: " + JSON.stringify(result));
    return result.token;
  } catch (e) {
    Logger.log("Error: " + e.message);
    return null;
  }
}

function senditRequest(endpoint, method, data) {
  const token = getToken(); // Move it here
  const url = `https://partners.olivraison.com/${endpoint}`;
  const options = {
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    muteHttpExceptions: true,
  };
  if (data) {
    options.payload = JSON.stringify(data);
  }

  const response = UrlFetchApp.fetch(url, options);
  Logger.log("API Response: " + response.getContentText());
  return JSON.parse(response.getContentText());
}




function addDelivery(data, rowIndex) {
  const response = senditRequest('package', 'POST', data);
  Logger.log(response);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');

  if (response && response.status) {
    sheet.getRange(rowIndex + 1, 24).setValue(response.trackingID); // Column 18: Tracking ID
    sheet.getRange(rowIndex + 1, 23).setValue(response.status); // Column 19: Status
    

    // ✅ Set "synced" in Column AE (index 31)
    sheet.getRange(rowIndex + 1, 26).setValue("Synced");
  } else {
    Logger.log(`❌ Failed to add delivery for row ${rowIndex + 1}.`);
  }
}

function getDataFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📦Géstion des Commandes" not found!');
    return;
  }

  const dataRange = sheet.getDataRange();
  const data = dataRange.getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const statusQ = row[16]; // Column K (index 10)
    const syncedAE = row[25]; // Column AE (index 30)
    const OlivraisonU = row[20]; // Column T (index 19)

    // ✅ First condition: If AB is not "olivraison", skip the row
    if (OlivraisonU !== "Olivraison") {
      Logger.log(`⏭️ Row ${i + 1}: U is "${OlivraisonU}", skipping.`);
      continue;
    }

    // ✅ Second condition: If AA is NOT "Confirmé", skip it
    if (statusQ !== "Confirmé") {
      Logger.log(`⏭️ Row ${i + 1}: Q is "${statusQ}", skipping.`);
      continue;
    }

    // ✅ Third condition: If AE is "Synced", skip it
    if (syncedAE === "Synced") {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue;
    }

    // ✅ If T is "Olivraison", Q is "Confirmé", and AE is not "Synced", proceed with adding delivery
    Logger.log(`✅ Row ${i + 1}: Processing delivery...`);

    const deliveryData = {
      "price": row[13].toString(),
      "comment": row[15],
      description: row[10] ? `${row[9]} / ${row[10]}` : row[9],
      "inventory": "true",
      "name": row[4],
      "destination": {
        "name": row[4],
        "phone": row[5].toString(),
        "city": row[7],
        "streetAddress": row[8]
      }
    };

    Logger.log(`📦 Sending data for row ${i + 1}: ${JSON.stringify(deliveryData)}`);
    addDelivery(deliveryData, i);
  }
}
