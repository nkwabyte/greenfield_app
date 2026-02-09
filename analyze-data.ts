import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = './docs/data.xlsx';
const stats = fs.statSync(filePath);
const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log(`File size: ${fileSizeMB} MB`);

const workbook = XLSX.readFile(filePath);
console.log(`\nSheets: ${workbook.SheetNames.join(', ')}`);

let totalRows = 0;
let sampleRow: any = null;

workbook.SheetNames.forEach(sheetName => {
  if (sheetName.toLowerCase() === 'summary') {
    console.log(`\n${sheetName}: (skipped - summary sheet)`);
    return;
  }
  
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`\n${sheetName}: ${data.length} rows`);
  totalRows += data.length;
  
  if (!sampleRow && data.length > 0) {
    sampleRow = data[0];
  }
});

console.log(`\n===================`);
console.log(`Total farmers: ${totalRows.toLocaleString()}`);
console.log(`===================`);

if (sampleRow) {
  console.log(`\nSample row structure:`);
  console.log(JSON.stringify(sampleRow, null, 2));
  
  const rowSize = JSON.stringify(sampleRow).length;
  console.log(`\nEstimated size per row: ~${rowSize} bytes`);
  console.log(`Estimated total size: ~${((totalRows * rowSize) / (1024 * 1024)).toFixed(2)} MB`);
}
