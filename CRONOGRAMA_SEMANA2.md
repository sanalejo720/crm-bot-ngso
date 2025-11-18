# 📅 Cronograma Detallado - Semana 2
**NGS&O CRM Gestión**  
**Fecha inicio:** 17 de Noviembre, 2025  
**Fecha fin:** 23 de Noviembre, 2025

---

## 📊 Resumen de la Semana

| Objetivo | Horas Estimadas | Prioridad |
|----------|----------------|-----------|
| Admin Panel | 16 horas | 🔴 Alta |
| Task Management | 4 horas | 🟡 Media |
| Notifications | 3 horas | 🟡 Media |
| Filters & Search | 2 horas | 🟢 Baja |
| Testing & Bugs | 8 horas | 🔴 Alta |
| **TOTAL** | **33 horas** | **~5h/día** |

---

## Lunes 17 de Noviembre

### 🌅 Mañana (9:00 - 13:00) - 4 horas

#### ✅ Testing del SupervisorDashboard
**Tiempo: 1.5 horas**
- [ ] Crear usuario supervisor de prueba
- [ ] Verificar endpoints con Postman/curl
- [ ] Probar auto-refresh en navegador
- [ ] Validar datos con script validate-system.sql
- [ ] Documentar cualquier bug encontrado

#### 🚀 Iniciar Admin Panel - UserManagement (Parte 1)
**Tiempo: 2.5 horas**

**Tareas:**
1. Crear estructura base:
```typescript
// src/pages/AdminPanel.tsx
- Layout con Tabs de MUI
- Tab 1: Usuarios
- Tab 2: Roles y Permisos
- Tab 3: Campañas
- Tab 4: Números WhatsApp

// src/components/admin/UserManagement.tsx
- DataGrid de MUI con usuarios
- Columnas: Nombre, Email, Rol, Estado, Último Acceso, Acciones
```

2. Conectar a API:
```typescript
// Verificar endpoints existentes:
GET /api/v1/users - Lista de usuarios
POST /api/v1/users - Crear usuario
PUT /api/v1/users/:id - Actualizar usuario
DELETE /api/v1/users/:id - Eliminar usuario (soft delete)
```

3. Implementar lista de usuarios:
- useEffect para cargar usuarios
- useState para búsqueda local
- Botones: Crear, Editar, Desactivar

### 🌆 Tarde (14:00 - 18:00) - 4 horas

#### 🚀 Admin Panel - UserManagement (Parte 2)
**Tiempo: 4 horas**

**Tareas:**
1. Crear UserDialog.tsx:
```typescript
interface UserDialogProps {
  open: boolean;
  user?: User | null;
  onClose: () => void;
  onSave: (userData: CreateUserDto) => Promise<void>;
}

// Campos del formulario:
- Email (required, email validation)
- Nombre completo (required)
- Rol (select con roles disponibles)
- Es Agente? (checkbox)
- MaxConcurrentChats (si es agente, number input)
- Password (solo en crear, bcrypt en backend)
- Estado activo (switch)
```

2. Validaciones:
- Email único (verificar con backend)
- Password mínimo 8 caracteres
- MaxConcurrentChats entre 1-10

3. Integración:
- POST /api/v1/users para crear
- PUT /api/v1/users/:id para editar
- Mostrar snackbar de éxito/error

**Entregable del día:** UserManagement funcional con CRUD completo

---

## Martes 18 de Noviembre

### 🌅 Mañana (9:00 - 13:00) - 4 horas

#### 🚀 Admin Panel - RoleManagement
**Tiempo: 4 horas**

**Tareas:**
1. Crear RoleManagement.tsx:
```typescript
// src/components/admin/RoleManagement.tsx
- Lista de roles con expand/collapse
- Cada rol muestra sus permisos actuales
- Botón "Editar Permisos"
```

