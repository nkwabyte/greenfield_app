import * as xlsx from 'xlsx';

const workbook = xlsx.readFile('./data.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

console.log("Headers:");
if (data.length > 0) {
    console.log(Object.keys((data as any)[0]));
    console.log("\nFirst 3 rows:");
    console.log(data.slice(0, 3));
} else {
    console.log("No data found in sheet");
}
