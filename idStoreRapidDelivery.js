const TOKEN = "1445229|x35nWaZjKKOwTxgl0DsYdYCbGJePHS097AlD1nZX";

function saveRapidDeliveryShopsAPIToSheet() {
  const shops = getRapidDeliveryShopsAPI();
  if (!shops) return;

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("idrapidelivery")
    || ss.insertSheet("RapidDelivery Shops");

  sheet.clear();
  sheet.appendRow(["Shop ID", "Shop Name", "Phone", "Open Parcel"]);

  shops.forEach(s => {
    sheet.appendRow([
      s.key,
      s.name,
      s.phone || "",
      s.allow_opening_parcels
    ]);
  });

  Logger.log("✅ Shops saved to Google Sheet");
}
function getRapidDeliveryShopsAPI() {
  const url = "https://www.rapiddelivery.ma/api/v1/shops";

  const options = {
    method: "get",
    headers: {
      "Authorization": "Bearer " + TOKEN,
      "Accept": "application/json"
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const body = response.getContentText();

  if (code !== 200) {
    Logger.log("❌ Error " + code + ": " + body);
    return;
  }

  const shops = JSON.parse(body);
  Logger.log("✅ Shops fetched: " + shops.length);

  shops.forEach(s => {
    Logger.log(`${s.key} | ${s.name} | ${s.phone}`);
  });

  return shops;
}


