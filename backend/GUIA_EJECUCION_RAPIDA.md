# ⚡ GUÍA DE EJECUCIÓN RÁPIDA - Implementación del Rediseño

## 🎯 Objetivo

Esta guía te permite implementar el rediseño completo en **menos de 4 horas** si ya leíste la documentación.

---

## 📋 Pre-requisitos

✅ Tener acceso SSH a `72.61.73.9`  
✅ Base de datos PostgreSQL corriendo  
✅ PM2 instalado en el servidor  
✅ Node.js 18+ instalado  
✅ Haber leído `RESUMEN_EJECUTIVO_ARQUITECTURA.md`  

---

## 🚀 FASE 1: Base de Datos (30 minutos)

### 1.1 Conectar a la base de datos

```bash
# Desde tu máquina local o servidor
psql -h 72.61.73.9 -U crm_admin -d crm_whatsapp
```

**Contraseña**: `CRM_NgsoPass2024!`

### 1.2 Ejecutar migración SQL

```bash
# Opción A: Desde archivo
cd d:\crm-ngso-whatsapp\backend
psql -h 72.61.73.9 -U crm_admin -d crm_whatsapp -f scripts/migrations/001-add-chat-state-machine.sql
```

```bash
# Opción B: Copiar y pegar
# 1. Abrir scripts/migrations/001-add-chat-state-machine.sql
# 2. Copiar todo el contenido
# 3. Pegarlo en la consola de psql
```

### 1.3 Verificar migración exitosa

```sql
-- Verificar campos nuevos
\d chats

-- Verificar tablas nuevas
\dt

-- Verificar índices
\di

-- Verificar vistas
\dv
```

**✅ Resultado esperado**:
- `chats` debe tener 10 campos nuevos
- Deben existir `chat_state_transitions` y `chat_response_metrics`
- Deben existir 8 índices nuevos (idx_chats_*, idx_transitions_*, idx_metrics_*)
- Deben existir 3 vistas (v_waiting_queue, v_upcoming_auto_close, v_agent_timeout_stats)

---

## 🔧 FASE 2: Backend - Entidades (45 minutos)

### 2.1 Actualizar Chat Entity

**Archivo**: `backend/src/modules/chats/entities/chat.entity.ts`

```bash
# Abrir archivo en VS Code
code d:\crm-ngso-whatsapp\backend\src\modules\chats\entities\chat.entity.ts
```

**Agregar después de los campos existentes**:

```typescript
// ============ NUEVOS CAMPOS - SISTEMA DE ESTADOS ============

@Column({ name: 'sub_status', nullable: true })
subStatus?: string;

@Column({ name: 'is_bot_active', default: false })
isBotActive: boolean;

@Column({ name: 'last_agent_message_at', type: 'timestamp', nullable: true })
lastAgentMessageAt?: Date;

@Column({ name: 'last_client_message_at', type: 'timestamp', nullable: true })
lastClientMessageAt?: Date;

@Column({ name: 'first_response_time_seconds', nullable: true })
firstResponseTimeSeconds?: number;

@Column({ name: 'agent_warning_sent', default: false })
agentWarningSent: boolean;

@Column({ name: 'client_warning_sent', default: false })
clientWarningSent: boolean;

@Column({ name: 'auto_close_scheduled_at', type: 'timestamp', nullable: true })
autoCloseScheduledAt?: Date;

@Column({ name: 'transfer_count', default: 0 })
transferCount: number;

@Column({ name: 'bot_restart_count', default: 0 })
botRestartCount: number;
```

**Agregar ENUMs al inicio del archivo**:

```typescript
export enum ChatStatus {
  BOT_INITIAL = 'bot_initial',
  BOT_VALIDATING = 'bot_validating',
  BOT_WAITING_QUEUE = 'bot_waiting_queue',
  AGENT_ASSIGNED = 'agent_assigned',
  AGENT_RESPONDING = 'agent_responding',
  AGENT_WAITING_CLIENT = 'agent_waiting_client',
  TRANSFERRING = 'transferring',
  CLOSING = 'closing',
  CLOSED = 'closed',
  SYSTEM_TIMEOUT = 'system_timeout',
  CLIENT_INACTIVE = 'client_inactive',
}

export enum ChatSubStatus {
  WAITING_DOCUMENT = 'waiting_document',
  VALIDATING_DOCUMENT = 'validating_document',
  DOCUMENT_APPROVED = 'document_approved',
  DOCUMENT_REJECTED = 'document_rejected',
  IN_QUEUE = 'in_queue',
  FIRST_CONTACT = 'first_contact',
  NEGOTIATING = 'negotiating',
  AWAITING_PAYMENT = 'awaiting_payment',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  RESOLVED = 'resolved',
  NO_AGREEMENT = 'no_agreement',
  CLIENT_DECLINED = 'client_declined',
}
```

