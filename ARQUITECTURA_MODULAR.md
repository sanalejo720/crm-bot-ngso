# 🏗️ ARQUITECTURA MODULAR DEL CRM WHATSAPP

## 📊 Especificaciones del Servidor
- **Hosting**: Hostinger VPS KVM 8
- **Recursos estimados**: 8GB RAM, 4 vCPU, 200GB SSD
- **OS**: Ubuntu 22.04 LTS (recomendado)
- **Stack confirmado**: NestJS + TypeScript + PostgreSQL + React

---

## 🎯 ARQUITECTURA GENERAL POR CAPAS

```
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE PRESENTACIÓN                        │
│                      (React + TypeScript)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐  │
│  │  Dashboard   │ │  Chat UI     │ │  Admin Panel           │  │
│  │  Supervisor  │ │  Agente      │ │  Super Admin           │  │
│  └──────────────┘ └──────────────┘ └────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/HTTPS + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CAPA DE API GATEWAY                        │
│                    (NestJS - Punto de Entrada)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Guards: JWT Auth, RBAC, Rate Limiting                   │   │
│  │  Interceptors: Logging, Transform, Error Handling        │   │
│  │  Pipes: Validation, Sanitization                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CAPA DE MÓDULOS DE NEGOCIO                   │
│                         (NestJS Modules)                         │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │   Auth     │  │   Users    │  │   Roles    │  │  Perms   │ │
│  │  Module    │  │  Module    │  │  Module    │  │  Module  │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ WhatsApp   │  │ Campaigns  │  │   Queues   │  │  Routing │ │
│  │ Integration│  │  Module    │  │   Module   │  │  Module  │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │   Chats    │  │  Messages  │  │  Clients   │  │   Bot    │ │
│  │  Module    │  │  Module    │  │  Module    │  │  Engine  │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │  Reports   │  │  Analytics │  │   Audit    │  │  Backup  │ │
│  │  Module    │  │  Module    │  │   Module   │  │  Module  │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │   Tasks    │  │   Files    │  │   Events   │               │
│  │  Module    │  │  Module    │  │  Module    │               │
│  └────────────┘  └────────────┘  └────────────┘               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE SERVICIOS                           │
│               (Business Logic & External Services)               │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │  Queue Processor     │  │  WebSocket Gateway           │    │
│  │  (Bull + Redis)      │  │  (Socket.IO)                 │    │
│  └──────────────────────┘  └──────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │  Cache Service       │  │  Notification Service        │    │
│  │  (Redis)             │  │  (Email, Push, SMS)          │    │
│  └──────────────────────┘  └──────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE PERSISTENCIA                          │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │   PostgreSQL 15+     │  │        Redis 7+              │    │
│  │  (Base de Datos)     │  │  (Cache + Queue + Session)   │    │
│  └──────────────────────┘  └──────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────┐                                       │
│  │   File Storage       │                                       │
│  │  (Local/S3-compat)   │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
                             ▲
                             │ Webhooks
                             │
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRACIONES EXTERNAS                        │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │  WhatsApp Cloud API  │  │     WPPConnect Server        │    │
│  │  (Meta Business)     │  │     (Auto-hosting)           │    │
│  └──────────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 DESCRIPCIÓN DETALLADA DE MÓDULOS

### 🔐 1. AUTH MODULE (Autenticación)

**Responsabilidad**: Gestión completa de autenticación y autorización.

**Componentes**:
- `AuthController`: Login, logout, refresh token, 2FA
- `AuthService`: Lógica de negocio de autenticación
- `JwtStrategy`: Estrategia JWT para Passport
- `LocalStrategy`: Estrategia local (usuario/contraseña)
- `TwoFactorService`: Gestión de 2FA (TOTP)

**Funcionalidades**:
- ✅ Login con email/password
- ✅ Generación y renovación de JWT tokens
- ✅ Refresh token rotation
- ✅ 2FA con TOTP (opcional)
- ✅ Recuperación de contraseña
- ✅ Cambio de contraseña
- ✅ Bloqueo de cuenta por intentos fallidos
- ✅ Sesiones activas por usuario

**Guards**:
- `JwtAuthGuard`: Valida JWT en cada request
- `RolesGuard`: Valida permisos por rol
- `PermissionsGuard`: Valida permisos granulares

---

### 👥 2. USERS MODULE (Usuarios)

**Responsabilidad**: Gestión de usuarios del sistema.

**Componentes**:
- `UsersController`: CRUD de usuarios
- `UsersService`: Lógica de negocio
- `UserEntity`: Modelo de usuario
- `UserRepository`: Acceso a datos

**Funcionalidades**:
- ✅ Crear/editar/eliminar usuarios
- ✅ Gestión de perfil de usuario
- ✅ Estados: activo, inactivo, suspendido
- ✅ Configuraciones personales
- ✅ Foto de perfil
- ✅ Historial de actividad
- ✅ Gestión de estados del agente:
  - Disponible
  - En pausa (con motivos)
  - Ocupado
  - Offline
- ✅ Tracking de conexión/desconexión
- ✅ Métricas por usuario

**Relaciones**:
- Pertenece a un Rol
- Tiene múltiples Permisos
- Asociado a Campañas
- Tiene Habilidades/Skills

---

### 🎭 3. ROLES MODULE (Roles y Permisos)

**Responsabilidad**: Sistema RBAC (Role-Based Access Control).

**Componentes**:
- `RolesController`: CRUD de roles
- `RolesService`: Gestión de roles y permisos
- `PermissionsService`: Gestión de permisos
- `RoleEntity`, `PermissionEntity`: Modelos

**Roles predefinidos**:
1. **SUPER_ADMIN**
   - Acceso total al sistema
   - Gestión de empresas (si multiempresa)
   - Configuración global
   - Backups y auditoría completa

2. **SUPERVISOR**
   - Gestión de su equipo/campaña
   - Asignación y transferencia de chats
   - Monitoreo en tiempo real
   - Reportes de su equipo
   - Tomar control de chats

3. **AGENTE**
   - Recibir y responder chats
   - Ver historial de cliente
   - Cambiar estados
   - Respuestas rápidas
   - Tareas asignadas

4. **CALIDAD**
   - Lectura de conversaciones
   - Calificación de interacciones
   - Reportes de calidad
   - Tags de evaluación

5. **AUDITORIA**
   - Solo lectura de logs
   - Reportes de auditoría
   - Trazabilidad de acciones

**Permisos granulares** (ejemplos):
```typescript
// Módulo de Chats
'chats.read', 'chats.create', 'chats.update', 'chats.delete',
'chats.assign', 'chats.transfer', 'chats.close',

