function addOrdersToDigylogFromSheet() {
  const apiUrl = "https://api.digylog.com/api/v2/seller/orders";
  const bearerToken = "Bearer your_token_here";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const recipient = row[4];   // Column A
    const phone = row[5];       // Column B
    const address = row[8];     // Column C
    const note = row[15];        // Column D
    const city = row[7];        // Column E
    const product = row[9];     // Column H
    const price = row[13];       // Column I
    const quantity = row[14];   // Column W

    const statusK = row[16];   // Column K
    const colisT = row[20];    // Column T
    const syncedAE = row[25];   // Column AE

    if (colisT !== "Digylog" || statusK !== "Confirmé" || syncedAE === "synced") {
      continue;
    }

    const orderNum = row[0]; // Column F (your internal order number maybe)

    const payload = {
      mode: 1,
      network: 1,
      store: "MCM",
      status: 0,
      orders: [
        {
          num: orderNum || `ORDER-${i}`,
          type: 1,
          name: recipient,
          phone: phone,
          address: address,
          city: city,
          price: price,
          openproduct: 0,
          port: 1,
          note: note,
          refs: [
            {
              designation: product,
              quantity: quantity
            }
          ]
        }
      ]
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: bearerToken,
        Referer: "https://apiseller.digylog.com"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(apiUrl, options);
      const body = response.getContentText();
      const result = JSON.parse(body);

      Logger.log(`📦 Row ${i + 1} Response Code: ${response.getResponseCode()}`);
      Logger.log(`📦 Row ${i + 1} Response Body: ${body}`);

      const orderResult = result[0];
      const tracking = orderResult.traking || "";
      const isSuccess = orderResult.isSuccess;
      const message = isSuccess ? "Success" : (orderResult.errors?.join(", ") || "Failed");

      sheet.getRange(i + 1, 24).setValue(tracking);   // Column R
      sheet.getRange(i + 1, 23).setValue(message);    // Column S

      if (isSuccess) {
        sheet.getRange(i + 1, 26).setValue("synced"); // Column AE
      }

    } catch (e) {
      Logger.log(`❌ Row ${i + 1} Error: ${e.message}`);
      sheet.getRange(i + 1, 23).setValue("Error");
      sheet.getRange(i + 1, 24).setValue(e.message);
    }
  }
}
