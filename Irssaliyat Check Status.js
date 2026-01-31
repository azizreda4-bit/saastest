function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");

  try {
    
    Logger.log("📡 Webhook Payload: " + e.postData.contents);

    
    const data = JSON.parse(e.postData.contents);
    const packageId = data.package_id || "N/A";
    const deliveryStatus = data.delivery_status || "N/A";
    const eventTime = data.event_time || new Date().toISOString();

    
    const statusName = getStatusName(deliveryStatus);
    Logger.log(`Package ${packageId} has status: ${statusName}`);

    
    const lastRow = sheet.getLastRow();
    const trackingNumbers = sheet.getRange(1, 24, lastRow).getValues();
    let rowIndex = null;

    for (let i = 0; i < trackingNumbers.length; i++) {
      if (trackingNumbers[i][0] === packageId) {
        rowIndex = i + 1; 
        break;
      }
    }

    if (rowIndex) {
      
      sheet.getRange(rowIndex, 23).setValue(statusName);
      Logger.log(`✅ Updated status for ${packageId} at row ${rowIndex}`);
    } else {
      
      const newRow = lastRow + 1;
      sheet.getRange(newRow, 24).setValue(packageId);   
      sheet.getRange(newRow, 23).setValue(statusName);  
      Logger.log(`➕ Added ${packageId} at row ${newRow}`);
    }

    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, received: packageId })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("❌ Error in doPost: " + err);
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}


function getStatusName(statusId) {
  const statuses = [
    { id: "0", name: "Nouveau colis" },
    { id: "1", name: "En attente de ramassage" },
    { id: "2", name: "Colis expédiée" },
    { id: "3", name: "Livré au client" },
    { id: "4", name: "Retourné vers agence casa" },
    { id: "5", name: "le client ne répond pas" },
    { id: "8", name: "Reçu par erreur" },
    { id: "9", name: "Non reçu" },
    { id: "10", name: "Hors zone" },
    { id: "12", name: "Client disponible pour livraison" },
    { id: "13", name: "Changement d'adresse" },
    { id: "14", name: "Téléphone Injoignable" },
    { id: "15", name: "Ramassé {{city}}" },
    { id: "17", name: "Reporté" },
    { id: "18", name: "Colis prêt pour le retour" },
    { id: "19", name: "Retour reçu par agence {{city}}" },
    { id: "20", name: "Retour livré au client" },
    { id: "21", name: "Retour en cours de la livraison" },
    { id: "27", name: "Retour débarrasse" },
    { id: "28", name: "Refusé" },
    { id: "29", name: "Annulé" },
    { id: "30", name: "Interessé" },
    { id: "31", name: "Colis prét pour l'expedition" },
    { id: "32", name: "Retour en stock" },
    { id: "33", name: "Produit endommagé" },
    { id: "34", name: "Recu sur agence {{city}}" },
    { id: "35", name: "en cours de livraison" },
    { id: "36", name: "Demande retour" },
    { id: "37", name: "reportée indéfiniment" },
    { id: "38", name: "Toujours injoignable" },
    { id: "39", name: "en cours de preparation" },
    { id: "48", name: "Retour reçu par {{city}}" },
    { id: "49", name: "En Transport" },
    { id: "50", name: "Retour prét pour l'expedition" },
    { id: "51", name: "Retour expidié" },
    { id: "52", name: "Perdu" },
    { id: "53", name: "Colis archivé" }
  ];

  const match = statuses.find(s => s.id === statusId);
  return match ? match.name : "Unknown Status";
}
