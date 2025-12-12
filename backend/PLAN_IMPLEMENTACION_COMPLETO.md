# 🏗️ PLAN DE IMPLEMENTACIÓN COMPLETO - Arquitectura de Estados y Automatización

## 📋 Resumen Ejecutivo

Este documento integra las **7 soluciones** diseñadas para resolver los **5 problemas críticos** del CRM WhatsApp:

| Problema | Solución | Archivos |
|----------|----------|----------|
| **1. Cliente "activo" sin asignación** | Estado BOT_WAITING_QUEUE + AssignmentService | SOLUCION_BOT_NO_ASIGNA.md |
| **2. Retorno al bot incorrecto** | ReturnToBotService con PDF + mensaje automatizado | SOLUCION_RETORNO_AL_BOT.md |
| **3. Reasignación cierra conversación** | TransferService con estado TRANSFERRING | SOLUCION_REASIGNACION.md |
| **4. Sin notificaciones ni timeouts** | TimeoutMonitorWorker + WebSockets | SOLUCION_NOTIFICACIONES_TIMEOUTS.md |
| **5. Chats >24h no cierran** | AutoCloseWorker + estadísticas | SOLUCION_AUTO_CIERRE_24H.md |

**Componentes Base:**
- **SOLUCION_ESTADOS_CHAT.md**: 11 estados + 12 sub-estados + migración SQL
- **SOLUCION_CHAT_STATE_SERVICE.md**: Controlador central de transiciones

---

## 🗂️ Estructura de Archivos a Crear/Modificar

### 📁 Backend - Nuevas Entidades

```
backend/src/modules/chats/entities/
├── chat.entity.ts (MODIFICAR - agregar campos)
├── chat-state-transition.entity.ts (CREAR)
└── chat-response-metrics.entity.ts (CREAR)
```

### 📁 Backend - Nuevos Servicios

```
backend/src/modules/chats/services/
├── chat-state.service.ts (CREAR - controlador central)
├── assignment.service.ts (CREAR - asignación manual)
├── return-to-bot.service.ts (CREAR - retorno al bot)
└── transfer.service.ts (CREAR - transferencias)

backend/src/modules/workers/
├── timeout-monitor.worker.ts (CREAR - monitoreo timeouts)
├── auto-close.worker.ts (CREAR - cierre automático 24h)
└── workers.module.ts (CREAR - módulo de workers)

backend/src/modules/gateway/
└── gateway.service.ts (MODIFICAR - agregar métodos WebSocket)
```

### 📁 Backend - Controllers

```
backend/src/modules/chats/
└── chats.controller.ts (MODIFICAR - agregar endpoints)
```

### 📁 Backend - DTOs

```
backend/src/modules/chats/dto/
├── assign-chat.dto.ts (CREAR)
├── return-to-bot.dto.ts (CREAR)
└── transfer-chat.dto.ts (CREAR)
```

### 📁 Frontend - Componentes

```
frontend/src/components/chat/
├── ReturnToBotButton.tsx (CREAR)
├── TransferChatModal.tsx (CREAR)
└── ChatStateIndicator.tsx (CREAR)

frontend/src/components/dashboard/
├── WaitingQueuePanel.tsx (CREAR)
└── UpcomingAutoCloseWidget.tsx (CREAR)

frontend/src/hooks/
└── useNotifications.ts (CREAR)

frontend/src/utils/
└── sounds.ts (CREAR)
```

### 📁 SQL Migrations

```
backend/scripts/migrations/
├── 001-add-chat-state-fields.sql (CREAR)
├── 002-create-state-transitions-table.sql (CREAR)
└── 003-create-response-metrics-table.sql (CREAR)
```

---

## 🚀 Orden de Implementación (Crítico)

### FASE 1: Fundación - Base de Datos y Entidades
**Duración estimada: 1 hora**

1. **Ejecutar migración SQL** (SOLUCION_ESTADOS_CHAT.md)
   ```bash
   psql -h 72.61.73.9 -U crm_admin -d crm_whatsapp -f scripts/migrations/001-add-chat-state-fields.sql
   ```
   - Agregar 10 campos nuevos a `chats`
   - Crear tabla `chat_state_transitions`
   - Crear tabla `chat_response_metrics`
   - Crear 4 índices