### 2.2 Crear ChatStateTransition Entity

**Crear archivo**: `backend/src/modules/chats/entities/chat-state-transition.entity.ts`

```bash
code d:\crm-ngso-whatsapp\backend\src\modules\chats\entities\chat-state-transition.entity.ts
```

**Copiar contenido de**: `SOLUCION_CHAT_STATE_SERVICE.md` → Sección "ChatStateTransition Entity"

### 2.3 Crear ChatResponseMetrics Entity

**Crear archivo**: `backend/src/modules/chats/entities/chat-response-metrics.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Chat } from './chat.entity';
import { User } from '../../users/entities/user.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('chat_response_metrics')
export class ChatResponseMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chat_id' })
  chatId: string;

  @ManyToOne(() => Chat)
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @Column({ name: 'agent_id', nullable: true })
  agentId?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'agent_id' })
  agent?: User;

  @Column({ name: 'campaign_id', nullable: true })
  campaignId?: string;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign?: Campaign;

  @Column({ name: 'first_response_seconds', nullable: true })
  firstResponseSeconds?: number;

  @Column({ name: 'avg_agent_response_seconds', nullable: true })
  avgAgentResponseSeconds?: number;

  @Column({ name: 'avg_client_response_seconds', nullable: true })
  avgClientResponseSeconds?: number;

  @Column({ name: 'total_agent_messages', default: 0 })
  totalAgentMessages: number;

  @Column({ name: 'total_client_messages', default: 0 })
  totalClientMessages: number;

  @Column({ name: 'chat_duration_minutes', nullable: true })
  chatDurationMinutes?: number;

  @Column({ name: 'was_transferred', default: false })
  wasTransferred: boolean;

  @Column({ name: 'transfer_count', default: 0 })
  transferCount: number;

  @Column({ name: 'returned_to_bot', default: false })
  returnedToBot: boolean;

  @Column({ name: 'closed_by', nullable: true })
  closedBy?: string;

  @Column({ name: 'resolution_status', nullable: true })
  resolutionStatus?: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

---

## 🏗️ FASE 3: Backend - Servicios (2 horas)

### 3.1 Crear ChatStateService

**Crear archivo**: `backend/src/modules/chats/services/chat-state.service.ts`

```bash
code d:\crm-ngso-whatsapp\backend\src\modules\chats\services\chat-state.service.ts
```

**Copiar contenido completo de**: `SOLUCION_CHAT_STATE_SERVICE.md` → Sección "ChatStateService"

### 3.2 Crear AssignmentService

**Crear archivo**: `backend/src/modules/chats/services/assignment.service.ts`

**Copiar contenido completo de**: `SOLUCION_BOT_NO_ASIGNA.md` → Sección "AssignmentService"

### 3.3 Crear ReturnToBotService

**Crear archivo**: `backend/src/modules/chats/services/return-to-bot.service.ts`

**Copiar contenido completo de**: `SOLUCION_RETORNO_AL_BOT.md` → Sección "ReturnToBotService"

### 3.4 Crear TransferService

**Crear archivo**: `backend/src/modules/chats/services/transfer.service.ts`

**Copiar contenido completo de**: `SOLUCION_REASIGNACION.md` → Sección "TransferService"

### 3.5 Modificar BotExecutorService

**Archivo**: `backend/src/modules/bot/bot-executor.service.ts`

**Buscar método** `handleDocumentValidated()` y **reemplazar con**:

```typescript
async handleDocumentValidated(chatId: string) {
  const chat = await this.chatsRepository.findOne({
    where: { id: chatId },
    relations: ['campaign', 'whatsappNumber'],
  });

  // Enviar mensaje de espera
  const waitingMessage = `✅ *Documento validado correctamente*

Tu solicitud ha sido registrada exitosamente.

📋 Estás en cola de atención
⏱️ Un asesor será asignado pronto

*Por favor espera, no cierres esta conversación.*`;

  await this.whatsappService.sendMessage(
    chat.whatsappNumber.sessionName,
    chat.contactPhone,
    waitingMessage,
  );

  // Transicionar a cola de espera (NO asignar agente)
  await this.chatStateService.transition(
    chatId,
    ChatStatus.BOT_WAITING_QUEUE,
    ChatSubStatus.IN_QUEUE,
    {
      reason: 'Documento validado - En cola de asignación',
      triggeredBy: 'bot',
      metadata: {
        documentValidatedAt: new Date(),
        priority: this.calculatePriority(chat),
      },
    },
  );

  // Emitir evento para notificar a supervisores
  this.eventEmitter.emit('chat.ready.for.assignment', { chat });
}

