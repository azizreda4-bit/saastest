function loginToSendit() {
  const url = "https://app.sendit.ma/api/v1/login"; // رابط تسجيل الدخول
  const payload = {
    "public_key": "", // تأكد من صحة اسم المستخدم
    "secret_key": "" // تأكد من صحة كلمة المرور
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // تفعيل الخيار لفحص الأخطاء
  };

  try {
    const response = UrlFetchApp.fetch(url, options); // إرسال الطلب
    const responseCode = response.getResponseCode(); // الحصول على كود الاستجابة
    const responseText = response.getContentText(); // الحصول على النص الكامل للاستجابة
    
    if (responseCode === 200) {
      // إذا كان الطلب ناجحًا
      Logger.log("تم تسجيل الدخول بنجاح!");
      Logger.log(responseText);
    } else {
      // إذا حدث خطأ
      Logger.log(`Error: ${responseCode}`);
      Logger.log(responseText);
    }
  } catch (e) {
    Logger.log(`Exception: ${e.message}`);
  }
}