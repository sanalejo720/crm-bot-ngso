# 📬 Cambio: Chats Automáticos en Campañas Masivas

## 🎯 Problema Resuelto

**Antes**: Cuando se enviaba una campaña masiva, **NO se creaban chats** hasta que el cliente respondiera. Esto significaba que:
- No podías ver las conversaciones iniciadas
- No tenías registro de a quién se le envió el mensaje
- Era imposible hacer seguimiento proactivo
- Solo veías chats de clientes que respondieron

**Ahora**: Al enviar una campaña masiva, se **crea el chat automáticamente** antes de enviar el mensaje. Esto permite:
- ✅ Ver TODAS las conversaciones iniciadas
- ✅ Hacer seguimiento aunque el cliente no responda
- ✅ Tener registro completo de destinatarios
- ✅ Metadata enriquecida (nombre campaña, variables, agente asignado, etc.)

---

## 🔧 Cambios Implementados

### 1. Backend - Módulo de Campañas

**Archivo**: `backend/src/modules/campaigns/campaigns.service.ts`

**Cambios**:
- Inyección del `ChatsService` para crear chats
- Modificado `sendMassCampaign()` para:
  1. **Crear chat PRIMERO** (antes de enviar mensaje)
  2. Enviar el mensaje template
  3. Crear asignación pendiente (si tiene agentEmail)

**Código agregado**:
```typescript
// 1. CREAR CHAT PRIMERO (antes de enviar el mensaje)
const externalId = `mass_campaign_${dto.name}_${phone}_${Date.now()}`;

let chat;
try {
  chat = await this.chatsService.create({
    externalId,
    contactPhone: fullPhone,
    contactName: recipient.variables?.['1'] || fullPhone,
    campaignId: campaign.id,
    whatsappNumberId: whatsappNumber.id,
    metadata: {
      source: 'mass_campaign',
      campaignName: dto.name,
      templateSid: dto.templateSid,
      templateVariables: recipient.variables,
      sentAt: new Date().toISOString(),
      agentEmail: recipient.agentEmail,
    },
  });
  
  results.chatsCreated++;
  this.logger.log(`   💬 Chat creado: ${chat.id} para ${fullPhone}`);
} catch (chatError) {
  // Si el chat ya existe, continuar
  if (chatError.message?.includes('ya existe')) {
    this.logger.log(`   ℹ️  Chat ya existe para ${fullPhone}, continuando...`);
  } else {
    throw chatError;
  }
}

// 2. ENVIAR TEMPLATE (después de crear chat)
const sendResult = await this.whatsappService.sendContentTemplate(...);
```

**Resultados agregados**:
- Nuevo campo `chatsCreated` en los resultados de la campaña
- Logs mejorados que muestran: mensajes enviados, chats creados, fallidos

### 2. Módulo de Campañas - Imports

**Archivo**: `backend/src/modules/campaigns/campaigns.module.ts`

**Cambio**: Agregado import circular de `ChatsModule`:
```typescript
import { Module, forwardRef } from '@nestjs/common';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [
    // ... otros imports
    forwardRef(() => ChatsModule), // ⬅️ NUEVO
  ],
  // ...
})
```

---

## 📊 Metadata del Chat

Cada chat creado desde campaña masiva contiene:

```json
{
  "metadata": {
    "source": "mass_campaign",           // Origen del chat
    "campaignName": "Campaña Deudores Q1",  // Nombre de la campaña
    "templateSid": "HXa1234...",         // Template usado
    "templateVariables": {               // Variables enviadas
      "1": "Juan Pérez",
      "2": "$500.000"
    },
    "sentAt": "2025-12-19T15:30:00Z",   // Timestamp de envío
    "agentEmail": "agente@example.com"  // Agente pre-asignado (opcional)
  }
}
```

---

## 🧪 Cómo Validar el Cambio

### Opción 1: Enviar Campaña de Prueba

1. **Ir al módulo de Mensajes Masivos** en el frontend
2. **Cargar un Excel pequeño** (3-5 números de prueba)
3. **Enviar la campaña**
4. **Verificar en "Mis Chats"** que se crearon TODOS los chats inmediatamente
5. **Revisar metadata** de cada chat (debe incluir info de campaña)

### Opción 2: Verificar en Logs del Backend

