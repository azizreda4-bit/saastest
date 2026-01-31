function checkZenDeliveryStatusBatch() {

  const EMAIL = "reda.designer10@gmail.com";          // ⬅️ replace
  const PASSWORD = "Az123456";    // ⬅️ replace
  const SHEET_NAME = "📦Géstion des Commandes";
  const MAX_ROWS_PER_RUN = 50;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log(`❌ Sheet "${SHEET_NAME}" not found!`);
    return;
  }

  const token = loginZenSingle(EMAIL, PASSWORD);
  if (!token) {
    Logger.log("❌ ZenDelivery login failed.");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const totalRows = data.length;

  let lastProcessed = parseInt(PropertiesService.getScriptProperties().getProperty("LAST_ROW_ZEN") || "1");
  let rowsProcessed = 0;

  Logger.log("🔎 Total rows to check: " + (totalRows - 1));

  for (let i = lastProcessed; i < totalRows; i++) {
    const row = data[i];

    const courier = row[20];     
    const ref = row[23];         

    if (courier !== "ZenDelivery") {
      Logger.log(`⏭️ Row ${i + 1}: Not ZenDelivery, skipping.`);
      continue;
    }

    if (!ref) {
      Logger.log(`⏭️ Row ${i + 1}: No REF, skipping.`);
      continue;
    }

    const url = `https://api.zendelivery.ma/client/parcels/${ref}/details`;

    try {
      const response = UrlFetchApp.fetch(url, {
        method: "get",
        headers: { Authorization: "Bearer " + token },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() !== 200) {
        Logger.log(`❌ Row ${i + 1}: HTTP ${response.getResponseCode()} for REF ${ref}`);
        continue;
      }

      const result = JSON.parse(response.getContentText());
      Logger.log(`📦 Row ${i + 1}: Response for ${ref} = ` + JSON.stringify(result));

      const status = result.status || "Unknown";

      // ⬅️ Write status into sheet (Column W or change as needed)
      sheet.getRange(i + 1, 23).setValue(status);

      Logger.log(`✅ Row ${i + 1}: Updated status → "${status}"`);

      rowsProcessed++;
      PropertiesService.getScriptProperties().setProperty("LAST_ROW_ZEN", i + 1);

      Utilities.sleep(500); // Avoid rate limits

      if (rowsProcessed >= MAX_ROWS_PER_RUN) {
        Logger.log(`⏸️ Stopping after ${MAX_ROWS_PER_RUN} rows. Continue next run.`);
        return;
      }

    } catch (err) {
      Logger.log(`⚠️ Row ${i + 1}: Error for REF ${ref}: ${err.message}`);
    }
  }

  PropertiesService.getScriptProperties().deleteProperty("LAST_ROW_ZEN");
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ ZenDelivery status updated for all rows.", "ZenDelivery", 3);

}