2. Crear PermissionsDialog.tsx:
```typescript
// Checkbox tree de permisos agrupados por módulo:
├─ Chats
│  ├─ ☑ chats:read
│  ├─ ☑ chats:create
│  ├─ ☑ chats:update
│  └─ ☐ chats:delete
├─ Mensajes
│  ├─ ☑ messages:read
│  ├─ ☑ messages:send
│  └─ ☑ messages:create
...
```

3. Backend endpoints:
```typescript
GET /api/v1/roles - Lista de roles
GET /api/v1/permissions - Todos los permisos
GET /api/v1/roles/:id/permissions - Permisos de un rol
POST /api/v1/roles/:id/permissions - Asignar permisos
DELETE /api/v1/roles/:id/permissions/:permId - Revocar permiso
```

4. Implementar lógica:
- Cargar roles y permisos actuales
- Guardar cambios en batch
- Validar que Super Admin siempre tenga todos los permisos

### 🌆 Tarde (14:00 - 18:00) - 4 horas

#### 🚀 Admin Panel - CampaignManagement
**Tiempo: 4 horas**

**Tareas:**
1. Crear CampaignManagement.tsx:
```typescript
// Lista de campañas con DataGrid
- Columnas: Nombre, Estado, Chats Activos, Agentes, Fecha Creación, Acciones
- Filtro por estado: Activa/Inactiva
- Botones: Crear, Editar, Ver Estadísticas
```

2. Crear CampaignDialog.tsx:
```typescript
// Formulario de campaña:
- Nombre (required)
- Descripción (textarea)
- Auto-asignación (switch)
- Max chats por agente (number)
- Prioridad base (select: BAJA/MEDIA/ALTA/URGENTE)
- Estado (activa/inactiva)
- Números de WhatsApp (multi-select)
```

3. Backend endpoints (verificar existentes):
```typescript
GET /api/v1/campaigns
POST /api/v1/campaigns
PUT /api/v1/campaigns/:id
DELETE /api/v1/campaigns/:id
GET /api/v1/campaigns/:id/stats
```

4. Integración:
- CRUD completo de campañas
- Asignar números de WhatsApp a campaña
- Ver estadísticas de campaña (reutilizar getCampaignMetrics del servicio reports)

**Entregable del día:** RoleManagement + CampaignManagement funcionales

---

## Miércoles 19 de Noviembre

### 🌅 Mañana (9:00 - 13:00) - 4 horas

#### 🚀 Admin Panel - WhatsAppNumbersManagement
**Tiempo: 2 horas**

**Tareas:**
1. Crear WhatsAppNumbersManagement.tsx:
```typescript
// Lista de números con DataGrid
- Columnas: Número, Nombre, Estado, Campaña, Último Mensaje, Acciones
- Estado: Conectado (verde) / Desconectado (rojo) / QR Pendiente (amarillo)
```

2. Crear WhatsAppNumberDialog.tsx:
```typescript
// Formulario:
- Número (formato: +57XXXXXXXXXX)
- Nombre/Alias
- API Key de WhatsApp Business
- Webhook URL
- Estado (activo/inactivo)
```

3. Backend endpoints:
```typescript
GET /api/v1/whatsapp-numbers
POST /api/v1/whatsapp-numbers
PUT /api/v1/whatsapp-numbers/:id
DELETE /api/v1/whatsapp-numbers/:id
GET /api/v1/whatsapp-numbers/:id/qr - Generar QR para vincular
```

#### 🧪 Testing del Admin Panel
**Tiempo: 2 horas**

**Checklist:**
- [ ] Crear usuario de prueba desde admin
- [ ] Editar rol de usuario existente
- [ ] Asignar/revocar permisos de un rol
- [ ] Crear campaña nueva
- [ ] Editar configuración de campaña
- [ ] Asignar número de WhatsApp a campaña
- [ ] Agregar número de WhatsApp
- [ ] Verificar que cambios se reflejan en base de datos

### 🌆 Tarde (14:00 - 18:00) - 4 horas

#### 🚀 Task Management UI (Parte 1)
**Tiempo: 4 horas**