2. **Actualizar Chat entity**
   - Agregar nuevos campos al modelo TypeORM
   - Agregar enum ChatStatus (11 estados)
   - Agregar enum ChatSubStatus (12 sub-estados)

3. **Crear ChatStateTransition entity**
   - Relación con Chat y User
   - Campos de auditoría completos

4. **Crear ChatResponseMetrics entity**
   - Métricas de rendimiento por agente/campaña

### FASE 2: Controlador de Estado Central
**Duración estimada: 2 horas**

5. **Implementar ChatStateService** (SOLUCION_CHAT_STATE_SERVICE.md)
   - Método `transition()` con transacciones
   - Método `validateTransition()` con matriz de estados
   - Método `updateRelatedFields()` automático
   - Método `emitStateEvents()` para eventos
   - Implementar pessimistic locking

6. **Registrar ChatStateService en ChatsModule**
   ```typescript
   providers: [ChatStateService, ...],
   exports: [ChatStateService]
   ```

### FASE 3: Corrección del Flujo del Bot
**Duración estimada: 1.5 horas**

7. **Modificar BotExecutorService** (SOLUCION_BOT_NO_ASIGNA.md)
   - Cambiar `handleDocumentValidated()` para transicionar a `BOT_WAITING_QUEUE`
   - Eliminar asignación automática de agente
   - Agregar `calculatePriority()`

8. **Crear AssignmentService** (SOLUCION_BOT_NO_ASIGNA.md)
   - Método `assignChatToAgent()`
   - Método `getWaitingQueue()`
   - Método `findAvailableAgent()`

9. **Agregar endpoints al ChatsController**
   ```typescript
   POST /chats/:chatId/assign
   GET /chats/waiting-queue
   ```

### FASE 4: Retorno al Bot y Transferencias
**Duración estimada: 2 horas**

10. **Crear ReturnToBotService** (SOLUCION_RETORNO_AL_BOT.md)
    - Método `returnChatToBot()`
    - Generar PDF antes de cerrar
    - Mensaje de despedida personalizado
    - Reiniciar contexto del bot

11. **Crear TransferService** (SOLUCION_REASIGNACION.md)
    - Método `transferChat()`
    - Estado temporal `TRANSFERRING`
    - Notificaciones WebSocket a ambos agentes
    - Mensaje al cliente sobre transferencia

12. **Agregar endpoints al ChatsController**
    ```typescript
    POST /chats/:chatId/return-to-bot
    POST /chats/:chatId/transfer
    GET /chats/:chatId/transfer-history
    ```

### FASE 5: Workers y Automatización
**Duración estimada: 2.5 horas**

13. **Crear TimeoutMonitorWorker** (SOLUCION_NOTIFICACIONES_TIMEOUTS.md)
    - Método `checkAgentTimeouts()` (5 min warning, 6 min close)
    - Método `checkClientTimeouts()` (5 min warning, 6 min close)
    - Cron cada minuto

14. **Crear AutoCloseWorker** (SOLUCION_AUTO_CIERRE_24H.md)
    - Método `checkAndCloseOldChats()` (24 horas)
    - Procesamiento por lotes (50 chats)
    - Generación de PDF automática
    - Cron cada minuto

15. **Crear WorkersModule**
    ```typescript
    imports: [TypeOrmModule, ChatsModule, WhatsappModule, GatewayModule]
    providers: [TimeoutMonitorWorker, AutoCloseWorker]
    ```

16. **Registrar WorkersModule en AppModule**

### FASE 6: WebSockets y Notificaciones
**Duración estimada: 1.5 horas**

17. **Extender GatewayService** (SOLUCION_NOTIFICACIONES_TIMEOUTS.md)
    - `notifyAgentTimeout()`
    - `notifyAgentClientTimeout()`
    - `playSoundNotification()`
    - `sendBrowserNotification()`
    - `notifyAgentChatClosed()`

