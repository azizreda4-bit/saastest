function convertirDates() {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📦Géstion des Commandes");
  const plageDates = feuille.getRange("B4:B" + feuille.getLastRow()).getValues();
  const datesConverties = [];

  for (let i = 0; i < plageDates.length; i++) {
    const dateBrute = plageDates[i][0];
    let dateFinale = null;

    if (dateBrute instanceof Date) {
      dateFinale = dateBrute;
    } else if (typeof dateBrute === 'string' && dateBrute.trim() !== "") {
      // Essayer de convertir la chaîne de texte en date
      const texteNettoye = dateBrute.replace(",", ""); // enlever la virgule
      const tentative = new Date(texteNettoye);
      if (!isNaN(tentative.getTime())) {
        dateFinale = tentative;
      }
    }

    if (dateFinale) {
      const annee = dateFinale.getFullYear();
      const mois = String(dateFinale.getMonth() + 1).padStart(2, '0');
      const jour = String(dateFinale.getDate()).padStart(2, '0');
      datesConverties.push([`${annee}-${mois}-${jour}`]);
    } else {
      datesConverties.push([""]); // Cellule vide si la date est invalide
    }
  }

  feuille.getRange(4, 28, datesConverties.length, 1).setValues(datesConverties); // Colonne AC = colonne 29
}
