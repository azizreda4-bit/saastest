function addSpeedafOrdersFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  if (!sheet) {
    Logger.log("❌ Sheet '📦Géstion des Commandes' not found!");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const apiUrl = "https://speedaf.com/oms/order/add";
  const token = "cab15cf0-3f6c-4473-be1e-7748ec365d17"; // Replace with your token

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[10]; // Column K
    const synced = row[30]; // Column AE
    const carrier = row[19]; // Column T

    if (carrier !== "speedaf") {
      Logger.log(`⏭️ Row ${i + 1}: Not Speedaf, skipping.`);
      continue;
    }
    if (status !== "Confirmé") {
      Logger.log(`⏭️ Row ${i + 1}: Not confirmed, skipping.`);
      continue;
    }
    if (synced === "synced") {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue;
    }

    const senderReceiverTemplate = {
      address: row[9],
      areaCode: "MAA00595",
      areaName: "Ain Chock",
      areaNumber: "+212",
      cityCode: "MAC00070",
      cityName: row[3],
      company: "reda",
      countryCode: "MA",
      countryName: "",
      email: row[24],
      name: row[1],
      provinceCode: "MAR00002",
      provinceName: "Casablanca-Settat",
      telephone: row[1],
      pca: ["MAR00002", "MAC00070", "MAA00595"]
    };

    const payload = {
      sender: senderReceiverTemplate,
      receiver: senderReceiverTemplate,
      receivingTimeRange: "2",
      goodsType: "IT01",
      goodsNumber: 1,
      orderWeight: 1,
      orderType: 1,
      pickUpType: 1,
      orderSource: "O-WEB",
      remark: row[3] || "",
      goodsPayment: Number(row[7]) || 0,
      insuranceAmount: 1,
      addOrderGoodsList: [{
        goodsNameEN: row[7] || "Item",
        goodsNumber: 1,
        goodsWeight: 1,
        height: 10,
        length: 10,
        width: 10
      }]
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: {
        Authorization: token,
        token: token,
        lang: "en_US",
        version: "1.0.0"
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(apiUrl, options);
      const result = JSON.parse(response.getContentText());

      Logger.log(`📦 Response Row ${i + 1}: ${JSON.stringify(result, null, 2)}`);

      if (result.success) {
        sheet.getRange(i + 1, 31).setValue("synced"); // Mark as synced
        Logger.log(`✅ Row ${i + 1}: Order synced.`);
      } else {
        Logger.log(`❌ Row ${i + 1}: Error - ${JSON.stringify(result.error)}`);
      }
    } catch (e) {
      Logger.log(`⚠️ Row ${i + 1}: Exception - ${e.message}`);
    }
  }
}
