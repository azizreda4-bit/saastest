function onOpen(e) {
  updateLastActivity();
}

function updateLastActivity() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("⚙️Settings");
  if (sheet) {
    sheet.getRange("A1").setValue(new Date());  // تحديث آخر نشاط
  }
}