function showSmartVilleSearch() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const activeCell = sheet.getActiveCell();
  const row = activeCell.getRow();
  const column = activeCell.getColumn();

  if (column !== 8) { // العمود H
    SpreadsheetApp.getUi().alert("يرجى اختيار خلية من العمود H.");
    return;
  }

  const deliveryCell = sheet.getRange("U" + row).getValue(); // شركة التوصيل
  const idSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("🆔 Id Ville");

  // تحديد الخرائط
  const mappings = [
    { header: idSheet.getRange("C1").getValue(), range: "A2:A" },
    { header: idSheet.getRange("F1").getValue(), range: "D2:D" },
    { header: idSheet.getRange("H1").getValue(), range: "G2:G" },
    { header: idSheet.getRange("J1").getValue(), range: "I2:I" },
    { header: idSheet.getRange("L1").getValue(), range: "K2:K" },
    { header: idSheet.getRange("O1").getValue(), range: "M2:M" },
    { header: idSheet.getRange("Q1").getValue(), range: "P2:P" },
    { header: idSheet.getRange("S1").getValue(), range: "R2:R" },
    { header: idSheet.getRange("V1").getValue(), range: "T2:T" },
    { header: idSheet.getRange("X1").getValue(), range: "W2:W" },
    { header: idSheet.getRange("Z1").getValue(), range: "Y2:Y" },
    { header: idSheet.getRange("AB1").getValue(), range: "AA2:AA" },
    { header: idSheet.getRange("AD1").getValue(), range: "AC2:AC" },
    { header: idSheet.getRange("AG1").getValue(), range: "AE2:AE" },
    { header: idSheet.getRange("AK1").getValue(), range: "AI2:AI" },
    { header: idSheet.getRange("AM1").getValue(), range: "AL2:AL" },
    { header: idSheet.getRange("AP1").getValue(), range: "AO2:AO" }
  ];

  // إيجاد العمود المناسب بناءً على اسم الشركة
  const match = mappings.find(m => m.header === deliveryCell);
  if (!match) {
    SpreadsheetApp.getUi().alert("اسم شركة التوصيل غير معروف.");
    return;
  }

  const htmlOutput = HtmlService.createHtmlOutputFromFile('smartSearch')
    .setWidth(250)
    .setHeight(300);
  PropertiesService.getScriptProperties().setProperty("searchRange", match.range);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "بحث حسب شركة التوصيل");
}

function getSmartOptions() {
  const rangeStr = PropertiesService.getScriptProperties().getProperty("searchRange");
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("🆔 Id Ville");
  const values = sheet.getRange(rangeStr).getValues().flat().filter(String);
  return values;
}

function setSmartValue(value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const cell = sheet.getActiveCell();
  cell.setValue(value);
}
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚚 المدن حسب الشركة')  // اسم القائمة في الشريط
    .addItem('🔍 ابحث عن مدينة', 'showSmartVilleSearch')  // اسم الزر ووظيفته
    .addToUi();
}

