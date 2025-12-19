const XLSX = require('xlsx');
const path = require('path');

const filePath = '/tmp/desocupados 2023-2025.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log('Total filas en archivo:', data.length);

// Buscar el documento 71707874
const target = data.find(row => {
  const docNum = Object.values(row).find(val => 
    val && val.toString().includes('71707874')
  );
  return docNum;
});

if (target) {
  console.log('\n✅ ENCONTRADO:');
  console.log(JSON.stringify(target, null, 2));
  
  // Encontrar el índice
  const idx = data.findIndex(row => row === target);
  console.log('\nÍndice en archivo:', idx);
} else {
  console.log('\n❌ NO ENCONTRADO');
}

// Ver estructura de primeras filas
console.log('\n=== Columnas disponibles ===');
if (data.length > 0) {
  console.log(Object.keys(data[0]));
}

// Mostrar algunas filas con valores problemáticos (números con puntos)
console.log('\n=== Muestreo de filas ===');
for (let i = 0; i < Math.min(5, data.length); i++) {
  console.log(`Fila ${i}:`, JSON.stringify(data[i]));
}
