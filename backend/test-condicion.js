// Script para probar evaluación de condiciones

const condiciones = [
  {
    variable: 'user_response',
    value: '1',
    operator: 'equals',
    nextNodeId: 'fc63d498-4b1e-4869-bace-10aa51cc6ec3'
  },
  {
    variable: 'user_response',
    value: 'acepto',
    operator: 'contains_ignore_case',
    nextNodeId: 'fc63d498-4b1e-4869-bace-10aa51cc6ec3'
  },
  {
    variable: 'user_response',
    value: 'si',
    operator: 'contains_ignore_case',
    nextNodeId: 'fc63d498-4b1e-4869-bace-10aa51cc6ec3'
  }
];

const variables = { user_response: '1' };

console.log('🔍 PROBANDO EVALUACIÓN DE CONDICIONES\n');
console.log('Variables disponibles:', variables);
console.log('');

for (const condition of condiciones) {
  const variableValue = variables[condition.variable];
  
  console.log(`📋 Condición ${condiciones.indexOf(condition) + 1}:`);
  console.log(`   Variable: ${condition.variable}`);
  console.log(`   Valor en sesión: "${variableValue}" (tipo: ${typeof variableValue})`);
  console.log(`   Esperado: "${condition.value}" (tipo: ${typeof condition.value})`);
  console.log(`   Operador: ${condition.operator}`);
  
  let matches = false;

  switch (condition.operator) {
    case 'equals':
      matches = String(variableValue) === String(condition.value);
      console.log(`   Comparación: String("${variableValue}") === String("${condition.value}")`);
      break;
    case 'contains':
      matches = String(variableValue).includes(String(condition.value));
      console.log(`   Comparación: "${variableValue}".includes("${condition.value}")`);
      break;
    case 'contains_ignore_case':
      matches = String(variableValue).toLowerCase().includes(String(condition.value).toLowerCase());
      console.log(`   Comparación: "${variableValue}".toLowerCase().includes("${condition.value}".toLowerCase())`);
      break;
  }

  console.log(`   Resultado: ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
  console.log('');
  
  if (matches) {
    console.log(`🎯 Condición encontrada! Siguiente nodo: ${condition.nextNodeId}`);
    break;
  }
}

console.log('Fin de prueba');
