function runAllUpdates() {
  runTask(fixPhoneNumbers, "fixPhoneNumbers");
  runTask(fetchCityData, "fetchCityData");
  runTask(detectDuplicateOrdersByIdOrPhone, "detectDuplicateOrdersByIdOrPhone");
  runTask(transferOrdersByStatus, "transferOrdersByStatus");
  runTask(returnOrdersFromNoResponse, "returnOrdersFromNoResponse");
  runTask(convertirDates, "convertirDates");
  runTask(createWhatsAppLinks, "createWhatsAppLinks");
}

function runTask(taskFn, taskName) {
  try {
    taskFn();
    Logger.log(taskName + " ✅ executed successfully");
  } catch (e) {
    Logger.log("❌ Error in " + taskName + ": " + e);
  }
}


