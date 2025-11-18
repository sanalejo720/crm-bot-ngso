# 🌐 DISEÑO DE APIs Y ENDPOINTS - CRM WHATSAPP

## 📋 Configuración Base

**Base URL**: `https://api.tudominio.com/v1`
**Autenticación**: Bearer Token (JWT)
**Formato**: JSON
**Versionado**: En URL (`/v1`)

---

## 🔐 1. AUTHENTICATION MODULE

### 1.1 Login
```
POST /auth/login
```

**Body**:
```json
{
  "email": "agente@empresa.com",
  "password": "password123"
}
```

**Response 200**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "email": "agente@empresa.com",
    "first_name": "Juan",
    "last_name": "Pérez",
    "role": {
      "id": 3,
      "name": "agent",
      "display_name": "Agente"
    },
    "permissions": ["chats.read", "chats.update", "messages.create"]
  }
}
```

---

### 1.2 Refresh Token
```
POST /auth/refresh
```

**Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

---

### 1.3 Logout
```
POST /auth/logout
```

**Headers**: `Authorization: Bearer {token}`

**Response 200**:
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

---

### 1.4 Cambiar Contraseña
```
PUT /auth/change-password
```

**Headers**: `Authorization: Bearer {token}`

**Body**:
```json
{
  "current_password": "oldpass123",
  "new_password": "newpass456"
}
```

**Response 200**:
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

---

### 1.5 Activar 2FA
```
POST /auth/2fa/enable
```

**Response 200**:
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code": "data:image/png;base64,iVBORw0KG...",
  "backup_codes": ["123456", "789012", "345678"]
}
```

---

### 1.6 Verificar 2FA
```
POST /auth/2fa/verify
```

**Body**:
```json
{
  "code": "123456"
}
```

---

## 👥 2. USERS MODULE

### 2.1 Listar Usuarios
```
GET /users?page=1&limit=20&role=agent&status=active&search=juan
```

**Query Params**:
- `page`: Página (default: 1)
- `limit`: Resultados por página (default: 20)
- `role`: Filtrar por rol
- `status`: Filtrar por estado (active, inactive, suspended)
- `search`: Búsqueda por nombre o email

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "email": "agente@empresa.com",
      "first_name": "Juan",
      "last_name": "Pérez",
      "phone": "+573001234567",
      "avatar_url": "https://cdn.com/avatar.jpg",
      "role": {
        "id": 3,
        "name": "agent",
        "display_name": "Agente"
      },
      "status": "active",
      "agent_status": "available",
      "max_concurrent_chats": 5,
      "created_at": "2025-01-15T10:00:00Z",
      "last_login_at": "2025-11-14T08:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

### 2.2 Obtener Usuario por ID
```
GET /users/:id
```

**Response 200**:
```json
{
  "id": 1,
  "email": "agente@empresa.com",
  "first_name": "Juan",
  "last_name": "Pérez",
  "phone": "+573001234567",
  "avatar_url": "https://cdn.com/avatar.jpg",
  "role": {
    "id": 3,
    "name": "agent",
    "display_name": "Agente"
  },
  "status": "active",
  "agent_status": "available",
  "agent_status_reason": null,
  "max_concurrent_chats": 5,
  "auto_assign_enabled": true,
  "campaigns": [
    {
      "id": 1,
      "name": "Campaña Ventas",
      "priority": 5
    }
  ],
  "permissions": ["chats.read", "chats.update", "messages.create"],
  "created_at": "2025-01-15T10:00:00Z",
  "last_login_at": "2025-11-14T08:30:00Z"
}
```

---

### 2.3 Crear Usuario
```
POST /users
```

**Permisos**: `users.create`

**Body**:
```json
{
  "email": "nuevo@empresa.com",
  "password": "password123",
  "first_name": "María",
  "last_name": "González",
  "phone": "+573009876543",
  "role_id": 3,
  "status": "active",
  "max_concurrent_chats": 5,
  "auto_assign_enabled": true
}
```

**Response 201**:
```json
{
  "id": 2,
  "email": "nuevo@empresa.com",
  "first_name": "María",
  "last_name": "González",
  "role": {
    "id": 3,
    "name": "agent",
    "display_name": "Agente"
  },
  "created_at": "2025-11-14T10:00:00Z"
}
```

---

### 2.4 Actualizar Usuario
```
PUT /users/:id
```

**Permisos**: `users.update`

**Body**:
```json
{
  "first_name": "María",
  "last_name": "González",
  "phone": "+573009876543",
  "status": "active",
  "max_concurrent_chats": 7
}
```

---

### 2.5 Eliminar Usuario (Soft Delete)
```
DELETE /users/:id
```

**Permisos**: `users.delete`

