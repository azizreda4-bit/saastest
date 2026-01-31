

const SENDIT_PUBLIC_KEY = 'ca6aea8f6494d158c369ae34e5dbf57d';
const SENDIT_SECRET_KEY = 'MhJL0JQrrJ6INyhDyksQfKyZuzmZfnLD';
const BASE_URL = 'https://app.sendit.ma/api/v1';
const PRODUCT_SHEET = '📦Produits Sendit';

function senditGetToken() {
  const url = `${BASE_URL}/login`;

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      public_key: SENDIT_PUBLIC_KEY,
      secret_key: SENDIT_SECRET_KEY
    }),
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText());

  if (!result.success || !result.data || !result.data.token) {
    throw new Error('❌ SENDIT authentication failed');
  }

  return result.data.token;
}


function senditRequest(endpoint, token) {
  const response = UrlFetchApp.fetch(`${BASE_URL}${endpoint}`, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    },
    muteHttpExceptions: true
  });

  return JSON.parse(response.getContentText());
}


function exportSenditProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PRODUCT_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(PRODUCT_SHEET);
  }

  // Clear old data
  sheet.clear();

  // Headers
  sheet.getRange(1, 1, 1, 8).setValues([[
    'ID',
    'Code',
    'Reference',
    'Name',
    'Price',
    'Quantity',
    'Active',
    'Quantity to Prepare'
  ]]);

  const token = senditGetToken();

  let page = 1;
  let rowIndex = 2;

  while (true) {
    const result = senditRequest(`/products?page=${page}`, token);

    if (!result.success || !result.data || result.data.length === 0) {
      Logger.log('✅ No more products');
      break;
    }

    const rows = result.data.map(p => [
      p.id,
      p.code,
      p.reference,
      p.name,
      p.price,
      p.quantity,
      p.active,
      p.quantity_to_prepare
    ]);

    sheet.getRange(rowIndex, 1, rows.length, rows[0].length).setValues(rows);
    rowIndex += rows.length;

    if (page >= result.last_page) break;
    page++;
  }

  Logger.log('🎉 SENDIT products exported successfully!');
}
