const XLSX = require('xlsx');

const workbook = XLSX.readFile('FarmerGroups.xlsx');
console.log("Sheets:", workbook.SheetNames);

const sheetName1 = workbook.SheetNames[1];
const sheet1 = workbook.Sheets[sheetName1];
const data1 = XLSX.utils.sheet_to_json(sheet1, { header: 1 });
console.log("Rows 2 to 10:");
for (let i = 2; i <= 10 && i < data1.length; i++) {
    console.log(`Row ${i}:`, data1[i]);
}
