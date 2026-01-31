function detectDuplicateOrdersByIdOrPhone() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
    if (!sheet) throw new Error("❌ الورقة 📊Dashboard غير موجودة");

    var lastRow = sheet.getLastRow();
    if (lastRow < 6) return;

    var idRange = sheet.getRange("A6:A" + lastRow).getValues(); // معرف الطلب
    var phoneRange = sheet.getRange("F6:F" + lastRow).getValues(); // رقم الهاتف

    var seenIds = new Set();
    var seenPhones = new Set();
    var notes = [];

    for (var i = 0; i < idRange.length; i++) {
      var id = idRange[i][0] ? idRange[i][0].toString().trim() : "";
      var phone = phoneRange[i][0] ? phoneRange[i][0].toString().trim() : "";

      let note = "";

      // فحص تكرار المعرف
      if (id !== "") {
        if (seenIds.has(id)) {
          note += "📌 مكرر بالمعرف";
        } else {
          seenIds.add(id);
        }
      }

      // فحص تكرار رقم الهاتف (حتى لو المعرف مختلف)
      if (phone !== "") {
        if (seenPhones.has(phone)) {
          if (note !== "") note += " + ";
          note += "📌 مكرر برقم الهاتف";
        } else {
          seenPhones.add(phone);
        }
      }

      notes.push([note]);
    }

    // كتابة النتائج في العمود S = العمود 19
    sheet.getRange(6, 19, notes.length, 1).setValues(notes);
    Logger.log("✅ تم كشف التكرارات بنجاح.");
    
  } catch (e) {
    Logger.log("❌ خطأ في detectDuplicateOrdersByIdOrPhone: " + e.message);
  }
}
