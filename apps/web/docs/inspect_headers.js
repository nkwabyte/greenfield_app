import fs from 'fs';
import XLSX from 'xlsx';

const inputFile = 'FarmerGroups.xlsx';
const workbook = XLSX.readFile(inputFile);
const sheetName = workbook.SheetNames[1]; // First actual data sheet
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const r8 = data[8];
const r9 = data[9];

for (let i = 28; i < Math.max(r8.length, r9.length); i++) {
  console.log(`Col ${i}: R8="${r8[i]}" | R9="${r9[i]}" | Data="${data[10][i]}"`);
}