18. **Crear useNotifications hook** (Frontend)
    - Escuchar eventos WebSocket
    - Reproducir sonidos
    - Mostrar notificaciones del navegador
    - Toggle de activación/desactivación

19. **Implementar utilidad de sonidos** (Frontend)
    - Archivos MP3 en `/public/sounds/`
    - Función `playSound()`

### FASE 7: Componentes Frontend
**Duración estimada: 3 horas**

20. **Crear ReturnToBotButton** (SOLUCION_RETORNO_AL_BOT.md)
    - Modal con select de motivos
    - TextArea para notas del agente

21. **Crear TransferChatModal** (SOLUCION_REASIGNACION.md)
    - Select de agentes disponibles
    - Mostrar contador de chats por agente
    - Input de motivo de transferencia

22. **Crear WaitingQueuePanel** (SOLUCION_BOT_NO_ASIGNA.md)
    - Lista de chats en espera
    - Ordenamiento por prioridad
    - Botón de asignación manual

23. **Crear UpcomingAutoCloseWidget** (SOLUCION_AUTO_CIERRE_24H.md)
    - Lista de chats próximos a cerrar
    - Indicador de urgencia (colores)
    - Actualización en tiempo real

24. **Crear ChatStateIndicator**
    - Badge visual del estado actual
    - Colores por estado
    - Tooltip con información

### FASE 8: Testing y Validación
**Duración estimada: 2 horas**

25. **Testing de transiciones de estado**
    - Probar todas las transiciones permitidas
    - Verificar validaciones (transiciones inválidas)

26. **Testing de workers**
    - Timeout de agente (5 min)
    - Timeout de cliente (5 min)
    - Auto-cierre 24 horas
    - Verificar generación de PDFs

27. **Testing de notificaciones**
    - WebSocket conectado
    - Sonidos reproduciéndose
    - Notificaciones del navegador

28. **Testing de flujo completo**
    - Bot valida → Cola de espera → Asignación manual
    - Agente responde → Cliente responde
    - Transferencia entre agentes
    - Retorno al bot
    - Auto-cierre

---

## 📊 Matriz de Transiciones de Estado

```
BOT_INITIAL         → BOT_VALIDATING, CLOSED
BOT_VALIDATING      → BOT_WAITING_QUEUE, BOT_INITIAL, CLOSED
BOT_WAITING_QUEUE   → AGENT_ASSIGNED, CLOSED, SYSTEM_TIMEOUT
AGENT_ASSIGNED      → AGENT_RESPONDING, TRANSFERRING, CLOSING, CLOSED
AGENT_RESPONDING    → AGENT_WAITING_CLIENT, TRANSFERRING, CLOSING
AGENT_WAITING_CLIENT → AGENT_RESPONDING, CLIENT_INACTIVE, CLOSING
TRANSFERRING        → AGENT_ASSIGNED
CLOSING             → CLOSED, BOT_INITIAL
CLOSED              → [FINAL STATE]
SYSTEM_TIMEOUT      → CLOSED
CLIENT_INACTIVE     → CLOSED
```

---

## 🔧 Comandos de Compilación y Despliegue

### Backend

```bash
# En local (d:\crm-ngso-whatsapp\backend)
npm run build

# Copiar a servidor
scp -r dist/ root@72.61.73.9:/var/www/crm-ngso-whatsapp/backend/

# En servidor
cd /var/www/crm-ngso-whatsapp/backend
pm2 restart crm-backend
pm2 logs crm-backend --lines 100
```

### Frontend

```bash
# En local (d:\crm-ngso-whatsapp\frontend)
npm run build

# Copiar a servidor
scp -r dist/ root@72.61.73.9:/var/www/crm-ngso-whatsapp/frontend/

# Reiniciar Nginx (si es necesario)
ssh root@72.61.73.9 "systemctl reload nginx"
```

---

## 📈 Métricas y Monitoreo

### KPIs a Monitorear

1. **Tiempo promedio en cola** (BOT_WAITING_QUEUE)
2. **Tasa de auto-cierre por timeout** (agente vs cliente)
3. **Cantidad de transferencias por agente**
4. **Chats cerrados automáticamente (24h)**
5. **Tiempo de primera respuesta del agente**
6. **Cantidad de retornos al bot**

