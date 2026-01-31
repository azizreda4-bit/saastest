function fixPhoneNumbers() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  if (!sheet) return;
  
  var lastRow = sheet.getLastRow(); // تحديد آخر صف يحتوي على بيانات
  if (lastRow < 4) return;
  
  var phoneRange = sheet.getRange("F4:F" + lastRow); // تحديد نطاق أرقام الهواتف
  var phoneData = phoneRange.getValues(); // جلب القيم من العمود
  
  for (var i = 0; i < phoneData.length; i++) {
    var phone = phoneData[i][0];

    if (phone) {
      phone = phone.toString(); // تحويل الرقم إلى نص دائمًا
      
      // إضافة 0 فقط إذا لم يكن الرقم يبدأ بـ 0
      if (!phone.startsWith("0")) {
        phoneData[i][0] = "0" + phone; // إجبار التخزين كنص عبر تحويله إلى نص
      }
    }
  }

  phoneRange.setValues(phoneData); // تحديث القيم في العمود
  
  // **🔹 إجبار العمود على أن يكون نص بالكامل 🔹**
  phoneRange.setNumberFormat("@");
}