private calculatePriority(chat: Chat): 'high' | 'medium' | 'low' {
  if (!chat.debtor) return 'low';

  const { amountOwed, daysOverdue } = chat.debtor;

  if (amountOwed > 10000 && daysOverdue > 60) return 'high';
  if (amountOwed > 5000 || daysOverdue > 30) return 'medium';
  return 'low';
}
```

### 3.6 Actualizar ChatsModule

**Archivo**: `backend/src/modules/chats/chats.module.ts`

**Agregar en providers**:

```typescript
providers: [
  ChatsService,
  ChatsExportService,
  ChatStateService,        // NUEVO
  AssignmentService,       // NUEVO
  ReturnToBotService,      // NUEVO
  TransferService,         // NUEVO
  // ... otros servicios
],
exports: [
  ChatsService,
  ChatStateService,        // NUEVO
  AssignmentService,       // NUEVO
  // ... otros exports
],
```

---

## ⏰ FASE 4: Backend - Workers (1 hora)

### 4.1 Crear TimeoutMonitorWorker

**Crear archivo**: `backend/src/modules/workers/timeout-monitor.worker.ts`

**Copiar contenido completo de**: `SOLUCION_NOTIFICACIONES_TIMEOUTS.md` → Sección "TimeoutMonitorWorker"

### 4.2 Crear AutoCloseWorker

**Crear archivo**: `backend/src/modules/workers/auto-close.worker.ts`

**Copiar contenido completo de**: `SOLUCION_AUTO_CIERRE_24H.md` → Sección "AutoCloseWorker"

### 4.3 Crear WorkersModule

**Crear archivo**: `backend/src/modules/workers/workers.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeoutMonitorWorker } from './timeout-monitor.worker';
import { AutoCloseWorker } from './auto-close.worker';
import { Chat } from '../chats/entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { ChatsModule } from '../chats/chats.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, User]),
    ChatsModule,
    WhatsappModule,
    GatewayModule,
  ],
  providers: [TimeoutMonitorWorker, AutoCloseWorker],
  exports: [TimeoutMonitorWorker, AutoCloseWorker],
})
export class WorkersModule {}
```

### 4.4 Registrar WorkersModule en AppModule

**Archivo**: `backend/src/app.module.ts`

```typescript
imports: [
  // ... otros módulos
  WorkersModule,  // AGREGAR AQUÍ
],
```

---

## 🎛️ FASE 5: Backend - Controllers (30 minutos)

### 5.1 Agregar endpoints a ChatsController

**Archivo**: `backend/src/modules/chats/chats.controller.ts`

**Agregar al final de la clase**:

```typescript
// ========== NUEVOS ENDPOINTS - SISTEMA DE ESTADOS ==========

@Post(':chatId/assign')
@Permissions('chats:assign')
async assignChat(
  @Param('chatId') chatId: string,
  @Body() dto: { agentId: string },
  @Req() req: any,
) {
  const chat = await this.assignmentService.assignChatToAgent(
    chatId,
    dto.agentId,
    req.user.id,
  );
  return {
    success: true,
    message: 'Chat asignado exitosamente',
    data: { chatId: chat.id, agentName: chat.assignedAgent?.fullName },
  };
}

@Get('waiting-queue')
@Permissions('chats:view-all')
async getWaitingQueue() {
  const chats = await this.assignmentService.getWaitingQueue();
  return {
    success: true,
    data: chats,
    count: chats.length,
  };
}

@Post(':chatId/return-to-bot')
@Permissions('chats:return-to-bot')
async returnToBot(
  @Param('chatId') chatId: string,
  @Body() dto: { returnReason: string; agentNotes?: string },
) {
  const result = await this.returnToBotService.returnChatToBot(
    chatId,
    dto.returnReason as any,
    dto.agentNotes,
  );
  return {
    success: true,
    message: 'Chat retornado al bot exitosamente',
    data: { chatId: result.chat.id, pdfPath: result.pdfPath },
  };
}

@Post(':chatId/transfer')
@Permissions('chats:transfer')
async transferChat(
  @Param('chatId') chatId: string,
  @Body() dto: { newAgentId: string; transferReason: string },
  @Req() req: any,
) {
  const chat = await this.transferService.transferChat(
    chatId,
    dto.newAgentId,
    dto.transferReason,
    req.user.id,
  );
  return {
    success: true,
    message: 'Chat transferido exitosamente',
    data: { chatId: chat.id, newAgentId: chat.assignedAgentId },
  };
}
```

---

## 🔧 FASE 6: Compilar y Desplegar (30 minutos)

### 6.1 Compilar Backend

```powershell
cd d:\crm-ngso-whatsapp\backend
npm run build
```

**✅ Debe compilar sin errores**

### 6.2 Copiar a Servidor

```powershell
# Comprimir dist
Compress-Archive -Path .\dist\ -DestinationPath dist.zip -Force

