const xlsx = require('xlsx');

const files = ['/tmp/castigo.xlsx', '/tmp/desistidos.xlsx', '/tmp/desocupados 2023-2025.xlsx'];
const searchDoc = '71707874';

console.log(`Buscando documento: ${searchDoc}\n`);

files.forEach(f => {
  try {
    const wb = xlsx.readFile(f);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    const found = data.filter(row => {
      const docNum = String(row['Número de Identificación'] || '');
      return docNum === searchDoc || docNum.includes(searchDoc);
    });
    
    if (found.length > 0) {
      console.log(`✅ ENCONTRADO en ${f}:`);
      console.log(found);
    } else {
      console.log(`❌ No encontrado en ${f}`);
    }
  } catch (e) {
    console.log(`Error en ${f}: ${e.message}`);
  }
});
