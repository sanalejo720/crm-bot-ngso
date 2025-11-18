# 🗄️ MODELO DE DATOS COMPLETO - CRM WHATSAPP

## 📊 Diagrama Entidad-Relación (Resumen)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    USERS    │────────▶│    ROLES    │────────▶│ PERMISSIONS │
│             │  N:1    │             │  N:M    │             │
└──────┬──────┘         └─────────────┘         └─────────────┘
       │
       │ 1:N
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                         CHATS                                │
└──────┬──────────────────────┬──────────────────────┬────────┘
       │                      │                      │
       │ 1:N                  │ N:1                  │ N:1
       │                      │                      │
       ▼                      ▼                      ▼
┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│  MESSAGES   │      │   CLIENTS    │      │   CAMPAIGNS    │
└─────────────┘      └──────┬───────┘      └────────┬───────┘
                            │                       │
                            │ 1:N                   │ 1:N
                            │                       │
                            ▼                       ▼
                     ┌──────────────┐      ┌────────────────┐
                     │    TASKS     │      │ WHATSAPP_NOS   │
                     └──────────────┘      └────────────────┘
```

---

## 📋 LISTADO COMPLETO DE TABLAS

1. **users** - Usuarios del sistema
2. **roles** - Roles (Super Admin, Supervisor, Agente, etc.)
3. **permissions** - Permisos granulares
4. **role_permissions** - Relación N:M entre roles y permisos
5. **user_permissions** - Permisos adicionales específicos por usuario
6. **user_sessions** - Sesiones activas de usuarios
7. **campaigns** - Campañas de atención
8. **whatsapp_numbers** - Números de WhatsApp (1-10)
9. **campaign_numbers** - Relación N:M entre campañas y números
10. **campaign_agents** - Relación N:M entre campañas y agentes
11. **queues** - Colas de atención
12. **routing_rules** - Reglas de enrutamiento
13. **clients** - Clientes/contactos
14. **client_tags** - Tags de clientes
15. **chats** - Conversaciones
16. **chat_tags** - Tags de chats
17. **chat_notes** - Notas internas de chats
18. **messages** - Mensajes individuales
19. **message_queue** - Cola de mensajes pendientes de envío
20. **bot_flows** - Flujos de bot
21. **bot_nodes** - Nodos de flujos de bot
22. **bot_sessions** - Sesiones activas de bot
23. **tasks** - Tareas y recordatorios
24. **task_comments** - Comentarios en tareas
25. **files** - Archivos multimedia
26. **quick_replies** - Respuestas rápidas
27. **templates** - Plantillas de mensajes
28. **audit_logs** - Logs de auditoría
29. **agent_states** - Historial de estados de agentes
30. **chat_metrics** - Métricas calculadas de chats
31. **agent_metrics** - Métricas calculadas de agentes
32. **backups** - Registro de backups realizados

---

## 🔑 TABLAS DETALLADAS CON SQL

### 1. USERS (Usuarios)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  
  -- Autenticación
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  two_factor_secret VARCHAR(255),
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  
  -- Información personal
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  avatar_url VARCHAR(500),
  
  -- Rol y permisos
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  
  -- Estado del usuario
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Para agentes: estado de disponibilidad
  agent_status VARCHAR(20) DEFAULT 'offline' CHECK (agent_status IN (
    'available', 'busy', 'paused', 'offline'
  )),
  agent_status_reason TEXT, -- Motivo de pausa
  
  -- Configuraciones
  max_concurrent_chats INTEGER DEFAULT 5,
  auto_assign_enabled BOOLEAN DEFAULT TRUE,
  
  -- Control de acceso
  last_login_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP -- Soft delete
);

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_agent_status ON users(agent_status);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
```

---

### 2. ROLES (Roles)

```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  
  name VARCHAR(50) UNIQUE NOT NULL, -- 'super_admin', 'supervisor', 'agent', 'quality', 'audit'
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Jerarquía
  level INTEGER DEFAULT 0, -- 0=más alto (super_admin), 5=más bajo
  
  -- Control
  is_system BOOLEAN DEFAULT FALSE, -- Roles del sistema no se pueden eliminar
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar roles predefinidos
INSERT INTO roles (name, display_name, description, level, is_system) VALUES
('super_admin', 'Super Administrador', 'Acceso total al sistema', 0, TRUE),
('supervisor', 'Supervisor', 'Gestión de equipo y monitoreo', 1, TRUE),
('agent', 'Agente', 'Atención de chats', 2, TRUE),
('quality', 'Calidad', 'Evaluación de conversaciones', 3, TRUE),
('audit', 'Auditoría', 'Solo lectura de logs', 4, TRUE);
```