---

### 2.6 Cambiar Estado del Agente
```
POST /users/:id/agent-status
```

**Body**:
```json
{
  "agent_status": "paused",
  "agent_status_reason": "Almuerzo"
}
```

**Valores**: `available`, `busy`, `paused`, `offline`

**Response 200**:
```json
{
  "id": 1,
  "agent_status": "paused",
  "agent_status_reason": "Almuerzo",
  "updated_at": "2025-11-14T12:00:00Z"
}
```

---

### 2.7 Obtener Mi Perfil
```
GET /users/me
```

**Headers**: `Authorization: Bearer {token}`

---

### 2.8 Actualizar Mi Perfil
```
PUT /users/me
```

**Body**:
```json
{
  "first_name": "Juan",
  "phone": "+573001234567"
}
```

---

## 🎯 3. CAMPAIGNS MODULE

### 3.1 Listar Campañas
```
GET /campaigns?status=active&page=1&limit=20
```

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Campaña Ventas 2025",
      "code": "VENTAS_2025",
      "description": "Campaña de ventas Q1",
      "status": "active",
      "priority": 5,
      "bot_enabled": true,
      "routing_strategy": "round_robin",
      "whatsapp_numbers": [
        {
          "id": 1,
          "phone_number": "+573001111111",
          "display_name": "Ventas Principal"
        }
      ],
      "agents_count": 15,
      "active_chats": 8,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

---

### 3.2 Crear Campaña
```
POST /campaigns
```

**Permisos**: `campaigns.create`

**Body**:
```json
{
  "name": "Campaña Soporte",
  "code": "SOPORTE_2025",
  "description": "Atención al cliente",
  "status": "active",
  "priority": 5,
  "business_hours": {
    "monday": { "start": "08:00", "end": "18:00" },
    "tuesday": { "start": "08:00", "end": "18:00" },
    "wednesday": { "start": "08:00", "end": "18:00" },
    "thursday": { "start": "08:00", "end": "18:00" },
    "friday": { "start": "08:00", "end": "18:00" },
    "saturday": null,
    "sunday": null
  },
  "timezone": "America/Bogota",
  "sla_first_response_seconds": 60,
  "sla_resolution_seconds": 3600,
  "bot_enabled": true,
  "bot_flow_id": 1,
  "routing_strategy": "least_busy",
  "welcome_message": "¡Hola! Bienvenido a soporte.",
  "offline_message": "Estamos fuera de horario. Te contactaremos pronto."
}
```

---

### 3.3 Obtener Campaña por ID
```
GET /campaigns/:id
```

---

### 3.4 Actualizar Campaña
```
PUT /campaigns/:id
```

---

### 3.5 Eliminar Campaña
```
DELETE /campaigns/:id
```

---

### 3.6 Asignar Números a Campaña
```
POST /campaigns/:id/numbers
```

**Body**:
```json
{
  "whatsapp_number_ids": [1, 2, 3],
  "primary_number_id": 1
}
```

---

### 3.7 Asignar Agentes a Campaña
```
POST /campaigns/:id/agents
```

**Body**:
```json
{
  "agents": [
    {
      "user_id": 1,
      "max_concurrent_chats": 5,
      "priority": 10,
      "skills": ["ventas", "ingles"]
    },
    {
      "user_id": 2,
      "max_concurrent_chats": 7,
      "priority": 5,
      "skills": ["soporte_tecnico"]
    }
  ]
}
```

---

## 📱 4. WHATSAPP NUMBERS MODULE

### 4.1 Listar Números
```
GET /whatsapp-numbers?status=active&provider=meta
```

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "phone_number": "+573001111111",
      "display_name": "Ventas Principal",
      "provider": "meta",
      "status": "active",
      "connection_status": "connected",
      "last_connected_at": "2025-11-14T08:00:00Z",
      "daily_message_limit": 1000,
      "total_messages_sent": 523,
      "total_messages_received": 789,
      "campaigns": [
        {
          "id": 1,
          "name": "Campaña Ventas"
        }
      ],
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### 4.2 Crear Número (Meta)
```
POST /whatsapp-numbers
```

**Permisos**: `whatsapp.numbers.manage`

**Body**:
```json
{
  "phone_number": "+573001111111",
  "display_name": "Ventas Principal",
  "provider": "meta",
  "meta_phone_number_id": "102938475647382",
  "meta_business_account_id": "123456789",
  "meta_access_token": "EAAxxxxxxxx",
  "webhook_verify_token": "mi_token_secreto_123",
  "daily_message_limit": 1000,
  "rate_limit_per_minute": 60
}
```

