# 🧪 Scripts de Pruebas - NGS&O CRM Gestión

## 📋 Índice de Scripts

### Scripts Individuales por Módulo

| Script | Descripción | Endpoints Probados |
|--------|-------------|-------------------|
| `test-auth.ps1` | Autenticación y sesiones | Login, Logout, Perfil, 2FA |
| `test-campaigns.ps1` | Gestión de campañas | CRUD, Estadísticas, Activación |
| `test-chats.ps1` | Gestión de chats | Creación, Asignación, Estados |
| `test-messages.ps1` | Mensajería | Envío, Lectura, Paginación |
| `test-reports.ps1` | Reportes y métricas | Sistema, Agentes, Estadísticas |
| `test-users.ps1` | Gestión de usuarios | CRUD, Roles, Permisos |

### Scripts de Flujo Completo

| Script | Descripción | Casos de Uso |
|--------|-------------|--------------|
| `test-flow-complete.ps1` | Flujo completo de atención | Chat → Asignación → Conversación → Cierre |
| `test-all.ps1` | Suite completa de pruebas | Ejecuta todos los módulos secuencialmente |

---

## 🚀 Uso Rápido

### Ejecutar Script Individual

```powershell
# Navegar al directorio de scripts
cd D:\crm-ngso-whatsapp\backend\scripts

# Ejecutar un script específico
.\test-auth.ps1
```

### Ejecutar Suite Completa

```powershell
# Ejecuta todos los tests y genera reporte
.\test-all.ps1
```

### Ejecutar Flujo Completo

```powershell
# Simula un flujo real de atención
.\test-flow-complete.ps1
```

---

## 📝 Requisitos Previos

1. **Backend ejecutándose:**
```powershell
cd D:\crm-ngso-whatsapp\backend
npm run start:dev
```

2. **Base de datos configurada:**
```powershell
# Verificar conexión a PostgreSQL
psql -U postgres -d ngso_crm
```

3. **Usuarios de prueba existentes:**
   - Admin: `admin@crm.com` / `password123`
   - Supervisor: `maria@crm.com` / `password123`
   - Agente: `juan@crm.com` / `password123`

---

## 🔍 Detalles de los Scripts

### test-auth.ps1
**Pruebas de Autenticación**

- ✅ TEST 1: Registro de nuevo usuario
- ✅ TEST 2: Login con credenciales válidas
- ✅ TEST 3: Login con credenciales inválidas (debe fallar)
- ✅ TEST 4: Obtener perfil del usuario autenticado
- ✅ TEST 5: Acceso sin token (debe fallar)
- ✅ TEST 6: Acceso con token inválido (debe fallar)
- ✅ TEST 7: Generar secret para 2FA
- ✅ TEST 8: Cerrar sesión

