function transferOrdersByStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName("📦Géstion des Commandes");
  const noResponseSheet = ss.getSheetByName("Orders Reporté");

  const dataRange = sourceSheet.getRange(4, 1, sourceSheet.getLastRow() - 3, sourceSheet.getLastColumn());
  const data = dataRange.getValues();

  const statusColIndex = 10; // العمود K (index = 10 داخل Array)

  // ⬇️ نبدأ من الأسفل لتفادي مشاكل الحذف
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    const status = row[statusColIndex];

    // فقط "Pas de réponse" تنتقل
    if (status === "Reporté") {
      noResponseSheet.appendRow(row);
      sourceSheet.deleteRow(i + 4); // +4 لأن البيانات تبدأ من الصف 4
    }
  }
}

/**
 * 🔄 دالة ترجع الطلبات من "Orders Pas de réponse" إلى "📦Géstion des Commandes"
 * عند تغيير الحالة إلى أي شيء آخر غير "Pas de réponse".
 */
function returnOrdersFromNoResponse() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboardSheet = ss.getSheetByName("📦Géstion des Commandes");
  const noResponseSheet = ss.getSheetByName("Orders Reporté");

  const dataRange = noResponseSheet.getRange(2, 1, noResponseSheet.getLastRow() - 1, noResponseSheet.getLastColumn());
  const data = dataRange.getValues();

  const statusColIndex = 10; // العمود K (index = 10)

  // نبدأ من الأسفل حتى لا نكسر الترتيب عند الحذف
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    const status = row[statusColIndex];

    // إذا لم تعد "Pas de réponse" → رجعها
    if (status && status !== "Reporté") {
      dashboardSheet.appendRow(row);
      noResponseSheet.deleteRow(i + 2); // +2 لأن البيانات تبدأ من الصف 2 (بعد العناوين)
    }
  }
}