**Response 201**:
```json
{
  "id": 1,
  "phone_number": "+573001111111",
  "provider": "meta",
  "status": "pending",
  "webhook_url": "https://api.tudominio.com/v1/webhooks/whatsapp/meta/1",
  "created_at": "2025-11-14T10:00:00Z"
}
```

---

### 4.3 Crear Número (WPPConnect)
```
POST /whatsapp-numbers
```

**Body**:
```json
{
  "phone_number": "+573002222222",
  "display_name": "Soporte WPP",
  "provider": "wppconnect",
  "wppconnect_session_name": "soporte_session",
  "wppconnect_server_url": "http://localhost:21465",
  "wppconnect_api_key": "api_key_secreta",
  "daily_message_limit": 500
}
```

**Response 201**:
```json
{
  "id": 2,
  "phone_number": "+573002222222",
  "provider": "wppconnect",
  "status": "pending",
  "wppconnect_qr_code": "data:image/png;base64,iVBORw0KG...",
  "message": "Escanea el código QR con WhatsApp",
  "created_at": "2025-11-14T10:00:00Z"
}
```

---

### 4.4 Obtener Estado de Número
```
GET /whatsapp-numbers/:id/status
```

**Response 200**:
```json
{
  "id": 1,
  "status": "active",
  "connection_status": "connected",
  "last_connected_at": "2025-11-14T08:00:00Z",
  "last_error": null,
  "health": {
    "is_healthy": true,
    "response_time_ms": 150,
    "last_check_at": "2025-11-14T10:00:00Z"
  }
}
```

---

### 4.5 Obtener QR Code (WPPConnect)
```
GET /whatsapp-numbers/:id/qr
```

**Response 200**:
```json
{
  "qr_code": "data:image/png;base64,iVBORw0KG...",
  "expires_at": "2025-11-14T10:05:00Z"
}
```

---

### 4.6 Desconectar Número
```
POST /whatsapp-numbers/:id/disconnect
```

---

### 4.7 Reconectar Número
```
POST /whatsapp-numbers/:id/reconnect
```

---

### 4.8 Actualizar Número
```
PUT /whatsapp-numbers/:id
```

---

### 4.9 Eliminar Número
```
DELETE /whatsapp-numbers/:id
```

---

## 💬 5. CHATS MODULE

### 5.1 Listar Chats
```
GET /chats?status=active&assigned_agent_id=1&campaign_id=1&page=1&limit=20
```

**Query Params**:
- `status`: Filtrar por estado (new, bot, queued, assigned, active, pending, closed)
- `assigned_agent_id`: Filtrar por agente asignado
- `campaign_id`: Filtrar por campaña
- `priority`: Filtrar por prioridad
- `search`: Buscar por nombre de cliente o teléfono
- `from_date`: Fecha desde
- `to_date`: Fecha hasta

