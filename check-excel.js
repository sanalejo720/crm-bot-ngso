const xlsx = require('xlsx');
const path = require('path');

const files = ['/tmp/castigo.xlsx', '/tmp/desistidos.xlsx', '/tmp/desocupados 2023-2025.xlsx'];

files.forEach(file => {
  try {
    const wb = xlsx.readFile(file);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    // Obtener datos sin convertir a JSON para ver estructura real
    const range = xlsx.utils.decode_range(sheet['!ref']);
    console.log(`\n=== ${path.basename(file)} ===`);
    
    // Imprimir las primeras columnas de la fila header
    const headers = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = xlsx.utils.encode_cell({ r: 0, c: col });
      const cell = sheet[cellAddress];
      headers.push(cell ? cell.v : '(vacío)');
    }
    console.log('Headers por columna:', headers);
    
    // Imprimir primera fila de datos
    const row1 = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = xlsx.utils.encode_cell({ r: 1, c: col });
      const cell = sheet[cellAddress];
      row1.push(cell ? cell.v : '(vacío)');
    }
    console.log('Fila 1:', row1);
    
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log('Total filas:', data.length);
  } catch (e) {
    console.error(`Error en ${file}:`, e.message);
  }
});
