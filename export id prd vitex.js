function exportVitexProductsToSheet() {
  const PHPSESSID = "74mkmq0g3vjin1g35svqcm9agr"; // your direct session
  const hubId = "2"; // hub ID you want to pull products from
  const sheetName = "Vitex Products"; // sheet to store the products

  const url = "https://vitex.ma/clients/parcels?action=get-hub-products";

  const options = {
    method: "post",
    payload: "hub_id=" + hubId + "&action=get-hub-products",
    contentType: "application/x-www-form-urlencoded; charset=UTF-8",
    headers: {
      "Cookie": "PHPSESSID=" + PHPSESSID,
      "X-Requested-With": "XMLHttpRequest"
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const html = response.getContentText();

  // Parse product IDs and names from HTML
  const regex = /data-variant-id="(\d+)"[\s\S]*?<div class="product-item-name">([\s\S]*?)<\/div>/g;
  const products = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const id = match[1];
    const name = match[2].trim();
    products.push([id, name]);
  }

  // Write to sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear(); // clear old data
  }

  sheet.getRange(1, 1, 1, 2).setValues([["Product ID", "Product Name"]]);
  if (products.length > 0) {
    sheet.getRange(2, 1, products.length, 2).setValues(products);
  }

  Logger.log(`✅ Exported ${products.length} products to sheet "${sheetName}"`);
}