---

### 3. PERMISSIONS (Permisos)

```sql
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  
  module VARCHAR(50) NOT NULL, -- 'chats', 'users', 'campaigns', etc.
  action VARCHAR(50) NOT NULL, -- 'read', 'create', 'update', 'delete', 'assign', etc.
  resource VARCHAR(50), -- Recurso específico (opcional)
  
  name VARCHAR(100) UNIQUE NOT NULL, -- 'chats.read', 'chats.assign'
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  
  -- Control
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(module, action, resource)
);

CREATE INDEX idx_permissions_module ON permissions(module);
CREATE INDEX idx_permissions_name ON permissions(name);
```

---

### 4. ROLE_PERMISSIONS (Relación Roles-Permisos)

```sql
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
```

---

### 5. USER_PERMISSIONS (Permisos adicionales por usuario)

```sql
CREATE TABLE user_permissions (
  id SERIAL PRIMARY KEY,
  
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  
  -- Tipo: 'grant' (otorgar) o 'revoke' (revocar)
  type VARCHAR(10) DEFAULT 'grant' CHECK (type IN ('grant', 'revoke')),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  
  UNIQUE(user_id, permission_id)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
```

---

### 6. USER_SESSIONS (Sesiones activas)

```sql
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  token VARCHAR(500) UNIQUE NOT NULL, -- JWT refresh token
  device_info TEXT, -- User agent
  ip_address VARCHAR(50),
  
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP -- Para logout manual
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

---

### 7. CAMPAIGNS (Campañas)

```sql
CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  
  -- Información básica
  name VARCHAR(150) NOT NULL,
  description TEXT,
  code VARCHAR(50) UNIQUE, -- Código corto (ej: 'VENTAS_2024')
  
  -- Configuración
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  priority INTEGER DEFAULT 0, -- Mayor número = mayor prioridad
  
  -- Horarios de atención (JSON)
  business_hours JSONB, -- { "monday": { "start": "08:00", "end": "18:00" }, ... }
  timezone VARCHAR(50) DEFAULT 'America/Bogota',
  
  -- SLA
  sla_first_response_seconds INTEGER DEFAULT 60, -- Tiempo máximo para primera respuesta
  sla_resolution_seconds INTEGER DEFAULT 3600, -- Tiempo máximo para resolver
  
  -- Bot
  bot_enabled BOOLEAN DEFAULT TRUE,
  bot_flow_id INTEGER REFERENCES bot_flows(id) ON DELETE SET NULL,
  
  -- Enrutamiento
  routing_strategy VARCHAR(30) DEFAULT 'round_robin' CHECK (routing_strategy IN (
    'round_robin', 'least_busy', 'skills', 'priority', 'last_agent', 'manual'
  )),
  
  -- Limites
  max_queue_size INTEGER DEFAULT 100,
  max_wait_seconds INTEGER DEFAULT 600, -- Tiempo máximo en cola antes de mensaje de abandono
  
  -- Mensajes automáticos
  welcome_message TEXT,
  queue_message TEXT,
  offline_message TEXT,
  closed_message TEXT,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_deleted_at ON campaigns(deleted_at);