**Endpoints:**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me
POST   /api/v1/auth/logout
POST   /api/v1/auth/2fa/generate
```

---

### test-campaigns.ps1
**Pruebas de Campañas**

- ✅ TEST 1: Crear nueva campaña
- ✅ TEST 2: Obtener todas las campañas
- ✅ TEST 3: Obtener campañas activas
- ✅ TEST 4: Obtener campaña por ID
- ✅ TEST 5: Actualizar campaña
- ✅ TEST 6: Actualizar estado de campaña
- ✅ TEST 7: Actualizar settings de campaña
- ✅ TEST 8: Obtener estadísticas de campaña
- ✅ TEST 9: Activar campaña
- ✅ TEST 10: Pausar campaña
- ✅ TEST 11: Filtrar campañas por estado
- ✅ TEST 12: Buscar campañas por nombre
- ✅ TEST 13: Obtener números WhatsApp de campaña

**Endpoints:**
```
POST   /api/v1/campaigns
GET    /api/v1/campaigns
GET    /api/v1/campaigns/active
GET    /api/v1/campaigns/:id
GET    /api/v1/campaigns/:id/stats
PATCH  /api/v1/campaigns/:id
PATCH  /api/v1/campaigns/:id/status
PATCH  /api/v1/campaigns/:id/settings
POST   /api/v1/campaigns/:id/activate
POST   /api/v1/campaigns/:id/pause
```

---

### test-chats.ps1
**Pruebas de Chats**

- ✅ TEST 1: Crear nuevo chat
- ✅ TEST 2: Obtener todos los chats
- ✅ TEST 3: Obtener mis chats asignados (agente)
- ✅ TEST 4: Obtener chat por ID
- ✅ TEST 5: Obtener chats en cola (waiting)
- ✅ TEST 6: Asignar chat a agente
- ✅ TEST 7: Actualizar estado del chat
- ✅ TEST 8: Filtrar chats por estado
- ✅ TEST 9: Filtrar chats por campaña
- ✅ TEST 10: Cerrar chat

**Endpoints:**
```
POST   /api/v1/chats
GET    /api/v1/chats
GET    /api/v1/chats/my-chats
GET    /api/v1/chats/waiting/:campaignId
GET    /api/v1/chats/:id
PATCH  /api/v1/chats/:id
PATCH  /api/v1/chats/:id/assign
PATCH  /api/v1/chats/:id/status
```

---

### test-messages.ps1
**Pruebas de Mensajes**

- ✅ TEST 1: Enviar mensaje de texto
- ✅ TEST 2: Obtener mensajes de un chat
- ✅ TEST 3: Obtener mensajes con paginación
- ✅ TEST 4: Obtener mensaje por ID
- ✅ TEST 5: Enviar múltiples mensajes
- ✅ TEST 6: Enviar mensaje con emoji
- ✅ TEST 7: Enviar mensaje largo
- ✅ TEST 8: Enviar mensaje con caracteres especiales
- ✅ TEST 9: Verificar contador de mensajes
- ✅ TEST 10: Enviar mensaje vacío (debe fallar)

**Endpoints:**
```
POST   /api/v1/messages/send
GET    /api/v1/messages/chat/:chatId
GET    /api/v1/messages/:id
```

---

### test-reports.ps1
**Pruebas de Reportes**

- ✅ TEST 1: Obtener métricas del sistema
- ✅ TEST 2: Obtener estadísticas del dashboard
- ✅ TEST 3: Obtener estadísticas de agente
- ✅ TEST 4: Obtener actividad reciente del agente
- ✅ TEST 5: Reportes por campaña
- ✅ TEST 6: Métricas en tiempo real
- ✅ TEST 7: Estadísticas de usuarios
- ✅ TEST 8: Estadísticas de mensajes

**Endpoints:**
```
GET    /api/v1/reports/system
GET    /api/v1/reports/system/stats
GET    /api/v1/reports/agent/stats
GET    /api/v1/reports/agent/activity
```

---

### test-users.ps1
**Pruebas de Usuarios**

- ✅ TEST 1: Crear nuevo usuario
- ✅ TEST 2: Obtener todos los usuarios
- ✅ TEST 3: Obtener usuario por ID
- ✅ TEST 4: Actualizar usuario
- ✅ TEST 5: Actualizar estado del usuario
- ✅ TEST 6: Filtrar usuarios por rol
- ✅ TEST 7: Filtrar usuarios por estado
- ✅ TEST 8: Obtener agentes disponibles
- ✅ TEST 9: Cambiar password del usuario
- ✅ TEST 10: Asignar campaña a usuario
- ✅ TEST 11: Obtener estadísticas del usuario
- ✅ TEST 12: Desactivar usuario
- ✅ TEST 13: Reactivar usuario

**Endpoints:**
```
POST   /api/v1/users
GET    /api/v1/users
GET    /api/v1/users/:id
GET    /api/v1/users/available-agents
PATCH  /api/v1/users/:id
PATCH  /api/v1/users/:id/status
PATCH  /api/v1/users/:id/password
PATCH  /api/v1/users/:id/campaigns
POST   /api/v1/users/:id/deactivate
POST   /api/v1/users/:id/activate
```

---

### test-flow-complete.ps1
**Flujo Completo de Atención**

Simula un flujo real de atención al cliente:

1. ✅ Autenticación de múltiples usuarios (Admin, Supervisor, Agente)
2. ✅ Creación de nuevo chat desde WhatsApp
3. ✅ Verificación de chat en cola
4. ✅ Asignación de chat a agente
5. ✅ Agente verifica sus chats asignados
6. ✅ Agente lee mensaje inicial
7. ✅ Agente activa el chat
8. ✅ Agente envía respuesta
9. ✅ Conversación completa (8 mensajes)
10. ✅ Agente cierra el chat
11. ✅ Supervisor verifica estadísticas
12. ✅ Verificación de historial completo

**Duración aproximada:** 30-40 segundos

---

### test-all.ps1
**Suite Completa de Pruebas**

Ejecuta todos los scripts en secuencia y genera un reporte final con:

- ✅ Total de módulos probados
- ✅ Módulos exitosos vs fallidos
- ✅ Tiempo de ejecución por módulo
- ✅ Tasa de éxito general
- ✅ Duración total de la suite

**Duración aproximada:** 2-3 minutos

**Salida de ejemplo:**
```
╔════════════════════════════════════════════════════╗
║              RESUMEN DE PRUEBAS                    ║
╚════════════════════════════════════════════════════╝

