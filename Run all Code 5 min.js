function runAllStatusChecks() {
  const tasks = [

    checkDeliveriesStatus

  ];

  tasks.forEach(fn => {
    try {
      fn();
      Logger.log(fn.name + " ✅ executed successfully");
    } catch (e) {
      Logger.log("❌ Error in " + fn.name + ": " + e);
    }
  });
}


