function addParcelsToVitex5() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  if (!sheet) return Logger.log("❌ Sheet '📦Géstion des Commandes' not found!");

  var data = sheet.getDataRange().getValues();
  var sessionId = "o6eptt3oort6575n14baqapjcu"; // valid Vitex session

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var statusQ = row[16], syncedAD = row[25], companyU = row[20];

    if (companyU !== "Vitex" || statusQ !== "Confirmé" || syncedAD === "synced") continue;

    var cityId = row[26]; // Column AA
    if (!cityId) {
      Logger.log(`❌ Row ${i + 1}: City ID missing in column AA`);
      continue;
    }

    var formData = {
      parcel_receiver: row[4],
      parcel_phone: row[5],
      parcel_city: cityId.toString(),
      parcel_address: row[8],
      parcel_prd_name: row[9],
      parcel_prd_qty: row[14] || 1,
      parcel_note: row[15] || "",
      parcel_price: row[13].toString(),
      hub_id: 2
    };

    var payload = Object.keys(formData).map(k => encodeURIComponent(k) + "=" + encodeURIComponent(formData[k])).join("&");

    var options = {
      method: "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Cookie": "PHPSESSID=" + sessionId,
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://vitex.ma",
        "Referer": "https://vitex.ma/clients/parcels?action=add"
      },
      payload: payload,
      muteHttpExceptions: true
    };

    try {
      var response = UrlFetchApp.fetch("https://vitex.ma/clients/parcels?action=add-action", options);
      var content = response.getContentText();
      Logger.log("📦 Vitex Full Response: " + content);

      if (content.includes("Colis bien ajouté")) {
        sheet.getRange(i + 1, 26).setValue("synced");
        Logger.log(`✅ Row ${i + 1}: Parcel added!`);
      } else {
        Logger.log(`❌ Row ${i + 1}: Failed - ${content}`);
      }
    } catch (err) {
      Logger.log(`⚠️ Row ${i + 1}: Error - ${err.message}`);
    }
  }
}