### Endpoints de Estadísticas

```
GET /chats/statistics/queue-time
GET /chats/statistics/timeouts
GET /chats/transfers/statistics?period=week
GET /chats/auto-close/statistics?days=30
GET /chats/return-to-bot/statistics
```

---

## 🚨 Consideraciones Importantes

### Performance

- **Workers con LIMIT**: Procesamiento máximo 50 chats por ejecución
- **Índices en BD**: Optimización de queries de fecha
- **Pessimistic Locking**: Prevenir race conditions en transiciones
- **WebSocket rooms**: Notificaciones solo a agentes conectados

### Rollback

Si algo falla:

```sql
-- Revertir campos agregados
ALTER TABLE chats 
  DROP COLUMN sub_status,
  DROP COLUMN is_bot_active,
  DROP COLUMN last_agent_message_at,
  ...
  
-- Eliminar tablas nuevas
DROP TABLE IF EXISTS chat_state_transitions;
DROP TABLE IF EXISTS chat_response_metrics;
```

### Logs Críticos

Buscar estos logs para debugging:

```
[TIMEOUT-MONITOR] Iniciando verificación
[AUTO-CLOSE] Encontrados X chats mayores a 24 horas
[TRANSFER] Iniciando transferencia
[RETURN-TO-BOT] Iniciando retorno
[ChatStateService] Transitioning from X to Y
```

---

## ✅ Checklist de Implementación

### Base de Datos
- [ ] Ejecutar migración SQL de campos
- [ ] Crear tabla chat_state_transitions
- [ ] Crear tabla chat_response_metrics
- [ ] Crear índices de optimización
- [ ] Verificar conexión y permisos

### Backend - Entidades
- [ ] Actualizar Chat entity
- [ ] Crear ChatStateTransition entity
- [ ] Crear ChatResponseMetrics entity
- [ ] Agregar enums ChatStatus y ChatSubStatus

### Backend - Servicios
- [ ] Implementar ChatStateService
- [ ] Implementar AssignmentService
- [ ] Implementar ReturnToBotService
- [ ] Implementar TransferService
- [ ] Modificar BotExecutorService

### Backend - Workers
- [ ] Crear TimeoutMonitorWorker
- [ ] Crear AutoCloseWorker
- [ ] Crear WorkersModule
- [ ] Registrar en AppModule

### Backend - API
- [ ] Agregar endpoints de asignación
- [ ] Agregar endpoints de transferencia
- [ ] Agregar endpoints de retorno al bot
- [ ] Agregar endpoints de estadísticas

### Frontend
- [ ] Crear ReturnToBotButton
- [ ] Crear TransferChatModal
- [ ] Crear WaitingQueuePanel
- [ ] Crear UpcomingAutoCloseWidget
- [ ] Crear useNotifications hook
- [ ] Implementar sonidos

### Testing
- [ ] Testing de transiciones de estado
- [ ] Testing de workers (timeout y auto-cierre)
- [ ] Testing de notificaciones WebSocket
- [ ] Testing de flujo completo end-to-end

### Despliegue
- [ ] Compilar backend
- [ ] Copiar a servidor
- [ ] Reiniciar PM2
- [ ] Compilar frontend
- [ ] Copiar a servidor
- [ ] Verificar logs sin errores

---

## 📞 Soporte

Si encuentras errores durante la implementación:

1. **Revisar logs de PM2**: `pm2 logs crm-backend --lines 200`
2. **Verificar conexión BD**: `psql -h 72.61.73.9 -U crm_admin -d crm_whatsapp`
3. **Verificar WebSocket**: Inspeccionar consola del navegador
4. **Revisar eventos**: Buscar en logs `[EventEmitter]` o `[Gateway]`

---

**Tiempo total estimado de implementación**: **15-18 horas**

**Prioridad crítica**: FASE 1, 2, 3 (fundación y flujo del bot)  
**Prioridad alta**: FASE 4, 5 (retorno, transferencias, workers)  
**Prioridad media**: FASE 6, 7 (WebSockets, frontend avanzado)
