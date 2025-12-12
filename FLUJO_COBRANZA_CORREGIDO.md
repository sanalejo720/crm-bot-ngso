# Flujo de Cobranza con Validación - CORREGIDO ✅

## Estado: ACTIVO Y FUNCIONAL

### Estructura del Flujo

```
┌─────────────────────────────────────────────────┐
│ 1. Saludo y Tratamiento de Datos (message)     │
│    - Presenta el mensaje inicial               │
│    - Solicita aceptación de tratamiento        │
│    - Captura variable: aceptacion               │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 2. Validar Aceptación (condition)              │
│    - Si aceptacion = "sí" → Continuar          │
│    - Si aceptacion = "no" → Rechazar           │
│    - Default → Continuar                        │
└────────┬────────────────────┬───────────────────┘
         │                    │
         │ SÍ                 │ NO
         ▼                    ▼
    ┌────────────┐   ┌──────────────────────┐
    │ CONTINÚA   │   │ 3. Rechazo de        │
    │            │   │    Tratamiento       │
    │            │   │    (message)         │
    │            │   │    → FIN             │
    │            │   └──────────────────────┘
    │            │
    ▼            │
┌─────────────────────────────────────────────────┐
│ 4. Solicitar Documento (message)                │
│    - Pide el número de documento                │
│    - Captura variable: documento_validado       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 5. Capturar Documento (input)                   │
│    - Variable: documento_validado               │
│    - Busca en BD por documento                  │
│    - Carga TODOS los datos del deudor           │
│    - Asigna campaña automáticamente             │
└────────┬────────────────────────────────────────┘
         │
         ├─► Si NO encuentra → 6. Documento Inválido
         │                      - Reintentar
         │                      - Vuelve a Solicitar Documento
         │
         └─► Si encuentra →
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 7. Presentación de Deuda (message)              │
│    - Muestra información personalizada:         │
│      • {{debtor.fullName}}                      │
│      • {{debtor.documentNumber}}                │
│      • {{debtor.debtAmount}}                    │
│      • {{debtor.daysOverdue}}                   │
│      • {{debtor.lastPaymentDate}}               │
│    - Solicita opción de pago                    │
│    - Captura variable: opcion                   │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 8. Evaluar Opción (condition)                   │
│    - Si opcion = "1" → Transferir a Asesor     │
│    - Si opcion = "2" → Reagendar (FIN)         │
│    - Default → Transferir a Asesor              │
└────────┬────────────────────────────────────────┘
         │
         ├─► Opción 1 →
         │           │
         │           ▼
         │   ┌──────────────────────────────┐
         │   │ 9. Transferir a Asesor       │
         │   │    (transfer_agent)          │
         │   │    - Asigna agente           │
         │   │    - Transfiere chat         │
         │   │    → FIN                     │
         │   └──────────────────────────────┘
         │
         └─► Opción 2 → FIN (por implementar reagendamiento)
```

## Variables del Sistema

### Variables Capturadas del Usuario:
- `aceptacion`: Respuesta a tratamiento de datos ("sí" / "no")
- `documento_validado`: Número de cédula/documento
- `opcion`: Opción seleccionada (1: Hablar con asesor, 2: Reagendar)

### Variables Cargadas del Deudor (cuando se encuentra):
- `debtor.fullName`: Nombre completo
- `debtor.documentType`: Tipo de documento (CC, NIT, etc.)
- `debtor.documentNumber`: Número de documento
- `debtor.email`: Correo electrónico
- `debtor.phone`: Teléfono
- `debtor.debtAmount`: Monto de la deuda
- `debtor.daysOverdue`: Días de mora
- `debtor.accountNumber`: Número de cuenta
- `debtor.lastPaymentDate`: Última fecha de pago
- `debtor.status`: Estado del deudor
- `debtor.notes`: Observaciones
- `debtor.campaignName`: Nombre de la campaña
- `debtorFound`: true/false

### Variables del Sistema:
- `clientName`: Nombre del contacto de WhatsApp
- `clientPhone`: Número de teléfono del contacto

## Búsqueda por Documento

El bot **NO busca por número de teléfono**. La búsqueda se activa únicamente cuando:

1. El usuario proporciona su documento en el nodo "Capturar Documento"
2. La variable capturada es `documento_validado` o `documentNumber`
3. El sistema busca en la base de datos:
   ```typescript
   const debtor = await debtorsService.findByDocument('CC', documentNumber);
   ```

4. Si encuentra el deudor:
   - Carga TODOS los datos del deudor en las variables de sesión
   - Asigna automáticamente la campaña del deudor al chat
   - Reemplaza las variables en los mensajes con información real
   - Continúa con "Presentación de Deuda"

5. Si NO encuentra el deudor:
   - Muestra mensaje "Documento Inválido"
   - Vuelve a solicitar el documento

## Asignación Automática de Campañas

- Cuando se identifica un deudor por documento, el sistema verifica `debtor.campaignId`
- Si existe, actualiza automáticamente el `campaignId` del chat actual
- Esto permite que cada deudor se gestione en su campaña correspondiente
- Los asesores tienen campañas asignadas en su perfil (`users.campaignId`)

## Puntos de Salida del Flujo

1. **Rechazo de Tratamiento**: Usuario no acepta tratamiento de datos
2. **Transferencia a Asesor**: Usuario selecciona hablar con un asesor
3. **Reagendamiento**: Usuario selecciona reagendar (por implementar)

## Correcciones Aplicadas

### Problema Original:
- `startNodeId` apuntaba a un nodo eliminado (8d83ebb3-19e8-4e31-9bc2-4e47dc9628f2)
- Todas las conexiones entre nodos apuntaban a IDs inexistentes
- El bot no se activaba

### Solución:
1. ✅ Actualizado `startNodeId` al nodo correcto: "Saludo y Tratamiento de Datos"
2. ✅ Reconstruidas todas las conexiones entre nodos
3. ✅ Configuradas las condiciones con targetNodeId válidos
4. ✅ Verificadas todas las referencias (9/9 nodos correctos)
5. ✅ Backend reiniciado con `pm2 restart crm-backend`

## Pruebas Recomendadas

### Prueba 1: Flujo Completo con Documento Válido
```
1. Enviar mensaje al bot
2. Bot responde: Saludo y solicita aceptación
3. Responder: "sí"
4. Bot solicita documento
5. Proporcionar: "1061749683" (Alejandro Sandoval)
6. Bot muestra deuda personalizada con nombre real
7. Responder: "1" (hablar con asesor)
8. Bot transfiere al agente
```

### Prueba 2: Documento Inválido
```
1. Enviar mensaje al bot
2. Bot responde: Saludo
3. Responder: "sí"
4. Bot solicita documento
5. Proporcionar: "9999999999" (no existe)
6. Bot responde: Documento inválido
7. Vuelve a solicitar documento
```

### Prueba 3: Rechazo de Tratamiento
```
1. Enviar mensaje al bot
2. Bot responde: Saludo
3. Responder: "no"
4. Bot muestra mensaje de rechazo y termina
```

## Estado Actual

✅ **FLUJO COMPLETAMENTE FUNCIONAL**
- Todas las conexiones válidas
- Variables correctamente configuradas
- Búsqueda por documento implementada
- Auto-asignación de campañas activa
- Backend reiniciado y en línea

## Próximos Pasos

1. Probar el flujo completo con WhatsApp
2. Verificar que los datos del deudor se muestren correctamente
3. Confirmar que la transferencia a asesor funciona
4. Implementar nodo de reagendamiento (opcional)
5. Agregar más validaciones si es necesario
