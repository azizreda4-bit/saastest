function updateProductCodes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // جلب الأوراق المطلوبة
  var ordersSheet = ss.getSheetByName("📊Dashboard");
  var stockSheet = ss.getSheetByName("⚙️Settings");

  if (!ordersSheet || !stockSheet) {
    Logger.log("خطأ: لم يتم العثور على إحدى الأوراق المطلوبة.");
    return;
  }

  // جلب بيانات المخزون
  var stockRange = stockSheet.getRange(6, 1, stockSheet.getLastRow() - 5, 6).getValues(); // A:B:E:F (المرجع، الاسم، اللون، المقاس)
  var stockMap = new Map();

  stockRange.forEach(row => {
    var ref = row[0];
    var name = row[1] ? row[1].toLowerCase().trim() : "";
    var color = row[4] ? row[4].toLowerCase().trim() : "";
    var size = row[5] ? String(row[5]).toLowerCase().trim() : "";
    
    var key = name + "|" + color + "|" + size;
    stockMap.set(key, ref);
  });

  // جلب بيانات الطلبات
  var lastRowOrders = ordersSheet.getLastRow();
  var productsRange = ordersSheet.getRange(6, 5, lastRowOrders - 5, 1).getValues(); // E
  var colorsRange = ordersSheet.getRange(6, 6, lastRowOrders - 5, 1).getValues(); // F
  var sizesRange = ordersSheet.getRange(6, 7, lastRowOrders - 5, 1).getValues(); // G

  var output = [];
  
  for (var i = 0; i < productsRange.length; i++) {
    var productName = productsRange[i][0] ? productsRange[i][0].toLowerCase().trim() : "";
    var color = colorsRange[i][0] ? colorsRange[i][0].toLowerCase().trim() : "";
    var size = sizesRange[i][0] ? sizesRange[i][0].toLowerCase().trim() : "";
    
    // البحث وفقًا للحالات المختلفة
    var keyFull = productName + "|" + color + "|" + size;
    var keyNoColor = productName + "|" + "" + "|" + size;
    var keyNoSize = productName + "|" + color + "|" + "";
    var keyOnlyName = productName + "|" + "" + "|" + "";
    
    var ref = stockMap.get(keyFull) || stockMap.get(keyNoColor) || stockMap.get(keyNoSize) || stockMap.get(keyOnlyName) || "غير موجود";
    output.push([ref]);
  }
  
  // وضع الأكواد في العمود U
  ordersSheet.getRange(6, 21, output.length, 1).setValues(output);
  
  Logger.log("تم تحديث الأكواد بنجاح من العمود A في Paramètre.");
}