```

---

### 8. WHATSAPP_NUMBERS (Números de WhatsApp)

```sql
CREATE TABLE whatsapp_numbers (
  id SERIAL PRIMARY KEY,
  
  -- Número
  phone_number VARCHAR(50) UNIQUE NOT NULL, -- Formato: +573001234567
  display_name VARCHAR(100),
  
  -- Tipo de integración
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('meta', 'wppconnect')),
  
  -- Credenciales Meta
  meta_phone_number_id VARCHAR(100),
  meta_business_account_id VARCHAR(100),
  meta_access_token TEXT,
  
  -- Credenciales WPPConnect
  wppconnect_session_name VARCHAR(100),
  wppconnect_server_url VARCHAR(255),
  wppconnect_api_key TEXT,
  wppconnect_qr_code TEXT, -- QR code para escanear
  
  -- Webhook
  webhook_url VARCHAR(500),
  webhook_verify_token VARCHAR(255),
  
  -- Estado
  status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN (
    'active', 'inactive', 'disconnected', 'error', 'pending'
  )),
  connection_status VARCHAR(30), -- Estado detallado de la conexión
  last_connected_at TIMESTAMP,
  last_error TEXT,
  
  -- Configuración
  daily_message_limit INTEGER DEFAULT 1000,
  rate_limit_per_minute INTEGER DEFAULT 60,
  
  -- Estadísticas
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  last_message_at TIMESTAMP,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_whatsapp_numbers_phone_number ON whatsapp_numbers(phone_number);
CREATE INDEX idx_whatsapp_numbers_status ON whatsapp_numbers(status);
CREATE INDEX idx_whatsapp_numbers_provider ON whatsapp_numbers(provider);
```

---

### 9. CAMPAIGN_NUMBERS (Relación Campañas-Números)

```sql
CREATE TABLE campaign_numbers (
  id SERIAL PRIMARY KEY,
  
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  whatsapp_number_id INTEGER NOT NULL REFERENCES whatsapp_numbers(id) ON DELETE CASCADE,
  
  is_primary BOOLEAN DEFAULT FALSE, -- Número principal de la campaña
  priority INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(campaign_id, whatsapp_number_id)
);