# Copiar a servidor
scp dist.zip root@72.61.73.9:/var/www/crm-ngso-whatsapp/backend/

# Conectar a servidor
ssh root@72.61.73.9
```

### 6.3 En el servidor

```bash
cd /var/www/crm-ngso-whatsapp/backend

# Backup del dist anterior
mv dist dist.backup.$(date +%Y%m%d_%H%M%S)

# Descomprimir nuevo dist
unzip -o dist.zip

# Reiniciar PM2
pm2 restart crm-backend

# Ver logs
pm2 logs crm-backend --lines 100
```

---

## ✅ FASE 7: Verificación (15 minutos)

### 7.1 Verificar logs sin errores

```bash
pm2 logs crm-backend --lines 200 | grep -E "ERROR|ChatStateService|TIMEOUT-MONITOR|AUTO-CLOSE"
```

**✅ No debe haber errores de importación o compilación**

### 7.2 Verificar workers corriendo

```bash
# Buscar en logs
pm2 logs crm-backend | grep -E "TIMEOUT-MONITOR|AUTO-CLOSE"
```

**✅ Deberías ver logs cada minuto**:
```
⏰ [TIMEOUT-MONITOR] Iniciando verificación de timeouts...
🕐 [AUTO-CLOSE] Iniciando verificación de chats mayores a 24 horas...
```

### 7.3 Probar endpoints

```bash
# Obtener token de autenticación
TOKEN="tu_token_jwt_aqui"

# Test 1: Ver cola de espera
curl -X GET http://72.61.73.9:3000/chats/waiting-queue \
  -H "Authorization: Bearer $TOKEN"

# Test 2: Ver chats próximos a cerrar
curl -X GET http://72.61.73.9:3000/chats/auto-close/upcoming \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎨 FASE 8: Frontend (Opcional - 2 horas)

*Esta fase puede hacerse en paralelo o después*

### Componentes a crear:

1. **WaitingQueuePanel.tsx** → Ver `SOLUCION_BOT_NO_ASIGNA.md`
2. **ReturnToBotButton.tsx** → Ver `SOLUCION_RETORNO_AL_BOT.md`
3. **TransferChatModal.tsx** → Ver `SOLUCION_REASIGNACION.md`
4. **UpcomingAutoCloseWidget.tsx** → Ver `SOLUCION_AUTO_CIERRE_24H.md`

---

## 🐛 Troubleshooting Rápido

### Error: Imports no encontrados

```bash
# Verificar que todos los servicios estén en ChatsModule
cat backend/src/modules/chats/chats.module.ts | grep "providers"
```

### Error: Workers no aparecen en logs

```bash
# Verificar que WorkersModule esté en AppModule
cat backend/src/app.module.ts | grep "WorkersModule"

# Verificar decorador @Cron
grep -r "@Cron" backend/src/modules/workers/
```

### Error: Campos no existen en base de datos

```sql
-- Verificar migración
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'chats' AND column_name LIKE 'last_%';
```

---

## 📊 Comandos Útiles Post-Implementación

### Ver transiciones de estado

```sql
SELECT 
  cst.created_at,
  c.contact_name,
  cst.from_status,
  cst.to_status,
  cst.reason
FROM chat_state_transitions cst
JOIN chats c ON c.id = cst.chat_id
ORDER BY cst.created_at DESC
LIMIT 20;
```

### Ver chats en cola

```sql
SELECT * FROM v_waiting_queue;
```

### Ver chats próximos a cerrar

```sql
SELECT * FROM v_upcoming_auto_close;
```

### Estadísticas de timeouts

```sql
SELECT * FROM v_agent_timeout_stats;
```

---

## ✅ Checklist Final

- [ ] Migración SQL ejecutada sin errores
- [ ] 10 campos nuevos en tabla `chats`
- [ ] 2 tablas nuevas creadas (transitions + metrics)
- [ ] 8 índices creados
- [ ] 3 vistas creadas
- [ ] 4 entities creadas/actualizadas (Chat, ChatStateTransition, ChatResponseMetrics)
- [ ] 4 servicios creados (ChatStateService, AssignmentService, ReturnToBotService, TransferService)
- [ ] 2 workers creados (TimeoutMonitorWorker, AutoCloseWorker)
- [ ] WorkersModule creado y registrado
- [ ] ChatsController actualizado con 4 endpoints nuevos
- [ ] Backend compilado sin errores
- [ ] Backend desplegado en servidor
- [ ] PM2 reiniciado exitosamente
- [ ] Logs muestran workers ejecutándose cada minuto
- [ ] Endpoints responden correctamente

---

**Tiempo total estimado: 3-4 horas** ⚡

¿Problemas? Revisa `PLAN_IMPLEMENTACION_COMPLETO.md` sección "Troubleshooting"
