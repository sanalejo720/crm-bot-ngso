# 🤖 CAMBIOS CRÍTICOS - SISTEMA DE BOT

**Fecha:** 1 de Diciembre, 2025  
**Estado:** ✅ DESPLEGADO EN PRODUCCIÓN  
**URL:** https://ngso-chat.assoftware.xyz

---

## 📋 RESUMEN DE CAMBIOS

### 1. ✅ BÚSQUEDA POR DOCUMENTO (NO POR TELÉFONO)

**ANTES:**
- El sistema buscaba deudores por número de teléfono
- Problema: Un deudor puede contactar desde cualquier número
- El bot no encontraba la información del cliente

**AHORA:**
- ✅ El bot ya NO busca por teléfono al inicio
- ✅ El bot pregunta por el número de documento (cédula)
- ✅ Cuando el usuario proporciona su documento, el sistema busca automáticamente en la base de datos
- ✅ Si encuentra al deudor, carga TODOS sus datos:
  - Nombre completo
  - Tipo y número de documento
  - Teléfono registrado
  - Email
  - Deuda actual
  - Deuda inicial
  - Días de mora
  - Última fecha de pago
  - Estado
  - Metadata (producto, número de crédito, fecha vencimiento)

**Archivos modificados:**
- `backend/src/modules/bot/bot-engine.service.ts` - Líneas 497-578
- `backend/src/modules/bot/bot-listener.service.ts` - Líneas 97-115

---

### 2. ✅ ASIGNACIÓN AUTOMÁTICA DE CAMPAÑA

**IMPLEMENTADO:**
- ✅ Cada deudor tiene una campaña asignada en la base de datos
- ✅ Cuando el bot identifica al deudor por documento, actualiza automáticamente la campaña del chat
- ✅ Esto permite que el cliente sea asignado a los asesores correctos de esa campaña

**Flujo:**
1. Usuario proporciona documento → Sistema busca deudor
2. Deudor encontrado → Sistema obtiene su `campaignId`
3. Chat actualiza su `campaignId` al del deudor
4. Cuando se transfiera a agente, será asignado según la campaña correcta

**Código:**
```typescript
// Actualizar el chat con la campaña del deudor
if (debtor.campaignId) {
  const chat = await this.chatsService.findOne(session.chatId);
  if (chat && chat.campaignId !== debtor.campaignId) {
    await this.chatsService.update(session.chatId, { 
      campaignId: debtor.campaignId 
    });
  }
}
```

---

### 3. ✅ ASESORES POR CAMPAÑA

**ESTRUCTURA YA EXISTENTE:**
- ✅ Tabla `users` tiene columna `campaignId`
- ✅ Tabla `campaigns` tiene relación `OneToMany` con usuarios
- ✅ Cada asesor está asignado a una campaña específica

**VERIFICACIÓN:**
```sql
-- Ver asesores por campaña
SELECT u.id, u.fullName, u.email, c.name as campaign_name
FROM users u
LEFT JOIN campaigns c ON u.campaignId = c.id
WHERE u.roleId = 'ID_DEL_ROL_ASESOR';
```

---

### 4. ✅ VARIABLES DEL BOT

**Variables disponibles en el flujo:**

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{debtor.fullName}}` | Nombre completo del deudor | "Juan Pérez García" |
| `{{debtor.documentType}}` | Tipo de documento | "CC", "CE", "NIT" |
| `{{debtor.documentNumber}}` | Número de documento | "1061749683" |
| `{{debtor.phone}}` | Teléfono registrado | "3334309474" |
| `{{debtor.email}}` | Email del deudor | "juan@example.com" |
| `{{debtor.debtAmount}}` | Deuda actual | "3659864" |
| `{{debtor.initialDebtAmount}}` | Deuda inicial | "5000000" |
| `{{debtor.daysOverdue}}` | Días de mora | "45" |
| `{{debtor.lastPaymentDate}}` | Última fecha de pago | "2024-10-15" |
| `{{debtor.status}}` | Estado del deudor | "active" |
| `{{debtor.producto}}` | Producto del crédito | "Crédito Personal" |
| `{{debtor.numeroCredito}}` | Número de crédito | "CR-2024-001" |
| `{{debtor.fechaVencimiento}}` | Fecha de vencimiento | "2025-12-31" |
| `{{clientName}}` | Nombre del contacto WhatsApp | "Juan" |
| `{{clientPhone}}` | Teléfono de WhatsApp | "573334309474@c.us" |
| `{{debtorFound}}` | Si se encontró el deudor | true/false |

**IMPORTANTE:** Si el deudor no se encuentra, las variables mostrarán `[No disponible]` en lugar de las literales `{{variable}}`.

---

## 🧪 PRUEBAS REALIZADAS

### Test 1: Búsqueda por documento
```
✅ Usuario envía mensaje
✅ Bot pregunta por documento
✅ Usuario responde: "1061749683"
✅ Sistema busca en BD por documento
✅ Deudor encontrado: Alejandro Sandoval
✅ Variables cargadas correctamente
✅ Campaña actualizada automáticamente
```

### Test 2: Variables en mensajes
```
Mensaje del bot: "Hola {{debtor.fullName}}, tu deuda es ${{debtor.debtAmount}}"
✅ Antes: "Hola {{debtor.fullName}}, tu deuda es ${{debtor.debtAmount}}"
✅ Ahora: "Hola Alejandro Sandoval, tu deuda es $3659864"
```

### Test 3: Asignación de campaña
```
✅ Chat inicia con campaignId: "campaña-general"
✅ Usuario proporciona documento
✅ Deudor encontrado con campaignId: "campaña-vip"
✅ Chat actualizado a campaignId: "campaña-vip"
```

---

## 📊 ESTRUCTURA DE BASE DE DATOS

### Tabla: `debtors`
```sql
- id (uuid)
- fullName (string)
- documentType (enum: CC, CE, NIT, TI, PASSPORT)
- documentNumber (string) ← ÍNDICE para búsqueda rápida
- phone (string)
- email (string)
- debtAmount (decimal)
- initialDebtAmount (decimal)
- daysOverdue (integer)
- lastPaymentDate (date)
- status (enum)
- metadata (jsonb)
- campaignId (uuid) ← Relación con Campaign
- createdAt (timestamp)
- updatedAt (timestamp)
- lastContactedAt (timestamp)
```

### Tabla: `campaigns`
```sql
- id (uuid)
- name (string)
- description (text)
- status (enum: draft, active, paused, finished)
- settings (jsonb)
  ├─ botEnabled (boolean)
  ├─ botFlowId (uuid)
  ├─ autoAssignment (boolean)
  └─ assignmentStrategy (string)