// Módulo de Usuarios
'users.read', 'users.create', 'users.update', 'users.delete',

// Módulo de Campañas
'campaigns.read', 'campaigns.create', 'campaigns.update', 'campaigns.delete',

// Módulo de Reportes
'reports.view', 'reports.export', 'reports.all-teams',

// Módulo de WhatsApp
'whatsapp.numbers.manage', 'whatsapp.send.message', 'whatsapp.webhook.config',
```

---

### 📱 4. WHATSAPP INTEGRATION MODULE

**Responsabilidad**: Integración con WhatsApp (Meta Cloud API + WPPConnect).

**Componentes**:
- `WhatsappController`: Gestión de números y configuración
- `WhatsappService`: Orquestador principal
- `MetaCloudService`: Integración con Meta Cloud API
- `WppConnectService`: Integración con WPPConnect
- `WhatsappWebhookController`: Recepción de webhooks
- `WhatsappNumberEntity`: Modelo de números

**Funcionalidades**:
- ✅ Registro de números de WhatsApp (1-10)
- ✅ Configuración por tipo (Meta/WPPConnect)
- ✅ Gestión de tokens y credenciales
- ✅ Verificación de webhooks
- ✅ Recepción de mensajes entrantes
- ✅ Envío de mensajes (texto, imagen, audio, video, documento)
- ✅ Envío de mensajes de plantilla (Meta)
- ✅ Botones y listas interactivas
- ✅ Estado de lectura y entrega
- ✅ Estado de conexión del número
- ✅ Gestión de sesiones (WPPConnect)
- ✅ QR Code para conexión (WPPConnect)
- ✅ Health check de números
- ✅ Rate limiting por número
- ✅ Logs de integración

**Flujo de Webhook**:
```
1. WhatsApp envía mensaje → Webhook Controller
2. Validación de firma/token
3. Parseo del mensaje (Meta/WPPConnect)
4. Emit evento: 'message.received'
5. Bot Engine o Chat Module lo procesa
```

---

### 🎯 5. CAMPAIGNS MODULE (Campañas)

**Responsabilidad**: Gestión de campañas de atención.

**Componentes**:
- `CampaignsController`: CRUD de campañas
- `CampaignsService`: Lógica de negocio
- `CampaignEntity`: Modelo de campaña

**Funcionalidades**:
- ✅ Crear/editar/eliminar campañas
- ✅ Configuración de campaña:
  - Nombre y descripción
  - Números de WhatsApp asignados
  - Horarios de atención
  - Agentes asignados
  - Estrategia de enrutamiento
  - Prioridad
  - SLA (tiempo máximo de respuesta)
  - Bot activo/inactivo
  - Flujo de bot asignado
- ✅ Estados: activa, pausada, finalizada
- ✅ Tags de campaña
- ✅ Métricas por campaña

**Relaciones**:
- Tiene múltiples Números WhatsApp
- Tiene múltiples Agentes
- Tiene múltiples Chats
- Tiene un Flujo de Bot (opcional)

---

### 🚦 6. QUEUES MODULE (Colas de Atención)

**Responsabilidad**: Gestión de colas de espera de chats.

**Componentes**:
- `QueuesController`: Gestión de colas
- `QueuesService`: Lógica de encolamiento
- `QueueEntity`: Modelo de cola

**Funcionalidades**:
- ✅ Crear/gestionar colas por campaña
- ✅ Prioridades de cola (alta, media, baja)
- ✅ Capacidad máxima por cola
- ✅ Tiempo máximo de espera
- ✅ Reglas de desbordamiento (overflow)
- ✅ Estado de cola en tiempo real
- ✅ Métricas de cola:
  - Chats en espera
  - Tiempo promedio de espera
  - Chats abandonados
  - Tasa de abandono

**Estrategias de encolamiento**:
- Por número de WhatsApp
- Por palabra clave del cliente
- Por tag de cliente (VIP, recurrente)
- Por carga de agentes

---

### 🎲 7. ROUTING MODULE (Enrutamiento)

**Responsabilidad**: Asignación inteligente de chats a agentes.

**Componentes**:
- `RoutingService`: Algoritmos de asignación
- `RoutingController`: Configuración de reglas
- `RoutingRuleEntity`: Modelo de reglas

**Estrategias de asignación**:
1. **Round Robin**: Rotación circular entre agentes
2. **Menos Ocupado**: Al agente con menos chats activos
3. **Habilidades**: Matching por skills del agente
4. **Prioridad**: Por prioridad del agente
5. **Last Agent**: Al último agente que atendió al cliente
6. **Manual**: Supervisor asigna manualmente

**Funcionalidades**:
- ✅ Configuración de reglas por campaña
- ✅ Peso/prioridad por regla
- ✅ Capacidad máxima de chats por agente
- ✅ Reasignación automática si agente no responde
- ✅ Transferencia entre agentes
- ✅ Transferencia entre campañas
- ✅ Logs de asignaciones

---

### 💬 8. CHATS MODULE (Conversaciones)

**Responsabilidad**: Gestión completa de conversaciones.

**Componentes**:
- `ChatsController`: CRUD y gestión de chats
- `ChatsService`: Lógica de negocio
- `ChatsGateway`: WebSocket para tiempo real
- `ChatEntity`: Modelo de chat

**Funcionalidades**:
- ✅ Crear nuevo chat cuando llega mensaje
- ✅ Asignar chat a agente
- ✅ Transferir chat
- ✅ Cerrar chat con motivo
- ✅ Reabrir chat
- ✅ Tags de chat
- ✅ Notas internas (no visibles para cliente)
- ✅ Prioridad de chat (normal, alta, urgente)
- ✅ Estados de chat:
  - `new`: Recién creado
  - `bot`: Siendo atendido por bot
  - `queued`: En cola esperando agente
  - `assigned`: Asignado a agente
  - `active`: Agente está atendiendo
  - `pending`: Esperando respuesta cliente
  - `closed`: Cerrado
  - `transferred`: Transferido
- ✅ Métricas por chat:
  - Tiempo de primera respuesta (FRT)
  - Tiempo medio de operación (TMO)
  - Cantidad de mensajes
  - Satisfacción (si encuesta)

**WebSocket Events** (tiempo real):
```typescript
// Cliente → Servidor
'chat.join'         // Agente se une a la sala del chat
'chat.leave'        // Agente sale de la sala
'chat.typing'       // Agente está escribiendo
'chat.read'         // Agente leyó mensajes

