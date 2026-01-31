function addStockOrdersToColiatyFromSheet() {
  const publicKey = '48a8b8045a804e93643172fca9d0059a50c4c130e91b0dc194735aa89b53c2bf';
  const secretKey = '43fffd2b6657938221d23860a35878b5c0f96a0dd8c10d3723a6c64e10f77fdd';

  if (!publicKey || !secretKey) {
    throw new Error('❌ Missing COLIATY_API_PUBLIC or COLIATY_API_SECRET in script properties.');
  }

  const SHEET_NAME = "📦Géstion des Commandes";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const API_URL = "https://customer-api-v1.coliaty.com/parcel/stock";

  Logger.log("🔎 Total rows to check: " + (data.length - 1));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const customerName = row[4];   // E
    const phone        = row[5];   // F
    const city         = row[7];   // H
    const address      = row[8];   // I
    const productsStr  = row[10];  // K → "2 x SKU123 + 1 x SKU456"
    const price        = row[13];  // N
    const note         = row[15];  // P
    const status       = row[16];  // Q
    const carrier      = row[20];  // U
    const synced       = row[25];  // Z
    const warehouseId  = "3";  // AA – must contain valid warehouse ID (e.g., 3 for Casablanca)

    // Only process "Coliaty Stock" orders
    if (carrier !== "Coliaty Stock" || status !== "Confirmé" || synced === "Synced") {
      Logger.log(`⏩ Row ${i + 1} skipped`);
      continue;
    }

    if (!warehouseId || isNaN(Number(warehouseId))) {
      sheet.getRange(i + 1, 23).setValue("Missing or invalid warehouse_id");
      Logger.log(`❌ Row ${i + 1}: Missing warehouse_id`);
      continue;
    }

    // Parse products like: "2 x SKU123 + 1 x SKU456"
    let products = [];
    try {
      if (productsStr) {
        const parts = productsStr.split('+').map(p => p.trim());
        for (const part of parts) {
          const match = part.match(/^(\d+)\s*x\s*(\S+)$/i);
          if (match) {
            const quantity = parseInt(match[1], 10);
            const variant_sku = match[2].trim();
            if (quantity > 0 && variant_sku) {
              products.push({ variant_sku, quantity });
            }
          }
        }
      }
    } catch (e) {
      sheet.getRange(i + 1, 22).setValue("Parse Error");
      sheet.getRange(i + 1, 23).setValue("Invalid product format in K");
      Logger.log(`❌ Row ${i + 1}: Product parse error – ${e.message}`);
      continue;
    }

    if (products.length === 0) {
      sheet.getRange(i + 1, 22).setValue("No Products");
      sheet.getRange(i + 1, 23).setValue("No valid products found in K");
      Logger.log(`❌ Row ${i + 1}: No products parsed`);
      continue;
    }

    const payload = {
      package_reciever: String(customerName).trim(),
      package_phone: String(phone).replace(/\s+/g, ''),
      package_price: Number(price),
      package_addresse: String(address).trim(),
      package_city: String(city).trim(),
      package_no_open: false,
      package_replacement: false,
      warehouse_id: Number(warehouseId),
      products: products
      // Note: package_code is optional – Coliaty auto-generates if omitted
    };

    const options = {
      method: "POST",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + publicKey + ":" + secretKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(API_URL, options);
      const body = response.getContentText();
      Logger.log(`📦 Row ${i + 1} Response: ${body}`);

      let json;
      try {
        json = JSON.parse(body);
      } catch (err) {
        sheet.getRange(i + 1, 23).setValue(body);           // W
        continue;
      }

      if (json.success === true) {
        const trackingCode = json.data?.package_code || "N/A";
        const parcelId = json.data?.package_id || "N/A";

        sheet.getRange(i + 1, 23).setValue("Stock Parcel Created"); // W
        sheet.getRange(i + 1, 24).setValue(trackingCode);           // X
        sheet.getRange(i + 1, 26).setValue("Synced");               // Z

        Logger.log(`✔️ Row ${i + 1} synced → Tracking: ${trackingCode}`);
      } else {
        const errorMsg = json.message || json.error || "Unknown error";
        sheet.getRange(i + 1, 23).setValue(errorMsg); // W
        Logger.log(`❌ Row ${i + 1} FAILED: ${errorMsg}`);
      }

    } catch (e) {
      sheet.getRange(i + 1, 23).setValue(e.message); // W
      Logger.log(`❌ Row ${i + 1} ERROR: ${e.message}`);
    }
  }

  Logger.log("🏁 All stock rows processed for Coliaty");
}