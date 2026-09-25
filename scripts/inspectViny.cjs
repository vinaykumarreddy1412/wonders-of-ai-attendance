const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.join(__dirname, '..', 'vinyyyyy.xlsx');
console.log('Inspecting:', excelPath);

const workbook = xlsx.readFile(excelPath);
console.log('Sheets:', workbook.SheetNames);

const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

console.log('Total Rows:', jsonData.length);
if (jsonData.length > 0) {
  console.log('Columns:', Object.keys(jsonData[0]));
  console.log('Sample Row 0:', JSON.stringify(jsonData[0], null, 2));
  console.log('Sample Row 1:', JSON.stringify(jsonData[1], null, 2));
}