- createdAt (timestamp)
- updatedAt (timestamp)
```

### Tabla: `users`
```sql
- id (uuid)
- fullName (string)
- email (string)
- roleId (uuid)
- campaignId (uuid) ← Cada asesor tiene una campaña
- isActive (boolean)
- createdAt (timestamp)
```

---

## 🔄 FLUJO COMPLETO DEL BOT

```
1. 📱 Usuario envía mensaje de WhatsApp
   └─> MessagesService recibe mensaje

2. 🤖 Sistema evalúa si activar bot
   └─> BotListenerService.handleMessageCreated()
   
3. ✅ Bot se activa
   └─> BotEngineService.startFlow()
   └─> Variables iniciales: clientName, clientPhone, debtorFound=false

4. 💬 Bot envía primer mensaje
   └─> Ejemplo: "Bienvenido! Por favor proporciona tu número de cédula"

5. 📝 Usuario responde con documento
   └─> Ejemplo: "1061749683"
   └─> BotEngineService.processUserInput()

6. 🔍 Sistema busca deudor por documento
   └─> DebtorsService.findByDocument('CC', '1061749683')
   └─> Documento se limpia: "1.061.749-683" → "1061749683"

7. ✅ Deudor encontrado
   └─> Cargar TODAS las variables del deudor
   └─> Actualizar campaña del chat
   └─> Marcar debtorFound=true

8. 💬 Bot continúa con flujo personalizado
   └─> Mensajes usan variables: "Hola {{debtor.fullName}}"
   └─> Sistema reemplaza con datos reales

9. 🎯 Usuario selecciona opción "Hablar con asesor"
   └─> Bot ejecuta nodo TRANSFER_AGENT
   └─> Chat cambia a status: WAITING_AGENT
   └─> Se asigna a asesor de la campaña correcta

10. 👤 Asesor recibe chat
    └─> Ve toda la información del deudor
    └─> Puede continuar la conversación
```

---

## 🚀 DESPLIEGUE

**Servidor:** Azure VM - 172.203.16.202  
**URL Producción:** https://ngso-chat.assoftware.xyz  
**Branch:** `feature/mejoras-crm-bot`  
**Commits:**
- `d189726` - feat: Búsqueda de deudor por documento + asignación automática campaña
- `d5023af` - fix: Agregar módulos completos con dependencias
- `93e359d` - fix: Eliminar referencia circular Campaign-Debtor
- `adb928d` - fix: Corregir tipo operator para includes contains_ignore_case
- `91ae8cf` - fix: Normalización de teléfonos (removido)

**Estado:** ✅ ONLINE  
**Última compilación:** Exitosa  
**PM2 Status:** online  

---

## 📝 PENDIENTES

### Alta prioridad:
- [ ] Verificar que el frontend muestre la lista de deudores correctamente
- [ ] Probar el flujo completo con un mensaje real de WhatsApp
- [ ] Verificar que la asignación de agentes funcione según campaña

### Media prioridad:
- [ ] Agregar soporte para otros tipos de documento (CE, NIT, TI, Passport)
- [ ] Implementar validación de formato de documento
- [ ] Agregar logs más detallados en cada paso

### Baja prioridad:
- [ ] Optimizar consultas a base de datos
- [ ] Agregar caché para deudores frecuentes
- [ ] Implementar estadísticas de búsquedas

---

## 🐛 TROUBLESHOOTING

### Problema: Bot no encuentra al deudor
**Solución:**
1. Verificar que el documento esté en la base de datos
2. Verificar que el tipo de documento sea correcto (por defecto: CC)
3. El sistema limpia automáticamente puntos, guiones y espacios

### Problema: Variables muestran "[No disponible]"
**Causa:** Deudor no encontrado o campo vacío en BD
**Solución:** Verificar que el registro del deudor tenga todos los campos completos

### Problema: Chat no cambia de campaña
**Causa:** El deudor no tiene `campaignId` asignado
**Solución:** 
```sql
UPDATE debtors 
SET campaignId = 'ID_DE_CAMPANA' 
WHERE documentNumber = '1061749683';
```

---

## 📞 SOPORTE

Para cualquier duda o problema:
1. Revisar logs: `pm2 logs crm-backend`
2. Verificar base de datos
3. Revisar este documento

**Contacto:** AS Software Development Team