// Servidor → Cliente
'chat.new'          // Nuevo chat asignado
'chat.message'      // Nuevo mensaje en el chat
'chat.updated'      // Estado del chat cambió
'chat.transferred'  // Chat fue transferido
'chat.closed'       // Chat fue cerrado
'agent.typing'      // Otro agente está escribiendo
```

---

### 📨 9. MESSAGES MODULE (Mensajes)

**Responsabilidad**: Gestión de mensajes individuales.

**Componentes**:
- `MessagesController`: Envío y gestión de mensajes
- `MessagesService`: Lógica de negocio
- `MessageEntity`: Modelo de mensaje

**Funcionalidades**:
- ✅ Almacenar mensajes entrantes
- ✅ Enviar mensajes salientes
- ✅ Tipos de mensaje:
  - Texto
  - Imagen
  - Audio
  - Video
  - Documento
  - Ubicación
  - Contacto
  - Plantilla (template)
  - Botones interactivos
  - Listas
- ✅ Estados de mensaje:
  - `pending`: Esperando envío
  - `sent`: Enviado a WhatsApp
  - `delivered`: Entregado al cliente
  - `read`: Leído por el cliente
  - `failed`: Falló el envío
- ✅ Reintentos automáticos
- ✅ Búsqueda de mensajes
- ✅ Exportar conversación

**Cola de envío** (Bull):
```typescript
// Job para enviar mensaje
{
  name: 'send-message',
  data: {
    chatId: '123',
    content: 'Hola',
    type: 'text',
    whatsappNumberId: '456'
  },
  options: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
}
```

---

### 🤖 10. BOT ENGINE MODULE (Motor de Bot)

**Responsabilidad**: Sistema de bot conversacional con flujos.

**Componentes**:
- `BotEngineService`: Motor de ejecución de flujos
- `BotFlowsController`: CRUD de flujos
- `BotFlowEntity`: Modelo de flujo
- `BotNodeEntity`: Modelo de nodo de flujo
- `BotContextService`: Gestión de contexto de conversación

**Estructura de Flujo**:
```typescript
{
  id: 'flow-1',
  name: 'Flujo de Bienvenida',
  campaignId: 'campaign-1',
  nodes: [
    {
      id: 'node-1',
      type: 'message',
      content: '¡Hola! Bienvenido a {{company_name}}',
      next: 'node-2'
    },
    {
      id: 'node-2',
      type: 'menu',
      content: 'Selecciona una opción:',
      options: [
        { label: '1. Ventas', value: 'sales', next: 'node-sales' },
        { label: '2. Soporte', value: 'support', next: 'node-support' },
        { label: '3. Hablar con agente', value: 'agent', next: 'node-agent' }
      ]
    },
    {
      id: 'node-agent',
      type: 'transfer_to_agent',
      queueId: 'queue-1',
      message: 'Te estoy conectando con un agente...'
    }
  ]
}
```

**Tipos de Nodos**:
1. **message**: Enviar mensaje de texto
2. **menu**: Presentar opciones
3. **input**: Capturar respuesta del usuario
4. **condition**: Evaluar condición (if/else)
5. **variable**: Guardar dato en contexto
6. **api_call**: Llamar API externa
7. **transfer_to_agent**: Transferir a agente humano
8. **close**: Cerrar conversación
9. **delay**: Esperar X segundos
10. **go_to**: Ir a otro nodo

**Funcionalidades**:
- ✅ Constructor visual de flujos (frontend)
- ✅ Variables de sesión: `{{nombre}}`, `{{email}}`, etc.
- ✅ Validaciones de input (email, teléfono, número)
- ✅ Reintentos si respuesta inválida
- ✅ Timeout para pasar a agente
- ✅ Múltiples flujos por campaña
- ✅ A/B testing de flujos
- ✅ Analíticas de flujo (dónde abandonan usuarios)

---

### 👤 11. CLIENTS MODULE (Clientes/Contactos)

**Responsabilidad**: Gestión de base de datos de clientes.

**Componentes**:
- `ClientsController`: CRUD de clientes
- `ClientsService`: Lógica de negocio
- `ClientEntity`: Modelo de cliente

**Funcionalidades**:
- ✅ Crear/editar/eliminar clientes
- ✅ Datos del cliente:
  - Nombre completo
  - Teléfono (clave principal)
  - Email
  - Ciudad/País
  - Empresa
  - Notas
  - Tags personalizados
- ✅ Estados de lead:
  - `new`: Nuevo
  - `contacted`: Contactado
  - `qualified`: Calificado
  - `proposal`: Propuesta enviada
  - `negotiation`: En negociación
  - `won`: Ganado
  - `lost`: Perdido
  - `follow_up`: Seguimiento
- ✅ Historial completo de interacciones
- ✅ Chats asociados
- ✅ Tareas pendientes
- ✅ Segmentación por tags
- ✅ Búsqueda avanzada
- ✅ Importar/exportar CSV
- ✅ Deduplicación automática

**Relaciones**:
- Tiene múltiples Chats
- Tiene múltiples Tareas
- Tiene múltiples Tags

---

### ✅ 12. TASKS MODULE (Tareas y Recordatorios)

**Responsabilidad**: Sistema de tareas y seguimiento.

**Componentes**:
- `TasksController`: CRUD de tareas
- `TasksService`: Lógica de negocio
- `TasksSchedulerService`: Programación de recordatorios
- `TaskEntity`: Modelo de tarea

**Funcionalidades**:
- ✅ Crear tarea para seguimiento de cliente
- ✅ Asignar a agente específico
- ✅ Fecha y hora de vencimiento
- ✅ Prioridad (baja, media, alta)
- ✅ Estados:
  - `pending`: Pendiente
  - `in_progress`: En progreso
  - `completed`: Completada
  - `cancelled`: Cancelada
  - `overdue`: Vencida
- ✅ Notificaciones:
  - Email
  - Push notification (frontend)
  - WhatsApp interno (opcional)
- ✅ Tareas recurrentes
- ✅ Adjuntar archivos
- ✅ Comentarios en tarea
- ✅ Dashboard de tareas por agente

---

### 📊 13. REPORTS MODULE (Reportes)

**Responsabilidad**: Generación de reportes operativos.

**Componentes**:
- `ReportsController`: Endpoints de reportes
- `ReportsService`: Lógica de generación
- `ReportBuilderService`: Constructor de queries

**Reportes disponibles**:

#### 📈 Por Campaña:
- Total de chats recibidos
- Chats atendidos vs abandonados
- Tiempo medio de respuesta (TMR)
- Tiempo medio de operación (TMO)
- Tasa de conversión
- Satisfacción promedio

#### 👥 Por Agente:
- Chats atendidos
- SPH (Sales Per Hour / Chats por hora)
- TMO por agente
- Tasa de cierre
- Calificación de calidad
- Tiempo en cada estado (disponible, pausa, ocupado)

#### 📱 Por Número de WhatsApp:
- Volumen de mensajes
- Horarios pico
- Tasa de error de integración
- Estado de conexión histórico

#### 🕐 Por Rango de Fechas:
- Todos los reportes con filtros de fecha

**Formatos de exportación**:
- ✅ PDF
- ✅ Excel (XLSX)
- ✅ CSV
- ✅ JSON

**Programación**:
- ✅ Reportes automáticos diarios/semanales/mensuales
- ✅ Envío por email

---

### 📉 14. ANALYTICS MODULE (Analíticas en Tiempo Real)

**Responsabilidad**: Dashboard en tiempo real y métricas live.

**Componentes**:
- `AnalyticsController`: Endpoints de métricas
- `AnalyticsService`: Cálculo de métricas
- `AnalyticsGateway`: WebSocket para datos en vivo

**Métricas en tiempo real**:
- ✅ Agentes conectados
- ✅ Estados de agentes (disponible, pausa, ocupado)
- ✅ Chats activos
- ✅ Chats en cola
- ✅ Tiempo promedio de espera actual
- ✅ Chats cerrados hoy
- ✅ SLA compliance (% de chats respondidos en X tiempo)
- ✅ Mensajes por minuto
- ✅ Tasa de respuesta actual

**WebSocket Events**:
```typescript
'analytics.agents.update'    // Estado de agentes cambió
'analytics.chats.update'     // Métricas de chats actualizadas
'analytics.queue.update'     // Estado de colas actualizado
```

---

### 🔍 15. AUDIT MODULE (Auditoría)

**Responsabilidad**: Trazabilidad completa de acciones.

**Componentes**:
- `AuditController`: Consulta de logs
- `AuditService`: Registro de acciones
- `AuditInterceptor`: Interceptor global
- `AuditLogEntity`: Modelo de log

**Eventos auditados**:
- ✅ Login/logout de usuarios
- ✅ Cambios de configuración
- ✅ Creación/edición/eliminación de entidades
- ✅ Asignaciones de chat
- ✅ Transferencias de chat
- ✅ Cambios de estado de agente
- ✅ Exportación de datos
- ✅ Acceso a información sensible

**Datos registrados**:
```typescript
{
  userId: '123',
  action: 'chat.transfer',
  entity: 'Chat',
  entityId: '456',
  changes: {
    agentId: { from: '10', to: '20' }
  },
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  timestamp: '2025-11-14T10:30:00Z'
}
```

**Funcionalidades**:
- ✅ Búsqueda avanzada de logs
- ✅ Filtros por usuario, acción, entidad, fecha
- ✅ Exportar logs
- ✅ Retención configurable (ej: 1 año)
- ✅ Dashboard de actividad sospechosa

---

### 💾 16. BACKUP MODULE (Copias de Seguridad)

**Responsabilidad**: Backups de base de datos y archivos.

**Componentes**:
- `BackupController`: Control de backups
- `BackupService`: Ejecución de backups
- `BackupScheduler`: Programación automática

**Funcionalidades**:
- ✅ Backup manual (bajo demanda)
- ✅ Backup programado:
  - Diario (recomendado)
  - Semanal
  - Mensual
- ✅ Backup de:
  - Base de datos PostgreSQL (pg_dump)
  - Archivos subidos (media)
  - Configuraciones
- ✅ Compresión automática
- ✅ Encriptación de backups (opcional)
- ✅ Almacenamiento:
  - Local (VPS)
  - S3-compatible (opcional)
- ✅ Restauración desde backup
- ✅ Verificación de integridad
- ✅ Retención: últimos 7 días completos + 4 semanas + 3 meses

---

### 📁 17. FILES MODULE (Gestión de Archivos)

**Responsabilidad**: Subida y gestión de archivos multimedia.

**Componentes**:
- `FilesController`: Upload/download de archivos
- `FilesService`: Procesamiento de archivos

**Funcionalidades**:
- ✅ Upload de archivos (imágenes, audios, videos, documentos)
- ✅ Validación de tipo y tamaño
- ✅ Conversión de formatos (ImageMagick, FFmpeg)
- ✅ Miniaturas automáticas (thumbnails)
- ✅ Almacenamiento local o S3-compatible
- ✅ CDN para entrega rápida (opcional)
- ✅ Limpieza de archivos antiguos

**Límites**:
- Imágenes: 10MB
- Audios: 16MB (límite WhatsApp)
- Videos: 16MB (límite WhatsApp)
- Documentos: 100MB

---

### 🔔 18. EVENTS MODULE (Sistema de Eventos)

**Responsabilidad**: Bus de eventos para comunicación entre módulos.

**Componentes**:
- `EventEmitterModule`: Módulo global de eventos
- Listeners distribuidos en cada módulo

**Eventos principales**:
```typescript
// Mensajes
'message.received'
'message.sent'
'message.delivered'
'message.read'
'message.failed'

