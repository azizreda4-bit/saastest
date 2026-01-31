const CUSTOMER_ID_OZON = '56885';
const API_KEY_OZON = '006c32-2d7338-b8d03c-b59653-96455f';

function ozonExpressRequest(endpoint, method, data) {
  const url = `https://api.ozonexpress.ma/customers/${CUSTOMER_ID_OZON}/${API_KEY_OZON}/add-parcel`;
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    muteHttpExceptions: true,
    payload: data
  };

  const response = UrlFetchApp.fetch(url, options);
  const rawText = response.getContentText();
  Logger.log("API Response: " + rawText);

  // Sometimes API returns 2 JSON objects glued together → split on "}{"
  const parts = rawText.split(/}(?={)/).map((p, i, arr) =>
    i < arr.length - 1 ? p + "}" : p
  );

  // Parse only the first JSON (the one that matters)
  const result = JSON.parse(parts[0]);
  return result;
}


function addParcel(data, rowIndex) {
  const response = ozonExpressRequest('add-parcel', 'POST', data);
  Logger.log(response);

  if (response['ADD-PARCEL'] && response['ADD-PARCEL']['NEW-PARCEL']) {
    const newParcel = response['ADD-PARCEL']['NEW-PARCEL'];
    const trackingNumber = newParcel['TRACKING-NUMBER'];
    const deliveredPrice = newParcel['DELIVERED-PRICE'] || 0;
    const refusedPrice = newParcel['REFUSED-PRICE'] || 0;
    const returnedPrice = newParcel['RETURNED-PRICE'] || 0;
    const result = response['ADD-PARCEL']['RESULT'] || "UNKNOWN";

    Logger.log(`Tracking Number: ${trackingNumber}`);
    Logger.log(`Delivered Price: ${deliveredPrice}`);
    Logger.log(`Refused Price: ${refusedPrice}`);
    Logger.log(`Returned Price: ${returnedPrice}`);
    Logger.log(`Result: ${result}`);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');

    // Update the sheet with new values
    sheet.getRange(rowIndex + 1, 24).setValue(trackingNumber); // Tracking Number (Column Q)
    sheet.getRange(rowIndex + 1, 26).setValue("Synced");        // Synced (Column AD)

    Logger.log(`Updated row ${rowIndex + 1} with new parcel details.`);
  } else {
    Logger.log("Tracking number not found in response.");
  }
}




function getDataFromSheet3() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  const dataRange = sheet.getDataRange();
  const data = dataRange.getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Log the value found in Column S (Index 18)
    Logger.log(`Row ${i + 1}: Column S (20) value = ${row[20]}`);

    // Conditions:
    if (row[16] !== "Confirmé") continue; // K (Column 10) must be "Confirmé"
    if (row[20] !== "OzonExpress") continue; // S (Column 18) must be "OzonExpress"
    if (row[25] === "Synced") continue; // AD (Column 29) must NOT be "Synced"

    const productsArray = [
  { ref: String(row[19] || "").trim(), qnty: 1 }  // adjust if you store quantities separately
];

const parcelData = [
  `tracking-number=${encodeURIComponent(row[23] || '')}`,
  `parcel-receiver=${encodeURIComponent(row[4] || '')}`,
  `parcel-phone=${encodeURIComponent(row[5] || '')}`,
  `parcel-city=${encodeURIComponent(row[26] || '')}`,
  `parcel-address=${encodeURIComponent(row[8] || '')}`,
  `parcel-note=${encodeURIComponent(row[15] || '')}`,
  `parcel-price=${encodeURIComponent(row[13] || 0)}`,
  `parcel-nature=${encodeURIComponent((row[9] || "") + " / " + (row[10] || ""))}`,
  `parcel-stock=${encodeURIComponent(row[22] || 0)}`,
  `products=${encodeURIComponent(JSON.stringify(productsArray))}`
].join("&");


    Logger.log(`Sending data for row ${i + 1}: ${parcelData}`);
    addParcel(parcelData, i);
  }
}



function runOzon() {
  getDataFromSheet3();
}

// Fetch parcel info for any tracking number
function getParcelInfo(trackingNumber) {
  const data = `tracking-number=${trackingNumber}`;
  const response = ozonExpressRequest('parcel-info', 'POST', data);
  Logger.log(response);
}

// Fetch parcel info for a specific tracking number from the sheet
function fetchAddedParcel(trackingNumber) {
  getParcelInfo(trackingNumber);
}