**Tareas:**
1. Crear TaskList.tsx:
```typescript
// src/components/tasks/TaskList.tsx
- Lista de tareas del agente
- Filtros: Estado (pendiente/en progreso/completada), Prioridad, Fecha
- Ordenamiento: Por fecha de vencimiento, prioridad
- Botón: Crear Tarea
```

2. Crear TaskDialog.tsx:
```typescript
// Formulario de tarea:
- Título (required)
- Descripción (textarea)
- Cliente relacionado (select)
- Chat relacionado (select, opcional)
- Prioridad (BAJA/MEDIA/ALTA/URGENTE)
- Fecha de vencimiento (DatePicker)
- Asignar a (select de agentes)
- Tipo de tarea (select: llamada, email, seguimiento, legal, etc)
```

3. Backend endpoints (verificar):
```typescript
GET /api/v1/tasks - Tareas del usuario autenticado
GET /api/v1/tasks?assignedTo=:userId - Tareas de un agente
POST /api/v1/tasks
PUT /api/v1/tasks/:id
DELETE /api/v1/tasks/:id
PATCH /api/v1/tasks/:id/status - Cambiar estado
```

4. Integración en DebtorPanel:
- Botón "Crear Tarea" en DebtorPanel
- Lista de tareas relacionadas al cliente actual
- Badge con número de tareas pendientes

**Entregable del día:** WhatsApp Numbers Management + TaskList funcional

---

## Jueves 20 de Noviembre

### 🌅 Mañana (9:00 - 13:00) - 4 horas

#### 🚀 Task Management UI (Parte 2)
**Tiempo: 2 horas**

**Tareas:**
1. Completar integración de tareas:
- Modal de detalles de tarea
- Marcar como completada con confirmación
- Historial de cambios de estado
- Notificación cuando tarea vence en 1 día

2. TaskCard.tsx (componente reutilizable):
```typescript
// Card compacto para mostrar tarea:
- Título y descripción (truncada)
- Badge de prioridad
- Fecha de vencimiento con color (rojo si vencida)
- Avatar del asignado
- Checkbox para completar
```

#### 🔔 Sistema de Notificaciones (Parte 1)
**Tiempo: 2 horas**

**Tareas:**
1. Instalar dependencias:
```powershell
cd D:\crm-ngso-whatsapp\frontend
npm install notistack howler
```

2. Crear NotificationProvider.tsx:
```typescript
// src/providers/NotificationProvider.tsx
import { SnackbarProvider } from 'notistack';
import { Howl } from 'howler';

// Configurar notistack:
- maxSnack: 3
- anchorOrigin: { vertical: 'top', horizontal: 'right' }
- autoHideDuration: 5000
```

3. Crear hooks:
```typescript
// src/hooks/useNotifications.ts
export const useNotifications = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  const notifyInfo = (message: string) => { ... };
  const notifySuccess = (message: string) => { ... };
  const notifyWarning = (message: string) => { ... };
  const notifyError = (message: string) => { ... };
  
  return { notifyInfo, notifySuccess, notifyWarning, notifyError };
};
```

### 🌆 Tarde (14:00 - 18:00) - 4 horas

#### 🔔 Sistema de Notificaciones (Parte 2)
**Tiempo: 2 horas**

**Tareas:**
1. Integrar sonidos:
```typescript
// public/sounds/notification.mp3
// public/sounds/message.mp3
// public/sounds/alert.mp3

const playSound = (soundFile: string) => {
  const sound = new Howl({ src: [`/sounds/${soundFile}`], volume: 0.5 });
  sound.play();
};
```

2. Conectar con Socket.IO:
```typescript
// En socketService.ts:
socketService.onChatAssigned((data) => {
  notifyInfo(`Nuevo chat asignado: ${data.chat.contactName}`);
  playSound('notification.mp3');
});

socketService.onMessageReceived((data) => {
  if (currentChatId !== data.chatId) {
    notifyInfo(`Mensaje de ${data.chat.contactName}`);
    playSound('message.mp3');
  }
});
```

