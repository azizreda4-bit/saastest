function addAmeex_Mode2_Stock() {

  const API_URL = "https://api.ameex.app/customer/Delivery/DeliveryNotes/Action/Type/Add";
  const API_ID  = "12450";
  const API_KEY = "570987-d631a9-638C5C-26bA56-14252E-40c627";

  const SENDER_ID = "0"; // id expéditeur

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("📦Géstion des Commandes");

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    const r = data[i];

    const orderRef = r[0];     // A
    const receiver = r[4];     // E
    const phone    = r[5];     // F
    const address  = r[8];     // I
    const cityId   = String(r[26]).trim(); // AA
    const cod      = r[13];    // N
    const qty      = r[14];    // O
    const sku      = r[24];    // Y → SKU / REF
    const note     = r[15];    // P

    const carrier  = r[20];    // U
    const status   = r[16];    // Q
    const synced   = r[25];    // Z

    if (carrier !== "Ameex" || status !== "Confirmé" || synced === "synced") continue;

    if (!receiver || !phone || !address || !cityId || !sku || !qty) {
      sheet.getRange(i + 1, 23).setValue("Missing Data");
      continue;
    }

    const payload = {
      dn_customer_ref: orderRef,
      dn_sender: SENDER_ID,          // ✅ REQUIRED
      dn_receiver_name: receiver,
      dn_receiver_phone: phone,
      dn_receiver_city: cityId,
      dn_receiver_address: address,
      dn_note: note || "",
      dn_cod: cod,

      // 🔥 MODE 2 ITEMS
      "items[0][ref]": sku,
      "items[0][qty]": qty
    };

    const options = {
      method: "post",
      headers: {
        "C-Api-Id": API_ID,
        "C-Api-Key": API_KEY
      },
      payload: payload,
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(API_URL, options);
    const body = res.getContentText();
    Logger.log(body);

    const json = JSON.parse(body || "{}");

    if (json?.api?.type === "success") {
      sheet.getRange(i + 1, 23).setValue("Created");
      sheet.getRange(i + 1, 24).setValue(orderRef);

      saveAmeexDeliveryNote(orderRef); // 🔐 REQUIRED

      sheet.getRange(i + 1, 26).setValue("synced");
    } else {
      sheet.getRange(i + 1, 23).setValue("Failed");
      sheet.getRange(i + 1, 24).setValue(json?.api?.msg || body);
    }
  }
}