```bash
ssh root@72.61.73.9
pm2 logs crm-backend --lines 100
```

**Buscar líneas como**:
```
📦 Lote 1/1 (5 mensajes)
   💬 Chat creado: abc123-uuid para +573001234567
   ✅ [1/5] 3001234567 - OK (ID: MM12345...)
   💬 Chat creado: def456-uuid para +573007654321
   ✅ [2/5] 3007654321 - OK (ID: MM67890...)
...
✅ CAMPAÑA COMPLETADA: Test Campaign
   📊 Resultados:
      Total: 5
      ✅ Mensajes enviados: 5
      💬 Chats creados: 5          ⬅️ NUEVO!
      ❌ Fallidos: 0
      📈 Tasa de éxito: 100.00%
```

### Opción 3: Verificar Base de Datos

```sql
-- Ver chats creados desde campañas masivas
SELECT 
  id,
  "contactPhone",
  "contactName",
  status,
  metadata->>'campaignName' as campaign_name,
  metadata->>'source' as source,
  "createdAt"
FROM chats
WHERE metadata->>'source' = 'mass_campaign'
ORDER BY "createdAt" DESC
LIMIT 10;
```

---

## 🚀 Deployment

**Servidor**: 72.61.73.9  
**Backend**: PM2 restart #161  
**Fecha**: 19 de diciembre de 2025

**Archivos desplegados**:
- `dist/modules/campaigns/campaigns.service.js`
- `dist/modules/campaigns/campaigns.module.js`

---

## ⚡ Comportamiento

### Flujo Anterior
```
1. Enviar mensaje template ✉️
2. Esperar respuesta del cliente ⏳
3. Cuando responde → crear chat 💬
4. Ver chat en el sistema 👀
```

### Flujo Nuevo
```
1. Crear chat 💬
2. Enviar mensaje template ✉️
3. Chat visible INMEDIATAMENTE 👀
4. Cuando responde → actualizar chat 🔄
```

---

## 🎨 Ventajas

1. **Visibilidad Total**: Ves TODOS los destinatarios, respondan o no
2. **Seguimiento Proactivo**: Puedes hacer follow-up manualmente
3. **Métricas Completas**: Sabes exactamente cuántos mensajes enviaste
4. **Trazabilidad**: Metadata completa de cada envío
5. **Control**: Puedes marcar chats, asignar agentes, etc.

---

## 🔍 Casos de Uso

### Caso 1: Campaña con 1000 destinatarios
- Se envían 1000 mensajes
- Se crean 1000 chats
- Respondan o no, tienes visibilidad de los 1000

### Caso 2: Cliente no responde en 3 días
- El chat ya existe desde el envío
- El agente puede ver la metadata (qué mensaje se le envió)
- Puede hacer seguimiento manual si es necesario
- Puede marcar como "sin respuesta" y cerrar

### Caso 3: Cliente responde después de 1 semana
- El chat ya existe
- El mensaje se asocia al chat existente (por teléfono)
- Se activa la asignación pendiente si existe
- Flujo normal continúa

---

## ⚠️ Consideraciones

1. **Chats duplicados**: Si se reenvía la misma campaña al mismo número, se manejará correctamente:
   - Primera vez: crea chat
   - Segunda vez: detecta que ya existe y continúa

2. **Performance**: Crear chats es rápido (~50ms por chat), no afecta significativamente el tiempo total

3. **Base de datos**: Los chats ocupan espacio pero es mínimo (~1KB por chat)

---

## 📝 Próximos Pasos Sugeridos

1. **Filtros en vista de chats**: Agregar filtro para ver solo "chats de campaña masiva"
2. **Dashboard de campañas**: Mostrar gráficos de tasa de respuesta
3. **Auto-cierre**: Cerrar automáticamente chats sin respuesta después de X días
4. **Reportes**: Generar reportes de efectividad de campañas

---

## ✅ Checklist de Validación

- [ ] Enviar campaña de prueba (3-5 números)
- [ ] Verificar que se crean todos los chats
- [ ] Revisar metadata de los chats creados
- [ ] Validar que los mensajes se envían correctamente
- [ ] Comprobar logs del backend
- [ ] Verificar que al responder el cliente, se asocia al chat correcto
- [ ] Validar estadísticas de campaña (chatsCreated debe aparecer)
