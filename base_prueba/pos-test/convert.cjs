const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

try {
  const workbook = xlsx.readFile(path.join(__dirname, '../base_prueba.xlsx'));
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(sheet);
  
  fs.writeFileSync(path.join(__dirname, 'src/inventory.json'), JSON.stringify(json, null, 2));
  console.log('Successfully converted to JSON. Items:', json.length);
} catch (err) {
  console.error('Error:', err);
}
