const TOKEN23 = 'bsrOve5B7EF26AuXJhnqQXpFaZBcS7AvETUv34HO';

function senditRequest23(endpoint, method, data) {
  const url = `https://app.sendit.ma/api/v1/deliveries`;
  const options = {
    method: method,
    headers: {
      'Authorization': `Bearer ${TOKEN23}`,
      'Content-Type': 'application/json',
    },
    muteHttpExceptions: true,
  };
  if (data) {
    options.payload = JSON.stringify(data);
  }

  const response = UrlFetchApp.fetch(url, options);
  Logger.log("API Response: " + response.getContentText());
  const result = JSON.parse(response.getContentText());
  return result;
}

function addDelivery23(data, rowIndex) {
  const response = senditRequest23('deliveries', 'POST', data);
  Logger.log("API Response: " + JSON.stringify(response));
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  
  if (response.success) {
    // Assuming response contains the trackingID, status, and price
    const trackingID = response.data.code || ''; // Use response data's 'code' for trackingID
    const status = response.data.status || ''; // Use 'status' from response
    const price = response.data.fee || ''; // Use 'fee' from response for price

    // Log the values being set
    Logger.log("TrackingID: " + trackingID);
    Logger.log("Status: " + status);
    Logger.log("Price: " + price);

    // Set values in respective columns (Tracking ID, Status, Price)
    sheet.getRange(rowIndex + 1, 24).setValue(trackingID); // Column 17 for trackingID
    sheet.getRange(rowIndex + 1, 23).setValue(status); // Column 18 for status
    

    // Set "Synced" in column AE (index 31)
    sheet.getRange(rowIndex + 1, 26).setValue("Synced");
  } else {
    Logger.log("Failed to add delivery.");
  }
}






function getDataFromSheet23() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  if (!sheet) {
    Logger.log('❌ Sheet "📦Géstion des Commandes" not found!');
    return;
  }

  const dataRange = sheet.getDataRange();
  const data = dataRange.getValues();

  for (let i = 1; i < data.length; i++) { // Skip header row
    const row = data[i];
    const rowIndex = i;

    const statusK = row[16]; // Column K (index 10)
    const statusAE = row[25]; // Column AE (index 30)
    const statusT = row[20]; // Column T (index 19)

    // ✅ First condition: If T is not "sendit", skip the row
    if (statusT !== "Sendit") {
      Logger.log(`⏭️ Row ${i + 1}: T is "${statusT}", skipping.`);
      continue;
    }

    // ✅ Second condition: If K is not "Confirmé", skip the row
    if (statusK !== "Confirmé") {
      Logger.log(`⏭️ Row ${i + 1}: K is "${statusK}", skipping.`);
      continue;
    }

    // ✅ Third condition: If AE is "synced", skip the row
    if (statusAE === "Synced") {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue;
    }

    // If all conditions pass, proceed with delivery processing
    Logger.log(`✅ Row ${i + 1}: Processing delivery...`);

    const deliveryData = {
      "pickup_district_id": "1",
      "district_id": row[26],
      "name": row[4],
      "amount": row[13].toString(),
      "address": row[8] + " " + row[26], // Concatenating address with additional info
      "phone": row[5],
      "comment": row[15],
      "reference": row[24],
      "allow_open": "1",
      "allow_try": "1",
      "products_from_stock": "0",
      "products": row[9] 
                ? row[10] 
                    ? encodeURIComponent(`${row[9]} / ${row[10]}`)
                    : encodeURIComponent(row[9])
                : ""
,
      "packaging_id": "1",
      "option_exchange": "0",
      "delivery_exchange_id": "0"
    };

    Logger.log(`📦 Sending data for Row ${i + 1}: ` + JSON.stringify(deliveryData));
    addDelivery23(deliveryData, rowIndex); // Process the row
  }
}
