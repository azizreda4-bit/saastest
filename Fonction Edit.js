function onEdit(e) {
  // 🟢 الجزء الأول: تحديث آخر نشاط
  updateLastActivity();

  // 🟢 الجزء الثاني: تسجيل وقت تعديل الحالة في الورقة "Rajae"
const sheet = e.source.getActiveSheet();
const editedCell = e.range;

const targetSheet = "📦Géstion des Commandes";
const statusColumn = 17; // عمود Q
const timestampColumn = 28; // عمود AB
const row = editedCell.getRow();

if (sheet.getName() === targetSheet && editedCell.getColumn() === statusColumn && row >= 4) {
  const timestampCell = sheet.getRange(row, timestampColumn);
  
  // نتحقق إن كانت خلية الوقت فارغة، نسجل الوقت فقط في هذه الحالة
  if (!timestampCell.getValue()) {
    const now = new Date();
    timestampCell.setValue(now);
  }
}


 // 🟢 الجزء الثالث (المحدّث): تحديث وقت آخر نشاط فقط دون تغيير وقت بدء الجلسة
  const props = PropertiesService.getDocumentProperties();
  const sessionStart = props.getProperty("sessionStart");
  const sessionRow = parseInt(props.getProperty("sessionRow"));
  const now = new Date();

  if (!sessionStart || !sessionRow) {
    // لا توجد جلسة، نبدأ واحدة جديدة
    logSessionStart();
    return;
  }

  // فقط نحدث وقت النشاط دون تغيير وقت بدء الجلسة
  props.setProperty("lastActivity", now.toISOString());
}
