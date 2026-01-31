function addFcOrdersToDigylogFromSheet() {
  const apiUrlBase = "https://api.digylog.com/api/v2/seller";
  const apiUrlOrders = apiUrlBase + "/orders";
  const apiUrlFcs = apiUrlBase + "/fc"; // Endpoint for fetching FCs
  const apiUrlStores = apiUrlBase + "/stores"; // Endpoint for fetching stores

  // IMPORTANT: It's highly recommended to store sensitive data like tokens securely, e.g., using PropertiesService.
  const bearerToken = "Bearer your_token_here";

  // --- Fetch and Cache FCs ---
  let fcsMap = {}; // Map { fcName: fcId, ... }
  try {
    const fcsResponse = UrlFetchApp.fetch(apiUrlFcs, {
      method: "GET",
      headers: {
        "Authorization": bearerToken,
        "Referer": "https://apiseller.digylog.com",
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    });

    const fcsResponseCode = fcsResponse.getResponseCode();
    if (fcsResponseCode >= 200 && fcsResponseCode < 300) {
      const fcsResult = JSON.parse(fcsResponse.getContentText());
      if (Array.isArray(fcsResult)) {
        fcsResult.forEach(fc => {
          if (fc.name && fc.id) {
            fcsMap[fc.name] = fc.id; // Populate the map
          }
        });
        Logger.log(`Fetched ${Object.keys(fcsMap).length} FCs from API.`);
      } else {
        Logger.log("Error: /fc API did not return an array. Check API response.");
        return; // Stop script if FCs can't be fetched
      }
    } else {
      Logger.log(`Error fetching FCs: HTTP ${fcsResponseCode}, Body: ${fcsResponse.getContentText()}`);
      return; // Stop script if FCs can't be fetched
    }
  } catch (e) {
    Logger.log(`Error during /fc fetch: ${e.message}`);
    return; // Stop script if FCs can't be fetched
  }
  // --- End Fetch FCs ---

  // --- Fetch and Cache Stores (assuming you still use store names) ---
  let storesMap = {}; // Map { storeName: storeId, ... }
  try {
    const storesResponse = UrlFetchApp.fetch(apiUrlStores, {
      method: "GET",
      headers: {
        "Authorization": bearerToken,
        "Referer": "https://apiseller.digylog.com",
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    });

    const storesResponseCode = storesResponse.getResponseCode();
    if (storesResponseCode >= 200 && storesResponseCode < 300) {
      const storesResult = JSON.parse(storesResponse.getContentText());
      if (Array.isArray(storesResult)) {
        storesResult.forEach(store => {
          if (store.name && store.id) {
            storesMap[store.name] = store.id; // Populate the map
          }
        });
        Logger.log(`Fetched ${Object.keys(storesMap).length} stores from API.`);
      } else {
        Logger.log("Error: /stores API did not return an array. Check API response.");
        // You might choose to continue if stores are optional or handle differently
        // For now, returning as store lookup was previously required
        return;
      }
    } else {
      Logger.log(`Error fetching stores: HTTP ${storesResponseCode}, Body: ${storesResponse.getContentText()}`);
      return; // Stop script if stores can't be fetched
    }
  } catch (e) {
    Logger.log(`Error during /stores fetch: ${e.message}`);
    return; // Stop script if stores can't be fetched
  }
  // --- End Fetch Stores ---


  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes"); // Adjust sheet name if needed
  const data = sheet.getDataRange().getValues();



  for (let i = 1; i < data.length; i++) { // Start from row 1 to skip headers
    const row = data[i];

    // Update these indices based on your sheet layout for FC orders
    const recipient = row[4];   // Example: Col E
    const phone = row[5];       // Example: Col F
    const address = row[8];     // Example: Col I
    const note = row[15];       // Example: Col P
    const city = row[7];        // Example: Col H
    // CRITICAL CHANGE: Now expecting the PRODUCT REFERENCE (ref) from the FC's inventory
    const productRef = row[24];  // Example: Col Y (This MUST be the ref code for the FC)
    const price = row[13];      // Example: Col N
    const quantity = row[14];   // Example: Col O
    const orderNum = row[0];    // Example: Col A
    const storeName = row[31];  // Example: Col V (Originating store name)
    // NEW: Get FC name from the sheet
    const fcName = "FULFILMENT CENTER AGADIR";     

    const statusK = row[16];    // Example: Col Q
    const colisT = row[20];     // Example: Col U
    const syncedAE = row[25];   // Example: Col Z


    // Check conditions before processing (adjust as needed)
    if (!storeName || !fcName || colisT !== "Digylog" || statusK !== "Confirmé" || syncedAE === "synced") {
      Logger.log(`⏭️ Row ${i + 1}: Already synced, skipping.`);
      continue; // Skip this row if conditions are not met or store/FC name is missing
    }

    // Look up store ID from the fetched map
    const storeId = storesMap[storeName];
    if (!storeId) {
       Logger.log(`❌ Row ${i + 1} Store name '${storeName}' not found in API list, skipping.`);
       sheet.getRange(i + 1, 23).setValue(`Store Not Found: ${storeName}`); // Assuming Col AC (index 27)
       continue;
    }

    // Look up FC ID from the fetched map
    const fcId = fcsMap[fcName];
    if (!fcId) {
       Logger.log(`❌ Row ${i + 1} FC name '${fcName}' not found in API list, skipping.`);
       sheet.getRange(i + 1, 23).setValue(`FC Not Found: ${fcName}`); // Assuming Col AC (index 27)
       continue;
    }

    // Validate required fields before sending request
    if (!recipient || !phone || !address || !city || !productRef || quantity == null || quantity === "" || !orderNum) {
       Logger.log(`❌ Row ${i + 1} Missing required data (especially productRef), skipping.`);
       sheet.getRange(i + 1, 23).setValue("Missing Data (Ref)"); // Assuming Col AC (index 27)
       continue;
    }

    // Ensure phone number format is correct (10 digits starting with 05, 06, 07, or 08)
    const phoneRegex = /^(05|06|07|08)\d{8}$/;
    if (!phoneRegex.test(phone)) {
       Logger.log(`❌ Row ${i + 1} Invalid phone number format: ${phone}`);
       sheet.getRange(i + 1, 23).setValue("Invalid Phone"); // Assuming Col AC (index 27)
       continue;
    }

    // Ensure price and quantity are numbers
    const numericPrice = parseFloat(price);
    const numericQuantity = parseInt(quantity, 10);
    if (isNaN(numericPrice) || isNaN(numericQuantity)) {
       Logger.log(`❌ Row ${i + 1} Invalid price (${price}) or quantity (${quantity}), skipping.`);
       sheet.getRange(i + 1, 23).setValue("Invalid Price/Qty"); // Assuming Col AC (index 27)
       continue;
    }


    // Prepare the payload for FC order (mode: 2)
    const payload = {
      mode: 2, // FC order
      // CRITICAL CHANGE: Use 'fc' ID instead of 'network' ID
      fc: fcId, // Use the looked-up FC ID
      // Store name is still required
      store: storeName, // Use the looked-up store name
      status: 0, // Add but do not send immediately (adjust if needed)
      orders: [
        {
          num: orderNum || `FC_ORDER-${i}`,
          type: 1, // Normal delivery (adjust if it's an exchange, type: 2)
          name: recipient,
          phone: phone,
          address: address,
          city: city,
          price: numericPrice,
          openproduct: 0, // Default 0
          // CRITICAL CHANGE: Default port to 2 (Seller pays internal FC costs) for FC orders
          port: 1, // Adjust to 1 if customer pays internal FC fee
          note: note || "",
          refs: [
            {
              // CRITICAL CHANGE: Use 'ref' (product reference from FC inventory) for mode 2
              ref: productRef, // This is the critical field for FC orders
              quantity: numericQuantity
            }
            // If you have multiple products in one order, add more objects here:
            // { ref: "ANOTHER_REF_CODE", quantity: 2 }
          ]
        }
      ]
    };

    const options = {
      method: "POST",
      contentType: "application/json",
      headers: {
        "Authorization": bearerToken,
        "Referer": "https://apiseller.digylog.com",
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(apiUrlOrders, options);
      const responseCode = response.getResponseCode();
      const responseBody = response.getContentText();

      Logger.log(`📦 FC Row ${i + 1} API Response Code: ${responseCode}`);
      Logger.log(`📦 FC Row ${i + 1} API Response Body: ${responseBody}`);

      let tracking = "";
      let statusMessage = "Request Failed (HTTP Code)";

      if (responseCode >= 200 && responseCode < 300) {
        try {
          const result = JSON.parse(responseBody);
          if (Array.isArray(result) && result.length > 0) {
            const orderResult = result[0];
            // Use the correct field name 'tracking' as per API doc
            tracking = orderResult.tracking || "";
            if (tracking) {
              statusMessage = "FC Order Added (Pending Send)";
            } else {
              statusMessage = "API Success, No Tracking (Check Response)";
              Logger.log(`⚠️ FC Row ${i + 1} API responded OK but tracking field missing in: ${responseBody}`);
            }
          } else {
             statusMessage = "API Success, Unexpected Response Format (Not Array)";
             Logger.log(`⚠️ FC Row ${i + 1} API responded OK but result is not an expected array: ${responseBody}`);
          }
        } catch (parseError) {
          Logger.log(`❌ FC Row ${i + 1} Error parsing successful JSON response: ${parseError.message}`);
          statusMessage = "Parse Error (Success HTTP)";
        }
      } else {
        statusMessage = `API Error: ${responseCode}`;
        try {
          const errorResult = JSON.parse(responseBody);
          // The API might return errors differently; adapt this if needed
          // e.g., statusMessage += ` - ${errorResult.message || 'Details unavailable'}`;
        } catch (e) {
          Logger.log(`⚠️ FC Row ${i + 1} Error response not JSON: ${responseBody}`);
        }
      }

      // Write results back to the sheet (update column indices as needed)
      sheet.getRange(i + 1, 24).setValue(tracking);   // Assuming Col X (index 23) for tracking
      sheet.getRange(i + 1, 23).setValue(statusMessage); // Assuming Col W (index 27) for status message
      if (tracking) {
         sheet.getRange(i + 1, 26).setValue("synced"); // Assuming Col Z (index 25) for Synced marker
      }

    } catch (fetchError) {
      Logger.log(`❌ FC Row ${i + 1} Fetch Error: ${fetchError.message}`);
      sheet.getRange(i + 1, 23).setValue(`Fetch Error: ${fetchError.message}`);
    }
  }
}
