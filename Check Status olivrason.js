const API_KEY02 = 'api-U2FsdGVkX18meuFvD5kqlCOiF8mH3AiVM4FZYpzzRXbJo9ipExG+fZx80qZOc30qqzZpgKxqf3mptmzkxcGYrA==';
const SECRET_KEY02 = 'U2FsdGVkX1934hSo2T0xh2o1rKpHUiHhSqMbSp+Q8g01YiBl1lF0H2JWklB9P0gYngv3O0y9DcjvhXYvYhJ00i679uNHhLjHGYygo8ZcOhd3Q1bnRVHGl56587meOT5B4dqCZ9rbzXKunIgVKx1wbYibyqnA7gMaiMHNuz3N4QQzwp2uLUindMxWHHRwQgMsKTds5pgRR6ZjYa+8icBxpQ==';

/**
 * 1️⃣ Get Token from Olivraison API
 */
function getToken() {
  const url = 'https://partners.olivraison.com/auth/login';
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify({
      apiKey: API_KEY02,
      secretKey: SECRET_KEY02,
    }),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const text = response.getContentText();
    const result = JSON.parse(text);

    Logger.log("🔑 Token Response: " + text);

    if (result && result.token) {
      return result.token;
    } else {
      Logger.log("❌ Token not found in response");
      return null;
    }
  } catch (e) {
    Logger.log("⚠️ Error while getting token: " + e.message);
    return null;
  }
}

/**
 * 2️⃣ Get delivery status for a single tracking ID
 */
function getDeliveryStatus(trackingID, token) {
  const url = `https://partners.olivraison.com/package/${trackingID}`;
  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const text = response.getContentText();
    const statusCode = response.getResponseCode();

    Logger.log(`📦 API Response (${statusCode}) for ${trackingID}: ${text}`);

    if (statusCode === 200) {
      return JSON.parse(text);
    } else {
      return { status: `Error ${statusCode}` };
    }

  } catch (e) {
    Logger.log(`⚠️ Error fetching status for ${trackingID}: ${e}`);
    return null;
  }
}

/**
 * 3️⃣ Check Delivery Status for all "Olivraison" orders
 */
function checkDeliveryStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📦Géstion des Commandes" not found!');
    return;
  }

  const token = getToken();
  if (!token) {
    Logger.log("❌ Could not retrieve API token, stopping script.");
    return;
  }

  const data = sheet.getDataRange().getValues();

  // Adjust these column indexes based on your actual sheet:
  const colOlivraison = 20; // Column U (21st column)
  const colStatus = 22;     // Column W (23rd column)
  const colTracking = 23;   // Column X (24th column)

  for (let i = 1; i < data.length; i++) {
    const olivraisonU = data[i][colOlivraison];
    const trackingID = data[i][colTracking];
    const currentStatus = data[i][colStatus];

    if (olivraisonU !== "Olivraison") {
      continue;
    }

    if (!trackingID) {
      Logger.log(`⏭️ Row ${i + 1}: No Tracking ID, skipping.`);
      continue;
    }

    const response = getDeliveryStatus(trackingID, token);

    if (response && response.status) {
      sheet.getRange(i + 1, colStatus + 1).setValue(response.status); // +1 for 1-indexed sheet
      Logger.log(`✅ Row ${i + 1}: Updated status = ${response.status}`);
    } else {
      Logger.log(`❌ Row ${i + 1}: Failed to get status`);
    }
  }

  Logger.log("🏁 Delivery status check completed!");
}
