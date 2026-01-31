#!/usr/bin/env node

/**
 * Script to help export data from Google Sheets
 * This provides instructions and sample code for exporting your current data
 */

console.log(`
🔄 Google Sheets Data Export Guide
==================================

To migrate your existing Google Apps Script data to DeliveryHub, follow these steps:

📊 STEP 1: Export from Google Sheets
------------------------------------

Option A: Manual Export (Recommended)
1. Open your Google Sheet: "📦Géstion des Commandes"
2. Go to File > Download > Comma Separated Values (.csv)
3. Save the file as "orders.csv"

Option B: Using Google Apps Script
Add this function to your existing Google Apps Script:

\`\`\`javascript
function exportToCSV() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  const data = sheet.getDataRange().getValues();
  
  // Convert to CSV format
  const csv = data.map(row => 
    row.map(cell => 
      typeof cell === 'string' && cell.includes(',') 
        ? '"' + cell.replace(/"/g, '""') + '"' 
        : cell
    ).join(',')
  ).join('\\n');
  
  // Create a blob and download
  const blob = Utilities.newBlob(csv, 'text/csv', 'orders.csv');
  DriveApp.createFile(blob);
  
  console.log('✅ CSV file created in Google Drive');
}
\`\`\`

📋 STEP 2: Verify Column Mapping
--------------------------------

Make sure your CSV has these columns (adjust the migration script if different):

Required Columns:
- Order ID (order number)
- Order date 
- AgentName (customer name)
- Phone (customer phone)
- City (delivery city)
- Street Address (delivery address)
- Product Name
- SKU
- Price
- Total quantity
- Status de confirmation
- Société de livraison (delivery provider)
- Tracking number
- Source (marketing source)
- Compaign (campaign name)

🚀 STEP 3: Run Migration
------------------------

1. Start DeliveryHub platform:
   docker-compose up -d

2. Create admin user:
   node scripts/create-admin.js --email=admin@yourcompany.com --password=SecurePass123! --company="Your Company"

3. Run migration:
   node scripts/migrate-from-sheets.js orders.csv <tenant-id>

📝 STEP 4: Verify Migration
---------------------------

1. Login to DeliveryHub: http://localhost:3001
2. Check dashboard statistics
3. Review orders in the Orders section
4. Verify customer and product data

🔧 STEP 5: Configure Delivery Providers
---------------------------------------

1. Go to Settings > Delivery Providers
2. Add your existing API credentials:
   - Coliix: API Key
   - Cathedis: Username/Password
   - Forcelog: API Key
   - Sendit: Access Token
   - And others...

3. Test connections
4. Enable providers for your tenant

💡 Tips for Successful Migration:
---------------------------------

1. Clean your data first:
   - Remove empty rows
   - Standardize phone number formats
   - Fix any date formatting issues

2. Start with a small sample:
   - Export just 10-20 orders first
   - Test the migration process
   - Then migrate all data

3. Backup your Google Sheet:
   - Make a copy before exporting
   - Keep the original as backup

4. Verify delivery provider names:
   - Make sure they match exactly
   - Check spelling and capitalization

📞 Need Help?
-------------

If you encounter issues:
1. Check the migration logs for errors
2. Verify your CSV format matches expectations
3. Ensure all required columns are present
4. Contact support if needed

🎉 After Migration:
------------------

1. Your team can start using the new platform
2. Set up automation rules
3. Configure WhatsApp templates
4. Train users on the new interface
5. Gradually phase out Google Sheets

Good luck with your migration! 🚀
`);

// Sample data structure for reference
const sampleOrder = {
  "Order ID": "20241201001",
  "Order date": "2024-12-01",
  "Store Name": "Matjar",
  "AgentName": "Ahmed Hassan",
  "Phone": "0612345678",
  "City": "Casablanca",
  "City API": "casa",
  "Street Address": "123 Rue Mohammed V, Centre Ville",
  "Product Name": "جلابية مونطو بالسنسلة و الصدايف",
  "SKU": "JLB001",
  "Color": "البيترولي",
  "Size": "L",
  "Price": "199",
  "Total quantity": "1",
  "Remarque": "Customer notes",
  "Status de confirmation": "Confirmé",
  "WhatsApp": "📞🟢 WhatsApp",
  "Société de livraison": "Coliix",
  "Suivie Remarque": "Delivery notes",
  "Statut de livraison": "En Attente Ramassage",
  "Tracking number": "COL123456789",
  "Statut \"Synced\"": "synced",
  "Date": "2024-12-01",
  "Source": "Facebook",
  "Compaign": "Campaign Test MDF LE (FA)",
  "Ad Set": "Ad Set 1 (FA)"
};

console.log('\n📋 Sample CSV Row Structure:');
console.log('============================');
console.log(JSON.stringify(sampleOrder, null, 2));

console.log('\n🔄 Ready to start migration? Run:');
console.log('node scripts/create-admin.js --email=your@email.com --password=YourPassword123! --company="Your Company"');
console.log('node scripts/migrate-from-sheets.js orders.csv <tenant-id-from-previous-command>');