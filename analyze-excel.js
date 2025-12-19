const XLSX = require('xlsx');

const filePath = '/tmp/desocupados 2023-2025.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log('Total filas:', data.length);

// Función normalizeRowKeys igual que en el backend
const getField = (row, variants) => {
  for (const key of Object.keys(row)) {
    if (variants.some(v => key.toLowerCase().includes(v.toLowerCase()))) {
      return row[key];
    }
  }
  return undefined;
};

const normalizeRowKeys = (row) => ({
  fullName: getField(row, ['nombre completo', 'nombre', 'fullname', 'name', 'cliente']),
  documentType: getField(row, ['tipo de contacto', 'tipo_doc', 'tipodoc', 'documenttype', 'tipo_documento', 'tipo contacto', 'tipo']),
  documentNumber: getField(row, ['numero de identificacion', 'número de identificación', 'documento', 'document', 'documentnumber', 'numero_documento', 'cedula', 'identificacion']),
  phone: getField(row, ['telefono', 'phone', 'celular', 'tel', 'movil', 'móvil', 'contacto']),
  assignedAgentName: getField(row, ['nombre asesor', 'asesor', 'agente', 'agent', 'agent_name', 'assigned_agent']),
  numeroCredito: getField(row, ['solicitud no', 'solicitud', 'credito', 'credit', 'numero_credito', 'cuenta', 'numero solicitud']),
});

// Analizar las primeras filas
console.log('\n=== Análisis de primeras 5 filas ===');
for (let i = 0; i < Math.min(5, data.length); i++) {
  const raw = data[i];
  const normalized = normalizeRowKeys(raw);
  
  console.log(`\nFila ${i + 2} (raw keys):`, Object.keys(raw));
  console.log(`Fila ${i + 2} (normalized):`, normalized);
  
  // Verificar campos requeridos
  const validation = {
    hasFullName: !!normalized.fullName,
    hasDocNumber: !!normalized.documentNumber,
    docValue: normalized.documentNumber,
    docType: typeof normalized.documentNumber
  };
  console.log(`Fila ${i + 2} (validacion):`, validation);
}

// Contar cuántas filas tienen documentNumber
let withDoc = 0;
let withoutDoc = 0;
for (const row of data) {
  const normalized = normalizeRowKeys(row);
  if (normalized.documentNumber) {
    withDoc++;
  } else {
    withoutDoc++;
  }
}
console.log('\n=== Resumen ===');
console.log('Con documentNumber:', withDoc);
console.log('Sin documentNumber:', withoutDoc);
