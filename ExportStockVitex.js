function exportVitexInventoryWithLogin() {

  // ==========================
  // 1️⃣ LOGIN CONFIG
  // ==========================
  const SHEET_NAME = 'Vitex Stock';

  const loginEmail = 'Samir.choujaa1997@gmail.com';
  const loginPassword = '12345678';
  const loginUrl = 'https://vitex.ma/clients/login?action=login';

  const loginPayload = {
    action: 'login',
    login_customers_email: loginEmail,
    login_customers_password: loginPassword
  };

  const loginOptions = {
    method: 'post',
    payload: loginPayload,
    followRedirects: false,
    muteHttpExceptions: true
  };

  const loginResponse = UrlFetchApp.fetch(loginUrl, loginOptions);
  const headers = loginResponse.getAllHeaders();

  let PHPSESSID = '';
  let setCookie = headers['Set-Cookie'] || headers['set-cookie'];

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

  // Fallback (redirect login)
  if (!PHPSESSID) {
    const loginResponse2 = UrlFetchApp.fetch(loginUrl, {
      method: 'post',
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
    throw new Error('❌ Login failed: PHPSESSID not found');
  }

  Logger.log('✅ Logged in, PHPSESSID: ' + PHPSESSID);

  // ==========================
  // 2️⃣ INVENTORY REQUEST
  // ==========================
  const inventoryUrl = 'https://vitex.ma/clients/inventory?action=inventory-json';

  const payload =
    'action=inventory-json' +
    '&draw=1' +
    '&start=0' +
    '&length=1000' +
    '&search[value]=' +
    '&search[regex]=false';

  const options = {
    method: 'post',
    payload: payload,
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    headers: {
      'Cookie': 'PHPSESSID=' + PHPSESSID,
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(inventoryUrl, options);
  const json = JSON.parse(response.getContentText());

  if (!json.aaData) {
    throw new Error('❌ Inventory data not found');
  }

  // ==========================
  // 3️⃣ EXPORT TO SHEET
  // ==========================
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  sheet.clear();
  sheet.appendRow([
    'Product ID',
    'Product Name',
    'Hub',
    'Stock IN',
    'Stock OUT'
  ]);

  json.aaData.forEach(row => {
    sheet.appendRow([
      row.DT_RowId.replace('inventory-', ''),
      cleanHTML(row.PRD_NAME),
      row.PRD_HUB,
      extractNumber(row.PRD_STOCKIN),
      extractInputValue(row.PRD_STOCKOUT)
    ]);
  });

  sheet.autoResizeColumns(1, 5);

  Logger.log('✅ Inventory exported successfully');
}

// ==========================
// HELPERS (DO NOT DELETE)
// ==========================

function cleanHTML(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNumber(html) {
  if (!html) return 0;
  const match = html.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function extractInputValue(html) {
  if (!html) return 0;
  const match = html.match(/value="(\d+)"/);
  return match ? Number(match[1]) : 0;
}
