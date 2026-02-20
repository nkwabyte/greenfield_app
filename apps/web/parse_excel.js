const XLSX = require('xlsx');
const workbook = XLSX.readFile('docs/FarmerGroups.xlsx');
const sheetName = workbook.SheetNames[1]; // checking second sheet because first seems to be a summary
const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
console.log(JSON.stringify(data.slice(0, 15), null, 2));