CREATE INDEX idx_campaign_numbers_campaign_id ON campaign_numbers(campaign_id);
CREATE INDEX idx_campaign_numbers_whatsapp_number_id ON campaign_numbers(whatsapp_number_id);
```

---

### 10. CAMPAIGN_AGENTS (Relación Campañas-Agentes)

```sql
CREATE TABLE campaign_agents (
  id SERIAL PRIMARY KEY,
  
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Configuración específica
  max_concurrent_chats INTEGER DEFAULT 5,
  priority INTEGER DEFAULT 0, -- Mayor prioridad = recibe más chats
  
  -- Habilidades/Skills (para routing por skills)
  skills JSONB, -- ["ventas", "soporte_tecnico", "ingles"]
  
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX idx_campaign_agents_campaign_id ON campaign_agents(campaign_id);
CREATE INDEX idx_campaign_agents_user_id ON campaign_agents(user_id);
CREATE INDEX idx_campaign_agents_skills ON campaign_agents USING GIN(skills);
```

---

### 11. QUEUES (Colas de atención)

```sql
CREATE TABLE queues (
  id SERIAL PRIMARY KEY,
  
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Configuración
  priority INTEGER DEFAULT 0, -- Mayor prioridad = se atiende primero
  max_size INTEGER DEFAULT 100,
  max_wait_seconds INTEGER DEFAULT 600,
  
  -- Estrategia de desbordamiento
  overflow_action VARCHAR(30) DEFAULT 'queue' CHECK (overflow_action IN (
    'queue', 'reject', 'voicemail', 'transfer'
  )),
  overflow_queue_id INTEGER REFERENCES queues(id),
  overflow_message TEXT,
  
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_queues_campaign_id ON queues(campaign_id);
```

---

### 12. ROUTING_RULES (Reglas de enrutamiento)

```sql
CREATE TABLE routing_rules (
  id SERIAL PRIMARY KEY,
  
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Orden de evaluación
  priority INTEGER DEFAULT 0,
  
  -- Condiciones (JSON)
  conditions JSONB, -- { "client_tag": "vip", "keyword": "urgente", etc. }
  
  -- Acción
  action VARCHAR(30) NOT NULL CHECK (action IN (
    'assign_queue', 'assign_agent', 'assign_bot', 'reject', 'transfer_campaign'
  )),
  
  -- Target según la acción
  target_queue_id INTEGER REFERENCES queues(id),
  target_user_id INTEGER REFERENCES users(id),
  target_campaign_id INTEGER REFERENCES campaigns(id),
  
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routing_rules_campaign_id ON routing_rules(campaign_id);
CREATE INDEX idx_routing_rules_priority ON routing_rules(priority);
```

---

### 13. CLIENTS (Clientes/Contactos)

```sql
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  
  -- Información básica
  phone_number VARCHAR(50) UNIQUE NOT NULL, -- Clave principal lógica
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  
  -- Información adicional
  company VARCHAR(150),
  city VARCHAR(100),
  country VARCHAR(100),
  address TEXT,
  
  -- Estado de lead
  lead_status VARCHAR(30) DEFAULT 'new' CHECK (lead_status IN (
    'new', 'contacted', 'qualified', 'proposal', 'negotiation', 
    'won', 'lost', 'follow_up'
  )),
  lead_score INTEGER DEFAULT 0, -- 0-100
  
  -- Información comercial
  ltv DECIMAL(10,2) DEFAULT 0, -- Lifetime value
  total_purchases INTEGER DEFAULT 0,
  last_purchase_at TIMESTAMP,
  
  -- Datos personalizados (flexibles)
  custom_fields JSONB,
  
  -- Notas
  notes TEXT,
  
  -- Segmentación
  segment VARCHAR(50), -- 'vip', 'regular', 'new', etc.
  
  -- Control de comunicación
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  opt_in BOOLEAN DEFAULT TRUE, -- Aceptó recibir mensajes
  opt_in_date TIMESTAMP,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_contact_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_clients_phone_number ON clients(phone_number);
CREATE INDEX idx_clients_lead_status ON clients(lead_status);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_segment ON clients(segment);
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at);
CREATE INDEX idx_clients_custom_fields ON clients USING GIN(custom_fields);
```

---

### 14. CLIENT_TAGS (Tags de clientes)

```sql
CREATE TABLE client_tags (
  id SERIAL PRIMARY KEY,
  
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  
  UNIQUE(client_id, tag)
);

CREATE INDEX idx_client_tags_client_id ON client_tags(client_id);
CREATE INDEX idx_client_tags_tag ON client_tags(tag);
```

---

### 15. CHATS (Conversaciones)

```sql
CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  
  -- Relaciones principales
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  whatsapp_number_id INTEGER NOT NULL REFERENCES whatsapp_numbers(id) ON DELETE RESTRICT,
  assigned_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  queue_id INTEGER REFERENCES queues(id) ON DELETE SET NULL,
  
  -- Estado del chat
  status VARCHAR(30) DEFAULT 'new' CHECK (status IN (
    'new', 'bot', 'queued', 'assigned', 'active', 
    'pending', 'closed', 'transferred', 'abandoned'
  )),
  
  -- Prioridad
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Tracking de estados
  bot_started_at TIMESTAMP,
  bot_ended_at TIMESTAMP,
  queued_at TIMESTAMP,
  assigned_at TIMESTAMP,
  first_response_at TIMESTAMP,
  closed_at TIMESTAMP,
  
  -- Duración calculada
  wait_time_seconds INTEGER, -- Tiempo en cola
  first_response_time_seconds INTEGER, -- Tiempo hasta primera respuesta
  handling_time_seconds INTEGER, -- Tiempo total de atención
  
  -- Motivo de cierre
  close_reason VARCHAR(50), -- 'resolved', 'transferred', 'abandoned', 'spam', etc.
  close_notes TEXT,
  
  -- Resultado
  outcome VARCHAR(50), -- 'sale', 'no_sale', 'information', 'complaint', etc.
  outcome_value DECIMAL(10,2), -- Valor de venta si aplica
  
  -- Satisfacción
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_comment TEXT,
  
  -- Control de transferencias
  transferred_from_agent_id INTEGER REFERENCES users(id),
  transfer_reason TEXT,
  transfer_count INTEGER DEFAULT 0,
  
  -- Datos del contexto del bot
  bot_context JSONB, -- Variables capturadas por el bot
  
  -- Contador de mensajes
  message_count INTEGER DEFAULT 0,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_chats_client_id ON chats(client_id);
CREATE INDEX idx_chats_campaign_id ON chats(campaign_id);
CREATE INDEX idx_chats_assigned_agent_id ON chats(assigned_agent_id);
CREATE INDEX idx_chats_status ON chats(status);
CREATE INDEX idx_chats_created_at ON chats(created_at);
CREATE INDEX idx_chats_closed_at ON chats(closed_at);
CREATE INDEX idx_chats_priority ON chats(priority);
```

---

### 16. CHAT_TAGS (Tags de chats)

```sql
CREATE TABLE chat_tags (
  id SERIAL PRIMARY KEY,
  
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  
  UNIQUE(chat_id, tag)
);

CREATE INDEX idx_chat_tags_chat_id ON chat_tags(chat_id);
CREATE INDEX idx_chat_tags_tag ON chat_tags(tag);
```

---

### 17. CHAT_NOTES (Notas internas de chats)

```sql
CREATE TABLE chat_notes (
  id SERIAL PRIMARY KEY,
  
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_chat_notes_chat_id ON chat_notes(chat_id);
CREATE INDEX idx_chat_notes_user_id ON chat_notes(user_id);
```

---

### 18. MESSAGES (Mensajes)

```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  
  -- Relaciones
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  whatsapp_number_id INTEGER NOT NULL REFERENCES whatsapp_numbers(id) ON DELETE RESTRICT,
  
  -- Dirección
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  -- Usuario que envió (si outbound)
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Tipo de mensaje
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN (
    'text', 'image', 'audio', 'video', 'document', 'location', 
    'contact', 'sticker', 'template', 'interactive', 'button_reply', 'list_reply'
  )),
  
  -- Contenido
  content TEXT, -- Texto del mensaje
  media_url VARCHAR(500), -- URL del archivo multimedia
  media_mime_type VARCHAR(100),
  media_file_id INTEGER REFERENCES files(id),
  
  -- Metadatos
  metadata JSONB, -- Datos adicionales según tipo de mensaje
  
  -- IDs externos de WhatsApp
  whatsapp_message_id VARCHAR(255) UNIQUE,
  whatsapp_timestamp BIGINT, -- Timestamp de WhatsApp
  
  -- Estado del mensaje (para outbound)
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'read', 'failed'
  )),
  error_code VARCHAR(50),
  error_message TEXT,
  
  -- Timestamps de estados
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- Control de reintentos
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Indica si es mensaje del bot
  is_bot_message BOOLEAN DEFAULT FALSE,
  
  -- Respuesta rápida usada
  quick_reply_id INTEGER REFERENCES quick_replies(id),
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_client_id ON messages(client_id);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_whatsapp_message_id ON messages(whatsapp_message_id);
```

---

### 19. MESSAGE_QUEUE (Cola de mensajes pendientes)

```sql
CREATE TABLE message_queue (
  id SERIAL PRIMARY KEY,
  
  message_id INTEGER UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
  
  -- Prioridad de envío
  priority INTEGER DEFAULT 0,
  
  -- Programación
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Procesamiento
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  
  -- Error handling
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_queue_status ON message_queue(status);
CREATE INDEX idx_message_queue_scheduled_at ON message_queue(scheduled_at);
CREATE INDEX idx_message_queue_priority ON message_queue(priority);
```

---

### 20. BOT_FLOWS (Flujos de bot)

```sql
CREATE TABLE bot_flows (
  id SERIAL PRIMARY KEY,
  
  name VARCHAR(150) NOT NULL,
  description TEXT,
  
  -- Nodo inicial
  start_node_id VARCHAR(50),
  
  -- Variables globales del flujo
  variables JSONB, -- { "company_name": "MiEmpresa", "support_hours": "8am-6pm" }
  
  -- Configuración
  timeout_seconds INTEGER DEFAULT 300, -- Tiempo antes de pasar a agente por inactividad
  max_invalid_attempts INTEGER DEFAULT 3, -- Intentos antes de pasar a agente
  
  -- Control de versión
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Estadísticas
  total_sessions INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  avg_completion_time_seconds INTEGER,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_bot_flows_is_published ON bot_flows(is_published);
CREATE INDEX idx_bot_flows_is_active ON bot_flows(is_active);
```

---

### 21. BOT_NODES (Nodos de flujos)

```sql
CREATE TABLE bot_nodes (
  id SERIAL PRIMARY KEY,
  
  flow_id INTEGER NOT NULL REFERENCES bot_flows(id) ON DELETE CASCADE,
  
  -- Identificador único dentro del flujo
  node_key VARCHAR(50) NOT NULL,
  
  -- Tipo de nodo
  node_type VARCHAR(30) NOT NULL CHECK (node_type IN (
    'message', 'menu', 'input', 'condition', 'variable', 
    'api_call', 'transfer_agent', 'close', 'delay', 'go_to'
  )),
  
  -- Contenido del nodo (estructura varía según tipo)
  config JSONB NOT NULL,
  /* Ejemplos de config según tipo:
    message: { "content": "Hola {{nombre}}" }
    menu: { "content": "Elige opción:", "options": [{"label": "1. Ventas", "value": "sales", "next": "node_sales"}] }
    input: { "prompt": "Tu nombre?", "variable": "nombre", "validation": "text", "next": "node_next" }
    condition: { "variable": "edad", "operator": ">=", "value": 18, "true_next": "node_adult", "false_next": "node_minor" }
    transfer_agent: { "message": "Conectando...", "queue_id": 1 }
  */
  
  -- Siguiente nodo por defecto
  next_node_key VARCHAR(50),
  
  -- Posición en canvas visual
  position_x INTEGER,
  position_y INTEGER,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(flow_id, node_key)
);

CREATE INDEX idx_bot_nodes_flow_id ON bot_nodes(flow_id);
CREATE INDEX idx_bot_nodes_node_key ON bot_nodes(node_key);
```

---

### 22. BOT_SESSIONS (Sesiones activas de bot)

```sql
CREATE TABLE bot_sessions (
  id SERIAL PRIMARY KEY,
  
  chat_id INTEGER UNIQUE NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  flow_id INTEGER NOT NULL REFERENCES bot_flows(id) ON DELETE RESTRICT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Estado de la sesión
  current_node_key VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'waiting_input', 'completed', 'transferred', 'timeout', 'error')),
  
  -- Variables capturadas
  variables JSONB DEFAULT '{}'::jsonb, -- { "nombre": "Juan", "email": "juan@email.com" }
  
  -- Tracking
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  last_interaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Contadores
  steps_count INTEGER DEFAULT 0,
  invalid_attempts INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bot_sessions_chat_id ON bot_sessions(chat_id);
CREATE INDEX idx_bot_sessions_flow_id ON bot_sessions(flow_id);
CREATE INDEX idx_bot_sessions_status ON bot_sessions(status);
```

---

### 23. TASKS (Tareas y recordatorios)

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  
  -- Relaciones
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
  assigned_to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Información de la tarea
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Programación
  due_date TIMESTAMP,
  reminder_date TIMESTAMP,
  
  -- Prioridad
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Estado
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
  
  -- Recurrencia
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly'
  recurrence_end_date TIMESTAMP,
  
  -- Resultado
  completion_notes TEXT,
  completed_at TIMESTAMP,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_assigned_to_user_id ON tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

---

### 24. TASK_COMMENTS (Comentarios en tareas)

```sql
CREATE TABLE task_comments (
  id SERIAL PRIMARY KEY,
  
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
```

---

### 25. FILES (Archivos multimedia)

```sql
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  
  -- Información del archivo
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  
  -- Almacenamiento
  storage_type VARCHAR(20) DEFAULT 'local' CHECK (storage_type IN ('local', 's3', 'cdn')),
  file_path VARCHAR(500) NOT NULL, -- Ruta local o URL de S3
  thumbnail_path VARCHAR(500), -- Para imágenes/videos
  
  -- Metadatos
  width INTEGER, -- Para imágenes/videos
  height INTEGER,
  duration_seconds INTEGER, -- Para audios/videos
  
  -- Relaciones (opcionales)
  uploaded_by_user_id INTEGER REFERENCES users(id),
  related_entity_type VARCHAR(50), -- 'message', 'task', 'client'
  related_entity_id INTEGER,
  
  -- Control
  is_public BOOLEAN DEFAULT FALSE,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_files_uploaded_by_user_id ON files(uploaded_by_user_id);
CREATE INDEX idx_files_related_entity ON files(related_entity_type, related_entity_id);
CREATE INDEX idx_files_created_at ON files(created_at);
```

---

### 26. QUICK_REPLIES (Respuestas rápidas)

```sql
CREATE TABLE quick_replies (
  id SERIAL PRIMARY KEY,
  
  -- Alcance
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Si es NULL, es global
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE, -- Si aplica a una campaña
  
  -- Contenido
  shortcut VARCHAR(50) NOT NULL, -- Ej: '/saludo', '/precio'
  title VARCHAR(150) NOT NULL,
  content TEXT NOT NULL,
  
  -- Control
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_quick_replies_user_id ON quick_replies(user_id);
CREATE INDEX idx_quick_replies_campaign_id ON quick_replies(campaign_id);
CREATE INDEX idx_quick_replies_shortcut ON quick_replies(shortcut);
```

---

### 27. TEMPLATES (Plantillas de mensajes - Meta)

```sql
CREATE TABLE templates (
  id SERIAL PRIMARY KEY,
  
  whatsapp_number_id INTEGER NOT NULL REFERENCES whatsapp_numbers(id) ON DELETE CASCADE,
  
  -- Información de Meta
  template_name VARCHAR(255) NOT NULL,
  template_id VARCHAR(255), -- ID de Meta
  language VARCHAR(10) NOT NULL, -- 'es', 'en', etc.
  category VARCHAR(50), -- 'MARKETING', 'UTILITY', 'AUTHENTICATION'
  
  -- Contenido
  header_type VARCHAR(20), -- 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'
  header_content TEXT,
  body_content TEXT NOT NULL,
  footer_content TEXT,
  
  -- Botones
  buttons JSONB, -- [{ "type": "URL", "text": "Ver más", "url": "https://..." }]
  
  -- Variables
  variables JSONB, -- ["nombre", "fecha", "monto"]
  
  -- Estado
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disabled')),
  
  -- Estadísticas
  usage_count INTEGER DEFAULT 0,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_templates_whatsapp_number_id ON templates(whatsapp_number_id);
CREATE INDEX idx_templates_template_name ON templates(template_name);
CREATE INDEX idx_templates_status ON templates(status);
```

---

### 28. AUDIT_LOGS (Logs de auditoría)

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  
  -- Usuario que realizó la acción
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Acción realizada
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', etc.
  entity_type VARCHAR(50), -- 'User', 'Chat', 'Campaign', etc.
  entity_id INTEGER,
  
  -- Cambios realizados (antes y después)
  changes JSONB, -- { "status": { "from": "active", "to": "closed" } }
  
  -- Contexto de la petición
  ip_address VARCHAR(50),
  user_agent TEXT,
  request_method VARCHAR(10), -- 'GET', 'POST', 'PUT', 'DELETE'
  request_url VARCHAR(500),
  
  -- Metadatos adicionales
  metadata JSONB,
  
  -- Resultado
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
```

---

### 29. AGENT_STATES (Historial de estados de agentes)

```sql
CREATE TABLE agent_states (
  id SERIAL PRIMARY KEY,
  
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Estado
  status VARCHAR(20) NOT NULL CHECK (status IN ('available', 'busy', 'paused', 'offline')),
  reason TEXT, -- Motivo si es 'paused'
  
  -- Timestamps
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER, -- Calculado al finalizar
  
  -- Contexto
  campaign_id INTEGER REFERENCES campaigns(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_states_user_id ON agent_states(user_id);
CREATE INDEX idx_agent_states_status ON agent_states(status);
CREATE INDEX idx_agent_states_started_at ON agent_states(started_at);
```

---

### 30. CHAT_METRICS (Métricas calculadas de chats)

```sql
CREATE TABLE chat_metrics (
  id SERIAL PRIMARY KEY,
  
  chat_id INTEGER UNIQUE NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  
  -- Métricas de tiempo
  wait_time_seconds INTEGER, -- Tiempo en cola
  first_response_time_seconds INTEGER, -- Tiempo hasta primera respuesta del agente
  avg_response_time_seconds INTEGER, -- Tiempo promedio de respuesta del agente
  handling_time_seconds INTEGER, -- Tiempo total de manejo
  
  -- Contadores
  total_messages INTEGER DEFAULT 0,
  agent_messages INTEGER DEFAULT 0,
  client_messages INTEGER DEFAULT 0,
  
  -- Transferencias
  transfer_count INTEGER DEFAULT 0,
  
  -- SLA
  sla_first_response_met BOOLEAN,
  sla_resolution_met BOOLEAN,
  
  -- Satisfacción
  csat_score INTEGER, -- 1-5
  
  -- Timestamp
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_metrics_chat_id ON chat_metrics(chat_id);
```

---

### 31. AGENT_METRICS (Métricas calculadas de agentes)

```sql
CREATE TABLE agent_metrics (
  id SERIAL PRIMARY KEY,
  
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Período
  date DATE NOT NULL,
  hour INTEGER CHECK (hour BETWEEN 0 AND 23), -- NULL para métrica diaria
  
  -- Métricas de disponibilidad
  time_available_seconds INTEGER DEFAULT 0,
  time_busy_seconds INTEGER DEFAULT 0,
  time_paused_seconds INTEGER DEFAULT 0,
  
  -- Métricas de chats
  chats_handled INTEGER DEFAULT 0,
  chats_transferred INTEGER DEFAULT 0,
  chats_closed INTEGER DEFAULT 0,
  
  -- Métricas de mensajes
  messages_sent INTEGER DEFAULT 0,
  
  -- Métricas de tiempo
  avg_handling_time_seconds INTEGER,
  avg_first_response_time_seconds INTEGER,
  
  -- Métricas de calidad
  avg_csat_score DECIMAL(3,2),
  sla_compliance_percentage DECIMAL(5,2),
  
  -- SPH (Sales/Chats Per Hour)
  chats_per_hour DECIMAL(5,2),
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, campaign_id, date, hour)
);

CREATE INDEX idx_agent_metrics_user_id ON agent_metrics(user_id);
CREATE INDEX idx_agent_metrics_campaign_id ON agent_metrics(campaign_id);
CREATE INDEX idx_agent_metrics_date ON agent_metrics(date);
```

---

### 32. BACKUPS (Registro de backups)

```sql
CREATE TABLE backups (
  id SERIAL PRIMARY KEY,
  
  -- Información del backup
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT,
  
  -- Tipo
  backup_type VARCHAR(30) NOT NULL CHECK (backup_type IN ('full', 'incremental', 'database', 'files')),
  
  -- Estado
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  
  -- Verificación
  checksum VARCHAR(255), -- MD5 o SHA256
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  
  -- Almacenamiento
  storage_location VARCHAR(100), -- 'local', 's3', etc.
  
  -- Retención
  expires_at TIMESTAMP,
  
  -- Error
  error_message TEXT,
  
  -- Auditoría
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_backups_status ON backups(status);
CREATE INDEX idx_backups_backup_type ON backups(backup_type);
CREATE INDEX idx_backups_created_at ON backups(started_at);
```

---

## 🔗 DIAGRAMA DE RELACIONES COMPLETO (Texto)

```
users
├─ N:1 → roles
├─ N:M → permissions (via user_permissions)
├─ 1:N → user_sessions
├─ 1:N → chats (as assigned_agent)
├─ 1:N → tasks (as assigned_to)
├─ 1:N → tasks (as created_by)
└─ 1:N → agent_states

campaigns
├─ N:M → whatsapp_numbers (via campaign_numbers)
├─ N:M → users (via campaign_agents)
├─ 1:N → queues
├─ 1:N → routing_rules
├─ 1:N → chats
└─ N:1 → bot_flows

chats
├─ N:1 → clients
├─ N:1 → campaigns
├─ N:1 → whatsapp_numbers
├─ N:1 → users (as assigned_agent)
├─ N:1 → queues
├─ 1:N → messages
├─ 1:N → chat_tags
├─ 1:N → chat_notes
├─ 1:1 → chat_metrics
└─ 1:1 → bot_sessions

clients
├─ 1:N → chats
├─ 1:N → tasks
├─ 1:N → client_tags
└─ 1:N → messages

messages
├─ N:1 → chats
├─ N:1 → clients
├─ N:1 → whatsapp_numbers
├─ N:1 → users (sender)
└─ N:1 → files

bot_flows
├─ 1:N → bot_nodes
└─ 1:N → bot_sessions

bot_sessions
├─ N:1 → chats
├─ N:1 → bot_flows
└─ N:1 → clients
```

---

## 🎯 PRÓXIMOS PASOS

✅ **Modelo de datos completo creado** (32 tablas con todas las relaciones, índices y restricciones).

Ahora procedo con:

**3. ✅ Diseño de APIs y endpoints principales**

¿Continúo automáticamente?
