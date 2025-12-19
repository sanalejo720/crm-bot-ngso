const xlsx = require('xlsx');
const path = require('path');

// Cargar archivo de ASESORES
const wbAsesores = xlsx.readFile('/tmp/ASESORES.xlsx');
const sheetAsesores = wbAsesores.Sheets[wbAsesores.SheetNames[0]];
const asesoresData = xlsx.utils.sheet_to_json(sheetAsesores, { header: 1 });

console.log('\n=== ASESORES.xlsx ===');
console.log('Columnas:', asesoresData[0]);
console.log('Total filas:', asesoresData.length - 1);

// Extraer nombres de asesores
const asesoresList = [];
for (let i = 1; i < asesoresData.length; i++) {
  const row = asesoresData[i];
  if (row && row.length > 0) {
    // Buscar columna con nombre
    for (const val of row) {
      if (typeof val === 'string' && val.trim().length > 0) {
        asesoresList.push(val.trim().toUpperCase());
        break;
      }
    }
  }
}
console.log('\nAsesores registrados:', asesoresList.length);
console.log(asesoresList);

// Función para extraer nombres únicos de asesores de un archivo
function getUniqueAgents(filePath, columnIndex) {
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  const agents = new Set();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row && row[columnIndex]) {
      agents.add(row[columnIndex].toString().trim().toUpperCase());
    }
  }
  return Array.from(agents);
}

// Extraer asesores de cada archivo
console.log('\n=== ASESORES EN BASES ===');

// Desistidos: columna 4 (Nombre Asesor)
const desistidosAgents = getUniqueAgents('/tmp/desistidos.xlsx', 4);
console.log('\nDesistidos - Asesores únicos:', desistidosAgents.length);

// Desocupados: columna 4 (ASESOR)
const desocupadosAgents = getUniqueAgents('/tmp/desocupados 2023-2025.xlsx', 4);
console.log('Desocupados - Asesores únicos:', desocupadosAgents.length);

// Castigo: columna 4 (está mal nombrada como "Nombre completo" pero son asesores)
const castigoAgents = getUniqueAgents('/tmp/castigo.xlsx', 4);
console.log('Castigo - Asesores únicos:', castigoAgents.length);

// Unir todos los asesores de las bases
const allBaseAgents = new Set([...desistidosAgents, ...desocupadosAgents, ...castigoAgents]);
console.log('\nTotal asesores únicos en bases:', allBaseAgents.size);

// Comparar con lista de ASESORES.xlsx
console.log('\n=== COMPARACIÓN ===');
const asesoresSet = new Set(asesoresList);

// Encontrar coincidencias exactas
const exactMatches = [];
const partialMatches = [];
const noMatch = [];

for (const agent of allBaseAgents) {
  if (asesoresSet.has(agent)) {
    exactMatches.push(agent);
  } else {
    // Buscar coincidencia parcial
    let found = false;
    for (const asesor of asesoresList) {
      // Buscar si alguna parte del nombre coincide
      const agentParts = agent.split(' ');
      const asesorParts = asesor.split(' ');
      
      // Contar coincidencias de partes
      let matches = 0;
      for (const part of agentParts) {
        if (part.length > 2 && asesorParts.some(ap => ap.includes(part) || part.includes(ap))) {
          matches++;
        }
      }
      
      if (matches >= 2) {
        partialMatches.push({ base: agent, asesor: asesor, matches });
        found = true;
        break;
      }
    }
    if (!found) {
      noMatch.push(agent);
    }
  }
}

console.log('\n✅ Coincidencias exactas:', exactMatches.length);
exactMatches.forEach(m => console.log('  ', m));

console.log('\n🔄 Coincidencias parciales:', partialMatches.length);
partialMatches.forEach(m => console.log(`  ${m.base} -> ${m.asesor}`));

console.log('\n❌ Sin coincidencia:', noMatch.length);
noMatch.forEach(m => console.log('  ', m));

// Mostrar asesores de ASESORES.xlsx que no están en las bases
const basesSet = new Set([...allBaseAgents]);
const notInBases = asesoresList.filter(a => !basesSet.has(a) && !partialMatches.some(p => p.asesor === a));
console.log('\n📋 Asesores en archivo pero no en bases:', notInBases.length);
notInBases.forEach(m => console.log('  ', m));
