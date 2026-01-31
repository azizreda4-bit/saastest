function exportASAPCities() {
  const url = "https://api.asapdelivery.ma/cities.php";
  
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    muteHttpExceptions: true
  });

  const cities = JSON.parse(response.getContentText());

  if (!Array.isArray(cities)) {
    throw new Error("Invalid API response format");
  }

  const sheetName = "ASAP Cities";
  let sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) sheet = SpreadsheetApp.getActive().insertSheet(sheetName);


  sheet.clearContents();

  // Header row
  sheet.appendRow([
    "ID",
    "City",
    "Delivered Fees",
    "Returned Fees",
    "Refused Fees",
    "Changed Fees"
  ]);

  // Data rows
  cities.forEach(city => {
    sheet.appendRow([
      city.ID,
      city.City,
      Number(city.Delivered_Fees),
      Number(city.Returned_Fees),
      Number(city.Refused_Fees),
      Number(city.Changed_Fees)
    ]);
  });

  sheet.autoResizeColumns(1, 6);
}
