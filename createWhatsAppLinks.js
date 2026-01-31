function createWhatsAppLinks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("📦Géstion des Commandes");

  if (!sheet) {
    Logger.log("Sheet 📦Géstion des Commandes غير موجودة !");
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return;

  // نقرأ الأرقام من العمود F
  const phones = sheet.getRange(4, 6, lastRow - 3, 1).getValues();

  for (let i = 0; i < phones.length; i++) {
    const rowIndex = i + 4; // الصف الحقيقي
    const phone = phones[i][0];
    const linkCell = sheet.getRange(rowIndex, 20); // العمود T (20)

    if (phone && phone.toString().trim() !== "" && linkCell.isBlank()) {
      linkCell.setFormula(`=HYPERLINK("https://wa.me/${phone}","📞🟢 WhatsApp")`);
    }
  }
}






