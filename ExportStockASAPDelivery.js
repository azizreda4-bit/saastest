

function parseASAPStocksToSheet() {
  const URL = "https://app.asapdelivery.ma/inc/stocks.php";
  const PHPSESSID = "2a42f4c16856d19a4035318f04efea11"; // Replace with your PHPSESSID

  const payload = {
    state: 1,
    keyword: "",
    client: "",
    datestart: "",
    dateend: "",
    start: 0,
    nbpage: 250,
    sortby: "",
    orderby: "DESC",
    action: "loadstocks"
  };

  const options = {
    method: "post",
    payload: payload,
    headers: {
      "Cookie": `PHPSESSID=${PHPSESSID}`,
      "X-Requested-With": "XMLHttpRequest",
      "Referer": "https://app.asapdelivery.ma/stocks.php"
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(URL, options);
  const html = response.getContentText();

  // Extract rows from table
  const rowRegex = /<tr>\s*<td>.*?value="(\d+)".*?<td><span>(.*?)<\/span><\/td>\s*<td><span>(.*?)<\/span><\/td>\s*<td><span>(.*?)<\/span><\/td>\s*<td><span>(.*?)<\/span><\/td>\s*<td><a.*?>(\d+)<a>/gms;
  let match;
  const data = [];

  while ((match = rowRegex.exec(html)) !== null) {
    data.push([
      match[1], // stock ID
      match[2], // Ville
      match[3], // Produits
      match[4], // Référence
      match[5], // Qté globale
      match[6]  // Qté sortie
    ]);
  }

  // Write to sheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("StockASAP");
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 6).setValues([["StockID","Ville","Produit","Référence","Qté globale","Qté sortie"]]);
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, 6).setValues(data);
  }

  Logger.log(`✅ ${data.length} stock rows imported.`);
}