📊 RESULTADOS:
   Total de módulos probados: 6
   ✅ Exitosos: 6
   ❌ Fallidos: 0
   ⏭️  Omitidos: 0

⏱️  TIEMPOS:
   Inicio: 10:30:00
   Fin: 10:32:45
   Duración total: 165.00 segundos

📈 TASA DE ÉXITO: 100.00%
```

---

## 🎯 Casos de Uso Comunes

### Verificar que el backend funciona correctamente

```powershell
.\test-all.ps1
```

### Probar solo la autenticación

```powershell
.\test-auth.ps1
```

### Simular un flujo completo de atención

```powershell
.\test-flow-complete.ps1
```

### Verificar estadísticas y reportes

```powershell
.\test-reports.ps1
```

---

## 🐛 Troubleshooting

### Error: Backend no disponible

**Problema:**
```
❌ Backend no disponible. Asegúrate de que esté corriendo en http://localhost:3000/api/v1
```

**Solución:**
```powershell
# Iniciar el backend
cd D:\crm-ngso-whatsapp\backend
npm run start:dev
```

---

### Error: Autenticación fallida

**Problema:**
```
❌ Error en autenticación: 401 Unauthorized
```

**Solución:**
1. Verificar que los usuarios existan en la base de datos
2. Ejecutar script de seed:
```powershell
cd D:\crm-ngso-whatsapp\backend
npm run seed
```

---

### Error: Chat no se puede crear

**Problema:**
```
❌ Error creando chat: Campaign not found
```

**Solución:**
1. Verificar que las campañas existan:
```powershell
# Ejecutar en PostgreSQL
SELECT id, name, status FROM campaigns;
```

2. Actualizar el ID de campaña en el script si es necesario

---

## 📊 Interpretación de Resultados

### Símbolos de Estado

- ✅ **Verde:** Test exitoso
- ❌ **Rojo:** Test fallido (error inesperado)
- ⚠️ **Amarillo:** Test completado con advertencias
- 🔄 **Azul:** Test en ejecución

### Códigos de Salida

- `0`: Todos los tests exitosos
- `1`: Uno o más tests fallaron
- `2`: Error crítico (backend no disponible)

---

## 🔐 Seguridad

⚠️ **IMPORTANTE:** Estos scripts son para **desarrollo y pruebas** únicamente.

- No ejecutar en producción
- No compartir tokens generados
- Cambiar credenciales por defecto en producción

---

## 📚 Recursos Adicionales

- [Documentación API (Swagger)](http://localhost:3000/api/docs)
- [Guía de Desarrollo](../CODIGO_IMPLEMENTACION.md)
- [Arquitectura del Sistema](../ARQUITECTURA.md)

---

## 👨‍💻 Desarrollado por

**AS Software - Alejandro Sandoval**  
NGS&O CRM Gestión - 2024

---

## 📝 Notas

- Los scripts usan PowerShell 5.1+
- Requieren conectividad al backend en `localhost:3000`
- Los datos de prueba se limpian automáticamente después de cada ejecución
- Para pruebas de carga, usar herramientas especializadas como JMeter o Artillery

---

## 🆘 Soporte

Si encuentras problemas con los scripts:

1. Verificar que el backend esté corriendo
2. Verificar conexión a la base de datos
3. Revisar logs del backend para errores
4. Consultar documentación en `/docs`
