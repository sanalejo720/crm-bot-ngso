const XLSX = require('xlsx');

const files = [
  '/tmp/castigo.xlsx',
  '/tmp/desistidos.xlsx',
  '/tmp/desocupados 2023-2025.xlsx'
];

let total = 0;
files.forEach(f => {
  const wb = XLSX.readFile(f);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);
  console.log(f + ': ' + data.length + ' filas');
  total += data.length;
});

console.log('TOTAL: ' + total);
