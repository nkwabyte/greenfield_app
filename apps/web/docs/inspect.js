const xlsx = require('xlsx');

const workbook = xlsx.readFile('./data.xlsx');
console.log("Sheet Names:");
console.log(workbook.SheetNames);

for (let i = 0; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    console.log(`\n--- Sheet: ${sheetName} ---`);
    console.log("Headers:");
    if (data.length > 0) {
        console.log(Object.keys(data[0]));
        console.log("\nFirst row:");
        console.log(data[0]);
        console.log("Total rows:", data.length);
    } else {
        console.log("No data found in sheet");
    }
}
