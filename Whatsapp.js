/**
 * WhatsApp Message Sender from Google Sheets
 * Using Meta (Facebook) Cloud API
 */

const WHATSAPP_TOKEN = 'your-token-whatsapp';        // 🔑 Replace with your permanent or long-lived token 
const PHONE_NUMBER_ID = 'your-phone-number-id';    // 🔢 From Meta App Dashboard
const SHEET_NAME1 = '📦Géstion des Commandes';          // Sheet name with messages

function sendWhatsAppMessages() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME1);
  if (!sheet) throw new Error(`❌ Sheet '${SHEET_NAME1}' not found`);

  const data = sheet.getDataRange().getValues();
  let sentCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Hardcoded columns
    const name = row[4];    // Column E (0-based index 4)
    const phone = row[5];   // Column F (0-based index 5)
    const status = row[31]; // Column X for Status (adjust if needed)
    const columnW = row[22]; // Column W (0-based index 22)

    // Determine message based on column W
    let message = '';
    if (columnW === 'Livré') message = 'Colis is delivery';
    else if (columnW === 'Canceled') message = 'Colis is Canceled';
    else continue; // Skip if not Livré or Canceled

    // Skip if no phone or already sent
    if (!phone || status === '✅ Sent') continue;

    const payload = {
      messaging_product: "whatsapp",
      to: phone.toString().trim(),
      type: "text",
      text: { body: message }
    };

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, options);
      const result = JSON.parse(response.getContentText());

      if (result.error) {
        sheet.getRange(i + 1, 32).setValue(`❌ ${result.error.message}`); // Status column X
        Logger.log(`❌ Failed row ${i + 1}: ${result.error.message}`);
      } else {
        sheet.getRange(i + 1, 32).setValue('✅ Sent');
        Logger.log(`✅ Message sent to ${phone}`);
        sentCount++;
      }

      Utilities.sleep(1000); // 1 second delay to avoid rate limit
    } catch (err) {
      sheet.getRange(i + 1, 32).setValue(`⚠️ ${err.message}`);
      Logger.log(`⚠️ Error row ${i + 1}: ${err.message}`);
    }
  }

  Logger.log(`📤 Done. Total messages sent: ${sentCount}`);
}