3. Notificaciones de tareas:
```typescript
// Verificar tareas vencidas cada 5 minutos:
useEffect(() => {
  const checkOverdueTasks = async () => {
    const tasks = await apiService.get('/tasks/overdue');
    if (tasks.length > 0) {
      notifyWarning(`Tienes ${tasks.length} tareas vencidas`);
      playSound('alert.mp3');
    }
  };
  
  const interval = setInterval(checkOverdueTasks, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

#### 🔍 Filtros y Búsqueda en ChatList
**Tiempo: 2 horas**

**Tareas:**
1. Implementar búsqueda:
```typescript
// En ChatList.tsx:
const [searchTerm, setSearchTerm] = useState('');

const filteredChats = chats.filter(chat => {
  const matchesSearch = 
    chat.client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.contactPhone.includes(searchTerm);
  return matchesSearch;
});
```

2. Agregar filtros:
```typescript
// Filtros con Chip seleccionable:
const [statusFilter, setStatusFilter] = useState<ChatStatus | 'all'>('all');
const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

// UI con Chips:
<Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
  <Chip label="Todos" onClick={() => setStatusFilter('all')} color={statusFilter === 'all' ? 'primary' : 'default'} />
  <Chip label="Esperando" onClick={() => setStatusFilter('waiting')} ... />
  <Chip label="Activos" onClick={() => setStatusFilter('active')} ... />
  ...
</Box>
```

3. Ordenamiento:
```typescript
// Select para ordenar:
const [sortBy, setSortBy] = useState<'priority' | 'date' | 'name'>('priority');

