function exportSenditEmballages_DIRECT() {

  // 🔧 CONFIG (INSIDE FUNCTION)
  const SENDIT_PUBLIC_KEY = 'ca6aea8f6494d158c369ae34e5dbf57d';
  const SENDIT_SECRET_KEY = 'MhJL0JQrrJ6INyhDyksQfKyZuzmZfnLD';
  const BASE_URL = 'https://app.sendit.ma/api/v1';
  const SHEET_NAME = 'EMBALAGESENDIT';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  sheet.clear();
  sheet.appendRow([
    'ID',
    'Code',
    'Reference',
    'Name',
    'Type',
    'Size',
    'Buying Price'
  ]);

  // 🔐 LOGIN
  const loginResponse = UrlFetchApp.fetch(`${BASE_URL}/login`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      public_key: SENDIT_PUBLIC_KEY,
      secret_key: SENDIT_SECRET_KEY
    }),
    muteHttpExceptions: true
  });

  const loginResult = JSON.parse(loginResponse.getContentText());

  if (!loginResult.success || !loginResult.data || !loginResult.data.token) {
    throw new Error('❌ Sendit login failed');
  }

  const token = loginResult.data.token;

  // 📦 FETCH EMBALLAGES (WITH PAGINATION)
  let page = 1;
  let lastPage = 1;

  do {
    const response = UrlFetchApp.fetch(`${BASE_URL}/packagings?page=${page}`, {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json'
      },
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (!result.success) {
      throw new Error('❌ Error fetching packagings on page ' + page);
    }

    lastPage = result.last_page;

    result.data.forEach(p => {
      sheet.appendRow([
        p.id || '',
        p.code || '',
        p.reference || '',
        p.name || '',
        p.type || '',
        p.size || '',
        p.buying_price || ''
      ]);
    });

    page++;
  } while (page <= lastPage);

  Logger.log('✅ Emballages exported successfully');
}