// Chats
'chat.created'
'chat.assigned'
'chat.transferred'
'chat.closed'
'chat.reopened'

// Agentes
'agent.connected'
'agent.disconnected'
'agent.status.changed'

// Bot
'bot.finished'
'bot.transfer.requested'

// Sistema
'system.error'
'system.warning'
```

**Uso**:
```typescript
// Emitir evento
this.eventEmitter.emit('chat.assigned', {
  chatId: '123',
  agentId: '456',
  timestamp: new Date()
});

// Escuchar evento
@OnEvent('chat.assigned')
handleChatAssigned(payload: any) {
  // Enviar notificación al agente
}
```

---

## 🔌 COMUNICACIÓN ENTRE MÓDULOS

```
┌──────────────┐
│   WhatsApp   │──► message.received ──┐
│  Integration │                        │
└──────────────┘                        ▼
                              ┌─────────────────┐
                              │   Bot Engine    │
                              └────────┬────────┘
                                       │
                      bot.transfer.requested
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Routing Module │
                              └────────┬────────┘
                                       │
                                chat.assigned
                                       │
                                       ▼
                      ┌────────────────────────────┐
                      │     Chats Module           │
                      └────────┬───────────────────┘
                               │
                      ┌────────┴────────┐
                      │                 │
           chat.message           agent.notification
                      │                 │
                      ▼                 ▼
            ┌─────────────┐    ┌───────────────┐
            │  Messages   │    │  WebSocket    │
            │   Module    │    │   Gateway     │
            └─────────────┘    └───────────────┘
                                       │
                                       ▼
                                 React Frontend
```

---

## 🎯 PRÓXIMOS PASOS

He completado la arquitectura modular detallada. Ahora procederé con:

**2. ✅ Diseño del modelo de datos completo** (todas las tablas, relaciones, índices)

¿Continúo automáticamente o necesitas revisar algo antes?
