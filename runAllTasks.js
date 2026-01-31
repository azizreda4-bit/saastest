function runAllTasks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const status = data[i][20]; // Column T (28th, zero-indexed = 19)

    if (status === 'Digylog') {
      addOrdersToDigylogFromSheet(); // Handles all rows internally
    } else if (status === 'Sendit') {
      getDataFromSheet23(); // Handles all rows internally
    } else if (status === 'Cathedis') {
      addParcelsToCathedis(); // Handles all rows internally
    } else if (status === 'Forcelog') {
      addParcelsToForceLog(); 
    } else if (status === 'Speedaf') {
      addSpeedafOrdersFromSheet(); 
    } else if (status === 'Ameex') {
      addParcelToAmeex(); 
    } else if (status === 'Onessta') {
      addParcelsToOnessta(); 
    } else if (status === 'Coliix') {
      addColisFromSheet(); 
    } else if (status === 'Speedex') {
      addParcelToSpeedex();
    } else if (status === 'Olivraison') {
      getDataFromSheet(); 
    } else if (status === 'OzonExpress') {
      getDataFromSheet3();
    } else if (status === 'expresscoursier') {
      addColisToExpressCoursier();
    } else if (status === 'Maberr') {
      addParcelsToMaberr();
    } else if (status === 'Livcash') {
      addParcelToLivcash();
    } else if (status === 'Livo') {
      addOrderToLivo();
    } else if (status === 'Viex') {
      addParcelsToVitex5();
    } else if (status === 'Colino Express') {
      addOrdersToColinoFromSheet();
    } else if (status === 'Tawsilex') {
      addOrdersToTawsilexFromSheet();
    } else if (status === 'Chamel Express') {
      addOrdersToChamelFromSheet();
    }

  }
}
