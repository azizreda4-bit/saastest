const LOG_SHEET_NAME = "⏱️SessionsLog";
const SESSION_TIMEOUT_MINUTES = 15; // تم التغيير من 10 إلى 15

function getLogSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LOG_SHEET_NAME);
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function formatTime(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "HH:mm:ss");
}

function logSessionStart() {
  var sheet = getLogSheet();
  var now = new Date();
  var props = PropertiesService.getDocumentProperties();
  var sessionStart = props.getProperty("sessionStart");

  if (sessionStart) return; // جلسة مفتوحة بالفعل، لا تكرر

  var lastRow = findLastFilledRow(sheet);
  var nextRow = lastRow + 1;

  sheet.getRange(nextRow, 1).setValue(formatDate(now));  // Date
  sheet.getRange(nextRow, 2).setValue(formatTime(now));  // Start Time

  props.setProperty("sessionStart", now.toISOString());
  props.setProperty("sessionRow", nextRow.toString());
  props.setProperty("lastActivity", now.toISOString()); // تسجيل وقت آخر نشاط
}

function logSessionEndManually() {
  var props = PropertiesService.getDocumentProperties();
  var sessionStart = props.getProperty("sessionStart");
  var sessionRow = parseInt(props.getProperty("sessionRow"));
  if (!sessionStart || !sessionRow) return;

  var sheet = getLogSheet();
  var now = new Date();
  var startTime = new Date(sessionStart);

  var duration = (now - startTime) / (1000 * 60 * 60); // بالساعة
  duration = Math.round(duration * 100) / 100;

  sheet.getRange(sessionRow, 3).setValue(formatTime(now));  // End Time
  sheet.getRange(sessionRow, 4).setValue(duration);         // Duration (hours)

  // ➕ تنسيق القراءة البشرية
  const hours = Math.floor(duration);
  const minutes = Math.round((duration - hours) * 60);
  const formattedDuration = `${hours > 0 ? hours + "h " : ""}${minutes}min`;
  sheet.getRange(sessionRow, 5).setValue(formattedDuration); // Duration (formatted)

  props.deleteProperty("sessionStart");
  props.deleteProperty("sessionRow");
  props.deleteProperty("lastActivity");
}

function checkSessionTimeout() {
  var props = PropertiesService.getDocumentProperties();
  var sessionStart = props.getProperty("sessionStart");
  var sessionRow = parseInt(props.getProperty("sessionRow"));
  var lastActivity = props.getProperty("lastActivity");

  if (!sessionStart || !sessionRow || !lastActivity) return;

  var lastActivityTime = new Date(lastActivity);
  var now = new Date();
  var diffMinutes = (now - lastActivityTime) / (1000 * 60);

  if (diffMinutes > SESSION_TIMEOUT_MINUTES) {
    logSessionEndManually();
  }
}

// تبحث عن آخر صف يحتوي بيانات
function findLastFilledRow(sheet) {
  var columnA = sheet.getRange("A2:A").getValues();
  for (var i = 0; i < columnA.length; i++) {
    if (!columnA[i][0]) {
      return i + 1; // الصف الفارغ القادم
    }
  }
  return columnA.length + 1; // إذا كانت كل الخانات مليئة
}