const sortedChats = [...filteredChats].sort((a, b) => {
  if (sortBy === 'priority') return getClientPriority(b.client) - getClientPriority(a.client);
  if (sortBy === 'date') return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
  if (sortBy === 'name') return a.client.fullName.localeCompare(b.client.fullName);
  return 0;
});
```

**Entregable del día:** TaskList completo + Notificaciones + Filtros en ChatList

---

## Viernes 21 de Noviembre

### 🌅 Mañana (9:00 - 13:00) - 4 horas

#### 🧪 Testing Integral (Parte 1)
**Tiempo: 4 horas**

**Testing por Rol:**

**1. Super Admin (admin@crm.com)**
- [ ] Login exitoso
- [ ] Acceso a Dashboard
- [ ] Acceso a Admin Panel (todos los tabs)
- [ ] Crear usuario nuevo
- [ ] Modificar permisos de rol
- [ ] Crear campaña
- [ ] Agregar número de WhatsApp

**2. Supervisor**
- [ ] Login exitoso
- [ ] Acceso a Dashboard
- [ ] NO puede acceder a Admin Panel (403)
- [ ] Ver métricas de agentes
- [ ] Ver reportes

**3. Agente (juan@crm.com)**
- [ ] Login exitoso
- [ ] AgentWorkspace carga correctamente
- [ ] Ver chats asignados
- [ ] Enviar mensajes
- [ ] Cambiar estado (Disponible/Ocupado/En descanso)
- [ ] Ver tareas asignadas
- [ ] Crear tarea nueva
- [ ] Registrar promesa de pago
- [ ] NO puede acceder a Dashboard (redirect)
- [ ] NO puede acceder a Admin Panel (redirect)

**4. Calidad**
- [ ] Login exitoso
- [ ] Solo puede ver chats y mensajes (read-only)
- [ ] NO puede enviar mensajes
- [ ] NO puede editar clientes

**5. Auditoría**
- [ ] Login exitoso
- [ ] Solo puede ver audit_logs
- [ ] NO tiene acceso a otros módulos

### 🌆 Tarde (14:00 - 18:00) - 4 horas

#### 🧪 Testing Integral (Parte 2)
**Tiempo: 2 horas**

**Testing de Funcionalidad:**

**1. Flujo de Cobranza Completo**
- [ ] Cliente con deuda aparece en chat list
- [ ] Agente recibe chat por auto-asignación
- [ ] Agente envía mensaje al cliente
- [ ] Cliente responde (simular con SQL INSERT)
- [ ] Agente ve respuesta en tiempo real
- [ ] Agente registra promesa de pago
- [ ] Dashboard muestra "Recuperado hoy" actualizado
- [ ] Supervisor ve promesa en métricas de agente

**2. WebSocket en Tiempo Real**
- [ ] Abrir 2 navegadores con 2 agentes diferentes
- [ ] Cambiar estado de agente 1
- [ ] Verificar que agente 2 ve el cambio (si hay UI para eso)
- [ ] Enviar mensaje desde agente 1
- [ ] Dashboard muestra incremento de mensajes (esperar 30s)

**3. Auto-asignación de Chats**
- [ ] Insertar nuevo chat en BD sin agente
- [ ] Sistema asigna a agente disponible con menos chats
- [ ] Agente recibe notificación de nuevo chat
- [ ] Chat aparece en ChatList del agente

#### 📝 Documentación y Corrección de Bugs
**Tiempo: 2 horas**

**Tareas:**
1. Crear TESTING_RESULTS.md:
- Documentar bugs encontrados
- Nivel de severidad (crítico/alto/medio/bajo)
- Pasos para reproducir
- Solución propuesta

2. Corrección de bugs críticos:
- Priorizar errores que bloqueen uso
- Errores de permisos
- Errores de WebSocket
- Errores de auto-asignación

3. Actualizar documentación:
- README.md con instrucciones de instalación
- API.md con todos los endpoints disponibles
- DEPLOYMENT.md con pasos de despliegue

**Entregable del día:** Testing completo + Bugs documentados + Correcciones críticas

---

## Sábado-Domingo (Opcional)

### Sábado 22 de Noviembre - Refinamiento

#### Mejoras Visuales (4 horas)
- [ ] Pulir diseño de componentes
- [ ] Agregar animaciones con Framer Motion
- [ ] Mejorar mensajes de error
- [ ] Agregar tooltips explicativos
- [ ] Verificar responsive design (móvil/tablet)

#### Optimizaciones (2 horas)
- [ ] React.memo en componentes pesados
- [ ] useCallback en callbacks
- [ ] Lazy loading de rutas con React.lazy
- [ ] Code splitting

### Domingo 23 de Noviembre - Preparación Semana 3

#### Planificación (2 horas)
- [ ] Crear cronograma detallado Semana 3
- [ ] Identificar componentes faltantes
- [ ] Priorizar features opcionales
- [ ] Preparar demos para stakeholders

---

## 📊 Métricas de Éxito de la Semana

Al final de la semana, deberías tener:

✅ **Admin Panel completo:**
- User Management con CRUD
- Role Management con edición de permisos
- Campaign Management con estadísticas
- WhatsApp Numbers Management

✅ **Task Management funcional:**
- Lista de tareas con filtros
- Crear/editar/completar tareas
- Integración en DebtorPanel
- Notificaciones de vencimiento

✅ **Sistema de Notificaciones:**
- Toast para eventos importantes
- Sonidos configurables
- Badge de notificaciones en header

✅ **Filtros y Búsqueda:**
- Búsqueda por nombre/teléfono
- Filtros por estado y prioridad
- Ordenamiento personalizado

✅ **Testing completo:**
- Todos los roles probados
- Flujo de cobranza validado
- WebSocket en tiempo real verificado
- Bugs críticos resueltos

---

## 🚨 Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|-----------|
| Bugs en permisos | Media | Alto | Testing exhaustivo por rol |
| Performance en DataGrid | Media | Medio | Paginación y virtualización |
| WebSocket desconexiones | Alta | Alto | Reconexión automática (ya implementada) |
| Complejidad de RoleManagement | Media | Medio | UI simple con checkbox tree |
| Testing insuficiente | Alta | Alto | Dedicar 8 horas a testing |

---

**Próxima revisión:** Viernes 21 de Noviembre a las 18:00  
**Entregables:** Admin Panel + Task Management + Notificaciones + Testing completo