**Response 200**:
```json
{
  "data": [
    {
      "id": 123,
      "client": {
        "id": 45,
        "first_name": "Carlos",
        "last_name": "Rodríguez",
        "phone_number": "+573001234567",
        "avatar_url": null
      },
      "campaign": {
        "id": 1,
        "name": "Campaña Ventas"
      },
      "whatsapp_number": {
        "id": 1,
        "phone_number": "+573001111111"
      },
      "assigned_agent": {
        "id": 1,
        "first_name": "Juan",
        "last_name": "Pérez"
      },
      "status": "active",
      "priority": "normal",
      "message_count": 15,
      "last_message": {
        "id": 789,
        "content": "Necesito información sobre precios",
        "direction": "inbound",
        "created_at": "2025-11-14T09:45:00Z"
      },
      "unread_count": 2,
      "created_at": "2025-11-14T09:30:00Z",
      "last_message_at": "2025-11-14T09:45:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

### 5.2 Obtener Chat por ID
```
GET /chats/:id
```

**Response 200**:
```json
{
  "id": 123,
  "client": {
    "id": 45,
    "first_name": "Carlos",
    "last_name": "Rodríguez",
    "phone_number": "+573001234567",
    "email": "carlos@email.com",
    "lead_status": "contacted",
    "tags": ["vip", "recurrente"],
    "notes": "Cliente importante",
    "custom_fields": {
      "empresa": "Acme Corp",
      "cargo": "Gerente"
    }
  },
  "campaign": {
    "id": 1,
    "name": "Campaña Ventas"
  },
  "whatsapp_number": {
    "id": 1,
    "phone_number": "+573001111111"
  },
  "assigned_agent": {
    "id": 1,
    "first_name": "Juan",
    "last_name": "Pérez",
    "agent_status": "available"
  },
  "status": "active",
  "priority": "normal",
  "tags": ["precio", "producto_a"],
  "notes": [
    {
      "id": 1,
      "user": { "id": 1, "first_name": "Juan" },
      "content": "Cliente interesado en plan premium",
      "created_at": "2025-11-14T09:35:00Z"
    }
  ],
  "bot_context": {
    "nombre": "Carlos",
    "interes": "plan_premium"
  },
  "metrics": {
    "wait_time_seconds": 45,
    "first_response_time_seconds": 30,
    "handling_time_seconds": 900
  },
  "created_at": "2025-11-14T09:30:00Z",
  "assigned_at": "2025-11-14T09:30:45Z",
  "first_response_at": "2025-11-14T09:31:00Z",
  "last_message_at": "2025-11-14T09:45:00Z"
}
```

---

### 5.3 Asignar Chat a Agente
```
POST /chats/:id/assign
```

**Permisos**: `chats.assign`

**Body**:
```json
{
  "agent_id": 1,
  "reason": "Asignación manual por supervisor"
}
```

**Response 200**:
```json
{
  "id": 123,
  "assigned_agent": {
    "id": 1,
    "first_name": "Juan"
  },
  "status": "assigned",
  "assigned_at": "2025-11-14T10:00:00Z"
}
```

---

### 5.4 Transferir Chat
```
POST /chats/:id/transfer
```

**Permisos**: `chats.transfer`

**Body**:
```json
{
  "target_type": "agent",
  "target_id": 2,
  "reason": "Cliente requiere soporte técnico especializado"
}
```

**`target_type`**: `agent`, `campaign`, `queue`

---

### 5.5 Cerrar Chat
```
POST /chats/:id/close
```

**Permisos**: `chats.close`

**Body**:
```json
{
  "close_reason": "resolved",
  "outcome": "sale",
  "outcome_value": 150000,
  "notes": "Cliente compró plan premium anual"
}
```

**Response 200**:
```json
{
  "id": 123,
  "status": "closed",
  "closed_at": "2025-11-14T10:00:00Z",
  "close_reason": "resolved",
  "outcome": "sale"
}
```

---

### 5.6 Reabrir Chat
```
POST /chats/:id/reopen
```

---

### 5.7 Agregar Tag a Chat
```
POST /chats/:id/tags
```

**Body**:
```json
{
  "tag": "urgente"
}
```

---

### 5.8 Agregar Nota Interna
```
POST /chats/:id/notes
```

**Body**:
```json
{
  "content": "Cliente solicita descuento del 20%"
}
```

---

### 5.9 Cambiar Prioridad
```
PUT /chats/:id/priority
```

**Body**:
```json
{
  "priority": "high"
}
```

---

### 5.10 Obtener Mensajes del Chat
```
GET /chats/:id/messages?page=1&limit=50
```

**Response 200**:
```json
{
  "data": [
    {
      "id": 789,
      "direction": "inbound",
      "message_type": "text",
      "content": "Hola, necesito información",
      "status": "delivered",
      "user": null,
      "is_bot_message": false,
      "created_at": "2025-11-14T09:30:15Z",
      "read_at": "2025-11-14T09:30:20Z"
    },
    {
      "id": 790,
      "direction": "outbound",
      "message_type": "text",
      "content": "¡Hola Carlos! ¿En qué puedo ayudarte?",
      "status": "read",
      "user": {
        "id": 1,
        "first_name": "Juan",
        "last_name": "Pérez"
      },
      "is_bot_message": false,
      "created_at": "2025-11-14T09:31:00Z",
      "sent_at": "2025-11-14T09:31:01Z",
      "delivered_at": "2025-11-14T09:31:02Z",
      "read_at": "2025-11-14T09:31:10Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 15
  }
}
```

---

## 📨 6. MESSAGES MODULE

### 6.1 Enviar Mensaje
```
POST /messages
```

**Permisos**: `messages.create`

**Body (Texto)**:
```json
{
  "chat_id": 123,
  "message_type": "text",
  "content": "Hola, ¿en qué puedo ayudarte?"
}
```

**Body (Imagen)**:
```json
{
  "chat_id": 123,
  "message_type": "image",
  "media_file_id": 456,
  "content": "Aquí está el catálogo de productos"
}
```

**Body (Plantilla - Meta)**:
```json
{
  "chat_id": 123,
  "message_type": "template",
  "template_name": "welcome_template",
  "template_language": "es",
  "template_variables": {
    "1": "Carlos",
    "2": "Plan Premium"
  }
}
```

**Response 201**:
```json
{
  "id": 791,
  "chat_id": 123,
  "direction": "outbound",
  "message_type": "text",
  "content": "Hola, ¿en qué puedo ayudarte?",
  "status": "pending",
  "created_at": "2025-11-14T10:00:00Z"
}
```

---

### 6.2 Obtener Mensaje por ID
```
GET /messages/:id
```

---

### 6.3 Marcar Mensaje como Leído
```
POST /messages/:id/read
```

---

### 6.4 Reenviar Mensaje Fallido
```
POST /messages/:id/retry
```

---

## 👤 7. CLIENTS MODULE

### 7.1 Listar Clientes
```
GET /clients?search=carlos&lead_status=contacted&segment=vip&page=1&limit=20
```

**Response 200**:
```json
{
  "data": [
    {
      "id": 45,
      "phone_number": "+573001234567",
      "first_name": "Carlos",
      "last_name": "Rodríguez",
      "email": "carlos@email.com",
      "company": "Acme Corp",
      "city": "Bogotá",
      "country": "Colombia",
      "lead_status": "contacted",
      "lead_score": 75,
      "segment": "vip",
      "tags": ["recurrente", "vip"],
      "total_chats": 8,
      "last_contact_at": "2025-11-14T09:30:00Z",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 342,
    "total_pages": 18
  }
}
```

---

### 7.2 Crear Cliente
```
POST /clients
```

**Body**:
```json
{
  "phone_number": "+573009999999",
  "first_name": "Ana",
  "last_name": "Martínez",
  "email": "ana@email.com",
  "company": "Tech Solutions",
  "city": "Medellín",
  "country": "Colombia",
  "lead_status": "new",
  "segment": "regular",
  "custom_fields": {
    "industria": "Tecnología",
    "empleados": "50-100"
  },
  "tags": ["prospecto"]
}
```

---

### 7.3 Obtener Cliente por ID
```
GET /clients/:id
```

**Response 200**:
```json
{
  "id": 45,
  "phone_number": "+573001234567",
  "first_name": "Carlos",
  "last_name": "Rodríguez",
  "email": "carlos@email.com",
  "company": "Acme Corp",
  "city": "Bogotá",
  "country": "Colombia",
  "address": "Calle 123 #45-67",
  "lead_status": "contacted",
  "lead_score": 75,
  "ltv": 500000,
  "total_purchases": 3,
  "last_purchase_at": "2025-10-01T00:00:00Z",
  "segment": "vip",
  "tags": ["recurrente", "vip"],
  "custom_fields": {
    "empresa": "Acme Corp",
    "cargo": "Gerente"
  },
  "notes": "Cliente muy importante, siempre paga a tiempo",
  "is_blocked": false,
  "opt_in": true,
  "chats": [
    {
      "id": 123,
      "status": "active",
      "created_at": "2025-11-14T09:30:00Z"
    }
  ],
  "tasks": [
    {
      "id": 10,
      "title": "Llamar para renovación",
      "due_date": "2025-11-15T10:00:00Z",
      "status": "pending"
    }
  ],
  "created_at": "2025-01-15T10:00:00Z",
  "last_contact_at": "2025-11-14T09:30:00Z"
}
```

---

### 7.4 Actualizar Cliente
```
PUT /clients/:id
```

---

### 7.5 Eliminar Cliente
```
DELETE /clients/:id
```

---

### 7.6 Agregar Tag a Cliente
```
POST /clients/:id/tags
```

**Body**:
```json
{
  "tag": "vip"
}
```

---

### 7.7 Remover Tag de Cliente
```
DELETE /clients/:id/tags/:tag
```

---

### 7.8 Importar Clientes (CSV)
```
POST /clients/import
```

**Body**: `multipart/form-data`
```
file: clientes.csv
```

**Response 200**:
```json
{
  "imported": 150,
  "skipped": 5,
  "errors": [
    {
      "row": 23,
      "error": "Teléfono inválido"
    }
  ]
}
```

---

### 7.9 Exportar Clientes
```
GET /clients/export?format=csv&lead_status=contacted
```

**Response**: Archivo CSV

---

## ✅ 8. TASKS MODULE

### 8.1 Listar Tareas
```
GET /tasks?assigned_to_user_id=1&status=pending&priority=high&page=1&limit=20
```

---

### 8.2 Crear Tarea
```
POST /tasks
```

**Body**:
```json
{
  "client_id": 45,
  "chat_id": 123,
  "assigned_to_user_id": 1,
  "title": "Llamar para renovación de contrato",
  "description": "Cliente está por vencer su plan anual",
  "due_date": "2025-11-15T10:00:00Z",
  "reminder_date": "2025-11-15T09:00:00Z",
  "priority": "high"
}
```

---

### 8.3 Actualizar Tarea
```
PUT /tasks/:id
```

---

### 8.4 Marcar Tarea como Completada
```
POST /tasks/:id/complete
```

**Body**:
```json
{
  "completion_notes": "Cliente renovó contrato por 1 año más"
}
```

---

### 8.5 Agregar Comentario a Tarea
```
POST /tasks/:id/comments
```

---

## 🤖 9. BOT FLOWS MODULE

### 9.1 Listar Flujos
```
GET /bot-flows?is_published=true
```

---

### 9.2 Crear Flujo
```
POST /bot-flows
```

**Body**:
```json
{
  "name": "Flujo de Bienvenida",
  "description": "Flujo inicial para todos los clientes",
  "start_node_id": "node_welcome",
  "variables": {
    "company_name": "MiEmpresa",
    "support_email": "soporte@miempresa.com"
  },
  "timeout_seconds": 300,
  "max_invalid_attempts": 3
}
```

---

### 9.3 Obtener Flujo por ID
```
GET /bot-flows/:id
```

**Response 200**:
```json
{
  "id": 1,
  "name": "Flujo de Bienvenida",
  "description": "Flujo inicial",
  "start_node_id": "node_welcome",
  "nodes": [
    {
      "id": 1,
      "node_key": "node_welcome",
      "node_type": "message",
      "config": {
        "content": "¡Hola! Bienvenido a {{company_name}}",
        "next": "node_menu"
      },
      "next_node_key": "node_menu",
      "position_x": 100,
      "position_y": 100
    },
    {
      "id": 2,
      "node_key": "node_menu",
      "node_type": "menu",
      "config": {
        "content": "Selecciona una opción:",
        "options": [
          {
            "label": "1. Ventas",
            "value": "sales",
            "next": "node_sales"
          },
          {
            "label": "2. Soporte",
            "value": "support",
            "next": "node_support"
          },
          {
            "label": "3. Hablar con agente",
            "value": "agent",
            "next": "node_agent"
          }
        ]
      },
      "position_x": 100,
      "position_y": 200
    }
  ],
  "version": 1,
  "is_published": true,
  "created_at": "2025-11-01T00:00:00Z"
}
```

---

### 9.4 Actualizar Flujo
```
PUT /bot-flows/:id
```

---

### 9.5 Publicar Flujo
```
POST /bot-flows/:id/publish
```

---

### 9.6 Agregar/Actualizar Nodos
```
POST /bot-flows/:id/nodes
```

**Body**:
```json
{
  "nodes": [
    {
      "node_key": "node_welcome",
      "node_type": "message",
      "config": {
        "content": "¡Hola {{nombre}}!",
        "next": "node_menu"
      },
      "next_node_key": "node_menu",
      "position_x": 100,
      "position_y": 100
    }
  ]
}
```

---

### 9.7 Obtener Estadísticas del Flujo
```
GET /bot-flows/:id/stats
```

**Response 200**:
```json
{
  "total_sessions": 523,
  "total_completions": 401,
  "completion_rate": 76.67,
  "avg_completion_time_seconds": 180,
  "node_stats": [
    {
      "node_key": "node_welcome",
      "visits": 523,
      "exits": 0
    },
    {
      "node_key": "node_menu",
      "visits": 523,
      "exits": 122
    }
  ]
}
```

---

## 📊 10. REPORTS MODULE

### 10.1 Reporte de Campaña
```
GET /reports/campaigns/:campaign_id?from_date=2025-11-01&to_date=2025-11-14
```

**Response 200**:
```json
{
  "campaign": {
    "id": 1,
    "name": "Campaña Ventas"
  },
  "period": {
    "from": "2025-11-01T00:00:00Z",
    "to": "2025-11-14T23:59:59Z"
  },
  "metrics": {
    "total_chats": 523,
    "chats_handled": 501,
    "chats_abandoned": 22,
    "avg_wait_time_seconds": 45,
    "avg_first_response_time_seconds": 30,
    "avg_handling_time_seconds": 900,
    "sla_first_response_compliance": 95.5,
    "sla_resolution_compliance": 87.2,
    "total_messages": 7845,
    "avg_messages_per_chat": 15.6,
    "satisfaction": {
      "avg_rating": 4.3,
      "total_ratings": 345,
      "rating_distribution": {
        "1": 5,
        "2": 12,
        "3": 48,
        "4": 120,
        "5": 160
      }
    },
    "outcomes": {
      "sale": 234,
      "no_sale": 156,
      "information": 89,
      "complaint": 22
    },
    "total_revenue": 15600000
  }
}
```

---

### 10.2 Reporte de Agente
```
GET /reports/agents/:agent_id?from_date=2025-11-01&to_date=2025-11-14
```

**Response 200**:
```json
{
  "agent": {
    "id": 1,
    "first_name": "Juan",
    "last_name": "Pérez"
  },
  "period": {
    "from": "2025-11-01T00:00:00Z",
    "to": "2025-11-14T23:59:59Z"
  },
  "metrics": {
    "chats_handled": 89,
    "chats_transferred": 5,
    "chats_closed": 84,
    "messages_sent": 1245,
    "avg_handling_time_seconds": 850,
    "avg_first_response_time_seconds": 25,
    "chats_per_hour": 6.7,
    "sla_compliance": 92.5,
    "avg_csat_score": 4.5,
    "time_breakdown": {
      "available_seconds": 151200,
      "busy_seconds": 71400,
      "paused_seconds": 10800,
      "offline_seconds": 108000
    },
    "outcomes": {
      "sale": 45,
      "no_sale": 28,
      "information": 11
    },
    "revenue_generated": 3200000
  }
}
```

---

### 10.3 Reporte de Números WhatsApp
```
GET /reports/whatsapp-numbers/:number_id?from_date=2025-11-01&to_date=2025-11-14
```

---

### 10.4 Reporte Consolidado
```
GET /reports/summary?from_date=2025-11-01&to_date=2025-11-14
```

---

### 10.5 Exportar Reporte
```
GET /reports/export?type=campaign&campaign_id=1&format=pdf&from_date=2025-11-01&to_date=2025-11-14
```

**Formatos**: `pdf`, `excel`, `csv`

---

## 📉 11. ANALYTICS MODULE (Tiempo Real)

### 11.1 Dashboard en Vivo
```
GET /analytics/live
```

**Response 200**:
```json
{
  "timestamp": "2025-11-14T10:00:00Z",
  "agents": {
    "total": 25,
    "available": 18,
    "busy": 5,
    "paused": 2,
    "offline": 0,
    "list": [
      {
        "id": 1,
        "first_name": "Juan",
        "agent_status": "available",
        "active_chats": 3,
        "max_chats": 5
      }
    ]
  },
  "chats": {
    "active": 45,
    "queued": 8,
    "closed_today": 234,
    "avg_wait_time_seconds": 35
  },
  "queues": [
    {
      "id": 1,
      "name": "Cola Principal",
      "waiting": 8,
      "avg_wait_time_seconds": 45
    }
  ],
  "messages": {
    "sent_last_hour": 523,
    "received_last_hour": 789
  },
  "sla": {
    "first_response_compliance": 95.5,
    "resolution_compliance": 87.2
  }
}
```

---

### 11.2 Métricas de Cola
```
GET /analytics/queues/:queue_id
```

---

### 11.3 Gráficas de Tendencias
```
GET /analytics/trends?metric=chats_per_hour&from_date=2025-11-01&to_date=2025-11-14
```

**Response 200**:
```json
{
  "metric": "chats_per_hour",
  "period": "2025-11-01 to 2025-11-14",
  "data": [
    {
      "timestamp": "2025-11-01T08:00:00Z",
      "value": 12
    },
    {
      "timestamp": "2025-11-01T09:00:00Z",
      "value": 18
    }
  ]
}
```

---

## 🔍 12. AUDIT MODULE

### 12.1 Listar Logs de Auditoría
```
GET /audit-logs?user_id=1&action=chat.transfer&entity_type=Chat&from_date=2025-11-01&page=1&limit=50
```

**Response 200**:
```json
{
  "data": [
    {
      "id": 1234,
      "user": {
        "id": 1,
        "first_name": "Juan",
        "last_name": "Pérez"
      },
      "action": "chat.transfer",
      "entity_type": "Chat",
      "entity_id": 123,
      "changes": {
        "assigned_agent_id": {
          "from": 1,
          "to": 2
        },
        "status": {
          "from": "active",
          "to": "transferred"
        }
      },
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "success": true,
      "created_at": "2025-11-14T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 5234
  }
}
```

---

### 12.2 Exportar Logs de Auditoría
```
GET /audit-logs/export?format=csv&from_date=2025-11-01&to_date=2025-11-14
```

---

## 💾 13. BACKUP MODULE

### 13.1 Listar Backups
```
GET /backups?status=completed&page=1&limit=20
```

---

### 13.2 Crear Backup Manual
```
POST /backups
```

**Permisos**: `backups.create`

**Body**:
```json
{
  "backup_type": "full",
  "storage_location": "local"
}
```

**Response 201**:
```json
{
  "id": 45,
  "backup_type": "full",
  "status": "in_progress",
  "started_at": "2025-11-14T10:00:00Z",
  "message": "Backup iniciado. Recibirás una notificación al finalizar."
}
```

---

### 13.3 Obtener Estado de Backup
```
GET /backups/:id
```

---

### 13.4 Descargar Backup
```
GET /backups/:id/download
```

**Response**: Archivo .zip

---

### 13.5 Restaurar desde Backup
```
POST /backups/:id/restore
```

**Permisos**: `backups.restore`

---

### 13.6 Eliminar Backup
```
DELETE /backups/:id
```

---

## 📁 14. FILES MODULE

### 14.1 Subir Archivo
```
POST /files
```

**Body**: `multipart/form-data`
```
file: imagen.jpg
related_entity_type: message (opcional)
related_entity_id: 789 (opcional)
```

**Response 201**:
```json
{
  "id": 456,
  "filename": "f8a3b2c1-imagen.jpg",
  "original_filename": "imagen.jpg",
  "mime_type": "image/jpeg",
  "size_bytes": 245678,
  "file_path": "https://cdn.tudominio.com/files/f8a3b2c1-imagen.jpg",
  "thumbnail_path": "https://cdn.tudominio.com/files/thumbs/f8a3b2c1-imagen.jpg",
  "width": 1920,
  "height": 1080,
  "created_at": "2025-11-14T10:00:00Z"
}
```

---

### 14.2 Obtener Archivo
```
GET /files/:id
```

---

### 14.3 Descargar Archivo
```
GET /files/:id/download
```

---

### 14.4 Eliminar Archivo
```
DELETE /files/:id
```

---

## 📱 15. WEBHOOKS MODULE

### 15.1 Webhook WhatsApp Meta
```
POST /webhooks/whatsapp/meta/:number_id
```

**Verificación GET**:
```
GET /webhooks/whatsapp/meta/:number_id?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
```

**Response 200**: Devolver `hub.challenge`

**Recepción POST**:
Meta envía mensajes entrantes, estados de mensajes, etc.

---

### 15.2 Webhook WPPConnect
```
POST /webhooks/whatsapp/wppconnect/:number_id
```

WPPConnect envía eventos de conexión, mensajes, QR codes, etc.

---

## 🔔 16. WEBSOCKET EVENTS (Socket.IO)

### Conexión
```javascript
const socket = io('wss://api.tudominio.com', {
  auth: {
    token: 'Bearer eyJhbGciOiJIUzI1NiIs...'
  }
});
```

### Eventos del Cliente → Servidor

#### Unirse a sala de chat
```javascript
socket.emit('chat.join', { chatId: 123 });
```

#### Agente está escribiendo
```javascript
socket.emit('chat.typing', { chatId: 123 });
```

#### Marcar mensajes como leídos
```javascript
socket.emit('chat.read', { chatId: 123, messageIds: [789, 790] });
```

### Eventos del Servidor → Cliente

#### Nuevo chat asignado
```javascript
socket.on('chat.new', (data) => {
  console.log('Nuevo chat asignado:', data.chat);
});
```

#### Nuevo mensaje en chat
```javascript
socket.on('chat.message', (data) => {
  console.log('Nuevo mensaje:', data.message);
});
```

#### Chat actualizado
```javascript
socket.on('chat.updated', (data) => {
  console.log('Chat actualizado:', data.chat);
});
```

#### Chat transferido
```javascript
socket.on('chat.transferred', (data) => {
  console.log('Chat transferido:', data);
});
```

#### Otro agente escribiendo
```javascript
socket.on('agent.typing', (data) => {
  console.log('Agente escribiendo:', data.agent);
});
```

#### Actualización de analytics
```javascript
socket.on('analytics.update', (data) => {
  console.log('Métricas actualizadas:', data);
});
```

---

## 🔒 CÓDIGOS DE ESTADO HTTP

- **200 OK**: Solicitud exitosa
- **201 Created**: Recurso creado exitosamente
- **204 No Content**: Solicitud exitosa sin contenido de respuesta
- **400 Bad Request**: Error en la solicitud
- **401 Unauthorized**: No autenticado
- **403 Forbidden**: No autorizado (sin permisos)
- **404 Not Found**: Recurso no encontrado
- **409 Conflict**: Conflicto (ej: email duplicado)
- **422 Unprocessable Entity**: Errores de validación
- **429 Too Many Requests**: Rate limit excedido
- **500 Internal Server Error**: Error del servidor

---

## 📝 FORMATO DE ERRORES

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Error de validación en los datos enviados",
    "details": [
      {
        "field": "email",
        "message": "El email no es válido"
      },
      {
        "field": "password",
        "message": "La contraseña debe tener al menos 8 caracteres"
      }
    ]
  }
}
```

---

## 🎯 PRÓXIMOS PASOS

✅ **APIs y endpoints completos documentados** (16 módulos con todos los endpoints CRUD y operaciones especiales).

Ahora continúo con:

**4. ✅ Estructura de carpetas del proyecto**

¿Continúo automáticamente?
