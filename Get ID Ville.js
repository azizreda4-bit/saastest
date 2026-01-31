function fetchCityData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orderSheet = ss.getSheetByName("📦Géstion des Commandes");
  var citySheet = ss.getSheetByName("🆔 Id Ville");

  var lastRow = orderSheet.getLastRow();
  var orderCities = orderSheet.getRange("H4:H" + lastRow).getValues(); // المدن
  var deliveryCompanies = orderSheet.getRange("U4:U" + lastRow).getValues(); // شركة التوصيل

  var cityDataMap = {
    "OzonExpress": {
      cities: citySheet.getRange("A2:A" + citySheet.getLastRow()).getValues(),
      ids: citySheet.getRange("B2:B" + citySheet.getLastRow()).getValues()
    },
    "Sendit": {
      cities: citySheet.getRange("D2:D" + citySheet.getLastRow()).getValues(),
      ids: citySheet.getRange("E2:E" + citySheet.getLastRow()).getValues()
    },
    "Ameex": {
      cities: citySheet.getRange("M2:M" + citySheet.getLastRow()).getValues(),
      ids: citySheet.getRange("N2:N" + citySheet.getLastRow()).getValues()
    },
    "Onessta": {
      cities: citySheet.getRange("T2:T" + citySheet.getLastRow()).getValues(),
      ids: citySheet.getRange("U2:U" + citySheet.getLastRow()).getValues()
    },
    "Vitex": {
      cities: citySheet.getRange("AE2:AE" + citySheet.getLastRow()).getValues(),
      ids: citySheet.getRange("AF2:AF" + citySheet.getLastRow()).getValues()
    },
    "Colino Express": {
      cities: citySheet.getRange("AI2:AI" + citySheet.getLastRow()).getValues(),
      ids: citySheet.getRange("AJ2:AJ" + citySheet.getLastRow()).getValues()
    }
  };

  var results = [];

  for (var i = 0; i < orderCities.length; i++) {
    var city = orderCities[i][0] ? orderCities[i][0].toString().toLowerCase().trim() : "";
    var company = deliveryCompanies[i][0];

    Logger.log("Row " + (i + 4) + " | City: " + city + " | Company: " + company);

    var data = cityDataMap[company]; // نأخذ البيانات مباشرة من اسم الشركة

    var id = "";
    if (data) {
      for (var j = 0; j < data.cities.length; j++) {
        var cityName = data.cities[j][0] ? data.cities[j][0].toString().toLowerCase().trim() : "";
        if (city === cityName) {
          id = data.ids[j][0] || "";
          Logger.log("Match found: " + cityName + " => ID: " + id);
          break;
        }
      }
    } else {
      Logger.log("No data found for company: " + company);
    }

    results.push([id]);
  }

  orderSheet.getRange("AA4:AA" + (results.length + 3)).setValues(results);
}
